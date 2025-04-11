export default {
    testEnvironment: 'jsdom',
    setupFiles: ['dotenv/config', '<rootDir>/test/setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testMatch: ['**/test/**/*.test.js'],
    transform: {
        '^.+\\.js$': ['babel-jest', {
            presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
            plugins: [
                ['babel-plugin-transform-import-meta', {
                    module: 'ES6'
                }]
            ]
        }]
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@supabase/supabase-js)/)'
    ],
    moduleFileExtensions: ['js', 'json', 'node']
}; 