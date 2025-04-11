import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './config.js';

export function createSurvey(dependencies = {}) {
    const {
        supabase,
        storage,
        window: win = window
    } = dependencies;

    let currentQuestion = 1;
    let totalQuestions = 0;
    let questions = [];
    let participantId = null;

    async function init() {
        // Get participant ID from storage
        participantId = storage.getItem('participant_id');
        if (!participantId) {
            console.error('No participant ID found');
            return;
        }

        // Load survey data
        const { data: participant, error: participantError } = await supabase
            .from('participants')
            .select('survey_id')
            .eq('id', participantId)
            .single();

        if (participantError) {
            console.error('Error loading participant:', participantError);
            return;
        }

        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('json_config')
            .eq('id', participant.survey_id)
            .single();

        if (surveyError) {
            console.error('Error loading survey:', surveyError);
            return;
        }

        // Initialize questions
        questions = survey.json_config.questions;
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

        if (questionTextElement) {
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
        const currentQuestionData = questions[currentQuestion - 1];

        const likertValue = likertScale ? likertScale.querySelector('input:checked')?.value : null;
        const dontUnderstandValue = dontUnderstand ? dontUnderstand.checked : false;

        const { error } = await supabase
            .from('responses')
            .upsert({
                participant_id: participantId,
                question_key: currentQuestionData.id,
                likert_value: likertValue ? parseInt(likertValue) : null,
                dont_understand: dontUnderstandValue
            });

        if (error) {
            console.error('Error saving answer:', error);
        }
    }

    async function finalSubmission() {
        await saveCurrentAnswer();
        
        // Clear progress
        storage.removeItem('surveyProgress');
        
        // Redirect to results page
        if (win.location) {
            win.location.href = '/results';
        }
    }

    return {
        init,
        handleNext,
        handlePrev
    };
}

// Default export for production use
export const survey = createSurvey();

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { survey };
} 