/**
 * Bomb Base Class
 */

class Bomb {
    constructor(name, penalty, affectsUnhidden) {
        this.name = name;
        this.penalty = penalty;
        this.affectsUnhidden = affectsUnhidden || false;
        this.hidden = true;
    }

    /**
     * Get bomb name
     */
    getName() {
        return this.name;
    }

    /**
     * Get penalty amount
     */
    getPenalty() {
        return this.penalty;
    }

    /**
     * Check if bomb affects unhidden bombs
     */
    getAffectsUnhidden() {
        return this.affectsUnhidden;
    }

    /**
     * Check if bomb is hidden
     */
    isHidden() {
        return this.hidden;
    }

    /**
     * Reveal the bomb
     */
    reveal() {
        this.hidden = false;
    }

    /**
     * Execute bomb effect
     * @param {GameController} game - Game controller
     * @param {number} playerIndex - Player who hit the bomb
     * @returns {Promise<boolean>} True if player eliminated
     */
    async explode(game, playerIndex) {
        throw new Error('explode() must be implemented');
    }

    /**
     * Get bomb emoji/symbol
     */
    getSymbol() {
        return '💣';
    }

    /**
     * Get description of bomb effect
     */
    getDescription() {
        return `Standard bomb with ${this.penalty} penalty`;
    }
}

module.exports = Bomb;
