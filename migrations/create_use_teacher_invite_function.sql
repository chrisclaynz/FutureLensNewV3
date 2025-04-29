-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS use_teacher_invite;

-- Create the function to use teacher invites
CREATE OR REPLACE FUNCTION use_teacher_invite(
    p_code TEXT,
    p_email TEXT,
    p_password TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_id UUID;
    v_cohort_ids UUID[];
    v_user_id UUID;
BEGIN
    -- Get the invite
    SELECT id, cohort_ids INTO v_invite_id, v_cohort_ids
    FROM teacher_invites
    WHERE code = p_code
    AND (email IS NULL OR email = p_email)
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
    
    IF v_invite_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;

    -- Create the user
    v_user_id := gen_random_uuid();
    
    -- First create the user in auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        role,
        aud
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'role', 'teacher',
            'sub', gen_random_uuid(),
            'email', p_email,
            'email_verified', true,
            'phone_verified', false,
            'cohort_ids', v_cohort_ids
        ),
        'authenticated',
        'authenticated'
    );

    -- Then create the user in auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object(
            'sub', v_user_id,
            'email', p_email
        ),
        'email',
        now(),
        now(),
        now()
    );
    
    -- Mark the invite as used
    UPDATE teacher_invites
    SET used_at = now(),
        used_by = v_user_id
    WHERE id = v_invite_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql; 