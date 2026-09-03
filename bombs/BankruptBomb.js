/**
 * Bankrupt Bomb - Steals all player's money
 */

const Bomb = require('./Bomb');

class BankruptBomb extends Bomb {
    constructor() {
        super('Bankrupt Bomb', 1, false);
    }

    async explode(game, playerIndex) {
        const player = game.players[playerIndex];
        const stolenMoney = player.money;
        
        await game.sendMessage(
            `💸 **BANKRUPT BOMB!** 💸\n` +
            `**${player.name}** lost all their money: **$${stolenMoney.toLocaleString()}**!`
        );

        // Take all money
        player.money = 0;

        // Still lose a life
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
        return '💸';
    }

    getDescription() {
        return 'Bankrupt Bomb (lose all money + 1 life)';
    }
}

module.exports = BankruptBomb;
