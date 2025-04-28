-- Direct SQL script to enable RLS on the surveys table
-- You can copy and paste this into the Supabase SQL Editor

-- Enable RLS on the surveys table
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies
DROP POLICY IF EXISTS "Anyone can view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys they own" ON public.surveys;

-- Create policies
-- Allow anyone to read surveys
CREATE POLICY "Anyone can view surveys"
ON public.surveys
FOR SELECT
USING (true);

-- Only authenticated users can insert surveys
CREATE POLICY "Only authenticated users can insert surveys"
ON public.surveys
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy for update operations
CREATE POLICY "Authenticated users can update surveys they own"
ON public.surveys
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Grant appropriate permissions
GRANT SELECT ON public.surveys TO anon, authenticated;
GRANT INSERT, UPDATE ON public.surveys TO authenticated; 