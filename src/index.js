import { survey } from './survey.js';
import { results } from './results.js';

export const app = {
    async init() {
        console.log('App initialized');
        
        // Check if we're on the results page
        if (window.location.pathname.includes('results.html')) {
            await results.init();
            return;
        }

        // Initialize survey
        await survey.init();
    }
};

// CommonJS export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app };
} 