const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('./config.json');

class GameUI {
  static formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static createIntroEmbed() {
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏢 Tower of Cash 🏢')
      .setDescription(
        '**Welcome to Tower of Cash!**\n' +
        'A thrilling game of risk and reward where you climb 21 floors across 6 rounds.\n\n' +
        '**🎮 How to Play:**\n' +
        '• Start with `/play` command\n' +
        '• Select floors for each round (6→5→4→3→2→1 floors per round)\n' +
        '• Choose any available floor from 1-21\n' +
        '• On each floor, pick ⬅️ **LEFT** or ➡️ **RIGHT**\n' +
        '• Build your fortune by choosing wisely!\n' +
        '• Stop between rounds to keep your winnings, or risk it all!\n\n' +
        '**💰 What You Can Win:**\n' +
        '• Cash amounts: $1 to $1,000,000\n' +
        '• Percentages: -100% to +100%\n' +
        '• Random amounts: Mystery prizes\n' +
        '• Special bonuses: Add a 0, Add a 1\n' +
        '• Dangers: Nothing, X Level, Game Over\n\n' +
        '**🏆 Game Modes:**\n' +
        '• Complete all 21 floors = Winner!\n' +
        '• Go to Lobby between rounds = Keep your money\n' +
        '• Hit Game Over or -100% at the end of the round (after Round 1) = Lose everything\n\n' +
        '**📊 Features:**\n' +
        '• Server-specific leaderboards\n' +
        '• Track your personal stats\n' +
        '• 2 free plays per day\n' +
        '• See what you avoided with each choice!\n\n' +
        '**Commands:**\n' +
        '• `/play` - Start a new game\n' +
        '• `/leaderboard` - View top players\n' +
        '• `/stats` - Check your statistics\n' +
        '• `/help` - Quick help guide\n' +
        '• `/intro` - Show this message'
      )
      .setThumbnail('https://lh3.googleusercontent.com/pw/AP1GczN2fqEdyb3XDwZWRR0voiHMX124Os5ZbDS0EFW_noAyUqSn8dyaJ1tjRnV8I3OX7ZTQkJBesaJJTad0P8Krss6OqCtmSr-l7ODEcFxWQmF3DdBGhk6ZZJwf1dB5KXaJaR61mYPXIlgsXoIN429vG7dg=w1042-h1042-s-no-gm?authuser=0')
      .setFooter({ text: 'Good luck climbing the tower!' })
      .setTimestamp();
  }

  static createWelcomeEmbed(remainingPlays, eventMode = false) {
    const floors = eventMode ? 28 : 21;
    const rounds = eventMode ? 7 : 6;
    const modeLabel = eventMode ? ' 🌟 Season 1 Mode 🌟' : '';

    return new EmbedBuilder()
      .setColor(eventMode ? '#FF1493' : '#FFD700')
      .setTitle(`🏢 Welcome to Tower of Cash!${modeLabel} 🏢`)
      .setDescription(
        '**How to Play:**\n' +
        `• Climb ${floors} floors across ${rounds} rounds\n` +
        '• Each round, select floors to play\n' +
        '• On each floor, choose LEFT ⬅️ or RIGHT ➡️\n' +
        '• Build your fortune or risk it all!\n\n' +
        (eventMode ? '**Season 1 Features:**\n• New minigames: The Vault, Operator Offer, Mega Grid, The ∞%, Hideout Breakthrough, Babushka\n• Boost Multiplier & Random 5\n\n' : '') +
        '**Game Ends When:**\n' +
        '• You choose "Game Over" (lose everything)\n' +
        '• You choose "Go to Lobby" (keep your winnings)\n' +
        '• You hit -100% in the end of the round (lose everything, except Round 1)\n' +
        '• You complete all floors (winner!)\n\n' +
        `**Remaining Plays Today:** ${remainingPlays}/2`
      )
      .setFooter({ text: 'Select floors to begin!' })
      .setTimestamp();
  }

  static createFloorSelectionEmbed(game) {
    const availableFloors = game.getAvailableFloors();
    const playedCount = game.playedFloors.length;
    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);
    const maxFloors = game.eventMode ? 28 : 21;
    const maxRounds = game.eventMode ? 7 : 6;

    return new EmbedBuilder()
      .setColor(game.eventMode ? '#FF1493' : '#4169E1')
      .setTitle(`🎯 Round ${game.currentRound}/${maxRounds} - Floor Selection`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Floors Played:** ${playedCount}/${maxFloors}\n\n` +
        `Select **${game.floorsToSelect}** floors from the available floors (1-${maxFloors})\n\n` +
        `**Selected Floors:** ${game.selectedFloors.length > 0 ? game.selectedFloors.join(', ') : 'None'}\n` +
        `**Remaining to Select:** ${game.floorsToSelect - game.selectedFloors.length}\n\n` +
        `**Available Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: `Pick any available floors from 1 to ${maxFloors}` });
  }

  static createFloorSelectionButtons(game) {
    const availableFloors = game.getAvailableFloors();
    const maxFloors = game.eventMode ? 28 : 21;
    const rows = [];

    if (game.eventMode) {
      // Event mode: Show 14 floors per page with pagination
      const floorsPerPage = 14;
      const currentPage = game.floorSelectionPage || 0;
      const startFloor = currentPage * floorsPerPage + 1;
      const endFloor = Math.min(startFloor + floorsPerPage - 1, maxFloors);

      let currentRow = [];

      // Create buttons for current page of floors
      for (let i = startFloor; i <= endFloor; i++) {
        const isSelected = game.selectedFloors.includes(i);
        const isPlayed = game.playedFloors.includes(i);

        const button = new ButtonBuilder()
          .setCustomId(`floor_${i}`)
          .setLabel(`${i}`)
          .setStyle(isSelected ? ButtonStyle.Success : isPlayed ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(isPlayed);

        currentRow.push(button);

        // 5 buttons per row (Discord limit)
        if (currentRow.length === 5) {
          rows.push(new ActionRowBuilder().addComponents(currentRow));
          currentRow = [];
        }
      }

      // Add remaining buttons from current row
      if (currentRow.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
      }

      // Add navigation and confirm buttons in last row
      const navRow = [];

      // Previous button (if not on first page)
      if (currentPage > 0) {
        navRow.push(
          new ButtonBuilder()
            .setCustomId('floor_page_prev')
            .setLabel('⬅️ Previous')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      // Page indicator (disabled button showing current page)
      const totalPages = Math.ceil(maxFloors / floorsPerPage);
      navRow.push(
        new ButtonBuilder()
          .setCustomId('floor_page_info')
          .setLabel(`Page ${currentPage + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      // Next button (if not on last page)
      if (endFloor < maxFloors) {
        navRow.push(
          new ButtonBuilder()
            .setCustomId('floor_page_next')
            .setLabel('Next ➡️')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      // Confirm button
      navRow.push(
        new ButtonBuilder()
          .setCustomId('confirm_floors')
          .setLabel('✅ Start Round')
          .setStyle(ButtonStyle.Success)
          .setDisabled(!game.hasSelectedAllFloors())
      );

      rows.push(new ActionRowBuilder().addComponents(navRow));

    } else {
      // Normal mode: use buttons (21 floors fits in 5 rows)
      let currentRow = [];

      for (let i = 1; i <= maxFloors; i++) {
        const isSelected = game.selectedFloors.includes(i);
        const isPlayed = game.playedFloors.includes(i);

        const button = new ButtonBuilder()
          .setCustomId(`floor_${i}`)
          .setLabel(`${i}`)
          .setStyle(isSelected ? ButtonStyle.Success : isPlayed ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(isPlayed);

        currentRow.push(button);

        if (currentRow.length === 5) {
          rows.push(new ActionRowBuilder().addComponents(currentRow));
          currentRow = [];
        }
      }

      // Add confirm button to the last row
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_floors')
        .setLabel('✅ Start Round')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!game.hasSelectedAllFloors());

      currentRow.push(confirmButton);
      rows.push(new ActionRowBuilder().addComponents(currentRow));
    }

    return rows;
  }

  static createFloorChoiceEmbed(game, floorNumber, choices) {
    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);

    return new EmbedBuilder()
      .setColor('#FF6347')
      .setTitle(`🏢 Floor ${floorNumber} - Make Your Choice!`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Round:** ${game.currentRound}/${game.eventMode ? 7 : 6}\n` +
        `**Floor in Round:** ${game.currentFloor + 1}/${game.selectedFloors.length}\n` +
        `**Total Floors Played:** ${game.floorsCompleted}/21\n\n` +
        '**Choose a side:**\n' +
        '⬅️ Left - Hidden\n' +
        '➡️ Right - Hidden\n\n' +
        `**Available Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: 'You cannot stop during the round!' });
  }

  static createFloorChoiceButtons() {
    const leftButton = new ButtonBuilder()
      .setCustomId('choice_left')
      .setLabel('⬅️ Left')
      .setStyle(ButtonStyle.Primary);

    const rightButton = new ButtonBuilder()
      .setCustomId('choice_right')
      .setLabel('➡️ Right')
      .setStyle(ButtonStyle.Primary);

    return [
      new ActionRowBuilder().addComponents(leftButton, rightButton)
    ];
  }

  static createPartialResultEmbed(game, floorNumber, choice, chosenAmount, moneyBefore, moneyAfter) {
    const chosenDisplay = game.getDisplayValue(chosenAmount);
    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);

    // Calculate immediate result text (without comparison)
    let resultText = '';
    const actualGain = moneyAfter - moneyBefore;

    if (chosenAmount.type === 'game_over') {
      resultText = '💀 **GAME OVER!** You hit the Game Over tile!';
    } else if (chosenAmount.type === 'special' && chosenAmount.action === 'x_level') {
      resultText = `❌ **X LEVEL!**\n\n**The last floor will be skipped!**\nYou continue with **$${this.formatMoney(moneyBefore)}**`;
    } else if (chosenAmount.type === 'percentage' && chosenAmount.value === -100 && game.currentRound > 0) {
      resultText = '💀 **-100%!** You lost everything!';
    } else {
      const changeText = actualGain >= 0 ? `**+$${this.formatMoney(actualGain)}**` : `**-$${this.formatMoney(Math.abs(actualGain))}**`;
      resultText = `**You gained:** ${changeText}\n`;
    }

    return new EmbedBuilder()
      .setColor('#FFA500') // Orange for suspense
      .setTitle(`📊 Floor ${floorNumber} Result...`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**You chose:** ${choice === 'left' ? '⬅️ Left' : '➡️ Right'}\n\n` +
        `**You got:** ${chosenDisplay}\n` +
        `**You avoided:** ❓❓❓\n\n` +
        `${resultText}\n\n` +
        `**Money Before:** **$${this.formatMoney(moneyBefore)}**\n` +
        `**Money After:** **$${this.formatMoney(moneyAfter)}**\n\n` +
        `**Remaining Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: 'Revealing what you avoided...' });
  }

  static createResultEmbed(game, floorNumber, choice, chosenAmount, lostAmount, moneyBefore, moneyAfter) {
    const chosenDisplay = game.getDisplayValue(chosenAmount);
    let lostDisplay = game.getDisplayValue(lostAmount);

    // Show actual random value for avoided amount
    if (lostAmount.type === 'random' && lostAmount.generatedValue !== undefined) {
      lostDisplay = `${lostAmount.label}: $${this.formatMoney(lostAmount.generatedValue)} (would have been)`;
    }

    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);

    // Calculate what would have happened with the avoided choice
    let hypotheticalMoney = moneyBefore;
    if (lostAmount.type === 'cash') {
      hypotheticalMoney += lostAmount.value;
    } else if (lostAmount.type === 'percentage') {
      hypotheticalMoney += Math.floor((moneyBefore * lostAmount.value) / 100);
      if (hypotheticalMoney < 0) hypotheticalMoney = 0;
    } else if (lostAmount.type === 'random' && lostAmount.generatedValue !== undefined) {
      hypotheticalMoney += lostAmount.generatedValue;
    } else if (lostAmount.type === 'special') {
      if (lostAmount.action === 'add_zero') {
        hypotheticalMoney = moneyBefore * 10;
      } else if (lostAmount.action === 'add_one') {
        const moneyStr = moneyBefore.toString();
        hypotheticalMoney = parseInt('1' + moneyStr);
      }
    }
    // For game_over, x_level, nothing - hypotheticalMoney stays as moneyBefore

    const actualGain = moneyAfter - moneyBefore;
    const hypotheticalGain = hypotheticalMoney - moneyBefore;
    const benefit = actualGain - hypotheticalGain;

    let resultText = '';
    if (chosenAmount.type === 'game_over') {
      resultText = '💀 **GAME OVER!** You hit the Game Over tile!';
    } else if (chosenAmount.type === 'special' && chosenAmount.action === 'x_level') {
      if (game.xLevelSkippedFloor) {
        // Show that the last floor will be skipped
        resultText = `❌ **X LEVEL!**\n\n**The last floor (Floor ${game.xLevelSkippedFloor.floorNum}) will be skipped!**\n\nYou can continue playing until you reach it, then it will be skipped.\nYou continue with **$${this.formatMoney(moneyBefore)}**\n\n**Floors played this round:** ${game.currentFloor + 1}/${game.selectedFloors.length}`;
      } else {
        // Last floor in round - nothing happens
        resultText = `❌ **X LEVEL!**\n\n**Nothing happens!** (X Level on last floor of round)\nYou continue with **$${this.formatMoney(moneyBefore)}**\n\n**Floors played this round:** ${game.currentFloor + 1}/${game.selectedFloors.length}`;
      }
    } else if (chosenAmount.type === 'percentage' && chosenAmount.value === -100 && game.currentRound > 0) {
      resultText = '💀 **-100%!** You lost everything!';
    } else {
      const changeText = actualGain >= 0 ? `**+$${this.formatMoney(actualGain)}**` : `**-$${this.formatMoney(Math.abs(actualGain))}**`;
      resultText = `**You gained:** ${changeText}\n`;

      // Show benefit/loss comparison
      if (benefit > 0) {
        resultText += `**Result:** ✅ Good choice! You gained **$${this.formatMoney(benefit)}** more than the other option.`;
      } else if (benefit < 0) {
        resultText += `**Result:** ❌ You lost **$${this.formatMoney(Math.abs(benefit))}** compared to the other option.`;
      } else {
        resultText += `**Result:** ⚖️ Both options would have given the same result.`;
      }
    }

    return new EmbedBuilder()
      .setColor(benefit >= 0 ? '#00FF00' : '#FF0000')
      .setTitle(`📊 Floor ${floorNumber} Result`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**You chose:** ${choice === 'left' ? '⬅️ Left' : '➡️ Right'}\n\n` +
        `**You got:** ${chosenDisplay}\n` +
        `**You avoided:** ${lostDisplay}\n\n` +
        `${resultText}\n\n` +
        `**Money Before:** **$${this.formatMoney(moneyBefore)}**\n` +
        `**Money After:** **$${this.formatMoney(moneyAfter)}**\n\n` +
        `**Remaining Amounts:**\n${amountsDisplay}`
      );
  }

  static createContinueButton() {
    const button = new ButtonBuilder()
      .setCustomId('continue_game')
      .setLabel('➡️ Continue')
      .setStyle(ButtonStyle.Success);

    return [new ActionRowBuilder().addComponents(button)];
  }

  static createRoundEndEmbed(game) {
    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎉 Round ${game.currentRound} Complete!`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Floors Completed:** ${game.floorsCompleted}/21\n` +
        `**Rounds Completed:** ${game.currentRound}/${game.eventMode ? 7 : 6}\n\n` +
        `**What would you like to do?**\n` +
        `🏠 **Go to Lobby**: Cash out now and keep your $${this.formatMoney(game.totalMoney)}\n` +
        `🎮 **Continue Playing**: Move to next round and risk it all!\n\n` +
        `**Remaining Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: 'Choose wisely!' });
  }

  static createRoundEndButtons() {
    const continueButton = new ButtonBuilder()
      .setCustomId('continue_to_next_round')
      .setLabel('🎮 Continue Playing')
      .setStyle(ButtonStyle.Success);

    const lobbyButton = new ButtonBuilder()
      .setCustomId('go_lobby')
      .setLabel('🏠 Go to Lobby')
      .setStyle(ButtonStyle.Primary);

    return [
      new ActionRowBuilder().addComponents(continueButton, lobbyButton)
    ];
  }

  static createGameEndEmbed(game, reason, finalScore) {
    let title = '';
    let description = '';
    let color = '#FFD700';

    switch (reason) {
      case 'completed':
        title = '🎉 CONGRATULATIONS! 🎉';
        description = `You completed all ${game.floorsCompleted} floors!\n\n**Final Score:** $${this.formatMoney(finalScore)}`;
        color = '#FFD700';
        break;
      case 'lobby':
        title = '🏠 Went to Lobby';
        description = `You decided to take your winnings home!\n\n**Final Score:** $${this.formatMoney(finalScore)}\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#4169E1';
        break;
      case 'gave_up':
        title = '❌ Game Over - Gave Up';
        description = `You gave up and went home with nothing!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#FF0000';
        break;
      case 'game_over_tile':
        title = '💀 Game Over - Hit Game Over Tile';
        description = `You hit the Game Over tile!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#FF0000';
        break;
      case 'minus_100':
        title = '💀 Game Over - Hit -100%';
        description = `You lost everything to -100%!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#FF0000';
        break;
      case 'no_money':
        title = '💀 Game Over - No Money Left';
        description = `You ran out of money!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#FF0000';
        break;
      case 'x_level':
        title = '❌ Game Over - X Level';
        description = `X Level cancelled your progress!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted}`;
        color = '#FF0000';
        break;
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'Thanks for playing Tower of Cash!' })
      .setTimestamp();
  }

  static createUnplayedFloorsEmbed(unplayedFloors) {
    if (unplayedFloors.length === 0) {
      return null; // No unplayed floors to show
    }

    let description = '**Here\'s what was behind the floors you didn\'t play:**\n\n';

    unplayedFloors.forEach(floor => {
      const leftDisplay = this.getAmountDisplayWithValue(floor.left);
      const rightDisplay = this.getAmountDisplayWithValue(floor.right);

      description += `**Floor ${floor.floorNum}:**\n`;
      description += `⬅️ Left: ${leftDisplay} | ➡️ Right: ${rightDisplay}\n\n`;
    });

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔮 Unplayed Floors Revealed')
      .setDescription(description)
      .setFooter({ text: 'This is what you could have encountered!' })
      .setTimestamp();
  }

  static getAmountDisplayWithValue(amount) {
    if (amount.type === 'cash') {
      return `**$${this.formatMoney(amount.value)}**`;
    } else if (amount.type === 'percentage') {
      return `**${amount.value > 0 ? '+' : ''}${amount.value}%**`;
    } else if (amount.type === 'random') {
      if (amount.generatedValue !== undefined) {
        return `**${amount.label}: $${this.formatMoney(amount.generatedValue)}**`;
      }
      return `${amount.label} ($${this.formatMoney(amount.min)}-$${this.formatMoney(amount.max)})`;
    } else if (amount.type === 'special' || amount.type === 'event' || amount.type === 'nothing' || amount.type === 'game_over') {
      return `**${amount.label}**`;
    }
    return 'Unknown';
  }

  static createSkippedFloorsEmbed(skippedFloors) {
    let description = '**X Level skipped the last floor:**\n\n';

    skippedFloors.forEach(floor => {
      const leftDisplay = this.getAmountDisplayWithValue(floor.left);
      const rightDisplay = this.getAmountDisplayWithValue(floor.right);

      description += `**Floor ${floor.floorNum}:**\n`;
      description += `⬅️ Left: ${leftDisplay} | ➡️ Right: ${rightDisplay}\n\n`;
    });

    description += '**These amounts have been removed from the pool.**';

    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⏭️ Skipped Floor (X Level)')
      .setDescription(description)
      .setFooter({ text: 'This floor was skipped and removed due to X Level' })
      .setTimestamp();
  }

  static createLeaderboardEmbed(leaderboard) {
    let description = '';

    if (leaderboard.length === 0) {
      description = 'No players yet! Be the first to play!';
    } else {
      leaderboard.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        const position = medal || `**${index + 1}.**`;
        description += `${position} **${player.username}**\n`;
        description += `💰 High Score: $${this.formatMoney(player.highest_score)}\n`;
        description += `🏆 Wins: ${player.total_wins} | 🎮 Games: ${player.total_games}\n\n`;
      });
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Tower of Cash - Leaderboard 🏆')
      .setDescription(description)
      .setTimestamp();
  }

  static createHideoutBreakthroughIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('🏚️ HIDEOUT BREAKTHROUGH 🏚️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to Hideout Breakthrough!**\n\n' +
        '**Grid:** 12 buttons hiding numbers 1-12\n\n' +
        '**Rules:**\n' +
        '• Pick a button to reveal its number\n' +
        '• Keep picking buttons with **higher numbers**\n' +
        '• Each successful pick earns **$20,000**\n' +
        '• Pick a lower/equal number = Game Over (keep what you earned)\n' +
        '• Pick **12** = Game stops (highest number, can\'t continue)\n' +
        '• Complete **6 successful picks** in ascending order = **$1,000,000 JACKPOT!**\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'Can you break through to the top?' });
  }

  static createHideoutBreakthroughButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('hideout_start')
            .setLabel('🚀 Start Hideout Breakthrough')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const state = game.hideoutBreakthroughState;
    const rows = [];
    let currentRow = [];

    // Number emojis for 1-12
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '1️⃣1️⃣', '1️⃣2️⃣'];

    // Show all 12 buttons (3 rows × 4 buttons)
    for (let i = 0; i < 12; i++) {
      const number = state.grid[i];
      const isPicked = state.revealed[i];

      let style = ButtonStyle.Primary;
      let label = '🟩'; // Green square for unpicked
      let disabled = false;

      if (isPicked) {
        disabled = true;
        label = numberEmojis[number - 1]; // Convert number to emoji
        style = ButtonStyle.Secondary;
      }

      currentRow.push(
        new ButtonBuilder()
          .setCustomId(`hideout_pick_${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );

      // 4 buttons per row
      if (currentRow.length === 4) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
        currentRow = [];
      }
    }

    return rows;
  }

  static createHideoutBreakthroughRoundEmbed(game) {
    const state = game.hideoutBreakthroughState;
    return new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle(`🏚️ HIDEOUT BREAKTHROUGH - Pick ${state.pickCount + 1}`)
      .setDescription(
        `**Current Pick:** ${state.currentPick !== null ? state.currentPick : 'None (First Pick)'}\n` +
        `**Successful Picks:** ${state.pickCount}/6\n` +
        `**Accumulated Reward:** $${this.formatMoney(state.accumulatedReward)}\n\n` +
        (state.currentPick !== null ? `**Next number must be higher than ${state.currentPick}!**\n\n` : '') +
        'Pick a button!'
      );
  }

  static createHideoutBreakthroughResultEmbed(game, result) {
    const state = game.hideoutBreakthroughState;
    let title = '';
    let description = '';
    let color = '#FF4500';

    if (result.maxedOut) {
      title = '🔝 HIDEOUT BREAKTHROUGH - MAXED OUT!';
      description = `You picked **12** - the highest number!\n\n` +
        `No higher number to continue, game stops here.\n\n` +
        `**Won:** $${this.formatMoney(result.accumulatedReward)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FFD700';
    } else if (result.jackpot) {
      title = '🎉 HIDEOUT BREAKTHROUGH - JACKPOT!';
      description = `You completed **6 successful picks** in ascending order!\n\n` +
        `**JACKPOT:** $1,000,000\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FFD700';
    } else if (result.failed) {
      title = '❌ HIDEOUT BREAKTHROUGH - FAILED';
      description = `You picked **${result.pickedNumber}**, which is ${result.pickedNumber < result.previousNumber ? 'lower' : 'equal to'} your previous number **${result.previousNumber}**!\n\n` +
        `But you keep what you earned!\n\n` +
        `**Won:** $${this.formatMoney(result.accumulatedReward)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FF0000';
    } else if (result.success && !result.gameOver) {
      title = '✅ HIDEOUT BREAKTHROUGH - SUCCESS!';
      description = `You picked **${result.pickedNumber}**${result.previousNumber !== null ? ` (higher than ${result.previousNumber})` : ''}!\n\n` +
        `**Earned:** $20,000\n` +
        `**Accumulated:** $${this.formatMoney(result.accumulatedReward)}\n` +
        `**Successful Picks:** ${result.pickCount}/6`;
      color = '#00FF00';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  static createHideoutBreakthroughUnpickedEmbed(game) {
    const state = game.hideoutBreakthroughState;
    let description = '**Here\'s what was behind the unpicked buttons:**\n\n';

    // Show all 12 buttons with their numbers
    let gridDisplay = '';

    for (let i = 0; i < 12; i++) {
      const number = state.grid[i];
      const wasRevealed = state.revealed[i];

      if (wasRevealed) {
        // Already revealed
        gridDisplay += `\`${number}\` `;
      } else {
        // Show what it was
        gridDisplay += `\`${number}\` `;
      }

      // Newline after 4 buttons (3 rows × 4)
      if ((i + 1) % 4 === 0) {
        gridDisplay += '\n';
      }
    }

    description += gridDisplay;
    description += '\n**Revealed buttons** showed their numbers during gameplay\n';
    description += '**Unrevealed buttons** are shown above';

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔮 Hideout Breakthrough - All Numbers Revealed')
      .setDescription(description)
      .setFooter({ text: 'This is what all the buttons were hiding!' });
  }

  // === BABUSHKA MINIGAME UI ===

  static createBabushkaIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('🪆 BABUSHKA 🪆')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to Babushka!**\n\n' +
        '**Concept:** Russian nesting dolls with hidden layers\n\n' +
        '**Rules:**\n' +
        '• Pick a doll → Click Reveal to open it\n' +
        '• Each layer reveals a higher value (ladder steps)\n' +
        '• After each layer: Continue deeper OR Bank to Stash\n' +
        '• Empty layer = Strike + LOSE entire Stash\n' +
        '• 10M doll reached = Auto-bank to Stash!\n' +
        '• **3 strikes = -100% penalty!**\n' +
        '• Click "Walk Away" to secure your Stash and leave\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'How deep will you go?' });
  }

  static createBabushkaButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('babushka_start')
            .setLabel('🚀 Start Babushka')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const state = game.babushkaState;

    // If revealing, show reveal button
    if (state.isRevealing) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('babushka_reveal')
            .setLabel('🎁 Reveal Layer')
            .setStyle(ButtonStyle.Primary)
        )
      ];
    }

    // If choosing, show continue/bank buttons
    if (state.isChoosing) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('babushka_continue')
            .setLabel('🔽 Continue Deeper')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('babushka_bank')
            .setLabel(`💰 Bank $${this.formatMoney(state.currentDollValue)} to Stash`)
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    // Show all 12 dolls (3 rows × 4 buttons)
    const rows = [];
    let currentRow = [];

    for (let i = 0; i < 12; i++) {
      const isPicked = state.picked[i];

      let style = ButtonStyle.Primary;
      let label = '🪆';
      let disabled = isPicked;

      if (isPicked) {
        style = ButtonStyle.Secondary;
        // Show max potential of this doll
        const dollValue = state.dolls[i];
        label = dollValue === 0 ? '💀 $0' : `💰 $${this.formatMoney(dollValue)}`;
      }

      currentRow.push(
        new ButtonBuilder()
          .setCustomId(`babushka_select_${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );

      if (currentRow.length === 4) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
        currentRow = [];
      }
    }

    // Add "Walk Away" button in last row
    const walkAwayButton = new ButtonBuilder()
      .setCustomId('babushka_cashout')
      .setLabel(`🏃 Walk Away with $${this.formatMoney(state.accumulatedMoney)}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(state.accumulatedMoney === 0);

    rows.push(new ActionRowBuilder().addComponents(walkAwayButton));

    return rows;
  }

  static createBabushkaSelectionEmbed(game) {
    const state = game.babushkaState;
    return new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('🪆 BABUSHKA - Select a Doll')
      .setDescription(
        `**Stashed Money:** $${this.formatMoney(state.accumulatedMoney)}\n` +
        `**Strikes:** ${'❌'.repeat(state.strikes)}${'⬜'.repeat(state.maxStrikes - state.strikes)}\n\n` +
        'Pick a doll to begin exploring its layers!'
      );
  }

  static createBabushkaLayerEmbed(game, result) {
    const state = game.babushkaState;
    let title = '';
    let description = '';
    let color = '#FF6B9D';

    if (result.isEmpty) {
      title = '💔 BABUSHKA - It\'s Empty...';
      description = `The doll has no more layers!\n\n` +
        `**Strike!** You lost your entire Stash.\n\n` +
        `**Strikes:** ${result.strikes}/${state.maxStrikes} ❌\n` +
        `**Stashed Money:** $0`;
      color = '#FF0000';
    } else if (result.isAutoBank) {
      title = '🎉 BABUSHKA - 10 MILLION AUTO-BANK!';
      description = `You reached the deepest layer of the 10M doll!\n\n` +
        `**It's contain $${this.formatMoney(10000000)}!**\n` +
        `**Auto-Banked to Stash!**\n\n` +
        `**Stashed Money:** $${this.formatMoney(result.accumulatedMoney)}`;
      color = '#FFD700';
    } else {
      // Don't reveal if it's the final layer or not
      title = '✨ BABUSHKA - Found Deeper Doll!';
      description = `**It's contain $${this.formatMoney(result.layerValue)}!**\n\n` +
        `**Current Doll Value:** $${this.formatMoney(result.currentDollValue)}\n` +
        `**Stashed Money:** $${this.formatMoney(result.accumulatedMoney)}\n` +
        `**Strikes:** ${result.strikes}/${state.maxStrikes}\n\n` +
        'Will you continue deeper or bank this to your Stash?';
      color = '#00FF00';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  static createBabushkaBankEmbed(game, result) {
    let description = `You banked **$${this.formatMoney(result.bankedAmount)}** to your Stash!\n\n` +
      `**Total Stashed Money:** $${this.formatMoney(result.totalAccumulated)}\n\n`;

    // Show simulation of what would have happened
    if (result.remainingLayers) {
      description += `**If you had continued...**\n`;

      if (result.remainingLayers.length > 0) {
        result.remainingLayers.forEach(val => {
          description += `• Found deeper doll: **$${this.formatMoney(val)}**\n`;
        });
      }

      // Unless it's the 10M doll which ends safely, all others end in a strike
      if (result.maxPotential !== 10000000) {
        description += `• Then... **EMPTY! (You would have lost it all!)** 💀\n`;
      } else if (result.remainingLayers.length === 0) {
        // This case shouldn't happen for 10M unless fully revealed, but just in case
        description += `• You found everything!\n`;
      }

      description += `\n**Max Potential of this doll:** $${this.formatMoney(result.maxPotential)}\n\n`;
    }

    description += `Select another doll or Walk Away to keep it!`;

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💰 BABUSHKA - BANKED TO STASH!')
      .setDescription(description);
  }

  static createBabushkaGameOverEmbed(game, result) {
    return new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('💀 BABUSHKA - GAME OVER!')
      .setDescription(
        `3 strikes! Too many empty dolls!\n\n` +
        `**Penalty:** -100% (-$${this.formatMoney(result.penaltyAmount)})\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`
      );
  }

  static createBabushkaUnpickedEmbed(game, allDolls) {
    // Reveal all dolls in a structured table format
    let description = '**Here\'s what was in all the dolls:**\n\n';

    // Create a table-like structure
    for (let i = 0; i < 12; i++) {
      const value = allDolls[i];
      const dollNumber = `Doll ${i + 1}`;
      const valueStr = value === 0 ? '💀 Empty' : `💰 $${this.formatMoney(value)}`;

      description += `**${dollNumber}:** ${valueStr}\n`;

      // Add spacing after every 4 dolls
      if ((i + 1) % 4 === 0 && i < 11) {
        description += '\n';
      }
    }

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔮 Babushka - All Dolls Revealed')
      .setDescription(description)
      .setFooter({ text: 'This is what all the dolls were hiding!' });
  }

  static createStatsEmbed(stats, remainingPlays, isAdmin = false, recentPlays = [], topPlays = [], user = null) {
    const playsDisplay = isAdmin ? remainingPlays : `${remainingPlays}/2${remainingPlays > 2 ? ' (+bonus)' : ''}`;
    const adminBadge = isAdmin ? '👑 ' : '';

    if (!stats) {
      const embed = new EmbedBuilder()
        .setColor('#4169E1')
        .setTitle(`${adminBadge}📊 Your Stats`)
        .setDescription(
          `You haven't played any games yet!\n\n` +
          `**Remaining Plays Today:** ${playsDisplay}` +
          (isAdmin ? '\n\n*As an admin, you have unlimited plays!*' : '')
        )
        .setTimestamp();

      if (user) {
        embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));
      }

      return embed;
    }

    const winRate = stats.total_games > 0 ? ((stats.total_wins / stats.total_games) * 100).toFixed(1) : 0;

    let description =
      `**High Score:** $${this.formatMoney(stats.highest_score)}\n` +
      `**Total Wins:** ${stats.total_wins}\n` +
      `**Total Games:** ${stats.total_games}\n` +
      `**Win Rate:** ${winRate}%\n\n` +
      `**Remaining Plays Today:** ${playsDisplay}`;

    // Add recent plays section
    if (recentPlays.length > 0) {
      description += '\n\n**📜 Last 5 Games:**\n';
      recentPlays.forEach((play, index) => {
        const date = new Date(play.game_date);
        const timeStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        description += `${index + 1}. $${this.formatMoney(play.final_score)} - ${timeStr}\n`;
      });
    }

    // Add top plays section
    if (topPlays.length > 0) {
      description += '\n**🏆 Top 5 Games:**\n';
      topPlays.forEach((play, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        description += `${medal} $${this.formatMoney(play.final_score)}\n`;
      });
    }

    if (isAdmin) {
      description += '\n\n*As an admin, you have unlimited plays!*';
    }

    const embed = new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle(`${adminBadge}📊 Your Stats`)
      .setDescription(description)
      .setTimestamp();

    if (user) {
      embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));
    }

    return embed;
  }

  static createWhatIfEmbed(game, simulationResults) {
    let description = '**What could have happened if you continued:**\n\n';

    simulationResults.forEach((result, index) => {
      description += `**Floor ${result.floor}:**\n`;
      description += `You would have gotten: ${result.result}\n`;
      description += `Money: $${this.formatMoney(result.money)}\n\n`;
    });

    description += `**Final Amount:** $${this.formatMoney(simulationResults[simulationResults.length - 1].money)}`;

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔮 What If Simulation')
      .setDescription(description)
      .setFooter({ text: 'This is just a simulation of what could have happened!' });
  }

  static formatRemainingAmounts(remainingAmounts) {
    const categories = {
      cash: [],
      negative: [],
      positive: [],
      random: [],
      special: [],
      other: []
    };

    // Organize amounts by category with their values for sorting
    Object.values(remainingAmounts).forEach(amount => {
      if (amount.count <= 0) return; // Skip used amounts

      const display = this.getAmountDisplayText(amount);
      const countText = amount.count > 1 ? ` x${amount.count}` : '';
      // Don't strikethrough "Nothing" type amounts
      const revealed = (amount.revealed && amount.type !== 'nothing') ? '~~' : '';

      if (amount.type === 'cash') {
        categories.cash.push({
          value: amount.value,
          text: `${revealed}$${this.formatMoney(amount.value)}${countText}${revealed}`
        });
      } else if (amount.type === 'percentage' && amount.value < 0) {
        categories.negative.push({
          value: amount.value,
          text: `${revealed}${amount.value}%${countText}${revealed}`
        });
      } else if (amount.type === 'percentage' && amount.value > 0) {
        categories.positive.push({
          value: amount.value,
          text: `${revealed}+${amount.value}%${countText}${revealed}`
        });
      } else if (amount.type === 'random') {
        categories.random.push({
          value: parseInt(amount.label.match(/\d+/)?.[0] || 0),
          text: `${revealed}${amount.label}${countText}${revealed}`
        });
      } else if (amount.type === 'special' || amount.type === 'event') {
        categories.special.push(amount.label); // Keep special items unsorted
      } else {
        categories.other.push(`${amount.label || 'Unknown'}${countText}`); // Keep other items unsorted
      }
    });

    // Sort categories
    categories.cash.sort((a, b) => a.value - b.value); // Lowest to highest
    categories.negative.sort((a, b) => b.value - a.value); // -25 to -100
    categories.positive.sort((a, b) => a.value - b.value); // +25 to +100
    categories.random.sort((a, b) => a.value - b.value); // Random 1 to Random 4

    // Format output similar to Tower Challenge
    let output = '';

    // Cash amounts (like the left side ladder)
    if (categories.cash.length > 0) {
      output += `💰 **Cash:** ${categories.cash.map(c => c.text).join(', ')}\n`;
    }

    // Negative percentages (blue in the image)
    if (categories.negative.length > 0) {
      output += `🔵 **Losses:** ${categories.negative.map(c => c.text).join(', ')}\n`;
    }

    // Positive percentages (pink/magenta in the image)
    if (categories.positive.length > 0) {
      output += `🟣 **Gains:** ${categories.positive.map(c => c.text).join(', ')}\n`;
    }

    // Random amounts (green in the image)
    if (categories.random.length > 0) {
      output += `🟢 **Random:** ${categories.random.map(c => c.text).join(', ')}\n`;
    }

    // Special items (orange/red in the image)
    if (categories.special.length > 0) {
      output += `🟠 **Special:** ${categories.special.join(', ')}\n`;
    }

    // Other (Nothing, Game Over)
    if (categories.other.length > 0) {
      output += `⚪ **Other:** ${categories.other.join(', ')}\n`;
    }

    return output || '*All amounts revealed!*';
  }

  static getAmountDisplayText(amount) {
    if (amount.type === 'cash') return `$${this.formatMoney(amount.value)}`;
    if (amount.type === 'percentage') return `${amount.value > 0 ? '+' : ''}${amount.value}%`;
    if (amount.type === 'random') return amount.label;
    if (amount.type === 'special') return amount.label;
    if (amount.type === 'event') return amount.label;
    return amount.label || 'Unknown';
  }

  static createVaultIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🏦 THE VAULT 🏦')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to The Vault!**\n\n' +
        'Crack the code to win big!\n\n' +
        '**Code:** ▢ ▢ ▢ ▢ ▢ ▢\n\n' +
        '**Rules:**\n' +
        '• Guess a 6-digit number (no duplicate digits)\n' +
        '• You have 4 attempts to crack the code\n' +
        '• After each guess, you\'ll see:\n' +
        '  ✅ How many digits are correct and in the right position\n' +
        '  🟡 How many digits are correct but in the wrong position\n' +
        '• Better guesses = bigger rewards!\n\n' +
        '**Reply with your 6-digit guess below!**'
      )
      .setFooter({ text: 'Attempt 1 of 4' });
  }

  static createVaultAttemptEmbed(game, attempt, correctPosition, correctWrongPosition, attemptsLeft, guessedDigits, allAttempts) {
    // Ensure we always show all 6 positions with proper spacing
    const maskedCode = [];
    for (let i = 0; i < 6; i++) {
      if (guessedDigits[i] !== null && guessedDigits[i] !== undefined) {
        maskedCode.push(String(guessedDigits[i]));
      } else {
        maskedCode.push('▢');
      }
    }
    const codeDisplay = maskedCode.join(' ');

    // Build attempts history
    let attemptsHistory = '';
    if (allAttempts && allAttempts.length > 0) {
      attemptsHistory = '\n**Previous Attempts:**\n';
      allAttempts.forEach((att, idx) => {
        attemptsHistory += `${idx + 1}. \`${att.guess}\` - ✅ ${att.correctPosition} | 🟡 ${att.correctWrongPosition}\n`;
      });
    }

    return new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🏦 THE VAULT - Attempt Result')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Your Guess:** ${attempt}\n\n` +
        `✅ **Correct position:** ${correctPosition}\n` +
        `🟡 **Wrong position:** ${correctWrongPosition}\n\n` +
        `**Code Progress:** ${codeDisplay}\n` +
        attemptsHistory + `\n` +
        `**Attempts remaining:** ${attemptsLeft}\n\n` +
        (attemptsLeft > 0 ? '**Reply with your next guess!**' : '')
      )
      .setFooter({ text: `Attempt ${5 - attemptsLeft} of 4` });
  }

  static createVaultRewardEmbed(game, rewardResult) {
    let rewardText = '';
    let moneyBefore = 0;

    if (rewardResult.type === 'money') {
      moneyBefore = game.totalMoney - rewardResult.value;
      rewardText = `💰 **Reward:** $${this.formatMoney(rewardResult.value)}\n\n` +
        `**Money Before:** $${this.formatMoney(moneyBefore)}\n` +
        `**Money After:** $${this.formatMoney(game.totalMoney)}`;
    } else if (rewardResult.type === 'percentage') {
      moneyBefore = Math.floor(game.totalMoney / 2);
      rewardText = `💰 **Reward:** +100%\n\n` +
        `**Money Before:** $${this.formatMoney(moneyBefore)}\n` +
        `**Money After:** $${this.formatMoney(game.totalMoney)}`;
    } else if (rewardResult.type === 'add_one') {
      const beforeStr = game.totalMoney.toString();
      moneyBefore = parseInt(beforeStr.slice(0, -1));
      rewardText = `💰 **Reward:** Add a 1\n\n` +
        `**Money Before:** $${this.formatMoney(moneyBefore)}\n` +
        `**Money After:** $${this.formatMoney(game.totalMoney)}`;
    } else if (rewardResult.type === 'reveal_floor') {
      rewardText = `🔍 **Reward:** ${rewardResult.display}\n\n` +
        `⚠️ Be careful not to visit that floor!\n\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}`;
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏦 THE VAULT - CRACKED!')
      .setDescription(
        `**Player:** ${game.username}\n\n` +
        `🎉 **You cracked the code!**\n\n` +
        rewardText
      )
      .setFooter({ text: 'Continuing game...' });
  }

  static createVaultFailedEmbed(game, bestDigits, rewardResult, secretCode) {
    let description = `**Player:** ${game.username}\n\n` +
      '❌ **You failed to crack the code!**\n\n' +
      `**The correct code was:** \`${secretCode}\`\n\n` +
      `Best attempt: **${bestDigits}** correct digit${bestDigits !== 1 ? 's' : ''}\n\n`;

    if (rewardResult.value > 0) {
      const moneyBefore = game.totalMoney - rewardResult.value;
      description += `💰 **Partial Reward:** $${this.formatMoney(rewardResult.value)}\n\n` +
        `**Money Before:** $${this.formatMoney(moneyBefore)}\n` +
        `**Money After:** $${this.formatMoney(game.totalMoney)}`;
    } else {
      description += `You continue with **$${this.formatMoney(game.totalMoney)}**`;
    }

    return new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('🏦 THE VAULT - FAILED')
      .setDescription(description)
      .setFooter({ text: 'Better luck next time!' });
  }

  static createOperatorOfferEmbed(game, offerAmount) {
    return new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('📞 OPERATOR OFFER 📞')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**The Operator has made you an offer!**\n\n' +
        `💼 **Offer:** $${this.formatMoney(offerAmount)}\n\n` +
        '**Accept** - Take the money and end the game (counts as a win)\n' +
        '**Decline** - Continue playing with your current amount\n\n' +
        '**What will you do?**'
      )
      .setFooter({ text: 'Choose wisely!' });
  }

  static createOperatorOfferButtons() {
    const acceptButton = new ButtonBuilder()
      .setCustomId('operator_accept')
      .setLabel('💼 Accept Offer')
      .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
      .setCustomId('operator_decline')
      .setLabel('❌ Decline Offer')
      .setStyle(ButtonStyle.Danger);

    return [
      new ActionRowBuilder().addComponents(acceptButton, declineButton)
    ];
  }

  static createMegaGridIntroEmbed(game) {
    const state = game.megaGridState;
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🔲 MEGA GRID 🔲')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to Mega Grid!**\n\n' +
        `**Grid:** 25 spaces (5x5)\n` +
        `**Black Tiles:** ${state.blackCount} ⬛\n` +
        `**Gold Tiles:** ${state.goldCount} 🟨\n` +
        `**Multiplier:** ${state.multiplier}x\n\n` +
        `**Potential Reward (Round 1):** $${this.formatMoney(state.potentialReward)}\n\n` +
        '**Rules:**\n' +
        '• Pick a tile to reveal it\n' +
        '• Avoid Black Tiles (Game Over - Win Nothing)\n' +
        '• Find Gold Tiles to win money\n' +
        '• Reward multiplies each round!\n' +
        '• Type **STOP** to cash out anytime\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'High Risk, High Return!' });
  }

  static createMegaGridButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('mega_grid_start')
            .setLabel('🚀 Start Mega Grid')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const state = game.megaGridState;
    const rows = [];
    let currentRow = [];

    // Show all 25 tiles (5 rows × 5 tiles)
    for (let i = 0; i < 25; i++) {
      const isRevealed = state.history.some(h => h.choiceIndex === i);

      // Calculate grid coordinates (A1-E5)
      const rowLetter = String.fromCharCode(65 + Math.floor(i / 5)); // A-E
      const colNumber = (i % 5) + 1; // 1-5
      const coordinate = `${rowLetter}${colNumber}`;

      let style = ButtonStyle.Secondary;
      let label = coordinate; // Default: show coordinate
      let disabled = false;

      if (isRevealed) {
        disabled = true;
        const historyItem = state.history.find(h => h.choiceIndex === i);
        if (historyItem.tile === 'black') {
          style = ButtonStyle.Danger;
          label = '⬛';
        } else {
          style = ButtonStyle.Success;
          label = '🟨';
        }
      }

      currentRow.push(
        new ButtonBuilder()
          .setCustomId(`mega_grid_pick_${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );

      if (currentRow.length === 5) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
        currentRow = [];
      }
    }

    return rows;
  }

  static createMegaGridRoundEmbed(game) {
    const state = game.megaGridState;
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🔲 MEGA GRID - Round ${state.currentRound + 1}/${state.maxRounds}`)
      .setDescription(
        `**Current Total Balance:** $${this.formatMoney(game.totalMoney + state.accumulatedReward)}\n` +
        `**Potential Total Balance:** $${this.formatMoney(game.totalMoney + state.accumulatedReward + state.potentialReward)}\n\n` +
        `**Black Tiles:** ${state.blackCount} ⬛ | **Gold Tiles:** ${state.goldCount} 🟨\n\n` +
        'Pick a tile!\n\n' +
        '💡 **Type `STOP` in chat to walk away with your winnings**'
      );
  }

  static createMegaGridResultEmbed(game, result) {
    const state = game.megaGridState;
    let title = '';
    let description = '';
    let color = '#FFD700';

    if (result === 'cashout') {
      title = '💰 MEGA GRID - CASHED OUT';
      description = `You walked away with **$${this.formatMoney(state.accumulatedReward)}**!\n\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#00FF00';
    } else if (result.gameOver) {
      title = '💀 MEGA GRID - GAME OVER';
      description = `You hit a **BLACK TILE**!\n\n` +
        `You lost all accumulated rewards.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FF0000';
    } else if (state.isActive === false && !result.gameOver) {
      // Jackpot
      title = '🎉 MEGA GRID - JACKPOT!';
      description = `You completed all 5 rounds!\n\n` +
        `**Total Won:** $${this.formatMoney(state.accumulatedReward)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FFD700';
    } else {
      // Round win
      title = '✅ MEGA GRID - ROUND CLEARED';
      description = `You found a **GOLD TILE**!\n\n` +
        `**Won:** $${this.formatMoney(state.potentialReward / state.multiplier)}\n` + // Hacky way to get prev potential
        `**Accumulated:** $${this.formatMoney(state.accumulatedReward)}\n\n` +
        `**Next Round Potential:** $${this.formatMoney(state.potentialReward)}`;
      color = '#00FF00';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  static createMegaGridUnpickedEmbed(game) {
    const state = game.megaGridState;
    let description = '**Here\'s the full grid:**\n\n';

    // Show all 25 tiles with their colors
    const pickedIndices = state.history.map(h => h.choiceIndex);
    let gridDisplay = '';

    for (let i = 0; i < 25; i++) {
      const tile = state.grid[i];

      // Show all tiles (both picked and unpicked)
      gridDisplay += tile === 'black' ? '⬛' : '🟨';

      // Add space between tiles, newline after 5
      gridDisplay += ' ';
      if ((i + 1) % 5 === 0) {
        gridDisplay += '\n';
      }
    }

    description += gridDisplay;
    description += '\n**⬛ Black tiles** would have ended the game\n';
    description += '**🟨 Gold tiles** would have advanced you\n';

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔮 Mega Grid - Full Grid Revealed')
      .setDescription(description)
      .setFooter({ text: 'This is what the entire grid was hiding!' });
  }

  static createInfinityPercentIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('♾️ THE ∞% ♾️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to The ∞%!**\n\n' +
        '**Rules:**\n' +
        '• Choose LEFT or RIGHT\n' +
        '• Each correct choice increases the multiplier\n' +
        '• Multipliers: 25% → 50% → 75% → 100% → ∞% (Jackpot)\n' +
        '• **One wrong choice = Game Over (Lose everything in minigame)**\n' +
        '• Click "STOP" to cash out safely at any time\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'Infinite possibilities await...' });
  }

  static createInfinityPercentButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('infinity_start')
            .setLabel('🚀 Start The ∞%')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const state = game.infinityPercentState;

    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('infinity_left')
          .setLabel('⬅️ LEFT')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('infinity_right')
          .setLabel('➡️ RIGHT')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('infinity_stop')
          .setLabel(`🛑 STOP ($${this.formatMoney(state.accumulatedReward)})`)
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  static createInfinityPercentRoundEmbed(game) {
    const state = game.infinityPercentState;
    const nextMultiplier = state.multipliers[state.currentRound];

    let historyDisplay = '';
    if (state.history && state.history.length > 0) {
      historyDisplay = '\n**Pick History:** ' + state.history.map(h => h === 'left' ? '⬅️' : '➡️').join(' ');
    }

    return new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(`♾️ THE ∞% - Round ${state.currentRound + 1}`)
      .setDescription(
        `**Current Reward:** $${this.formatMoney(state.accumulatedReward)}\n` +
        `**Next Multiplier:** +${nextMultiplier}%\n` +
        `**Potential Reward:** $${this.formatMoney(Math.floor(state.accumulatedReward * (1 + nextMultiplier / 100)))}\n` +
        historyDisplay + '\n\n' +
        'Choose your path wisely...'
      );
  }

  static createInfinityPercentResultEmbed(game, result) {
    let title = '';
    let description = '';
    let color = '#00FFFF';

    if (result.gameOver) {
      if (result.won) {
        title = '♾️ THE ∞% - JACKPOT!';
        description = `**You reached the Infinity Percent!**\n\n` +
          `**Total Won:** $${this.formatMoney(result.accumulatedReward)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
        color = '#FFD700';
      } else if (result.cashout) {
        title = '🛑 THE ∞% - CASHED OUT';
        description = `You stopped safely!\n\n` +
          `**Total Won:** $${this.formatMoney(result.accumulatedReward)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
        color = '#00FF00';
      } else {
        title = '💀 THE ∞% - GAME OVER';
        description = `You chose poorly...\n\n` +
          `**Lost:** $${this.formatMoney(result.lostAmount)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
        color = '#FF0000';
      }
    } else {
      title = '✨ THE ∞% - CORRECT!';
      description = `Path clear! Multiplier increased!\n\n` +
        `**Current Reward:** $${this.formatMoney(result.accumulatedReward)}`;
      color = '#00FF00';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  // === BOILING POINT MINIGAME UI ===

  static createBoilingPointIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('🌡️ BOILING POINT 🌡️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to Boiling Point!**\n\n' +
        '**Concept:** Control the temperature to hit the sweet spot!\n\n' +
        '**Rules:**\n' +
        '• 8 hidden grids with random values (0-90)\n' +
        '• Choose **Hotter** (+) or **Colder** (-) for next grid\n' +
        '• **Change:** Swap next grid with a reserve (1 use only)\n' +
        '• **Goal:** End between 10° and 90°\n\n' +
        '**Rewards:**\n' +
        '• **100° Exact:** $2,000,000 (Jackpot!)\n' +
        '• **0° Exact:** $200,000\n' +
        '• **10°-90°:** $25,000 per 10 degrees\n' +
        '• **<0° or >100°:** BUST (Win nothing)\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'Can you handle the heat?' });
  }

  static createBoilingPointButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('boiling_point_start')
            .setLabel('🔥 Start Boiling Point')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const state = game.boilingPointState;
    const buttons = [];

    // Hotter/Colder buttons
    buttons.push(
      new ButtonBuilder()
        .setCustomId('boiling_point_hotter')
        .setLabel('🔥 Hotter (+)')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('boiling_point_colder')
        .setLabel('❄️ Colder (-)')
        .setStyle(ButtonStyle.Primary)
    );

    // Change button (if reserve available)
    if (!state.reserveUsed) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('boiling_point_change')
          .setLabel('🔄 Change Grid (1 Use)')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return [new ActionRowBuilder().addComponents(buttons)];
  }

  static createBoilingPointChangeButtons(game) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('boiling_point_change_hotter')
          .setLabel('🔥 Change & Hotter')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('boiling_point_change_colder')
          .setLabel('❄️ Change & Colder')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('boiling_point_cancel_change')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      )
    ];
  }

  static createBoilingPointRoundEmbed(game) {
    const state = game.boilingPointState;

    // Thermometer visual
    const temp = state.currentTemp;
    let thermo = '';
    if (temp >= 100) thermo = '🔥🔥🔥 MAX';
    else if (temp >= 80) thermo = '🟥🟥🟥 High';
    else if (temp >= 60) thermo = '🟧🟧🟧 Warm';
    else if (temp >= 40) thermo = '🟨🟨🟨 Mild';
    else if (temp >= 20) thermo = '🟦🟦🟦 Cool';
    else if (temp <= 0) thermo = '❄️❄️❄️ FREEZING';
    else thermo = '🟦🟦🟦 Cold';

    // History
    let historyStr = state.history.map((h, i) => {
      if (i === 0) return `Start: ${h.temp}°`;
      const icon = h.action.includes('hotter') ? '🔥' : '❄️';
      const change = h.action.includes('hotter') ? `+${h.value}` : `-${h.value}`;
      const type = h.isChange ? '(Changed)' : '';
      return `${i}. ${icon} ${change} → ${h.temp}° ${type}`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle(`🌡️ BOILING POINT - Step ${state.currentIndex}/${state.maxIndex}`)
      .setDescription(
        `**Current Temperature:** ${state.currentTemp}°\n` +
        `**Status:** ${thermo}\n\n` +
        `**History:**\n${historyStr}\n\n` +
        `**Next Grid:** Hidden ❓\n` +
        `**Goal:** 10° - 90° (or exactly 0°/100°)\n\n` +
        'Choose your next move!'
      );
  }

  static createBoilingPointResultEmbed(game, result) {
    let title = '';
    let description = '';
    let color = '#FF4500';

    if (result.jackpot) {
      title = '🔥🔥 BOILING POINT - 100° JACKPOT! 🔥🔥';
      description = `**PERFECT BOIL!**\n\n` +
        `You hit exactly **100°**!\n` +
        `**Winnings:** $2,000,000\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FF0000';
    } else if (result.zeroJackpot) {
      title = '❄️❄️ BOILING POINT - 0° FREEZE! ❄️❄️';
      description = `**PERFECT FREEZE!**\n\n` +
        `You hit exactly **0°**!\n` +
        `**Winnings:** $200,000\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#00FFFF';
    } else if (result.won) {
      title = '🌡️ BOILING POINT - SUCCESS!';
      description = `**Safe Range Reached!**\n\n` +
        `**Final Temp:** ${result.currentTemp}°\n` +
        `**Winnings:** $${this.formatMoney(result.winnings)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#00FF00';
    } else {
      title = '💥 BOILING POINT - BUST!';
      description = `**Temperature Critical!**\n\n` +
        `**Final Temp:** ${result.currentTemp}°\n` +
        `You went outside the safe range (0°-100°).\n` +
        `**Winnings:** $0\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#808080';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  // === OPERATOR ROSHAMBO MINIGAME UI ===

  static createOperatorRoshamboIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('✊✋✌️ OPERATOR ROSHAMBO ✊✋✌️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to Operator Roshambo!**\n\n' +
        '**Concept:** Battle the operator in 6 rounds of rock-paper-scissors!\n\n' +
        '**Rules:**\n' +
        '• Play 6 rounds against the operator\n' +
        '• **Win:** Gain $30,000 per round\n' +
        '• **Loss:** Divide your accumulated money by 10\n' +
        '• **Tie:** No change\n' +
        '• **Perfect 6/6 Wins:** Convert to $2,000,000!\n\n' +
        '**Click Start to begin!**'
      )
      .setFooter({ text: 'May the best player win!' });
  }

  static createOperatorRoshamboButtons(game, showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('operator_roshambo_start')
            .setLabel('🎮 Start Roshambo')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('operator_roshambo_rock')
          .setLabel('🪨 Rock')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('operator_roshambo_paper')
          .setLabel('📄 Paper')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('operator_roshambo_scissors')
          .setLabel('✂️ Scissors')
          .setStyle(ButtonStyle.Primary)
      )
    ];
  }

  static createOperatorRoshamboRoundEmbed(game) {
    const state = game.operatorRoshamboState;

    // Build history display
    let historyStr = '';
    if (state.history && state.history.length > 0) {
      historyStr = '\n**History:**\n';
      state.history.forEach(h => {
        const playerIcon = h.playerChoice === 'rock' ? '🪨' : h.playerChoice === 'paper' ? '📄' : '✂️';
        const opIcon = h.operatorChoice === 'rock' ? '🪨' : h.operatorChoice === 'paper' ? '📄' : '✂️';
        const resultIcon = h.result === 'win' ? '✅' : h.result === 'loss' ? '❌' : '🟰';
        historyStr += `Round ${h.round}: ${playerIcon} vs ${opIcon} ${resultIcon} → $${this.formatMoney(h.moneyAfter)}\n`;
      });
    }

    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle(`✊✋✌️ ROSHAMBO - Round ${state.currentRound + 1}/6`)
      .setDescription(
        `**Score:** ${state.wins}W - ${state.losses}L\n` +
        `**Accumulated Money:** $${this.formatMoney(state.accumulatedMoney)}\n` +
        historyStr + '\n' +
        'Choose your move!'
      );
  }

  static createOperatorRoshamboResultEmbed(game, result) {
    let title = '';
    let description = '';
    let color = '#FF6B6B';

    if (result.perfect) {
      title = '🏆 PERFECT VICTORY! 🏆';
      description = `**YOU WON ALL 6 ROUNDS!**\n\n` +
        `🎊 **JACKPOT:** $2,000,000!\n` +
        `**Final Score:** 6W - 0L\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FFD700';
    } else if (result.gameOver) {
      title = '✊✋✌️ ROSHAMBO - COMPLETE!';
      description = `**Final Score:** ${result.wins}W - ${result.losses}L\n` +
        `**Winnings:** $${this.formatMoney(result.winnings)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = result.wins > result.losses ? '#00FF00' : '#FFA500';
    } else {
      // Round result
      const playerIcon = result.playerChoice === 'rock' ? '🪨' : result.playerChoice === 'paper' ? '📄' : '✂️';
      const opIcon = result.operatorChoice === 'rock' ? '🪨' : result.operatorChoice === 'paper' ? '📄' : '✂️';

      if (result.result === 'win') {
        title = '✅ YOU WIN!';
        description = `${playerIcon} beats ${opIcon}\n\n` +
          `**+$30,000**\n` +
          `**Accumulated:** $${this.formatMoney(result.accumulatedMoney)}`;
        color = '#00FF00';
      } else if (result.result === 'loss') {
        title = '❌ YOU LOSE!';
        description = `${opIcon} beats ${playerIcon}\n\n` +
          `**Money ÷ 10**\n` +
          `**Accumulated:** $${this.formatMoney(result.accumulatedMoney)}`;
        color = '#FF0000';
      } else {
        title = '🟰 TIE!';
        description = `${playerIcon} ties ${opIcon}\n\n` +
          `**No change**\n` +
          `**Accumulated:** $${this.formatMoney(result.accumulatedMoney)}`;
        color = '#808080';
      }
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  // === MYSTERY BOX UI ===

  static createMysteryBoxIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎁 MYSTERY BOX 🎁')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Welcome to the Mystery Box!**\n\n' +
        '**How it works:**\n' +
        '• Choose 1 of 4 mysterious boxes\n' +
        '• Each box contains a random item\n' +
        '• Items can be GOOD, BAD, NEUTRAL, or MONEY\n' +
        '• You\'ll see what you missed... then open yours!\n\n' +
        '💎 **Good Items:** Powerful buffs & bonuses\n' +
        '💀 **Bad Items:** Penalties & curses\n' +
        '⚖️ **Neutral Items:** Wild, unpredictable effects\n' +
        '💰 **Money Items:** Direct cash changes\n\n' +
        '**Choose wisely!**'
      )
      .setFooter({ text: 'Risk and reward await!' });
  }

  static createMysteryBoxSelectionButtons(game) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mystery_box_1')
          .setLabel('📦 Box 1')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mystery_box_2')
          .setLabel('📦 Box 2')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mystery_box_3')
          .setLabel('📦 Box 3')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mystery_box_4')
          .setLabel('📦 Box 4')
          .setStyle(ButtonStyle.Primary)
      )
    ];
  }

  static createMysteryBoxFOMOEmbed(game, unselectedBoxes, selectedIndex) {
    let description = '🔍 **What was in the other boxes...**\n\n';

    for (let i = 0; i < 4; i++) {
      if (i === selectedIndex) {
        description += `📦 **Box ${i + 1}:** ❓ [YOUR CHOICE]\n`;
      } else {
        const idx = i < selectedIndex ? i : i - 1;
        const item = unselectedBoxes[idx];
        description += `📦 **Box ${i + 1}:** ${item.emoji} **${item.name}**\n   _"${item.desc}"_\n`;
      }
    }

    description += '\n💭 **What could have been...**';

    return new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('😱 THE REVEAL!')
      .setDescription(description);
  }

  static createMysteryBoxResultEmbed(game, selectedItem, selectedIndex) {
    const categoryColors = {
      good: '#2ECC71',
      bad: '#E74C3C',
      neutral: '#F39C12',
      money: '#3498DB'
    };

    const categoryIcons = {
      good: '💎',
      bad: '💀',
      neutral: '⚖️',
      money: '💰'
    };

    return new EmbedBuilder()
      .setColor(categoryColors[selectedItem.category] || '#9B59B6')
      .setTitle(`${categoryIcons[selectedItem.category]} YOUR BOX: ${selectedItem.emoji} ${selectedItem.name}`)
      .setDescription(
        `**"${selectedItem.desc}"**\n\n` +
        `**Category:** ${selectedItem.category.toUpperCase()}\n` +
        `**Effect Applied!**\n\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`
      )
      .setFooter({ text: `Box ${selectedIndex + 1} opened!` });
  }

  // === RANDOM PERCENTAGE UI ===

  static createRandomPercentageEmbed(game, percentage) {
    const multiplier = 1 + (percentage / 100);
    const moneyBefore = game.totalMoney;
    const moneyAfter = Math.floor(moneyBefore * multiplier);
    const change = moneyAfter - moneyBefore;

    const isPositive = percentage >= 0;
    const color = isPositive ? '#2ECC71' : '#E74C3C';
    const emoji = isPositive ? '📈' : '📉';
    const sign = isPositive ? '+' : '';

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} RANDOM PERCENTAGE! ${emoji}`)
      .setDescription(
        `**${sign}${percentage}%**\n\n` +
        `**Before:** $${this.formatMoney(moneyBefore)}\n` +
        `**After:** $${this.formatMoney(moneyAfter)}\n` +
        `**Change:** ${sign}$${this.formatMoney(Math.abs(change))}\n\n` +
        (isPositive ? '🎉 **Money multiplied!**' : '💸 **Money reduced!**')
      );
  }

  static createPlayerProfileEmbed(user, stats, remainingPlays, isAdmin = false) {
    const playsDisplay = isAdmin ? '∞ (Admin)' : remainingPlays;
    const adminBadge = isAdmin ? '👑 ' : '';

    let description = `**${adminBadge}${user.username}** is starting a game!\n\n`;

    if (stats) {
      const winRate = stats.total_games > 0 ? ((stats.total_wins / stats.total_games) * 100).toFixed(1) : 0;
      description +=
        `📊 **Player Stats:**\n` +
        `💰 High Score: $${this.formatMoney(stats.highest_score)}\n` +
        `🏆 Wins: ${stats.total_wins}\n` +
        `🎮 Total Games: ${stats.total_games}\n` +
        `📈 Win Rate: ${winRate}%\n`;
    } else {
      description += `📊 **First time playing!**\n`;
    }

    description += `\n🎯 **Plays Remaining Today:** ${playsDisplay}`;

    return new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🎮 New Game Starting!')
      .setDescription(description)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
      .setTimestamp();
  }

  static createRevealAllFloorsEmbed(game) {
    let description = `**🔍 All Floor Contents Revealed (Admin)**\n\n`;
    description += `**Player:** ${game.username}\n`;
    description += `**Current Money:** $${this.formatMoney(game.totalMoney)}\n`;
    description += `**Current Round:** ${game.currentRound}/${game.eventMode ? 7 : 6}\n`;
    description += `**Floors Completed:** ${game.floorsCompleted}/21\n\n`;

    // Show all 21 floors
    for (let floorNum = 1; floorNum <= 21; floorNum++) {
      const floor = game.preGeneratedFloors[floorNum];
      if (!floor) continue;

      const isPlayed = game.playedFloors.includes(floorNum);
      const status = isPlayed ? '✅' : '⬜';

      const leftDisplay = this.getAmountDisplayWithValue(floor.left);
      const rightDisplay = this.getAmountDisplayWithValue(floor.right);

      description += `${status} **Floor ${floorNum}:** ⬅️ ${leftDisplay} | ➡️ ${rightDisplay}\n`;
    }

    description += `\n*This information is only visible to admins.*`;

    return new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('🔓 All Floors Revealed')
      .setDescription(description)
      .setFooter({ text: 'Admin Only - Keep this information private!' })
      .setTimestamp();
  }
}

module.exports = GameUI;
