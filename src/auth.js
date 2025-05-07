import { supabase } from './client.js';

// Authentication module
export const auth = {
    // Session timeout variables
    inactivityTimeout: 60 * 60 * 1000, // 60 minutes in milliseconds
    activityTimer: null,
    refreshInterval: null,
    
    init() {
        console.log('Auth module initialized');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const surveyCodeForm = document.getElementById('surveyCodeForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        /* Temporarily disabled sign-up functionality
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        */
        if (surveyCodeForm) {
            surveyCodeForm.addEventListener('submit', (e) => this.handleSurveyCode(e));
        }
        
        // Initialize session management
        this.initSessionTimeout();
    },

    async handleLogin(event) {
        event.preventDefault();
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        
        try {
            console.log('Attempting login for:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data?.user) {
                console.log('Login successful, user:', data.user.id);
                // Store session info
                localStorage.setItem('participant_id', data.user.id);
                
                // Check user role to determine where to redirect
                try {
                    console.log('Fetching user profile...');
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                        
                    if (profileError) {
                        console.warn('Could not fetch user profile, defaulting to student role:', profileError);
                        // Default to student flow if profile fetch fails
                        window.location.href = '/survey-code.html';
                        return;
                    }
                    
                    console.log('User profile:', profile);
                    
                    // Redirect based on role
                    if (profile && (profile.role === 'teacher' || profile.role === 'admin')) {
                        console.log('User has teacher/admin role, redirecting to admin dashboard');
                        window.location.href = '/admin.html';
                    } else {
                        console.log('User has student role, redirecting to survey code page');
                        // Continue with normal student flow
                        window.location.href = '/survey-code.html';
                    }
                } catch (profileError) {
                    console.error('Error checking user role:', profileError);
                    // Default to student flow on any error
                    window.location.href = '/survey-code.html';
                }
            }
        } catch (error) {
            console.error('Login error:', error.message);
            this.showError('Invalid email or password');
        }
    },

    async handleSignup(event) {
        event.preventDefault();
        const email = event.target.elements.email.value;
        const password = event.target.elements.password.value;
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            if (data?.user) {
                this.showSuccess('Account created successfully! Please check your email to verify your account.');
            }
        } catch (error) {
            console.error('Signup error:', error.message);
            this.showError('Error creating account. Please try again.');
        }
    },

    async handleSurveyCode(event) {
        event.preventDefault();
        const code = event.target.elements.code.value.trim();
        
        if (!code) {
            this.showError('Please enter a survey code');
            return;
        }
        
        try {
            // Get the current user's ID
            const userId = localStorage.getItem('participant_id');
            if (!userId) {
                console.error('No user ID found');
                this.showError('User ID not found. Please log in again.');
                return;
            }

            console.log('Checking survey code:', code, 'for user ID:', userId);

            // Query the cohorts table to find the cohort with this code
            const { data, error } = await supabase
                .from('cohorts')
                .select('id, survey_id')
                .eq('code', code);
                
            if (error) {
                console.error('Error finding cohort:', error.message, error);
                this.showError('Error validating survey code. Please try again.');
                return;
            }
            
            if (!data || data.length === 0) {
                console.error('No cohort found with code:', code);
                this.showError('Invalid survey code. Please check and try again.');
                return;
            }
            
            // Use the first matching cohort
            const cohort = data[0];
            console.log('Found cohort:', cohort);
            
            // Check if the user has already completed this survey
            // Use a two-step approach to avoid RLS issues:
            // 1. First get all participant records for this user
            const { data: userParticipants, error: participantError } = await supabase
                .from('participants')
                .select('id, survey_id')
                .eq('user_id', userId);
            
            console.log('User participants query result:', { 
                count: userParticipants ? userParticipants.length : 0, 
                error: participantError 
            });
                
            // 2. Then find the one matching the cohort's survey_id
            let existingParticipant = null;
            if (!participantError && userParticipants && userParticipants.length > 0) {
                // Find the participant record for this survey
                existingParticipant = userParticipants.find(p => p.survey_id === cohort.survey_id);
                console.log('Found matching participant for survey?', existingParticipant ? 'Yes' : 'No');
            }
            
            if (participantError && participantError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error('Error checking existing participant:', participantError.message, participantError);
                this.showError(`Error checking participant record: ${participantError.message}`);
                // Continue with the normal flow, don't block the user due to this error
            }
            
            // Try to find responses for this user in the responses table directly
            let foundResponses = false;
            
            try {
                // First, try to find responses for any participant records from this user for this survey
                if (existingParticipant) {
                    console.log('Found existing participant:', existingParticipant);
                    
                    // Find all participant IDs for this user and survey
                    const relevantParticipantIds = userParticipants
                        .filter(p => p.survey_id === cohort.survey_id)
                        .map(p => p.id);
                        
                    console.log('Checking responses for these participant IDs:', relevantParticipantIds);
                    
                    // Check all participant IDs
                    for (const pid of relevantParticipantIds) {
                        const { data: responses, error: responseError } = await supabase
                            .from('responses')
                            .select('id')
                            .eq('participant_id', pid)
                            .limit(1);
                            
                        console.log(`Response check for participant ${pid}:`, {
                            found: responses && responses.length > 0,
                            error: responseError
                        });
                        
                        if (responses && responses.length > 0) {
                            foundResponses = true;
                            localStorage.setItem('futurelens_participant_id', pid);
                            console.log(`Found responses for participant ${pid}`);
                            break;
                        }
                    }
                }
                
                console.log('Found responses for this user and survey?', foundResponses);
                
                if (foundResponses) {
                    console.log('User has completed this survey. Redirecting to results...');
                    window.location.href = '/results.html';
                    return;
                }
            } catch (responseCheckError) {
                console.error('Error checking responses:', responseCheckError);
            }
            
            // If we didn't find any completed responses, continue with the survey
            console.log('No completed responses found. Continuing to survey...');
            
            // Store the cohort ID and survey ID in localStorage
            localStorage.setItem('cohort_id', cohort.id);
            localStorage.setItem('survey_id', cohort.survey_id);
            
            console.log('Stored cohort_id and survey_id in localStorage, redirecting to welcome page');
            window.location.href = '/survey-welcome.html';
        } catch (error) {
            console.error('Survey code error:', error.message, error);
            this.showError('Error validating survey code. Please try again.');
        }
    },
    
    // Initialize session timeout handling
    initSessionTimeout() {
        // Check if we're on a protected page (not the login page)
        const isProtectedPage = !window.location.pathname.includes('index.html') && 
                               window.location.pathname !== '/';
        
        if (isProtectedPage) {
            // Set up activity listeners
            this.setupActivityListeners();
            
            // Start the inactivity timer
            this.resetInactivityTimer();
            
            // Set up periodic token refresh
            this.setupTokenRefresh();
        }
    },
    
    // Set up activity listeners to detect user interaction
    setupActivityListeners() {
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        
        // Add event listeners for user activity
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => this.handleUserActivity(), { passive: true });
        });
    },
    
    // Handle user activity - reset the inactivity timer
    handleUserActivity() {
        this.resetInactivityTimer();
    },
    
    // Reset the inactivity timer
    resetInactivityTimer() {
        // Clear existing timer
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
        }
        
        // Set new timer
        this.activityTimer = setTimeout(() => this.handleInactivity(), this.inactivityTimeout);
    },
    
    // Handle user inactivity
    async handleInactivity() {
        console.log('User inactive for too long, logging out');
        
        try {
            // Sign out the user
            await supabase.auth.signOut();
            
            // Clear token refresh
            this.clearTokenRefresh();
            
            // Clear any stored session data
            localStorage.removeItem('participant_id');
            localStorage.removeItem('survey_id');
            localStorage.removeItem('cohort_id');
            localStorage.removeItem('futurelens_participant_id');
            
            // Show message and redirect to login
            alert('Your session has expired due to inactivity. Please log in again.');
            window.location.href = '/';
        } catch (error) {
            console.error('Error during inactivity logout:', error);
            window.location.href = '/';
        }
    },
    
    // Set up periodic token refresh
    setupTokenRefresh() {
        // Clear any existing refresh interval
        this.clearTokenRefresh();
        
        // Set interval to refresh token every 50 minutes (less than the 60 min timeout)
        const refreshTime = 50 * 60 * 1000; // 50 minutes
        this.refreshInterval = setInterval(async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session) {
                    // If there's an error or no session, user might be logged out
                    this.handleInactivity();
                }
            } catch (error) {
                console.error('Error refreshing session:', error);
            }
        }, refreshTime);
    },
    
    // Clear token refresh interval
    clearTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    },

    showSuccess(message) {
        const successDiv = document.getElementById('success-message');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
    }
};

// Initialize auth module when DOM is loaded - but only if we're on the auth or survey code page
const isAuthPage = !window.location.pathname.includes('survey.html') && 
                   !window.location.pathname.includes('results.html');
const isSurveyCodePage = window.location.pathname.includes('survey-code.html');

if (isAuthPage || isSurveyCodePage) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            auth.init();
        });
    } else {
        // DOMContentLoaded has already fired
        auth.init();
    }
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth };
} 