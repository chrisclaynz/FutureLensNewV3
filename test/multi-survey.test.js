import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createSurvey } from '../src/survey.js';

describe('Multiple Survey Support', () => {
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

        // Create mock Supabase client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
            insert: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis()
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

        // Create survey instance with mocks
        survey = createSurvey({
            storage: mockStorage,
            supabase: mockSupabase,
            window: mockWindow
        });
    });

    test('loadSurveyByCode should fetch cohort and survey data for valid code', async () => {
        // Set up mock cohort data
        const mockCohort = {
            id: 'cohort-123',
            survey_id: 'survey-456'
        };
        mockSupabase.single.mockResolvedValueOnce({ data: mockCohort, error: null });

        // Set up mock survey data
        const mockSurveyConfig = {
            id: 'survey-456',
            json_config: {
                theme: { title: 'Test Survey' },
                statements: [
                    { id: 'q1', text: 'Question 1', continuum: 'test' }
                ]
            }
        };
        mockSupabase.single.mockResolvedValueOnce({ data: mockSurveyConfig, error: null });

        // Set up mock user data
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'participant_id') return 'user-789';
            return null;
        });

        // Set up mock check for existing participant
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        // Set up mock participant creation
        const mockParticipant = { id: 'participant-001' };
        mockSupabase.single.mockResolvedValueOnce({ data: mockParticipant, error: null });

        // Call the function with a valid code
        await survey.loadSurveyByCode('valid-code');

        // Verify cohort lookup
        expect(mockSupabase.from).toHaveBeenCalledWith('cohorts');
        expect(mockSupabase.select).toHaveBeenCalledWith('id, survey_id');
        expect(mockSupabase.eq).toHaveBeenCalledWith('code', 'valid-code');

        // Verify survey fetch
        expect(mockSupabase.from).toHaveBeenCalledWith('surveys');

        // Verify participant creation
        expect(mockSupabase.from).toHaveBeenCalledWith('participants');
        expect(mockSupabase.insert).toHaveBeenCalledWith({
            user_id: 'user-789',
            cohort_id: 'cohort-123',
            survey_id: 'survey-456'
        });

        // Verify storage updates
        expect(mockStorage.setItem).toHaveBeenCalledWith('futurelens_participant_id', 'participant-001');
    });

    test('loadSurveyByCode should throw error for invalid code', async () => {
        // Set up mock response for invalid code
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

        // Call the function with an invalid code
        await expect(survey.loadSurveyByCode('invalid-code')).rejects.toThrow('Invalid survey code');

        // Verify cohort lookup
        expect(mockSupabase.from).toHaveBeenCalledWith('cohorts');
        expect(mockSupabase.eq).toHaveBeenCalledWith('code', 'invalid-code');
    });

    test('loadSurveyByCode should use existing participant if available', async () => {
        // Set up mock cohort data
        const mockCohort = {
            id: 'cohort-123',
            survey_id: 'survey-456'
        };
        mockSupabase.single.mockResolvedValueOnce({ data: mockCohort, error: null });

        // Set up mock survey data
        const mockSurveyConfig = {
            id: 'survey-456',
            json_config: {
                theme: { title: 'Test Survey' },
                statements: [
                    { id: 'q1', text: 'Question 1', continuum: 'test' }
                ]
            }
        };
        mockSupabase.single.mockResolvedValueOnce({ data: mockSurveyConfig, error: null });

        // Set up mock user data
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'participant_id') return 'user-789';
            return null;
        });

        // Set up mock existing participant
        const mockExistingParticipant = { id: 'existing-participant-001' };
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockExistingParticipant, error: null });

        // Call the function with a valid code
        await survey.loadSurveyByCode('valid-code');

        // Verify participant lookup
        expect(mockSupabase.from).toHaveBeenCalledWith('participants');
        expect(mockSupabase.select).toHaveBeenCalledWith('id');
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-789');
        expect(mockSupabase.eq).toHaveBeenCalledWith('survey_id', 'survey-456');

        // Verify we're using existing participant and not creating a new one
        expect(mockStorage.setItem).toHaveBeenCalledWith('futurelens_participant_id', 'existing-participant-001');
        
        // Make sure insert was not called for participant creation
        expect(mockSupabase.insert).not.toHaveBeenCalledWith({
            user_id: 'user-789',
            cohort_id: 'cohort-123',
            survey_id: 'survey-456'
        });
    });

    test('finalSubmission should pass the participant_id to responses', async () => {
        // Mock stored answers
        const mockAnswers = [
            { question_key: 'q1', likert_value: 2, dont_understand: false },
            { question_key: 'q2', likert_value: -1, dont_understand: false }
        ];
        mockStorage.getItem.mockImplementation((key) => {
            if (key === 'futurelens_participant_id') return 'participant-001';
            if (key === 'surveyAnswers') return JSON.stringify(mockAnswers);
            return null;
        });

        // Mock successful response insert
        mockSupabase.insert.mockReturnValueOnce({ error: null });
        mockSupabase.insert.mockReturnValueOnce({ error: null });

        // Call finalSubmission
        await survey.finalSubmission();

        // Verify responses insert with correct participant_id
        expect(mockSupabase.from).toHaveBeenCalledWith('responses');
        expect(mockSupabase.insert).toHaveBeenCalledWith({
            participant_id: 'participant-001',
            question_key: 'q1',
            likert_value: 2,
            dont_understand: false
        });
        expect(mockSupabase.insert).toHaveBeenCalledWith({
            participant_id: 'participant-001',
            question_key: 'q2',
            likert_value: -1,
            dont_understand: false
        });

        // Verify we're redirecting to results
        expect(mockWindow.location.href).toBe('/results.html');
    });
}); 