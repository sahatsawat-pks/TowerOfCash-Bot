const { GameState, GameManager } = require('../../gameManager');
const config = require('../../config.json');

describe('Mystery Box Active Effects - Complete Coverage', () => {
    let game;
    let gameManager;

    beforeEach(() => {
        gameManager = new GameManager();
        game = new GameState('user1', 'User 1', 'channel1', 'guild1');
        game.totalMoney = 50000;
        game.preGeneratedFloors = {
            1: { left: { type: 'cash', value: 10000 }, right: { type: 'cash', value: -5000 } },
            2: { left: { type: 'nothing', label: 'Nothing' }, right: { type: 'cash', value: 5000 } },
            3: { left: { type: 'game_over', label: 'Game Over' }, right: { type: 'cash', value: 1000 } },
            4: { left: { type: 'cash', value: 2000 }, right: { type: 'cash', value: 3000 } },
            5: { left: { type: 'cash', value: 4000 }, right: { type: 'cash', value: 5000 } }
        };
        game.selectedFloors = [1, 2, 3, 4, 5];
        game.currentFloor = 0;
    });

    // GOOD EFFECTS
    test('gameOverImmunity - protects from game over tile', async () => {
        game.activeEffects = [{ type: 'gameOverImmunity', floorsRemaining: 1 }];
        game.currentFloor = 2; // Game Over floor
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.gameOver).toBeFalsy();
        expect(game.isActive).toBe(true);
    });

    test('doubleRewards3 - doubles positive cash for 3 floors', () => {
        game.activeEffects = [{ type: 'doubleRewards3', floorsRemaining: 3 }];
        const amount = { type: 'cash', value: 10000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(20000);
        expect(game.totalMoney).toBe(70000); // 50k + 20k
    });

    test('guaranteedPositive5 - ensures positive choices', () => {
        game.activeEffects = [{ type: 'guaranteedPositive5', floorsRemaining: 5 }];
        game.preGeneratedFloors[1] = {
            left: { type: 'cash', value: -10000 },
            right: { type: 'game_over', label: 'Game Over' }
        };
        const choices = gameManager.generateFloorChoices(game);
        expect(choices.left.value).toBe(10000); // Replaced with positive
    });

    test('autoRevive - prevents game over from bankruptcy at round end', async () => {
        game.activeEffects = [{ type: 'autoRevive', floorsRemaining: 1 }];
        game.totalMoney = 5000;
        game.selectedFloors = [1];
        game.currentFloor = 0;
        game.currentRound = 1;
        game.preGeneratedFloors[1] = {
            left: { type: 'cash', value: -10000 },
            right: { type: 'cash', value: 1000 }
        };
        const result = await gameManager.handleFloorSelection(game, 'left');
        // autoRevive saves from bankruptcy at end of round
        if (result.roundComplete) {
            expect(game.totalMoney).toBe(1); // Given $1 instead of game over
            expect(result.gameOver).toBeFalsy();
        } else {
            // During round, money can go negative
            expect(game.totalMoney).toBeLessThan(0);
        }
    });

    test('tripleNextFloor - triples positive cash', () => {
        game.activeEffects = [{ type: 'tripleNextFloor', floorsRemaining: 1 }];
        const amount = { type: 'cash', value: 10000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(30000);
        expect(game.totalMoney).toBe(80000);
    });

    test('autoWinMinigame - forces win in Mega Grid', () => {
        game.activeEffects = [{ type: 'autoWinMinigame', floorsRemaining: 1 }];
        game.startMegaGrid();
        game.megaGridState.grid[0] = 'black'; // Should be converted to gold
        const result = game.playMegaGridRound(0);
        expect(result.tile).toBe('gold');
        expect(result.won).toBe(true);
    });

    test('convertNothing3 - converts nothing to $25k', () => {
        game.activeEffects = [{ type: 'convertNothing3', floorsRemaining: 3 }];
        const amount = { type: 'nothing', label: 'Nothing' };
        const result = game.applyAmount(amount);
        expect(result.type).toBe('cash');
        expect(result.value).toBe(25000);
    });

    test('noLoss4 - prevents negative cash changes', () => {
        game.activeEffects = [{ type: 'noLoss4', floorsRemaining: 4 }];
        const amount = { type: 'cash', value: -10000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(0);
        expect(game.totalMoney).toBe(50000); // Unchanged
    });

    // BAD EFFECTS
    test('reverseChoice - swaps left and right', async () => {
        game.activeEffects = [{ type: 'reverseChoice', floorsRemaining: 1 }];
        // Floor 1: Left = +10k, Right = -5k
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.amount.value).toBe(-5000); // Got right instead
    });

    test('lose10k3 - loses $10k per floor for 3 floors', async () => {
        game.activeEffects = [{ type: 'lose10k3', floorsRemaining: 3 }];
        const moneyBefore = game.totalMoney;
        await gameManager.handleFloorSelection(game, 'left');
        expect(game.totalMoney).toBe(moneyBefore + 10000 - 10000); // +10k from floor, -10k from effect
    });

    test('noBankCashout5 - prevents cashout', () => {
        game.activeEffects = [{ type: 'noBankCashout5', floorsRemaining: 5 }];
        expect(game.canCashout()).toBe(false);
        expect(game.canBank()).toBe(false);
    });

    test('hideNext3 - marks choices as hidden', () => {
        game.activeEffects = [{ type: 'hideNext3', floorsRemaining: 3 }];
        const choices = gameManager.generateFloorChoices(game);
        expect(choices.hidden).toBe(true);
    });

    test('halveMultipliers4 - halves boost multiplier', () => {
        game.activeEffects = [{ type: 'halveMultipliers4', floorsRemaining: 4 }];
        const amount = { type: 'special', action: 'boost_multiplier', generatedValue: '2.00' };
        game.totalMoney = 100000;
        const result = game.applyAmount(amount);
        expect(result.actualValue).toBe(1.0); // 2.0 / 2
        expect(game.totalMoney).toBe(100000); // 100k * 1.0
    });

    test('tickingBomb - loses $10k per floor', async () => {
        game.activeEffects = [{ type: 'tickingBomb', floorsRemaining: 2 }];
        const moneyBefore = game.totalMoney;
        await gameManager.handleFloorSelection(game, 'left');
        expect(game.totalMoney).toBe(moneyBefore + 10000 - 10000); // +10k from floor, -10k from bomb
    });

    test('invertNext - inverts positive to negative', () => {
        game.activeEffects = [{ type: 'invertNext', floorsRemaining: 1 }];
        const amount = { type: 'cash', value: 10000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(-10000);
        expect(game.totalMoney).toBe(40000); // 50k - 10k
    });

    test('skipNextFloor - skips floor entirely', async () => {
        game.activeEffects = [{ type: 'skipNextFloor', floorsRemaining: 1 }];
        const result = await gameManager.handleFloorSelection(game, 'left');
        expect(result.skipped).toBe(true);
        expect(game.currentFloor).toBe(1); // Advanced without applying amount
    });

    test('nothingToGameOver3 - converts nothing to game over', () => {
        game.activeEffects = [{ type: 'nothingToGameOver3', floorsRemaining: 3 }];
        const amount = { type: 'nothing', label: 'Nothing' };
        const result = game.applyAmount(amount);
        expect(result.type).toBe('game_over');
    });

    // EFFECT PERSISTENCE
    test('effects persist across multiple floors', async () => {
        game.activeEffects = [{ type: 'doubleRewards3', floorsRemaining: 3 }];

        // Floor 1
        await gameManager.handleFloorSelection(game, 'left');
        expect(game.activeEffects[0].floorsRemaining).toBe(2);

        // Floor 2
        await gameManager.handleFloorSelection(game, 'left');
        expect(game.activeEffects[0].floorsRemaining).toBe(1);
    });

    // EFFECT EXPIRATION
    test('effects expire after duration', async () => {
        game.activeEffects = [{ type: 'doubleRewards3', floorsRemaining: 1 }];

        await gameManager.handleFloorSelection(game, 'left');
        expect(game.activeEffects.length).toBe(0); // Effect removed
    });

    test('multiple effects can be active simultaneously', async () => {
        game.activeEffects = [
            { type: 'doubleRewards3', floorsRemaining: 3 },
            { type: 'noLoss4', floorsRemaining: 4 }
        ];

        const amount = { type: 'cash', value: 10000 };
        const result = game.applyAmount(amount);
        expect(result.value).toBe(20000); // Doubled by doubleRewards

        const negAmount = { type: 'cash', value: -5000 };
        const negResult = game.applyAmount(negAmount);
        expect(negResult.value).toBe(0); // Blocked by noLoss
    });
});
