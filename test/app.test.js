import { app } from '../src/app.js';

describe('App Module', () => {
    beforeEach(() => {
        console.log = jest.fn();
    });

    test('should initialize properly', () => {
        app.init();
        expect(console.log).toHaveBeenCalledWith('FutureLens application initialized');
    });
}); 