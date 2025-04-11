import { describe, test, expect, beforeEach } from '@jest/globals';
import { createSurvey } from '../src/survey.js';

describe('Survey', () => {
    let mockStorage;
    let mockSupabase;
    let mockWindow;
    let survey;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Create mock storage
        mockStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            clear: jest.fn()
        };

        // Create mock Supabase client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
                data: { 
                    survey_id: 'test-survey-id',
                    json_config: { questions: [] }
                }, 
                error: null 
            })
        };

        // Create mock window
        mockWindow = {
            location: { href: '' },
            alert: jest.fn()
        };

        // Create survey instance with mocks
        survey = createSurvey({
            storage: mockStorage,
            supabase: mockSupabase,
            window: mockWindow
        });
    });

    test('should initialize survey', async () => {
        mockStorage.getItem.mockReturnValue('test-participant-id');
        await survey.init();
        expect(mockStorage.getItem).toHaveBeenCalledWith('participant_id');
    });

    test('should handle missing participant ID', async () => {
        mockStorage.getItem.mockReturnValue(null);
        await survey.init();
        expect(mockWindow.location.href).toBe('/');
    });

    test('should record answer', () => {
        const questionId = 'test-question';
        const likertValue = 1;
        const dontUnderstand = false;

        mockStorage.getItem.mockReturnValue('[]');
        survey.recordAnswer(questionId, likertValue, dontUnderstand);

        expect(mockStorage.getItem).toHaveBeenCalledWith('answers');
        expect(mockStorage.setItem).toHaveBeenCalled();
    });
}); 