-- First, let's create a proper cohorts table if it doesn't exist
CREATE TABLE IF NOT EXISTS proper_cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    survey_id UUID REFERENCES surveys(id)
);

-- Insert proper cohorts
INSERT INTO proper_cohorts (code, label, survey_id)
SELECT 
    'COH001',
    'Year 9 Science 2024',
    id
FROM surveys 
WHERE code = 'SRV101'
ON CONFLICT (code) DO NOTHING;

INSERT INTO proper_cohorts (code, label, survey_id)
SELECT 
    'COH002',
    'Year 10 Humanities 2024',
    id
FROM surveys 
WHERE code = 'SRV102'
ON CONFLICT (code) DO NOTHING;

INSERT INTO proper_cohorts (code, label, survey_id)
SELECT 
    'COH003',
    'Year 11 Technology 2024',
    id
FROM surveys 
WHERE code = 'SRV103'
ON CONFLICT (code) DO NOTHING;

-- Verify the cohorts were created
SELECT 
    pc.id,
    pc.code,
    pc.label,
    s.code as survey_code
FROM proper_cohorts pc
JOIN surveys s ON pc.survey_id = s.id
ORDER BY pc.code; 