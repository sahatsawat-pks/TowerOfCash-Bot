/**
 * Game Bot Module
 * Manages bot players from Java RtaB6
 */

const fs = require('fs').promises;
const path = require('path');

class GameBot {
    constructor(guildId, botNumber) {
        this.guildId = guildId;
        this.botNumber = botNumber;
        this.botId = null;
        this.name = null;
        this.humanId = null;
        this.loaded = false;
    }

    /**
     * Load bot data from file
     */
    async load() {
        try {
            const guildsDir = path.join(__dirname, 'guilds');
            let filePath = path.join(guildsDir, `bots${this.guildId}.csv`);
            
            let data;
            try {
                data = await fs.readFile(filePath, 'utf8');
            } catch (error) {
                // Try default bot list
                filePath = path.join(guildsDir, 'botsdefault.csv');
                data = await fs.readFile(filePath, 'utf8');
            }

            const lines = data.split('\n').filter(l => l.trim());
            
            if (this.botNumber < 0 || this.botNumber >= lines.length) {
                throw new Error(`Bot number ${this.botNumber} out of range`);
            }

            const record = lines[this.botNumber].split('#');
            this.botId = record[0];
            this.name = record[1];
            this.humanId = record[2];
            this.loaded = true;

            return true;
        } catch (error) {
            console.error(`Failed to load bot ${this.botNumber}:`, error);
            // Create a default bot
            this.botId = `bot_${this.botNumber}_${Date.now()}`;
            this.name = `🤖 Bot ${this.botNumber + 1}`;
            this.humanId = 'system';
            this.loaded = true;
            return false;
        }
    }

    /**
     * Create default bot list
     */
    static async createDefaultBotList() {
        const guildsDir = path.join(__dirname, 'guilds');
        await fs.mkdir(guildsDir, { recursive: true });

        const defaultBots = [
            'bot1#🤖 Alpha Bot#system',
            'bot2#🤖 Beta Bot#system',
            'bot3#🤖 Gamma Bot#system',
            'bot4#🤖 Delta Bot#system',
            'bot5#🤖 Epsilon Bot#system',
            'bot6#🤖 Zeta Bot#system',
            'bot7#🤖 Eta Bot#system',
            'bot8#🤖 Theta Bot#system'
        ];

        const filePath = path.join(guildsDir, 'botsdefault.csv');
        await fs.writeFile(filePath, defaultBots.join('\n') + '\n');
    }

    // Getters
    getBotId() {
        return this.botId;
    }

    getName() {
        return this.name;
    }

    getHuman() {
        return this.humanId;
    }
}

module.exports = GameBot;
