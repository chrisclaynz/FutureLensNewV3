import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://noxrttgtvhtoiejujoyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', SUPABASE_URL);
console.log('Service key available:', !!SUPABASE_SERVICE_KEY);
if (SUPABASE_SERVICE_KEY) {
  console.log('Service key length:', SUPABASE_SERVICE_KEY.length);
  console.log('Service key first 5 chars:', SUPABASE_SERVICE_KEY.substring(0, 5));
}

// Check for service key
if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

// Check for URL
if (!SUPABASE_URL) {
  console.error('Error: VITE_SUPABASE_URL required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const VALID_ROLES = ['student', 'teacher', 'admin'];
const csvFilePath = 'test SB import.csv';

async function importUsers() {
  try {
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    const users = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].replace(/^"|"$/g, '').split(',');
      
      let role = values[2]?.trim().replace(/[\r\n\s"]+/g, '');
      if (!VALID_ROLES.includes(role)) role = 'student';
      
      users.push({
        email: values[0]?.trim(),
        password: values[1]?.trim(),
        role: role
      });
    }
    
    console.log(`Found ${users.length} users to import`);
    if (users.length > 0) console.log('First user:', users[0]);
    
    // Fetch existing auth users
    console.log('\nFetching existing users from auth system...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError.message);
      return;
    }
    
    console.log(`Found ${authData.users.length} existing auth users`);
    
    // Create sets of existing emails for quick lookups
    const existingAuthEmails = new Set(
      authData.users.map(user => user.email.toLowerCase())
    );
    
    // Get all profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
      return;
    }
    
    console.log(`Found ${allProfiles.length} existing profiles`);
    
    // Create sets for all emails and IDs in profiles table
    const existingProfileEmails = new Set(
      allProfiles
        .filter(profile => profile.email)
        .map(profile => profile.email.toLowerCase())
    );
    
    const existingProfileIds = new Set(
      allProfiles.map(profile => profile.id)
    );
    
    console.log('\nStarting import in 5 seconds (Ctrl+C to cancel)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let success = 0, skipped = 0, errors = 0;
    
    for (const user of users) {
      try {
        if (!user.email || !user.password) {
          console.error('Missing data:', user);
          errors++;
          continue;
        }
        
        const userEmail = user.email.toLowerCase();
        
        // Skip if user already exists in auth
        if (existingAuthEmails.has(userEmail)) {
          console.log(`User ${user.email} already exists in auth - skipping`);
          skipped++;
          continue;
        }
        
        // Skip if profile email already exists
        if (existingProfileEmails.has(userEmail)) {
          console.log(`Profile for ${user.email} already exists - skipping`);
          skipped++;
          continue;
        }
        
        // Create user in auth system
        console.log(`Creating user: ${user.email}`);
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });
        
        if (error) {
          console.error(`Error creating ${user.email}:`, error.message);
          errors++;
          continue;
        }
        
        // Directly check if this specific ID exists in profiles table
        const { data: profileCheck, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
          
        if (checkError) {
          console.error(`Error checking profile for ${user.email}:`, checkError.message);
        }
        
        if (profileCheck) {
          console.log(`WARNING: Profile ID ${data.user.id} already exists. Updating instead.`);
          
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: user.email,
              role: user.role
            })
            .eq('id', data.user.id);
            
          if (updateError) {
            console.error(`Error updating profile for ${user.email}:`, updateError.message);
            
            // Clean up auth user
            await supabase.auth.admin.deleteUser(data.user.id);
            console.log(`Deleted auth user ${user.email} due to profile update failure`);
            
            errors++;
            continue;
          }
          
          console.log(`Successfully updated profile for: ${user.email}`);
          success++;
          continue;
        }
        
        // If profile with ID doesn't exist, create a new one
        console.log(`Creating profile for: ${user.email} (ID: ${data.user.id})`);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: user.email,
            role: user.role,
            cohort_ids: []
          });
          
        if (profileError) {
          console.error(`Profile error for ${user.email}:`, profileError.message);
          
          // Try to clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(data.user.id);
          console.log(`Deleted auth user ${user.email} due to profile creation failure`);
          
          errors++;
          continue;
        }
        
        console.log(`Successfully imported: ${user.email}`);
        success++;
        
      } catch (err) {
        console.error(`Error with ${user.email}:`, err.message);
        errors++;
      }
    }
    
    console.log('\nImport Complete:');
    console.log(`- Total: ${users.length}`);
    console.log(`- Successfully imported: ${success}`);
    console.log(`- Skipped (already exist): ${skipped}`);
    console.log(`- Errors: ${errors}`);
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

console.log(`Starting import from ${csvFilePath}...`);
importUsers(); 