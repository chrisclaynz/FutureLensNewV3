// Main application initialization
const app = {
    init() {
        console.log('FutureLens application initialized');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Export the app object
module.exports = { app }; 