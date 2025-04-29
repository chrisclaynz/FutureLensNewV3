-- Update the user's metadata to set the teacher role
UPDATE auth.users
SET 
    raw_user_meta_data = jsonb_build_object(
        'role', 'teacher',
        'sub', id,
        'email', email,
        'email_verified', true,
        'phone_verified', false
    ),
    updated_at = now()
WHERE email = 'teacher@example.com';

-- Verify the update
SELECT 
    id,
    email,
    role,
    raw_user_meta_data,
    updated_at
FROM auth.users
WHERE email = 'teacher@example.com'; 