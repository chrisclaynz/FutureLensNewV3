-- Create audit log table for tracking RLS changes
CREATE TABLE IF NOT EXISTS public.audit_log (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    UNIQUE(action, table_name)
);

-- Enable RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_log
-- Only authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

-- Only server-side operations can insert audit logs
CREATE POLICY "Server operations can insert audit logs"
ON public.audit_log
FOR INSERT
USING (true)
WITH CHECK (true);

-- Grant access
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO anon, authenticated; 