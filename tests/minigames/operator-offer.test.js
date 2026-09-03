const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

describe('Operator Offer Minigame', () => {
    let gameManager;
    let game;

    beforeEach(async () => {
        gameManager = new GameManager();
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        game.totalMoney = 50000;
    });

    test('startOperatorOffer should generate offer amount', () => {
        const state = game.startOperatorOffer();
        expect(state.offerAmount).toBeGreaterThan(0);
        expect(state.isActive).toBe(true);
    });

    test('acceptOperatorOffer should add money and end game', () => {
        game.startOperatorOffer();
        const offer = game.operatorOfferState.offerAmount;

        const result = game.acceptOperatorOffer();

        expect(result.accepted).toBe(true);
        expect(game.totalMoney).toBe(50000 + offer);
        expect(game.operatorOfferState.isActive).toBe(false);
    });

    test('declineOperatorOffer should keep money same and end game', () => {
        game.startOperatorOffer();

        const result = game.declineOperatorOffer();

        expect(result.accepted).toBe(false);
        expect(game.totalMoney).toBe(50000);
        expect(game.operatorOfferState.isActive).toBe(false);
    });
});
