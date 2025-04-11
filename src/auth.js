import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.VITE_SUPABASE_URL;
const supabaseKey = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication module
export const auth = {
    init() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }
    },

    async handleSubmit(event) {
        event.preventDefault();
        const passcode = event.target.elements.passcode.value;
        
        try {
            // Query Supabase to validate passcode
            const { data, error } = await supabase
                .from('participants')
                .select('id')
                .eq('passcode', passcode)
                .single();

            if (error) throw error;

            if (data) {
                // Store participant info
                localStorage.setItem('participant_id', data.id);
                localStorage.setItem('passcode', passcode);
                // Redirect to survey
                window.location.href = '/survey.html';
            } else {
                alert('Invalid passcode');
            }
        } catch (error) {
            console.error('Login error:', error.message);
            alert('Error during login. Please try again.');
        }
    }
};

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth };
} 