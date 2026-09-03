const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Active Effects System', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
    });

    test('hasActiveEffect should return true if effect exists', () => {
        game.activeEffects = [{ type: 'testEffect', duration: 3 }];
        expect(game.hasActiveEffect('testEffect')).toBe(true);
        expect(game.hasActiveEffect('otherEffect')).toBe(false);
    });

    test('decrementActiveEffects should reduce duration and remove expired effects', () => {
        game.activeEffects = [
            { type: 'longEffect', floorsRemaining: 2 },
            { type: 'shortEffect', floorsRemaining: 1 }
        ];

        game.decrementActiveEffects();

        expect(game.activeEffects.length).toBe(1);
        expect(game.activeEffects[0].type).toBe('longEffect');
        expect(game.activeEffects[0].floorsRemaining).toBe(1);
    });

    test('canCashout should return false if noBankCashout is active (Rusty Trap)', () => {
        game.activeEffects = [{ type: 'noBankCashout', floorsRemaining: 5 }];
        expect(game.canCashout()).toBe(false);

        game.activeEffects = [];
        expect(game.canCashout()).toBe(true);
    });

    test('canBank should return false if noBankCashout is active', () => {
        game.activeEffects = [{ type: 'noBankCashout', floorsRemaining: 5 }];
        expect(game.canBank()).toBe(false);

        game.activeEffects = [];
        expect(game.canBank()).toBe(true);
    });

    test('applyDevilsContract should consume the effect and return true', () => {
        game.activeEffects = [{ type: 'hardModeNext', duration: 1 }];

        const result = game.applyDevilsContract();

        expect(result).toBe(true);
        expect(game.hasActiveEffect('hardModeNext')).toBe(false); // Should be removed
    });
});
