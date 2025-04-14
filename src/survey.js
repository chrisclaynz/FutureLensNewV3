import { supabase } from './client.js';

export function createSurvey(dependencies = {}) {
    const {
        supabase: supabaseClient = supabase,
        storage = localStorage,
        window: win = window
    } = dependencies;

    let currentQuestionIndex = 0;
    let questions = [];
    let questionOrder = [];
    let participantId = null;
    let surveyData = null;

    async function fetchSurvey(surveyId = null) {
        try {
            console.log('Fetching survey from database...');
            
            // Try to fetch specific survey if ID is provided
            if (surveyId) {
                const { data: survey, error: specificError } = await supabaseClient
                    .from('surveys')
                    .select('id, json_config')
                    .eq('id', surveyId)
                    .single();
                    
                if (specificError) {
                    console.error('Error fetching specific survey:', specificError);
                    // Continue to fetch the latest survey instead
                } else if (survey) {
                    console.log('Found specific survey in database:', survey.id);
                    return survey.json_config;
                }
            }
            
            // If specific survey not found or ID not provided, get the latest survey
            const { data: surveys, error: listError } = await supabaseClient
                .from('surveys')
                .select('id, json_config')
                .order('inserted_at', { ascending: false })
                .limit(1);
                
            if (listError) {
                console.error('Error fetching surveys:', listError);
                throw new Error('Unable to fetch survey from database. Please try again later.');
            }
            
            // If we found a survey, use it
            if (surveys && surveys.length > 0) {
                console.log('Found survey in database:', surveys[0].id);
                return surveys[0].json_config;
            }
            
            // If no surveys found, show an error message
            throw new Error('No surveys found in the database. Please contact the administrator.');
        } catch (error) {
            console.error('Error fetching survey:', error);
            
            // Return a minimal error survey structure
            return {
                theme: {
                    title: "Survey Error",
                    instructions: "There was a problem loading the survey."
                },
                statements: [
                    {
                        id: "error_1",
                        text: error.message || "Unable to load survey. Please try again later or contact support.",
                        alignment: "left",
                        continuum: "error",
                        hasDontUnderstand: true
                    }
                ]
            };
        }
    }

    function initSurvey(surveyJson) {
        // Store the full survey data
        surveyData = surveyJson;
        
        // Extract all statements/questions from the JSON
        questions = surveyJson.statements || [];
        
        // Randomly shuffle the questions if needed
        questions = shuffleArray([...questions]);
        
        // Create an ordered array of question indices
        questionOrder = questions.map((_, index) => index);
        
        // Store the question order in localStorage
        storage.setItem('questionOrder', JSON.stringify(questionOrder));
        
        // Reset to the first question
        currentQuestionIndex = 0;
        
        // Store the full survey in localStorage for reference
        storage.setItem('currentSurvey', JSON.stringify(surveyJson));
        
        return questions;
    }

    function shuffleArray(array) {
        // Fisher-Yates shuffle algorithm
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function displayNextQuestion() {
        // Get the saved question order
        const savedOrder = storage.getItem('questionOrder');
        if (savedOrder) {
            questionOrder = JSON.parse(savedOrder);
        }
        
        // Check if we have reached the end of the survey
        if (currentQuestionIndex >= questions.length) {
            showCompletionScreen();
            return;
        }
        
        // Get the current question
        const question = questions[currentQuestionIndex];
        
        if (!question) {
            console.error('Question not found');
            return;
        }
        
        // Update the UI
        const questionElement = win.document.getElementById('question');
        const questionTextElement = win.document.getElementById('questionText');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');
        const nextButton = win.document.getElementById('nextButton');
        
        if (questionElement) {
            questionElement.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
        }
        
        if (questionTextElement) {
            questionTextElement.textContent = question.text;
        }
        
        // Reset form elements
        if (likertScale) {
            likertScale.querySelectorAll('input').forEach(input => {
                input.checked = false;
            });
        }
        
        if (dontUnderstand) {
            dontUnderstand.checked = false;
        }
        
        if (nextButton) {
            nextButton.disabled = true;
        }
        
        // Optionally load any previously stored answer for this question
        loadSavedAnswer(question.id);
        
        // Set up clickable Likert options
        setupLikertOptionClicks();
    }

    function setupLikertOptionClicks() {
        const likertOptions = win.document.querySelectorAll('.likert-option');
        
        likertOptions.forEach(option => {
            // Remove existing event listeners to prevent duplicates
            option.replaceWith(option.cloneNode(true));
            
            // Get the fresh element after cloning
            const freshOption = win.document.getElementById(option.querySelector('input').id).parentNode;
            
            freshOption.addEventListener('click', function(e) {
                // Don't trigger if clicking directly on the radio input
                if (e.target.type !== 'radio') {
                    const radio = this.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                        // Trigger change event to update Next button state
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    function loadSavedAnswer(questionId) {
        const savedAnswers = storage.getItem('surveyAnswers');
        if (!savedAnswers) return;
        
        const answers = JSON.parse(savedAnswers);
        const answer = answers.find(a => a.question_key === questionId);
        
        if (!answer) return;
        
        // Restore the saved answer
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');
        const nextButton = win.document.getElementById('nextButton');
        
        // Only enable the Next button if there's a Likert value saved
        if (answer.likert_value !== null && likertScale) {
            const value = answer.likert_value.toString();
            const input = likertScale.querySelector(`input[value="${value}"]`);
            if (input) {
                input.checked = true;
                // Enable Next button since we have a Likert selection
                if (nextButton) nextButton.disabled = false;
            }
        }
        
        if (dontUnderstand) {
            dontUnderstand.checked = answer.dont_understand || false;
        }
        
        // No need to call updateNextButtonState() here since we're handling button state directly
    }

    function recordAnswer(questionId, likertValue, dontUnderstand) {
        // Get existing answers from localStorage
        let answers = [];
        const savedAnswers = storage.getItem('surveyAnswers');
        
        if (savedAnswers) {
            answers = JSON.parse(savedAnswers);
            
            // Remove any existing answer for this question
            answers = answers.filter(a => a.question_key !== questionId);
        }
        
        // Add the new answer
        answers.push({
            question_key: questionId,
            likert_value: likertValue,
            dont_understand: dontUnderstand
        });
        
        // Save to localStorage
        storage.setItem('surveyAnswers', JSON.stringify(answers));
        
        // Also save the current question index
        storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
        
        return answers;
    }

    async function saveCurrentAnswer() {
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');
        
        if (!questions[currentQuestionIndex]) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        const likertValue = likertScale ? parseInt(likertScale.querySelector('input:checked')?.value) : null;
        const dontUnderstandValue = dontUnderstand ? dontUnderstand.checked : false;
        
        recordAnswer(currentQuestion.id, likertValue, dontUnderstandValue);
    }

    function showCompletionScreen() {
        const surveyContent = win.document.getElementById('survey-content');
        if (surveyContent) {
            surveyContent.innerHTML = `
                <div class="completion-screen">
                    <h2>Survey Completed</h2>
                    <p>Thank you for completing the survey!</p>
                    <button id="submitSurveyButton" class="primary-button">Submit Answers</button>
                </div>
            `;
            
            const submitButton = win.document.getElementById('submitSurveyButton');
            if (submitButton) {
                submitButton.addEventListener('click', finalSubmission);
            }
        }
    }

    async function finalSubmission() {
        try {
            // First check for internet connection
            if (!navigator.onLine) {
                win.alert('No internet connection. Please reconnect and try again.');
                return;
            }
            
            // Get all stored answers
            const savedAnswers = storage.getItem('surveyAnswers');
            if (!savedAnswers) {
                win.alert('No answers found to submit.');
                return;
            }
            
            const answers = JSON.parse(savedAnswers);
            
            // Get user ID from storage
            const userId = storage.getItem('participant_id');
            if (!userId) {
                win.alert('No user ID found. Please log in again.');
                win.location.href = '/';
                return;
            }
            
            // Get survey ID from current survey, or fetch the latest survey ID
            let surveyId = null;
            if (surveyData && surveyData.id) {
                surveyId = surveyData.id;
            } else {
                // Look up the latest survey
                const { data: surveys, error: surveyError } = await supabaseClient
                    .from('surveys')
                    .select('id')
                    .order('inserted_at', { ascending: false })
                    .limit(1);
                    
                if (surveyError) {
                    console.error('Error fetching survey:', surveyError);
                    win.alert('Error identifying survey. Please try again.');
                    return;
                }
                
                if (surveys && surveys.length > 0) {
                    surveyId = surveys[0].id;
                } else {
                    console.error('No surveys found in database');
                    win.alert('No surveys found in database. Please contact the administrator.');
                    return;
                }
            }
            
            // Check if participant record exists, create if it doesn't
            let participantId = storage.getItem('futurelens_participant_id');
            
            if (!participantId) {
                // Create a new participant record
                const { data: participantData, error: participantError } = await supabaseClient
                    .from('participants')
                    .insert({
                        user_id: userId,
                        survey_id: surveyId
                    })
                    .select('id')
                    .single();
                    
                if (participantError) {
                    console.error('Error creating participant record:', participantError);
                    win.alert('Error submitting survey. Please try again.');
                    return;
                }
                
                participantId = participantData.id;
                storage.setItem('futurelens_participant_id', participantId);
            }
            
            // Submit all answers to Supabase in one batch operation
            const promises = answers.map(answer => {
                return supabaseClient
                    .from('responses')
                    .insert({
                        participant_id: participantId,
                        question_key: answer.question_key,
                        likert_value: answer.likert_value,
                        dont_understand: answer.dont_understand
                    });
            });
            
            const results = await Promise.all(promises);
            
            // Check for errors
            const errors = results.filter(result => result.error);
            if (errors.length > 0) {
                console.error('Errors submitting responses:', errors);
                win.alert(`Some responses failed to submit (${errors.length}/${results.length}). Please try again.`);
                return;
            }
            
            // Clear local storage of survey data
            storage.removeItem('surveyAnswers');
            storage.removeItem('questionOrder');
            storage.removeItem('currentQuestionIndex');
            storage.removeItem('currentSurvey');
            
            // Show success message
            win.alert('Survey submitted successfully!');
            
            // Redirect to results page
            win.location.href = '/results.html';
        } catch (error) {
            console.error('Error submitting survey:', error);
            win.alert('Error submitting survey. Please try again.');
        }
    }

    function setupEventListeners() {
        const nextButton = win.document.getElementById('nextButton');
        const prevButton = win.document.getElementById('prevButton');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

        if (nextButton) {
            nextButton.addEventListener('click', handleNext);
        }
        if (prevButton) {
            prevButton.addEventListener('click', handlePrev);
        }
        if (likertScale) {
            likertScale.addEventListener('change', updateNextButtonState);
        }
        if (dontUnderstand) {
            dontUnderstand.addEventListener('change', updateNextButtonState);
        }
    }

    function updateNextButtonState() {
        const nextButton = win.document.getElementById('nextButton');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

        if (nextButton) {
            // User must select a Likert scale option to proceed
            const hasLikertAnswer = likertScale && likertScale.querySelector('input:checked');
            nextButton.disabled = !hasLikertAnswer;
        }
    }

    async function handleNext() {
        await saveCurrentAnswer();
        currentQuestionIndex++;
        storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
        displayNextQuestion();
    }

    async function handlePrev() {
        if (currentQuestionIndex > 0) {
            await saveCurrentAnswer();
            currentQuestionIndex--;
            storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
            displayNextQuestion();
        }
    }

    async function init() {
        console.log('Survey module initialized');
        
        // Get participant ID from storage
        participantId = storage.getItem('participant_id');
        if (!participantId) {
            console.error('No participant ID found');
            win.location.href = '/';
            return;
        }
        
        // Check if we have a saved survey in progress
        const savedIndex = storage.getItem('currentQuestionIndex');
        const savedSurvey = storage.getItem('currentSurvey');
        
        if (savedIndex && savedSurvey) {
            // Resume existing survey
            currentQuestionIndex = parseInt(savedIndex, 10);
            surveyData = JSON.parse(savedSurvey);
            questions = surveyData.statements || [];
        } else {
            // Start a new survey - load the prototype directly
            // In a real app, you would get the survey ID from the participant record
            surveyData = await fetchSurvey();
            initSurvey(surveyData);
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Display the first/current question
        displayNextQuestion();
    }

    return {
        init,
        fetchSurvey,
        initSurvey,
        displayNextQuestion,
        recordAnswer,
        showCompletionScreen,
        handleNext,
        handlePrev,
        finalSubmission
    };
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSurvey };
} 