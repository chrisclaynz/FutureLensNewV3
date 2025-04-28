-- Fix for the security_definer_view error in deprecated_function_usage view
-- This migration drops and recreates the view without SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS deprecated_function_usage;

-- Recreate the view without specifying SECURITY DEFINER (defaults to SECURITY INVOKER in newer versions)
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

-- Add a comment to explain the security considerations
COMMENT ON VIEW deprecated_function_usage IS 'Tracks usage of deprecated functions. Inherits security context from caller.';

-- Output a message indicating the fix was applied
DO $$
BEGIN
  RAISE NOTICE 'Fixed security definer issue in deprecated_function_usage view';
END
$$; 