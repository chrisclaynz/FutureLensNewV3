# Row Level Security (RLS) Implementation

This document provides an overview of the Row Level Security (RLS) implementation in the FutureLens application.

## Overview

Row Level Security is a Supabase/PostgreSQL feature that restricts which rows a user can access in a database table based on their identity and permissions. In FutureLens, we use RLS to ensure that:

1. Users can only access their own survey responses and participant data
2. Survey configurations can be read by anyone but only created/modified by authenticated users
3. Administration functions are restricted to appropriate roles

## Security Model

### Access Matrix

| Table | Anonymous Users | Authenticated Users | Admin Users |
|-------|-----------------|---------------------|-------------|
| surveys | SELECT | SELECT, INSERT, UPDATE | ALL (via Service Role) |
| participants | None | SELECT, INSERT (own records only) | ALL (via Service Role) |
| responses | None | SELECT, INSERT (own records only) | ALL (via Service Role) |
| cohorts | SELECT | SELECT | ALL (via Service Role) |

### Policies

#### Surveys Table

1. **Anyone can view surveys**: Allows both anonymous and authenticated users to view all surveys.
   ```sql
   CREATE POLICY "Anyone can view surveys"
   ON surveys
   FOR SELECT
   USING (true);
   ```

2. **Only authenticated users can insert surveys**: Restricts survey creation to authenticated users only.
   ```sql
   CREATE POLICY "Only authenticated users can insert surveys"
   ON surveys
   FOR INSERT
   WITH CHECK (auth.role() = 'authenticated');
   ```

3. **Authenticated users can update surveys they own**: Currently a placeholder for future ownership-based update restrictions.
   ```sql
   CREATE POLICY "Authenticated users can update surveys they own"
   ON surveys
   FOR UPDATE
   USING (auth.role() = 'authenticated')
   WITH CHECK (auth.role() = 'authenticated');
   ```

#### Participants Table

1. **Users can only access their own participant records**: Restricts access to only the user's own records.
   ```sql
   CREATE POLICY "Users can only access their own participant records"
   ON participants
   FOR ALL
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id);
   ```

#### Responses Table

1. **Users can only access responses for their participant records**: Restricts access to only responses linked to the user's own participant records.
   ```sql
   CREATE POLICY "Users can only access responses for their participant records"
   ON responses
   FOR ALL
   USING (
       EXISTS (
           SELECT 1 FROM participants
           WHERE participants.id = responses.participant_id
           AND participants.user_id = auth.uid()
       )
   )
   WITH CHECK (
       EXISTS (
           SELECT 1 FROM participants
           WHERE participants.id = responses.participant_id
           AND participants.user_id = auth.uid()
       )
   );
   ```

## Implementation Changes

The following changes were made to implement RLS consistently:

1. Enabled RLS on the `surveys` table
2. Created consistent policies across all tables
3. Added helper functions for RLS-safe queries in `src/utils/rls-helpers.js`
4. Updated application code to handle RLS-related errors gracefully
5. Added comprehensive tests for RLS functionality

## Client-Side RLS Handling

The application has been updated to handle RLS-related errors gracefully. Key components:

1. **RLS-safe query helpers**: Located in `src/utils/rls-helpers.js`, these provide standard patterns for handling RLS-related errors.

2. **User-friendly error messages**: Error messages now distinguish between network issues, permission issues, and other errors.

3. **Debugging support**: The `rlsDebug` object provides tools for troubleshooting RLS issues during development.

## Testing RLS

RLS tests are implemented in `test/rls-test.js`. These tests verify:

1. Anonymous users can read surveys but cannot create them
2. Authenticated users can read and create surveys
3. Users can only access their own participant and response data
4. RLS has acceptable performance impact

To run the tests:

```bash
npm test -- test/rls-test.js
```

## Performance Considerations

RLS adds some overhead to database queries. Our testing shows:

- Typical survey queries with RLS enabled take approximately [X] ms
- This is within acceptable performance parameters for the application

## Rollback Plan

If serious issues are encountered with RLS, a rollback script is available:

```bash
psql -f migrations/rollback_surveys_rls.sql
```

This script will:
1. Disable RLS on the `surveys` table
2. Remove all associated policies
3. Restore direct grants to ensure continued functionality
4. Log the rollback in the audit log

## Future Improvements

1. **Ownership-based survey access**: Update policies to restrict survey modification based on ownership.
2. **Role-based administration**: Add specific policies for admin roles.
3. **Row-level audit logging**: Track access and modifications to sensitive data.

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**: Typically indicate an RLS policy is blocking access. Check:
   - User authentication state
   - Correct user_id in participants table
   - Correct participant_id in responses table

2. **Performance issues**: If queries become slow:
   - Check for missing indexes on columns used in RLS policies
   - Consider adding composite indexes for complex policies
   - Review query patterns for unnecessary joins

### Debugging Tools

The `rlsDebug` object in `src/utils/rls-helpers.js` provides tools for troubleshooting:

```javascript
import { rlsDebug } from './utils/rls-helpers.js';

// Enable debugging
rlsDebug.enable();

// Log RLS-related information
rlsDebug.log('Attempting to fetch survey:', surveyId);
``` 