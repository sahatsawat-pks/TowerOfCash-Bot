const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config.json');

class GameUI {

  // --- NEW YEAR GIFT UI ---

  // static createNewYearGiftEmbed(username) {
  //   return new EmbedBuilder()
  //     .setColor('#FF0000') // Festive Red
  //     .setTitle('🎁 Happy New Year! ~ Gift Box 🎁')
  //     .setDescription(
  //       `**${username}, a special gift awaits you!**\n\n` +
  //       `This box contains rewards that affect your **High Score** and the **Server Big Bank**.\n\n` +
  //       `**Possible Rewards:**\n` +
  //       `💎 **Instant Jackpot** ($100M-$500M)\n` +
  //       `🎫 **Golden Ticket** (Bonus Minigame)\n` +
  //       `🏦 **Big Bank Heist** (Claim or Steal)\n` +
  //       `🎪 **Bonus Portal** (2x Rewards)\n` +
  //       `🎲 **Random Money Items** ($100k - $20M)\n` +
  //       `⚠️ **Dangerous Effects** (Black Hole, Gravity Well)\n` +
  //       `🪩 **Chaos & Magic** (Mirror, Trade Winds)\n\n` +
  //       `*Limit: 1 Gift per player per day.*\n` +
  //       `*Click below to open your gift!*`
  //     )
  //     .setThumbnail('https://lh3.googleusercontent.com/pw/AP1GczN2fqEdyb3XDwZWRR0voiHMX124Os5ZbDS0EFW_noAyUqSn8dyaJ1tjRnV8I3OX7ZTQkJBesaJJTad0P8Krss6OqCtmSr-l7ODEcFxWQmF3DdBGhk6ZZJwf1dB5KXaJaR61mYPXIlgsXoIN429vG7dg=w1042-h1042-s-no-gm?authuser=0') // Generic gift icon
  //     .setFooter({ text: 'May the odds be ever in your favor!' })
  //     .setTimestamp();
  // }

  // static createNewYearGiftButton() {
  //   return [
  //     new ActionRowBuilder().addComponents(
  //       new ButtonBuilder()
  //         .setCustomId('new_year_gift_claim')
  //         .setLabel('🎁 Open Gift')
  //         .setStyle(ButtonStyle.Success)
  //     )
  //   ];
  // }

  // static createNewYearGiftResultEmbed(username, result) {
  //   const isGood = result.type === 'good' || result.amount > 0;
  //   const color = isGood ? '#00FF00' : '#FF0000'; // Green or Red
    
  //   let description = `**${result.outcomeName}**\n\n`;
  //   description += `${result.description}\n\n`;
    
  //   if (result.amount !== undefined && result.amount !== 0) {
  //     const symbol = result.amount > 0 ? '+' : '';
  //     description += `**Effect:** ${symbol}$${this.formatMoney(result.amount)}\n`;
  //   }
    
  //   if (result.highScoreBefore !== undefined) {
  //        description += `**Old High Score:** $${this.formatMoney(result.highScoreBefore)}\n`;
  //        description += `**New High Score:** $${this.formatMoney(result.highScoreAfter)}`;
  //   }

  //   return new EmbedBuilder()
  //     .setColor(color)
  //     .setTitle(`🎁 Gift Opened: ${result.name}`)
  //     .setDescription(description)
  //     .setFooter({ text: 'Happy New Year!' })
  //     .setTimestamp();
  // }

  // static createNewYearGiftListEmbed(page = 0) {
  //   // Page 0 = Money Items, Page 1 = Special Items Part 1, Page 2 = Special Items Part 2
    
  //   const moneyItems = [
  //     { name: '🧂 SALT', chance: '14.83%', effect: 'Nothing!' },
  //     { name: '🪙 Pennies', chance: '8.05%', effect: '+$100,000' },
  //     { name: '💵 Pocket Change', chance: '6.78%', effect: '+$500,000' },
  //     { name: '📉 Small Tax', chance: '6.36%', effect: '-$3,000,000' },
  //     { name: '💴 Payday', chance: '5.93%', effect: '+$1,500,000' },
  //     { name: '🎟️ Parking Ticket', chance: '5.51%', effect: '-$8,000,000' },
  //     { name: '🎁 Treasure Chest', chance: '5.08%', effect: '+$3,500,000' },
  //     { name: '🧾 Bill Payment', chance: '4.66%', effect: '-$20,000,000' },
  //     { name: '🏆 Gold Bar', chance: '4.24%', effect: '+$7,500,000' },
  //     { name: '📈 Percentage Boost', chance: '3.81%', effect: '+20% High Score' },
  //     { name: '📊 Percentage Tax', chance: '3.81%', effect: '-20% High Score' },
  //     { name: '💎 Diamond Cache', chance: '3.39%', effect: '+$15,000,000' },
  //     { name: '👑 Royal Fortune', chance: '2.54%', effect: '+$20,000,000' },
  //     { name: '🧈🧂 SSR SALT', chance: '0.42%', effect: 'Super Rare Nothing!' }
  //   ];

  //   const specialItems1 = [
  //     { name: '💰 Instant Jackpot', effect: '+$100M-$500M' },
  //     { name: '🎫 Golden Ticket', effect: '+$50M (Bonus)' },
  //     { name: '🏦 Big Bank', effect: 'Claim ENTIRE Big Bank!' },
  //     { name: '🏦 Small Bank', effect: 'Steal 10% of Big Bank' },
  //     { name: '🎪 Bonus Portal', effect: '+$25M' },
  //     { name: '🎁 Gift Horse', effect: 'Donate 25%, +2 plays' },
  //     { name: '📢 Announcement', effect: '+10% High Score' },
  //     { name: '🕳️ Black Hole', effect: '-50% to Big Bank' },
  //     { name: '⬇️ Gravity Well', effect: '-80% to Big Bank' },
  //     { name: '🥷 Thief Shadow', effect: '-$10M-$1B' }
  //   ];

  //   const specialItems2 = [
  //     { name: '🏢 Tower of Crash', effect: 'Reset Leaderboard' },
  //     { name: '✂️ Cut Front', effect: 'Remove 1st digit' },
  //     { name: '🏦 BRUH Bank', effect: 'ALL to Big Bank!' },
  //     { name: '🔴 Chaos Orb', effect: '±$50M random' },
  //     { name: '🪩 Mirror Match', effect: 'Reverse digits' },
  //     { name: '🌪️ Trade Winds', effect: 'Swap 1st/last digit' },
  //     { name: '🎲 Double or Nothing', effect: 'x2 or -50%' },
  //     { name: '🔄 Malfunction', effect: '±$10B random!' },
  //     { name: '🚀 Beyond 2nd', effect: 'Set to 2nd -1' },
  //     { name: '🚀 Beyond 3rd', effect: 'Set to 3rd -1' },
  //     { name: '🔙 Back to Basic', effect: 'Reset to $0' }
  //   ];

  //   let title, description, color;

  //   if (page === 0) {
  //     title = '🎁 New Year Gift List - Money Items (77.5%)';
  //     color = '#FFD700';
  //     description = '**Common Rewards & Penalties:**\n\n';
  //     moneyItems.forEach(item => {
  //       description += `${item.name} **(${item.chance})** - ${item.effect}\n`;
  //     });
  //     description += '\n*Navigate to see Special Items →*';
  //   } else if (page === 1) {
  //     title = '🎁 New Year Gift List - Special Items Part 1 (22.5%)';
  //     color = '#FF69B4';
  //     description = '**Rare & Powerful Effects:**\n\n';
  //     specialItems1.forEach(item => {
  //       description += `${item.name} - ${item.effect}\n`;
  //     });
  //     description += '\n*Equal probability within Special category*';
  //   } else {
  //     title = '🎁 New Year Gift List - Special Items Part 2';
  //     color = '#9370DB';
  //     description = '**Chaos & Manipulation:**\n\n';
  //     specialItems2.forEach(item => {
  //       description += `${item.name} - ${item.effect}\n`;
  //     });
  //     description += '\n*Total ~30 Special items, uniform distribution*';
  //   }

  //   return new EmbedBuilder()
  //     .setColor(color)
  //     .setTitle(title)
  //     .setDescription(description)
  //     .setFooter({ text: 'Use /new-year-gift to claim your daily gift!' })
  //     .setTimestamp();
  // }

  // static createNewYearGiftListButtons(currentPage) {
  //   const buttons = [];
    
  //   if (currentPage > 0) {
  //     buttons.push(
  //       new ButtonBuilder()
  //         .setCustomId('gift_list_prev')
  //         .setLabel('◀️ Previous')
  //         .setStyle(ButtonStyle.Primary)
  //     );
  //   }
    
  //   if (currentPage < 2) {
  //     buttons.push(
  //       new ButtonBuilder()
  //         .setCustomId('gift_list_next')
  //         .setLabel('Next ▶️')
  //         .setStyle(ButtonStyle.Primary)
  //     );
  //   }

  //   return buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
  // }


  static formatMoney(amount) {
    if (amount === undefined || amount === null) return '0';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static createIntroEmbed() {
    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🏢 Tower of Cash - Normal Mode 🏢')
      .setDescription(
        '**Welcome to Tower of Cash - Normal Mode!**\n' +
        'Climb 21 floors and build your fortune!\n\n' +
        '**🎮 Game Structure:**\n' +
        '• **21 Floors** across **6 Rounds** (6→5→4→3→2→1)\n' +
        '• Each floor: Choose ⬅️ LEFT or ➡️ RIGHT\n' +
        '• **42 Content Items**\n\n' +
        '**💰 Content Breakdown:**\n' +
        '• **Cash:** 21 values ($1 → $1M)\n' +
        '• **Losses:** 4 percentages (-25% to -100%)\n' +
        '• **Gains:** 4 percentages (+25% to +100%)\n' +
        '• **Random:** 4 mystery amounts\n' +
        '• **Special:** Add a 1, Add a 0, X Level\n' +
        '• **Nothing:** 5 blank tiles\n' +
        '• **Game Over:** 1 instant loss\n\n' +
        '**🏆 Win Conditions:**\n' +
        '• Complete all 21 floors = Victory!\n' +
        '• Go to Lobby = Keep your money\n\n' +
        '**❌ Loss Conditions:**\n' +
        '• Hit Game Over tile\n' +
        '• -100% at end of round (after Round 1)\n' +
        '• Money reaches $0 at round end\n\n' +
        '**📊 Daily Limit:** 5 free plays (Admins: unlimited)\n\n' +
        '**Commands:** `/play` • `/stats` • `/achievements` • `/help`'
      )
      .setThumbnail('https://lh3.googleusercontent.com/pw/AP1GczN2fqEdyb3XDwZWRR0voiHMX124Os5ZbDS0EFW_noAyUqSn8dyaJ1tjRnV8I3OX7ZTQkJBesaJJTad0P8Krss6OqCtmSr-l7ODEcFxWQmF3DdBGhk6ZZJwf1dB5KXaJaR61mYPXIlgsXoIN429vG7dg=w1042-h1042-s-no-gm?authuser=0')
      .setFooter({ text: 'Normal Mode: 42 items • 21 floors • 6 rounds' })
      .setTimestamp();
  }

  static createSeason1IntroEmbed() {
    return new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('🎮 Tower of Cash - SEASON 1 🎮')
      .setDescription(
        '**Welcome to Season 1!**\n' +
        'The ultimate challenge with 30 floors, 9+ minigames, and mystery items!\n\n' +
        '**🎮 Season 1 Features:**\n' +
        '• **30 Floors** across **8 Rounds** (7→6→5→4→3→2→2→1)\n' +
        '• **56 Content Items** (14 more than Normal!)\n' +
        `• **11+ Minigames** including Round 3 special event\n` +
        `• **Mystery Box** - 66 unique items\n` +
        `• **Mart-of-Cash** - Rob or purchase special items\n` +
        `• **Big Bank** - Win all accumulated losses!\n` +
        `• **Basement Mode** - Negotiate with the Operator\n` +
        `• **Achievements** - 60+ to unlock\n\n` +
        '**💰 Season 1 Content (56 items):**\n' +
        '• **Cash:** 21 values ($1 → $1M)\n' +
        '• **Losses/Gains:** 4 each (-100% to +100%)\n' +
        '• **Random:** 5 mystery amounts (adds Random 5)\n' +
        '• **Special:** 7 items (?, Mirror, ±%, Boost, +1, +0, X)\n' +
        '• **Events:** Mystery Box, Mart-of-Cash\n' +
        '• **Minigames:** 9+ exclusive games\n' +
        '• **Nothing:** 2 tiles\n' +
        '• **Game Over:** 1 instant loss\n\n' +
        '**🎰 Featured Minigames:**\n' +
        '• 🏦 **The Vault** • 🎰 **Mega Grid** • ♾️ **The ∞%**\n' +
        '• 🏚️ **Hideout** • 🪆 **Babushka** • 🚪 **Door Escape**\n' +
        '• 🎫 **Six Zeroes** • 🎲 **Go Big or Go Broke** (R3)\n' +
        '• Plus 10+ Monopoly-themed games from Mystery Box!\n\n' +
        '**✨ Special Events:**\n' +
        '• 🎊 **Round 3:** Unlock Go Big or Go Broke\n' +
        '• 🏆 **Achievements:** Track your progress\n' +
        '• 👁️ **Peek System:** Preview dangerous floors\n\n' +
        '**📊 Daily Limit:** 5 free plays • Admins: unlimited\n\n' +
        '*Good luck climbing the tower!*'
      )
      .setThumbnail('https://lh3.googleusercontent.com/pw/AP1GczN2fqEdyb3XDwZWRR0voiHMX124Os5ZbDS0EFW_noAyUqSn8dyaJ1tjRnV8I3OX7ZTQkJBesaJJTad0P8Krss6OqCtmSr-l7ODEcFxWQmF3DdBGhk6ZZJwf1dB5KXaJaR61mYPXIlgsXoIN429vG7dg=w1042-h1042-s-no-gm?authuser=0')
      .setFooter({ text: 'Season 1: 66+ items • 30 floors • 8 rounds • 60+ achievements' })
      .setTimestamp();
  }

  static createWelcomeEmbed(remainingPlays, eventMode = false) {
    const floors = eventMode ? 30 : 21;
    const rounds = eventMode ? 8 : 6;
    const modeLabel = eventMode ? ' 🌟 Season 1 🌟' : '';

    return new EmbedBuilder()
      .setColor(eventMode ? '#FF1493' : '#FFD700')
      .setTitle(`🏢 Welcome to Tower of Cash!${modeLabel} 🏢`)
      .setDescription(
        '**How to Play:**\n' +
        `• Climb ${floors} floors across ${rounds} rounds\n` +
        '• Each round, select floors to play\n' +
        '• On each floor, choose LEFT ⬅️ or RIGHT ➡️\n' +
        '• Build your fortune or risk it all!\n\n' +
        (eventMode ? '**Season 1 Features:**\n' +
        '• 11+ Minigames including Go Big or Go Broke\n' +
        '• Mystery Box with 66 unique items\n' +
        '• Mart-of-Cash for robberies & purchases\n' +
        '• Achievement system with 60+ unlockables\n' +
        '• Peek system to preview floors\n' +
        '• Round 3 special event\n' +
        '• Mirror, ?, X-Protection special items\n\n' : 
        '**Features:**\n' +
        '• 60+ achievements to unlock\n' +
        '• Simple strategic gameplay\n\n') +
        '**Win Conditions:**\n' +
        '• Complete all floors = Victory!\n' +
        '• Go to Lobby = Keep your winnings\n\n' +
        '**Loss Conditions:**\n' +
        '• Game Over tile\n' +
        '• -100% or $0 at round end (after Round 1)\n\n' +
        `**Remaining Plays Today:** ${remainingPlays}/5`
      )
      .setFooter({ text: 'Select floors to begin!' })
      .setTimestamp();
  }

  static createFloorSelectionEmbed(game) {
    const availableFloors = game.getAvailableFloors();
    const playedCount = game.playedFloors.length;
    const amountsDisplay = this.formatRemainingAmounts(game.remainingAmounts);
    const maxFloors = game.eventMode ? 30 : 21;
    const maxRounds = game.eventMode ? 8 : 6;

    // Build active effects section
    let activeEffectsText = '';
    if (game.peeks && game.peeks > 0) {
      activeEffectsText += `👁️ **Peeks:** ${game.peeks}\n`;
    }
    if (game.xProtection && game.xProtection > 0) {
      activeEffectsText += `🛡️ **X-Protection:** ${game.xProtection}\n`;
    }
    if (game.activeEffects && game.activeEffects.length > 0) {
      for (const effect of game.activeEffects) {
        if (effect.type === 'gameOverImmunity') {
          activeEffectsText += `🛡️ **Game Over Immunity**\n`;
        } else if (effect.type === 'autoRevive') {
          activeEffectsText += `🪶 **Phoenix Feather** (Auto-revive)\n`;
        } else if (effect.type === 'noLoss' && effect.floorsRemaining) {
          activeEffectsText += `🪂 **Safety Net** (${effect.floorsRemaining} floors)\n`;
        } else if (effect.type === 'doubleRewards' && effect.floorsRemaining) {
          activeEffectsText += `🧲 **Money Magnet** (${effect.floorsRemaining} floors)\n`;
        } else if (effect.type === 'guaranteedPositive' && effect.floorsRemaining) {
          activeEffectsText += `🍀 **Lucky Clover** (${effect.floorsRemaining} floors)\n`;
        } else if (effect.type === 'tax_immunity') {
          activeEffectsText += `💸 **Tax Immunity** (Next % loss blocked)\n`;
        } else if (effect.type === 'lobby_locked') {
          activeEffectsText += `🎰 **Lobby Locked** (Forced to play)\n`;
        } else if (effect.type === 'oracle_active') {
          activeEffectsText += `🔮 **Oracle's Vision** (Next floor visible)\n`;
        } else if (effect.type === 'bonus_multiplier_2') {
          activeEffectsText += `🎪 **Bonus Portal** (2x rewards)\n`;
        }
      }
    }

    return new EmbedBuilder()
      .setColor(game.eventMode ? '#FF1493' : '#4169E1')
      .setTitle(`🎯 Round ${game.currentRound}/${maxRounds} - Floor Selection`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Floors Played:** ${playedCount}/${maxFloors}\n` +
        (activeEffectsText ? `\n${activeEffectsText}` : '') +
        `\nSelect **${game.floorsToSelect}** floors from the available floors (1-${maxFloors})\n\n` +
        `**Selected Floors:** ${game.selectedFloors.length > 0 ? game.selectedFloors.join(', ') : 'None'}\n` +
        `**Remaining to Select:** ${game.floorsToSelect - game.selectedFloors.length}\n\n` +
        `**Available Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: `Pick any available floors from 1 to ${maxFloors}` });
  }

  static createFloorSelectionButtons(game) {
    const availableFloors = game.getAvailableFloors();
    const maxFloors = game.eventMode ? 30 : 21;
    const rows = [];

    if (game.eventMode) {
      // Event mode: Show 15 floors per page with pagination
      const floorsPerPage = 15;
      const currentPage = game.floorSelectionPage || 0;
      const startFloor = currentPage * floorsPerPage + 1;
      const endFloor = Math.min(startFloor + floorsPerPage - 1, maxFloors);

      let currentRow = [];

      // Create buttons for current page of floors
      for (let i = startFloor; i <= endFloor; i++) {
        const isSelected = game.selectedFloors.includes(i);
        const isAvailable = availableFloors.includes(i); // Check if floor is available (not played/removed)

        const button = new ButtonBuilder()
          .setCustomId(`floor_${i}`)
          .setLabel(`${i}`)
          .setStyle(isSelected ? ButtonStyle.Success : !isAvailable ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(!isAvailable);

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
      
      // Add Peek button row if player has peeks
      if (game.peeks && game.peeks > 0) {
        const peekRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('use_peek')
            .setLabel(`👁️ Use Peek (${game.peeks} available)`)
            .setStyle(ButtonStyle.Secondary)
        );
        rows.push(peekRow);
      }

    } else {
      // Normal mode: use buttons (21 floors fits in 5 rows)
      let currentRow = [];

      for (let i = 1; i <= maxFloors; i++) {
        const isSelected = game.selectedFloors.includes(i);
        const isAvailable = availableFloors.includes(i); // Check if floor is available (not played/removed)

        const button = new ButtonBuilder()
          .setCustomId(`floor_${i}`)
          .setLabel(`${i}`)
          .setStyle(isSelected ? ButtonStyle.Success : !isAvailable ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(!isAvailable);

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

    const hasOracle = game.activeEffects && game.activeEffects.some(e => e.type === 'oracle_active');
    let choiceDescription = '**Choose a side:**\n' +
        '⬅️ Left - Hidden\n' +
        '➡️ Right - Hidden\n\n';
    
    if (hasOracle) {
      const floor = game.preGeneratedFloors[floorNumber];
      if (floor) {
        const leftDisplay = this.getDisplayValue(floor.left);
        const rightDisplay = this.getDisplayValue(floor.right);
        choiceDescription = `🔮 **ORACLE'S VISION ACTIVE!**\n` +
          `⬅️ **Left:** ${leftDisplay}\n` +
          `➡️ **Right:** ${rightDisplay}\n\n`;
      }
    }

    return new EmbedBuilder()
      .setColor('#FF6347')
      .setTitle(`🏢 Floor ${floorNumber} - Make Your Choice!`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n` +
        `**Round:** ${game.currentRound}/${game.eventMode ? 8 : 6}\n` +
        `**Floor in Round:** ${game.currentFloor + 1}/${game.selectedFloors.length}\n` +
        `**Total Floors Played:** ${game.floorsCompleted}/${game.eventMode ? 30 : 21}\n\n` +
        choiceDescription +
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
      if (chosenAmount.protected) {
        resultText = `🛡️ **X LEVEL - PROTECTED!**\n\n**You had X-Protection!**\nX-Level has no effect!\nYou continue with **$${this.formatMoney(moneyBefore)}**`;
      } else {
        resultText = `❌ **X LEVEL!**\n\n**The last floor will be skipped!**\nYou continue with **$${this.formatMoney(moneyBefore)}**`;
      }
    } else if (chosenAmount.type === 'percentage' && chosenAmount.value === -100 && game.currentRound > 0) {
      resultText = '💀 **-100%!** You lost everything!';
    } else {
      const changeText = actualGain >= 0 ? `**+$${this.formatMoney(actualGain)}**` : `**-$${this.formatMoney(Math.abs(actualGain))}**`;
      resultText = `**You gained:** ${changeText}\n`;
    }

    return new EmbedBuilder()
      .setColor('#FFA500') // Orange for suspense
      .setTitle(`🎰 Floor ${floorNumber} Result...`)
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
      .setFooter({ text: '🥁 Drumroll... Revealing what you avoided...' });
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
      if (chosenAmount.protected) {
        resultText = `🛡️ **X LEVEL - PROTECTED!**\n\n**You had X-Protection!**\nX-Level has no effect!\nYou continue with **$${this.formatMoney(moneyBefore)}**\n\n**Floors played this round:** ${game.currentFloor + 1}/${game.selectedFloors.length}`;
      } else if (game.xLevelSkippedFloor) {
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
      .setTitle(benefit >= 0 ? `🎉 Floor ${floorNumber} Result - GREAT CHOICE!` : `💥 Floor ${floorNumber} Result - OUCH!`)
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**You chose:** ${choice === 'left' ? '⬅️ Left' : '➡️ Right'}\n\n` +
        `**You got:** ${chosenDisplay}\n` +
        `**You avoided:** ${lostDisplay}\n\n` +
        // Show boost multiplier value if applicable
        (chosenAmount.type === 'special' && chosenAmount.action === 'boost_multiplier' && chosenAmount.actualValue !== undefined
          ? `**Boost Multiplier:** ${chosenAmount.actualValue.toFixed(2)}x!!\n\n`
          : '') +
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
        `**Floors Completed:** ${game.floorsCompleted}/${game.eventMode ? 30 : 21}\n` +
        `**Rounds Completed:** ${game.currentRound}/${game.eventMode ? 8 : 6}\n\n` +
        `**What would you like to do?**\n` +
        `🏠 **Go to Lobby**: Cash out now and keep your $${this.formatMoney(game.totalMoney)}\n` +
        `🎮 **Continue Playing**: Move to next round and risk it all!\n\n` +
        `**Remaining Amounts:**\n${amountsDisplay}`
      )
      .setFooter({ text: 'Choose wisely!' });
  }

  static createRoundEndButtons(game) {
    const isLobbyLocked = !!(game && game.activeEffects && game.activeEffects.some(e => 
      e.type === 'lobby_locked' && 
      e.targetRound !== undefined &&
      game.currentRound === e.targetRound
    ));

    // Debug logging

    if (game?.activeEffects) {
      const lobbyEffects = game.activeEffects.filter(e => e.type === 'lobby_locked');

    }

    const continueButton = new ButtonBuilder()
      .setCustomId('continue_to_next_round')
      .setLabel('🎮 Continue Playing')
      .setStyle(ButtonStyle.Success);

    const lobbyButton = new ButtonBuilder()
      .setCustomId('go_lobby')
      .setLabel(isLobbyLocked ? '🎰 Lobby Locked' : '🏠 Go to Lobby')
      .setStyle(isLobbyLocked ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isLobbyLocked);

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
        description = `You completed all ${game.maxFloors} floors!\n\n**Final Score:** $${this.formatMoney(finalScore)}`;
        color = '#FFD700';
        break;
      case 'lobby':
        title = '🏠 Went to Lobby';
        description = `You decided to take your winnings home!\n\n**Final Score:** $${this.formatMoney(finalScore)}\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#4169E1';
        break;
      case 'gave_up':
        title = '❌ Game Over - Gave Up';
        description = `You gave up and went home with nothing!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      case 'game_over_tile':
        title = '💀 Game Over - Hit Game Over Tile';
        description = `You hit the Game Over tile!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      case 'minus_100':
        title = '💀 Game Over - Hit -100%';
        description = `You lost everything to -100%!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      case 'no_money':
        title = '💀 Game Over - No Money Left';
        description = `You ran out of money!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      case 'x_level':
        title = '❌ Game Over - X Level';
        description = `X Level cancelled your progress!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      case 'mart_busted':
        title = '💀 BUSTED! - Mart Robbery Failed';
        description = `You were caught robbing the Mart-Of-Ca$h!\n\nSent to the basement!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#000000';
        break;
      case 'mart_what_game_over':
        title = '💀 Game Over - BUY WHAT? Gone Wrong';
        description = `You bought "WHAT?" and got the Game Over tile!\n\nBad luck!\n\n**Final Score:** $0\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#FF0000';
        break;
      default:
        title = '🎮 Game Over';
        description = `The game has ended.\n\n**Final Score:** $${this.formatMoney(finalScore)}\n**Floors Completed:** ${game.floorsCompleted + 1}`;
        color = '#808080';
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

  // === BASEMENT MODE UI ===

  static createBasementIntroEmbed(game) {
    // Check if player has 0 or less money for special message
    const hasNoMoney = game.totalMoney <= 0;
    
    return new EmbedBuilder()
      .setColor('#000000')
      .setTitle('🏚️ THE BASEMENT - JOHN CHAONA\'S OFFER')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `**💀 GAME OVER? Not yet...**\n` +
        `You've been dragged to the basement by **John Chaona**, the money drainer.\n\n` +
        `**🗣️ John Chaona says:**\n` +
        (hasNoMoney 
          ? `*"You don't have any money? - YOU WILL STAY HERE FOREVER HAHAHAHHHHH"*`
          : `*"You want to leave with your money? Fine. But you have to negotiate."*\n\n` +
            `**📜 The Rules:**\n` +
            `1. Offer a **percentage (1-100%)** of your money that you want to **KEEP**.\n` +
            `2. I will think of a random number (1-100%).\n` +
            `3. If your offer ≤ My number: **DEAL! You leave with that percentage.**\n` +
            `4. If your offer > My number: **GREEDY! I TAKE EVERYTHING!**\n\n` +
            `**Example:**\n` +
            `• You offer to keep **10%**. Safer. High chance to accept.\n` +
            `• You offer to keep **90%**. Risky. High chance I refuse.\n\n` +
            `**What is your offer?**`)
      )
      .setFooter({ text: hasNoMoney ? 'Game Over - No money to negotiate with.' : 'Offer too high = Lose everything. Offer low = Keep something.' })
      .setThumbnail('https://cdn.discordapp.com/attachments/1111111111111111111/1111111111111111111/john_chaona.png'); // Placeholder or remove 
  }

  static createBasementNegotiateButtons() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('basement_negotiate')
          .setLabel('💬 Negotiate Offer')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📝')
      )
    ];
  }

  static createBasementResultEmbed(game, result) {
    let title = '';
    let description = '';
    let color = '#000000';

    if (result.won) {
      title = '🤝 DEAL ACCEPTED';
      description =
        `**You offered to keep:** ${result.playerPercent}%\n` +
        `**John Chaona's Limit:** ${result.botPercent}%\n\n` +
        `*"Fine. You aren't too greedy. Take it and get out."*\n\n` +
        `**Kept:** $${this.formatMoney(result.finalAmount)} (${result.playerPercent}%)\n` +
        `**Lost:** $${this.formatMoney(result.originalAmount - result.finalAmount)}`;
      color = '#00FF00';
    } else {
      title = '💀 DEAL REJECTED - TOO GREEDY!';
      description =
        `**You offered to keep:** ${result.playerPercent}%\n` +
        `**John Chaona's Limit:** ${result.botPercent}%\n\n` +
        `*"YOU ASK FOR TOO MUCH! I TAKE IT ALL!"*\n\n` +
        `**Lost Everything:** $${this.formatMoney(result.originalAmount)}`;
      color = '#FF0000';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'John Chaona returns to the shadows...' })
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
      .setColor('#9C27B0')
      .setTitle('🚪 HIDEOUT BREAKTHROUGH 🚪')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Pick ascending numbers to escape!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• **12 hidden buttons** with numbers 1-12\n' +
        '• Pick numbers in **ASCENDING order**\n' +
        '• Each higher number = Success!\n' +
        '• Pick lower/equal number = Game Over\n\n' +
        '**🔢 How to Play:**\n' +
        '1. First pick is always safe (+$20k)\n' +
        '2. Next picks must be HIGHER than previous\n' +
        '3. Successfully pick 6 times = $1M JACKPOT!\n' +
        '4. Pick 12 early = Win accumulated money\n' +
        '5. Lower number = Keep accumulated money\n\n' +
        '**💰 Rewards:**\n' +
        '• **$20,000** per successful pick\n' +
        '• **6 successful picks:** $1,000,000 JACKPOT! 🏆\n' +
        '• **Pick 12:** Win accumulated (maxed out)\n\n' +
        '**🎮 Strategy:**\n' +
        '• Higher first pick = Harder to continue\n' +
        '• Lower first pick = More room to grow\n' +
        '• Risk vs Reward with each choice!\n\n' +
        '**Press START to begin!**'
      )
      .setFooter({ text: 'Season 1 • 12 Numbers • Pick Ascending • $20k Each!' });
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
      .setFooter({ text: 'Season 1 • This is what all the buttons were hiding!' });
  }

  // === BABUSHKA MINIGAME UI ===

  static createBabushkaIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('🪆 BABUSHKA BONANZA 🪆')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Open dolls wisely - 3 strikes and you\'re out!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• **12 dolls** total to choose from\n' +
        '• **2 empty dolls** (worth $0) ⚠️\n' +
        '• **10 dolls with prizes** worth $10k - $10M 💰\n' +
        '• **3 strikes maximum** - pick wisely!\n\n' +
        '**💰 Prize Tiers (11 total):**\n' +
        '• Tier 1: $0 (2 dolls)\n' +
        '• Tiers 2-11: $10k, $20k, $50k, $100k, $250k, $500k, $1M, $2.5M, $5M, $10M\n\n' +
        '**🎮 How to Play:**\n' +
        '1. Select a doll to reveal its value\n' +
        '2. BANK to keep current total (safe option)\n' +
        '3. CONTINUE to add more (risky!)\n' +
        '4. Hit 3 empty dolls = **LOSE EVERYTHING** 💔\n\n' +
        '**🏆 Strategy:**\n' +
        '• Each empty after = 1 strike\n' +
        '• Bank early for safe money, or risk for $10M!\n\n' +
        '**Select your first doll to begin!**'
      )
      .setFooter({ text: 'Season 1 • 12 dolls • 2 empty • 10 with prizes • 3 strikes max' });
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
    if (!result || result.bankedAmount === undefined) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('Failed to process banking action.');
    }

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

  // === GO BIG OR GO BROKE UI EMBEDS ===

  static createGoBigOrGoBrokeIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('💥 GO BIG OR GO BROKE 💥')
      .setDescription(
        '**CONGRATULATIONS!** You survived Round 3 without a Game Over!\n\n' +
        '**THE ULTIMATE GAMBLE AWAITS...**\n\n' +
        '🎯 **12 Spaces:** 8 are 💰 $100,000 | 4 are 💥 BOMBS\n\n' +
        '**THE RULES:**\n' +
        '• If your FIRST pick is 💰 Money:\n' +
        '  → Keep picking MONEY spaces\n' +
        '  → Hit a 💥 = Game Over, keep all money found\n' +
        '  → Risk vs Reward!\n\n' +
        '• If your FIRST pick is 💥 Bomb:\n' +
        '  → Find ALL 4 💥 BOMBS = $1,000,000 JACKPOT!\n' +
        '  → Hit 💰 Money = Instant End, only $100,000\n\n' +
        '💰 **Your Money:** $' + this.formatMoney(game.totalMoney) + '\n\n' +
        '⚠️ **Choose wisely... One pick determines EVERYTHING!**'
      )
      .setFooter({ text: 'Pick a space to begin your fate...' });
  }

  static createGoBigOrGoBrokePickEmbed(game, result) {
    const state = game.goBigOrGoBrokeState;
    const remainingSpaces = 12 - state.picked.length;

    let color = '#FF4500';
    let title = '💥 GO BIG OR GO BROKE';
    let description = '';

    if (result.firstPick) {
      if (result.mode === 'money_hunt') {
        color = '#FFD700';
        title = '💰 MONEY HUNT MODE ACTIVATED!';
        description = 
          `**YOU FOUND MONEY!** 💰\n\n` +
          `🎯 **Your Path:** Keep picking MONEY\n` +
          `💥 **Danger:** Hit a BOMB and it's over\n` +
          `💰 **Money Found:** $${this.formatMoney(result.totalMoney)}\n\n` +
          `**${remainingSpaces} spaces remaining...**\n\n` +
          `⚠️ Do you have the courage to continue?`;
      } else {
        color = '#FF0000';
        title = '💥 BOMB HUNT MODE ACTIVATED!';
        description =
          `**YOU FOUND A BOMB!** 💥\n\n` +
          `🎯 **Your Mission:** Find ALL 4 BOMBS\n` +
          `💰 **Danger:** Hit MONEY = Lose, only $100k\n` +
          `💥 **Bombs Found:** ${result.bombsFound}/4\n\n` +
          `**${remainingSpaces} spaces remaining...**\n\n` +
          `🏆 Find all 4 for **$1,000,000 JACKPOT!**`;
      }
    } else if (result.gameOver) {
      if (result.mode === 'money_hunt') {
        color = result.won ? '#32CD32' : '#FF6B6B';
        title = result.won ? '💰 MONEY HUNT COMPLETE!' : '💥 BOMB HIT!';
        description =
          `**${result.won ? 'VICTORY!' : 'GAME OVER!'}**\n\n` +
          `💰 **Total Money Collected:** $${this.formatMoney(result.winnings)}\n` +
          `💥 **Final Pick:** ${result.space.emoji}\n\n` +
          `${result.won ? '🎉 You walked away with the loot!' : '💣 You hit a bomb but kept your earnings!'}`;
      } else {
        if (result.jackpot) {
          color = '#FFD700';
          title = '🏆 JACKPOT! $1,000,000! 🏆';
          description =
            `**INCREDIBLE!** YOU FOUND ALL 4 BOMBS!\n\n` +
            `💥💥💥💥\n\n` +
            `💰 **JACKPOT WON:** $1,000,000\n\n` +
            `🎊 **LEGENDARY GAMBLE!** 🎊`;
        } else {
          color = '#FF6B6B';
          title = '💰 MONEY FOUND - GAME OVER';
          description =
            `**OH NO!** You found MONEY!\n\n` +
            `💥 **Bombs Found:** ${result.bombsFound}/4\n` +
            `💰 **Consolation Prize:** $100,000\n\n` +
            `😔 So close to the jackpot...`;
        }
      }
    } else {
      if (result.mode === 'money_hunt') {
        color = '#FFD700';
        title = '💰 MONEY FOUND!';
        description =
          `**Another $100,000!** 💰\n\n` +
          `💰 **Total Collected:** $${this.formatMoney(result.totalMoney)}\n` +
          `🎯 **Money Spaces Found:** ${result.moneyFound}/8\n\n` +
          `**${remainingSpaces} spaces remaining...**\n\n` +
          `💥 One bomb ends it all... Keep going?`;
      } else {
        color = '#FF4500';
        title = '💥 BOMB FOUND!';
        description =
          `**Good! Keep hunting!** 💥\n\n` +
          `💥 **Bombs Found:** ${result.bombsFound}/4\n` +
          `💰 **Danger:** Don't hit MONEY!\n\n` +
          `**${remainingSpaces} spaces remaining...**\n\n` +
          `${result.bombsFound === 3 ? '🔥 **ONE MORE BOMB FOR $1M!**' : '🎯 Keep searching for bombs...'}`;
      }
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: result.gameOver ? 'Game Complete!' : 'The tension is real...' });
  }

  static createGoBigOrGoBrokeButtons(game) {
    const state = game.goBigOrGoBrokeState;
    const rows = [];

    // Create 3 rows of 4 buttons each
    for (let row = 0; row < 3; row++) {
      const actionRow = new ActionRowBuilder();
      
      for (let col = 0; col < 4; col++) {
        const index = row * 4 + col;
        const isPicked = state.picked.includes(index);
        const space = state.spaces[index];
        
        // Show picked spaces
        const label = isPicked ? space.emoji : `${index + 1}`;
        const style = isPicked 
          ? (space.type === 'money' ? ButtonStyle.Success : ButtonStyle.Danger)
          : ButtonStyle.Secondary;
        
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`gobig_space_${index}`)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(isPicked || state.gameOver)
        );
      }
      
      rows.push(actionRow);
    }

    return rows;
  }

  // === MART-OF-CASH UI EMBEDS ===

  static createMartOfCashIntroEmbed(game) {
    const MartOfCash = require('./events/MartOfCash');
    const items = MartOfCash.getPurchaseItems();

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏪 MART-OF-CA$H 🏪')
      .setDescription(
      `**Player:** ${game.username}\n` +
      `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
      '**Welcome to Mart-Of-Ca$h!**\n\n' +
      '**🛒 PURCHASABLE ITEMS:**\n' +
      `• ${items.peek.emoji} **${items.peek.name}** - $${this.formatMoney(items.peek.price)}\n` +
      `  ${items.peek.desc}\n` +
      `• ${items.minigame.emoji} **${items.minigame.name}** - $${this.formatMoney(items.minigame.price)}\n` +
      `  ${items.minigame.desc}\n` +
      `• ${items.sixZeroes.emoji} **${items.sixZeroes.name}** - $${this.formatMoney(items.sixZeroes.price)}\n` +
      `  ${items.sixZeroes.desc}\n` +
      `• ${items.mysteryBox.emoji} **${items.mysteryBox.name}** - $${this.formatMoney(items.mysteryBox.price)}\n` +
      `  ${items.mysteryBox.desc}\n` +
      `• ${items.xProtection.emoji} **${items.xProtection.name}** - $${this.formatMoney(items.xProtection.price)}\n` +
      `  ${items.xProtection.desc}\n` +
      `• ${items.randomPercentage.emoji} **${items.randomPercentage.name}** - 50% of current money\n` +
      `  ${items.randomPercentage.desc}\n` +
      `• ${items.what.emoji} **${items.what.name}** - $${this.formatMoney(items.what.price)}\n` +
      `  ${items.what.desc}\n` +
      `• ${items.nothing.emoji} **${items.nothing.name}** - $${this.formatMoney(items.nothing.price)}\n` +
      `  ${items.nothing.desc}\n\n` +
      '**💰 ROB THE MART:**\n' +
      '• Pick 1 of 12 spaces (1-9, Money Bag, Money Bank, Skull)\n' +
      '• Bot picks from remaining 11 spaces\n' +
      '• **Higher score = ROB SUCCESS** → Get rewards!\n' +
      '• **Lower score = BUSTED** → Sent to basement!\n' +
      '• **Skull = Instant Loss**\n' +
      '• Money Bank (🏦) > Money Bag (💰) > 9 > ... > 1\n\n' +
      'Choose BUY or ROB!'
      );
  }

  static createMartOfCashButtons() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mart_rob')
          .setLabel('🦹 ROB THE MART')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('mart_buy')
          .setLabel('🛒 BUY ITEMS')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mart_leave')
          .setLabel('🚪 Leave')
          .setStyle(ButtonStyle.Secondary)
      )
    ];
  }

  static createRobberySpaceButtons() {
    const rows = [];
    let currentRow = [];

    for (let i = 0; i < 12; i++) {
      currentRow.push(
        new ButtonBuilder()
          .setCustomId(`mart_rob_space_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      );

      if (currentRow.length === 4) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
        currentRow = [];
      }
    }

    return rows;
  }

  static createRobberyResultEmbed(game, result) {
    const { playerSpace, botSpace, playerWon, busted, rewards, allSpaces } = result;

    let color = '#FF0000';
    let title = '';
    let description = '';

    if (busted) {
      color = '#000000';
      title = '💀 BUSTED! 💀';
      description = `You picked ${playerSpace.emoji} **${playerSpace.label}**!\n\n` +
        `**YOU ARE BUSTED!**\n` +
        `Sent to the basement immediately!\n\n` +
        `This has the same consequence as Game Over.`;
    } else if (playerWon) {
      color = '#00FF00';
      title = '✅ ROB SUCCESS! ✅';
      description = `**Your Pick:** ${playerSpace.emoji} **${playerSpace.label}** (${playerSpace.value})\n` +
        `**Bot Pick:** ${botSpace.emoji} **${botSpace.label}** (${botSpace.value})\n\n` +
        `**YOU WON!** Your score is higher!\n\n` +
        `**🎁 Robbery Rewards:**\n`;
      
      rewards.forEach(reward => {
        description += `• ${reward.emoji} **${reward.name}**\n`;
      });
    } else {
      color = '#FF0000';
      title = '❌ ROBBERY FAILED! ❌';
      description = `**Your Pick:** ${playerSpace.emoji} **${playerSpace.label}** (${playerSpace.value})\n` +
        `**Bot Pick:** ${botSpace.emoji} **${botSpace.label}** (${botSpace.value})\n\n` +
        `**YOU LOST!** Bot's score is higher!\n\n` +
        `**YOU ARE BUSTED!**\n` +
        `Sent to the basement immediately!`;
    }

    // Show all spaces in a 4x3 grid
    description += '\n\n**All Spaces:**\n';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const space = allSpaces[idx];
        description += `${space.emoji}`;
      }
      description += '\n';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  static createPurchaseMenuEmbed(game) {
    const MartOfCash = require('./events/MartOfCash');
    const items = MartOfCash.getPurchaseItems();
    const purchasedCounts = game.martOfCashState?.purchasedItemCounts || {};

    const formatItem = (key) => {
      const item = items[key];
      const count = purchasedCounts[key] || 0;
      const limitText = item.buyLimit ? ` [${count}/${item.buyLimit}]` : '';
      const priceText = key === 'randomPercentage' ? '50% of money' : `$${this.formatMoney(item.price)}`;
      return `${item.emoji} **${item.name}**${limitText} - ${priceText}`;
    };

    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🛒 Mart-Of-Ca$h - Purchase Menu')
      .setDescription(
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `**Available Items:**\n\n` +
        `${formatItem('peek')}\n` +
        `${formatItem('minigame')}\n` +
        `${formatItem('sixZeroes')}\n\n` +
        `${formatItem('mysteryBox')}\n` +
        `${formatItem('xProtection')}\n` +
        `${formatItem('randomPercentage')}\n` +
        `${formatItem('what')}\n` +
        `${formatItem('nothing')}\n` +
        '**Purchased items will be used in order after leaving.**'
      );
  }

  static createPurchaseButtons(game) {
    const MartOfCash = require('./events/MartOfCash');
    const items = MartOfCash.getPurchaseItems();
    const purchasedCounts = game.martOfCashState?.purchasedItemCounts || {};
    const rows = [];
    
    const isLimitReached = (key) => {
      if (!items[key].buyLimit) return false;
      const count = purchasedCounts[key] || 0;
      return count >= items[key].buyLimit;
    };
    
    const getLabel = (key, emoji, name) => {
      const count = purchasedCounts[key] || 0;
      if (items[key].buyLimit && count > 0) {
        return `${emoji} ${name} [${count}/${items[key].buyLimit}]`;
      }
      return `${emoji} ${name}`;
    };
    
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mart_buy_peek')
          .setLabel(getLabel('peek', '👁️', 'Peek'))
          .setStyle(isLimitReached('peek') ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(isLimitReached('peek')),
        new ButtonBuilder()
          .setCustomId('mart_buy_minigame')
          .setLabel(getLabel('minigame', '🎮', 'Minigame'))
          .setStyle(isLimitReached('minigame') ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(isLimitReached('minigame'))
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mart_buy_mysterybox')
          .setLabel(getLabel('mysteryBox', '📦', 'Mystery Box'))
          .setStyle(isLimitReached('mysteryBox') ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(isLimitReached('mysteryBox')),
        new ButtonBuilder()
          .setCustomId('mart_buy_xprotection')
          .setLabel(getLabel('xProtection', '🛡️', 'X-Protection'))
          .setStyle(isLimitReached('xProtection') ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(isLimitReached('xProtection')),
        new ButtonBuilder()
          .setCustomId('mart_buy_sixzeroes')
          .setLabel(getLabel('sixZeroes', '🎫', 'Six Zeroes'))
          .setStyle(isLimitReached('sixZeroes') ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(isLimitReached('sixZeroes'))
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mart_buy_randompercent')
          .setLabel('🎲 Random %')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mart_buy_what')
          .setLabel(getLabel('what', '❓', 'What?'))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mart_buy_nothing')
          .setLabel('⚪ Nothing')
          .setStyle(ButtonStyle.Secondary)
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mart_done_shopping')
          .setLabel('✅ Done Shopping (Leave)')
          .setStyle(ButtonStyle.Success)
      )
    );

    return rows;
  }

  // === DOOR ESCAPE UI EMBEDS ===

  static createDoorEscapeIntroEmbed(game) {
    return new EmbedBuilder()
      .setColor('#32CD32')
      .setTitle('🚪 DOOR ESCAPE 🚪')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Find the escape door!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• **3 doors** to choose from each round\n' +
        '• Start with **100% Health**\n' +
        '• **Escape Door:** Money x2 & Next Round\n' +
        '• **Blocked Door:** Nothing happens (pick again)\n' +
        '• **Trapped Door:** Lose 10-50% Health\n\n' +
        '**🚪 How to Play:**\n' +
        '1. Pick a door to progress\n' +
        '2. Survive rounds to multiply money\n' +
        '3. Click **ESCAPE** anytime to cash out\n' +
        '4. If Health hits 0% = GAME OVER\n\n' +
        '**🏃 Final Escape Phase:**\n' +
        'When you click ESCAPE, you face 4 final doors:\n' +
        '• 💎 **Treasure Escape:** Money x2 (Win big!)\n' +
        '• 🏃 **Escape:** Keep all money (Safe)\n' +
        '• 🚑 **Rescue:** Keep 50% money (Penalty)\n' +
        '• 💀 **Fatal Trap:** Lose everything\n\n' +
        '**💰 Rewards:**\n' +
        '• **Base Reward:** $25,000\n' +
        '• **Multiplier:** x2 per successful round\n' +
        '• **Example:** Round 3 Escape + Treasure = $200k!\n\n' +
        '**Press START to begin your escape!**'
      )
      .setFooter({ text: 'Health: 100% • Base: $25k • Good Luck!' });
  }

  static createDoorEscapeButtons(showStart = false) {
    if (showStart) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('door_escape_start')
            .setLabel('START ESCAPE')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('door_escape_1')
          .setLabel('Door 1')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('door_escape_2')
          .setLabel('Door 2')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('door_escape_3')
          .setLabel('Door 3')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('door_escape_cashout')
          .setLabel('RUN AWAY (ESCAPE)')
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  static createDoorEscapeRoundEmbed(game, result = null) {
    const state = game.doorEscapeState;
    let description = `**Round ${state.currentRound}**\n` +
      `**Health:** ${state.health}%\n` +
      `**Current Loot:** $${this.formatMoney(state.currentMoney)}\n\n`;

    if (result) {
      if (result.status === 'escape') {
        description += `✅ **ESCAPE FOUND!**\nMoney x2! Moving to Round ${state.currentRound}...\n\n`;
      } else if (result.status === 'blocked') {
        description += `🚫 **BLOCKED!**\nThe door is jammed. Choose another one!\n\n`;
      } else if (result.status === 'trapped') {
        description += `⚠️ **TRAP TRIGGERED!**\n${result.scenario}\n**-${result.damage}% Health!**\n\n`;
      }
    }

    description += '**Choose a door to proceed or ESCAPE to cash out!**';

    // Health bar visual
    const healthBarLength = 10;
    const filledBars = Math.ceil((state.health / 100) * healthBarLength);
    const healthBar = '🟩'.repeat(filledBars) + '⬛'.repeat(healthBarLength - filledBars);

    return new EmbedBuilder()
      .setColor(state.health > 50 ? '#32CD32' : state.health > 20 ? '#FFA500' : '#FF0000')
      .setTitle(`🚪 DOOR ESCAPE - Round ${state.currentRound}`)
      .setDescription(description + `\n\n**Health:** ${healthBar} ${state.health}%`)
      .setFooter({ text: 'Find the exit • Avoid traps • Escape with loot!' });
  }

  static createDoorEscapeFinalEmbed(game) {
    const state = game.doorEscapeState;
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏃 FINAL ESCAPE PHASE 🏃')
      .setDescription(
        `**You chose to run away!**\n\n` +
        `**Current Loot:** $${this.formatMoney(state.currentMoney)}\n\n` +
        '**Choose one final door to secure your escape:**\n' +
        '• 💎 **Treasure Escape:** Money x2\n' +
        '• 🏃 **Escape:** Keep all money\n' +
        '• 🚑 **Rescue:** Keep 50% money\n' +
        '• 💀 **Fatal Trap:** Lose everything\n\n' +
        '**Choose wisely... your fate depends on it!**'
      )
      .setFooter({ text: 'One last choice...' });
  }

  static createDoorEscapeFinalButtons() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('door_escape_final_1')
          .setLabel('Final Door 1')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('door_escape_final_2')
          .setLabel('Final Door 2')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('door_escape_final_3')
          .setLabel('Final Door 3')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('door_escape_final_4')
          .setLabel('Final Door 4')
          .setStyle(ButtonStyle.Secondary)
      )
    ];
  }

  static createDoorEscapeResultEmbed(game, result) {
    const color = result.status === 'dead' || (result.status === 'finished' && result.finalAmount === 0) ? '#FF0000' : '#32CD32';
    let title = result.status === 'dead' ? '💀 GAME OVER 💀' : '🎉 ESCAPE COMPLETE 🎉';
    let description = '';

    if (result.status === 'dead') {
      description = `**You died in the dungeon!**\n\n` +
        `**Cause of Death:** ${result.scenario}\n` +
        `**Health:** 0%\n` +
        `**Loot Lost:** $${this.formatMoney(result.money)}\n\n` +
        `Better luck next time!`;
    } else {
      // Finished via cashout
      description = `**${result.message}**\n\n` +
        `**Final Reward:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `**The Doors Were:**\n` +
        `Door 1: ${this.getDoorEmoji(result.doors[0])} ${result.doors[0].toUpperCase()}\n` +
        `Door 2: ${this.getDoorEmoji(result.doors[1])} ${result.doors[1].toUpperCase()}\n` +
        `Door 3: ${this.getDoorEmoji(result.doors[2])} ${result.doors[2].toUpperCase()}\n` +
        `Door 4: ${this.getDoorEmoji(result.doors[3])} ${result.doors[3].toUpperCase()}`;
    }

    // Dynamic footer based on result
    let footerText = 'Door Escape Complete';
    if (result.status === 'finished' && result.resultType === 'fatal') {
      footerText = 'OH NO!';
    } else if (result.status === 'dead') {
      footerText = 'OH NO!';
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: footerText });
  }

  static createCounterOfferModal() {
    return new ModalBuilder()
      .setCustomId('dond_counter_modal')
      .setTitle('💰 Counter Offer')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('counter_amount')
            .setLabel('Your Counter Offer Amount')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount (e.g., 75000)')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
        )
      );
  }

  static createCounterOfferResponseEmbed(result) {
    const color = result.accepted ? '#32CD32' : '#FF6B6B';
    const title = result.accepted ? '✅ Counter Offer ACCEPTED!' : '❌ Counter Offer REJECTED';

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `**Your Counter:** $${this.formatMoney(result.counterAmount)}\n` +
        `**Expected Value:** $${this.formatMoney(result.expectedValue)}\n\n` +
        `${result.reason}\n\n` +
        (result.accepted
          ? '🎉 **DEAL ACCEPTED!** Game over - you take the counter offer!'
          : '🎲 **Game continues!** Let\'s see what happens next...')
      );
  }

  static createBankerCounterNotificationEmbed(playerName, counterAmount, expectedValue, currentOffer) {
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💼 Counter Offer Received!')
      .setDescription(
        `**${playerName}** wants to counter!\n\n` +
        `**Your Original Offer:** $${this.formatMoney(currentOffer)}\n` +
        `**Their Counter:** $${this.formatMoney(counterAmount)}\n` +
        `**Expected Value:** $${this.formatMoney(expectedValue)}\n\n` +
        `Accept or reject their counter offer?`
      );
  }

  static createBankerCounterButtons(gameChannelId) {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`dond_banker_accept_${gameChannelId}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`dond_banker_reject_${gameChannelId}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger)
    )];
  }

  static getDoorEmoji(type) {
    switch (type) {
      case 'treasure': return '💎';
      case 'escape': return '🏃';
      case 'rescue': return '🚑';
      case 'fatal': return '💀';
      default: return '🚪';
    }
  }

  // === COMMUNITY CHEST MINIGAME UI ===

  static createCommunityChestIntroEmbed(game) {
    // Create visual chest grid
    const chestGrid = '🎁 🎁 🎁 🎁 🎁\n🎁 🎁 🎁 🎁 🎁';

    // Initial values with visual formatting
    const values = ['$10k', '$20k', '$30k', '$40k', '$50k', '$60k', '$70k', '$80k', '$90k', '$100k'];
    const valueGrid = `${values.slice(0, 5).join('  ')}  \n${values.slice(5).join('  ')}`;

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁✨ COMMUNITY CHEST ✨🎁')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏆 THE ULTIMATE TREASURE HUNT**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**📦 YOUR CHESTS:**\n${chestGrid}\n\n` +

        `**💎 HIDDEN VALUES:**\n${valueGrid}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🎯 THE RULES:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 Pick a chest → Reveal its value\n` +
        `🔹 **Turn 1:** Remaining chests **×2**\n` +
        `🔹 **Turn 2+:** Remaining chests **×3**\n` +
        `🔹 **Trade up** or **Risk it all!**\n\n` +

        `⚡ **THE JUMP:** ≥$500k → 🎰 **$3,000,000 JACKPOT!** 🎰\n` +
        `⚠️ **DANGER:** Pick ≤ Previous = 💥 **LOSE EVERYTHING!** 💥\n\n` +

        `**Ready to strike it rich?** 🤑`
      )
      .setFooter({ text: 'Season 1 • 10 Chests • Multiplying Fortunes • $3M Jackpot Awaits' });
  }

  static createCommunityChestPickEmbed(game, result) {
    const state = game.communityChestState;
    const pickedCount = state.pickedChests.filter(p => p).length;
    const nextMult = result.nextMultiplier;

    // Create visual chest grid showing picked/unpicked states
    const chestIcons = state.pickedChests.map((picked, i) =>
      picked ? (i === result.chestIndex ? '✨' : '📦') : '🎁'
    );
    const gridRow1 = chestIcons.slice(0, 5).join(' ');
    const gridRow2 = chestIcons.slice(5, 10).join(' ');

    // Calculate remaining values
    const remaining = state.chestValues.filter((_, i) => !state.pickedChests[i]).sort((a, b) => a - b);
    const remainingDisplay = remaining.length > 0
      ? remaining.map(v => `$${this.formatMoney(v)}`).join('  ')
      : 'None remaining';

    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`✨ CHEST REVEALED - Pick ${pickedCount}/10 ✨`)
      .setDescription(
        `**📦 CHEST GRID:**\n${gridRow1}\n${gridRow2}\n` +
        `✨ = Just opened | 📦 = Opened | 🎁 = Unopened\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 **YOUR CURRENT VALUE:** 💰\n` +
        `**$${this.formatMoney(result.value)}**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🔮 MULTIPLIER STATUS:**\n` +
        `Next picks multiply by **×${nextMult}**\n` +
        `${remaining.length} chests remaining\n\n` +

        `**💎 REMAINING VALUES:**\n${remainingDisplay}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ YOUR MOVE:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎰 **RISK IT!** - Pick another (×${nextMult} multiplier!)\n` +
        `🛑 **CASH OUT** - Keep $${this.formatMoney(result.value)} and escape!\n\n` +

        `${result.value >= 500000 ? '🎰 **YOU\'RE AT THE JUMP! $3M AWAITS!** 🎰\n' : ''}` +
        `⚠️ **Remember:** Pick ≤ $${this.formatMoney(result.value)} = 💥 **GAME OVER!**`
      )
      .setFooter({ text: `Season 1 • Fortune favors the brave... or the wise?` });
  }

  static createCommunityChestButtons(game, hasValue) {
    const state = game.communityChestState;

    if (!hasValue) {
      // Show chest selection buttons
      const rows = [];
      for (let i = 0; i < 2; i++) {
        const buttons = [];
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`community_chest_pick_${index}`)
              .setLabel(`🎁 ${index + 1}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(state.pickedChests[index])
          );
        }
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
      return rows;
    }

    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('community_chest_risk')
          .setLabel('🎰 Risk it! (Pick Another)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('community_chest_stop')
          .setLabel('🛑 Cash Out')
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  static createCommunityChestResultEmbed(game, result) {
    let color, title, description;

    if (result.lost) {
      color = '#FF0000';
      title = '💀 COMMUNITY CHEST - LOST!';
      description =
        `**Previous Value:** $${this.formatMoney(result.previousValue)}\n` +
        `**New Pick:** $${this.formatMoney(result.newValue)}\n\n` +
        `❌ **New value is LOWER!**\n` +
        `**Lost:** Everything\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
    } else if (result.stopped) {
      color = '#FFD700';
      title = '🛑 COMMUNITY CHEST - CASHED OUT!';
      description =
        `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(result.totalMoney)}\n\n` +
        `✅ Wise choice!`;
    } else if (result.won) {
      color = '#FFD700';
      title = '🏆 COMMUNITY CHEST - JACKPOT!';
      description =
        `**You found the $3,000,000 Chest!**\n\n` +
        `**Jackpot:** $3,000,000\n` +
        `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(result.totalMoney)}`;
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  // === PARK IT MINIGAME UI ===

  static createParkItIntroEmbed(game) {
    const garageDisplay = '⚪⚪\n⚪⚪\n⚪⚪\n⚪⚪\n⚪⚪';
    const carRow = '🚗 🚙 🚕 🚘 🚓 🚗 🚙 🚕 🚘 🚓';

    return new EmbedBuilder()
      .setColor('#2196F3')
      .setTitle('🚗✨ PARK IT ✨🚗')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏛️ PARKING GARAGE PUZZLE**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🏛️ YOUR GARAGE:**\n` +
        `Level 5: ${garageDisplay.split('\n')[0]} (Top)\n` +
        `Level 4: ${garageDisplay.split('\n')[1]}\n` +
        `Level 3: ${garageDisplay.split('\n')[2]}\n` +
        `Level 2: ${garageDisplay.split('\n')[3]}\n` +
        `Level 1: ${garageDisplay.split('\n')[4]} (Bottom)\n\n` +

        `**🚗 YOUR CARS:**\n${carRow}\n` +
        `10 cars valued $10k - $100k\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE RULES:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 Pick a car → Choose level to park\n` +
        `🔹 **CRITICAL:** Lower values CANNOT park above higher values\n` +
        `🔹 Break the rule = 💥 **Game Over!**\n` +
        `🔹 Min 3 cars parked to cash out\n\n` +

        `🎯 **GOAL:** Fill all 5 levels\n` +
        `🎰 **JACKPOT:** Full garage = **$3,000,000!**\n` +
        `💰 **Max Payout:** $550,000 total\n\n` +

        `**Park wisely!** 🏛️`
      )
      .setFooter({ text: 'Season 1 • 10 Cars • 5 Levels • Strategic Parking' });
  }


  static createParkItCarRevealEmbed(game, result) {
    const state = game.parkItState;
    const garageDisplay = this.formatParkItGarage(state.garage);

    return new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🚗 PARK IT - Choose Parking Level')
      .setDescription(
        `**Car Revealed:** $${this.formatMoney(result.carValue)}\n` +
        `**Banked:** $${this.formatMoney(result.bankedMoney)}\n\n` +
        `**Garage:**\n${garageDisplay}\n\n` +
        '**Choose a level to park this car:**\n' +
        'Remember: Cannot park lower value ABOVE higher value!'
      );
  }

  static createParkItGarageEmbed(game) {
    const state = game.parkItState;
    const garageDisplay = this.formatParkItGarage(state.garage);

    return new EmbedBuilder()
      .setColor('#FF9800')
      .setTitle('🚗 PARK IT - Garage Status')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `**Garage:**\n${garageDisplay}\n\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Pick the next car!**'
      );
  }

  static formatParkItGarage(garage) {
    let display = '';
    for (let i = 4; i >= 0; i--) {
      const level = i + 1;
      const car = garage[i];
      const carDisplay = car ? `$${this.formatMoney(car)}` : '[EMPTY]';
      display += `**Level ${level}:** ${carDisplay}\n`;
    }
    return display;
  }

  static createParkItButtons(game) {
    const state = game.parkItState;
    const buttons = [];

    // If no current car, show car selection
    if (state.currentCarValue === 0) {
      const rows = [];
      for (let i = 0; i < 2; i++) {
        const btns = [];
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          if (index < 10) {
            btns.push(
              new ButtonBuilder()
                .setCustomId(`park_it_car_${index}`)
                .setLabel(`🚗 ${index + 1}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(state.pickedCars[index])
            );
          }
        }
        rows.push(new ActionRowBuilder().addComponents(btns));
      }

      // Add stop button if eligible
      const parkedCount = state.garage.filter(s => s !== null).length;
      if (parkedCount >= 3) {
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('park_it_stop')
            .setLabel('🛑 Cash Out')
            .setStyle(ButtonStyle.Danger)
        ));
      }

      return rows;
    }

    // Show garage level buttons
    const levelButtons = [];
    const carValue = state.currentCarValue;

    for (let i = 0; i < 5; i++) {
      let disabled = state.garage[i] !== null;

      // Check legality if not already occupied
      if (!disabled) {
        // Check levels below (k < i): Cannot have higher value below
        for (let k = 0; k < i; k++) {
          if (state.garage[k] !== null && state.garage[k] > carValue) {
            disabled = true;
            break;
          }
        }
        // Check levels above (k > i): Cannot have lower value above
        if (!disabled) {
          for (let k = i + 1; k < 5; k++) {
            if (state.garage[k] !== null && state.garage[k] < carValue) {
              disabled = true;
              break;
            }
          }
        }
      }

      levelButtons.push(
        new ButtonBuilder()
          .setCustomId(`park_it_level_${i}`)
          .setLabel(`🅿️ ${i + 1}`)
          .setStyle(state.garage[i] ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(disabled)
      );
    }

    const rows = [new ActionRowBuilder().addComponents(levelButtons)];
    return rows;
  }

  static createPowerGridResultEmbed(game, result) {
    let color, title, description;

    if (result.won) {
      color = '#FFD700';
      title = '🎰 POWER GRID - JACKPOT!';
      description =
        `**🎯 PERFECT! 24 Bulbs Lit!**\n\n` +
        `**🎰 JACKPOT:** $3,000,000\n` +
        `**Banked Money:** $${this.formatMoney(result.finalAmount - result.jackpot)}\n` +
        `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
    } else if (result.blackout) {
      color = '#FF0000';
      title = '💥 POWER GRID - BLACKOUT!';
      description =
        `**You caused a blackout!**\n\n` +
        `**Lost:** Everything\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  static createParkItResultEmbed(game, result) {
    let color, title, description;

    if (result.illegal) {
      color = '#FF0000';
      title = '💥 PARK IT - ILLEGAL PARKING!';
      description =
        `**Tried to park:** $${this.formatMoney(result.carValue)} on Level ${result.level + 1}\n` +
        `**But Level ${result.conflictLevel + 1} has:** $${this.formatMoney(result.conflictValue)}\n\n` +
        `❌ **Can't park lower value ABOVE higher value!**\n` +
        `**Lost:** Everything\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
    } else if (result.noMoves) {
      color = '#FF0000';
      title = '💥 GAME OVER!';
      description = `**No Valid Parking Spots!**\n\n` +
        `The car you picked ($${this.formatMoney(result.carValue)}) cannot fit anywhere in the garage!\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
    } else if (result.won) {
      color = '#FFD700';
      title = '🏆 PARK IT - GARAGE FULL!';
      description = `**All 5 cars parked successfully!**\n\n` +
        `**Banked Money:** $${this.formatMoney(result.finalAmount - (result.jackpot || 0))}\n` +
        `**🎰 JACKPOT:** $${this.formatMoney(result.jackpot || 0)}\n` +
        `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(result.totalMoney)}`;
    } else if (result.stopped) {
      color = '#4CAF50';
      title = '🛑 PARK IT - CASHED OUT!';
      description =
        `**Final Garage:**\n${this.formatParkItGarage(result.garage)}\n\n` +
        `**Total Winnings:** $${this.formatMoney(result.finalAmount)}\n` +
        `**Total Money:** $${this.formatMoney(result.totalMoney)}`;
    } else {
      // Fallback for unexpected result types
      color = '#FF6B6B';
      title = '⚠️ Unexpected Result';
      description =
        `An unexpected error occurred in the Park It minigame.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `Please report this to an administrator.`;
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);
  }

  // === ADVANCE TO BOARDWALK MINIGAME UI ===

  static createAdvanceBoardwalkIntroEmbed(game) {
    const boardPath = '⬜➡️⬜➡️⬜➡️⬜➡️⬜➡️⬜➡️⬜\n⬇️                          ⬇️\n⬜⬅️⬜⬅️⬜⬅️⬜⬅️⬜⬅️⬜⬅️🏖️';
    const diceEmoji = '🎲'.repeat(6);

    return new EmbedBuilder()
      .setColor('#00CED1')
      .setTitle('🎲🏖️ ADVANCE TO BOARDWALK 🏖️🎲')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💵 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🎲 ROLL TO VICTORY**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🗺️ THE BOARD:**\n${boardPath}\n` +
        `Start ➡️ Space 13 (Boardwalk 🏖️)\n\n` +

        `**🎲 YOUR DICE:**\n${diceEmoji}\n` +
        `Roll 1-6 to advance\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE RULES:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 14 spaces with values ($10k-$130k)\n` +
        `🔹 Bank money for each space landed\n` +
        `🔹 **Each number can only be rolled ONCE**\n` +
        `🔹 Roll same number twice = 💥 **Game Over!**\n` +
        `🔹 One "Roll Again" token to save you\n\n` +

        `🎯 **WIN:** Land **EXACTLY** on Boardwalk!\n` +
        `🎰 **JACKPOT:** Land exact = **$3,000,000!**\n` +
        `⚠️ **Overshoot** = Keep banked money (no jackpot)\n\n` +

        `**Ready to roll?** 🎲`
      )
      .setFooter({ text: 'Season 1 • Roll Wisely • Avoid Danger • Reach Boardwalk!' });
  }

  static createAdvanceBoardwalkEmbed(game) {
    const state = game.advanceBoardwalkState;

    // Create visual board
    const topRow = [];
    const bottomRow = [];

    // Top row (spaces 0-6) - left to right
    for (let i = 0; i <= 6; i++) {
      if (i === state.position) {
        topRow.push('🎯'); // Current position
      } else if (i === 0) {
        topRow.push('▶️'); // Start
      } else {
        topRow.push('⬜');
      }
      if (i < 6) topRow.push('➡️');
    }

    // Bottom row (spaces 7-13) - right to left
    for (let i = 12; i >= 7; i--) {
      if (i === state.position) {
        bottomRow.push('🎯'); // Current position
      } else if (i === 13) {
        bottomRow.push('🏖️'); // Boardwalk
      } else {
        bottomRow.push('⬜');
      }
      if (i > 7) bottomRow.push('⬅️');
    }
    bottomRow.reverse(); // Reverse to display left-to-right

    const boardDisplay =
      '🗺️ **THE BOARD:**\n' +
      topRow.join('') + '\n' +
      '        ⬇️ ⬇️\n' +
      bottomRow.join('') + '\n\n' +
      `**Current Position:** Space ${state.position}/13\n`;

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🎲 Advance to Boardwalk`)
      .setDescription(
        boardDisplay +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n` +
        `**Danger Numbers:** ${state.dangerNumbers.join(', ') || 'None yet'}\n\n` +
        `Roll the dice to move forward. Reach space 13 (Boardwalk 🏖️) to win ${this.formatMoney(200000)}!\n` +
        `⚠️ Don't roll a danger number twice or overshoot!`
      );
  }

  static createAdvanceBoardwalkGameEmbed(game) {
    const state = game.advanceBoardwalkState;
    const danger = state.dangerNumbers.length > 0 ? state.dangerNumbers.join(', ') : 'None';
    const spacesLeft = 13 - state.position;

    return new EmbedBuilder()
      .setColor('#40E0D0')
      .setTitle(`🎲 Advance to Boardwalk - Space ${state.position}/13`)
      .setDescription(
        `**Position:** Space ${state.position}\n` +
        `**Spaces to Boardwalk:** ${spacesLeft}\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n` +
        `**Danger Numbers:** ${danger}\n` +
        `**Roll Again Token:** ${state.hasRollAgain ? '✅ Available' : '❌ Used'}\n\n` +
        '**Press ROLL to generate a random number (1-6)!**\n' +
        '⚠️ Rolling a Danger Number = Game Over (unless you have a token)!'
      );
  }

  static createAdvanceBoardwalkButtons(game) {
    const state = game.advanceBoardwalkState;
    const rows = [];

    // Single ROLL button
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('boardwalk_roll')
        .setLabel('🎲 ROLL')
        .setStyle(ButtonStyle.Primary)
    ));

    // Add stop button if player can stop
    if (state.bankedMoney > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('boardwalk_stop')
          .setLabel('🛑 Cash Out')
          .setStyle(ButtonStyle.Danger)
      ));
    }

    return rows;
  }

  static createAdvanceBoardwalkResultEmbed(game, result) {
    if (result.won) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 BOARDWALK REACHED!')
        .setDescription(
          `**You made it!**\n\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - (result.jackpot || 0))}\n` +
          `**🎰 JACKPOT:** $${this.formatMoney(result.jackpot || 0)}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.stopped) {
      return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🛑 Cashed Out')
        .setDescription(
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.gameOver) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 GAME OVER!')
        .setDescription(
          `**You rolled a Danger Number (${result.roll})!**\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.overshot) {
      return new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📏 OVERSHOT!')
        .setDescription(
          `**You rolled a ${result.roll} and went past Boardwalk!**\n\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Fallback for unexpected result types
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚠️ Unexpected Result')
      .setDescription(
        `An unexpected error occurred in the Advance Boardwalk minigame.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `Please report this to an administrator.`
      );
  }

  // === BANK BUSTER MINIGAME UI ===

  static createBankBusterIntroEmbed(game) {
    const lockIcons = '🔒 🔒 🔒 🔒 🔒 🔒';
    const keyGrid = '🔑🔑🔑🔑\n🔑🔑🔑🔑\n🔑🔑🔑🔑';

    return new EmbedBuilder()
      .setColor('#2E7D32')
      .setTitle('🔐💰 BANK BUSTER 💰🔐')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💵 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏦 THE HEIST OF A LIFETIME**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🔒 THE VAULT:**\n${lockIcons}\n` +
        `💰 Values: $60k - $200k per lock\n\n` +

        `**🔑 YOUR KEYS:**\n${keyGrid}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE CHALLENGE:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 Each lock has **2 keys** (12 total)\n` +
        `🔹 **1st key** = 🔓 Opens + Banks value\n` +
        `🔹 **2nd key** = ❌ Closes + Loses value\n\n` +

        `🎯 **WIN:** Open **5 locks** → Crack the vault!\n` +
        `💥 **BUST:** Close **2 locks** → Game Over!\n` +
        `🎰 **JACKPOT:** Bank **>$500k** → **$3,000,000!**\n\n` +

        `**Think you can crack it?** 🕵️`
      )
      .setFooter({ text: 'Season 1 • 12 Keys • 6 Locks • Fortune Awaits' });
  }

  static createBankBusterGameEmbed(game, result) {
    const state = game.bankBusterState;

    const locksStatus = state.locks.map((lock, i) => {
      const statusIcon = lock.opened === 0 ? '🔒' : lock.opened === 1 ? '🔓' : '❌';
      const statusText = lock.opened === 0 ? 'LOCKED' : lock.opened === 1 ? 'OPEN' : 'BUSTED';
      const value = `$${this.formatMoney(lock.value)}`;
      return `\`[${statusIcon} ${statusText.padEnd(6)}]\` **${value}**`;
    }).join('\n');

    // Visual Progress Bars
    const openBar = '🟩'.repeat(state.openedCount) + '⬜'.repeat(5 - state.openedCount);
    const bustBar = '🟥'.repeat(state.closedCount) + '⬜'.repeat(2 - state.closedCount);

    return new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`🔐 BANK BUSTER - Pick ${state.turn}/12`)
      .setDescription(
        `**🏦 VAULT STATUS**\n` +
        `${locksStatus}\n\n` +
        `**🔓 Progress:** ${openBar} (${state.openedCount}/5)\n` +
        `**💥 Strikes:** ${bustBar} (${state.closedCount}/2)\n` +
        `**💰 Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Pick a key to unlock the vault!**'
      );
  }

  static createBankBusterButtons(game) {
    const state = game.bankBusterState;
    const rows = [];

    // Create key buttons (12 keys in 3 rows)
    for (let i = 0; i < 3; i++) {
      const buttons = [];
      for (let j = 0; j < 4; j++) {
        const index = i * 4 + j;
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`bank_buster_key_${index}`)
            .setLabel(`🔑 ${index + 1}`)
            .setStyle(state.pickedKeys[index] ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(state.pickedKeys[index])
        );
      }
      // Only add row if it has buttons
      if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
    }

    // Add Cash Out button if player has banked money
    if (state.bankedMoney > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('bank_buster_stop')
          .setLabel('🛑 Cash Out')
          .setStyle(ButtonStyle.Danger)
      ));
    }

    return rows;
  }

  static createBankBusterResultEmbed(game, result) {
    if (result.bust && result.gameOver) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 BANK BUSTER - LOCKED OUT!')
        .setDescription(
          `**You closed 2 locks!**\n` +
          `**Lock Value:** $${this.formatMoney(result.lockValue)}\n\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.won) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(result.jackpot ? '🏆 BANK BUSTER - JACKPOT!' : '🏆 BANK BUSTER - UNLOCKED!')
        .setDescription(
          `**Vault Unlocked!**\n\n` +
          (result.jackpot ? `**🎰 JACKPOT:** $3,000,000\n` : '') +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - (result.jackpot || 0))}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.stopped) {
      return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🛑 BANK BUSTER - Cashed Out')
        .setDescription(
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Fallback for unexpected result types
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚠️ Unexpected Result')
      .setDescription(
        `An unexpected error occurred in the Bank Buster minigame.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `Please report this to an administrator.`
      );
  }

  // === BLOCK PARTY MINIGAME UI ===

  static createBlockPartyIntroEmbed(game) {
    const propertyColors = '🟫🟦 🩷🟧 🟥🟨 🟩🔵';
    const cardGrid = '🃏 🃏 🃏 🃏\n🃏 🃏 🃏 🃏\n🃏 🃏 🃏 🃏';

    return new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🏘️✨ BLOCK PARTY ✨🏘️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏘️ PROPERTY COLLECTION CHALLENGE**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🎴 YOUR CARDS:**\n${cardGrid}\n` +
        `12 cards to reveal\n\n` +

        `**🏠 THE PROPERTIES:**\n${propertyColors}\n` +
        `🟫 Brown ($10k) • 🟦 Light Blue ($20k)\n` +
        `🩷 Pink ($30k) • 🟧 Orange ($40k)\n` +
        `🟥 Red ($50k) • 🟨 Yellow ($60k)\n` +
        `🟩 Green ($100k) • 🔵 Dark Blue ($200k)\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE GAME:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 **Properties** → Add to collection\n` +
        `🔹 **Strikes** → 1=⚠️ 2=½ 3=💥\n` +
        `🔹 **🎉 Block Party Card** → FREE PICK!\n\n` +

        `🎯 **WIN:** Collect **all 8 properties**\n` +
        `🎰 **JACKPOT:** Complete set = **$3,000,000!**\n` +
        `💥 **BUST:** 3 Strikes = Game Over\n\n` +

        `**Ready to collect?** 🏠`
      )
      .setFooter({ text: 'Season 1 • 12 Cards • 8 Properties • 1 Bonus • 3 Strikes' });
  }

  static createBlockPartyGameEmbed(game) {
    const state = game.blockPartyState;
    const properties = state.properties;

    // Helper to format property line
    const formatProp = (i) => {
      const p = properties[i];
      const status = state.collectedProperties[i] ? '✅' : '❌';
      return `${status} ${p.color} ${p.name} ($${this.formatMoney(p.value)})`;
    };

    const propertyDisplay =
      `${formatProp(0)}\n${formatProp(1)}\n` +
      `------------------------\n` +
      `${formatProp(2)}\n${formatProp(3)}\n` +
      `------------------------\n` +
      `${formatProp(4)}\n${formatProp(5)}\n` +
      `------------------------\n` +
      `${formatProp(6)}\n${formatProp(7)}`;

    let statusMsg = '**Pick a card!**';
    if (state.choosingGroup) {
      statusMsg = '🎉 **BLOCK PARTY! Pick any property to collect!** 🎉';
    }

    return new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle(`🏘️ Block Party - Strikes: ${state.strikes}/3`)
      .setDescription(
        `**Properties:**\n${propertyDisplay}\n\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        statusMsg
      );
  }

  static createBlockPartyButtons(game) {
    const state = game.blockPartyState;
    const rows = [];

    if (state.choosingGroup) {
      // Show property selection buttons
      const properties = state.properties;
      for (let i = 0; i < 2; i++) {
        const buttons = [];
        for (let j = 0; j < 4; j++) {
          const index = i * 4 + j;
          const prop = properties[index];
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`block_party_group_${index}`)
              .setLabel(`${prop.color} ${prop.name}`)
              .setStyle(ButtonStyle.Success)
              .setDisabled(state.collectedProperties[index])
          );
        }
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
    } else {
      // Show 12 card buttons
      for (let i = 0; i < 3; i++) {
        const buttons = [];
        for (let j = 0; j < 4; j++) {
          const index = i * 4 + j;
          let label = `🃏 ${index + 1}`;
          let style = ButtonStyle.Primary;
          let disabled = state.pickedCards[index];

          if (disabled) {
            const card = state.cards[index];
            if (card.type === 'property') {
              const prop = state.properties[card.index];
              label = prop.color;
              style = ButtonStyle.Success;
            } else if (card.type === 'strike') {
              label = '❌';
              style = ButtonStyle.Danger;
            } else if (card.type === 'blockParty') {
              label = '🎉';
              style = ButtonStyle.Primary;
            }
          }

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`block_party_card_${index}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(disabled)
          );
        }
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }

      // Add cashout button
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('block_party_stop')
          .setLabel('💰 Cash Out')
          .setStyle(ButtonStyle.Success)
          .setDisabled(state.bankedMoney === 0) // Can't cashout with $0
      ));
    }

    return rows;
  }

  static createBlockPartyResultEmbed(game, result) {
    if (result.won) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 ALL PROPERTIES COLLECTED!')
        .setDescription(
          `**Complete set!**\n\n` +
          `**🎰 JACKPOT:** $3,000,000\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - result.jackpot)}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.gameOver) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 STRIKE 3 - GAME OVER!')
        .setDescription(
          `**Too many strikes!**\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.stopped) {
      return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🛑 Cashed Out')
        .setDescription(
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Fallback for unexpected result types
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚠️ Unexpected Result')
      .setDescription(
        `An unexpected error occurred in the Block Party minigame.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `Please report this to an administrator.`
      );
  }

  // === POWER GRID MINIGAME UI (formerly Electric Company) ===

  static createPowerGridIntroEmbed(game) {
    const switchRow = '⬜⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜⬜';
    const bulbDisplay = '💡'.repeat(25);

    return new EmbedBuilder()
      .setColor('#FFB300')
      .setTitle('💡⚡ POWER GRID ⚡💡')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ ELECTRICAL ENGINEERING CHALLENGE**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🔌 YOUR SWITCHES:**\n${switchRow}\n` +
        `12 switches to control the grid\n\n` +

        `**💡 THE BULBS:**\n${bulbDisplay}\n` +
        `25 light bulbs waiting for power\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE GAME:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 Each switch lights up **1-10 bulbs**\n` +
        `🔹 **Progressive Rewards:**\n` +
        `   • Bulbs 1-10 = $500 each\n` +
        `   • Bulbs 11-15 = $1,000 each\n` +
        `   • Bulb 16 = $40,000\n` +
        `   • Bulbs 17-21 = $50,000 each\n` +
        `   • Bulbs 22-23 = $100,000 each\n` +
        `   • Bulb 24 = $500,000\n\n` +

        `🎯 **TARGET:** Light **EXACTLY 24 bulbs**\n` +
        `🎰 **JACKPOT:** Hit 24 = **$3,000,000!**\n` +
        `💥 **BLACKOUT:** Bulb #25 = Lose everything!\n` +
        `⚠️ **WARNING:** Stop before 25 or lose it all\n\n` +

        `**Flip wisely!** ⚡`
      )
      .setFooter({ text: 'Season 1 • 12 Switches • 25 Bulbs • Hit 24 for Jackpot!' });
  }

  static createPowerGridGameEmbed(game) {
    const state = game.electricCompanyState;
    let bulbsDisplay = '';
    for (let r = 4; r >= 0; r--) {
      for (let c = 0; c < 5; c++) {
        const index = r * 5 + c;
        if (index < state.litBulbs) {
          bulbsDisplay += '💡';
        } else if (index === 24) {
          bulbsDisplay += '🔴';
        } else {
          bulbsDisplay += '⚫';
        }
      }
      bulbsDisplay += '\n';
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`⚡ Power Grid - ${state.litBulbs}/24 Bulbs Lit`)
      .setDescription(
        `**Bulbs:**\n${bulbsDisplay}\n` +
        `**Lit:** ${state.litBulbs}/24\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Pick a switch to flip!**\n' +
        '⚠️ Bulb #25 = Blackout!'
      );
  }

  static createPowerGridButtons(game) {
    const state = game.electricCompanyState;
    const rows = [];

    for (let i = 0; i < 3; i++) {
      const buttons = [];
      for (let j = 0; j < 4; j++) {
        const index = i * 4 + j;
        if (index < 12) {
          const isPicked = state.pickedSwitches[index];
          const label = isPicked ? `(+${state.switches[index]})` : `⚡ ${index + 1}`;

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`power_grid_switch_${index}`)
              .setLabel(label)
              .setStyle(isPicked ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(isPicked)
          );
        }
      }
      if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
    }

    // Add stop button
    if (state.bankedMoney > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('power_grid_stop')
          .setLabel('🛑 Cash Out')
          .setStyle(ButtonStyle.Danger)
      ));
    }

    return rows;
  }

  static createPowerGridResultEmbed(game, result) {
    // Handle null result
    if (!result) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚡ Power Grid Error')
        .setDescription('Game result not found.');
    }

    if (result.won) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎰 POWER GRID - JACKPOT!')
        .setDescription(
          `**🎯 PERFECT! 24 Bulbs Lit!**\n\n` +
          `**🎰 JACKPOT:** $3,000,000\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - (result.jackpot || 3000000))}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.blackout) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 POWER GRID - BLACKOUT!')
        .setDescription(
          `**You caused a blackout!**\n\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.stopped) {
      return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🛑 Cashed Out')
        .setDescription(
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Default fallback
    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('⚡ Power Grid')
      .setDescription(
        `**Final Amount:** $${this.formatMoney(result.finalAmount || 0)}\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`
      );
  }

  // === NO VACANCY MINIGAME UI ===

  static createNoVacancyIntroEmbed(game) {
    const hotelFloors = '🏨 🏨 🏨\n🏨 🏨 🏨\n🏨 🏨 🏨\n🏨 🏨 🏨\n🏨 🏨 🏨\n🏨 🏨 🏨\n🏨 🏨 🏨';
    const limoRow = '🚘 🚘 🚘 🚘 🚘';

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🏨✨ NO VACANCY ✨🏨')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏨 LUXURY HOTEL EMPIRE**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🏨 YOUR HOTEL:**\n${hotelFloors}\n` +
        `3 floors × 7 rooms = **21 total rooms**\n\n` +

        `**🚘 THE LIMOS:**\n${limoRow}\n` +
        `5 limos with 1-5 passengers each\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**💎 ROOM VALUES:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 **Floor 1:** $10,000 per room\n` +
        `🔹 **Floor 2:** $20,000 per room\n` +
        `🔹 **Floor 3:** $30,000 per room\n\n` +

        `⚡ **THE GAME:**\n` +
        `🔹 Pick a limo → See passengers\n` +
        `🔹 Place ALL on ONE floor\n` +
        `🔹 Can't fit = 💥 **Game Over!**\n` +
        `🔹 Min 3 rooms/floor to cash out\n\n` +

        `🎯 **GOAL:** Fill the hotel smartly\n` +
        `🎰 **JACKPOT:** Fill **all 21 rooms** = **$3,000,000!**\n\n` +

        `**Check in your guests!** 🛎️`
      )
      .setFooter({ text: 'Season 1 • 21 Rooms • 5 Limos • Strategic Placement' });
  }

  static createNoVacancyLimoEmbed(game, result) {
    const state = game.noVacancyState;
    const hotelDisplay = state.hotel.map((floor, i) => {
      const filled = floor.filter(r => r).length;
      return `Floor ${i + 1}: ${'🚪'.repeat(filled)}${'⬜'.repeat(7 - filled)} (${filled}/7)`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor('#8A2BE2')
      .setTitle(`🏨 No Vacancy - ${result.passengers} Passengers`)
      .setDescription(
        `**🏢 Hotel:**\n${hotelDisplay}\n\n` +
        `**🚘 Limo:** ${result.passengers} passengers\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Choose a floor to place them:**'
      );
  }

  static createNoVacancyGameEmbed(game) {
    const state = game.noVacancyState;
    const hotelDisplay = state.hotel.map((floor, i) => {
      const filled = floor.filter(r => r).length;
      return `Floor ${i + 1}: ${'🚪'.repeat(filled)}${'⬜'.repeat(7 - filled)} (${filled}/7)`;
    }).join('\n');

    const totalFilled = state.hotel.flat().filter(r => r).length;

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🏨 No Vacancy - Hotel Status')
      .setDescription(
        `**🏢 Hotel:**\n${hotelDisplay}\n\n` +
        `**Rooms Filled:** ${totalFilled}/21\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Pick your next limo:**'
      );
  }

  static createNoVacancyLimoEmbed(game, result) {
    const state = game.noVacancyState;
    const hotelDisplay = state.hotel.map((floor, i) => {
      const filled = floor.filter(r => r).length;
      return `Floor ${i + 1}: ${'🚪'.repeat(filled)}${'⬜'.repeat(7 - filled)} (${filled}/7)`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor('#8A2BE2')
      .setTitle(`🏨 No Vacancy - ${result.passengers} Passengers`)
      .setDescription(
        `**🏢 Hotel:**\n${hotelDisplay}\n\n` +
        `**🚘 Limo:** ${result.passengers} passengers\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n\n` +
        '**Choose a floor to place them:**'
      );
  }

  static createNoVacancyButtons(game, hasLimo) {
    const state = game.noVacancyState;

    if (!hasLimo) {
      // Show limo selection
      const buttons = [];
      for (let i = 0; i < 5; i++) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`no_vacancy_limo_${i}`)
            .setLabel(`🚘 ${i + 1}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(state.pickedLimos[i])
        );
      }

      const rows = [new ActionRowBuilder().addComponents(buttons)];

      // Add cash out button if eligible (min 3 rooms per floor)
      const minRooms = state.hotel.every(floor => floor.filter(r => r).length >= 3);
      if (minRooms && state.bankedMoney > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('no_vacancy_stop')
            .setLabel('🛑 Cash Out')
            .setStyle(ButtonStyle.Danger)
        ));
      }

      return rows;
    } else {
      // Show floor selection
      const passengers = state.currentPassengers;
      const buttons = [];
      const labels = ['Floor 1 ($10k/room)', 'Floor 2 ($20k/room)', 'Floor 3 ($30k/room)'];
      const styles = [ButtonStyle.Success, ButtonStyle.Primary, ButtonStyle.Danger];

      for (let i = 0; i < 3; i++) {
        const emptyRooms = state.hotel[i].filter(r => !r).length;
        const fits = passengers <= emptyRooms;

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`no_vacancy_floor_${i}`)
            .setLabel(labels[i])
            .setStyle(styles[i])
            .setDisabled(!fits)
        );
      }

      const rows = [new ActionRowBuilder().addComponents(buttons)];

      // Add stop button if eligible
      const minRooms = state.hotel.every(floor => floor.filter(r => r).length >= 3);
      if (minRooms && state.bankedMoney > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('no_vacancy_stop')
            .setLabel('🛑 Cash Out')
            .setStyle(ButtonStyle.Secondary)
        ));
      }

      return rows;
    }
  }

  static createNoVacancyResultEmbed(game, result) {
    if (result.won) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 NO VACANCY - JACKPOT!')
        .setDescription(
          `**All 21 rooms filled!**\n\n` +
          `**🎰 JACKPOT:** $3,000,000\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - (result.jackpot || 0))}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.noMoves) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 NO VACANCY - NO MOVES!')
        .setDescription(
          `**${result.passengers} passengers can't fit anywhere!**\n\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.overflow) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💥 OVERFLOW!')
        .setDescription(
          `**${result.passengers} passengers won't fit!**\n` +
          `**Only ${result.emptyRooms} rooms available!**\n\n` +
          `**Lost:** Everything\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`
        );
    } else if (result.stopped) {
      return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🛑 Cashed Out')
        .setDescription(
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Fallback for unexpected result types
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('⚠️ Unexpected Result')
      .setDescription(
        `An unexpected error occurred in the No Vacancy minigame.\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        `Please report this to an administrator.`
      );
  }

  // === RIDE THE RAILS MINIGAME UI ===

  static createRideRailsIntroEmbed(game) {
    const trainEmoji = '🚂'.repeat(5);
    const turnDisplay = '🔹 Turn 1: $10k/car\n🔹 Turn 2: $20k/car\n🔹 Turn 3: $30k/car\n🔹 Turn 4: $50k/car';

    return new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🚂💨 RIDE THE RAILS 💨🚂')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** 💰 **$${this.formatMoney(game.totalMoney)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🚂 THE GREAT RAILROAD FORTUNE**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `**🛤️ YOUR TRAINS:**\n${trainEmoji}\n` +
        `${trainEmoji}\n` +
        `10 trains • 1-10 cash cars each\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**💵 THE PAYOUTS:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${turnDisplay}\n\n` +

        `⚡ **THE GAME:**\n` +
        `🔹 Pick a train each turn\n` +
        `🔹 Reveal cars one by one\n` +
        `🔹 Stop BEFORE the caboose!\n` +
        `🔹 Hit caboose = Lose turn's potential\n\n` +

        `🎯 **GOAL:** Bank **$500,000** total\n` +
        `🎰 **JACKPOT:** Bank **>$500k** → **$3,000,000!**\n\n` +

        `**All aboard!** 🎟️`
      )
      .setFooter({ text: 'Season 1 • 10 Trains • 4 Turns • Stop Before Caboose!' });
  }

  static createTrainCarGrid(train) {
    // Generate visual grid for train cars
    // ⬜ = unrevealed car, 🟩 = revealed cash car, 🟥 = caboose
    const totalCars = train.cashCars; // Number of cash cars
    const revealedCount = train.revealed;
    const allRevealed = train.allRevealed || false;

    let grid = '';

    if (allRevealed) {
      // Show all cars (revealed after stopping or hitting caboose)
      for (let i = 1; i <= totalCars; i++) {
        if (train.revealedCars.includes(i)) {
          grid += '🟩'; // Revealed cash car
        } else {
          grid += '⬜'; // Unrevealed cash car
        }
      }
      // Show caboose
      if (revealedCount > totalCars) {
        grid += '🟥'; // Revealed caboose (hit it)
      } else {
        grid += '🟥'; // Unrevealed caboose (stopped before)
      }
    } else {
      // During play - show fixed 10 tiles to hide length/caboose
      // Show revealed cars as green, rest as white
      const displayLength = 10;
      for (let i = 1; i <= displayLength; i++) {
        if (train.revealedCars.includes(i)) {
          grid += '🟩'; // Revealed cash car
        } else {
          grid += '⬜'; // Unrevealed slot (could be cash or nothing/caboose hidden)
        }
      }
      // No caboose shown during play to keep suspense
    }

    return grid;
  }

  static createRideRailsTrainSelectionEmbed(game) {
    const state = game.rideRailsState;
    const turnValue = state.turnValues[state.currentTurn];

    // Build train list - only show grids for stopped trains
    let trainList = '';
    state.trains.forEach((train, idx) => {
      if (train.stopped) {
        // Show grid for stopped trains
        const grid = this.createTrainCarGrid(train);
        trainList += `**${idx + 1}.** ${train.name} ❌\n${grid}\n`;
      } else {
        // Just show name for available trains (keep suspense!)
        trainList += `**${idx + 1}.** ${train.name}\n`;
      }
    });

    return new EmbedBuilder()
      .setColor('#D2691E')
      .setTitle(`🚂 Ride the Rails - Turn ${state.currentTurn + 1}/4`)
      .setDescription(
        `**Turn Value:** $${this.formatMoney(turnValue)}/car\n` +
        `**Banked:** $${this.formatMoney(state.bankedMoney)}\n` +
        `**Goal:** $500,000\n\n` +
        `**Available Trains:**\n${trainList}\n` +
        '⬜ = Unrevealed | 🟩 = Revealed | 🟥 = Caboose'
      );
  }

  static createRideRailsButtons(game, selectingTrain) {
    const state = game.rideRailsState;

    if (selectingTrain) {
      // Show train selection
      const rows = [];
      for (let i = 0; i < 2; i++) {
        const buttons = [];
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          if (index < 10) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`ride_rails_train_${index}`)
                .setLabel(`🚂 ${index + 1}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(state.trains[index].stopped)
            );
          }
        }
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
      return rows;
    } else {
      // Show reveal/stop buttons
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ride_rails_reveal')
            .setLabel('🚂 Reveal Next Car')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ride_rails_stop')
            .setLabel('🛑 Stop Train')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }
  }

  static createRideRailsResultEmbed(game, result) {
    if (result.jackpot) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 RIDE THE RAILS - JACKPOT!')
        .setDescription(
          `**$500k+ Banked!**\n\n` +
          `**🎰 JACKPOT:** $3,000,000\n` +
          `**Banked Money:** $${this.formatMoney(result.finalAmount - result.jackpot)}\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.goalReached) {
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 GOAL REACHED!')
        .setDescription(
          `**$500k+ Banked!**\n\n` +
          `**Total Won:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    } else if (result.gameOver) {
      return new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🚂 Game Complete')
        .setDescription(
          (result.lostAmount ? `**Hit Caboose! Lost potential $${this.formatMoney(result.lostAmount)}**\n\n` : '') +
          `**Final Amount:** $${this.formatMoney(result.finalAmount)}\n` +
          `**Total Money:** $${this.formatMoney(result.totalMoney)}`
        );
    }

    // Default fallback embed if none of the conditions match
    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('🚂 Ride the Rails')
      .setDescription(
        `**Final Amount:** $${this.formatMoney(result.finalAmount || 0)}\n` +
        `**Total Money:** $${this.formatMoney(result.totalMoney || game.totalMoney)}`
      );
  }

  // === DEAL OR NO DEAL UI EMBEDS ===

  static createDondIntroEmbed(player, banker, offerMode) {
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💼 DEAL OR NO DEAL 💼')
      .setDescription(
        `**Player:** <@${player.id}> (${player.username})\n` +
        `**Offer Mode:** ${offerMode === 'auto' ? '🤖 Auto-Calculated' : '👤 Manual Banker'}\n\n` +
        '**Welcome to Deal or No Deal!**\n\n' +
        '**📦 26 Cases - 4 Tiers:**\n' +
        '• Tier 1 (10 cases): $0.01 → $1,000\n' +
        '• Tier 2 (5 cases): $5,000 → $100,000\n' +
        '• Tier 3 (5 cases): $200,000 → $1,000,000\n' +
        '• Tier 4 (6 cases): $5M → $1 Billion\n\n' +
        '**🎮 9 Rounds - Progressive Opening:**\n' +
        '• Rounds 1-5: Open 6→5→4→3→2 cases\n' +
        '• Rounds 6-9: Open 1 case each\n' +
        '• After each round: Banker makes offer\n' +
        '• Your choice: **DEAL** or **NO DEAL**\n' +
        '• Final round: Option to **SWITCH** cases\n\n' +
        '**💰 Scoring:**\n' +
        '• Good deal = Full amount to Big Bank + bonus\n' +
        '• Bad deal = 90% to Big Bank - penalty\n\n' +
        `Use \`/dond-board view:All Board\` to see all values!\n\n` +
        '**Ready to play?**'
      )
      .setFooter({ text: 'Season 1 • Deal or No Deal • Select your case to begin!' });
  }

  static createDondBoardEmbed(showCurrent = false, game = null) {
    const allValues = [
      0.01, 1, 5, 10, 25, 50, 75, 100, 500, 1000,
      5000, 10000, 25000, 50000, 100000,
      200000, 300000, 500000, 750000, 1000000,
      5000000, 10000000, 50000000, 100000000, 500000000, 1000000000
    ];

    let description = '';

    if (showCurrent && game && game.dondState) {
      const openedValues = new Set(game.dondState.cases.filter(c => c.opened).map(c => c.value));

      description = `**Your Case:** 💼 ${game.dondState.playerCaseNumber} 🔒\n**Remaining:** ${26 - openedValues.size}/26\n\n`;
      description += '```\n';
      description += '            DEAL OR NO DEAL\n\n';

      // Two columns: first 13 vs last 13
      for (let i = 0; i < 13; i++) {
        const leftValue = allValues[i];
        const rightValue = allValues[i + 13];

        // Check if opened
        const leftOpened = openedValues.has(leftValue);
        const rightOpened = openedValues.has(rightValue);

        // Format values
        const leftFormatted = `$${this.formatMoney(leftValue)}`;
        const rightFormatted = `$${this.formatMoney(rightValue)}`;

        // Add strikethrough indicator
        const leftDisplay = leftOpened ? `X ${leftFormatted}` : `  ${leftFormatted}`;
        const rightDisplay = rightOpened ? `X ${rightFormatted}` : `  ${rightFormatted}`;

        description += `${leftDisplay.padEnd(22)}${rightDisplay}\n`;
      }

      description += '```\n*X = Eliminated*';
    } else {
      // Show all values in two columns
      description += '```\n';
      description += '            DEAL OR NO DEAL\n\n';

      for (let i = 0; i < 13; i++) {
        const left = `  $${this.formatMoney(allValues[i])}`;
        const right = `  $${this.formatMoney(allValues[i + 13])}`;
        description += `${left.padEnd(22)}${right}\n`;
      }

      description += '```';
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(showCurrent ? '💼 Current Board' : '💼 Deal or No Deal - All Cases')
      .setDescription(description)
      .setFooter({ text: showCurrent ? 'Season 1 • X = Eliminated' : 'Season 1 • 26 cases: $0.01 to $1 Billion' });
  }

  static createDondCaseButtons(game) {
    const page = game.dondState.casePage || 0; // 0 = cases 1-13, 1 = cases 14-26
    const startCase = page * 13 + 1;
    const endCase = Math.min((page + 1) * 13, 26);

    const rows = [];

    // Create rows of case buttons (13 cases per page)
    for (let row = 0; row < 3; row++) {
      const buttons = [];
      const casesPerRow = row === 2 ? 4 : 5; // Last row has 4 cases (13 total = 5+5+3, but we show 5+4+4)

      for (let col = 0; col < casesPerRow; col++) {
        const caseNum = startCase + row * 5 + col;
        if (caseNum > endCase) break;

        const caseData = game.dondState.cases.find(c => c.caseNumber === caseNum);
        const isPlayerCase = caseNum === game.dondState.playerCaseNumber;
        const isOpened = caseData && caseData.opened;

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`dond_case_${caseNum}`)
            .setLabel(`💼 ${caseNum}`)
            .setStyle(isPlayerCase ? ButtonStyle.Success : (isOpened ? ButtonStyle.Secondary : ButtonStyle.Primary))
            .setDisabled(isOpened || isPlayerCase)
        );
      }

      if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons));
      }
    }

    // Add pagination row
    const paginationRow = new ActionRowBuilder();
    paginationRow.addComponents(
      new ButtonBuilder()
        .setCustomId('dond_page_prev')
        .setLabel('◀️ Cases 1-13')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('dond_page_next')
        .setLabel('Cases 14-26 ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1)
    );
    rows.push(paginationRow);

    return rows;
  }

  static createDondRoundEmbed(game) {
    const round = game.dondState.currentRound;
    const casesToOpen = game.getRoundCasesToOpen();

    // Calculate how many cases were opened in previous rounds
    let previousRoundsTotal = 0;
    for (let r = 0; r < round; r++) {
      if (r === 0) previousRoundsTotal += 6;
      else if (r === 1) previousRoundsTotal += 5;
      else if (r === 2) previousRoundsTotal += 4;
      else if (r === 3) previousRoundsTotal += 3;
      else if (r === 4) previousRoundsTotal += 2;
      else previousRoundsTotal += 1;
    }

    const openedThisRound = Math.max(0, game.dondState.openedCases.length - previousRoundsTotal);

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💼 Round ${round + 1}`)
      .setDescription(
        `**Cases to Open:** ${casesToOpen}\n` +
        `**Opened This Round:** ${openedThisRound} / ${casesToOpen}\n\n` +
        `*Select a case to eliminate it from the board!*`
      )
      .setFooter({ text: 'Season 1 • Deal or No Deal' });
  }

  static createDondCaseRevealEmbed(caseNum, value) {
    return new EmbedBuilder()
      .setColor(value >= 100000 ? '#FF0000' : '#32CD32')
      .setTitle(`💼 ${caseNum} - OPENED!`)
      .setDescription(`**$${this.formatMoney(value)}**`);
  }

  static createDondBankerOfferEmbed(game, offer) {
    const counterStatus = game.dondState.hasCounterOffered
      ? '\n\n⚠️ _Counter Offer already used this game_'
      : '\n\n💡 _You can Counter Offer once if you think it\'s too low!_';

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📞 The Banker is Calling!')
      .setDescription(
        `**Round ${game.dondState.currentRound + 1} of 9**\n\n` +
        `**The Banker's Offer:** $${this.formatMoney(offer)}\n\n` +
        '**Deal or No Deal?**' +
        counterStatus
      );
  }

  static createDondDealButtons(game) {
    const buttons = [
      new ButtonBuilder().setCustomId('dond_deal').setLabel('🤝 DEAL').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dond_nodeal').setLabel('❌ NO DEAL').setStyle(ButtonStyle.Danger)
    ];

    // Add Counter Offer button if not yet used
    if (!game.dondState.hasCounterOffered) {
      buttons.push(
        new ButtonBuilder().setCustomId('dond_counter').setLabel('💰 Counter Offer').setStyle(ButtonStyle.Primary)
      );
    }

    return [new ActionRowBuilder().addComponents(buttons)];
  }

  static createDondSwitchEmbed(game) {
    const otherCase = game.dondState.cases.find(c => !c.opened && c.caseNumber !== game.dondState.playerCaseNumber);
    return new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('🔄 Switch or Keep?')
      .setDescription(
        `**Your Case:** 💼 ${game.dondState.playerCaseNumber} 🔒\n\n` +
        `**Other Case:** ${otherCase.caseNumber}\n\n` +
        '**Will you switch?**'
      );
  }

  static createDondSwitchButtons() {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dond_switch').setLabel('🔄 SWITCH').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dond_keep').setLabel('🛡️ KEEP').setStyle(ButtonStyle.Secondary)
    )];
  }

  static createDondResultEmbed(game, outcome) {
    const isGoodDeal = outcome.isGoodDeal;
    let description =
      `**Your Winnings:** $${this.formatMoney(outcome.finalValue)}\n` +
      `**Your Case Had:** $${this.formatMoney(outcome.playerCaseValue)}\n\n` +
      (isGoodDeal ? `🎉 **GOOD DEAL!**\n+Score | To Big Bank` : `😔 **BAD DEAL**\n-10% Score | To Big Bank`);

    if (outcome.remainingCases && outcome.remainingCases.length > 0) {
      // Sort remaining cases by value descending
      const sortedCases = [...outcome.remainingCases].sort((a, b) => b.value - a.value);
      const remainingDisplay = sortedCases.map(c => `💼 Case ${c.caseNumber}: **$${this.formatMoney(c.value)}**`).join('\n');

      description += `\n\n**🔍 What was left:**\n${remainingDisplay}`;
    }

    return new EmbedBuilder()
      .setColor(isGoodDeal ? '#32CD32' : '#FF6B6B')
      .setTitle(game.dondState.dealAccepted ? '💼 DEAL!' : '💼 NO DEAL!')
      .setDescription(description);
  }

  static createStatsEmbed(stats, remainingPlays, isAdmin = false, recentPlays = [], topPlays = [], user = null) {
    const playsDisplay = isAdmin ? remainingPlays : `${remainingPlays}/5${remainingPlays > 5 ? ' (+bonus)' : ''}`;
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
    if (!remainingAmounts) return 'None';
    const categories = {
      cash: [],
      negative: [],
      positive: [],
      random: [],
      special: [],
      minigames: [],
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
      } else if (amount.type === 'special') {
        categories.special.push(amount.label); // Special items only
      } else if (amount.type === 'event') {
        categories.minigames.push(amount.label); // Minigames (event tiles)
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

    // Minigames (separated from specials)
    if (categories.minigames.length > 0) {
      output += `🎮 **Minigames:** ${categories.minigames.join(', ')}\n`;
    }

    // Other (Nothing, Game Over)
    if (categories.other.length > 0) {
      output += `⚪ **Other:** ${categories.other.join(', ')}\n`;
    }

    return output || '*All amounts revealed!*';
  }

  static formatActiveEffects(activeEffects) {
    if (!activeEffects || activeEffects.length === 0) return '';

    const effectDescriptions = {
      'gameOverImmunity': 'Game Over Immunity',
      'doubleRewards3': 'Double Rewards',
      'guaranteedPositive5': 'Guaranteed Positive',
      'autoRevive': 'Auto-Revive',
      'tripleNextFloor': 'Triple Next Reward',
      'autoWinMinigame': 'Auto-Win Minigame',
      'convertNothing3': 'Convert Nothing to Cash',
      'noLoss4': 'No Losses',
      'reverseChoice': 'Reverse Choice',
      'lose10k3': '-$10k per floor',
      'noBankCashout5': 'Cannot Bank/Cashout',
      'hideNext3': 'Hidden Floors',
      'halveMultipliers4': 'Halved Multipliers',
      'randomChoice2': 'Random Choice (Broken Compass)',
      'tickingBomb': 'Ticking Bomb (-$10k/floor)',
      'invertNext': 'Invert Next Value',
      'skipNextFloor': 'Skip Next Floor',
      'nothingToGameOver3': 'Nothing = Game Over'
    };

    const effectLines = activeEffects.map(effect => {
      const name = effectDescriptions[effect.type] || effect.type;
      const counter = effect.floorsRemaining ? ` x${effect.floorsRemaining}` : '';
      return `• ${name}${counter}`;
    });

    return effectLines.join('\n');
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
      .setColor('#32CD32')
      .setTitle('🏦 THE VAULT 🔐')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Crack the vault code to win big!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• Secret code: **6 digits** (0-9, no duplicates)\n' +
        '• You have **4 attempts** to crack it\n' +
        '• Example code: 4 9 2 7 0 5\n\n' +
        '**💡 How Guessing Works:**\n' +
        '• After each guess, you\'ll see feedback:\n' +
        '  ✅ **Correct Position:** Digit is right AND in right spot\n' +
        '  🟡 **Wrong Position:** Digit is in code but wrong spot\n' +
        '• Example:\n' +
        '  Code: `4 9 2 7 0 5`\n' +
        '  Guess: `4 1 2 3 6 5` → ✅ 3 | 🟡 0\n' +
        '  (4, 2, 5 are correct positions)\n\n' +
        '**💰 Reward Tiers (based on correct digits):**\n' +
        '• **6 digits** (CRACKED!) - Random reward: 🏆\n' +
        '  → $1,000,000 (highest chance)\n' +
        '  → +100% money boost\n' +
        '  → Add a "1" to your money\n' +
        '  → Reveal a Game Over floor\n' +
        '• **5 digits** - $500,000 💎\n' +
        '• **4 digits** - $200,000 💵\n' +
        '• **3 digits** - $100,000 💰\n' +
        '• **2 digits** - $25,000 💵\n' +
        '• **1 digit** - $10,000 💵\n' +
        '• **0 digits** - Nothing 💔\n\n' +
        '**Reply with your 6-digit guess below!**\n' +
        '*Format: 6 different digits (e.g., 012345)*'
      )
      .setFooter({ text: 'Attempt 1 of 4 | No duplicate digits allowed!' });
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
      .setColor('#9B59B6')
      .setTitle('♾️ THE INFINITY PERCENT ♾️')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Accumulate % to multiply your money!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• Each round: Pick ⬅️ LEFT or ➡️ RIGHT\n' +
        '• One side adds %, other side = Strike! 💀\n' +
        '• Unlimited rounds - keep going as long as you dare!\n' +
        '• Random % values: **+5%** per pick\n\n' +
        '• You can play as long as you dare or if you got 3 strikes, you are out of the game with total percentage deducted by 100%!\n\n\n\n' +
        '**💰 Cashout Rules:**\n' +
        '• **Minimum:** You can exit as you wish!\n' +
        '• **Formula:** Current Money × (1 + Total %)\n' +
        '• **Example:** $100k at 150% = $250k\n' +
        '• Type **STOP** in chat or click button anytime\n\n' +
        '**🎮 Strategy:**\n' +
        '• Higher % = Bigger multiplier but more risk\n' +
        '• Each pick is 50/50 - one adds %, one ends game\n' +
        '• Can you reach 200%? 500%? 1000%? 🚀\n\n' +
        '**Press START to begin!**'
      )
      .setFooter({ text: 'Risk vs Reward - How high will you go?' });
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

    const currentReward = Math.floor(game.totalMoney * (1 + state.accumulatedPercent / 100));

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
          .setLabel(`🛑 STOP ($${this.formatMoney(currentReward)})`)
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  static createInfinityPercentRoundEmbed(game) {
    const state = game.infinityPercentState;
    const nextPercent = state.percentPerPick || 5;
    const potentialPercent = state.accumulatedPercent + nextPercent;

    let historyDisplay = '';
    if (state.history && state.history.length > 0) {
      historyDisplay = '\n**Pick History:** ' + state.history.map(h => h.choice === 'left' ? '⬅️' : '➡️').join(' ');
    }

    return new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(`♾️ THE ∞% - Round ${state.currentRound + 1}`)
      .setDescription(
        `**Current Multiplier:** +${state.accumulatedPercent}%\n` +
        `**Next Boost:** +${potentialPercent}%\n` +
        historyDisplay + '\n\n' +
        'Choose your path wisely...'
      );
  }

  static createInfinityPercentResultEmbed(game, result) {
    let title = '';
    let description = '';
    let color = '#00FFFF';

    // Helper to create strikes display
    const getStrikesDisplay = (strikes, maxStrikes = 3) => {
      let display = '';
      for (let i = 0; i < maxStrikes; i++) {
        display += i < strikes ? '❌' : '⬜';
      }
      return display;
    };

    // Helper to create history display
    const state = game.infinityPercentState;
    let historyDisplay = '';
    if (state.history && state.history.length > 0) {
      historyDisplay = '\n\n**Pick History:** ' + state.history.map(h => h.choice === 'left' ? '⬅️' : '➡️').join(' ');
    }

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
          `**Final Multiplier:** +${result.accumulatedPercent}%\n` +
          `**Total Won:** $${this.formatMoney(result.accumulatedReward)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
        color = '#00FF00';
      } else {
        title = '💀 THE ∞% - GAME OVER';
        description = `You chose poorly...\n\n` +
          `**Penalty:** ${result.penaltyPercent}%\n` +
          `**Lost:** $${this.formatMoney(result.lostAmount)}\n` +
          `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
        color = '#FF0000';
      }
    } else {
      // Check if correct or wrong
      if (result.isCorrect) {
        title = 'THE ∞% - ✅ Correct!';
        description = `**Result:** +5%\n\n` +
          `**Accumulated:** +${result.accumulatedPercent}%\n` +
          `**Strikes:** ${getStrikesDisplay(result.strikes || 0)}\n` +
          historyDisplay;
        color = '#00FF00';
      } else {
        title = 'THE ∞% - ❌ Wrong!';
        description = `**Result:** Strike added!\n\n` +
          `**Accumulated:** +${result.accumulatedPercent}%\n` +
          `**Strikes:** ${getStrikesDisplay(result.strikes || 0)}\n` +
          historyDisplay;
        color = '#FF0000';
      }
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
        '**Control the temperature to hit the sweet spot!**\n\n' +
        '**🎯 The Concept:**\n' +
        '• **8 hidden grids** with random values (0°-90°)\n' +
        '• Choose **HOTTER (+)** or **COLDER (-)** for next grid\n' +
        '• **Change:** Swap next grid with reserve (1 use)\n' +
        '• **Goal:** End between 10° and 90°\n\n' +
        '**🌡️ How to Play:**\n' +
        '1. Start with a random temperature\n' +
        '2. Choose HOTTER or COLDER\n' +
        '3. Reveal next hidden grid value\n' +
        '4. Use \"Change\" once to swap to reserve\n' +
        '5. Try to end in the safe zone!\n\n' +
        '**💰 Rewards:**\n' +
        '• **100° Exact:** $2,000,000 (JACKPOT!) 🏆\n' +
        '• **0° Exact:** $200,000 ❄️\n' +
        '• **10°-90°:** $25,000 per 10 degrees\n' +
        '  (10° = $25k, 20° = $50k, 30° = $75k...)\n' +
        '• **<0° or >100°:** BUST (Win nothing) 💥\n\n' +
        '**Press START to begin!**'
      )
      .setFooter({ text: 'Season 1 • 8 Grids • Goal: 10°-90° • Perfect: 0° or 100°!' });
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
      .setColor('#3498DB')
      .setTitle('✊✋✌ OPERATOR ROSHAMBO ✊✋✌')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Face the Operator in Rock, Paper, Scissors!**\n\n' +
        '**🎯 The Challenge:**\n' +
        '• Play **6 rounds** total\n' +
        '• Each round: ✊ Rock | ✋ Paper | ✌ Scissors\n' +
        '• Build up your pot across all rounds!\n\n' +
        '**💪 Classic Rules:**\n' +
        '• ✊ **Rock** crushes ✌ Scissors\n' +
        '• ✋ **Paper** covers ✊ Rock\n' +
        '• ✌ **Scissors** cuts ✋ Paper\n' +
        '• Same choice = Tie (no change)\n\n' +
        '**💰 Rewards:**\n' +
        '• **Win:** +$30,000 to your pot 💵\n' +
        '• **Loss:** Pot ÷ 10 (lose last digit!) 📉\n' +
        '• **Tie:** No change 🟰\n' +
        '• **Perfect 6/6 Wins:** $2,000,000 JACKPOT! 🏆\n\n' +
        '**🎮 Strategy:**\n' +
        '• Start with $0, build up with wins\n' +
        '• Avoid losses - they destroy your pot!\n' +
        '• Example: $90k → Loss → $9k\n' +
        '• Operator plays randomly - pure luck!\n\n' +
        '**Ready to challenge the Operator?**'
      )
      .setFooter({ text: 'Season 1 • 6 Rounds • Win All 6 = $2M Jackpot!' });
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
        `**Score:** ${state.wins}W - ${state.losses}L - ${state.ties}T\n` +
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
        `**Final Score:** 6W - 0L - 0T\n` +
        `**Total Money:** $${this.formatMoney(game.totalMoney)}`;
      color = '#FFD700';
    } else if (result.gameOver) {
      title = '✊✋✌️ ROSHAMBO - COMPLETE!';
      description = `**Final Score:** ${result.wins}W - ${result.losses}L - ${result.ties}T\n` +
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
      .setColor('#FF00FF')
      .setTitle('📦 MYSTERY BOX 📦')
      .setDescription(
        `**Player:** ${game.username}\n` +
        `**Current Money:** $${this.formatMoney(game.totalMoney)}\n\n` +
        '**Choose wisely - 4 boxes, 75 possible effects!**\n\n' +
        '**🎯 The Game:**\n' +
        '• **4 boxes** to choose from\n' +
        '• **75 total items** across 5 categories\n' +
        '• Mix of good, bad, neutral, money, and minigames\n\n' +
        '**📦 Five Categories:**\n' +
        '1. 🟢 **GOOD** (17 items): Immunity, multipliers, guarantees\n' +
        '2. 🔴 **BAD** (17 items): Penalties, hindrances, debuffs\n' +
        '3. ⚪ **NEUTRAL** (16 items): Trades, swaps, random outcomes\n' +
        '4. 💰 **MONEY** (16 items): Direct cash amounts\n' +
        '5. 🎮 **MINIGAMES** (8 items): Monopoly Millionaire games\n\n' +
        '**🎮 Minigames:**\n' +
        '• Community Chest, Park It, Advance to Boardwalk\n' +
        '• Bank Buster, Block Party, Power Grid\n' +
        '• No Vacancy, Ride the Rails\n\n' +
        '**Choose your mystery box!**'
      )
      .setFooter({ text: '4 boxes • 75 items • 5 categories!' });
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

  static createMysteryBoxResultEmbed(game, selectedItem, selectedIndex, result = null) {
    const categoryColors = {
      good: '#2ECC71',
      bad: '#E74C3C',
      neutral: '#F39C12',
      money: '#3498DB',
      minigames: '#9B59B6'
    };

    const categoryIcons = {
      good: '💎',
      bad: '💀',
      neutral: '⚖️',
      money: '💰',
      minigames: '🎮'
    };

    let description = `**"${selectedItem.desc}"**\n\n` +
                      `**Category:** ${selectedItem.category.toUpperCase()}\n` +
                      `**Effect Applied!**\n\n`;

    if (result && result.message) {
      description += `📝 **Result:** ${result.message}\n\n`;
    }

    description += `**Total Money:** $${this.formatMoney(game.totalMoney)}`;

    // Custom Heist Theme for Small Bank
    if (selectedItem.id === 'small_bank') {
      return new EmbedBuilder()
        .setColor('#FFA500') // Orange for Heist
        .setTitle('🏦 SMALL BANK HEIST!')
        .setDescription(description)
        .setFooter({ text: `Box ${selectedIndex + 1} opened! • 10% Stolen!` });
    }

    return new EmbedBuilder()
      .setColor(categoryColors[selectedItem.category] || '#9B59B6')
      .setTitle(`${categoryIcons[selectedItem.category]} YOUR BOX: ${selectedItem.emoji} ${selectedItem.name}`)
      .setDescription(description)
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
        `**Total Money:** $${this.formatMoney(moneyBefore)}\n\n` +
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
    const totalFloors = game.eventMode ? 30 : 21;
    let description = `**🔍 All Floor Contents Revealed (Admin)**\n\n`;
    description += `**Player:** ${game.username}\n`;
    description += `**Current Money:** $${this.formatMoney(game.totalMoney)}\n`;
    description += `**Current Round:** ${game.currentRound}/${game.eventMode ? 8 : 6}\n`;
    description += `**Floors Completed:** ${game.floorsCompleted}/${totalFloors}\n\n`;

    // Show all floors (30 in event mode, 21 in normal)
    for (let floorNum = 1; floorNum <= totalFloors; floorNum++) {
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

  // === INFO COMMAND UI ===

  static createContentListEmbed() {
    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle('📚 Game Content List')
      .setDescription(
        '**Browse all game items and their effects!**\n\n' +
        'Select a category below to view detailed descriptions:\n\n' +
        '💰 **Cash Items** - Fixed money amounts\n' +
        '📊 **Percentages** - Multiply your money\n' +
        '🎲 **Random Items** - Mystery amounts\n' +
        '✨ **Special Actions** - Unique effects\n' +
        '🎮 **Minigames** - Interactive challenges\n' +
        '❌ **Dangers** - Game Over & Nothing'
      )
      .setFooter({ text: 'Use the menu below to select a category' });
  }

  static createContentListButtons() {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('content_category')
      .setPlaceholder('Select a category to view')
      .addOptions([
        {
          label: 'Cash Items',
          description: 'Fixed money amounts ($1 to $1,000,000)',
          value: 'cash',
          emoji: '💰'
        },
        {
          label: 'Percentages',
          description: 'Multiply your current money',
          value: 'percentage',
          emoji: '📊'
        },
        {
          label: 'Random Items',
          description: 'Mystery amounts with ranges',
          value: 'random',
          emoji: '🎲'
        },
        {
          label: 'Special Actions',
          description: 'Unique game-changing effects',
          value: 'special',
          emoji: '✨'
        },
        {
          label: 'Minigames',
          description: 'Interactive challenges',
          value: 'minigames',
          emoji: '🎮'
        },
        {
          label: 'Dangers',
          description: 'Game Over & Nothing tiles',
          value: 'dangers',
          emoji: '❌'
        }
      ]);

    return [new ActionRowBuilder().addComponents(menu)];
  }

  static createMinigameListEmbed() {
    return new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('🎮 Minigame Details')
      .setDescription(
        '**Season 1 Minigames - Learn the rules!**\n\n' +
        'Select a minigame below to view its rules and details:\n\n' +
        '🏦 **The Vault** - Code-breaking challenge\n' +
        '🎰 **Mega Grid** - Grid-based luck game\n' +
        '🔥 **Boiling Point** - Temperature management\n' +
        '✊ **Operator Roshambo** - Rock Paper Scissors\n' +
        '♾️ **The ∞%** - Infinite percentage game\n' +
        '🏚️ **Hideout Breakthrough** - Ascending number challenge\n' +
        '🪆 **Babushka** - Nesting doll risk game\n' +
        '📦 **Mystery Box** - Random item selection\n' +
        '🚪 **Door Escape** - Find the escape door'
      )
      .setFooter({ text: 'Use the menu below to select a minigame' });
  }

  static createMinigameListButtons() {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('minigame_select')
      .setPlaceholder('Select a minigame to view details')
      .addOptions([
        {
          label: 'The Vault',
          description: 'Crack the 6-digit code',
          value: 'vault',
          emoji: '🏦'
        },
        {
          label: 'Mega Grid',
          description: '5x5 grid luck challenge',
          value: 'mega_grid',
          emoji: '🎰'
        },
        {
          label: 'Boiling Point',
          description: 'Reach 100°C without boiling over',
          value: 'boiling_point',
          emoji: '🔥'
        },
        {
          label: 'Operator Roshambo',
          description: 'Rock Paper Scissors with stakes',
          value: 'operator_roshambo',
          emoji: '✊'
        },
        {
          label: 'The ∞%',
          description: 'Infinite percentage multiplier',
          value: 'infinity_percent',
          emoji: '♾️'
        },
        {
          label: 'Hideout Breakthrough',
          description: 'Pick ascending numbers 1-12',
          value: 'hideout_breakthrough',
          emoji: '🏚️'
        },
        {
          label: 'Babushka',
          description: 'Nesting doll risk game',
          value: 'babushka',
          emoji: '🪆'
        },
        {
          label: 'Mystery Box',
          description: 'Choose 1 of 4 random items',
          value: 'mystery_box',
          emoji: '📦'
        },
        {
          label: 'Door Escape',
          description: 'Find the escape door',
          value: 'door_escape',
          emoji: '🚪'
        }
      ]);

    return [new ActionRowBuilder().addComponents(menu)];
  }

  static createMysteryBoxInfoEmbed() {
    // Calculate total weights per category
    const goodTotal = 16; // 16 items × 1 weight
    const badTotal = 22; // 16×1 + 1×3 + 1×1 + 1x1 + 1x0.2 = 22 (approx)
    const neutralTotal = 16; // 16 items × 1 weight
    const minigamesTotal = 8; // 8 items × 1 weight
    const moneyTotal = 183; // Sum of all money item weights
    const grandTotal = goodTotal + badTotal + neutralTotal + minigamesTotal + moneyTotal; // 245

    return new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('📦 Mystery Box - Complete Item List')
      .setDescription(
        '**All 75 items with rates & descriptions**\n' +
        `*Total Weight: ${grandTotal} | Each box picks from one random category*\n\n` +
        '**🟢 GOOD ITEMS** (17 items, 1-2 weight = 7.6% category)\n' +
        '🛡️ **Golden Shield** (0.42%) - Immune to next Game Over\n' +
        '🧲 **Money Magnet** (0.42%) - Double rewards for 3 floors\n' +
        '🍀 **Lucky Clover** (0.42%) - Next 5 floors guaranteed positive\n' +
        '⏪ **Time Reversal** (0.42%) - Undo your last choice\n' +
        '💎 **Instant Jackpot** (0.42%) - Win $100k-$500k instantly\n' +
        '✨ **Divine Intervention** (0.42%) - Skip to highest floor + Find Random 5\n' +
        '🎫 **Golden Ticket** (0.42%) - Play a bonus minigame\n' +
        '🪂 **Safety Net** (0.42%) - No losses for 4 floors\n' +
        '🔮 **Vision Stone** (0.42%) - Reveal next 2 floor contents\n' +
        '🗺️ **Treasure Map** (0.42%) - Add $50k to all remaining floors\n' +
        '🪶 **Phoenix Feather** (0.42%) - Auto-revive on Game Over\n' +
        '👑 **Crown of Greed** (0.42%) - Triple money on next floor\n' +
        '👼 **Angel Wing** (0.42%) - Auto-win next minigame\n' +
        '✋ **Midas Touch** (0.42%) - Convert next 3 "Nothing" to Cash\n' +
        '⭐ **Wish Granter** (0.42%) - Choose any floor to jump to\n' +
        '🏦 **Big Bank** (0.42%) - Claim the entire Big Bank pot\n' +
        '🏦 **Small Bank** (0.84%) - Steal 10% of Big Bank pot\n\n' +
        '**🔴 BAD ITEMS** (18 items, 1-3 weight = 9.0% category)\n' +
        '🕳️ **Black Hole** (0.42%) - Lose 50% of current money\n' +
        '🪞 **Cursed Mirror** (0.42%) - Next choice is reversed\n' +
        '😈 **Devil\'s Contract** (0.42%) - Next minigame is Hard Mode\n' +
        '☠️ **Poison Chalice** (0.42%) - Lose $10k for next 3 floors\n' +
        '📜 **Bankruptcy Bill** (0.42%) - Lose ALL money (0%)\n' +
        '⚙️ **Rusty Trap** (0.42%) - Cannot bank/cashout for 5 floors\n' +
        '🌫️ **Fog of War** (0.42%) - Next 3 floors are hidden\n' +
        '⬇️ **Gravity Well** (0.42%) - Lose 80% of current money\n' +
        '🔧 **Sabotage Kit** (0.42%) - Halve multipliers for 4 floors\n' +
        '🥷 **Thief\'s Shadow** (0.42%) - Lose random $10k-$50k\n' +
        '🧭 **Broken Compass** (0.42%) - Next 2 choices are random\n' +
        '💣 **Time Bomb** (0.42%) - Lose $10k per floor until game over\n' +
        '🐍 **Snake Bite** (0.42%) - Invert next floor values\n' +
        '🔒 **Locked Door** (0.42%) - Skip next floor (no reward)\n' +
        '🌩️ **Bad Omen** (0.42%) - Next 3 "Nothing" become Game Over\n' +
        '🏢 **Tower of Cra$h** (0.08%) - Reset leaderboard to 0\n' +
        '✂️ **Cut Front** (1.26%) - Remove first digit of money\n' +
        '🏦 **BRUH Bank** (0.42%) - Donate ALL money to Big Bank\n\n' +
        '**🟡 NEUTRAL ITEMS** (16 items, 1 weight each = 6.8% category)\n' +
        '🔴 **Chaos Orb** (0.42%) - Random ±$50k\n' +
        '🎲 **Gambler\'s Dice** (0.42%) - Roll dice for effect\n' +
        '💭 **Memory Wipe** (0.42%) - Restart current round\n' +
        '🪩 **Mirror Match** (0.42%) - Reverse all digits\n' +
        '🌪️ **Trade Winds** (0.42%) - Swap first and last digits\n' +
        '❓ **Question Mark** (0.42%) - Trigger random minigame\n' +
        '⚖️ **Balance Scale** (0.42%) - Set money to server average\n' +
        '♻️ **Recycler** (0.42%) - Average of last 3 floor values\n' +
        '🃏 **Wild Card** (0.42%) - Completely random effect\n' +
        '⏳ **Hourglass** (0.42%) - Add 2 extra floors to round\n' +
        '📢 **Echo Chamber** (0.42%) - Repeat last floor effect\n' +
        '💍 **Mood Ring** (0.42%) - Effect adapts to your money\n' +
        '🦋 **Butterfly Effect** (0.42%) - Delayed random effect\n' +
        '🚦 **Crossroads** (0.42%) - Choose: $30k or go to lobby\n' +
        '☯️ **Karma Wheel** (0.42%) - Good/bad based on past choices\n' +
        '🔁 **Repeat** (0.42%) - Reset game with same floor pattern\n\n' +
        '**🎮 MINIGAME ITEMS** (8 items, 1 weight each = 3.4% category)\n' +
        '🎲 **Advance to Boardwalk** (0.34%) - Roll dice to reach Boardwalk\n' +
        '🔐 **Bank Buster** (0.34%) - Open 5 locks to crack the vault\n' +
        '🏘️ **Block Party** (0.34%) - Collect all 8 property groups\n' +
        '🎁 **Community Chest** (0.34%) - Pick chests with doubling values\n' +
        '💡 **Electric Company** (0.34%) - Light bulbs without blackout\n' +
        '🏨 **No Vacancy** (0.34%) - Fill 21-room hotel\n' +
        '🚗 **Park It** (0.34%) - Park 10 cars by value\n' +
        '🚂 **Ride the Rails** (0.34%) - Stop trains to collect cash\n\n' +
        '**💰 MONEY ITEMS** (16 items, varying weights = 77.5% category)\n' +
        '🪙 **Pennies** (8.05%) - $1,000\n' +
        '💵 **Pocket Change** (6.78%) - $5,000\n' +
        '💴 **Payday** (5.93%) - $15,000\n' +
        '🎁 **Treasure Chest** (5.08%) - $35,000\n' +
        '🏆 **Gold Bar** (4.24%) - $75,000\n' +
        '💎 **Diamond Cache** (3.39%) - $125,000\n' +
        '👑 **Royal Fortune** (2.54%) - $200,000\n' +
        '📉 **Small Tax** (6.36%) - -$3,000\n' +
        '🎟️ **Parking Ticket** (5.51%) - -$8,000\n' +
        '🧾 **Bill Payment** (4.66%) - -$20,000\n' +
        '📈 **Percentage Boost** (3.81%) - +20% of current money\n' +
        '📊 **Percentage Tax** (3.81%) - -20% of current money\n' +
        '🎰 **Double or Nothing** (2.97%) - x2 or ÷2 current money\n' +
        '🎫 **Lucky Lottery** (2.12%) - Random $1k-$10M\n' +
        '💸 **Debt Collector** (4.24%) - Lose left+right floor values\n' +
        '🧂 **SALT** (14.83%) - NOTHING! ⬅️ Most common item!\n' +
        '🧈🧂 **SSR SALT** (0.42%) - Nothing but salt!'
      )
      .setFooter({ text: 'Percentages = (item weight ÷ 236 total) × 100' });
  }

  static createMysteryBoxInfoEmbeds() {
    // Split into multiple embeds to avoid 4096 character limit
    const embeds = [];

    // Embed 1: Introduction + Good Items + Bad Items (Part 1)
    embeds.push(
      new EmbedBuilder()
        .setColor('#9370DB')
        .setTitle('📦 Mystery Box - Complete Item List (1/3)')
        .setDescription(
          '**All 83 items with rates & descriptions**\n' +
          '*Total Weight: 251.4 | Each box picks from one random category*\n\n' +
          '**🟢 GOOD ITEMS** (23 items, Weight 23)\n' +
          '👁️ **Peek** - View a floor\'s content without revealing left/right\n' +
          '🛡️ **Golden Shield** - Immune to next Game Over\n' +
          '🧲 **Money Magnet** - Double rewards for 3 floors\n' +
          '🍀 **Lucky Clover** - Next 5 floors guaranteed positive\n' +
          '💎 **Instant Jackpot** - Win $100k-$500k instantly\n' +
          '✨ **Divine Intervention** - Skip to highest floor + Find Random 5\n' +
          '🎫 **Golden Ticket** - Play a bonus minigame\n' +
          '🪂 **Safety Net** - No losses for 4 floors\n' +
          '🔮 **Vision Stone** - Reveal next 2 floor contents\n' +
          '🗺️ **Treasure Map** - Add $50k to all remaining floors\n' +
          '🪶 **Phoenix Feather** - Auto-revive on Game Over\n' +
          '👑 **Crown of Greed** - Triple money on next floor\n' +
          '👼 **Angel Wing** - Auto-win next minigame\n' +
          '✋ **Midas Touch** - Convert next 3 "Nothing" to Cash\n' +
          '⭐ **Wish Granter** - Choose any floor to jump to\n' +
          '🏦 **Big Bank** - Claim the entire Big Bank pot\n' +
          '🏦 **Small Bank** - Steal 10% of Big Bank pot\n' +
          '🔮 **Oracle\'s Vision** - Reveal next floor contents\n' +
          '🎪 **Bonus Portal** - Random minigame with 2x rewards\n' +
          '🎁 **Gift Horse** - Give 25% to Big Bank, +2 bonus plays\n' +
          '💸 **Tax Collector** - Lose 20%, immune to next percentage!\n' +
          '🎰 **Lucky 7** - Money x7! Lobby locked next round!\n' +
          '📢 **Announcement** - Reveal money to server, +10% bonus\n\n' +
          '**🔴 BAD ITEMS** (18 items, Weight 18.3)\n' +
          '🕳️ **Black Hole** - Lose 50% of current money\n' +
          '🪞 **Cursed Mirror** - Next choice is reversed\n' +
          '😈 **Devil\'s Contract** - Next minigame is Hard Mode\n' +
          '☠️ **Poison Chalice** - Lose $10k for next 3 floors\n' +
          '📜 **Bankruptcy Bill** - Lose ALL money (0%)\n' +
          '⚙️ **Rusty Trap** - Cannot bank/cashout for 5 floors\n' +
          '🌫️ **Fog of War** - Next 3 floors are hidden\n' +
          '⬇️ **Gravity Well** - Lose 80% of current money\n' +
          '🔧 **Sabotage Kit** - Halve multipliers for 4 floors\n' +
          '🥷 **Thief\'s Shadow** - Lose random $10k-$50k\n' +
          '🧭 **Broken Compass** - Next 2 choices are random\n' +
          '💣 **Time Bomb** - Lose $10k per floor until game over\n' +
          '🐍 **Snake Bite** - Invert next floor values\n' +
          '🔒 **Locked Door** - Skip next floor (no reward)\n' +
          '🌩️ **Bad Omen** - Next 3 "Nothing" become Game Over\n' +
          '🏢 **Tower of Cra$h** - Reset leaderboard to 0\n' +
          '✂️ **Cut Front** - Remove first digit of money\n' +
          '🏦 **BRUH Bank** - Donate ALL money to Big Bank'
        )
    );

    // Embed 2: Neutral Items + Minigame Items
    embeds.push(
      new EmbedBuilder()
        .setColor('#9370DB')
        .setTitle('📦 Mystery Box - Complete Item List (2/3)')
        .setDescription(
          '**🟡 NEUTRAL ITEMS** (19 items, Weight 19)\n' +
          '🔴 **Chaos Orb** - Random ±$50k\n' +
          '🎲 **Gambler\'s Dice** - Roll dice for effect\n' +
          '💭 **Memory Wipe** - Restart current round\n' +
          '🪩 **Mirror Match** - Reverse all digits\n' +
          '🌪️ **Trade Winds** - Swap first and last digits\n' +
          '❓ **Question Mark** - Trigger random minigame\n' +
          '⚖️ **Balance Scale** - Set money to server average\n' +
          '♻️ **Recycler** - Average of last 3 floor values\n' +
          '🃏 **Wild Card** - Completely random effect\n' +
          '⏳ **Hourglass** - Add 2 extra floors to round\n' +
          '📢 **Echo Chamber** - Repeat last floor effect\n' +
          '💍 **Mood Ring** - Effect adapts to your money\n' +
          '🦋 **Butterfly Effect** - Delayed random effect\n' +
          '🚦 **Crossroads** - Choose: $30k or go to lobby\n' +
          '☯️ **Karma Wheel** - Good/bad based on past choices\n' +
          '🔁 **Repeat** - Reset game with same floor pattern\n' +
          '🎲 **Double or Nothing** - 50/50: Double or Lose 50%\n' +
          '🔄 **Malfunction** - Random money (-999M to +999M)\n' +
          '⚡ **Lightning Round** - Skip to final round immediately\n\n' +
          '**🎮 MINIGAME ITEMS** (8 items, 1 weight each = 3.4% category)\n' +
          '🎲 **Advance to Boardwalk** (0.34%) - Roll dice to reach Boardwalk\n' +
          '🔐 **Bank Buster** (0.34%) - Open 5 locks to crack the vault\n' +
          '🏘️ **Block Party** (0.34%) - Collect all 8 property groups\n' +
          '🎁 **Community Chest** (0.34%) - Pick chests with doubling values\n' +
          '💡 **Electric Company** (0.34%) - Light bulbs without blackout\n' +
          '🏨 **No Vacancy** (0.34%) - Fill 21-room hotel\n' +
          '🚗 **Park It** (0.34%) - Park 10 cars by value\n' +
          '🚂 **Ride the Rails** (0.34%) - Stop trains to collect cash'
        )
    );

    // Embed 3: Money Items
    embeds.push(
      new EmbedBuilder()
        .setColor('#9370DB')
        .setTitle('📦 Mystery Box - Complete Item List (3/3)')
        .setDescription(
          '**💰 MONEY ITEMS** (16 items, varying weights = 77.5% category)\n' +
          '🪙 **Pennies** (8.05%) - $1,000\n' +
          '💵 **Pocket Change** (6.78%) - $5,000\n' +
          '💴 **Payday** (5.93%) - $15,000\n' +
          '🎁 **Treasure Chest** (5.08%) - $35,000\n' +
          '🏆 **Gold Bar** (4.24%) - $75,000\n' +
          '💎 **Diamond Cache** (3.39%) - $125,000\n' +
          '👑 **Royal Fortune** (2.54%) - $200,000\n' +
          '📉 **Small Tax** (6.36%) - -$3,000\n' +
          '🎟️ **Parking Ticket** (5.51%) - -$8,000\n' +
          '🧾 **Bill Payment** (4.66%) - -$20,000\n' +
          '📈 **Percentage Boost** (3.81%) - +20% of current money\n' +
          '📊 **Percentage Tax** (3.81%) - -20% of current money\n' +
          '🎰 **Double or Nothing** (2.97%) - x2 or ÷2 current money\n' +
          '🎫 **Lucky Lottery** (2.12%) - Random $1k-$10M\n' +
          '💸 **Debt Collector** (4.24%) - Lose left+right floor values\n' +
          '🧂 **SALT** (14.83%) - NOTHING! ⬅️ Most common item!\n' +
          '🧈🧂 **SSR SALT** (0.42%) - Nothing but salt!'
        )
        .setFooter({ text: 'Percentages = (item weight ÷ 236 total) × 100' })
    );

    return embeds;
  }

  static createMinigameDetailEmbed() {
    return new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('📦 Mystery Box - Complete Guide')
      .setDescription(
        '**What\'s Inside? 8 Minigames + 67 Special Items!**\n\n' +

        '━━━━━ **🎮 8 MINIGAMES ($3M JACKPOTS!)** ━━━━━\n' +
        '**🎁 Community Chest** - Pick chests, x2/x3 multipliers\n' +
        '**🔐 Bank Buster** - Open 5 locks, avoid 2 busts\n' +
        '**🏘️ Block Party** - Find 8 properties (3 strikes)\n' +
        '**🚗 Park It** - Fill 5 garage levels\n' +
        '**🏦 No Vacancy** - Fill 21-room hotel\n' +
        '**🎲 Boardwalk** - Roll to space 13, avoid danger\n' +
        '**🚂 Ride Rails** - Bank $500k+ ($3M Jackpot!)\n' +
        '**💡 Power Grid** - Light exactly 10 bulbs\n\n' +

        '━━━━━ **💎 TOP ITEMS** ━━━━━\n' +
        '🛡️ **Golden Shield** - Immune to Game Over\n' +
        '🎫 **Golden Ticket** - Bonus minigame!\n' +
        '🏦 **Big Bank** - Claim entire pot\n' +
        '✨ **Divine Intervention** - Skip to highest\n' +
        '👑 **Royal Fortune** - $200,000\n\n' +

        '━━━━━ **⚠️ WATCH OUT FOR** ━━━━━\n' +
        '🕳️ **Black Hole** - Lose 50% money\n' +
        '😈 **Devil\'s Contract** - Hard mode minigame\n' +
        '💸 **Debt Collector** - Lose adjacent floors\n' +
        '🧂 **SALT** - Nothing (14.83% - most common!)\n\n' +

        '**Type `/mystery-box-items` for full 75-item list!**'
      )
      .setFooter({ text: '🎰 Each box = Random item from weighted pool' });
  }

  // === HOW MUCH IS ENOUGH? (HMIE) LOBBY UI ===

  static createHMIELobbyEmbed(lobby, secondsRemaining) {
    const maxPlayers = 4;
    let playerList = '';

    for (let i = 0; i < maxPlayers; i++) {
      if (i < lobby.players.length) {
        const player = lobby.players[i];
        playerList += `${i + 1}. **${player.name}** ${player.isBot ? '🤖' : '✅'}\n`;
      } else {
        playerList += `${i + 1}. _Empty slot_\n`;
      }
    }

    const playersNeeded = maxPlayers - lobby.players.length;
    const statusText = lobby.players.length >= 4
      ? '✅ **Lobby Full! Starting soon...**'
      : `⏰ **${playersNeeded} more player${playersNeeded !== 1 ? 's' : ''} needed**`;

    return new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('💰 HMIE LOBBY 💰')
      .setDescription(
        `**How Much Is Enough? - Waiting for players...**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**👥 PLAYERS (${lobby.players.length}/4):**\n${playerList}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${statusText}\n\n` +
        `⏱️ **Time Remaining:** ${secondsRemaining} seconds\n\n` +
        `**How to join:**\n` +
        `• Click "Join Game" to participate\n` +
        `• Click "Leave Game" to exit lobby\n` +
        `• Admin can "Start Now" with 2+ players\n\n` +
        `*Remaining slots will auto-fill with bots!*`
      )
      .setFooter({ text: 'Game starts when lobby is full or timer expires' });
  }

  static createHMIELobbyButtons(isAdmin, playerCount) {
    const buttons = [
      new ButtonBuilder()
        .setCustomId('hmie_join')
        .setLabel('Join Game')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('hmie_leave')
        .setLabel('Leave Game')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    ];

    // Add "Start Now" button for admins if 2+ players
    if (isAdmin && playerCount >= 2) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('hmie_start_now')
          .setLabel('Start Now')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('▶️')
      );
    }

    return [new ActionRowBuilder().addComponents(buttons)];
  }

  // === HOW MUCH IS ENOUGH? (HMIE) UI ===

  static createHMIEIntroEmbed(game) {
    const players = game.hmieState.players.map((p, i) =>
      `**${i + 1}.** ${p.name}${p.isBot ? ' 🤖' : ''}`
    ).join('\n');

    return new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('💰 HOW MUCH IS ENOUGH? 💰')
      .setDescription(
        `**The ultimate game of greed and strategy!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🎮 PLAYERS:**\n${players}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**📜 GAME RULES:**\n` +
        `• **5 Rounds** with increasing money clocks\n` +
        `• Round 1: Up to $10,000\n` +
        `• Round 2: Down from $20,000\n` +
        `• Round 3: Up to $30,000\n` +
        `• Round 4: Down from $40,000\n` +
        `• Round 5: Up to $50,000\n\n` +
        `**💡 HOW TO PLAY:**\n` +
        `• Watch the money clock count up or down\n` +
        `• Press 🔒 LOCK IN when you want that amount\n` +
        `• **GREEDIEST player each round gets $0!**\n` +
        `• Everyone else keeps their locked amount\n\n` +
        `**⚠️ ROUND 5 TWIST:**\n` +
        `• **GREEDIEST** player gets $0 (as usual)\n` +
        `• **MOST CAUTIOUS** player also gets $0!\n` +
        `• Top 2 money winners advance to Face-Off\n\n` +
        `**🏆 FINAL FACE-OFF:**\n` +
        `• Both finalists' money combined\n` +
        `• Clock counts up to that total\n` +
        `• First to press button WINS that amount!\n` +
        `• Other player gets NOTHING!\n\n` +
        `**Ready to test your greed?**`
      )
      .setFooter({ text: '5 Rounds • Be greedy, but not TOO greedy!' });
  }

  static createHMIERoundEmbed(game, round, maximum, direction) {
    const arrow = direction === 'up' ? '⬆️' : '⬇️';
    const startValue = direction === 'up' ? '$0' : `$${this.formatMoney(maximum)}`;
    const endValue = direction === 'up' ? `$${this.formatMoney(maximum)}` : '$0';

    return new EmbedBuilder()
      .setColor('#4169E1')
      .setTitle(`💰 ROUND ${round}/5 ${arrow}`)
      .setDescription(
        `**Money Clock:** ${startValue} → ${endValue}\n\n` +
        `**Remember:**\n` +
        `• Lock in when you think you have enough\n` +
        `• Greediest player gets $0!\n` +
        (round === 5 ? `• ⚠️ Most cautious ALSO gets $0!\n` : '') +
        `\n**Get ready...**`
      );
  }

  static createMoneyClockEmbed(game, currentValue) {
    const round = game.hmieState.currentRound;
    const maximum = game.getHMIERoundMax();
    const direction = game.getHMIERoundDirection();
    const percentage = Math.floor((currentValue / maximum) * 100);

    // Progress bar
    const barLength = 20;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filled = Math.max(0, Math.min(barLength, Math.floor((clampedPercentage / 100) * barLength)));
    const empty = Math.max(0, barLength - filled);
    const progressBar = '🟩'.repeat(filled) + '⬜'.repeat(empty);

    // Count locked players
    const activePlayers = game.hmieState.players.filter(p => !p.eliminated);
    const lockedCount = activePlayers.filter(p => p.hasLocked).length;

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 ROUND ${round}/5 - MONEY CLOCK`)
      .setDescription(
        `**Current Value:** $${this.formatMoney(currentValue)}\n\n` +
        `${progressBar} ${percentage}%\n\n` +
        `**Locked Players:** ?/${activePlayers.length}\n\n` +
        `**Press 🔒 LOCK IN to secure this amount!**`
      );
  }

  static createFaceOffClockEmbed(game, currentValue) {
    const maximum = game.hmieState.faceOffMax;
    const percentage = Math.floor((currentValue / maximum) * 100);

    // Progress bar
    const barLength = 20;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filled = Math.max(0, Math.min(barLength, Math.floor((clampedPercentage / 100) * barLength)));
    const empty = Math.max(0, barLength - filled);
    const progressBar = '🟩'.repeat(filled) + '⬜'.repeat(empty);

    const finalists = game.hmieState.players.filter(p => !p.eliminated);
    const finalistNames = finalists.map(p => `**${p.name}**`).join(' vs ');

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 FINAL FACE-OFF 🏆')
      .setDescription(
        `${finalistNames}\n\n` +
        `**Current Value:** $${this.formatMoney(currentValue)}\n\n` +
        `${progressBar} ${percentage}%\n\n` +
        `**First to press their button wins!**\n` +
        `**Winner takes all: $${this.formatMoney(currentValue)}**`
      );
  }

  static createIndividualPlayerRevealEmbed(game, playerResult, statusMessage, revealNumber, totalPlayers) {
    const { playerName, lockedAmount, totalBanked } = playerResult;

    // Use neutral blue color during reveal - penalties haven't been determined yet
    const color = '#2196F3';

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`📊 Player ${revealNumber}/${totalPlayers} Revealed`)
      .setDescription(
        `**${playerName}**\n\n` +
        `💰 **Locked Amount:** $${this.formatMoney(lockedAmount)}\n` +
        `🏦 **Current Total:** $${this.formatMoney(totalBanked)}\n\n` +
        statusMessage
      );
  }

  static createRoundResultEmbed(game, results) {
    let description = `**ROUND ${results.round} RESULTS**\n\n`;

    results.results.forEach(r => {
      const emoji = r.awarded > 0 ? '✅' : '❌';
      const status = r.isGreediest ? ' (GREEDIEST)' : r.isCautious ? ' (MOST CAUTIOUS)' : '';

      // Handle null values with defaults
      const lockedAmount = r.lockedAmount || 0;
      const awarded = r.awarded || 0;

      description += `${emoji} **${r.playerName}**${status}\n`;
      description += `   Locked: $${this.formatMoney(lockedAmount)} → Awarded: $${this.formatMoney(awarded)}\n`;
      description += `   💰 **Total: $${this.formatMoney(r.totalBanked)}**\n\n`;
    });

    if (results.greediest) {
      description += `\n🎯 **${results.greediest}** was the greediest → $0!\n`;
    }
    if (results.mostCautious) {
      description += `🛡️ **${results.mostCautious}** was most cautious → $0!\n`;
    }

    return new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('📊 ROUND COMPLETE!')
      .setDescription(description);
  }

  static createEliminationEmbed(game, elimination) {
    let description = `**TOP 2 ADVANCE TO FINAL FACE-OFF!**\n\n`;

    description += `**🏆 FINALISTS:**\n`;
    elimination.finalists.forEach((p, i) => {
      description += `${i + 1}. **${p.name}** - $${this.formatMoney(p.bankedMoney)}\n`;
    });

    description += `\n**❌ ELIMINATED:**\n`;
    elimination.eliminated.forEach((p, i) => {
      description += `${i + 1}. **${p.name}** - $${this.formatMoney(p.bankedMoney)}\n`;
    });

    return new EmbedBuilder()
      .setColor('#DC143C')
      .setTitle('⚔️ FINAL FACE-OFF!')
      .setDescription(description);
  }

  static createFaceOffIntroEmbed(game, faceOffData) {
    const [p1, p2] = faceOffData.finalists;

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 FINAL FACE-OFF 🏆')
      .setDescription(
        `**THE ULTIMATE SHOWDOWN!**\n\n` +
        `**${p1.name}:** $${this.formatMoney(p1.bankedMoney)}\n` +
        `**${p2.name}:** $${this.formatMoney(p2.bankedMoney)}\n\n` +
        `**Combined Total:** $${this.formatMoney(faceOffData.combinedTotal)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**⚡ THE RULES:**\n` +
        `• Money clock counts from $0 to $${this.formatMoney(faceOffData.combinedTotal)}\n` +
        `• First player to press their button STOPS the clock\n` +
        `• That player WINS the amount shown!\n` +
        `• Other player gets NOTHING!\n\n` +
        `**Who will react fastest?**`
      )
      .setFooter({ text: 'Winner takes all! • Loser gets nothing!' });
  }

  static createFaceOffResultEmbed(game, result) {
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 WINNER! 🏆')
      .setDescription(
        `**${result.winner.name} WINS!**\n\n` +
        `**Stopped clock at:** $${this.formatMoney(result.clockValue)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏆 WINNER:** ${result.winner.name}\n` +
        `**💰 Prize:** $${this.formatMoney(result.winner.winnings)}\n\n` +
        `**❌ Runner-Up:** ${result.loser.name}\n` +
        `**💸 Prize:** $${this.formatMoney(result.loser.winnings)}\n\n` +
        `**Congratulations to ${result.winner.name}!**`
      )
      .setFooter({ text: 'Game Over • Thanks for playing!' });
  }

  // === ACHIEVEMENT UI EMBEDS ===

  static createAchievementsListEmbed(userId, username, achievements, progress) {
    const { TowerAchievements, AchievementType } = require('./TowerAchievements');
    
    let description = `**Player:** ${username}\n`;
    description += `**Progress:** ${progress.earned}/${progress.total} (${progress.percentage}%)\n\n`;
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Group by category
    const categories = [
      AchievementType.MILESTONE.name,
      AchievementType.EVENT.name,
      AchievementType.MINIGAME.name,
      AchievementType.GAME_OVER.name
    ];

    for (const categoryName of categories) {
      const categoryAchievements = achievements.filter(a => a.type.name === categoryName);
      if (categoryAchievements.length > 0) {
        const category = Object.values(AchievementType).find(t => t.name === categoryName);
        description += `**${categoryName}** (${categoryAchievements.length} earned)\n`;
        for (const achievement of categoryAchievements) {
          description += `${achievement.emoji} ${achievement.name}\n`;
        }
        description += '\n';
      }
    }

    if (achievements.length === 0) {
      description += '*No achievements earned yet. Keep playing!*\n';
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Tower of Cash - Achievements 🏆')
      .setDescription(description)
      .setFooter({ text: `${progress.earned}/${progress.total} achievements unlocked` })
      .setTimestamp();
  }

  static createAchievementsCategoryEmbed(categoryName, allAchievements, earnedAchievements) {
    const { AchievementType } = require('./TowerAchievements');
    const category = Object.values(AchievementType).find(t => t.name === categoryName);
    
    if (!category) {
      return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Invalid Category')
        .setDescription('Category not found.');
    }

    const categoryAchievements = allAchievements.filter(([_, a]) => a.type.name === categoryName);
    const earnedIds = new Set(earnedAchievements.map(a => a.id));

    let description = `**${categoryName} Achievements**\n\n`;
    
    for (const [id, achievement] of categoryAchievements) {
      const earned = earnedIds.has(id);
      const status = earned ? '✅' : '🔒';
      description += `${status} ${achievement.emoji} **${achievement.name}**\n`;
      description += `   *${achievement.description}*\n\n`;
    }

    const earned = categoryAchievements.filter(([id, _]) => earnedIds.has(id)).length;
    const total = categoryAchievements.length;

    return new EmbedBuilder()
      .setColor(category.color)
      .setTitle(`🏆 ${categoryName} Achievements`)
      .setDescription(description)
      .setFooter({ text: `${earned}/${total} unlocked` })
      .setTimestamp();
  }
  // --- Who has only one EGG??? UI Methods ---

  static createOneEggLobbyEmbed(hostedBy, lobby = null) {
    // Show player slots similar to HMIE but for 2 players
    const maxPlayers = 2;
    let playerList = '';
    // Normalize players array: if lobby.players missing, fall back to host as first player
    const playersArray = (lobby && Array.isArray(lobby.players))
      ? lobby.players
      : (lobby && lobby.host ? [ { name: lobby.host.username || hostedBy, username: lobby.host.username, isBot: false } ] : []);

    for (let i = 0; i < maxPlayers; i++) {
      if (i < playersArray.length) {
        const player = playersArray[i];
        playerList += `${i + 1}. **${player.name || player.username || hostedBy}** ${player.isBot ? '🤖' : '✅'}\n`;
      } else {
        playerList += `${i + 1}. _Empty slot_\n`;
      }
    }

    const playersNeeded = maxPlayers - playersArray.length;
    const statusText = playersArray.length >= maxPlayers
      ? '✅ **Lobby Full! Starting soon...**'
      : `⏰ **${playersNeeded} more player${playersNeeded !== 1 ? 's' : ''} needed**`;

    return new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle('🥚 Who has only one EGG??? 🥚')
      .setDescription(
        `**👥 PLAYERS (${playersArray.length}/2):**\n${playerList}\n` +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        `**Goal:** Collect exactly **2 eggs** to win.\n` +
        '⚠️ If you have exactly **1 egg**, you LOSE immediately!\n\n' +
        `${statusText}`
      )
      .setFooter({ text: 'One Egg — Goal: Exact 2 eggs to win • Use /one-egg play to start' })
      .setTimestamp();
  }

  static createOneEggLobbyEmbedWithTimer(hostedBy, secondsRemaining, lobby = null) {
    const base = this.createOneEggLobbyEmbed(hostedBy, lobby);
    if (typeof secondsRemaining === 'number') {
      base.setDescription(base.data.description + `\n\n⏱️ Time remaining: **${secondsRemaining}s**`);
    }
    return base;
  }

  static createOneEggLobbyButtons(hostId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`one_egg_join_${hostId}`)
        .setLabel('⚔️ Join Challenger')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('one_egg_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );
  }

  static createOneEggStarterEmbed(game) {
    return new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('📦 Starter Box Selection')
      .setDescription(
        `**${game.players.left.username}** vs **${game.players.right.username}**\n\n` +
        'Choose a Starter Box to determine your initial egg count.\n' +
        'The player with **more eggs** decides who plays first!'
      )
      .addFields(
        { name: 'Left Player', value: `${game.players.left.username}\n📦 Capacity: ${game.players.left.maxEggs || 6}`, inline: true },
        { name: 'Right Player', value: `${game.players.right.username}\n📦 Capacity: ${game.players.right.maxEggs || 6}`, inline: true }
      )
      .setFooter({ text: 'One Egg — Goal: Exact 2 eggs to win • Use /one-egg play to start' })
      .setTimestamp();
  }

  static createOneEggStarterWaitingEmbed(game, side) {
    const player = game.players[side];
    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('⏳ Waiting for opponent...')
      .setDescription(
        `You selected your starter box, **${player.username}**.` +
        `\n\nPlease wait for the other player to pick their box.`
      )
      .setFooter({ text: 'Waiting — no actions available until both players have picked' })
      .setTimestamp();
  }

  // --- ONE EGG UI ---

  static createOneEggCartonEmbed(game) {
    const leftPlayer = game.players.left;
    const rightPlayer = game.players.right;
    
    // Status text
    const leftStatus = game.cartonSelections.left !== undefined ? '✅ Selected' : '🤔 Choosing...';
    const rightStatus = game.cartonSelections.right !== undefined ? '✅ Selected' : '🤔 Choosing...';

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🥚 One Egg - Select Your Carton')
      .setDescription(
        `**Welcome to One Egg!**\n` +
        `Before we begin, you must select an Egg Carton to store your eggs.\n` +
        `Each carton has a different **Maximum Capacity**.\n\n` +
        `**📦 Carton Option:**\n` +
        `There are 10 cartons in the pile. Pick wisely!\n` +
        `• **Tiny:** Max 1 egg (Danger!)\n` +
        `• **Small:** Max 2 eggs\n` +
        `• **Medium:** Max 3 eggs\n` +
        `• **Standard:** Max 4 eggs\n` +
        `• **Large:** Max 5 eggs\n` +
        `• **Extra Large:** Max 6 eggs\n` +
        `• **Huge:** Max 7 eggs\n` +
        `• **Gigantic:** Max 8 eggs\n\n` +
        `**Warning:** If you exceed your carton's capacity, you will be forced to sell excess eggs!\n\n` +
        `**Players:**\n` +
        `🟢 **${leftPlayer.username}:** ${leftStatus}\n` +
        `🔵 **${rightPlayer.username}:** ${rightStatus}`
      )
      .setFooter({ text: 'Pick a carton number (1-10)' });
  }

  static createOneEggCartonButtons(game) {
      const rows = [];
      // 10 buttons: 1-5, 6-10
      const row1 = new ActionRowBuilder();
      const row2 = new ActionRowBuilder();
      
      for(let i=0; i<5; i++) {
          const isTaken = Object.values(game.cartonSelections).includes(i);
          row1.addComponents(
              new ButtonBuilder()
                .setCustomId(`one_egg_carton_${i}`)
                .setLabel(`${i+1}`)
                .setStyle(isTaken ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(isTaken)
          );
      }
      
      for(let i=5; i<10; i++) {
          const isTaken = Object.values(game.cartonSelections).includes(i);
          row2.addComponents(
              new ButtonBuilder()
                .setCustomId(`one_egg_carton_${i}`)
                .setLabel(`${i+1}`)
                .setStyle(isTaken ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(isTaken)
          );
      }
      
      rows.push(row1, row2);
      return rows;
  }

  static createOneEggHelpEmbed() {
    return new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🥚 One Egg Rules & Items')
      .setDescription(
        '**Objective:**\n' +
        'Have exactly **2 Eggs** (or the Target Amount) in your carton to WIN!\n' +
        'Have **1 Egg** = LOSE immediately!\n\n' +
        '**📦 Phase 1: Carton Selection**\n' +
        'Pick a carton to determine your MAX capacity (1-8 eggs).\n' +
        'Exceeding capacity sells excess eggs for cash.\n\n' +
        '**🎲 Phase 2: The Game**\n' +
        'Take turns picking boxes. Boxes may contain:\n' +
        '• 🥚 **Egg:** Adds 1-2 eggs\n' +
        '• 🥚➕ **Plus Egg:** Adds 1 egg\n' +
        '• 🕸️ **Net:** Steal eggs from opponent\n' +
        '• 🔨 **Hammer:** Smash opponent\'s eggs\n' +
        '• 🎁 **Gift:** Give your eggs to opponent\n' +
        '• 👵 **Old Egg:** Immune to steal/give (Count: 1-3)\n' +
        '• 👯 **Twin Egg:** Worth 2 eggs\n' +
        '• 🎫 **Ticket:** Set eggs to 2 OR Change Win Condition (2-6)\n' +
        '• 🥚💩 **Rotten Egg:** Reset ALL eggs to 0\n' +
        '• ✨ **Golden Egg:** +$300,000 (Does not count as egg)\n' +
        '• 📦✨ **New Carton:** Sell all eggs & get random size (1-8)\n\n' +
        '**⚡ Final Gamble:**\n' +
        'If you lose, you get one final chance to Double or Halve your money!'
      )
      .setFooter({ text: 'Season 1 • One Egg • Goal: Target Amount to win • Use /one-egg play to start' })
      .setTimestamp();
  }

  static createOneEggIntroEmbed() {
    return new EmbedBuilder()
      .setColor('#FFF2CC')
      .setTitle('🥚 One Egg — Introduction')
      .setDescription(
        '**Who has only one EGG???** is a 2-player game of risk and timing.' +
        '\n\n**Objective:** Be the first player to hold the **Target Amount** of eggs (Default 2) to win. If you have **1 egg**, you LOSE immediately.' +
        '\n\n**Phases:**\n' +
        '• **Carton Selection:** Choose a carton to set your max egg capacity (1-8).\n' +
        '• **Starter Phase:** Pick a starter box to get initial eggs (0-6).\n' +
        '• **Main Rounds:** Take turns picking boxes with eggs, items, or special effects.\n' +
        '• **Final Gamble:** A chance to recover if you lose!\n\n' +
        '**Items & Outcomes:**\n' +
        '• Eggs: Increase your egg count.\n' +
        '• Net / Hammer / Gift: Attack opponent or transfer eggs.\n' +
        '• Special tickets: Change win condition or egg count.\n\n' +
        'Use `/one-egg play` to start a lobby and `/one-egg stats` to view your stats.'
      )
      .setFooter({ text: 'Season 1 • One Egg • Goal: Target Amount to win' })
      .setTimestamp();
  }

  static createOneEggStarterButtons(game) {
    // 6 Buttons for Starter Boxes
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    const taken = Object.values(game.boxSelections || {});
    for (let i = 0; i < 6; i++) {
      const isTaken = taken.includes(i);
      const btn = new ButtonBuilder()
        .setCustomId(`one_egg_starter_${i}`)
        .setLabel(`📦 Box ${i+1}${isTaken ? ' (Taken)' : ''}`)
        .setStyle(isTaken ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isTaken);
        
      if (i < 3) row1.addComponents(btn);
      else row2.addComponents(btn);
    }
    return [row1, row2];
  }

  static createOneEggMainEmbed(game, roundResults) {
    const p1 = game.players.left;
    const p2 = game.players.right;
    const turnPlayer = game.getCurrentTurnPlayer();
    
    let description = `**Round ${game.round} / 4**\n\n` +
        `**Turn:** ${turnPlayer ? turnPlayer.username : 'Waiting'}\n` +
        'Select a box below!';

    if (roundResults) {
        description = `**Round ${game.round-1} Results:**\n` +
            roundResults.map(r => `${r.player === 'left' ? '⬅️' : '➡️'} **${game.players[r.player].username}**: ${r.message}`).join('\n') + 
            `\n\n${description}`;
    }

    // Oracle's Vision or Announcement logic
    if (game.seeAllBoxes || game.revealOpponentNext) {
        description += `\n\n✨ **DIVINE REVEAL:**\n`;
        game.currentBoxes.forEach((box, idx) => {
            const isTaken = Object.values(game.boxSelections || {}).includes(idx);
            description += `📦 Box ${idx+1}: ${box.label}${isTaken ? ' (Picked)' : ''}\n`;
        });
        // Reset revealOpponentNext if boxes are shown? 
        // No, let it stay for the round.
    }

    return new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('🥚 Who has only one EGG??? 🥚')
      .setDescription(description)
      .addFields(
        { name: `${p1.username} (Left)`, value: `🥚 Eggs: max 6\n📦 Tray: ${this.renderEggTray(p1.eggs)}\n💰 Money: $${p1.money}`, inline: true },
        { name: `${p2.username} (Right)`, value: `🥚 Eggs: max 6\n📦 Tray: ${this.renderEggTray(p2.eggs)}\n💰 Money: $${p2.money}`, inline: true }
      )
      .setFooter({ text: 'Season 1 • One Egg • Goal: Target Amount to win • Use /one-egg play to start' })
      .setTimestamp();
  }
  
  static renderEggTray(count) {
    const eggs = Math.max(0, count || 0);
    const tray = '🥚'.repeat(eggs) + '⬜'.repeat(Math.max(0, 6 - eggs));
    return tray;
  }

  static createOneEggBoxButtons(game) {
    const row = new ActionRowBuilder();
    // 3 Boxes
    const taken = Object.values(game.boxSelections || {});
    for (let i = 0; i < 3; i++) {
      const isTaken = taken.includes(i);
      const box = game.currentBoxes[i];
      let label = `📦 Box ${i+1}${isTaken ? ' (Taken)' : ''}`;

      row.addComponents(
         new ButtonBuilder()
        .setCustomId(`one_egg_box_${i}`)
        .setLabel(label)
        .setStyle(isTaken ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isTaken)
      );
    }
    return [row];
  }

  static createOneEggEndEmbed(game, winnerSide) {
      const winner = game.players[winnerSide];
      const loser = game.players[winnerSide === 'left' ? 'right' : 'left'];
      
      return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🏆 GAME OVER! 🏆')
        .setDescription(
            `**${winner.username} WINS!**\n\n` +
            `🎉 **Reason:** Reached exactly 2 Eggs!\n` + 
            (game.phase === 'LOSS' ? `(Opponent reached 1 Egg and Lost!)` : '') + 
            `\n\n**Winner Earnings:** $${winner.money}\n` +
            `**Loser Earnings:** $${loser.money}`
        )
        .setFooter({ text: 'Season 1 • One Egg • Goal: Target Amount to win • Bonus Round: Champion vs Loser' })
        .setTimestamp();
  }

  // === ONE EGG ROUND SUMMARY EMBED ===
  
  static createOneEggRoundSummaryEmbed(game, roundNum, results) {
    const p1 = game.players.left;
    const p2 = game.players.right;
    
    let description = `## 📊 Round ${roundNum} Complete!\n\n`;
    
    // Show what happened this round
    if (results && results.length > 0) {
      description += `**What Happened:**\n`;
      results.forEach(res => {
        const side = res.player || res.side;
        if (side && game.players && game.players[side]) {
          const player = game.players[side];
          const emoji = side === 'left' ? '🅰️' : '🅱️';
          const message = res.message || 'Action taken';
          description += `${emoji} **${player.username}**: ${message}\n`;
        }
      });
      description += `\n`;
    }
    
    // Show current game state
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    description += `**Current Standings:**\n\n`;
    description += `🅰️ **${p1.username}**\n`;
    // Use game's formatEggDisplay if available, otherwise create egg tray manually
    const leftEggs = (game.formatEggDisplay && typeof game.formatEggDisplay === 'function') 
      ? game.formatEggDisplay('left') 
      : this.renderEggTray(p1.eggs || 0);
    description += `   Eggs: ${leftEggs}\n`;
    description += `   💰 Money: $${this.formatMoney(p1.money || 0)}\n\n`;
    description += `🅱️ **${p2.username}**\n`;
    const rightEggs = (game.formatEggDisplay && typeof game.formatEggDisplay === 'function') 
      ? game.formatEggDisplay('right') 
      : this.renderEggTray(p2.eggs || 0);
    description += `   Eggs: ${rightEggs}\n`;
    description += `   💰 Money: $${this.formatMoney(p2.money || 0)}\n\n`;
    
    // Check win conditions
    if (p1.eggs === 2) {
      description += `⚠️ **${p1.username}** has 2 eggs and WINS!\n`;
    } else if (p1.eggs === 1) {
      description += `⚠️ **${p1.username}** has 1 egg and LOSES!\n`;
    }
    if (p2.eggs === 2) {
      description += `⚠️ **${p2.username}** has 2 eggs and WINS!\n`;
    } else if (p2.eggs === 1) {
      description += `⚠️ **${p2.username}** has 1 egg and LOSES!\n`;
    }
    
    return new EmbedBuilder()
      .setColor('#00CED1')
      .setTitle(`🎯 Round ${roundNum} Summary`)
      .setDescription(description)
      .setFooter({ text: `Season 1 • One Egg — Round ${roundNum}/${game.round <= 4 ? '4' : 'Final'}` })
      .setTimestamp();
  }

    static createOneEggBonusLoserPickEmbed(game) {
      const champ = game.players[game.winner];
      const loser = game.players[game.loser];
      return new EmbedBuilder()
        .setColor('#FF1744')
        .setTitle('💀 LOSER\'S GAMBLE — CHOOSE YOUR CHAMPION\'S FATE!')
        .setDescription(
          `## 🎲 The Power is in YOUR Hands\n\n` +
          `👑 **Champion:** ${champ.username} ($${this.formatMoney(champ.money || 0)})\n` +
          `💀 **Loser:** ${loser.username} ($${this.formatMoney(loser.money || 0)})\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**Pick ONE sealed box to give to the Champion:**\n\n` +
          `📦 **Box A** or **Box B**?\n\n` +
          `One contains **🥚🥚 2 EGGS** (+$150,000 for Champion!)\n` +
          `One contains **🥚 1 EGG** (-$30,000 for Champion, +$30,000 for YOU!)\n\n` +
          `⚠️ Choose wisely — their fate is in your hands!`
        )
        .setFooter({ text: 'Season 1 • One Egg — Bonus Round: Your choice changes EVERYTHING' })
        .setTimestamp();
    }

    static createOneEggBonusLoserPickButtons(loserId) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`one_egg_bonus_pick_${loserId}_0`).setLabel('📦 Box A').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`one_egg_bonus_pick_${loserId}_1`).setLabel('📦 Box B').setStyle(ButtonStyle.Primary)
      );
    }

    static createOneEggBonusChampionDecisionEmbed(game) {
      const champ = game.players[game.winner];
      const loser = game.players[game.loser];
      return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('👑 CHAMPION\'S FATE — THE ULTIMATE DECISION!')
        .setDescription(
          `## ⚡ ${champ.username}, Your Destiny Awaits!\n\n` +
          `**Your Current Balance:** $${this.formatMoney(champ.money || 0)}\n` +
          `**${loser.username}'s Balance:** $${this.formatMoney(loser.money || 0)}\n\n` +
          `The sealed box is in your hands...\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `### 🎰 OPEN THE BOX:\n` +
          `🥚🥚 **2 EGGS** = **+$150,000 JACKPOT!** 💰💰💰\n` +
          `🥚 **1 EGG** = **-$30,000 DISASTER!** 💀💸\n\n` +
          `### 🛡️ DECLINE (SAFE PLAY):\n` +
          `Take guaranteed **+$20,000** 💵\n` +
          `Pass the box to ${loser.username} — let THEM risk it!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ **Will you RISK IT ALL or play it SAFE?**`
        )
        .setFooter({ text: 'Season 1 • One Egg — Champion Decision: Fortune favors the BOLD!' })
        .setTimestamp();
    }

    static createOneEggBonusChampionDecisionButtons(champId) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`one_egg_bonus_champ_${champId}_open`).setLabel('📦 OPEN').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`one_egg_bonus_champ_${champId}_decline`).setLabel('❌ DECLINE (+$20,000)').setStyle(ButtonStyle.Secondary)
      );
    }

    static createOneEggBonusLoserDecisionEmbed(game) {
      const loser = game.players[game.loser];
      const currentMoney = loser.money || 0;
      return new EmbedBuilder()
        .setColor('#9C27B0')
        .setTitle('⚡ FINAL GAMBLE — ALL OR NOTHING!')
        .setDescription(
          `**${loser.username}**, the Champion took the safe route — it’s your final call. OPEN for possible double or halve, or PASS to keep things as-is.\n\n` +
          `**Current Balance:** $${this.formatMoney(loser.money || 0)}\n\n` +
          '**OPEN:** If the box has 2 eggs → your $$ ×2; if it has 1 egg → your $$ ÷2\n' +
          '**PASS:** Leave the box sealed — no change.'
        )
        .setFooter({ text: 'Season 1 • One Egg — Final Decision: The fate of your fortune is sealed!' })
        .setTimestamp();
    }

    static createOneEggBonusLoserDecisionButtons(loserId) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`one_egg_bonus_loser_${loserId}_open`).setLabel('OPEN').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`one_egg_bonus_loser_${loserId}_pass`).setLabel('PASS').setStyle(ButtonStyle.Secondary)
      );
    }

  // ===== ONE EGG REDESIGN - NEW UI METHODS =====
  
  /**
   * Enhanced main embed with egg status displays
   */
  static createOneEggMainEmbedEnhanced(game, roundResults, currentTurnSide) {
    const p1 = game.players.left;
    const p2 = game.players.right;
    
    let description = `**Round ${game.round} / 4**\n\n`;
    
    if (currentTurnSide) {
      const turnPlayer = game.players[currentTurnSide];
      const otherPlayer = game.players[currentTurnSide === 'left' ? 'right' : 'left'];
      description += `▶️ **${turnPlayer.username}** selects FIRST\n`;
      description += `⏸️ **${otherPlayer.username}** waits\n\n`;
    }
    
    description += 'Select a box below!';

    if (roundResults) {
      let resultsText = `**Round ${game.round-1} Results:**\n`;
      resultsText += roundResults.map(r => {
        const emoji = r.player === 'left' ? '🅰️' : '🅱️';
        return `${emoji} **${game.players[r.player].username}**: ${r.message}`;
      }).join('\n');
      description = resultsText + `\n\n${description}`;
    }

    // Format embed fields with enhanced egg display
    const leftEggDisplay = game.formatEggDisplay('left');
    const rightEggDisplay = game.formatEggDisplay('right');

    return new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('📦 WHO HAS ONLY ONE EGG? 📦')
      .setDescription(description)
      .addFields(
        { 
          name: `🅰️ ${p1.username}`, 
          value: `Eggs: ${leftEggDisplay}\n💰 Money: ${this.formatMoney(p1.money)}`, 
          inline: true 
        },
        { 
          name: `🅱️ ${p2.username}`, 
          value: `Eggs: ${rightEggDisplay}\n💰 Money: ${this.formatMoney(p2.money)}`, 
          inline: true 
        }
      )
      .setFooter({ text: '🎯 Goal: Get exactly 2 eggs to WIN! • 1 egg = LOSE!' })
      .setTimestamp();
  }

  /**
   * Enhanced Item Found embed for suspense reveals
   */
  static createOneEggItemFoundEmbed(game, side, item) {
    const player = game.players[side];
    const emoji = side === 'left' ? '🅰️' : '🅱️';
    let title = '📦➡️ REVEAL!';
    let description = `# ${emoji} ${player.username}\n### Opened the box and found...`;
    let itemDisplay = '';
    let itemFunction = '';
    // English item display and effect
    switch (item.type) {
      case 'egg':
      case 'eggs': {
        const count = item.count || 1;
        itemDisplay = `🥚 **${count} egg${count > 1 ? 's' : ''}**`;
        itemFunction = `Add ${count} egg${count > 1 ? 's' : ''} to your basket!`;
        break;
      }
      case 'net': {
        const count = item.count || 1;
        itemDisplay = `🕸️ **Net**`;
        itemFunction = `Steal ${count} egg${count > 1 ? 's' : ''} from your opponent!`;
        break;
      }
      case 'hammer': {
        const count = item.count || 1;
        itemDisplay = `🔨 **Hammer**`;
        itemFunction = `Break ${count} egg${count > 1 ? 's' : ''} from your opponent!`;
        break;
      }
      case 'gift': {
        const count = item.count || 1;
        itemDisplay = `🎁 **Gift**`;
        itemFunction = `Give ${count} egg${count > 1 ? 's' : ''} to your opponent!`;
        break;
      }
      case 'egg_plus':
        itemDisplay = '🥚➕ **Egg Plus**';
        itemFunction = 'Add 1 egg (Golden Rule)';
        break;
      case 'ticket_sell_1k':
        itemDisplay = '💸⬜ **Sell eggs for $1,000 each**';
        itemFunction = 'Sell all your eggs for $1,000 each.';
        break;
      case 'ticket_sell_25k':
        itemDisplay = '💸⬜ **Sell eggs for $25,000 each**';
        itemFunction = 'Sell all your eggs for $25,000 each.';
        break;
      case 'ticket_sell_50k_1':
        itemDisplay = '💸1️⃣ **Sell eggs for $50,000, leave 1**';
        itemFunction = 'Sell your eggs for $50,000 each, leave 1 egg = instant loss!';
        break;
      case 'ticket_sell_100k_1':
        itemDisplay = '💸1️⃣ **Sell eggs for $100,000, leave 1**';
        itemFunction = 'Sell your eggs for $100,000 each, leave 1 egg = instant loss!';
        break;
      case 'ticket_sell_25k_2':
        itemDisplay = '💸2️⃣ **Sell eggs for $25,000, leave 2**';
        itemFunction = 'Sell your eggs for $25,000 each, leave 2 eggs = instant win!';
        break;
      case 'ticket_sell_50k_2':
        itemDisplay = '💸2️⃣ **Sell eggs for $50,000, leave 2**';
        itemFunction = 'Sell your eggs for $50,000 each, leave 2 eggs = instant win!';
        break;
      case 'ticket_golden_egg':
        itemDisplay = '🥚➡️💛 **6 Eggs for Golden Egg**';
        itemFunction = 'If you have 6 eggs, instantly trade for 1 Golden Egg.';
        break;
      case 'golden_egg':
        itemDisplay = '🥚💛 **Golden Egg**';
        itemFunction = 'Special egg: 1 Golden Egg = $300,000';
        break;
      case 'rotten_egg':
        itemDisplay = '🥚💩 **Rotten Egg**';
        itemFunction = 'All eggs for both players become 0!';
        break;
      case 'old_egg':
          itemDisplay = '👵🥚 **Old Egg**';
          itemFunction = 'Count: 1-3. Immune to steal/give!';
          break;
      case 'twin_egg':
          itemDisplay = '👯🥚 **Twin Egg**';
          itemFunction = 'Worth 2 eggs!';
          break;
      case 'ticket_rule':
          itemDisplay = '🎫📜 **Rule Changer Ticket**';
          itemFunction = 'Randomly changes win condition (2-6 eggs)!';
          break;
      case 'ticket_win_2':
        itemDisplay = '🎫 **Special Ticket: Set eggs to 2**';
        itemFunction = 'Set your eggs to exactly 2 instantly!';
        break;
      case 'new_carton':
        itemDisplay = '📦✨ **New Carton**';
        itemFunction = 'Sell all eggs & Get random size (1-8)!';
        break;
      case 'empty':
        itemDisplay = '💨 **Empty Box**';
        itemFunction = 'This box contains nothing!';
        break;
      default:
        itemDisplay = `❓ **${item.type.toUpperCase()}**`;
        itemFunction = item.label || '';
    }
    description += `\n\n# ${itemDisplay}\n*${itemFunction}*`;
    const embed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'Applying effect...' });
    return embed;
  }

  /**
   * Suspense countdown embed
   */
  static createOneEggSuspenseEmbed(game, countdown = null) {
    const p1 = game.players.left;
    const p2 = game.players.right;
    
    let description = '⏳ **PREPARING TO OPEN BOXES...**\n\n';
    description += `${p1.username} selected their box\n`;
    description += `${p2.username} selected their box\n\n`;
    
    if (countdown !== null) {
      description += `**Opening in ${countdown}...**`;
    } else {
      description += '**Get ready...!**';
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('⏳ SUSPENSE!')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Box reveal embed for one player
   */
  static createOneEggBoxRevealEmbed(game, side, item) {
    const player = game.players[side];
    const opponent = game.players[side === 'left' ? 'right' : 'left'];
    const emoji = side === 'left' ? '🅰️' : '🅱️';
    
    let title = '📦➡️';
    let description = `**${player.username}** found: `;
    
    // Determine item type and display
    if (item.type === 'eggs') {
      const eggCount = item.count || 1;
      title += '🥚'.repeat(eggCount);
      description += `**${eggCount} EGG${eggCount > 1 ? 'S' : ''}!** 🥚\n\n`;
      
      const beforeEggs = player.eggs - eggCount;
      const beforeDisplay = '🥚'.repeat(Math.max(0, beforeEggs)) + '⬜'.repeat(6 - Math.max(0, beforeEggs));
      const afterDisplay = game.formatEggDisplay(side);
      
      description += `Before: ${beforeDisplay} (${Math.max(0, beforeEggs)} eggs)\n`;
      description += `After: ${afterDisplay}`;
    } else {
      // Item (net, hammer, etc.)
      title += item.emoji || '📦';
      description += `**${item.label}** ${item.emoji || ''}\n\n`;
      description += `Current eggs: ${game.formatEggDisplay(side)}`;
    }

    return new EmbedBuilder()
      .setColor(side === 'left' ? '#3498DB' : '#E74C3C')
      .setTitle(`${title} BOX REVEAL!`)
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Item decision prompt embed
   */
  static createOneEggItemDecisionEmbed(game, side, item, secondsRemaining = null) {
    const player = game.players[side];
    const opponent = game.players[side === 'left' ? 'right' : 'left'];
    
    let description = `**${player.username}** found: **${item.label}** ${item.emoji || ''}!\n\n`;
    
    // Customize based on item type
    if (item.type === 'net') {
      description += `🪢 Do you want to **STEAL** 1 egg from **${opponent.username}**?\n\n`;
      description += `💡 Your eggs: ${game.formatEggDisplay(side)}\n`;
      description += `💡 Their eggs: ${game.formatEggDisplay(side === 'left' ? 'right' : 'left')}`;
    } else if (item.type === 'hammer') {
      description += `🔨 Do you want to **DESTROY** 2 eggs from **${opponent.username}**?\n\n`;
      description += `💡 Your eggs: ${game.formatEggDisplay(side)}\n`;
      description += `💡 Their eggs: ${game.formatEggDisplay(side === 'left' ? 'right' : 'left')}`;
    } else if (item.type === 'bunker') {
      description += `🛡️ Do you want **FULL PROTECTION** for this round?\n\n`;
      description += `💡 Blocks all steals and hammers from opponent`;
    } else if (item.type === 'gift') {
      description += `🎁 Do you want to **GIVE** all your eggs to your opponent?\n\n`;
      description += `💡 Your eggs: ${game.formatEggDisplay(side)} → **ZERO**\n`;
      description += `💡 Their eggs: ${game.formatEggDisplay(side === 'left' ? 'right' : 'left')} → **+${player.eggs}**`;
    }
    
    let footer = 'Choose wisely!';
    if (secondsRemaining) {
      footer = `Time remaining: ${secondsRemaining}s`;
    }

    return new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🤔 DECISION TIME!')
      .setDescription(description)
      .setFooter({ text: footer })
      .setTimestamp();
  }

  /**
   * Item decision buttons
   */
  static createOneEggItemDecisionButtons(playerId, itemType) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`one_egg_item_${playerId}_yes`)
        .setLabel('✅ YES - Use It!')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`one_egg_item_${playerId}_no`)
        .setLabel('❌ NO - Skip')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  /**
   * Turn order decision embed
   */
  static createOneEggTurnOrderEmbed(game, deciderSide, secondsRemaining = null) {
    const decider = game.players[deciderSide];
    const opponent = game.players[deciderSide === 'left' ? 'right' : 'left'];
    
    const deciderEggs = game.formatEggDisplay(deciderSide);
    const opponentEggs = game.formatEggDisplay(deciderSide === 'left' ? 'right' : 'left');
    
    let description = `**${decider.username}** has MORE eggs!\n`;
    description += `They decide the turn order:\n\n`;
    
    description += `🅰️ ${game.players.left.username}: ${game.formatEggDisplay('left')}\n`;
    description += `🅱️ ${game.players.right.username}: ${game.formatEggDisplay('right')}\n\n`;
    
    description += `**${decider.username}**, who goes first?`;
    
    let footer = 'Choose your strategy!';
    if (secondsRemaining) {
      footer = `Time remaining: ${secondsRemaining}s`;
    }

    return new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎲 TURN ORDER DECISION')
      .setDescription(description)
      .setFooter({ text: footer })
      .setTimestamp();
  }

  /**
   * Turn order decision buttons
   */
  static createOneEggTurnOrderButtons(deciderId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`one_egg_turn_${deciderId}_first`)
        .setLabel('▶️ I Go First')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`one_egg_turn_${deciderId}_second`)
        .setLabel('◀️ Opponent Goes First')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // Disabled placeholder to show during animations (prevents clicks)
  static createDisabledPlaceholderButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('disabled_placeholder')
        .setLabel('⏳ Please wait...')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }
}

module.exports = GameUI;
