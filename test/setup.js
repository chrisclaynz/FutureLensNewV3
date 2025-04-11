import { jest } from '@jest/globals';

// Mock import.meta.env
global.import = {
    meta: {
        env: {
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
        }
    }
};

// Make jest available globally
global.jest = jest; 