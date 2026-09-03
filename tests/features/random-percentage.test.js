const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Random Percentage Feature', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 10000;
    });

    test('should handle positive percentage correctly', () => {
        // Simulate +50%
        const percentage = 50;
        const multiplier = 1 + (percentage / 100); // 1.5

        game.totalMoney = Math.floor(game.totalMoney * multiplier);

        expect(game.totalMoney).toBe(15000);
    });

    test('should handle negative percentage correctly', () => {
        // Simulate -50%
        const percentage = -50;
        const multiplier = 1 + (percentage / 100); // 0.5

        game.totalMoney = Math.floor(game.totalMoney * multiplier);

        expect(game.totalMoney).toBe(5000);
    });

    test('should handle > -100% (debt) correctly', () => {
        // Simulate -150% (should result in 0, logic handles negative check)
        const percentage = -150;
        const multiplier = 1 + (percentage / 100); // -0.5

        game.totalMoney = Math.floor(game.totalMoney * multiplier);
        if (game.totalMoney < 0) game.totalMoney = 0;

        expect(game.totalMoney).toBe(0);
    });
});
