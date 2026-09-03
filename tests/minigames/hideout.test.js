const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Hideout Breakthrough Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startHideoutBreakthrough should initialize grid of 12 numbers', () => {
        const state = game.startHideoutBreakthrough();
        expect(state.grid.length).toBe(12);
        expect(state.revealed.length).toBe(12);
        expect(state.pickCount).toBe(0);
        expect(state.isActive).toBe(true);
    });

    test('playHideoutBreakthroughRound should handle successful pick', () => {
        game.startHideoutBreakthrough();

        // First pick is always successful
        const result = game.playHideoutBreakthroughRound(0);

        expect(result.success).toBe(true);
        expect(game.hideoutBreakthroughState.pickCount).toBe(1);
        expect(game.hideoutBreakthroughState.accumulatedReward).toBe(20000);
    });

    test('should game over if second pick is lower than first', () => {
        game.startHideoutBreakthrough();

        // Mock grid to force failure scenario
        game.hideoutBreakthroughState.grid = [10, 5, ...Array(10).fill(11)];

        game.playHideoutBreakthroughRound(0); // First pick: 10
        const result = game.playHideoutBreakthroughRound(1); // Second pick: 5 (lower)

        expect(result.success).toBe(false);
        expect(result.gameOver).toBe(true);
    });

    test('should win if pick all ascending numbers successfully', () => {
        game.startHideoutBreakthrough();

        // Mock grid for winning scenario
        game.hideoutBreakthroughState.grid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        // Play ascending picks
        for (let i = 0; i < 6; i++) {
            game.playHideoutBreakthroughRound(i);
        }

        expect(game.hideoutBreakthroughState.won).toBe(true);
        expect(game.hideoutBreakthroughState.isActive).toBe(false);
    });
});
