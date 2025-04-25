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
                // Store user ID in localStorage
                localStorage.setItem('participant_id', data.user.id);
                
                // Check if user has completed surveys
                await this.checkCompletedSurveys(data.user.id);
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
    },

    async checkCompletedSurveys(userId) {
        try {
            console.log('Checking for completed surveys for user:', userId);
            
            // Query the participants table for the user's surveys
            const { data: participants, error: participantsError } = await supabase
                .from('participants')
                .select('id, survey_id, cohort_id, inserted_at')
                .eq('user_id', userId);

            if (participantsError) {
                console.error('Error fetching completed surveys:', participantsError.message);
                // If there's an error, continue to the survey code page
                window.location.href = '/survey-code.html';
                return;
            }

            console.log('Found participant records:', participants?.length || 0);
            
            if (!participants || participants.length === 0) {
                console.log('No participant records found, redirecting to survey code page');
                // No completed surveys, proceed to survey code input
                window.location.href = '/survey-code.html';
                return;
            }

            // For each participant, get the associated survey details
            const surveyPromises = participants.map(async participant => {
                console.log('Processing participant:', participant.id, 'for survey:', participant.survey_id);
                
                // Get the survey details
                const { data: survey, error: surveyError } = await supabase
                    .from('surveys')
                    .select('id, json_config')
                    .eq('id', participant.survey_id)
                    .single();

                if (surveyError) {
                    console.error(`Error fetching survey ${participant.survey_id}:`, surveyError.message);
                    return null;
                }

                // Check if the survey has responses for all required questions
                const { data: responses, error: responsesError } = await supabase
                    .from('responses')
                    .select('id, question_key')
                    .eq('participant_id', participant.id);

                if (responsesError) {
                    console.error(`Error fetching responses for participant ${participant.id}:`, responsesError.message);
                    return null;
                }

                console.log(`Found ${responses?.length || 0} responses for participant ${participant.id}`);
                
                // Check if this is a completed survey
                const surveyConfig = survey.json_config;
                const statements = surveyConfig.statements || [];
                const requiredStatements = statements.filter(s => s.required !== false);
                
                console.log(`Survey ${participant.survey_id} has ${requiredStatements.length} required statements`);
                
                // A survey is complete if responses exist for all required questions
                const respondedQuestionKeys = responses.map(r => r.question_key);
                console.log('Responded question keys:', respondedQuestionKeys);
                console.log('Required question keys:', requiredStatements.map(s => s.id));
                
                // A survey is considered complete if:
                // 1. There are responses, and
                // 2. Every required question has a response OR there are at least as many responses as required questions
                let isComplete = false;
                
                if (responses && responses.length > 0) {
                    if (requiredStatements.length > 0) {
                        // Either check that all required questions are answered
                        const allRequiredAnswered = requiredStatements.every(s => 
                            respondedQuestionKeys.includes(s.id)
                        );
                        
                        // Or that there are at least as many responses as required questions
                        // (this is a fallback in case question IDs don't match exactly)
                        const enoughResponses = responses.length >= requiredStatements.length;
                        
                        isComplete = allRequiredAnswered || enoughResponses;
                    } else {
                        // If no required questions, as long as there are responses, it's complete
                        isComplete = true;
                    }
                }
                
                console.log('Is survey complete?', isComplete);

                if (isComplete) {
                    return {
                        participant_id: participant.id,
                        survey_id: participant.survey_id,
                        inserted_at: participant.inserted_at,
                        title: surveyConfig.theme?.title || `Survey ${participant.survey_id}`,
                        isComplete
                    };
                }
                
                return null;
            });

            // Wait for all promises to resolve
            const completedSurveys = (await Promise.all(surveyPromises))
                .filter(survey => survey !== null && survey.isComplete)
                .sort((a, b) => new Date(b.inserted_at) - new Date(a.inserted_at)); // Sort by date descending

            console.log('Found completed surveys:', completedSurveys.length);
            
            if (completedSurveys.length === 0) {
                console.log('No completed surveys found, redirecting to survey code page');
                // No completed surveys, proceed to survey code input
                window.location.href = '/survey-code.html';
                return;
            }

            if (completedSurveys.length === 1) {
                console.log('One completed survey found, redirecting to results page');
                // Only one completed survey, redirect directly to results
                const participantId = completedSurveys[0].participant_id;
                localStorage.setItem('futurelens_participant_id', participantId);
                window.location.href = `/results.html?participant_id=${participantId}`;
                return;
            }

            console.log('Multiple completed surveys found, showing selection screen');
            // Multiple completed surveys, show selection screen
            this.displaySurveySelection(completedSurveys);
        } catch (error) {
            console.error('Error checking completed surveys:', error);
            // If any error occurs, proceed to survey code input
            window.location.href = '/survey-code.html';
        }
    },
    
    displaySurveySelection(completedSurveys) {
        // Get the root container
        const container = document.getElementById('root');
        if (!container) {
            window.location.href = '/survey-code.html';
            return;
        }

        // Create the survey selection HTML
        let html = `
            <div class="auth-container survey-selection-container">
                <h1>Your Completed Surveys</h1>
                <p>You have completed the following surveys. Choose one to view your results or take a new survey.</p>
                
                <div class="completed-surveys-list">
        `;

        // Add each completed survey to the list
        completedSurveys.forEach(survey => {
            const date = new Date(survey.inserted_at).toLocaleDateString();
            html += `
                <div class="completed-survey-item">
                    <div class="survey-info">
                        <h3>${survey.title}</h3>
                        <p>Completed on ${date}</p>
                    </div>
                    <button class="view-results-btn" data-participant-id="${survey.participant_id}">View Results</button>
                </div>
            `;
        });

        // Add button to take a new survey
        html += `
                </div>
                <div class="survey-selection-actions">
                    <button id="take-new-survey-btn" class="primary-btn">Take A New Survey</button>
                </div>
            </div>
        `;

        // Set the HTML
        container.innerHTML = html;

        // Add event listeners to buttons
        document.querySelectorAll('.view-results-btn').forEach(button => {
            button.addEventListener('click', () => {
                const participantId = button.getAttribute('data-participant-id');
                localStorage.setItem('futurelens_participant_id', participantId);
                window.location.href = `/results.html?participant_id=${participantId}`;
            });
        });

        // Add event listener to the "Take A New Survey" button
        const takeNewSurveyBtn = document.getElementById('take-new-survey-btn');
        if (takeNewSurveyBtn) {
            takeNewSurveyBtn.addEventListener('click', () => {
                window.location.href = '/survey-code.html';
            });
        }
    }
};

// Initialize auth module when DOM is loaded - but only if we're on the auth or survey code page
const isAuthPage = !window.location.pathname.includes('survey.html') && 
                   !window.location.pathname.includes('results.html');
const isSurveyCodePage = window.location.pathname.includes('survey-code.html');
const isDebugPage = window.location.pathname.includes('debug-participants.html');

if (isAuthPage || isSurveyCodePage || isDebugPage) {
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