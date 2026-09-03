/**
 * EventSpace Interface
 * Base interface for all event spaces
 */

class EventSpace {
    /**
     * Get the name of this event
     * @returns {string} Event name
     */
    getName() {
        throw new Error('getName() must be implemented');
    }

    /**
     * Execute the event
     * @param {GameController} game - Game controller instance
     * @param {number} playerIndex - Index of the player who landed on this space
     */
    async execute(game, playerIndex) {
        throw new Error('execute() must be implemented');
    }
}

module.exports = EventSpace;
