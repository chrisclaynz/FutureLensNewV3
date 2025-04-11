import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './config.js';
import { createSurvey } from './survey.js';

export function createApp(dependencies = {}) {
    const {
        supabase = createClient(supabaseUrl, supabaseKey),
        window: win = window,
        document: doc = document,
        storage = localStorage
    } = dependencies;

    let survey;

    async function init() {
        // Initialize survey with dependencies
        survey = createSurvey({
            supabase,
            storage,
            window: win
        });

        // Set up event listeners
        doc.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    }

    async function handleDOMContentLoaded() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (!session) {
                win.location.href = '/login.html';
                return;
            }

            // Initialize survey
            await survey.init();
        } catch (error) {
            console.error('Error initializing app:', error);
            win.location.href = '/login.html';
        }
    }

    return {
        init
    };
}

// Create default app instance
export const app = createApp(); 