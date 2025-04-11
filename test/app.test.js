import { describe, test, expect, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../src/config.js';

describe('App', () => {
    let mockSupabase;
    let mockWindow;
    let mockDocument;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Create mock Supabase client
        mockSupabase = {
            auth: {
                getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null })
            }
        };

        // Create mock window
        mockWindow = {
            addEventListener: jest.fn(),
            location: { href: '' }
        };

        // Create mock document
        mockDocument = {
            addEventListener: jest.fn(),
            getElementById: jest.fn().mockReturnValue({
                addEventListener: jest.fn()
            })
        };

        // Mock the createClient function
        jest.mock('@supabase/supabase-js', () => ({
            createClient: jest.fn().mockReturnValue(mockSupabase)
        }));

        // Mock the window and document globals
        global.window = mockWindow;
        global.document = mockDocument;
    });

    test('should initialize app', () => {
        // Import the app module after setting up mocks
        const { initApp } = require('../src/app.js');
        
        initApp();
        
        expect(mockDocument.addEventListener).toHaveBeenCalledWith(
            'DOMContentLoaded',
            expect.any(Function)
        );
    });

    test('should handle authentication state', async () => {
        // Import the app module after setting up mocks
        const { initApp } = require('../src/app.js');
        
        initApp();
        
        // Simulate DOMContentLoaded event
        const domContentLoadedCallback = mockDocument.addEventListener.mock.calls[0][1];
        await domContentLoadedCallback();
        
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });
}); 