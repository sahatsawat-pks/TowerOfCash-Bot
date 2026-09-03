/**
 * RtaB Season 6 - Replay System
 * Captures and stores epic moments from gameplay
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

class RTABReplaySystem {
    constructor() {
        this.replays = new Map(); // gameId -> replay data
        this.epicMoments = []; // Array of epic moment captures
    }

    /**
     * Start recording a new game
     */
    startRecording(gameId, players) {
        const replay = {
            gameId,
            players: players.map(p => ({ userId: p.userId, username: p.username })),
            startTime: Date.now(),
            events: [],
            highlights: []
        };
        this.replays.set(gameId, replay);
        return replay;
    }

    /**
     * Record an event/action
     */
    recordEvent(gameId, event) {
        const replay = this.replays.get(gameId);
        if (!replay) return;

        const timestamp = Date.now() - replay.startTime;
        replay.events.push({
            ...event,
            timestamp
        });

        // Check if this is an epic moment
        if (this.isEpicMoment(event)) {
            replay.highlights.push({
                ...event,
                timestamp,
                epicType: this.getEpicType(event)
            });
            this.epicMoments.push({
                gameId,
                ...event,
                timestamp,
                epicType: this.getEpicType(event)
            });
        }
    }

    /**
     * Determine if an event is epic
     */
    isEpicMoment(event) {
        const epicConditions = [
            // Huge money gains
            event.type === 'money_gain' && event.amount >= 5000000,
            // Jackpot wins
            event.type === 'event' && event.eventId === 'jackpot',
            // Starman activation
            event.type === 'event' && event.eventId === 'starman',
            // Comeback victory (last place to first)
            event.type === 'game_won' && event.wasLastPlace,
            // Perfect game
            event.type === 'game_won' && event.bombsHit === 0 && event.money >= 10000000,
            // Chain reaction that eliminates multiple players
            event.type === 'chain_reaction' && event.playersEliminated >= 2,
            // Survive bomb with protection at critical moment
            event.type === 'protection_saved' && event.wouldHaveEliminated,
            // Mega streak
            event.type === 'streak_milestone' && event.streak >= 15,
            // Blammo revenge success
            event.type === 'blammo_hit' && event.summoner !== event.victim,
            // Super Joker redistribution
            event.type === 'event' && event.eventId === 'super_joker',
            // Cursed bomb hit
            event.type === 'bomb_hit' && event.bombType === 'cursed',
            // Minefield triggered
            event.type === 'event' && event.eventId === 'minefield'
        ];

        return epicConditions.some(condition => condition);
    }

    /**
     * Get epic moment type for categorization
     */
    getEpicType(event) {
        if (event.type === 'game_won') return 'victory';
        if (event.type === 'jackpot' || event.amount >= 10000000) return 'fortune';
        if (event.type === 'protection_saved' || event.type === 'starman') return 'survival';
        if (event.type === 'blammo_hit') return 'chaos';
        if (event.type === 'streak_milestone') return 'streak';
        if (event.type === 'chain_reaction') return 'destruction';
        return 'epic';
    }

    /**
     * End recording and finalize replay
     */
    endRecording(gameId, winner, finalStats) {
        const replay = this.replays.get(gameId);
        if (!replay) return null;

        replay.endTime = Date.now();
        replay.duration = replay.endTime - replay.startTime;
        replay.winner = winner;
        replay.finalStats = finalStats;

        return replay;
    }

    /**
     * Get replay summary
     */
    getReplaySummary(gameId) {
        const replay = this.replays.get(gameId);
        if (!replay) return null;

        return {
            gameId: replay.gameId,
            duration: Math.floor(replay.duration / 1000), // seconds
            players: replay.players.length,
            totalEvents: replay.events.length,
            highlights: replay.highlights.length,
            winner: replay.winner
        };
    }

    /**
     * Create replay highlight embed
     */
    createHighlightEmbed(highlight) {
        const epicEmojis = {
            victory: '👑',
            fortune: '💰',
            survival: '🛡️',
            chaos: '💥',
            streak: '🔥',
            destruction: '⚡',
            epic: '⭐'
        };

        const emoji = epicEmojis[highlight.epicType] || '⭐';

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle(`${emoji} Epic Moment Captured!`)
            .setDescription(this.getHighlightDescription(highlight))
            .addFields(
                { name: 'Player', value: highlight.playerName || 'Unknown', inline: true },
                { name: 'Time', value: `${Math.floor(highlight.timestamp / 1000)}s`, inline: true },
                { name: 'Type', value: highlight.epicType.toUpperCase(), inline: true }
            )
            .setFooter({ text: '📹 Replay saved' })
            .setTimestamp();

        return embed;
    }

    /**
     * Get description for highlight
     */
    getHighlightDescription(highlight) {
        switch (highlight.epicType) {
            case 'victory':
                if (highlight.wasLastPlace) {
                    return `**${highlight.playerName}** made an incredible comeback from last place to win!`;
                }
                return `**${highlight.playerName}** claimed victory with $${this.formatMoney(highlight.money)}!`;
            
            case 'fortune':
                if (highlight.eventId === 'jackpot') {
                    return `**${highlight.playerName}** hit the JACKPOT and won $${this.formatMoney(highlight.amount)}! 🎰`;
                }
                return `**${highlight.playerName}** earned a massive $${this.formatMoney(highlight.amount)}!`;
            
            case 'survival':
                return `**${highlight.playerName}** survived certain doom with protection!`;
            
            case 'chaos':
                return `**${highlight.summoner}** used Blammo to eliminate **${highlight.victim}**!`;
            
            case 'streak':
                return `**${highlight.playerName}** is on fire with a ${highlight.streak}-pick streak! 🔥`;
            
            case 'destruction':
                return `Chain reaction eliminated ${highlight.playersEliminated} players! 💥`;
            
            default:
                return `An epic moment occurred in the game!`;
        }
    }

    /**
     * Format money for display
     */
    formatMoney(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'K';
        }
        return amount.toString();
    }

    /**
     * Get all highlights from a game
     */
    getGameHighlights(gameId) {
        const replay = this.replays.get(gameId);
        return replay?.highlights || [];
    }

    /**
     * Get recent epic moments across all games
     */
    getRecentEpicMoments(limit = 10) {
        return this.epicMoments.slice(-limit).reverse();
    }

    /**
     * Create replay compilation embed
     */
    createReplayCompilationEmbed(gameId) {
        const replay = this.replays.get(gameId);
        if (!replay) return null;

        const duration = Math.floor((replay.endTime - replay.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('📹 Game Replay Available')
            .setDescription(`**${replay.highlights.length}** epic moments captured!`)
            .addFields(
                { name: 'Duration', value: `${minutes}:${seconds.toString().padStart(2, '0')}`, inline: true },
                { name: 'Players', value: replay.players.length.toString(), inline: true },
                { name: 'Total Events', value: replay.events.length.toString(), inline: true }
            );

        if (replay.highlights.length > 0) {
            const highlightList = replay.highlights
                .slice(0, 5)
                .map((h, i) => `${i + 1}. ${this.getHighlightDescription(h)}`)
                .join('\n');
            embed.addFields({ name: 'Top Moments', value: highlightList });
        }

        if (replay.winner) {
            embed.addFields({
                name: '👑 Winner',
                value: `**${replay.winner.username}** - $${this.formatMoney(replay.winner.money)}`
            });
        }

        embed.setFooter({ text: 'Use /rtab_replay to view highlights' });
        embed.setTimestamp();

        return embed;
    }
}

// Export singleton instance
module.exports = new RTABReplaySystem();
