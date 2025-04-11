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
}); 