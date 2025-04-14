const { describe, test, expect, beforeEach } = require('@jest/globals');
const { createSurvey } = require('../src/survey.js');

describe('Survey Required vs Optional Questions', () => {
    let mockStorage;
    let mockSupabase;
    let mockWindow;
    let survey;

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

        // Sample survey JSON for testing with required and optional questions
        const sampleSurveyJson = {
            theme: {
                title: "Test Survey"
            },
            statements: [
                { id: "q1", text: "Required Question 1", alignment: "left", continuum: "test", hasDontUnderstand: true, required: true },
                { id: "q2", text: "Required Question 2", alignment: "right", continuum: "test", hasDontUnderstand: true, required: true },
                { id: "q3", text: "Required Question 3", alignment: "left", continuum: "test", hasDontUnderstand: true, required: true },
                { id: "q4", text: "Optional Question 1", alignment: "right", continuum: "test", hasDontUnderstand: true, required: false },
                { id: "q5", text: "Optional Question 2", alignment: "left", continuum: "test", hasDontUnderstand: true, required: false }
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
                    disabled: true,
                    innerHTML: '',
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn()
                    }
                })
            },
            location: { href: '' },
            alert: jest.fn(),
            navigator: { onLine: true }
        };

        // Create survey instance with mocks
        survey = createSurvey({
            storage: mockStorage,
            supabase: mockSupabase,
            window: mockWindow
        });
    });

    test('initSurvey should separate required and optional questions in correct order', () => {
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Required Question 1", required: true },
                { id: "q2", text: "Optional Question 1", required: false },
                { id: "q3", text: "Required Question 2", required: true },
                { id: "q4", text: "Optional Question 2", required: false }
            ]
        };
        
        const questions = survey.initSurvey(sampleSurvey);
        
        // Should have stored the required question count in localStorage
        expect(mockStorage.setItem).toHaveBeenCalledWith('requiredQuestionCount', '2');
        
        // Should return all questions with required questions first
        expect(questions).toHaveLength(4);
        
        // The first two questions should be the required ones
        expect(questions[0].required || questions[0].required === undefined).toBeTruthy();
        expect(questions[1].required || questions[1].required === undefined).toBeTruthy();
        
        // The last two questions should be optional
        expect(questions[2].required).toBe(false);
        expect(questions[3].required).toBe(false);
    });

    test('displayNextQuestion should show (Optional) label for optional questions', () => {
        // Mock window document to capture label changes
        const mockQuestionElement = { textContent: '' };
        mockWindow.document.getElementById.mockImplementation((id) => {
            if (id === 'question') return mockQuestionElement;
            return {
                textContent: '',
                querySelectorAll: jest.fn().mockReturnValue([]),
                querySelector: jest.fn(),
                checked: false,
                disabled: true,
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
        });
        
        // Set up a survey with required and optional questions
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Required Question", required: true },
                { id: "q2", text: "Optional Question", required: false }
            ]
        };
        
        survey.initSurvey(sampleSurvey);
        
        // Display the first (required) question
        survey.displayNextQuestion();
        
        // Should not have (Optional) in the label
        expect(mockQuestionElement.textContent).toBe('Question 1 of 2');
        
        // Move to the next (optional) question
        survey.handleNext();
        
        // Display the second (optional) question
        survey.displayNextQuestion();
        
        // Should have (Optional) in the label
        expect(mockQuestionElement.textContent).toBe('Question 2 of 2 (Optional)');
    });

    test('checkRequiredQuestionsCompleted should return true when all required questions are completed', () => {
        // Set up a survey with required and optional questions
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Required Question 1", required: true },
                { id: "q2", text: "Required Question 2", required: true },
                { id: "q3", text: "Optional Question", required: false }
            ]
        };
        
        survey.initSurvey(sampleSurvey);
        
        // Mock storage to return saved answers with all required questions answered
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'requiredQuestionCount') return '2';
            if (key === 'surveyAnswers') return JSON.stringify([
                { question_key: 'q1', likert_value: 1, dont_understand: false },
                { question_key: 'q2', likert_value: -1, dont_understand: false }
            ]);
            return null;
        });
        
        // Should return true since all required questions are completed
        const result = survey.checkRequiredQuestionsCompleted();
        expect(result).toBe(true);
    });

    test('checkRequiredQuestionsCompleted should return false when not all required questions are completed', () => {
        // Set up a survey with required and optional questions
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Required Question 1", required: true },
                { id: "q2", text: "Required Question 2", required: true },
                { id: "q3", text: "Optional Question", required: false }
            ]
        };
        
        survey.initSurvey(sampleSurvey);
        
        // Mock storage to return saved answers with only one required question answered
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'requiredQuestionCount') return '2';
            if (key === 'surveyAnswers') return JSON.stringify([
                { question_key: 'q1', likert_value: 1, dont_understand: false }
            ]);
            return null;
        });
        
        // Should return false since not all required questions are completed
        const result = survey.checkRequiredQuestionsCompleted();
        expect(result).toBe(false);
    });

    test('next button should become submit button on last optional question when all required questions are done', () => {
        // Mock button element
        const mockNextButton = { 
            textContent: 'Next',
            disabled: false,
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };
        
        mockWindow.document.getElementById.mockImplementation((id) => {
            if (id === 'nextButton') return mockNextButton;
            return {
                textContent: '',
                querySelectorAll: jest.fn().mockReturnValue([]),
                querySelector: jest.fn(),
                checked: false,
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
        });
        
        // Set up a survey with required and optional questions
        const sampleSurvey = {
            statements: [
                { id: "q1", text: "Required Question 1", required: true },
                { id: "q2", text: "Required Question 2", required: true },
                { id: "q3", text: "Optional Question", required: false }
            ]
        };
        
        survey.initSurvey(sampleSurvey);
        
        // Mock that we're on the last question (index 2)
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'requiredQuestionCount') return '2';
            if (key === 'surveyAnswers') return JSON.stringify([
                { question_key: 'q1', likert_value: 1, dont_understand: false },
                { question_key: 'q2', likert_value: -1, dont_understand: false }
            ]);
            if (key === 'currentQuestionIndex') return '2';
            return null;
        });
        
        // Call the function that checks if required questions are completed
        survey.checkRequiredQuestionsCompleted();
        
        // Should have changed the Next button to Submit
        expect(mockNextButton.textContent).toBe('Submit');
        expect(mockNextButton.classList.add).toHaveBeenCalledWith('submit-button');
    });

    test('handleNext should call finalSubmission when next button is Submit', async () => {
        // Mock finalSubmission
        const finalSubmissionSpy = jest.spyOn(survey, 'finalSubmission').mockImplementation(() => {});
        
        // Mock button
        const mockNextButton = { textContent: 'Submit' };
        mockWindow.document.getElementById.mockImplementation((id) => {
            if (id === 'nextButton') return mockNextButton;
            return {
                textContent: '',
                querySelectorAll: jest.fn().mockReturnValue([]),
                querySelector: jest.fn(),
                checked: false
            };
        });
        
        // Call handleNext
        await survey.handleNext();
        
        // Should have called finalSubmission
        expect(finalSubmissionSpy).toHaveBeenCalled();
        
        // Should not have incremented the question index
        expect(mockStorage.setItem).not.toHaveBeenCalledWith('currentQuestionIndex', expect.any(String));
    });
}); 