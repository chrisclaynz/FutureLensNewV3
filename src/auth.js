import { supabase } from './client.js';

// Authentication module
export const auth = {
    init() {
        console.log('Auth module initialized');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
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
                // Redirect to survey
                window.location.href = '/survey.html';
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

// Initialize auth module when DOM is loaded - but only if we're on the index page
const isAuthPage = !window.location.pathname.includes('survey.html') && 
                   !window.location.pathname.includes('results.html');

if (isAuthPage) {
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