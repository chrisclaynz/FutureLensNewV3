-- Check the full survey configurations
SELECT 
    id,
    code,
    json_config
FROM surveys
ORDER BY id DESC; 