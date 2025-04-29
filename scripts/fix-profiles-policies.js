// Script to fix the profiles table policies recursion issue
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check required environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Required environment variables VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.');
  console.error('Please ensure these are properly set in your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Main function to apply the fix
async function fixProfilesPolicies() {
  console.log('Fixing profiles table RLS policies...');
  
  try {
    // Path to the SQL file
    const sqlFilePath = path.join(__dirname, '../migrations/fix_profiles_policies.sql');
    
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Fix SQL loaded successfully.');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error executing the fix:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Profiles table policies fixed successfully!');
    console.log('The following changes were made:');
    console.log('1. Fixed recursive policies');
    console.log('2. Added proper admin access using metadata');
    console.log('3. Updated teacher access policy');
    console.log('4. Added a function to set admin privileges');
    
    console.log('\nYou can now make a user an admin with:');
    console.log('SELECT make_user_admin(\'admin@example.com\');');

  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixProfilesPolicies(); 