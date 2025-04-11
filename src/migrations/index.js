import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../config.js';
import fs from 'fs';
import path from 'path';

async function runAllMigrations() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // First, run the exec_sql function creation
        const execSqlPath = path.join(process.cwd(), 'src', 'migrations', '000_create_exec_sql_function.sql');
        const execSql = fs.readFileSync(execSqlPath, 'utf8');
        
        console.log('Creating exec_sql function...');
        const { error: execError } = await supabase.rpc('exec_sql', { sql: execSql });
        if (execError) {
            console.error('Error creating exec_sql function:', execError);
            throw execError;
        }

        // Then run the schema migration
        const schemaPath = path.join(process.cwd(), 'src', 'migrations', '001_initial_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Running schema migration...');
        const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSql });
        if (schemaError) {
            console.error('Error running schema migration:', schemaError);
            throw schemaError;
        }

        console.log('All migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runAllMigrations(); 