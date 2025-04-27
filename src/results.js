import { supabase } from './client.js';

// Helper function to create HTML for a continuum element
function createContinuumElement(continuum, score, cohortAverage = null) {
    const percentPosition = ((score.average + 2) / 4) * 100;
    const cohortPercentPosition = cohortAverage ? ((cohortAverage + 2) / 4) * 100 : null;
    
    const leftLabel = continuum.labels?.left || 'Left';
    const rightLabel = continuum.labels?.right || 'Right';
    
    return `
        <div class="continuum-result">
            <h3>${continuum.name}</h3>
            <div class="continuum-scale">
                <div class="continuum-left">${leftLabel}</div>
                <div class="continuum-right">${rightLabel}</div>
                <div class="continuum-marker" style="left: ${percentPosition}%"></div>
            </div>
            <div class="text-center">
                <button class="learn-more-btn" data-continuum="${continuum.key || ''}">Learn more</button>
            </div>
        </div>
    `;
}

// Results module
export const results = {
    async init() {
        console.log('Results module initialized');
        await this.loadResults();
    },

    async loadResults() {
        try {
            // Check for participant_id in URL params first
            const urlParams = new URLSearchParams(window.location.search);
            let participantId = urlParams.get('participant_id');
            
            // If not in URL, try localStorage
            if (!participantId) {
                participantId = localStorage.getItem('futurelens_participant_id');
            }
            
            // If still not found, check legacy key
            if (!participantId) {
                participantId = localStorage.getItem('participant_id');
                
                // If found in legacy key, migrate to standardized key
                if (participantId) {
                    localStorage.setItem('futurelens_participant_id', participantId);
                }
            }
            
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
                <div class="continuum-grid">
        `;
        
        // Display each continuum result
        const continua = results.survey.continua || {};
        Object.keys(results.continuumScores).forEach(continuumKey => {
            const continuum = continua[continuumKey] || { name: continuumKey };
            continuum.key = continuumKey; // Add the key for data-continuum attribute
            const score = results.continuumScores[continuumKey];
            
            html += createContinuumElement(continuum, score);
        });
        
        // Close the continuum grid
        html += `
                </div>
        `;
        
        // Add Group Comparison Placeholder
        html += `
            <div class="group-comparison">
                <h3>Compare with My Group</h3>
                <div class="coming-soon-placeholder">
                    <p>Coming soon! You'll be able to compare your results with others in your cohort.</p>
                </div>
            </div>
        `;
        
        // Close the container div
        html += `
            </div>
            <div class="results-actions">
                <button id="take-another-survey">Take Another Survey</button>
                <button id="view-other-results">View Other Results</button>
                <button id="logout">Logout</button>
            </div>
        `;
        
        // Set the HTML to the container
        container.innerHTML = html;
        
        // Add event listeners to buttons
        const takeAnotherButton = document.getElementById('take-another-survey');
        const viewOtherResultsButton = document.getElementById('view-other-results');
        const logoutButton = document.getElementById('logout');
        const learnMoreButtons = document.querySelectorAll('.learn-more-btn');
        
        if (takeAnotherButton) {
            takeAnotherButton.addEventListener('click', () => {
                window.location.href = '/survey-code.html';
            });
        }
        
        if (viewOtherResultsButton) {
            viewOtherResultsButton.addEventListener('click', async () => {
                try {
                    // Get the current user session
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && session.user) {
                        // Call checkCompletedSurveys to show the selection screen
                        // We need to dynamically import auth to avoid circular dependencies
                        const authModule = await import('./auth.js');
                        authModule.auth.checkCompletedSurveys(session.user.id);
                    } else {
                        window.location.href = '/';
                    }
                } catch (error) {
                    console.error('Error fetching session:', error);
                    alert('Error accessing your survey results. Please log in again.');
                    window.location.href = '/';
                }
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

        // Add event listeners to all "Learn more" buttons
        learnMoreButtons.forEach(button => {
            button.addEventListener('click', () => {
                const continuumKey = button.getAttribute('data-continuum');
                this.showContinuumDetails(continuumKey, results);
            });
        });
    },

    showContinuumDetails(continuumKey, results) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        const continuum = results.survey.continua[continuumKey] || { name: continuumKey };
        const score = results.continuumScores[continuumKey];
        const percentPosition = ((score.average + 2) / 4) * 100;
        
        // Generate perspective statement based on the score
        let perspectiveStatement = "";
        const leftLabel = continuum.labels?.left || 'Left';
        const rightLabel = continuum.labels?.right || 'Right';
        const avg = score.average;
        
        // Check if we have theme result messages in the survey config
        const resultMessages = results.survey.theme?.resultMessages;
        
        if (resultMessages) {
            // First handle strong left lean (avg <= -1)
            if (avg <= -1) {
                // Strong left lean
                perspectiveStatement = resultMessages.negative
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> ${perspectiveStatement}`;
            } else if (avg < -0.5) {
                // Moderate left lean (-1 < avg < -0.5)
                perspectiveStatement = resultMessages.negative
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> ${perspectiveStatement}`;
            } else if (avg < 0) {
                // Slight left lean (-0.5 <= avg < 0)
                perspectiveStatement = resultMessages.negative
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>slightly</strong> ${perspectiveStatement}`;
            } else if (avg === 0) {
                // Neutral
                perspectiveStatement = resultMessages.neutral
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you have a <strong>balanced</strong> perspective. ${perspectiveStatement}`;
            } else if (avg <= 0.5) {
                // Slight right lean (0 < avg <= 0.5)
                perspectiveStatement = resultMessages.positive
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>slightly</strong> ${perspectiveStatement}`;
            } else if (avg <= 1) {
                // Moderate right lean (0.5 < avg <= 1)
                perspectiveStatement = resultMessages.positive
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> ${perspectiveStatement}`;
            } else {
                // Strong right lean (avg > 1)
                perspectiveStatement = resultMessages.positive
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> ${perspectiveStatement}`;
            }
        } else {
            // Fallback if no result messages in theme
            if (avg <= -1) {
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> favor ${leftLabel} over ${rightLabel}`;
            } else if (avg < -0.5) {
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> favor ${leftLabel} over ${rightLabel}`;
            } else if (avg < 0) {
                perspectiveStatement = `Your responses suggest you <strong>slightly</strong> favor ${leftLabel} over ${rightLabel}`;
            } else if (avg === 0) {
                perspectiveStatement = `Your responses suggest you have a <strong>balanced</strong> perspective between ${leftLabel} and ${rightLabel}`;
            } else if (avg <= 0.5) {
                perspectiveStatement = `Your responses suggest you <strong>slightly</strong> favor ${rightLabel} over ${leftLabel}`;
            } else if (avg <= 1) {
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> favor ${rightLabel} over ${leftLabel}`;
            } else {
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> favor ${rightLabel} over ${leftLabel}`;
            }
        }
        
        // Get all statements for this continuum
        const continuumStatements = results.survey.statements.filter(statement => 
            statement.continuum === continuumKey
        );
        
        // Find responses for these statements
        const statementResponses = continuumStatements.map(statement => {
            const response = results.responses.find(r => r.question_key === statement.id);
            return {
                statement,
                response: response || {}
            };
        });
        
        // Categorize responses
        const supportingResponses = [];
        const contradictingResponses = [];
        
        statementResponses.forEach(item => {
            if (!item.response || !item.response.likert_value) {
                return; // Skip items without valid responses
            }
            
            // Determine if the response supports or contradicts the overall perspective
            const alignment = item.statement.alignment || 'neutral';
            const likertValue = item.response.likert_value;
            
            // If they selected "don't understand", mark it
            if (item.response.dont_understand) {
                item.dontUnderstand = true;
            }
            
            // Calculate if response supports the statement's alignment
            const isSupporting = 
                (alignment === 'right' && likertValue > 0) || 
                (alignment === 'left' && likertValue < 0);
            
            if (isSupporting) {
                supportingResponses.push(item);
            } else {
                contradictingResponses.push(item);
            }
        });
        
        // Build the detailed view HTML
        let detailsHtml = `
            <div class="continuum-details">
                <button id="back-to-results-top" class="back-button-top">← Back</button>
                <h2>Your responses to: ${continuum.name}</h2>
                
                <div class="continuum-scale detail-scale">
                    <div class="continuum-left">${leftLabel}</div>
                    <div class="continuum-right">${rightLabel}</div>
                    <div class="continuum-marker" style="left: ${percentPosition}%"></div>
                </div>
                
                <div class="perspective-statement">
                    <p>${perspectiveStatement}</p>
                </div>
        `;
        
        // Show supporting and contradicting responses
        if (supportingResponses.length > 0) {
            detailsHtml += `
                <div class="statement-responses supporting-responses">
                    <h3>Responses that support your perspective:</h3>
            `;
            
            supportingResponses.forEach(item => {
                let likertText = "";
                switch(item.response.likert_value) {
                    case 2: likertText = "Strongly Agree"; break;
                    case 1: likertText = "Agree"; break;
                    case -1: likertText = "Disagree"; break;
                    case -2: likertText = "Strongly Disagree"; break;
                    default: likertText = "No response";
                }
                
                let responseText = `You selected: ${likertText}`;
                if (item.dontUnderstand) {
                    responseText += ` <span class="dont-understand-note">(You indicated you didn't understand this statement)</span>`;
                }
                
                detailsHtml += `
                    <div class="statement-response supporting ${item.dontUnderstand ? 'with-dont-understand' : ''}">
                        <p class="response-value">${responseText}</p>
                        <p class="statement-text">${item.statement.text}</p>
                    </div>
                `;
            });
            
            detailsHtml += `</div>`;
        }
        
        if (contradictingResponses.length > 0) {
            detailsHtml += `
                <div class="statement-responses contradicting-responses">
                    <h3>Responses that contradict your perspective:</h3>
            `;
            
            contradictingResponses.forEach(item => {
                let likertText = "";
                switch(item.response.likert_value) {
                    case 2: likertText = "Strongly Agree"; break;
                    case 1: likertText = "Agree"; break;
                    case -1: likertText = "Disagree"; break;
                    case -2: likertText = "Strongly Disagree"; break;
                    default: likertText = "No response";
                }
                
                let responseText = `You selected: ${likertText}`;
                if (item.dontUnderstand) {
                    responseText += ` <span class="dont-understand-note">(You indicated you didn't understand this statement)</span>`;
                }
                
                detailsHtml += `
                    <div class="statement-response contradicting ${item.dontUnderstand ? 'with-dont-understand' : ''}">
                        <p class="response-value">${responseText}</p>
                        <p class="statement-text">${item.statement.text}</p>
                    </div>
                `;
            });
            
            detailsHtml += `</div>`;
        }
        
        // Close the HTML
        detailsHtml += `
                </div>
                <div class="back-button-container">
                    <button id="back-to-results" class="back-button">← Back to all results</button>
                </div>
            </div>
        `;
        
        // Set the HTML in the container
        container.innerHTML = detailsHtml;
        
        // Add event listeners to back buttons
        const backButton = document.getElementById('back-to-results');
        const backButtonTop = document.getElementById('back-to-results-top');
        
        const handleBackClick = () => {
            // First, reset the scroll position to ensure we start from the top
            window.scrollTo(0, 0);
            
            // Then display the results
            this.displayResults(results);
            
            // After a short delay to ensure the DOM is updated, scroll to top again 
            // using both modern and legacy methods for maximum compatibility
            setTimeout(() => {
                window.scrollTo(0, 0);
                window.scrollTo({ top: 0, behavior: 'auto' });
                
                // For older browsers and iOS
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
            }, 10);
        };
        
        if (backButton) {
            backButton.addEventListener('click', handleBackClick);
        }
        
        if (backButtonTop) {
            backButtonTop.addEventListener('click', handleBackClick);
        }
    }
};

// Initialize results module when DOM is loaded - but only if we're on the results page
const isResultsPage = typeof window !== 'undefined' && 
    window.location && 
    window.location.pathname && 
    window.location.pathname.includes('results.html');

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