import { supabase } from './client.js';
import { auth } from './auth.js';

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
        storage = localStorage,
        authModule = auth
    } = dependencies;

    let survey;

    async function init() {
        // Initialize session timeout handling for all pages
        if (typeof authModule.initSessionTimeout === 'function') {
            authModule.initSessionTimeout();
        }
        
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
            console.log('DOMContentLoaded handler started');
            // Check what page we're on
            const isAuthPage = win.location.pathname.includes('index.html') || 
                               win.location.pathname === '/';
            const isSurveyCodePage = win.location.pathname.includes('survey-code.html');
            const isWelcomePage = win.location.pathname.includes('survey-welcome.html');
            const isResultsPage = win.location.pathname.includes('results.html');
            const isAdminPage = win.location.pathname.includes('admin.html');
            
            console.log('Current page:', win.location.pathname);
            
            // Get the current session
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) throw error;
            
            // Handle authentication flow
            if (!session && !isAuthPage) {
                console.log('No session and not on auth page, redirecting to login');
                // If not logged in and not on auth page, redirect to auth page
                win.location.href = '/';
                return;
            } else if (session) {
                // If logged in, check user role
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileError) {
                    console.error('Error fetching user profile:', profileError);
                    // Default to student flow if profile fetch fails
                    if (isAuthPage) {
                        win.location.href = '/survey-code.html';
                    }
                    return;
                }
                
                // Handle redirects based on role and current page
                if (profile.role === 'teacher' || profile.role === 'admin') {
                    if (isAuthPage || isSurveyCodePage || isWelcomePage) {
                        // Teachers/admins should go to admin dashboard
                        win.location.href = '/admin.html';
                        return;
                    }
                } else {
                    // Regular users (students)
                    if (isAuthPage) {
                        // Store user ID in localStorage for the survey
                        if (session.user) {
                            storage.setItem('participant_id', session.user.id);
                        }
                        win.location.href = '/survey-code.html';
                        return;
                    }
                }
            }
            
            // If logged in and on survey welcome or survey page, check for survey_id
            if (session && (isSurveyPage || isWelcomePage)) {
                console.log('Checking survey_id for survey/welcome page');
                const hasSurveyId = storage.getItem('survey_id');
                
                if (!hasSurveyId) {
                    console.log('No survey_id found, redirecting to survey code page');
                    // If on survey page but no survey ID, redirect to survey code page
                    win.location.href = '/survey-code.html';
                    return;
                }
            }
            
            // Initialize survey if on survey page
            if (isSurveyPage && session && createSurvey) {
                console.log('Initializing survey');
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