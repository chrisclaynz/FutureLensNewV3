-- Update cohort codes to be more descriptive
UPDATE cohorts
SET code = 'COH001',
    label = 'Year 9 Science 2024'
WHERE code = 'SRV101';

UPDATE cohorts
SET code = 'COH002',
    label = 'Year 10 Humanities 2024'
WHERE code = 'SRV102';

UPDATE cohorts
SET code = 'COH003',
    label = 'Year 11 Technology 2024'
WHERE code = 'SRV103';

-- Verify the updates
SELECT id, code, label, survey_id
FROM cohorts
ORDER BY code; 