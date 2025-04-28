// Test script for the new purpose-specific functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a simple test table
async function createTestTable() {
  try {
    console.log('Creating test table...');
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_security_table (
          id SERIAL PRIMARY KEY,
          name TEXT,
          created_by UUID DEFAULT auth.uid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
      `
    });
    
    if (error) {
      console.error('Error creating test table:', error.message);
      return false;
    }
    
    console.log('Test table created successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error creating test table:', error.message);
    return false;
  }
}

// Test enable_rls_on_table function
async function testEnableRLS() {
  try {
    console.log('\nTesting enable_rls_on_table function...');
    
    // Try the new function
    const { error } = await supabase.rpc('enable_rls_on_table', {
      table_name: 'test_security_table'
    });
    
    if (error) {
      console.error('Error enabling RLS:', error.message);
      return false;
    }
    
    console.log('RLS enabled successfully using new function');
    return true;
  } catch (error) {
    console.error('Unexpected error enabling RLS:', error.message);
    return false;
  }
}

// Test creating a policy
async function testCreatePolicy() {
  try {
    console.log('\nTesting create_rls_policy function...');
    
    // Create a policy for SELECT
    const { error: selectError } = await supabase.rpc('create_rls_policy', {
      policy_name: 'users_can_view_own_records',
      table_name: 'test_security_table',
      operation: 'SELECT',
      using_expr: 'created_by = auth.uid()',
      with_check_expr: null,
      roles: null
    });
    
    if (selectError) {
      console.error('Error creating SELECT policy:', selectError.message);
      return false;
    }
    
    // Create a policy for INSERT
    const { error: insertError } = await supabase.rpc('create_rls_policy', {
      policy_name: 'users_can_insert_records',
      table_name: 'test_security_table',
      operation: 'INSERT',
      using_expr: 'true', // For INSERT, this becomes the WITH CHECK clause
      with_check_expr: null,
      roles: null
    });
    
    if (insertError) {
      console.error('Error creating INSERT policy:', insertError.message);
      return false;
    }
    
    console.log('RLS policies created successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error creating policies:', error.message);
    return false;
  }
}

// Test check_tables_exist function
async function testCheckTablesExist() {
  try {
    console.log('\nTesting check_tables_exist function...');
    
    // Check if tables exist
    const { data, error } = await supabase.rpc('check_tables_exist', {
      table_names: ['test_security_table', 'nonexistent_table']
    });
    
    if (error) {
      console.error('Error checking tables:', error.message);
      return false;
    }
    
    console.log('Check tables result:', data);
    return true;
  } catch (error) {
    console.error('Unexpected error checking tables:', error.message);
    return false;
  }
}

// Test grant_table_permissions function
async function testGrantPermissions() {
  try {
    console.log('\nTesting grant_table_permissions function...');
    
    // Grant permissions
    const { error } = await supabase.rpc('grant_table_permissions', {
      table_name: 'test_security_table',
      permissions: 'SELECT, INSERT',
      roles: ['authenticated']
    });
    
    if (error) {
      console.error('Error granting permissions:', error.message);
      return false;
    }
    
    console.log('Permissions granted successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error granting permissions:', error.message);
    return false;
  }
}

// Test the old exec_sql function to see deprecation notice (check logs in Supabase)
async function testDeprecatedExecSql() {
  try {
    console.log('\nTesting deprecated exec_sql function...');
    
    // Use the deprecated function
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) FROM test_security_table'
    });
    
    if (error) {
      console.error('Error using exec_sql:', error.message);
      return false;
    }
    
    console.log('exec_sql used successfully (check Supabase logs for deprecation notice)');
    return true;
  } catch (error) {
    console.error('Unexpected error using exec_sql:', error.message);
    return false;
  }
}

// Get audit logs
async function getAuditLogs() {
  try {
    console.log('\nFetching security audit logs...');
    
    // Use exec_sql to get logs (since we need to bypass RLS for testing)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT * FROM security_audit_log ORDER BY execution_time DESC LIMIT 10'
    });
    
    if (error) {
      console.error('Error fetching audit logs:', error.message);
      return false;
    }
    
    console.log('Security audit logs:');
    console.table(data);
    return true;
  } catch (error) {
    console.error('Unexpected error fetching audit logs:', error.message);
    return false;
  }
}

// Clean up
async function cleanUp() {
  try {
    console.log('\nCleaning up...');
    
    // Drop the test table
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS test_security_table'
    });
    
    if (error) {
      console.error('Error cleaning up:', error.message);
      return false;
    }
    
    console.log('Cleanup successful');
    return true;
  } catch (error) {
    console.error('Unexpected error during cleanup:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting tests for function_search_path fix (Option C)...');
  
  // Create test table
  if (!await createTestTable()) {
    console.error('Test setup failed. Aborting tests.');
    return;
  }
  
  // Run tests
  await testEnableRLS();
  await testCreatePolicy();
  await testCheckTablesExist();
  await testGrantPermissions();
  await testDeprecatedExecSql();
  await getAuditLogs();
  
  // Clean up
  await cleanUp();
  
  console.log('\nTests completed!');
}

// Run the tests
runTests().catch(console.error); 