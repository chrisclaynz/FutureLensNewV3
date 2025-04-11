describe('Survey Module', () => {
    let originalConsoleLog;

    beforeEach(() => {
        originalConsoleLog = console.log;
        console.log = jest.fn();
    });

    afterEach(() => {
        console.log = originalConsoleLog;
    });

    test('should initialize properly', () => {
        const { survey } = require('../survey.js');
        survey.init();
        expect(console.log).toHaveBeenCalledWith('Survey module initialized');
    });

    test('should display next question', () => {
        const { survey } = require('../survey.js');
        survey.displayNextQuestion();
        expect(console.log).toHaveBeenCalledWith('Displaying next question');
    });
}); 