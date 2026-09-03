/**
 * Joker Event - Gives player a joker token
 */

const EventSpace = require('./EventSpace');

class Joker extends EventSpace {
    getName() {
        return 'Joker';
    }

    async execute(game, playerIndex) {
        const player = game.players[playerIndex];
        player.jokers++;
        
        await game.sendMessage(`💎 **${player.name}** found a **Joker**! They now have **${player.jokers}** joker(s).`);
        
        // Check for achievement
        if (player.jokers >= 5) {
            // Award achievement for hoarding jokers
        }
    }
}

module.exports = Joker;
