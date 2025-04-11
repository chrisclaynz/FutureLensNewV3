import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { results } from '../src/results.js';

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
        results.init();
        expect(console.log).toHaveBeenCalledWith('Results module initialized');
    });

    test('should display results', () => {
        results.displayResults();
        expect(console.log).toHaveBeenCalledWith('Displaying results');
    });
}); 