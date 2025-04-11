// Sample test for auth module
describe('Auth Module', () => {
    let originalConsoleLog;
    let mockForm;
    let mockGetElementById;

    beforeEach(() => {
        originalConsoleLog = console.log;
        console.log = jest.fn();
        
        // Mock document.getElementById
        mockGetElementById = jest.fn();
        document.getElementById = mockGetElementById;
        
        // Mock form element
        mockForm = {
            addEventListener: jest.fn()
        };
        mockGetElementById.mockReturnValue(mockForm);
    });

    afterEach(() => {
        console.log = originalConsoleLog;
    });

    test('should initialize properly', () => {
        const auth = require('../auth.js').auth;
        auth.init();
        
        expect(mockForm.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
    });

    test('should handle login form submission', () => {
        const auth = require('../auth.js').auth;
        auth.init();
        
        // Get the submit handler
        const submitHandler = mockForm.addEventListener.mock.calls[0][1];
        
        // Mock event
        const mockEvent = {
            preventDefault: jest.fn()
        };
        
        // Mock input element
        const mockInput = {
            value: 'test123'
        };
        mockGetElementById.mockImplementation((id) => {
            if (id === 'passcode') return mockInput;
            return mockForm;
        });
        
        // Call submit handler
        submitHandler(mockEvent);
        
        // Verify event was prevented
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        
        // Verify passcode was logged
        expect(console.log).toHaveBeenCalledWith('Login attempted with passcode:', 'test123');
    });

    test('should handle missing form element gracefully', () => {
        mockGetElementById.mockReturnValue(null);
        
        const auth = require('../auth.js').auth;
        auth.init();
        
        // Should not throw error
        expect(() => auth.init()).not.toThrow();
    });
}); 