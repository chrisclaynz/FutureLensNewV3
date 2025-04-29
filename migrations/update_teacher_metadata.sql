-- Update teacher user metadata
UPDATE auth.users
SET 
    raw_user_meta_data = jsonb_build_object(
        'sub', id,
        'email', email,
        'email_verified', true,
        'phone_verified', false
    ),
    updated_at = now()
WHERE email = 'teacher@example.com';

-- Update the teacher's metadata to include cohort IDs
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{cohort_ids}',
    '["7122e9d2-b02a-4205-af04-e3b13dbdd1b0", "cd748150-980c-4307-b922-a686efdf4255", "094a7f30-35a8-4a85-ad58-7fe6d6169b5c"]'::jsonb
)
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
    raw_user_meta_data->>'role' as metadata_role,
    raw_user_meta_data->'cohort_ids' as metadata_cohort_ids
FROM auth.users
WHERE email = 'teacher@example.com'; 