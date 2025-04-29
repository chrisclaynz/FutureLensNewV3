-- First, let's check the current teacher user
SELECT id, email, role, cohort_ids
FROM auth.users
WHERE role = 'teacher';

-- Update the teacher's cohort access to include all new cohorts
UPDATE auth.users
SET cohort_ids = ARRAY[
    '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid,  -- COH001
    'cd748150-980c-4307-b922-a686efdf4255'::uuid,  -- COH002
    '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid   -- COH003
]
WHERE role = 'teacher';

-- Verify the update
SELECT id, email, role, cohort_ids
FROM auth.users
WHERE role = 'teacher'; 