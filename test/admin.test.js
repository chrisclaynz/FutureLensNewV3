const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            signInWithPassword: jest.fn(),
            getSession: jest.fn()
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn()
        }))
    }))
}));

// Mock DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import the module to test
require('../src/admin.js');

describe('Admin Dashboard', () => {
    let supabase;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        supabase = createClient();
    });

    test('should handle teacher login successfully', async () => {
        // Mock successful login
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: { id: '123' } },
            error: null
        });

        // Mock user data
        supabase.from().select().eq().single.mockResolvedValue({
            data: { role: 'teacher', cohort_ids: ['cohort1', 'cohort2'] },
            error: null
        });

        // Mock cohorts data
        supabase.from().select().in().mockResolvedValue({
            data: [
                { id: 'cohort1', code: 'C1', label: 'Cohort 1' },
                { id: 'cohort2', code: 'C2', label: 'Cohort 2' }
            ],
            error: null
        });

        // Simulate form submission
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('login-form');

        emailInput.value = 'teacher@example.com';
        passwordInput.value = 'password123';
        loginForm.dispatchEvent(new Event('submit'));

        // Verify Supabase calls
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'teacher@example.com',
            password: 'password123'
        });

        // Verify dashboard is shown
        expect(document.getElementById('dashboard-section').classList.contains('hidden')).toBe(false);
    });

    test('should handle non-teacher login rejection', async () => {
        // Mock successful login but non-teacher role
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: { id: '123' } },
            error: null
        });

        supabase.from().select().eq().single.mockResolvedValue({
            data: { role: 'student', cohort_ids: [] },
            error: null
        });

        // Simulate form submission
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('login-form');

        emailInput.value = 'student@example.com';
        passwordInput.value = 'password123';
        loginForm.dispatchEvent(new Event('submit'));

        // Verify error message
        expect(alert).toHaveBeenCalledWith('Access denied. Teacher role required.');
    });

    test('should load cohort results successfully', async () => {
        // Mock survey data
        supabase.from().select().eq().single.mockResolvedValue({
            data: { id: 'survey1', json_config: {} },
            error: null
        });

        // Mock responses data
        supabase.from().select().eq().eq().mockResolvedValue({
            data: [
                { question_key: 'Q1', likert_value: 2, dont_understand: false },
                { question_key: 'Q1', likert_value: 1, dont_understand: false },
                { question_key: 'Q2', likert_value: -1, dont_understand: true }
            ],
            error: null
        });

        // Simulate search
        const searchBtn = document.getElementById('search-btn');
        searchBtn.click();

        // Verify results container is shown
        expect(document.getElementById('results-container').classList.contains('hidden')).toBe(false);
    });
}); 