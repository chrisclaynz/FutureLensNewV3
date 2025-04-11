describe('App Module', () => {
    test('should initialize properly', () => {
        const { app } = require('../app.js');
        app.init();
        expect(console.log).toHaveBeenCalledWith('FutureLens application initialized');
    });
}); 