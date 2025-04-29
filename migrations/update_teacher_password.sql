-- Update teacher's password
UPDATE auth.users
SET 
    encrypted_password = crypt('teacher123', gen_salt('bf')),
    updated_at = now()
WHERE email = 'teacher@example.com';

-- Verify the update
SELECT 
    id,
    email,
    role,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
WHERE email = 'teacher@example.com'; 