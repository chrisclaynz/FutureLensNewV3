import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../config.js';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Read the SQL file
        const sqlPath = path.join(process.cwd(), 'src', 'migrations', '001_initial_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split the SQL into individual statements
        const statements = sql.split(';').filter(statement => statement.trim());

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                if (error) {
                    console.error('Error executing statement:', error);
                    throw error;
                }
            }
        }

        console.log('Migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations(); 