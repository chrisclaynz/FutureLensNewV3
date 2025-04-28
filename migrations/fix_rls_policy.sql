-- Migration: Functional Redesign of Database Functions
-- This migration replaces the general-purpose exec_sql function with purpose-specific functions
-- Implementation of Option C (Maximum Security)

-- First, let's create an audit log table if it doesn't exist
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
USING (true);

-- Create policy for insert access to all - Fixed: removed USING clause for INSERT policy
CREATE POLICY "Everyone can insert into security audit logs"
ON security_audit_log
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON security_audit_log TO authenticated;
GRANT INSERT ON security_audit_log TO anon, authenticated;

-- Create helper function to log function calls
CREATE OR REPLACE FUNCTION log_function_call(function_name TEXT, parameters JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log(function_name, parameters)
  VALUES (function_name, parameters);
END;
$$;

-- 1. Function to enable RLS on a table
CREATE OR REPLACE FUNCTION enable_rls_on_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the function call
  PERFORM log_function_call('enable_rls_on_table', jsonb_build_object('table_name', table_name));
  
  -- Execute the enable RLS command
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$;

-- 2. Function to create a RLS policy
CREATE OR REPLACE FUNCTION create_rls_policy(
  policy_name text,
  table_name text,
  operation text,
  using_expr text,
  with_check_expr text DEFAULT NULL,
  roles text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sql text;
  roles_clause text := '';
BEGIN
  -- Log the function call
  PERFORM log_function_call('create_rls_policy', jsonb_build_object(
    'policy_name', policy_name,
    'table_name', table_name,
    'operation', operation,
    'roles', roles
  ));
  
  -- Build the SQL command for creating the policy
  sql := format('CREATE POLICY %I ON %I FOR %s', policy_name, table_name, operation);
  
  -- Add the roles clause if specified
  IF roles IS NOT NULL AND array_length(roles, 1) > 0 THEN
    roles_clause := ' TO ' || array_to_string(roles, ', ');
    sql := sql || roles_clause;
  END IF;
  
  -- Add the USING clause for operations that support it (not INSERT)
  IF operation != 'INSERT' THEN
    sql := sql || format(' USING (%s)', using_expr);
  END IF;
  
  -- Add the WITH CHECK clause if provided
  IF with_check_expr IS NOT NULL THEN
    sql := sql || format(' WITH CHECK (%s)', with_check_expr);
  ELSIF operation = 'INSERT' AND using_expr IS NOT NULL THEN
    -- For INSERT, use the using_expr as the WITH CHECK expression if no specific with_check_expr is provided
    sql := sql || format(' WITH CHECK (%s)', using_expr);
  END IF;
  
  -- Execute the command
  EXECUTE sql;
END;
$$;

-- 3. Function to drop a RLS policy
CREATE OR REPLACE FUNCTION drop_rls_policy(policy_name text, table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the function call
  PERFORM log_function_call('drop_rls_policy', jsonb_build_object(
    'policy_name', policy_name,
    'table_name', table_name
  ));
  
  -- Execute the command
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
END;
$$;

-- 4. Function to check if tables exist
CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing_tables text[] := '{}';
  table_name text;
BEGIN
  -- Log the function call
  PERFORM log_function_call('check_tables_exist', jsonb_build_object('table_names', table_names));
  
  -- Check each table
  FOREACH table_name IN ARRAY table_names LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  -- Return true if all tables exist, false otherwise
  RETURN array_length(missing_tables, 1) IS NULL;
END;
$$;

-- 5. Function to grant permissions on a table
CREATE OR REPLACE FUNCTION grant_table_permissions(
  table_name text,
  permissions text,
  roles text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the function call
  PERFORM log_function_call('grant_table_permissions', jsonb_build_object(
    'table_name', table_name,
    'permissions', permissions,
    'roles', roles
  ));
  
  -- Execute the command
  EXECUTE format('GRANT %s ON %I TO %s', 
                 permissions, 
                 table_name, 
                 array_to_string(roles, ', '));
END;
$$;

-- 6. Function to revoke permissions on a table
CREATE OR REPLACE FUNCTION revoke_table_permissions(
  table_name text,
  permissions text,
  roles text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the function call
  PERFORM log_function_call('revoke_table_permissions', jsonb_build_object(
    'table_name', table_name,
    'permissions', permissions,
    'roles', roles
  ));
  
  -- Execute the command
  EXECUTE format('REVOKE %s ON %I FROM %s', 
                 permissions, 
                 table_name, 
                 array_to_string(roles, ', '));
END;
$$;

-- Create a migration function to handle the transition
-- This function will help users migrate from using exec_sql to the new purpose-specific functions
CREATE OR REPLACE FUNCTION exec_sql_deprecated(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the deprecated function call with a warning
  PERFORM log_function_call('exec_sql_deprecated', jsonb_build_object(
    'sql_hash', md5(sql),
    'warning', 'This function is deprecated and will be removed in a future version. Use purpose-specific functions instead.'
  ));
  
  -- Show a notice to the user
  RAISE NOTICE 'WARNING: exec_sql() is deprecated and will be removed in a future version.';
  RAISE NOTICE 'Please migrate to purpose-specific functions. See documentation for details.';
  
  -- Execute the SQL for backward compatibility
  EXECUTE sql;
END;
$$;

-- Create a view to help users identify usage of the deprecated function
CREATE OR REPLACE VIEW deprecated_function_usage AS
SELECT 
  function_name,
  user_id,
  count(*) as usage_count,
  min(execution_time) as first_use,
  max(execution_time) as last_use
FROM security_audit_log
WHERE function_name = 'exec_sql_deprecated'
GROUP BY function_name, user_id
ORDER BY last_use DESC;

-- Rename the original function to the deprecated version to maintain backward compatibility
DO $outer$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'exec_sql'
  ) THEN
    ALTER FUNCTION exec_sql(text) RENAME TO exec_sql_original;
    
    -- Create a wrapper function with the original name
    EXECUTE $inner$
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      -- Call the deprecated function
      PERFORM exec_sql_deprecated(sql);
    END;
    $body$;
    $inner$;
    
    RAISE NOTICE 'exec_sql has been replaced with a version that logs deprecation warnings.';
  ELSE
    RAISE NOTICE 'exec_sql function not found, skipping rename.';
  END IF;
END
$outer$;

-- Add a comment to the database to indicate this migration has been applied
COMMENT ON DATABASE postgres IS 'Functional redesign migration applied. exec_sql is now deprecated.';

-- Output a message to indicate the migration is complete
DO $notice$
BEGIN
  RAISE NOTICE 'Migration complete: exec_sql has been deprecated and replaced with purpose-specific functions.';
  RAISE NOTICE 'Users of exec_sql will now receive deprecation warnings to help with migration.';
END
$notice$; 