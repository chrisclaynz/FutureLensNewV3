-- Drop the existing function
DROP FUNCTION IF EXISTS create_teacher_invite;

-- Create the fixed function
CREATE OR REPLACE FUNCTION create_teacher_invite(
    p_cohort_ids UUID[],
    p_email TEXT DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            role = 'admin'
            OR raw_user_meta_data->>'role' = 'admin'
        )
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can create invite codes';
    END IF;

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