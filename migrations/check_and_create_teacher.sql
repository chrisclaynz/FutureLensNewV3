-- First, let's check all users
SELECT id, email, role, raw_user_meta_data
FROM auth.users;

-- Create a teacher user if none exists
INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    raw_user_meta_data,
    cohort_ids
)
VALUES (
    'teacher@example.com',
    crypt('teacher123', gen_salt('bf')),
    now(),
    'teacher',
    jsonb_build_object(
        'role', 'teacher',
        'email_verified', true
    ),
    ARRAY[
        '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid,  -- COH001
        'cd748150-980c-4307-b922-a686efdf4255'::uuid,  -- COH002
        '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid   -- COH003
    ]
)
ON CONFLICT (email) DO UPDATE
SET 
    role = 'teacher',
    raw_user_meta_data = jsonb_build_object(
        'role', 'teacher',
        'email_verified', true
    ),
    cohort_ids = ARRAY[
        '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid,  -- COH001
        'cd748150-980c-4307-b922-a686efdf4255'::uuid,  -- COH002
        '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid   -- COH003
    ];

-- Verify the teacher user
SELECT id, email, role, cohort_ids
FROM auth.users
WHERE role = 'teacher'; 