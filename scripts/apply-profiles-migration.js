// Script to apply the profiles table migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

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

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for confirmation
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Main function to apply the migration
async function applyProfilesMigration() {
  console.log('Starting profiles table migration...');
  
  try {
    // Path to the SQL file
    const sqlFilePath = path.join(__dirname, '../migrations/create_profiles_table.sql');
    
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Migration SQL loaded successfully.');
    
    // Split the SQL into individual statements at semicolons
    // But be careful not to split inside function definitions
    let inFunction = false;
    let statements = [];
    let currentStatement = '';
    
    sql.split('\n').forEach(line => {
      // Check if we're entering a function definition
      if (line.includes('FUNCTION') && line.includes('AS $$')) {
        inFunction = true;
      }
      
      // Add the line to the current statement
      currentStatement += line + '\n';
      
      // Check if we're exiting a function definition
      if (inFunction && line.trim() === '$$;') {
        inFunction = false;
        statements.push(currentStatement);
        currentStatement = '';
      } 
      // Check if this is the end of a normal statement
      else if (!inFunction && line.trim().endsWith(';')) {
        statements.push(currentStatement);
        currentStatement = '';
      }
    });
    
    // Execute each SQL statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      // Skip empty statements
      if (!statement) continue;
      
      try {
        // Execute the SQL directly using exec_sql RPC function
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error executing statement ${i+1}:`, error.message);
          console.error('Statement:', statement);
          const continueExecution = await question('Continue execution (y/n)? ');
          if (continueExecution.toLowerCase() !== 'y') {
            process.exit(1);
          }
        } else {
          console.log(`✅ Statement ${i+1} executed successfully.`);
        }
      } catch (statementError) {
        console.error(`Error with statement ${i+1}:`, statementError.message);
        const continueExecution = await question('Continue execution (y/n)? ');
        if (continueExecution.toLowerCase() !== 'y') {
          process.exit(1);
        }
      }
    }
    
    console.log('✅ Profiles table migration has been successfully applied!');
    console.log('The following has been set up:');
    console.log('1. Created profiles table with role, cohort_ids, and email fields');
    console.log('2. Set up Row Level Security policies for secure access');
    console.log('3. Created appropriate indexes for performance');
    console.log('4. Migrated user data from auth.users to profiles');
    console.log('5. Set up automatic profile creation for new users');
    
    // Now verify if it worked
    const { data: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error verifying profiles table:', countError.message);
    } else {
      console.log(`Profiles table contains ${profileCount?.length || 0} records.`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the migration
applyProfilesMigration(); 