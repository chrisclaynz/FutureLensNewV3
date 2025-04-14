module.exports = {
  transform: {
    "^.+\\.[t|j]sx?$": ["babel-jest", { configFile: './test/babel.config.cjs' }]
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
  testEnvironment: 'jsdom',
  setupFiles: ['./test/jest.setup.cjs']
}; 