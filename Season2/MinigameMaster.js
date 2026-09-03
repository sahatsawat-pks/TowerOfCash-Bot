/**
 * Minigame Master Module
 * Standalone game mode: Play ONLY minigames!
 * - Round 1: 5 random minigames (1 player plays once per game). Top 5 earners advance!
 * - Round 2: Semi-Finals - 3 Elite Minigames with 2x Multiplier. Top 2 advance!
 * - Round 3: Grand Final - Championship Showdown (Go Big or Go Broke / Boss duel).
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ALL_MINIGAME_TYPES = [
  'laser_infiltration',
  'blind_auction',
  'bomb_defusal',
  'high_roller_blackjack',
  'vault',
  'mega_grid',
  'boiling_point',
  'operator_roshambo',
  'hideout_breakthrough',
  'babushka',
  'infinity_percent',
  'door_escape',
  'advance_boardwalk',
  'bank_buster',
  'block_party',
  'community_chest',
  'electric_company',
  'park_it',
  'ride_rails'
];

class MinigameMasterSession {
  constructor(channelId, guildId, hostUser, isSolo = false) {
    this.channelId = channelId;
    this.guildId = guildId;
    this.host = hostUser;
    this.isSolo = isSolo;
    this.status = 'lobby'; // 'lobby', 'round1', 'round1_summary', 'round2', 'round2_summary', 'round3', 'completed'
    this.round = 1;
    this.players = new Map(); // userId -> { id, username, totalEarnings: 0, gamesPlayed: [], qualified: true }
    
    // Add host as first player
    this.addPlayer(hostUser.id, hostUser.username);

    // Selected minigames for current round
    this.roundMinigames = [];
    this.currentMinigameIndex = 0;
  }

  addPlayer(userId, username) {
    if (this.players.has(userId)) return false;
    this.players.set(userId, {
      id: userId,
      username,
      totalEarnings: 0,
      round1Earnings: 0,
      round2Earnings: 0,
      round3Earnings: 0,
      gamesPlayed: [],
      currentActiveGame: null,
      qualified: true
    });
    return true;
  }

  removePlayer(userId) {
    return this.players.delete(userId);
  }

  startRound1() {
    this.status = 'round1';
    this.round = 1;

    // Pick 5 random minigames
    const shuffled = [...ALL_MINIGAME_TYPES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.roundMinigames = shuffled.slice(0, 5);
    this.currentMinigameIndex = 0;
  }

  startRound2() {
    this.status = 'round2';
    this.round = 2;

    // Determine top 5 from Round 1
    const sorted = [...this.players.values()].sort((a, b) => b.totalEarnings - a.totalEarnings);
    if (this.isSolo) {
      // Solo qualifies if earned >= $500k
      sorted[0].qualified = sorted[0].totalEarnings >= 500000;
    } else {
      sorted.forEach((p, idx) => {
        p.qualified = idx < 5;
      });
    }

    // Pick 3 random minigames for Round 2
    const shuffled = [...ALL_MINIGAME_TYPES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.roundMinigames = shuffled.slice(0, 3);
    this.currentMinigameIndex = 0;
  }

  startRound3() {
    this.status = 'round3';
    this.round = 3;

    // Top 2 qualify for Championship
    const sorted = [...this.players.values()].filter(p => p.qualified).sort((a, b) => b.totalEarnings - a.totalEarnings);
    if (this.isSolo) {
      sorted[0].qualified = sorted[0].totalEarnings >= 2000000;
    } else {
      sorted.forEach((p, idx) => {
        p.qualified = idx < 2;
      });
    }

    this.roundMinigames = ['go_big_or_go_broke']; // Grand Finale Showdown
    this.currentMinigameIndex = 0;
  }

  recordGameEarnings(userId, gameType, earnings) {
    const p = this.players.get(userId);
    if (!p) return;

    // Round multiplier
    const multiplier = this.round === 2 ? 2 : (this.round === 3 ? 3 : 1);
    const finalEarnings = Math.max(0, earnings) * multiplier;

    p.totalEarnings += finalEarnings;
    if (this.round === 1) p.round1Earnings += finalEarnings;
    else if (this.round === 2) p.round2Earnings += finalEarnings;
    else if (this.round === 3) p.round3Earnings += finalEarnings;

    p.gamesPlayed.push({ gameType, earnings: finalEarnings, round: this.round });
  }

  getLeaderboard() {
    return [...this.players.values()].sort((a, b) => b.totalEarnings - a.totalEarnings);
  }

  createLobbyEmbed() {
    const playerList = [...this.players.values()].map((p, i) => `${i + 1}. **${p.username}**`).join('\n') || 'No players yet';

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🎮 MINIGAME MASTER — TOURNAMENT LOBBY 🎮')
      .setDescription(
        `**Host**: <@${this.host.id}>\n` +
        `**Game Mode**: Minigame Gauntlet & Championship\n\n` +
        `### 📜 Tournament Rules:\n` +
        `• **Round 1**: 5 Random Minigames (Qualifying Round). Top 5 earners advance!\n` +
        `• **Round 2**: 3 Elite Minigames with **2x Multipliers**! Top 2 advance!\n` +
        `• **Round 3**: Grand Final Showdown (*Go Big or Go Broke*)!\n\n` +
        `### 👥 Registered Players (${this.players.size}):\n` +
        `${playerList}\n\n` +
        `*Click Join to register. Host can start when ready!*`
      )
      .setFooter({ text: 'Season 2 Exclusive Tournament • Minigame Master' });

    return embed;
  }

  createLobbyButtons() {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_mgm_join').setLabel('🎮 Join Tournament').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('s2_mgm_leave').setLabel('❌ Leave').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('s2_mgm_start').setLabel('🚀 Start Tournament (Host)').setStyle(ButtonStyle.Primary)
    );
    return [row];
  }

  createRoundSummaryEmbed(roundNum) {
    const sorted = this.getLeaderboard();
    const qualifiesCount = roundNum === 1 ? 5 : 2;

    const rankingLines = sorted.map((p, i) => {
      const isQualified = this.isSolo ? p.qualified : i < qualifiesCount;
      const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '🎖️'));
      const statusTag = isQualified ? '✅ **QUALIFIED**' : '❌ *ELIMINATED*';
      return `${medal} **${p.username}**: $${p.totalEarnings.toLocaleString()} ➔ ${statusTag}`;
    });

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle(`🏆 MINIGAME MASTER — ROUND ${roundNum} STANDINGS 🏆`)
      .setDescription(
        `**Round ${roundNum} Complete!**\n\n` +
        `### 📊 Leaderboard & Qualification:\n` +
        `${rankingLines.join('\n')}\n\n` +
        (roundNum < 3
          ? `Top ${qualifiesCount} players advance to **Round ${roundNum + 1}**!`
          : `🎉 **TOURNAMENT COMPLETE!** Hail the Minigame Master Champion!`)
      )
      .setFooter({ text: `Season 2 Minigame Master • Round ${roundNum} Summary` });

    return embed;
  }

  createNextRoundButtons() {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('s2_mgm_next_round')
        .setLabel(`Proceed to Round ${this.round + 1} ➔`)
        .setStyle(ButtonStyle.Primary)
    );
    return [row];
  }
}

module.exports = { MinigameMasterSession, ALL_MINIGAME_TYPES };
