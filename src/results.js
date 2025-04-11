import supabase from './client.js';

// Results module
export const results = {
    async init() {
        console.log('Results module initialized');
        // We'll implement this in a future prompt
    },

    async loadResults() {
        try {
            const participantId = localStorage.getItem('user_id');
            if (!participantId) {
                window.location.href = '/';
                return;
            }

            // For now, we'll just log info instead of querying
            console.log('Would load results for participant:', participantId);
            
            // Placeholder for result data
            const mockResponses = [
                { question_key: 'q1', likert_value: 2, dont_understand: false },
                { question_key: 'q2', likert_value: -1, dont_understand: false },
                { question_key: 'q3', likert_value: null, dont_understand: true }
            ];

            this.displayResults(mockResponses);
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

// Initialize results module when DOM is loaded - but only if we're on the results page
const isResultsPage = window.location.pathname.includes('results.html');

if (isResultsPage) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            results.init();
        });
    } else {
        // DOMContentLoaded has already fired
        results.init();
    }
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { results };
} 