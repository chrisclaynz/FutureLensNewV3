-- First, let's check the current state of the teacher user
SELECT 
    id,
    email,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users 
WHERE email = 'teacher@example.com';

-- Now, let's update the teacher's credentials
UPDATE auth.users
SET 
    encrypted_password = crypt('teacher123', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    raw_user_meta_data = '{}',
    is_super_admin = false,
    role = 'authenticated'
WHERE email = 'teacher@example.com';

-- Verify the update
SELECT 
    id,
    email,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users 
WHERE email = 'teacher@example.com'; 