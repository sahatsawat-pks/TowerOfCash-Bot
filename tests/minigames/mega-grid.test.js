const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Mega Grid Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startMegaGrid should initialize 25 tiles', () => {
        const state = game.startMegaGrid();
        expect(state.grid.length).toBe(25);
        expect(state.currentRound).toBe(0); // Not 'picks'
        expect(state.multiplier).toBeGreaterThan(0);
        expect(state.isActive).toBe(true);

        // Check grid contains black and gold tiles
        const blackTiles = state.grid.filter(t => t === 'black');
        const goldTiles = state.grid.filter(t => t === 'gold');
        expect(blackTiles.length + goldTiles.length).toBe(25);
    });

    test('playMegaGridRound should handle black tile (game over)', () => {
        game.startMegaGrid();

        // Find a black tile
        const index = game.megaGridState.grid.findIndex(t => t === 'black');

        const result = game.playMegaGridRound(index);

        expect(result.tile).toBe('black');
        expect(result.gameOver).toBe(true);
        expect(game.megaGridState.isActive).toBe(false);
    });

    test('playMegaGridRound should handle gold tile (safe)', () => {
        game.startMegaGrid();

        // Find a gold tile
        const index = game.megaGridState.grid.findIndex(t => t === 'gold');

        const result = game.playMegaGridRound(index);

        expect(result.tile).toBe('gold');
        expect(result.won).toBe(true);
        expect(result.gameOver).toBe(false);
        expect(game.megaGridState.accumulatedReward).toBeGreaterThan(0);
    });

    test('should complete after max rounds', () => {
        game.startMegaGrid();

        // Set to max rounds - 1
        game.megaGridState.currentRound = 4;

        // Play final round with gold tile
        const goldIndex = game.megaGridState.grid.findIndex(t => t === 'gold');
        const result = game.playMegaGridRound(goldIndex);

        expect(game.megaGridState.isActive).toBe(false);
        expect(game.totalMoney).toBeGreaterThan(50000); // Won money
    });
});
