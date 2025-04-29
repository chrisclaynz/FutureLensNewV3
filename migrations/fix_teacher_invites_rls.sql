-- Enable RLS on teacher_invites table
ALTER TABLE teacher_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can create invites" ON teacher_invites;
DROP POLICY IF EXISTS "Admins can view all invites" ON teacher_invites;
DROP POLICY IF EXISTS "Admins can update invites" ON teacher_invites;
DROP POLICY IF EXISTS "Teachers can create invites for their cohorts" ON teacher_invites;
DROP POLICY IF EXISTS "Teachers can view their own invites" ON teacher_invites;
DROP POLICY IF EXISTS "Teachers can update their own invites" ON teacher_invites;

-- Policy for admins to create invites
CREATE POLICY "Only admins can create invites"
ON teacher_invites
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            role = 'admin'
            OR raw_user_meta_data->>'role' = 'admin'
        )
    )
);

-- Policy for admins to view all invites
CREATE POLICY "Admins can view all invites"
ON teacher_invites
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            role = 'admin'
            OR raw_user_meta_data->>'role' = 'admin'
        )
    )
);

-- Policy for admins to update invites
CREATE POLICY "Admins can update invites"
ON teacher_invites
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            role = 'admin'
            OR raw_user_meta_data->>'role' = 'admin'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            role = 'admin'
            OR raw_user_meta_data->>'role' = 'admin'
        )
    )
); 