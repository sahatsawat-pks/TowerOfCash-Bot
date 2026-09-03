const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('New Mystery Box Items', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 12345;
    });

    test('Cut a front should remove leftmost digit', () => {
        const item = { effect: 'cut_front' };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(2345);
    });

    test('Cut a front should handle single digit (become 0)', () => {
        game.totalMoney = 5;
        const item = { effect: 'cut_front' };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(0);
    });

    test('SALT should do nothing', () => {
        const startMoney = game.totalMoney;
        const item = { effect: 'salt' };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(startMoney);
    });

    test('Tower of cra$h should return reset_leaderboard action', () => {
        const item = { effect: 'reset_leaderboard' };
        const result = game.applyMysteryBoxEffect(item);
        expect(result.action).toBe('reset_leaderboard');
    });

    test('Big Bank should return big_bank action', () => {
        const item = { effect: 'big_bank' };
        const result = game.applyMysteryBoxEffect(item);
        expect(result.action).toBe('big_bank');
    });

    test('Repeat should return repeat_game action', () => {
        const item = { effect: 'repeat_game' };
        const result = game.applyMysteryBoxEffect(item);
        expect(result.action).toBe('repeat_game');
    });

    test('Dice Roll should modify money correctly', () => {
        game.totalMoney = 30000;
        const item = { effect: 'diceRoll' };
        // Mock Math.random to return 3 (roll = 4)
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        game.applyMysteryBoxEffect(item);
        // Roll = 4. Money = 30000 * 4 / 3 = 40000
        expect(game.totalMoney).toBe(40000);
        jest.restoreAllMocks();
    });

    test('Restart Round should reset round state', () => {
        game.currentRound = 3;
        game.currentFloor = 5;
        const item = { effect: 'restartRound' };
        game.applyMysteryBoxEffect(item);
        expect(game.currentRound).toBe(1);
        expect(game.currentFloor).toBe(0);
    });

    test('Swap Money should change money', () => {
        game.totalMoney = 250001;
        const item = { effect: 'swapMoney' };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(150002);
    });

    test('Random Minigame should return action', () => {
        const item = { effect: 'randomMinigame' };
        const result = game.applyMysteryBoxEffect(item);
        expect(result.action).toBe('random_minigame');
    });

    test('FOMO Reveal should be present in selectMysteryBox result', () => {
        game.startMysteryBox();
        const result = game.selectMysteryBox(0);
        expect(result.unselectedBoxes).toHaveLength(3);
        expect(result.unselectedBoxes[0]).toHaveProperty('name');
        expect(result.unselectedBoxes[0]).toHaveProperty('emoji');
    });

    test('selectMysteryBox should propagate special action', () => {
        game.startMysteryBox();
        // Force one box to be Tower of cra$h
        game.mysteryBoxState.boxes[0] = { effect: 'reset_leaderboard' };

        const result = game.selectMysteryBox(0);
        expect(result.specialAction).toBe('reset_leaderboard');
    });

    test('Go to Jail should bust player with 0 money and return go_to_jail action with 5M bail', () => {
        game.totalMoney = 1500000;
        const item = { effect: 'go_to_jail' };
        const result = game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(0);
        expect(result.action).toBe('go_to_jail');
        expect(result.bailAmount).toBe(5000000);
    });

    test('The Heist should return the_heist action', () => {
        const item = { effect: 'the_heist' };
        const result = game.applyMysteryBoxEffect(item);
        expect(result.action).toBe('the_heist');
    });

    test('Item pool should contain go_to_jail in bad and the_heist in good', () => {
        const pool = game.getMysteryBoxItemPool();
        expect(pool.bad.some(i => i.id === 'go_to_jail')).toBe(true);
        expect(pool.good.some(i => i.id === 'the_heist')).toBe(true);
    });
});
