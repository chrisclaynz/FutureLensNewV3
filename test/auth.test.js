import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { auth } from '../src/auth.js';

// Sample test for auth module
describe('Auth Module', () => {
    let mockForm;
    let mockGetElementById;

    beforeEach(() => {
        mockForm = {
            addEventListener: jest.fn()
        };
        mockGetElementById = jest.fn().mockReturnValue(mockForm);
        global.document.getElementById = mockGetElementById;
    });

    test('should initialize properly', () => {
        auth.init();
        expect(mockForm.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
    });

    test('should handle login form submission', () => {
        auth.init();
        
        // Get the submit handler
        const submitHandler = mockForm.addEventListener.mock.calls[0][1];
        
        // Mock event
        const mockEvent = {
            preventDefault: jest.fn(),
            target: {
                elements: {
                    passcode: {
                        value: 'test123'
                    }
                }
            }
        };
        
        // Call the handler
        submitHandler(mockEvent);
        
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should handle missing form element gracefully', () => {
        mockGetElementById.mockReturnValue(null);
        
        auth.init();
        
        // Should not throw error
        expect(mockForm.addEventListener).not.toHaveBeenCalled();
    });
}); 