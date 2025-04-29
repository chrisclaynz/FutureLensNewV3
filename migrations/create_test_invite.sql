-- Create a new test invite
INSERT INTO teacher_invites (
    code,
    email,
    cohort_ids,
    expires_at,
    created_by
) VALUES (
    'TEST123',
    NULL,  -- No specific email required
    ARRAY[
        '7122e9d2-b02a-4205-af04-e3b13dbdd1b0'::uuid,  -- COH001
        'cd748150-980c-4307-b922-a686efdf4255'::uuid,  -- COH002
        '094a7f30-35a8-4a85-ad58-7fe6d6169b5c'::uuid   -- COH003
    ],
    now() + interval '7 days',
    '2f9cccc0-7760-4732-91c0-06fd90fb4178'::uuid  -- Your admin user ID
);

-- Verify the invite was created
SELECT * FROM teacher_invites WHERE code = 'TEST123'; 