-- Check the current invite code details
SELECT 
    code,
    email,
    status,
    expires_at,
    created_at,
    used_at
FROM teacher_invites
WHERE code = 'TEST123'; 