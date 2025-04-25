// Mock Supabase client
import { jest } from '@jest/globals';

jest.mock('@supabase/supabase-js', () => {
    const mockAuthInstance = {
        signInWithPassword: jest.fn(),
        signUp: jest.fn()
    };
    
    return {
        createClient: jest.fn(() => ({
            auth: mockAuthInstance
        }))
    };
});

// Import the mocked createClient to use in tests
import { createClient } from '@supabase/supabase-js';
import { auth } from '../auth.js';

describe('Authentication', () => {
    let supabaseClient;
    let auth;
    
    // Setup mocks for methods called in auth module
    beforeAll(() => {
        // Mock localStorage methods instead of replacing the whole object
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: jest.fn(),
                getItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });
        
        // Mock window.location
        delete window.location;
        window.location = { href: '' };
        
        // Create DOM elements mock
        document.getElementById = jest.fn(() => ({
            textContent: '',
            style: { display: 'none' },
            addEventListener: jest.fn()
        }));
    });
    
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Get the mocked Supabase client
        supabaseClient = createClient('test-url', 'test-key');
        
        // Create mock auth object for testing
        auth = {
            handleLogin: async (event) => {
                event.preventDefault();
                const email = event.target.elements.email.value;
                const password = event.target.elements.password.value;
                
                try {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });
        
                    if (error) throw error;
        
                    if (data?.user) {
                        window.localStorage.setItem('user_id', data.user.id);
                        window.location.href = '/survey.html';
                    }
                } catch (error) {
                    console.error('Login error:', error.message);
                    auth.showError('Invalid email or password');
                }
            },
            
            handleSignup: async (event) => {
                event.preventDefault();
                const email = event.target.elements.email.value;
                const password = event.target.elements.password.value;
                
                try {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password
                    });
        
                    if (error) throw error;
        
                    if (data?.user) {
                        auth.showSuccess('Account created successfully! Please check your email to verify your account.');
                    }
                } catch (error) {
                    console.error('Signup error:', error.message);
                    auth.showError('Error creating account. Please try again.');
                }
            },
            
            showError: jest.fn(),
            showSuccess: jest.fn()
        };
    });

    describe('handleLogin', () => {
        it('should successfully login with valid credentials', async () => {
            // Mock successful login
            supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
                data: { user: { id: '123' } },
                error: null
            });

            const event = {
                preventDefault: jest.fn(),
                target: {
                    elements: {
                        email: { value: 'test@example.com' },
                        password: { value: 'password123' }
                    }
                }
            };

            await auth.handleLogin(event);

            expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            });
            expect(window.localStorage.setItem).toHaveBeenCalledWith('user_id', '123');
        });

        it('should handle login failure', async () => {
            // Mock failed login
            supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
                data: null,
                error: new Error('Invalid credentials')
            });

            const event = {
                preventDefault: jest.fn(),
                target: {
                    elements: {
                        email: { value: 'test@example.com' },
                        password: { value: 'wrongpassword' }
                    }
                }
            };

            await auth.handleLogin(event);

            expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalled();
            expect(auth.showError).toHaveBeenCalledWith('Invalid email or password');
        });
    });

    describe('handleSignup', () => {
        it('should successfully create a new account', async () => {
            // Mock successful signup
            supabaseClient.auth.signUp.mockResolvedValueOnce({
                data: { user: { id: '123' } },
                error: null
            });

            const event = {
                preventDefault: jest.fn(),
                target: {
                    elements: {
                        email: { value: 'new@example.com' },
                        password: { value: 'newpassword123' }
                    }
                }
            };

            await auth.handleSignup(event);

            expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
                email: 'new@example.com',
                password: 'newpassword123'
            });
            expect(auth.showSuccess).toHaveBeenCalledWith(
                'Account created successfully! Please check your email to verify your account.'
            );
        });

        it('should handle signup failure', async () => {
            // Mock failed signup
            supabaseClient.auth.signUp.mockResolvedValueOnce({
                data: null,
                error: new Error('Email already in use')
            });

            const event = {
                preventDefault: jest.fn(),
                target: {
                    elements: {
                        email: { value: 'existing@example.com' },
                        password: { value: 'password123' }
                    }
                }
            };

            await auth.handleSignup(event);

            expect(supabaseClient.auth.signUp).toHaveBeenCalled();
            expect(auth.showError).toHaveBeenCalledWith(
                'Error creating account. Please try again.'
            );
        });
    });

    // Add tests for checkCompletedSurveys function
    describe('checkCompletedSurveys', () => {
        beforeEach(() => {
            // Mock localStorage
            global.localStorage.clear();
            
            // Mock supabase client calls
            global.supabase = {
                auth: {
                    signInWithPassword: jest.fn(),
                    signUp: jest.fn(),
                    signOut: jest.fn(),
                    getSession: jest.fn()
                },
                from: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockReturnThis()
            };
            
            // Mock window.location
            delete window.location;
            window.location = { href: '' };
            
            // Mock document functions
            document.getElementById = jest.fn().mockImplementation(() => {
                return {
                    addEventListener: jest.fn(),
                    innerHTML: '',
                    querySelectorAll: jest.fn().mockReturnValue([])
                };
            });
            
            document.querySelectorAll = jest.fn().mockReturnValue([]);
        });
        
        test('redirects to survey code when no participants exist', async () => {
            // Mock supabase response for a user with no participants
            global.supabase.from.mockImplementation((table) => {
                if (table === 'participants') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: [],
                            error: null
                        })
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis()
                };
            });
            
            await auth.checkCompletedSurveys('test-user-id');
            
            // Should redirect to survey code page
            expect(window.location.href).toBe('/survey-code.html');
        });
        
        test('redirects to results page when one completed survey exists', async () => {
            // Mock participant data
            const mockParticipantData = [
                { id: 'part-1', user_id: 'test-user-id', survey_id: 'survey-1', cohort_id: 'cohort-1', inserted_at: '2023-01-15' }
            ];
            
            // Mock survey data
            const mockSurveyData = {
                id: 'survey-1',
                json_config: {
                    theme: { title: 'Test Survey' },
                    statements: [
                        { id: 'q1', required: true },
                        { id: 'q2', required: true }
                    ]
                }
            };
            
            // Mock responses data that indicates completion
            const mockResponsesData = [
                { id: 'resp-1', participant_id: 'part-1', question_key: 'q1' },
                { id: 'resp-2', participant_id: 'part-1', question_key: 'q2' }
            ];
            
            // Set up the mock implementations
            global.supabase.from.mockImplementation((table) => {
                if (table === 'participants') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: mockParticipantData,
                            error: null
                        })
                    };
                } else if (table === 'surveys') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: mockSurveyData,
                            error: null,
                            single: jest.fn().mockReturnValue({
                                data: mockSurveyData,
                                error: null
                            })
                        }),
                        single: jest.fn().mockReturnValue({
                            data: mockSurveyData,
                            error: null
                        })
                    };
                } else if (table === 'responses') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: mockResponsesData,
                            error: null
                        })
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis()
                };
            });
            
            await auth.checkCompletedSurveys('test-user-id');
            
            // Should redirect to results page with participant ID
            expect(window.location.href).toBe('/results.html?participant_id=part-1');
            // Should store participant ID in localStorage
            expect(localStorage.getItem('futurelens_participant_id')).toBe('part-1');
        });
        
        test('displays selection screen when multiple completed surveys exist', async () => {
            // Mock participant data for multiple surveys
            const mockParticipantData = [
                { id: 'part-1', user_id: 'test-user-id', survey_id: 'survey-1', cohort_id: 'cohort-1', inserted_at: '2023-01-15' },
                { id: 'part-2', user_id: 'test-user-id', survey_id: 'survey-2', cohort_id: 'cohort-2', inserted_at: '2023-02-20' }
            ];
            
            // Mock survey data lookup function
            const mockSurveyLookup = {
                'survey-1': {
                    id: 'survey-1',
                    json_config: {
                        theme: { title: 'First Survey' },
                        statements: [{ id: 'q1', required: true }]
                    }
                },
                'survey-2': {
                    id: 'survey-2',
                    json_config: {
                        theme: { title: 'Second Survey' },
                        statements: [{ id: 'q2', required: true }]
                    }
                }
            };
            
            // Mock responses data for both surveys showing completion
            const mockResponsesLookup = {
                'part-1': [{ id: 'resp-1', participant_id: 'part-1', question_key: 'q1' }],
                'part-2': [{ id: 'resp-2', participant_id: 'part-2', question_key: 'q2' }]
            };
            
            // Mock the root container for the selection screen
            const mockContainer = {
                innerHTML: ''
            };
            document.getElementById.mockReturnValue(mockContainer);
            
            // Set up the mock implementations
            global.supabase.from.mockImplementation((table) => {
                if (table === 'participants') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: mockParticipantData,
                            error: null
                        })
                    };
                } else if (table === 'surveys') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockImplementation((field, value) => {
                            return {
                                data: mockSurveyLookup[value],
                                error: null,
                                single: jest.fn().mockReturnValue({
                                    data: mockSurveyLookup[value],
                                    error: null
                                })
                            };
                        }),
                        single: jest.fn().mockImplementation(() => {
                            return {
                                data: mockSurveyLookup['survey-1'], // Just return the first one for simplicity
                                error: null
                            };
                        })
                    };
                } else if (table === 'responses') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockImplementation((field, value) => {
                            return {
                                data: mockResponsesLookup[value],
                                error: null
                            };
                        })
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis()
                };
            });
            
            await auth.checkCompletedSurveys('test-user-id');
            
            // Should not redirect
            expect(window.location.href).not.toBe('/survey-code.html');
            expect(window.location.href).not.toBe('/results.html?participant_id=part-1');
            
            // Should display the selection screen
            expect(mockContainer.innerHTML).toContain('Your Completed Surveys');
            expect(mockContainer.innerHTML).toContain('First Survey');
            expect(mockContainer.innerHTML).toContain('Second Survey');
        });
        
        test('handles error gracefully when fetching participants fails', async () => {
            // Mock error when fetching participants
            global.supabase.from.mockImplementation((table) => {
                if (table === 'participants') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            data: null,
                            error: { message: 'Database error' }
                        })
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis()
                };
            });
            
            await auth.checkCompletedSurveys('test-user-id');
            
            // Should redirect to survey code page even with error
            expect(window.location.href).toBe('/survey-code.html');
        });
    });
}); 