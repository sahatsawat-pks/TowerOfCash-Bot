/**
 * Jackpot Management
 */

const fs = require('fs').promises;
const path = require('path');

class Jackpots {
    constructor(channelId) {
        this.channelId = channelId;
        this.jackpots = [];
    }

    /**
     * Load jackpots from file
     */
    async load() {
        try {
            const jackpotPath = path.join(__dirname, '..', 'jackpots', `jackpots_${this.channelId}.txt`);
            const data = await fs.readFile(jackpotPath, 'utf8');
            const lines = data.split('\n').filter(l => l.trim());
            
            this.jackpots = lines.map(line => {
                const amount = BigInt(line.trim());
                return amount;
            });
        } catch (error) {
            // If file doesn't exist, use default jackpots
            this.jackpots = [
                10000n,
                25000n,
                50000n,
                100000n,
                250000n,
                500000n,
                1000000n
            ];
        }
    }

    /**
     * Save jackpots to file
     */
    async save() {
        try {
            const jackpotPath = path.join(__dirname, '..', 'jackpots', `jackpots_${this.channelId}.txt`);
            await fs.mkdir(path.dirname(jackpotPath), { recursive: true });
            
            const content = this.jackpots.map(j => j.toString()).join('\n');
            await fs.writeFile(jackpotPath, content);
        } catch (error) {
            console.error('Failed to save jackpots:', error);
        }
    }

    /**
     * Get a specific jackpot
     */
    getJackpot(index) {
        if (index < 0 || index >= this.jackpots.length) {
            return 0n;
        }
        return this.jackpots[index];
    }

    /**
     * Set a specific jackpot
     */
    setJackpot(index, amount) {
        if (index >= 0 && index < this.jackpots.length) {
            this.jackpots[index] = BigInt(amount);
        }
    }

    /**
     * Add to a specific jackpot
     */
    addToJackpot(index, amount) {
        if (index >= 0 && index < this.jackpots.length) {
            this.jackpots[index] += BigInt(amount);
        }
    }

    /**
     * Reset a specific jackpot to minimum
     */
    resetJackpot(index) {
        const minValues = [10000n, 25000n, 50000n, 100000n, 250000n, 500000n, 1000000n];
        if (index >= 0 && index < this.jackpots.length) {
            this.jackpots[index] = minValues[index] || 10000n;
        }
    }

    /**
     * Get all jackpots
     */
    getAll() {
        return [...this.jackpots];
    }

    /**
     * Get number of jackpots
     */
    size() {
        return this.jackpots.length;
    }

    /**
     * Get total value of all jackpots
     */
    getTotal() {
        return this.jackpots.reduce((sum, j) => sum + j, 0n);
    }
}

module.exports = Jackpots;
