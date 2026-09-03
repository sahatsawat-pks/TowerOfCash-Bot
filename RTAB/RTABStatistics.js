/**
 * RtaB Season 6 - Statistics & Leaderboard System
 * Comprehensive player statistics tracking and global leaderboards
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class RTABStatistics {
    constructor() {
        this.statsFile = path.join(__dirname, 'rtab_stats.json');
        this.stats = this.loadStats();
        this.sessionStats = new Map(); // Current game session stats
    }

    /**
     * Load statistics from file
     */
    loadStats() {
        try {
            if (fs.existsSync(this.statsFile)) {
                return JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }

        return {
            players: {}, // userId -> player stats
            global: {
                totalGames: 0,
                totalMoneyEarned: 0,
                totalBombsHit: 0,
                totalEventsTriggered: 0,
                totalCommandsUsed: 0
            }
        };
    }

    /**
     * Save statistics to file
     */
    saveStats() {
        try {
            fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    /**
     * Initialize player stats if they don't exist
     */
    ensurePlayer(userId, username) {
        if (!this.stats.players[userId]) {
            this.stats.players[userId] = {
                userId,
                username,
                gamesPlayed: 0,
                gamesWon: 0,
                totalMoneyEarned: 0,
                highestEarning: 0,
                bombsHit: 0,
                bombsDefused: 0,
                bombsRepelled: 0,
                eventsTriggered: 0,
                commandsUsed: 0,
                hiddenCommandsFound: 0,
                peeksUsed: 0,
                longestStreak: 0,
                jackpotsWon: 0,
                starmanActivations: 0,
                blammoSummoned: 0,
                blammoVictims: 0,
                comebackWins: 0,
                perfectGames: 0,
                achievementPoints: 0,
                totalPlayTime: 0, // milliseconds
                lastPlayed: null
            };
        }
        return this.stats.players[userId];
    }

    /**
     * Start tracking a game session
     */
    startGameSession(gameId, players) {
        this.sessionStats.set(gameId, {
            gameId,
            startTime: Date.now(),
            players: players.map(p => ({
                userId: p.userId,
                username: p.username,
                startingMoney: 0,
                moneyEarned: 0,
                bombsHit: 0,
                bombsDefused: 0,
                eventsTriggered: 0,
                commandsUsed: 0,
                peeksUsed: 0,
                streak: 0,
                longestStreak: 0
            })),
            events: []
        });
    }

    /**
     * Record an event in the current session
     */
    recordSessionEvent(gameId, event) {
        const session = this.sessionStats.get(gameId);
        if (!session) return;

        session.events.push({
            ...event,
            timestamp: Date.now() - session.startTime
        });

        // Update player-specific session stats
        if (event.userId) {
            const playerSession = session.players.find(p => p.userId === event.userId);
            if (playerSession) {
                switch (event.type) {
                    case 'money_gain':
                        playerSession.moneyEarned += event.amount;
                        break;
                    case 'bomb_hit':
                        playerSession.bombsHit++;
                        break;
                    case 'bomb_defused':
                        playerSession.bombsDefused++;
                        break;
                    case 'event_triggered':
                        playerSession.eventsTriggered++;
                        break;
                    case 'command_used':
                        playerSession.commandsUsed++;
                        break;
                    case 'peek_used':
                        playerSession.peeksUsed++;
                        break;
                    case 'streak_update':
                        playerSession.streak = event.streak;
                        playerSession.longestStreak = Math.max(playerSession.longestStreak, event.streak);
                        break;
                }
            }
        }
    }

    /**
     * End game session and update permanent stats
     */
    endGameSession(gameId, winner, players) {
        const session = this.sessionStats.get(gameId);
        if (!session) return;

        const duration = Date.now() - session.startTime;

        // Update global stats
        this.stats.global.totalGames++;

        // Update each player's permanent stats
        players.forEach(player => {
            const playerStats = this.ensurePlayer(player.userId, player.username);
            const playerSession = session.players.find(p => p.userId === player.userId);
            
            if (playerSession) {
                playerStats.gamesPlayed++;
                playerStats.totalMoneyEarned += player.money;
                playerStats.highestEarning = Math.max(playerStats.highestEarning, player.money);
                playerStats.bombsHit += playerSession.bombsHit;
                playerStats.bombsDefused += player.bombsDefused || 0;
                playerStats.bombsRepelled += player.bombsRepelled || 0;
                playerStats.eventsTriggered += playerSession.eventsTriggered;
                playerStats.commandsUsed += player.commandsUsed || 0;
                playerStats.peeksUsed += playerSession.peeksUsed;
                playerStats.longestStreak = Math.max(playerStats.longestStreak, playerSession.longestStreak);
                playerStats.totalPlayTime += duration;
                playerStats.lastPlayed = Date.now();

                // Check for win
                if (winner && winner.userId === player.userId) {
                    playerStats.gamesWon++;
                }

                // Update global stats
                this.stats.global.totalMoneyEarned += player.money;
                this.stats.global.totalBombsHit += playerSession.bombsHit;
                this.stats.global.totalEventsTriggered += playerSession.eventsTriggered;
                this.stats.global.totalCommandsUsed += player.commandsUsed || 0;
            }
        });

        this.saveStats();
        this.sessionStats.delete(gameId);
    }

    /**
     * Get player statistics
     */
    getPlayerStats(userId) {
        return this.stats.players[userId] || null;
    }

    /**
     * Get leaderboard by category
     */
    getLeaderboard(category, limit = 10) {
        const players = Object.values(this.stats.players)
            .filter(p => p.gamesPlayed > 0);

        switch (category) {
            case 'wins':
                return players.sort((a, b) => b.gamesWon - a.gamesWon).slice(0, limit);
            case 'money':
                return players.sort((a, b) => b.totalMoneyEarned - a.totalMoneyEarned).slice(0, limit);
            case 'winrate':
                return players
                    .filter(p => p.gamesPlayed >= 5) // Minimum 5 games
                    .sort((a, b) => (b.gamesWon / b.gamesPlayed) - (a.gamesWon / a.gamesPlayed))
                    .slice(0, limit);
            case 'streak':
                return players.sort((a, b) => b.longestStreak - a.longestStreak).slice(0, limit);
            case 'survivor':
                return players.sort((a, b) => {
                    const aRatio = a.bombsHit > 0 ? a.bombsDefused / a.bombsHit : 0;
                    const bRatio = b.bombsHit > 0 ? b.bombsDefused / b.bombsHit : 0;
                    return bRatio - aRatio;
                }).slice(0, limit);
            case 'achievements':
                return players.sort((a, b) => b.achievementPoints - a.achievementPoints).slice(0, limit);
            default:
                return players.sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, limit);
        }
    }

    /**
     * Create statistics embed for a player
     */
    createStatsEmbed(userId) {
        const stats = this.getPlayerStats(userId);
        if (!stats) {
            return new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('📊 Player Statistics')
                .setDescription('No statistics available. Play a game first!');
        }

        const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : '0.0';
        const avgEarnings = stats.gamesPlayed > 0 ? Math.floor(stats.totalMoneyEarned / stats.gamesPlayed) : 0;
        const survivalRate = stats.bombsHit > 0 ? ((stats.bombsDefused / stats.bombsHit) * 100).toFixed(1) : '0.0';

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`📊 ${stats.username}'s Statistics`)
            .addFields(
                {
                    name: '🎮 Game Record',
                    value: `Played: **${stats.gamesPlayed}**\nWon: **${stats.gamesWon}**\nWin Rate: **${winRate}%**`,
                    inline: true
                },
                {
                    name: '💰 Earnings',
                    value: `Total: **$${this.formatMoney(stats.totalMoneyEarned)}**\nHighest: **$${this.formatMoney(stats.highestEarning)}**\nAverage: **$${this.formatMoney(avgEarnings)}**`,
                    inline: true
                },
                {
                    name: '💣 Bombs',
                    value: `Hit: **${stats.bombsHit}**\nDefused: **${stats.bombsDefused}**\nRepelled: **${stats.bombsRepelled}**\nSurvival: **${survivalRate}%**`,
                    inline: true
                },
                {
                    name: '🎮 Commands & Events',
                    value: `Commands Used: **${stats.commandsUsed}**\nEvents Triggered: **${stats.eventsTriggered}**\nPeeks Used: **${stats.peeksUsed}**`,
                    inline: true
                },
                {
                    name: '🏆 Achievements',
                    value: `Longest Streak: **${stats.longestStreak}**\nJackpots Won: **${stats.jackpotsWon}**\nPoints: **${stats.achievementPoints}** 🌟`,
                    inline: true
                },
                {
                    name: '⭐ Special',
                    value: `Comebacks: **${stats.comebackWins}**\nPerfect Games: **${stats.perfectGames}**\nBlammo Used: **${stats.blammoSummoned}**`,
                    inline: true
                }
            )
            .setFooter({ text: `Last played: ${this.formatDate(stats.lastPlayed)}` })
            .setTimestamp();

        return embed;
    }

    /**
     * Create leaderboard embed
     */
    createLeaderboardEmbed(category = 'wins', limit = 10) {
        const leaderboard = this.getLeaderboard(category, limit);
        
        const categoryNames = {
            wins: '🏆 Most Wins',
            money: '💰 Total Earnings',
            winrate: '📈 Win Rate',
            streak: '🔥 Longest Streak',
            survivor: '🛡️ Best Survivor',
            achievements: '⭐ Achievement Points'
        };

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle(`${categoryNames[category] || '📊 Leaderboard'}`)
            .setDescription(`Top ${limit} players`)
            .setTimestamp();

        if (leaderboard.length === 0) {
            embed.addFields({ name: 'No Data', value: 'Play some games to appear on the leaderboard!' });
            return embed;
        }

        const medals = ['🥇', '🥈', '🥉'];
        const entries = leaderboard.map((player, index) => {
            const medal = medals[index] || `${index + 1}.`;
            let value;

            switch (category) {
                case 'wins':
                    value = `${player.gamesWon} wins (${player.gamesPlayed} played)`;
                    break;
                case 'money':
                    value = `$${this.formatMoney(player.totalMoneyEarned)}`;
                    break;
                case 'winrate':
                    const rate = ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1);
                    value = `${rate}% (${player.gamesWon}/${player.gamesPlayed})`;
                    break;
                case 'streak':
                    value = `${player.longestStreak} picks`;
                    break;
                case 'survivor':
                    const survivalRate = player.bombsHit > 0 ? 
                        ((player.bombsDefused / player.bombsHit) * 100).toFixed(1) : '0.0';
                    value = `${survivalRate}% (${player.bombsDefused}/${player.bombsHit})`;
                    break;
                case 'achievements':
                    value = `${player.achievementPoints} points`;
                    break;
                default:
                    value = `${player.gamesPlayed} games`;
            }

            return `${medal} **${player.username}** - ${value}`;
        }).join('\n');

        embed.addFields({ name: 'Rankings', value: entries });

        // Add global stats footer
        embed.setFooter({
            text: `Global: ${this.stats.global.totalGames} games • $${this.formatMoney(this.stats.global.totalMoneyEarned)} earned`
        });

        return embed;
    }

    /**
     * Format money for display
     */
    formatMoney(amount) {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(2) + 'B';
        }
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'K';
        }
        return amount.toString();
    }

    /**
     * Format date for display
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    /**
     * Get global statistics embed
     */
    createGlobalStatsEmbed() {
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🌍 Global RtaB Statistics')
            .addFields(
                {
                    name: '🎮 Games',
                    value: `Total: **${this.stats.global.totalGames}**`,
                    inline: true
                },
                {
                    name: '💰 Money',
                    value: `Total Earned: **$${this.formatMoney(this.stats.global.totalMoneyEarned)}**`,
                    inline: true
                },
                {
                    name: '💣 Bombs',
                    value: `Total Hit: **${this.stats.global.totalBombsHit}**`,
                    inline: true
                },
                {
                    name: '✨ Events',
                    value: `Triggered: **${this.stats.global.totalEventsTriggered}**`,
                    inline: true
                },
                {
                    name: '🎮 Commands',
                    value: `Used: **${this.stats.global.totalCommandsUsed}**`,
                    inline: true
                },
                {
                    name: '👥 Players',
                    value: `Total: **${Object.keys(this.stats.players).length}**`,
                    inline: true
                }
            )
            .setTimestamp();

        return embed;
    }
}

// Export singleton instance
module.exports = new RTABStatistics();
