import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.VITE_SUPABASE_URL;
const supabaseKey = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Results module
export const results = {
    async init() {
        console.log('Results module initialized');
        await this.loadResults();
    },

    async loadResults() {
        try {
            const participantId = localStorage.getItem('participant_id');
            if (!participantId) {
                window.location.href = '/';
                return;
            }

            const { data: responses, error } = await supabase
                .from('responses')
                .select('*')
                .eq('participant_id', participantId);

            if (error) throw error;

            this.displayResults(responses);
        } catch (error) {
            console.error('Error loading results:', error.message);
            alert('Error loading results. Please try again.');
        }
    },

    displayResults(responses) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        const totalQuestions = responses.length;
        const answeredQuestions = responses.filter(r => r.likert_value !== null).length;
        const dontUnderstandCount = responses.filter(r => r.dont_understand).length;

        container.innerHTML = `
            <div class="results-summary">
                <h3>Survey Results</h3>
                <p>Total Questions: ${totalQuestions}</p>
                <p>Questions Answered: ${answeredQuestions}</p>
                <p>Questions Marked "Don't Understand": ${dontUnderstandCount}</p>
            </div>
        `;
    }
};

// Initialize results module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    results.init();
});

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { results };
} 