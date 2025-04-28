# FutureLens Database Function Security Guide

This document provides guidelines for addressing function_search_path_mutable warnings and securely implementing database functions in the FutureLens application.

## Understanding the Vulnerability

The `function_search_path_mutable` warning indicates that a database function does not have a fixed search path, making it vulnerable to search path injection attacks. This can allow attackers to potentially execute arbitrary code with the privileges of the function owner.

### Affected Functions in FutureLens

The two primary functions affected in our application are:

1. `exec_sql(sql text)` - A powerful function that can execute arbitrary SQL statements.
2. `check_tables_exist()` - A function that checks for the existence of required tables.

## Graduated Remediation Approach

We have implemented a graduated approach with three levels of remediation to address this security issue:

### Option A: Minimal Fix (Preserve All Functionality)

This approach simply adds a fixed search path to the functions without changing their behavior:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
```

**Implementation:** Run `npm run fix:search-path:minimal`

**Pros:**
- Minimal disruption to existing code
- No functional changes
- Quick to implement

**Cons:**
- Still allows executing arbitrary SQL
- No audit trail of function usage

### Option B: Enhanced Security with Auditing

This approach adds both a fixed search path and comprehensive auditing:

```sql
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  parameters JSONB,
  user_id UUID DEFAULT auth.uid(),
  execution_time TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log(function_name, parameters)
  VALUES ('exec_sql', jsonb_build_object('sql_hash', md5(sql)));
  
  EXECUTE sql;
END;
$$;
```

**Implementation:** Run `npm run fix:search-path:enhanced`

**Pros:**
- Adds security without breaking existing functionality
- Provides audit trail of all function calls
- Enables detection of potential misuse

**Cons:**
- Still allows executing arbitrary SQL
- Slightly higher overhead due to logging

### Option C: Maximum Security (Functional Redesign)

This approach replaces the general-purpose functions with purpose-specific ones:

```sql
-- Instead of exec_sql for enabling RLS
CREATE OR REPLACE FUNCTION enable_rls_on_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$;
```

**Implementation:** Apply the `migrations/functional_redesign.sql` migration

**Pros:**
- Highest security level
- Each function has a specific, limited purpose
- Comprehensive audit logging
- Better code organization and maintainability

**Cons:**
- Requires code changes to migrate from general-purpose to specific functions
- Might introduce temporary compatibility issues

## How to Choose Your Remediation Approach

Consider the following factors when choosing your approach:

1. **Development Timeline:** 
   - For immediate fixes with minimal changes, use Option A
   - For a balance of security and compatibility, use Option B
   - For a long-term security solution, use Option C

2. **Security Requirements:**
   - Lower security needs: Option A might be sufficient
   - Medium security needs with audit requirements: Option B
   - High security or compliance requirements: Option C

3. **Technical Debt:**
   - Option C requires more work now but reduces technical debt long-term
   - Options A and B are quicker but leave the technical debt in place

## Best Practices for Secure Database Functions

When writing new database functions, follow these guidelines:

1. **Always Set a Fixed Search Path:**
   ```sql
   CREATE OR REPLACE FUNCTION my_function()
   RETURNS void
   LANGUAGE plpgsql
   SET search_path = public
   AS $$
   BEGIN
     -- Function code here
   END;
   $$;
   ```

2. **Use the Principle of Least Privilege:**
   - Only use `SECURITY DEFINER` when necessary
   - Prefer `SECURITY INVOKER` when possible
   - Grant minimal permissions to function owner

3. **Implement Proper Input Validation:**
   - For string inputs used in dynamic SQL, use parameterized statements
   - Use the `format()` function with `%I` for identifiers and `%L` for literals:
   ```sql
   EXECUTE format('SELECT * FROM %I WHERE id = %L', table_name, id);
   ```

4. **Add Audit Logging:**
   - Log sensitive function calls to the `security_audit_log` table
   - Use the helper function `log_function_call(function_name, parameters)`

5. **Use Purpose-Specific Functions:**
   - Create specialized functions for specific tasks
   - Avoid general-purpose functions that can execute arbitrary SQL

6. **Regular Security Review:**
   - Periodically review function definitions for security issues
   - Run `npm run fix:search-path:analyze` to identify new issues

## Rollback Procedure

If you encounter issues after applying a fix, you can roll back to the previous version:

1. Run `npm run fix:search-path:rollback`
2. Select the backup to restore from the list
3. Confirm the rollback

Note that rollbacks revert security improvements, so only use them if absolutely necessary and re-apply a fix as soon as possible.

## Monitoring and Verification

After applying any fix, verify it was applied correctly:

1. **For Option A or B:**
   ```sql
   SELECT routine_name, routine_schema, 
          routine_definition, security_type,
          (SELECT setting FROM pg_settings WHERE name = 'search_path') as current_search_path
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('exec_sql', 'check_tables_exist');
   ```

2. **For Option B or C (with auditing):**
   Check that audit logs are being generated:
   ```sql
   SELECT * FROM security_audit_log ORDER BY execution_time DESC LIMIT 10;
   ```

3. **For Option C:**
   Check that deprecated function usage is being tracked:
   ```sql
   SELECT * FROM deprecated_function_usage;
   ```

## Conclusion

By addressing the `function_search_path_mutable` warnings, we are significantly improving the security posture of the FutureLens application. The graduated approach allows you to choose the right balance between security, compatibility, and implementation effort. 