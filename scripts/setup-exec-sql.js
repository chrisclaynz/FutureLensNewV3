// Script to set up the exec_sql function in Supabase
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
const sqlFilePath = path.join(__dirname, '../migrations/create_exec_sql.sql');

// Main function
async function setupExecSql() {
  console.log('Setting up exec_sql function...');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('SQL file loaded successfully.');

    // Execute the SQL directly
    const { error } = await supabase.from('_exec_sql_setup').select('*').limit(1).then(
      () => ({ error: null }), // Success case (shouldn't happen)
      async () => {
        // This table doesn't exist, which is expected
        // Now execute our SQL to create the function
        return await supabase.rpc('exec_sql', { sql }).catch(async () => {
          // If exec_sql doesn't exist yet, use raw query approach
          try {
            // This part is tricky as Supabase JS client doesn't
            // expose raw SQL execution. Let's use a workaround.
            const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({ sql })
            });
            
            if (!result.ok) {
              const errorText = await result.text();
              throw new Error(errorText);
            }
            
            return { error: null };
          } catch (fetchError) {
            console.log('Direct execution via REST failed:', fetchError.message);
            
            // Provide user with SQL to run manually
            console.log('\n\n⚠️ IMPORTANT ⚠️');
            console.log('Please run the following SQL in the Supabase SQL Editor:');
            console.log('\n-----------------------------------\n');
            console.log(sql);
            console.log('\n-----------------------------------\n');
            return { error: new Error('Manual intervention required') };
          }
        });
      }
    );
    
    if (error) {
      console.error('Error setting up exec_sql function:', error.message);
      process.exit(1);
    }

    console.log('✅ exec_sql function has been successfully set up!');
    console.log('You can now run "npm run apply:rls" to apply Row Level Security.');
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
setupExecSql().catch(console.error); 