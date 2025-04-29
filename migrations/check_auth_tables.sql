-- List all tables in the auth schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth';

-- Check if any users exist
SELECT id, email, created_at, updated_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any identities exist
SELECT id, user_id, provider, provider_id, created_at
FROM auth.identities
ORDER BY created_at DESC
LIMIT 5; 