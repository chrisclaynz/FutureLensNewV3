# FutureLens: Row Level Security (RLS) Setup Guide

This is a simple guide to help you enable Row Level Security for your FutureLens application. Follow the steps below:

## What is RLS?

Row Level Security (RLS) ensures that users can only access the data rows they should have permission to see. This is crucial for:

- Protecting user data privacy
- Ensuring users only see their own survey responses
- Securing sensitive information

## Steps to Enable RLS

### Option 1: Regular User (requires browser login)

1. **Make sure you're logged in to the application**
   - Open the application in a browser
   - Login with your credentials

2. **Set up the exec_sql function first**
   ```bash
   npm run setup:exec-sql
   ```
   - This creates a database function needed to run the RLS script
   - If this fails, you'll see instructions for manual setup

3. **Run the RLS setup script**
   ```bash
   npm run apply:rls
   ```

### Option 2: Admin (using service role key)

If you have admin access and a service role key:

1. **Set up the exec_sql function first**
   ```bash
   npm run setup:exec-sql
   ```

2. **Run the admin RLS script**
   ```bash
   npm run apply:rls:admin
   ```
   - You'll be prompted to enter your Supabase URL and service role key if they're not in .env

3. **Adding Service Role Key to .env (optional)**
   - To avoid entering the key each time, add this to your .env file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Verifying Success

After running either method:
- You should see a message confirming that RLS was successfully applied
- If there are any errors, they will be displayed in the console

## Troubleshooting

If you encounter issues:

1. **Authentication errors**
   - For Option 1: Make sure you're logged in to the application in a browser
   - For Option 2: Verify your service role key is correct

2. **Database access errors**
   - Verify your Supabase URL and key in the `.env` file
   - Check that your user has permissions to modify the database

3. **exec_sql function errors**
   - If you see an error about exec_sql not existing, run:
   ```bash
   npm run setup:exec-sql
   ```
   - If that fails, you'll need to manually run the SQL in the Supabase dashboard

4. **SQL errors**
   - These typically indicate an issue with existing database structure
   - Contact the database administrator if SQL errors persist

## What Happens Behind the Scenes?

When you run the script, it:

1. Enables RLS on the surveys, participants, responses, and cohorts tables
2. Creates appropriate policies to control data access
3. Sets proper permissions for authenticated and anonymous users
4. Creates an audit log to track security changes

## Next Steps

After applying RLS:

1. Test the application to ensure everything works as expected
2. Check that you can only see your own survey responses
3. Verify that anonymous users can only view surveys but not modify them 