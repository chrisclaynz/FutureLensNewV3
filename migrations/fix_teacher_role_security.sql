-- Migration script to properly implement teacher roles and security
-- This addresses the requirements in Prompt 11 for teacher access

-- 1. Create a profiles table to store user role information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    cohort_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for the profiles table
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin users can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin users can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- 4. Create policies for teacher access to participants and responses
-- Teachers can view participants in their cohorts
CREATE POLICY "Teachers can view participants in their cohorts"
ON public.participants
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'teacher'
        AND cohort_id = ANY(cohort_ids)
    )
    OR
    auth.uid() = user_id
);

-- Teachers can view responses for participants in their cohorts
CREATE POLICY "Teachers can view responses for participants in their cohorts"
ON public.responses
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.participants p
        JOIN public.profiles pr ON pr.id = auth.uid()
        WHERE p.id = participant_id
        AND pr.role = 'teacher'
        AND p.cohort_id = ANY(pr.cohort_ids)
    )
    OR
    EXISTS (
        SELECT 1 FROM public.participants
        WHERE id = participant_id
        AND user_id = auth.uid()
    )
);

-- 5. Add database indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_cohort_id ON public.participants(cohort_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.participants(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_participant_id ON public.responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 6. Create function to migrate existing user metadata to profiles
CREATE OR REPLACE FUNCTION migrate_user_metadata_to_profiles()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            id, 
            raw_user_meta_data->>'role' AS role,
            raw_user_meta_data->'cohort_ids' AS cohort_ids
        FROM auth.users
    LOOP
        -- Default to 'student' if no role found
        IF user_record.role IS NULL THEN
            user_record.role := 'student';
        END IF;
        
        -- Insert or update profile
        INSERT INTO public.profiles (id, role, cohort_ids)
        VALUES (
            user_record.id, 
            user_record.role,
            CASE 
                WHEN user_record.cohort_ids IS NULL THEN '{}'::uuid[]
                ELSE user_record.cohort_ids::uuid[]
            END
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            role = EXCLUDED.role,
            cohort_ids = EXCLUDED.cohort_ids,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger function to add profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (new.id, 'student')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Run the migration function for existing users
SELECT migrate_user_metadata_to_profiles();

-- 10. Add audit log entry
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('CREATE_PROFILES', 'profiles', 'Created profiles table and migrated user metadata to structured roles')
ON CONFLICT (action, table_name) 
DO UPDATE SET 
    description = 'Updated profiles structure and role-based security',
    created_at = timezone('utc'::text, now()); 