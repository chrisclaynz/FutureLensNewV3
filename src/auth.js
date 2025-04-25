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
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data?.user) {
                // Store session info
                localStorage.setItem('participant_id', data.user.id);
                // Redirect to survey code page instead of directly to survey
                window.location.href = '/survey-code.html';
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
            // Query the cohorts table to find the cohort with this code
            const { data, error } = await supabase
                .from('cohorts')
                .select('id, survey_id')
                .eq('code', code);
                
            if (error) {
                console.error('Error finding cohort:', error.message);
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
            
            // Store the cohort ID and survey ID in localStorage
            localStorage.setItem('cohort_id', cohort.id);
            localStorage.setItem('survey_id', cohort.survey_id);
            
            // Redirect to the welcome page instead of the survey page
            window.location.href = '/survey-welcome.html';
        } catch (error) {
            console.error('Survey code error:', error.message);
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