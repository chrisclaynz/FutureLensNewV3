import { describe, test, expect, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../src/config.js';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Database Setup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('tables should exist', async () => {
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .in('table_name', ['cohorts', 'surveys', 'participants', 'responses']);

        expect(error).toBeNull();
        expect(tables).toHaveLength(4);
        expect(tables.map(t => t.table_name)).toEqual(
            expect.arrayContaining(['cohorts', 'surveys', 'participants', 'responses'])
        );
    });

    test('RLS should be enabled on participants and responses tables', async () => {
        const { data: rls, error } = await supabase
            .from('information_schema.tables')
            .select('table_name, row_security')
            .in('table_name', ['participants', 'responses']);

        expect(error).toBeNull();
        expect(rls).toHaveLength(2);
        rls.forEach(table => {
            expect(table.row_security).toBe('YES');
        });
    });

    test('policies should exist', async () => {
        const { data: policies, error } = await supabase
            .from('information_schema.policies')
            .select('*')
            .in('table_name', ['participants', 'responses']);

        expect(error).toBeNull();
        expect(policies).toHaveLength(4);
    });
}); 