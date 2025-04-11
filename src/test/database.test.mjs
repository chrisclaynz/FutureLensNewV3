import { createClient } from '@supabase/supabase-js';
import { test } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

test('Database Setup', async (t) => {
    await t.test('all required tables exist', async () => {
        const { data: tables, error } = await supabase
            .from('surveys')
            .select('id')
            .limit(1);

        assert.strictEqual(error, null, 'surveys table exists');

        const { error: cohortsError } = await supabase
            .from('cohorts')
            .select('id')
            .limit(1);

        assert.strictEqual(cohortsError, null, 'cohorts table exists');

        const { error: participantsError } = await supabase
            .from('participants')
            .select('id')
            .limit(1);

        assert.strictEqual(participantsError, null, 'participants table exists');

        const { error: responsesError } = await supabase
            .from('responses')
            .select('id')
            .limit(1);

        assert.strictEqual(responsesError, null, 'responses table exists');
    });

    await t.test('RLS is working on participants table', async () => {
        // Try to access participants table without auth
        const { data: participants, error } = await supabase
            .from('participants')
            .select('*');

        // Should get a permission denied error due to RLS
        assert(error?.message.includes('permission denied'), 'RLS blocks unauthorized access to participants');
    });

    await t.test('RLS is working on responses table', async () => {
        // Try to access responses table without auth
        const { data: responses, error } = await supabase
            .from('responses')
            .select('*');

        // Should get a permission denied error due to RLS
        assert(error?.message.includes('permission denied'), 'RLS blocks unauthorized access to responses');
    });
}); 