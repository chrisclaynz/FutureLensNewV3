-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(action, table_name)
);

-- Grant access to auth.users table for authenticated users
GRANT SELECT ON auth.users TO authenticated;

-- Update RLS policy for participants table to allow insert with user_id
DROP POLICY IF EXISTS "Users can only access their own participant records" ON participants;
CREATE POLICY "Users can only access their own participant records"
ON participants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON responses TO authenticated;

-- Add audit log entry
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('UPDATE_PERMISSIONS', 'participants', 'Updated permissions to allow participant creation')
ON CONFLICT (action, table_name) 
DO UPDATE SET 
    description = 'Updated permissions to allow participant creation',
    created_at = timezone('utc'::text, now()); 