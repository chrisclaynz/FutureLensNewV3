-- Fix for infinite recursion in profiles table policies

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin access all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view participants in their cohorts" ON public.participants;

-- Create simplified policies that don't cause recursion
-- Everyone can view their own profile (basic self-access)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Everyone can update their own profile (basic self-access)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a separate policy for admin view that uses metadata directly
CREATE POLICY "Admin access all profiles" 
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Update the teacher access policies to use direct auth checks
CREATE POLICY "Teachers can view participants in their cohorts"
ON public.participants
FOR SELECT
USING (
    (
        EXISTS (
            SELECT 1 
            FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role')::text = 'teacher'
        )
        AND
        EXISTS (
            SELECT 1 
            FROM public.profiles
            WHERE id = auth.uid()
            AND participants.cohort_id = ANY(cohort_ids)
        )
    )
    OR
    auth.uid() = user_id
);

-- Create a helper function to set admin flag
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN 'User not found with email: ' || user_email;
    END IF;
    
    -- Update user metadata to include admin flag
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_admin}',
        'true'::jsonb
    )
    WHERE id = user_id;
    
    -- Also update profile role
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = user_id;
    
    RETURN 'Successfully set user as admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public; 