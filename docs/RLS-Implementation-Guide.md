# FutureLens: RLS Implementation Guide

This guide provides step-by-step instructions for implementing Row Level Security (RLS) in the FutureLens application. It addresses the current vulnerabilities where the surveys table has inconsistent RLS configuration.

## What is Row Level Security?

Row Level Security (RLS) is a security feature in PostgreSQL that restricts access to rows in a database table based on user credentials. In Supabase, this is used to control:

- Which authenticated users can see which rows
- What anonymous (non-authenticated) users can access
- How data can be modified, and by whom

## Implementation Steps

### 1. Staging Environment Setup

First, create a staging environment to test the RLS changes:

```bash
# Clone the production database to a staging environment
# Note: This step varies depending on your Supabase setup
supabase db dump -f staging_backup.sql   # Using Supabase CLI
# Import to staging
supabase db push staging_backup.sql -d staging

# Alternatively, create a local testing environment
npm run dev  # Start the development server
```

### 2. Apply the RLS Migrations

```bash
# Run the comprehensive RLS migration script
npm run apply:rls

# This will:
# 1. Create the audit_log table
# 2. Enable RLS on all tables including surveys
# 3. Create consistent policies across all tables
# 4. Set appropriate permissions
```

### 3. Test the RLS Implementation

```bash
# Run the RLS-specific tests
npm run test:rls

# This will validate:
# - Anonymous users can only read surveys but not modify them
# - Authenticated users can create surveys and access their own data
# - RLS policies properly restrict access to participant data
# - Performance is acceptable with RLS enabled
```

### 4. Monitoring for Issues

After implementation, monitor for potential issues:

1. Watch server logs for permission denied errors
2. Check for performance degradation on key queries
3. Verify user experience is not affected

## Rollback Plan

If major issues are encountered, use the rollback script:

```bash
# Using psql
psql -f migrations/rollback_surveys_rls.sql

# Or directly from Supabase SQL editor:
# (copy content from migrations/rollback_surveys_rls.sql)
```

## Security Model Overview

This implementation follows this security model:

| Table | Anonymous | Authenticated | Admin |
|-------|-----------|---------------|-------|
| surveys | READ | READ, CREATE, UPDATE | ALL |
| participants | - | READ/WRITE (own) | ALL |
| responses | - | READ/WRITE (own) | ALL |
| cohorts | READ | READ | ALL |

## Using RLS-Safe Query Patterns

To work with RLS, follow these query patterns:

### Reading Survey Data

```javascript
import { fetchSurveyById } from './utils/rls-helpers.js';

// Use the helper function
const { data: survey, error } = await fetchSurveyById(surveyId);

// Handle potential RLS errors gracefully
if (error) {
  if (error.isRlsError) {
    showMessage('You do not have permission to access this survey.');
  } else {
    showMessage('Error loading survey. Please try again.');
  }
}
```

### Creating Survey Data (Authenticated)

```javascript
import { createSurvey } from './utils/rls-helpers.js';

// This requires authentication
const surveyData = { /* survey config */ };
const { data, error } = await createSurvey(surveyData);

if (error) {
  if (error.isAuthError) {
    // Prompt for login
    redirectToLogin();
  } else if (error.isRlsError) {
    showMessage('Permission denied.');
  } else {
    showMessage('Error creating survey.');
  }
}
```

## Performance Considerations

The RLS implementation may impact query performance:

- Queries with complex join conditions in RLS policies may be slower
- Consider adding indexes on columns used in RLS policies
- Monitor query performance before and after RLS implementation

## Troubleshooting

Common issues and solutions:

### Permission Denied Errors

If users experience "permission denied" errors:

1. Verify user authentication status
2. Check that user_id in participants table matches auth.uid()
3. Examine RLS policies for correctness

### Debug Mode

Enable debug mode to diagnose RLS issues:

```javascript
import { rlsDebug } from './utils/rls-helpers.js';

// In development
rlsDebug.enable();

// In production
// rlsDebug.disable();
```

## Next Steps

- Implement role-based access for admin functions
- Add ownership checks for survey updates and deletions
- Create monitoring dashboards for RLS-related errors 