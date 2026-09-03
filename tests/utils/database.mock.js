// Mock database module
const mockDb = {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateStats: jest.fn(),
    getLeaderboard: jest.fn(),
    getEventMode: jest.fn().mockResolvedValue(false), // Default to false
    deductBail: jest.fn().mockResolvedValue({ oldScore: 10000000, newScore: 5000000, deducted: 5000000 }),
    executeTheHeist: jest.fn().mockResolvedValue({ totalStolen: 1000000, victimsCount: 1, victims: [] }),
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
};

module.exports = mockDb;
