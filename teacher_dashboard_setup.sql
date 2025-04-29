-- Check if profiles table exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email TEXT,
            role TEXT DEFAULT 'student',
            cohort_ids UUID[] DEFAULT '{}'::UUID[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow users to view their own profile
        CREATE POLICY "Users can view their own profile"
        ON public.profiles
        FOR SELECT
        USING (auth.uid() = id);
        
        -- Create policy to allow users to update their own profile
        CREATE POLICY "Users can update their own profile"
        ON public.profiles
        FOR UPDATE
        USING (auth.uid() = id);
        
        -- Create policy to allow admins to view all profiles
        CREATE POLICY "Admins can view all profiles"
        ON public.profiles
        FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ));
        
        -- Create policy to allow admins to update all profiles
        CREATE POLICY "Admins can update all profiles"
        ON public.profiles
        FOR UPDATE
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ));
        
        -- Create policy to allow teachers to view profiles for their cohorts
        CREATE POLICY "Teachers can view profiles for their cohorts"
        ON public.profiles
        FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher' AND
            (SELECT COUNT(*) FROM UNNEST(cohort_ids) AS teacher_cohort_id
             INNER JOIN UNNEST(public.profiles.cohort_ids) AS student_cohort_id
             ON teacher_cohort_id = student_cohort_id) > 0
        ));
    END IF;
END
$$;

-- Create a function to handle user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enhance teacher_invites table if it exists, create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_invites') THEN
        CREATE TABLE public.teacher_invites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT NOT NULL UNIQUE,
            cohort_ids UUID[] NOT NULL,
            email TEXT,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by UUID REFERENCES auth.users(id),
            used_by UUID REFERENCES auth.users(id),
            used_at TIMESTAMP WITH TIME ZONE
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;
        
        -- Allow admins to view all invites
        CREATE POLICY "Admins can view all teacher invites"
        ON public.teacher_invites
        FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ));
        
        -- Allow admins to create invites
        CREATE POLICY "Admins can create teacher invites"
        ON public.teacher_invites
        FOR INSERT
        WITH CHECK (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ));
        
        -- Allow teachers to view their own invites
        CREATE POLICY "Teachers can view their own invites"
        ON public.teacher_invites
        FOR SELECT
        USING (created_by = auth.uid() OR used_by = auth.uid());
    END IF;
END
$$;

-- Create function to generate teacher invites
CREATE OR REPLACE FUNCTION public.create_teacher_invite(
    p_cohort_ids UUID[],
    p_email TEXT DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_user_role TEXT;
BEGIN
    -- Check if user is an admin
    SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can create teacher invites';
    END IF;
    
    -- Generate a random 8-character code
    v_code := UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    
    -- Insert the invite
    INSERT INTO public.teacher_invites (
        code,
        cohort_ids,
        email,
        expires_at,
        created_by
    ) VALUES (
        v_code,
        p_cohort_ids,
        p_email,
        NOW() + (p_expires_in_days || ' days')::INTERVAL,
        auth.uid()
    );
    
    RETURN v_code;
END;
$$;

-- Create a function to claim a teacher invite
CREATE OR REPLACE FUNCTION public.claim_teacher_invite(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite_id UUID;
    v_cohort_ids UUID[];
    v_email TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_used_by UUID;
    v_user_email TEXT;
BEGIN
    -- Get the current user's email
    SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
    
    -- Find the invite
    SELECT
        id,
        cohort_ids,
        email,
        expires_at,
        used_by
    INTO
        v_invite_id,
        v_cohort_ids,
        v_email,
        v_expires_at,
        v_used_by
    FROM public.teacher_invites
    WHERE code = p_code;
    
    -- Check if invite exists
    IF v_invite_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;
    
    -- Check if invite has expired
    IF v_expires_at < NOW() THEN
        RAISE EXCEPTION 'Invite code has expired';
    END IF;
    
    -- Check if invite has already been used
    IF v_used_by IS NOT NULL THEN
        RAISE EXCEPTION 'Invite code has already been used';
    END IF;
    
    -- Check if invite is restricted to a specific email
    IF v_email IS NOT NULL AND v_email != v_user_email THEN
        RAISE EXCEPTION 'This invite code is restricted to a different email address';
    END IF;
    
    -- Update the user's profile to be a teacher with the assigned cohorts
    UPDATE public.profiles
    SET
        role = 'teacher',
        cohort_ids = v_cohort_ids,
        updated_at = NOW()
    WHERE id = auth.uid();
    
    -- Mark the invite as used
    UPDATE public.teacher_invites
    SET
        used_by = auth.uid(),
        used_at = NOW()
    WHERE id = v_invite_id;
    
    RETURN TRUE;
END;
$$;

-- Add RLS policies for teacher access to participants and responses tables
DO $$
BEGIN
    -- Check if participants table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'participants') THEN
        -- Enable RLS if not already enabled
        ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for teachers to view participants in their cohorts
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'participants' 
            AND policyname = 'Teachers can view participants in their cohorts'
        ) THEN
            CREATE POLICY "Teachers can view participants in their cohorts"
            ON public.participants
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() 
                    AND role = 'teacher'
                    AND cohort_ids @> ARRAY[participants.cohort_id]
                )
            );
        END IF;
    END IF;
    
    -- Check if responses table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'responses') THEN
        -- Enable RLS if not already enabled
        ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for teachers to view responses from participants in their cohorts
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'responses' 
            AND policyname = 'Teachers can view responses for their cohorts'
        ) THEN
            CREATE POLICY "Teachers can view responses for their cohorts"
            ON public.responses
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 
                    FROM public.participants
                    INNER JOIN public.profiles ON profiles.id = auth.uid()
                    WHERE 
                        responses.participant_id = participants.id
                        AND profiles.role = 'teacher'
                        AND profiles.cohort_ids @> ARRAY[participants.cohort_id]
                )
            );
        END IF;
    END IF;
END
$$;

-- Create admin user if specified (update the email and password as needed)
-- IMPORTANT: Comment out this section before running if you don't want to create a new admin user
/*
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if admin user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@example.com';
    
    IF v_user_id IS NULL THEN
        v_user_id := (SELECT auth.uid());
        
        -- If using this in SQL Editor, you'll need to set up the admin user manually
        -- through the Supabase Authentication UI, then update their role to 'admin'
        UPDATE public.profiles
        SET role = 'admin'
        WHERE id = v_user_id;
    END IF;
END
$$;
*/ 