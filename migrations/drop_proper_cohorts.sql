-- Drop the proper_cohorts table if it exists
DROP TABLE IF EXISTS proper_cohorts;

-- Verify the table was dropped
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'proper_cohorts'
); 