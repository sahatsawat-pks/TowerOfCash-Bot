/**
 * Coin Flip Minigame
 * Player calls heads or tails, doubling wager on correct guess
 */

const MiniGame = require('./MiniGame');

class CoinFlip extends MiniGame {
    getName() {
        return 'Coin Flip';
    }

    async play(channel) {
        await channel.send(
            `🪙 **Coin Flip** 🪙\n` +
            `Wager: **$${this.wager.toLocaleString()}**${this.enhanced ? ' (Enhanced)' : ''}\n\n` +
            `Call it! Type **heads** or **tails**`
        );

        // Wait for player response (simplified - actual implementation would use Discord collector)
        const call = await this.waitForResponse(channel, ['heads', 'tails']);
        
        // Flip coin
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        
        await channel.send(`The coin lands on... **${result}**!`);

        if (call === result) {
            // Win - double the wager
            const multiplier = this.enhanced ? 3 : 2;
            this.winnings = this.wager * multiplier;
            
            await channel.send(
                `✅ **Correct!**\n` +
                `You win **$${this.winnings.toLocaleString()}**!`
            );
        } else {
            // Lose - lose the wager
            this.winnings = -this.wager;
            
            await channel.send(
                `❌ **Wrong!**\n` +
                `You lose **$${this.wager.toLocaleString()}**!`
            );
        }

        this.gameOver = true;
        return this.winnings;
    }

    /**
     * Wait for player response (placeholder)
     */
    async waitForResponse(channel, validResponses) {
        // This is a placeholder - actual implementation would use Discord message collector
        // For now, return random valid response for bot players
        return validResponses[Math.floor(Math.random() * validResponses.length)];
    }
}

module.exports = CoinFlip;
