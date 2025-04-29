-- Drop existing functions
DROP FUNCTION IF EXISTS create_teacher_invite;
DROP FUNCTION IF EXISTS use_teacher_invite;
DROP FUNCTION IF EXISTS validate_teacher_invite;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Generate a random 8-character code
    v_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists, if so generate a new one
    WHILE EXISTS (SELECT 1 FROM teacher_invites WHERE code = v_code) LOOP
        v_code := upper(substring(md5(random()::text) from 1 for 8));
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new invite
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
    v_code := generate_invite_code();
    
    -- Create the invite
    INSERT INTO teacher_invites (
        code,
        email,
        cohort_ids,
        expires_at,
        created_by,
        status
    ) VALUES (
        v_code,
        p_email,
        p_cohort_ids,
        now() + (p_expires_in_days || ' days')::interval,
        auth.uid(),
        'active'
    );
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to validate an invite code
CREATE OR REPLACE FUNCTION validate_teacher_invite(
    p_code TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_id UUID;
    v_cohort_ids UUID[];
    v_status TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_invite_email TEXT;
    v_result JSON;
BEGIN
    -- Get the invite
    SELECT 
        ti.id,
        ti.cohort_ids,
        ti.status,
        ti.expires_at,
        ti.email
    INTO 
        v_invite_id,
        v_cohort_ids,
        v_status,
        v_expires_at,
        v_invite_email
    FROM teacher_invites ti
    WHERE ti.code = p_code;

    -- Check if invite exists
    IF v_invite_id IS NULL THEN
        v_result := json_build_object(
            'is_valid', false,
            'error_message', 'Invalid invite code',
            'cohort_ids', NULL
        );
        RETURN v_result;
    END IF;

    -- Check if invite is expired
    IF v_expires_at < now() THEN
        UPDATE teacher_invites
        SET status = 'expired'
        WHERE id = v_invite_id;
        
        v_result := json_build_object(
            'is_valid', false,
            'error_message', 'Invite code has expired',
            'cohort_ids', NULL
        );
        RETURN v_result;
    END IF;

    -- Check if invite is already used
    IF v_status = 'used' THEN
        v_result := json_build_object(
            'is_valid', false,
            'error_message', 'Invite code has already been used',
            'cohort_ids', NULL
        );
        RETURN v_result;
    END IF;

    -- Check if email is required and matches
    IF v_invite_email IS NOT NULL AND v_invite_email != p_email THEN
        v_result := json_build_object(
            'is_valid', false,
            'error_message', 'This invite code is for a different email address',
            'cohort_ids', NULL
        );
        RETURN v_result;
    END IF;

    -- Check for too many failed attempts
    IF EXISTS (
        SELECT 1
        FROM invite_attempts
        WHERE code = p_code
        AND attempted_at > now() - interval '1 hour'
        AND NOT success
        GROUP BY code
        HAVING count(*) >= 5
    ) THEN
        v_result := json_build_object(
            'is_valid', false,
            'error_message', 'Too many failed attempts. Please try again later.',
            'cohort_ids', NULL
        );
        RETURN v_result;
    END IF;

    -- Mark invite as pending
    UPDATE teacher_invites
    SET status = 'pending'
    WHERE id = v_invite_id;

    v_result := json_build_object(
        'is_valid', true,
        'error_message', NULL,
        'cohort_ids', v_cohort_ids
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql; 