-- Create a PostgreSQL function to execute arbitrary SQL
-- This is needed for our RLS script to work

-- Create the exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with the permissions of the creator
AS $$
BEGIN
    EXECUTE sql;
END;
$$; 