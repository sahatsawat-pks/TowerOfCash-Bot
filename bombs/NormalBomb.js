/**
 * Normal Bomb - Standard bomb with life penalty
 */

const Bomb = require('./Bomb');

class NormalBomb extends Bomb {
    constructor(penalty = 1) {
        super('Bomb', penalty, false);
    }

    async explode(game, playerIndex) {
        const player = game.players[playerIndex];
        
        await game.sendMessage(
            `💣 **BOOM!** 💣\n` +
            `**${player.name}** hit a **Bomb**!`
        );

        // Apply penalty
        player.lives -= this.penalty;
        
        if (player.lives <= 0) {
            player.status = 'OUT';
            await game.sendMessage(`☠️ **${player.name}** has been eliminated!`);
            return true;
        } else {
            await game.sendMessage(`**${player.name}** has **${player.lives}** ${player.lives === 1 ? 'life' : 'lives'} remaining.`);
            return false;
        }
    }

    getSymbol() {
        return '💣';
    }

    getDescription() {
        return `Bomb (-${this.penalty} ${this.penalty === 1 ? 'life' : 'lives'})`;
    }
}

module.exports = NormalBomb;
