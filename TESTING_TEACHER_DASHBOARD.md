# Testing the Teacher Dashboard

This guide explains how to set up and test the FutureLens Teacher Dashboard functionality.

## 1. Database Setup

First, you need to run the SQL script to set up the necessary database tables and permissions:

1. Log in to the Supabase Dashboard (https://app.supabase.com)
2. Navigate to your project
3. Click on "SQL Editor" in the left sidebar
4. Create a new query
5. Copy and paste the contents of `teacher_dashboard_setup.sql` into the editor
6. Execute the query

This script will:
- Create the `profiles` table if it doesn't exist
- Set up Row Level Security (RLS) policies
- Create the `teacher_invites` table if it doesn't exist
- Create functions for generating and claiming teacher invites
- Add RLS policies for teacher access to participants and responses

## 2. Create an Admin User

To create teacher accounts and manage invites, you first need an admin user:

1. Create a new user through the Supabase Authentication UI or use an existing one
2. Run the following SQL in the Supabase SQL Editor, replacing `your_email@example.com` with the actual email:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your_email@example.com');
```

## 3. Testing the Admin Dashboard

### 3.1. Local Testing Mode

For quick testing without needing to set up real users, use the bypass parameter:

```
http://localhost:3001/admin.html?bypass=true
```

This creates a mock user session with teacher role and test cohorts.

### 3.2. Testing with Real Authentication

To test with real authentication:

1. Navigate to `http://localhost:3001/admin.html`
2. Log in with your admin user credentials
3. You should see the admin dashboard with the "Search Results" and "Manage Invites" tabs

### 3.3. Creating a Teacher Invite

1. In the admin dashboard, go to the "Manage Invites" tab
2. Select one or more cohorts from the dropdown
3. (Optional) Enter a teacher email to restrict the invite
4. Set an expiry period
5. Click "Generate Invite Code"
6. The invite code will be displayed - copy it for the next step

### 3.4. Creating a Teacher Account

1. Register a new user in Supabase for the teacher
2. Navigate to `http://localhost:3001/teacher-register.html`
3. Enter the invite code generated in the previous step
4. The user will be assigned the teacher role with access to the selected cohorts

### 3.5. Testing Teacher Access

1. Log in to `http://localhost:3001/admin.html` with the teacher credentials
2. Verify that only the assigned cohorts appear in the dropdown
3. Test the search functionality:
   - Select a cohort
   - Enter a survey code
   - Click "Search"
4. Verify that cohort results display correctly
5. Test student search:
   - Enter a student email in the search box
   - Verify that results are filtered correctly
6. Test the "Toggle Student IDs" functionality
7. Test viewing detailed results for specific questions

## 4. Troubleshooting

If you encounter issues:

### Authentication Errors

If you see "Access denied" or authentication errors:
- Check that the user has the correct role in the `profiles` table
- Verify that RLS policies have been created correctly

### Database Access Issues

If you see "permission denied" errors:
- Verify that the RLS policies are correctly configured
- Check that the teacher's `cohort_ids` array contains the cohorts they're trying to access

### Missing Tables

If you see errors about missing tables:
- Make sure you've run the SQL script completely
- Check for any SQL execution errors

## 5. Using the Code in Production

When moving to production:

1. Remove the testing bypass feature by deleting or commenting out the bypass code
2. Configure proper authentication hooks
3. Set up proper error handling and logging
4. Add additional security measures as needed

## 6. Data Flow

The teacher dashboard uses the following data flow:

1. Teacher logs in via Supabase auth
2. System checks if the user has a 'teacher' role in the profiles table
3. Teacher sees only cohorts that are assigned to them in their cohort_ids array
4. When searching, the system queries:
   - Participants table to find students in the cohort
   - Responses table to get student answers
   - Survey table to get survey configuration
5. RLS policies ensure teachers only see data for their assigned cohorts 