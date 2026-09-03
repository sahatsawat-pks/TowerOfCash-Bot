/**
 * Cursed Bomb - Curses the player for several turns
 */

const Bomb = require('./Bomb');

class CursedBomb extends Bomb {
    constructor(penalty = 1) {
        super('Cursed Bomb', penalty, false);
        this.curseDuration = 3; // 3 turns
    }

    async explode(game, playerIndex) {
        const player = game.players[playerIndex];
        
        await game.sendMessage(
            `😈 **CURSED BOMB!** 😈\n` +
            `**${player.name}** is cursed for **${this.curseDuration}** turns!`
        );

        // Apply curse
        player.cursed = this.curseDuration;

        // Still lose a life
        player.lives -= this.penalty;
        
        if (player.lives <= 0) {
            player.status = 'OUT';
            await game.sendMessage(`☠️ **${player.name}** has been eliminated!`);
            return true;
        } else {
            await game.sendMessage(
                `**${player.name}** has **${player.lives}** ${player.lives === 1 ? 'life' : 'lives'} remaining.\n` +
                `While cursed, they earn **NEGATIVE** money from cash spaces!`
            );
            return false;
        }
    }

    getSymbol() {
        return '😈';
    }

    getDescription() {
        return `Cursed Bomb (${this.curseDuration} turn curse + 1 life)`;
    }
}

module.exports = CursedBomb;
