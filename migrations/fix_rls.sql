-- Simplified script to enable RLS on surveys table
-- This fixes the "only WITH CHECK expression allowed for INSERT" error

-- Enable RLS on the surveys table if not already enabled
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Only authenticated users can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys they own" ON public.surveys;

-- Create select policy
CREATE POLICY "Anyone can view surveys"
ON public.surveys
FOR SELECT
USING (true);

-- Create insert policy
CREATE POLICY "Only authenticated users can insert surveys"
ON public.surveys
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create update policy
CREATE POLICY "Authenticated users can update surveys they own"
ON public.surveys
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Grant appropriate permissions
GRANT SELECT ON public.surveys TO anon, authenticated;
GRANT INSERT, UPDATE ON public.surveys TO authenticated; 