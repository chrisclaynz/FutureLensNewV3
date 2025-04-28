-- Rollback script for surveys table RLS
-- This script disables RLS on the surveys table and removes all associated policies
-- USE WITH CAUTION - only run this script if there are serious issues with the RLS implementation

-- Record the rollback in the audit log
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('DISABLE_RLS', 'surveys', 'Disabled Row Level Security on surveys table due to issues')
ON CONFLICT (action, table_name) 
DO UPDATE SET 
    description = 'Disabled Row Level Security on surveys table due to issues',
    created_at = timezone('utc'::text, now());

-- Drop all policies on the surveys table
DROP POLICY IF EXISTS "Anyone can view surveys" ON surveys;
DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Allow everyone to read surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to insert surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys they own" ON surveys;

-- Disable RLS on the surveys table
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON surveys TO authenticated;
GRANT SELECT ON surveys TO anon; 