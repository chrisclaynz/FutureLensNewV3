-- Get the teacher user's ID
DO $$
DECLARE
    teacher_id UUID;
BEGIN
    -- Find the teacher user
    SELECT id INTO teacher_id
    FROM auth.users
    WHERE email = 'teacher@example.com'
    LIMIT 1;

    IF teacher_id IS NOT NULL THEN
        -- Update the teacher's cohort_ids with the new proper_cohorts
        UPDATE auth.users
        SET cohort_ids = ARRAY(
            SELECT id 
            FROM proper_cohorts
            ORDER BY code
        )
        WHERE id = teacher_id;

        -- Verify the update
        SELECT id, email, role, cohort_ids
        FROM auth.users
        WHERE id = teacher_id;
    ELSE
        RAISE NOTICE 'Teacher user not found';
    END IF;
END $$; 