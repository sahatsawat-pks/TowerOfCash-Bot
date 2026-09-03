/**
 * RtaB Math Utilities Module
 * Port of RtaBMath.java utility functions
 */

class RtaBMath {
    /**
     * Calculate entry fee based on money and lives
     * @param {number} money - Player's current money
     * @param {number} lives - Player's remaining lives
     * @returns {number} Entry fee amount
     */
    static calculateEntryFee(money, lives) {
        let entryFee = Math.max(Math.floor(money / 500), 20000);
        entryFee *= (5 - lives);
        return entryFee;
    }

    /**
     * Apply base multiplier to amount
     * @param {number} amount - Base amount
     * @param {number} baseNumerator - Multiplier numerator
     * @param {number} baseDenominator - Multiplier denominator
     * @returns {number} Multiplied amount
     */
    static applyBaseMultiplier(amount, baseNumerator, baseDenominator) {
        let midStep = BigInt(amount) * BigInt(baseNumerator);
        let endStep = midStep / BigInt(baseDenominator);
        
        if (endStep > 1_000_000_000n)
            endStep = 1_000_000_000n;
        if (endStep < -1_000_000_000n)
            endStep = -1_000_000_000n;
        
        return Number(endStep);
    }

    /**
     * Apply bank percent base multiplier
     * @param {number} amount - Base amount
     * @param {number} baseNumerator - Multiplier numerator
     * @param {number} baseDenominator - Multiplier denominator
     * @returns {number} Multiplied amount
     */
    static applyBankPercentBaseMultiplier(amount, baseNumerator, baseDenominator) {
        const baseMultiplier = baseNumerator / baseDenominator;
        let effectiveMultiplier;

        // Squash large base multipliers down
        if (baseMultiplier < 1)
            effectiveMultiplier = baseMultiplier;
        else if (baseMultiplier >= 10)
            effectiveMultiplier = 2.5;
        else if (baseMultiplier >= 5)
            effectiveMultiplier = 2.0;
        else if (baseMultiplier >= 2.5)
            effectiveMultiplier = 1.5;
        else
            effectiveMultiplier = 1.0;

        return Math.floor(amount * effectiveMultiplier);
    }

    /**
     * Get enhancement cap based on lives
     * @param {number} lives - Player's total lives
     * @param {number} livesPerEnhance - Lives required per enhancement
     * @returns {number} Maximum enhancements allowed
     */
    static getEnhanceCap(lives, livesPerEnhance) {
        // 25 = 1, 75 = 2, 150 = 3, 250 = 4, ..., round down
        let weeks = Math.floor(lives / livesPerEnhance);
        let count = 0;
        while (weeks > count) {
            count++;
            weeks -= count;
        }
        return count;
    }

    /**
     * Get adjacent spaces on the board
     * @param {number} centre - Center space index
     * @param {number} players - Number of players
     * @returns {number[]} Array of adjacent space indices
     */
    static getAdjacentSpaces(centre, players) {
        const adjacentSpaces = [];
        const size = (players + 1) * 5;
        const columns = Math.max(5, players + 1);

        // Up-Left
        if (centre >= columns && centre % columns !== 0)
            adjacentSpaces.push((centre - 1) - columns);
        // Up
        if (centre >= columns)
            adjacentSpaces.push(centre - columns);
        // Up-Right
        if (centre >= columns && centre % columns !== (columns - 1))
            adjacentSpaces.push((centre + 1) - columns);
        // Left
        if (centre % columns !== 0)
            adjacentSpaces.push(centre - 1);
        // Right
        if (centre % columns !== (columns - 1))
            adjacentSpaces.push(centre + 1);
        // Down-Left
        if (centre < (size - columns) && centre % columns !== 0)
            adjacentSpaces.push((centre - 1) + columns);
        // Down
        if (centre < (size - columns))
            adjacentSpaces.push(centre + columns);
        // Down-Right
        if (centre < (size - columns) && centre % columns !== (columns - 1))
            adjacentSpaces.push((centre + 1) + columns);

        return adjacentSpaces;
    }

    /**
     * Thread-safe random number generator
     * @returns {number} Random number between 0 and 1
     */
    static random() {
        return Math.random();
    }
}

module.exports = RtaBMath;
