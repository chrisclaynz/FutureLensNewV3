// The Supabase client will be loaded from CDN in index.html
// This assumes window.supabase is now available

// Create a singleton Supabase client
let supabaseInstance = null;
let instanceCount = 0;

// Replace hardcoded URL and key with these values if they're not set in environment
const supabaseUrl = 'https://noxrttgtvhtoiejujoyd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5veHJ0dGd0dmh0b2llanVqb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTM0NjAsImV4cCI6MjA1OTkyOTQ2MH0.fYAZdAQvWerLIR8OYajCMc8rM90g--GqR3stlHNk7Hk';

// Only initialize the client once at module load time
// This prevents multiple instances from being created
if (!window.GLOBAL_SUPABASE_CLIENT) {
    console.log('Creating Supabase client instance');
    window.GLOBAL_SUPABASE_CLIENT = window.supabase.createClient(supabaseUrl, supabaseKey);
}

function getSupabaseClient() {
    console.log('Reusing existing Supabase client instance');
    return window.GLOBAL_SUPABASE_CLIENT;
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