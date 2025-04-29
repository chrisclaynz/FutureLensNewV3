-- Add status field to track invite state
ALTER TABLE teacher_invites 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'pending', 'used', 'expired')) DEFAULT 'active';

-- Add attempt tracking
CREATE TABLE IF NOT EXISTS invite_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address TEXT,
    success BOOLEAN,
    error_message TEXT
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_invite_attempts_code ON invite_attempts(code);
CREATE INDEX IF NOT EXISTS idx_invite_attempts_ip ON invite_attempts(ip_address);

-- Create teacher cohort access table
CREATE TABLE IF NOT EXISTS teacher_cohort_access (
    teacher_id UUID REFERENCES auth.users(id),
    cohort_id UUID REFERENCES cohorts(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (teacher_id, cohort_id)
);

-- Add RLS policies for teacher_cohort_access
ALTER TABLE teacher_cohort_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own cohort access"
ON teacher_cohort_access
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage cohort access"
ON teacher_cohort_access
FOR ALL
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