/**
 * Season 2 Boss Floors Module
 * Implements Guardian Boss Encounters for:
 * - Floor 10: The Architect (Security sequence node override)
 * - Floor 20: The Loan Shark (3-round collateral wager duel)
 * - Floor 30: The Grand Operator (Mystery Vault showdown)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class BossFloors {
  // ==========================================
  // FLOOR 10 — THE ARCHITECT
  // ==========================================
  static startArchitectBoss(userId, username, playerMoney = 100000) {
    const nodes = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const sequence = [];
    for (let i = 0; i < 4; i++) {
      sequence.push(nodes[Math.floor(Math.random() * nodes.length)]);
    }

    return {
      type: 'boss_architect',
      floor: 10,
      userId,
      username,
      playerMoney,
      nodes,
      targetSequence: sequence,
      inputSequence: [],
      attemptsRemaining: 2,
      isCompleted: false,
      isSuccess: false,
      reward: 1500000,
      penalty: Math.floor(playerMoney * 0.15)
    };
  }

  static pressArchitectNode(state, nodeName) {
    if (state.isCompleted) return state;

    state.inputSequence.push(nodeName);

    // Check if wrong at this step
    const currentIndex = state.inputSequence.length - 1;
    if (state.inputSequence[currentIndex] !== state.targetSequence[currentIndex]) {
      // Wrong node pressed!
      state.attemptsRemaining--;
      state.inputSequence = []; // reset current try

      if (state.attemptsRemaining <= 0) {
        state.isCompleted = true;
        state.isSuccess = false;
      }
      return state;
    }

    // Check if entire sequence completed
    if (state.inputSequence.length === state.targetSequence.length) {
      state.isCompleted = true;
      state.isSuccess = true;
    }

    return state;
  }

  static createArchitectEmbed(state) {
    const targetDisplay = state.targetSequence.map(n => `\`[${n}]\``).join(' ➔ ');
    const inputDisplay = state.inputSequence.length > 0
      ? state.inputSequence.map(n => `🟩 \`[${n}]\``).join(' ➔ ')
      : '*[Awaiting your input...]*';

    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.isSuccess ? '#00FF00' : '#FF0000') : '#3498DB')
      .setTitle('👑 GUARDIAN ENCOUNTER — FLOOR 10: THE ARCHITECT 👑')
      .setDescription(
        `**Guardian**: *"You think you can climb my tower unchecked? Override my security sequence to proceed!"*\n\n` +
        `### 🔐 Target Sequence:\n` +
        `> ${targetDisplay}\n\n` +
        `**Your Input Progress**:\n` +
        `> ${inputDisplay}\n\n` +
        `**Security Override Tries Remaining**: **${state.attemptsRemaining}**\n\n` +
        (state.isCompleted
          ? (state.isSuccess
              ? `🎉 **OVERRIDE SUCCESSFUL!** The Architect bows in respect.\n` +
                `Awarded: **+$${state.reward.toLocaleString()}** & Architect's Blueprint perk!`
              : `❌ **LOCKDOWN!** Override sequence failed. System surcharge applied: -$${state.penalty.toLocaleString()}. You are allowed to pass through the service stairwell.`)
          : `⚡ Press the buttons in the exact sequence shown above:`)
      )
      .setFooter({ text: 'Floor 10 Boss Guardian • Sequence Override' });

    return embed;
  }

  static createArchitectButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_architect_continue')
            .setLabel('Ascend Past Floor 10 ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_architect_node_Alpha').setLabel('Alpha (A)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_architect_node_Beta').setLabel('Beta (B)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_architect_node_Gamma').setLabel('Gamma (G)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_architect_node_Delta').setLabel('Delta (D)').setStyle(ButtonStyle.Primary)
    );

    return [row];
  }

  // ==========================================
  // FLOOR 20 — THE LOAN SHARK
  // ==========================================
  static startLoanSharkBoss(userId, username, playerMoney = 500000) {
    const collateral = Math.max(50000, Math.floor(playerMoney * 0.25));

    return {
      type: 'boss_loan_shark',
      floor: 20,
      userId,
      username,
      playerMoney,
      collateral,
      currentRound: 1, // 1 to 3
      playerWins: 0,
      sharkWins: 0,
      roundHistory: [], // [{ round, playerRoll, sharkRoll, winner }]
      isCompleted: false,
      isSuccess: false
    };
  }

  static duelRoundLoanShark(state, playStyle = 'balanced') {
    if (state.isCompleted) return state;

    let playerRoll, sharkRoll;

    if (playStyle === 'aggressive') {
      // 1 to 12
      playerRoll = Math.floor(Math.random() * 12) + 1;
    } else {
      // 3 to 10
      playerRoll = Math.floor(Math.random() * 8) + 3;
    }
    sharkRoll = Math.floor(Math.random() * 10) + 2;

    let winner = 'tie';
    if (playerRoll > sharkRoll) {
      winner = 'player';
      state.playerWins++;
    } else if (sharkRoll > playerRoll) {
      winner = 'shark';
      state.sharkWins++;
    }

    state.roundHistory.push({
      round: state.currentRound,
      playerRoll,
      sharkRoll,
      winner
    });

    state.currentRound++;

    if (state.playerWins >= 2) {
      state.isCompleted = true;
      state.isSuccess = true;
    } else if (state.sharkWins >= 2 || state.currentRound > 3) {
      state.isCompleted = true;
      state.isSuccess = state.playerWins > state.sharkWins;
    }

    return state;
  }

  static createLoanSharkEmbed(state) {
    const historyLines = state.roundHistory.map(
      h => `• **Round ${h.round}**: You rolled \`[${h.playerRoll}]\` vs Shark's \`[${h.sharkRoll}]\` ➔ ${h.winner === 'player' ? '🟩 **WIN**' : h.winner === 'shark' ? '🟥 **LOSS**' : '🟨 **TIE**'}`
    );

    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.isSuccess ? '#00FF00' : '#FF0000') : '#E67E22')
      .setTitle('👑 GUARDIAN ENCOUNTER — FLOOR 20: THE LOAN SHARK 👑')
      .setDescription(
        `**The Loan Shark**: *"Toll collector? No, I'm your worst nightmare. Pay the 25% toll or duel me for double!"*\n\n` +
        `💰 **Collateral Stake**: **$${state.collateral.toLocaleString()}**\n` +
        `📊 **Score**: 👤 You: **${state.playerWins}** | 🦈 Shark: **${state.sharkWins}** (Best of 3)\n\n` +
        (historyLines.length > 0 ? `### 🎲 Duel History:\n${historyLines.join('\n')}\n\n` : '') +
        (state.isCompleted
          ? (state.isSuccess
              ? `🏆 **DUEL WON!** You outrolled the Loan Shark! You kept your collateral and won an extra **+$${state.collateral.toLocaleString()}** (+100%) + Shark's Ledger immunity!`
              : `💀 **LOAN COLLECTED!** The Shark won the duel. Collateral forfeited: -$${state.collateral.toLocaleString()}. You may limp past floor 20.`)
          : `⚡ Choose your roll strategy for Round ${state.currentRound}:`)
      )
      .setFooter({ text: 'Floor 20 Boss Guardian • Best of 3 Collateral Duel' });

    return embed;
  }

  static createLoanSharkButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_shark_continue')
            .setLabel('Continue to Upper Floors ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_shark_roll_balanced').setLabel('🎲 Balanced Roll (3-10)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_shark_roll_aggressive').setLabel('🔥 Aggressive Roll (1-12)').setStyle(ButtonStyle.Danger)
    );

    return [row];
  }

  // ==========================================
  // FLOOR 30 — THE GRAND OPERATOR SHOWDOWN
  // ==========================================
  static startGrandOperatorBoss(userId, username, playerMoney = 1000000) {
    const vaults = [
      { id: 0, name: 'Vault Alpha', type: 'jackpot', desc: 'Grand Jackpot (+100% Cash / +$50M)', rewardBonus: Math.max(playerMoney, 10000000) },
      { id: 1, name: 'Vault Beta', type: 'safe', desc: 'The Safe Vault (Keep 100% Bank + $10M)', rewardBonus: 10000000 },
      { id: 2, name: 'Vault Gamma', type: 'trap', desc: "The Operator's Trap (-50% Penalty)", penalty: Math.floor(playerMoney * 0.5) }
    ];

    // Shuffle vault types
    for (let i = vaults.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempType = vaults[i].type;
      const tempDesc = vaults[i].desc;
      const tempBonus = vaults[i].rewardBonus;
      const tempPen = vaults[i].penalty;

      vaults[i].type = vaults[j].type;
      vaults[i].desc = vaults[j].desc;
      vaults[i].rewardBonus = vaults[j].rewardBonus;
      vaults[i].penalty = vaults[j].penalty;

      vaults[j].type = tempType;
      vaults[j].desc = tempDesc;
      vaults[j].rewardBonus = tempBonus;
      vaults[j].penalty = tempPen;
    }

    return {
      type: 'boss_operator',
      floor: 30,
      userId,
      username,
      playerMoney,
      vaults,
      chosenVaultIndex: null,
      chosenVault: null,
      isCompleted: false
    };
  }

  static selectOperatorVault(state, vaultIndex) {
    state.chosenVaultIndex = vaultIndex;
    state.chosenVault = state.vaults[vaultIndex];
    state.isCompleted = true;
    return state;
  }

  static createOperatorEmbed(state) {
    const embed = new EmbedBuilder()
      .setColor(
        state.isCompleted
          ? (state.chosenVault.type === 'jackpot' ? '#FFD700' : state.chosenVault.type === 'safe' ? '#00FF00' : '#FF0000')
          : '#8E44AD'
      )
      .setTitle('👑 THE CLIMAX — FLOOR 30: THE GRAND OPERATOR SHOWDOWN 👑')
      .setDescription(
        `**The Grand Operator**: *"You have defied all odds and reached the highest chamber in the tower. Now, your final test awaits."*\n\n` +
        `Your accumulated fortune of **$${state.playerMoney.toLocaleString()}** has been placed behind **3 Grand Vaults**.\n\n` +
        `🔐 **Vault 1** • 🔐 **Vault 2** • 🔐 **Vault 3**\n\n` +
        `• 🌟 **Grand Jackpot Vault**: Doubled fortune! (+100% Cash)\n` +
        `• 🛡️ **Safe Haven Vault**: Keep all earnings + $10,000,000 bonus!\n` +
        `• ⚡ **Operator's Trap**: 50% Bank confiscation!\n\n` +
        (state.isCompleted
          ? `### 🏆 VAULT REVELATION:\n` +
            `You unlocked **${state.chosenVault.name}**!\n` +
            `> **Contents**: **${state.chosenVault.desc}**\n\n` +
            state.vaults.map(v => `• **${v.name}**: ${v.desc} ${v.id === state.chosenVaultIndex ? '👈 *(Your Choice)*' : ''}`).join('\n') + '\n\n' +
            (state.chosenVault.type === 'jackpot'
              ? `🎉 **SUPREME VICTORY!** The Grand Operator is defeated! Awarded **+$${state.chosenVault.rewardBonus.toLocaleString()}**!`
              : state.chosenVault.type === 'safe'
              ? `✅ **ASCENSION CONFIRMED!** Safe Vault secured! Awarded **+$${state.chosenVault.rewardBonus.toLocaleString()}** bonus!`
              : `⚠️ **TRAP SPRUNG!** The Operator triggers his failsafe: -$${state.chosenVault.penalty.toLocaleString()}. You escape with the remainder!`)
          : `Choose your vault to conclude your Season 2 ascent:`)
      )
      .setFooter({ text: 'Floor 30 Guardian • The Summit Climax' });

    return embed;
  }

  static createOperatorButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_operator_continue')
            .setLabel('Claim Ultimate Victory ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_operator_vault_0').setLabel('Vault 1 (Alpha)').setEmoji('🔐').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_operator_vault_1').setLabel('Vault 2 (Beta)').setEmoji('🔐').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_operator_vault_2').setLabel('Vault 3 (Gamma)').setEmoji('🔐').setStyle(ButtonStyle.Primary)
    );

    return [row];
  }
}

module.exports = BossFloors;
