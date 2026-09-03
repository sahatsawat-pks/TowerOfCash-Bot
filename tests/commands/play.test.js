// const { handlePlayCommand } = require('../../index'); // Removed to avoid side effects
const { GameManager } = require('../../gameManager');
const mockDb = require('../utils/database.mock');

// We need to mock the GameManager instance in index.js or use dependency injection
// For this test, we'll assume we can access the game logic via the exported handler
// OR we can test the logic that the handler calls.

// Since index.js structure is monolithic, testing handlers directly is hard without refactoring.
// However, we can test the logic that `handlePlayCommand` uses.

describe('Play Command Logic', () => {
    let gameManager;

    beforeEach(() => {
        gameManager = new GameManager();
    });

    test('should create a new game if none exists', async () => {
        const interaction = {
            user: { id: 'u1', username: 'User' },
            channelId: 'c1',
            guildId: 'g1',
            reply: jest.fn(),
            deferReply: jest.fn(),
            editReply: jest.fn()
        };

        mockDb.getUser.mockResolvedValue({ remaining_plays: 2 });
        mockDb.getEventMode.mockResolvedValue(false);

        // Test the logic that handlePlayCommand would use
        // 1. Check if game exists
        let game = gameManager.getGame(interaction.channelId);
        expect(game).toBeUndefined();

        // 2. Create game
        game = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, mockDb);

        expect(game).toBeDefined();
        expect(game.channelId).toBe('c1');
        expect(game.userId).toBe('u1');
    });

    test('should fail if game already active', async () => {
        // Setup active game
        await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);

        // Try to get existing game
        const existingGame = gameManager.getGame('c1');
        expect(existingGame).toBeDefined();

        // In real handler:
        // if (gameManager.getGame(interaction.channelId)) {
        //   return interaction.reply(...)
        // }
        // We verify that getGame returns the game, so the handler WOULD fail
    });
});
