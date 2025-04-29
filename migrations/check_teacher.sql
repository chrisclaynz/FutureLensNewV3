-- Check if the teacher user exists
SELECT id, email, role, cohort_ids 
FROM auth.users 
WHERE email = 'teacher@example.com'; 