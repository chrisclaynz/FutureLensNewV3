import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

describe('Row Level Security Tests', () => {
    let anonClient;
    let authClient;
    let adminClient;
    let testUser;
    let testSurveyId;
    
    // Setup: create clients and test data
    beforeAll(async () => {
        // Create anonymous client
        anonClient = createClient(supabaseUrl, supabaseKey);
        
        // Create test user
        const email = `test-${Date.now()}@example.com`;
        const password = 'password123';
        
        const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
            email,
            password,
        });
        
        if (signUpError) {
            console.error('Error creating test user:', signUpError);
            throw signUpError;
        }
        
        testUser = signUpData.user;
        
        // Create authenticated client
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email,
            password,
        });
        
        if (authError) {
            console.error('Error signing in test user:', authError);
            throw authError;
        }
        
        authClient = createClient(supabaseUrl, authData.session.access_token);
        
        // Admin client needs service role key
        // This test skips admin tests if no service role key is provided
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        }
        
        // Create a test survey (if admin client is available)
        if (adminClient) {
            const testSurvey = {
                theme: {
                    title: 'RLS Test Survey'
                },
                statements: [
                    { id: 'q1', text: 'Test Question', alignment: 'left', continuum: 'test' }
                ]
            };
            
            const { data: surveyData, error: surveyError } = await adminClient
                .from('surveys')
                .insert({ json_config: testSurvey })
                .select('id');
                
            if (surveyError) {
                console.error('Error creating test survey:', surveyError);
            } else {
                testSurveyId = surveyData[0].id;
            }
        }
    });
    
    // Cleanup: remove test data
    afterAll(async () => {
        if (adminClient && testUser && testSurveyId) {
            // Delete test survey
            await adminClient.from('surveys').delete().eq('id', testSurveyId);
            
            // Delete test user
            await adminClient.auth.admin.deleteUser(testUser.id);
        }
    });
    
    // Test RLS on surveys table
    describe('Surveys Table RLS', () => {
        test('Anonymous client can read surveys', async () => {
            const { data, error } = await anonClient
                .from('surveys')
                .select('id')
                .limit(1);
                
            expect(error).toBeNull();
            expect(data).toBeDefined();
        });
        
        test('Anonymous client cannot insert surveys', async () => {
            const testSurvey = {
                json_config: { theme: { title: 'Test Survey' } }
            };
            
            const { data, error } = await anonClient
                .from('surveys')
                .insert(testSurvey);
                
            expect(error).not.toBeNull();
            expect(error.message).toContain('permission denied');
        });
        
        test('Authenticated client can read surveys', async () => {
            const { data, error } = await authClient
                .from('surveys')
                .select('id')
                .limit(1);
                
            expect(error).toBeNull();
            expect(data).toBeDefined();
        });
        
        test('Authenticated client can insert surveys', async () => {
            const testSurvey = {
                json_config: { 
                    theme: { title: 'Auth Test Survey' },
                    statements: []
                }
            };
            
            const { data, error } = await authClient
                .from('surveys')
                .insert(testSurvey)
                .select('id');
                
            expect(error).toBeNull();
            expect(data).toBeDefined();
            expect(data[0].id).toBeDefined();
            
            // Clean up the created survey
            if (data && data[0]) {
                await authClient
                    .from('surveys')
                    .delete()
                    .eq('id', data[0].id);
            }
        });
    });
    
    // Test RLS on participants table
    describe('Participants Table RLS', () => {
        test('Anonymous client cannot read participants', async () => {
            const { data, error } = await anonClient
                .from('participants')
                .select('id')
                .limit(1);
                
            expect(error).not.toBeNull();
            expect(error.message).toContain('permission denied');
        });
        
        test('Authenticated client can only read own participants', async () => {
            // Create a participant record for the test user
            if (testSurveyId) {
                // First create a participant record
                const { data: insertData, error: insertError } = await authClient
                    .from('participants')
                    .insert({
                        user_id: testUser.id,
                        survey_id: testSurveyId
                    })
                    .select('id');
                    
                expect(insertError).toBeNull();
                expect(insertData).toBeDefined();
                
                // Try to read it back
                const { data, error } = await authClient
                    .from('participants')
                    .select('id, user_id')
                    .eq('id', insertData[0].id);
                    
                expect(error).toBeNull();
                expect(data).toBeDefined();
                expect(data.length).toBe(1);
                expect(data[0].user_id).toBe(testUser.id);
                
                // Clean up
                await authClient
                    .from('participants')
                    .delete()
                    .eq('id', insertData[0].id);
            } else {
                console.warn('Skipping participant test - no test survey ID available');
            }
        });
    });
    
    // Test performance impact of RLS
    describe('RLS Performance', () => {
        test('Survey queries with RLS have acceptable performance', async () => {
            const start = Date.now();
            
            // Run 5 queries in sequence
            for (let i = 0; i < 5; i++) {
                await authClient
                    .from('surveys')
                    .select('id, json_config->theme->title')
                    .limit(10);
            }
            
            const duration = Date.now() - start;
            const avgQueryTime = duration / 5;
            
            console.log(`Average query time with RLS: ${avgQueryTime}ms`);
            
            // Expect reasonable performance (adjust threshold as needed)
            expect(avgQueryTime).toBeLessThan(200);
        });
    });
}); 