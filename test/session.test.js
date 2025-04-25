import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { auth } from '../src/auth.js';

// Mock the supabase client
jest.mock('../src/client.js', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: { session: { user: { id: 'test-user-id' } } },
                error: null
            }),
            signOut: jest.fn().mockResolvedValue({ error: null })
        }
    }
}));

describe('Session Timeout', () => {
    // Original window.location
    let originalLocation;
    
    // Mock timers
    beforeEach(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: jest.fn(),
                getItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });
        
        // Mock window.location
        originalLocation = window.location;
        delete window.location;
        window.location = { href: '/survey.html', pathname: '/survey.html' };
        
        // Mock window.alert
        window.alert = jest.fn();
        
        // Mock document.addEventListener
        document.addEventListener = jest.fn();
        
        // Use fake timers
        jest.useFakeTimers();
        
        // Reset auth module properties
        auth.activityTimer = null;
        auth.refreshInterval = null;
    });
    
    afterEach(() => {
        // Restore timers
        jest.useRealTimers();
        
        // Restore window.location
        window.location = originalLocation;
        
        // Clear all mocks
        jest.clearAllMocks();
    });
    
    test('should set up session timeout on init for protected pages', () => {
        // Setup spies
        const setupActivityListenersSpy = jest.spyOn(auth, 'setupActivityListeners');
        const resetInactivityTimerSpy = jest.spyOn(auth, 'resetInactivityTimer');
        const setupTokenRefreshSpy = jest.spyOn(auth, 'setupTokenRefresh');
        
        // Run init
        auth.initSessionTimeout();
        
        // Verify setup methods were called
        expect(setupActivityListenersSpy).toHaveBeenCalled();
        expect(resetInactivityTimerSpy).toHaveBeenCalled();
        expect(setupTokenRefreshSpy).toHaveBeenCalled();
    });
    
    test('should not set up session timeout on login page', () => {
        // Set location to login page
        window.location.pathname = '/index.html';
        window.location.href = '/index.html';
        
        // Setup spies
        const setupActivityListenersSpy = jest.spyOn(auth, 'setupActivityListeners');
        
        // Run init
        auth.initSessionTimeout();
        
        // Verify setup methods were not called
        expect(setupActivityListenersSpy).not.toHaveBeenCalled();
    });
    
    test('should handle user activity and reset inactivity timer', () => {
        // Setup spy
        const resetInactivityTimerSpy = jest.spyOn(auth, 'resetInactivityTimer');
        
        // Initialize
        auth.setupActivityListeners();
        
        // Verify event listeners were added for each activity event
        expect(document.addEventListener).toHaveBeenCalledTimes(4); // mousedown, keydown, touchstart, scroll
        
        // Get the callback function from the first call
        const activityCallback = document.addEventListener.mock.calls[0][1];
        
        // Trigger the callback
        activityCallback();
        
        // Verify reset was called
        expect(resetInactivityTimerSpy).toHaveBeenCalled();
    });
    
    test('should logout user after inactivity timeout', async () => {
        // Import the mocked supabase client
        const { supabase } = require('../src/client.js');
        
        // Initialize timeout
        auth.resetInactivityTimer();
        
        // Fast-forward time to just after timeout
        jest.advanceTimersByTime(auth.inactivityTimeout + 100);
        
        // Wait for promises to resolve
        await Promise.resolve();
        
        // Verify signOut was called
        expect(supabase.auth.signOut).toHaveBeenCalled();
        
        // Verify localStorage items were removed
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('participant_id');
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('survey_id');
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('cohort_id');
        
        // Verify alert was shown
        expect(window.alert).toHaveBeenCalledWith(
            'Your session has expired due to inactivity. Please log in again.'
        );
        
        // Verify redirect
        expect(window.location.href).toBe('/');
    });
    
    test('should refresh token periodically when user is active', async () => {
        // Import the mocked supabase client
        const { supabase } = require('../src/client.js');
        
        // Initialize token refresh
        auth.setupTokenRefresh();
        
        // Fast-forward time to just after refresh interval
        jest.advanceTimersByTime(50 * 60 * 1000 + 100); // 50 minutes + 100ms
        
        // Wait for promises to resolve
        await Promise.resolve();
        
        // Verify getSession was called
        expect(supabase.auth.getSession).toHaveBeenCalled();
    });
    
    test('should handle token refresh error and logout user', async () => {
        // Import the mocked supabase client
        const { supabase } = require('../src/client.js');
        
        // Mock getSession to return an error
        supabase.auth.getSession.mockResolvedValueOnce({
            data: { session: null },
            error: new Error('Session expired')
        });
        
        // Spy on handleInactivity
        const handleInactivitySpy = jest.spyOn(auth, 'handleInactivity');
        
        // Initialize token refresh
        auth.setupTokenRefresh();
        
        // Fast-forward time to just after refresh interval
        jest.advanceTimersByTime(50 * 60 * 1000 + 100); // 50 minutes + 100ms
        
        // Wait for promises to resolve
        await Promise.resolve();
        
        // Verify handleInactivity was called
        expect(handleInactivitySpy).toHaveBeenCalled();
    });
}); 