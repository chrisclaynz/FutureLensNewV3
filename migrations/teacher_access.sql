-- Add role and cohort_ids columns to auth.users
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('student', 'teacher')) DEFAULT 'student',
ADD COLUMN IF NOT EXISTS cohort_ids UUID[] DEFAULT '{}';

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);

-- Create index for faster cohort-based queries
CREATE INDEX IF NOT EXISTS idx_users_cohort_ids ON auth.users USING GIN (cohort_ids);

-- Add cohort_id to responses table if it doesn't exist
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id);

-- Add performance indexes for responses and participants
CREATE INDEX IF NOT EXISTS idx_responses_cohort_id ON responses(cohort_id);
CREATE INDEX IF NOT EXISTS idx_participants_cohort_id ON participants(cohort_id);

-- Policy for teacher access to responses
CREATE POLICY "Teachers can access their assigned cohorts"
ON responses
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id 
    FROM auth.users 
    WHERE role = 'teacher' 
    AND cohort_ids @> ARRAY[cohort_id]
  )
);

-- Policy for teacher access to participants
CREATE POLICY "Teachers can access their assigned cohort participants"
ON participants
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id 
    FROM auth.users 
    WHERE role = 'teacher' 
    AND cohort_ids @> ARRAY[cohort_id]
  )
);

-- Policy for teacher access to surveys
CREATE POLICY "Teachers can access surveys for their cohorts"
ON surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN auth.users u ON u.id = auth.uid()
    WHERE p.survey_id = surveys.id
    AND u.role = 'teacher'
    AND u.cohort_ids @> ARRAY[p.cohort_id]
  )
); 