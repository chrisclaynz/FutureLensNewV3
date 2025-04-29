-- Check the participants table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'participants';

-- Check a sample of participants data
SELECT * FROM participants LIMIT 5; 