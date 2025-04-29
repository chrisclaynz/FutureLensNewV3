#!/usr/bin/env node

/**
 * Script to check and fix RLS policies for the participants table
 * This ensures that authenticated users can create their own participant records
 */

require('dotenv').config(); // Load environment variables from .env file

const { createClient } = require('@supabase/supabase-js');

// Supabase connection details - would normally be in .env file
const SUPABASE_URL = 'https://noxrttgtvhtoiejujoyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5veHJ0dGd0dmh0b2llanVqb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTM0NjAsImV4cCI6MjA1OTkyOTQ2MH0.fYAZdAQvWerLIR8OYajCMc8rM90g--GqR3stlHNk7Hk';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service key needed for RLS changes

if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is not set.');
    console.error('You need a service role key to modify RLS policies.');
    console.error('Please create a .env file with SUPABASE_SERVICE_KEY=your_service_key');
    process.exit(1);
}

// Create a Supabase client with the service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRlsPolicies() {
    console.log('Checking RLS policies for participants table...');
    
    try {
        // Check if the table exists and has RLS enabled
        const { data: tableInfo, error: tableError } = await supabase
            .rpc('check_tables_exist', { table_names: ['participants'] });
            
        if (tableError) {
            console.error('Error checking if participants table exists:', tableError.message);
            return false;
        }
        
        if (!tableInfo || !tableInfo.length || !tableInfo[0].exists) {
            console.error('ERROR: participants table does not exist!');
            return false;
        }
        
        console.log('✓ participants table exists');
        
        // Check if RLS is enabled
        const { data: rlsEnabled, error: rlsError } = await supabase
            .from('information_schema.tables')
            .select('row_level_security')
            .eq('table_name', 'participants')
            .eq('table_schema', 'public')
            .single();
            
        if (rlsError) {
            console.error('Error checking RLS status:', rlsError.message);
            return false;
        }
        
        if (!rlsEnabled.row_level_security) {
            console.log('! Row Level Security is not enabled on the participants table');
            console.log('Enabling RLS...');
            
            const { error: enableError } = await supabase
                .rpc('exec_sql', { 
                    sql: 'ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;' 
                });
                
            if (enableError) {
                console.error('Error enabling RLS:', enableError.message);
                return false;
            }
            
            console.log('✓ Successfully enabled RLS on participants table');
        } else {
            console.log('✓ Row Level Security is already enabled');
        }
        
        // Check existing policies
        const { data: policies, error: policiesError } = await supabase
            .from('pg_policies')
            .select('policyname, cmd, qual')
            .eq('tablename', 'participants')
            .eq('schemaname', 'public');
            
        if (policiesError) {
            console.error('Error checking policies:', policiesError.message);
            return false;
        }
        
        console.log(`Found ${policies.length} policies on participants table:`);
        policies.forEach(policy => {
            console.log(`- ${policy.policyname} (${policy.cmd})`);
        });
        
        // Check if there's a policy for INSERT
        const insertPolicy = policies.find(p => 
            p.cmd === 'INSERT' || p.cmd === 'ALL');
            
        if (!insertPolicy) {
            console.log('! No INSERT policy found. Adding one...');
            await addInsertPolicy();
        } else {
            console.log('✓ INSERT policy exists');
        }
        
        return true;
    } catch (error) {
        console.error('Unexpected error checking RLS policies:', error.message);
        return false;
    }
}

async function addInsertPolicy() {
    try {
        // First check if a policy named 'Users can create their own participant records' already exists
        const { data: existingPolicy, error: checkError } = await supabase
            .from('pg_policies')
            .select('policyname')
            .eq('tablename', 'participants')
            .eq('schemaname', 'public')
            .eq('policyname', 'Users can create their own participant records');
            
        if (checkError) {
            console.error('Error checking for existing policy:', checkError.message);
            return false;
        }
        
        // If it exists, drop it first
        if (existingPolicy && existingPolicy.length > 0) {
            console.log('Dropping existing policy to recreate it...');
            
            const { error: dropError } = await supabase
                .rpc('exec_sql', { 
                    sql: "DROP POLICY IF EXISTS \"Users can create their own participant records\" ON public.participants;" 
                });
                
            if (dropError) {
                console.error('Error dropping existing policy:', dropError.message);
                return false;
            }
        }
        
        // Create the new policy
        const createPolicySql = `
            CREATE POLICY "Users can create their own participant records"
            ON public.participants
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
        `;
        
        const { error: createError } = await supabase
            .rpc('exec_sql', { sql: createPolicySql });
            
        if (createError) {
            console.error('Error creating INSERT policy:', createError.message);
            return false;
        }
        
        console.log('✓ Successfully created INSERT policy for participants table');
        return true;
    } catch (error) {
        console.error('Unexpected error adding INSERT policy:', error.message);
        return false;
    }
}

async function grantTablePermissions() {
    try {
        console.log('Ensuring authenticated users have INSERT permission on participants table...');
        
        const { error: grantError } = await supabase
            .rpc('exec_sql', { 
                sql: 'GRANT INSERT, SELECT ON public.participants TO authenticated;' 
            });
            
        if (grantError) {
            console.error('Error granting permissions:', grantError.message);
            return false;
        }
        
        console.log('✓ Successfully granted INSERT permission to authenticated users');
        return true;
    } catch (error) {
        console.error('Unexpected error granting permissions:', error.message);
        return false;
    }
}

async function run() {
    console.log('Running RLS policy check and fix script...');
    
    const rlsChecked = await checkRlsPolicies();
    if (!rlsChecked) {
        console.error('Failed to check or fix RLS policies.');
        process.exit(1);
    }
    
    const permissionsGranted = await grantTablePermissions();
    if (!permissionsGranted) {
        console.error('Failed to grant permissions.');
        process.exit(1);
    }
    
    console.log('\nRLS policy check and fix complete!');
    console.log('\nNext steps:');
    console.log('1. Try creating a new participant using the test user');
    console.log('2. Check the browser console for any errors during creation');
    console.log('3. Use the debug tools we added to verify the participant was created');
    
    process.exit(0);
}

// Run the script
run().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 