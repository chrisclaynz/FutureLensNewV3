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
        
        console.log('Processing survey questions:', {
            totalQuestions: questions.length,
            requiredQuestions: questions.filter(q => q.required === true).length,
            optionalQuestions: questions.filter(q => q.required === false).length,
            unspecifiedQuestions: questions.filter(q => q.required === undefined).length
        });
        
        // Split questions into required and optional
        const requiredQuestions = questions.filter(q => q.required === true);
        const optionalQuestions = questions.filter(q => q.required === false || q.required === undefined);
        
        console.log('Required questions: ', requiredQuestions.length);
        console.log('Optional questions: ', optionalQuestions.length);
        
        // Randomly shuffle each group separately
        const shuffledRequired = shuffleArray([...requiredQuestions]);
        const shuffledOptional = shuffleArray([...optionalQuestions]);
        
        // Combine with required questions first, then optional
        questions = [...shuffledRequired, ...shuffledOptional];
        
        console.log('Final question order:');
        questions.forEach((q, index) => {
            console.log(`${index + 1}: ${q.id} - ${q.text} (${q.required ? 'Required' : 'Optional'})`);
        });
        
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
            console.log('Reached end of survey, showing completion screen');
            showCompletionScreen();
            return;
        }
        
        // Get the current question
        const question = questions[currentQuestionIndex];
        
        if (!question) {
            console.error('Question not found');
            return;
        }
        
        // Better detection of the transition from required to optional questions
        const isFirstOptionalQuestion = question.required === false && checkAllRequiredQuestionsAnswered();
        const hasRequiredQuestions = questions.some(q => q.required === true);
        
        // Debug logs to understand the current state
        console.log('Current question:', {
            index: currentQuestionIndex,
            id: question.id,
            text: question.text.substring(0, 30) + '...',
            required: question.required
        });
        
        console.log('Question state:', {
            isFirstOptionalQuestion,
            hasRequiredQuestions,
            allRequiredAnswered: checkAllRequiredQuestionsAnswered()
        });
        
        // Check if we should skip the intermediate screen
        const skipIntermediateScreen = storage.getItem('skipIntermediateScreen') === 'true';
        
        // Show intermediate screen if we're at the first optional question AND all required questions are answered
        // But only if we haven't already shown it
        if (isFirstOptionalQuestion && hasRequiredQuestions && !skipIntermediateScreen) {
            console.log('Showing intermediate completion screen (all required questions answered)');
            showCompletionScreen(); // Show the intermediate screen
            return;
        }
        
        // Update the UI
        const surveyContent = win.document.getElementById('survey-content');
        if (!surveyContent) return;
        
        // Determine if we're in the optional questions section
        const isOptionalSection = !question.required && checkAllRequiredQuestionsAnswered();
        
        // Create HTML structure with appropriate buttons
        let questionsHTML = `
            <div class="question-content">
                <h2 id="question">Question ${currentQuestionIndex + 1} of ${questions.length}</h2>
                <div id="questionText">${question.text}</div>
            </div>
            
            <div class="options-container">
                <div class="likert-container">
                    <p class="instructions">Please select one of the options below:</p>
                    <div id="likertScale" class="likert-scale">
                        <div class="likert-option">
                            <input type="radio" name="likert" id="likert-strong-disagree" value="-2">
                            <label for="likert-strong-disagree">Strongly Disagree</label>
                        </div>
                        <div class="likert-option">
                            <input type="radio" name="likert" id="likert-disagree" value="-1">
                            <label for="likert-disagree">Disagree</label>
                        </div>
                        <div class="likert-option">
                            <input type="radio" name="likert" id="likert-agree" value="1">
                            <label for="likert-agree">Agree</label>
                        </div>
                        <div class="likert-option">
                            <input type="radio" name="likert" id="likert-strong-agree" value="2">
                            <label for="likert-strong-agree">Strongly Agree</label>
                        </div>
                    </div>
                    
                    <div class="dont-understand-container">
                        <input type="checkbox" id="dontUnderstand">
                        <label for="dontUnderstand">I don't understand this question</label>
                    </div>
                </div>
                
                <div class="button-container">
                    ${isOptionalSection ? '' : currentQuestionIndex > 0 ? '<button id="prevButton" class="secondary-button">Previous</button>' : ''}
                    ${isOptionalSection ? '<button id="goToResultsButton" class="secondary-button">Go to Results Page</button>' : ''}
                    <button id="nextButton" class="primary-button" disabled>Next</button>
                </div>
            </div>
        `;
        
        surveyContent.innerHTML = questionsHTML;
        
        // Set up event listeners
        setupEventListeners(isOptionalSection);
        
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

    function checkAllRequiredQuestionsAnswered() {
        // Get all required questions
        const requiredQuestions = questions.filter(q => q.required === true);
        if (requiredQuestions.length === 0) {
            console.log('No required questions found, returning true');
            return true; // No required questions, so all are "answered"
        }
        
        // Get all saved answers
        const savedAnswers = storage.getItem('surveyAnswers');
        if (!savedAnswers) {
            console.log('No saved answers found, returning false');
            return false; // No answers saved at all
        }
        
        const answers = JSON.parse(savedAnswers);
        
        // Log details for debugging
        console.log('Checking required questions:', {
            totalRequired: requiredQuestions.length,
            totalAnswers: answers.length,
            requiredIds: requiredQuestions.map(q => q.id),
            answeredIds: answers.map(a => a.question_key)
        });
        
        // Check that each required question has an answer with a likert_value
        const allAnswered = requiredQuestions.every(question => {
            const answer = answers.find(a => a.question_key === question.id);
            const isAnswered = answer && answer.likert_value !== null;
            
            if (!isAnswered) {
                console.log(`Required question ${question.id} is not answered`);
            }
            
            return isAnswered;
        });
        
        console.log('All required questions answered:', allAnswered);
        return allAnswered;
    }
    
    function isCurrentQuestionRequired() {
        if (!questions[currentQuestionIndex]) return false;
        const required = questions[currentQuestionIndex].required === true;
        console.log(`Question ${questions[currentQuestionIndex].id} required:`, required);
        return required;
    }
    
    function isAtLastRequiredQuestion() {
        if (currentQuestionIndex >= questions.length - 1) return true;
        
        // Check if all questions after this one are optional
        for (let i = currentQuestionIndex + 1; i < questions.length; i++) {
            if (questions[i].required === true) {
                return false;
            }
        }
        return true;
    }
    
    function showCompletionScreen() {
        const surveyContent = win.document.getElementById('survey-content');
        if (!surveyContent) return;
        
        // Check if we've finished all questions
        const isAtEnd = currentQuestionIndex >= questions.length;
        // Check if we've just finished the required questions section
        const justFinishedRequired = !isAtEnd && !isCurrentQuestionRequired() && 
                                    checkAllRequiredQuestionsAnswered();

        console.log('showCompletionScreen called with state:', {
            isAtEnd,
            justFinishedRequired,
            currentIndex: currentQuestionIndex,
            totalQuestions: questions.length
        });

        if (isAtEnd) {
            // Final completion screen - all questions completed
            surveyContent.innerHTML = `
                <div class="completion-screen">
                    <h2>Survey Completed</h2>
                    <p>Thank you for completing the survey!</p>
                    <button id="goToResultsButton" class="primary-button">Go to Results Page</button>
                </div>
            `;
            
            const resultButton = win.document.getElementById('goToResultsButton');
            if (resultButton) {
                resultButton.addEventListener('click', finalSubmission);
            }
        } else if (justFinishedRequired) {
            // Intermediate screen after completing required questions
            const optionalCount = questions.filter(q => q.required === false).length;
            
            surveyContent.innerHTML = `
                <div class="completion-screen">
                    <h2>Required Questions Completed</h2>
                    <p>Thank you for answering all required questions!</p>
                    <p>There are ${optionalCount} optional questions available.</p>
                    <div class="button-container">
                        <button id="optionalQuestionsButton" class="secondary-button">Answer Additional Questions</button>
                        <button id="goToResultsButton" class="primary-button">Go to Results Page</button>
                    </div>
                </div>
            `;
            
            // Explicitly add debug click handler to help diagnose issues
            console.log('Adding event listeners to completion screen buttons');
            
            // Get references to the buttons
            const optionalButton = win.document.getElementById('optionalQuestionsButton');
            const resultButton = win.document.getElementById('goToResultsButton');
            
            // Add event listener to the optional questions button
            if (optionalButton) {
                console.log('Optional questions button found, adding click event');
                optionalButton.onclick = function() {
                    console.log('Optional questions button clicked');
                    handleContinueToOptional();
                };
            } else {
                console.error('Optional questions button not found in DOM');
            }
            
            // Add event listener to the results button
            if (resultButton) {
                console.log('Results button found, adding click event');
                resultButton.onclick = function() {
                    console.log('Results button clicked');
                    finalSubmission();
                };
            } else {
                console.error('Results button not found in DOM');
            }
        } else {
            // Should not reach here, but show a basic message if it does
            surveyContent.innerHTML = `
                <div class="completion-screen">
                    <h2>Survey Progress</h2>
                    <p>Please continue answering the questions.</p>
                    <button id="continueButton" class="primary-button">Continue Survey</button>
                </div>
            `;
            
            const continueButton = win.document.getElementById('continueButton');
            if (continueButton) {
                continueButton.onclick = function() {
                    displayNextQuestion();
                };
            }
        }
    }
    
    function handleContinueToOptional() {
        console.log('handleContinueToOptional called - transitioning to optional questions');
        
        // Set a flag to avoid showing the intermediate screen again
        storage.setItem('skipIntermediateScreen', 'true');
        
        // Find the index of the first optional question
        const firstOptionalIndex = questions.findIndex(q => q.required === false);
        
        if (firstOptionalIndex !== -1) {
            console.log(`Found first optional question at index ${firstOptionalIndex}`);
            currentQuestionIndex = firstOptionalIndex;
            // Save the updated index
            storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
            
            // Simply display the next question instead of trying to manipulate DOM elements directly
            displayNextQuestion();
        } else {
            console.log('No optional questions found, proceeding to results');
            finalSubmission();
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

    function setupEventListeners(isOptionalSection = false) {
        const nextButton = win.document.getElementById('nextButton');
        const prevButton = win.document.getElementById('prevButton');
        const resultsButton = win.document.getElementById('goToResultsButton');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

        if (nextButton) {
            nextButton.addEventListener('click', handleNext);
        }
        if (prevButton) {
            prevButton.addEventListener('click', handlePrev);
        }
        if (resultsButton) {
            resultsButton.addEventListener('click', finalSubmission);
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
        
        // If we're in the optional questions section, submit this answer to Supabase immediately
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion && currentQuestion.required === false && checkAllRequiredQuestionsAnswered()) {
            await submitCurrentQuestionToSupabase();
        }
        
        // Move to the next question
        currentQuestionIndex++;
        storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
        displayNextQuestion();
    }

    async function submitCurrentQuestionToSupabase() {
        try {
            if (!navigator.onLine) {
                // If offline, just store locally and don't try to sync
                console.log('Currently offline, skipping Supabase submission');
                return;
            }
            
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) return;
            
            // Get the saved answer for this question
            const savedAnswers = JSON.parse(storage.getItem('surveyAnswers') || '[]');
            const answer = savedAnswers.find(a => a.question_key === currentQuestion.id);
            if (!answer) return;
            
            // Get user ID and participant ID
            let participantId = storage.getItem('futurelens_participant_id');
            if (!participantId) {
                console.error('No participant ID found, cannot submit to Supabase');
                return;
            }
            
            // Submit to Supabase
            const { error } = await supabaseClient
                .from('responses')
                .insert({
                    participant_id: participantId,
                    question_key: answer.question_key,
                    likert_value: answer.likert_value,
                    dont_understand: answer.dont_understand
                });
                
            if (error) {
                console.error('Error submitting optional question answer:', error);
            } else {
                console.log('Optional question answer submitted to Supabase:', answer.question_key);
            }
        } catch (error) {
            console.error('Error in submitCurrentQuestionToSupabase:', error);
        }
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
            // Start a new survey
            // Get the survey ID from localStorage (set during the survey code entry step)
            const storedSurveyId = storage.getItem('survey_id');
            
            if (storedSurveyId) {
                console.log('Using survey ID from localStorage:', storedSurveyId);
                surveyData = await fetchSurvey(storedSurveyId);
                initSurvey(surveyData);
            } else {
                console.warn('No survey ID found in localStorage, falling back to latest survey');
                surveyData = await fetchSurvey();
                initSurvey(surveyData);
            }
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
        finalSubmission,
        checkAllRequiredQuestionsAnswered,
        isCurrentQuestionRequired,
        submitCurrentQuestionToSupabase
    };
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSurvey };
} 