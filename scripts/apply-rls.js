// Simple script to apply RLS to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key must be set in environment variables.');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in .env file.');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the SQL file
const sqlFilePath = path.join(__dirname, '../migrations/consolidated_rls.sql');

// Main function
async function applyRLS() {
  console.log('Starting RLS application...');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('SQL file loaded successfully.');

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error checking session:', sessionError.message);
      process.exit(1);
    }

    if (!session) {
      console.error('Error: You must be logged in to apply RLS changes.');
      console.error('Please login through the application first in your browser.');
      process.exit(1);
    }

    console.log('User authenticated. Applying RLS...');

    // Check if exec_sql function exists
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.error('Error: The exec_sql function does not exist in your database.');
        console.error('Please run the migration to create this function first, or use the Supabase SQL Editor.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error checking exec_sql function:', error.message);
      process.exit(1);
    }

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying RLS:', error.message);
      process.exit(1);
    }

    console.log('✅ RLS has been successfully applied!');
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
applyRLS().catch(console.error); 