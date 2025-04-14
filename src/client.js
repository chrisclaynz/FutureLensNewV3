import { createClient } from '@supabase/supabase-js';

// Create a singleton Supabase client
let supabaseInstance = null;
let instanceCount = 0;

// Get environment variables
const supabaseUrl = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.VITE_SUPABASE_URL;
const supabaseKey = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseClient() {
    if (!supabaseInstance) {
        instanceCount++;
        console.log(`Creating Supabase client instance #${instanceCount}`);
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } else {
        console.log('Reusing existing Supabase client instance');
    }
    return supabaseInstance;
}

// Initialize Supabase and verify database structure
async function initializeDatabase() {
    const client = getSupabaseClient();
    console.log('Verifying database structure...');
    
    try {
        // Check if surveys table exists and has data
        const { data, error } = await client
            .from('surveys')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('Error checking surveys table:', error);
            if (error.code === '42P01') {  // Table doesn't exist
                console.warn('Surveys table does not exist. Please run migrations: /run_migrations.html');
            }
        } else if (!data || data.length === 0) {
            console.warn('No surveys found in database. Please import a survey: /run_migrations.html');
        } else {
            console.log('Database verification complete: Survey data found');
        }
    } catch (error) {
        console.error('Error during database verification:', error);
    }
}

// Export the singleton getter function
export const supabase = getSupabaseClient();

// Initialize the database when the module is loaded
initializeDatabase().catch(console.error);

// For backward compatibility
export default supabase; 