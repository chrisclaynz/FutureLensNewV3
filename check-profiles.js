import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://noxrttgtvhtoiejujoyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check for service key
if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// List of emails to check
const emailsToCheck = [
  'test6@gmail.com',
  'test7@gmail.com',
  'katiecnz@gmail.com'
];

async function checkProfiles() {
  try {
    // First check auth table
    console.log('Checking auth table for users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError.message);
      return;
    }
    
    console.log(`Found ${authUsers.users.length} users in auth table`);
    
    // Check each email in the auth table
    for (const email of emailsToCheck) {
      const matchingUser = authUsers.users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
      );
      
      if (matchingUser) {
        console.log(`✅ Auth user found for ${email} (ID: ${matchingUser.id})`);
      } else {
        console.log(`❌ No auth user found for ${email}`);
      }
    }
    
    // Get profiles schema
    console.log('\nChecking profiles table structure...');
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');
    
    if (schemaError) {
      console.error('Error fetching profiles schema:', schemaError.message);
    } else {
      console.log('Profiles table columns:', schema.map(col => col.column_name));
    }
    
    // Fetch all profiles
    console.log('\nFetching all profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, email');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
      return;
    }
    
    console.log(`Found ${profiles.length} profiles in the profiles table`);
    
    // For debugging - show first few profiles
    if (profiles.length > 0) {
      console.log('Sample profiles:', profiles.slice(0, 3));
    }
    
    // Check if emails in profiles table directly by email if column exists
    if (profiles.length > 0 && profiles[0].email) {
      for (const email of emailsToCheck) {
        const matchingProfile = profiles.find(
          profile => profile.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (matchingProfile) {
          console.log(`✅ Profile found for ${email} by email (ID: ${matchingProfile.id})`);
        } else {
          console.log(`❌ No profile found for ${email} by email`);
        }
      }
    } else {
      console.log('Profiles table does not have an email column, checking by auth ID...');
      
      // Check if profiles exist by matching auth IDs
      for (const email of emailsToCheck) {
        const authUser = authUsers.users.find(
          user => user.email.toLowerCase() === email.toLowerCase()
        );
        
        if (authUser) {
          const matchingProfile = profiles.find(
            profile => profile.id === authUser.id
          );
          
          if (matchingProfile) {
            console.log(`✅ Profile found for ${email} by ID (ID: ${matchingProfile.id})`);
          } else {
            console.log(`❌ No profile found for ${email} by ID`);
          }
        } else {
          console.log(`➖ Cannot check profile for ${email} (no auth user)`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('Starting profiles check...');
checkProfiles(); 