require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('./database');
const { GameManager } = require('./gameManager');
const GameUI = require('./gameUI');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const db = new Database();
const gameManager = new GameManager();

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Start a new Tower of Cash game'),
  
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the Tower of Cash leaderboard'),
  
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your Tower of Cash statistics'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to play Tower of Cash'),
  
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure game amounts (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('grantplay')
    .setDescription('Grant bonus plays to a user (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to grant plays to')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of bonus plays to grant')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('stopgame')
    .setDescription('Force stop a game (Admin only)')
    .addStringOption(option =>
      option.setName('target')
        .setDescription('Which game to stop')
        .setRequired(true)
        .addChoices(
          { name: 'Current Channel', value: 'channel' },
          { name: 'All Games', value: 'all' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('intro')
    .setDescription('Show Tower of Cash game introduction'),
  
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset all progress in this server (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('archive')
    .setDescription('Archive leaderboard to toc-archive channel and reset (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear all messages in the channel (Admin only)')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100, default: 100)')
        .setMinValue(1)
        .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set which channel(s) can be used for playing (Admin only)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to allow/remove for playing')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Add or remove this channel')
        .setRequired(true)
        .addChoices(
          { name: 'Allow', value: 'allow' },
          { name: 'Remove', value: 'remove' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('listchannels')
    .setDescription('List all channels allowed for playing (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('checkdaily')
    .setDescription('Check your remaining plays and time until daily reset')
  ,
  new SlashCommandBuilder()
    .setName('day_limit')
    .setDescription('Configure how many games a user can play per day (Admin only)')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of plays allowed per day (0 = disabled)')
        .setRequired(true)
        .setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('event-mode')
    .setDescription('Enable or disable event mode (Admin only)')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Enable or disable event mode')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('revealfloor')
    .setDescription('Reveal all floor contents in the current game (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('current-mode')
    .setDescription('Check the current game mode (Normal or Event)')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log('🎮 Tower of Cash bot is ready!');
  
  // Set bot status
  client.user.setPresence({
    activities: [{
      name: 'Your Blind Future',
      type: 3, // 3 = Watching
      url: 'https://www.youtube.com/watch?v=lh744j1Vgos'
    }],
    status: 'online'
  });
});

// Handle client errors to prevent crashes
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('shardError', (error) => {
  console.error('❌ WebSocket connection error:', error);
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, channelId } = interaction;

  try {
    if (commandName === 'play') {
      await handlePlayCommand(interaction);
    } else if (commandName === 'leaderboard') {
      await handleLeaderboardCommand(interaction);
    } else if (commandName === 'stats') {
      await handleStatsCommand(interaction);
    } else if (commandName === 'help') {
      await handleHelpCommand(interaction);
    } else if (commandName === 'config') {
      await handleConfigCommand(interaction);
    } else if (commandName === 'grantplay') {
      await handleGrantPlayCommand(interaction);
    } else if (commandName === 'stopgame') {
      await handleStopGameCommand(interaction);
    } else if (commandName === 'intro') {
      await handleIntroCommand(interaction);
    } else if (commandName === 'reset') {
      await handleResetCommand(interaction);
    } else if (commandName === 'archive') {
      await handleArchiveCommand(interaction);
    } else if (commandName === 'clear') {
      await handleClearCommand(interaction);
    } else if (commandName === 'setchannel') {
      await handleSetChannelCommand(interaction);
    } else if (commandName === 'listchannels') {
      await handleListChannelsCommand(interaction);
    } else if (commandName === 'checkdaily') {
      await handleCheckDailyCommand(interaction);
    } else if (commandName === 'day_limit') {
      await handleDayLimitCommand(interaction);
    } else if (commandName === 'event-mode') {
      await handleEventModeCommand(interaction);
    } else if (commandName === 'revealfloor') {
      await handleRevealFloorCommand(interaction);
    } else if (commandName === 'current-mode') {
      await handleCurrentModeCommand(interaction);
    }
  } catch (error) {
    console.error('Error handling command:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred!', flags: 64 });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: '❌ An error occurred!' });
      }
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
});

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) || 
         member.roles.cache.some(role => role.name === '💻 Owner');
}

async function handlePlayCommand(interaction) {
  const { user, channelId, member, guildId } = interaction;

  // Check if this channel is allowed
  const channelAllowed = await db.isChannelAllowed(guildId, channelId);
  if (!channelAllowed) {
    return interaction.reply({ content: '❌ This channel is not allowed for playing Tower of Cash. Please use an allowed channel or ask an admin to add this channel with `/setchannel`.', flags: 64 });
  }

  // Check if game already exists in channel
  if (gameManager.hasActiveGame(channelId)) {
    return interaction.reply({ content: '❌ A game is already in progress in this channel!', flags: 64 });
  }

  // Admins have unlimited plays
  const hasAdminRole = isAdmin(member);
  
  // Check daily play limit (skip for admins)
  if (!hasAdminRole) {
    const canPlay = await db.canPlayToday(user.id, interaction.guildId);
    if (!canPlay) {
      // Calculate time until next day (midnight UTC)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      
      const timeLeft = tomorrow - now;
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      return interaction.reply({ 
        content: `❌ You've reached your daily play limit (2 plays per day).\n\n⏰ **Time until reset:** ${hoursLeft}h ${minutesLeft}m\nCome back tomorrow!`, 
        flags: 64
      });
    }
  }

  // Create new game (with event mode check)
  const game = await gameManager.createGame(user.id, user.username, channelId, guildId, db);
  if (!game) {
    return interaction.reply({ content: '❌ Failed to create game!', flags: 64 });
  }

  // Increment play count (skip for admins)
  if (!hasAdminRole) {
    await db.incrementPlayCount(user.id, interaction.guildId);
  }

  // Get player stats for profile embed
  const playerStats = await db.getPlayerStats(user.id, interaction.guildId);
  const remainingPlays = hasAdminRole ? '∞ (Admin)' : await db.getRemainingPlays(user.id, interaction.guildId);
  
  // Game starts immediately with Round 1 floor selection
  const profileEmbed = GameUI.createPlayerProfileEmbed(user, playerStats, remainingPlays, hasAdminRole);
  const welcomeEmbed = GameUI.createWelcomeEmbed(remainingPlays);
  const selectionEmbed = GameUI.createFloorSelectionEmbed(game);
  const buttons = GameUI.createFloorSelectionButtons(game);

  await interaction.reply({ embeds: [profileEmbed, welcomeEmbed, selectionEmbed], components: buttons });
}

async function handleLeaderboardCommand(interaction) {
  await interaction.deferReply();
  const leaderboard = await db.getLeaderboard(interaction.guildId, 10);
  const embed = GameUI.createLeaderboardEmbed(leaderboard);
  await interaction.editReply({ embeds: [embed] });
}

async function handleStatsCommand(interaction) {
  await interaction.deferReply();
  const stats = await db.getPlayerStats(interaction.user.id, interaction.guildId);
  const hasAdminRole = isAdmin(interaction.member);
  const remainingPlays = hasAdminRole ? '∞ (Admin)' : await db.getRemainingPlays(interaction.user.id, interaction.guildId);
  
  // Fetch recent and top plays
  const recentPlays = await db.getRecentPlays(interaction.user.id, interaction.guildId, 5);
  const topPlays = await db.getTopPlays(interaction.user.id, interaction.guildId, 5);
  
  const embed = GameUI.createStatsEmbed(stats, remainingPlays, hasAdminRole, recentPlays, topPlays, interaction.user);
  await interaction.editReply({ embeds: [embed] });
}

async function handleHelpCommand(interaction) {
  await interaction.deferReply();
  const hasAdminRole = isAdmin(interaction.member);
  const remainingPlays = hasAdminRole ? '∞ (Admin)' : await db.getRemainingPlays(interaction.user.id, interaction.guildId);
  const embed = GameUI.createWelcomeEmbed(remainingPlays);
  await interaction.editReply({ embeds: [embed] });
}

async function handleConfigCommand(interaction) {
  await interaction.reply({ 
    content: '⚙️ Game configuration can be edited in the `config.json` file.\n\nYou can modify:\n• Game amounts and rewards\n• Max plays per day\n• Floor counts per round\n\n**Admin Commands:**\n• `/grantplay` - Grant bonus plays to users\n• `/stopgame` - Force stop games (current channel or all)', 
    flags: 64
  });
}

async function handleIntroCommand(interaction) {
  await interaction.deferReply();
  const embed = GameUI.createIntroEmbed();
  await interaction.editReply({ embeds: [embed] });
}

async function handleGrantPlayCommand(interaction) {
  await interaction.deferReply();
  
  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  try {
    await db.addBonusPlays(targetUser.id, interaction.guildId, amount);
    
    await interaction.editReply({
      content: `✅ Successfully granted **${amount}** bonus play${amount > 1 ? 's' : ''} to ${targetUser.tag}!\n\nThey can now play **${amount}** additional game${amount > 1 ? 's' : ''} today.`
    });

    // Try to DM the user
    try {
      await targetUser.send(`🎁 You've been granted **${amount}** bonus play${amount > 1 ? 's' : ''} for Tower of Cash by an admin!\n\nUse \`/play\` to start playing. Enjoy! 🎮`);
    } catch (err) {
      // User has DMs disabled, that's okay
    }
  } catch (error) {
    console.error('Error granting plays:', error);
    await interaction.editReply({
      content: '❌ Failed to grant bonus plays. Please try again.'
    });
  }
}

async function handleStopGameCommand(interaction) {
  const target = interaction.options.getString('target');

  try {
    if (target === 'channel') {
      // Stop game in current channel
      const game = gameManager.getGame(interaction.channelId);
      
      if (!game) {
        return interaction.reply({
          content: '❌ No active game in this channel.',
          flags: 64
        });
      }

      const username = game.username;
      gameManager.endGame(interaction.channelId);

      await interaction.reply({
        content: `🛑 **Game Stopped**\n\nThe game for **${username}** in this channel has been force stopped by an admin.`
      });

    } else if (target === 'all') {
      // Stop all games
      const activeGamesCount = gameManager.activeGames.size;

      if (activeGamesCount === 0) {
        return interaction.reply({
          content: '❌ No active games to stop.',
          flags: 64
        });
      }

      // Get all channel IDs before clearing
      const channels = Array.from(gameManager.activeGames.keys());
      
      // Clear all games
      gameManager.activeGames.clear();

      await interaction.reply({
        content: `🛑 **All Games Stopped**\n\n**${activeGamesCount}** active game${activeGamesCount > 1 ? 's' : ''} ${activeGamesCount > 1 ? 'have' : 'has'} been force stopped by an admin.`
      });

      // Optionally notify in each channel
      for (const channelId of channels) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel) {
            await channel.send('🛑 This game has been stopped by an admin.');
          }
        } catch (err) {
          // Channel might not be accessible
        }
      }
    }
  } catch (error) {
    console.error('Error stopping game:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Failed to stop game. Please try again.',
        flags: 64
      });
    }
  }
}

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    return interaction.reply({ content: '❌ No active game found!', ephemeral: true });
  }

  if (game.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ This is not your game!', ephemeral: true });
  }

  try {
    const customId = interaction.customId;

    if (customId.startsWith('floor_')) {
      await handleFloorSelection(interaction, game);
    } else if (customId === 'confirm_floors') {
      await handleConfirmFloors(interaction, game);
    } else if (customId === 'choice_left' || customId === 'choice_right') {
      await handleSideChoice(interaction, game, customId === 'choice_left' ? 'left' : 'right');
    } else if (customId === 'continue_game') {
      await handleContinue(interaction, game);
    } else if (customId === 'continue_to_next_round') {
      await handleContinueToNextRound(interaction, game);
    } else if (customId === 'go_lobby') {
      await handleGoToLobby(interaction, game);
    } else if (customId === 'vault_submit') {
      await handleVaultSubmit(interaction, game);
    } else if (customId === 'operator_accept') {
      await handleOperatorAccept(interaction, game);
    } else if (customId === 'operator_decline') {
      await handleOperatorDecline(interaction, game);
    }
  } catch (error) {
    console.error('Error handling button:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
      }
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
});

async function handleFloorSelection(interaction, game) {
  const floorNumber = parseInt(interaction.customId.split('_')[1]);
  
  if (game.selectedFloors.includes(floorNumber)) {
    game.removeSelectedFloor(floorNumber);
  } else {
    if (game.selectedFloors.length < game.floorsToSelect) {
      game.addSelectedFloor(floorNumber);
    }
  }

  const embed = GameUI.createFloorSelectionEmbed(game);
  const buttons = GameUI.createFloorSelectionButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleConfirmFloors(interaction, game) {
  if (!game.hasSelectedAllFloors()) {
    return interaction.reply({ content: '❌ Please select all required floors!', ephemeral: true });
  }

  game.isSelectingFloors = false;
  game.isSelectingSide = true;

  // Generate choices for first floor
  const floorNumber = game.getCurrentFloorNumber();
  const choices = gameManager.generateFloorChoices(game);
  game.currentFloorChoices = choices;

  const embed = GameUI.createFloorChoiceEmbed(game, floorNumber, choices);
  const buttons = GameUI.createFloorChoiceButtons();

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleSideChoice(interaction, game, choice) {
  const floorNumber = game.getCurrentFloorNumber();
  const choices = game.currentFloorChoices;
  
  const chosenAmount = choice === 'left' ? choices.left : choices.right;
  const lostAmount = choice === 'left' ? choices.right : choices.left;

  const moneyBefore = game.totalMoney;
  
  // Mark both amounts as revealed (used)
  game.markAmountUsed(chosenAmount);
  game.markAmountUsed(lostAmount);
  
  // Apply the chosen amount
  const appliedAmount = game.applyAmount(chosenAmount);
  const moneyAfter = game.totalMoney;

  // Add to history
  game.addToHistory(floorNumber, choice, appliedAmount, lostAmount, moneyBefore, moneyAfter);

  // Create result embed
  const resultEmbed = GameUI.createResultEmbed(game, floorNumber, choice, appliedAmount, lostAmount, moneyBefore, moneyAfter);

  // Update with result
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Check for event tiles (The Vault, Operator Offer)
  if (chosenAmount.type === 'event') {
    if (chosenAmount.action === 'vault') {
      await handleVaultMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'operator_offer') {
      await handleOperatorOffer(interaction, game);
      return;
    }
  }

  // Check for game ending conditions
  if (chosenAmount.type === 'game_over') {
    await endGame(interaction, game, 'game_over_tile', 0);
    return;
  }

  // Check if player has $0 on the last floor of a round (after Round 1) - Game Over
  const isLastFloorInRound = game.currentFloor >= game.selectedFloors.length - 1;
  if (game.totalMoney <= 0 && game.currentRound > 1 && isLastFloorInRound) {
    await endGame(interaction, game, 'no_money', 0);
    return;
  }

  // X Level - mark that the last floor will be skipped (player continues playing until reaching it)
  if (chosenAmount.type === 'special' && chosenAmount.action === 'x_level') {
    const isLastFloorInRound = game.currentFloor >= game.selectedFloors.length - 1;
    
    if (!isLastFloorInRound) {
      // Get the last floor in the selected floors
      const lastFloorIndex = game.selectedFloors.length - 1;
      const lastFloorNum = game.selectedFloors[lastFloorIndex];
      const lastFloorChoices = game.preGeneratedFloors[lastFloorNum];
      
      // Store info about which floor will be skipped
      game.xLevelSkippedFloor = {
        floorNum: lastFloorNum,
        left: lastFloorChoices.left,
        right: lastFloorChoices.right
      };
      
      // Mark the amounts from skipped floor as used/removed
      const leftKey = game.getAmountKey(lastFloorChoices.left);
      const rightKey = game.getAmountKey(lastFloorChoices.right);
      if (game.remainingAmounts[leftKey]) {
        game.remainingAmounts[leftKey].count--;
      }
      if (game.remainingAmounts[rightKey]) {
        game.remainingAmounts[rightKey].count--;
      }
    } else {
      // Last floor in round - nothing happens
      game.xLevelSkippedFloor = null;
    }
  }

  // Continue button
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ embeds: [resultEmbed], components: continueButtons });
}

async function handleContinue(interaction, game) {
  game.moveToNextFloor();

  // Check if the next floor is the one marked to be skipped by X Level
  if (game.xLevelSkippedFloor && game.getCurrentFloorNumber() === game.xLevelSkippedFloor.floorNum) {
    // Show the skipped floor
    const skippedEmbed = GameUI.createSkippedFloorsEmbed([game.xLevelSkippedFloor]);
    await interaction.update({ embeds: [skippedEmbed], components: [] });
    
    // Clear X Level flag
    game.xLevelSkippedFloor = null;
    
    // Skip this floor and move to next
    game.moveToNextFloor();
    
    // Check if game is complete after skipping
    if (game.isGameComplete()) {
      // Save to database
      await db.updatePlayerStats(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, true);
      await db.saveGameHistory(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, 'completed');
      
      // Show completion message
      const endEmbed = GameUI.createGameEndEmbed(game, 'completed', game.totalMoney);
      await interaction.followUp({ embeds: [endEmbed], components: [] });
      
      // End the game
      gameManager.endGame(interaction.channelId);
      return;
    }

    // Then continue to round end
    await interaction.followUp({ content: '⏭️ **Floor skipped! Continuing to round end...**' });

    // Show round end decision
    const roundEndEmbed = GameUI.createRoundEndEmbed(game);
    const roundEndButtons = GameUI.createRoundEndButtons();
    await interaction.followUp({ embeds: [roundEndEmbed], components: roundEndButtons });
    return;
  }

  // Check if round is complete
  if (game.isRoundComplete()) {
    // Check if game is complete
    if (game.isGameComplete()) {
      // Save to database
      await db.updatePlayerStats(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, true);
      await db.saveGameHistory(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, 'completed');
      
      // Show completion message
      const endEmbed = GameUI.createGameEndEmbed(game, 'completed', game.totalMoney);
      await interaction.update({ embeds: [endEmbed], components: [] });
      
      // End the game
      gameManager.endGame(interaction.channelId);
      return;
    }

    // Show round end decision (player can choose to continue or stop)
    const roundEndEmbed = GameUI.createRoundEndEmbed(game);
    const roundEndButtons = GameUI.createRoundEndButtons();
    await interaction.update({ embeds: [roundEndEmbed], components: roundEndButtons });
  } else {
    // Next floor in current round
    const floorNumber = game.getCurrentFloorNumber();
    const choices = gameManager.generateFloorChoices(game);
    game.currentFloorChoices = choices;

    const embed = GameUI.createFloorChoiceEmbed(game, floorNumber, choices);
    const buttons = GameUI.createFloorChoiceButtons();
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

async function handleContinueToNextRound(interaction, game) {
  // Start next round
  game.startNewRound();
  const embed = GameUI.createFloorSelectionEmbed(game);
  const buttons = GameUI.createFloorSelectionButtons(game);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleClearCommand(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const amount = interaction.options.getInteger('amount') || 100;
    
    // Fetch and delete messages
    const fetched = await interaction.channel.messages.fetch({ limit: amount });
    const deleted = await interaction.channel.bulkDelete(fetched, true);

    await interaction.editReply({
      content: `✅ Successfully deleted **${deleted.size}** message(s) from this channel.`
    });

    // Delete the reply after 5 seconds
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (err) {
        console.error('Error deleting reply:', err);
      }
    }, 5000);

  } catch (error) {
    console.error('Error clearing messages:', error);
    await interaction.editReply({
      content: '❌ Failed to clear messages. Note: Messages older than 14 days cannot be bulk deleted.'
    });
  }
}

async function handleResetCommand(interaction) {
  // Defer reply as this might take a moment
  await interaction.deferReply({ flags: 64 });

  try {
    // Reset all progress for this guild
    await db.resetGuildProgress(interaction.guildId);

    await interaction.editReply({
      content: '✅ **Server Progress Reset Complete!**\n\nAll player stats, leaderboards, and game history have been cleared for this server.'
    });

    // Send announcement to the channel
    await interaction.channel.send({
      content: '🔄 **Tower of Cash - Server Reset**\n\nAll progress has been reset by an admin. Start fresh with `/play`!'
    });

  } catch (error) {
    console.error('Error resetting progress:', error);
    await interaction.editReply({
      content: '❌ Failed to reset server progress. Please try again.'
    });
  }
}

async function handleArchiveCommand(interaction) {
  // Defer reply as this might take a moment
  await interaction.deferReply({ flags: 64 });

  try {
    // Get leaderboard data and reset
    const archivedData = await db.archiveAndResetGuild(interaction.guildId);

    if (archivedData.length === 0) {
      return interaction.editReply({
        content: '⚠️ No leaderboard data to archive. The server has no recorded games yet.'
      });
    }

    // Find or create the toc-archive channel
    let archiveChannel = interaction.guild.channels.cache.find(ch => ch.name === 'toc-archive');
    
    if (!archiveChannel) {
      // Try to create the channel
      try {
        archiveChannel = await interaction.guild.channels.create({
          name: 'toc-archive',
          type: 0, // Text channel
          topic: 'Tower of Cash archived leaderboards'
        });
      } catch (err) {
        return interaction.editReply({
          content: '❌ Could not find or create the "toc-archive" channel. Please create it manually and try again.'
        });
      }
    }

    // Create archive embed
    const timestamp = new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let description = `**Archived on:** ${timestamp}\n\n`;
    
    archivedData.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      description += `${medal} **${player.username}**\n`;
      description += `   💰 High Score: $${player.highest_score.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      description += `   🏆 Wins: ${player.total_wins} | 🎮 Games: ${player.total_games}\n\n`;
    });

    const { EmbedBuilder } = require('discord.js');
    const archiveEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Tower of Cash - Archived Leaderboard')
      .setDescription(description)
      .setFooter({ text: 'This leaderboard has been archived and reset' })
      .setTimestamp();

    // Send to archive channel
    await archiveChannel.send({ embeds: [archiveEmbed] });

    await interaction.editReply({
      content: `✅ **Leaderboard Archived!**\n\nThe leaderboard has been saved to ${archiveChannel} and all progress has been reset.\n\n**Players archived:** ${archivedData.length}`
    });

    // Send announcement to the channel
    await interaction.channel.send({
      content: `📚 **Tower of Cash - Leaderboard Archived**\n\nThe leaderboard has been archived to ${archiveChannel} and reset. Start fresh with \`/play\`!`
    });

  } catch (error) {
    console.error('Error archiving leaderboard:', error);
    await interaction.editReply({
      content: '❌ Failed to archive leaderboard. Please try again.'
    });
  }
}

async function handleSetChannelCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const hasOwnerRole = member.roles.cache.some(role => role.name === '💻 Owner');
    const hasAdminPerm = member.permissions.has('Administrator');

    if (!hasOwnerRole && !hasAdminPerm) {
      return interaction.editReply({
        content: '❌ You need the 💻 Owner role or Administrator permission to use this command.'
      });
    }

    const channel = interaction.options.getChannel('channel');
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;

    if (action === 'allow') {
      await db.addAllowedChannel(guildId, channel.id);
      await interaction.editReply({
        content: `✅ ${channel} has been added to the allowed channels list. Players can now use /play in this channel.`
      });
    } else if (action === 'remove') {
      await db.removeAllowedChannel(guildId, channel.id);
      await interaction.editReply({
        content: `✅ ${channel} has been removed from the allowed channels list. Players can no longer use /play in this channel.`
      });
    }

  } catch (error) {
    console.error('Error in setchannel command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while setting the channel.'
    });
  }
}

async function handleListChannelsCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const hasOwnerRole = member.roles.cache.some(role => role.name === '💻 Owner');
    const hasAdminPerm = member.permissions.has('Administrator');

    if (!hasOwnerRole && !hasAdminPerm) {
      return interaction.editReply({
        content: '❌ You need the 💻 Owner role or Administrator permission to use this command.'
      });
    }

    const guildId = interaction.guild.id;
    const allowedChannels = await db.getAllowedChannels(guildId);

    if (allowedChannels.length === 0) {
      return interaction.editReply({
        content: '📋 No channel restrictions are set. Players can use /play in any channel.'
      });
    }

    let channelList = '📋 **Allowed Channels for /play:**\n\n';
    allowedChannels.forEach(channelId => {
      const channel = interaction.guild.channels.cache.get(channelId);
      if (channel) {
        channelList += `• ${channel}\n`;
      } else {
        channelList += `• <#${channelId}> (Channel no longer exists)\n`;
      }
    });

    await interaction.editReply({
      content: channelList
    });

  } catch (error) {
    console.error('Error in listchannels command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while listing channels.'
    });
  }
}

  // Admin: Set per-guild day limit for plays
  async function handleDayLimitCommand(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;
      if (!isAdmin(member)) {
        return interaction.editReply({ content: '❌ You need the 💻 Owner role or Administrator permission to use this command.' });
      }

      const limit = interaction.options.getInteger('limit');
      const guildId = interaction.guild.id;

      // Persist to DB (0 means disabled/unlimited as per UI decision)
      await db.setDayLimit(guildId, limit);

      if (limit === 0) {
        await interaction.editReply({ content: `✅ Daily play limit cleared for this server. Users can now play unlimited times (unless limited by bonus plays).` });
      } else {
        await interaction.editReply({ content: `✅ Daily play limit set to **${limit}** play${limit > 1 ? 's' : ''} per day for this server.` });
      }
    } catch (error) {
      console.error('Error in day_limit command:', error);
      try {
        await interaction.editReply({ content: '❌ An error occurred while setting the day limit.' });
      } catch (err) {
        console.error('Error replying to day_limit command error:', err);
      }
    }
  }

  // Admin: Enable or disable event mode for this guild
  async function handleEventModeCommand(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;
      if (!isAdmin(member)) {
        return interaction.editReply({ content: '❌ You need the 💻 Owner role or Administrator permission to use this command.' });
      }

      const action = interaction.options.getString('action');
      const guildId = interaction.guild.id;

      const enable = action === 'enable';
      await db.setEventMode(guildId, enable);

      if (enable) {
        await interaction.editReply({ content: '🎉 Event mode enabled for this server. Future games will include special event tiles.' });
      } else {
        await interaction.editReply({ content: '🔕 Event mode disabled for this server. Games will run in normal mode.' });
      }
    } catch (error) {
      console.error('Error in event-mode command:', error);
      try {
        await interaction.editReply({ content: '❌ An error occurred while toggling event mode.' });
      } catch (err) {
        console.error('Error replying to event-mode command error:', err);
      }
    }
  }

async function handleVaultMinigame(interaction, game) {
  // Initialize vault state
  const secretCode = generateSecretCode();
  game.vaultState = {
    secretCode,
    attempts: [],
    maxAttempts: 4,
    guessedDigits: [null, null, null, null, null, null]
  };

  // Show vault intro
  const vaultIntro = GameUI.createVaultIntroEmbed(game);
  await interaction.followUp({ embeds: [vaultIntro], components: [] });

  // Set up message collector for guesses
  const filter = m => m.author.id === game.userId;
  const collector = interaction.channel.createMessageCollector({ filter, time: 120000 }); // 2 minutes

  collector.on('collect', async (message) => {
    const guess = message.content.trim();
    
    // Validate guess
    if (!/^\d{6}$/.test(guess)) {
      await message.reply({ content: '❌ Invalid guess! Please enter exactly 6 digits.', ephemeral: true });
      return;
    }

    // Check for duplicate digits
    const digits = guess.split('');
    if (new Set(digits).size !== 6) {
      await message.reply({ content: '❌ Invalid guess! All digits must be unique (no duplicates).', ephemeral: true });
      return;
    }

    // Process the guess
    const result = checkVaultGuess(secretCode, guess, game.vaultState.guessedDigits);
    game.vaultState.attempts.push({ guess, ...result });

    const attemptsLeft = game.vaultState.maxAttempts - game.vaultState.attempts.length;

    // Delete user's message
    try {
      await message.delete();
    } catch (err) {
      // Ignore if can't delete
    }

    // Check if code is cracked
    if (result.correctPosition === 6) {
      collector.stop('cracked');
      const rewardResult = calculateVaultReward(6, game);
      
      if (rewardResult.type === 'money') {
        game.totalMoney += rewardResult.value;
      } else if (rewardResult.type === 'percentage') {
        game.totalMoney = Math.floor(game.totalMoney * 2); // +100%
      } else if (rewardResult.type === 'add_one') {
        game.totalMoney = parseInt(game.totalMoney.toString() + '1');
      }

      const rewardEmbed = GameUI.createVaultRewardEmbed(game, rewardResult);
      await interaction.channel.send({ embeds: [rewardEmbed] });

      // Continue game after short delay
      setTimeout(async () => {
        await continueAfterEvent(interaction, game);
      }, 2000);
      return;
    }

    // Check if out of attempts
    if (attemptsLeft <= 0) {
      collector.stop('failed');
      
      // Find best attempt (most correct digits)
      const bestAttempt = game.vaultState.attempts.reduce((best, current) => 
        current.correctPosition > best.correctPosition ? current : best
      , { correctPosition: 0 });
      
      const rewardResult = calculateVaultReward(bestAttempt.correctPosition, game);
      
      if (rewardResult.type === 'money' && rewardResult.value > 0) {
        game.totalMoney += rewardResult.value;
      }
      
      const failedEmbed = GameUI.createVaultFailedEmbed(game, bestAttempt.correctPosition, rewardResult, secretCode);
      await interaction.channel.send({ embeds: [failedEmbed] });

      // Continue game after short delay
      setTimeout(async () => {
        await continueAfterEvent(interaction, game);
      }, 2000);
      return;
    }

    // Show attempt result
    const attemptEmbed = GameUI.createVaultAttemptEmbed(
      game,
      guess,
      result.correctPosition,
      result.correctWrongPosition,
      attemptsLeft,
      game.vaultState.guessedDigits,
      game.vaultState.attempts
    );
    await interaction.channel.send({ embeds: [attemptEmbed] });
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      interaction.channel.send('⏰ Vault minigame timed out. Continuing with game...');
      continueAfterEvent(interaction, game);
    }
  });
}

function generateSecretCode() {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const code = [];
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    code.push(digits[randomIndex]);
    digits.splice(randomIndex, 1);
  }
  return code.join('');
}

function checkVaultGuess(secretCode, guess, guessedDigits) {
  const secretDigits = secretCode.split('');
  const guessDigits = guess.split('');
  
  let correctPosition = 0;
  let correctWrongPosition = 0;

  // Check correct positions
  for (let i = 0; i < 6; i++) {
    if (guessDigits[i] === secretDigits[i]) {
      correctPosition++;
      guessedDigits[i] = guessDigits[i];
    }
  }

  // Check wrong positions
  for (let i = 0; i < 6; i++) {
    if (guessDigits[i] !== secretDigits[i]) {
      if (secretDigits.includes(guessDigits[i])) {
        correctWrongPosition++;
      }
    }
  }

  return { correctPosition, correctWrongPosition };
}

function calculateVaultReward(correctDigits, game) {
  // Reward based on number of correct digits
  if (correctDigits === 6) {
    // Special random rewards for cracking the code
    const rand = Math.random();
    
    if (rand < 0.40) { // 40% chance
      return { type: 'money', value: 1000000, display: '$1,000,000' };
    } else if (rand < 0.70) { // 30% chance
      return { type: 'percentage', value: 100, display: '+100%' };
    } else if (rand < 0.90) { // 20% chance
      return { type: 'add_one', value: 1, display: 'Add a 1' };
    } else { // 10% chance
      // Reveal a random game over floor
      const gameOverFloors = game.preGeneratedFloors
        .map((floor, index) => ({ floor, number: index + 1 }))
        .filter(f => 
          f.floor.left.type === 'game_over' || f.floor.right.type === 'game_over'
        );
      
      if (gameOverFloors.length > 0) {
        const randomFloor = gameOverFloors[Math.floor(Math.random() * gameOverFloors.length)];
        return { 
          type: 'reveal_floor', 
          value: randomFloor.number, 
          display: `Reveal Floor ${randomFloor.number} has Game Over` 
        };
      }
      // Fallback if no game over floors
      return { type: 'money', value: 1000000, display: '$1,000,000' };
    }
  }
  
  // Partial rewards based on correct digits
  const rewardMap = {
    5: 500000,
    4: 200000,
    3: 100000,
    2: 25000,
    1: 10000,
    0: 0
  };
  
  return { type: 'money', value: rewardMap[correctDigits] || 0, display: `$${(rewardMap[correctDigits] || 0).toLocaleString()}` };
}

async function handleOperatorOffer(interaction, game) {
  // Calculate offer amount (±50% of current money, or 100k-5M if zero)
  let offerAmount;
  if (game.totalMoney <= 0) {
    offerAmount = Math.floor(Math.random() * (5000000 - 100000 + 1)) + 100000;
  } else {
    const variance = game.totalMoney * 0.5;
    const min = game.totalMoney - variance;
    const max = game.totalMoney + variance;
    offerAmount = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Store offer in game state
  game.operatorOfferState = { offerAmount };

  // Show operator offer
  const offerEmbed = GameUI.createOperatorOfferEmbed(game, offerAmount);
  const buttons = GameUI.createOperatorOfferButtons();
  await interaction.followUp({ embeds: [offerEmbed], components: buttons });
}

async function handleOperatorAccept(interaction, game) {
  if (!game.operatorOfferState) {
    return interaction.reply({ content: '❌ No operator offer found!', ephemeral: true });
  }

  const offerAmount = game.operatorOfferState.offerAmount;
  
  // Accept offer - set money to offer amount and end game (counts as win)
  game.totalMoney = offerAmount;
  
  await interaction.update({ components: [] });
  
  // End game with lobby reason (counts as win)
  await endGame(interaction, game, 'lobby', offerAmount);
}

async function handleOperatorDecline(interaction, game) {
  if (!game.operatorOfferState) {
    return interaction.reply({ content: '❌ No operator offer found!', ephemeral: true });
  }

  await interaction.update({ 
    content: '❌ **Offer Declined!** Continuing with your current amount...', 
    embeds: [], 
    components: [] 
  });

  // Clear operator offer state
  game.operatorOfferState = null;

  // Continue game after short delay
  setTimeout(async () => {
    await continueAfterEvent(interaction, game);
  }, 2000);
}

async function continueAfterEvent(interaction, game) {
  // Clear event states
  game.vaultState = null;
  game.operatorOfferState = null;

  // Continue button
  const continueButtons = GameUI.createContinueButton();
  const continueEmbed = new (require('discord.js').EmbedBuilder)()
    .setColor('#4169E1')
    .setTitle('🎮 Continue Game')
    .setDescription(`**Current Money:** $${GameUI.formatMoney(game.totalMoney)}\n\nPress continue to move to the next floor!`);
  
  await interaction.channel.send({ embeds: [continueEmbed], components: continueButtons });
}

async function handleVaultSubmit(interaction, game) {
  // This is a placeholder - actual vault logic is handled by message collector
  await interaction.reply({ content: '❌ Please reply with your guess in the chat!', ephemeral: true });
}

async function handleRevealFloorCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    if (!isAdmin(member)) {
      return interaction.editReply({ content: '❌ You need the 💻 Owner role or Administrator permission to use this command.' });
    }

    // First check for game in the channel
    let game = gameManager.getGame(interaction.channelId);
    
    // If no game in channel, check if admin has their own game
    if (!game) {
      game = gameManager.getGame(interaction.user.id);
    }
    
    if (!game) {
      return interaction.editReply({ content: '❌ No active game in this channel or for your user!' });
    }

    // Generate reveal embed
    const revealEmbed = GameUI.createRevealAllFloorsEmbed(game);
    await interaction.editReply({ embeds: [revealEmbed] });

  } catch (error) {
    console.error('Error in revealfloor command:', error);
    try {
      await interaction.editReply({ content: '❌ An error occurred while revealing floors.' });
    } catch (err) {
      console.error('Error replying to revealfloor command error:', err);
    }
  }
}

async function handleCurrentModeCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const eventMode = await db.getEventMode(guildId);
    const dayLimit = await db.getDayLimit(guildId);

    const mode = eventMode ? '🎉 **Event Mode**' : '🎮 **Normal Mode**';
    const limitText = dayLimit !== null ? `${dayLimit} play${dayLimit !== 1 ? 's' : ''} per day` : `${config.maxPlaysPerDay} plays per day (default)`;

    await interaction.editReply({
      content: 
        '📊 **Current Server Settings**\n\n' +
        `**Game Mode:** ${mode}\n` +
        `**Daily Limit:** ${limitText}\n\n` +
        (eventMode ? '✨ Event tiles (The Vault, Operator Offer) are active!\n' : '') +
        `**Remaining Plays Today:** ${await db.getRemainingPlays(interaction.user.id, guildId)}`
    });

  } catch (error) {
    console.error('Error in current-mode command:', error);
    try {
      await interaction.editReply({ content: '❌ An error occurred while checking mode.' });
    } catch (err) {
      console.error('Error replying to current-mode command error:', err);
    }
  }
}

async function handleCheckDailyCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const member = interaction.member;
    
    // Check if user is admin
    const hasAdminRole = isAdmin(member);
    
    if (hasAdminRole) {
      return interaction.editReply({
        content: '👑 **Admin Privilege**\n\nAs an admin, you have **unlimited plays**. No daily limit applies to you!'
      });
    }
    
    // Get remaining plays
    const remainingPlays = await db.getRemainingPlays(userId, guildId);
    
    // Calculate time until next day (midnight UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const timeLeft = tomorrow - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    let message = '📊 **Daily Play Status**\n\n';
    message += `🎮 **Remaining Plays:** ${remainingPlays}/2\n`;
    message += `⏰ **Time Until Reset:** ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s\n\n`;
    
    if (remainingPlays > 0) {
      message += '✅ You can play right now!';
    } else {
      message += '❌ No plays remaining. Come back after the reset!';
    }
    
    await interaction.editReply({
      content: message
    });

  } catch (error) {
    console.error('Error in checkdaily command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while checking daily status.'
    });
  }
}

async function handleGoToLobby(interaction, game) {
  const finalScore = game.totalMoney;
  
  // Save to database with actual money as score - going to lobby counts as a win
  await db.updatePlayerStats(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, true);
  await db.saveGameHistory(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, 'lobby');
  
  // Show game end
  const endEmbed = GameUI.createGameEndEmbed(game, 'lobby', finalScore);
  await interaction.update({ embeds: [endEmbed], components: [] });
  
  // If game ended early (before completing all 21 floors), show what was behind unplayed floors
  if (game.floorsCompleted < 21) {
    const unplayedFloors = game.getUnplayedFloors();
    const unplayedEmbed = GameUI.createUnplayedFloorsEmbed(unplayedFloors);
    
    if (unplayedEmbed) {
      await interaction.followUp({ embeds: [unplayedEmbed], components: [] });
    }
  }
  
  // Clean up - end the game to prevent multiple saves
  gameManager.endGame(interaction.channelId);
}

async function endGame(interaction, game, reason, finalScore) {
  const isWin = reason === 'completed';
  
  // Save to database
  await db.updatePlayerStats(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, isWin);
  await db.saveGameHistory(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, reason);

  // Create end game embed
  const endEmbed = GameUI.createGameEndEmbed(game, reason, finalScore);
  
  // Send end message - check if interaction has been replied to already
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ embeds: [endEmbed], components: [] });
  } else {
    await interaction.update({ embeds: [endEmbed], components: [] });
  }
  
  // If game ended early (not completed all 21 floors), show what was behind unplayed floors
  if (reason !== 'completed' && game.floorsCompleted < 21) {
    const unplayedFloors = game.getUnplayedFloors();
    const unplayedEmbed = GameUI.createUnplayedFloorsEmbed(unplayedFloors);
    
    if (unplayedEmbed) {
      await interaction.followUp({ embeds: [unplayedEmbed], components: [] });
    }
  }
  
  // End the game
  gameManager.endGame(interaction.channelId);
}

// Login with error handling
(async () => {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Failed to login:', error);
    console.log('⚠️ Bot will keep running, check your token in .env file');
  }
})();

// Handle uncaught errors to prevent crashes
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  db.close();
  client.destroy();
  process.exit(0);
});
