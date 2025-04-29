-- Create test cohorts
INSERT INTO cohorts (code, label)
VALUES 
    ('COH001', 'Year 9 Science 2024'),
    ('COH002', 'Year 10 Humanities 2024'),
    ('COH003', 'Year 11 Technology 2024')
ON CONFLICT (code) DO NOTHING;

-- Verify the cohorts were created
SELECT 
    id,
    code,
    label
FROM cohorts
ORDER BY id DESC; 