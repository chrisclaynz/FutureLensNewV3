import supabase from './client.js';

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
            // Check if this is the auth page (index.html)
            const isAuthPage = !win.location.pathname.includes('survey.html') && 
                               !win.location.pathname.includes('results.html');
            
            // Get the current session
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) throw error;
            
            // Handle authentication flow
            if (!session && !isAuthPage) {
                // If not logged in and not on auth page, redirect to auth page
                win.location.href = '/';
                return;
            } else if (session && isAuthPage) {
                // If logged in and on auth page, redirect to survey
                win.location.href = '/survey.html';
                return;
            }
            
            // Initialize survey if on survey page
            if (isSurveyPage && session && createSurvey) {
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