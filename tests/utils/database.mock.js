// Mock database module
const mockDb = {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateStats: jest.fn(),
    getLeaderboard: jest.fn(),
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
};

module.exports = mockDb;
