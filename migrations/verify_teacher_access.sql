-- Check the teacher user's role and cohort access
SELECT 
    id,
    email,
    role,
    raw_user_meta_data,
    cohort_ids
FROM auth.users
WHERE email = 'teacher@example.com';

-- Check if the cohorts exist
SELECT 
    id,
    code,
    label,
    survey_id
FROM cohorts
WHERE id IN (
    '7122e9d2-b02a-4205-af04-e3b13dbdd1b0',
    'cd748150-980c-4307-b922-a686efdf4255',
    '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'
); 