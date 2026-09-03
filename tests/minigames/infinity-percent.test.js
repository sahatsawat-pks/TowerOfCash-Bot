const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('The Infinity Percent Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });


    // Note: Removed floor-based test as actual implementation uses strikes/accumulatedPercent logic

    test('playInfinityPercentRound should handle correct guess (accumulate)', () => {
        game.startInfinityPercent();

        // Mock Math.random to ensure win (logic: < 0.5 is win)
        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = game.playInfinityPercentRound('left');

        expect(result.isCorrect).toBe(true);
        expect(game.infinityPercentState.accumulatedPercent).toBe(5);
        expect(game.infinityPercentState.strikes).toBe(0);
    });

    test('playInfinityPercentRound should handle incorrect guess (strike)', () => {
        game.startInfinityPercent();

        // Mock Math.random to ensure loss (logic: > 0.5 is loss)
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        const result = game.playInfinityPercentRound('left');

        expect(result.isCorrect).toBe(false);
        expect(game.infinityPercentState.strikes).toBe(1);
    });

    test('should game over after 3 strikes', () => {
        game.startInfinityPercent();
        game.infinityPercentState.strikes = 2;

        jest.spyOn(Math, 'random').mockReturnValue(0.9); // Loss

        const result = game.playInfinityPercentRound('left');

        expect(result.gameOver).toBe(true);
        expect(game.infinityPercentState.isActive).toBe(false);
    });
});
