-- First, create the exec_sql function
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    json_config JSONB NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cohort_id UUID REFERENCES cohorts(id),
    survey_id UUID REFERENCES surveys(id) NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES participants(id) NOT NULL,
    question_key TEXT NOT NULL,
    likert_value INTEGER,
    dont_understand BOOLEAN DEFAULT false,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Revoke all access by default
REVOKE ALL ON participants FROM anon, authenticated;
REVOKE ALL ON responses FROM anon, authenticated;

-- Create RLS policies for participants
DROP POLICY IF EXISTS "Users can only access their own participant records" ON participants;
CREATE POLICY "Users can only access their own participant records"
    ON participants
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for responses
DROP POLICY IF EXISTS "Users can only access responses for their participant records" ON responses;
CREATE POLICY "Users can only access responses for their participant records"
    ON responses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM participants
            WHERE participants.id = responses.participant_id
            AND participants.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM participants
            WHERE participants.id = responses.participant_id
            AND participants.user_id = auth.uid()
        )
    );

-- Grant specific access through policies
GRANT SELECT, INSERT, UPDATE ON participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON responses TO authenticated; 