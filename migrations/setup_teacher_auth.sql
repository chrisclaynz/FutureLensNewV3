-- First, let's check if the user exists in auth.users
DO $$
DECLARE
    teacher_id UUID;
BEGIN
    -- Get the teacher's ID
    SELECT id INTO teacher_id
    FROM auth.users
    WHERE email = 'teacher@example.com';

    -- If the user exists, update their auth credentials
    IF teacher_id IS NOT NULL THEN
        -- Update auth.users
        UPDATE auth.users
        SET 
            encrypted_password = crypt('teacher123', gen_salt('bf')),
            email_confirmed_at = now(),
            updated_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}',
            raw_user_meta_data = '{}',
            is_super_admin = false,
            role = 'authenticated'
        WHERE id = teacher_id;

        -- Insert into auth.identities if not exists
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
        )
        ON CONFLICT (id) DO NOTHING;
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
    i.last_sign_in_at
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'teacher@example.com'; 