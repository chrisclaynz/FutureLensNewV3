-- First, let's check if the teacher's profile exists
DO $$
DECLARE
    teacher_email TEXT := 'chris.clay@wecreatefutures.com';
    teacher_id UUID;
    teacher_profile_exists BOOLEAN;
BEGIN
    -- Get the teacher's user ID
    SELECT id INTO teacher_id 
    FROM auth.users 
    WHERE email = teacher_email;

    IF teacher_id IS NULL THEN
        RAISE NOTICE 'Teacher user not found with email: %', teacher_email;
        RETURN;
    END IF;

    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = teacher_id
    ) INTO teacher_profile_exists;

    IF NOT teacher_profile_exists THEN
        -- Create profile if it doesn't exist
        INSERT INTO public.profiles (id, role, cohort_ids, email)
        VALUES (
            teacher_id,
            'teacher',
            ARRAY[
                '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid,
                'f4f85539-2a89-4b51-8635-a54565e7d3fe'::uuid,
                '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid
            ],
            teacher_email
        );
        RAISE NOTICE 'Created teacher profile for user: %', teacher_id;
    ELSE
        -- Update existing profile
        UPDATE public.profiles
        SET 
            role = 'teacher',
            cohort_ids = ARRAY[
                '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid,
                'f4f85539-2a89-4b51-8635-a54565e7d3fe'::uuid,
                '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid
            ],
            email = teacher_email,
            updated_at = NOW()
        WHERE id = teacher_id;
        RAISE NOTICE 'Updated teacher profile for user: %', teacher_id;
    END IF;
END $$;

-- Verify the profile was created/updated
SELECT 
    p.id,
    p.role,
    p.cohort_ids,
    p.email,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'chris.clay@wecreatefutures.com'; 