import supabase from './client.js';

export function createSurvey(dependencies = {}) {
    const {
        supabase: supabaseClient = supabase,
        storage = localStorage,
        window: win = window
    } = dependencies;

    let currentQuestion = 1;
    let totalQuestions = 0;
    let questions = [];
    let participantId = null;

    async function init() {
        console.log('Survey module initialized');
        // Get participant ID from storage
        participantId = storage.getItem('user_id');
        if (!participantId) {
            console.error('No participant ID found');
            return;
        }

        // Placeholder for loading survey data
        // In a real implementation, we would:
        // 1. Get the survey_id from the participant record
        // 2. Load the survey from the surveys table
        // 3. Initialize questions from the survey.json_config
        
        // For now, we'll use mock data
        questions = [
            { id: 'q1', text: 'I believe technology will positively impact education in the future.' },
            { id: 'q2', text: 'Online learning is as effective as traditional classroom learning.' },
            { id: 'q3', text: 'Schools should incorporate more technology in their curriculum.' }
        ];
        totalQuestions = questions.length;

        // Load saved progress if any
        const savedProgress = storage.getItem('surveyProgress');
        if (savedProgress) {
            currentQuestion = parseInt(savedProgress, 10);
        }

        // Initialize UI
        updateQuestionDisplay();
        setupEventListeners();
    }

    function updateQuestionDisplay() {
        const questionElement = win.document.getElementById('question');
        const questionTextElement = win.document.getElementById('questionText');
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');

        if (questionElement) {
            questionElement.textContent = `Question ${currentQuestion} of ${totalQuestions}`;
        }

        if (questionTextElement && questions[currentQuestion - 1]) {
            questionTextElement.textContent = questions[currentQuestion - 1].text;
        }

        if (likertScale) {
            // Reset previous selections
            likertScale.querySelectorAll('input').forEach(input => {
                input.checked = false;
            });
        }

        if (dontUnderstand) {
            dontUnderstand.checked = false;
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
            const hasAnswer = (likertScale && likertScale.querySelector('input:checked')) || 
                            (dontUnderstand && dontUnderstand.checked);
            nextButton.disabled = !hasAnswer;
        }
    }

    async function handleNext() {
        if (currentQuestion < totalQuestions) {
            await saveCurrentAnswer();
            currentQuestion++;
            storage.setItem('surveyProgress', currentQuestion);
            updateQuestionDisplay();
            updateNextButtonState();
        } else {
            await finalSubmission();
        }
    }

    async function handlePrev() {
        if (currentQuestion > 1) {
            await saveCurrentAnswer();
            currentQuestion--;
            storage.setItem('surveyProgress', currentQuestion);
            updateQuestionDisplay();
            updateNextButtonState();
        }
    }

    async function saveCurrentAnswer() {
        const likertScale = win.document.getElementById('likertScale');
        const dontUnderstand = win.document.getElementById('dontUnderstand');
        
        if (!questions[currentQuestion - 1]) return;
        
        const currentQuestionData = questions[currentQuestion - 1];
        const likertValue = likertScale ? likertScale.querySelector('input:checked')?.value : null;
        const dontUnderstandValue = dontUnderstand ? dontUnderstand.checked : false;

        // For now, just log the response rather than saving to Supabase
        console.log('Response saved:', {
            participant_id: participantId,
            question_key: currentQuestionData.id,
            likert_value: likertValue ? parseInt(likertValue) : null,
            dont_understand: dontUnderstandValue
        });
    }

    async function finalSubmission() {
        await saveCurrentAnswer();
        
        // Clear progress
        storage.removeItem('surveyProgress');
        
        // Redirect to results page
        win.alert('Thank you for completing the survey!');
        
        if (win.location) {
            win.location.href = '/';
        }
    }

    return {
        init,
        handleNext,
        handlePrev
    };
}

// We'll let app.js handle creating the survey instance
// export const survey = createSurvey();

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSurvey };
} 