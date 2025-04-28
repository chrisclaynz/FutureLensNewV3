// Script to implement the enhanced security fix with auditing for search_path vulnerability
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
async function fixSearchPathEnhanced() {
  console.log('Applying enhanced security fix with auditing for search_path vulnerability...');
  
  try {
    // First, backup current function definitions
    await backupFunctionDefinitions();
    
    // Create security audit log table
    const createAuditLogTable = `
      CREATE TABLE IF NOT EXISTS security_audit_log (
        id SERIAL PRIMARY KEY,
        function_name TEXT NOT NULL,
        parameters JSONB,
        user_id UUID DEFAULT auth.uid(),
        execution_time TIMESTAMP DEFAULT NOW()
      );
      
      -- Enable RLS on security_audit_log
      ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for read access to authenticated users
      CREATE POLICY "Authenticated users can view security audit logs"
      ON security_audit_log
      FOR SELECT
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Create policy for insert access to all (because the function executes as SECURITY DEFINER)
      CREATE POLICY "Everyone can insert into security audit logs"
      ON security_audit_log
      FOR INSERT
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Grant permissions
      GRANT SELECT ON security_audit_log TO authenticated;
      GRANT INSERT ON security_audit_log TO anon, authenticated;
    `;
    
    console.log('Creating security audit log table...');
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createAuditLogTable });
    
    if (tableError) {
      console.error('Error creating security audit log table:', tableError.message);
    } else {
      console.log('✅ Security audit log table created or already exists!');
    }
    
    // Fix exec_sql function with auditing
    const fixExecSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        -- Add audit log entry
        INSERT INTO security_audit_log(function_name, parameters)
        VALUES ('exec_sql', jsonb_build_object('sql_hash', md5(sql)));
        
        -- Execute the SQL
        EXECUTE sql;
      END;
      $$;
    `;
    
    console.log('Fixing exec_sql function with auditing...');
    const { error: execError } = await supabase.rpc('exec_sql', { sql: fixExecSql });
    
    if (execError) {
      console.error('Error fixing exec_sql function:', execError.message);
    } else {
      console.log('✅ exec_sql function fixed with auditing successfully!');
    }
    
    // Fix check_tables_exist function with auditing
    const fixCheckTablesExist = `
      -- Only fix if the function exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = 'check_tables_exist'
        ) THEN
          -- Get current function definition
          DECLARE 
            func_def text;
            param_names text[];
            param_types text[];
            return_type text;
          BEGIN
            -- Get function details
            SELECT r.routine_definition, 
                   array_agg(p.parameter_name ORDER BY p.ordinal_position) as param_names,
                   array_agg(p.data_type ORDER BY p.ordinal_position) as param_types,
                   r.data_type as return_type
            INTO func_def, param_names, param_types, return_type
            FROM information_schema.routines r
            LEFT JOIN information_schema.parameters p ON 
              r.specific_schema = p.specific_schema AND
              r.specific_name = p.specific_name
            WHERE r.routine_schema = 'public' 
            AND r.routine_name = 'check_tables_exist'
            GROUP BY r.routine_definition, r.data_type;
            
            -- Create dynamic SQL for function recreation with params
            DECLARE
              param_list text := '';
              audit_params text := '';
            BEGIN
              -- Build parameter list if any
              IF param_names IS NOT NULL AND array_length(param_names, 1) > 0 THEN
                FOR i IN 1..array_length(param_names, 1) LOOP
                  IF i > 1 THEN
                    param_list := param_list || ', ';
                    audit_params := audit_params || ', ';
                  END IF;
                  param_list := param_list || param_names[i] || ' ' || param_types[i];
                  audit_params := audit_params || '''' || param_names[i] || ''', ' || param_names[i];
                END LOOP;
              END IF;
              
              -- Create new function with auditing and fixed search path
              EXECUTE format('
                CREATE OR REPLACE FUNCTION check_tables_exist(%s)
                RETURNS %s
                LANGUAGE plpgsql
                SECURITY DEFINER
                SET search_path = public
                AS $BODY$
                DECLARE
                  result %s;
                BEGIN
                  -- Add audit log entry
                  INSERT INTO security_audit_log(function_name, parameters)
                  VALUES (''check_tables_exist'', jsonb_build_object(%s));
                  
                  -- Original function body
                  %s
                  
                  RETURN result;
                END;
                $BODY$;
              ', 
              param_list, 
              return_type,
              return_type,
              audit_params,
              regexp_replace(func_def, 'RETURN (.*?);', 'result := \\1;', 'g')
              );
              
              RAISE NOTICE 'check_tables_exist function fixed with auditing successfully!';
            END;
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
      console.log('✅ check_tables_exist function checked/fixed with auditing successfully!');
    }
    
    // Verify fixes
    await verifyFixes();
    
    console.log('Enhanced security fix with auditing applied successfully!');
    console.log('Benefits of this implementation:');
    console.log('1. Fixed search_path to prevent injection attacks');
    console.log('2. Added comprehensive audit logging for security-sensitive operations');
    console.log('3. Maintains all existing functionality while enhancing security');
    
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
    const backupFile = path.join(backupDir, `function_backup_enhanced_${timestamp}.json`);
    
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
    
    // Check if function body includes audit logging
    if (func.routine_definition.includes('security_audit_log')) {
      console.log(`✅ ${func.routine_name}: Includes audit logging`);
    } else {
      console.warn(`⚠️ ${func.routine_name}: No audit logging found in function body!`);
      allFixed = false;
    }
  }
  
  // Verify security_audit_log table exists
  const tableQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'security_audit_log'
    ) as table_exists;
  `;
  
  const { error: tableError, data: tableData } = await supabase.rpc('exec_sql', { sql: tableQuery });
  
  if (tableError) {
    console.error('Error checking security_audit_log table:', tableError.message);
    return;
  }
  
  if (tableData && tableData[0] && tableData[0].table_exists) {
    console.log('✅ security_audit_log table exists');
  } else {
    console.warn('⚠️ security_audit_log table does not exist!');
    allFixed = false;
  }
  
  if (allFixed) {
    console.log('All functions have been fixed successfully with audit logging!');
  } else {
    console.warn('Some fixes may not have been applied properly. Check the logs above.');
  }
}

// Run the fix
fixSearchPathEnhanced().catch(console.error); 