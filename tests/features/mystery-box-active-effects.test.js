const { GameState, GameManager } = require('../../gameManager');
const config = require('../../config.json');

describe('Mystery Box Active Effects', () => {
    let game;
    let gameManager;

    beforeEach(() => {
        gameManager = new GameManager();
        game = new GameState('user1', 'User 1', 'channel1', 'guild1');
        game.totalMoney = 10000;
        game.preGeneratedFloors = {
            1: { left: { type: 'cash', value: 1000 }, right: { type: 'cash', value: -1000 } },
            2: { left: { type: 'game_over', label: 'Game Over' }, right: { type: 'cash', value: 5000 } }
        };
        game.selectedFloors = [1, 2];
        game.currentFloor = 0;
    });

    test('doubleRewards3 should double positive cash', () => {
        game.activeEffects = [{ type: 'doubleRewards3', floorsRemaining: 3 }];
        const amount = { type: 'cash', value: 5000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(10000);
        expect(game.totalMoney).toBe(20000); // 10k + 10k
    });

    test('invertNext should invert positive cash', () => {
        game.activeEffects = [{ type: 'invertNext', floorsRemaining: 1 }];
        const amount = { type: 'cash', value: 5000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(-5000);
        expect(game.totalMoney).toBe(5000); // 10k - 5k
    });

    test('noLoss4 should prevent negative cash', () => {
        game.activeEffects = [{ type: 'noLoss4', floorsRemaining: 4 }];
        const amount = { type: 'cash', value: -5000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(0);
        expect(game.totalMoney).toBe(10000); // Unchanged
    });

    test('convertNothing3 should convert nothing to 25k', () => {
        game.activeEffects = [{ type: 'convertNothing3', floorsRemaining: 3 }];
        const amount = { type: 'nothing', label: 'Nothing' };
        const result = game.applyAmount(amount);
        expect(result.type).toBe('cash');
        expect(result.value).toBe(25000);
        expect(game.totalMoney).toBe(35000);
    });

    test('skipNextFloor should skip floor processing', async () => {
        game.activeEffects = [{ type: 'skipNextFloor', floorsRemaining: 1 }];
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.skipped).toBe(true);
        expect(game.currentFloor).toBe(1); // Advanced
        expect(game.totalMoney).toBe(10000); // Unchanged
    });

    test('reverseChoice should swap left and right', async () => {
        game.activeEffects = [{ type: 'reverseChoice', floorsRemaining: 1 }];
        // Floor 1: Left is +1000, Right is -1000
        // Choosing 'left' should give 'right' (-1000)
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.amount.value).toBe(-1000);
        expect(game.totalMoney).toBe(9000);
    });

    test('gameOverImmunity should prevent game over', async () => {
        game.activeEffects = [{ type: 'gameOverImmunity', floorsRemaining: 1 }];
        game.currentFloor = 1; // Floor 2
        // Floor 2 Left is Game Over
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.gameOver).toBeFalsy();
        expect(game.isActive).toBe(true);
    });

    test('guaranteedPositive5 should replace bad choices', () => {
        game.activeEffects = [{ type: 'guaranteedPositive5', floorsRemaining: 5 }];
        game.preGeneratedFloors[1] = {
            left: { type: 'cash', value: -1000 },
            right: { type: 'game_over', label: 'Game Over' }
        };
        const choices = gameManager.generateFloorChoices(game);
        expect(choices.left.value).toBe(10000); // Replaced
    });

    test('autoWinMinigame should force win in Mega Grid', () => {
        game.activeEffects = [{ type: 'autoWinMinigame', floorsRemaining: 1 }];
        game.startMegaGrid();
        expect(game.megaGridState.autoWin).toBe(true);

        // Mock grid to have black tile at index 0
        game.megaGridState.grid[0] = 'black';

        const result = game.playMegaGridRound(0);
        expect(result.tile).toBe('gold'); // Forced swap
        expect(result.won).toBe(true);
    });
});
