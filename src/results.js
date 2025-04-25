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
                <div class="continuum-grid">
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
                    <div style="text-align: center;">
                        <button class="learn-more-btn" data-continuum="${continuumKey}">Learn more</button>
                    </div>
                </div>
            `;
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
                <button id="logout">Logout</button>
            </div>
        `;
        
        // Set the HTML to the container
        container.innerHTML = html;
        
        // Add event listeners to buttons
        const takeAnotherButton = document.getElementById('take-another-survey');
        const logoutButton = document.getElementById('logout');
        const learnMoreButtons = document.querySelectorAll('.learn-more-btn');
        
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
            if (avg <= -1) {
                // Strong left lean
                perspectiveStatement = resultMessages.negative
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> ${perspectiveStatement}`;
            } else if (avg < 0) {
                // Slight left lean
                perspectiveStatement = resultMessages.negative
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> ${perspectiveStatement}`;
            } else if (avg === 0) {
                // Neutral
                perspectiveStatement = resultMessages.neutral
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you have a <strong>neutral</strong> perspective. ${perspectiveStatement}`;
            } else if (avg <= 1) {
                // Slight right lean
                perspectiveStatement = resultMessages.positive
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> ${perspectiveStatement}`;
            } else {
                // Strong right lean
                perspectiveStatement = resultMessages.positive
                    .replace('{left_label}', leftLabel)
                    .replace('{right_label}', rightLabel);
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> ${perspectiveStatement}`;
            }
        } else {
            // Fallback if no result messages in theme
            if (avg <= -1) {
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> support ${leftLabel} over ${rightLabel}`;
            } else if (avg < 0) {
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> support ${leftLabel} over ${rightLabel}`;
            } else if (avg === 0) {
                perspectiveStatement = `Your responses suggest you have a <strong>neutral</strong> perspective that supports neither ${leftLabel} nor ${rightLabel}`;
            } else if (avg <= 1) {
                perspectiveStatement = `Your responses suggest you <strong>moderately</strong> support ${rightLabel} over ${leftLabel}`;
            } else {
                perspectiveStatement = `Your responses suggest you <strong>strongly</strong> support ${rightLabel} over ${leftLabel}`;
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
                response
            };
        });
        
        // Categorize responses
        const supportingResponses = [];
        const contradictingResponses = [];
        
        statementResponses.forEach(item => {
            if (!item.response) {
                return; // Skip items without responses
            }
            
            // Determine if the response supports or contradicts the overall perspective
            const alignment = item.statement.alignment || 'neutral';
            const likertValue = item.response.likert_value;
            
            // If they selected "don't understand", we'll still categorize based on other responses
            // but mark it specially later
            if (item.response.dont_understand) {
                // We'll mark this in the display
                item.dontUnderstand = true;
                
                // We still want to categorize it, so if there's no likert value, put it in a default category
                if (likertValue === null || likertValue === undefined) {
                    contradictingResponses.push(item); // Default placement if only "don't understand" selected
                    return;
                }
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

        // Build the HTML for the detailed view with side-by-side layout
        let detailsHtml = `
            <div class="continuum-details">
                <button id="back-to-results-top" class="back-button-top">← Back</button>
                <h2>Your responses to: ${continuum.name}</h2>
                
                <div class="continuum-scale detail-scale">
                    <div class="continuum-left">${continuum.labels?.left || 'Left'}</div>
                    <div class="continuum-right">${continuum.labels?.right || 'Right'}</div>
                    <div class="continuum-marker" style="left: ${percentPosition}%"></div>
                </div>
                
                <div class="perspective-statement">
                    <p>${perspectiveStatement}</p>
                </div>
        `;
        
        // Check if there are both supporting and contradicting responses
        const hasBothTypes = supportingResponses.length > 0 && contradictingResponses.length > 0;
        
        if (hasBothTypes) {
            // Side-by-side layout
            detailsHtml += `
                <div class="responses-container">
                    <div class="responses-column supporting-responses">
                        <h3>Responses that support your perspective:</h3>
                        <div class="responses-list">
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
                    responseText += `. <span class="dont-understand-note">However, you also said you didn't understand this statement.</span>`;
                }
                
                detailsHtml += `
                    <div class="statement-response supporting ${item.dontUnderstand ? 'with-dont-understand' : ''}">
                        <p class="response-value">${responseText}</p>
                        <p class="statement-text">${item.statement.text}</p>
                    </div>
                `;
            });
            
            detailsHtml += `
                        </div>
                    </div>
                    
                    <div class="responses-column contradicting-responses">
                        <h3>Responses that contradict your perspective:</h3>
                        <div class="responses-list">
            `;
            
            contradictingResponses.forEach(item => {
                let likertText = "";
                if (item.response.likert_value !== null && item.response.likert_value !== undefined) {
                    switch(item.response.likert_value) {
                        case 2: likertText = "Strongly Agree"; break;
                        case 1: likertText = "Agree"; break;
                        case -1: likertText = "Disagree"; break;
                        case -2: likertText = "Strongly Disagree"; break;
                        default: likertText = "No response";
                    }
                } else if (item.dontUnderstand) {
                    likertText = "No selection";
                }
                
                let responseText = `You selected: ${likertText}`;
                if (item.dontUnderstand) {
                    if (item.response.likert_value !== null && item.response.likert_value !== undefined) {
                        responseText += `. <span class="dont-understand-note">However, you also said you didn't understand this statement.</span>`;
                    } else {
                        responseText = `You selected: <span class="dont-understand-note">I don't understand this statement.</span>`;
                    }
                }
                
                detailsHtml += `
                    <div class="statement-response contradicting ${item.dontUnderstand ? 'with-dont-understand' : ''}">
                        <p class="response-value">${responseText}</p>
                        <p class="statement-text">${item.statement.text}</p>
                    </div>
                `;
            });
            
            detailsHtml += `
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Single column layout when there's only one type of response
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
                        responseText += `. <span class="dont-understand-note">However, you also said you didn't understand this statement.</span>`;
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
                    if (item.response.likert_value !== null && item.response.likert_value !== undefined) {
                        switch(item.response.likert_value) {
                            case 2: likertText = "Strongly Agree"; break;
                            case 1: likertText = "Agree"; break;
                            case -1: likertText = "Disagree"; break;
                            case -2: likertText = "Strongly Disagree"; break;
                            default: likertText = "No response";
                        }
                    } else if (item.dontUnderstand) {
                        likertText = "No selection";
                    }
                    
                    let responseText = `You selected: ${likertText}`;
                    if (item.dontUnderstand) {
                        if (item.response.likert_value !== null && item.response.likert_value !== undefined) {
                            responseText += `. <span class="dont-understand-note">However, you also said you didn't understand this statement.</span>`;
                        } else {
                            responseText = `You selected: <span class="dont-understand-note">I don't understand this statement.</span>`;
                        }
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
        }
        
        // Close the HTML
        detailsHtml += `
                </div>
                <div class="back-button-container">
                    <button id="back-to-results" class="back-button">← Back to all results</button>
                </div>
            </div>
        `;
        
        // Set the container HTML
        container.innerHTML = detailsHtml;
        
        // Add back button event listeners
        const backButton = document.getElementById('back-to-results');
        const backButtonTop = document.getElementById('back-to-results-top');
        
        const handleBackClick = () => {
            this.displayResults(results);
            // After returning to results view, scroll to the top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
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