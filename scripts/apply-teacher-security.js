// Script to apply teacher security migration
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
const sqlFilePath = path.join(__dirname, '../migrations/fix_teacher_role_security.sql');

// Function to ask for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Main function
async function applyTeacherSecurity() {
  console.log('Starting teacher security implementation...');
  
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
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`Error: SQL file not found at ${sqlFilePath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('SQL file loaded successfully.');
    
    // Split SQL into manageable chunks to handle large files
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    // Execute each SQL statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement.trim()) continue;
      
      // Add back the semicolon
      const fullStatement = statement + ';';
      
      try {
        // Execute the SQL directly
        const { error } = await supabase.rpc('exec_sql', { sql: fullStatement });
        
        if (error) {
          console.error(`Error executing statement ${i+1}:`, error.message);
          console.error('Statement:', fullStatement);
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
    
    console.log('✅ Teacher security migration has been successfully applied!');
    console.log('Remember to update your admin.js file to use the new profiles table.');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
applyTeacherSecurity().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
}); 