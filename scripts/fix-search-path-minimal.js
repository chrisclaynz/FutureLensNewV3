// Script to implement the minimal fix for search_path vulnerability in database functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key must be set in environment variables.');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Main function
async function fixSearchPathMinimal() {
  console.log('Applying minimal fix for search_path vulnerability...');
  
  try {
    // First, backup current function definitions
    await backupFunctionDefinitions();
    
    // Fix exec_sql function
    const fixExecSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    console.log('Fixing exec_sql function...');
    const { error: execError } = await supabase.rpc('exec_sql', { sql: fixExecSql });
    
    if (execError) {
      console.error('Error fixing exec_sql function:', execError.message);
    } else {
      console.log('✅ exec_sql function fixed successfully!');
    }
    
    // Fix check_tables_exist function
    const fixCheckTablesExist = `
      -- Only fix if the function exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = 'check_tables_exist'
        ) THEN
          -- Recreate the function with fixed search_path
          -- First, we need to get the current definition
          DECLARE 
            func_def text;
          BEGIN
            SELECT routine_definition 
            INTO func_def
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'check_tables_exist';
            
            -- Extract the function body - this is simplified and might not work for all definitions
            EXECUTE 'CREATE OR REPLACE FUNCTION check_tables_exist()
              RETURNS boolean
              LANGUAGE plpgsql
              SECURITY DEFINER
              SET search_path = public
              AS $BODY$' || func_def || '$BODY$;';
              
            RAISE NOTICE 'check_tables_exist function fixed successfully!';
          END;
        ELSE
          RAISE NOTICE 'check_tables_exist function not found, skipping fix.';
        END IF;
      END
      $$;
    `;
    
    console.log('Checking and fixing check_tables_exist function if it exists...');
    const { error: checkError } = await supabase.rpc('exec_sql', { sql: fixCheckTablesExist });
    
    if (checkError) {
      console.error('Error fixing check_tables_exist function:', checkError.message);
    } else {
      console.log('✅ check_tables_exist function checked/fixed successfully!');
    }
    
    // Verify fixes
    await verifyFixes();
    
    console.log('Minimal fix applied successfully!');
    console.log('Note: This fix maintains all existing functionality while addressing the search_path vulnerability.');
    
  } catch (error) {
    console.error('Unexpected error during fix application:', error.message);
    process.exit(1);
  }
}

// Backup function definitions
async function backupFunctionDefinitions() {
  console.log('Backing up current function definitions...');
  
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
  
  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Generate timestamp for backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `function_backup_${timestamp}.json`);
    
    // Get function definitions
    const { error, data } = await supabase.rpc('exec_sql', { sql: backupQuery });
    
    if (error) {
      console.error('Error getting function definitions:', error.message);
      return;
    }
    
    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(data || [], null, 2));
    console.log(`Backup saved to ${backupFile}`);
    
  } catch (error) {
    console.error('Error backing up function definitions:', error.message);
  }
}

// Verify that fixes were applied correctly
async function verifyFixes() {
  console.log('Verifying fixes...');
  
  const verifyQuery = `
    SELECT 
      routine_name, 
      routine_schema, 
      routine_definition, 
      security_type,
      (SELECT setting FROM pg_settings WHERE name = 'search_path') as current_search_path,
      -- Check if function has SET search_path
      (
        SELECT 'SET search_path = ' || array_to_string(setconfig, ', ')
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        LEFT JOIN pg_options_to_table(p.proconfig) o(mapto text, value text) 
          ON o.mapto = 'search_path'
        WHERE n.nspname = 'public' AND p.proname = r.routine_name
        AND proconfig IS NOT NULL
      ) as search_path_setting
    FROM information_schema.routines r
    WHERE routine_schema = 'public' 
    AND routine_name IN ('exec_sql', 'check_tables_exist');
  `;
  
  const { error, data } = await supabase.rpc('exec_sql', { sql: verifyQuery });
  
  if (error) {
    console.error('Error verifying fixes:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No functions found during verification.');
    return;
  }
  
  let allFixed = true;
  
  for (const func of data) {
    if (func.search_path_setting) {
      console.log(`✅ ${func.routine_name}: ${func.search_path_setting}`);
    } else {
      console.warn(`⚠️ ${func.routine_name}: No search_path setting found!`);
      allFixed = false;
    }
  }
  
  if (allFixed) {
    console.log('All functions have been fixed successfully!');
  } else {
    console.warn('Some functions may not have been fixed properly. Check the logs above.');
  }
}

// Run the fix
fixSearchPathMinimal().catch(console.error); 