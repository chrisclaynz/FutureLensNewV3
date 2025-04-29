-- Check users table
SELECT 
    u.id,
    u.email,
    u.role,
    u.email_confirmed_at,
    u.created_at,
    u.updated_at,
    u.raw_app_meta_data,
    u.raw_user_meta_data
FROM auth.users u
WHERE u.id IN (
    'eb9b5a56-d881-4a51-9737-88bd4ade073d',
    'e4de066e-0213-4c1d-9eb8-28c913ae7595',
    'b3ff0fbd-9b14-4150-8c54-5addbdf270f8',
    '5a24c0d5-2513-4fc3-86ba-e9e6e740a354',
    'b67dd2d9-6be2-4ee6-adab-a9eea39e2f79'
)
ORDER BY u.created_at DESC; 