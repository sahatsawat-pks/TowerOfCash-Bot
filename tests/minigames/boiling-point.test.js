const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Boiling Point Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startBoilingPoint should initialize grid', () => {
        const state = game.startBoilingPoint();
        expect(state.grid).toBeDefined();
        expect(state.grid.length).toBe(9); // Grid has 9 elements
        expect(state.currentTemp).toBeGreaterThanOrEqual(0);
        expect(state.currentTemp).toBeLessThanOrEqual(100);
        expect(state.isActive).toBe(true);
    });

    test('playBoilingPointAction should adjust temperature', () => {
        game.startBoilingPoint();
        const startTemp = 50;
        game.boilingPointState.temperature = startTemp;

        // Mock random to give consistent change
        jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 * 20 = 10 + 10 = 20 change

        const result = game.playBoilingPointAction('hotter');

        expect(result.temperature).toBeGreaterThan(startTemp);
        expect(game.boilingPointState.temperature).toBeGreaterThan(startTemp);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should win if temperature reaches 100', () => {
        game.startBoilingPoint();
        game.boilingPointState.temperature = 90;

        // Mock random for +10 change
        jest.spyOn(Math, 'random').mockReturnValue(0); // Min change
        // We need to ensure logic adds enough to reach 100
        // Actually logic is: change = Math.floor(Math.random() * 20) + 10;
        // So min change is 10. 90 + 10 = 100.

        const result = game.playBoilingPointAction('hotter');

        expect(result.gameOver).toBe(true);
        expect(result.result).toBe('win');
        expect(game.totalMoney).toBeGreaterThan(50000); // Should award money
    });

    test('should lose if temperature drops to 0', () => {
        game.startBoilingPoint();
        game.boilingPointState.temperature = 10;

        // Min change is 10. 10 - 10 = 0.
        jest.spyOn(Math, 'random').mockReturnValue(0);

        const result = game.playBoilingPointAction('colder');

        expect(result.gameOver).toBe(true);
        expect(result.result).toBe('loss');
        expect(game.totalMoney).toBe(0); // Lose all money
    });
});
