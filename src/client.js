import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.VITE_SUPABASE_URL;
const supabaseKey = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

// Create a single instance of the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 