import { supabase } from './client.js';

// Authentication module
export const auth = {
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