import { supabase } from '../client.js';

/**
 * Run database migrations to create the required tables
 */
export async function createTables() {
    console.log('Running database migrations...');
    
    try {
        // Create participants table if it doesn't exist
        const { error: participantsError } = await supabase.rpc('create_participants_table', {});
        if (participantsError) {
            console.error('Error creating participants table:', participantsError);
        } else {
            console.log('Participants table created or already exists');
        }
        
        // Create responses table if it doesn't exist
        const { error: responsesError } = await supabase.rpc('create_responses_table', {});
        if (responsesError) {
            console.error('Error creating responses table:', responsesError);
        } else {
            console.log('Responses table created or already exists');
        }
        
        // Create surveys table if it doesn't exist
        const { error: surveysError } = await supabase.rpc('create_surveys_table', {});
        if (surveysError) {
            console.error('Error creating surveys table:', surveysError);
            
            // Fallback: try SQL query if RPC function doesn't exist
            console.log('Attempting direct SQL query for surveys table...');
            
            const { error: sqlError } = await supabase.rpc('execute_sql', {
                sql_query: `
                    CREATE TABLE IF NOT EXISTS public.surveys (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        json_config JSONB NOT NULL,
                        inserted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                    );
                    
                    -- Add RLS policy
                    ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
                    
                    -- Allow everyone to read surveys
                    CREATE POLICY "Allow everyone to read surveys"
                    ON public.surveys FOR SELECT
                    USING (true);
                    
                    -- Only allow authenticated users to insert
                    CREATE POLICY "Allow authenticated users to insert surveys"
                    ON public.surveys FOR INSERT
                    WITH CHECK (auth.role() = 'authenticated');
                `
            });
            
            if (sqlError) {
                console.error('Error executing SQL for surveys table:', sqlError);
            } else {
                console.log('Surveys table created via SQL');
            }
        } else {
            console.log('Surveys table created or already exists');
        }
        
        // Create cohorts table if it doesn't exist
        const { error: cohortsError } = await supabase.rpc('create_cohorts_table', {});
        if (cohortsError) {
            console.error('Error creating cohorts table:', cohortsError);
        } else {
            console.log('Cohorts table created or already exists');
        }
        
        console.log('Database migration completed');
        return { success: true };
    } catch (error) {
        console.error('Database migration failed:', error);
        return { success: false, error };
    }
}

// Run migrations if called directly
if (typeof window !== 'undefined' && window.location.pathname.includes('run_migrations')) {
    createTables()
        .then(result => {
            console.log('Migration result:', result);
            if (result.success) {
                alert('Database migration completed successfully!');
            } else {
                alert('Database migration failed. See console for details.');
            }
        })
        .catch(error => {
            console.error('Migration execution error:', error);
            alert('Database migration failed with an exception. See console for details.');
        });
}

export default createTables; 