// Survey module
const survey = {
    init() {
        console.log('Survey module initialized');
    },

    displayNextQuestion() {
        // Will be implemented later
        console.log('Displaying next question');
    }
};

// Initialize survey module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    survey.init();
});

// Export the survey object
module.exports = { survey }; 