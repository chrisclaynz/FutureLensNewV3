-- First check the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cohorts';

-- Then check existing cohorts
SELECT 
    id,
    code,
    label
FROM cohorts
ORDER BY id DESC; 