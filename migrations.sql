-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    json_config JSONB NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cohort_id UUID REFERENCES cohorts(id),
    survey_id UUID REFERENCES surveys(id) NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, survey_id)
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES participants(id) NOT NULL,
    question_key TEXT NOT NULL,
    likert_value INTEGER NOT NULL,
    dont_understand BOOLEAN DEFAULT FALSE,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_id, question_key)
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can only view their own participant records"
    ON participants
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own participant records"
    ON participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only view responses for their participant records"
    ON responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM participants
            WHERE participants.id = responses.participant_id
            AND participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only insert responses for their participant records"
    ON responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM participants
            WHERE participants.id = responses.participant_id
            AND participants.user_id = auth.uid()
        )
    );

-- Create a function to verify passcode
CREATE OR REPLACE FUNCTION verify_passcode(input_passcode TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM participants WHERE passcode = input_passcode
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 