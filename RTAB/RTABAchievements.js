/**
 * RtaB Season 6 - Achievement System
 * Tracks and rewards special player accomplishments
 */

const { EmbedBuilder } = require('discord.js');

class RTABAchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
        this.playerAchievements = new Map(); // userId -> Set of achievement IDs
    }

    initializeAchievements() {
        return {
            // Survival Achievements
            'lucky_escape': {
                id: 'lucky_escape',
                name: '🍀 Lucky Escape',
                description: 'Survive a bomb with protection',
                rarity: 'common',
                points: 10
            },
            'bomb_magnet': {
                id: 'bomb_magnet',
                name: '💣 Bomb Magnet',
                description: 'Hit 5 bombs in one game',
                rarity: 'uncommon',
                points: 25
            },
            'defusal_expert': {
                id: 'defusal_expert',
                name: '✂️ Defusal Expert',
                description: 'Defuse 3 bombs in one game',
                rarity: 'rare',
                points: 50
            },
            'invincible': {
                id: 'invincible',
                name: '⭐ Invincible',
                description: 'Win without hitting any bombs',
                rarity: 'epic',
                points: 100
            },

            // Money Achievements
            'millionaire': {
                id: 'millionaire',
                name: '💰 Millionaire',
                description: 'Reach $1,000,000 in one game',
                rarity: 'common',
                points: 10
            },
            'high_roller': {
                id: 'high_roller',
                name: '💎 High Roller',
                description: 'Reach $10,000,000 in one game',
                rarity: 'rare',
                points: 50
            },
            'jackpot_winner': {
                id: 'jackpot_winner',
                name: '🎰 Jackpot Winner',
                description: 'Win the Jackpot event',
                rarity: 'epic',
                points: 100
            },
            'comeback_king': {
                id: 'comeback_king',
                name: '👑 Comeback King',
                description: 'Win from last place',
                rarity: 'legendary',
                points: 200
            },

            // Command Achievements
            'command_master': {
                id: 'command_master',
                name: '🎮 Command Master',
                description: 'Use 5 different hidden commands in one game',
                rarity: 'rare',
                points: 50
            },
            'tactical_genius': {
                id: 'tactical_genius',
                name: '🧠 Tactical Genius',
                description: 'Successfully use Fold, Peeker, and Failsafe in one game',
                rarity: 'epic',
                points: 100
            },
            'card_collector': {
                id: 'card_collector',
                name: '🃏 Card Collector',
                description: 'Hold 5+ hidden commands at once',
                rarity: 'rare',
                points: 50
            },

            // Event Achievements
            'starman_survivor': {
                id: 'starman_survivor',
                name: '⭐ Starman Survivor',
                description: 'Hit 3+ bombs while invincible',
                rarity: 'epic',
                points: 100
            },
            'event_hunter': {
                id: 'event_hunter',
                name: '✨ Event Hunter',
                description: 'Trigger 10 events in one game',
                rarity: 'rare',
                points: 50
            },
            'blessed': {
                id: 'blessed',
                name: '🌟 Blessed',
                description: 'Get Joker, Super Joker, and Jackpot in one game',
                rarity: 'legendary',
                points: 200
            },

            // Streak Achievements
            'hot_streak': {
                id: 'hot_streak',
                name: '🔥 Hot Streak',
                description: 'Pick 10 non-bomb squares in a row',
                rarity: 'uncommon',
                points: 25
            },
            'unstoppable': {
                id: 'unstoppable',
                name: '🚀 Unstoppable',
                description: 'Pick 20 non-bomb squares in a row',
                rarity: 'legendary',
                points: 200
            },

            // Special Achievements
            'blammo_revenge': {
                id: 'blammo_revenge',
                name: '💥 Blammo Revenge',
                description: 'Use Blammo command to eliminate another player',
                rarity: 'rare',
                points: 50
            },
            'perfect_game': {
                id: 'perfect_game',
                name: '👌 Perfect Game',
                description: 'Win with $10M+, no bombs hit, and 5+ commands used',
                rarity: 'legendary',
                points: 250
            },
            'chaos_agent': {
                id: 'chaos_agent',
                name: '😈 Chaos Agent',
                description: 'Trigger Minefield, Lockdown, and Bowser in one game',
                rarity: 'epic',
                points: 100
            },
            'last_stand': {
                id: 'last_stand',
                name: '⚔️ Last Stand',
                description: 'Win with only 1 life remaining',
                rarity: 'epic',
                points: 100
            }
        };
    }

    /**
     * Check and award achievements for a player action
     */
    checkAchievements(game, player, action) {
        const newAchievements = [];
        const playerAchievementSet = this.playerAchievements.get(player.userId) || new Set();

        switch (action.type) {
            case 'protection_used':
                if (!playerAchievementSet.has('lucky_escape')) {
                    newAchievements.push(this.achievements.lucky_escape);
                    playerAchievementSet.add('lucky_escape');
                }
                break;

            case 'money_milestone':
                if (player.money >= 10000000 && !playerAchievementSet.has('high_roller')) {
                    newAchievements.push(this.achievements.high_roller);
                    playerAchievementSet.add('high_roller');
                } else if (player.money >= 1000000 && !playerAchievementSet.has('millionaire')) {
                    newAchievements.push(this.achievements.millionaire);
                    playerAchievementSet.add('millionaire');
                }
                break;

            case 'jackpot_won':
                if (!playerAchievementSet.has('jackpot_winner')) {
                    newAchievements.push(this.achievements.jackpot_winner);
                    playerAchievementSet.add('jackpot_winner');
                }
                break;

            case 'bomb_hit':
                // Track total bombs hit
                const totalBombsHit = (player.bombsHit || 0);
                if (totalBombsHit >= 5 && !playerAchievementSet.has('bomb_magnet')) {
                    newAchievements.push(this.achievements.bomb_magnet);
                    playerAchievementSet.add('bomb_magnet');
                }
                break;

            case 'defuse_used':
                if (player.bombsDefused >= 3 && !playerAchievementSet.has('defusal_expert')) {
                    newAchievements.push(this.achievements.defusal_expert);
                    playerAchievementSet.add('defusal_expert');
                }
                break;

            case 'command_used':
                const uniqueCommands = new Set(player.commandsUsedList || []);
                if (uniqueCommands.size >= 5 && !playerAchievementSet.has('command_master')) {
                    newAchievements.push(this.achievements.command_master);
                    playerAchievementSet.add('command_master');
                }
                if (player.hiddenCommands.length >= 5 && !playerAchievementSet.has('card_collector')) {
                    newAchievements.push(this.achievements.card_collector);
                    playerAchievementSet.add('card_collector');
                }
                break;

            case 'streak_milestone':
                if (player.streak >= 20 && !playerAchievementSet.has('unstoppable')) {
                    newAchievements.push(this.achievements.unstoppable);
                    playerAchievementSet.add('unstoppable');
                } else if (player.streak >= 10 && !playerAchievementSet.has('hot_streak')) {
                    newAchievements.push(this.achievements.hot_streak);
                    playerAchievementSet.add('hot_streak');
                }
                break;

            case 'game_won':
                // Check various win conditions
                const bombsHitInGame = player.bombsHit || 0;
                if (bombsHitInGame === 0 && !playerAchievementSet.has('invincible')) {
                    newAchievements.push(this.achievements.invincible);
                    playerAchievementSet.add('invincible');
                }

                // Comeback victory
                if (action.wasLastPlace && !playerAchievementSet.has('comeback_king')) {
                    newAchievements.push(this.achievements.comeback_king);
                    playerAchievementSet.add('comeback_king');
                }

                // Perfect game
                if (player.money >= 10000000 && bombsHitInGame === 0 && 
                    (player.commandsUsed || 0) >= 5 && !playerAchievementSet.has('perfect_game')) {
                    newAchievements.push(this.achievements.perfect_game);
                    playerAchievementSet.add('perfect_game');
                }
                break;
        }

        this.playerAchievements.set(player.userId, playerAchievementSet);
        return newAchievements;
    }

    /**
     * Create achievement unlock embed
     */
    createAchievementEmbed(achievement, playerUsername) {
        const rarityColors = {
            common: 0x95A5A6,
            uncommon: 0x2ECC71,
            rare: 0x3498DB,
            epic: 0x9B59B6,
            legendary: 0xF39C12
        };

        return new EmbedBuilder()
            .setColor(rarityColors[achievement.rarity])
            .setTitle('🏆 Achievement Unlocked!')
            .setDescription(`**${playerUsername}** earned:\n\n${achievement.name}\n*${achievement.description}*`)
            .addFields(
                { name: 'Rarity', value: achievement.rarity.toUpperCase(), inline: true },
                { name: 'Points', value: `${achievement.points} 🌟`, inline: true }
            )
            .setTimestamp();
    }

    /**
     * Get player's total achievement points
     */
    getPlayerScore(userId) {
        const playerAchievements = this.playerAchievements.get(userId);
        if (!playerAchievements) return 0;

        let total = 0;
        for (const achievementId of playerAchievements) {
            total += this.achievements[achievementId]?.points || 0;
        }
        return total;
    }

    /**
     * Get all achievements for a player
     */
    getPlayerAchievements(userId) {
        const playerAchievementSet = this.playerAchievements.get(userId) || new Set();
        return Array.from(playerAchievementSet).map(id => this.achievements[id]);
    }
}

// Export singleton instance
module.exports = new RTABAchievementSystem();
