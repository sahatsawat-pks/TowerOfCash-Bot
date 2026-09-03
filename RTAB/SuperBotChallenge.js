/**
 * Super Bot Challenge Module
 * Campaign mode with bot challenges from Java RtaB6
 */

const fs = require('fs').promises;
const path = require('path');
const GameBot = require('../GameBot');
const RtaBMath = require('./RtaBMath');

class SuperBotChallenge {
    static DEMO_DELAY = 45;
    static PLAYERS_PER_GAME = 4;

    constructor(channelId, guildId, config) {
        this.channelId = channelId;
        this.guildId = guildId;
        this.gameHandler = null;
        this.playersPerGame = SuperBotChallenge.PLAYERS_PER_GAME;
        this.baseNumerator = config.baseNumerator || 1;
        this.baseDenominator = config.baseDenominator || 1;
        this.runDemos = config.runDemos || 0;
        
        this.loadingHumanGame = false;
        this.playerList = []; // Sorted list of bot IDs
        this.gameList = []; // Array of game configurations
        this.humanCache = []; // Cache of human player requests
        this.gamesRun = 0;
        this.totalGames = 0;
        this.gameToLoad = -1;
        this.missingPlayers = [];
        
        this.loaded = false;
    }

    /**
     * Initialize challenge from game controller
     */
    async initialize(gameController) {
        this.gameHandler = gameController;
        this.gameHandler.playersCanJoin = false;

        this.playersPerGame = Math.min(
            Math.max(4, this.gameHandler.minPlayers),
            this.gameHandler.maxPlayers
        );

        await this.loadGames();
        return this.gameHandler;
    }

    /**
     * Load challenge configuration
     */
    async loadGames() {
        try {
            const challengePath = path.join(__dirname, 'challenges', `challenge_${this.channelId}.txt`);
            const data = await fs.readFile(challengePath, 'utf8');
            const lines = data.split('\n').filter(l => l.trim());

            // Clear existing challenge status
            this.loadingHumanGame = false;
            this.playerList = [];
            this.gameList = [];

            // Parse player list (line 0)
            const playerIds = lines[0].split(' ');
            this.playerList = playerIds.map(id => parseInt(id)).sort((a, b) => a - b);

            // Set multiplier based on players remaining
            this.gameHandler.baseNumerator = this.getMultiplier(this.playerList.length) * this.baseNumerator;
            this.gameHandler.baseDenominator = this.baseDenominator;

            // Parse game list (starting from line 2)
            this.gamesRun = 0;
            this.totalGames = 0;

            for (let i = 2; i < lines.length; i++) {
                const gameIds = lines[i].split(' ').map(id => parseInt(id));
                this.gameList.push(gameIds);
                this.totalGames++;
            }

            this.loaded = true;

            // Start campaign if games exist
            if (this.totalGames > 0) {
                await this.startCampaign();
            }
        } catch (error) {
            console.error('Failed to load challenge games:', error);
            await this.createDefaultChallenge();
        }
    }

    /**
     * Create default challenge configuration
     */
    async createDefaultChallenge() {
        const challengeDir = path.join(__dirname, 'challenges');
        await fs.mkdir(challengeDir, { recursive: true });

        // Create a simple 8-bot challenge
        const playerList = [0, 1, 2, 3, 4, 5, 6, 7];
        const games = [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [0, 2, 4, 6],
            [1, 3, 5, 7]
        ];

        const challengePath = path.join(challengeDir, `challenge_${this.channelId}.txt`);
        const content = [
            playerList.join(' '),
            '',
            ...games.map(g => g.join(' '))
        ].join('\n');

        await fs.writeFile(challengePath, content);
        await this.loadGames();
    }

    /**
     * Start the campaign
     */
    async startCampaign() {
        if (this.runDemos > 0 && !this.loadingHumanGame) {
            await this.startRoundCycle();
        }
    }

    /**
     * Start a round cycle (run all games)
     */
    async startRoundCycle() {
        while (this.gamesRun < this.totalGames && !this.loadingHumanGame) {
            await this.loadDemoGame();
            this.gamesRun++;

            // Add delay between games
            if (this.gamesRun < this.totalGames) {
                await new Promise(resolve => setTimeout(resolve, SuperBotChallenge.DEMO_DELAY * 1000));
            }
        }

        if (this.gamesRun >= this.totalGames && !this.loadingHumanGame) {
            await this.endRoundCycle();
        }
    }

    /**
     * End round cycle
     */
    async endRoundCycle() {
        // Eliminate losers (bottom half)
        const survivors = Math.ceil(this.playerList.length / 2);
        
        // Sort players by performance (would need actual game results)
        // For now, randomly eliminate bottom half
        this.playerList = this.playerList.slice(0, survivors);

        // Update multiplier
        this.gameHandler.baseNumerator = this.getMultiplier(this.playerList.length) * this.baseNumerator;

        await this.saveData();

        // Check if campaign is over
        if (this.playerList.length === 1) {
            // Winner!
            return {
                complete: true,
                winner: this.playerList[0]
            };
        } else {
            // Generate next round games
            await this.generateNextRound();
            this.gamesRun = 0;
            await this.startRoundCycle();
        }
    }

    /**
     * Generate games for next round
     */
    async generateNextRound() {
        this.gameList = [];

        // Pair up remaining players
        for (let i = 0; i < this.playerList.length; i += this.playersPerGame) {
            const game = [];
            for (let j = 0; j < this.playersPerGame && (i + j) < this.playerList.length; j++) {
                game.push(this.playerList[i + j]);
            }
            if (game.length >= 2) { // Need at least 2 players
                this.gameList.push(game);
            }
        }

        this.totalGames = this.gameList.length;
    }

    /**
     * Load and run a demo game
     */
    async loadDemoGame() {
        if (this.gamesRun >= this.totalGames) return;

        const gameConfig = this.gameList[this.gamesRun];
        await this.prepGame(this.gamesRun);

        // Load bots for this game
        const players = [];
        for (const botNumber of gameConfig) {
            const bot = new GameBot(this.guildId, botNumber);
            await bot.load();
            
            players.push({
                userId: bot.getBotId(),
                username: bot.getName(),
                isBot: true,
                botNumber: botNumber
            });
        }

        // Run the game (placeholder - actual game logic would be in gameHandler)
        return players;
    }

    /**
     * Search for human player in upcoming games
     */
    async searchForHumanGame(humanId) {
        const botNumber = await this.getBotFromHuman(humanId);
        if (botNumber === -1) {
            return {
                found: false,
                message: 'You are not registered in this challenge'
            };
        }

        // Find next game with this bot
        for (let i = this.gamesRun; i < this.totalGames; i++) {
            const game = this.gameList[i];
            if (game.includes(botNumber)) {
                return {
                    found: true,
                    gameIndex: i,
                    botNumber: botNumber
                };
            }
        }

        return {
            found: false,
            message: 'You have no upcoming games in this round'
        };
    }

    /**
     * Get bot number from human player ID
     */
    async getBotFromHuman(humanId) {
        try {
            const botListPath = path.join(__dirname, 'guilds', `bots${this.guildId}.csv`);
            const data = await fs.readFile(botListPath, 'utf8');
            const lines = data.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const parts = lines[i].split('#');
                if (parts[2] === humanId) {
                    return i;
                }
            }
        } catch (error) {
            console.error('Failed to find bot for human:', error);
        }

        return -1;
    }

    /**
     * Load human game
     */
    async loadHumanGame(gameIndex, humanId) {
        this.loadingHumanGame = true;
        this.gameToLoad = gameIndex;

        const gameConfig = this.gameList[gameIndex];
        const botNumber = await this.getBotFromHuman(humanId);

        // Load all players for this game
        const players = [];
        for (const botNum of gameConfig) {
            if (botNum === botNumber) {
                // This is the human player
                players.push({
                    userId: humanId,
                    botNumber: botNum,
                    isHuman: true
                });
            } else {
                // Load bot
                const bot = new GameBot(this.guildId, botNum);
                await bot.load();
                players.push({
                    userId: bot.getBotId(),
                    username: bot.getName(),
                    isBot: true,
                    botNumber: botNum
                });
            }
        }

        await this.prepGame(gameIndex);

        return players;
    }

    /**
     * Prepare game configuration
     */
    async prepGame(gameIndex) {
        const gameConfig = this.gameList[gameIndex];
        
        // Configure game settings based on round
        const multiplier = this.getMultiplier(this.playerList.length);
        
        return {
            gameIndex,
            players: gameConfig,
            multiplier
        };
    }

    /**
     * Get multiplier based on players remaining
     */
    getMultiplier(playersLeft) {
        // More players eliminated = higher multiplier
        const totalPlayers = 8; // Default starting players
        const rounds = Math.log2(totalPlayers) - Math.log2(playersLeft);
        
        if (rounds >= 3) return 8;
        if (rounds >= 2) return 4;
        if (rounds >= 1) return 2;
        return 1;
    }

    /**
     * Save challenge data
     */
    async saveData() {
        try {
            const challengePath = path.join(__dirname, 'challenges', `challenge_${this.channelId}.txt`);
            
            const content = [
                this.playerList.join(' '),
                '',
                ...this.gameList.map(g => g.join(' '))
            ].join('\n');

            await fs.writeFile(challengePath, content);
        } catch (error) {
            console.error('Failed to save challenge data:', error);
        }
    }
}

module.exports = SuperBotChallenge;
