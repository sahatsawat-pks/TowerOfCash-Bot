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

  static createWelcomeEmbed(remainingPlays) {
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏢 Welcome to Tower of Cash! 🏢')
      .setDescription(
        '**How to Play:**\n' +
        '• Climb 21 floors across 6 rounds\n' +
        '• Each round, select floors to play\n' +
        '• On each floor, choose LEFT ⬅️ or RIGHT ➡️\n' +
        '• Build your fortune or risk it all!\n\n' +
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

    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle(`🎯 Round ${game.currentRound}/6 - Floor Selection`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Floors Played:** ${playedCount}/21\n\n` +
        `Select **${game.floorsToSelect}** floors from the available floors (1-21)\n\n` +
        `**Selected Floors:** ${game.selectedFloors.length > 0 ? game.selectedFloors.join(', ') : 'None'}\n` +
        `**Remaining to Select:** ${game.floorsToSelect - game.selectedFloors.length}\n\n` +
        `**Available Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: 'Pick any available floors from 1 to 21' });
  }

  static createFloorSelectionButtons(game) {
    const availableFloors = game.getAvailableFloors();
    const rows = [];
    let currentRow = [];

    // Create buttons for floors 1-21
    for (let i = 1; i <= 21; i++) {
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

    // Add confirm button to the last row (with remaining floor buttons)
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_floors')
      .setLabel('✅ Start Round')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!game.hasSelectedAllFloors());

    currentRow.push(confirmButton);
    rows.push(new ActionRowBuilder().addComponents(currentRow));

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
        `**Round:** ${game.currentRound}/6\n` +
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
        `**Rounds Completed:** ${game.currentRound}/6\n\n` +
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
        categories.other.push(amount.label || 'Unknown'); // Keep other items unsorted
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
    description += `**Current Round:** ${game.currentRound}/6\n`;
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
