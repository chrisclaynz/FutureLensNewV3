import { describe, test, expect, beforeEach } from '@jest/globals';
import { createSurvey } from '../src/survey.js';

describe('Survey', () => {
    let mockStorage;
    let mockSupabase;
    let mockWindow;
    let survey;
    let mockFetch;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Create mock storage as an object that implements localStorage API
        mockStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };

        // Sample survey JSON for testing
        const sampleSurveyJson = {
            theme: {
                title: "Test Survey"
            },
            statements: [
                { id: "q1", text: "Question 1", alignment: "left", continuum: "test", hasDontUnderstand: true },
                { id: "q2", text: "Question 2", alignment: "right", continuum: "test", hasDontUnderstand: true },
                { id: "q3", text: "Question 3", alignment: "left", continuum: "test", hasDontUnderstand: true }
            ],
            continua: {
                test: {
                    name: "Test Continuum",
                    description: "Test description",
                    labels: { left: "Left", right: "Right" }
                }
            }
        };

        // Create mock Supabase client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
                data: { 
                    id: 1,
                    json_config: sampleSurveyJson
                }, 
                error: null 
            }),
            insert: jest.fn().mockResolvedValue({
                data: { id: 1 },
                error: null
            })
        };

        // Create mock window with document elements
        mockWindow = {
            document: {
                getElementById: jest.fn().mockReturnValue({
                    textContent: '',
                    querySelectorAll: jest.fn().mockReturnValue([]),
                    querySelector: jest.fn(),
                    addEventListener: jest.fn(),
                    checked: false,
                    innerHTML: ''
                })
            },
            location: { href: '' },
            alert: jest.fn(),
            navigator: { onLine: true }
        };

        // Mock fetch globally
        mockFetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue(sampleSurveyJson)
        });
        global.fetch = mockFetch;

        // Create survey instance with mocks
        survey = createSurvey({
            storage: mockStorage,
            supabase: mockSupabase,
            window: mockWindow
        });
    });

    test('fetchSurvey should fetch survey data from Supabase', async () => {
        const surveyId = 1;
        const result = await survey.fetchSurvey(surveyId);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('surveys');
        expect(mockSupabase.select).toHaveBeenCalledWith('json_config');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', surveyId);
        expect(mockSupabase.single).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result.statements).toHaveLength(3);
    });

    test('fetchSurvey should fallback to PROTOsurvey if Supabase returns error', async () => {
        // Mock Supabase to return an error
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
        
        const surveyId = 999;
        const result = await survey.fetchSurvey(surveyId);
        
        // Should fallback to fetch from file
        expect(global.fetch).toHaveBeenCalledWith('/PROTOsurvey_definition.json');
        expect(result).toBeDefined();
        expect(result.statements).toHaveLength(3);
    });

    test('initSurvey should extract questions and store order in localStorage', () => {
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Question 1" },
                { id: "q2", text: "Question 2" },
                { id: "q3", text: "Question 3" }
            ]
        };
        
        const questions = survey.initSurvey(sampleSurvey);
        
        // Should have stored the question order in localStorage
        expect(mockStorage.setItem).toHaveBeenCalledWith('questionOrder', expect.any(String));
        expect(mockStorage.setItem).toHaveBeenCalledWith('currentSurvey', expect.any(String));
        
        // Should return the shuffled questions array
        expect(questions).toHaveLength(3);
        
        // Verify that each of the original questions is in the returned array
        // Note: we can't check exact ordering since it's shuffled
        const questionIds = questions.map(q => q.id);
        expect(questionIds).toContain('q1');
        expect(questionIds).toContain('q2');
        expect(questionIds).toContain('q3');
    });

    test('displayNextQuestion should render the current question', () => {
        // Set up a survey with questions
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Question 1" },
                { id: "q2", text: "Question 2" }
            ]
        };
        
        survey.initSurvey(sampleSurvey);
        
        // Mock questionOrder in storage
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify([0, 1]));
        
        // Call displayNextQuestion
        survey.displayNextQuestion();
        
        // Should have updated the UI elements
        expect(mockWindow.document.getElementById).toHaveBeenCalledWith('question');
        expect(mockWindow.document.getElementById).toHaveBeenCalledWith('questionText');
        expect(mockWindow.document.getElementById).toHaveBeenCalledWith('likertScale');
        expect(mockWindow.document.getElementById).toHaveBeenCalledWith('dontUnderstand');
    });

    test('Next button should remain disabled if only "I Don\'t Understand" is checked', () => {
        // Create mock elements
        const mockNextButton = { disabled: true };
        const mockLikertScale = { querySelector: jest.fn().mockReturnValue(null) };
        const mockDontUnderstand = { checked: true };
        
        // Setup getElementById to return our mocks
        mockWindow.document.getElementById.mockImplementation((id) => {
            if (id === 'nextButton') return mockNextButton;
            if (id === 'likertScale') return mockLikertScale;
            if (id === 'dontUnderstand') return mockDontUnderstand;
            return null;
        });
        
        // Call the function to update button state
        const updateNextButtonState = Object.getPrototypeOf(survey).constructor.toString()
            .match(/function updateNextButtonState\(\) \{([\s\S]*?)\}/)[0];
        eval(`(function(win) { ${updateNextButtonState} }).call(survey, mockWindow)`);
        
        // Button should still be disabled
        expect(mockNextButton.disabled).toBe(true);
        
        // Change to have a likert selection
        mockLikertScale.querySelector.mockReturnValue({ checked: true });
        eval(`(function(win) { ${updateNextButtonState} }).call(survey, mockWindow)`);
        
        // Now button should be enabled
        expect(mockNextButton.disabled).toBe(false);
    });

    test('recordAnswer should save answer to localStorage', () => {
        const questionId = 'q1';
        const likertValue = 2;
        const dontUnderstand = false;
        
        // Mock existing answers
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify([
            { question_key: 'q2', likert_value: 1, dont_understand: false }
        ]));
        
        const answers = survey.recordAnswer(questionId, likertValue, dontUnderstand);
        
        // Should have stored the answers in localStorage
        expect(mockStorage.setItem).toHaveBeenCalledWith('surveyAnswers', expect.any(String));
        
        // Should have added the new answer
        expect(answers).toHaveLength(2);
        expect(answers[1]).toEqual({
            question_key: questionId,
            likert_value: likertValue,
            dont_understand: dontUnderstand
        });
    });

    test('should save multiple answers and submit successfully when online', async () => {
        // Mock navigator.onLine to be true
        Object.defineProperty(global.navigator, 'onLine', { get: () => true, configurable: true });
        
        // Setup multiple answers in storage
        const mockAnswers = [
            { question_key: 'q1', likert_value: 2, dont_understand: false },
            { question_key: 'q2', likert_value: -1, dont_understand: true },
            { question_key: 'q3', likert_value: 1, dont_understand: false }
        ];
        
        // Mock localStorage to return our test data
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'surveyAnswers') return JSON.stringify(mockAnswers);
            if (key === 'participant_id') return 'test-user-id';
            if (key === 'futurelens_participant_id') return 'test-participant-id';
            return null;
        });
        
        // Mock successful Supabase operations
        mockSupabase.insert.mockResolvedValue({ data: { id: 1 }, error: null });
        
        // Call finalSubmission
        await survey.finalSubmission();
        
        // Verify Supabase was called for each answer
        expect(mockSupabase.from).toHaveBeenCalledWith('responses');
        expect(mockSupabase.insert).toHaveBeenCalledTimes(3);
        
        // Verify storage was cleared
        expect(mockStorage.removeItem).toHaveBeenCalledWith('surveyAnswers');
        expect(mockStorage.removeItem).toHaveBeenCalledWith('questionOrder');
        expect(mockStorage.removeItem).toHaveBeenCalledWith('currentQuestionIndex');
        expect(mockStorage.removeItem).toHaveBeenCalledWith('currentSurvey');
        
        // Verify success message and redirection
        expect(mockWindow.alert).toHaveBeenCalledWith('Survey submitted successfully!');
        expect(mockWindow.location.href).toBe('/results.html');
    });
    
    test('should show error message when submitting offline', async () => {
        // Mock navigator.onLine to be false
        Object.defineProperty(global.navigator, 'onLine', { get: () => false, configurable: true });
        
        // Setup answers in storage
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify([
            { question_key: 'q1', likert_value: 2, dont_understand: false }
        ]));
        
        // Call finalSubmission
        await survey.finalSubmission();
        
        // Verify error message was shown
        expect(mockWindow.alert).toHaveBeenCalledWith('No internet connection. Please reconnect and try again.');
        
        // Verify Supabase was NOT called
        expect(mockSupabase.from).not.toHaveBeenCalledWith('responses');
        expect(mockSupabase.insert).not.toHaveBeenCalled();
        
        // Verify storage was NOT cleared
        expect(mockStorage.removeItem).not.toHaveBeenCalledWith('surveyAnswers');
    });

    test('should handle initialization with existing survey', async () => {
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'participant_id') return 'test-participant-id';
            if (key === 'currentQuestionIndex') return '1';
            if (key === 'currentSurvey') return JSON.stringify({
                statements: [
                    { id: "q1", text: "Question 1" },
                    { id: "q2", text: "Question 2" }
                ]
            });
            return null;
        });
        
        await survey.init();
        
        // Should not have fetched a new survey
        expect(mockSupabase.from).not.toHaveBeenCalledWith('surveys');
        
        // Should have called displayNextQuestion
        expect(mockWindow.document.getElementById).toHaveBeenCalledWith('question');
    });
}); 