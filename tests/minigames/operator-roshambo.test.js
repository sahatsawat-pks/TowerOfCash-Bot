const GameManager = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Operator Roshambo Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000; // Start with some money
    });

    test('startOperatorRoshambo should initialize state', () => {
        const state = game.startOperatorRoshambo();
        expect(state.currentRound).toBe(0);
        expect(state.totalRounds).toBe(6);
        expect(state.wins).toBe(0);
        expect(state.losses).toBe(0);
        expect(state.accumulatedMoney).toBe(0);
        expect(state.isActive).toBe(true);
    });

    test('playOperatorRoshamboRound should handle WIN correctly', () => {
        game.startOperatorRoshambo();

        // Mock Math.random to force Operator to choose Scissors (index 2)
        // choices = ['rock', 'paper', 'scissors']
        jest.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 * 3 = 2.7 -> floor = 2 (Scissors)

        const result = game.playOperatorRoshamboRound('rock'); // Rock beats Scissors

        expect(result.result).toBe('win');
        expect(result.wins).toBe(1);
        expect(result.accumulatedMoney).toBe(30000);
        expect(game.operatorRoshamboState.accumulatedMoney).toBe(30000);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('playOperatorRoshamboRound should handle LOSS correctly (divide by 10)', () => {
        game.startOperatorRoshambo();
        game.operatorRoshamboState.accumulatedMoney = 50000;

        // Mock Math.random to force Operator to choose Paper (index 1)
        jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 * 3 = 1.5 -> floor = 1 (Paper)

        const result = game.playOperatorRoshamboRound('rock'); // Rock loses to Paper

        expect(result.result).toBe('loss');
        expect(result.losses).toBe(1);
        expect(result.accumulatedMoney).toBe(5000); // 50000 / 10

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('playOperatorRoshamboRound should handle TIE correctly', () => {
        game.startOperatorRoshambo();
        game.operatorRoshamboState.accumulatedMoney = 10000;

        // Mock Math.random to force Operator to choose Rock (index 0)
        jest.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 * 3 = 0.3 -> floor = 0 (Rock)

        const result = game.playOperatorRoshamboRound('rock'); // Rock ties Rock

        expect(result.result).toBe('tie');
        expect(result.accumulatedMoney).toBe(10000); // No change

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should award $2M jackpot on perfect 6/6 wins', () => {
        game.startOperatorRoshambo();

        // Force 6 wins
        for (let i = 0; i < 6; i++) {
            // Operator chooses Scissors (2), Player chooses Rock
            jest.spyOn(Math, 'random').mockReturnValue(0.9);
            game.playOperatorRoshamboRound('rock');
        }

        expect(game.operatorRoshamboState.wins).toBe(6);
        expect(game.operatorRoshamboState.accumulatedMoney).toBe(2000000);
        expect(game.totalMoney).toBe(2050000); // 50k start + 2M

        jest.spyOn(Math, 'random').mockRestore();
    });
});
