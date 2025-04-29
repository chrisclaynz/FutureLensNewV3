/**
 * Teacher Security Implementation Test
 * 
 * This test verifies:
 * 1. Profiles table was created successfully
 * 2. User profiles are properly migrated from metadata
 * 3. RLS policies are correctly applied
 * 4. Teachers can only access their assigned cohorts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client with service role key
const adminClient = createClient(supabaseUrl, serviceRoleKey);

// Test teacher accounts
const TEACHER_EMAIL = 'test-teacher@example.com';
const TEACHER_PASSWORD = 'securePassword123';
const ADMIN_EMAIL = 'test-admin@example.com';
const ADMIN_PASSWORD = 'adminSecurePassword123';

let teacherClient;
let teacherAdminClient;
let teacherUserId;
let adminUserId;
let testCohortId;
let testParticipantId;

describe('Teacher Security Implementation', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Create test users if they don't exist
    await setupTestUsers();
    // Create test data
    await setupTestData();
  }, 30000);

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  }, 10000);

  test('Profiles table exists and has proper structure', async () => {
    const { data, error } = await adminClient.from('profiles').select('*').limit(1);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    
    // Check if first profile has expected fields
    if (data && data.length > 0) {
      const profile = data[0];
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('role');
      expect(profile).toHaveProperty('cohort_ids');
      expect(profile).toHaveProperty('created_at');
      expect(profile).toHaveProperty('updated_at');
    }
  });

  test('User metadata is properly migrated to profiles', async () => {
    // Check teacher profile
    const { data: teacherProfile, error: teacherError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', teacherUserId)
      .single();
    
    expect(teacherError).toBeNull();
    expect(teacherProfile).toBeDefined();
    expect(teacherProfile.role).toBe('teacher');
    expect(Array.isArray(teacherProfile.cohort_ids)).toBe(true);
    
    // Check admin profile
    const { data: adminProfile, error: adminError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', adminUserId)
      .single();
    
    expect(adminError).toBeNull();
    expect(adminProfile).toBeDefined();
    expect(adminProfile.role).toBe('admin');
  });

  test('RLS prevents direct access to other profiles', async () => {
    // Teacher should not be able to see other profiles
    const { data: teacherCanSeeOthers, error: teacherProfileError } = await teacherClient
      .from('profiles')
      .select('*')
      .neq('id', teacherUserId);
    
    expect(teacherProfileError).toBeNull();
    expect(teacherCanSeeOthers.length).toBe(0); // Should not see other profiles
    
    // Admin should be able to see all profiles
    const { data: adminCanSeeAll, error: adminProfileError } = await adminClient
      .from('profiles')
      .select('*');
    
    expect(adminProfileError).toBeNull();
    expect(adminCanSeeAll.length).toBeGreaterThan(1); // Should see multiple profiles
  });

  test('Teacher can only see assigned cohorts and participants', async () => {
    // First make sure teacher has the test cohort assigned
    await assignCohortToTeacher(teacherUserId, testCohortId);
    
    // Teacher should be able to see assigned cohort's participants
    const { data: teacherCanSeeAssigned, error: assignedError } = await teacherClient
      .from('participants')
      .select('*')
      .eq('cohort_id', testCohortId);
    
    expect(assignedError).toBeNull();
    expect(teacherCanSeeAssigned.length).toBeGreaterThan(0);
    
    // Now remove cohort assignment
    await removeCohortFromTeacher(teacherUserId, testCohortId);
    
    // Teacher should no longer see participants in unassigned cohort
    const { data: teacherCannotSeeUnassigned, error: unassignedError } = await teacherClient
      .from('participants')
      .select('*')
      .eq('cohort_id', testCohortId);
    
    expect(unassignedError).toBeNull();
    expect(teacherCannotSeeUnassigned.length).toBe(0);
  });
});

// Helper functions
async function setupTestUsers() {
  // Create a test teacher if it doesn't exist
  try {
    const { data: existingTeacher } = await adminClient.auth.admin.getUserByEmail(TEACHER_EMAIL);
    
    if (!existingTeacher) {
      const { data: teacher, error } = await adminClient.auth.admin.createUser({
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'teacher' }
      });
      
      if (error) throw error;
      teacherUserId = teacher.user.id;
    } else {
      teacherUserId = existingTeacher.user.id;
    }
    
    // Sign in as teacher to get client
    const { data: teacherAuth, error: teacherAuthError } = await adminClient.auth.signInWithPassword({
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD
    });
    
    if (teacherAuthError) throw teacherAuthError;
    teacherClient = createClient(supabaseUrl, supabaseAnonKey);
    teacherClient.auth.setSession(teacherAuth.session);
  } catch (e) {
    console.error('Error setting up teacher:', e);
  }
  
  // Create a test admin if it doesn't exist
  try {
    const { data: existingAdmin } = await adminClient.auth.admin.getUserByEmail(ADMIN_EMAIL);
    
    if (!existingAdmin) {
      const { data: admin, error } = await adminClient.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });
      
      if (error) throw error;
      adminUserId = admin.user.id;
    } else {
      adminUserId = existingAdmin.user.id;
    }
    
    // Sign in as admin to get client
    const { data: adminAuth, error: adminAuthError } = await adminClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (adminAuthError) throw adminAuthError;
    teacherAdminClient = createClient(supabaseUrl, supabaseAnonKey);
    teacherAdminClient.auth.setSession(adminAuth.session);
  } catch (e) {
    console.error('Error setting up admin:', e);
  }
}

async function setupTestData() {
  // Create test cohort
  const { data: cohort, error: cohortError } = await adminClient
    .from('cohorts')
    .insert({
      code: `TEST-${Date.now()}`,
      label: 'Test Cohort for Security Testing'
    })
    .select()
    .single();
  
  if (cohortError) {
    console.error('Error creating test cohort:', cohortError);
    return;
  }
  
  testCohortId = cohort.id;
  
  // Create test participant in cohort
  const { data: participant, error: participantError } = await adminClient
    .from('participants')
    .insert({
      user_id: teacherUserId, // Using teacher as participant for simplicity
      cohort_id: testCohortId,
      survey_id: null, // Not needed for this test
    })
    .select()
    .single();
  
  if (participantError) {
    console.error('Error creating test participant:', participantError);
    return;
  }
  
  testParticipantId = participant.id;
}

async function cleanupTestData() {
  if (testParticipantId) {
    await adminClient.from('participants').delete().eq('id', testParticipantId);
  }
  
  if (testCohortId) {
    await adminClient.from('cohorts').delete().eq('id', testCohortId);
  }
}

async function assignCohortToTeacher(teacherId, cohortId) {
  // Get current cohort_ids
  const { data, error } = await adminClient
    .from('profiles')
    .select('cohort_ids')
    .eq('id', teacherId)
    .single();
  
  if (error) {
    console.error('Error getting teacher cohorts:', error);
    return;
  }
  
  // Add cohort if not already assigned
  let cohortIds = data.cohort_ids || [];
  if (!cohortIds.includes(cohortId)) {
    cohortIds.push(cohortId);
    
    await adminClient
      .from('profiles')
      .update({ cohort_ids: cohortIds })
      .eq('id', teacherId);
  }
}

async function removeCohortFromTeacher(teacherId, cohortId) {
  // Get current cohort_ids
  const { data, error } = await adminClient
    .from('profiles')
    .select('cohort_ids')
    .eq('id', teacherId)
    .single();
  
  if (error) {
    console.error('Error getting teacher cohorts:', error);
    return;
  }
  
  // Remove cohort
  let cohortIds = data.cohort_ids || [];
  cohortIds = cohortIds.filter(id => id !== cohortId);
  
  await adminClient
    .from('profiles')
    .update({ cohort_ids: cohortIds })
    .eq('id', teacherId);
} 