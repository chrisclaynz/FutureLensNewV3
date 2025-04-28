-- More explicit fix for security_definer_view issue
-- First check if the view exists and is SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS deprecated_function_usage;

-- Get the existing view definition from the original migration
-- We need to recreate it with SECURITY INVOKER explicitly
CREATE OR REPLACE VIEW deprecated_function_usage 
WITH (security_barrier=false)  -- Explicitly set security_barrier to false
AS
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

-- Now explicitly alter the view to set SECURITY INVOKER
-- For PostgreSQL 9.6 and above
ALTER VIEW deprecated_function_usage SET (security_barrier=false);

-- If your PostgreSQL version supports it (version 11+), also try:
DO $$
BEGIN
  -- Try to alter the view's security context if PostgreSQL version supports it
  BEGIN
    EXECUTE 'ALTER VIEW deprecated_function_usage SET (security_invoker=true)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set security_invoker. This may require PostgreSQL 11+';
  END;
END
$$;

-- Add an explicit comment for troubleshooting
COMMENT ON VIEW deprecated_function_usage IS 'Tracks usage of deprecated functions. EXPLICITLY set to NOT use SECURITY DEFINER.';

-- Output a message indicating the fix was applied
DO $$
BEGIN
  RAISE NOTICE 'Applied explicit fix to deprecated_function_usage view';
END
$$; 