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
        const allQuestions = surveyJson.statements || [];
        
        // Split questions into required and optional
        const requiredQuestions = allQuestions.filter(q => q.required === true || q.required === undefined);
        const optionalQuestions = allQuestions.filter(q => q.required === false);
        
        // Store optional questions for later
        storage.setItem('optionalQuestions', JSON.stringify(optionalQuestions));
        
        // Randomly shuffle the required questions
        const shuffledRequired = shuffleArray([...requiredQuestions]);
        
        // Start with just required questions
        questions = shuffledRequired;
        
        // Create an ordered array of question indices
        questionOrder = questions.map((_, index) => index);
        
        // Store the question order in localStorage
        storage.setItem('questionOrder', JSON.stringify(questionOrder));
        
        // Store whether a question is required
        storage.setItem('requiredQuestionCount', requiredQuestions.length.toString());
        
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
        const prevButton = win.document.getElementById('prevButton');
        const goToResultsButton = win.document.getElementById('goToResultsButton');
        
        // Determine if this is an optional question
        const isOptional = question.required === false;
        
        if (questionElement) {
            let questionLabel = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
            if (isOptional) {
                questionLabel += ' (Optional)';
            }
            questionElement.textContent = questionLabel;
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
        
        // For required questions
        if (!isOptional) {
            if (nextButton) {
                nextButton.disabled = true;
                
                // Reset the button text to "Next" if it was previously changed
                if (nextButton.textContent !== "Next") {
                    nextButton.textContent = "Next";
                    nextButton.classList.remove('submit-button', 'option-button');
                }
                
                // If this is the last required question, change it to "Submit"
                const isLastRequiredQuestion = currentQuestionIndex === questions.length - 1;
                if (isLastRequiredQuestion) {
                    nextButton.textContent = "Submit";
                    nextButton.classList.add('submit-button');
                }
            }
            
            // Hide the Go to Results button for required questions
            if (goToResultsButton) {
                goToResultsButton.style.display = 'none';
            }
            
            // Show the Previous button for required questions
            if (prevButton) {
                prevButton.style.display = '';
            }
        } 
        // For optional questions
        else {
            // Configure Next button as "Answer Another"
        if (nextButton) {
            nextButton.disabled = true;
                nextButton.textContent = "Answer Another";
                nextButton.classList.add('option-button');
            }
            
            // Show and configure Go to Results button - ALWAYS ENABLED
            if (goToResultsButton) {
                goToResultsButton.style.display = '';
                goToResultsButton.disabled = false; // Always enabled regardless of answer selection
            }
            
            // Hide Previous button in optional questions mode
            if (prevButton) {
                prevButton.style.display = 'none';
            }
        }
        
        // Optionally load any previously stored answer for this question
        loadSavedAnswer(question.id);
        
        // Set up clickable Likert options
        setupLikertOptionClicks();
        
        // Always make sure Go to Results button is enabled for optional questions
        if (isOptional && goToResultsButton) {
            goToResultsButton.disabled = false;
        }
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
        
        // Check if all required questions are completed
        checkRequiredQuestionsCompleted();
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
        
        // Check if all required questions are completed
        checkRequiredQuestionsCompleted();
    }

    function showCompletionScreen() {
        console.log('Showing completion screen');
        const surveyContent = win.document.getElementById('survey-content');
        if (surveyContent) {
            // Check if required questions have been submitted
            const requiredSubmitted = storage.getItem('requiredQuestionsSubmitted') === 'true';
            // Get optional questions
            const optionalQuestionsJson = storage.getItem('optionalQuestions');
            const optionalQuestions = optionalQuestionsJson ? JSON.parse(optionalQuestionsJson) : [];
            
            console.log('Required submitted:', requiredSubmitted);
            console.log('Optional questions:', optionalQuestions.length);
            
            // If we just completed required questions and there are optional questions available
            if (optionalQuestions.length > 0 && requiredSubmitted) {
                console.log('Showing optional questions choice screen');
                // Show the option to continue with optional questions or go to results
                surveyContent.innerHTML = `
                    <div class="completion-screen">
                        <h2>Required Questions Completed</h2>
                        <p>Thank you for completing all the required questions!</p>
                        <p>Would you like to answer some optional questions or view your results?</p>
                        <div class="button-group">
                            <button id="optionalQuestionsButton" class="primary-button">Answer Optional Questions</button>
                            <button id="viewResultsButton" class="primary-button">View Results</button>
                        </div>
                    </div>
                `;
                
                // Add event listener for optional questions button (with debugging)
                console.log('Setting up optional questions button listener');
                const optionalQuestionsButton = win.document.getElementById('optionalQuestionsButton');
                console.log('Optional questions button element:', optionalQuestionsButton);
                
                if (optionalQuestionsButton) {
                    // Remove any existing listeners by cloning
                    const newButton = optionalQuestionsButton.cloneNode(true);
                    optionalQuestionsButton.parentNode.replaceChild(newButton, optionalQuestionsButton);
                    
                    // Add fresh listener
                    newButton.addEventListener('click', function(e) {
                        console.log('Optional questions button clicked!');
                        e.preventDefault();
                        startOptionalQuestions();
                    });
                }
                
                // Add event listener for view results button
                const viewResultsButton = win.document.getElementById('viewResultsButton');
                if (viewResultsButton) {
                    // Remove any existing listeners by cloning 
                    const newButton = viewResultsButton.cloneNode(true);
                    viewResultsButton.parentNode.replaceChild(newButton, viewResultsButton);
                    
                    // Add fresh listener
                    newButton.addEventListener('click', function(e) {
                        console.log('View results button clicked!');
                        e.preventDefault();
                        finalSubmission();
                    });
                }
            } else {
                // Final completion - either all done or optional questions done
                console.log('Showing final completion screen');
            surveyContent.innerHTML = `
                <div class="completion-screen">
                    <h2>Survey Completed</h2>
                    <p>Thank you for completing the survey!</p>
                        <button id="submitSurveyButton" class="primary-button">View Results</button>
                </div>
            `;
            
            const submitButton = win.document.getElementById('submitSurveyButton');
            if (submitButton) {
                submitButton.addEventListener('click', finalSubmission);
                }
            }
        }
    }

    async function finalSubmission() {
        // We've already submitted answers incrementally, so just proceed to results
        
        // Clear local storage of survey data
        storage.removeItem('surveyAnswers');
        storage.removeItem('questionOrder');
        storage.removeItem('currentQuestionIndex');
        storage.removeItem('currentSurvey');
        storage.removeItem('optionalQuestions');
        storage.removeItem('requiredQuestionsSubmitted');
        
        // Show success message
        win.alert('Survey completed successfully!');
        
        // Redirect to results page
        win.location.href = '/results.html';
    }

    function setupEventListeners() {
        const nextButton = win.document.getElementById('nextButton');
        const prevButton = win.document.getElementById('prevButton');
        const goToResultsButton = win.document.getElementById('goToResultsButton');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

        if (nextButton) {
            nextButton.addEventListener('click', handleNext);
        }
        if (prevButton) {
            prevButton.addEventListener('click', handlePrev);
        }
        if (goToResultsButton) {
            goToResultsButton.addEventListener('click', handleGoToResults);
        }
        if (likertScale) {
            likertScale.addEventListener('change', updateButtonsState);
        }
        if (dontUnderstand) {
            dontUnderstand.addEventListener('change', updateButtonsState);
        }
    }

    function updateNextButtonState() {
        updateButtonsState();
    }

    function updateButtonsState() {
        const nextButton = win.document.getElementById('nextButton');
        const goToResultsButton = win.document.getElementById('goToResultsButton');
        const likertScale = win.document.getElementById('likertScale');

        // User must select a Likert scale option to proceed with "Answer Another"
        const hasLikertAnswer = likertScale && likertScale.querySelector('input:checked');
        
        if (nextButton) {
            nextButton.disabled = !hasLikertAnswer;
        }
        
        // "Go to Results" button is always enabled
        if (goToResultsButton) {
            goToResultsButton.disabled = false;
        }
    }

    async function handleNext() {
        await saveCurrentAnswer();
        
        // Check if this is a submit button for required questions
        const nextButton = win.document.getElementById('nextButton');
        const isOptionalMode = questions[currentQuestionIndex]?.required === false;
        
        if (nextButton && nextButton.textContent === 'Submit') {
            console.log('Submit button clicked for required questions');
            
            // Submit required answers to Supabase
            const submitResult = await submitRequiredAnswers();
            
            if (!submitResult) {
                console.log('Failed to submit required answers');
                return; // Stop if submission failed
            }
            
            // Successfully submitted required answers
            console.log('Successfully submitted required answers');
            
            // Force-show the completion screen
            showCompletionScreen();
            return;
        }
        
        // Check if this is the submit to results button for optional questions
        if (nextButton && nextButton.textContent === 'Submit to Results') {
            // Submit current optional answer to Supabase
            await submitOptionalAnswer();
            
            // Go to results page
            finalSubmission();
            return;
        }
        
        // Check if this is the "Answer Another" button for optional questions
        if (nextButton && nextButton.textContent === 'Answer Another') {
            // Submit current optional answer to Supabase
            await submitOptionalAnswer();
            
            // Go to next optional question
            currentQuestionIndex++;
            storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
            displayNextQuestion();
            return;
        }
        
        // Normal next behavior
        currentQuestionIndex++;
        storage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
        
        // Check if we need to show the survey completion screen instead of next question
        if (currentQuestionIndex >= questions.length) {
            showCompletionScreen();
        } else {
            displayNextQuestion();
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

    async function handleGoToResults() {
        console.log('Go to Results button clicked');
        
        // Check if the user has selected an answer for the current question
        const likertScale = win.document.getElementById('likertScale');
        const hasLikertAnswer = likertScale && likertScale.querySelector('input:checked');
        
        // Only save and submit the current answer if one is selected
        if (hasLikertAnswer) {
            await saveCurrentAnswer();
            await submitOptionalAnswer();
        } else {
            console.log('No answer selected, skipping submission for this question');
        }
        
        // Go to results page regardless of whether an answer was selected
        finalSubmission();
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
            
            // Restore required question count
            if (!storage.getItem('requiredQuestionCount')) {
                const requiredQuestions = questions.filter(q => q.required === true || q.required === undefined);
                storage.setItem('requiredQuestionCount', requiredQuestions.length.toString());
            }
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

    function checkRequiredQuestionsCompleted() {
        // Get all saved answers
        const savedAnswers = storage.getItem('surveyAnswers');
        if (!savedAnswers) return false;
        
        const answers = JSON.parse(savedAnswers);
        
        // Get the required question count
        const requiredCount = parseInt(storage.getItem('requiredQuestionCount') || '0', 10);
        
        // Check if we've answered all required questions (first X questions)
        let answeredRequiredCount = 0;
        
        for (let i = 0; i < requiredCount; i++) {
            if (i >= questions.length) break;
            
            const question = questions[i];
            const answer = answers.find(a => a.question_key === question.id);
            
            if (answer && answer.likert_value !== null) {
                answeredRequiredCount++;
            }
        }
        
        // If we've answered all required questions, modify the Next button on the 
        // last optional question to be a Submit button
        if (answeredRequiredCount === requiredCount && currentQuestionIndex >= requiredCount) {
            const isLastQuestion = currentQuestionIndex === questions.length - 1;
            const nextButton = win.document.getElementById('nextButton');
            
            if (nextButton && isLastQuestion) {
                nextButton.textContent = 'Submit';
                nextButton.classList.add('submit-button');
            }
        }
        
        return answeredRequiredCount === requiredCount;
    }

    async function submitRequiredAnswers() {
        try {
            // Check for internet connection
            if (!navigator.onLine) {
                win.alert('No internet connection. Please reconnect and try again.');
                return false;
            }
            
            // Get all stored answers
            const savedAnswers = storage.getItem('surveyAnswers');
            if (!savedAnswers) {
                win.alert('No answers found to submit.');
                return false;
            }
            
            const answers = JSON.parse(savedAnswers);
            
            // Get user ID from storage
            const userId = storage.getItem('participant_id');
            if (!userId) {
                win.alert('No user ID found. Please log in again.');
                win.location.href = '/';
                return false;
            }
            
            // Get survey ID
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
                    return false;
                }
                
                if (surveys && surveys.length > 0) {
                    surveyId = surveys[0].id;
                } else {
                    console.error('No surveys found in database');
                    win.alert('No surveys found in database. Please contact the administrator.');
                    return false;
                }
            }
            
            // Create participant record
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
                    return false;
                }
                
                participantId = participantData.id;
                storage.setItem('futurelens_participant_id', participantId);
            }
            
            // Submit all required answers to Supabase
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
                return false;
            }
            
            console.log('Required answers submitted successfully!');
            
            // Explicitly set the requiredQuestionsSubmitted flag to true
            storage.setItem('requiredQuestionsSubmitted', 'true');
            
            return true;
        } catch (error) {
            console.error('Error submitting required answers:', error);
            win.alert('Error submitting required answers. Please try again.');
            return false;
        }
    }

    async function submitOptionalAnswer() {
        try {
            // Check for internet connection
            if (!navigator.onLine) {
                win.alert('No internet connection. Please reconnect and try again.');
                return;
            }
            
            // Get current question
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) return;
            
            // Get Likert and "Don't Understand" values
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

            const likertValue = likertScale ? parseInt(likertScale.querySelector('input:checked')?.value) : null;
            const dontUnderstandValue = dontUnderstand ? dontUnderstand.checked : false;
            
            // If no likert value is selected, do nothing
            if (likertValue === null) return;
            
            // Get participant ID from storage
            const participantId = storage.getItem('futurelens_participant_id');
            if (!participantId) {
                console.error('No participant ID found');
                return;
    }

            // Submit this single optional answer to Supabase
            const { error } = await supabaseClient
                .from('responses')
                .insert({
                    participant_id: participantId,
                    question_key: currentQuestion.id,
                    likert_value: likertValue,
                    dont_understand: dontUnderstandValue
                });
                
            if (error) {
                console.error('Error submitting optional answer:', error);
                return;
            }
            
            console.log(`Optional answer for ${currentQuestion.id} submitted successfully!`);
        } catch (error) {
            console.error('Error submitting optional answer:', error);
        }
    }

    function startOptionalQuestions() {
        console.log('Starting optional questions...');
        
        try {
            // Retrieve optional questions from storage
            const optionalQuestionsJson = storage.getItem('optionalQuestions');
            console.log('Optional questions JSON from storage:', optionalQuestionsJson ? 'Found' : 'Not found');
            
            if (!optionalQuestionsJson) {
                console.error('No optional questions found in storage');
                showCompletionScreen();
            return;
        }
        
            // Load optional questions
            const optionalQuestions = JSON.parse(optionalQuestionsJson);
            console.log(`Parsed ${optionalQuestions.length} optional questions`);
            
            if (optionalQuestions.length === 0) {
                console.error('Empty optional questions list');
                showCompletionScreen();
                return;
            }
            
            // Set questions to optional questions list
            questions = shuffleArray([...optionalQuestions]);
            console.log(`Set up ${questions.length} shuffled optional questions`);
            
            // Reset currentQuestionIndex for optional questions
            currentQuestionIndex = 0;
            
            // Create an ordered array of question indices for optional questions
            questionOrder = questions.map((_, index) => index);
            storage.setItem('questionOrder', JSON.stringify(questionOrder));
            
            // Clear the completion screen and restore the question container
            const surveyContent = win.document.getElementById('survey-content');
            if (surveyContent) {
                console.log('Rebuilding survey container for optional questions');
                surveyContent.innerHTML = `
                    <div id="question-container">
                        <div class="question-content">
                            <h2 id="question">Optional Question</h2>
                            <div id="questionText">Loading optional question...</div>
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
                                    <label for="dontUnderstand">I Don't Understand</label>
                                    <p class="note"><small>Note: You must select an option to use "Answer Another". You can click "Go to Results" at any time to skip this question.</small></p>
                                </div>
                                
                                <div class="navigation-wrapper">
                                    <div class="navigation-buttons">
                                        <button id="prevButton" class="nav-button" style="display: none;">Previous</button>
                                        <button id="nextButton" class="nav-button option-button" disabled>Answer Another</button>
                                        <button id="goToResultsButton" class="nav-button results-button">Go to Results</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Re-setup event listeners since we replaced the DOM elements
        setupEventListeners();
        
                // Make sure the "Go to Results" button is enabled
                const goToResultsButton = win.document.getElementById('goToResultsButton');
                if (goToResultsButton) {
                    goToResultsButton.disabled = false;
                }
            }
            
            // Display the first optional question
            console.log('Displaying first optional question');
        displayNextQuestion();
            
            // Final check to ensure the "Go to Results" button is enabled
            const goToResultsButton = win.document.getElementById('goToResultsButton');
            if (goToResultsButton) {
                goToResultsButton.disabled = false;
            }
        } catch (error) {
            console.error('Error starting optional questions:', error);
            win.alert('There was an error loading the optional questions. Please try again.');
            showCompletionScreen();
        }
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
        handleGoToResults,
        finalSubmission,
        submitRequiredAnswers,
        submitOptionalAnswer,
        startOptionalQuestions
    };
}

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSurvey };
} 