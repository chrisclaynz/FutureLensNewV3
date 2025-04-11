import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.VITE_SUPABASE_URL;
const supabaseKey = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client with environment variables
const supabase = createClient(supabaseUrl, supabaseKey);

// Main application initialization
export const app = {
    init() {
        console.log('FutureLens application initialized');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app };
} 