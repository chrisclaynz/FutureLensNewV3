-- Fix security warnings by enabling RLS on tables and fixing search path issues

-- 1. Enable RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for audit_log to restrict access to admins only
CREATE POLICY "Admin only access for audit_log"
ON public.audit_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
  )
);

-- 2. Enable RLS on invite_attempts table
ALTER TABLE public.invite_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy for invite_attempts to restrict access to admins only
CREATE POLICY "Admin only access for invite_attempts"
ON public.invite_attempts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
  )
);

-- 3. Fix the function search path issue for generate_invite_code
-- First, get the function definition
CREATE OR REPLACE FUNCTION fix_generate_invite_code() 
RETURNS void AS $$
DECLARE
  func_def text;
  func_lang text;
  func_args text;
BEGIN
  -- Get function definition
  SELECT pg_get_functiondef(p.oid), l.lanname, pg_get_function_arguments(p.oid)
  INTO func_def, func_lang, func_args
  FROM pg_proc p
  JOIN pg_language l ON p.prolang = l.oid
  WHERE p.proname = 'generate_invite_code' AND p.pronamespace = 'public'::regnamespace;
  
  -- If function exists, rebuild it with proper search_path
  IF func_def IS NOT NULL THEN
    -- Extract function body
    func_def := substring(func_def FROM '\\$\\$(.*)\\$\\$$' FOR '$1');
    
    -- Recreate function with search_path
    EXECUTE format('
      CREATE OR REPLACE FUNCTION public.generate_invite_code(%s)
      RETURNS text
      LANGUAGE %s
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      %s
      $func$;
    ', func_args, func_lang, func_def);
    
    RAISE NOTICE 'Successfully fixed generate_invite_code function with search_path';
  ELSE
    RAISE NOTICE 'Function generate_invite_code not found';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT fix_generate_invite_code();

-- Clean up the temporary function
DROP FUNCTION fix_generate_invite_code();

-- Add log entry
INSERT INTO public.audit_log (action, table_name, description)
VALUES 
('SECURITY_FIX', 'multiple', 'Fixed RLS on audit_log and invite_attempts, and search_path for generate_invite_code')
ON CONFLICT (action, table_name) 
DO UPDATE SET 
    description = 'Fixed security warnings from Supabase linter',
    created_at = timezone('utc'::text, now()); 