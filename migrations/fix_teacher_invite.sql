-- Drop the existing function
DROP FUNCTION IF EXISTS create_teacher_invite;

-- Create the fixed function
CREATE OR REPLACE FUNCTION create_teacher_invite(
    p_cohort_ids UUID[],
    p_email TEXT DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Generate a unique code
    v_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Create the invite
    INSERT INTO teacher_invites (
        code,
        email,
        cohort_ids,
        expires_at,
        created_by
    ) VALUES (
        v_code,
        p_email,
        p_cohort_ids,
        now() + (p_expires_in_days || ' days')::interval,
        auth.uid()
    );
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql; 