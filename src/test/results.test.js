describe('Results Module', () => {
    let originalConsoleLog;

    beforeEach(() => {
        originalConsoleLog = console.log;
        console.log = jest.fn();
    });

    afterEach(() => {
        console.log = originalConsoleLog;
    });

    test('should initialize properly', () => {
        const { results } = require('../results.js');
        results.init();
        expect(console.log).toHaveBeenCalledWith('Results module initialized');
    });

    test('should display results', () => {
        const { results } = require('../results.js');
        results.displayResults();
        expect(console.log).toHaveBeenCalledWith('Displaying results');
    });
}); 