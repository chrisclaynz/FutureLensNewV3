-- Create table for teacher invitation codes
CREATE TABLE IF NOT EXISTS teacher_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    email TEXT,
    cohort_ids UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    used_by UUID REFERENCES auth.users(id)
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_teacher_invites_code ON teacher_invites(code);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_teacher_invites_email ON teacher_invites(email);

-- Create function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
BEGIN
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists, if so generate a new one
    WHILE EXISTS (SELECT 1 FROM teacher_invites WHERE code = code) LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to create a new invite
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
    v_code := generate_invite_code();
    
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

-- Create function to validate and use an invite
CREATE OR REPLACE FUNCTION use_teacher_invite(
    p_code TEXT,
    p_email TEXT,
    p_password TEXT
)
RETURNS UUID AS $$
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
    INSERT INTO auth.users (
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        role
    ) VALUES (
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
        'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    -- Mark the invite as used
    UPDATE teacher_invites
    SET used_at = now(),
        used_by = v_user_id
    WHERE id = v_invite_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE teacher_invites ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all invites
CREATE POLICY "Admins can view all invites"
ON teacher_invites
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Policy for admins to create invites
CREATE POLICY "Admins can create invites"
ON teacher_invites
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Policy for anyone to use valid invites
CREATE POLICY "Anyone can use valid invites"
ON teacher_invites
FOR UPDATE
TO authenticated
USING (
    code = current_setting('request.jwt.claims')::json->>'code'
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
); 