-- Fixed version of exec_sql function with corrected syntax
-- This extracts just the problematic section from functional_redesign.sql and fixes it

-- First check if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'exec_sql'
  ) THEN
    -- Rename the existing function
    ALTER FUNCTION exec_sql(text) RENAME TO exec_sql_original;
    
    -- Create a wrapper function with the original name
    -- Note the corrected syntax here
    EXECUTE $create_func$
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Call the deprecated function
      PERFORM exec_sql_deprecated(sql);
    END;
    $func$
    $create_func$;
    
    RAISE NOTICE 'exec_sql has been replaced with a version that logs deprecation warnings.';
  ELSE
    RAISE NOTICE 'exec_sql function not found, skipping rename.';
  END IF;
END
$$; 