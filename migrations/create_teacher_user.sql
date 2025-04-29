-- First, let's check if the user exists
DO $$
DECLARE
    teacher_id UUID;
BEGIN
    -- Get the teacher's ID
    SELECT id INTO teacher_id
    FROM auth.users
    WHERE email = 'teacher@example.com';

    -- If the user doesn't exist, create them
    IF teacher_id IS NULL THEN
        -- Create the user using Supabase's auth.users() function
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        )
        VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'teacher@example.com',
            crypt('teacher123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            false,
            'authenticated'
        )
        RETURNING id INTO teacher_id;

        -- Create the identity
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            teacher_id,
            teacher_id,
            jsonb_build_object(
                'sub', teacher_id,
                'email', 'teacher@example.com'
            ),
            'email',
            'teacher@example.com',
            now(),
            now(),
            now()
        );

        -- Create the session
        INSERT INTO auth.sessions (
            id,
            user_id,
            created_at,
            updated_at,
            factor_id,
            aal,
            not_after
        )
        VALUES (
            gen_random_uuid(),
            teacher_id,
            now(),
            now(),
            teacher_id,
            'aal1',
            now() + interval '1 day'
        );
    END IF;
END $$;

-- Verify the setup
SELECT 
    u.id,
    u.email,
    u.role,
    u.raw_app_meta_data,
    u.raw_user_meta_data,
    u.email_confirmed_at,
    u.created_at,
    u.updated_at,
    i.provider,
    i.provider_id,
    i.last_sign_in_at,
    s.id as session_id
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
LEFT JOIN auth.sessions s ON s.user_id = u.id
WHERE u.email = 'teacher@example.com'; 