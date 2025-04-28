-- Fix for the check_tables_exist function's ambiguous column reference

-- Recreate the function with the proper table alias
CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing_tables text[] := '{}';
  t_name text;
BEGIN
  -- Log the function call
  PERFORM log_function_call('check_tables_exist', jsonb_build_object('table_names', table_names));
  
  -- Check each table
  FOREACH t_name IN ARRAY table_names LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables tabs
      WHERE tabs.table_schema = 'public' 
      AND tabs.table_name = t_name
    ) THEN
      missing_tables := array_append(missing_tables, t_name);
    END IF;
  END LOOP;
  
  -- Return true if all tables exist, false otherwise
  RETURN array_length(missing_tables, 1) IS NULL;
END;
$$; 