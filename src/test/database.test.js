import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

describe('Database Setup', () => {
    let supabase;

    beforeAll(() => {
        supabase = createClient(supabaseUrl, supabaseKey);
    });

    test('all required tables exist', async () => {
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .in('table_name', ['surveys', 'cohorts', 'participants', 'responses']);

        expect(error).toBeNull();
        expect(tables).toHaveLength(4);
        expect(tables.map(t => t.table_name)).toEqual(
            expect.arrayContaining(['surveys', 'cohorts', 'participants', 'responses'])
        );
    });

    test('RLS is enabled on participants and responses tables', async () => {
        const { data: rlsTables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name, row_security')
            .in('table_name', ['participants', 'responses']);

        expect(error).toBeNull();
        expect(rlsTables).toHaveLength(2);
        rlsTables.forEach(table => {
            expect(table.row_security).toBe(true);
        });
    });

    test('RLS policies exist and are correctly configured', async () => {
        const { data: policies, error } = await supabase
            .from('pg_policies')
            .select('tablename, policyname')
            .in('tablename', ['participants', 'responses']);

        expect(error).toBeNull();
        expect(policies).toHaveLength(2);

        // Verify participants policy
        const participantsPolicy = policies.find(p => p.tablename === 'participants');
        expect(participantsPolicy).toBeDefined();
        expect(participantsPolicy.policyname).toBe('Users can only access their own participant records');

        // Verify responses policy
        const responsesPolicy = policies.find(p => p.tablename === 'responses');
        expect(responsesPolicy).toBeDefined();
        expect(responsesPolicy.policyname).toBe('Users can only access responses for their participant records');
    });

    test('foreign key constraints are properly set up', async () => {
        const { data: constraints, error } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name, table_name, constraint_type')
            .in('constraint_type', ['FOREIGN KEY', 'PRIMARY KEY'])
            .in('table_name', ['surveys', 'cohorts', 'participants', 'responses']);

        expect(error).toBeNull();
        
        // Verify primary keys
        expect(constraints.filter(c => c.constraint_type === 'PRIMARY KEY')).toHaveLength(4);
        
        // Verify foreign keys
        const foreignKeys = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
        expect(foreignKeys).toHaveLength(3);
        
        // Check specific foreign key relationships
        expect(foreignKeys.some(fk => 
            fk.table_name === 'participants' && 
            fk.constraint_name.includes('user_id')
        )).toBe(true);
        
        expect(foreignKeys.some(fk => 
            fk.table_name === 'responses' && 
            fk.constraint_name.includes('participant_id')
        )).toBe(true);
    });
}); 