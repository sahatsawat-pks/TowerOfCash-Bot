const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Babushka Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startBabushka should initialize 12 dolls with values', () => {
        const state = game.startBabushka();
        expect(state.dolls.length).toBe(12);
        expect(state.strikes).toBe(0);
        expect(state.accumulatedMoney).toBe(0);

        // Check doll values (dolls are numbers)
        const emptyDolls = state.dolls.filter(d => d === 0);
        const valueDolls = state.dolls.filter(d => d > 0);

        expect(emptyDolls.length).toBe(2);
        expect(valueDolls.length).toBe(10);
    });

    test('selectBabushkaDoll should start revealing process', () => {
        game.startBabushka();

        // Find a value doll
        const valueDollIndex = game.babushkaState.dolls.findIndex(d => d > 0);

        const result = game.selectBabushkaDoll(valueDollIndex);

        expect(result.selected).toBe(true);
        expect(game.babushkaState.isRevealing).toBe(true);
    });

    test('revealBabushkaLayer should reveal layer value', () => {
        game.startBabushka();
        const valueDollIndex = game.babushkaState.dolls.findIndex(d => d > 0);
        game.selectBabushkaDoll(valueDollIndex);

        const result = game.revealBabushkaLayer();

        expect(result.layer).toBe(1);
        expect(result.layerValue).toBeGreaterThan(0);
        expect(game.babushkaState.currentDollValue).toBeGreaterThan(0);
    });

    test('should handle empty doll (strike) on reveal', () => {
        game.startBabushka();

        // Find an empty doll
        const emptyDollIndex = game.babushkaState.dolls.findIndex(d => d === 0);

        game.selectBabushkaDoll(emptyDollIndex);
        const result = game.revealBabushkaLayer();

        expect(result.isEmpty).toBe(true);
        expect(game.babushkaState.strikes).toBe(1);
    });

    test('bankBabushka should store accumulated money', () => {
        game.startBabushka();
        game.babushkaState.currentDollValue = 50000;
        game.babushkaState.isChoosing = true; // Required for bankBabushka to work

        const result = game.bankBabushka();

        expect(result).not.toBeNull();
        expect(game.babushkaState.accumulatedMoney).toBe(50000);
        expect(game.babushkaState.currentDollValue).toBe(0);
        // Note: totalMoney is only updated when minigame completes, not during banking
        expect(game.totalMoney).toBe(50000); // Still original amount
    });

    test('should game over after 3 strikes', () => {
        game.startBabushka();

        // Force 2 strikes
        game.babushkaState.strikes = 2;
        const emptyDollIndex = game.babushkaState.dolls.findIndex(d => d === 0);

        game.selectBabushkaDoll(emptyDollIndex);
        const result = game.revealBabushkaLayer();

        expect(result.gameOver).toBe(true);
        expect(game.babushkaState.isActive).toBe(false);
    });
});
