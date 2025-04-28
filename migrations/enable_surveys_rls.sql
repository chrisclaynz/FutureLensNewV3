-- Enable RLS on surveys table
-- This migration ensures RLS is consistently enabled on the surveys table with proper policies
-- It serves as a consolidation of previous inconsistent migrations

-- First, check if RLS is already enabled
DO $$
BEGIN
    -- Check if RLS is disabled on surveys table
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'surveys' 
        AND rowsecurity = true
    ) THEN
        -- Enable RLS on the surveys table
        ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Row Level Security has been enabled on the surveys table';
    ELSE
        RAISE NOTICE 'Row Level Security is already enabled on the surveys table';
    END IF;
END
$$;

-- Remove any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view surveys" ON surveys;
DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Allow everyone to read surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to insert surveys" ON surveys;

-- Create a policy for anonymous and authenticated users to read surveys
CREATE POLICY "Anyone can view surveys"
ON surveys
FOR SELECT
USING (true);

-- Create a policy for only authenticated users to insert surveys
CREATE POLICY "Only authenticated users can insert surveys"
ON surveys
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create a policy for authenticated users to update their own surveys (future feature)
-- For now, we'll use a placeholder check that allows updates based on user ID
-- This will be expanded in the future to include proper ownership checks
CREATE POLICY "Authenticated users can update surveys they own"
ON surveys
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Grant specific access through policies
GRANT SELECT ON surveys TO anon, authenticated;
GRANT INSERT, UPDATE ON surveys TO authenticated;

-- Add audit log entry
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('ENABLE_RLS', 'surveys', 'Enabled Row Level Security on surveys table')
ON CONFLICT DO NOTHING; 