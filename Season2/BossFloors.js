/**
 * Season 2 Boss Floors Module
 * High-Tension Guardian Boss Encounters with NO CLUES:
 * - Floor 10: The Architect (Blind Security Cipher Terminal - Mastermind deduction under pressure)
 * - Floor 20: The Loan Shark (Blind Dice Cup Wager Duel)
 * - Floor 30: The Grand Operator (Apex 4-Vault Showdown & The Operator's Gambit)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class BossFloors {
  // ==========================================
  // FLOOR 10 — THE ARCHITECT (Blind Cipher)
  // ==========================================
  static startArchitectBoss(userId, username, playerMoney = 500000) {
    const allNodes = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    // Pick 3 unique nodes in secret order for deduction
    const shuffled = [...allNodes].sort(() => Math.random() - 0.5);
    const targetSequence = shuffled.slice(0, 3);

    return {
      type: 'boss_architect',
      floor: 10,
      userId,
      username,
      playerMoney,
      nodes: allNodes,
      targetSequence,
      inputSequence: [],
      attemptHistory: [], // [{ sequence, exact, misplaced }]
      attemptsRemaining: 3,
      isCompleted: false,
      isSuccess: false,
      won: false,
      reward: 2500000,
      penalty: Math.max(500000, Math.floor(playerMoney * 0.25))
    };
  }

  static pressArchitectNode(state, nodeName) {
    if (state.isCompleted) return state;

    state.inputSequence.push(nodeName);

    // When 3 nodes have been entered for this attempt
    if (state.inputSequence.length === 3) {
      const isExactMatch = state.inputSequence.every((val, idx) => val === state.targetSequence[idx]);

      if (isExactMatch) {
        state.isCompleted = true;
        state.isSuccess = true;
        state.won = true;
        return state;
      }

      // Calculate Mastermind feedback
      let exact = 0;
      let misplaced = 0;
      const targetCopy = [...state.targetSequence];
      const inputCopy = [...state.inputSequence];

      for (let i = 0; i < 3; i++) {
        if (inputCopy[i] === targetCopy[i]) {
          exact++;
        } else if (targetCopy.includes(inputCopy[i])) {
          misplaced++;
        }
      }

      state.attemptHistory.push({
        sequence: [...state.inputSequence],
        exact,
        misplaced
      });

      state.attemptsRemaining--;
      state.inputSequence = [];

      if (state.attemptsRemaining <= 0) {
        state.isCompleted = true;
        state.isSuccess = false;
        state.won = false;
      }
    }

    return state;
  }

  // Alias
  static playArchitectNode(state, nodeName) {
    return this.pressArchitectNode(state, nodeName);
  }

  static createArchitectEmbed(state) {
    const inputDisplay = state.inputSequence.length > 0
      ? state.inputSequence.map(n => `\`[${n}]\``).join(' ➔ ')
      : '*[Enter 3-node sequence...]*';

    let historyText = '';
    if (state.attemptHistory.length > 0) {
      historyText = '\n### 📡 Diagnostic Terminal Log:\n' + state.attemptHistory.map((h, i) => {
        return `• **Try ${i + 1}**: ${h.sequence.map(n => `\`[${n}]\``).join(' ')} ➔ ` +
          `🟩 **${h.exact} Exact** | 🟨 **${h.misplaced} Wrong Slot**`;
      }).join('\n') + '\n';
    }

    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.isSuccess ? '#00FF00' : '#FF0000') : '#9B59B6')
      .setTitle('👑 GUARDIAN ENCOUNTER — FLOOR 10: THE ARCHITECT 👑')
      .setDescription(
        `**The Architect**: *"You expected a blueprint? In the Apex Tower, there are NO HANDOUTS. My security sequence is classified. Breach it blind, or my defense lasers will strip your bankroll!"*\n\n` +
        `### 🔐 Classified Security Cipher:\n` +
        `> ⬛ \`[ ??? ]\` ➔ ⬛ \`[ ??? ]\` ➔ ⬛ \`[ ??? ]\`\n` +
        `*(No clues provided! 3 secret nodes from Alpha, Beta, Gamma, Delta)*\n\n` +
        `**Current Input Buffer**: ${inputDisplay}\n` +
        `**Override Battery**: ${'🔋'.repeat(state.attemptsRemaining)}${'🪫'.repeat(Math.max(0, 3 - state.attemptsRemaining))} (**${state.attemptsRemaining}** tries left)\n` +
        historyText + '\n' +
        (state.isCompleted
          ? (state.isSuccess
              ? `🎉 **SYSTEM BYPASSED!** The terminal flashes emerald. The Architect steps aside in awe.\n` +
                `Awarded: **+$${state.reward.toLocaleString()}** & Architect's Blueprint perk!`
              : `💀 **CRITICAL SYSTEM LOCKDOWN!** The defense grid discharges! Confiscated: **-$${state.penalty.toLocaleString()}**. You crawl through the debris to the next floor.`)
          : `⚡ Input 3 nodes to test the firewall:`)
      )
      .setFooter({ text: 'Floor 10 Boss Guardian • Blind Cipher Override • No Clues' });

    return embed;
  }

  static createArchitectButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_architect_continue')
            .setLabel('Ascend to Floor 11 ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_architect_node_Alpha').setLabel('Alpha (🔴)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('s2_architect_node_Beta').setLabel('Beta (🔵)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_architect_node_Gamma').setLabel('Gamma (🟢)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('s2_architect_node_Delta').setLabel('Delta (🟡)').setStyle(ButtonStyle.Secondary)
    );

    return [row];
  }

  // ==========================================
  // FLOOR 20 — THE LOAN SHARK (Blind Duel)
  // ==========================================
  static startLoanSharkBoss(userId, username, playerMoney = 1000000) {
    const collateral = Math.max(250000, Math.floor(playerMoney * 0.25));
    // Roll the Shark's secret roll immediately under a closed cup
    const hiddenSharkRoll = Math.floor(Math.random() * 9) + 3; // 3 to 11

    return {
      type: 'boss_loan_shark',
      floor: 20,
      userId,
      username,
      playerMoney,
      collateral,
      currentRound: 1, // Best of 3
      playerWins: 0,
      sharkWins: 0,
      hiddenSharkRoll,
      roundHistory: [],
      isCompleted: false,
      isSuccess: false,
      won: false
    };
  }

  static duelRoundLoanShark(state, playStyle = 'standard') {
    if (state.isCompleted) return state;

    const sharkRoll = state.hiddenSharkRoll;
    let playerRoll;

    if (playStyle === 'overdrive') {
      // Roll 2 d12 and keep best
      const d1 = Math.floor(Math.random() * 12) + 1;
      const d2 = Math.floor(Math.random() * 12) + 1;
      playerRoll = Math.max(d1, d2);
    } else if (playStyle === 'safe') {
      // Safe stance: 5 to 9
      playerRoll = Math.floor(Math.random() * 5) + 5;
    } else {
      // Standard roll: 1 to 12
      playerRoll = Math.floor(Math.random() * 12) + 1;
    }

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
      style: playStyle,
      playerRoll,
      sharkRoll,
      winner
    });

    state.currentRound++;

    if (state.playerWins >= 2) {
      state.isCompleted = true;
      state.isSuccess = true;
      state.won = true;
    } else if (state.sharkWins >= 2 || state.currentRound > 3) {
      state.isCompleted = true;
      state.isSuccess = state.playerWins > state.sharkWins;
      state.won = state.isSuccess;
    } else {
      // Prepare next hidden roll for next round
      state.hiddenSharkRoll = Math.floor(Math.random() * 9) + 3;
    }

    return state;
  }

  // Alias
  static playLoanSharkRoll(state, strategy) {
    return this.duelRoundLoanShark(state, strategy);
  }

  static createLoanSharkEmbed(state) {
    const historyLines = state.roundHistory.map(
      h => `• **Round ${h.round}**: You rolled \`[${h.playerRoll}]\` vs Shark's revealed \`[${h.sharkRoll}]\` ➔ ${h.winner === 'player' ? '🟩 **WIN**' : h.winner === 'shark' ? '🟥 **LOSS**' : '🟨 **TIE**'}`
    );

    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.isSuccess ? '#00FF00' : '#FF0000') : '#E67E22')
      .setTitle('👑 GUARDIAN ENCOUNTER — FLOOR 20: THE LOAN SHARK 👑')
      .setDescription(
        `**The Loan Shark**: *"You want through Floor 20? 25% of your bankroll is on the table ($${state.collateral.toLocaleString()}). My dice are shaken under this closed steel cup. NO PEEKING. Choose your throw blindly!"*\n\n` +
        `🦈 **Shark's Current Cup**: \`[ 🔒 ❓ 🔒 ]\` *(Hidden roll sealed under steel cup)*\n` +
        `💰 **Collateral at Stake**: **$${state.collateral.toLocaleString()}**\n` +
        `📊 **Score**: 👤 You: **${state.playerWins}** | 🦈 Shark: **${state.sharkWins}** (First to 2 wins)\n\n` +
        (historyLines.length > 0 ? `### 🎲 Revealed Duel Rounds:\n${historyLines.join('\n')}\n\n` : '') +
        (state.isCompleted
          ? (state.isSuccess
              ? `🏆 **LOAN SHARK DEFEATED!** You broke the house! Kept your collateral + won **+$${state.collateral.toLocaleString()}** bonus & Tax Immunity perk!`
              : `💀 **FORECLOSED!** The Loan Shark smiles and sweeps your **-$${state.collateral.toLocaleString()}** collateral off the felt. You barely limp through to Floor 21.`)
          : `⚡ Select your roll stance against the Shark's hidden cup:`)
      )
      .setFooter({ text: 'Floor 20 Boss Guardian • Blind Cup Duel • Best of 3' });

    return embed;
  }

  static createLoanSharkButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_shark_continue')
            .setLabel('Ascend to Floor 21 ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_shark_roll_standard').setLabel('🎲 Standard Roll (1-12)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_shark_roll_overdrive').setLabel('🔥 Overdrive (Best of 2 Dice)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('s2_shark_roll_safe').setLabel('🛡️ Safe Stance (5-9)').setStyle(ButtonStyle.Secondary)
    );

    return [row];
  }

  // ==========================================
  // FLOOR 30 — THE GRAND OPERATOR SHOWDOWN
  // ==========================================
  static startGrandOperatorBoss(userId, username, playerMoney = 10000000) {
    const rawVaults = [
      { id: 0, name: 'Vault I', type: 'jackpot', desc: 'Grand Apex Jackpot (+100% Cash / +$25,000,000)', rewardBonus: Math.max(playerMoney, 25000000) },
      { id: 1, name: 'Vault II', type: 'safe', desc: 'Safe Extraction (+100% Retained + $10,000,000)', rewardBonus: 10000000 },
      { id: 2, name: 'Vault III', type: 'trap', desc: "The Operator's Toll (-50% Net Worth)", penalty: Math.floor(playerMoney * 0.5) },
      { id: 3, name: 'Vault IV', type: 'abyss', desc: 'The Void Abyss (-100% Bankruptcy - Confiscation)', penalty: playerMoney }
    ];

    // Shuffle vault contents completely
    const shuffledTypes = [...rawVaults].sort(() => Math.random() - 0.5);
    const vaults = [0, 1, 2, 3].map(i => ({
      id: i,
      name: `Vault ${['I', 'II', 'III', 'IV'][i]}`,
      type: shuffledTypes[i].type,
      desc: shuffledTypes[i].desc,
      rewardBonus: shuffledTypes[i].rewardBonus || 0,
      penalty: shuffledTypes[i].penalty || 0,
      isDestroyed: false
    }));

    return {
      type: 'boss_operator',
      floor: 30,
      userId,
      username,
      playerMoney,
      vaults,
      phase: 'pick', // 'pick', 'gambit', 'reveal'
      chosenVaultIndex: null,
      destroyedVaultIndex: null,
      chosenVault: null,
      selectedVault: null,
      isCompleted: false,
      won: false,
      buyoutAmount: 10000000
    };
  }

  static selectOperatorVault(state, vaultIndex) {
    if (state.phase !== 'pick') return state;

    state.chosenVaultIndex = vaultIndex;

    // Find one unchosen vault that is a trap or abyss to vaporize for the gambit
    const unchosenBad = state.vaults.filter(v => v.id !== vaultIndex && (v.type === 'trap' || v.type === 'abyss'));
    const toDestroy = unchosenBad.length > 0
      ? unchosenBad[Math.floor(Math.random() * unchosenBad.length)]
      : state.vaults.find(v => v.id !== vaultIndex);

    toDestroy.isDestroyed = true;
    state.destroyedVaultIndex = toDestroy.id;
    state.phase = 'gambit';
    return state;
  }

  // Alias
  static playOperatorVault(state, vaultIndex) {
    return this.selectOperatorVault(state, vaultIndex);
  }

  static operatorGambit(state, action, newVaultIndex = null) {
    if (state.phase !== 'gambit') return state;

    if (action === 'buyout') {
      state.phase = 'reveal';
      state.isCompleted = true;
      state.won = true;
      state.chosenVault = {
        name: 'Operator Buyout',
        type: 'buyout',
        desc: `Accepted Operator's Buyout (+$${state.buyoutAmount.toLocaleString()})`,
        rewardBonus: state.buyoutAmount,
        value: state.buyoutAmount
      };
      state.selectedVault = state.chosenVault;
      return state;
    }

    if (action === 'switch' && newVaultIndex !== null && newVaultIndex !== state.chosenVaultIndex) {
      state.chosenVaultIndex = newVaultIndex;
    }

    state.chosenVault = state.vaults[state.chosenVaultIndex];
    state.selectedVault = state.chosenVault;
    state.phase = 'reveal';
    state.isCompleted = true;
    state.won = state.chosenVault.type === 'jackpot' || state.chosenVault.type === 'safe';
    return state;
  }

  static createOperatorEmbed(state) {
    const embed = new EmbedBuilder();

    if (state.phase === 'pick') {
      embed
        .setColor('#8E44AD')
        .setTitle('👑 THE SUMMIT CLIMAX — FLOOR 30: THE GRAND OPERATOR 👑')
        .setDescription(
          `**The Grand Operator**: *"You made it to my sanctum. Four classified quantum vaults stand before you. NO CLUES. NO HANDOUTS. One holds the Apex Fortune. One holds absolute bankruptcy."*\n\n` +
          `🔐 **Vault I** • 🔐 **Vault II** • 🔐 **Vault III** • 🔐 **Vault IV**\n\n` +
          `• 👑 **Grand Apex Jackpot**: +$25,000,000 / +100% Fortune!\n` +
          `• 💎 **Safe Extraction**: +$10,000,000 guaranteed!\n` +
          `• ⚡ **Operator's Toll**: -50% Bank confiscation!\n` +
          `• 💀 **The Void Abyss**: -100% Bankruptcy ($0 out)!\n\n` +
          `⚠️ *Make your blind choice to initiate the summit sequence:*`
        )
        .setFooter({ text: 'Floor 30 Guardian • The Apex Showdown • No Clues' });
    } else if (state.phase === 'gambit') {
      const chosen = state.vaults[state.chosenVaultIndex];
      const destroyed = state.vaults[state.destroyedVaultIndex];

      embed
        .setColor('#E74C3C')
        .setTitle('⚡ THE OPERATOR\'S GAMBIT — FLOOR 30 ⚡')
        .setDescription(
          `**The Grand Operator**: *"You picked **${chosen.name}**... Confident, aren't you? Let me show you what you narrowly avoided."*\n\n` +
          `💥 **THE OPERATOR VAPORIZES ${destroyed.name.toUpperCase()}!**\n` +
          `> It contained: **${destroyed.desc}**! Eliminated!\n\n` +
          `**The Operator smiles coldly**:\n` +
          `*"Now only 3 vaults remain. Are you certain ${chosen.name} holds the Apex Jackpot? Or will you take my guaranteed **$10,000,000 Cash Buyout** right now?"*\n\n` +
          `1. 🚪 **STICK**: Keep your locked choice (**${chosen.name}**)\n` +
          `2. 🔄 **SWITCH**: Switch to another unopened vault\n` +
          `3. 💰 **BUYOUT**: Take **+$10,000,000** guaranteed and walk away with your fortune!`
        )
        .setFooter({ text: 'Floor 30 Guardian • The Operator\'s Gambit' });
    } else {
      // Reveal phase
      const chosen = state.chosenVault;
      const isWin = chosen.type === 'jackpot' || chosen.type === 'safe' || chosen.type === 'buyout';

      embed
        .setColor(isWin ? '#00FF00' : '#FF0000')
        .setTitle('🏆 THE APEX RESOLUTION — FLOOR 30 🏆')
        .setDescription(
          `### 🏁 VAULT DOORS HYDRAULICALLY OPEN:\n\n` +
          `Your Choice: **${chosen.name}**\n` +
          `> **Outcome**: **${chosen.desc}**\n\n` +
          state.vaults.map(v => `• **${v.name}**: ${v.isDestroyed ? '*(Vaporized)*' : v.desc} ${v.id === state.chosenVaultIndex ? '👈 *(YOUR VAULT)*' : ''}`).join('\n') + '\n\n' +
          (chosen.type === 'jackpot'
            ? `👑 **SUPREME APEX VICTORY!** You beat the Grand Operator at his own game! Awarded **+$${chosen.rewardBonus.toLocaleString()}**!`
            : chosen.type === 'safe'
            ? `💎 **LEGENDARY ESCAPE!** Safe Extraction secured! Awarded **+$${chosen.rewardBonus.toLocaleString()}** bonus!`
            : chosen.type === 'buyout'
            ? `💰 **BUYOUT SECURED!** You outsmarted the odds and banked the Operator's **+$10,000,000** bounty!`
            : chosen.type === 'trap'
            ? `⚡ **CAUGHT IN THE TOLL!** Confiscated: -$${chosen.penalty.toLocaleString()}! You escape with the remainder.`
            : `💀 **THE ABYSS CONSUMES ALL!** Total bankruptcy! You conquered 30 floors only to fall at the final threshold!`)
        )
        .setFooter({ text: 'Floor 30 Guardian • Ascent Concluded' });
    }

    return embed;
  }

  static createOperatorButtons(state) {
    if (state.phase === 'pick') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('s2_operator_vault_0').setLabel('Vault I').setEmoji('🔐').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('s2_operator_vault_1').setLabel('Vault II').setEmoji('🔐').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('s2_operator_vault_2').setLabel('Vault III').setEmoji('🔐').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('s2_operator_vault_3').setLabel('Vault IV').setEmoji('🔐').setStyle(ButtonStyle.Primary)
      );
      return [row];
    } else if (state.phase === 'gambit') {
      const remainingUnchosen = state.vaults.filter(v => v.id !== state.chosenVaultIndex && !v.isDestroyed);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('s2_operator_gambit_stick').setLabel(`🚪 Stick with ${state.vaults[state.chosenVaultIndex].name}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`s2_operator_gambit_switch_${remainingUnchosen[0].id}`).setLabel(`🔄 Switch to ${remainingUnchosen[0].name}`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('s2_operator_gambit_buyout').setLabel('💰 Take $10M Buyout').setStyle(ButtonStyle.Danger)
      );
      return [row];
    } else {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_boss_operator_continue')
            .setLabel('Claim Apex Victory ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }
  }
}

module.exports = BossFloors;

