import { createClient } from '@supabase/supabase-js';

// Get Supabase environment variables
const supabaseUrl = import.meta ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY;

export const survey = {
    questions: [],
    currentIndex: 0,

    async init() {
        console.log('Survey initialized');
        this.loadSurvey();
    },

    async loadSurvey() {
        try {
            const participantId = localStorage.getItem('participant_id');
            if (!participantId) {
                window.location.href = '/';
                return;
            }

            const { data: participant, error: participantError } = await supabase
                .from('participants')
                .select('survey_id')
                .eq('id', participantId)
                .single();

            if (participantError) throw participantError;

            const { data: survey, error: surveyError } = await supabase
                .from('surveys')
                .select('json_config')
                .eq('id', participant.survey_id)
                .single();

            if (surveyError) throw surveyError;

            this.questions = this.shuffleQuestions(survey.json_config.questions);
            localStorage.setItem('questionOrder', JSON.stringify(this.questions.map(q => q.id)));
            
            this.displayNextQuestion();
        } catch (error) {
            console.error('Error loading survey:', error.message);
            alert('Error loading survey. Please try again.');
        }
    },

    shuffleQuestions(questions) {
        const required = questions.filter(q => q.required);
        const optional = questions.filter(q => !q.required);
        
        // Fisher-Yates shuffle for both arrays
        for (let i = required.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [required[i], required[j]] = [required[j], required[i]];
        }
        for (let i = optional.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optional[i], optional[j]] = [optional[j], optional[i]];
        }

        return [...required, ...optional];
    },

    displayNextQuestion() {
        console.log('Displaying next question');
        if (this.currentIndex >= this.questions.length) {
            this.showSubmitButton();
            return;
        }

        const question = this.questions[this.currentIndex];
        const container = document.getElementById('questionContainer');
        if (!container) return;

        container.innerHTML = this.generateQuestionHTML(question);
        this.attachQuestionListeners();
    },

    generateQuestionHTML(question) {
        return `
            <div class="question" data-id="${question.id}">
                <h3>${question.text}</h3>
                <div class="likert-scale">
                    <label><input type="radio" name="likert" value="-2"> Strongly Disagree (-2)</label>
                    <label><input type="radio" name="likert" value="-1"> Disagree (-1)</label>
                    <label><input type="radio" name="likert" value="1"> Agree (+1)</label>
                    <label><input type="radio" name="likert" value="2"> Strongly Agree (+2)</label>
                </div>
                <div class="dont-understand">
                    <label>
                        <input type="checkbox" name="dontUnderstand">
                        I Don't Understand
                    </label>
                </div>
                <button id="nextButton" disabled>Next</button>
            </div>
        `;
    },

    attachQuestionListeners() {
        const nextButton = document.getElementById('nextButton');
        const likertInputs = document.querySelectorAll('input[name="likert"]');
        const dontUnderstand = document.querySelector('input[name="dontUnderstand"]');

        const updateButtonState = () => {
            const hasAnswer = [...likertInputs].some(input => input.checked) || dontUnderstand.checked;
            nextButton.disabled = !hasAnswer;
        };

        likertInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (input.checked) dontUnderstand.checked = false;
                updateButtonState();
            });
        });

        dontUnderstand.addEventListener('change', () => {
            if (dontUnderstand.checked) {
                likertInputs.forEach(input => input.checked = false);
            }
            updateButtonState();
        });

        nextButton.addEventListener('click', () => {
            this.saveAnswer();
            this.currentIndex++;
            this.displayNextQuestion();
        });
    },

    saveAnswer() {
        const questionId = document.querySelector('.question').dataset.id;
        const likertValue = document.querySelector('input[name="likert"]:checked')?.value;
        const dontUnderstand = document.querySelector('input[name="dontUnderstand"]').checked;

        const answer = {
            questionId,
            likertValue: likertValue ? parseInt(likertValue) : null,
            dontUnderstand
        };

        const answers = JSON.parse(localStorage.getItem('answers') || '[]');
        answers.push(answer);
        localStorage.setItem('answers', JSON.stringify(answers));
    },

    showSubmitButton() {
        const container = document.getElementById('questionContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="submit-section">
                <h3>Survey Complete</h3>
                <p>You have answered all questions. Click submit to finish.</p>
                <button id="submitButton">Submit</button>
            </div>
        `;

        document.getElementById('submitButton').addEventListener('click', this.submitSurvey.bind(this));
    },

    async submitSurvey() {
        if (!navigator.onLine) {
            alert('No internet connection. Please reconnect and try again.');
            return;
        }

        try {
            const answers = JSON.parse(localStorage.getItem('answers') || '[]');
            const participantId = localStorage.getItem('participant_id');

            const { error } = await supabase.from('responses').insert(
                answers.map(answer => ({
                    participant_id: participantId,
                    question_key: answer.questionId,
                    likert_value: answer.likertValue,
                    dont_understand: answer.dontUnderstand
                }))
            );

            if (error) throw error;

            // Clear local storage and redirect to results
            localStorage.removeItem('answers');
            window.location.href = '/results.html';
        } catch (error) {
            console.error('Error submitting survey:', error.message);
            alert('Error submitting survey. Please try again.');
        }
    },

    async submitResponse(response) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        try {
            const { data, error } = await supabase
                .from('responses')
                .insert([response]);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error submitting response:', error);
            throw error;
        }
    }
};

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { survey };
} 