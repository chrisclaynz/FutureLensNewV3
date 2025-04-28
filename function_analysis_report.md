# Database Function Analysis Report

Generated on: 4/28/2025, 5:38:57 PM

## Function Status:

- No functions found matching the criteria.

## Function Usage in Codebase:

### exec_sql Usage:
- migrations/create_exec_sql.sql (Line 4): -- Create the exec_sql function if it doesn't exist
- migrations/create_exec_sql.sql (Line 5): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- migrations/functional_redesign.sql (Line 2): -- This migration replaces the general-purpose exec_sql function with purpose-specific functions
- migrations/functional_redesign.sql (Line 217): -- This function will help users migrate from using exec_sql to the new purpose-specific functions
- migrations/functional_redesign.sql (Line 218): CREATE OR REPLACE FUNCTION exec_sql_deprecated(sql text)
- migrations/functional_redesign.sql (Line 226): PERFORM log_function_call('exec_sql_deprecated', jsonb_build_object(
- migrations/functional_redesign.sql (Line 232): RAISE NOTICE 'WARNING: exec_sql() is deprecated and will be removed in a future version.';
- migrations/functional_redesign.sql (Line 249): WHERE function_name = 'exec_sql_deprecated'
- migrations/functional_redesign.sql (Line 259): AND routine_name = 'exec_sql'
- migrations/functional_redesign.sql (Line 261): ALTER FUNCTION exec_sql(text) RENAME TO exec_sql_original;
- migrations/functional_redesign.sql (Line 264): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- migrations/functional_redesign.sql (Line 272): PERFORM exec_sql_deprecated(sql);
- migrations/functional_redesign.sql (Line 276): RAISE NOTICE 'exec_sql has been replaced with a version that logs deprecation warnings.';
- migrations/functional_redesign.sql (Line 278): RAISE NOTICE 'exec_sql function not found, skipping rename.';
- migrations/functional_redesign.sql (Line 284): COMMENT ON DATABASE postgres IS 'Functional redesign migration applied. exec_sql is now deprecated.';
- migrations/functional_redesign.sql (Line 289): RAISE NOTICE 'Migration complete: exec_sql has been deprecated and replaced with purpose-specific functions.';
- migrations/functional_redesign.sql (Line 290): RAISE NOTICE 'Users of exec_sql will now receive deprecation warnings to help with migration.';
- scripts/analyze-functions.js (Line 1): // Script to analyze the exec_sql and check_tables_exist functions
- scripts/analyze-functions.js (Line 43): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/analyze-functions.js (Line 46): // Execute the query with the exec_sql function
- scripts/analyze-functions.js (Line 47): const { error: queryError, data } = await supabase.rpc('exec_sql', { sql: query });
- scripts/analyze-functions.js (Line 55): // Try exec_sql
- scripts/analyze-functions.js (Line 56): const { error: execError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' }).catch(e => ({ error: e }));
- scripts/analyze-functions.js (Line 57): console.log('exec_sql function exists:', !execError);
- scripts/analyze-functions.js (Line 59): console.log('Error calling exec_sql:', execError.message);
- scripts/analyze-functions.js (Line 71): searchCodebaseForFunctionUsage('exec_sql');
- scripts/analyze-functions.js (Line 99): const execUsage = searchCodebaseForFunctionUsage('exec_sql');
- scripts/analyze-functions.js (Line 103): report += '### exec_sql Usage:\n';
- scripts/analyze-functions.js (Line 123): report += '### exec_sql Function:\n';
- scripts/apply-fix.js (Line 51): const { error } = await supabase.rpc('exec_sql', { sql: query + ';' });
- scripts/apply-rls-admin.js (Line 62): const { error } = await supabase.rpc('exec_sql', { sql });
- scripts/apply-rls.js (Line 57): // Check if exec_sql function exists
- scripts/apply-rls.js (Line 59): const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
- scripts/apply-rls.js (Line 62): console.error('Error: The exec_sql function does not exist in your database.');
- scripts/apply-rls.js (Line 67): console.error('Error checking exec_sql function:', error.message);
- scripts/apply-rls.js (Line 72): const { error } = await supabase.rpc('exec_sql', { sql });
- scripts/fix-search-path-enhanced.js (Line 71): const { error: tableError } = await supabase.rpc('exec_sql', { sql: createAuditLogTable });
- scripts/fix-search-path-enhanced.js (Line 79): // Fix exec_sql function with auditing
- scripts/fix-search-path-enhanced.js (Line 81): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- scripts/fix-search-path-enhanced.js (Line 90): VALUES ('exec_sql', jsonb_build_object('sql_hash', md5(sql)));
- scripts/fix-search-path-enhanced.js (Line 98): console.log('Fixing exec_sql function with auditing...');
- scripts/fix-search-path-enhanced.js (Line 99): const { error: execError } = await supabase.rpc('exec_sql', { sql: fixExecSql });
- scripts/fix-search-path-enhanced.js (Line 102): console.error('Error fixing exec_sql function:', execError.message);
- scripts/fix-search-path-enhanced.js (Line 104): console.log('✅ exec_sql function fixed with auditing successfully!');
- scripts/fix-search-path-enhanced.js (Line 195): const { error: checkError } = await supabase.rpc('exec_sql', { sql: fixCheckTablesExist });
- scripts/fix-search-path-enhanced.js (Line 231): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-enhanced.js (Line 246): const { error, data } = await supabase.rpc('exec_sql', { sql: backupQuery });
- scripts/fix-search-path-enhanced.js (Line 285): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-enhanced.js (Line 288): const { error, data } = await supabase.rpc('exec_sql', { sql: verifyQuery });
- scripts/fix-search-path-enhanced.js (Line 328): const { error: tableError, data: tableData } = await supabase.rpc('exec_sql', { sql: tableQuery });
- scripts/fix-search-path-minimal.js (Line 36): // Fix exec_sql function
- scripts/fix-search-path-minimal.js (Line 38): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- scripts/fix-search-path-minimal.js (Line 50): console.log('Fixing exec_sql function...');
- scripts/fix-search-path-minimal.js (Line 51): const { error: execError } = await supabase.rpc('exec_sql', { sql: fixExecSql });
- scripts/fix-search-path-minimal.js (Line 54): console.error('Error fixing exec_sql function:', execError.message);
- scripts/fix-search-path-minimal.js (Line 56): console.log('✅ exec_sql function fixed successfully!');
- scripts/fix-search-path-minimal.js (Line 98): const { error: checkError } = await supabase.rpc('exec_sql', { sql: fixCheckTablesExist });
- scripts/fix-search-path-minimal.js (Line 131): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-minimal.js (Line 146): const { error, data } = await supabase.rpc('exec_sql', { sql: backupQuery });
- scripts/fix-search-path-minimal.js (Line 185): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-minimal.js (Line 188): const { error, data } = await supabase.rpc('exec_sql', { sql: verifyQuery });
- scripts/rollback-function-changes.js (Line 140): const { error } = await supabase.rpc('exec_sql', { sql: rollbackSql });
- scripts/setup-exec-sql.js (Line 1): // Script to set up the exec_sql function in Supabase
- scripts/setup-exec-sql.js (Line 31): const sqlFilePath = path.join(__dirname, '../migrations/create_exec_sql.sql');
- scripts/setup-exec-sql.js (Line 35): console.log('Setting up exec_sql function...');
- scripts/setup-exec-sql.js (Line 43): const { error } = await supabase.from('_exec_sql_setup').select('*').limit(1).then(
- scripts/setup-exec-sql.js (Line 48): return await supabase.rpc('exec_sql', { sql }).catch(async () => {
- scripts/setup-exec-sql.js (Line 49): // If exec_sql doesn't exist yet, use raw query approach
- scripts/setup-exec-sql.js (Line 53): const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
- scripts/setup-exec-sql.js (Line 85): console.error('Error setting up exec_sql function:', error.message);
- scripts/setup-exec-sql.js (Line 89): console.log('✅ exec_sql function has been successfully set up!');
- src/migrations/000_create_exec_sql_function.sql (Line 2): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- src/migrations/full_schema.sql (Line 1): -- First, create the exec_sql function
- src/migrations/full_schema.sql (Line 2): CREATE OR REPLACE FUNCTION exec_sql(sql text)
- src/migrations/index.js (Line 10): // First, run the exec_sql function creation
- src/migrations/index.js (Line 11): const execSqlPath = path.join(process.cwd(), 'src', 'migrations', '000_create_exec_sql_function.sql');
- src/migrations/index.js (Line 14): console.log('Creating exec_sql function...');
- src/migrations/index.js (Line 15): const { error: execError } = await supabase.rpc('exec_sql', { sql: execSql });
- src/migrations/index.js (Line 17): console.error('Error creating exec_sql function:', execError);
- src/migrations/index.js (Line 26): const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSql });
- src/migrations/run_migrations.js (Line 21): const { error } = await supabase.rpc('exec_sql', { sql: statement });

### check_tables_exist Usage:
- migrations/functional_redesign.sql (Line 133): CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
- migrations/functional_redesign.sql (Line 144): PERFORM log_function_call('check_tables_exist', jsonb_build_object('table_names', table_names));
- scripts/analyze-functions.js (Line 1): // Script to analyze the exec_sql and check_tables_exist functions
- scripts/analyze-functions.js (Line 43): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/analyze-functions.js (Line 62): // Try check_tables_exist
- scripts/analyze-functions.js (Line 63): const { error: checkError } = await supabase.rpc('check_tables_exist', {}).catch(e => ({ error: e }));
- scripts/analyze-functions.js (Line 64): console.log('check_tables_exist function exists:', !checkError);
- scripts/analyze-functions.js (Line 66): console.log('Error calling check_tables_exist:', checkError.message);
- scripts/analyze-functions.js (Line 72): searchCodebaseForFunctionUsage('check_tables_exist');
- scripts/analyze-functions.js (Line 100): const checkUsage = searchCodebaseForFunctionUsage('check_tables_exist');
- scripts/analyze-functions.js (Line 112): report += '\n### check_tables_exist Usage:\n';
- scripts/analyze-functions.js (Line 128): report += '### check_tables_exist Function:\n';
- scripts/fix-search-path-enhanced.js (Line 107): // Fix check_tables_exist function with auditing
- scripts/fix-search-path-enhanced.js (Line 115): AND routine_name = 'check_tables_exist'
- scripts/fix-search-path-enhanced.js (Line 135): AND r.routine_name = 'check_tables_exist'
- scripts/fix-search-path-enhanced.js (Line 157): CREATE OR REPLACE FUNCTION check_tables_exist(%s)
- scripts/fix-search-path-enhanced.js (Line 168): VALUES (''check_tables_exist'', jsonb_build_object(%s));
- scripts/fix-search-path-enhanced.js (Line 184): RAISE NOTICE 'check_tables_exist function fixed with auditing successfully!';
- scripts/fix-search-path-enhanced.js (Line 188): RAISE NOTICE 'check_tables_exist function not found, skipping fix.';
- scripts/fix-search-path-enhanced.js (Line 194): console.log('Checking and fixing check_tables_exist function if it exists...');
- scripts/fix-search-path-enhanced.js (Line 198): console.error('Error fixing check_tables_exist function:', checkError.message);
- scripts/fix-search-path-enhanced.js (Line 200): console.log('✅ check_tables_exist function checked/fixed with auditing successfully!');
- scripts/fix-search-path-enhanced.js (Line 231): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-enhanced.js (Line 285): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-minimal.js (Line 59): // Fix check_tables_exist function
- scripts/fix-search-path-minimal.js (Line 67): AND routine_name = 'check_tables_exist'
- scripts/fix-search-path-minimal.js (Line 78): AND routine_name = 'check_tables_exist';
- scripts/fix-search-path-minimal.js (Line 81): EXECUTE 'CREATE OR REPLACE FUNCTION check_tables_exist()
- scripts/fix-search-path-minimal.js (Line 88): RAISE NOTICE 'check_tables_exist function fixed successfully!';
- scripts/fix-search-path-minimal.js (Line 91): RAISE NOTICE 'check_tables_exist function not found, skipping fix.';
- scripts/fix-search-path-minimal.js (Line 97): console.log('Checking and fixing check_tables_exist function if it exists...');
- scripts/fix-search-path-minimal.js (Line 101): console.error('Error fixing check_tables_exist function:', checkError.message);
- scripts/fix-search-path-minimal.js (Line 103): console.log('✅ check_tables_exist function checked/fixed successfully!');
- scripts/fix-search-path-minimal.js (Line 131): AND routine_name IN ('exec_sql', 'check_tables_exist');
- scripts/fix-search-path-minimal.js (Line 185): AND routine_name IN ('exec_sql', 'check_tables_exist');

## Vulnerability Assessment:

### exec_sql Function:
- **Severity**: High
- **Risk**: This function can execute arbitrary SQL, which could be exploited for SQL injection attacks if not properly secured.
- **Recommendation**: Set a fixed search path using `SET search_path = public` to prevent search path injection attacks.

### check_tables_exist Function:
- **Severity**: Medium
- **Risk**: The function may access tables in schemas controlled by an attacker if the search path is manipulated.
- **Recommendation**: Set a fixed search path using `SET search_path = public` to prevent search path injection attacks.

