-- Update your user to be an admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{role}',
    '"admin"'
)
WHERE email = 'teacher@example.com';

-- Verify the update
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'teacher@example.com'; 