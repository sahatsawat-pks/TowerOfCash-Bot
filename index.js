require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    .setDescription('Enable or disable Season 1 Mode (28 floors, new minigames) (Admin only)')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Enable Season 1 Mode or return to Normal Mode')
        .setRequired(true)
        .addChoices(
          { name: 'Enable Season 1', value: 'enable' },
          { name: 'Disable (Normal Mode)', value: 'disable' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('revealfloor')
    .setDescription('Reveal all floor contents in the current game (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('current-mode')
    .setDescription('Check the current game mode (Normal Mode or Season 1 Mode)'),

  new SlashCommandBuilder()
    .setName('test-boost')
    .setDescription('Test Boost Multiplier feature (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-vault')
    .setDescription('Test The Vault minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-infinity')
    .setDescription('Test The ∞% minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-megagrid')
    .setDescription('Test Mega Grid minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-hideout')
    .setDescription('Test Hideout Breakthrough minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-babushka')
    .setDescription('Test Babushka minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-boilingpoint')
    .setDescription('Test Boiling Point minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-roshambo')
    .setDescription('Test Operator Roshambo minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

// Handle messages for game commands (like STOP for Mega Grid)
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  const game = gameManager.getGame(message.channelId);
  if (!game) return;

  // Only respond to the player's messages
  if (game.userId !== message.author.id) return;

  const content = message.content.trim().toUpperCase();

  // Handle STOP command for Mega Grid cashout
  if (content === 'STOP' && game.megaGridState && game.megaGridState.isActive && game.megaGridState.currentRound > 0) {
    try {
      // Cash out the player
      game.megaGridState.isActive = false;
      game.totalMoney += game.megaGridState.accumulatedReward;

      const resultEmbed = GameUI.createMegaGridResultEmbed(game, 'cashout');
      await message.channel.send({ embeds: [resultEmbed] });

      // Show full grid reveal
      const unpickedEmbed = GameUI.createMegaGridUnpickedEmbed(game);
      await message.channel.send({ embeds: [unpickedEmbed] });

      // Continue game
      const continueButtons = GameUI.createContinueButton();
      await message.channel.send({ content: '➡️ **Moving to next floor...**', components: continueButtons });
    } catch (error) {
      console.error('Error handling STOP command:', error);
    }
  }
});

// === BOILING POINT HANDLERS ===

async function handleBoilingPointMinigame(interaction, game) {
  game.startBoilingPoint();

  const embed = GameUI.createBoilingPointIntroEmbed(game);
  const buttons = GameUI.createBoilingPointButtons(game, true);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleTestBoilingPoint(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 50000;

    // Start Boiling Point
    testGame.startBoilingPoint();

    const embed = GameUI.createBoilingPointIntroEmbed(testGame);
    const buttons = GameUI.createBoilingPointButtons(testGame, true);

    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.editReply({ content: '❌ A game is already active. Use `/stopgame` first.' });
  }
}

// === OPERATOR ROSHAMBO HANDLERS ===

async function handleOperatorRoshamboMinigame(interaction, game) {
  game.startOperatorRoshambo();

  const embed = GameUI.createOperatorRoshamboIntroEmbed(game);
  const buttons = GameUI.createOperatorRoshamboButtons(game, true);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleOperatorRoshamboStart(interaction, game) {
  const embed = GameUI.createOperatorRoshamboRoundEmbed(game);
  const buttons = GameUI.createOperatorRoshamboButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleOperatorRoshamboChoice(interaction, game, choice) {
  // Show "Operator is choosing..." message
  await interaction.update({ content: '🤔 Operator is choosing...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = game.playOperatorRoshamboRound(choice);

  if (!result) return;

  const resultEmbed = GameUI.createOperatorRoshamboResultEmbed(game, result);

  if (result.gameOver) {
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Show result briefly
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show next round
    const nextEmbed = GameUI.createOperatorRoshamboRoundEmbed(game);
    const nextButtons = GameUI.createOperatorRoshamboButtons(game);
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

async function handleTestRoshambo(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 50000;

    // Start Operator Roshambo
    testGame.startOperatorRoshambo();

    const embed = GameUI.createOperatorRoshamboIntroEmbed(testGame);
    const buttons = GameUI.createOperatorRoshamboButtons(testGame, true);

    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.editReply({ content: '❌ A game is already active. Use `/stopgame` first.' });
  }
}

// === MYSTERY BOX HANDLERS ===

async function handleMysteryBoxMinigame(interaction, game) {
  game.startMysteryBox();

  const embed = GameUI.createMysteryBoxIntroEmbed(game);
  const buttons = GameUI.createMysteryBoxSelectionButtons(game);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleMysteryBoxSelection(interaction, game, boxIndex) {
  // Show "Opening other boxes..." suspense
  await interaction.update({ content: '📦 Opening the other boxes...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = game.selectMysteryBox(boxIndex);

  if (!result) return;

  // FOMO Reveal - Show what was in the other boxes
  const fomoEmbed = GameUI.createMysteryBoxFOMOEmbed(game, result.unselectedBoxes, boxIndex);
  await interaction.editReply({ content: '', embeds: [fomoEmbed], components: [] });

  // Dramatic pause
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Show selected box result
  const resultEmbed = GameUI.createMysteryBoxResultEmbed(game, result.selectedItem, boxIndex);
  await interaction.followUp({ embeds: [resultEmbed] });

  // Continue game
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
}

// === RANDOM PERCENTAGE HANDLER ===

async function handleRandomPercentage(interaction, game) {
  // Generate random percentage from -150% to +150%
  const percentage = Math.floor(Math.random() * 301) - 150; // -150 to +150

  // Show suspense
  await interaction.update({ content: '🎲 Rolling the percentage dice...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Apply percentage
  const multiplier = 1 + (percentage / 100);
  game.totalMoney = Math.floor(game.totalMoney * multiplier);

  // Ensure money doesn't go below 0
  if (game.totalMoney < 0) game.totalMoney = 0;

  // Show result
  const embed = GameUI.createRandomPercentageEmbed(game, percentage);
  await interaction.editReply({ content: '', embeds: [embed], components: [] });

  // Continue game
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
}

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
    } else if (commandName === 'test-boost') {
      await handleTestBoostCommand(interaction);
    } else if (commandName === 'test-vault') {
      await handleTestVaultCommand(interaction);
    } else if (commandName === 'test-infinity') {
      await handleTestInfinityCommand(interaction);
    } else if (commandName === 'test-megagrid') {
      await handleTestMegaGridCommand(interaction);
    } else if (commandName === 'test-hideout') {
      await handleTestHideoutCommand(interaction);
    } else if (interaction.commandName === 'test-babushka') {
      await handleTestBabushka(interaction);
    } else if (interaction.commandName === 'test-boilingpoint') {
      await handleTestBoilingPoint(interaction);
    } else if (interaction.commandName === 'test-roshambo') {
      await handleTestRoshambo(interaction);
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
  const welcomeEmbed = GameUI.createWelcomeEmbed(remainingPlays, game.eventMode);
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
  const eventMode = await db.getEventMode(interaction.guildId);
  const embed = GameUI.createWelcomeEmbed(remainingPlays, eventMode);
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

    if (customId.startsWith('floor_') && !customId.startsWith('floor_page_')) {
      await handleFloorSelection(interaction, game);
    } else if (customId === 'floor_page_prev') {
      // Go to previous page
      game.floorSelectionPage = Math.max(0, (game.floorSelectionPage || 0) - 1);
      const embed = GameUI.createFloorSelectionEmbed(game);
      const buttons = GameUI.createFloorSelectionButtons(game);
      await interaction.update({ embeds: [embed], components: buttons });
    } else if (customId === 'floor_page_next') {
      // Go to next page
      const maxPages = Math.ceil((game.eventMode ? 28 : 21) / 14);
      game.floorSelectionPage = Math.min(maxPages - 1, (game.floorSelectionPage || 0) + 1);
      const embed = GameUI.createFloorSelectionEmbed(game);
      const buttons = GameUI.createFloorSelectionButtons(game);
      await interaction.update({ embeds: [embed], components: buttons });
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
    } else if (customId === 'mega_grid_start') {
      await handleMegaGridStart(interaction, game);
    } else if (customId.startsWith('mega_grid_pick_')) {
      await handleMegaGridPick(interaction, game);
    } else if (customId === 'infinity_start') {
      await handleInfinityStart(interaction, game);
    } else if (customId === 'infinity_left' || customId === 'infinity_right') {
      await handleInfinityPick(interaction, game, customId === 'infinity_left' ? 'left' : 'right');
    } else if (customId === 'infinity_stop') {
      await handleInfinityStop(interaction, game);
    } else if (customId === 'hideout_start') {
      await handleHideoutBreakthroughStart(interaction, game);
    } else if (customId.startsWith('hideout_pick_')) {
      await handleHideoutBreakthroughPick(interaction, game);
    } else if (customId === 'babushka_start') {
      await handleBabushkaStart(interaction, game);
    } else if (customId.startsWith('babushka_select_')) {
      await handleBabushkaSelect(interaction, game);
    } else if (customId === 'babushka_reveal') {
      await handleBabushkaReveal(interaction, game);
    } else if (customId === 'babushka_continue') {
      await handleBabushkaContinue(interaction, game);
    } else if (customId === 'babushka_bank') {
      await handleBabushkaBank(interaction, game);
    } else if (customId === 'babushka_cashout') {
      await handleBabushkaCashout(interaction, game);
    } else if (customId === 'boiling_point_start') {
      await handleBoilingPointStart(interaction, game);
    } else if (customId === 'boiling_point_hotter') {
      await handleBoilingPointAction(interaction, game, 'hotter');
    } else if (customId === 'boiling_point_colder') {
      await handleBoilingPointAction(interaction, game, 'colder');
    } else if (customId === 'boiling_point_change') {
      await handleBoilingPointChange(interaction, game);
    } else if (customId === 'boiling_point_change_hotter') {
      await handleBoilingPointChangeAction(interaction, game, 'hotter');
    } else if (customId === 'boiling_point_change_colder') {
      await handleBoilingPointChangeAction(interaction, game, 'colder');
    } else if (customId === 'boiling_point_cancel_change') {
      await handleBoilingPointCancelChange(interaction, game);
    } else if (customId === 'operator_roshambo_start') {
      await handleOperatorRoshamboStart(interaction, game);
    } else if (customId === 'operator_roshambo_rock') {
      await handleOperatorRoshamboChoice(interaction, game, 'rock');
    } else if (customId === 'operator_roshambo_paper') {
      await handleOperatorRoshamboChoice(interaction, game, 'paper');
    } else if (customId === 'operator_roshambo_scissors') {
      await handleOperatorRoshamboChoice(interaction, game, 'scissors');
    } else if (customId === 'mystery_box_1') {
      await handleMysteryBoxSelection(interaction, game, 0);
    } else if (customId === 'mystery_box_2') {
      await handleMysteryBoxSelection(interaction, game, 1);
    } else if (customId === 'mystery_box_3') {
      await handleMysteryBoxSelection(interaction, game, 2);
    } else if (customId === 'mystery_box_4') {
      await handleMysteryBoxSelection(interaction, game, 3);
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

  // Show partial result first (freeze effect)
  const partialEmbed = GameUI.createPartialResultEmbed(game, floorNumber, choice, appliedAmount, moneyBefore, moneyAfter);

  // Acknowledge interaction immediately if not already done
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  // Show partial result
  await interaction.editReply({ embeds: [partialEmbed], components: [] });

  // Wait for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Update with full result
  await interaction.editReply({ embeds: [resultEmbed], components: [] });

  // Check for event tiles (The Vault, Operator Offer, Mega Grid, Infinity %, Hideout Breakthrough, Babushka)
  if (chosenAmount.type === 'event') {
    if (chosenAmount.action === 'vault') {
      await handleVaultMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'operator_offer') {
      await handleOperatorOffer(interaction, game);
      return;
    } else if (chosenAmount.action === 'mega_grid') {
      await handleMegaGridMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'infinity_percent') {
      await handleInfinityPercentMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'hideout_breakthrough') {
      await handleHideoutBreakthroughMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'babushka') {
      await handleBabushkaMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'boiling_point') {
      await handleBoilingPointMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'operator_roshambo') {
      await handleOperatorRoshamboMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'mystery_box') {
      await handleMysteryBoxMinigame(interaction, game);
      return;
    }
  }

  // Check for special tiles (Random %)
  if (chosenAmount.type === 'special' && chosenAmount.action === 'random_percentage') {
    await handleRandomPercentage(interaction, game);
    return;
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
    await interaction.deferReply();

    const eventMode = await db.getEventMode(interaction.guildId);

    const embed = new (require('discord.js').EmbedBuilder)()
      .setColor(eventMode ? '#FF1493' : '#FFD700')
      .setTitle(eventMode ? '🌟 Season 1 Mode Active 🌟' : '🏢 Normal Mode Active')
      .setDescription(
        (eventMode ?
          '**Season 1 Mode is currently ENABLED for this server!**\n\n' +
          '✨ **Season 1 Features Active:**\n• 28 Floors across 7 rounds\n• Mega Grid & The ∞% minigames\n• Boost Multiplier & Random 5\n• The Vault, Operator Offer & Hideout Breakthrough\n' :
          '**Normal Mode is currently active for this server.**\n\n' +
          '📊 **Current Features:**\n• 21 Floors across 6 rounds\n• Classic gameplay\n'
        ) +
        '\n*Admins can toggle modes with `/event-mode`*'
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
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

  // If game ended early (before completing all 28 floors), show what was behind unplayed floors
  if (game.floorsCompleted < 28) {
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

  // If game ended early (not completed all 28 floors), show what was behind unplayed floors
  if (reason !== 'completed' && game.floorsCompleted < 28) {
    const unplayedFloors = game.getUnplayedFloors();
    const unplayedEmbed = GameUI.createUnplayedFloorsEmbed(unplayedFloors);

    if (unplayedEmbed) {
      await interaction.followUp({ embeds: [unplayedEmbed], components: [] });
    }
  }

  // End the game
  gameManager.endGame(interaction.channelId);
}

// --- MEGA GRID HANDLERS ---

async function handleMegaGridMinigame(interaction, game) {
  // Initialize minigame
  game.startMegaGrid();

  const embed = GameUI.createMegaGridIntroEmbed(game);
  const buttons = GameUI.createMegaGridButtons(game, true); // Show start button

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleMegaGridStart(interaction, game) {
  const embed = GameUI.createMegaGridRoundEmbed(game);
  const buttons = GameUI.createMegaGridButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleMegaGridPick(interaction, game) {
  const choiceIndex = parseInt(interaction.customId.split('_')[3]);

  // Show suspense message
  await interaction.update({
    content: '🎲 Revealing tile...',
    embeds: [],
    components: []
  });

  // Wait for suspense (1.5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = game.playMegaGridRound(choiceIndex);

  if (!result) return; // Should not happen

  const resultEmbed = GameUI.createMegaGridResultEmbed(game, result);

  if (result.gameOver || !game.megaGridState.isActive) {
    // Game Over or Jackpot
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Show what was behind unpicked tiles
    const unpickedEmbed = GameUI.createMegaGridUnpickedEmbed(game);
    await interaction.followUp({ embeds: [unpickedEmbed] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Round cleared, show result then next round
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show next round
    const nextEmbed = GameUI.createMegaGridRoundEmbed(game);
    const nextButtons = GameUI.createMegaGridButtons(game);
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

async function handleMegaGridCashout(interaction, game) {
  // End minigame and take money
  game.megaGridState.isActive = false;
  game.totalMoney += game.megaGridState.accumulatedReward;

  const resultEmbed = GameUI.createMegaGridResultEmbed(game, 'cashout');
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Show full grid reveal
  const unpickedEmbed = GameUI.createMegaGridUnpickedEmbed(game);
  await interaction.followUp({ embeds: [unpickedEmbed] });

  // Continue game
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
}

// === BOILING POINT HANDLERS ===

async function handleBoilingPointStart(interaction, game) {
  game.startBoilingPoint();

  const embed = GameUI.createBoilingPointRoundEmbed(game);
  const buttons = GameUI.createBoilingPointButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleBoilingPointAction(interaction, game, action) {
  // Handle Hotter/Colder
  const result = game.playBoilingPoint(action);

  if (!result) return;

  if (result.gameOver) {
    const resultEmbed = GameUI.createBoilingPointResultEmbed(game, result);
    await interaction.update({ embeds: [resultEmbed], components: [] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Next step
    const embed = GameUI.createBoilingPointRoundEmbed(game);
    const buttons = GameUI.createBoilingPointButtons(game);
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

async function handleBoilingPointChange(interaction, game) {
  // Show change options
  const embed = GameUI.createBoilingPointRoundEmbed(game);
  const buttons = GameUI.createBoilingPointChangeButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleBoilingPointChangeAction(interaction, game, action) {
  // Handle Change & Hotter/Colder
  const result = game.playBoilingPoint(action, true); // true = isChange

  if (!result) return;

  if (result.gameOver) {
    const resultEmbed = GameUI.createBoilingPointResultEmbed(game, result);
    await interaction.update({ embeds: [resultEmbed], components: [] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Next step
    const embed = GameUI.createBoilingPointRoundEmbed(game);
    const buttons = GameUI.createBoilingPointButtons(game);
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

async function handleBoilingPointCancelChange(interaction, game) {
  // Return to normal buttons
  const embed = GameUI.createBoilingPointRoundEmbed(game);
  const buttons = GameUI.createBoilingPointButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

// --- THE ∞% HANDLERS ---

async function handleInfinityPercentMinigame(interaction, game) {
  game.startInfinityPercent();

  const embed = GameUI.createInfinityPercentIntroEmbed(game);
  const buttons = GameUI.createInfinityPercentButtons(game, true);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleInfinityStart(interaction, game) {
  const embed = GameUI.createInfinityPercentRoundEmbed(game);
  const buttons = GameUI.createInfinityPercentButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleInfinityPick(interaction, game, choice) {
  const result = game.playInfinityPercentRound(choice);

  if (!result) return;

  const resultEmbed = GameUI.createInfinityPercentResultEmbed(game, result);

  if (result.gameOver) {
    // Game Over (3 strikes)
    await interaction.update({ embeds: [resultEmbed], components: [] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Round result
    await interaction.update({ embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show next round
    const nextEmbed = GameUI.createInfinityPercentRoundEmbed(game);
    const nextButtons = GameUI.createInfinityPercentButtons(game);
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

async function handleInfinityStop(interaction, game) {
  const result = game.cashoutInfinityPercent();

  const resultEmbed = GameUI.createInfinityPercentResultEmbed(game, 'cashout');
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Continue game
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
}

// --- HIDEOUT BREAKTHROUGH HANDLERS ---

async function handleHideoutBreakthroughMinigame(interaction, game) {
  // Initialize minigame
  game.startHideoutBreakthrough();

  const embed = GameUI.createHideoutBreakthroughIntroEmbed(game);
  const buttons = GameUI.createHideoutBreakthroughButtons(game, true); // Show start button

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleHideoutBreakthroughStart(interaction, game) {
  const embed = GameUI.createHideoutBreakthroughRoundEmbed(game);
  const buttons = GameUI.createHideoutBreakthroughButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleHideoutBreakthroughPick(interaction, game) {
  const buttonIndex = parseInt(interaction.customId.split('_')[2]);

  // Show suspense message
  await interaction.update({
    content: '🎲 Revealing number...',
    embeds: [],
    components: []
  });

  // Wait for suspense (1.5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Process the pick
  const result = game.playHideoutBreakthroughRound(buttonIndex);

  if (!result) return; // Should not happen

  const resultEmbed = GameUI.createHideoutBreakthroughResultEmbed(game, result);

  if (result.gameOver) {
    // Game Over (win or fail)
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Show what was behind unpicked buttons
    const unpickedEmbed = GameUI.createHideoutBreakthroughUnpickedEmbed(game);
    await interaction.followUp({ embeds: [unpickedEmbed] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else {
    // Round cleared, show result then next round
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show next round
    const nextEmbed = GameUI.createHideoutBreakthroughRoundEmbed(game);
    const nextButtons = GameUI.createHideoutBreakthroughButtons(game);
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

// --- BABUSHKA HANDLERS ---

async function handleBabushkaMinigame(interaction, game) {
  // Initialize minigame
  game.startBabushka();

  const embed = GameUI.createBabushkaIntroEmbed(game);
  const buttons = GameUI.createBabushkaButtons(game, true); // Show start button

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleBabushkaStart(interaction, game) {
  const embed = GameUI.createBabushkaSelectionEmbed(game);
  const buttons = GameUI.createBabushkaButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleBabushkaSelect(interaction, game) {
  const dollIndex = parseInt(interaction.customId.split('_')[2]);

  // Select the doll
  const result = game.selectBabushkaDoll(dollIndex);

  if (!result) return;

  // Show selected doll with reveal button
  const embed = new EmbedBuilder()
    .setColor('#FF6B9D')
    .setTitle('🪆 BABUSHKA - Doll Selected')
    .setDescription(
      `You selected doll #${dollIndex + 1}!\n\n` +
      'Click Reveal to open the doll and see what\'s inside...'
    );

  const buttons = GameUI.createBabushkaButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleBabushkaReveal(interaction, game) {
  // Show suspense message
  await interaction.update({
    content: '🎁 Opening the doll...',
    embeds: [],
    components: []
  });

  // Wait for suspense (1.5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Reveal the layer
  const result = game.revealBabushkaLayer();

  if (!result) return;

  const resultEmbed = GameUI.createBabushkaLayerEmbed(game, result);

  if (result.gameOver) {
    // Game Over - 3 strikes
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Show all dolls revealed
    const unpickedEmbed = GameUI.createBabushkaUnpickedEmbed(game, game.babushkaState.dolls);
    await interaction.followUp({ embeds: [unpickedEmbed] });

    // Continue game
    const continueButtons = GameUI.createContinueButton();
    await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
  } else if (result.isEmpty) {
    // Strike - show result then return to selection
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // If not game over, show selection again
    if (game.babushkaState.isActive) {
      const nextEmbed = GameUI.createBabushkaSelectionEmbed(game);
      const nextButtons = GameUI.createBabushkaButtons(game);
      await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
    }
  } else if (result.isAutoBank) {
    // 10M Auto-banked - show result then return to selection
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show selection again
    if (game.babushkaState.isActive) {
      const nextEmbed = GameUI.createBabushkaSelectionEmbed(game);
      const nextButtons = GameUI.createBabushkaButtons(game);
      await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
    }
  } else {
    // Layer found - show continue/bank buttons
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show continue/bank buttons
    const buttons = GameUI.createBabushkaButtons(game);
    await interaction.followUp({ embeds: [resultEmbed], components: buttons });
  }
}

async function handleBabushkaContinue(interaction, game) {
  // Player chose to continue to next layer
  game.continueBabushka();

  // Show reveal button again
  const embed = new EmbedBuilder()
    .setColor('#FF6B9D')
    .setTitle('🪆 BABUSHKA - Going Deeper')
    .setDescription(
      `You chose to continue!\n\n` +
      `**Current Layer:** ${game.babushkaState.currentLayer}\n` +
      `**Current Doll Value:** $${GameUI.formatMoney(game.babushkaState.currentDollValue)}\n` +
      `**Stashed Money:** $${GameUI.formatMoney(game.babushkaState.accumulatedMoney)}\n\n` +
      'Click Reveal to see the next layer...'
    );

  const buttons = GameUI.createBabushkaButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleBabushkaBank(interaction, game) {
  // Bank current doll to stash
  const result = game.bankBabushka();

  const resultEmbed = GameUI.createBabushkaBankEmbed(game, result);
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Wait a bit (longer to read the "what if" reveal)
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Show selection again
  if (game.babushkaState.isActive) {
    const nextEmbed = GameUI.createBabushkaSelectionEmbed(game);
    const nextButtons = GameUI.createBabushkaButtons(game);
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

async function handleBabushkaCashout(interaction, game) {
  // "Walk Away" - End minigame
  const result = game.cashoutBabushka();

  if (!result) {
    return interaction.reply({ content: '❌ Game already ended!', ephemeral: true });
  }

  const cashoutEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🏃 BABUSHKA - WALKED AWAY')
    .setDescription(
      `You decided to walk away with your Stash!\n\n` +
      `**Total Won:** $${GameUI.formatMoney(result.finalAmount)}\n` +
      `**Total Money:** $${GameUI.formatMoney(result.totalMoney)}`
    );

  await interaction.update({ embeds: [cashoutEmbed], components: [] });

  // Show what was in all dolls
  const unpickedEmbed = GameUI.createBabushkaUnpickedEmbed(game, result.allDolls);
  await interaction.followUp({ embeds: [unpickedEmbed] });

  // Continue game
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Moving to next floor...**', components: continueButtons });
}

// --- TEST COMMAND HANDLERS ---

async function handleTestBoostCommand(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 100000; // Start with $100,000 for testing

    const multiplier = (Math.random() * 3).toFixed(2);
    const moneyBefore = testGame.totalMoney;
    testGame.totalMoney = Math.floor(testGame.totalMoney * multiplier);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🧪 Testing Boost Multiplier')
      .setDescription(
        `**Multiplier:** ${multiplier}x\n` +
        `**Money Before:** $${GameUI.formatMoney(moneyBefore)}\n` +
        `**Money After:** $${GameUI.formatMoney(testGame.totalMoney)}\n\n` +
        `**Change:** +$${GameUI.formatMoney(testGame.totalMoney - moneyBefore)}`
      );

    await interaction.editReply({ embeds: [embed] });
    gameManager.endGame(interaction.channelId);
  } else {
    await interaction.editReply({ content: '❌ A game is already active. Use `/stopgame` first.' });
  }
}



async function handleTestVaultCommand(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 50000;

    // Start The Vault
    testGame.startVault();

    const embed = GameUI.createVaultIntroEmbed(testGame);
    const buttons = GameUI.createVaultButtons(testGame);

    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.editReply({ content: '❌ A game is already active. Use `/stopgame` first.' });
  }
}

async function handleTestInfinityCommand(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 100000;

    // Start The ∞%
    testGame.startInfinityPercent();

    const embed = GameUI.createInfinityPercentIntroEmbed(testGame);
    const buttons = GameUI.createInfinityPercentButtons(testGame, true);

    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.editReply({ content: '❌ A game is already active. Use `/stopgame` first.' });
  }
}

async function handleTestMegaGridCommand(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 100000; // Start with $100,000 for testing
    testGame.eventMode = true; // Enable event mode

    await interaction.editReply({ content: '🧪 **Test game created!** Starting Mega Grid minigame...' });

    // Trigger Mega Grid minigame
    await handleMegaGridMinigame(interaction, testGame);
  } else {
    await interaction.editReply({ content: '❌ A game is already active in this channel. Stop it first with `/stopgame`.' });
  }
}

async function handleTestHideoutCommand(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 100000; // Start with $100,000 for testing
    testGame.eventMode = true; // Enable event mode

    await interaction.editReply({ content: '🧪 **Test game created!** Starting Hideout Breakthrough minigame...' });

    // Trigger Hideout Breakthrough minigame
    await handleHideoutBreakthroughMinigame(interaction, testGame);
  } else {
    await interaction.editReply({ content: '❌ A game is already active in this channel. Stop it first with `/stopgame`.' });
  }
}

async function handleTestBabushka(interaction) {
  await interaction.deferReply();

  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    const testGame = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
    testGame.totalMoney = 100000; // Start with $100,000 for testing
    testGame.eventMode = true; // Enable event mode

    await interaction.editReply({ content: '🧪 **Test game created!** Starting Babushka minigame...' });

    // Trigger Babushka minigame
    await handleBabushkaMinigame(interaction, testGame);
  } else {
    await interaction.editReply({ content: '❌ A game is already active in this channel. Stop it first with `/stopgame`.' });
  }
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
