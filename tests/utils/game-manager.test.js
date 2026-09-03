const { GameManager } = require('../../gameManager');
const mockDb = require('./database.mock');

describe('GameManager', () => {
    let gameManager;
    let game;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create new GameManager instance
        // Note: We're testing the class logic, but in the real app it's a singleton
        // We might need to adjust based on how it's exported
        gameManager = new GameManager();
    });

    test('createGame should initialize a new game correctly', async () => {
        const userId = 'user123';
        const username = 'TestUser';
        const channelId = 'channel123';
        const guildId = 'guild123';

        mockDb.getUser.mockResolvedValue(null); // User doesn't exist yet
        mockDb.createUser.mockResolvedValue({ id: userId, username });

        game = await gameManager.createGame(userId, username, channelId, guildId, mockDb);

        expect(game).toBeDefined();
        expect(game.userId).toBe(userId);
        expect(game.username).toBe(username);
        expect(game.channelId).toBe(channelId);
        expect(game.totalMoney).toBe(0); // GameState starts with 0 money by default
        expect(game.currentFloor).toBe(0); // GameState starts at floor index 0
        expect(game.preGeneratedFloors).toBeDefined();
        expect(Object.keys(game.preGeneratedFloors).length).toBe(21);
    });

    test('preGenerateAllFloors should inject minigames and mystery boxes', async () => {
        gameManager.endGame('c1');
        const eventDb = { ...mockDb, getEventMode: jest.fn().mockResolvedValue(true) };
        game = await gameManager.createGame('u1', 'User', 'c1', 'g1', eventDb);

        const floors = Object.values(game.preGeneratedFloors);

        // Count event tiles
        let minigames = 0;
        let mysteryBoxes = 0;
        let randomPercentages = 0;
        let nothingTiles = 0;

        floors.forEach(floor => {
            [floor.left, floor.right].forEach(side => {
                if (side.action === 'mystery_box') {
                    mysteryBoxes++;
                } else if (side.type === 'event') {
                    minigames++;
                } else if (side.type === 'special' && side.action === 'random_percentage') {
                    randomPercentages++;
                } else if (side.type === 'nothing') {
                    nothingTiles++;
                }
            });
        });

        expect(minigames).toBeGreaterThanOrEqual(4); // 4-8 minigames injected (varies due to random generation)
        expect(minigames).toBeLessThanOrEqual(8);
        expect(mysteryBoxes).toBeGreaterThanOrEqual(1); // 1-2 Mystery Boxes
        expect(randomPercentages).toBeGreaterThanOrEqual(1); // 1-4 Random %
        // Note: Event tiles are placed randomly, so counts vary
    });

    test('getGame should return active game', async () => {
        await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        const retrievedGame = gameManager.getGame('c1');
        expect(retrievedGame).toBeDefined();
        expect(retrievedGame.channelId).toBe('c1');
    });

    test('endGame should remove game from active games', async () => {
        await gameManager.createGame('u1', 'User', 'c1', 'g1', mockDb);
        await gameManager.endGame('c1');
        const retrievedGame = gameManager.getGame('c1');
        expect(retrievedGame).toBeUndefined();
    });
});
