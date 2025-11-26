module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'gameManager.js',
        'gameUI.js',
        'database.js',
        'index.js',
        '!node_modules/**',
        '!coverage/**'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    verbose: true,
    testTimeout: 10000
};
