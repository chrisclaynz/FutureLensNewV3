import { supabase } from './client.js';

// Only import survey if we're on the survey page
const isSurveyPage = window.location.pathname.includes('survey.html');
let createSurvey;
if (isSurveyPage) {
    import('./survey.js').then(module => {
        createSurvey = module.createSurvey;
    });
}

export function createApp(dependencies = {}) {
    const {
        supabaseClient = supabase,
        window: win = window,
        document: doc = document,
        storage = localStorage
    } = dependencies;

    let survey;

    async function init() {
        // Set up event listeners for DOMContentLoaded only if it hasn't fired yet
        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
        } else {
            // DOMContentLoaded has already fired
            handleDOMContentLoaded();
        }
    }

    async function handleDOMContentLoaded() {
        try {
            // Check what page we're on
            const isAuthPage = win.location.pathname.includes('index.html') || 
                               win.location.pathname === '/';
            const isSurveyCodePage = win.location.pathname.includes('survey-code.html');
            const isResultsPage = win.location.pathname.includes('results.html');
            
            // Get the current session
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) throw error;
            
            // Handle authentication flow
            if (!session && !isAuthPage) {
                // If not logged in and not on auth page, redirect to auth page
                win.location.href = '/';
                return;
            } else if (session && isAuthPage) {
                // If logged in and on auth page, redirect to survey code page
                // Store user ID in localStorage for the survey
                if (session.user) {
                    storage.setItem('participant_id', session.user.id);
                }
                win.location.href = '/survey-code.html';
                return;
            }
            
            // If logged in and on survey code page, no need to redirect
            // If logged in and on survey page, and has survey_id, no need to redirect
            if (session && isSurveyPage) {
                const hasSurveyId = storage.getItem('survey_id');
                
                if (!hasSurveyId) {
                    // If on survey page but no survey ID, redirect to survey code page
                    win.location.href = '/survey-code.html';
                    return;
                }
            }
            
            // Initialize survey if on survey page
            if (isSurveyPage && session && createSurvey) {
                // Store user ID in localStorage for the survey if not already there
                if (session.user && !storage.getItem('participant_id')) {
                    storage.setItem('participant_id', session.user.id);
                }
                
                survey = createSurvey({
                    supabase: supabaseClient,
                    storage,
                    window: win
                });
                await survey.init();
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            // Only redirect if not already on the auth page
            if (!win.location.pathname.includes('index.html') && 
                win.location.pathname !== '/') {
                win.location.href = '/';
            }
        }
    }

    return {
        init
    };
}

// Create default app instance
const app = createApp();

// Initialize the app
app.init(); 