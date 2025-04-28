# Migration Guide: From exec_sql to Purpose-Specific Functions

This guide explains how to migrate your code from using the general-purpose `exec_sql` function to the new purpose-specific functions implemented as part of our Option C security enhancement.

## Table of Contents
1. [Overview](#overview)
2. [Available Functions](#available-functions)
3. [Migration Examples](#migration-examples)
4. [Gradual Migration Strategy](#gradual-migration-strategy)
5. [Monitoring Deprecated Usage](#monitoring-deprecated-usage)

## Overview

We've replaced the general-purpose `exec_sql` function with purpose-specific functions to enhance security. The old `exec_sql` function now routes calls through `exec_sql_deprecated`, which:

1. Logs the function call in the `security_audit_log` table
2. Shows deprecation warning notices (visible in server logs)
3. Still performs the requested operation for backward compatibility

All new functions have the following security enhancements:
- Fixed search path (`SET search_path = public`) to prevent search path injection attacks
- Comprehensive audit logging
- More granular permission control
- Better code organization and maintainability

## Available Functions

Here are the new purpose-specific functions you should use instead of `exec_sql`:

| Function | Description | Parameters |
|----------|-------------|------------|
| `enable_rls_on_table` | Enables Row Level Security on a table | `table_name text` |
| `create_rls_policy` | Creates a RLS policy | `policy_name text, table_name text, operation text, using_expr text, with_check_expr text, roles text[]` |
| `drop_rls_policy` | Drops a RLS policy | `policy_name text, table_name text` |
| `check_tables_exist` | Checks if tables exist | `table_names text[]` |
| `grant_table_permissions` | Grants permissions on a table | `table_name text, permissions text, roles text[]` |
| `revoke_table_permissions` | Revokes permissions on a table | `table_name text, permissions text, roles text[]` |

## Migration Examples

Below are examples of how to migrate common `exec_sql` calls to the new purpose-specific functions:

### Enabling RLS

**Old Code:**
```javascript
const { error } = await supabase.rpc('exec_sql', { 
  sql: `ALTER TABLE users ENABLE ROW LEVEL SECURITY` 
});
```

**New Code:**
```javascript
const { error } = await supabase.rpc('enable_rls_on_table', { 
  table_name: 'users' 
});
```

### Creating RLS Policies

**Old Code:**
```javascript
const { error } = await supabase.rpc('exec_sql', { 
  sql: `CREATE POLICY "users_can_read_own_data" 
        ON users 
        FOR SELECT 
        USING (auth.uid() = user_id)` 
});
```

**New Code:**
```javascript
const { error } = await supabase.rpc('create_rls_policy', { 
  policy_name: 'users_can_read_own_data',
  table_name: 'users',
  operation: 'SELECT',
  using_expr: 'auth.uid() = user_id',
  with_check_expr: null,
  roles: null
});
```

### Granting Permissions

**Old Code:**
```javascript
const { error } = await supabase.rpc('exec_sql', { 
  sql: `GRANT SELECT, INSERT ON users TO authenticated` 
});
```

**New Code:**
```javascript
const { error } = await supabase.rpc('grant_table_permissions', { 
  table_name: 'users',
  permissions: 'SELECT, INSERT',
  roles: ['authenticated']
});
```

### Checking If Tables Exist

**Old Code:**
```javascript
const { error } = await supabase.rpc('exec_sql', { 
  sql: `SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  )` 
});
```

**New Code:**
```javascript
const { error, data } = await supabase.rpc('check_tables_exist', { 
  table_names: ['users']
});
// data will be true if all tables exist, false otherwise
```

## Gradual Migration Strategy

You don't need to update all your code at once. The old `exec_sql` function still works but is deprecated. We recommend the following strategy:

1. **Identify usage**: Use the provided analysis tools to identify all places where `exec_sql` is used
2. **Prioritize changes**: Start with the most security-critical parts of your application
3. **Monitor audit logs**: Keep an eye on the `security_audit_log` table to track usage of the deprecated function
4. **Set a timeline**: Plan to complete the migration within the next 3-6 months

## Monitoring Deprecated Usage

You can monitor usage of the deprecated `exec_sql` function using the `deprecated_function_usage` view:

```sql
SELECT * FROM deprecated_function_usage ORDER BY last_use DESC;
```

This view shows:
- Which users are still using the deprecated function
- How many times they've used it
- When they first and last used it

For a detailed log of each function call, query the `security_audit_log` table:

```sql
SELECT * FROM security_audit_log 
WHERE function_name = 'exec_sql_deprecated' 
ORDER BY execution_time DESC;
``` 