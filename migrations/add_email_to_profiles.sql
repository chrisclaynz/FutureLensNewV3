-- Migration to add email field to profiles table

-- First check if the profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Add email column if it doesn't exist
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    
    -- Update profiles with emails from auth.users
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
    
    -- Update trigger function to include email when creating new profiles
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
        INSERT INTO public.profiles (id, role, email)
        VALUES (new.id, 'student', new.email)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;
        RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    
    -- Log the migration
    INSERT INTO public.audit_log (action, table_name, description)
    VALUES 
    ('ALTER_TABLE', 'profiles', 'Added email field to profiles table and updated synchronization with auth.users')
    ON CONFLICT (action, table_name) 
    DO UPDATE SET 
        description = 'Updated profiles table with email field',
        created_at = timezone('utc'::text, now());
        
    RAISE NOTICE 'Successfully added email field to profiles table and updated trigger function.';
  ELSE
    RAISE NOTICE 'The profiles table does not exist. Please run the fix_teacher_role_security.sql migration first.';
  END IF;
END
$$; 