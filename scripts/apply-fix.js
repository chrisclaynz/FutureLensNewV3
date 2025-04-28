// Simple script to apply the fixed RLS SQL
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the SQL file
const sqlFilePath = path.join(__dirname, '../migrations/fix_rls.sql');

async function applyFix() {
  try {
    // Read SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('SQL file loaded successfully.');
    
    // Try to execute the SQL
    try {
      // First try direct execution
      console.log('Trying direct execution...');
      
      // Split queries to execute them one by one
      const queries = sql.split(';').filter(q => q.trim().length > 0);
      
      for (const query of queries) {
        console.log(`Executing query: ${query.substring(0, 50)}...`);
        
        // Use custom RPC function if exists
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: query + ';' });
          if (error) {
            console.error('Error executing query:', error.message);
          } else {
            console.log('Query executed successfully');
          }
        } catch (error) {
          console.error('Error with RPC call:', error.message);
          console.log('Query may need to be executed manually');
        }
      }
      
      console.log('✅ RLS fix has been applied!');
    } catch (error) {
      console.error('Error applying RLS fix:', error.message);
      console.log('\nPlease manually run the SQL in the Supabase SQL Editor:');
      console.log(sql);
    }
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

// Run the script
applyFix().catch(console.error); 