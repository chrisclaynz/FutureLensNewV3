-- Create tables
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    json_config JSONB NOT NULL,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    passcode TEXT UNIQUE NOT NULL,
    cohort_id UUID REFERENCES cohorts(id),
    survey_id UUID REFERENCES surveys(id),
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES participants(id) NOT NULL,
    question_key TEXT NOT NULL,
    likert_value INTEGER NOT NULL,
    dont_understand BOOLEAN DEFAULT false,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Participants can view their own data"
    ON participants
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Participants can insert their own data"
    ON participants
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Participants can view their own responses"
    ON responses
    FOR SELECT
    USING (auth.uid() = (SELECT id FROM participants WHERE id = participant_id));

CREATE POLICY "Participants can insert their own responses"
    ON responses
    FOR INSERT
    WITH CHECK (auth.uid() = (SELECT id FROM participants WHERE id = participant_id)); 