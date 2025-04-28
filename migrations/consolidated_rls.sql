-- Consolidated RLS Migration
-- This migration file contains all the necessary changes to properly implement RLS
-- across all tables in the FutureLens application

-- Step 1: Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    UNIQUE(action, table_name)
);

-- Enable RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_log
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Server operations can insert audit logs" ON public.audit_log;
CREATE POLICY "Server operations can insert audit logs"
ON public.audit_log
FOR INSERT
USING (true)
WITH CHECK (true);

-- Grant access to audit_log
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO anon, authenticated;

-- Step 2: Ensure RLS is enabled on all tables
DO $$
BEGIN
    -- Check and enable RLS on surveys table
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'surveys' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Row Level Security has been enabled on the surveys table';
    ELSE
        RAISE NOTICE 'Row Level Security is already enabled on the surveys table';
    END IF;

    -- Ensure RLS is enabled on participants table
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'participants' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Row Level Security has been enabled on the participants table';
    ELSE
        RAISE NOTICE 'Row Level Security is already enabled on the participants table';
    END IF;

    -- Ensure RLS is enabled on responses table
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'responses' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Row Level Security has been enabled on the responses table';
    ELSE
        RAISE NOTICE 'Row Level Security is already enabled on the responses table';
    END IF;

    -- Ensure RLS is enabled on cohorts table
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'cohorts' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Row Level Security has been enabled on the cohorts table';
    ELSE
        RAISE NOTICE 'Row Level Security is already enabled on the cohorts table';
    END IF;
END
$$;

-- Step 3: Remove any existing policies to avoid conflicts
-- Surveys table
DROP POLICY IF EXISTS "Anyone can view surveys" ON surveys;
DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Allow everyone to read surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to insert surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys they own" ON surveys;

-- Participants table
DROP POLICY IF EXISTS "Users can only view their own participant records" ON participants;
DROP POLICY IF EXISTS "Users can only insert their own participant records" ON participants;
DROP POLICY IF EXISTS "Users can only access their own participant records" ON participants;

-- Responses table
DROP POLICY IF EXISTS "Users can only view responses for their participant records" ON responses;
DROP POLICY IF EXISTS "Users can only insert responses for their participant records" ON responses;
DROP POLICY IF EXISTS "Users can only access responses for their participant records" ON responses;

-- Cohorts table
DROP POLICY IF EXISTS "Anyone can view cohorts" ON cohorts;
DROP POLICY IF EXISTS "Only authenticated users can insert cohorts" ON cohorts;

-- Step 4: Create consistent policies for all tables
-- Surveys table policies
DROP POLICY IF EXISTS "Anyone can view surveys" ON surveys;
CREATE POLICY "Anyone can view surveys"
ON surveys
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON surveys;
CREATE POLICY "Only authenticated users can insert surveys"
ON surveys
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update surveys they own" ON surveys;
CREATE POLICY "Authenticated users can update surveys they own"
ON surveys
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Participants table policies
CREATE POLICY "Users can only access their own participant records"
ON participants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Responses table policies
CREATE POLICY "Users can only access responses for their participant records"
ON responses
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.id = responses.participant_id
        AND participants.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.id = responses.participant_id
        AND participants.user_id = auth.uid()
    )
);

-- Cohorts table policies
CREATE POLICY "Anyone can view cohorts"
ON cohorts
FOR SELECT
USING (true);

CREATE POLICY "Only authenticated users can insert cohorts"
ON cohorts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Step 5: Grant appropriate permissions
-- Surveys table
GRANT SELECT ON surveys TO anon, authenticated;
GRANT INSERT, UPDATE ON surveys TO authenticated;

-- Participants table
GRANT SELECT, INSERT, UPDATE ON participants TO authenticated;

-- Responses table
GRANT SELECT, INSERT, UPDATE ON responses TO authenticated;

-- Cohorts table
GRANT SELECT ON cohorts TO anon, authenticated;
GRANT INSERT ON cohorts TO authenticated;

-- Add audit log entry
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('ENABLE_RLS', 'all_tables', 'Enabled consistent Row Level Security across all tables')
ON CONFLICT (action, table_name) 
DO UPDATE SET 
    description = 'Updated Row Level Security configuration across all tables',
    created_at = timezone('utc'::text, now());

-- Enable RLS on surveys table
-- This is a simple migration to enable RLS on the surveys table with basic policies

-- Enable RLS on the surveys table
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

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

-- Grant appropriate permissions
GRANT SELECT ON surveys TO anon, authenticated;
GRANT INSERT, UPDATE ON surveys TO authenticated; 