/**
 * Jackpot Event - Player wins a jackpot
 */

const EventSpace = require('./EventSpace');

class JackpotEvent extends EventSpace {
    getName() {
        return 'Jackpot';
    }

    async execute(game, playerIndex) {
        const player = game.players[playerIndex];
        
        // Random jackpot amount between $1M and $10M
        const jackpotAmount = (Math.floor(Math.random() * 9) + 1) * 1000000;
        
        player.jackpot += jackpotAmount;
        
        await game.sendMessage(
            `🎰 **JACKPOT!** 🎰\n` +
            `**${player.name}** wins **$${jackpotAmount.toLocaleString()}**!\n` +
            `Total jackpot winnings: **$${player.jackpot.toLocaleString()}**`
        );
    }
}

module.exports = JackpotEvent;
