// Admin script to apply RLS to Supabase using service role key
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables from .env file
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to the SQL file
const sqlFilePath = path.join(__dirname, '../migrations/consolidated_rls.sql');

// Function to ask for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Main function
async function applyRLSAdmin() {
  console.log('Starting RLS application with admin privileges...');
  
  try {
    // If URL is not in env, ask for it
    if (!supabaseUrl) {
      supabaseUrl = await question('Enter your Supabase URL: ');
    }
    
    // If service key is not in env, ask for it
    if (!supabaseServiceKey) {
      supabaseServiceKey = await question('Enter your Supabase service role key: ');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Supabase URL and service role key are required.');
      process.exit(1);
    }
    
    console.log('Using Supabase URL:', supabaseUrl);
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('SQL file loaded successfully.');
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying RLS:', error.message);
      process.exit(1);
    }
    
    console.log('✅ RLS has been successfully applied with admin privileges!');
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
applyRLSAdmin().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
}); 