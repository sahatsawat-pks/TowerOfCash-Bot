const GameManager = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Mystery Box Feature', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('getMysteryBoxItemPool should return correct categories and items', () => {
        const pool = game.getMysteryBoxItemPool();
        expect(pool.good).toBeDefined();
        expect(pool.bad).toBeDefined();
        expect(pool.neutral).toBeDefined();
        expect(pool.money).toBeDefined();

        // Check for new items
        const moneyItems = pool.money.map(i => i.id);
        expect(moneyItems).toContain('panty_pant');
        expect(moneyItems).toContain('gold_coin');
        expect(moneyItems).toContain('lottery_ticket');
        expect(moneyItems).toContain('ipad_pro');
        expect(moneyItems).toContain('million_cheque');
    });

    test('startMysteryBox should generate 4 boxes from different categories', () => {
        const state = game.startMysteryBox();
        expect(state.boxes.length).toBe(4);
        expect(state.isActive).toBe(true);
        expect(state.selectedIndex).toBe(-1);

        // Check if boxes have valid items
        state.boxes.forEach(box => {
            expect(box.id).toBeDefined();
            expect(box.category).toBeDefined();
            expect(['good', 'bad', 'neutral', 'money']).toContain(box.category);
        });
    });

    test('selectMysteryBox should apply effect and return results', () => {
        game.startMysteryBox();

        // Mock the first box to be a specific item for testing
        game.mysteryBoxState.boxes[0] = {
            id: 'test_money',
            name: 'Test Money',
            effect: 'addMoney',
            value: 10000,
            category: 'money',
            emoji: '💰',
            desc: 'Test'
        };

        const result = game.selectMysteryBox(0);

        expect(result.selectedItem.id).toBe('test_money');
        expect(result.unselectedBoxes.length).toBe(3);
        expect(game.totalMoney).toBe(60000); // 50k + 10k
        expect(game.mysteryBoxState.isActive).toBe(false);
    });

    test('applyMysteryBoxEffect should handle Lucky Lottery correctly', () => {
        const item = {
            effect: 'addMoney',
            value: () => 500000 // Mock function returning 500k
        };

        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(550000); // 50k + 500k
    });

    test('applyMysteryBoxEffect should handle Debt Collector (loseLeftRight)', () => {
        // Setup floor values
        game.currentFloor = 1;
        game.preGeneratedFloors[1] = {
            left: { value: 20000 },
            right: { value: 30000 }
        };

        const item = { effect: 'loseLeftRight' };
        game.applyMysteryBoxEffect(item);

        expect(game.totalMoney).toBe(0); // 50k - (20k + 30k) = 0
    });

    test('applyMysteryBoxEffect should handle Percentage Boost (+20%)', () => {
        const item = { effect: 'percentageMoney', value: 0.20 };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(60000); // 50k + 20%
    });

    test('applyMysteryBoxEffect should handle Percentage Tax (-20%)', () => {
        const item = { effect: 'percentageMoney', value: -0.20 };
        game.applyMysteryBoxEffect(item);
        expect(game.totalMoney).toBe(40000); // 50k - 20%
    });

    test('applyMysteryBoxEffect should store persistent effects', () => {
        const item = { effect: 'noBankCashout' }; // Rusty Trap
        game.applyMysteryBoxEffect(item);

        expect(game.activeEffects.length).toBe(1);
        expect(game.activeEffects[0].type).toBe('noBankCashout');
        // Rusty Trap doesn't have a number in name, so duration might be 1 by default parser, 
        // but logic might handle it differently. Let's check if it's added.
        expect(game.hasActiveEffect('noBankCashout')).toBe(true);
    });
});
