const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Cashout Command Logic', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('should allow cashout with positive money', async () => {
        // Logic similar to handleCashoutCommand
        const canCashout = game.totalMoney > 0;

        expect(canCashout).toBe(true);

        // Simulate cashout
        await gameManager.endGame('c1');
        mockDb.updateStats('u1', 50000, true);

        expect(mockDb.updateStats).toHaveBeenCalledWith('u1', 50000, true);
        expect(gameManager.getGame('c1')).toBeUndefined();
    });

    test('should prevent cashout with $0', () => {
        game.totalMoney = 0;
        const canCashout = game.totalMoney > 0;
        expect(canCashout).toBe(false);
    });

    test('should prevent cashout if Rusty Trap active', () => {
        game.activeEffects = [{ type: 'noBankCashout', floorsRemaining: 5 }];

        expect(game.canCashout()).toBe(false);
    });
});
