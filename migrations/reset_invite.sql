-- Reset the invite code to active state
UPDATE teacher_invites
SET status = 'active'
WHERE code = 'TEST123';

-- Verify the update
SELECT 
    code,
    email,
    status,
    expires_at,
    created_at,
    used_at
FROM teacher_invites
WHERE code = 'TEST123'; 