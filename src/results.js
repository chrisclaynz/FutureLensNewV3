import { supabase } from './client.js';

// Results module
export const results = {
    async init() {
        console.log('Results module initialized');
        await this.loadResults();
    },

    async loadResults() {
        try {
            const participantId = localStorage.getItem('futurelens_participant_id');
            if (!participantId) {
                console.error('No participant ID found');
                window.location.href = '/';
                return;
            }

            // Calculate and display the results
            const scores = await this.calculateScores(participantId);
            this.displayResults(scores);
        } catch (error) {
            console.error('Error loading results:', error.message);
            alert('Error loading results. Please try again.');
        }
    },

    async calculateScores(participantId) {
        // Get the participant record to find survey_id
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select('id, user_id, survey_id, cohort_id')
            .eq('id', participantId)
            .single();
            
        if (participantError) {
            console.error('Error fetching participant:', participantError.message);
            throw new Error('Unable to load participant data. Please try again.');
        }
        
        if (!participant) {
            throw new Error('Participant record not found.');
        }
        
        // Get the survey configuration to determine scoring rules
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, json_config')
            .eq('id', participant.survey_id)
            .single();
            
        if (surveyError) {
            console.error('Error fetching survey:', surveyError.message);
            throw new Error('Unable to load survey configuration. Please try again.');
        }
        
        // Get all responses for this participant
        const { data: responses, error: responsesError } = await supabase
            .from('responses')
            .select('*')
            .eq('participant_id', participantId);
            
        if (responsesError) {
            console.error('Error fetching responses:', responsesError.message);
            throw new Error('Unable to load responses. Please try again.');
        }
        
        if (!responses || responses.length === 0) {
            throw new Error('No responses found for this participant.');
        }
        
        // Process the responses based on the survey configuration
        const surveyConfig = survey.json_config;
        
        // Calculate scores for each continuum
        const continua = surveyConfig.continua || {};
        const statements = surveyConfig.statements || [];
        
        // Initialize continuumScores object
        const continuumScores = {};
        
        // Initialize each continuum with empty arrays for scores
        Object.keys(continua).forEach(continuumKey => {
            continuumScores[continuumKey] = {
                scores: [],
                dontUnderstandCount: 0,
                average: 0,
                totalResponses: 0
            };
        });
        
        // Process each response
        responses.forEach(response => {
            // Find the corresponding statement in the survey
            const statement = statements.find(s => s.id === response.question_key);
            
            if (statement && statement.continuum) {
                const continuum = statement.continuum;
                
                // Only process valid continuums that exist in the survey
                if (continuumScores[continuum]) {
                    if (response.dont_understand) {
                        continuumScores[continuum].dontUnderstandCount++;
                    } else if (response.likert_value !== null) {
                        // Apply alignment factor if specified in the statement
                        let value = response.likert_value;
                        
                        // If alignment is "right", reverse the value for consistent scoring
                        if (statement.alignment === 'right') {
                            value = -value; // Invert the value
                        }
                        
                        continuumScores[continuum].scores.push(value);
                        continuumScores[continuum].totalResponses++;
                    }
                }
            }
        });
        
        // Calculate averages for each continuum
        Object.keys(continuumScores).forEach(continuum => {
            const scores = continuumScores[continuum].scores;
            if (scores.length > 0) {
                const sum = scores.reduce((a, b) => a + b, 0);
                continuumScores[continuum].average = sum / scores.length;
            }
        });
        
        // Return the processed results
        return {
            participant: participant,
            survey: surveyConfig,
            continuumScores: continuumScores,
            responses: responses
        };
    },

    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        if (!results || !results.continuumScores) {
            container.innerHTML = `
                <div class="results-error">
                    <h3>Results Error</h3>
                    <p>No valid results found to display.</p>
                </div>
            `;
            return;
        }

        // Get theme information from survey
        const theme = results.survey.theme || { title: 'Survey Results' };
        
        // Start building the HTML
        let html = `
            <div class="results-summary">
                <h2>${theme.title || 'Survey Results'}</h2>
        `;
        
        // Display each continuum result
        const continua = results.survey.continua || {};
        Object.keys(results.continuumScores).forEach(continuumKey => {
            const continuum = continua[continuumKey] || { name: continuumKey };
            const score = results.continuumScores[continuumKey];
            
            // Format the average score to 1 decimal place
            const formattedAverage = score.average.toFixed(1);
            
            // Convert the average to a percentage position on the continuum (from -2 to +2, where -2 = 0% and +2 = 100%)
            const percentPosition = ((score.average + 2) / 4) * 100;
            
            html += `
                <div class="continuum-result">
                    <h3>${continuum.name}</h3>
                    <div class="continuum-scale">
                        <div class="continuum-left">${continuum.labels?.left || 'Left'}</div>
                        <div class="continuum-right">${continuum.labels?.right || 'Right'}</div>
                        <div class="continuum-marker" style="left: ${percentPosition}%"></div>
                    </div>
                    <div class="continuum-score">Score: ${formattedAverage}</div>
                    <div class="continuum-stats">
                        Responses: ${score.totalResponses} | "Don't understand": ${score.dontUnderstandCount}
                    </div>
                </div>
            `;
        });
        
        // Close the container div
        html += `
            </div>
            <div class="results-actions">
                <button id="take-another-survey">Take Another Survey</button>
                <button id="logout">Logout</button>
            </div>
        `;
        
        // Set the HTML to the container
        container.innerHTML = html;
        
        // Add event listeners to buttons
        const takeAnotherButton = document.getElementById('take-another-survey');
        const logoutButton = document.getElementById('logout');
        
        if (takeAnotherButton) {
            takeAnotherButton.addEventListener('click', () => {
                window.location.href = '/survey-code.html';
            });
        }
        
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    window.location.href = '/';
                } catch (error) {
                    console.error('Error signing out:', error);
                    alert('Error signing out. Please try again.');
                }
            });
        }
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