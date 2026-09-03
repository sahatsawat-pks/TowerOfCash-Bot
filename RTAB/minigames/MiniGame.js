/**
 * MiniGame Interface
 */

class MiniGame {
    /**
     * Get the name of this minigame
     */
    getName() {
        throw new Error('getName() must be implemented');
    }

    /**
     * Check if minigame is bonus game
     */
    isBonusGame() {
        return false;
    }

    /**
     * Check if minigame is PvP (player vs player)
     */
    isPvP() {
        return false;
    }

    /**
     * Initialize the minigame
     * @param {Player} player - Player object
     * @param {number} wager - Money wagered
     * @param {boolean} enhanced - Is game enhanced?
     */
    async init(player, wager, enhanced = false) {
        this.player = player;
        this.wager = wager;
        this.enhanced = enhanced;
        this.winnings = 0;
        this.gameOver = false;
    }

    /**
     * Play the minigame
     * @param {MessageChannel} channel - Discord channel
     * @returns {Promise<number>} Amount won
     */
    async play(channel) {
        throw new Error('play() must be implemented');
    }

    /**
     * Get result message
     */
    getResult() {
        if (this.winnings > 0) {
            return `You won **$${this.winnings.toLocaleString()}**!`;
        } else if (this.winnings < 0) {
            return `You lost **$${Math.abs(this.winnings).toLocaleString()}**!`;
        } else {
            return `You broke even.`;
        }
    }

    /**
     * Get winnings
     */
    getWinnings() {
        return this.winnings;
    }

    /**
     * Check if game is over
     */
    isGameOver() {
        return this.gameOver;
    }
}

module.exports = MiniGame;
