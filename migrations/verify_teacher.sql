-- Verify the teacher user's attributes
SELECT 
    id,
    email,
    role,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'teacher@example.com'; 