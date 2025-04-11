import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { survey } from '../src/survey.js';

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
        survey.init();
        expect(console.log).toHaveBeenCalledWith('Survey module initialized');
    });

    test('should display next question', () => {
        survey.displayNextQuestion();
        expect(console.log).toHaveBeenCalledWith('Displaying next question');
    });
}); 