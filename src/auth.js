// Authentication module
const auth = {
    init() {
        const form = document.getElementById('passcode-form');
        if (form) {
            form.addEventListener('submit', this.handleLogin);
        }
    },

    handleLogin(event) {
        event.preventDefault();
        const passcode = document.getElementById('passcode').value;
        console.log('Login attempted with passcode:', passcode);
        // Authentication logic will be implemented later
    }
};

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});

// Export the auth object
module.exports = { auth }; 