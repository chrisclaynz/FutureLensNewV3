-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Teachers can view participants in their cohorts" ON public.participants;
DROP POLICY IF EXISTS "Users can only access their own participant records" ON public.participants;

-- Create new policy for teacher access to participants
CREATE POLICY "Teachers can view participants in their cohorts"
ON public.participants
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'teacher'
        AND participants.cohort_id = ANY(cohort_ids)
    )
    OR
    auth.uid() = user_id
);

-- Create policy for users to access their own records
CREATE POLICY "Users can access their own participant records"
ON public.participants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON participants TO authenticated;
GRANT SELECT ON responses TO authenticated; 