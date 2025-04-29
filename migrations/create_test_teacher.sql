-- Insert a test teacher user
INSERT INTO auth.users (
    id,
    email,
    role,
    cohort_ids
) VALUES (
    gen_random_uuid(), -- Generate a random UUID for the user
    'teacher@example.com',
    'teacher',
    ARRAY[]::uuid[] -- Empty array of cohort IDs, you can add specific cohort IDs later
);

-- Note: You'll need to set up the actual authentication credentials
-- through Supabase's authentication system separately
-- This just creates the user record with the teacher role 