export default {
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest"
    },
    transformIgnorePatterns: [
        "node_modules/(?!(uuid)/)"
    ],
    moduleNameMapper: {
        // Mock CSS imports
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        // Handle import.meta
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    // Handle .js files as ESM
    extensionsToTreatAsEsm: ['.js'],
    testEnvironment: 'jsdom',
    setupFiles: ['./jest.setup.js']
}; 