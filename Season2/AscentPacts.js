/**
 * Season 2 Ascent Pacts Module
 * Implements Roguelike Modifiers chosen at the start of each round (Rounds 2+):
 * - Pact of Greed: +100% cash rewards, +1 Game Over injected
 * - Pact of Fragility: Multipliers doubled, but negative % is fatal
 * - Pact of the Blind: Floor hints/history hidden, surviving round awards Golden Shield
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class AscentPacts {
  static getAvailablePacts() {
    return [
      {
        id: 'pact_greed',
        name: '🪙 Pact of Greed',
        emoji: '🪙',
        advantage: '+100% to all cash rewards this round (Double Cash)',
        disadvantage: '+1 extra Game Over tile is injected into the active floor pool',
        tag: 'High Reward / Deadly Trap'
      },
      {
        id: 'pact_fragility',
        name: '⚡ Pact of Fragility',
        emoji: '⚡',
        advantage: 'All multipliers and boosts are doubled (e.g., 2x ➔ 4x)',
        disadvantage: 'Any negative percentage tile (-25% to -75%) causes instant Fatal Game Over',
        tag: 'Glass Cannon / Instant Death Risk'
      },
      {
        id: 'pact_blind',
        name: '👁️ Pact of the Blind',
        emoji: '👁️',
        advantage: 'Surviving the round awards a free Golden Shield (protects against Game Over)',
        disadvantage: 'Remaining amount counters and floor hints are completely obscured',
        tag: 'Blindfolded / Shield Bounty'
      }
    ];
  }

  static createPactEmbed(roundNum, maxRounds = 8) {
    const pacts = this.getAvailablePacts();

    const pactDescriptions = pacts.map((p, i) =>
      `### ${i + 1}. ${p.name} *(${p.tag})*\n` +
      `> 🟢 **Advantage**: ${p.advantage}\n` +
      `> 🔴 **Risk**: ${p.disadvantage}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#D4AC0D')
      .setTitle(`🃏 ASCENT PACT SELECTION — ROUND ${roundNum}/${maxRounds} 🃏`)
      .setDescription(
        `Before selecting your floors for **Round ${roundNum}**, you must sign an **Ascent Pact**.\n` +
        `The chosen pact will alter tower physics and stakes for the duration of this round.\n\n` +
        `${pactDescriptions}\n\n` +
        `*Sign your pact below to proceed to floor selection:*`
      )
      .setFooter({ text: 'Season 2 Roguelike System • Select 1 Pact per Round' });

    return embed;
  }

  static createPactButtons() {
    const pacts = this.getAvailablePacts();
    const row = new ActionRowBuilder();

    pacts.forEach((p) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`s2_pact_${p.id}`)
          .setLabel(p.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(p.emoji)
      );
    });

    return [row];
  }

  static applyPact(game, pactId) {
    game.activePact = pactId;
    const pact = this.getAvailablePacts().find(p => p.id === pactId);
    return pact;
  }
}

module.exports = AscentPacts;
