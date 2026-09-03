const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Game Flow Logic', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.currentFloor = 0; // Start at floor 0 index
        game.currentRound = 1;
        // selectedFloors contains the actual floor numbers to use
        game.selectedFloors = [1, 2, 3, 4, 5, 6, 7, 8]; // Floor numbers 1-8
    });

    test('should advance floor on selection', async () => {
        // Setup floor 1 (getCurrentFloorNumber() returns selectedFloors[0] = 1)
        game.totalMoney = 1000; // Set starting money for this test
        game.preGeneratedFloors[1] = {
            left: { type: 'cash', value: 1000 },
            right: { type: 'cash', value: 2000 }
        };

        const result = await gameManager.handleFloorSelection(game, 'left');

        expect(result).not.toBeNull();
        expect(result.amount.value).toBe(1000);
        expect(game.currentFloor).toBe(1); // Increments to next index
        expect(game.totalMoney).toBe(2000); // 1000 start + 1000
    });

    test('should trigger round completion at floor 6 (last of 6)', async () => {
        game.currentFloor = 5; // Index 5 = 6th floor (assuming 6 floors in round 1)
        game.selectedFloors = [1, 2, 3, 4, 5, 6]; // 6 floors in first round
        game.preGeneratedFloors[6] = {
            left: { type: 'cash', value: 1000 },
            right: { type: 'cash', value: 1000 }
        };

        const result = await gameManager.handleFloorSelection(game, 'left');

        expect(result).not.toBeNull();
        expect(result.roundComplete).toBe(true);
        expect(result.round).toBe(1);
    });

    test('should trigger game over if money drops to 0 on last floor of round', async () => {
        game.currentFloor = 5; // Index 5 = 6th floor (last of round)
        game.selectedFloors = [1, 2, 3, 4, 5, 6];
        game.totalMoney = 1000;
        game.preGeneratedFloors[6] = {
            left: { type: 'cash', value: -1000 }, // Lose all money
            right: { type: 'cash', value: 1000 }
        };

        const result = await gameManager.handleFloorSelection(game, 'left');

        expect(result).not.toBeNull();
        expect(game.totalMoney).toBe(0);
        expect(result.gameOver).toBe(true);
        expect(result.reason).toBe('bankrupt_end_round');
    });

    test('should trigger game over on Game Over tile', async () => {
        game.preGeneratedFloors[1] = {
            left: { type: 'game_over', label: 'Game Over' },
            right: { type: 'money', value: 1000 }
        };

        const result = await gameManager.handleFloorSelection(game, 'left');

        expect(result).not.toBeNull();
        expect(result.amount.type).toBe('game_over');
        expect(result.gameOver).toBe(true);
        expect(result.reason).toBe('game_over_tile');
    });
});
