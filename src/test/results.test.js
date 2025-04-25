// Import Jest
import { jest } from '@jest/globals';

// Mock Supabase client
jest.mock('../../src/client.js', () => {
    return {
        supabase: {
            from: jest.fn(() => ({
                select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        single: jest.fn(),
                    }))
                }))
            }))
        }
    };
});

// Import the results module
import { results } from '../results.js';
import { supabase } from '../client.js';

describe('Results Module', () => {
    // Mock localStorage
    beforeAll(() => {
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });

        // Mock document methods
        document.getElementById = jest.fn(() => ({
            innerHTML: '',
            addEventListener: jest.fn(),
            style: {}
        }));

        // Mock location
        delete window.location;
        window.location = { href: '', pathname: '' };
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateScores', () => {
        it('should calculate continuum averages correctly', async () => {
            // Mock participant data
            const mockParticipant = {
                id: 'participant-123',
                user_id: 'user-123',
                survey_id: 'survey-123',
                cohort_id: 'cohort-123'
            };

            // Mock survey data with continua and statements
            const mockSurvey = {
                id: 'survey-123',
                json_config: {
                    continua: {
                        'continuum1': {
                            name: 'Test Continuum 1',
                            labels: {
                                left: 'Left Label',
                                right: 'Right Label'
                            }
                        },
                        'continuum2': {
                            name: 'Test Continuum 2',
                            labels: {
                                left: 'Left Label 2',
                                right: 'Right Label 2'
                            }
                        }
                    },
                    statements: [
                        {
                            id: 'q1',
                            continuum: 'continuum1',
                            alignment: 'left'
                        },
                        {
                            id: 'q2',
                            continuum: 'continuum1',
                            alignment: 'right'
                        },
                        {
                            id: 'q3',
                            continuum: 'continuum2',
                            alignment: 'left'
                        }
                    ]
                }
            };

            // Mock responses
            const mockResponses = [
                {
                    id: 'resp-1',
                    participant_id: 'participant-123',
                    question_key: 'q1',
                    likert_value: 2,
                    dont_understand: false
                },
                {
                    id: 'resp-2',
                    participant_id: 'participant-123',
                    question_key: 'q2',
                    likert_value: -1,
                    dont_understand: false
                },
                {
                    id: 'resp-3',
                    participant_id: 'participant-123',
                    question_key: 'q3',
                    likert_value: null,
                    dont_understand: true
                }
            ];

            // Setup supabase mocks for the participant query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockParticipant,
                    error: null
                })
            }));

            // Setup supabase mocks for the survey query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockSurvey,
                    error: null
                })
            }));

            // Setup supabase mocks for the responses query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: mockResponses,
                    error: null
                })
            }));

            // Call the function
            const result = await results.calculateScores('participant-123');

            // Verify expected calculations
            expect(result).toBeDefined();
            expect(result.continuumScores).toBeDefined();
            
            // For continuum1, we have q1 with value 2 (left-aligned) and q2 with value -1 (right-aligned, so inverted to 1)
            // Average should be (2 + 1) / 2 = 1.5
            expect(result.continuumScores.continuum1.average).toBeCloseTo(1.5);
            
            // For continuum2, we only have "Don't understand" responses, so average should be 0
            expect(result.continuumScores.continuum2.average).toBe(0);
            expect(result.continuumScores.continuum2.dontUnderstandCount).toBe(1);
        });

        it('should handle error when participant is not found', async () => {
            // Mock error response for participant query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Participant not found')
                })
            }));

            // Expect the function to throw an error
            await expect(results.calculateScores('non-existent')).rejects.toThrow('Unable to load participant data');
        });

        it('should handle error when survey is not found', async () => {
            // Mock participant response
            const mockParticipant = {
                id: 'participant-123',
                user_id: 'user-123',
                survey_id: 'survey-123',
                cohort_id: 'cohort-123'
            };

            // Mock successful participant query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockParticipant,
                    error: null
                })
            }));

            // Mock error for survey query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Survey not found')
                })
            }));

            // Expect the function to throw an error
            await expect(results.calculateScores('participant-123')).rejects.toThrow('Unable to load survey configuration');
        });

        it('should handle case with no responses', async () => {
            // Mock participant data
            const mockParticipant = {
                id: 'participant-123',
                user_id: 'user-123',
                survey_id: 'survey-123',
                cohort_id: 'cohort-123'
            };

            // Mock survey data
            const mockSurvey = {
                id: 'survey-123',
                json_config: {
                    continua: {
                        'continuum1': {
                            name: 'Test Continuum 1',
                            labels: {
                                left: 'Left Label',
                                right: 'Right Label'
                            }
                        }
                    },
                    statements: []
                }
            };

            // Mock successful participant query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockParticipant,
                    error: null
                })
            }));

            // Mock successful survey query
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: mockSurvey,
                    error: null
                })
            }));

            // Mock empty responses
            supabase.from.mockImplementationOnce(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            }));

            // Expect the function to throw an error about no responses
            await expect(results.calculateScores('participant-123')).rejects.toThrow('No responses found');
        });
    });
}); 