-- Check auth configuration
SELECT * FROM auth.config;

-- Check if email provider is enabled
SELECT * FROM auth.providers WHERE provider = 'email';

-- Check if any users exist
SELECT id, email, created_at, updated_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5; 