const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('The Vault Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startVault should generate 4-digit code', () => {
        const state = game.startVault();
        expect(state.code.length).toBe(4);
        expect(state.guesses).toBe(0);
        expect(state.maxGuesses).toBe(10);
        expect(state.isActive).toBe(true);

        // Check if code contains only digits
        expect(/^\d{4}$/.test(state.code)).toBe(true);
    });

    test('playVaultGuess should handle correct guess', () => {
        game.startVault();
        const correctCode = game.vaultState.code;

        const result = game.playVaultGuess(correctCode);

        expect(result.correct).toBe(true);
        expect(result.gameOver).toBe(true);
        expect(game.totalMoney).toBe(100000); // 50k + 50k reward
    });

    test('playVaultGuess should handle incorrect guess', () => {
        game.startVault();
        const correctCode = game.vaultState.code;
        // Generate wrong code
        let wrongCode = '0000';
        if (correctCode === '0000') wrongCode = '1111';

        const result = game.playVaultGuess(wrongCode);

        expect(result.correct).toBe(false);
        expect(result.gameOver).toBe(false);
        expect(game.vaultState.guesses).toBe(1);
    });

    test('should game over after max guesses', () => {
        game.startVault();
        const correctCode = game.vaultState.code;
        let wrongCode = '0000';
        if (correctCode === '0000') wrongCode = '1111';

        // Use up 9 guesses
        game.vaultState.guesses = 9;

        const result = game.playVaultGuess(wrongCode);

        expect(result.correct).toBe(false);
        expect(result.gameOver).toBe(true);
        expect(game.totalMoney).toBe(25000); // 50k / 2 penalty
    });
});
