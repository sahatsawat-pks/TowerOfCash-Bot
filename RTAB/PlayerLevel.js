/**
 * Player Level Module
 * Manages player XP and leveling system from Java RtaB6
 */

const fs = require('fs').promises;
const path = require('path');

class PlayerLevel {
    constructor(guildId, playerId, name) {
        this.guildId = guildId;
        this.playerId = playerId;
        this.name = name;

        // Default values
        this.playerLevel = 0;
        this.championLevel = 0;
        this.achievementLevel = 0;
        this.playerXP = 0;
        this.champXP = 0;
        this.recordRow = -1;

        this.loaded = false;
    }

    /**
     * Load player level from file
     */
    async load() {
        try {
            const levelsDir = path.join(__dirname, 'levels');
            await fs.mkdir(levelsDir, { recursive: true });

            const filePath = path.join(levelsDir, `levels${this.guildId}.csv`);
            const data = await fs.readFile(filePath, 'utf8');
            const lines = data.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const record = line.split('#');
                if (record[0] === this.playerId) {
                    this.name = record[1] || this.name;
                    this.playerLevel = parseInt(record[2]) || 0;
                    this.playerXP = parseInt(record[3]) || 0;
                    this.championLevel = parseInt(record[4]) || 0;
                    this.champXP = parseInt(record[5]) || 0;
                    this.achievementLevel = parseInt(record[6]) || 0;
                    this.recordRow = i;
                    break;
                }
            }

            this.loaded = true;
        } catch (error) {
            // File doesn't exist yet, use defaults
            this.loaded = true;
        }
    }

    /**
     * Save player level to file
     */
    async save() {
        try {
            const levelsDir = path.join(__dirname, 'levels');
            await fs.mkdir(levelsDir, { recursive: true });

            const filePath = path.join(levelsDir, `levels${this.guildId}.csv`);
            const toPrint = [
                this.playerId,
                this.name,
                this.playerLevel,
                this.playerXP,
                this.championLevel,
                this.champXP,
                this.achievementLevel
            ].join('#');

            let lines = [];
            try {
                const data = await fs.readFile(filePath, 'utf8');
                lines = data.split('\n').filter(l => l.trim());
            } catch (error) {
                // File doesn't exist yet
            }

            if (this.recordRow >= 0 && this.recordRow < lines.length) {
                lines[this.recordRow] = toPrint;
            } else {
                lines.push(toPrint);
                this.recordRow = lines.length - 1;
            }

            await fs.writeFile(filePath, lines.join('\n') + '\n');
            return true;
        } catch (error) {
            console.error('Failed to save player level:', error);
            return false;
        }
    }

    // Getters
    getTotalLevel() {
        return this.playerLevel + this.championLevel + this.achievementLevel;
    }

    getPlayerLevel() {
        return this.playerLevel;
    }

    getChampLevel() {
        return this.championLevel;
    }

    getAchievementLevel() {
        return this.achievementLevel;
    }

    getPlayerXP() {
        return this.playerXP;
    }

    getChampXP() {
        return this.champXP;
    }

    setName(name) {
        this.name = name;
    }

    /**
     * Set player XP directly
     * @param {number} newXP - New XP amount
     * @returns {boolean} True if level decreased
     */
    setXP(newXP) {
        const oldLevel = this.playerLevel;
        this.playerLevel = 0;
        this.playerXP = 0;
        this.addXP(newXP);
        return oldLevel > this.playerLevel;
    }

    /**
     * Add player XP
     * @param {number} addedXP - XP to add
     * @returns {boolean} True if leveled up
     */
    addXP(addedXP) {
        this.playerXP += addedXP;
        return this.checkLevelUp();
    }

    /**
     * Check and process level ups
     * @returns {boolean} True if leveled up
     */
    checkLevelUp() {
        let increasedLevel = false;
        while (this.playerXP >= this.getRequiredXP()) {
            this.playerXP -= this.getRequiredXP();
            this.playerLevel++;
            increasedLevel = true;
        }
        return increasedLevel;
    }

    /**
     * Get XP required for next player level
     * @returns {number} Required XP
     */
    getRequiredXP() {
        const newLevel = this.playerLevel + 1;
        return 5_000_000 * newLevel;
    }

    /**
     * Set champion XP directly
     * @param {number} newXP - New champion XP
     * @returns {boolean} True if level decreased
     */
    setChampXP(newXP) {
        const oldLevel = this.championLevel;
        this.championLevel = 0;
        this.champXP = 0;
        this.addChampXP(newXP);
        return oldLevel > this.championLevel;
    }

    /**
     * Add champion XP
     * @param {number} addedXP - XP to add
     * @returns {boolean} True if leveled up
     */
    addChampXP(addedXP) {
        this.champXP += addedXP;
        return this.checkChampLevelUp();
    }

    /**
     * Check and process champion level ups
     * @returns {boolean} True if leveled up
     */
    checkChampLevelUp() {
        let increasedLevel = false;
        while (this.champXP >= this.getRequiredChampXP()) {
            this.champXP -= this.getRequiredChampXP();
            this.championLevel++;
            increasedLevel = true;
        }
        return increasedLevel;
    }

    /**
     * Get XP required for next champion level
     * Total XP requirement is $1b x (new level)^3
     * @returns {number} Required XP
     */
    getRequiredChampXP() {
        const newLevel = this.championLevel + 1;
        return (3_000_000_000 * Math.pow(newLevel, 2)) 
             - (3_000_000_000 * newLevel) 
             + 1_000_000_000;
    }

    /**
     * Add one achievement level
     * @returns {number} New achievement level
     */
    addAchievementLevel() {
        this.achievementLevel++;
        return this.achievementLevel;
    }
}

module.exports = PlayerLevel;
