/**
 * Bounty Controller Module
 * Manages bounty hunting system from Java RtaB6
 */

const fs = require('fs').promises;
const path = require('path');

class BountyController {
    static MIN_BOUNTY_SCORE = 20; // Minimum bounty score to care about
    static BOUNTY_PER_POINT = 5000; // Cash value per bounty point
    static BOUNTY_PLAYER_RATIO = 4; // Max 1/n players will be bountied

    constructor(channelId, baseNumerator, baseDenominator) {
        this.channelId = channelId;
        this.baseNumerator = baseNumerator;
        this.baseDenominator = baseDenominator;
        this.bounties = {};
        this.loaded = false;
    }

    /**
     * Load bounty data from file
     */
    async load() {
        try {
            const scoresDir = path.join(__dirname, 'scores');
            await fs.mkdir(scoresDir, { recursive: true });
            
            const filePath = path.join(scoresDir, `bounties${this.channelId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            this.bounties = JSON.parse(data);
            this.loaded = true;
        } catch (error) {
            // If file doesn't exist, start with empty bounties
            this.bounties = {};
            this.loaded = true;
        }
    }

    /**
     * Carry over bounties to current players
     * @param {Array} players - Array of player objects
     */
    carryOverBounties(players) {
        for (const player of players) {
            const carriedBounty = this.bounties[player.userId] || 0;
            player.bounty = (player.bounty || 0) + carriedBounty;
            delete this.bounties[player.userId];
        }
    }

    /**
     * Calculate bounty score for a player
     * @param {Object} player - Player object
     * @returns {number} Bounty score
     */
    calculateBountyScore(player) {
        let score = 0;

        // High money = higher bounty
        if (player.money > 10_000_000) score += 5;
        else if (player.money > 5_000_000) score += 3;
        else if (player.money > 1_000_000) score += 1;

        // High winstreak = higher bounty
        if (player.winstreak > 20) score += 4;
        else if (player.winstreak > 10) score += 2;
        else if (player.winstreak > 5) score += 1;

        // High booster = higher bounty
        if (player.booster > 500) score += 3;
        else if (player.booster > 300) score += 2;
        else if (player.booster > 100) score += 1;

        // Many games played = higher bounty
        if (player.gamesPlayed > 100) score += 3;
        else if (player.gamesPlayed > 50) score += 2;
        else if (player.gamesPlayed > 20) score += 1;

        return score;
    }

    /**
     * Assign bounties to eligible players
     * @param {Array} players - Array of player objects
     */
    assignBounties(players) {
        const eligiblePlayers = players.filter(p => {
            const score = this.calculateBountyScore(p);
            return score >= BountyController.MIN_BOUNTY_SCORE;
        }).sort((a, b) => {
            return this.calculateBountyScore(b) - this.calculateBountyScore(a);
        });

        const maxBountiedPlayers = Math.max(1, Math.floor(players.length / BountyController.BOUNTY_PLAYER_RATIO));
        const bountiedPlayers = eligiblePlayers.slice(0, maxBountiedPlayers);

        for (const player of bountiedPlayers) {
            const score = this.calculateBountyScore(player);
            player.bounty = (player.bounty || 0) + (score * BountyController.BOUNTY_PER_POINT);
        }
    }

    /**
     * Award bounty to killer when bounty target is eliminated
     * @param {Object} killer - Player who eliminated the target
     * @param {Object} victim - Player who was eliminated
     * @returns {number} Bounty awarded
     */
    awardBounty(killer, victim) {
        if (!victim.bounty || victim.bounty <= 0) return 0;

        const bountyAmount = victim.bounty;
        killer.money += bountyAmount;
        
        // Track bounty credit
        if (!killer.bountyCredit) killer.bountyCredit = [];
        killer.bountyCredit.push({
            victimId: victim.userId,
            victimName: victim.username,
            amount: bountyAmount
        });

        victim.bounty = 0;
        return bountyAmount;
    }

    /**
     * Save bounty data to file
     * @param {Array} players - Array of player objects
     */
    async saveData(players) {
        // Add leftover player bounties to save data
        for (const player of players) {
            if (player.bounty > 0) {
                this.bounties[player.userId] = player.bounty;
            }
        }

        try {
            const scoresDir = path.join(__dirname, 'scores');
            await fs.mkdir(scoresDir, { recursive: true });
            
            const filePath = path.join(scoresDir, `bounties${this.channelId}.json`);
            await fs.writeFile(filePath, JSON.stringify(this.bounties, null, 4));
        } catch (error) {
            console.error('Failed to save bounty data:', error);
        }
    }
}

module.exports = BountyController;
