/**
 * Minigame Tournament Module
 * Tournament system for minigames from Java RtaB6
 */

const fs = require('fs').promises;
const path = require('path');
const { TournamentStatus } = require('./RTABEnums');
const GameBot = require('../GameBot');

class MinigameTournament {
    constructor(channelId, guildId, config) {
        this.status = TournamentStatus.LOADING;
        this.channelId = channelId;
        this.guildId = guildId;
        this.round = 1;
        this.enhancements = 0;
        this.minimumToQualify = 0;
        this.botCount = config.botCount || 0;
        this.demoDelay = config.demoDelay || 0;
        this.minigameList = [];
        this.rankList = [];
        this.participants = new Map();
        this.loaded = false;
    }

    /**
     * Load configuration from file
     */
    async loadConfig() {
        try {
            const configPath = path.join(__dirname, 'tournaments', `tournament_${this.channelId}.json`);
            const data = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(data);

            this.round = config.round || 1;
            this.enhancements = config.enhancements || 0;
            this.minimumToQualify = config.minimumToQualify || 0;
            this.minigameList = config.minigameList || [];
            this.rankList = config.rankList || [];
        } catch (error) {
            // Use defaults if config doesn't exist
            this.round = 1;
            this.enhancements = 3;
            this.minimumToQualify = 50000;
            this.minigameList = ['DiceRoll', 'CoinFlip', 'NumberGuess', 'Memory'];
            this.rankList = [
                { name: 'Bronze', requirement: 50000 },
                { name: 'Silver', requirement: 100000 },
                { name: 'Gold', requirement: 250000 },
                { name: 'Platinum', requirement: 500000 },
                { name: 'Diamond', requirement: 1000000 }
            ];
        }
    }

    /**
     * Load participant scores
     */
    async loadScores() {
        try {
            const scoresPath = path.join(__dirname, 'scores', `tournament_scores_${this.channelId}.json`);
            const data = await fs.readFile(scoresPath, 'utf8');
            const scores = JSON.parse(data);

            for (const [userId, scoreData] of Object.entries(scores)) {
                this.participants.set(userId, {
                    userId: userId,
                    username: scoreData.username,
                    money: scoreData.money || 0,
                    gamesPlayed: scoreData.gamesPlayed || 0,
                    rank: scoreData.rank || 'Unranked',
                    lastPlayed: scoreData.lastPlayed || null
                });
            }
        } catch (error) {
            // No scores yet
        }
    }

    /**
     * Initialize tournament
     */
    async initialize() {
        await this.loadConfig();
        await this.loadScores();

        // Create scores file if it doesn't exist
        const scoresPath = path.join(__dirname, 'scores', `tournament_scores_${this.channelId}.csv`);
        try {
            await fs.access(scoresPath);
        } catch (error) {
            await fs.mkdir(path.dirname(scoresPath), { recursive: true });
            await fs.writeFile(scoresPath, 'userId,username,money,gamesPlayed,rank\n');
        }

        this.status = TournamentStatus.OPEN;
        this.loaded = true;
    }

    /**
     * Run demo tournament with bots
     */
    async runDemo() {
        if (this.botCount <= 0) return;

        const bots = [];
        for (let i = 0; i < this.botCount; i++) {
            const bot = new GameBot(this.guildId, i);
            await bot.load();
            bots.push({
                userId: bot.getBotId(),
                username: bot.getName(),
                isBot: true
            });
        }

        await this.runTournamentRound(bots[0]);
    }

    /**
     * Register human player for tournament
     */
    async registerHuman(userId, username) {
        if (!this.participants.has(userId)) {
            this.participants.set(userId, {
                userId: userId,
                username: username,
                money: 0,
                gamesPlayed: 0,
                rank: 'Unranked',
                lastPlayed: null
            });
        }

        return this.participants.get(userId);
    }

    /**
     * Run tournament round for player
     */
    async runTournamentRound(player, enhancedGames = new Set()) {
        this.status = TournamentStatus.PLAYING;

        const moneyWon = new Array(this.minigameList.length).fill(0);
        let totalWinnings = 0;

        for (let i = 0; i < this.minigameList.length; i++) {
            const minigame = this.minigameList[i];
            const isEnhanced = enhancedGames.has(i);

            // Run minigame (placeholder - actual minigame logic would go here)
            const result = await this.runMinigame(minigame, player, isEnhanced);
            moneyWon[i] = result.winnings;
            totalWinnings += result.winnings;
        }

        // Update participant data
        const participant = this.participants.get(player.userId);
        if (participant) {
            participant.money += totalWinnings;
            participant.gamesPlayed++;
            participant.lastPlayed = Date.now();
            participant.rank = this.getRank(participant.money);
        }

        await this.saveData(player);

        this.status = TournamentStatus.OPEN;

        return {
            totalWinnings,
            moneyWon,
            rank: participant.rank
        };
    }

    /**
     * Run a single minigame (placeholder)
     */
    async runMinigame(minigameName, player, isEnhanced) {
        // This is a placeholder - actual minigame logic would be implemented here
        const baseWinnings = Math.floor(Math.random() * 10000) + 5000;
        const enhanceMultiplier = isEnhanced ? 2 : 1;

        return {
            success: Math.random() > 0.3,
            winnings: baseWinnings * enhanceMultiplier
        };
    }

    /**
     * Check if enhancement number is valid
     */
    checkValidEnhanceNumber(gameNumber, enhancedGames) {
        if (gameNumber < 0 || gameNumber >= this.minigameList.length) {
            return false;
        }

        if (enhancedGames.has(gameNumber)) {
            return false;
        }

        if (enhancedGames.size >= this.enhancements) {
            return false;
        }

        return true;
    }

    /**
     * Get rank name based on money
     */
    getRank(money) {
        if (money < this.minimumToQualify) {
            return 'Unranked';
        }

        let rank = 'Bronze';
        for (const rankData of this.rankList) {
            if (money >= rankData.requirement) {
                rank = rankData.name;
            }
        }

        return rank;
    }

    /**
     * Get leaderboard
     */
    getLeaderboard(limit = 10) {
        return Array.from(this.participants.values())
            .sort((a, b) => b.money - a.money)
            .slice(0, limit);
    }

    /**
     * Save tournament data
     */
    async saveData(player) {
        try {
            // Save participant scores
            const scoresPath = path.join(__dirname, 'scores', `tournament_scores_${this.channelId}.json`);
            const scoresData = {};

            for (const [userId, data] of this.participants.entries()) {
                scoresData[userId] = data;
            }

            await fs.mkdir(path.dirname(scoresPath), { recursive: true });
            await fs.writeFile(scoresPath, JSON.stringify(scoresData, null, 4));
        } catch (error) {
            console.error('Failed to save tournament data:', error);
        }
    }
}

module.exports = MinigameTournament;
