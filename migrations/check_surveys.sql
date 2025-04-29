-- First check the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'surveys';

-- Then check existing surveys
SELECT 
    id,
    code,
    json_config->>'title' as title
FROM surveys
ORDER BY id DESC; 