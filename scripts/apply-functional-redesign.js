// Script to apply the functional redesign migration for maximum security
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
const sqlFilePath = path.join(__dirname, '../migrations/functional_redesign.sql');

async function applyFunctionalRedesign() {
  try {
    // Read SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Functional redesign SQL file loaded successfully.');
    
    // Create a backup directory for the database functions
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Backup current function definitions
    const backupQuery = `
      SELECT 
        routine_name, 
        routine_schema, 
        routine_definition, 
        security_type,
        (SELECT setting FROM pg_settings WHERE name = 'search_path') as current_search_path
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('exec_sql', 'check_tables_exist');
    `;
    
    console.log('Creating backup of current function definitions...');
    try {
      // Generate timestamp for backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `function_backup_redesign_${timestamp}.json`);
      
      // Get function definitions
      const { error, data } = await supabase.rpc('exec_sql', { sql: backupQuery })
        .catch(() => ({ error: { message: 'Failed to execute backup query' }, data: null }));
      
      if (error) {
        console.error('Error backing up functions:', error.message);
        console.log('Continuing without backup...');
      } else {
        // Write backup to file
        fs.writeFileSync(backupFile, JSON.stringify(data || [], null, 2));
        console.log(`Backup saved to ${backupFile}`);
      }
    } catch (backupError) {
      console.error('Error during backup:', backupError.message);
      console.log('Continuing without backup...');
    }
    
    // Try to execute the SQL
    try {
      // Split queries to execute them one by one
      // This is a simplified approach - in real SQL migrations we might need
      // a more sophisticated parser to handle complex statements
      const queries = sql.split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .map(q => q + ';');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const query of queries) {
        const shortQuery = query.length > 60 
          ? query.substring(0, 57) + '...' 
          : query;
        console.log(`Executing query: ${shortQuery}`);
        
        // Use custom RPC function if exists
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: query })
            .catch(e => ({ error: e }));
          
          if (error) {
            console.error('Error executing query:', error.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error with RPC call:', error.message);
          console.log('Query may need to be executed manually');
          errorCount++;
        }
      }
      
      console.log(`\nExecution summary: ${successCount} successful queries, ${errorCount} errors`);
      
      if (errorCount > 0) {
        console.warn('\n⚠️ Some queries had errors. You might need to run parts of the migration manually.');
        console.log('Please check the logs above for specific errors.');
      } else {
        console.log('\n✅ Functional redesign migration completed successfully!');
      }
      
      // Verify the new functions exist
      console.log('\nVerifying new functions...');
      
      const verifyQuery = `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN (
          'enable_rls_on_table', 
          'create_rls_policy', 
          'drop_rls_policy',
          'check_tables_exist',
          'grant_table_permissions',
          'revoke_table_permissions',
          'log_function_call',
          'exec_sql_deprecated'
        );
      `;
      
      const { error: verifyError, data: functions } = await supabase.rpc('exec_sql_deprecated', { sql: verifyQuery })
        .catch(() => ({ error: { message: 'Failed to verify functions' }, data: null }));
      
      if (verifyError) {
        console.error('Error verifying functions:', verifyError.message);
      } else if (functions && functions.length > 0) {
        console.log('New functions found:');
        functions.forEach(func => {
          console.log(`- ${func.routine_name}`);
        });
        
        console.log('\nYou can now use these purpose-specific functions instead of exec_sql.');
        console.log('Example: replace exec_sql("ALTER TABLE users ENABLE RLS") with enable_rls_on_table("users")');
      } else {
        console.warn('No new functions found. The migration may not have been applied correctly.');
      }
      
    } catch (error) {
      console.error('Error applying functional redesign:', error.message);
      console.log('\nPlease manually run the SQL in the Supabase SQL Editor:');
      console.log(sql);
    }
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

// Run the script
applyFunctionalRedesign().catch(console.error); 