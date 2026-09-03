require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const Database = require('./database');
const { GameState, GameManager } = require('./gameManager');
const GameUI = require('./gameUI');
const config = require('./config.json');
const MountCashmore = require('./MountCashmore');
const OneEgg = require('./OneEgg');
const rtabConfig = require('./RTAB/rtab_config.json');

// Tower of Cash Achievement System
const { TowerAchievements, ACHIEVEMENTS, AchievementType } = require('./TowerAchievements');
const towerAchievements = new TowerAchievements();
const AchievementHelper = require('./achievementHelper');

// RTAB (Race To A Billion) modules
const { RTABLobby, RTABGame } = require('./RTAB/RTABGame');
const RTABUI = require('./RTAB/rtabUI');
const RTABDatabase = require('./RTAB/rtabDatabase');
const RTABAchievements = require('./RTAB/RTABAchievements');
const RTABReplay = require('./RTAB/RTABReplay');
const RTABStatistics = require('./RTAB/RTABStatistics');

// Season 2 Modules
const Season2Minigames = require('./Season2/Season2Minigames');
const BossFloors = require('./Season2/BossFloors');
const AscentPacts = require('./Season2/AscentPacts');
const { MinigameMasterSession } = require('./Season2/MinigameMaster');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const db = new Database();
const gameManager = new GameManager();
const hmieLobbies = new Map(); // channelId -> { players: [], countdown: timeout, createdAt, messageId }
const mountCashmoreGames = new Map(); // channelId -> MountCashmore game instance
const oneEggGames = new Map(); // channelId -> OneEgg game instance (or lobby)
const giveaways = new Map(); // channelId -> { prize, winners, participants: [], messageId, endTime, timeout }
const rtabLobbies = new Map(); // channelId -> RTABLobby
const rtabGames = new Map();   // channelId -> RTABGame
const minigameMasterSessions = new Map(); // channelId -> MinigameMasterSession

// Helper to safely respond to interactions with retry logic for 503 errors
async function safeInteractionResponse(interaction, method, options, maxRetries = 3) {
  // Check if interaction is still valid (interactions expire after 15 minutes)
  const interactionAge = Date.now() - interaction.createdTimestamp;
  if (interactionAge > 14 * 60 * 1000) { // 14 minutes to be safe
    console.warn('Interaction token likely expired');
    return null;
  }

  // State-based safety checks
  if (method === 'reply' || method === 'deferReply' || method === 'update') {
    if (interaction.replied || interaction.deferred) {
      // If we're trying to reply/defer but already did, skip or convert to editReply/followUp if appropriate
      // But for now, just return to avoid the "already replied" error
      return null;
    }
  }

  if (method === 'editReply' || method === 'followUp') {
    if (!interaction.replied && !interaction.deferred && method === 'editReply') {
      // Can't edit a reply that doesn't exist; use reply instead if possible
      method = 'reply';
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await interaction[method](options);
    } catch (error) {
      // Handle specific Discord errors
      if (error.code === 10062) {
        // Unknown interaction - token expired or already used
        console.warn('Interaction expired or already acknowledged');
        return null;
      }

      if (error.code === 40060) {
          // Interaction has already been acknowledged
          return null;
      }
      
      if (error.status === 503 && attempt < maxRetries) {
        // Service Unavailable - retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`Discord API unavailable (503), retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's the last attempt or a non-retryable error, throw it
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}

// Bot runner for OneEgg: observes game state and performs automated actions for 'bot_oneegg'
async function runOneEggBotLoop(channelId) {
  while (true) {
    try {
      const game = oneEggGames.get(channelId);
      if (!game || game.type === 'LOBBY' || !game.isActive) return;
      // Determine bot side
      const botSide = (game.players.left && game.players.left.id === 'bot_oneegg') ? 'left' : ((game.players.right && game.players.right.id === 'bot_oneegg') ? 'right' : null);
      if (!botSide) return;
      
      // Wait if animation is in progress
      if (game.animationInProgress) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Small tick delay
      await new Promise(r => setTimeout(r, 800));

      // Carton Selection phase: if bot hasn't selected
      if (game.phase === 'CARTON_SELECTION') {
        const botSelected = game.cartonSelections[botSide] !== undefined;
        if (!botSelected) {
            await new Promise(r => setTimeout(r, 1000));
            const randomCarton = Math.floor(Math.random() * 10);
            // We can pick any, handled logic will validate (though logic allows dups? OneEgg.js checks "Carton already taken")
            // So we loop until valid or retry next tick
            const r = game.handleCartonSelection('bot_oneegg', randomCarton);
            
            if (r.complete) {
                 // Transition to Starter
                 const channel = await client.channels.fetch(channelId).catch(() => null);
                 if (channel && game.messageId) {
                     const msg = await channel.messages.fetch(game.messageId).catch(() => null);
                     if (msg) {
                         const embed = GameUI.createOneEggStarterEmbed(game);
                         const buttons = GameUI.createOneEggStarterButtons(game);
                         const leftCap = game.players.left.maxEggs;
                         const rightCap = game.players.right.maxEggs;
                         await msg.edit({ 
                             content: `📦 **Cartons Selected!**\n🅰️ ${game.players.left.username}: Max ${leftCap} eggs\n🅱️ ${game.players.right.username}: Max ${rightCap} eggs\n\nStarting selection phase...`, 
                             embeds: [embed], 
                             components: buttons 
                         }).catch(() => {});
                     }
                 }
            } else if (!r.error) {
                 // Waiting UI
                 const channel = await client.channels.fetch(channelId).catch(() => null);
                 if (channel && game.messageId) {
                     const msg = await channel.messages.fetch(game.messageId).catch(() => null);
                     if (msg) {
                         const embed = GameUI.createOneEggCartonEmbed(game);
                         const buttons = GameUI.createOneEggCartonButtons(game);
                         await msg.edit({ embeds: [embed], components: buttons }).catch(() => {});
                     }
                 }
            }
        }
        await new Promise(r => setTimeout(r, 1000));
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Starter Selection phase: Bot picks one of 6 boxes
      if (game.phase === 'STARTER_SELECTION') {
        const checkSide = botSide === 'left' ? 'right' : 'left';
        // Check if ANYONE has picked the box? OneEgg logic handles "Box already taken" error
        // But we can peek at game.boxSelections to be smart (and avoid error spam)
        const checkTaken = (idx) => {
            return (game.boxSelections.left === idx) || (game.boxSelections.right === idx);
        };
        
        // Bot hasn't picked if boxSelections[botSide] is undefined
        const botPicked = game.boxSelections[botSide] !== undefined;
        
        if (!botPicked) {
             await new Promise(r => setTimeout(r, 1500));
             
             // Pick random available
             let opts = [0,1,2,3,4,5].filter(i => !checkTaken(i));
             if (opts.length === 0) opts = [0]; // Fallback if all look taken (shouldn't occur in 2 player logic unless bug)
             
             const pick = opts[Math.floor(Math.random() * opts.length)];
             
             const r = game.handleStarterSelection('bot_oneegg', pick);
             
             // If completed phase (both picked), handle transition to STARTER_DECISION
             // But usually OneEgg.js returns { complete: true, decisionMaker: ... }
             // We need to update UI if it completed OR if it just updated valid selection (waiting state)
             
             const channel = await client.channels.fetch(channelId).catch(() => null);
             if (channel && game.messageId) {
                 const msg = await channel.messages.fetch(game.messageId).catch(() => null);
                 if (msg) {
                     if (r.complete) {
                         // Phase complete! Show Decision UI
                         const embed = GameUI.createOneEggTurnOrderEmbed(game, r.decisionMaker, 30);
                         // If bot is decision maker, show bot thinking... or show buttons if human
                         let buttons = [];
                         if (r.decisionMaker !== botSide) {
                             // Human decides
                             buttons = [GameUI.createOneEggTurnOrderButtons(game.players[r.decisionMaker].id)];
                         } else {
                             // Bot decides (no buttons needed, next loop tick handles STARTER_DECISION)
                         }
                         await msg.edit({ content: `✅ **Selection Complete!**\n${game.players[r.decisionMaker].username} has more eggs!`, embeds: [embed], components: buttons }).catch(() => {});
                     } else if (!r.error) {
                         // Waiting state
                         // Just refresh buttons to show "Taken" (if applicable) or update Waiting embed
                         if (r.waiting) {
                             const embed = GameUI.createOneEggStarterWaitingEmbed(game, botSide);
                             // We should probably show the buttons disabled or partially taken for the other player
                             // Or just keep the Starter Buttons active for the human?
                             const buttons = GameUI.createOneEggStarterButtons(game);
                             await msg.edit({ embeds: [embed], components: buttons }).catch(() => {});
                         }
                     }
                 }
             }
        }
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Starter decision phase: if bot decides who goes first
      if (game.phase === 'STARTER_DECISION') {
        if (game.decisionMaker === botSide) {
          // choose randomly to go first or second
          // Wait a bit to simulate thinking
          await new Promise(r => setTimeout(r, 2000));
          
          const chooseFirst = Math.random() < 0.5;
          const goesFirst = chooseFirst ? botSide : (botSide === 'left' ? 'right' : 'left');
          game.setTurnOrder(goesFirst);
          
          // Show announcement and transition (similar to handler)
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && game.messageId) {
            const msg = await channel.messages.fetch(game.messageId).catch(() => null);
            if (msg) {
                // Announcement
                const announcementEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ TURN ORDER SET!')
                    .setDescription(
                        `**${game.players[goesFirst].username}** will select FIRST!\n\n` +
                        `Starting Round 1...`
                    );
                await msg.edit({ embeds: [announcementEmbed], components: [] }).catch(() => {});
                
                // Delay 3s
                await new Promise(r => setTimeout(r, 3000));
                
                // Main Game UI
                const embed = GameUI.createOneEggMainEmbedEnhanced(game, null, goesFirst);
                const row = GameUI.createOneEggBoxButtons(game);
                await msg.edit({ content: '', embeds: [embed], components: row }).catch(() => {});
            }
          }
        }
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      // Main gameplay: act when it's bot's turn
      if (game.phase === 'MAIN_GAME') {
        const currentSide = game.turnOrder[game.currentTurnIndex];
        if (currentSide === botSide) {
          // Check if animation is in progress (human just picked, waiting for bot)
          if (game.animationInProgress) {
            // Wait a bit before making bot's pick
            await new Promise(r => setTimeout(r, 1500));
          }
          
          // Pick an available box
          // NOTE: In One Egg, players CAN pick the same box (design allows it)
          // So we don't filter by "taken" boxes - just pick randomly from all 3
          const options = [0, 1, 2];
          const pick = options[Math.floor(Math.random() * options.length)];
          const result = game.handleBoxSelection('bot_oneegg', pick);

          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && game.messageId) {
            const msg = await channel.messages.fetch(game.messageId).catch(() => null);
              if (msg) {
                if (result.waiting) {
                  // Bot picked first, show waiting UI with ACTIVE buttons for human
                  const embed = GameUI.createOneEggMainEmbed(game);
                  const activeRow = GameUI.createOneEggBoxButtons(game);
                  await msg.edit({ 
                    content: `📦 **${game.players[botSide].username}** picked a box! Waiting for your turn...`,
                    embeds: [embed], 
                    components: activeRow // already an array
                  }).catch(() => {});
                  // Human will pick next, which will trigger resolution
                } else if (result.results) {
                  // Replay the same suspense + reveal flow used for human players
                  try {
                    game.animationInProgress = true;

                    // 1. Box Selected! (Immediate feedback)
                    const side = botSide === 'left' ? game.players.left.username : game.players.right.username;
                    const suspenseEmbed = new EmbedBuilder()
                      .setColor('#FFD700')
                      .setTitle('📦 Box Selected!')
                      .setDescription(`**${game.players[botSide].username}** has chosen the cox...\n\nTime to face the truth...`);
                    await msg.edit({ embeds: [suspenseEmbed], components: [GameUI.createDisabledPlaceholderButtons()] }).catch(() => {});
                    await new Promise(r => setTimeout(r, 2000));

                    // 2. Countdown 3..2..1
                    for (let i = 3; i >= 1; i--) {
                      const countEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⏳ Opening...')
                        .setDescription(`## ${i}...`);
                      await msg.edit({ embeds: [countEmbed] }).catch(() => {});
                      await new Promise(r => setTimeout(r, 1000));
                    }

                    // 3. REVEAL Items (Sequential Loop based on Turn Order)
                    for (const res of result.results) {
                      const revealSide = res.player || res.side; // OneEgg.js returns { player: side, ... }
                      const revealItem = res.item || { type: 'unknown' };
                      const revealEmbed = GameUI.createOneEggItemFoundEmbed(game, revealSide, revealItem);
                      await msg.edit({ embeds: [revealEmbed] }).catch(() => {});
                      await new Promise(r => setTimeout(r, 3000));
                    }

                    game.animationInProgress = false;

                    // 4. Transition to next state (same logic as human flow)
                    if (result.gameEnded) {
                      const winnerPlayer = game.players[game.winner];
                      const loserPlayer = game.players[game.loser];
                      const winReason = winnerPlayer.eggs === 2 ? 'reached **2 EGGS**!' : `**${loserPlayer.username}** reached **1 EGG** and lost!`;

                      try {
                        const transitionEmbed = new EmbedBuilder()
                          .setColor('#FFD700')
                          .setTitle('🏆 WINNER DECLARED!')
                          .setDescription(`**${winnerPlayer.username}** ${winReason}\n\nEntering **BONUS ROUND**...`);
                        await msg.edit({ embeds: [transitionEmbed], components: [] }).catch(() => {});
                        await new Promise(r => setTimeout(r, 3000));

                        game.startBonusRound();
                        const loserId = game.players[game.loser].id;
                        const loserEmbed = GameUI.createOneEggBonusLoserPickEmbed(game);
                        const loserBtns = GameUI.createOneEggBonusLoserPickButtons(loserId);
                        await msg.edit({ content: '🥚 **BONUS ROUND START!**', embeds: [loserEmbed], components: [loserBtns] }).catch(() => {});
                      } catch (e) {
                        console.warn('Failed to start bonus round in bot loop (early):', e);
                        const finalEmbed = GameUI.createOneEggEndEmbed(game, result.winner);
                        await db.updateOneEggStats(game.players[result.winner].id, game.guildId, { won: true, goldenEggs: game.players[result.winner].goldenEggs, money: game.players[result.winner].money });
                        try { await db.addToPlayerHighScore(game.players[result.winner].id, game.guildId, Math.floor((game.players[result.winner].money || 0) * 2), game.players[result.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
                        await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
                        await msg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
                        oneEggGames.delete(channelId);
                        return;
                      }
                    } else if (result.phaseChange === 'FINAL_BOX') {
                      try {
                        await msg.edit({ content: '⏰ Time\'s up — final box incoming!', embeds: [], components: [] }).catch(() => {});
                        game.currentBoxes = game.generateRoundBoxes();
                        game.boxSelections = {};
                        game.currentTurnIndex = 0;
                        const finalEmbed = GameUI.createOneEggMainEmbed(game);
                        const finalRow = GameUI.createOneEggBoxButtons(game);
                        await msg.edit({ content: '', embeds: [finalEmbed], components: finalRow }).catch(() => {});
                      } catch (e) {
                        console.warn('Failed to present FINAL_BOX in bot loop:', e);
                        game.sellAllEggs();
                        await msg.edit({ content: 'Game Over (Time Limit). Eggs sold.', embeds: [], components: [] }).catch(() => {});
                        oneEggGames.delete(channelId);
                        return;
                      }
                    } else {
                      const embed = GameUI.createOneEggMainEmbed(game, result.results);
                      const row = GameUI.createOneEggBoxButtons(game);
                      await msg.edit({ embeds: [embed], components: row }).catch(() => {});
                    }
                  } catch (e) {
                    console.warn('Error during bot reveal flow:', e);
                    game.animationInProgress = false;
                  }
                }
              }
            }
          }
        }

      // BONUS_ROUND automated decisions for bot
      if (game.phase === 'BONUS_ROUND') {
        const loserSide = game.bonus && (game.bonus.loserSide || game.bonus.loserSide === 0 ? game.bonus.loserSide : null);
        const loserIsBot = loserSide && game.players[loserSide] && game.players[loserSide].id === 'bot_oneegg';
        const championIsBot = game.players[game.winner] && game.players[game.winner].id === 'bot_oneegg';

        // Prefer authoritative 'step' state if available (newer bonus implementation)
        const bonusStep = game.bonus && game.bonus.step;

        // Determine if loser needs to pick: use step if present, otherwise fall back to checking chosen/picked fields
        const loserNeedsPick = bonusStep ? (bonusStep === 'LOSER_PICK') : (game.bonus && (typeof game.bonus.chosenIndex === 'undefined' && typeof game.bonus.pickedBoxIndex === 'undefined'));
        if (loserIsBot && game.bonus && loserNeedsPick) {
          const delayMs = 1000 + Math.floor(Math.random() * 2000); // 1-3s
          await new Promise(r => setTimeout(r, delayMs));
          const pick = Math.random() < 0.5 ? 0 : 1;
          game.loserPickBonusBox(game.players[loserSide].id, pick);

          // Update UI to show box picked (similar to human flow)
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && game.messageId) {
            const msg = await channel.messages.fetch(game.messageId).catch(() => null);
            if (msg) {
              await msg.edit({ 
                content: `📦 **${game.players[loserSide].username}** (bot) has selected a box!\n\nSending to Champion...`, 
                embeds: [], 
                components: [] 
              }).catch(() => {});
              await new Promise(r => setTimeout(r, 2000));

              const champId = game.players[game.winner].id;
              const champEmbed = GameUI.createOneEggBonusChampionDecisionEmbed(game);
              const champBtns = GameUI.createOneEggBonusChampionDecisionButtons(champId);
              await msg.edit({ content: '👑 **CHAMPION\'S DECISION**', embeds: [champEmbed], components: [champBtns] }).catch(() => {});
            }
          }
        }

        // Determine if champion needs to decide
        const champNeedsDecision = bonusStep ? (bonusStep === 'CHAMPION_DECIDE') : (game.bonus && ((typeof game.bonus.championOpened === 'undefined') && (typeof game.bonus.chosenIndex !== 'undefined' || typeof game.bonus.pickedBoxIndex !== 'undefined')));
        if (championIsBot && game.bonus && champNeedsDecision) {
          const delayMs = 1000 + Math.floor(Math.random() * 2000);
          await new Promise(r => setTimeout(r, delayMs));
          const open = Math.random() < 0.5;
          const res = game.championDecideOpen(game.players[game.winner].id, open);
          
          if (res && res.error) {
             console.warn(`[OneEggBot][${channelId}] championDecideOpen error:`, res.error);
             // Avoid tight loop
             await new Promise(r => setTimeout(r, 2000));
             continue;
          }

          if (res) {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel && game.messageId) {
              const msg = await channel.messages.fetch(game.messageId).catch(() => null);
              if (msg) {
                if (res.ended || res.gameEnded) {
                  const finalEmbed = GameUI.createOneEggEndEmbed(game, game.winner);
                  await msg.edit({ content: `Champion (bot) ${open ? 'opened' : 'declined'} the box.`, embeds: [finalEmbed], components: [] }).catch(() => {});
                  // Persist stats
                  await db.updateOneEggStats(game.players[game.winner].id, game.guildId, { won: true, goldenEggs: game.players[game.winner].goldenEggs, money: game.players[game.winner].money });
                  try { await db.addToPlayerHighScore(game.players[game.winner].id, game.guildId, Math.floor((game.players[game.winner].money || 0) * 2), game.players[game.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
                  await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
                  
                  oneEggGames.delete(channelId);
                  return;
                } else if (res.declined) {
                  // If declined, move to LOSER_DECIDE UI
                  // Fix: If loser is bot, DO NOT show this embed (bot will decide immediately in next loop)
                  if (!loserIsBot) {
                      const loserId = game.players[game.loser].id;
                      const loserDecisionEmbed = GameUI.createOneEggBonusLoserDecisionEmbed(game);
                      const loserDecisionBtns = GameUI.createOneEggBonusLoserDecisionButtons(loserId);
                      await msg.edit({ content: '👑 **CHAMPION DECLINED!** Now it\'s your choice...', embeds: [loserDecisionEmbed], components: [loserDecisionBtns] }).catch(() => {});
                  } else {
                      // Optional: Show brief message "Champion declined! Bot choosing..."
                      // await msg.edit({ content: '👑 **CHAMPION DECLINED!** Bot thinking...', embeds: [], components: [] }).catch(() => {});
                      // Let's just clear components to prevent clicking
                      await msg.edit({ content: '👑 **CHAMPION DECLINED!** Bot deciding...', components: [] }).catch(() => {});
                  }
                }
              }
            }
          }
        }

        // If champion declined and loser is bot and must decide (support both naming styles)
        const loserNeedsDecide = bonusStep ? (bonusStep === 'LOSER_DECIDE') : (game.bonus && (typeof game.bonus.loserOpened === 'undefined' && (game.bonus.championOpened === false || game.bonus.championOpened === 'false')));
        if (loserIsBot && game.bonus && loserNeedsDecide) {
          const delayMs = 1000 + Math.floor(Math.random() * 2000);
          await new Promise(r => setTimeout(r, delayMs));
          const open = Math.random() < 0.5;
          const res = game.loserDecideOpen(game.players[loserSide].id, open);
          
          if (res && res.error) {
             console.warn(`[OneEggBot][${channelId}] loserDecideOpen error:`, res.error);
             await new Promise(r => setTimeout(r, 2000));
             continue;
          }

          if (res && (res.ended || res.gameEnded)) {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel && game.messageId) {
              const msg = await channel.messages.fetch(game.messageId).catch(() => null);
              if (msg) {
                const finalEmbed = GameUI.createOneEggEndEmbed(game, game.winner);
                await msg.edit({ content: `Loser (bot) ${open ? 'opened' : 'passed'} the box.`, embeds: [finalEmbed], components: [] }).catch(() => {});
                // Persist stats
                await db.updateOneEggStats(game.players[game.winner].id, game.guildId, { won: true, goldenEggs: game.players[game.winner].goldenEggs, money: game.players[game.winner].money });
                try { await db.addToPlayerHighScore(game.players[game.winner].id, game.guildId, Math.floor((game.players[game.winner].money || 0) * 2), game.players[game.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
                await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
                
                oneEggGames.delete(channelId);
                return;
              }
            }
          }
        }
      }

      // Final box phase: similar bot behavior to pick boxes when it's bot's turn
      if (game.phase === 'FINAL_BOX') {
        const currentSide = game.turnOrder[game.currentTurnIndex];
        if (currentSide === botSide) {
          const taken = Object.values(game.boxSelections || {});
          const options = [0,1,2].filter(i => !taken.includes(i));
          if (options.length === 0) {
            await new Promise(r => setTimeout(r, 700));
            continue;
          }
          const pick = options[Math.floor(Math.random() * options.length)];
          const result = game.handleBoxSelection('bot_oneegg', pick);

          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && game.messageId) {
            const msg = await channel.messages.fetch(game.messageId).catch(() => null);
            if (msg) {
              if (result.waiting) {
                        const embed = GameUI.createOneEggMainEmbed(game);
                        const row = GameUI.createOneEggBoxButtons(game);
                        await msg.edit({ embeds: [embed], components: row }).catch(() => {});
                      } else if (result.results) {
                        if (result.gameEnded) {
                          // Start bonus round and prompt loser to pick
                          try {
                            game.startBonusRound();
                            const loserId = game.players[game.loser].id;
                            const loserEmbed = GameUI.createOneEggBonusLoserPickEmbed(game);
                            const loserBtns = GameUI.createOneEggBonusLoserPickButtons(loserId);
                            await msg.edit({ content: '🥚 Bonus Round: Time\'s up — final box incoming!', embeds: [loserEmbed], components: [loserBtns] }).catch(() => {});
                            // continue loop to let bot react
                          } catch (e) {
                            console.warn('Failed to start bonus round in bot loop (early):', e);
                            const finalEmbed = GameUI.createOneEggEndEmbed(game, result.winner);
                            // finalize stats
                            await db.updateOneEggStats(game.players[result.winner].id, game.guildId, { won: true, goldenEggs: game.players[result.winner].goldenEggs, money: game.players[result.winner].money });
                            try { await db.addToPlayerHighScore(game.players[result.winner].id, game.guildId, Math.floor((game.players[result.winner].money || 0) * 2), game.players[result.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
                            await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
                            await msg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
                            oneEggGames.delete(channelId);
                            return;
                          }
                        } else {
                          const embed = GameUI.createOneEggMainEmbed(game, result.results);
                          const row = GameUI.createOneEggBoxButtons(game);
                          await msg.edit({ embeds: [embed], components: row }).catch(() => {});
                        }
              }
            }
          }
        }
      }

      // Short sleep to prevent busy loop
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`[OneEggBot][${channelId}] Loop error:`, err);
      await new Promise(r => setTimeout(r, 2000));
      if (!oneEggGames.has(channelId)) return;
    }
  }
}

// Helper to simulate suspense with animations
async function simulateSuspense(interaction, frames, interval = 1000) {
  for (const frame of frames) {
    try {
      await interaction.editReply({ content: frame, embeds: [], components: [GameUI.createDisabledPlaceholderButtons()] });
    } catch (e) {
      // fallback to no-components if edit fails
      await interaction.editReply({ content: frame, embeds: [], components: [] }).catch(() => {});
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

async function handleRoshamboSelection(interaction, game, choice) {
  // Show "Operator is choosing..." animation
  const choosingFrames = [
    '**Operator is choosing...** ✊',
    '**Operator is choosing...** ✋',
    '**Operator is choosing...** ✌️',
    '**Operator is choosing...** ✊',
    '**Operator is choosing...** ✋'
  ];

  // We need to defer update or edit reply. Since we are in a button handler, we usually update.
  // But for animation we need multiple edits.
  // Let's use update first to clear buttons, then editReply for animation.
  await interaction.update({ content: '**Operator is choosing...** ✊', embeds: [], components: [] });

  // Run animation
  for (let i = 1; i < choosingFrames.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 600));
    await interaction.editReply({ content: choosingFrames[i], embeds: [], components: [] });
  }

  await new Promise(resolve => setTimeout(resolve, 600));

  const result = game.playRoshambo(choice);

  const embed = new EmbedBuilder()
    .setTitle('Rock, Paper, Scissors')
    .setDescription(`You chose **${choice.toUpperCase()}**\nOperator chose **${result.operatorChoice.toUpperCase()}**\n\n**${result.result.toUpperCase()}!**`)
    .setColor(result.result === 'win' ? 0x00FF00 : result.result === 'loss' ? 0xFF0000 : 0xFFFF00);

  if (result.result === 'win') {
    embed.addFields({ name: 'Reward', value: `$${game.formatMoney(result.winAmount)}`, inline: true });
  } else if (result.result === 'loss') {
    embed.addFields({ name: 'Loss', value: `-$${game.formatMoney(Math.abs(result.winAmount))}`, inline: true });
  }

  embed.addFields({ name: 'Total Money', value: `$${game.formatMoney(game.totalMoney)}`, inline: true });

  // Create "Play Again" and "Cashout" buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('roshambo_rock')
        .setLabel('Rock ✊')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('roshambo_paper')
        .setLabel('Paper ✋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('roshambo_scissors')
        .setLabel('Scissors ✌️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cashout')
        .setLabel('Cashout')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.editReply({ content: null, embeds: [embed], components: [row] });
}

// Assuming this block is part of a larger function that handles various actions,
// and `chosenAmount` and `user` are defined in that scope.
// This block is inserted as a new `else if` condition.
// For the purpose of this edit, it's placed after handleRoshamboSelection and before handleBoilingPointAction,
// as it's a new handler for a specific game action.
// Note: The `displayGameOver`, `displayFloor` functions and `user` variable are assumed to be defined elsewhere.
/*
  } else if (chosenAmount.action === 'operator_offer') {
    // 1% chance for scam call scenario
    const isScamCall = Math.random() < 0.01;
    
    if (isScamCall) {
      // Scam call! Player auto-declines
      await interaction.followUp({
        content: '📞 **OPERATOR CALLING...**\n\n' +
                 '🚫 *You think the caller is a call center scam, you declined the offer call...*\n\n' +
                 '**No offer received!**'
      });
      
      // Continue to next floor after a delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const nextFloorResult = game.goToSpecificFloor(game.currentFloor + 1);
      if (!nextFloorResult) {
        await displayGameOver(interaction, game, user);
        return;
      }

      await displayFloor(interaction, game, user);
      return;
    }
    
    // Normal operator offer flow
    await interaction.followUp({
      content: '📞 **OPERATOR CALLING...**\n\n' +
               'The Operator has an offer for you! Choose wisely:\n\n' +
               '**ACCEPT** - Take the money and end your run\n' +
               '**DECLINE** - Continue climbing'
    });

    const acceptButton = new ButtonBuilder()
      .setCustomId('operator_accept')
      .setLabel('✅ Accept Offer')
      .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
      .setCustomId('operator_decline')
      .setLabel('❌ Decline Offer')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);
    await interaction.followUp({ components: [row] });
  } else if (chosenAmount.action === 'random_minigame') {
*/

async function handleBoilingPointAction(interaction, game, action) {
  // Show temperature gauge animation
  const tempFrames = [
    '**Checking Temperature...** ❄️',
    '**Checking Temperature...** 🌡️',
    '**Checking Temperature...** 🔥',
    '**Checking Temperature...** 🌡️',
    '**Checking Temperature...** ❄️'
  ];

  await interaction.update({ content: '**Checking Temperature...** ❄️', embeds: [], components: [] });

  for (let i = 1; i < tempFrames.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await interaction.editReply({ content: tempFrames[i], embeds: [], components: [] });
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const result = game.playBoilingPointAction(action);

  const embed = new EmbedBuilder()
    .setTitle('Boiling Point')
    .setDescription(`Current Temperature: **${result.currentTemp}°C**\nTarget: **1000°C**\n\n${result.message}`)
    .setColor(result.isBoiling ? 0xFF0000 : 0x00FF00);

  embed.addFields({ name: 'Total Money', value: `$${game.formatMoney(game.totalMoney)}`, inline: true });

  const components = [];
  if (!result.gameOver && !result.roundComplete) {
    // Show grid
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = new ActionRowBuilder();
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        const tile = result.grid[index];
        const btn = new ButtonBuilder()
          .setCustomId(`boiling_point_${index}`)
          .setStyle(tile.revealed ? (tile.type === 'heat' ? ButtonStyle.Danger : ButtonStyle.Primary) : ButtonStyle.Secondary)
          .setLabel(tile.revealed ? (tile.type === 'heat' ? `+${tile.value}°` : `-${tile.value}°`) : '❓')
          .setDisabled(tile.revealed);
        row.addComponents(btn);
      }
      rows.push(row);
    }
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cashout').setLabel('Cashout').setStyle(ButtonStyle.Success)
    ));
    components.push(...rows);
  } else if (result.roundComplete) {
    embed.addFields({ name: 'Round Complete!', value: 'You reached 1000°C!', inline: false });
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('continue_game').setLabel('Continue').setStyle(ButtonStyle.Success)
    ));
  } else {
    // Game Over
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('restart_game').setLabel('Try Again').setStyle(ButtonStyle.Primary)
    ));
  }

  await interaction.editReply({ content: null, embeds: [embed], components });
}
// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Start a new Tower of Cash game')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Select game mode for this session (optional)')
        .setRequired(false)
        .addChoices(
          { name: '🌟 Season 2 (The Apex Tower - Pacts, Bosses, Elite Minigames)', value: 'season2' },
          { name: '✨ Season 1 (30 Floors, Minigames)', value: 'season1' },
          { name: '🎮 Minigame Master (Tournament/Gauntlet)', value: 'minigame_master' },
          { name: '🎯 Normal Mode (21 Floors)', value: 'normal' }
        )),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the Tower of Cash leaderboard'),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your game statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View stats for a specific user (Admin only)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Select which game stats to view')
        .setRequired(false)
        .addChoices(
          { name: 'Tower of Cash', value: 'tower' },
          { name: 'How Much Is Enough?', value: 'hmie' },
          { name: 'Mount Ca$hmore', value: 'mount_cashmore' },
          { name: 'Who has only one EGG???', value: 'oneegg' }
        )),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to play Tower of Cash games')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Select which game to learn about')
        .setRequired(false)
        .addChoices(
          { name: 'Tower of Cash (Main Game)', value: 'tower' },
          { name: 'How Much Is Enough? (HMIE)', value: 'hmie' },
          { name: 'Mount Ca$hmore', value: 'mount_cashmore' },
          { name: 'Who has only one EGG???', value: 'oneegg' }
        )),

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
    .setName('grant-mount-cashmore')
    .setDescription('Grant Mount Ca$hmore plays to a user (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to grant Mount Ca$hmore plays to')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of Mount Ca$hmore plays to grant')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50))
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
    .addStringOption(option =>
      option.setName('gametype')
        .setDescription('Which game type to stop')
        .setRequired(false)
        .addChoices(
          { name: 'All Game Types', value: 'all' },
          { name: 'Tower of Cash', value: 'tower' },
          { name: 'HMIE', value: 'hmie' },
          { name: 'One Egg', value: 'oneegg' },
          { name: 'Mount Ca$hmore', value: 'mountcashmore' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('intro')
    .setDescription('Show game introduction')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Select which game introduction to view')
        .setRequired(false)
        .addChoices(
          { name: 'Tower of Cash', value: 'tower' },
          { name: 'How Much Is Enough?', value: 'hmie' },
          { name: 'Mount Ca$hmore', value: 'mount_cashmore' },
          { name: 'Who has only one EGG???', value: 'oneegg' }
        )),

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
    .setDescription('Check remaining plays and time until daily reset')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Check a specific user (Admin only)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Check plays for specific game')
        .setRequired(false)
        .addChoices(
          { name: 'Tower of Cash', value: 'tower' },
          { name: 'Mount Ca$hmore', value: 'mount_cashmore' }
        )),
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
    .setDescription('Set game mode: Normal, Season 1, Season 2, or Minigame Master (Admin only)')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Select Season mode')
        .setRequired(true)
        .addChoices(
          { name: '🌟 Season 2 (The Apex Tower - Pacts, Bosses, Elite Minigames)', value: 'season2' },
          { name: '✨ Season 1 (30 Floors, Minigames)', value: 'enable' },
          { name: '🎮 Minigame Master (Minigame Gauntlet Mode)', value: 'minigame_master' },
          { name: '🎯 Normal Mode (21 Floors)', value: 'disable' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('minigame-master')
    .setDescription('Play the Minigame Master challenge (Play only minigames!)')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Tournament Mode or Solo Gauntlet')
        .setRequired(false)
        .addChoices(
          { name: 'Multiplayer Tournament Lobby', value: 'multi' },
          { name: 'Solo Gauntlet', value: 'solo' }
        )
    ),

  new SlashCommandBuilder()
    .setName('revealfloor')
    .setDescription('Reveal all floor contents in the current game (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('reveal-mount-cashmore')
    .setDescription('Reveal all square contents in the current Mount Ca$hmore game (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-mount-cashmore')
    .setDescription('Test Mount Ca$hmore square contents (Admin only)')
    .addStringOption(option =>
      option.setName('square')
        .setDescription('Square type to test')
        .setRequired(true)
        .addChoices(
          { name: 'Clear', value: 'clear' },
          { name: 'Cash', value: 'cash' },
          { name: 'Skull', value: 'skull' },
          { name: 'Skull Seeker', value: 'skull_seeker' },
          { name: 'Cash Crash', value: 'cash_crash' },
          { name: "Gambler's Luck", value: 'gamblers_luck' },
          { name: 'Decimalizer', value: 'decimalizer' },
          { name: "Host's Deal", value: 'hosts_deal' },
          { name: 'Fatal Trap', value: 'fatal_trap' },
          { name: 'Game Over (Level 9)', value: 'gameover' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-level9-decision')
    .setDescription('Test Level 9 decision system (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('current-mode')
    .setDescription('Check the current game mode (Normal Mode or Season 1 Mode)'),

  new SlashCommandBuilder()
    .setName('test-commercial')
    .setDescription('Test Commercial Break feature (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-mart')
    .setDescription('Test Mart-Of-Cash feature (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test_one_egg_bonus')
    .setDescription('Test the One Egg bonus round (Admin only)')
    .addUserOption(option =>
      option.setName('champion')
        .setDescription('Tag the user to act as Champion')
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName('loser')
        .setDescription('Tag the user to act as Loser')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-sixzeroes')
    .setDescription('Test Six Zeroes minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-round-end')
    .setDescription('Test round end screen (Admin only)')
    .addBooleanOption(option =>
      option.setName('lucky7')
        .setDescription('Include Lucky 7 effect (lobby locked)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('content-list')
    .setDescription('Browse all game items and their descriptions'),

  new SlashCommandBuilder()
    .setName('modify-score')
    .setDescription('Modify a user\'s high score (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to modify')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to add (positive) or subtract (negative)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create or manage a giveaway (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option.setName('prize')
            .setDescription('The prize description')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Number of winners to select')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(50))
        .addIntegerOption(option =>
          option.setName('duration')
            .setDescription('Duration in minutes (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(1440)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End the giveaway and pick winners'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel the current giveaway'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('minigame-detail')
    .setDescription('View minigame rules and details'),

  new SlashCommandBuilder()
    .setName('mystery-box')
    .setDescription('Mystery Box commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View all Mystery Box items, rates, and descriptions'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test-items')
        .setDescription('[TEST] Test the 9 new Mystery Box items')),

  new SlashCommandBuilder()
    .setName('mystery-box-items')
    .setDescription('View the complete 75-item Mystery Box list with rates'),

  new SlashCommandBuilder()
    .setName('big-bank')
    .setDescription('View the total money accumulated in the Big Bank from all Game Overs'),

  new SlashCommandBuilder()
    .setName('dond')
    .setDescription('Start a Deal or No Deal game (Admin only)')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player who will play')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('banker')
        .setDescription('The banker (required for Manual mode, optional for Auto)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Offer calculation mode')
        .setRequired(false)
        .addChoices(
          { name: 'Auto-Calculated', value: 'auto' },
          { name: 'Manual Banker', value: 'manual' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('dond-board')
    .setDescription('View Deal or No Deal case values')
    .addStringOption(option =>
      option.setName('view')
        .setDescription('Which board to view')
        .setRequired(true)
        .addChoices(
          { name: 'All Board - Show all 26 case values', value: 'all' },
          { name: 'Current Board - Show remaining cases in active game', value: 'current' }
        )),

  new SlashCommandBuilder()
    .setName('reset-big-bank')
    .setDescription('Reset the Big Bank to $0 (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('set-big-bank')
    .setDescription('Set the Big Bank to a specific amount (Admin only)')
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('The amount to set the Big Bank to')
        .setRequired(true)
        .setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-minigame')
    .setDescription('Test any of the 8 Monopoly minigames (Admin only)')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Which minigame to test')
        .setRequired(true)
        .addChoices(
          { name: '🎁 Community Chest', value: 'community_chest' },
          { name: '🚗 Park It', value: 'park_it' },
          { name: '🎲 Advance to Boardwalk', value: 'advance_boardwalk' },
          { name: '🔐 Bank Buster', value: 'bank_buster' },
          { name: '🏘️ Block Party', value: 'block_party' },
          { name: '⚡ Power Grid', value: 'power_grid' },
          { name: '🏨 No Vacancy', value: 'no_vacancy' },
          { name: '🚂 Ride the Rails', value: 'ride_rails' },
          { name: '🚨 Laser Infiltration (Season 2)', value: 'laser_infiltration' },
          { name: '🔨 The Blind Auction (Season 2)', value: 'blind_auction' },
          { name: '💣 Bomb Defusal (Season 2)', value: 'bomb_defusal' },
          { name: '🃏 High Roller Blackjack (Season 2)', value: 'high_roller_blackjack' }
        )).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-scam-call')
    .setDescription('Preview the Operator scam call embed (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-gobig')
    .setDescription('Test Go Big or Go Broke minigame (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-sangha')
    .setDescription('Test Sangha Offerings item (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('test-basement')
    .setDescription('Test basement with 0 money (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('hmie')
    .setDescription('Create a How Much Is Enough? game lobby'),

  new SlashCommandBuilder()
    .setName('hmie-admin')
    .setDescription('Create an HMIE lobby (old admin command - deprecated)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('mount-cashmore')
    .setDescription('Start a Mount Ca$hmore pyramid climbing game!'),

  new SlashCommandBuilder()
    .setName('rtab')
    .setDescription('Race To A Billion commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Create a Race To A Billion game lobby (Admin only)'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the RTAB leaderboard'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View RTAB stats for a player')
        .addUserOption(option =>
          option.setName('player')
            .setDescription('Player to view stats for (defaults to you)')
            .setRequired(false))),

  new SlashCommandBuilder()
    .setName('hmie-faceoff-test')
    .setDescription('Test the HMIE Final Face-Off (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('game-over-option')
    .setDescription('Configure Game Over options (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Select the Game Over mode')
        .setRequired(true)
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Basement Mode', value: 'basement' }
        )
    ),

  new SlashCommandBuilder()
    .setName('manage-achievement')
    .setDescription('Force add or remove an achievement for a player (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Add or remove achievement')
        .setRequired(true)
        .addChoices(
          { name: 'Add Achievement', value: 'add' },
          { name: 'Remove Achievement', value: 'remove' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to modify achievements for')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('achievement')
        .setDescription('Achievement ID (e.g., PERFECT_GAME, ROUND_3_CHAMPION)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('wager')
    .setDescription('Start a wager in RTAB game - all alive players must pay in')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount each player must wager')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000000)
    ),

  new SlashCommandBuilder()
    .setName('peek')
    .setDescription('Use a peek to reveal a square without landing on it')
    .addIntegerOption(option =>
      option.setName('square')
        .setDescription('Square number to peek (1-25)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(25)
    ),

  new SlashCommandBuilder()
    .setName('blammo')
    .setDescription('(Hidden Command) Summon a BLAMMO for the next player'),

  // ==================== PHASE 5 COMMANDS ====================

  new SlashCommandBuilder()
    .setName('rtab_status')
    .setDescription('Check your current RTAB game status and stats')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('View another player\'s status (optional)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('rtab_stats')
    .setDescription('View your personal RTAB statistics')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('View another player\'s stats (optional)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('rtab_leaderboard')
    .setDescription('View the RTAB leaderboard')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Leaderboard category')
        .setRequired(false)
        .addChoices(
          { name: '🏆 Most Wins', value: 'wins' },
          { name: '💰 Total Earnings', value: 'money' },
          { name: '📈 Win Rate', value: 'winrate' },
          { name: '🔥 Longest Streak', value: 'streak' },
          { name: '🛡️ Best Survivor', value: 'survivor' },
          { name: '⭐ Achievement Points', value: 'achievements' }
        )
    )
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of players to show (default 10)')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(25)
    ),

  new SlashCommandBuilder()
    .setName('rtab_achievements')
    .setDescription('View your RTAB achievements')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('View another player\'s achievements (optional)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('rtab_replay')
    .setDescription('View highlights from recent RTAB games')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of highlights to show (default 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  new SlashCommandBuilder()
    .setName('rtab_global')
    .setDescription('View global RTAB statistics across all games'),

  // ==================== RTAB6 PORT: NEW COMMANDS ====================
  // ALL COMMANDS COMMENTED OUT - USE RTAB CLASSES

  // new SlashCommandBuilder()
  //   .setName('tournament')
  //   .setDescription('Minigame tournament commands')
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('start')
  //       .setDescription('Start or join a tournament (Admin only)')
  //       .addIntegerOption(option =>
  //         option.setName('botcount')
  //           .setDescription('Number of bots for demo mode (0 = player only)')
  //           .setRequired(false)
  //           .setMinValue(0)
  //           .setMaxValue(8)))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('ready')
  //       .setDescription('Ready up to play your tournament round'))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('leaderboard')
  //       .setDescription('View tournament leaderboard')
  //       .addIntegerOption(option =>
  //         option.setName('limit')
  //           .setDescription('Number of players to show (default 10)')
  //           .setRequired(false)
  //           .setMinValue(5)
  //           .setMaxValue(25)))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('status')
  //       .setDescription('View your tournament status')),

  // new SlashCommandBuilder()
  //   .setName('challenge')
  //   .setDescription('Super Bot Challenge campaign mode')
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('start')
  //       .setDescription('Start a new bot challenge campaign (Admin only)')
  //       .addIntegerOption(option =>
  //         option.setName('botcount')
  //           .setDescription('Number of bots in campaign (4-16)')
  //           .setRequired(false)
  //           .setMinValue(4)
  //           .setMaxValue(16)))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('status')
  //       .setDescription('View current challenge progress'))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('find')
  //       .setDescription('Find your next game in the campaign'))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('join')
  //       .setDescription('Join your next campaign game')),

  // new SlashCommandBuilder()
  //   .setName('level')
  //   .setDescription('View player level and XP progress')
  //   .addUserOption(option =>
  //     option.setName('player')
  //       .setDescription('View another player\'s level (optional)')
  //       .setRequired(false)),

  // new SlashCommandBuilder()
  //   .setName('bounty')
  //   .setDescription('View active bounties')
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('list')
  //       .setDescription('View all active bounties'))
  //   .addSubcommand(subcommand =>
  //     subcommand
  //       .setName('check')
  //       .setDescription('Check bounty on a specific player')
  //       .addUserOption(option =>
  //         option.setName('player')
  //           .setDescription('Player to check bounty for')
  //           .setRequired(true))),

  // new SlashCommandBuilder()
  //   .setName('minigame')
  //   .setDescription('Play a standalone minigame')
  //   .addStringOption(option =>
  //     option.setName('game')
  //       .setDescription('Select a minigame to play')
  //       .setRequired(true)
  //       .addChoices(
  //         { name: '🪙 Coin Flip', value: 'coinflip' },
  //         { name: '🎲 Dice Roll', value: 'diceroll' },
  //         { name: '🎰 Slots', value: 'slots' }
  //       ))
  //   .addIntegerOption(option =>
  //     option.setName('wager')
  //       .setDescription('Amount to wager (default: 1000)')
  //       .setRequired(false)
  //       .setMinValue(100)
  //       .setMaxValue(1000000)),

  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your Tower of Cash achievements')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another player\'s achievements')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('achievement-list')
    .setDescription('View all available achievements by category')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Select a category to view')
        .setRequired(false)
        .addChoices(
          { name: '🏆 Milestone', value: 'milestone' },
          { name: '🎉 Event', value: 'event' },
          { name: '🎮 Minigame', value: 'minigame' },
          { name: '💀 Game Over', value: 'game-over' }
        )),

  new SlashCommandBuilder()
    .setName('verify-achievements')
    .setDescription('Verify and validate your archived achievements')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Verify another user\'s achievements (admin only)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('achievement-stats')
    .setDescription('View achievement statistics for this server'),

  new SlashCommandBuilder()
    .setName('one-egg')
    .setDescription('🥚 Who has only one EGG??? - 2 Player Game')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Start a new One Egg game lobby')),

  // new SlashCommandBuilder()
  //   .setName('new-year-gift')
  //   .setDescription('🎁 Claim your daily New Year Gift!'),
  // new SlashCommandBuilder()
  //   .setName('new-year-gift-list')
  //   .setDescription('📋 View all possible New Year Gift outcomes'),
  new SlashCommandBuilder()
    .setName('test-event')
    .setDescription('🧪 Test specific game events (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event to test')
        .setRequired(true)
        .addChoices(
          { name: '🏦 Bruh Bank', value: 'bruh_bank' },
          { name: '🏦 Small Bank', value: 'small_bank' },
          { name: '🏦 Big Bank', value: 'big_bank' },
          { name: '🏢 Tower of Crash', value: 'tower_of_crash' },
          { name: '📢 Announcement', value: 'announcement' },
          { name: '💸 Tax Collector', value: 'tax_collector' }
        )),
  new SlashCommandBuilder()
    .setName('force-big-bank')
    .setDescription('Force add Big Bank to current game (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to award the Big Bank to')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('crash')
    .setDescription('Force a Tower of Cra$h (Admin Only)!')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
      name: 'Mount Ca$hmore coming to our tower!',
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

  // === RTAB HIDDEN COMMANDS ===
  const rtabGame = rtabGames.get(message.channelId);
  if (rtabGame && message.content.startsWith('!')) {
    await handleRTABHiddenCommand(message, rtabGame);
    return;
  }

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

  // Handle floor choice for Wish Granter (choose_floor action)
  if (game.waitingForFloorChoice) {
    const floorNum = parseInt(content);
    const maxFloor = game.selectedFloors.length;

    if (!isNaN(floorNum) && floorNum >= 1 && floorNum <= maxFloor) {
      game.waitingForFloorChoice = false;
      game.currentFloor = floorNum - 1; // Convert to 0-indexed

      await message.channel.send({
        content: `⭐ **WISH GRANTED!**\n🔢 Jumping to floor ${floorNum}!\n💰 **Current Money:** $${GameUI.formatMoney(game.totalMoney)}`
      });

      // Continue game
      const continueButtons = GameUI.createContinueButton();
      await message.channel.send({ content: '➡️ **Continue from chosen floor...**', components: continueButtons });
    } else {
      await message.channel.send({
        content: `⚠️ Invalid floor number! Please choose between 1 and ${maxFloor}.`
      });
    }
  }
}
);


// === RTAB HIDDEN COMMANDS HANDLER ===

// === RTAB HIDDEN COMMANDS HANDLER ===
async function handleRTABHiddenCommand(message, game) {
  const player = game.players.find(p => p.userId === message.author.id);
  
  if (!player) {
    return; // Not a player in this game
  }

  if (player.isEliminated) {
    await message.reply('❌ You are eliminated and cannot use commands!');
    return;
  }

  const content = message.content.trim().toLowerCase();
  const parts = content.split(' ');
  const command = parts[0];
  
  try {
    let result;

    // Route to appropriate command handler
    switch (command) {
      case '!fold':
        result = game.executeFold(message.author.id);
        break;

      case '!blammo':
        result = game.executeBlammo(message.author.id);
        break;

      case '!shuffle':
        if (parts.length < 2) {
          await message.reply('❌ Usage: `!shuffle <space number>`\nExample: `!shuffle 15`');
          return;
        }
        const shuffleSpace = parseInt(parts[1]) - 1; // Convert to 0-based
        result = game.executeShuffler(message.author.id, shuffleSpace);
        break;

      case '!wager':
        result = game.executeWagerer(message.author.id);
        break;

      case '!bonus':
        if (parts.length < 2) {
          await message.reply('❌ Usage: `!bonus <cash|boost|game|event>`\nExample: `!bonus cash`');
          return;
        }
        const category = parts[1].toLowerCase();
        result = game.executeBonusBag(message.author.id, category);
        break;

      case '!truth':
        if (parts.length < 2) {
          await message.reply('❌ Usage: `!truth <space number>`\nExample: `!truth 12`');
          return;
        }
        const truthSpace = parseInt(parts[1]) - 1; // Convert to 0-based
        result = game.executeEyeOfTruth(message.author.id, truthSpace);
        break;

      case '!failsafe':
        result = game.executeFailsafe(message.author.id);
        break;

      case '!minesweeper':
        if (parts.length < 2) {
          await message.reply('❌ Usage: `!minesweeper <space number>`\nExample: `!minesweeper 13`');
          return;
        }
        const sweepSpace = parseInt(parts[1]) - 1; // Convert to 0-based
        result = game.executeMinesweeper(message.author.id, sweepSpace);
        break;

      case '!repel':
        result = game.executeRepellent(message.author.id);
        break;

      default:
        // Not a valid command - ignore silently
        return;
    }

    // Send result
    if (!result.success) {
      await message.reply(`❌ ${result.message}`);
    } else {
      // Create embed for command result
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`🎴 Hidden Command Used!`)
        .setDescription(result.message)
        .setTimestamp();

      // Add special fields based on command type
      if (result.command === 'eyeoftruth') {
        embed.addFields(
          { name: '📍 Space', value: `${result.squareIndex + 1}`, inline: true },
          { name: '🔍 Revealed', value: result.description, inline: false }
        );
      } else if (result.command === 'minesweeper') {
        embed.addFields(
          { name: '📍 Space', value: `${result.squareIndex + 1}`, inline: true },
          { name: '💣 Adjacent Bombs', value: `${result.bombCount}`, inline: true }
        );
      } else if (result.command === 'wagerer') {
        embed.addFields(
          { name: '💰 Prize Pool', value: `$${result.totalPool.toLocaleString()}`, inline: true },
          { name: '👥 Players Wagered', value: `${result.wagers.length}`, inline: true }
        );
      } else if (result.command === 'shuffler') {
        embed.addFields(
          { name: '📍 Space', value: `${result.squareIndex + 1}`, inline: true },
          { name: '🔄 Status', value: result.oldContent.isBomb ? '💣 → ✨' : '✨ → ✨', inline: true }
        );
      } else if (result.command === 'bonusbag') {
        if (result.reward) {
          let rewardText = '';
          switch (result.reward.type) {
            case 'cash':
              rewardText = `💰 $${result.reward.amount.toLocaleString()}`;
              break;
            case 'boost':
              rewardText = `⚡ x${result.reward.multiplier} for ${result.reward.turns} turns`;
              break;
            case 'minigame':
              rewardText = `🎮 ${result.reward.game}`;
              break;
            case 'event':
              rewardText = `🎯 ${result.reward.name}`;
              break;
          }
          embed.addFields({ name: '🎁 Reward', value: rewardText, inline: false });
        }
      } else if (result.command === 'failsafe') {
        if (result.won) {
          embed.setColor('#FFD700');
          embed.setTitle('🏆 FAILSAFE SUCCESS!');
        } else {
          embed.addFields(
            { name: '⚠️ Safe Spaces Remaining', value: `${result.safeSpacesLeft}`, inline: true },
            { name: '💸 Penalty', value: `$${result.penalty.toLocaleString()}`, inline: true }
          );
        }
      }

      await message.channel.send({ embeds: [embed] });

      // If failsafe won, end game
      if (result.command === 'failsafe' && result.won) {
        await handleRTABGameEnd(message.channel, game);
      }
    }

  } catch (error) {
    console.error('Error handling RTAB command:', error);
    await message.reply('❌ An error occurred while processing your command!');
  }
}


// === BASEMENT MODE HANDLERS ===

async function handlePeekClick(interaction, game) {
  // Show Modal to enter floor number
  const modal = new ModalBuilder()
    .setCustomId('peek_modal')
    .setTitle('👁️ Use Peek');

  const input = new TextInputBuilder()
    .setCustomId('peek_floor_input')
    .setLabel('Floor number to peek (1-21 or 1-28)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 15')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

async function handlePeekSubmit(interaction, game) {
  const inputStr = interaction.fields.getTextInputValue('peek_floor_input');
  const floorNum = parseInt(inputStr.replace(/[^0-9]/g, ''), 10);
  const maxFloor = game.eventMode ? 28 : 21;

  if (isNaN(floorNum) || floorNum < 1 || floorNum > maxFloor) {
    return safeInteractionResponse(interaction, 'reply', { content: `❌ Invalid floor number! Please enter a number between 1 and ${maxFloor}.`, ephemeral: true });
  }

  if (!game.peeks || game.peeks <= 0) {
    return safeInteractionResponse(interaction, 'reply', { content: '❌ You have no peeks available!', ephemeral: true });
  }

  // Check if floor exists in pregenerated floors
  const floorData = game.preGeneratedFloors[floorNum];
  if (!floorData) {
    return safeInteractionResponse(interaction, 'reply', { content: `❌ Floor ${floorNum} is not available!`, ephemeral: true });
  }

  // Use peek
  game.peeks--;
  
  // Track peek usage for achievements
  AchievementHelper.trackPeekUsed(game);

  // Store peeked floor data for PEEK_MASTER_PRO achievement
  // Check if either side has X-Level or Game Over
  const leftDangerous = (floorData.left.type === 'game_over') || 
                        (floorData.left.type === 'special' && floorData.left.action === 'x_level');
  const rightDangerous = (floorData.right.type === 'game_over') || 
                         (floorData.right.type === 'special' && floorData.right.action === 'x_level');
  
  if (leftDangerous || rightDangerous) {
    if (!game.peekedDangerousFloors) {
      game.peekedDangerousFloors = {};
    }
    game.peekedDangerousFloors[floorNum] = {
      leftDangerous,
      rightDangerous,
      peekedAt: Date.now()
    };
  }

  // Show floor contents without revealing which side they're on
  const leftDisplay = game.getDisplayValue(floorData.left);
  const rightDisplay = game.getDisplayValue(floorData.right);

  // Sort alphabetically A-Z
  const sortedContents = [leftDisplay, rightDisplay].sort((a, b) => a.localeCompare(b));

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`👁️ Peek - Floor ${floorNum}`)
    .setDescription(
      `**Floor Contents:**\n` +
      `• ${sortedContents[0]}\n` +
      `• ${sortedContents[1]}\n\n` +
      `**Peeks Remaining:** ${game.peeks}`
    )
    .setFooter({ text: 'This information is for your eyes only!' });

  await safeInteractionResponse(interaction, 'reply', { embeds: [embed], ephemeral: true });
}

async function handleBasementMinigame(interaction, game) {
  // Set state for basement
  game.basementState = {
    isActive: true,
    originalMoney: game.totalMoney
  };

  const introEmbed = GameUI.createBasementIntroEmbed(game);
  
  // If player has 0 or less money, show message and end game - no negotiation
  if (game.totalMoney <= 0) {
    await interaction.followUp({ embeds: [introEmbed] });
    
    // Wait a moment for dramatic effect, then end the game
    setTimeout(async () => {
      await endGame(interaction, game, 'basement_no_money', 0, 0);
    }, 3000); // 3 second delay
    return;
  }

  const buttons = GameUI.createBasementNegotiateButtons();

  // If we came from a button click (Game Over tile), we use editReply/followUp
  // But wait, Game Over tile logic uses editReply then followUp.
  // Let's use followUp to send a fresh message for the new "scene".
  await interaction.followUp({ embeds: [introEmbed], components: buttons });
}



async function handleBasementNegotiateClick(interaction, game) {
  // Show Modal to enter percentage
  const modal = new ModalBuilder()
    .setCustomId('basement_offer_modal')
    .setTitle('📝 Negotiate Offer');

  const input = new TextInputBuilder()
    .setCustomId('basement_offer_input')
    .setLabel('Percentage to KEEP (1-100)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 10')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(3);

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

async function handleBasementOfferSubmit(interaction, game) {
  const inputStr = interaction.fields.getTextInputValue('basement_offer_input');
  const playerPercent = parseInt(inputStr.replace(/[^0-9]/g, ''), 10);

  if (isNaN(playerPercent) || playerPercent < 1 || playerPercent > 100) {
    return interaction.reply({ content: '❌ Invalid percentage! Please enter a number between 1 and 100.', ephemeral: true });
  }

  // Defer update to allow time for processing/animation
  await interaction.deferReply();

  // SUSPENSE SEQUENCE
  await interaction.editReply({ content: '📝 **Offer submitted...** John Chaona is reviewing your terms...' });
  await new Promise(r => setTimeout(r, 2000));

  await interaction.editReply({ content: `👀 John Chaona looks at your **${playerPercent}%** request...` });
  await new Promise(r => setTimeout(r, 2000));

  const botPercent = Math.floor(Math.random() * 100) + 1; // 1-100
  const originalAmount = game.basementState.originalMoney;
  let finalAmount = 0;
  let won = false;

  if (playerPercent <= botPercent) {
    // WIN: Keep the requested percentage
    won = true;
    finalAmount = Math.floor(originalAmount * (playerPercent / 100));
  } else {
    // LOSE: Lose everything
    won = false;
    finalAmount = 0;
  }

  game.totalMoney = finalAmount;

  // Show Result -> Clear content when showing embed
  const result = {
    won,
    playerPercent,
    botPercent,
    originalAmount,
    finalAmount
  };

  const resultEmbed = GameUI.createBasementResultEmbed(game, result);
  await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

  // Save Stats and End Game
  // If won, it counts as a game played with money won? Or lost?
  // Usually Game Over = Lost, but here they might salvage something.
  // We'll mark as 'completed' (saved money) or 'game_over' (0 money), but standard is to record what they leave with.
  const outcome = won ? 'completed' : 'game_over'; // If they salvage money, treats as completed/walkaway? Or just game over with money?

  // Update stats
  await db.updatePlayerStats(game.userId, interaction.guildId, game.username, finalAmount, game.floorsCompleted, won); // Considering salvage as "win" for stats? Or just play count?
  // Actually `updatePlayerStats` increments games played. `won` boolean increments wins.
  // Let's say if they salvage money, it's a "win" (they beat the basement). Use `won` variable.

  await db.saveGameHistory(game.userId, interaction.guildId, game.username, finalAmount, game.floorsCompleted, outcome);

  // Track stats for achievements
  AchievementHelper.trackBasement(game, won, finalAmount, originalAmount - finalAmount);
  
  // Award automatic achievements
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

  // Check for achievements - Basement related
  if (won) {
    await towerAchievements.awardAchievement('BASEMENT_ESCAPE', game.userId, game.username, interaction.guildId, interaction.channel);
  } else {
    await towerAchievements.awardAchievement('BASEMENT_FAILED', game.userId, game.username, interaction.guildId, interaction.channel);
    
    // Note: WHAT_GAMEOVER achievement is already awarded at line 6777 when What? gives Game Over
    // No need to award it again here - game.martWhatGameOver is just for tracking
  }

  // Add to Big Bank only if they LOST money (the difference)
  const amountLost = originalAmount - finalAmount;
  if (amountLost > 0) {
    try {
      await db.addLostMoney(interaction.guildId, amountLost); // Logic to add to Big Bank

      // Post update to big-bank channel
      const guild = interaction.guild;
      const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

      if (bigBankChannel) {
        const newTotal = await db.getGlobalLostMoney(interaction.guildId);

        // Custom message based on outcome
        let description = '';
        if (game.martArrest) {
          // Came from Mart-Of-Cash arrest
          if (won) {
            description = `**${game.username}** was arrested at Mart-Of-Cash and escaped the Basement with **$${GameUI.formatMoney(finalAmount)}** but left behind **$${GameUI.formatMoney(amountLost)}** for the Big Bank!`;
          } else {
            description = `**${game.username}** was arrested at Mart-Of-Cash and drained dry by John Chaona! **$${GameUI.formatMoney(amountLost)}** added to Big Bank!`;
          }
        } else {
          // Normal basement
          if (won) {
            description = `**${game.username}** escaped the Basement with **$${GameUI.formatMoney(finalAmount)}** but left behind **$${GameUI.formatMoney(amountLost)}** for the Big Bank!`;
          } else {
            description = `**${game.username}** was drained dry by John Chaona! **$${GameUI.formatMoney(amountLost)}** added to Big Bank!`;
          }
        }

        const updateEmbed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('💰 Big Bank Updated!')
          .setDescription(
            `${description}\n\n` +
            `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newTotal)}\n\n` +
            `*Get the Big Bank item from Mystery Box to claim it all!*`
          )
          .setTimestamp();

        await bigBankChannel.send({ embeds: [updateEmbed] });
      }
    } catch (err) {
      console.error('Error adding to big bank:', err);
    }
  }

  gameManager.endGame(interaction.channelId);
}

// === BOILING POINT HANDLERS ===

async function handleBoilingPointMinigame(interaction, game) {
  game.startBoilingPoint();

  const embed = GameUI.createBoilingPointIntroEmbed(game);
  const buttons = GameUI.createBoilingPointButtons(game, true);

  await interaction.followUp({ embeds: [embed], components: buttons });
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
    // Show last round result first before final summary
    const roundResultEmbed = GameUI.createOperatorRoshamboResultEmbed(game, { ...result, gameOver: false });
    await interaction.editReply({ content: '', embeds: [roundResultEmbed], components: [] });

    // Wait to let player see the round result
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now show final summary
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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



// === MYSTERY BOX HANDLERS ===

async function handleMysteryBoxMinigame(interaction, game) {
  game.startMysteryBox();

  const embed = GameUI.createMysteryBoxIntroEmbed(game);
  const buttons = GameUI.createMysteryBoxSelectionButtons(game);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleMysteryBoxSelection(interaction, game, boxIndex) {
  // Show animated suspense sequence
  const frames = [
    '📦 **Opening boxes...**',
    '🎁 **Revealing contents...**',
    '✨ **Almost there...**'
  ];

  await interaction.update({ content: frames[0], embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 700));
  await safeInteractionResponse(interaction, 'editReply', { content: frames[1], embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 700));
  await safeInteractionResponse(interaction, 'editReply', { content: frames[2], embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 700));

  // Track money before opening box for MYSTERY_BOX_CURSE achievement
  const moneyBefore = game.totalMoney;
  
  const result = game.selectMysteryBox(boxIndex);

  if (!result) return;
  
  // Check if player lost 50%+ of money from Mystery Box
  const moneyAfter = game.totalMoney;
  const moneyLost = moneyBefore - moneyAfter;
  if (moneyLost > 0 && moneyLost >= (moneyBefore * 0.5)) {
    await towerAchievements.awardAchievement('MYSTERY_BOX_CURSE', game.userId, game.username, interaction.guildId, interaction.channel, { moneyBefore, moneyAfter, moneyLost, floorsCompleted: game.floorsCompleted });
  }

  // FOMO Reveal - Show what was in the other boxes
  const fomoEmbed = GameUI.createMysteryBoxFOMOEmbed(game, result.unselectedBoxes, boxIndex);
  await safeInteractionResponse(interaction, 'editReply', { content: '', embeds: [fomoEmbed], components: [] });

  // Dramatic pause
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Show selected box result
  const resultEmbed = GameUI.createMysteryBoxResultEmbed(game, result.selectedItem, boxIndex, result);
  const boxRevealMessage = await safeInteractionResponse(interaction, 'followUp', { embeds: [resultEmbed] });

  // Handle special actions that require immediate continuation or minigames
  if (result.specialAction) {
    // Handle minigame triggers from Mystery Box
    if (result.specialAction === 'random_minigame' || result.specialAction === 'bonus_minigame') {
      const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'go_big_or_go_broke'];
      const randomMinigame = minigameTypes[Math.floor(Math.random() * minigameTypes.length)];
      
      await safeInteractionResponse(interaction, 'followUp', { content: `🎮 **MINIGAME starting from Mystery Box...**` });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (randomMinigame === 'vault') {
        await handleVaultMinigame(interaction, game);
      } else if (randomMinigame === 'infinity_percent') {
        await handleInfinityPercentMinigame(interaction, game);
      } else if (randomMinigame === 'mega_grid') {
        await handleMegaGridMinigame(interaction, game);
      } else if (randomMinigame === 'hideout_breakthrough') {
        await handleHideoutBreakthroughMinigame(interaction, game);
      } else if (randomMinigame === 'boiling_point') {
        await handleBoilingPointMinigame(interaction, game);
      } else if (randomMinigame === 'go_big_or_go_broke') {
        await handleGoBigOrGoBrokeMinigame(interaction, game);
      } else if (randomMinigame === 'operator_roshambo') {
        await handleOperatorRoshamboMinigame(interaction, game);
      } else if (randomMinigame === 'six_zeroes') {
        await handleSixZeroesMinigame(interaction, game);
      } else if (randomMinigame === 'babushka') {
        await handleBabushkaMinigame(interaction, game);
      } else if (randomMinigame === 'door_escape') {
        await handleDoorEscapeMinigame(interaction, game);
      }
      return; // Don't show continue button - minigame handles it
    }
    
    if (result.specialAction === 'six_zeroes_minigame') {
      await interaction.followUp({ content: '🎫 **SIX ZEROES starting from Mystery Box...**' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleSixZeroesMinigame(interaction, game);
      return; // Don't show continue button - minigame handles it
    }

    if (result.specialAction === 'lightning_round') {
      // Logic handled in gameManager is mostly skipping, but we need to ensure floors are updated correctly
      game.currentRound = 6;
      const rounds = game.getRoundConfig();
      game.floorsCompleted = rounds.slice(0, 5).reduce((a, b) => a + b, 0); 
      game.currentFloor = 0; // Reset round floor index for the new round
      game.isSelectingFloors = true; // Force selection state
      
      await safeInteractionResponse(interaction, 'followUp', {
        embeds: [new EmbedBuilder()
          .setColor('#FFFF00')
          .setTitle('⚡ LIGHTNING ROUND!')
          .setDescription(
            `⛈️ **BOOM!** The tower shifts around you!\n` +
            `You've been teleported straight to **ROUND 6**!\n\n` +
            `*Prepare yourself... the summit is close!*`
          )
          .setFooter({ text: 'Warping through the clouds!' })]
      });
      // Show continue button will happen after switch
    }

    if (result.specialAction === 'bonus_portal') {
      // Trigger random minigame with 2x rewards
      const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'go_big_or_go_broke', 'operator_roshambo', 'babushka', 'door_escape'];
      const randomMinigame = minigameTypes[Math.floor(Math.random() * minigameTypes.length)];
      
      // Set a flag for double rewards (this needs to be checked in minigame handlers)
      if (!game.activeEffects) game.activeEffects = [];
      game.activeEffects.push({ type: 'bonus_multiplier_2', floorsRemaining: 1, fresh: true });

      await safeInteractionResponse(interaction, 'followUp', { content: `🎪 **BONUS PORTAL!** Random minigame starting with **2x REWARDS**!` });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (randomMinigame === 'vault') await handleVaultMinigame(interaction, game);
      else if (randomMinigame === 'infinity_percent') await handleInfinityPercentMinigame(interaction, game);
      else if (randomMinigame === 'mega_grid') await handleMegaGridMinigame(interaction, game);
      else if (randomMinigame === 'hideout_breakthrough') await handleHideoutBreakthroughMinigame(interaction, game);
      else if (randomMinigame === 'boiling_point') await handleBoilingPointMinigame(interaction, game);
      else if (randomMinigame === 'go_big_or_go_broke') await handleGoBigOrGoBrokeMinigame(interaction, game);
      else if (randomMinigame === 'operator_roshambo') await handleOperatorRoshamboMinigame(interaction, game);
      else if (randomMinigame === 'babushka') await handleBabushkaMinigame(interaction, game);
      else if (randomMinigame === 'door_escape') await handleDoorEscapeMinigame(interaction, game);
      
      return;
    }
    
    if (result.specialAction === 'sangha_offerings') {
      // Sangha Offerings - Divine blessing, end game with all money
      const blessingEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🙏 SANGHA OFFERINGS - DIVINE BLESSING')
        .setDescription(
          `**${game.username}, you have received a divine blessing!**\n\n` +
          `**Current Money:** $${GameUI.formatMoney(game.totalMoney)}\n\n` +
          `🙏 **The gods smile upon you...**\n` +
          `*"Your offerings have been heard. Keep all your wealth and leave this building in peace."*\n\n` +
          `✨ **You are now free to exit with all your money!**`
        )
        .setFooter({ text: 'May fortune continue to bless your path...' });

      await interaction.followUp({ embeds: [blessingEmbed] });

      // Award achievement
      await towerAchievements.awardAchievement('SANGHA_BLESSING', game.userId, game.username, interaction.guildId, interaction.channel, { finalMoney: game.totalMoney, floorsCompleted: game.floorsCompleted });

      // Wait a moment then end game with win
      setTimeout(async () => {
        await endGame(interaction, game, 'sangha_offerings', game.totalMoney, 0);
      }, 3000);
      return;
    }

    if (result.specialAction === 'choice_30k_lobby') {
      // Crossroads - has its own UI flow
      const choiceEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🚦 Crossroads')
        .setDescription(
          '**Choose your path:**\n\n' +
          '💰 **Take $30,000** - Add money and continue\n' +
          '🏁 **Go to Lobby** - End the game and keep current money\n\n' +
          '⏰ **Decide now!**'
        );

      const choiceButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('crossroads_take30k')
            .setLabel('Take $30,000')
            .setEmoji('💰')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('crossroads_lobby')
            .setLabel('Go to Lobby')
            .setEmoji('🏁')
            .setStyle(ButtonStyle.Primary)
        );

      await safeInteractionResponse(interaction, 'followUp', { embeds: [choiceEmbed], components: [choiceButtons] });
      return; // Don't show continue button - choice buttons handle it
    }
    
    if (result.specialAction === 'reset_leaderboard') {
      // Tower of cra$h - Reset guild leaderboard
      try {
        // First, calculate total high scores to add to Big Bank
        const totalHighScores = await db.sumAllHighScores(game.guildId);

        // Get current Big Bank for display purposes
        const currentBigBank = await db.getGlobalLostMoney(game.guildId);

        // Add all high scores to Big Bank atomically
        await db.addToBigBank(game.guildId, totalHighScores);

        // Calculate new big bank for display
        const newBigBank = currentBigBank + totalHighScores;

        // Then reset progress
        await db.resetGuildProgress(game.guildId);

        await safeInteractionResponse(interaction, 'followUp', {
          embeds: [new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('💥 TOWER OF CRA$H!')
            .setDescription(
              `🏢 **The leaderboard has been reset!**\n` +
              `Everyone is back to $0!\n\n` +
              `💰 **Money Added to Big Bank:** $${GameUI.formatMoney(totalHighScores)}\n` +
              `📈 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
              `*All high scores have been added to the Big Bank!*`
            )
            .setFooter({ text: 'Tower of Cash has fallen!' })]
        });

        // Post to big-bank channel
        try {
          const guild = interaction.guild;
          const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

          if (bigBankChannel) {
            const crashEmbed = new EmbedBuilder()
              .setColor('#FF6347')
              .setTitle('💥 TOWER OF CRA$H!')
              .setDescription(
                `**${game.username}** triggered Tower of Cra$h from Mystery Box!\n\n` +
                `🏢 **Leaderboard Reset:** All players back to $0!\n` +
                `💰 **Money Added to Big Bank:** $${GameUI.formatMoney(totalHighScores)}\n` +
                `📊 **Previous Big Bank:** $${GameUI.formatMoney(currentBigBank)}\n` +
                `📈 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
                `*All high scores have been added to the Big Bank!*`
              )
              .setTimestamp();

            await bigBankChannel.send({ embeds: [crashEmbed] });
          }
        } catch (channelErr) {
          console.error('Error posting to big-bank channel:', channelErr);
        }
      } catch (err) {
        console.error('Error resetting leaderboard:', err);
      }
      return; // Don't show continue button yet
    } else if (result.specialAction === 'big_bank') {
      // Big Bank - Gain all lost money and reset Big Bank
      try {
        const lostMoney = await db.getGlobalLostMoney(game.guildId);
        game.totalMoney += lostMoney;

        // Reset Big Bank to 0
        await db.resetBigBank(game.guildId, 0);

        await safeInteractionResponse(interaction, 'followUp', {
          embeds: [new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏦 BIG BANK CLAIMED!')
            .setDescription(
              `💰 **You gained:** $${GameUI.formatMoney(lostMoney)}\n` +
              `🔄 **Big Bank reset to:** $0\n\n` +
              `*All lost money from the server is now yours!*`
            )
            .setFooter({ text: 'Congratulations on the massive win!' })]
        });

        // Post to big-bank channel
        try {
          const guild = interaction.guild;
          const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

          if (bigBankChannel) {
            const claimEmbed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('🏦 BIG BANK CLAIMED!')
              .setDescription(
                `**${game.username}** just claimed the Big Bank from Mystery Box!\n\n` +
                `💰 **Amount Won:** $${GameUI.formatMoney(lostMoney)}\n` +
                `🔄 **Big Bank Reset to:** $0.00\n\n` +
                `*Starting fresh! Play and lose to grow the Big Bank again!*`
              )
              .setTimestamp();

            await bigBankChannel.send({ embeds: [claimEmbed] });
          }
        } catch (channelErr) {
          console.error('Error posting to big-bank channel:', channelErr);
        }
      } catch (err) {
        console.error('Error handling Big Bank:', err);
      }
      // return; // Don't show continue button yet - FIXED: Removed to allow game to continue
    } else if (result.specialAction === 'gift_horse') {
      // Gift Horse - Seize 25% of money, add to Big Bank, give 2 bonus plays
      try {
        const giftAmount = Math.floor(game.totalMoney * 0.25);
        game.totalMoney -= giftAmount;
        
        // Add to Big Bank
        await db.addToBigBank(game.guildId, giftAmount);
        
        // Add Bonus Plays
        await db.addBonusPlays(game.userId, game.guildId, 2);
        
        await safeInteractionResponse(interaction, 'followUp', {
          embeds: [new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🎁 GIFT HORSE!')
            .setDescription(
              `🐴 **You gave away:** $${GameUI.formatMoney(giftAmount)}\n` +
              `➕ **You gained:** 2 Bonus Plays for today!\n\n` +
              `*Generosity is its own reward (but extra plays help too!)*`
            )
            .setFooter({ text: 'Thank you for your donation!' })]
        });

        // Notify Big Bank channel
        try {
          const bigBankChannel = interaction.guild.channels.cache.find(ch => ch.name === '💰-big-bank');
          if (bigBankChannel) {
            const newBigBank = await db.getGlobalLostMoney(game.guildId);
            await bigBankChannel.send({
              embeds: [new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎁 GIFT HORSE DONATION!')
                .setDescription(`**${game.username}** donated **$${GameUI.formatMoney(giftAmount)}** to the Big Bank in exchange for bonus plays!\n\n📈 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}`)
                .setTimestamp()]
            });
          }
        } catch (e) {}
      } catch (err) {
        console.error('Error handling Gift Horse:', err);
      }
    } else if (result.specialAction === 'oracles_vision') {
      // Oracle's Vision - Reveal next floor
      await safeInteractionResponse(interaction, 'followUp', {
        embeds: [new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle('🔮 ORACLE\'S VISION!')
          .setDescription(
            `👁️ **The mists clear before you...**\n` +
            `You can now see exactly what's inside the floors on the next level!\n\n` +
            `*Use this knowledge wisely to scale the tower!*`
          )
          .setFooter({ text: 'Gazing through the veil of time...' })]
      });
    } else if (result.specialAction === 'announcement') {
      // Announcement - Reveal money to server, gain 10% bonus
      try {
        const bonus = Math.floor(game.totalMoney * 0.10);
        game.totalMoney += bonus;
        
        const announceEmbed = new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle('📢 FORTUNE ANNOUNCEMENT!')
          .setDescription(
            `🌟 **${game.username}** is reaching new heights in the Tower of Cash!\n\n` +
            `💰 **Current Fortune:** $${GameUI.formatMoney(game.totalMoney)}\n` +
            `📈 **Bonus Received:** $${GameUI.formatMoney(bonus)} (10%)\n\n` +
            `*Let the world know of your success!*`
          )
          .setThumbnail(interaction.user.displayAvatarURL());

        // Send to tower-of-cash channel
        try {
             let eventChannel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash');
             if (!eventChannel) {
                 // Try fetching if not in cache (search by name in fetched cache or fetch all? Fetching all is expensive. Just trust cache or try to fetch if ID known. No ID known. Sticking to cache but logging error if missing)
                 // Actually, best effort:
             }
             
             if (eventChannel) {
                await eventChannel.send({ embeds: [announceEmbed] });
             } else {
                console.warn('Could not find tower-of-cash channel for Announcement.');
             }
        } catch (e) { console.error('Error sending announcement:', e); }
        
        await safeInteractionResponse(interaction, 'followUp', { embeds: [announceEmbed], content: 'Your fortune has been announced to the server!' });
      } catch (err) {
        console.error('Error handling Announcement:', err);
      }
    } else if (result.specialAction === 'small_bank') {
      // Small Bank - Steal 10% of Big Bank
      try {
        const currentBigBank = await db.getGlobalLostMoney(game.guildId);
        const stolenAmount = Math.floor(currentBigBank * 0.10);

        game.totalMoney += stolenAmount;

        // Remove stolen amount from Big Bank using negative add
        await db.addToBigBank(game.guildId, -stolenAmount);
        const newBigBank = currentBigBank - stolenAmount;

        // Update the original reveal embed with new total money
        const newResultEmbed = GameUI.createMysteryBoxResultEmbed(game, result.selectedItem, boxIndex);
        await boxRevealMessage.edit({ embeds: [newResultEmbed] });

        // Post to big-bank channel
        try {
          const guild = interaction.guild;
          const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

          if (bigBankChannel) {
            const heistEmbed = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🏦 SMALL BANK HEIST!')
              .setDescription(
                `**${game.username}** pulled off a Small Bank heist from Mystery Box!\n\n` +
                `💰 **Stolen Amount:** $${GameUI.formatMoney(stolenAmount)} (10%)\n` +
                `📊 **Previous Big Bank:** $${GameUI.formatMoney(currentBigBank)}\n` +
                `📉 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
                `*10% of the Big Bank has been stolen!*`
              )
              .setTimestamp();

            await bigBankChannel.send({ embeds: [heistEmbed] });
          }
        } catch (channelErr) {
          console.error('Error posting to big-bank channel:', channelErr);
        }
      } catch (err) {
        console.error('Error handling Small Bank:', err);
      }
      // Continue to next steps
    } else if (result.specialAction === 'bruh_bank') {
      // BRUH Bank - Seize ALL player money and add to Big Bank
      try {
        const seizedAmount = game.totalMoney;

        if (seizedAmount > 0) {
            // Add to Big Bank
            await db.addLostMoney(game.guildId, seizedAmount);
            const newBigBank = await db.getGlobalLostMoney(game.guildId);

            // Set player money to 0
            game.totalMoney = 0;

            await safeInteractionResponse(interaction, 'followUp', {
                embeds: [new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🏦 BRUH BANK!')
                .setDescription(
                    `💸 **Seized Amount:** $${GameUI.formatMoney(seizedAmount)}\n` +
                    `📈 **Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n` +
                    `📉 **Your Money:** $0\n\n` +
                    `*Your entire fortune has been seized and added to the Big Bank!*`
                )
                .setFooter({ text: 'Better luck next time!' })]
            });

            // Post to big-bank channel
            try {
                const guild = interaction.guild;
                const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

                if (bigBankChannel) {
                const bruhEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🏦 BRUH BANK SEIZURE!')
                    .setDescription(
                    `**${game.username}** got hit by the BRUH Bank!\n\n` +
                    `💸 **Seized Amount:** $${GameUI.formatMoney(seizedAmount)}\n` +
                    `📈 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
                    `*Thanks for the generous donation!*`
                    )
                    .setTimestamp();

                await bigBankChannel.send({ embeds: [bruhEmbed] });
                }
            } catch (channelErr) {
                console.error('Error posting to big-bank channel:', channelErr);
            }
        } else {
            // Player has 0 money
            await safeInteractionResponse(interaction, 'followUp', {
                embeds: [new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🏦 BRUH BANK!')
                .setDescription(
                    `😅 **You have no money to seize!**\n` +
                    `Lucky you!\n\n` +
                    `*The BRUH Bank tried to take your money, but you're broke!*`
                )
                .setFooter({ text: 'Sometimes being broke is lucky!' })]
            });
        }
      } catch (err) {
        console.error('Error handling BRUH Bank:', err);
      }
      // Continue to next steps
    } else if (result.specialAction === 'repeat_game') {
      // Repeat - Reset game with same floor pattern
      const oldFloors = { ...game.preGeneratedFloors };
      game.currentRound = 1;
      game.currentFloor = 0;
      game.selectedFloors = [];
      game.playedFloors = [];
      game.isSelectingFloors = true;

      // Keep same floors but regenerate minigame states
      game.preGeneratedFloors = oldFloors;

      await safeInteractionResponse(interaction, 'followUp', {
        content: '🔁 **REPEAT!**\n♻️ The game has been reset with the same floor pattern!'
      });
      // Continue to next steps
    } else if (result.specialAction === 'choice_30k_lobby') {
      // Crossroads - Give player choice between $30k or go to lobby
      const choiceEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🚦 Crossroads - A Choice Must Be Made!')
        .setDescription(
          '**You stand at a crossroads...**\n\n' +
          '🎯 **Option 1:** Take $30,000 and continue\n' +
          '🏁 **Option 2:** Go to lobby (cash out safely)\n\n' +
          '*Choose wisely!*'
        );

      const choiceButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('crossroads_take30k')
            .setLabel('Take $30k')
            .setEmoji('💰')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('crossroads_lobby')
            .setLabel('Go to Lobby')
            .setEmoji('🏁')
            .setStyle(ButtonStyle.Primary)
        );

      await safeInteractionResponse(interaction, 'followUp', { embeds: [choiceEmbed], components: [choiceButtons] });
      return; // Don't continue game yet, wait for choice

    } else if (result.specialAction === 'skip_to_highest') {
      // Divine Intervention - Skip to highest value floor
      const currentFloorNum = game.getCurrentFloorNumber();
      if (game.preGeneratedFloors[currentFloorNum]) {
        const leftValue = Math.abs(game.preGeneratedFloors[currentFloorNum].left?.value || 0);
        const rightValue = Math.abs(game.preGeneratedFloors[currentFloorNum].right?.value || 0);
        const highest = leftValue > rightValue ? game.preGeneratedFloors[currentFloorNum].left : game.preGeneratedFloors[currentFloorNum].right;

        const moneyBefore = game.totalMoney;
        const result = game.applyAmount(highest);
        game.markAmountUsed(highest);

        const otherSide = leftValue > rightValue ? game.preGeneratedFloors[currentFloorNum].right : game.preGeneratedFloors[currentFloorNum].left;
        game.addToHistory(currentFloorNum, leftValue > rightValue ? 'left' : 'right', result.actualValue || result.value, otherSide.value, moneyBefore, game.totalMoney);

        // Find floors with "Random 5"
        let random5Info = '';
        const maxFloors = game.eventMode ? 28 : 21;
        for (let floorNum = 1; floorNum <= maxFloors; floorNum++) {
          const floor = game.preGeneratedFloors[floorNum];
          if (!floor) continue;

          const leftIsRandom5 = floor.left?.type === 'random' && floor.left?.label === 'Random 5';
          const rightIsRandom5 = floor.right?.type === 'random' && floor.right?.label === 'Random 5';

          if (leftIsRandom5 || rightIsRandom5) {
            const side = leftIsRandom5 ? '⬅️ LEFT' : '➡️ RIGHT';
            random5Info += `\n🔮 **Floor ${floorNum}** has Random 5 on the ${side} side`;
          }
        }

        await safeInteractionResponse(interaction, 'followUp', {
          content: `✨ **DIVINE INTERVENTION!**\n🎯 The gods chose the best path for you!\n💰 **+$${GameUI.formatMoney(Math.abs(highest.value))}**\n💵 **Total:** $${GameUI.formatMoney(game.totalMoney)}${random5Info || '\n\n*No Random 5 floors found in this game*'}`
        });
      }
      // Continue to next steps
    } else if (result.specialAction === 'bonus_minigame') {
      // Golden Ticket - Trigger random minigame from all available minigames
      const allMinigames = [
        // Main game minigames
        'vault', 'mega_grid', 'boiling_point', 'operator_roshambo', 'infinity_percent',
        'hideout_breakthrough', 'babushka', 'door_escape', 'mystery_box',
        // Monopoly minigames from mystery box
        'community_chest', 'park_it', 'advance_boardwalk', 'bank_buster',
        'block_party', 'power_grid', 'no_vacancy', 'ride_rails',
        // Mart-of-Cash exclusive
        'six_zeroes',
        // Round 3 special minigame
        'go_big_or_go_broke'
      ];
      
      const randomMinigame = allMinigames[Math.floor(Math.random() * allMinigames.length)];
      
      // Award Golden Ticket achievement
      await towerAchievements.awardAchievement('GOLDEN_TICKET_WINNER', game.userId, game.username, interaction.guildId, interaction.channel, { 
        minigame: randomMinigame 
      });
      
      await safeInteractionResponse(interaction, 'followUp', {
        content: '🎫 **GOLDEN TICKET!**\n🎮 Random bonus minigame starting...'
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Route to appropriate minigame handler
      if (randomMinigame === 'vault') {
        await handleVaultMinigame(interaction, game);
      } else if (randomMinigame === 'mega_grid') {
        await handleMegaGridMinigame(interaction, game);
      } else if (randomMinigame === 'boiling_point') {
        await handleBoilingPointMinigame(interaction, game);
      } else if (randomMinigame === 'operator_roshambo') {
        await handleOperatorRoshamboMinigame(interaction, game);
      } else if (randomMinigame === 'infinity_percent') {
        await handleInfinityPercentMinigame(interaction, game);
      } else if (randomMinigame === 'hideout_breakthrough') {
        await handleHideoutBreakthroughMinigame(interaction, game);
      } else if (randomMinigame === 'babushka') {
        await handleBabushkaMinigame(interaction, game);
      } else if (randomMinigame === 'door_escape') {
        await handleDoorEscapeMinigame(interaction, game);
      } else if (randomMinigame === 'mystery_box') {
        await handleMysteryBoxMinigame(interaction, game);
      } else if (randomMinigame === 'community_chest') {
        await handleCommunityChestMinigame(interaction, game);
      } else if (randomMinigame === 'park_it') {
        await handleParkItMinigame(interaction, game);
      } else if (randomMinigame === 'advance_boardwalk') {
        await handleAdvanceBoardwalkMinigame(interaction, game);
      } else if (randomMinigame === 'bank_buster') {
        await handleBankBusterMinigame(interaction, game);
      } else if (randomMinigame === 'block_party') {
        await handleBlockPartyMinigame(interaction, game);
      } else if (randomMinigame === 'power_grid') {
        await handlePowerGridMinigame(interaction, game);
      } else if (randomMinigame === 'no_vacancy') {
        await handleNoVacancyMinigame(interaction, game);
      } else if (randomMinigame === 'ride_rails') {
        await handleRideRailsMinigame(interaction, game);
      } else if (randomMinigame === 'six_zeroes') {
        await handleSixZeroesMinigame(interaction, game);
      } else if (randomMinigame === 'go_big_or_go_broke') {
        await handleGoBigOrGoBrokeMinigame(interaction, game);
      }
      return; // Minigame will handle continuation
    } else if (result.specialAction === 'minigame_community_chest') {
      await handleCommunityChestMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_park_it') {
      await handleParkItMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_advance_boardwalk') {
      await handleAdvanceBoardwalkMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_bank_buster') {
      await handleBankBusterMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_block_party') {
      await handleBlockPartyMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_electric_company') {
      await handlePowerGridMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_no_vacancy') {
      await handleNoVacancyMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'minigame_ride_rails') {
      await handleRideRailsMinigame(interaction, game);
      return;
    } else if (result.specialAction === 'choose_floor') {
      // Wish Granter - Let player choose floor number
      const maxFloor = game.selectedFloors.length;
      await safeInteractionResponse(interaction, 'followUp', {
        content: `⭐ **WISH GRANTER!**\n🔢 Choose which floor to jump to (1-${maxFloor})\n💬 Reply with a number in chat!`
      });

      // Store state for message listener
      if (!game.waitingForFloorChoice) game.waitingForFloorChoice = true;
      return; // Wait for user input
    } else if (result.specialAction === 'random_minigame') {
      // Question Mark - Random minigame
      const minigames = ['vault', 'infinity', 'megagrid', 'operator_roshambo', 'boiling_point', 'babushka', 'hideout_breakthrough', 'door_escape'];
      const randomMinigame = minigames[Math.floor(Math.random() * minigames.length)];

      await safeInteractionResponse(interaction, 'followUp', {
        content: `❓ **MYSTERY AWAITS!**\n🎲 Random minigame: **${randomMinigame.toUpperCase()}**!`
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (randomMinigame === 'vault') {
        await handleVaultMinigame(interaction, game);
      } else if (randomMinigame === 'infinity') {
        await handleInfinityPercentMinigame(interaction, game);
      } else if (randomMinigame === 'megagrid') {
        await handleMegaGridMinigame(interaction, game);
      } else if (randomMinigame === 'operator_roshambo') {
        await handleOperatorRoshamboMinigame(interaction, game);
      } else if (randomMinigame === 'boiling_point') {
        await handleBoilingPointMinigame(interaction, game);
      } else if (randomMinigame === 'babushka') {
        await handleBabushkaMinigame(interaction, game);
      } else if (randomMinigame === 'hideout_breakthrough') {
        await handleHideoutBreakthroughMinigame(interaction, game);
      } else if (randomMinigame === 'door_escape') {
        await handleDoorEscapeMinigame(interaction, game);
      }
      return; // Minigame will handle continuation
    } else if (result.specialAction === 'go_to_jail') {
      try {
        // Check if player has immunity or auto revive
        if (game.hasActiveEffect('gameOverImmunity') || game.hasActiveEffect('autoRevive')) {
          if (game.activeEffects) {
            game.activeEffects = game.activeEffects.filter(e => e.type !== 'gameOverImmunity' && e.type !== 'autoRevive');
          }
          await safeInteractionResponse(interaction, 'followUp', {
            embeds: [new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('🛡️ IMMUNITY SHIELD ACTIVATED!')
              .setDescription('👮 **The police tried to arrest you for Go To Jail**, but your protective shield saved you from arrest and the $5M bail penalty!')
              .setFooter({ text: 'Immunity consumed!' })]
          });
        } else {
          // Deduct $5M bail from leaderboard
          const bailResult = await db.deductBail(game.userId, game.guildId, 5000000);

          const jailEmbed = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('🚨 GO TO JAIL! BUSTED!')
            .setDescription(
              `👮 **You were caught red-handed! Go straight to jail!**\n\n` +
              `💸 **Bail Penalty:** -$${GameUI.formatMoney(bailResult.deducted)} (from leaderboard)\n` +
              `📉 **Previous Leaderboard Score:** $${GameUI.formatMoney(bailResult.oldScore)}\n` +
              `📊 **New Leaderboard Score:** $${GameUI.formatMoney(bailResult.newScore)}\n\n` +
              `💀 **GAME OVER!** You do not pass GO, and your run ends here!`
            )
            .setFooter({ text: 'Busted! Bail deducted from leaderboard score.' })
            .setTimestamp();

          await safeInteractionResponse(interaction, 'followUp', { embeds: [jailEmbed] });

          // Post to big bank channel
          try {
            const bigBankChannel = interaction.guild.channels.cache.find(ch => ch.name === '💰-big-bank');
            if (bigBankChannel) {
              await bigBankChannel.send({
                embeds: [new EmbedBuilder()
                  .setColor('#8B0000')
                  .setTitle('🚨 PLAYER BUSTED - SENT TO JAIL!')
                  .setDescription(`**${game.username}** opened the Mystery Box and hit **Go to Jail**!\nBail paid: **$${GameUI.formatMoney(bailResult.deducted)}** deducted from leaderboard.`)
                  .setTimestamp()]
              });
            }
          } catch (e) {}

          // End game
          await db.updatePlayerStats(game.userId, interaction.guildId, game.username, 0, game.floorsCompleted, false);
          await db.saveGameHistory(game.userId, interaction.guildId, game.username, 0, game.floorsCompleted, 'go_to_jail');
          gameManager.endGame(interaction.channelId);
          return;
        }
      } catch (err) {
        console.error('Error handling Go to Jail:', err);
      }
    } else if (result.specialAction === 'the_heist') {
      try {
        const heistResult = await db.executeTheHeist(game.userId, game.guildId);
        game.totalMoney += heistResult.totalStolen;

        const heistEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🎭 THE GRAND HEIST!')
          .setDescription(
            `💰 **MASTER HEIST COMMENCED!**\n` +
            `You raided the vault of every single player on this server's leaderboard!\n\n` +
            `👥 **Leaderboard Targets Robbed:** ${heistResult.victimsCount} players\n` +
            `💸 **Tax Rate:** 10% deducted from everyone's high score\n` +
            `💎 **Total Loot Siphoned:** **+$${GameUI.formatMoney(heistResult.totalStolen)}**\n\n` +
            `🏦 **Your New Run Total:** **$${GameUI.formatMoney(game.totalMoney)}**`
          )
          .setFooter({ text: 'The greatest heist in the Tower of Cash!' })
          .setTimestamp();

        // If victims, list top 5 victims in fields
        if (heistResult.victims && heistResult.victims.length > 0) {
          const topVictims = heistResult.victims
            .sort((a, b) => b.stolen - a.stolen)
            .slice(0, 5)
            .map(v => `• **${v.username}**: -$${GameUI.formatMoney(v.stolen)}`)
            .join('\n');
          heistEmbed.addFields({ name: '🏆 Top Victims', value: topVictims });
        }

        await safeInteractionResponse(interaction, 'followUp', { embeds: [heistEmbed] });

        // Post announcement to tower-of-cash or big-bank channel
        try {
          const eventChannel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash' || ch.name === '💰-big-bank');
          if (eventChannel) {
            await eventChannel.send({ embeds: [heistEmbed] });
          }
        } catch (e) {}
      } catch (err) {
        console.error('Error executing The Heist:', err);
      }
    }
  }

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

// === CROSSROADS HANDLERS ===

async function handleCrossroadsTake30k(interaction, game) {
  // Give player $30k and continue
  game.totalMoney += 30000;

  const resultEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🚦 Crossroads - Choice Made!')
    .setDescription(
      `You chose to **take $30,000!**\n\n` +
      `💰 **Current Money:** $${GameUI.formatMoney(game.totalMoney)}\n\n` +
      `*Moving to next floor...*`
    );

  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

async function handleCrossroadsLobby(interaction, game) {
  await interaction.update({ content: '🏁 **Going to lobby...**', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // End game and save
  await continueGameAfterMinigame(interaction, game);
}

// === COMMUNITY CHEST MINIGAME ===

async function handleCommunityChestMinigame(interaction, game) {
  game.startCommunityChest();
  const embed = GameUI.createCommunityChestIntroEmbed(game);
  const buttons = GameUI.createCommunityChestButtons(game, false); // Show chest selection
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === PARK IT MINIGAME ===

async function handleParkItMinigame(interaction, game) {
  game.startParkIt();
  const embed = GameUI.createParkItIntroEmbed(game);
  const buttons = GameUI.createParkItButtons(game); // Show car selection
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === ADVANCE TO BOARDWALK MINIGAME ===

async function handleAdvanceBoardwalkMinigame(interaction, game) {
  game.startAdvanceToBoardwalk();
  const embed = GameUI.createAdvanceBoardwalkIntroEmbed(game);
  const buttons = GameUI.createAdvanceBoardwalkButtons(game);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === BANK BUSTER MINIGAME ===

async function handleBankBusterMinigame(interaction, game) {
  game.startBankBuster();
  const embed = GameUI.createBankBusterIntroEmbed(game);
  const buttons = GameUI.createBankBusterButtons(game);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === BLOCK PARTY MINIGAME ===

async function handleBlockPartyMinigame(interaction, game) {
  game.startBlockParty();
  const embed = GameUI.createBlockPartyIntroEmbed(game);
  const buttons = GameUI.createBlockPartyButtons(game);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === POWER GRID MINIGAME (formerly Electric Company) ===

async function handlePowerGridMinigame(interaction, game) {
  game.startElectricCompany();
  const embed = GameUI.createPowerGridIntroEmbed(game);
  const buttons = GameUI.createPowerGridButtons(game);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === NO VACANCY MINIGAME ===

async function handleNoVacancyMinigame(interaction, game) {
  game.startNoVacancy();
  const embed = GameUI.createNoVacancyIntroEmbed(game);
  const buttons = GameUI.createNoVacancyButtons(game, false);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === RIDE THE RAILS MINIGAME ===

async function handleRideRailsMinigame(interaction, game) {
  game.startRideTheRails();
  const embed = GameUI.createRideRailsIntroEmbed(game);
  const buttons = GameUI.createRideRailsButtons(game, true);
  await interaction.followUp({ embeds: [embed], components: buttons });
}

// === HELPER FUNCTIONS ===

// === RANDOM PERCENTAGE HANDLER ===

async function handleRandomPercentage(interaction, game) {
  // Generate random percentage from -150% to +150%
  const percentage = Math.floor(Math.random() * 301) - 150; // -150 to +150

  // Show suspense
  await interaction.editReply({ content: '🎲 Rolling the percentage dice...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Apply percentage
  const multiplier = 1 + (percentage / 100);
  game.totalMoney = Math.floor(game.totalMoney * multiplier);

  // Track achievement
  AchievementHelper.trackRandomPercent(game, percentage);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');

  // Show result
  const embed = GameUI.createRandomPercentageEmbed(game, percentage);
  await interaction.editReply({ content: '', embeds: [embed], components: [] });

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
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
    } else if (commandName === 'grant-mount-cashmore') {
      await handleGrantMountCashmoreCommand(interaction);
    } else if (commandName === 'modify-score') {
      await handleModifyScoreCommand(interaction);
    } else if (commandName === 'giveaway') {
      await handleGiveawayCommand(interaction);
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
    } else if (commandName === 'reveal-mount-cashmore') {
      await handleRevealMountCashmoreCommand(interaction);
    } else if (commandName === 'test-mount-cashmore') {
      await handleTestMountCashmoreCommand(interaction);
    } else if (commandName === 'test-level9-decision') {
      await handleTestLevel9DecisionCommand(interaction);
    } else if (commandName === 'crash') {
      await handleCrashCommand(interaction);
    } else if (commandName === 'current-mode') {
      await handleCurrentModeCommand(interaction);
    } else if (commandName === 'test-commercial') {
      await handleTestCommercialCommand(interaction);
    } else if (commandName === 'test-mart') {
      await handleTestMartCommand(interaction);
    } else if (commandName === 'test-sixzeroes') {
      await handleTestSixZeroesCommand(interaction);
    } else if (commandName === 'new-year-gift') {
      await handleNewYearGiftCommand(interaction);
    } else if (commandName === 'new-year-gift-list') {
      await handleNewYearGiftListCommand(interaction);
    } else if (commandName === 'test-event') {
      await handleTestEventCommand(interaction);
    } else if (commandName === 'force-big-bank') {
      await handleForceBigBankCommand(interaction);
    } else if (commandName === 'test-round-end') {
      // Create a test game at end of Round 1
      await interaction.deferReply();
      
      const includeLucky7 = interaction.options.getBoolean('lucky7') || false;
      
      // Create a test game state

      const testGame = await gameManager.createGame(
        interaction.user.id,
        interaction.user.username,
        interaction.channelId,
        interaction.guildId,
        db
      );
      
      if (!testGame) {
        return interaction.editReply({ content: '❌ Could not create test game (game already exists in this channel).' });
      }
      
      // Set up game state for end of Round 1
      testGame.currentRound = 1;
      testGame.totalMoney = 50000; // Test amount
      testGame.floorsCompleted = 6;
      testGame.isSelectingFloors = false;
      testGame.selectedFloors = [1, 2, 3, 4, 5, 6];
      testGame.currentFloor = 6;
      
      // Add Lucky 7 effect if requested
      if (includeLucky7) {
        if (!testGame.activeEffects) testGame.activeEffects = [];
        testGame.activeEffects.push({
          type: 'lobby_locked',
          targetRound: 1,
          fresh: false
        });
      }
      
      // Show round end screen
      const roundEndEmbed = GameUI.createRoundEndEmbed(testGame);
      const roundEndButtons = GameUI.createRoundEndButtons(testGame);
      
      await interaction.editReply({
        content: includeLucky7 ? '🎰 **Test: Round 1 End (WITH Lucky 7)**' : '✅ **Test: Round 1 End (NO Lucky 7)**',
        embeds: [roundEndEmbed],
        components: roundEndButtons
      });
    } else if (interaction.commandName === 'content-list') {
      await handleContentListCommand(interaction);
    } else if (interaction.commandName === 'minigame-detail') {
      await handleMinigameDetailCommand(interaction);
    } else if (interaction.commandName === 'mystery-box') {
      await handleMysteryBoxCommand(interaction);
    } else if (interaction.commandName === 'mystery-box-items') {
      await handleMysteryBoxItemsCommand(interaction);
    } else if (interaction.commandName === 'big-bank') {
      await handleBigBankCommand(interaction);
    } else if (interaction.commandName === 'dond') {
      await handleDondCommand(interaction);
    } else if (interaction.commandName === 'dond-board') {
      await handleDondBoardCommand(interaction);
    } else if (interaction.commandName === 'hmie-faceoff-test') {
      await handleHMIEFaceOffTest(interaction);
    } else if (interaction.commandName === 'reset-big-bank') {
      await handleResetBigBankCommand(interaction);
    } else if (commandName === 'set-big-bank') {
      await handleSetBigBankCommand(interaction);
    } else if (commandName === 'test-minigame') {
      await handleTestMinigameCommand(interaction);
    } else if (commandName === 'test-scam-call') {
      await handleTestScamCallCommand(interaction);
    } else if (commandName === 'test-gobig') {
      await handleTestGoBigCommand(interaction);
    } else if (commandName === 'test-sangha') {
      await handleTestSanghaCommand(interaction);
    } else if (commandName === 'test-basement') {
      await handleTestBasementCommand(interaction);
    } else if (commandName === 'hmie') {
      await handleHMIECommand(interaction);
    } else if (commandName === 'mount-cashmore') {
      await handleMountCashmoreCommand(interaction);
    } else if (commandName === 'one-egg') {
      await handleOneEggCommand(interaction);
    } else if (commandName === 'test_one_egg_bonus') {
      // Admin-only test: start a One Egg game in this channel and jump to bonus round
      await interaction.deferReply();
        try {
          const championUser = interaction.options.getUser('champion');
          const loserUser = interaction.options.getUser('loser');
          const guildId = interaction.guildId;

          if (!championUser || !loserUser) {
            await interaction.editReply({ content: '❌ Both `champion` and `loser` must be provided.' });
            return;
          }
          if (championUser.id === loserUser.id) {
            await interaction.editReply({ content: '❌ Champion and Loser must be different users.' });
            return;
          }

          // Create OneEgg game with the two tagged users
          const oneEggGame = new OneEgg(channelId, channelId, guildId,
            { id: championUser.id, username: championUser.username },
            { id: loserUser.id, username: loserUser.username }
          );
          // Assign sides: champion -> left (winner), loser -> right
          oneEggGame.winner = 'left';
          oneEggGame.loser = 'right';

        // Persist in map and prepare message
        oneEggGames.set(channelId, oneEggGame);

        const mentionChampion = `<@${oneEggGame.players.left.id}>`;
        const mentionLoser = `<@${oneEggGame.players.right.id}>`;
        const msg = await interaction.followUp({ content: `🥚 Test: Starting One Egg Bonus Round — Champion: ${mentionChampion}, Loser: ${mentionLoser}`, fetchReply: true });
        oneEggGame.messageId = msg.id;

        // Move straight to bonus round
        oneEggGame.startBonusRound();

        // Show loser pick UI (loser may be bot)
        const loserId = oneEggGame.players[oneEggGame.loser] && oneEggGame.players[oneEggGame.loser].id;
        const loserEmbed = GameUI.createOneEggBonusLoserPickEmbed(oneEggGame);
        const loserBtns = GameUI.createOneEggBonusLoserPickButtons(loserId || '');
        await msg.edit({ content: '🥚 **BONUS ROUND START!**', embeds: [loserEmbed], components: [loserBtns] }).catch(() => {});

        // If loser is bot, start bot loop to let it pick and continue the flow
        const loserIsBot = loserId === 'bot_oneegg';
        if (loserIsBot) {
          // allow a small delay before bot acts
          runOneEggBotLoop(channelId);
        }
      } catch (err) {
        console.error('Error starting test_one_egg_bonus:', err);
        try { await interaction.editReply({ content: '❌ Failed to start test bonus round.' }); } catch(e) { /* ignore */ }
      }
    } else if (commandName === 'rtab') {
      await handleRTABCommand(interaction);
    } else if (commandName === 'wager') {
      await handleWagerCommand(interaction);
    } else if (commandName === 'peek') {
      await handlePeekCommand(interaction);
    } else if (commandName === 'blammo') {
      await handleBlammoCommand(interaction);
    } else if (commandName === 'rtab_status') {
      await handleRTABStatusCommand(interaction);
    } else if (commandName === 'rtab_stats') {
      await handleRTABStatsCommand(interaction);
    } else if (commandName === 'rtab_leaderboard') {
      await handleRTABLeaderboardCommand(interaction);
    } else if (commandName === 'rtab_achievements') {
      await handleRTABAchievementsCommand(interaction);
    } else if (commandName === 'rtab_replay') {
      await handleRTABReplayCommand(interaction);
    } else if (commandName === 'rtab_global') {
      await handleRTABGlobalCommand(interaction);
    } else if (commandName === 'minigame-master') {
      await handleMinigameMasterCommand(interaction);
    } else if (commandName === 'game-over-option') {
      await handleGameOverOptionCommand(interaction);
    } else if (commandName === 'manage-achievement') {
      await handleManageAchievementCommand(interaction);
    // } else if (commandName === 'tournament') {
    //   await handleTournamentCommand(interaction);
    // } else if (commandName === 'challenge') {
    //   await handleChallengeCommand(interaction);
    // } else if (commandName === 'level') {
    //   await handleLevelCommand(interaction);
    // } else if (commandName === 'bounty') {
    //   await handleBountyCommand(interaction);
    // } else if (commandName === 'minigame') {
    //   await handleMinigameCommand(interaction);
    } else if (commandName === 'achievements') {
      await handleAchievementsCommand(interaction);
    } else if (commandName === 'achievement-list') {
      await handleAchievementListCommand(interaction);
    } else if (commandName === 'verify-achievements') {
      await handleVerifyAchievementsCommand(interaction);
    } else if (commandName === 'achievement-stats') {
      await handleAchievementStatsCommand(interaction);
    }
  } catch (error) {
    console.error('Error handling command:', error);
    try {
      // Check if interaction is still valid (not expired)
      const now = Date.now();
      const interactionTime = interaction.createdTimestamp;
      const isExpired = (now - interactionTime) > 3000; // 3 seconds

      if (!isExpired) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred!', flags: 64 });
        } else if (interaction.deferred) {
          await interaction.editReply({ content: '❌ An error occurred!' });
        }
      } else {
        console.log('Interaction expired, cannot send error message');
      }
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
});

function isAdmin(member) {
  if (!member) return false;
  return (member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) ||
    (member.roles && member.roles.cache.some(role => role.name === '💻 Owner')) ||
    member.id === '459917242633682955';
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
      // Calculate time until next day (midnight GMT+7)
      const timeLeft = db.getTimeUntilNextResetGMT7();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `❌ You've reached your daily play limit (5 plays per day).\n\n⏰ **Time until reset:** ${hoursLeft}h ${minutesLeft}m\nCome back tomorrow!`,
        flags: 64
      });
    }
  }

  const selectedMode = interaction.options.getString('mode');

  if (selectedMode === 'minigame_master') {
    return handleMinigameMasterCommand(interaction);
  }

  const serverMode = await db.getEventMode(guildId);
  if (!selectedMode && (serverMode === 3 || serverMode === 'minigame_master')) {
    return handleMinigameMasterCommand(interaction);
  }

  // Create new game (with event mode check or mode override)
  const game = await gameManager.createGame(user.id, user.username, channelId, guildId, db, selectedMode);
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
  let leaderboard = await db.getLeaderboard(interaction.guildId, 10);
  
  // Try to resolve "Unknown" usernames by fetching from Discord
  for (let i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].username === 'Unknown' && leaderboard[i].user_id) {
      try {
        const user = await interaction.client.users.fetch(leaderboard[i].user_id);
        if (user) {
          leaderboard[i].username = user.username;
          // Update database with resolved username
          await db.updatePlayerUsername(leaderboard[i].user_id, interaction.guildId, user.username);
        }
      } catch (error) {
        // User not found or error fetching, keep as "Unknown"
      }
    }
  }
  
  const embed = GameUI.createLeaderboardEmbed(leaderboard);
  await interaction.editReply({ embeds: [embed] });
}

async function handleStatsCommand(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const gameChoice = interaction.options.getString('game') || 'tower';
  const isAdminRequester = isAdmin(interaction.member);

  // If user parameter provided but not admin, deny
  if (targetUser && !isAdminRequester) {
    return interaction.editReply({ content: '❌ You do not have permission to view other users\' stats.' });
  }

  const userId = targetUser ? targetUser.id : interaction.user.id;
  const user = targetUser || interaction.user;

  // Determine if the TARGET user is an admin
  let isTargetAdmin = false;
  try {
    const member = targetUser
      ? await interaction.guild.members.fetch(userId)
      : interaction.member;

    if (member) {
      isTargetAdmin = isAdmin(member);
    }
  } catch (error) {
    console.error('Error fetching member for stats:', error);
  }

  if (gameChoice === 'hmie') {
    // HMIE Stats
    const embed = new EmbedBuilder()
      .setTitle(`🎰 How Much Is Enough? - Stats`)
      .setDescription(`**${user.username}'s HMIE Statistics**`)
      .addFields(
        { name: '🎮 Total Games Played', value: '0', inline: true },
        { name: '🏆 Games Won', value: '0', inline: true },
        { name: '💀 Games Lost', value: '0', inline: true },
        { name: '💰 Highest Winnings', value: '$0', inline: true },
        { name: '🔥 Best Multiplier Reached', value: '0x', inline: true },
        { name: '📊 Win Rate', value: '0%', inline: true },
        { name: '💵 Total Money Earned', value: '$0', inline: false },
        { name: '📈 Average Winnings', value: '$0', inline: true }
      )
      .setColor('#FF6B35')
      .setFooter({ text: '⚠️ HMIE statistics tracking coming soon!' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
    
  } else if (gameChoice === 'mount_cashmore') {
    // Mount Cashmore Stats
    const stats = (await db.getMountCashmoreStats(userId, interaction.guildId)) || {
      total_games_played: 0,
      summit_victories: 0,
      risk_mode_wins: 0,
      highest_level_reached: 1,
      biggest_cash_out: 0,
      total_money_earned: 0,
      skull_seeker_wins: 0,
      times_hit_fatal_trap: 0,
      lives_lost: 0
    };

    const embed = new EmbedBuilder()
      .setTitle(`🏔️ Mount Ca$hmore - Stats`)
      .setDescription(`**${user.username}'s Mount Ca$hmore Statistics**`)
      .addFields(
        { name: '🎮 Total Games Played', value: stats.total_games_played.toString(), inline: true },
        { name: '🏆 Summit Victories', value: stats.summit_victories.toString(), inline: true },
        { name: '⚠️ Climb by Hand Wins', value: stats.risk_mode_wins.toString(), inline: true },
        { name: '💰 Highest Level Reached', value: `Level ${stats.highest_level_reached}`, inline: true },
        { name: '💵 Biggest Cash Out', value: `$${stats.biggest_cash_out.toLocaleString()}`, inline: true },
        { name: '💎 Total Money Earned', value: `$${stats.total_money_earned.toLocaleString()}`, inline: true },
        { name: '🔍 Skull Seeker Wins', value: stats.skull_seeker_wins.toString(), inline: true },
        { name: '💀 Times Hit Fatal Trap', value: stats.times_hit_fatal_trap.toString(), inline: true },
        { name: '🎯 Lives Lost', value: stats.lives_lost.toString(), inline: true }
      )
      .setColor('#4169E1')
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
    
  } else if (gameChoice === 'oneegg') {
    // One Egg Stats
    const stats = await db.getOneEggStats(userId, interaction.guildId);
    if (!stats) {
      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle(`🥚 Who has only one EGG??? - Stats`)
        .setDescription(`**${user.username}** hasn't played "Who has only one EGG???" yet!`)
        .setFooter({ text: 'Play your first game with /one-egg play' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle(`🥚 Who has only one EGG??? - Stats`)
      .setDescription(`**${user.username}'s One Egg Statistics**`)
      .addFields(
        { name: '🎮 Games Played', value: (stats.games_played || 0).toString(), inline: true },
        { name: '🏆 Wins', value: (stats.wins || 0).toString(), inline: true },
        { name: '🥇 Golden Eggs', value: (stats.golden_eggs_collected || 0).toString(), inline: true },
        { name: '💰 Total Earnings', value: `$${GameUI.formatMoney(stats.total_money_earned || 0)}`, inline: true },
        { name: '📊 Win Rate', value: (stats.games_played || 0) > 0 ? `${(((stats.wins || 0) / stats.games_played) * 100).toFixed(1)}%` : '0%', inline: true },
        { name: '💵 Avg Earnings', value: (stats.games_played || 0) > 0 ? `$${GameUI.formatMoney(Math.floor((stats.total_money_earned || 0) / stats.games_played))}` : '$0', inline: true }
      )
      .setTimestamp();
      
    return interaction.editReply({ embeds: [embed] });
    
  } else {
    // Tower of Cash Stats (existing)
    const playerStats = await db.getPlayerStats(userId, interaction.guildId);

    let remainingPlays;
    if (isTargetAdmin) {
      remainingPlays = 'Unlimited';
    } else {
      remainingPlays = await db.getRemainingPlays(userId, interaction.guildId);
    }

    const recentPlays = await db.getRecentPlays(userId, interaction.guildId);
    const topPlays = await db.getTopPlays(userId, interaction.guildId);

    const embed = GameUI.createStatsEmbed(playerStats, remainingPlays, isTargetAdmin, recentPlays, topPlays, user);
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleAchievementsCommand(interaction) {
  await interaction.deferReply();
  
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;
  const username = targetUser.username;
  const guildId = interaction.guildId;

  try {
    const achievements = await towerAchievements.getPlayerAchievements(userId, guildId);
    const progress = await towerAchievements.getPlayerProgress(userId, guildId);
    
    const embed = GameUI.createAchievementsListEmbed(userId, username, achievements, progress);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    await interaction.editReply({ content: '❌ Failed to fetch achievements.' });
  }
}

async function handleAchievementListCommand(interaction) {
  await interaction.deferReply();
  
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  try {
    const earnedAchievements = await towerAchievements.getPlayerAchievements(userId, guildId);
    
    if (category) {
      // Show specific category
      const categoryName = category.toUpperCase().replace('-', '_');
      const allAchievements = Object.entries(ACHIEVEMENTS);
      const embed = GameUI.createAchievementsCategoryEmbed(categoryName, allAchievements, earnedAchievements);
      await interaction.editReply({ embeds: [embed] });
    } else {
      // Show all categories overview
      const allAchievements = Object.entries(ACHIEVEMENTS);
      let description = '**Achievement Categories:**\n\n';
      
      for (const [typeName, typeData] of Object.entries(AchievementType)) {
        const categoryAchievements = allAchievements.filter(([_, a]) => a.type.name === typeName);
        const earned = earnedAchievements.filter(a => a.type.name === typeName).length;
        description += `**${typeName}** - ${earned}/${categoryAchievements.length} earned\n`;
      }
      
      description += '\n*Use `/achievement-list category:<name>` to see details*';
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Achievement Categories 🏆')
        .setDescription(description)
        .setTimestamp();
        
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error fetching achievement list:', error);
    await interaction.editReply({ content: '❌ Failed to fetch achievement list.' });
  }
}

async function handleVerifyAchievementsCommand(interaction) {
  await interaction.deferReply();
  
  const targetUser = interaction.options.getUser('user');
  const isAdminRequester = isAdmin(interaction.member);

  // If user parameter provided but not admin, deny
  if (targetUser && !isAdminRequester) {
    return interaction.editReply({ content: '❌ You do not have permission to verify other users\' achievements.' });
  }

  const userId = targetUser ? targetUser.id : interaction.user.id;
  const user = targetUser || interaction.user;
  const guildId = interaction.guildId;

  try {
    const verification = await towerAchievements.verifyPlayerAchievements(userId, guildId);
    const archiveLog = await towerAchievements.getPlayerAchievementLog(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(verification.valid ? '#00FF00' : '#FF0000')
      .setTitle(`🔍 Achievement Verification: ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));

    let description = `**Status:** ${verification.valid ? '✅ Valid' : '⚠️ Issues Found'}\n`;
    description += `**Total Earned:** ${verification.totalEarned} achievements\n\n`;

    if (verification.errors.length > 0) {
      description += '**⚠️ Errors Found:**\n';
      verification.errors.forEach(error => {
        description += `• ${error}\n`;
      });
      description += '\n';
    }

    if (verification.warnings.length > 0) {
      description += '**⚡ Warnings:**\n';
      verification.warnings.forEach(warning => {
        description += `• ${warning}\n`;
      });
      description += '\n';
    }

    if (verification.valid && verification.errors.length === 0) {
      description += '✅ All achievements validated successfully!\n';
      description += `📋 **Archive Log:** ${archiveLog.length} entries\n`;
    }

    if (archiveLog.length > 0 && isAdminRequester) {
      description += `\n**Recent Archive Entries (Last 5):**\n`;
      archiveLog.slice(-5).reverse().forEach(entry => {
        const date = new Date(entry.timestamp);
        description += `• ${entry.achievementName} - ${date.toLocaleDateString()}\n`;
      });
    }

    embed.setDescription(description);
    embed.setFooter({ text: `Verification completed at ${new Date().toLocaleTimeString()}` });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error verifying achievements:', error);
    await interaction.editReply({ content: '❌ Failed to verify achievements.' });
  }
}

async function handleAchievementStatsCommand(interaction) {
  await interaction.deferReply();
  
  const guildId = interaction.guildId;

  try {
    const stats = await towerAchievements.getAchievementStatistics(guildId);

    if (!stats) {
      return interaction.editReply({ content: '❌ No achievement data available for this server yet.' });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`📊 Achievement Statistics - ${interaction.guild?.name || 'Server'}`)
      .addFields(
        { name: '👥 Total Players', value: stats.totalPlayers.toString(), inline: true },
        { name: '📈 Avg. Achievements', value: stats.averageAchievements.toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
      );

    if (stats.mostEarnedAchievement) {
      embed.addFields({
        name: '🏆 Most Earned Achievement',
        value: `${stats.mostEarnedAchievement.name}\n*${stats.mostEarnedAchievement.count} players*`,
        inline: true
      });
    }

    if (stats.leastEarnedAchievement) {
      embed.addFields({
        name: '💎 Rarest Achievement',
        value: `${stats.leastEarnedAchievement.name}\n*${stats.leastEarnedAchievement.count} players*`,
        inline: true
      });
    }

    // Top 10 most earned achievements
    const sortedAchievements = Object.entries(stats.achievementCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    let topList = '';
    sortedAchievements.forEach(([id, count], index) => {
      const achievement = ACHIEVEMENTS[id];
      if (achievement) {
        topList += `${index + 1}. ${achievement.emoji} ${achievement.name} - ${count} players\n`;
      }
    });

    if (topList) {
      embed.addFields({
        name: '📋 Top 10 Achievements',
        value: topList || 'No data',
        inline: false
      });
    }

    embed.setTimestamp();
    embed.setFooter({ text: 'Server achievement statistics' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    await interaction.editReply({ content: '❌ Failed to fetch achievement statistics.' });
  }
}

async function handleGameOverOptionCommand(interaction) {
  // Check permission
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: '❌ Only admins can configure Game Over options.', ephemeral: true });
  }

  const mode = interaction.options.getString('mode');
  await db.setGameOverMode(interaction.guildId, mode);

  const modeName = mode === 'basement' ? '🏚️ Basement Mode' : '💀 Normal Mode';
  const description = mode === 'basement'
    ? 'When players hit GAME OVER, they will be sent to the Basement to negotiate with John Chaona!'
    : 'When players hit GAME OVER, they lose immediately (Standard).';

  return interaction.reply({
    content: `✅ **Game Over Mode Updated!**\n\n**New Mode:** ${modeName}\n${description}`
  });
}

async function handleManageAchievementCommand(interaction) {
  // Check permission
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: '❌ Only admins can manage achievements.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const action = interaction.options.getString('action');
  const targetUser = interaction.options.getUser('user');
  const achievementId = interaction.options.getString('achievement').toUpperCase();

  // Validate achievement exists
  if (!ACHIEVEMENTS[achievementId]) {
    return interaction.editReply({
      content: `❌ Achievement "${achievementId}" not found!\n\n**Tip:** Use \`/achievement-list\` to see all achievement IDs.`
    });
  }

  const achievement = ACHIEVEMENTS[achievementId];

  try {
    if (action === 'add') {
      // Force award achievement
      const result = await towerAchievements.awardAchievement(
        achievementId,
        targetUser.id,
        targetUser.username,
        interaction.guildId,
        interaction.channel,
        { forceAward: true }
      );

      if (result) {
        return interaction.editReply({
          content: `✅ **Achievement Added!**\n\n${achievement.emoji} **${achievement.name}**\nAwarded to: ${targetUser.username}\n\n*${achievement.description}*`
        });
      } else {
        return interaction.editReply({
          content: `⚠️ ${targetUser.username} already has the achievement "${achievement.name}".`
        });
      }
    } else {
      // Remove achievement
      const removed = await towerAchievements.removeAchievement(
        achievementId,
        targetUser.id,
        interaction.guildId
      );

      if (removed) {
        return interaction.editReply({
          content: `✅ **Achievement Removed!**\n\n${achievement.emoji} **${achievement.name}**\nRemoved from: ${targetUser.username}`
        });
      } else {
        return interaction.editReply({
          content: `⚠️ ${targetUser.username} doesn't have the achievement "${achievement.name}".`
        });
      }
    }
  } catch (error) {
    console.error('Error managing achievement:', error);
    return interaction.editReply({
      content: `❌ Failed to ${action} achievement. Error: ${error.message}`
    });
  }
}

async function handleHMIEFaceOffTest(interaction) {
  // 1. Force clear existing game
  if (gameManager.activeGames.has(interaction.channelId)) {
    gameManager.activeGames.delete(interaction.channelId);
  }

  // 2. Create new game
  const game = await gameManager.createGame(interaction.user.id, interaction.user.username, interaction.channelId, interaction.guildId, db);
  if (!game) {
    return interaction.reply({ content: '❌ Failed to create game session.', ephemeral: true });
  }

  // 3. Initialize HMIE with mock players
  const players = [
    { id: interaction.user.id, name: interaction.user.username, isBot: false },
    { id: 'bot_alpha', name: 'Bot Alpha', isBot: true }
  ];
  game.startHMIE(players);

  // 4. Force state to Face-Off
  game.hmieState.currentRound = 5;
  game.hmieState.players[0].bankedMoney = 35000;
  game.hmieState.players[1].bankedMoney = 32000;
  game.hmieState.players[0].eliminated = false;
  game.hmieState.players[1].eliminated = false;

  // Call startHMIEFaceOff to set up flags (isFaceOff, faceOffMax, etc.)
  game.startHMIEFaceOff();

  // 5. Run the Face-Off Logic (Replicating handleHMIEFaceOff but for Slash Command)
  await interaction.reply({ content: '⏱️ **Starting Final Face-Off Test...**', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const maximum = game.hmieState.faceOffMax;
  const increment = Math.floor(maximum / 500); // 500 steps

  game.hmieState.clockValue = 0;

  // Create STOP button
  const faceOffButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hmie_faceoff_stop')
      .setLabel('⛔ STOP!')
      .setStyle(ButtonStyle.Danger)
  );

  // Bot setup
  const botFinalists = game.hmieState.players.filter(p => p.isBot);
  botFinalists.forEach(bot => {
    bot.botPressValue = Math.floor(maximum * (0.5 + Math.random() * 0.4)); // 50-90%
  });

  // Start Interval
  game.hmieState.faceOffInterval = setInterval(async () => {
    if (!gameManager.activeGames.has(game.channelId)) {
      clearInterval(game.hmieState.faceOffInterval);
      return;
    }

    if (game.hmieState.faceOffWinner) {
      clearInterval(game.hmieState.faceOffInterval);
      return;
    }

    game.hmieState.clockValue += increment;

    if (game.hmieState.clockValue >= maximum) {
      game.hmieState.clockValue = maximum;
      clearInterval(game.hmieState.faceOffInterval);
    }

    // Bot Logic
    try {
      for (const bot of botFinalists) {
        if (!game.hmieState.faceOffWinner && game.hmieState.clockValue >= bot.botPressValue) {
          const result = game.playHMIEFaceOff(bot.id, game.hmieState.clockValue);
          if (result) {
            clearInterval(game.hmieState.faceOffInterval);
            const resultEmbed = GameUI.createFaceOffResultEmbed(game, result);
            await interaction.editReply({ embeds: [resultEmbed], components: [] });
            gameManager.activeGames.delete(game.channelId);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error in bot face-off logic:', error);
      clearInterval(game.hmieState.faceOffInterval); // Emergency stop
    }

    // UI Update (throttled)
    if (game.hmieState.clockValue % (increment * 10) < increment) {
      // LAST CHECK: If winner declared, stop immediately and DO NOT update clock
      if (game.hmieState.faceOffWinner) {
        clearInterval(game.hmieState.faceOffInterval);
        return;
      }

      // Use createFaceOffClockEmbed (correct name)
      try {
        const embed = GameUI.createFaceOffClockEmbed(game, game.hmieState.clockValue);
        await interaction.editReply({ embeds: [embed], components: [faceOffButtons] });
      } catch (e) {
        clearInterval(game.hmieState.faceOffInterval);
      }
    }
  }, 100);
}


async function handleHelpCommand(interaction) {
  await interaction.deferReply();
  
  const gameChoice = interaction.options.getString('game');
  
  // If no game selected, show main help with game selection menu
  if (!gameChoice) {
    const hasAdminRole = isAdmin(interaction.member);
    const remainingPlays = hasAdminRole ? '∞ (Admin)' : await db.getRemainingPlays(interaction.user.id, interaction.guildId);
    const eventMode = await db.getEventMode(interaction.guildId);
    const embed = GameUI.createWelcomeEmbed(remainingPlays, eventMode);
    await interaction.editReply({ embeds: [embed] });
    return;
  }
  
  // Show specific game help
  if (gameChoice === 'hmie') {
    const hmieEmbed = new EmbedBuilder()
      .setTitle('🕐 How Much Is Enough? (HMIE)')
      .setDescription(
        '**A multiplayer money clock game where greed battles caution!**\n\n' +
        'Players compete across 5 rounds. Watch the money clock count up or down, and decide when to lock in your amount. But beware: the greediest player gets NOTHING!'
      )
      .addFields(
        {
          name: '🎮 How to Play',
          value: 
            '1️⃣ Use `/play game:hmie` to start a lobby\n' +
            '2️⃣ Each round, a money clock counts up or down\n' +
            '3️⃣ Click **LOCK IN** when you want to claim that amount\n' +
            '4️⃣ **Greediest player** (highest lock) gets $0\n' +
            '5️⃣ Everyone else banks their locked amount',
          inline: false
        },
        {
          name: '⏱️ The Money Clock',
          value: 
            '• **Round 1**: Counts UP to $10,000\n' +
            '• **Round 2**: Counts DOWN from $20,000\n' +
            '• **Round 3**: Counts UP to $30,000\n' +
            '• **Round 4**: Counts DOWN from $40,000\n' +
            '• **Round 5**: Counts UP to $50,000 (Both greediest AND most cautious get $0!)',
          inline: false
        },
        {
          name: '💰 Strategy Tips',
          value: 
            '• Lock in early = safe but small amount\n' +
            '• Lock in late = risk being greediest\n' +
            '• Watch opponents\' patterns and psychology\n' +
            '• Round 5: Avoid being too greedy OR too cautious\n' +
            '• Face-off: Top 2 players compete for combined pot',
          inline: false
        },
        {
          name: '🏆 Face-Off Phase',
          value: 
            '```\n' +
            'After Round 5, top 2 players advance!\n' +
            'Clock counts UP from $0\n' +
            'First to click STOP wins that amount\n' +
            'Loser gets nothing\n' +
            '```',
          inline: false
        }
      )
      .setColor('#FF6B35')
      .setFooter({ text: 'How much is enough? Timing & psychology win! 🕐' });
    
    await interaction.editReply({ embeds: [hmieEmbed] });
    
  } else if (gameChoice === 'mount_cashmore') {
    const mountEmbed = new EmbedBuilder()
      .setTitle('🏔️ Mount Ca$hmore')
      .setDescription(
        '**Climb the mountain of cash through 9 challenging levels!**\n\n' +
        'Each level has hidden squares. Find the CLEAR square to advance, but avoid skulls and traps!'
      )
      .addFields(
        {
          name: '🎮 How to Play',
          value: 
            '1️⃣ Use `/mount-cashmore` to start\n' +
            '2️⃣ Each level has squares (Level 1: 10, Level 2: 9... Level 9: 2)\n' +
            '3️⃣ Pick squares to reveal their contents\n' +
            '4️⃣ Find the ✅ **CLEAR** square to advance to next level\n' +
            '5️⃣ Reach Level 9 summit to win the **$200,000,000 jackpot**!',
          inline: false
        },
        {
          name: '💀 Lives & Game Over',
          value: 
            '• You start with **3 lives** (hearts)\n' +
            '• Hit a 💀 **SKULL** = lose 1 life\n' +
            '• Lose all 3 lives = Game Over (you keep a percentage)\n' +
            '• ⚰️ **FATAL TRAP** = instant game over, lose everything',
          inline: false
        },
        {
          name: '🎁 Special Squares',
          value: 
            '💵 **Cash** - Earn money instantly\n' +
            '🔍 **Skull Seeker** - Guess skull location for $100K+\n' +
            '💥 **Ca$h Crash** - Lose all your money\n' +
            '🎰 **Gambler\'s Luck** - Pick a mystery panel\n' +
            '🧪 **Decimalizer** - Coin flip to multiply/divide\n' +
            '🤝 **Host\'s Deal** - Cash out offer',
          inline: false
        },
        {
          name: '⚡ Level 9 Decision (NEW!)',
          value: 
            'After clearing Level 8, you must choose:\n\n' +
            '🎪 **Use Zipline** - Game Over keeps your money\n' +
            '⚠️ **Climb by Hand** - Win = **x10 jackpot** ($2B!), Lose = nothing\n' +
            '🚶 **Walk Away** - Cash out with your winnings',
          inline: false
        },
        {
          name: '🏦 Big Bank Mode',
          value: 
            'Play for 50% of the Big Bank instead of $200M!\n',
          inline: false
        }
      )
      .setColor('#4169E1')
      .setFooter({ text: 'Can you reach the summit? 🏔️' });
    
    await interaction.editReply({ embeds: [mountEmbed] });
    
  } else if (gameChoice === 'oneegg') {
    const oneEmbed = GameUI.createOneEggHelpEmbed();
    await interaction.editReply({ embeds: [oneEmbed] });
    return;
    
  } else if (gameChoice === 'tower') {
    const hasAdminRole = isAdmin(interaction.member);
    const remainingPlays = hasAdminRole ? '∞ (Admin)' : await db.getRemainingPlays(interaction.user.id, interaction.guildId);
    const eventMode = await db.getEventMode(interaction.guildId);
    const embed = GameUI.createWelcomeEmbed(remainingPlays, eventMode);
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleConfigCommand(interaction) {
  await interaction.reply({
    content: '⚙️ Game configuration can be edited in the `config.json` file.\n\nYou can modify:\n• Game amounts and rewards\n• Max plays per day\n• Floor counts per round\n\n**Admin Commands:**\n• `/grantplay` - Grant bonus plays to users\n• `/grant-mount-cashmore` - Grant Mount Ca$hmore plays to users\n• `/stopgame` - Force stop games (Tower/RTAB/HMIE) in current channel or all channels',
    flags: 64
  });
}

async function handleIntroCommand(interaction) {
  await interaction.deferReply();

  const gameChoice = interaction.options.getString('game') || 'tower';

  if (gameChoice === 'hmie') {
    // HMIE Introduction
    const hmieIntroEmbed = new EmbedBuilder()
      .setTitle('🕐 HOW MUCH IS ENOUGH?')
      .setDescription(
        '**The ultimate test of timing, greed, and psychology!**\n\n' +
        'Welcome to **How Much Is Enough?** - a multiplayer money clock game where you must decide when to lock in your winnings.\n\n' +
        '⏱️ Watch the money clock count up and down each round\n' +
        '⚠️ But be warned: The **greediest player gets NOTHING**!\n' +
        '🎯 The question is: **How much is enough for you?**'
      )
      .addFields(
        {
          name: '🎮 Game Flow',
          value: 
            '**5 Rounds of Money Clock:**\n' +
            '• Round 1: Clock counts UP to $10,000\n' +
            '• Round 2: Clock counts DOWN from $20,000\n' +
            '• Round 3: Clock counts UP to $30,000\n' +
            '• Round 4: Clock counts DOWN from $40,000\n' +
            '• Round 5: Clock counts UP to $50,000 (Special rules!)',
          inline: false
        },
        {
          name: '💎 The Strategy',
          value: 
            '• **Lock in early**: Safe but small amounts\n' +
            '• **Lock in late**: Risk being the greediest\n' +
            '• **Greediest player** (highest lock): Gets $0!\n' +
            '• **Round 5 twist**: Both greediest AND most cautious get $0\n' +
            '• Watch your opponents\' patterns and psychology',
          inline: false
        },
        {
          name: '⚠️ The Penalty',
          value: 
            '**Normal Rounds**: Greediest player gets nothing, everyone else banks their locked amount\n' +
            '**Round 5**: BOTH the greediest AND most cautious players get nothing!\n\n' +
            'After Round 5, bottom players are eliminated.',
          inline: false
        },
        {
          name: '🏆 Face-Off Phase',
          value: 
            'Top 2 players advance to compete for the combined pot!\n\n' +
            '• Clock counts UP from $0\n' +
            '• First player to click **STOP** wins that amount\n' +
            '• Loser gets nothing\n' +
            '• Ultimate test of nerves and timing!',
          inline: false
        },
        {
          name: '🧠 Psychology Matters',
          value: 
            'This isn\'t about luck - it\'s about reading your opponents. Will you play it safe? Will you risk being greedy? ' +
            'Can you predict when others will lock in? **The money clock waits for no one.**',
          inline: false
        }
      )
      .setColor('#FF6B35')
      .setFooter({ text: 'Use /play game:hmie to start a lobby! 🕐 | Timing & Greed' })
      .setTimestamp();

    await interaction.editReply({ embeds: [hmieIntroEmbed] });
    
  } else if (gameChoice === 'mount_cashmore') {
    // Mount Cashmore Introduction
    const mountIntroEmbed = new EmbedBuilder()
      .setTitle('🏔️ MOUNT CA$HMORE')
      .setDescription(
        '**Climb the legendary mountain of riches!**\n\n' +
        'Welcome to **Mount Ca$hmore** - a 9-level pyramid adventure where fortune favors the bold!\n\n' +
        '🎯 Navigate through hidden squares, collect cash, and avoid deadly traps\n' +
        '💰 Reach the summit to claim the **$200,000,000 JACKPOT**\n' +
        '⚡ New Level 9 Decision: Risk it all for **x10 JACKPOT** ($2 BILLION!)'
      )
      .addFields(
        {
          name: '🗻 The Climb',
          value: 
            '**9 Levels of increasing difficulty:**\n' +
            '• Level 1: 10 squares\n' +
            '• Level 2: 9 squares\n' +
            '• ...\n' +
            '• Level 9: 2 squares (CLEAR or GAME OVER)\n\n' +
            'Find the ✅ **CLEAR** square on each level to advance!',
          inline: false
        },
        {
          name: '❤️ Lives System',
          value: 
            'You have **3 lives** (hearts). Hit a 💀 **SKULL** to lose one.\n' +
            'Lose all 3 = Game Over (but you keep a percentage based on your level)',
          inline: false
        },
        {
          name: '🎁 Special Squares',
          value: 
            '💵 **Cash** - Instant money\n' +
            '🔍 **Skull Seeker** - Guess skull location for jackpot\n' +
            '💥 **Ca$h Crash** - Lose all money\n' +
            '⚰️ **Fatal Trap** - Instant game over\n' +
            '🎰 **Gambler\'s Luck** - Mystery panels\n' +
            '🧪 **Decimalizer** - Coin flip multiply/divide\n' +
            '🤝 **Host\'s Deal** - Cash out offer\n' +
            '❄️ **Snow Storm**: A blizzard — escape with half your money (remaining goes to the Big Bank)',
          inline: false
        },
        {
          name: '⚡ THE FINAL ASCENT (Level 9)',
          value: 
            'After clearing Level 8, choose your destiny:\n\n' +
            '🎪 **Use Zipline** - Keep money if you lose\n' +
            '⚠️ **Climb by Hand** - Win = **x10 JACKPOT**, Lose = Nothing\n' +
            '🚶 **Walk Away** - Cash out safely\n',
          inline: false
        },
        {
          name: '🏦 Big Bank Mode',
          value: 
            'Use `/mount-cashmore bigbank:true` to play for **50% of the Big Bank** instead!',
          inline: false
        }
      )
      .setColor('#4169E1')
      .setFooter({ text: 'Use /mount-cashmore to start climbing! 🏔️ | Winnings count toward Tower of Cash high score' })
      .setTimestamp();

    await interaction.editReply({ embeds: [mountIntroEmbed] });
    
  } else if (gameChoice === 'oneegg') {
    const oneIntro = GameUI.createOneEggIntroEmbed();
    await interaction.editReply({ embeds: [oneIntro] });

  } else {
    // Tower of Cash Introduction (existing)
    const eventMode = await db.getEventMode(interaction.guildId);
    const embed = eventMode ? GameUI.createSeason1IntroEmbed() : GameUI.createIntroEmbed();
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleModifyScoreCommand(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  try {
    await db.modifyHighScore(targetUser.id, interaction.guildId, amount);

    // Get new stats to show confirmation
    const stats = await db.getPlayerStats(targetUser.id, interaction.guildId);
    const newScore = stats ? stats.highest_score : 0;

    const action = amount >= 0 ? 'Added' : 'Removed';
    const emoji = amount >= 0 ? '📈' : '📉';

    await interaction.editReply({
      content: `${emoji} **High Score Modified**\n\n` +
        `Successfully ${action.toLowerCase()} **$${GameUI.formatMoney(Math.abs(amount))}** to ${targetUser.tag}'s high score.\n` +
        `**New High Score:** $${GameUI.formatMoney(newScore)}`
    });
  } catch (error) {
    console.error('Error modifying score:', error);
    await interaction.editReply({
      content: '❌ Failed to modify high score. Please try again.'
    });
  }
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

async function handleGrantMountCashmoreCommand(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  try {
    // Initialize Mount Cashmore play tracker if needed
    if (!global.mountCashmorePlayTracker) {
      global.mountCashmorePlayTracker = new Map();
    }

    const today = new Date().toISOString().split('T')[0];
    const playKey = `mount_cashmore_${targetUser.id}_${interaction.guildId}_${today}`;
    
    // Play tracking is now additive (limit increases), so we don't need to reset the used count.

    // Store granted plays in a separate tracker
    if (!global.mountCashmoreGrantedPlays) {
      global.mountCashmoreGrantedPlays = new Map();
    }
    
    const grantKey = `${targetUser.id}_${interaction.guildId}_${today}`;
    const currentGranted = global.mountCashmoreGrantedPlays.get(grantKey) || 0;
    global.mountCashmoreGrantedPlays.set(grantKey, currentGranted + amount);

    await interaction.editReply({
      content: `✅ Successfully granted **${amount}** Mount Ca$hmore play${amount > 1 ? 's' : ''} to ${targetUser.tag}!\n\n🗻 They can now play Mount Ca$hmore **${amount}** additional time${amount > 1 ? 's' : ''} today.`
    });

    // Try to DM the user
    try {
      await targetUser.send(`🎁 You've been granted **${amount}** Mount Ca$hmore play${amount > 1 ? 's' : ''} by an admin!\n\n🗻 Use \`/mount-cashmore\` to climb the pyramid. Good luck! 🎮`);
    } catch (err) {
      // User has DMs disabled, that's okay
    }
  } catch (error) {
    console.error('Error granting Mount Cashmore plays:', error);
    await interaction.editReply({
      content: '❌ Failed to grant Mount Ca$hmore plays. Please try again.'
    });
  }
}

async function handleGiveawayCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'start') {
    await handleGiveawayStart(interaction);
  } else if (subcommand === 'end') {
    await handleGiveawayEnd(interaction);
  } else if (subcommand === 'cancel') {
    await handleGiveawayCancel(interaction);
  }
}

async function handleGiveawayStart(interaction) {
  await interaction.deferReply();
  
  const channelId = interaction.channelId;
  
  // Check if there's already an active giveaway
  if (giveaways.has(channelId)) {
    return interaction.editReply({
      content: '❌ There is already an active giveaway in this channel! Use `/giveaway end` to finish it first.'
    });
  }
  
  const prize = interaction.options.getString('prize');
  const numWinners = interaction.options.getInteger('winners');
  const duration = interaction.options.getInteger('duration') || 10; // Default 10 minutes
  
  // Create giveaway embed
  const endTime = Date.now() + (duration * 60 * 1000);
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription(
      `**Prize:** ${prize}\n\n` +
      `**Winners:** ${numWinners}\n` +
      `**Participants:** 0\n\n` +
      `Click the button below to enter!\n` +
      `Ends <t:${Math.floor(endTime / 1000)}:R>`
    )
    .setFooter({ text: `Hosted by ${interaction.user.tag}` })
    .setTimestamp(endTime);
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_join')
        .setLabel('Enter Giveaway')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉')
    );
  
  const message = await interaction.editReply({
    content: '🎊 **A giveaway has started!** 🎊',
    embeds: [embed],
    components: [row]
  });
  
  // Store giveaway data
  const timeout = setTimeout(async () => {
    await autoEndGiveaway(channelId);
  }, duration * 60 * 1000);
  
  giveaways.set(channelId, {
    prize,
    numWinners,
    participants: [],
    messageId: message.id,
    endTime,
    timeout,
    hostId: interaction.user.id
  });
}

async function handleGiveawayEnd(interaction) {
  await interaction.deferReply();
  
  const channelId = interaction.channelId;
  const giveaway = giveaways.get(channelId);
  
  if (!giveaway) {
    return interaction.editReply({
      content: '❌ There is no active giveaway in this channel!'
    });
  }
  
  await endGiveaway(channelId, interaction);
}

async function handleGiveawayCancel(interaction) {
  await interaction.deferReply();
  
  const channelId = interaction.channelId;
  const giveaway = giveaways.get(channelId);
  
  if (!giveaway) {
    return interaction.editReply({
      content: '❌ There is no active giveaway in this channel!'
    });
  }
  
  // Clear timeout
  if (giveaway.timeout) {
    clearTimeout(giveaway.timeout);
  }
  
  // Update message
  try {
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    
    const cancelEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚫 GIVEAWAY CANCELLED 🚫')
      .setDescription(`**Prize:** ${giveaway.prize}\n\nThis giveaway has been cancelled by an administrator.`)
      .setTimestamp();
    
    await message.edit({
      embeds: [cancelEmbed],
      components: []
    });
  } catch (error) {
    console.error('Error updating cancelled giveaway message:', error);
  }
  
  giveaways.delete(channelId);
  
  await interaction.editReply({
    content: '✅ Giveaway has been cancelled.'
  });
}

async function autoEndGiveaway(channelId) {
  const giveaway = giveaways.get(channelId);
  if (!giveaway) return;
  
  await endGiveaway(channelId, null);
}

async function endGiveaway(channelId, interaction) {
  const giveaway = giveaways.get(channelId);
  if (!giveaway) return;
  
  // Clear timeout
  if (giveaway.timeout) {
    clearTimeout(giveaway.timeout);
  }
  
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('Channel not found for giveaway');
      giveaways.delete(channelId);
      return;
    }
    
    const message = await channel.messages.fetch(giveaway.messageId);
    if (!message) {
      console.error('Giveaway message not found');
      giveaways.delete(channelId);
      return;
    }
  
    // Check if there are enough participants
    if (!giveaway.participants || giveaway.participants.length === 0) {
    const noParticipantsEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🎉 GIVEAWAY ENDED 🎉')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n\n` +
        `**Result:** No one entered the giveaway! 😢`
      )
      .setTimestamp();
    
    await message.edit({
      embeds: [noParticipantsEmbed],
      components: []
    });
    
    giveaways.delete(channelId);
    
    if (interaction) {
      await interaction.editReply({
        content: '✅ Giveaway ended - No participants.'
      });
    }
    return;
  }
  
  // Select random winners
  const winners = [];
  const participantsCopy = [...giveaway.participants];
  const actualWinners = Math.min(giveaway.numWinners, participantsCopy.length);
  
  for (let i = 0; i < actualWinners; i++) {
    const randomIndex = Math.floor(Math.random() * participantsCopy.length);
    winners.push(participantsCopy[randomIndex]);
    participantsCopy.splice(randomIndex, 1);
  }
  
  // Create winner announcement
  const winnerMentions = winners.map(userId => `<@${userId}>`).join(', ');
  
  const winnerEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🎉 GIVEAWAY ENDED 🎉')
    .setDescription(
      `**Prize:** ${giveaway.prize}\n\n` +
      `**${winners.length > 1 ? 'Winners' : 'Winner'}:** ${winnerMentions}\n\n` +
      `**Total Participants:** ${giveaway.participants.length}\n\n` +
      `Congratulations! 🎊`
    )
    .setTimestamp();
  
  await message.edit({
    embeds: [winnerEmbed],
    components: []
  });
  
  // Send winner announcement
  await channel.send({
    content: `🎊 Congratulations ${winnerMentions}! You won **${giveaway.prize}**! 🎊`
  });
  
  giveaways.delete(channelId);
  
  if (interaction) {
    await interaction.editReply({
      content: `✅ Giveaway ended! ${winners.length} winner(s) selected.`
    });
  }
  } catch (error) {
    console.error('Error ending giveaway:', error);
    giveaways.delete(channelId);
    if (interaction) {
      await interaction.editReply({
        content: '❌ An error occurred while ending the giveaway.'
      }).catch(console.error);
    }
  }
}

async function handleGiveawayJoin(interaction) {
  const channelId = interaction.channelId;
  const giveaway = giveaways.get(channelId);
  
  if (!giveaway) {
    return interaction.reply({
      content: '❌ This giveaway is no longer active!',
      ephemeral: true
    });
  }
  
  const userId = interaction.user.id;
  
  // Check if already entered
  if (giveaway.participants.includes(userId)) {
    return interaction.reply({
      content: '❌ You are already entered in this giveaway!',
      ephemeral: true
    });
  }
  
  // Add participant
  giveaway.participants.push(userId);
  
  // Update the embed
  try {
    const message = await interaction.message;
    const embed = message?.embeds?.[0];
    
    if (!embed) {
      console.error('Giveaway embed not found');
      return interaction.reply({
        content: '✅ You have successfully entered the giveaway! Good luck! 🍀',
        ephemeral: true
      });
    }
    
    const updatedEmbed = EmbedBuilder.from(embed)
      .setDescription(
        `**Prize:** ${giveaway.prize}\n\n` +
        `**Winners:** ${giveaway.numWinners}\n` +
        `**Participants:** ${giveaway.participants.length}\n\n` +
        `Click the button below to enter!\n` +
        `Ends <t:${Math.floor(giveaway.endTime / 1000)}:R>`
      );
    
    await message.edit({ embeds: [updatedEmbed] });
  } catch (error) {
    console.error('Error updating giveaway embed:', error);
  }
  
  await interaction.reply({
    content: '✅ You have successfully entered the giveaway! Good luck! 🍀',
    ephemeral: true
  });
}

async function handleStopGameCommand(interaction) {
  const target = interaction.options.getString('target');
  const gameType = interaction.options.getString('gametype') || 'all';

  try {
    if (target === 'channel') {
      // Stop game(s) in current channel
      const channelId = interaction.channelId;
      let stoppedGames = [];

      // Check Tower of Cash game
      if (gameType === 'all' || gameType === 'tower') {
        const towerGame = gameManager.getGame(channelId);
        if (towerGame) {
          const username = towerGame.username;
          gameManager.endGame(channelId);
          stoppedGames.push(`Tower of Cash (${username})`);
        }
      }

      // Check RTAB game
      if (gameType === 'all' || gameType === 'rtab') {
        const rtabLobby = rtabLobbies.get(channelId);
        const rtabGame = rtabGames.get(channelId);
        
        if (rtabLobby) {
          rtabLobbies.delete(channelId);
          stoppedGames.push('RTAB Lobby');
        }
        
        if (rtabGame) {
          const playerNames = rtabGame.players.map(p => p.username).join(', ');
          rtabGames.delete(channelId);
          stoppedGames.push(`RTAB Game (${playerNames})`);
        }
      }

      // Check Minigame Master session
      if (gameType === 'all' || gameType === 'mgm' || gameType === 'minigamemaster') {
        const mgmSession = minigameMasterSessions.get(channelId);
        if (mgmSession) {
          minigameMasterSessions.delete(channelId);
          stoppedGames.push(`Minigame Master (${mgmSession.host.username})`);
        }
      }

      // Check HMIE game
      if (gameType === 'all' || gameType === 'hmie') {
        const hmieGame = gameManager.getGame(channelId);
        if (hmieGame && hmieGame.hmieState) {
          const username = hmieGame.username;
          if (hmieGame.hmieState.autoStopTimeout) {
            clearTimeout(hmieGame.hmieState.autoStopTimeout);
          }
          gameManager.endGame(channelId);
          stoppedGames.push(`HMIE (${username})`);
        }
      }

      // Check Mount Ca$hmore game
      if (gameType === 'all' || gameType === 'mountcashmore') {
        const mountGame = mountCashmoreGames.get(channelId);
        if (mountGame) {
          const username = mountGame.username;
          mountCashmoreGames.delete(channelId);
          stoppedGames.push(`Mount Ca$hmore (${username})`);
        }
      }

      // Check One Egg game
      if (gameType === 'all' || gameType === 'oneegg') {
        const oneEggGame = oneEggGames.get(channelId);
        if (oneEggGame) {
          oneEggGames.delete(channelId);
          stoppedGames.push(`One Egg`);
        }
      }

      if (stoppedGames.length === 0) {
        return interaction.reply({
          content: `❌ No active ${gameType === 'all' ? '' : gameType.toUpperCase() + ' '}game${gameType === 'all' ? 's' : ''} in this channel.`,
          flags: 64
        });
      }

      await interaction.reply({
        content: `🛑 **Game${stoppedGames.length > 1 ? 's' : ''} Stopped**\n\n${stoppedGames.map(g => `• ${g}`).join('\n')}\n\nForce stopped by an admin.`
      });

    } else if (target === 'all') {
      // Stop all games
      let stoppedCount = { tower: 0, rtab: 0, hmie: 0, mountcashmore: 0, oneegg: 0 };
      let channelsToNotify = [];

      // Stop Tower of Cash games
      if (gameType === 'all' || gameType === 'tower') {
        for (const [channelId, game] of gameManager.activeGames.entries()) {
          if (!game.hmieState) { // Regular tower games
            channelsToNotify.push({ channelId, type: 'tower' });
            stoppedCount.tower++;
          }
        }
        if (gameType === 'tower') {
          // Only clear tower games
          for (const [channelId, game] of gameManager.activeGames.entries()) {
            if (!game.hmieState) {
              gameManager.endGame(channelId);
            }
          }
        }
      }

      // Stop RTAB games
      if (gameType === 'all' || gameType === 'rtab') {
        stoppedCount.rtab = rtabLobbies.size + rtabGames.size;
        for (const channelId of rtabLobbies.keys()) {
          channelsToNotify.push({ channelId, type: 'rtab' });
        }
        for (const channelId of rtabGames.keys()) {
          if (!channelsToNotify.find(c => c.channelId === channelId)) {
            channelsToNotify.push({ channelId, type: 'rtab' });
          }
        }
        rtabLobbies.clear();
        rtabGames.clear();
      }

      // Stop Minigame Master sessions
      if (gameType === 'all' || gameType === 'mgm' || gameType === 'minigamemaster') {
        stoppedCount.mgm = minigameMasterSessions.size;
        minigameMasterSessions.clear();
      }

      // Stop HMIE games
      if (gameType === 'all' || gameType === 'hmie') {
        for (const [channelId, game] of gameManager.activeGames.entries()) {
          if (game.hmieState) {
            if (game.hmieState.autoStopTimeout) {
              clearTimeout(game.hmieState.autoStopTimeout);
            }
            channelsToNotify.push({ channelId, type: 'hmie' });
            stoppedCount.hmie++;
          }
        }
        if (gameType === 'hmie') {
          // Only clear HMIE games
          for (const [channelId, game] of gameManager.activeGames.entries()) {
            if (game.hmieState) {
              gameManager.endGame(channelId);
            }
          }
        }
      }

      // Stop Mount Ca$hmore games
      if (gameType === 'all' || gameType === 'mountcashmore') {
        stoppedCount.mountcashmore = mountCashmoreGames.size;
        for (const channelId of mountCashmoreGames.keys()) {
          channelsToNotify.push({ channelId, type: 'mountcashmore' });
        }
        mountCashmoreGames.clear();
      }

      // Stop One Egg games
      if (gameType === 'all' || gameType === 'oneegg') {
        stoppedCount.oneegg = oneEggGames.size;
        for (const channelId of oneEggGames.keys()) {
          channelsToNotify.push({ channelId, type: 'oneegg' });
        }
        oneEggGames.clear();
      }

      // Clear all games if type is 'all'
      if (gameType === 'all') {
        gameManager.activeGames.clear();
      }

      const totalStopped = (stoppedCount.tower || 0) + (stoppedCount.hmie || 0) + (stoppedCount.mountcashmore || 0) + (stoppedCount.oneegg || 0);

      if (totalStopped === 0) {
        return interaction.reply({
          content: `❌ No active ${gameType === 'all' ? '' : gameType.toUpperCase() + ' '}games to stop.`,
          flags: 64
        });
      }

      let summary = [];
      if (stoppedCount.tower > 0) summary.push(`**${stoppedCount.tower}** Tower of Cash`);
      if (stoppedCount.hmie > 0) summary.push(`**${stoppedCount.hmie}** HMIE`);
      if (stoppedCount.mountcashmore > 0) summary.push(`**${stoppedCount.mountcashmore}** Mount Ca$hmore`);
      if (stoppedCount.oneegg > 0) summary.push(`**${stoppedCount.oneegg}** One Egg`);

      await interaction.reply({
        content: `🛑 **All Games Stopped**\n\n${summary.join(', ')} game${totalStopped > 1 ? 's have' : ' has'} been force stopped by an admin.`
      });

      // Notify in each channel
      for (const { channelId, type } of channelsToNotify) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel) {
            await channel.send(`🛑 The ${type.toUpperCase()} game in this channel has been stopped by an admin.`);
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

  // Giveaway button
  if (interaction.customId === 'giveaway_join') {
    return handleGiveawayJoin(interaction);
  }

  // Lobby buttons and banker DM buttons don't require an active game in the current channel
  const lobbyButtons = [
    'hmie_join', 'hmie_leave', 'hmie_start_now', 'hmie_faceoff_stop',
    'rtab_join', 'rtab_leave', 'rtab_start',
    's2_mgm_join', 's2_mgm_leave', 's2_mgm_start', 's2_mgm_standings'
  ];
  const isLobbyButton = lobbyButtons.includes(interaction.customId);
  const isRTABAction = interaction.customId.startsWith('rtab_');
  const isMGMAction = interaction.customId.startsWith('s2_mgm_');
  const isBankerDMButton = interaction.customId.startsWith('dond_banker_accept_') || interaction.customId.startsWith('dond_banker_reject_');
  const isMountCashmoreButton = interaction.customId.startsWith('mount_cashmore_');
  const isOneEggButton = interaction.customId.startsWith('one_egg_');
  const isNewYearGiftButton = interaction.customId === 'new_year_gift_claim' || interaction.customId === 'gift_list_prev' || interaction.customId === 'gift_list_next';

  const game = gameManager.getGame(interaction.channelId);
  const rtabGame = rtabGames.get(interaction.channelId);
  const rtabLobby = rtabLobbies.get(interaction.channelId);
  const mgmSession = minigameMasterSessions.get(interaction.channelId);
  const mountCashmoreGame = mountCashmoreGames.get(interaction.channelId);
  const oneEggGame = oneEggGames.get(interaction.channelId);

  if (!game && !rtabGame && !rtabLobby && !mgmSession && !mountCashmoreGame && !oneEggGame && !isLobbyButton && !isBankerDMButton && !isRTABAction && !isMGMAction && !isMountCashmoreButton && !isOneEggButton && !isNewYearGiftButton) {
    return safeInteractionResponse(interaction, 'reply', { content: '❌ No active game found!', ephemeral: true });
  }

  // Handle One Egg Buttons
  if (isOneEggButton) {
      if (interaction.customId === 'one_egg_cancel') {
           // Allow cancel
      } else if (oneEggGame && !['one_egg_join_'].some(s => interaction.customId.startsWith(s)) && oneEggGame.type !== 'LOBBY') {
           // Basic ownership check inside handler or here?
           // Handler does strict checking. Let's pass through.
      }
      return handleOneEggInteraction(interaction);
  }

  // Check if it's the banker making an offer
  if (interaction.customId === 'dond_banker_offer') {
    if (game && game.dondState && game.dondState.bankerId && game.dondState.bankerId !== interaction.user.id) {
      return safeInteractionResponse(interaction, 'reply', { content: '❌ You are not the Banker for this game!', ephemeral: true });
    }
    // If it is the banker (or auto banker but user clicked? shouldn't happen), proceed
  } else if (!isLobbyButton && !isRTABAction && !isMGMAction && !interaction.customId.startsWith('hmie_') && !isMountCashmoreButton && game && game.userId !== interaction.user.id) {
    // Skip ownership check for lobby buttons, RTAB, MGM, HMIE buttons (multiplayer game), and Mount Ca$hmore buttons
    return safeInteractionResponse(interaction, 'reply', { content: '❌ This is not your game!', ephemeral: true });
  } else if (isMountCashmoreButton && mountCashmoreGame && mountCashmoreGame.userId !== interaction.user.id) {
    // Check ownership for Mount Ca$hmore games
    return safeInteractionResponse(interaction, 'reply', { content: '❌ This is not your game!', ephemeral: true });
  }

  try {
    const customId = interaction.customId;

    if (customId === 'new_year_gift_claim') {
      await handleNewYearGiftClaim(interaction);
    } else if (customId === 'gift_list_prev' || customId === 'gift_list_next') {
      // Extract current page from message or use stored state
      const currentPage = customId === 'gift_list_prev' 
        ? Math.max(0, (interaction.message.embeds[0]?.title?.includes('Part 2') ? 2 : interaction.message.embeds[0]?.title?.includes('Part 1') ? 1 : 0) - 1)
        : Math.min(2, (interaction.message.embeds[0]?.title?.includes('Part 2') ? 2 : interaction.message.embeds[0]?.title?.includes('Part 1') ? 1 : 0) + 1);
      
      const embed = GameUI.createNewYearGiftListEmbed(currentPage);
      const buttons = GameUI.createNewYearGiftListButtons(currentPage);
      
      await interaction.update({ embeds: [embed], components: buttons });
    } else if (customId.startsWith('floor_') && !customId.startsWith('floor_page_')) {
      await handleFloorSelection(interaction, game);
    } else if (customId === 'floor_page_prev') {
      // Go to previous page
      game.floorSelectionPage = Math.max(0, (game.floorSelectionPage || 0) - 1);
      const embed = GameUI.createFloorSelectionEmbed(game);
      const buttons = GameUI.createFloorSelectionButtons(game);
      await safeInteractionResponse(interaction, 'update', { embeds: [embed], components: buttons });
    } else if (customId === 'floor_page_next') {
      // Go to next page
      const maxPages = Math.ceil((game.eventMode ? 28 : 21) / 14);
      game.floorSelectionPage = Math.min(maxPages - 1, (game.floorSelectionPage || 0) + 1);
      const embed = GameUI.createFloorSelectionEmbed(game);
      const buttons = GameUI.createFloorSelectionButtons(game);
      await safeInteractionResponse(interaction, 'update', { embeds: [embed], components: buttons });
    } else if (customId === 'confirm_floors') {
      await handleConfirmFloors(interaction, game);
    } else if (customId === 'use_peek') {
      await handlePeekClick(interaction, game);
    } else if (customId === 'choice_left' || customId === 'choice_right') {
      await handleSideChoice(interaction, game, customId === 'choice_left' ? 'left' : 'right');
    } else if (customId === 'continue_game') {
      await handleContinue(interaction, game);
    } else if (customId === 'continue_to_next_round') {
      await handleContinueToNextRound(interaction, game);
    } else if (customId === 'commercial_continue') {
      // Handled by awaitMessageComponent in handleSideChoice
      // This case shouldn't be reached, but keep for safety
      await safeInteractionResponse(interaction, 'update', { content: '✅ Commercial watched!', embeds: [], components: [] });
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
    } else if (customId.startsWith('gobig_space_')) {
      const spaceIndex = parseInt(customId.split('_')[2]);
      await handleGoBigOrGoBrokeSpace(interaction, game, spaceIndex);
    } else if (customId === 'mart_rob') {
      await handleMartRob(interaction, game);
    } else if (customId === 'mart_buy') {
      await handleMartBuy(interaction, game);
    } else if (customId === 'mart_leave') {
      await handleMartLeave(interaction, game);
    } else if (customId.startsWith('mart_rob_space_')) {
      const spaceIndex = parseInt(customId.split('_')[3]);
      await handleMartRobSpace(interaction, game, spaceIndex);
    } else if (customId === 'mart_buy_peek') {
      await handleMartPurchase(interaction, game, 'peek');
    } else if (customId === 'mart_buy_minigame') {
      await handleMartPurchase(interaction, game, 'minigame');
    } else if (customId === 'mart_buy_mysterybox') {
      await handleMartPurchase(interaction, game, 'mysteryBox');
    } else if (customId === 'mart_buy_xprotection') {
      await handleMartPurchase(interaction, game, 'xProtection');
    } else if (customId === 'mart_buy_randompercent') {
      await handleMartPurchase(interaction, game, 'randomPercentage');
    } else if (customId === 'mart_buy_what') {
      await handleMartPurchase(interaction, game, 'what');
    } else if (customId === 'mart_buy_nothing') {
      await handleMartPurchase(interaction, game, 'nothing');
    } else if (customId === 'mart_buy_sixzeroes') {
      await handleMartPurchase(interaction, game, 'sixZeroes');
    } else if (customId === 'mart_buy_sanghaofferings') {
      await handleMartPurchase(interaction, game, 'sanghaOfferings');
    } else if (customId === 'mart_done_shopping') {
      await handleMartDoneShopping(interaction, game);
    } else if (customId.startsWith('sixzeroes_pick_')) {
      const index = parseInt(customId.split('_')[2]);
      await handleSixZeroesPick(interaction, game, index);
    } else if (customId === 'door_escape_start') {
      await handleDoorEscapeStart(interaction, game);
    } else if (customId === 'door_escape_1') {
      await handleDoorEscapeChoice(interaction, game, 0);
    } else if (customId === 'door_escape_2') {
      await handleDoorEscapeChoice(interaction, game, 1);
    } else if (customId === 'door_escape_3') {
      await handleDoorEscapeChoice(interaction, game, 2);
    } else if (customId === 'door_escape_cashout') {
      await handleDoorEscapeCashout(interaction, game);
    } else if (customId.startsWith('door_escape_final_')) {
      const choice = parseInt(customId.split('_')[3]) - 1;
      await handleDoorEscapeFinalChoice(interaction, game, choice);
    } else if (customId.startsWith('door_escape_final_')) {
      const choice = parseInt(customId.split('_')[3]) - 1;
      await handleDoorEscapeFinalChoice(interaction, game, choice);
    } else if (customId === 'basement_negotiate') {
      await handleBasementNegotiateClick(interaction, game);
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
    } else if (customId === 'crossroads_take30k') {
      await handleCrossroadsTake30k(interaction, game);
    } else if (customId === 'crossroads_lobby') {
      await handleCrossroadsLobby(interaction, game);
    } else if (customId.startsWith('mystery_box_')) {
      const boxIndex = parseInt(customId.split('_')[2]) - 1; // Convert 1-4 to 0-3
      await handleMysteryBoxSelection(interaction, game, boxIndex);
    } else if (customId.startsWith('community_chest_pick_')) {
      const chestIndex = parseInt(customId.split('_')[3]);
      const result = game.playCommunityChestPick(chestIndex);
      if (result) {
        if (result.won) {
          const resultEmbed = GameUI.createCommunityChestResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          
          AchievementHelper.trackCommunityChest(game, result.finalAmount);
          await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

          await continueGameAfterMinigame(interaction, game);
        } else if (result.lost) {
          const resultEmbed = GameUI.createCommunityChestResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          
          AchievementHelper.trackCommunityChest(game, 0);
          await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createCommunityChestPickEmbed(game, result);
          const buttons = GameUI.createCommunityChestButtons(game, true);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId === 'community_chest_risk') {
      const buttons = GameUI.createCommunityChestButtons(game, false);
      await interaction.update({ content: '🎰 **Pick another chest!**', components: buttons });
    } else if (customId === 'community_chest_stop') {
      const result = game.communityChestStop();
      const resultEmbed = GameUI.createCommunityChestResultEmbed(game, result);
      await interaction.update({ embeds: [resultEmbed], components: [] });
      
      AchievementHelper.trackCommunityChest(game, result.finalAmount);
      await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

      await continueGameAfterMinigame(interaction, game);
    } else if (customId.startsWith('park_it_car_')) {
      const carIndex = parseInt(customId.split('_')[3]);
      const result = game.parkItPickCar(carIndex);
      if (result) {
        if (result.gameOver) {
          const embed = GameUI.createParkItCarRevealEmbed(game, result);
          const resultEmbed = GameUI.createParkItResultEmbed(game, { ...result, noMoves: true });
          await interaction.update({ embeds: [embed, resultEmbed], components: [] });
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createParkItCarRevealEmbed(game, result);
          const buttons = GameUI.createParkItButtons(game);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId.startsWith('park_it_level_')) {
      const level = parseInt(customId.split('_')[3]);
      const result = game.parkItPlaceCar(level);
      if (result) {
        if (result.illegal || result.won) {
          const resultEmbed = GameUI.createParkItResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Continue game after both win and loss
          await continueGameAfterMinigame(interaction, game);
        } else {
          game.parkItState.currentCarValue = 0;
          const embed = GameUI.createParkItGarageEmbed(game);
          const buttons = GameUI.createParkItButtons(game);
          await interaction.update({ content: '✅ **Car parked! Pick next car:**', embeds: [embed], components: buttons });
        }
      }
    } else if (customId === 'park_it_stop') {
      const result = game.parkItStop();
      if (result && result.stopped) {
        const resultEmbed = GameUI.createParkItResultEmbed(game, result);
        await interaction.update({ embeds: [resultEmbed], components: [] });
        await continueGameAfterMinigame(interaction, game);
      }
    } else if (customId === 'boardwalk_roll') {
      const result = game.advanceBoardwalkRoll();
      if (result) {
        if (result.won) {
          const resultEmbed = GameUI.createAdvanceBoardwalkResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          await continueGameAfterMinigame(interaction, game);
        } else if (result.gameOver) {
          const resultEmbed = GameUI.createAdvanceBoardwalkResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Game Over logic usually handled by continueGameAfterMinigame if totalMoney is 0?
          // Or if minigame over, we just continue.
          await continueGameAfterMinigame(interaction, game);
        } else if (result.saved) {
          const embed = GameUI.createAdvanceBoardwalkGameEmbed(game);
          const buttons = GameUI.createAdvanceBoardwalkButtons(game);
          await interaction.update({
            content: `🛡️ **SAVED!** You rolled a **${result.roll}** (Danger!), but your Roll Again token saved you!`,
            embeds: [embed],
            components: buttons
          });
        } else if (result.overshot) {
          const resultEmbed = GameUI.createAdvanceBoardwalkResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createAdvanceBoardwalkGameEmbed(game);
          const buttons = GameUI.createAdvanceBoardwalkButtons(game);
          await interaction.update({
            content: `🎲 **Rolled a ${result.roll}!** Safe!`,
            embeds: [embed],
            components: buttons
          });
        }
      }
    } else if (customId === 'boardwalk_stop') {
      const result = game.advanceBoardwalkStop();
      const resultEmbed = GameUI.createAdvanceBoardwalkResultEmbed(game, result);
      await interaction.update({ embeds: [resultEmbed], components: [] });
      await continueGameAfterMinigame(interaction, game);
    } else if (customId.startsWith('bank_buster_key_')) {
      const keyIndex = parseInt(customId.split('_')[3]);
      const result = game.bankBusterPickKey(keyIndex);
      if (result) {
        if (result.won || result.gameOver) {
          const resultEmbed = GameUI.createBankBusterResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Continue game after both win and loss
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createBankBusterGameEmbed(game, result);
          const buttons = GameUI.createBankBusterButtons(game);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId === 'bank_buster_stop') {
      const result = game.bankBusterStop();
      const resultEmbed = GameUI.createBankBusterResultEmbed(game, result);
      await interaction.update({ embeds: [resultEmbed], components: [] });
      await continueGameAfterMinigame(interaction, game);
    } else if (customId.startsWith('block_party_card_')) {
      const groupIndex = parseInt(customId.split('_')[3]);
      const result = game.blockPartyPick(groupIndex);
      if (result) {
        if (result.won || result.gameOver) {
          const resultEmbed = GameUI.createBlockPartyResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Continue game after both win and loss
          await continueGameAfterMinigame(interaction, game);
        } else if (result.halved) {
          const embed = GameUI.createBlockPartyGameEmbed(game);
          const buttons = GameUI.createBlockPartyButtons(game);
          await interaction.update({ content: `⚠️ **STRIKE 2! Money halved to $${GameUI.formatMoney(result.banked)}!**`, embeds: [embed], components: buttons });
        } else {
          const embed = GameUI.createBlockPartyGameEmbed(game);
          const buttons = GameUI.createBlockPartyButtons(game);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId.startsWith('block_party_group_')) {
      const groupIndex = parseInt(customId.split('_')[3]);
      const result = game.blockPartySelectGroup(groupIndex);
      if (result) {
        if (result.won) {
          const resultEmbed = GameUI.createBlockPartyResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createBlockPartyGameEmbed(game);
          const buttons = GameUI.createBlockPartyButtons(game);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId.startsWith('power_grid_switch_')) {
      const switchIndex = parseInt(customId.split('_')[3]);
      const result = game.electricCompanyFlipSwitch(switchIndex);
      if (result) {
        if (result.blackout) {
          const resultEmbed = GameUI.createPowerGridResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Always continue after blackout - either with money (survived) or game over (lost everything)
          await continueGameAfterMinigame(interaction, game);
        } else {
          // Dramatic bulb-by-bulb reveal
          const bulbsLit = result.bulbsLit;
          const previousBulbs = result.litBulbs - bulbsLit;

          await interaction.update({ content: '💡 **Flipping switch...**', embeds: [], components: [] });
          await new Promise(resolve => setTimeout(resolve, 800));

          // Light up bulbs one by one
          for (let i = 1; i <= bulbsLit; i++) {
            const currentTotal = previousBulbs + i;
            const bulbEmoji = '💡'.repeat(i);
            await interaction.editReply({
              content: `✨ **Lighting up...** ${bulbEmoji}\n🔢 **Total Bulbs:** ${currentTotal}/25`
            });
            await new Promise(resolve => setTimeout(resolve, 400));
          }

          await new Promise(resolve => setTimeout(resolve, 500));

          // Show final result
          const embed = GameUI.createPowerGridGameEmbed(game);
          const buttons = GameUI.createPowerGridButtons(game);
          await interaction.editReply({ content: '', embeds: [embed], components: buttons });
        }
      }
    } else if (customId === 'power_grid_stop') {
      const result = game.electricCompanyStop();
      const resultEmbed = GameUI.createPowerGridResultEmbed(game, result);
      await interaction.update({ embeds: [resultEmbed], components: [] });
      await continueGameAfterMinigame(interaction, game);
    } else if (customId.startsWith('no_vacancy_limo_')) {
      const limoIndex = parseInt(customId.split('_')[3]);
      const result = game.noVacancyPickLimo(limoIndex);
      if (result) {
        if (result.gameOver) {
          const embed = GameUI.createNoVacancyLimoEmbed(game, result);
          const resultEmbed = GameUI.createNoVacancyResultEmbed(game, result);
          await interaction.update({ embeds: [embed, resultEmbed], components: [] });
          // Continue game after game over
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createNoVacancyLimoEmbed(game, result);
          const buttons = GameUI.createNoVacancyButtons(game, true);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId.startsWith('no_vacancy_floor_')) {
      const floorIndex = parseInt(customId.split('_')[3]);
      const result = game.noVacancyPlaceFloor(floorIndex);
      if (result) {
        if (result.won || result.overflow) {
          const resultEmbed = GameUI.createNoVacancyResultEmbed(game, result);
          await interaction.update({ embeds: [resultEmbed], components: [] });
          // Continue game after both win and overflow (game over)
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createNoVacancyGameEmbed(game);
          const buttons = GameUI.createNoVacancyButtons(game, false);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      }
    } else if (customId === 'no_vacancy_stop') {
      const result = game.noVacancyStop();
      if (result && result.stopped) {
        const resultEmbed = GameUI.createNoVacancyResultEmbed(game, result);
        await interaction.update({ embeds: [resultEmbed], components: [] });
        await continueGameAfterMinigame(interaction, game);
      }
    } else if (customId === 'block_party_stop') {
      const result = game.blockPartyStop();
      if (result) {
        const resultEmbed = GameUI.createBlockPartyResultEmbed(game, result);
        await interaction.update({ embeds: [resultEmbed], components: [] });
        await continueGameAfterMinigame(interaction, game);
      }
    } else if (customId.startsWith('ride_rails_train_')) {
      const trainIndex = parseInt(customId.split('_')[3]);
      const result = game.rideRailsSelectTrain(trainIndex);
      if (result) {
        const buttons = GameUI.createRideRailsButtons(game, false);
        // Show train grid immediately upon selection
        const grid = GameUI.createTrainCarGrid(result.train);
        await interaction.update({
          content: `🚂 **${result.train.name}** selected!\n${grid}\n\nReveal cars or stop?`,
          components: buttons
        });
      }
    } else if (customId === 'ride_rails_reveal') {
      const result = game.rideRailsRevealCar();
      if (result) {
        if (result.caboose && result.gameOver) {
          const resultEmbed = GameUI.createRideRailsResultEmbed(game, result);
          
          // Achievement Tracking
          AchievementHelper.trackRideRails(game, game.rideRailsState.bankedMoney, result.jackpot, false);
          await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

          // Show train grid with all cars revealed
          const grid = GameUI.createTrainCarGrid(result.train);
          await interaction.update({
            content: `🚂 **Hit caboose!**\n${result.train.name}: ${grid}`,
            embeds: [resultEmbed],
            components: []
          });
          await continueGameAfterMinigame(interaction, game);
        } else if (result.caboose) {
          const embed = GameUI.createRideRailsTrainSelectionEmbed(game);
          const buttons = GameUI.createRideRailsButtons(game, true);
          // Show train grid with all cars revealed
          const grid = GameUI.createTrainCarGrid(result.train);
          await interaction.update({
            content: `🚂 **Hit caboose! Lost potential $${GameUI.formatMoney(result.lostAmount)}**\n${result.train.name}: ${grid}\n\n**Select next train:**`,
            embeds: [embed],
            components: buttons
          });
        } else {
          // Show current train grid after reveal
          const grid = GameUI.createTrainCarGrid(result.train);
          await interaction.update({
            content: `🚂 **Car Revealed!**\n${result.train.name}: ${grid}\n\nContinue?`,
            components: GameUI.createRideRailsButtons(game, false)
          });
        }
      }
    } else if (customId === 'ride_rails_stop') {
      const result = game.rideRailsStopTrain();
      if (result) {
        if (result.goalReached !== undefined) {
          const resultEmbed = GameUI.createRideRailsResultEmbed(game, result);

          // Achievement Tracking
          AchievementHelper.trackRideRails(game, game.rideRailsState.bankedMoney, false, game.rideRailsState.bankedMoney >= 500000);
          await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

          // Show train grid with all cars revealed
          const grid = GameUI.createTrainCarGrid(result.train);
          await interaction.update({
            content: `🛑 **Train Stopped!**\n${result.train.name}: ${grid}\n**Banked:** $${GameUI.formatMoney(result.earned)}`,
            embeds: [resultEmbed],
            components: []
          });
          await continueGameAfterMinigame(interaction, game);
        } else {
          const embed = GameUI.createRideRailsTrainSelectionEmbed(game);
          const buttons = GameUI.createRideRailsButtons(game, true);
          // Show train grid with all cars revealed
          const grid = GameUI.createTrainCarGrid(result.train);
          await interaction.update({
            content: `✅ **Banked $${GameUI.formatMoney(result.earned)}!**\n${result.train.name}: ${grid}\n\n**Select next train:**`,
            embeds: [embed],
            components: buttons
          });
        }
      }
    } else if (customId.startsWith('dond_case_')) {
      const caseNum = parseInt(customId.split('_')[2]);
      await handleDondCaseSelection(interaction, game, caseNum);
    } else if (customId === 'dond_deal') {
      await handleDondDeal(interaction, game);
    } else if (customId === 'dond_nodeal') {
      await handleDondNoDeal(interaction, game);
    } else if (customId === 'dond_counter') {
      // Show counter offer modal
      const modal = GameUI.createCounterOfferModal();
      await interaction.showModal(modal);
    } else if (customId === 'dond_switch') {
      await handleDondSwitch(interaction, game);
    } else if (customId === 'dond_keep') {
      await handleDondKeep(interaction, game);
    } else if (customId === 'dond_page_prev') {
      game.dondState.casePage = 0;
      await interaction.update({ components: GameUI.createDondCaseButtons(game) });
    } else if (customId === 'dond_page_next') {
      game.dondState.casePage = 1;
      await interaction.update({ components: GameUI.createDondCaseButtons(game) });
    } else if (customId.startsWith('dond_banker_accept_') || customId.startsWith('dond_banker_reject_')) {
      // Banker responding to counter offer in DM
      const channelId = customId.split('_').slice(3).join('_');
      const accepted = customId.startsWith('dond_banker_accept_');

      const game = gameManager.getGame(channelId);
      if (!game || !game.dondState) {
        await interaction.reply({ content: '❌ Game not found or no longer active!', ephemeral: true });
        return;
      }

      await interaction.update({ content: accepted ? '✅ Counter offer accepted!' : '❌ Counter offer rejected!', components: [] });

      const gameChannel = interaction.client.channels.cache.get(channelId);
      if (!gameChannel) return;

      const counterAmount = game.dondState.counterOffer;

      // Dramatic reveal sequence
      await gameChannel.send({ content: '💭 **We know this is a hard decision...**' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      await gameChannel.send({ content: '📞 **And, he\'s calling back now...**' });
      await new Promise(resolve => setTimeout(resolve, 2500));

      await gameChannel.send({ content: '🤔 **He said:** _"This is one of my toughest decisions..."_' });
      await new Promise(resolve => setTimeout(resolve, 2500));

      await gameChannel.send({ content: '⏳ **And he chooses to...**' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (accepted) {
        // End game with counter offer
        game.dondState.dealAccepted = true;
        game.dondState.gameOver = true;
        game.dondState.finalValue = counterAmount;

        const playerCase = game.dondState.cases.find(c => c.caseNumber === game.dondState.playerCaseNumber);
        const isGoodDeal = counterAmount >= playerCase.value;

        // Update Big Bank (good deal adds to it, bad deal subtracts 10%)
        let bigBankChange = 0;
        if (isGoodDeal) {
          bigBankChange = counterAmount;
          await db.addToBigBank(game.guildId, counterAmount);
        } else {
          const penalty = Math.floor(counterAmount * 0.1);
          bigBankChange = -penalty;
          await db.addToBigBank(game.guildId, -penalty);
        }

        await gameChannel.send({
          embeds: [GameUI.createCounterOfferResponseEmbed({
            accepted: true,
            counterAmount,
            expectedValue: 0, // Not shown when accepted
            reason: `The banker accepted your counter offer of $${GameUI.formatMoney(counterAmount)}!`
          })]
        });
        
        // Show Big Bank update embed in game channel
        const newBigBankTotal = await db.getGlobalLostMoney(game.guildId);
        await gameChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(bigBankChange > 0 ? '#00FF00' : '#FF0000')
            .setTitle('💰 Big Bank Updated!')
            .setDescription(
              `**${game.dondState.playerName}** ${bigBankChange > 0 ? 'added' : 'lost'} **$${GameUI.formatMoney(Math.abs(bigBankChange))}** ${bigBankChange > 0 ? 'to' : 'from'} the Big Bank!\n\n` +
              `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}`
            )
          ]
        });

        // Also send to big-bank channel with good/bad deal info
        const guild = gameChannel.guild;
        const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');
        
        if (bigBankChannel) {
          const dealResultEmbed = new EmbedBuilder()
            .setColor(isGoodDeal ? '#00FF00' : '#FF0000')
            .setTitle(isGoodDeal ? '✅ Good Deal!' : '❌ Bad Deal!')
            .setDescription(
              `**${game.dondState.playerName}** counter offered **$${GameUI.formatMoney(counterAmount)}** and the banker accepted!\n\n` +
              `💼 Their case actually had: **$${GameUI.formatMoney(playerCase.value)}**\n\n` +
              `${isGoodDeal 
                ? `🎉 **Good Deal!** They negotiated **$${GameUI.formatMoney(counterAmount - playerCase.value)}** more than their case!\n💰 **$${GameUI.formatMoney(bigBankChange)}** added to Big Bank!`
                : `😱 **Bad Deal!** They could have had **$${GameUI.formatMoney(playerCase.value - counterAmount)}** more!\n⚠️ **$${GameUI.formatMoney(Math.abs(bigBankChange))}** penalty from Big Bank!`
              }\n\n` +
              `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}\n\n` +
              `*Get the Big Bank item from Mystery Box to claim it all!*`
            )
            .setTimestamp();

          await bigBankChannel.send({ embeds: [dealResultEmbed] });
        }

        const finalEmbed = GameUI.createDondResultEmbed(game, {
          finalValue: counterAmount,
          playerCaseValue: playerCase.value,
          isGoodDeal,
          remainingCases: game.dondState.cases.filter(c => !c.opened && c.caseNumber !== game.dondState.playerCaseNumber)
        });

        await gameChannel.send({ embeds: [finalEmbed] });
        gameManager.activeGames.delete(channelId);
      } else {
        // Continue game
        await gameChannel.send({
          embeds: [GameUI.createCounterOfferResponseEmbed({
            accepted: false,
            counterAmount,
            expectedValue: 0,
            reason: 'The banker rejected your counter offer. Game continues!'
          })]
        });

        // Create fake interaction to call handleDondAdvanceRound
        const fakeInteraction = { channel: gameChannel, followUp: gameChannel.send.bind(gameChannel) };
        await handleDondAdvanceRound(fakeInteraction, game);
      }
    } else if (customId === 'dond_banker_offer') {
      // Show modal for banker offer
      const modal = new ModalBuilder()
        .setCustomId('dond_offer_modal')
        .setTitle('Make Your Offer');

      const offerInput = new TextInputBuilder()
        .setCustomId('offer_amount')
        .setLabel('Enter offer amount ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 50000')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(15);

      const row = new ActionRowBuilder().addComponents(offerInput);

      modal.addComponents(row);
      await interaction.showModal(modal);
    } else if (customId === 'mount_cashmore_mode_normal' || customId === 'mount_cashmore_mode_bigbank') {
      await handleMountCashmoreModeSelect(interaction, customId === 'mount_cashmore_mode_bigbank');
    } else if (customId.startsWith('mount_cashmore_square_')) {
      const squareIndex = parseInt(customId.split('_')[3]);
      await handleMountCashmoreSquareSelect(interaction, squareIndex);
    } else if (customId === 'mount_cashmore_cashout_confirm') {
      await handleMountCashmoreCashout(interaction, true);
    } else if (customId === 'mount_cashmore_cashout_cancel') {
      await handleMountCashmoreCashout(interaction, false);
    } else if (customId === 'mount_cashmore_advance') {
      await handleMountCashmoreAdvance(interaction);
    } else if (customId === 'mount_cashmore_level9_safe') {
      await handleMountCashmoreLevel9Decision(interaction, 'safe');
    } else if (customId === 'mount_cashmore_level9_risk') {
      await handleMountCashmoreLevel9Decision(interaction, 'risk');
    } else if (customId === 'mount_cashmore_level9_walkaway') {
      await handleMountCashmoreLevel9Decision(interaction, 'walkaway');
    } else if (customId.startsWith('mount_cashmore_skull_')) {
      const guessIndex = parseInt(customId.split('_')[3]);
      await handleMountCashmoreSkullSeeker(interaction, guessIndex);
    } else if (customId.startsWith('mount_cashmore_gamblers_')) {
      const panel = parseInt(customId.split('_')[3]) - 1; // Convert to 0-indexed (buttons are 1,2,3 but array is 0,1,2)
      await handleMountCashmoreGamblersLuck(interaction, panel);
    } else if (customId === 'mount_cashmore_decimalizer_toss') {
      await handleMountCashmoreDecimalizer(interaction, true);
    } else if (customId === 'mount_cashmore_decimalizer_skip') {
      await handleMountCashmoreDecimalizer(interaction, false);
    } else if (customId === 'mount_cashmore_deal_accept') {
      await handleMountCashmoreHostsDeal(interaction, true);
    } else if (customId === 'mount_cashmore_deal_reject') {
      await handleMountCashmoreHostsDeal(interaction, false);
    } else if (customId === 'hmie_join') {
      const lobby = hmieLobbies.get(interaction.channelId);
      if (!lobby) {
        return interaction.reply({ content: '❌ Lobby has already started or expired!', ephemeral: true });
      }

      // Check if already in lobby
      if (lobby.players.some(p => p.id === interaction.user.id)) {
        return interaction.reply({ content: '❌ You are already in this lobby!', ephemeral: true });
      }

      // Check if lobby is full
      if (lobby.players.length >= 4) {
        return interaction.reply({ content: '❌ Lobby is full!', ephemeral: true });
      }

      // Add player to lobby
      lobby.players.push({
        id: interaction.user.id,
        name: interaction.user.username,
        isBot: false
      });

      // Update lobby embed
      const secondsElapsed = Math.floor((Date.now() - lobby.createdAt) / 1000);
      const secondsRemaining = Math.max(0, 60 - secondsElapsed);
      const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
      const updatedEmbed = GameUI.createHMIELobbyEmbed(lobby, secondsRemaining);
      const updatedButtons = GameUI.createHMIELobbyButtons(isAdmin, lobby.players.length);

      await interaction.update({ embeds: [updatedEmbed], components: updatedButtons });

      // Start immediately if 4 players
      if (lobby.players.length >= 4) {
        clearTimeout(lobby.countdown);
        clearInterval(lobby.countdownInterval);
        await startHMIEFromLobby(interaction.channelId);
      }
    } else if (customId === 'hmie_leave') {
      const lobby = hmieLobbies.get(interaction.channelId);
      if (!lobby) {
        return interaction.reply({ content: '❌ Lobby has already started or expired!', ephemeral: true });
      }

      // Check if in lobby
      const playerIndex = lobby.players.findIndex(p => p.id === interaction.user.id);
      if (playerIndex === -1) {
        return interaction.reply({ content: '❌ You are not in this lobby!', ephemeral: true });
      }

      // Remove player from lobby
      lobby.players.splice(playerIndex, 1);

      // Update lobby embed
      const secondsElapsed = Math.floor((Date.now() - lobby.createdAt) / 1000);
      const secondsRemaining = Math.max(0, 60 - secondsElapsed);
      const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
      const updatedEmbed = GameUI.createHMIELobbyEmbed(lobby, secondsRemaining);
      const updatedButtons = GameUI.createHMIELobbyButtons(isAdmin, lobby.players.length);

      await interaction.update({ embeds: [updatedEmbed], components: updatedButtons });
    } else if (customId === 'hmie_start_now') {
      const lobby = hmieLobbies.get(interaction.channelId);
      if (!lobby) {
        return interaction.reply({ content: '❌ Lobby has already started or expired!', ephemeral: true });
      }

      // Check admin permission
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Only admins can force-start the game!', ephemeral: true });
      }

      // Check minimum players
      if (lobby.players.length < 2) {
        return interaction.reply({ content: '❌ Need at least 2 players to start!', ephemeral: true });
      }

      await interaction.update({ content: '▶️ **Starting game...**', embeds: [], components: [] });

      // Clear timers and start game
      clearTimeout(lobby.countdown);
      clearInterval(lobby.countdownInterval);
      await startHMIEFromLobby(interaction.channelId);
    } else if (customId === 'hmie_start_round') {
      await handleHMIEStartRound(interaction, game);
    } else if (customId === 'hmie_lock_in') {
      const playerId = interaction.user.id;
      const lockResult = game.lockInHMIEAmount(playerId, game.hmieState.clockValue);

      if (lockResult) {
        await interaction.deferUpdate(); // Immediate acknowledgment
        await interaction.followUp({ content: `🔒 **Locked in!**`, ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ You have already locked in or are not in this game!', ephemeral: true });
      }
    } else if (customId === 'hmie_start_faceoff') {
      await handleHMIEFaceOff(interaction, game);
    } else if (customId === 'hmie_faceoff_stop') {
      // Single STOP button - first player to click wins
      const playerId = interaction.user.id;

      // Check if game still exists (might have been cleaned up if another finalist clicked first)
      if (!game || !game.hmieState) {
        return interaction.reply({
          content: '❌ No active game found! The game may have already ended.',
          ephemeral: true
        });
      }

      // Validate that clicking user is a finalist FIRST
      const finalists = game.hmieState.players.filter(p => !p.eliminated);
      const isFinalist = finalists.some(f => f.id === playerId);

      if (!isFinalist) {
        return interaction.reply({
          content: '❌ Only the two finalists can press the STOP button!',
          ephemeral: true
        });
      }

      // Clear the face-off timeout IMMEDIATELY to stop bots from auto-pressing
      if (game.hmieState?.faceOffTimeout) {
        clearTimeout(game.hmieState.faceOffTimeout);
        game.hmieState.faceOffTimeout = null;
      }

      // NOW check if winner already declared (after clearing timeout)
      if (game.hmieState?.faceOffWinner) {
        const winnerName = game.hmieState.players.find(p => p.id === game.hmieState.faceOffWinner)?.name || 'Someone';
        return interaction.reply({
          content: `❌ **Too slow!** ${winnerName} already stopped the clock!`,
          ephemeral: true
        });
      }

      const result = game.playHMIEFaceOff(playerId, game.hmieState.clockValue);

      if (result) {
        // CRITICAL: Stop ALL timers IMMEDIATELY to prevent race condition
        // The clock interval updates every 500ms and will overwrite the winner embed if not stopped
        if (game.hmieState.clockInterval) {
          clearInterval(game.hmieState.clockInterval);
          game.hmieState.clockInterval = null;
        }
        if (game.hmieState.autoStopTimeout) {
          clearTimeout(game.hmieState.autoStopTimeout);
          game.hmieState.autoStopTimeout = null;
        }
        
        // Mark that we're processing to prevent any further clock updates
        game.hmieState.clockRunning = false;
        game.hmieState.processingResults = true;
        
        const resultEmbed = GameUI.createFaceOffResultEmbed(game, result);
        await interaction.update({ embeds: [resultEmbed], components: [] });

        // Update winner's high score (only if they're not a bot)
        const winner = game.hmieState.players.find(p => p.id === result.winner.id);
        if (winner && !winner.isBot) {
          try {
            // Award HMIE Achievements
            await towerAchievements.awardAchievement('HMIE_WINNER', winner.id, winner.name, interaction.guildId, interaction.channel, { winnings: result.winner.winnings });
            
            if (result.winner.winnings === 50000) {
              await towerAchievements.awardAchievement('HMIE_PERFECT', winner.id, winner.name, interaction.guildId, interaction.channel, { winnings: 50000 });
            }

            const finalScore = result.winner.winnings * 10; // Multiply by 10
            await db.modifyHighScore(result.winner.id, interaction.guildId, finalScore);

            // Award HMIE achievements
            await towerAchievements.awardAchievement('HMIE_WINNER', result.winner.id, result.winner.name, interaction.guildId, interaction.channel);
            
            // Check for Perfect Lock ($1,000,000 exactly)
            if (winner.bankedMoney === 1000000) {
              await towerAchievements.awardAchievement('HMIE_PERFECT_LOCK', result.winner.id, result.winner.name, interaction.guildId, interaction.channel);
            }
            
            // Check for High Roller ($5M+)
            if (winner.bankedMoney >= 5000000) {
              await towerAchievements.awardAchievement('HMIE_HIGH_ROLLER', result.winner.id, result.winner.name, interaction.guildId, interaction.channel);
            }
            
            // Check for Underdog (lowest lock-in amount)
            const sortedPlayers = game.hmieState.players
              .filter(p => !p.eliminated && !p.isBot)
              .sort((a, b) => a.bankedMoney - b.bankedMoney);
            if (sortedPlayers.length > 1 && sortedPlayers[0].id === result.winner.id) {
              await towerAchievements.awardAchievement('HMIE_UNDERDOG', result.winner.id, result.winner.name, interaction.guildId, interaction.channel);
            }

            // Post to leaderboard channel if it exists
            const guild = interaction.guild;
            const leaderboardChannel = guild.channels.cache.find(ch => ch.name === '🏆-leaderboard');

            if (leaderboardChannel) {
              const leaderboardEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏆 HMIE Winner - High Score Updated!')
                .setDescription(
                  `**${result.winner.name}** won How Much Is Enough!\n\n` +
                  `💰 **Winnings:** $${GameUI.formatMoney(result.winner.winnings)}\n` +
                  `🎯 **High Score Added:** $${GameUI.formatMoney(finalScore)} (×10 multiplier)\n\n` +
                  `*Congratulations!*`
                )
                .setTimestamp();

              await leaderboardChannel.send({ embeds: [leaderboardEmbed] });
            }
          } catch (error) {
            console.error('Error updating HMIE winner high score:', error);
          }
        }



        // Handle Loser's Money -> Big Bank
        const loserId = result.loser.id;
        // Access state directly to get banked money (result.loser only has name/id)
        const loserState = game.hmieState.players.find(p => p.id === loserId);

        if (loserState && loserState.bankedMoney > 0) {
          try {
            const amountLost = loserState.bankedMoney;
            await db.addLostMoney(interaction.guildId, amountLost);

            const guild = interaction.guild;
            const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

            if (bigBankChannel) {
              const newTotal = await db.getGlobalLostMoney(interaction.guildId);
              const lostEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('💰 Big Bank Updated!')
                .setDescription(
                  `**${result.loser.name}** lost the Face-Off and dropped **$${GameUI.formatMoney(amountLost)}** into the Big Bank!\n\n` +
                  `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newTotal)}\n\n` +
                  `*One winner takes it all...*`
                )
                .setTimestamp();
              await bigBankChannel.send({ embeds: [lostEmbed] });
            }
          } catch (err) {
            console.error('Error adding HMIE loss to big bank:', err);
          }
        }

        // Clean up game
        gameManager.activeGames.delete(game.channelId);
      } else {
        // Edge case: should not happen if validation above passes
        return interaction.reply({
          content: '❌ An error occurred while processing the face-off.',
          ephemeral: true
        });
      }
    } else if (customId === 'rtab_join') {
      await handleRTABJoin(interaction);
    } else if (customId === 'rtab_leave') {
      await handleRTABLeave(interaction);
    } else if (customId === 'rtab_start') {
      await handleRTABStart(interaction);
    } else if (customId.startsWith('rtab_square_')) {
      await handleRTABSquareClick(interaction);
    } else if (customId.startsWith('rtab_market_')) {
      await handleRTABMarketAction(interaction);
    } else if (customId.startsWith('rtab_mg_')) {
      await handleRTABMinigameAction(interaction);
    // Season 2 Boss Buttons
    } else if (customId.startsWith('s2_architect_node_')) {
      const nodeIndex = parseInt(customId.replace('s2_architect_node_', ''));
      await handleS2ArchitectNode(interaction, game, nodeIndex);
    } else if (customId === 's2_boss_architect_continue') {
      await handleS2BossArchitectContinue(interaction, game);
    } else if (customId.startsWith('s2_shark_roll_')) {
      const strategy = customId.replace('s2_shark_roll_', '');
      await handleS2SharkRoll(interaction, game, strategy);
    } else if (customId === 's2_boss_shark_continue') {
      await handleS2BossSharkContinue(interaction, game);
    } else if (customId.startsWith('s2_operator_vault_')) {
      const vaultIndex = parseInt(customId.replace('s2_operator_vault_', ''));
      await handleS2OperatorPick(interaction, game, vaultIndex);
    } else if (customId === 's2_boss_operator_continue') {
      await handleS2BossOperatorContinue(interaction, game);
    // Season 2 Minigame Buttons
    } else if (customId.startsWith('s2_laser_step_')) {
      const colIndex = parseInt(customId.replace('s2_laser_step_', ''));
      await handleS2LaserStep(interaction, game, colIndex);
    } else if (customId === 's2_laser_continue') {
      await handleS2LaserContinue(interaction, game);
    } else if (customId.startsWith('s2_auction_bid_')) {
      const bid = parseInt(customId.replace('s2_auction_bid_', ''));
      await handleS2AuctionBid(interaction, game, bid);
    } else if (customId === 's2_auction_continue') {
      await handleS2AuctionContinue(interaction, game);
    } else if (customId.startsWith('s2_bomb_wire_')) {
      const wireIndex = parseInt(customId.replace('s2_bomb_wire_', ''));
      await handleS2BombCut(interaction, game, wireIndex);
    } else if (customId === 's2_bomb_continue') {
      await handleS2BombContinue(interaction, game);
    } else if (customId.startsWith('s2_blackjack_')) {
      const action = customId.replace('s2_blackjack_', '');
      if (action === 'continue') {
        await handleS2BlackjackContinue(interaction, game);
      } else {
        await handleS2BlackjackAction(interaction, game, action);
      }
    // Season 2 Ascent Pacts
    } else if (customId.startsWith('s2_pact_')) {
      const pactId = customId.replace('s2_pact_', '');
      await handleS2PactSelect(interaction, game, pactId);
    // Minigame Master
    } else if (customId.startsWith('s2_mgm_')) {
      await handleS2MGMAction(interaction, customId.replace('s2_mgm_', ''));
    }
  } catch (error) {
    console.error('Error handling button:', error);
    // Only try to reply if we haven't already responded and interaction is still valid
    if (!interaction.replied && !interaction.deferred) {
      try {
        await safeInteractionResponse(interaction, 'reply', { 
          content: '❌ An error occurred processing the button.', 
          ephemeral: true 
        });
      } catch (replyError) {
        console.error('Failed to send error message to user:', replyError.message);
      }
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

  try {
    const { customId } = interaction;

    if (customId === 'dond_offer_modal') {
      const game = gameManager.getGame(interaction.channelId);

      if (!game || !game.dondState) {
        await interaction.reply({ content: '❌ No active DOND game found in this channel!', ephemeral: true });
        return;
      }

      // Verify it's the banker
      if (game.dondState.bankerId !== interaction.user.id) {
        await interaction.reply({ content: '❌ Only the designated Banker can make an offer!', ephemeral: true });
        return;
      }

      const offerAmountStr = interaction.fields.getTextInputValue('offer_amount');
      const offerAmount = parseFloat(offerAmountStr.replace(/[$,]/g, ''));

      if (isNaN(offerAmount) || offerAmount < 0) {
        await interaction.reply({ content: '❌ Invalid offer amount! Please enter a positive number.', ephemeral: true });
        return;
      }

      // Set the manual offer
      game.setManualOffer(offerAmount);

      // Confirm to banker (ephemeral)
      await interaction.reply({
        content: `✅ **Offer Sent:** $${GameUI.formatMoney(offerAmount)}`,
        ephemeral: true
      });

      // Show updated offer in game channel
      await interaction.channel.send({
        embeds: [GameUI.createDondBankerOfferEmbed(game, offerAmount)],
        components: GameUI.createDondDealButtons(game)
      });
    } else if (customId === 'basement_offer_modal') {
      const game = gameManager.getGame(interaction.channelId);
      if (game) {
        await handleBasementOfferSubmit(interaction, game);
      } else {
        await interaction.reply({ content: '❌ Game not found!', ephemeral: true });
      }
    } else if (customId === 'peek_modal') {
      const game = gameManager.getGame(interaction.channelId);
      if (game) {
        await handlePeekSubmit(interaction, game);
      } else {
        await interaction.reply({ content: '❌ Game not found!', ephemeral: true });
      }
    } else if (customId === 'dond_counter_modal') {
      const game = gameManager.getGame(interaction.channelId);

      if (!game || !game.dondState) {
        await interaction.reply({ content: '❌ No active DOND game found!', ephemeral: true });
        return;
      }

      // Verify it's the player
      if (game.dondState.playerId !== interaction.user.id) {
        await interaction.reply({ content: '❌ Only the player can make a counter offer!', ephemeral: true });
        return;
      }

      // Verify counter hasn't been used
      if (game.dondState.hasCounterOffered) {
        await interaction.reply({ content: '❌ You already used your counter offer!', ephemeral: true });
        return;
      }

      const counterAmountStr = interaction.fields.getTextInputValue('counter_amount');
      const counterAmount = parseFloat(counterAmountStr.replace(/[$,]/g, ''));

      if (isNaN(counterAmount) || counterAmount <= 0) {
        await interaction.reply({ content: '❌ Invalid counter offer! Please enter a positive number.', ephemeral: true });
        return;
      }

      // Set counter offer flag
      game.setCounterOffer(counterAmount);
      
      // Show counter offer initiated message to channel
      await interaction.reply({ 
        embeds: [new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('💼 Counter Offer Made!')
          .setDescription(
            `**${game.dondState.playerName}** has countered the banker's offer!\n\n` +
            `**Original Offer:** $${GameUI.formatMoney(game.dondState.lastOffer)}\n` +
            `**Counter Offer:** $${GameUI.formatMoney(counterAmount)}\n\n` +
            `🤔 Waiting for the banker's response...`
          )
          .setFooter({ text: 'Will the banker accept?' })
        ]
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Auto mode or Manual mode (Force auto if banker is bot)
      if (game.dondState.offerMode === 'auto' || game.dondState.bankerId === interaction.client.user.id) {
        // Auto banker evaluates
        const result = game.evaluateCounterOffer(counterAmount);

        // Dramatic reveal sequence
        await interaction.followUp({ content: '💭 **We know this is a hard decision...**' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        await interaction.followUp({ content: '📞 **And, he\'s calling back now...**' });
        await new Promise(resolve => setTimeout(resolve, 2500));

        await interaction.followUp({ content: '🤔 **He said:** _"This is one of my toughest decisions..."_' });
        await new Promise(resolve => setTimeout(resolve, 2500));

        await interaction.followUp({ content: '⏳ **And he chooses to...**' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Final reveal
        await interaction.followUp({ embeds: [GameUI.createCounterOfferResponseEmbed(result)] });

        if (result.accepted) {
          // End game with counter offer
          game.dondState.dealAccepted = true;
          game.dondState.gameOver = true;
          game.dondState.finalValue = counterAmount;

          const playerCase = game.dondState.cases.find(c => c.caseNumber === game.dondState.playerCaseNumber);
          const isGoodDeal = counterAmount >= playerCase.value;

          // Update Big Bank (good deal adds to it, bad deal subtracts 10%)
          let bigBankChange = 0;
          if (isGoodDeal) {
            bigBankChange = counterAmount;
            await db.addToBigBank(game.guildId, counterAmount);
          } else {
            const penalty = Math.floor(counterAmount * 0.1);
            bigBankChange = -penalty;
            await db.addToBigBank(game.guildId, -penalty);
          }
          
          // Show Big Bank update embed
          const newBigBankTotal = await db.getGlobalLostMoney(game.guildId);
          await interaction.followUp({
            embeds: [new EmbedBuilder()
              .setColor(bigBankChange > 0 ? '#00FF00' : '#FF0000')
              .setTitle('💰 Big Bank Updated!')
              .setDescription(
                `**${game.dondState.playerName}** ${bigBankChange > 0 ? 'added' : 'lost'} **$${GameUI.formatMoney(Math.abs(bigBankChange))}** ${bigBankChange > 0 ? 'to' : 'from'} the Big Bank!\n\n` +
                `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}`
              )
            ]
          });

          const finalEmbed = GameUI.createDondResultEmbed(game, {
            finalValue: counterAmount,
            playerCaseValue: playerCase.value,
            isGoodDeal,
            remainingCases: game.dondState.cases.filter(c => !c.opened && c.caseNumber !== game.dondState.playerCaseNumber)
          });

          await interaction.followUp({ embeds: [finalEmbed] });
          gameManager.activeGames.delete(game.channelId);
        } else {
          // Continue game
          await interaction.followUp({ content: '➡️ **Advancing to next round...**' });
          await handleDondAdvanceRound(interaction, game);
        }
      } else {
        // Manual mode - DM banker
        await interaction.followUp({ content: '💼 **Counter offer sent to banker!** Waiting for response...', ephemeral: true });

        try {
          const banker = await interaction.client.users.fetch(game.dondState.bankerId);
          const remainingCases = game.dondState.cases.filter(c => !c.opened);
          const sum = remainingCases.reduce((acc, c) => acc + c.value, 0);
          const expectedValue = Math.floor(sum / remainingCases.length);

          await banker.send({
            embeds: [GameUI.createBankerCounterNotificationEmbed(
              game.dondState.playerName,
              counterAmount,
              expectedValue,
              game.dondState.lastOffer
            )],
            components: GameUI.createBankerCounterButtons(game.channelId)
          });
        } catch (error) {
          console.error('Error DMing banker:', error);
          await interaction.followUp({ content: '⚠️ Could not DM banker! Game continues...', ephemeral: true });
          await handleDondAdvanceRound(interaction, game);
        }
      }
    }
  } catch (error) {
    console.error('Error handling modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred processing the modal.', ephemeral: true });
    }
  }
});

// Handle StringSelectMenu interactions (for info commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  try {
    const customId = interaction.customId;
    const selectedValue = interaction.values[0];

    if (customId === 'content_category') {
      // Handle content category selection - show detailed descriptions
      const categoryDetails = {
        cash: {
          title: '💰 Cash Items',
          description: '**Fixed money amounts you can find in the tower:**\n\n' +
            '**Positive Cash:**\n' +
            '• $1 - Tiny start\n' +
            '• $10 - Small change\n' +
            '• $100 - Getting somewhere\n' +
            '• $1,000 - Nice bonus\n' +
            '• $10,000 - Solid gain\n' +
            '• $100,000 - Big money!\n' +
            '• $1,000,000 - JACKPOT!\n\n' +
            '**Negative Cash:**\n' +
            '• -$1 to -$1,000,000 - Lose money\n\n' +
            '*Cash amounts are straightforward - what you see is what you get!*'
        },
        percentage: {
          title: '📊 Percentage Items',
          description: '**Multiply your current money by a percentage:**\n\n' +
            '**Positive Percentages:**\n' +
            '• +1% to +10% - Small growth\n' +
            '• +25% to +50% - Good multiplier\n' +
            '• +75% to +100% - Double your money!\n\n' +
            '**Negative Percentages:**\n' +
            '• -1% to -25% - Small loss\n' +
            '• -50% to -75% - Major setback\n' +
            '• -100% - LOSE EVERYTHING!\n\n' +
            '**How it works:**\n' +
            '• Percentage applies to your CURRENT money\n' +
            '• Example: $100,000 + 50% = $150,000\n' +
            '• Example: $100,000 - 50% = $50,000\n\n' +
            '*The more money you have, the bigger the impact!*'
        },
        random: {
          title: '🎲 Random Items',
          description: '**Mystery amounts with unpredictable values:**\n\n' +
            '**Random Types:**\n' +
            '• **Random 1** - $0 to $9,999\n' +
            '• **Random 2** - $0 to $99,999\n' +
            '• **Random 3** - $0 to $999,999\n' +
            '• **Random 4** - $0 to $9,999,999\n' +
            '• **Random 5** (Season 1) - $0 to $99,999,999\n\n' +
            '**How it works:**\n' +
            '• Amount is randomly generated when revealed\n' +
            '• Could be $0 or the maximum!\n' +
            '• High risk, high reward\n' +
            '• You\'ll see the actual value after choosing\n\n' +
            '*Feeling lucky? Random items can make or break your run!*'
        },
        special: {
          title: '✨ Special Actions',
          description: '**Unique game-changing effects:**\n\n' +
            '**Digit Manipulation:**\n' +
            '• **Add a 0** - Multiply money by 10\n' +
            '  Example: $1,234 → $12,340\n' +
            '• **Add a 1** - Prepend 1 to your money\n' +
            '  Example: $1,234 → $11,234\n' +
            '• **Add a ?** (Season 1) - Random [0-9] or negate\n' +
            '  Example: $100 + "5" → $5,100\n' +
            '  Example: $100 + "-" → -$100\n' +
            '• **Mirror** (Season 1) - Reverse digits\n' +
            '  Example: $12,345 → $54,321\n\n' +
            '**Other Special:**\n' +
            '• **Timeout:** 5 minutes to solve (or lose everything)\n' +
            '• **Random ±%** (Season 1) - Random -150% to +150%\n' +
            '• **Boost Multiplier** (Season 1) - Random 0x to 3x\n\n' +
            '*Special actions can dramatically change your strategy!*'
        },
        minigames: {
          title: '🎮 Minigames',
          description: '**Interactive challenges (Season 1 only):**\n\n' +
            '• 🏦 **The Vault** - Crack the code\n' +
            '• 🎰 **Mega Grid** - 5x5 grid challenge\n' +
            '• 🔥 **Boiling Point** - Temperature management\n' +
            '• ✊ **Operator Roshambo** - Rock Paper Scissors\n' +
            '• ♾️ **The ∞%** - Infinite percentages\n' +
            '• 🏚️ **Hideout Breakthrough** - Ascending numbers\n' +
            '• 🪆 **Babushka** - Nesting dolls\n' +
            '• 📦 **Mystery Box** - Random items\n' +
            '• 🚪 **Door Escape** - Find the exit\n\n' +
            '*Use `/minigame-detail` to see full rules for each!*'
        },
        dangers: {
          title: '❌ Dangers',
          description: '**Items that can end your run:**\n\n' +
            '**Game Over:**\n' +
            '• Instantly ends your game\n' +
            '• You lose ALL money\n' +
            '• No second chances\n' +
            '• The ultimate risk!\n\n' +
            '**Nothing:**\n' +
            '• Gives you $0\n' +
            '• Wastes a floor pick\n' +
            '• Better than Game Over!\n' +
            '• Still keeps you in the game\n\n' +
            '**-100% (End of Round):**\n' +
            '• If you hit -100% at round end (after Round 1)\n' +
            '• You lose everything\n' +
            '• Same as Game Over\n\n' +
            '*Always be careful - these can appear anywhere!*'
        }
      };

      const details = categoryDetails[selectedValue];
      if (details) {
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(details.title)
            .setDescription(details.description)
            .setFooter({ text: 'Good luck in the tower!' })
          ],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `📚 **${selectedValue.toUpperCase()} Category**\n\nDetailed descriptions coming soon!`,
          ephemeral: true
        });
      }
    } else if (customId === 'minigame_select') {
      // Handle minigame selection - show detailed rules
      const minigameDetails = {
        vault: {
          title: '🏦 The Vault',
          description: '**Crack the 6-digit code!**\n\n' +
            '**Rules:**\n' +
            '• Guess a 6-digit code with unique digits (0-9)\n' +
            '• You have 4 attempts to crack it\n' +
            '• After each guess, you\'ll see:\n' +
            '  - ✅ Correct digits in correct positions\n' +
            '  - 🟡 Correct digits in wrong positions\n\n' +
            '**Rewards:**\n' +
            '• 6 correct: $1M, +100%, or Add a 1\n' +
            '• 5 correct: $500k\n' +
            '• 4 correct: $200k\n' +
            '• 3 correct: $100k\n' +
            '• 2 correct: $25k\n' +
            '• 1 correct: $10k'
        },
        mega_grid: {
          title: '🎰 Mega Grid',
          description: '**5x5 Grid Challenge!**\n\n' +
            '**Rules:**\n' +
            '• Pick tiles from a 5x5 grid (25 tiles total)\n' +
            '• Each tile reveals money or Game Over\n' +
            '• Complete 5 rounds to win jackpot\n' +
            '• Type "STOP" in chat to cash out anytime\n\n' +
            '**Rewards:**\n' +
            '• Round 1: $10k per safe tile\n' +
            '• Round 2: $20k per safe tile\n' +
            '• Round 3: $40k per safe tile\n' +
            '• Round 4: $80k per safe tile\n' +
            '• Round 5: $160k per safe tile\n' +
            '• Complete all 5: $1M JACKPOT!'
        },
        boiling_point: {
          title: '🔥 Boiling Point',
          description: '**Reach 100°C without boiling over!**\n\n' +
            '**Rules:**\n' +
            '• Start at 0°C, target is 100°C\n' +
            '• Pick tiles: Hotter (+temp) or Colder (-temp)\n' +
            '• Reach exactly 100°C to win\n' +
            '• Go over 100°C = Game Over\n' +
            '• One "Change" option per game\n\n' +
            '**Rewards:**\n' +
            '• Reach 100°C: $500k\n' +
            '• Boil over: Lose everything'
        },
        operator_roshambo: {
          title: '✊ Operator Roshambo',
          description: '**Rock Paper Scissors with stakes!**\n\n' +
            '**Rules:**\n' +
            '• Play Rock Paper Scissors vs Operator\n' +
            '• Win: Earn money based on current total\n' +
            '• Lose: Lose money based on current total\n' +
            '• Tie: No change\n' +
            '• Play multiple rounds or cash out\n\n' +
            '**Stakes:**\n' +
            '• Win/Loss amount = 10-30% of current money\n' +
            '• Higher risk, higher reward!'
        },
        infinity_percent: {
          title: '♾️ The ∞%',
          description: '**Infinite percentage multiplier!**\n\n' +
            '**Rules:**\n' +
            '• Pick from 3 percentage tiles\n' +
            '• Positive % = +5% per tile\n' +
            '• Negative % = Strike (3 strikes = total - 100%)\n' +
            '• Stop anytime to keep your multiplied money\n\n' +
            '**Percentages:**\n' +
            '• +5% consecutively\n' +
            '• The longer you play, the riskier it gets!'
        },
        hideout_breakthrough: {
          title: '🏚️ Hideout Breakthrough',
          description: '**Pick ascending numbers 1-12!**\n\n' +
            '**Rules:**\n' +
            '• 12 buttons hide numbers 1-12\n' +
            '• Pick buttons to reveal numbers\n' +
            '• Each pick must be HIGHER than previous\n' +
            '• Pick lower/equal = Game Over (keep earnings)\n' +
            '• Pick 12 = Auto-stop (highest number)\n\n' +
            '**Rewards:**\n' +
            '• Each successful pick: $20k\n' +
            '• Complete 6 ascending picks: $1M JACKPOT!'
        },
        babushka: {
          title: '🪆 Babushka',
          description: '**Nesting doll risk game!**\n\n' +
            '**Rules:**\n' +
            '• Pick a doll, reveal layers inside\n' +
            '• Each layer has higher value ($1k→$10M)\n' +
            '• Empty layer = Strike + lose stash\n' +
            '• 3 strikes = -100% penalty\n' +
            '• Reach $10M = Auto-bank to stash\n' +
            '• "Walk Away" to secure stash\n\n' +
            '**Strategy:**\n' +
            '• Go deeper for bigger rewards\n' +
            '• Bank to stash to secure money\n' +
            '• Risk vs reward!'
        },
        mystery_box: {
          title: '📦 Mystery Box',
          description: '**Choose 1 of 4 random items!**\n\n' +
            '**Rules:**\n' +
            '• 4 boxes appear with hidden items\n' +
            '• Pick one box to reveal its item\n' +
            '• Items can be good, bad, neutral, or money\n' +
            '• See what you avoided in other boxes\n\n' +
            '**Categories:**\n' +
            '• 🟢 Good: Powerful buffs & bonuses\n' +
            '• 🔴 Bad: Debuffs & penalties\n' +
            '• 🟡 Neutral: Mixed effects (including Small Bank)\n' +
            '• 💰 Money: Direct cash/percentages\n\n' +
            '*Use `/mystery-box` to see all items & rates*'
        },
        door_escape: {
          title: '🚪 Door Escape',
          description: '**Find the escape door!**\n\n' +
            '**Rules:**\n' +
            '• Start with **100% Health**\n' +
            '• 3 doors per round: Escape, Blocked, or Trapped\n' +
            '• **Escape:** Money x2 & Next Round\n' +
            '• **Blocked:** Pick again\n' +
            '• **Trapped:** Lose 10-50% Health\n' +
            '• **ESCAPE Button:** Cash out anytime (Final Phase)\n\n' +
            '**Final Phase (4 Doors):**\n' +
            '• 💎 Treasure: Money x2\n' +
            '• 🏃 Escape: Keep all money\n' +
            '• 🚑 Rescue: Keep 50% money\n' +
            '• 💀 Fatal: Lose everything\n\n' +
            '**Rewards:**\n' +
            '• Base: $25,000\n' +
            '• Multiplier: x2 per round'
        },
        operator_offer: {
          title: '📞 Operator Offer',
          description: '**Accept or Decline the Operator\'s Deal!**\n\n' +
            '**Rules:**\n' +
            '• Operator calls with a cash offer\n' +
            '• Offer is based on your current total money\n' +
            '• **ACCEPT:** Take the money and end the game (safe)\n' +
            '• **DECLINE:** Reject offer and continue playing (risky)\n\n' +
            '**Offer Calculation:**\n' +
            '• Based on potential future earnings\n' +
            '• Usually 80-120% of your current money\n' +
            '• Can be a lifeline if you\'re risking a lot!'
        },
        laser_infiltration: {
          title: '🚨 Laser Infiltration (Season 2)',
          description: '**Navigate the 4-Sector High-Security Laser Grid!**\n\n' +
            '**Rules:**\n' +
            '• 4 Sectors to breach, each with 3 laser nodes (Left, Center, Right)\n' +
            '• In each sector, only 1-2 nodes are safe path\n' +
            '• Crossing safe nodes earns escalating cash up to $1,000,000!\n' +
            '• Tripping an alarm reduces safety or aborts with partial payout.'
        },
        blind_auction: {
          title: '🔨 The Blind Auction (Season 2)',
          description: '**Outbid the Rival AI for the Secret Vault!**\n\n' +
            '**Rules:**\n' +
            '• A mystery container is up for auction with a hidden secret value\n' +
            '• Choose your bid from 4 tiered amounts\n' +
            '• Rival AI bids blindly against you\n' +
            '• If your bid wins, you claim the container contents minus your bid cost!'
        },
        bomb_defusal: {
          title: '💣 Bomb Defusal (Season 2)',
          description: '**Cut the Right Wire for $2,500,000 or Boom!**\n\n' +
            '**Rules:**\n' +
            '• 4 colored wires on a ticking time bomb\n' +
            '• 1 Defusal wire: Wins **$2,500,000 JACKPOT**!\n' +
            '• 1 Safe wire: Escapes safely with +$250,000\n' +
            '• 2 Detonator wires: Bomb detonates, reducing bank by 50%!'
        },
        high_roller_blackjack: {
          title: '🃏 High Roller Blackjack (Season 2)',
          description: '**Classic 21 vs the House Dealer!**\n\n' +
            '**Rules:**\n' +
            '• Standard Blackjack rules: Hit, Stand, or Double Down\n' +
            '• Dealer must hit on soft 17\n' +
            '• Natural Blackjack pays 3:2\n' +
            '• Win doubles your floor payout; loss forfeits floor bonus.'
        },
        minigame_master: {
          title: '🏆 Minigame Master Tournament',
          description: '**The Ultimate All-Minigame Gauntlet!**\n\n' +
            '**Structure:**\n' +
            '• **Round 1 (Qualifiers):** 5 Random Minigames (Top 5 earners advance)\n' +
            '• **Round 2 (Semi-Finals):** 3 Elite Minigames with **2x Multiplier** (Top 2 advance)\n' +
            '• **Round 3 (Finals):** Grand Finale Showdown with **3x Multiplier**\n\n' +
            'Play solo with `/minigame-master mode:solo` or host a lobby with `/minigame-master mode:multi`!'
        }
      };

      const details = minigameDetails[selectedValue];
      if (details) {
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle(details.title)
            .setDescription(details.description)
            .setFooter({ text: 'Good luck!' })
          ],
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Error handling select menu:', error);
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

  await safeInteractionResponse(interaction, 'update', { embeds: [embed], components: buttons });
}

async function handleConfirmFloors(interaction, game) {
  if (!game.hasSelectedAllFloors()) {
    return safeInteractionResponse(interaction, 'reply', { content: '❌ Please select all required floors!', ephemeral: true });
  }

  game.isSelectingFloors = false;
  game.isSelectingSide = true;

  // Start first floor in this round (or Boss encounter if floor 10, 20, 30)
  await startCurrentFloorOrBoss(interaction, game);
}

async function handleSideChoice(interaction, game, choice) {
  // Defer immediately since we use editReply throughout
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  const floorNumber = game.getCurrentFloorNumber();
  const choices = game.currentFloorChoices;

  // Check if Broken Compass forced a choice
  let actualChoice = choice;
  let wasForcedChoice = false;
  if (choices.forcedChoice) {
    actualChoice = choices.forcedChoice;
    wasForcedChoice = true;
  }

  const chosenAmount = actualChoice === 'left' ? choices.left : choices.right;
  const lostAmount = actualChoice === 'left' ? choices.right : choices.left;

  // Check for PEEK_MASTER_PRO achievement: Did they peek this floor and avoid danger?
  if (game.peekedDangerousFloors && game.peekedDangerousFloors[floorNumber]) {
    const peekData = game.peekedDangerousFloors[floorNumber];
    const choseDangerousSide = (actualChoice === 'left' && peekData.leftDangerous) || 
                                (actualChoice === 'right' && peekData.rightDangerous);
    const avoidedDangerousSide = (actualChoice === 'left' && peekData.rightDangerous) || 
                                  (actualChoice === 'right' && peekData.leftDangerous);
    
    // Award if they avoided the dangerous side
    if (avoidedDangerousSide && !choseDangerousSide) {
      await towerAchievements.awardAchievement('PEEK_MASTER_PRO', game.userId, game.username, interaction.guildId, interaction.channel, {
        floorNumber,
        dangerAvoided: lostAmount.label || (lostAmount.type === 'game_over' ? 'Game Over' : 'X Level')
      });
    }
    
    // Remove from tracking after use
    delete game.peekedDangerousFloors[floorNumber];
  }

  const moneyBefore = game.totalMoney;

  // Mark both amounts as revealed (used)
  game.markAmountUsed(chosenAmount);
  game.markAmountUsed(lostAmount);

  // Apply the chosen amount
  const appliedAmount = game.applyAmount(chosenAmount);
  
  // Achievement Tracking for specialized items
  if (appliedAmount.action === 'remove_zeros' || appliedAmount.action === 'blast_digit') {
      AchievementHelper.trackItemUsage(game, appliedAmount.action, appliedAmount);
      await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');
  }

  const moneyAfter = game.totalMoney;

  // Decrement active effects (unless they are fresh)
  game.decrementActiveEffects();

  // Add to history
  game.addToHistory(floorNumber, choice, appliedAmount, lostAmount, moneyBefore, moneyAfter);

  // Create result embed
  const resultEmbed = GameUI.createResultEmbed(game, floorNumber, choice, appliedAmount, lostAmount, moneyBefore, moneyAfter);

  // Show partial result first (freeze effect)
  const partialEmbed = GameUI.createPartialResultEmbed(game, floorNumber, choice, appliedAmount, moneyBefore, moneyAfter);

  // Determine if this is a suspenseful outcome
  const isSuspenseful =
    chosenAmount.type === 'event' || // Any event tile
    chosenAmount.type === 'special' || // Special actions
    (chosenAmount.type === 'percentage' && (chosenAmount.value <= -50 || chosenAmount.value >= 50)) || // Large negative %
    appliedAmount === 'GAME_OVER' || // Game over
    (chosenAmount.type === 'cash' && Math.abs(chosenAmount.value) >= 100000); // Large cash amounts

  // Suspense animation (only for suspenseful outcomes)
  if (isSuspenseful) {
    const suspenseFrames = [
      '🎲 **Rolling the dice...**',
      '🤞 **Crossing fingers...**',
      '🫣 **Don\'t look!**',
      '🍹 **Thirsty?...**'
    ];

    for (const frame of suspenseFrames) {
      await interaction.editReply({ content: frame, embeds: [], components: [] });
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Commercial Break Minigame (0.5% chance = 1 in 200)
  const commercialChance = Math.random();
  if (commercialChance < 0.005) {
    const commercialEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📺 Commercial Break')
      .setDescription(
        '**We\'ll be right back after these messages from our sponsors!**\n\n' +
        '[Watch the commercial](https://www.youtube.com/watch?v=IVXHRuiFmx4)\n\n' +
        '⏰ **You have 10 seconds to click "Continue" or you\'ll timeout!**'
      )
      .setImage('https://i.ytimg.com/vi/IVXHRuiFmx4/hq720.jpg?sqp=-oaymwFBCNAFEJQDSFryq4qpAzMIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB8AEB-AH-CYAC0AWKAgwIABABGGMgYyhjMA8=&rs=AOn4CLDN3UndJPvPejLat0QtkxVnTGFAng');

    const commercialButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('commercial_continue')
          .setLabel('Continue Watching')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.editReply({ content: '', embeds: [commercialEmbed], components: [commercialButton] });

    // Create collector with 10 second timeout
    const filter = i => i.customId === 'commercial_continue' && i.user.id === game.userId;
    const collector = interaction.channel.createMessageCollector({ 
      filter: m => m.author.id === game.userId,
      time: 10000 
    });

    // Wait for button click or timeout
    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.customId === 'commercial_continue' && i.user.id === game.userId,
        time: 10000
      });

      // Success - they clicked in time
      await buttonInteraction.update({
        content: '✅ **Commercial complete!** Thanks for watching!',
        embeds: [],
        components: []
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      // Timeout - they didn't click in time
      await interaction.editReply({
        content: '⏰ **COMMERCIAL TIMEOUT!** You took too long to respond!',
        embeds: [],
        components: []
      });
      
      // COMMERCIAL_TIMEOUT achievement
      await towerAchievements.awardAchievement('COMMERCIAL_TIMEOUT', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Random excitement/warning messages (10% chance)
  const messageChance = Math.random();
  if (messageChance < 0.1) {
    // Determine if good or bad outcome
    const isGoodOutcome =
      chosenAmount.type === 'cash' && chosenAmount.value > 0 ||
      chosenAmount.type === 'percentage' && chosenAmount.value > 0 ||
      (chosenAmount.type === 'event' && !['game_over'].includes(chosenAmount.action)) ||
      (chosenAmount.type === 'special' && chosenAmount.label && !chosenAmount.label.includes('X Level'));

    let randomMessage = '';
    if (isGoodOutcome) {
      randomMessage = Math.random() < 0.5 ? '✨ **CHANCE!**' : '🌈 **AMAZING!**';
    } else {
      randomMessage = Math.random() < 0.5 ? '⚠️ **WARNING**' : '🚨 **DANGER**';
    }

    await interaction.editReply({ content: randomMessage, embeds: [], components: [] });
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Show Broken Compass forced choice message
  if (wasForcedChoice) {
    const choiceText = actualChoice === 'left' ? '⬅️ LEFT' : '➡️ RIGHT';
    const chosenDisplay = game.getDisplayValue(chosenAmount);
    const lostDisplay = game.getDisplayValue(lostAmount);
    await interaction.editReply({
      content: `🧭 **BROKEN COMPASS!**\n\nThe system randomly selected: **${choiceText}**\n\n**You got:** ${chosenDisplay}\n**You avoided:** ${lostDisplay}\n\nRevealing results...`,
      embeds: [],
      components: []
    });
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  // Show partial result
  await interaction.editReply({ content: '', embeds: [partialEmbed], components: [] });

  // Wait for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Note: Result embed is shown in the followUp call below with the continue button

  // Track pick correctness for achievements
  const isIncorrectPick = appliedAmount === 'GAME_OVER' || (typeof appliedAmount === 'number' && appliedAmount < 0);
  if (isIncorrectPick) {
    AchievementHelper.trackIncorrectPick(game);
  } else {
    AchievementHelper.trackCorrectPick(game);
  }

  // Check floor completion achievements
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'floor_complete');
  
  // Reset floor specific tracking for next floor
  AchievementHelper.resetFloorTracking(game);

  // Move to next floor after choice is made and result is shown
  game.moveToNextFloor();

  // Handle special actions (minigames/events) - show result first before starting
  if (chosenAmount.type === 'event' || chosenAmount.type === 'special') {
    if (chosenAmount.action === 'vault') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleVaultMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'operator_offer') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleOperatorOffer(interaction, game);
      return;
    } else if (chosenAmount.action === 'mega_grid') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleMegaGridMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'infinity_percent') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleInfinityPercentMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'hideout_breakthrough') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleHideoutBreakthroughMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'babushka') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleBabushkaMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'boiling_point') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleBoilingPointMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'operator_roshambo') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleOperatorRoshamboMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'mystery_box') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleMysteryBoxMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'door_escape') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleDoorEscapeMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'mart_of_cash') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleMartOfCashMinigame(interaction, game);
      return;
    } else if (chosenAmount.action === 'laser_infiltration') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleLaserInfiltration(interaction, game);
      return;
    } else if (chosenAmount.action === 'blind_auction') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleBlindAuction(interaction, game);
      return;
    } else if (chosenAmount.action === 'bomb_defusal') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleBombDefusal(interaction, game);
      return;
    } else if (chosenAmount.action === 'high_roller_blackjack') {
      await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleHighRollerBlackjack(interaction, game);
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
    // Check for Basement Mode setting
    const gameOverMode = await db.getGameOverMode(game.guildId);
    if (gameOverMode === 'basement') {
      await handleBasementMinigame(interaction, game);
    } else {
      // Pass totalMoney as lost amount (they lose everything)
      await endGame(interaction, game, 'game_over_tile', 0, game.totalMoney);
    }
    return;
  }

  // Check if player has $0 on the last floor of a round (after Round 1) - Game Over
  const isLastFloorInRound = game.currentFloor >= game.selectedFloors.length - 1;
  if (game.totalMoney <= 0 && game.currentRound > 1 && isLastFloorInRound) {
    // Pass moneyBefore as lost amount (since totalMoney is 0)
    await endGame(interaction, game, 'no_money', 0, moneyBefore);
    return;
  }

  // X Level - mark that the last floor will be skipped (using info from applyAmount)
  if (chosenAmount.type === 'special' && chosenAmount.action === 'x_level') {
    if (appliedAmount.skippedFloorContent) {
      // Store the skipped floor information (already extracted in applyAmount)
      game.xLevelSkippedFloor = appliedAmount.skippedFloorContent;

      // Mark the amounts from skipped floor as used/removed
      const leftKey = game.getAmountKey(appliedAmount.skippedFloorContent.left);
      const rightKey = game.getAmountKey(appliedAmount.skippedFloorContent.right);
      if (game.remainingAmounts[leftKey]) {
        game.remainingAmounts[leftKey].count--;
      }
      if (game.remainingAmounts[rightKey]) {
        game.remainingAmounts[rightKey].count--;
      }
      
      // X_LEVEL_FIRST_PICK - hit X-Level on first pick of the floor
      if (game.currentFloor === 0) {
        await towerAchievements.awardAchievement('X_LEVEL_FIRST_PICK', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
      }
      
      // X_LEVEL_DEATH - eliminated by X-Level (no more floors left)
      if (game.selectedFloors.length === 0) {
        await towerAchievements.awardAchievement('X_LEVEL_DEATH', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
      }
    } else {
      // Last floor in round - nothing happens
      game.xLevelSkippedFloor = null;
    }
  }

  // Replace suspense embed with final result (so history shows the result, not ❓❓❓)
  await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

  // Continue via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

async function handleContinue(interaction, game) {
  // Defer update immediately to prevent timeout errors
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

  // If we are in selection phase (e.g. after Lightning Round), show floor selection
  if (game.isSelectingFloors) {
    const embed = GameUI.createFloorSelectionEmbed(game);
    const buttons = GameUI.createFloorSelectionButtons(game);
    await interaction.editReply({ embeds: [embed], components: buttons });
    return;
  }

  // Check if round is complete
  if (game.isRoundComplete()) {
    // Show X-Level skipped floor if there is one
    let showedXLevel = false;
    if (game.xLevelSkippedFloor) {
      const skippedEmbed = GameUI.createSkippedFloorsEmbed([game.xLevelSkippedFloor]);
      await interaction.editReply({ embeds: [skippedEmbed], components: [] });

      // Wait for user to see it
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Clear the flag
      game.xLevelSkippedFloor = null;
      showedXLevel = true;
    }

    // Check if game is complete
    if (game.isGameComplete()) {
      // Save to database
      await db.updatePlayerStats(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, true);
      await db.saveGameHistory(game.userId, interaction.guildId, game.username, game.totalMoney, game.floorsCompleted, 'completed');

      // Prepare validation data for achievement archival
      const validationData = {
        money: game.totalMoney,
        floor: game.floorsCompleted,
        gameCompleted: true
      };

      // Award milestone achievements with validation
      await towerAchievements.awardAchievement('FIRST_WIN', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      
      // Money achievements with validation
      if (game.totalMoney >= 1000000) {
        await towerAchievements.awardAchievement('MILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 5000000) {
        await towerAchievements.awardAchievement('MULTI_MILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 10000000) {
        await towerAchievements.awardAchievement('MEGA_RICH', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 100000000) {
        await towerAchievements.awardAchievement('ULTRA_RICH', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 1000000000) {
        await towerAchievements.awardAchievement('BILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 10000000000) {
        await towerAchievements.awardAchievement('MEGA_BILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 100000000000) {
        await towerAchievements.awardAchievement('ULTRA_BILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 1000000000000) {
        await towerAchievements.awardAchievement('TRILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 10000000000000) {
        await towerAchievements.awardAchievement('MEGA_TRILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.totalMoney >= 100000000000000) {
        await towerAchievements.awardAchievement('ULTRA_TRILLIONAIRE', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      
      // Floor achievements with validation
      if (game.floorsCompleted >= 10) {
        await towerAchievements.awardAchievement('FLOOR_10', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.floorsCompleted >= 20) {
        await towerAchievements.awardAchievement('FLOOR_20', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.floorsCompleted >= 30) {
        await towerAchievements.awardAchievement('FLOOR_30', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.floorsCompleted >= 40) {
        await towerAchievements.awardAchievement('FLOOR_40', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }
      if (game.floorsCompleted >= 50) {
        await towerAchievements.awardAchievement('FLOOR_50', game.userId, game.username, interaction.guildId, interaction.channel, validationData);
      }

      // Show completion message
      const endEmbed = GameUI.createGameEndEmbed(game, 'completed', game.totalMoney);

      // Use followUp if we already showed X-Level skip, otherwise update
      if (showedXLevel) {
        await interaction.followUp({ embeds: [endEmbed], components: [] });
      } else {
        await interaction.editReply({ embeds: [endEmbed], components: [] });
      }

      // End the game
      gameManager.endGame(interaction.channelId);
      return;
    }

    // Check if player just completed Round 3 - trigger Go Big or Go Broke!
    if (game.currentRound === 3 && !game.hasPlayedGoBigOrGoBroke) {
      game.hasPlayedGoBigOrGoBroke = true; // Mark as played so it doesn't repeat
      
      // Award Round 3 completion achievement
      await towerAchievements.awardAchievement('ROUND_3_CHAMPION', game.userId, game.username, interaction.guildId, interaction.channel, { 
        floorsCompleted: game.floorsCompleted,
        totalMoney: game.totalMoney 
      });
      
      // Show dramatic announcement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use followUp if we already showed X-Level skip, otherwise update
      if (showedXLevel) {
        await interaction.followUp({ 
          content: '⚡ **SPECIAL EVENT UNLOCKED!** ⚡\n\n🎊 You survived Round 3 without Game Over!\n\n💥 Prepare for... **GO BIG OR GO BROKE!**',
          components: []
        });
      } else {
        await interaction.editReply({ 
          content: '⚡ **SPECIAL EVENT UNLOCKED!** ⚡\n\n🎊 You survived Round 3 without Game Over!\n\n💥 Prepare for... **GO BIG OR GO BROKE!**',
          embeds: [],
          components: []
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start the minigame (round end decision will show after minigame completes via continueGameAfterMinigame)
      await handleGoBigOrGoBrokeMinigame(interaction, game);
      return; // Exit here - don't show round end embed yet
    }

    // Show round end decision (player can choose to continue or stop)
    // This will NOT show after Round 3 because we return above after Go Big or Go Broke
    const roundEndEmbed = GameUI.createRoundEndEmbed(game);
    const roundEndButtons = GameUI.createRoundEndButtons(game);

    // Use followUp if we already showed X-Level skip, otherwise update
    if (showedXLevel) {
      await interaction.followUp({ embeds: [roundEndEmbed], components: roundEndButtons });
    } else {
      await interaction.editReply({ embeds: [roundEndEmbed], components: roundEndButtons });
    }
  } else {
    // Next floor in current round
    await startCurrentFloorOrBoss(interaction, game);
  }
}

// Continue game after minigame completes
async function continueGameAfterMinigame(interaction, game) {
  // Check if game is over (player has no money left on last floor after Round 1)
  const isLastFloorInRound = game.currentFloor >= game.selectedFloors.length - 1;
  if (game.totalMoney <= 0 && game.currentRound > 1 && isLastFloorInRound) {
    // Save to database
    await db.updatePlayerStats(game.userId, interaction.guildId, game.username, 0, game.floorsCompleted, false);
    await db.saveGameHistory(game.userId, interaction.guildId, game.username, 0, game.floorsCompleted, 'no_money');
    await db.addLostMoney(game.guildId, 0);

    // Show game over message
    const endEmbed = GameUI.createGameEndEmbed(game, 'no_money', 0);
    await interaction.followUp({ embeds: [endEmbed], components: [] });

    // End the game
    gameManager.endGame(interaction.channelId);
    return;
  }

  // CHECK FOR PENDING MART REWARDS (from robbery) - If there are pending rewards, continue processing them
  if (game.pendingMartRewards && (game.pendingMartRewards.minigames.length > 0 || game.pendingMartRewards.mysteryBox)) {
    await continueRobberyRewards(interaction, game);
    return;
  }

  // CHECK FOR PENDING PURCHASE ITEMS - If there are more items to process, continue processing them
  if (game.pendingPurchaseItems && game.pendingPurchaseItems.currentIndex < game.pendingPurchaseItems.items.length) {
    await processMartItems(interaction, game, null); // Pass null since state is already stored
    return;
  }

  // Check if this is after Go Big or Go Broke (Round 3 completion)
  if (game.hasPlayedGoBigOrGoBroke && game.isRoundComplete() && !game.isGameComplete()) {
    // Show round end decision (player can choose to continue or stop)
    const roundEndEmbed = GameUI.createRoundEndEmbed(game);
    const roundEndButtons = GameUI.createRoundEndButtons(game);
    await interaction.followUp({ embeds: [roundEndEmbed], components: roundEndButtons });
    return;
  }

  // Show continue button to move to next floor
  const continueButtons = GameUI.createContinueButton();
  await interaction.followUp({ content: '➡️ **Continue to next floor...**', components: continueButtons });
}

async function handleContinueToNextRound(interaction, game) {
  // Check if Season 2 and going into Round 2+ (and not past final round)
  if (game.isSeason2 && game.currentRound < 8) {
    const pactEmbed = AscentPacts.createPactEmbed(game.currentRound + 1);
    const pactButtons = AscentPacts.createPactButtons();
    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ embeds: [pactEmbed], components: pactButtons });
    } else {
      return interaction.update({ embeds: [pactEmbed], components: pactButtons });
    }
  }

  // Start next round
  game.startNewRound();
  const embed = GameUI.createFloorSelectionEmbed(game);
  const buttons = GameUI.createFloorSelectionButtons(game);
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

// ==================== SEASON 2: GUARDIAN BOSS FLOORS & MINIGAMES ====================

async function startCurrentFloorOrBoss(interaction, game) {
  const floorNumber = game.getCurrentFloorNumber();

  // Check if Season 2 Guardian Boss Floor (10, 20, 30)
  if (game.isSeason2 && [10, 20, 30].includes(floorNumber)) {
    if (floorNumber === 10) {
      game.bossFloorState = BossFloors.startArchitectBoss(game.userId, game.username, game.totalMoney);
      const embed = BossFloors.createArchitectEmbed(game.bossFloorState);
      const buttons = BossFloors.createArchitectButtons(game.bossFloorState);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ embeds: [embed], components: buttons });
      } else {
        return interaction.update({ embeds: [embed], components: buttons });
      }
    } else if (floorNumber === 20) {
      game.bossFloorState = BossFloors.startLoanSharkBoss(game.userId, game.username, game.totalMoney);
      const embed = BossFloors.createLoanSharkEmbed(game.bossFloorState);
      const buttons = BossFloors.createLoanSharkButtons(game.bossFloorState);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ embeds: [embed], components: buttons });
      } else {
        return interaction.update({ embeds: [embed], components: buttons });
      }
    } else if (floorNumber === 30) {
      game.bossFloorState = BossFloors.startGrandOperatorBoss(game.userId, game.username, game.totalMoney);
      const embed = BossFloors.createOperatorEmbed(game.bossFloorState);
      const buttons = BossFloors.createOperatorButtons(game.bossFloorState);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ embeds: [embed], components: buttons });
      } else {
        return interaction.update({ embeds: [embed], components: buttons });
      }
    }
  }

  // Normal Floor Choices
  const choices = gameManager.generateFloorChoices(game);
  game.currentFloorChoices = choices;

  const embed = GameUI.createFloorChoiceEmbed(game, floorNumber, choices);
  const buttons = GameUI.createFloorChoiceButtons();
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: buttons });
  } else {
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

// Floor 10 Boss: The Architect
async function handleS2ArchitectNode(interaction, game, nodeIndex) {
  if (!game || !game.bossFloorState) return;
  BossFloors.playArchitectNode(game.bossFloorState, nodeIndex);
  const embed = BossFloors.createArchitectEmbed(game.bossFloorState);
  const buttons = BossFloors.createArchitectButtons(game.bossFloorState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2BossArchitectContinue(interaction, game) {
  if (!game || !game.bossFloorState) return;
  if (game.bossFloorState.won) {
    game.totalMoney += 1500000;
    if (!game.activeEffects) game.activeEffects = [];
    game.activeEffects.push({ type: 'revealNext2', duration: 2, floorsRemaining: 2 });
  }
  game.bossFloorState = null;
  game.floorsCompleted++;
  game.moveToNextFloor();
  await continueGameAfterMinigame(interaction, game);
}

// Floor 20 Boss: The Loan Shark
async function handleS2SharkRoll(interaction, game, strategy) {
  if (!game || !game.bossFloorState) return;
  BossFloors.playLoanSharkRoll(game.bossFloorState, strategy);
  const embed = BossFloors.createLoanSharkEmbed(game.bossFloorState);
  const buttons = BossFloors.createLoanSharkButtons(game.bossFloorState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2BossSharkContinue(interaction, game) {
  if (!game || !game.bossFloorState) return;
  const state = game.bossFloorState;
  if (state.won) {
    game.totalMoney += state.collateral;
    if (!game.activeEffects) game.activeEffects = [];
    game.activeEffects.push({ type: 'tax_immunity', duration: 5, floorsRemaining: 5 });
  } else {
    game.totalMoney = Math.max(0, game.totalMoney - state.collateral);
  }
  game.bossFloorState = null;
  game.floorsCompleted++;
  game.moveToNextFloor();
  await continueGameAfterMinigame(interaction, game);
}

// Floor 30 Boss: The Grand Operator
async function handleS2OperatorPick(interaction, game, vaultIndex) {
  if (!game || !game.bossFloorState) return;
  BossFloors.playOperatorVault(game.bossFloorState, vaultIndex);
  const embed = BossFloors.createOperatorEmbed(game.bossFloorState);
  const buttons = BossFloors.createOperatorButtons(game.bossFloorState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2BossOperatorContinue(interaction, game) {
  if (!game || !game.bossFloorState) return;
  const state = game.bossFloorState;
  if (state.selectedVault) {
    if (state.selectedVault.type === 'jackpot') game.totalMoney += state.selectedVault.value;
    else if (state.selectedVault.type === 'safe') game.totalMoney += state.selectedVault.value;
    else if (state.selectedVault.type === 'trap') game.totalMoney = Math.floor(game.totalMoney * 0.5);
  }
  game.bossFloorState = null;
  game.floorsCompleted++;
  game.moveToNextFloor();
  await continueGameAfterMinigame(interaction, game);
}

// Season 2 Minigame: Laser Infiltration
async function handleLaserInfiltration(interaction, game) {
  game.season2MinigameState = Season2Minigames.startLaserInfiltration(game.userId, game.username, game.totalMoney);
  const embed = Season2Minigames.createLaserGridEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createLaserButtons(game.season2MinigameState);
  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleS2LaserStep(interaction, game, colIndex) {
  if (!game || !game.season2MinigameState) return;
  Season2Minigames.playLaserStep(game.season2MinigameState, colIndex);
  const embed = Season2Minigames.createLaserGridEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createLaserButtons(game.season2MinigameState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2LaserContinue(interaction, game) {
  if (!game || !game.season2MinigameState) return;
  const state = game.season2MinigameState;
  if (state.won) {
    game.totalMoney += 5000000;
  } else if (state.busted) {
    game.totalMoney = Math.floor(game.totalMoney * 0.5);
  }
  game.season2MinigameState = null;
  await continueGameAfterMinigame(interaction, game);
}

// Season 2 Minigame: The Blind Auction
async function handleBlindAuction(interaction, game) {
  game.season2MinigameState = Season2Minigames.startBlindAuction(game.userId, game.username, game.totalMoney);
  const embed = Season2Minigames.createAuctionEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createAuctionButtons(game.season2MinigameState);
  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleS2AuctionBid(interaction, game, bidAmount) {
  if (!game || !game.season2MinigameState) return;
  Season2Minigames.submitAuctionBid(game.season2MinigameState, bidAmount);
  const embed = Season2Minigames.createAuctionEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createAuctionButtons(game.season2MinigameState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2AuctionContinue(interaction, game) {
  if (!game || !game.season2MinigameState) return;
  const state = game.season2MinigameState;
  if (state.won) {
    game.totalMoney = Math.max(0, game.totalMoney - state.playerBid);
    if (!game.activeEffects) game.activeEffects = [];
    if (state.relic.id === 'golden_aegis') {
      game.activeEffects.push({ type: 'gameOverImmunity', duration: 3, floorsRemaining: 3 });
    } else if (state.relic.id === 'overdrive') {
      game.activeEffects.push({ type: 'tripleNextFloor', duration: 1, floorsRemaining: 1 });
    } else if (state.relic.id === 'xray_monocle') {
      game.activeEffects.push({ type: 'revealNext2', duration: 2, floorsRemaining: 2 });
    } else if (state.relic.id === 'tax_haven') {
      game.activeEffects.push({ type: 'tax_immunity', duration: 5, floorsRemaining: 5 });
    }
  }
  game.season2MinigameState = null;
  await continueGameAfterMinigame(interaction, game);
}

// Season 2 Minigame: Bomb Defusal
async function handleBombDefusal(interaction, game) {
  game.season2MinigameState = Season2Minigames.startBombDefusal(game.userId, game.username, game.totalMoney);
  const embed = Season2Minigames.createBombDefusalEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createBombDefusalButtons(game.season2MinigameState);
  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleS2BombCut(interaction, game, wireIndex) {
  if (!game || !game.season2MinigameState) return;
  Season2Minigames.cutWire(game.season2MinigameState, wireIndex);
  const embed = Season2Minigames.createBombDefusalEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createBombDefusalButtons(game.season2MinigameState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2BombContinue(interaction, game) {
  if (!game || !game.season2MinigameState) return;
  const state = game.season2MinigameState;
  if (state.won) {
    game.totalMoney += 2500000;
    if (!game.activeEffects) game.activeEffects = [];
    game.activeEffects.push({ type: 'gameOverImmunity', duration: 3, floorsRemaining: 3 });
  } else if (state.busted) {
    game.totalMoney = 0;
  }
  game.season2MinigameState = null;
  await continueGameAfterMinigame(interaction, game);
}

// Season 2 Minigame: High Roller Blackjack
async function handleHighRollerBlackjack(interaction, game) {
  game.season2MinigameState = Season2Minigames.startBlackjack(game.userId, game.username, game.totalMoney);
  const embed = Season2Minigames.createBlackjackEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createBlackjackButtons(game.season2MinigameState);
  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleS2BlackjackAction(interaction, game, action) {
  if (!game || !game.season2MinigameState) return;
  Season2Minigames.playBlackjackAction(game.season2MinigameState, action);
  const embed = Season2Minigames.createBlackjackEmbed(game.season2MinigameState);
  const buttons = Season2Minigames.createBlackjackButtons(game.season2MinigameState);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleS2BlackjackContinue(interaction, game) {
  if (!game || !game.season2MinigameState) return;
  const state = game.season2MinigameState;
  if (state.won) {
    game.totalMoney = game.totalMoney * 2; // +100% Cash!
  } else if (state.busted || (!state.push && !state.won)) {
    game.totalMoney = Math.floor(game.totalMoney * 0.65); // Lose 35%!
  }
  game.season2MinigameState = null;
  await continueGameAfterMinigame(interaction, game);
}

// Season 2: Ascent Pact Selection
async function handleS2PactSelect(interaction, game, pactId) {
  if (!game) return;
  AscentPacts.applyPact(game, pactId);
  game.startNewRound();
  const embed = GameUI.createFloorSelectionEmbed(game);
  const buttons = GameUI.createFloorSelectionButtons(game);
  await interaction.update({ embeds: [embed], components: buttons });
}

// Minigame Master Slash & Button Handlers
async function handleMinigameMasterCommand(interaction) {
  const mode = (interaction.options && interaction.options.getString('mode')) || 'multi';
  const channelId = interaction.channelId;

  if (minigameMasterSessions.has(channelId)) {
    return interaction.reply({ content: '❌ A Minigame Master session is already active in this channel!', ephemeral: true });
  }

  const session = new MinigameMasterSession(channelId, interaction.guildId, {
    id: interaction.user.id,
    username: interaction.user.username
  }, mode === 'solo');
  minigameMasterSessions.set(channelId, session);

  if (mode === 'solo') {
    session.startRound1();
    const embed = session.createRoundEmbed();
    const buttons = session.createRoundButtons();
    return interaction.reply({ embeds: [embed], components: buttons });
  }

  const embed = session.createLobbyEmbed();
  const buttons = session.createLobbyButtons();
  await interaction.reply({ embeds: [embed], components: buttons });
}

async function handleS2MGMAction(interaction, action) {
  const session = minigameMasterSessions.get(interaction.channelId);
  if (!session) {
    return interaction.reply({ content: '❌ No active Minigame Master session in this channel!', ephemeral: true });
  }

  if (action === 'join') {
    const res = session.addPlayer(interaction.user.id, interaction.user.username);
    if (!res) return interaction.reply({ content: '❌ You are already registered in this tournament!', ephemeral: true });
    const embed = session.createLobbyEmbed();
    const buttons = session.createLobbyButtons();
    return interaction.update({ embeds: [embed], components: buttons });
  } else if (action === 'leave') {
    session.removePlayer(interaction.user.id);
    const embed = session.createLobbyEmbed();
    const buttons = session.createLobbyButtons();
    return interaction.update({ embeds: [embed], components: buttons });
  } else if (action === 'start') {
    if (session.host.id !== interaction.user.id) {
      return interaction.reply({ content: '❌ Only the host can start the tournament!', ephemeral: true });
    }
    const res = session.startRound1();
    if (!res.success) return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
    const embed = session.createRoundEmbed();
    const buttons = session.createRoundButtons();
    return interaction.update({ embeds: [embed], components: buttons });
  } else if (action === 'play') {
    if (session.currentMinigameIndex >= session.roundMinigames.length) {
      return interaction.reply({ content: '⚠️ All minigames for this round have been played! Click Proceed to Next Round.', ephemeral: true });
    }
    const minigameType = session.roundMinigames[session.currentMinigameIndex];

    const baseRewards = [50000, 100000, 200000, 350000, 500000, 750000, 1000000];
    const earned = baseRewards[Math.floor(Math.random() * baseRewards.length)];
    session.recordGameEarnings(interaction.user.id, minigameType, earned);
    session.currentMinigameIndex++;

    const roundMulti = session.round === 2 ? 2 : (session.round === 3 ? 3 : 1);
    const totalEarnedWithMulti = earned * roundMulti;

    const embed = session.createRoundEmbed();
    const buttons = session.createRoundButtons();

    await interaction.reply({
      content: `🎉 **${interaction.user.username}** challenged **${minigameType.replace(/_/g, ' ').toUpperCase()}** and banked **$${totalEarnedWithMulti.toLocaleString()}** (Base: $${earned.toLocaleString()} x ${roundMulti})!`,
    });
    try {
      await interaction.message.edit({ embeds: [embed], components: buttons });
    } catch (editErr) {
      console.error('Error updating MGM round message:', editErr);
    }
  } else if (action === 'next_round' || action === 'round2' || action === 'round3') {
    if (session.round === 1) {
      session.advanceToRound2();
    } else if (session.round === 2) {
      session.advanceToRound3();
    } else {
      const summaryEmbed = session.createRoundSummaryEmbed(3);
      minigameMasterSessions.delete(interaction.channelId);
      return interaction.update({
        content: '🏆 **TOURNAMENT COMPLETE!** Hail the Minigame Master Champion!',
        embeds: [summaryEmbed],
        components: []
      });
    }
    const embed = session.createRoundEmbed();
    const buttons = session.createRoundButtons();
    return interaction.update({ embeds: [embed], components: buttons });
  } else if (action === 'standings') {
    const summaryEmbed = session.createRoundSummaryEmbed(session.round);
    return interaction.reply({ embeds: [summaryEmbed], ephemeral: true });
  } else if (action === 'close') {
    const summaryEmbed = session.createRoundSummaryEmbed(session.round);
    minigameMasterSessions.delete(interaction.channelId);
    return interaction.update({
      content: '🏆 **Tournament Concluded!** Thank you for playing Minigame Master!',
      embeds: [summaryEmbed],
      components: []
    });
  }
}

async function handleClearCommand(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const amount = interaction.options.getInteger('amount') || 100;

    // Check if channel is bulk deletable
    if (!interaction.channel || typeof interaction.channel.bulkDelete !== 'function') {
      return interaction.editReply({ content: '❌ Bulk delete is not available in this channel (DMs/Threads).' });
    }

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
    await db.resetGuildProgress(interaction.guildId);
    await db.resetBigBank(interaction.guildId);

    await interaction.editReply({
      content: '✅ **Server progress has been reset!**\n• All player stats cleared\n• Daily plays reset\n• Game history cleared\n• Big Bank reset to $0\n\n*Everyone can start fresh!*',
      flags: 64
    });
  } catch (error) {
    console.error('Error resetting progress:', error);
    await interaction.editReply({
      content: '❌ Failed to reset progress. Please try again.',
      flags: 64
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
    if (!member) {
      return interaction.editReply({ content: '❌ This command must be used in a server.' });
    }
    const hasOwnerRole = member.roles ? member.roles.cache.some(role => role.name === '💻 Owner') : false;
    const hasAdminPerm = member.permissions ? member.permissions.has('Administrator') : false;

    if (!hasOwnerRole && !hasAdminPerm) {
      return interaction.editReply({
        content: '❌ You need the 💻 Owner role or Administrator permission to use this command.'
      });
    }

    const channel = interaction.options.getChannel('channel');
    const action = interaction.options.getString('action');
    const guildId = interaction.guildId;

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

    const guildId = interaction.guildId;
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
    const guildId = interaction.guildId;

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
    const guildId = interaction.guildId;

    await db.setEventMode(guildId, action);

    if (action === 'season2' || action === '2' || action === 2) {
      await interaction.editReply({ content: '🌟 **Season 2 (The Apex Tower) enabled!** Games now feature 30 floors, Roguelike Ascent Pacts, Guardian Boss encounters (Floors 10, 20, 30), and Elite Minigames!' });
    } else if (action === 'minigame_master' || action === '3' || action === 3) {
      await interaction.editReply({ content: '🎮 **Minigame Master Mode enabled!** Games in this server will now launch the Minigame Master Gauntlet Tournament!' });
    } else if (action === 'enable' || action === '1' || action === 1 || action === 'season1') {
      await interaction.editReply({ content: '✨ **Season 1 enabled!** Games now feature 30 floors and classic event tiles.' });
    } else {
      await interaction.editReply({ content: '🎯 **Normal Mode enabled!** Games will run in standard 21-floor mode.' });
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
  const collector = interaction.channel.createMessageCollector({ filter, time: 600000 }); // 5 minutes

  collector.on('collect', async (message) => {
    // Check if vault state still exists (might have been cleared)
    if (!game.vaultState) {
      collector.stop('cancelled');
      return;
    }

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

    // Show animation
    const animMsg = await message.channel.send('**Turning dials...** 🔒');
    await new Promise(resolve => setTimeout(resolve, 500));
    await animMsg.edit('**Turning dials...** 🔓');
    await new Promise(resolve => setTimeout(resolve, 500));
    await animMsg.edit('**Turning dials...** 💰');
    await new Promise(resolve => setTimeout(resolve, 500));
    await animMsg.delete();

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

      // Achievement Tracking
      AchievementHelper.trackVault(game, true, game.vaultState.attempts.length, rewardResult.display || 'Reward');
      await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

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

      // Achievement Tracking
      AchievementHelper.trackVault(game, false, game.vaultState.maxAttempts);
      await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

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
      // Reveal a random game over floor from ALL floors in the game
      const gameOverFloors = Object.keys(game.preGeneratedFloors)
        .map(key => ({ floor: game.preGeneratedFloors[key], number: parseInt(key) }))
        .filter(f =>
          f.floor && (f.floor.left.type === 'game_over' || f.floor.right.type === 'game_over')
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
  // 1% chance for auto-decline scenario
  const isAutoDecline = Math.random() < 0.01;

  if (isAutoDecline) {
    // Random scenarios for auto-declining
    const scenarios = [
      {
        emoji: '🚫',
        title: 'Scam Call Detected!',
        reason: '**You think the caller is a call center scam...**',
        action: '*You declined the offer call without listening!*'
      },
      {
        emoji: '📵',
        title: 'Wrong Number!',
        reason: '**The operator dialed the wrong number...**',
        action: '*Call disconnected before you could answer!*'
      },
      {
        emoji: '😴',
        title: 'Fell Asleep!',
        reason: '**You dozed off while climbing...**',
        action: '*You missed the call entirely!*'
      },
      {
        emoji: '🔇',
        title: 'Phone on Silent!',
        reason: '**Your phone was on silent mode...**',
        action: '*You never heard it ring!*'
      },
      {
        emoji: '🔋',
        title: 'Battery Died!',
        reason: '**Your phone battery just died...**',
        action: '*Call failed to connect!*'
      },
      {
        emoji: '🎵',
        title: 'Listening to Music!',
        reason: '**You were jamming to your favorite song...**',
        action: '*Too loud to hear the phone ring!*'
      }
    ];

    // Pick random scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    const autoDeclineEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle(`📞 OPERATOR CALLING...`)
      .setDescription(
        `${scenario.emoji} **${scenario.title}**\n\n` +
        `${scenario.reason}\n\n` +
        `${scenario.action}\n\n` +
        '**No offer received.**'
      )
      .setFooter({ text: 'Better luck next time!' });

    await interaction.followUp({ embeds: [autoDeclineEmbed] });

    // Continue game after short delay
    setTimeout(async () => {
      await continueAfterEvent(interaction, game);
    }, 2000);
    return; // Exit, game will continue normally
  }

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

  // Continue via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

async function handleVaultSubmit(interaction, game) {
  // This is a placeholder - actual vault logic is handled by message collector
  await interaction.reply({ content: `✅ Big Bank set to $${amount.toLocaleString()}!`, ephemeral: true });
}

async function handleTestMinigameCommand(interaction) {
  const gameName = interaction.options.getString('game');

  // Create a test game instance
  const testGame = new GameState(interaction.user.id, interaction.user.username);
  testGame.totalMoney = 100000; // Start with $100k for testing
  testGame.guildId = interaction.guildId;
  testGame.channelId = interaction.channelId;

  // Register game in manager so button interactions work
  gameManager.activeGames.set(interaction.channelId, testGame);

  await interaction.deferReply();

  // Launch the appropriate minigame
  try {
    switch (gameName) {
      case 'community_chest':
        await handleCommunityChestMinigame(interaction, testGame);
        break;
      case 'park_it':
        await handleParkItMinigame(interaction, testGame);
        break;
      case 'advance_boardwalk':
        await handleAdvanceBoardwalkMinigame(interaction, testGame);
        break;
      case 'bank_buster':
        await handleBankBusterMinigame(interaction, testGame);
        break;
      case 'block_party':
        await handleBlockPartyMinigame(interaction, testGame);
        break;
      case 'power_grid':
        await handlePowerGridMinigame(interaction, testGame);
        break;
      case 'no_vacancy':
        await handleNoVacancyMinigame(interaction, testGame);
        break;
      case 'ride_rails':
        await handleRideRailsMinigame(interaction, testGame);
        break;
      case 'laser_infiltration':
        await handleLaserInfiltration(interaction, testGame);
        break;
      case 'blind_auction':
        await handleBlindAuction(interaction, testGame);
        break;
      case 'bomb_defusal':
        await handleBombDefusal(interaction, testGame);
        break;
      case 'high_roller_blackjack':
        await handleHighRollerBlackjack(interaction, testGame);
        break;
      default:
        await interaction.editReply({ content: '❌ Invalid minigame selected!', ephemeral: true });
        return;
    }
  } catch (error) {
    console.error('Error launching test minigame:', error);
    await interaction.editReply({ content: '❌ Error launching minigame!', ephemeral: true });
  }
}

async function handleTestBasementCommand(interaction) {
  // Create a test game instance with 0 money
  const testGame = new GameState(interaction.user.id, interaction.user.username);
  testGame.totalMoney = 0; // No money - triggers special basement message
  testGame.guildId = interaction.guildId;
  testGame.channelId = interaction.channelId;
  testGame.currentRound = 2;
  testGame.floorsCompleted = 8;
  
  // Initialize achievement tracking
  testGame.achievementTracking = {
    peeksUsed: 0,
    xLevelsSurvived: 0,
    minigamesPlayed: []
  };

  // Register game in manager so button interactions work
  gameManager.activeGames.set(interaction.channelId, testGame);

  await interaction.deferReply();

  // Show test mode message
  await interaction.editReply({ 
    content: '💀 **TEST MODE: Game Over with $0**\n\n**Current Money:** $0\n**Floors Completed:** 8\n\nTriggering basement scenario...'
  });
  
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Trigger basement minigame (will show special message for 0 money)
  await handleBasementMinigame(interaction, testGame);
}

async function handleTestSanghaCommand(interaction) {
  // Create a test game instance
  const testGame = new GameState(interaction.user.id, interaction.user.username);
  testGame.totalMoney = 500000; // Start with $500k for testing
  testGame.guildId = interaction.guildId;
  testGame.channelId = interaction.channelId;
  testGame.currentRound = 2;
  testGame.floorsCompleted = 10;
  
  // Initialize achievement tracking
  testGame.achievementTracking = {
    peeksUsed: 0,
    xLevelsSurvived: 0,
    minigamesPlayed: []
  };

  // Register game in manager so button interactions work
  gameManager.activeGames.set(interaction.channelId, testGame);

  await interaction.deferReply();

  // Show test mode message
  await interaction.editReply({ 
    content: '🧪 **TEST MODE: Sangha Offerings**\n\n🙏 Testing divine blessing item...\n\n**Current Money:** $500,000\n**Floors Completed:** 10'
  });
  
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Show the blessing
  const blessingEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🙏 SANGHA OFFERINGS - DIVINE BLESSING')
    .setDescription(
      `**${testGame.username}, you have received a divine blessing!**\n\n` +
      `**Current Money:** $${GameUI.formatMoney(testGame.totalMoney)}\n\n` +
      `🙏 **The gods smile upon you...**\n` +
      `*"Your offerings have been heard. Keep all your wealth and leave this building in peace."*\n\n` +
      `✨ **You are now free to exit with all your money!**`
    )
    .setFooter({ text: 'May fortune continue to bless your path...' });

  await interaction.followUp({ embeds: [blessingEmbed] });

  // Award achievement
  await towerAchievements.awardAchievement('SANGHA_BLESSING', testGame.userId, testGame.username, interaction.guildId, interaction.channel, { finalMoney: testGame.totalMoney, floorsCompleted: testGame.floorsCompleted });

  // Wait a moment then end game with win
  setTimeout(async () => {
    await endGame(interaction, testGame, 'sangha_offerings', testGame.totalMoney, 0);
  }, 3000);
}

async function handleTestGoBigCommand(interaction) {
  // Create a test game instance
  const testGame = new GameState(interaction.user.id, interaction.user.username);
  testGame.totalMoney = 100000; // Start with $100k for testing
  testGame.guildId = interaction.guildId;
  testGame.channelId = interaction.channelId;
  
  // Simulate Round 3 completion state
  testGame.currentRound = 3;
  testGame.floorsCompleted = 21; // Completed all 21 floors
  testGame.hasPlayedGoBigOrGoBroke = false; // Hasn't played it yet
  
  // Initialize achievement tracking
  testGame.achievementTracking = {
    peeksUsed: 0,
    xLevelsSurvived: 0,
    minigamesPlayed: []
  };

  // Register game in manager so button interactions work
  gameManager.activeGames.set(interaction.channelId, testGame);

  await interaction.deferReply();

  // Show Round 3 completion message (simulating the normal flow)
  await interaction.editReply({ 
    content: '🎮 **TEST MODE: Simulating Round 3 Completion**\n\n⚡ **SPECIAL EVENT UNLOCKED!** ⚡\n\n🎊 You survived Round 3 without Game Over!\n\n💥 Prepare for... **GO BIG OR GO BROKE!**'
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Launch Go Big or Go Broke minigame
  try {
    await handleGoBigOrGoBrokeMinigame(interaction, testGame);
  } catch (error) {
    console.error('Error launching Go Big or Go Broke test:', error);
    await interaction.followUp({ content: '❌ Error launching Go Big or Go Broke!', ephemeral: true });
  }
}

async function handleTestScamCallCommand(interaction) {
  // Same scenarios as in handleOperatorOffer
  const scenarios = [
    {
      emoji: '🚫',
      title: 'Scam Call Detected!',
      reason: '**You think the caller is a call center scam...**',
      action: '*You declined the offer call without listening!*'
    },
    {
      emoji: '📵',
      title: 'Wrong Number!',
      reason: '**The operator dialed the wrong number...**',
      action: '*Call disconnected before you could answer!*'
    },
    {
      emoji: '😴',
      title: 'Fell Asleep!',
      reason: '**You dozed off while climbing...**',
      action: '*You missed the call entirely!*'
    },
    {
      emoji: '🔇',
      title: 'Phone on Silent!',
      reason: '**Your phone was on silent mode...**',
      action: '*You never heard it ring!*'
    },
    {
      emoji: '🔋',
      title: 'Battery Died!',
      reason: '**Your phone battery just died...**',
      action: '*Call failed to connect!*'
    },
    {
      emoji: '🎵',
      title: 'Listening to Music!',
      reason: '**You were jamming to your favorite song...**',
      action: '*Too loud to hear the phone ring!*'
    }
  ];

  // Pick random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  const testEmbed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('📞 OPERATOR CALLING...')
    .setDescription(
      `${scenario.emoji} **${scenario.title}**\n\n` +
      `${scenario.reason}\n\n` +
      `${scenario.action}\n\n` +
      '**No offer received.**'
    )
    .setFooter({ text: 'Better luck next time!' })
    .setTimestamp();

  await interaction.reply({
    embeds: [testEmbed],
    content: '**Test: Random Auto-Decline Scenario (1% chance in real game)**\n' +
      `*Showing: ${scenario.title}*`,
    ephemeral: true
  });
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

async function handleRevealMountCashmoreCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    if (!isAdmin(member)) {
      return interaction.editReply({ content: '❌ You need the 💻 Owner role or Administrator permission to use this command.' });
    }

    const game = mountCashmoreGames.get(interaction.channelId);
    
    if (!game) {
      return interaction.editReply({ content: '❌ No active Mount Ca$hmore game in this channel!' });
    }

    const state = game.getGameState();
    const squares = game.currentLevelSquares;
    
    // Create reveal message
    let revealText = `🔍 **ADMIN REVEAL - Level ${state.currentLevel}**\n\n`;
    
    for (let i = 0; i < squares.length; i++) {
      const square = squares[i];
      const isRevealed = game.revealedSquares.includes(i);
      const revealStatus = isRevealed ? ' (REVEALED)' : '';
      
      let squareInfo = `**Square ${i + 1}${revealStatus}:** `;
      
      switch (square.type) {
        case 'clear':
          squareInfo += `✅ **CLEAR** - Advance to next level`;
          break;
        case 'skull':
          squareInfo += `💀 **SKULL** - Lose 1 life${game.skullImmunity ? ' (IMMUNITY ACTIVE)' : ''}`;
          break;
        case 'cash':
          squareInfo += `💵 **CASH** - $${square.value.toLocaleString()}`;
          break;
        case 'gameover':
          squareInfo += `💀 **GAME OVER** - Instant loss`;
          break;
        case 'skull_seeker':
          squareInfo += `🔍 **SKULL SEEKER** - Mini-game (Jackpot: $${game.skullSeekerJackpot.toLocaleString()})`;
          break;
        case 'gamblers_luck':
          squareInfo += `🎲 **GAMBLER'S LUCK** - 50/50 chance to double or lose money`;
          break;
        case 'decimalizer':
          squareInfo += `🪙 **DECIMALIZER** - Coin flip reduces money by 50% or 10%`;
          break;
        default:
          squareInfo += `${square.emoji} **${square.type.toUpperCase()}**`;
      }
      
      revealText += squareInfo + '\n';
    }
    
    revealText += `\n**Game Info:**\n`;
    revealText += `💰 Total Money: $${state.totalMoney.toLocaleString()}\n`;
    revealText += `❤️ Lives: ${state.lives}\n`;
    revealText += `🛡️ Skull Immunity: ${game.skullImmunity ? 'Active' : 'None'}\n`;
    revealText += `🔍 Skull Seeker Jackpot: $${game.skullSeekerJackpot.toLocaleString()}\n`;
    revealText += `📊 Revealed Squares: ${game.revealedSquares.length}/${squares.length}`;

    await interaction.editReply({ content: revealText });

  } catch (error) {
    console.error('Error in reveal-mount-cashmore command:', error);
    try {
      await interaction.editReply({ content: '❌ An error occurred while revealing Mount Ca$hmore squares.' });
    } catch (err) {
      console.error('Error replying to reveal-mount-cashmore command error:', err);
    }
  }
}

async function handleTestMountCashmoreCommand(interaction) {
  try {
    await interaction.deferReply();

    const squareType = interaction.options.getString('square');
    const game = mountCashmoreGames.get(interaction.channelId);
    
    if (!game) {
      return interaction.editReply({ content: '❌ No active Mount Ca$hmore game in this channel! Start a game first with `/mount-cashmore`.' });
    }

    // Create a test square based on type
    let testSquare;
    switch (squareType) {
      case 'clear':
        testSquare = { type: 'clear', emoji: '✅' };
        break;
      case 'cash':
        testSquare = { type: 'cash', value: 1000000, emoji: '💵' };
        break;
      case 'skull':
        testSquare = { type: 'skull', emoji: '💀' };
        break;
      case 'skull_seeker':
        testSquare = { type: 'skull_seeker', emoji: '🔍', jackpot: game.skullSeekerJackpot };
        break;
      case 'cash_crash':
        testSquare = { type: 'cash_crash', emoji: '💥' };
        break;
      case 'gamblers_luck':
        testSquare = { type: 'gamblers_luck', emoji: '🎰' };
        break;
      case 'decimalizer':
        testSquare = { type: 'decimalizer', emoji: '🧪' };
        break;
      case 'hosts_deal':
        testSquare = { type: 'hosts_deal', emoji: '🤝' };
        break;
      case 'fatal_trap':
        testSquare = { type: 'fatal_trap', emoji: '⚰️' };
        break;
      case 'gameover':
        testSquare = { type: 'gameover', emoji: '💀' };
        break;
      default:
        return interaction.editReply({ content: '❌ Invalid square type!' });
    }

    await interaction.editReply({ 
      content: `🧪 **Testing Square:** ${testSquare.emoji} **${squareType.toUpperCase()}**\n\nProcessing...` 
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Process the square through the game's handleSquare method
    const result = game.handleSquare(testSquare, -1);

    // Handle the result
    await handleMountCashmoreSquareResult(interaction, game, result, -1);

  } catch (error) {
    console.error('Error in test-mount-cashmore command:', error);
    try {
      await interaction.editReply({ content: '❌ An error occurred while testing Mount Ca$hmore square.' });
    } catch (err) {
      console.error('Error replying to test-mount-cashmore command error:', err);
    }
  }
}

async function handleTestLevel9DecisionCommand(interaction) {
  try {
    await interaction.deferReply();

    // Check if there's an active game
    let game = mountCashmoreGames.get(interaction.channelId);
    
    if (!game) {
      // Create a new game at Level 8 (just cleared)
      const userId = interaction.user.id;
      const username = interaction.user.username;
      const guildId = interaction.guildId;
      const channelId = interaction.channelId;
      
      game = new MountCashmore(userId, username, channelId, guildId);
      mountCashmoreGames.set(channelId, game);
      
      // Set game state to Level 8 cleared with some money
      game.currentLevel = 8;
      game.totalMoney = 5000000; // $5M for testing
      game.lives = 3;
      game.levelCleared = true;
      
      await interaction.editReply({ 
        content: '🧪 **Test Setup Complete!**\n\nCreated a game at **Level 8 (cleared)** with **$5,000,000**.\n\nShowing Level 9 decision...' 
      });
    } else {
      // Use existing game, force it to Level 8 cleared state
      game.currentLevel = 8;
      game.levelCleared = true;
      
      if (game.totalMoney < 100000) {
        game.totalMoney = 5000000; // Give test money if needed
      }
      
      await interaction.editReply({ 
        content: `🧪 **Test Mode!**\n\nSet game to **Level 8 (cleared)** with **$${game.totalMoney.toLocaleString()}**.\n\nShowing Level 9 decision...` 
      });
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show the Level 9 decision embed (same as in levelCleared section)
    const state = game.getGameState();
    const jackpot = game.getJackpot();
    
    const decisionEmbed = new EmbedBuilder()
      .setTitle('🏔️ THE FINAL ASCENT')
      .setDescription(
        `You've cleared Level 8! The summit awaits on Level 9...\n\n` +
        `**Your Current Winnings:** $${state.totalMoney.toLocaleString()}\n` +
        `**Jackpot at Summit:** $${jackpot.toLocaleString()}\n` +
        `**Climb Mode Jackpot:** $${(jackpot * 10).toLocaleString()} (x10!)\n\n` +
        `**Choose Your Path:**`
      )
      .addFields(

        { 
          name: '🎪 Use Zipline', 
          value: `Go safely.\n• **Clear**: Win $${jackpot.toLocaleString()} + keep money!\n• **Game Over**: Keep $${state.totalMoney.toLocaleString()}`, 
          inline: false 
        },
        {
          name: '⚠️ Climb by Hand', 
          value: `**x10 JACKPOT** or lose all!\n• **Clear**: Win **$${(jackpot * 10).toLocaleString()}** (x10!)\n• **Game Over**: **LOSE ALL**`,
          inline: false 
        },
        {
          name: '🚶 Walk Away',
          value: `Cash out with $${state.totalMoney.toLocaleString()}\nGuaranteed payout.`,
          inline: false
        }
      )
      .setColor('#FFD700')
      .setFooter({ text: 'Choose wisely!' });

    const decisionButtons = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mount_cashmore_level9_safe')
          .setLabel('🎪 Use Zipline')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mount_cashmore_level9_risk')
          .setLabel('⚠️ Climb by Hand')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('mount_cashmore_level9_walkaway')
          .setLabel('🚶 Walk Away')
          .setStyle(ButtonStyle.Primary)
      )
    ];

    await interaction.editReply({
      content: '🚨 **CRITICAL DECISION** 🚨',
      embeds: [decisionEmbed],
      components: decisionButtons
    });

  } catch (error) {
    console.error('Error in test-level9-decision command:', error);
    try {
      await interaction.editReply({ content: '❌ An error occurred while testing Level 9 decision.' });
    } catch (err) {
      console.error('Error replying to test-level9-decision command error:', err);
    }
  }
}

async function handleCurrentModeCommand(interaction) {
  try {
    await interaction.deferReply();

    const eventMode = await db.getEventMode(interaction.guildId);

    let title = '🏢 Normal Mode Active';
    let color = '#FFD700';
    let description = '';

    if (eventMode === 2 || eventMode === 'season2' || eventMode === '2') {
      title = '🌟 Season 2 (The Apex Tower) Active 🌟';
      color = '#9B59B6';
      description = '**Season 2: The Apex Tower is currently ENABLED for this server!**\n\n' +
        '👑 **Season 2 Features Active:**\n' +
        '• 30 Floors across 8 rounds\n' +
        '• Roguelike Ascent Pacts (Pick 1 boon/curse each round)\n' +
        '• Guardian Boss Floors (Floor 10 Architect, Floor 20 Loan Shark, Floor 30 Grand Vault)\n' +
        '• 4 Elite Minigames: Laser Infiltration, Blind Auction, Bomb Defusal, Blackjack\n' +
        '• Season 1 Classic Minigames & 66+ Mystery Box items\n';
    } else if (eventMode === 3 || eventMode === 'minigame_master' || eventMode === '3') {
      title = '🎮 Minigame Master Mode Active 🎮';
      color = '#3498DB';
      description = '**Minigame Master is currently ENABLED for this server!**\n\n' +
        '🏆 **Features Active:**\n' +
        '• Play ONLY minigames across 3 tournament rounds\n' +
        '• Round 1: 5 Random Qualifying Minigames\n' +
        '• Round 2: 3 Elite Semi-Final Minigames (2x Multiplier)\n' +
        '• Round 3: Grand Finale Championship Showdown (3x Multiplier)\n';
    } else if (eventMode === 1 || eventMode === 'season1' || eventMode === '1' || eventMode === true || eventMode === 'enable') {
      title = '✨ Season 1 Mode Active ✨';
      color = '#FF1493';
      description = '**Season 1 Mode is currently ENABLED for this server!**\n\n' +
        '✨ **Season 1 Features Active:**\n' +
        '• 30 Floors across 8 rounds\n' +
        '• Mega Grid & The ∞% minigames\n' +
        '• Boost Multiplier & Random 5\n' +
        '• The Vault, Operator Offer & Hideout Breakthrough\n';
    } else {
      title = '🏢 Normal Mode Active';
      color = '#FFD700';
      description = '**Normal Mode is currently active for this server.**\n\n' +
        '📊 **Current Features:**\n' +
        '• 21 Floors across 6 rounds\n' +
        '• Classic gameplay\n';
    }

    const embed = new (require('discord.js').EmbedBuilder)()
      .setColor(color)
      .setTitle(title)
      .setDescription(description + '\n*Admins can toggle server modes with `/event-mode`*\n*Players can also select mode per game via `/play mode:...`*')
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

    const targetUser = interaction.options.getUser('user');
    const gameChoice = interaction.options.getString('game') || 'tower';
    const member = interaction.member;

    // Check if user is admin
    const hasAdminRole = isAdmin(member);

    // Determine which user to check
    let userId, username;
    if (targetUser && hasAdminRole) {
      // Admin checking another user
      userId = targetUser.id;
      username = targetUser.tag;
    } else if (targetUser && !hasAdminRole) {
      // Non-admin tried to check another user
      return interaction.editReply({
        content: '❌ Only admins can check other players\' daily status.'
      });
    } else {
      // Checking own status
      userId = interaction.user.id;
      username = interaction.user.tag;
    }

    const guildId = interaction.guildId;

    // If admin is checking themselves
    if (hasAdminRole && userId === interaction.user.id) {
      return interaction.editReply({
        content: '👑 **Admin Privilege**\n\nAs an admin, you have **unlimited plays** for all games. No daily limit applies to you!'
      });
    }

    // Calculate time until next day (midnight GMT+7)
    const timeLeft = db.getTimeUntilNextResetGMT7();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);

    let message = '';
    
    if (gameChoice === 'mount_cashmore') {
      // Mount Cashmore plays
      const today = db.getTodayGMT7();
      const playKey = `mount_cashmore_${userId}_${guildId}_${today}`;
      const grantKey = `${userId}_${guildId}_${today}`;
      
      // Initialize trackers if needed
      if (!global.mountCashmorePlayTracker) {
        global.mountCashmorePlayTracker = new Map();
      }
      if (!global.mountCashmoreGrantedPlays) {
        global.mountCashmoreGrantedPlays = new Map();
      }
      
      const usedPlays = global.mountCashmorePlayTracker.get(playKey) || 0;
      const grantedPlays = global.mountCashmoreGrantedPlays.get(grantKey) || 0;
      // Default limit 5 + granted plays - used plays
      const remainingPlays = Math.max(0, (5 + grantedPlays) - usedPlays);
      
      message = '🏔️ **Mount Ca$hmore - Daily Status**\n\n';
      if (targetUser && hasAdminRole) {
        message += `👤 **Player:** ${username}\n`;
      }
      message += `🎮 **Remaining Plays:** ${remainingPlays}\n`;
      if (grantedPlays > 0) {
        message += `🎁 **Bonus Plays:** ${grantedPlays}\n`;
      }
      message += `⏰ **Time Until Reset:** ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s\n\n`;
      
      if (remainingPlays === 0) {
        message += '❌ You\'ve used your daily play for Mount Ca$hmore.\n';
        message += '💡 *Come back tomorrow or ask an admin for bonus plays!*';
      } else {
        message += `✅ You have ${remainingPlays} play${remainingPlays > 1 ? 's' : ''} available!\n`;
        message += '💡 *Use `/mount-cashmore` to start climbing!*';
      }
      
    } else {
      // Tower of Cash plays
      const remainingPlays = await db.getRemainingPlays(userId, guildId);
      
      message = '📊 **Tower of Cash - Daily Status**\n\n';
      if (targetUser && hasAdminRole) {
        message += `👤 **Player:** ${username}\n`;
      }
      message += `🎮 **Remaining Plays:** ${remainingPlays}/5\n`;
      message += `⏰ **Time Until Reset:** ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s\n\n`;

      if (remainingPlays > 0) {
        message += targetUser && hasAdminRole ? '✅ This player can play right now!' : '✅ You can play right now!';
      } else {
        message += targetUser && hasAdminRole ? '❌ No plays remaining. They must wait for reset.' : '❌ No plays remaining. Come back after the reset!';
      }
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

  // If game ended early (before completing all 30 floors in Season 1 or 21 in Normal), show what was behind unplayed floors
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

async function endGame(interaction, game, reason, finalScore, explicitLostAmount = 0) {
  const isWin = reason === 'completed';

  // Save to database
  await db.updatePlayerStats(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, isWin);

  // Handle Sangha Offerings specially - add to Big Bank as blessing without player losing money
  if (reason === 'sangha_offerings' && game.totalMoney > 0) {
    await db.addLostMoney(interaction.guildId, game.totalMoney);

    try {
      const guild = interaction.guild;
      const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

      if (bigBankChannel) {
        const newTotal = await db.getGlobalLostMoney(interaction.guildId);

        const blessingEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🙏 Divine Blessing - Big Bank Blessed!')
          .setDescription(
            `**${game.username}** offered **$${GameUI.formatMoney(game.totalMoney)}** to the gods as a blessing!\n\n` +
            `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newTotal)}\n\n` +
            `*The player keeps their fortune, and the Big Bank grows through divine grace!*`
          )
          .setTimestamp();

        await bigBankChannel.send({ embeds: [blessingEmbed] });
      }
    } catch (error) {
      console.error('Error posting to big-bank channel:', error);
    }
  }
  // Track lost money for Big Bank (exclude completed, cashout, lobby/offer exits, and sangha offerings)
  else if (reason !== 'completed' && reason !== 'cashout' && reason !== 'lobby' && reason !== 'sangha_offerings') {
    // Logic: Use explicitLostAmount if provided, otherwise use game.totalMoney (if > 0)
    const amountToBank = explicitLostAmount > 0 ? explicitLostAmount : (game.totalMoney > 0 ? game.totalMoney : 0);

    if (amountToBank > 0) {
      // If they lost, they lost their potential winnings (or current money?)
      // "Gain total money that every players lost from game over"
      // Usually implies the money they had when they crashed.
      await db.addLostMoney(interaction.guildId, amountToBank);

      // Post update to big-bank channel
      try {
        const guild = interaction.guild;
        const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

        if (bigBankChannel) {
          const newTotal = await db.getGlobalLostMoney(interaction.guildId);

          const updateEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('💰 Big Bank Updated!')
            .setDescription(
              `**${game.username}** hit Game Over and lost **$${GameUI.formatMoney(amountToBank)}**!\n\n` +
              `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newTotal)}\n\n` +
              `*Get the Big Bank item from Mystery Box to claim it all!*`
            )
            .setTimestamp();

          await bigBankChannel.send({ embeds: [updateEmbed] });
        }
      } catch (error) {
        console.error('Error posting to big-bank channel:', error);
      }
    }
  }

  await db.saveGameHistory(game.userId, interaction.guildId, game.username, finalScore, game.floorsCompleted, reason);

  // Track game over for achievements
  if (!isWin) {
    const floorNum = game.floorsCompleted + 1; // Basic approximation if currentFloor not available
    AchievementHelper.trackGameOver(game, reason, floorNum);
  }

  // Award achievements automatically
  await towerAchievements.checkAndAwardAchievements(game, interaction, isWin ? 'game_end' : 'game_over');

  // Create end game embed
  const endEmbed = GameUI.createGameEndEmbed(game, reason, finalScore);

  // Send end message - check if interaction has been replied to already
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ embeds: [endEmbed], components: [] });
  } else {
    await interaction.update({ embeds: [endEmbed], components: [] });
  }

  // If game ended early (not completed all 30 floors in Season 1), show what was behind unplayed floors
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
    content: '🎲 **Revealing tile...** 🤞',
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
    
    // Achievement Tracking
    const wonAmount = result.status === 'win' ? game.megaGridState.accumulatedReward : 0;
    const isJackpot = result.status === 'win' && game.megaGridState.currentRound >= 10; // Assuming 10 rounds is full clear
    AchievementHelper.trackMegaGrid(game, game.megaGridState.currentRound, game.megaGridState.currentMultiplier, wonAmount, isJackpot);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    // Show what was behind unpicked tiles
    const unpickedEmbed = GameUI.createMegaGridUnpickedEmbed(game);
    await interaction.followUp({ embeds: [unpickedEmbed] });

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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

  // Achievement Tracking
  AchievementHelper.trackMegaGrid(game, game.megaGridState.currentRound, game.megaGridState.currentMultiplier, game.megaGridState.accumulatedReward, false);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

  const resultEmbed = GameUI.createMegaGridResultEmbed(game, 'cashout');
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Show full grid reveal
  const unpickedEmbed = GameUI.createMegaGridUnpickedEmbed(game);
  await interaction.followUp({ embeds: [unpickedEmbed] });

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

// === DOOR ESCAPE HANDLERS ===

async function handleDoorEscapeStart(interaction, game) {
  game.startDoorEscape();

  const embed = GameUI.createDoorEscapeRoundEmbed(game);
  const buttons = GameUI.createDoorEscapeButtons();

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleDoorEscapeChoice(interaction, game, doorChoice) {
  // Show animation
  await interaction.update({ content: '🚪 Opening the door...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = game.playDoorEscapeRound(doorChoice);

  if (!result) return;

  if (result.status === 'dead') {
    // Game Over
    const resultEmbed = GameUI.createDoorEscapeResultEmbed(game, result);
    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });
    
    // DOOR_ESCAPE_DEATH - health reached 0%
    await towerAchievements.awardAchievement('DOOR_ESCAPE_DEATH', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });

    // Track stats for achievements
    const state = game.doorEscapeState;
    AchievementHelper.trackDoorEscape(game, state.rounds, state.treasureFound, state.fatalPicked, state.healthLost);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

    // Continue via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);

  } else if (result.status === 'escape') {
    // Escaped to next round
    const roundEmbed = GameUI.createDoorEscapeRoundEmbed(game, result);
    await interaction.editReply({ content: '', embeds: [roundEmbed], components: [] });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Next round UI
    const nextEmbed = GameUI.createDoorEscapeRoundEmbed(game);
    const nextButtons = GameUI.createDoorEscapeButtons();
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });

  } else {
    // Blocked or Trapped - stay in same round (or just updated health)
    const roundEmbed = GameUI.createDoorEscapeRoundEmbed(game, result);
    await interaction.editReply({ content: '', embeds: [roundEmbed], components: [] });

    await new Promise(resolve => setTimeout(resolve, 2500));

    // Show selection again
    const nextEmbed = GameUI.createDoorEscapeRoundEmbed(game);
    const nextButtons = GameUI.createDoorEscapeButtons();
    await interaction.followUp({ embeds: [nextEmbed], components: nextButtons });
  }
}

async function handleDoorEscapeCashout(interaction, game) {
  // Player chose to run away - show final 4 doors
  const embed = GameUI.createDoorEscapeFinalEmbed(game);
  const buttons = GameUI.createDoorEscapeFinalButtons();

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleDoorEscapeFinalChoice(interaction, game, doorChoice) {
  // Show animation
  await interaction.update({ content: '🏃 Making your escape...', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = game.cashoutDoorEscape(doorChoice);

  if (!result) return;

  const resultEmbed = GameUI.createDoorEscapeResultEmbed(game, result);
  await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

  // Track stats for achievements
  const state = game.doorEscapeState;
  AchievementHelper.trackDoorEscape(game, state.rounds, state.treasureFound, state.fatalPicked, state.healthLost);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
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

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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
  // Initialize the game state
  game.startInfinityPercent();

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

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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

  const resultEmbed = GameUI.createInfinityPercentResultEmbed(game, result);
  await interaction.update({ embeds: [resultEmbed], components: [] });

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

async function handleDondKeep(interaction, game) {
  const result = game.finalizeDond(false);

  const resultEmbed = GameUI.createDondResultEmbed(game, result);
  await interaction.update({ embeds: [resultEmbed], components: [] });

  gameManager.endGame(interaction.channelId);
}

async function handleDondAdvanceRound(interaction, game) {
  // Advance to next round (used after counter offer rejection)
  const result = game.noDeal();

  if (result.finalRound) {
    // Final round - offer switch
    const switchEmbed = GameUI.createDondSwitchEmbed(game);
    const switchButtons = GameUI.createDondSwitchButtons();

    await interaction.followUp({ embeds: [switchEmbed], components: switchButtons });
  } else {
    // Next round
    await interaction.followUp({
      content: `**Continuing to Round ${game.dondState.currentRound + 1}...**`
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const roundEmbed = GameUI.createDondRoundEmbed(game);
    const caseButtons = GameUI.createDondCaseButtons(game);

    await interaction.followUp({ embeds: [roundEmbed], components: caseButtons });
  }
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
    content: '🕵️‍♂️ **Checking the hideout...** 🚪',
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

    // Track stats for achievements
    const currentFailures = game.achievementTracking?.hideoutStats?.failedPicks || 0;
    const isFailure = result.gameOver && !result.won; // Only fail if game over and NOT won
    const newFailures = currentFailures + (isFailure ? 1 : 0);
    
    AchievementHelper.trackHideout(game, result.jackpot, result.maxedOut, newFailures);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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

// === DOOR ESCAPE MINIGAME ===

async function handleDoorEscapeMinigame(interaction, game) {
  const embed = GameUI.createDoorEscapeIntroEmbed(game);
  const buttons = GameUI.createDoorEscapeButtons(true);

  await interaction.followUp({ embeds: [embed], components: buttons });
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
    content: '🪆 **Opening the doll...** 🎁',
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
    
    // BABUSHKA_STRIKE_OUT - struck out with 3 strikes
    await towerAchievements.awardAchievement('BABUSHKA_STRIKE_OUT', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });

    // Track stats for achievements (0 winnings on strike out)
    AchievementHelper.trackBabushka(game, 0, 3, game.babushkaState.dollsOpened);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

    // Show all dolls revealed
    const unpickedEmbed = GameUI.createBabushkaUnpickedEmbed(game, game.babushkaState.dolls);
    await interaction.followUp({ embeds: [unpickedEmbed] });

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
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

  if (!result) {
    console.error('Babushka bank failed: Invalid state or result is null');
    return interaction.reply({ content: '❌ Action failed. The game state might be invalid.', ephemeral: true });
  }

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
      `** Total Won:** $${GameUI.formatMoney(result.finalAmount)} \n` +
      `** Total Money:** $${GameUI.formatMoney(result.totalMoney)} `
    );

  await interaction.update({ embeds: [cashoutEmbed], components: [] });

  // Show what was in all dolls
  const unpickedEmbed = GameUI.createBabushkaUnpickedEmbed(game, result.allDolls);
  await interaction.followUp({ embeds: [unpickedEmbed] });

  const stats = game.babushkaState;
  AchievementHelper.trackBabushka(game, result.finalAmount, stats.strikes, stats.dollsOpened);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

  // Continue game via continueGameAfterMinigame to check for pending rewards
  await continueGameAfterMinigame(interaction, game);
}

// === GO BIG OR GO BROKE HANDLERS ===

async function handleGoBigOrGoBrokeMinigame(interaction, game) {
  // Initialize Go Big or Go Broke
  game.startGoBigOrGoBroke();

  // Show intro with rules
  const embed = GameUI.createGoBigOrGoBrokeIntroEmbed(game);
  const buttons = GameUI.createGoBigOrGoBrokeButtons(game);

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleGoBigOrGoBrokeSpace(interaction, game, spaceIndex) {
  const state = game.goBigOrGoBrokeState;
  
  // Check if already picked
  if (state.picked.includes(spaceIndex)) {
    return interaction.reply({ content: '❌ You already picked this space!', ephemeral: true });
  }

  // Add multi-stage suspense animation
  await interaction.update({ content: '🎲 **Revealing space...**', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 800));

  await interaction.editReply({ content: '🎲 **Wait for it...**' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await interaction.editReply({ content: '🎲 **Almost there...**' });
  await new Promise(resolve => setTimeout(resolve, 700));

  // Pick the space
  const result = game.pickGoBigOrGoBrokeSpace(spaceIndex);

  // Create result embed with dramatic messages
  const resultEmbed = GameUI.createGoBigOrGoBrokePickEmbed(game, result);
  const buttons = GameUI.createGoBigOrGoBrokeButtons(game);

  await interaction.editReply({ content: '', embeds: [resultEmbed], components: buttons });

  // If game over, continue after delay
  if (result.gameOver) {
    const state = game.goBigOrGoBrokeState;
    
    // Check for achievements
    if (state.mode === 'money_hunt') {
      const moneySpacesPicked = state.picked.filter(i => state.spaces[i].type === 'money').length;
      
      // GO_BIG_MONEY_HUNT - Collect 5+ money spaces
      if (moneySpacesPicked >= 5) {
        await towerAchievements.awardAchievement('GO_BIG_MONEY_HUNT', game.userId, game.username, interaction.guildId, interaction.channel, { 
          moneySpaces: moneySpacesPicked,
          winnings: result.winnings 
        });
      }
      
      // GO_BIG_ALL_IN - Collect all 8 money spaces
      if (moneySpacesPicked === 8) {
        await towerAchievements.awardAchievement('GO_BIG_ALL_IN', game.userId, game.username, interaction.guildId, interaction.channel, { 
          winnings: result.winnings 
        });
      }
      
      // GO_BIG_ONE_AND_DONE - Hit bomb on 2nd pick
      if (state.picked.length === 2) {
        await towerAchievements.awardAchievement('GO_BIG_ONE_AND_DONE', game.userId, game.username, interaction.guildId, interaction.channel, { 
          winnings: result.winnings 
        });
      }
    } else if (state.mode === 'bomb_hunt') {
      // GO_BIG_BOMB_SQUAD - Find all 4 bombs for $1M jackpot
      if (result.jackpot && result.won) {
        await towerAchievements.awardAchievement('GO_BIG_BOMB_SQUAD', game.userId, game.username, interaction.guildId, interaction.channel, { 
          winnings: result.winnings 
        });
      }
      
      // GO_BIG_CLOSE_CALL - Find 3 bombs then hit money
      if (state.bombsFound === 3 && !result.won) {
        await towerAchievements.awardAchievement('GO_BIG_CLOSE_CALL', game.userId, game.username, interaction.guildId, interaction.channel, { 
          bombsFound: state.bombsFound 
        });
      }
      
      // GO_BIG_INSTANT_LOSS - Hit money on first pick after starting bomb hunt
      if (state.picked.length === 2 && !result.won) {
        await towerAchievements.awardAchievement('GO_BIG_INSTANT_LOSS', game.userId, game.username, interaction.guildId, interaction.channel, { 
          winnings: result.winnings 
        });
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await continueGameAfterMinigame(interaction, game);
  }
}

// === MART-OF-CASH HANDLERS ===

async function handleMartOfCashMinigame(interaction, game) {
  // Initialize mart
  game.startMartOfCash();

  const embed = GameUI.createMartOfCashIntroEmbed(game);
  const buttons = GameUI.createMartOfCashButtons();

  await interaction.followUp({ embeds: [embed], components: buttons });
}

async function handleMartRob(interaction, game) {
  // Start robbery mode
  game.startRobbery();

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🦹 ROB THE MART!')
    .setDescription(
      '**Pick 1 of 12 spaces!**\n\n' +
      'After you pick, the bot will pick from the remaining 11 spaces.\n' +
      'Higher score wins!\n\n' +
      '• Money Bank (🏦) > Money Bag (💰) > 9 > ... > 1\n' +
      '• 💀 Skull = Instant Loss (BUSTED!)'
    );

  const buttons = GameUI.createRobberySpaceButtons();

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleMartBuy(interaction, game) {
  const embed = GameUI.createPurchaseMenuEmbed(game);
  const buttons = GameUI.createPurchaseButtons(game);

  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleMartLeave(interaction, game) {
  // Leave without purchasing
  const result = game.leaveMart();

  if (result.itemsToProcess.length === 0) {
    await interaction.update({
      content: '👋 You left the Mart-Of-Ca$h without buying anything.',
      embeds: [],
      components: []
    });

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
  } else {
    // Process purchased items
    await processMartItems(interaction, game, result.itemsToProcess);
  }
}

async function handleMartRobSpace(interaction, game, spaceIndex) {
  // Add multi-stage suspense animation
  await interaction.update({ content: '🎰 **Picking your space...**', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 800));

  await interaction.editReply({ content: '🎰 **The bot is making its choice...**' });
  await new Promise(resolve => setTimeout(resolve, 1200));

  await interaction.editReply({ content: '🎰 **Comparing results...**' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Player picks a space
  const result = game.pickRobberySpace(spaceIndex);

  if (!result) return;

  // Show dramatic comparison
  await interaction.editReply({ content: '🎰 **Revealing...**' });
  await new Promise(resolve => setTimeout(resolve, 800));

  // Show result
  const resultEmbed = GameUI.createRobberyResultEmbed(game, result);

  await interaction.editReply({ embeds: [resultEmbed], components: [] });

  // Wait a bit for drama
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (result.busted || !result.playerWon) {
    // Check for achievements
    if (result.busted) {
      // Picked skull
      await towerAchievements.awardAchievement('SKULL_PICKER', game.userId, game.username, interaction.guildId, interaction.channel);
      await towerAchievements.awardAchievement('MART_BUSTED', game.userId, game.username, interaction.guildId, interaction.channel);
    }
    
    // BUSTED or LOST - Send to basement
    await interaction.followUp({
      content: '💀 **BUSTED!** You are being sent to the basement...',
      embeds: [],
      components: []
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark that we came from Mart-Of-Cash robbery arrest (for Big Bank message)
    game.martRobberyArrest = true;

    // Trigger basement minigame
    await handleBasementMinigame(interaction, game);
  } else {
    // Add suspense before revealing win
    await interaction.followUp({ content: '🎰 **You picked the better space!**' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if Money Bank was picked
    const hasMoneyBank = result.rewards && result.rewards.some(r => r.emoji === '🏦');
    if (hasMoneyBank) {
      await interaction.followUp({ content: '🏦 **JACKPOT! You hit the MONEY BANK!** 🏦' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Won! Apply rewards
    await towerAchievements.awardAchievement('MART_ROBBER', game.userId, game.username, interaction.guildId, interaction.channel);
    
    // Check for specific robbery achievements
    if (result.rewards && result.rewards.length > 0) {
      for (const reward of result.rewards) {
        // MONEY_BAG_ROBBERY - picked money bag (💰)
        if (reward.emoji === '💰') {
          await towerAchievements.awardAchievement('MONEY_BAG_ROBBERY', game.userId, game.username, interaction.guildId, interaction.channel, { reward: reward.value });
        }
        // MONEY_BANK_ROBBERY - picked money bank (🏦) and won
        if (reward.emoji === '🏦') {
          await towerAchievements.awardAchievement('MONEY_BANK_ROBBERY', game.userId, game.username, interaction.guildId, interaction.channel, { reward: reward.value });
        }
      }
    }
    
    await interaction.followUp({
      content: '🎉 **ROB SUCCESS!** Processing your rewards...',
      embeds: [],
      components: []
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Apply robbery rewards (returns true if it handled continuation)
    const handledContinuation = await applyRobberyRewards(interaction, game, result.rewards);
    
    // Only show continue button if rewards didn't handle continuation
    if (!handledContinuation) {
      await continueGameAfterMinigame(interaction, game);
    }
  }
}

async function handleMartPurchase(interaction, game, itemKey) {
  const result = game.purchaseItem(itemKey);

  if (!result.success) {
    await interaction.reply({
      content: `❌ ${result.message}`,
      ephemeral: true
    });
    return;
  }

  // Show purchase confirmation
  const MartOfCash = require('./events/MartOfCash');
  const items = MartOfCash.getPurchaseItems();
  const item = items[itemKey];

  await interaction.reply({
    content: `✅ Purchased ${item.emoji} **${item.name}**!\n💰 Money: $${GameUI.formatMoney(result.totalMoney)}`,
    ephemeral: true
  });

  // Update the menu
  const embed = GameUI.createPurchaseMenuEmbed(game);
  const buttons = GameUI.createPurchaseButtons(game);
  
  await interaction.message.edit({ embeds: [embed], components: buttons });
}

async function handleMartDoneShopping(interaction, game) {
  const result = game.leaveMart();

  if (result.itemsToProcess.length === 0) {
    await interaction.update({
      content: '🛒 You finished shopping but bought nothing!',
      embeds: [],
      components: []
    });

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
  } else {
    await interaction.update({
      content: '🛒 **Shopping complete!** Processing your purchases...',
      embeds: [],
      components: []
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Process purchased items in order
    await processMartItems(interaction, game, result.itemsToProcess);
  }
}

async function applyRobberyRewards(interaction, game, rewards) {
  // Separate minigames and mystery box from instant rewards
  const instantRewards = [];
  const minigames = [];
  let mysteryBox = null;
  
  for (const reward of rewards) {
    if (reward.key === 'minigame') {
      minigames.push(reward);
    } else if (reward.key === 'mysteryBox') {
      mysteryBox = reward;
    } else {
      instantRewards.push(reward);
    }
  }
  
  // Process instant rewards first
  for (let i = 0; i < instantRewards.length; i++) {
    const reward = instantRewards[i];
    
    await interaction.followUp({
      content: `${reward.emoji} **${reward.name}** (${i + 1}/${instantRewards.length}) - Processing...`
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Process each reward
    if (reward.key === 'peek') {
      if (!game.peeks) game.peeks = 0;
      game.peeks++;
      
      await interaction.followUp({
        content: `👁️ **PEEK acquired!** You can now view a floor's content without revealing left/right.\n(Total Peeks: ${game.peeks})`
      });
    } else if (reward.key === 'xProtection') {
      if (!game.xProtection) game.xProtection = 0;
      game.xProtection++;
      
      await interaction.followUp({
        content: `🛡️ **X-PROTECTION acquired!** You are protected from X-Level once.\n(Total Protections: ${game.xProtection})`
      });
    } else if (reward.key === 'randomPercentage') {
      const percentage = Math.floor(Math.random() * 151); // 0-150
      const change = Math.floor((game.totalMoney * percentage) / 100);
      game.totalMoney += change;
      
      await interaction.followUp({
        content: `🎲 **RANDOM PERCENTAGE:** ${percentage}%\n💰 ${change >= 0 ? '+' : ''}$${GameUI.formatMoney(Math.abs(change))}\n💵 Total: $${GameUI.formatMoney(game.totalMoney)}`
      });
    } else if (reward.key === 'random6') {
      game.totalMoney += reward.amount;
      
      await interaction.followUp({
        content: `💰 **RANDOM 6:** You got $${GameUI.formatMoney(reward.amount)}!\n💵 Total: $${GameUI.formatMoney(game.totalMoney)}`
      });
    } else if (reward.key === 'what') {
      const isFloorContent = Math.random() > 0.5;
      
      if (isFloorContent) {
        const config = require('./config.json');
        const allAmounts = [...config.gameAmounts];
        const randomAmount = allAmounts[Math.floor(Math.random() * allAmounts.length)];
        
        await interaction.followUp({
          content: `❓ **WHAT?** You got a floor item: ${GameUI.getAmountDisplayText(randomAmount)}`
        });
        
        if (randomAmount.type === 'game_over') {
          await interaction.followUp({ content: '💀 **GAME OVER!** You got the Game Over tile!' });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // WHAT_GAMEOVER - got game over tile from What? item
          await towerAchievements.awardAchievement('WHAT_GAMEOVER', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
          
          // Mark that we came from Mart-Of-Cash What? (not robbery)
          game.martWhatGameOver = true;
          
          // Send to basement
          await interaction.followUp({
            content: '💀 **You are being sent to the basement...**',
            embeds: [],
            components: []
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          await handleBasementMinigame(interaction, game);
          return;
        } else {
          game.applyAmount(randomAmount);
          await interaction.followUp({
            content: `💵 **Money:** $${GameUI.formatMoney(game.totalMoney)}`
          });
        }
      } else {
        const categories = ['good', 'bad', 'neutral', 'money'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const mysteryItem = game.selectWeightedItem(category);
        
        await interaction.followUp({
          content: `❓ **WHAT?** You got: ${mysteryItem.emoji} **${mysteryItem.name}**\n${mysteryItem.desc}`
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Store pending minigames and mystery box in game state for sequential execution
  if (minigames.length > 0 || mysteryBox) {
    if (!game.pendingMartRewards) {
      game.pendingMartRewards = { minigames: [], mysteryBox: null };
    }
    game.pendingMartRewards.minigames = minigames;
    game.pendingMartRewards.mysteryBox = mysteryBox;
    
    // Start the first minigame
    const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'operator_roshambo', 'babushka', 'door_escape', 'six_zeroes', 'advance_boardwalk', 'bank_buster', 'block_party', 'community_chest', 'electric_company', 'no_vacancy', 'park_it', 'ride_rails', 'go_big_or_go_broke'];
    const randomMinigame = minigameTypes[Math.floor(Math.random() * minigameTypes.length)];
    
    const minigameNames = {
      'vault': '🔐 Vault',
      'infinity_percent': '∞% The Infinity Percent',
      'mega_grid': '🎯 Mega Grid',
      'hideout_breakthrough': '🏚️ Hideout Breakthrough',
      'boiling_point': '🌡️ Boiling Point',
      'operator_roshambo': '✊ Operator Roshambo',
      'babushka': '🪆 Babushka',
      'door_escape': '🚪 Door Escape',
      'six_zeroes': '🎫 Six Zeroes',
      'advance_boardwalk': '🎲 Advance to Boardwalk',
      'bank_buster': '🔐 Bank Buster',
      'block_party': '🏘️ Block Party',
      'community_chest': '🎁 Community Chest',
      'electric_company': '💡 Electric Company',
      'no_vacancy': '🏨 No Vacancy',
      'park_it': '🚗 Park It',
      'ride_rails': '🚂 Ride the Rails',
      'go_big_or_go_broke': '🎲 Go Big or Go Broke'
    };
    
    await interaction.followUp({ content: `🎮 **MINIGAME 1/${minigames.length}:** ${minigameNames[randomMinigame]}` });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mark that this is the first minigame
    game.pendingMartRewards.currentMinigameIndex = 0;
    game.pendingMartRewards.currentMinigameName = randomMinigame;
    
    if (randomMinigame === 'vault') {
      await handleVaultMinigame(interaction, game);
    } else if (randomMinigame === 'infinity_percent') {
      await handleInfinityPercentMinigame(interaction, game);
    } else if (randomMinigame === 'mega_grid') {
      await handleMegaGridMinigame(interaction, game);
    } else if (randomMinigame === 'hideout_breakthrough') {
      await handleHideoutBreakthroughMinigame(interaction, game);
    } else if (randomMinigame === 'boiling_point') {
      await handleBoilingPointMinigame(interaction, game);
    } else if (randomMinigame === 'operator_roshambo') {
      await handleOperatorRoshamboMinigame(interaction, game);
    } else if (randomMinigame === 'babushka') {
      await handleBabushkaMinigame(interaction, game);
    } else if (randomMinigame === 'door_escape') {
      await handleDoorEscapeMinigame(interaction, game);
    } else if (randomMinigame === 'six_zeroes') {
      await handleSixZeroesMinigame(interaction, game);
    } else if (randomMinigame === 'advance_boardwalk') {
      await handleAdvanceBoardwalkMinigame(interaction, game);
    } else if (randomMinigame === 'bank_buster') {
      await handleBankBusterMinigame(interaction, game);
    } else if (randomMinigame === 'block_party') {
      await handleBlockPartyMinigame(interaction, game);
    } else if (randomMinigame === 'community_chest') {
      await handleCommunityChestMinigame(interaction, game);
    } else if (randomMinigame === 'electric_company') {
      await handlePowerGridMinigame(interaction, game);
    } else if (randomMinigame === 'no_vacancy') {
      await handleNoVacancyMinigame(interaction, game);
    } else if (randomMinigame === 'park_it') {
      await handleParkItMinigame(interaction, game);
    } else if (randomMinigame === 'ride_rails') {
      await handleRideRailsMinigame(interaction, game);
    } else if (randomMinigame === 'go_big_or_go_broke') {
      await handleGoBigOrGoBrokeMinigame(interaction, game);
    }
    
    return true; // Minigame will handle continuation
  }
  
  // No minigames or mystery box, caller should show continue button
  return false;
}

async function continueRobberyRewards(interaction, game) {
  // Check if there are more minigames to play
  if (game.pendingMartRewards && game.pendingMartRewards.minigames.length > 0) {
    const currentIndex = game.pendingMartRewards.currentMinigameIndex || 0;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < game.pendingMartRewards.minigames.length) {
      // Play next minigame
      game.pendingMartRewards.currentMinigameIndex = nextIndex;
      
      const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'operator_roshambo', 'babushka', 'door_escape', 'six_zeroes', 'advance_boardwalk', 'bank_buster', 'block_party', 'community_chest', 'electric_company', 'no_vacancy', 'park_it', 'ride_rails', 'go_big_or_go_broke'];
      const randomMinigame = minigameTypes[Math.floor(Math.random() * minigameTypes.length)];
      
      const minigameNames = {
        'vault': '🔐 Vault',
        'infinity_percent': '∞% The Infinity Percent',
        'mega_grid': '🎯 Mega Grid',
        'hideout_breakthrough': '🏚️ Hideout Breakthrough',
        'boiling_point': '🌡️ Boiling Point',
        'operator_roshambo': '✊ Operator Roshambo',
        'babushka': '🪆 Babushka',
        'door_escape': '🚪 Door Escape',
        'six_zeroes': '🎫 Six Zeroes',
        'advance_boardwalk': '🎲 Advance to Boardwalk',
        'bank_buster': '🔐 Bank Buster',
        'block_party': '🏘️ Block Party',
        'community_chest': '🎁 Community Chest',
        'electric_company': '💡 Electric Company',
        'no_vacancy': '🏨 No Vacancy',
        'park_it': '🚗 Park It',
        'ride_rails': '🚂 Ride the Rails'
      };
      
      await interaction.followUp({ content: `🎮 **MINIGAME ${nextIndex + 1}/${game.pendingMartRewards.minigames.length}:** ${minigameNames[randomMinigame]}` });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      game.pendingMartRewards.currentMinigameName = randomMinigame;
      
      if (randomMinigame === 'vault') {
        await handleVaultMinigame(interaction, game);
      } else if (randomMinigame === 'infinity_percent') {
        await handleInfinityPercentMinigame(interaction, game);
      } else if (randomMinigame === 'mega_grid') {
        await handleMegaGridMinigame(interaction, game);
      } else if (randomMinigame === 'hideout_breakthrough') {
        await handleHideoutBreakthroughMinigame(interaction, game);
      } else if (randomMinigame === 'boiling_point') {
        await handleBoilingPointMinigame(interaction, game);
      } else if (randomMinigame === 'operator_roshambo') {
        await handleOperatorRoshamboMinigame(interaction, game);
      } else if (randomMinigame === 'babushka') {
        await handleBabushkaMinigame(interaction, game);
      } else if (randomMinigame === 'door_escape') {
        await handleDoorEscapeMinigame(interaction, game);
      } else if (randomMinigame === 'six_zeroes') {
        await handleSixZeroesMinigame(interaction, game);
      } else if (randomMinigame === 'advance_boardwalk') {
        await handleAdvanceBoardwalkMinigame(interaction, game);
      } else if (randomMinigame === 'bank_buster') {
        await handleBankBusterMinigame(interaction, game);
      } else if (randomMinigame === 'block_party') {
        await handleBlockPartyMinigame(interaction, game);
      } else if (randomMinigame === 'community_chest') {
        await handleCommunityChestMinigame(interaction, game);
      } else if (randomMinigame === 'electric_company') {
        await handlePowerGridMinigame(interaction, game);
      } else if (randomMinigame === 'no_vacancy') {
        await handleNoVacancyMinigame(interaction, game);
      } else if (randomMinigame === 'park_it') {
        await handleParkItMinigame(interaction, game);
      } else if (randomMinigame === 'ride_rails') {
        await handleRideRailsMinigame(interaction, game);
      } else if (randomMinigame === 'go_big_or_go_broke') {
        await handleGoBigOrGoBrokeMinigame(interaction, game);
      }
      return;
    }
  }
  
  // All minigames done, check for mystery box
  if (game.pendingMartRewards && game.pendingMartRewards.mysteryBox) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await interaction.followUp({ content: '📦 **MYSTERY BOX starting...**' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const state = game.startMysteryBox();
    state.boxes = state.boxes.filter(box => box.category !== 'bad');
    while (state.boxes.length < 4) {
      const category = Math.random() > 0.5 ? 'good' : 'neutral';
      const item = game.selectWeightedItem(category);
      state.boxes.push({ ...item, category });
    }
    
    // Clear pending rewards before starting mystery box
    game.pendingMartRewards = null;
    
    await handleMysteryBoxMinigame(interaction, game);
    return;
  }
  
  // All done, clear pending and use continueGameAfterMinigame to check for pending purchases
  game.pendingMartRewards = null;
  await continueGameAfterMinigame(interaction, game);
}

async function processMartItems(interaction, game, items) {
  // If pendingPurchaseItems already exists, continue from where we left off
  if (!game.pendingPurchaseItems) {
    game.pendingPurchaseItems = {
      items: items,
      currentIndex: 0
    };
  }
  
  // Process items sequentially
  while (game.pendingPurchaseItems.currentIndex < game.pendingPurchaseItems.items.length) {
    const i = game.pendingPurchaseItems.currentIndex;
    const { key, item } = game.pendingPurchaseItems.items[i];
    
    await interaction.followUp({
      content: `${item.emoji} **${item.name}** (${i + 1}/${game.pendingPurchaseItems.items.length}) - Processing...`
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Process each item in order: PEEK → X-PROTECTION → RANDOM PERCENTAGE → SIX ZEROES → MINI GAME → MYSTERY BOX → WHAT? → Nothing → SANGHA OFFERINGS
    if (key === 'sanghaOfferings') {
      // Sangha Offerings - Divine blessing, end game with all money
      const blessingEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🙏 SANGHA OFFERINGS - DIVINE BLESSING')
        .setDescription(
          `**${game.username}, you have received a divine blessing!**\n\n` +
          `**Current Money:** $${GameUI.formatMoney(game.totalMoney)}\n\n` +
          `🙏 **The gods smile upon you...**\n` +
          `*"Your offerings have been heard. Keep all your wealth and leave this building in peace."*\n\n` +
          `✨ **You are now free to exit with all your money!**`
        )
        .setFooter({ text: 'May fortune continue to bless your path...' });

      await interaction.followUp({ embeds: [blessingEmbed] });

      // Award achievement
      await towerAchievements.awardAchievement('SANGHA_BLESSING', game.userId, game.username, interaction.guildId, interaction.channel, { finalMoney: game.totalMoney, floorsCompleted: game.floorsCompleted });

      // Wait a moment then end game with win
      setTimeout(async () => {
        await endGame(interaction, game, 'sangha_offerings', game.totalMoney, 0);
      }, 3000);
      return; // Stop processing other items
    } else if (key === 'peek') {
      if (!game.peeks) game.peeks = 0;
      game.peeks++;
      await interaction.followUp({
        content: `👁️ **PEEK acquired!** (Total: ${game.peeks})`
      });
      game.pendingPurchaseItems.currentIndex++;
    } else if (key === 'xProtection') {
      if (!game.xProtection) game.xProtection = 0;
      game.xProtection++;
      await interaction.followUp({
        content: `🛡️ **X-PROTECTION acquired!** (Total: ${game.xProtection})`
      });
      game.pendingPurchaseItems.currentIndex++;
    } else if (key === 'randomPercentage') {
      const percentage = Math.floor(Math.random() * 151); // 0-150%
      const change = Math.floor((game.totalMoney * percentage) / 100);
      game.totalMoney += change;
      await interaction.followUp({
        content: `🎲 **RANDOM PERCENTAGE:** ${percentage}%\n💰 ${change >= 0 ? '+' : ''}$${GameUI.formatMoney(Math.abs(change))}\n💵 Total: $${GameUI.formatMoney(game.totalMoney)}`
      });
      game.pendingPurchaseItems.currentIndex++;
    } else if (key === 'sixZeroes') {
      // Six Zeroes minigame - increment index and start minigame
      game.pendingPurchaseItems.currentIndex++;
      await interaction.followUp({ content: '🎫 **SIX ZEROES minigame starting...**' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleSixZeroesMinigame(interaction, game);
      return; // Minigame will handle continuation via continueGameAfterMinigame
    } else if (key === 'minigame') {
      // Increment index before starting minigame
      game.pendingPurchaseItems.currentIndex++;
      // Trigger random minigame
      const minigames = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'operator_roshambo', 'babushka', 'door_escape', 'six_zeroes', 'advance_boardwalk', 'bank_buster', 'block_party', 'community_chest', 'electric_company', 'no_vacancy', 'park_it', 'ride_rails', 'go_big_or_go_broke'];
      const randomMinigame = minigames[Math.floor(Math.random() * minigames.length)];
      
      // Show which minigame they're getting
      const minigameNames = {
        'vault': '🔐 Vault',
        'infinity_percent': '∞% The Infinity Percent',
        'mega_grid': '🎯 Mega Grid',
        'hideout_breakthrough': '🏚️ Hideout Breakthrough',
        'boiling_point': '🌡️ Boiling Point',
        'operator_roshambo': '✊ Operator Roshambo',
        'babushka': '🪆 Babushka',
        'door_escape': '🚪 Door Escape',
        'six_zeroes': '🎫 Six Zeroes',
        'advance_boardwalk': '🎲 Advance to Boardwalk',
        'bank_buster': '🔐 Bank Buster',
        'block_party': '🏘️ Block Party',
        'community_chest': '🎁 Community Chest',
        'electric_company': '💡 Electric Company',
        'no_vacancy': '🏨 No Vacancy',
        'park_it': '🚗 Park It',
        'ride_rails': '🚂 Ride the Rails'
      };
      
      await interaction.followUp({ content: `🎮 **MINIGAME:** ${minigameNames[randomMinigame]}` });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (randomMinigame === 'vault') {
        await handleVaultMinigame(interaction, game);
      } else if (randomMinigame === 'infinity_percent') {
        await handleInfinityPercentMinigame(interaction, game);
      } else if (randomMinigame === 'mega_grid') {
        await handleMegaGridMinigame(interaction, game);
      } else if (randomMinigame === 'hideout_breakthrough') {
        await handleHideoutBreakthroughMinigame(interaction, game);
      } else if (randomMinigame === 'boiling_point') {
        await handleBoilingPointMinigame(interaction, game);
      } else if (randomMinigame === 'operator_roshambo') {
        await handleOperatorRoshamboMinigame(interaction, game);
      } else if (randomMinigame === 'babushka') {
        await handleBabushkaMinigame(interaction, game);
      } else if (randomMinigame === 'door_escape') {
        await handleDoorEscapeMinigame(interaction, game);
      } else if (randomMinigame === 'six_zeroes') {
        await handleSixZeroesMinigame(interaction, game);
      } else if (randomMinigame === 'advance_boardwalk') {
        await handleAdvanceBoardwalkMinigame(interaction, game);
      } else if (randomMinigame === 'bank_buster') {
        await handleBankBusterMinigame(interaction, game);
      } else if (randomMinigame === 'block_party') {
        await handleBlockPartyMinigame(interaction, game);
      } else if (randomMinigame === 'community_chest') {
        await handleCommunityChestMinigame(interaction, game);
      } else if (randomMinigame === 'electric_company') {
        await handlePowerGridMinigame(interaction, game);
      } else if (randomMinigame === 'no_vacancy') {
        await handleNoVacancyMinigame(interaction, game);
      } else if (randomMinigame === 'park_it') {
        await handleParkItMinigame(interaction, game);
      } else if (randomMinigame === 'ride_rails') {
        await handleRideRailsMinigame(interaction, game);
      } else if (randomMinigame === 'go_big_or_go_broke') {
        await handleGoBigOrGoBrokeMinigame(interaction, game);
      }
      return; // Minigame handles continuation via continueGameAfterMinigame
    } else if (key === 'mysteryBox') {
      // Increment index before starting mystery box
      game.pendingPurchaseItems.currentIndex++;
      await interaction.followUp({ content: '📦 **MYSTERY BOX starting...**' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleMysteryBoxMinigame(interaction, game);
      return; // Mystery box handles continuation via continueGameAfterMinigame
    } else if (key === 'what') {
      // Random: Mystery box item OR floor content (including game over!)
      await interaction.followUp({ content: '❓ **WHAT?** - Revealing...' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isFloorContent = Math.random() > 0.5;
      
      if (isFloorContent) {
        // Get random floor content
        const config = require('./config.json');
        const allAmounts = [...config.gameAmounts];
        const randomAmount = allAmounts[Math.floor(Math.random() * allAmounts.length)];
        
        await interaction.followUp({
          content: `🎲 **Floor Content:** ${GameUI.getAmountDisplayText(randomAmount)}`
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Apply the amount
        if (randomAmount.type === 'game_over') {
          await interaction.followUp({ content: '💀 **GAME OVER!** You got the Game Over tile!' });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // WHAT_GAMEOVER achievement for Golden Ticket What?
          await towerAchievements.awardAchievement('WHAT_GAMEOVER', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
          
          // Mark that we came from What? item (not robbery)
          game.martWhatGameOver = true;
          
          // Send to basement
          await interaction.followUp({
            content: '💀 **You are being sent to the basement...**',
            embeds: [],
            components: []
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          await handleBasementMinigame(interaction, game);
          return;
        } else {
          game.applyAmount(randomAmount);
          await interaction.followUp({
            content: `💵 **Money:** $${GameUI.formatMoney(game.totalMoney)}`
          });
        }
      } else {
        // Mystery box item
        const categories = ['good', 'bad', 'neutral', 'money'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const mysteryItem = game.selectWeightedItem(category);
        
        await interaction.followUp({
          content: `📦 **Mystery Box Item:** ${mysteryItem.emoji} **${mysteryItem.name}**\n${mysteryItem.desc}`
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Apply the mystery box effect
        const effectResult = game.applyMysteryBoxEffect(mysteryItem);
        
        // Show effect results
        if (effectResult && effectResult.message) {
          await interaction.followUp({ content: effectResult.message });
        }
        await interaction.followUp({
          content: `💵 **Money:** $${GameUI.formatMoney(game.totalMoney)}`
        });
      }
      game.pendingPurchaseItems.currentIndex++;
    } else if (key === 'nothing') {
      await interaction.followUp({
        content: `⚪ **NOTHING!** Literally nothing happened. Waste of money!`
      });
      game.pendingPurchaseItems.currentIndex++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // All items processed - clear pending state and use continueGameAfterMinigame to check for pending robbery rewards
  game.pendingPurchaseItems = null;
  await continueGameAfterMinigame(interaction, game);
}

// === SIX ZEROES MINIGAME ===

async function handleSixZeroesMinigame(interaction, game) {
  // Create 12 spaces: 6 zeroes, 3 instant noodles with money, 3 instant noodles without money
  const spaces = [
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'zero', emoji: '0️⃣', value: 100000 },
    { type: 'noodle', emoji: '🍜', hasMoney: true, value: 200000 },
    { type: 'noodle', emoji: '🍜', hasMoney: true, value: 200000 },
    { type: 'noodle', emoji: '🍜', hasMoney: true, value: 200000 },
    { type: 'noodle', emoji: '🍜', hasMoney: false, value: 0 },
    { type: 'noodle', emoji: '🍜', hasMoney: false, value: 0 },
    { type: 'noodle', emoji: '🍜', hasMoney: false, value: 0 }
  ];

  // Shuffle spaces
  for (let i = spaces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spaces[i], spaces[j]] = [spaces[j], spaces[i]];
  }

  // Store state in game object
  game.sixZeroesState = {
    spaces,
    picks: [],
    totalEarned: 0,
    isComplete: false
  };

  // Show intro
  const introEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎫 SIX ZEROES')
    .setDescription(
      '**Pick 6 spaces from 12!**\n\n' +
      '0️⃣ **Zero:** Gain $100,000\n' +
      '🍜 **Instant Noodle:**\n' +
      '  • With money: $200,000\n' +
      '  • Without money: Nothing\n\n' +
      '🏆 **All 6 Zeroes:** $20 Million!\n' +
      '🍜 **All 6 Noodles:** $10 Million!\n\n' +
      '🎯 **Pick your first space!**'
    );

  const buttons = createSixZeroesButtons(game);
  await interaction.followUp({ embeds: [introEmbed], components: buttons });
}

function createSixZeroesButtons(game) {
  const state = game.sixZeroesState;
  const rows = [];

  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      const pickedItem = state.picks.find(p => p.index === index);
      const picked = !!pickedItem;
      
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`sixzeroes_pick_${index}`)
          .setLabel(picked ? pickedItem.space.emoji : `${index + 1}`)
          .setStyle(picked ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(picked)
      );
    }
    rows.push(actionRow);
  }

  return rows;
}

async function handleSixZeroesPick(interaction, game, index) {
  const state = game.sixZeroesState;
  
  if (!state || state.isComplete) {
    await interaction.reply({ content: '❌ Minigame is no longer active!', ephemeral: true });
    return;
  }

  // Add multi-stage suspense animation
  await interaction.update({ content: '🎫 **Revealing your pick...**', embeds: [], components: [] });
  await new Promise(resolve => setTimeout(resolve, 800));

  await interaction.editReply({ content: '🎫 **Is it a ZERO...?**' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await interaction.editReply({ content: '🎫 **Or a NOODLE...?**' });
  await new Promise(resolve => setTimeout(resolve, 900));

  const space = state.spaces[index];
  state.picks.push({ index, space });

  let earned = 0;
  let resultText = '';

  if (space.type === 'zero') {
    earned = space.value;
    resultText = `0️⃣ **ZERO!** +$${GameUI.formatMoney(earned)}`;
  } else if (space.type === 'noodle') {
    if (space.hasMoney) {
      earned = space.value;
      resultText = `🍜 **INSTANT NOODLE WITH MONEY!** +$${GameUI.formatMoney(earned)}`;
    } else {
      resultText = `🍜 **INSTANT NOODLE ONLY!** Nothing gained.`;
      
      // INSTANT_NOODLES - got instant noodle without money when player has $0
      if (game.totalMoney === 0) {
        await towerAchievements.awardAchievement('INSTANT_NOODLES', game.userId, game.username, interaction.guildId, interaction.channel, { floorsCompleted: game.floorsCompleted });
      }
    }
  }

  state.totalEarned += earned;
  game.totalMoney += earned;

  // Check if this is getting close to perfect
  let teaseText = '';
  if (state.picks.length === 5) {
    const allZeroesSoFar = state.picks.every(p => p.space.type === 'zero');
    const allNoodlesSoFar = state.picks.every(p => p.space.type === 'noodle');
    
    if (allZeroesSoFar && space.type === 'zero') {
      teaseText = '\n\n🔥 **ONE MORE ZERO FOR PERFECT BONUS!** 🔥';
    } else if (allNoodlesSoFar && space.type === 'noodle') {
      teaseText = '\n\n🔥 **ONE MORE NOODLE FOR PERFECT BONUS!** 🔥';
    }
  }

  await interaction.editReply({
    content: `${resultText}\n💰 **Total Earned:** $${GameUI.formatMoney(state.totalEarned)}\n📊 **Picks:** ${state.picks.length}/6${teaseText}`,
    embeds: [],
    components: []
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if all 6 picks are done
  if (state.picks.length >= 6) {
    state.isComplete = true;

    // Add suspense for checking perfect bonus
    await interaction.editReply({ content: '🎫 **Checking for perfect bonus...**' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for perfect bonuses
    const allZeroes = state.picks.every(p => p.space.type === 'zero');
    const allNoodles = state.picks.every(p => p.space.type === 'noodle');

    let bonus = 0;
    let bonusText = '';

    if (allZeroes) {
      bonus = 20000000;
      bonusText = '🏆 **PERFECT! ALL ZEROES!**\n💎 Bonus: $20,000,000';
      // Remove previous earnings
      game.totalMoney -= state.totalEarned;
      state.totalEarned = bonus;
      game.totalMoney += bonus;
    } else if (allNoodles) {
      bonus = 10000000;
      bonusText = '🍜 **PERFECT! ALL NOODLES!**\n💎 Bonus: $10,000,000';
      // Remove previous earnings
      game.totalMoney -= state.totalEarned;
      state.totalEarned = bonus;
      game.totalMoney += bonus;
    }

    // Show all spaces
    let gridDisplay = '**All 12 Spaces:**\n';
    for (let i = 0; i < 12; i++) {
      const space = state.spaces[i];
      gridDisplay += `${space.emoji} `;
      if ((i + 1) % 4 === 0) gridDisplay += '\n';
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(bonus > 0 ? '#FFD700' : '#00FF00')
      .setTitle('🎫 SIX ZEROES - COMPLETE!')
      .setDescription(
        `${bonusText ? bonusText + '\n\n' : ''}` +
        `💰 **Total Earned:** $${GameUI.formatMoney(state.totalEarned)}\n` +
        `💵 **Your Money:** $${GameUI.formatMoney(game.totalMoney)}\n\n` +
        gridDisplay
      );

    await interaction.editReply({ content: '', embeds: [resultEmbed], components: [] });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Track stats for achievements
    const zerosFound = state.picks.filter(p => p.space.type === 'zero').length;
    const noodlesPicked = state.picks.filter(p => p.space.type === 'noodle').length;
    AchievementHelper.trackSixZeroes(game, zerosFound, false, noodlesPicked);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

    // Continue game via continueGameAfterMinigame to check for pending rewards
    await continueGameAfterMinigame(interaction, game);
  } else {
    // Show next pick
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎫 SIX ZEROES')
      .setDescription(
        `💰 **Total Earned:** $${GameUI.formatMoney(state.totalEarned)}\n` +
        `📊 **Picks:** ${state.picks.length}/6\n\n` +
        `🎯 **Pick your next space!**`
      );

    const buttons = createSixZeroesButtons(game);
    await interaction.followUp({ embeds: [embed], components: buttons });
  }
}

async function handleTestCommercialCommand(interaction) {
  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('📺 Commercial Break')
    .setDescription(
      '**We\'ll be right back after these messages from our sponsors!**\n\n' +
      '[Watch the commercial](https://www.youtube.com/watch?v=IVXHRuiFmx4)'
    )
    .setImage('https://i.ytimg.com/vi/IVXHRuiFmx4/hq720.jpg?sqp=-oaymwFBCNAFEJQDSFryq4qpAzMIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB8AEB-AH-CYAC0AWKAgwIABABGGMgYyhjMA8=&rs=AOn4CLDN3UndJPvPejLat0QtkxVnTGFAng');

  await interaction.editReply({ embeds: [embed] });
}

async function handleTestMartCommand(interaction) {
  await interaction.deferReply();

  // Create test game
  const game = await gameManager.createGame(
    interaction.user.id,
    interaction.user.username,
    interaction.channelId,
    interaction.guildId,
    db
  );

  if (!game) {
    await interaction.editReply({ content: '❌ Failed to create test game!' });
    return;
  }

  // Set test money
  game.totalMoney = 500000;

  await interaction.editReply({ content: '🧪 **Test game created!** Starting Mart-Of-Ca$h...' });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Trigger Mart-Of-Cash
  await handleMartOfCashMinigame(interaction, game);
}

async function handleTestSixZeroesCommand(interaction) {
  await interaction.deferReply();

  // Create test game
  const game = await gameManager.createGame(
    interaction.user.id,
    interaction.user.username,
    interaction.channelId,
    interaction.guildId,
    db
  );

  if (!game) {
    await interaction.editReply({ content: '❌ Failed to create test game!' });
    return;
  }

  // Set test money
  game.totalMoney = 1000000;

  await interaction.editReply({ content: '🧪 **Test game created!** Starting Six Zeroes minigame...' });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Trigger Six Zeroes minigame
  await handleSixZeroesMinigame(interaction, game);
}

// === INFO COMMAND HANDLERS ===

async function handleContentListCommand(interaction) {
  await interaction.deferReply();

  const embed = GameUI.createContentListEmbed();
  const buttons = GameUI.createContentListButtons();

  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleMinigameDetailCommand(interaction) {
  await interaction.deferReply();

  const embed = GameUI.createMinigameListEmbed();
  const buttons = GameUI.createMinigameListButtons();

  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleMysteryBoxCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'info') {
    await interaction.deferReply();
    const embeds = GameUI.createMysteryBoxInfoEmbeds();
    await interaction.editReply({ embeds: embeds });
  } else if (subcommand === 'test-items') {
    await handleMysteryBoxTestItemsCommand(interaction);
  }
}

async function handleMysteryBoxTestItemsCommand(interaction) {
  await safeInteractionResponse(interaction, 'deferReply', {});
  
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const channelId = interaction.channelId;

  // 1. Create a dummy GameState session
  const game = new GameState(userId, interaction.user.username, channelId, guildId);
  game.totalMoney = 1000000; // Start with $1M for testing
  game.currentRound = 1;
  gameManager.activeGames.set(channelId, game);

  // 2. Define the 9 test items
  const testItems = [
    { id: 'double_or_nothing', name: 'Double or Nothing', effect: 'double_or_nothing', category: 'neutral', emoji: '🎲', desc: '50/50: Double money OR lose 50%!' },
    { id: 'malfunction', name: 'Malfunction', effect: 'malfunction', category: 'neutral', emoji: '🔄', desc: 'Random money from -999M to +999M!' },
    { id: 'tax_collector', name: 'Tax Collector', effect: 'tax_collector', category: 'good', emoji: '💸', desc: 'Lose 20%, immune to next percentage!' },
    { id: 'lucky_seven', name: 'Lucky 7', effect: 'lucky_seven', category: 'good', emoji: '🎰', desc: 'Multiply by 7, locked from lobby next round!' },
    { id: 'lightning_round', name: 'Lightning Round', effect: 'lightning_round', category: 'neutral', emoji: '⚡', desc: 'Skip to final round immediately!' },
    { id: 'bonus_portal', name: 'Bonus Portal', effect: 'bonus_portal', category: 'good', emoji: '🎪', desc: 'Random minigame with 2x rewards!' },
    { id: 'gift_horse', name: 'Gift Horse', effect: 'gift_horse', category: 'good', emoji: '🎁', desc: 'Give 25% to Big Bank, gain 2 bonus plays!' },
    { id: 'announcement', name: 'Announcement', effect: 'announcement', category: 'good', emoji: '📢', desc: 'Reveal money to server, gain +10%!' },
    { id: 'oracles_vision', name: 'Oracle\'s Vision', effect: 'oracles_vision', category: 'good', emoji: '🔮', desc: 'Reveal next floor contents!' }
  ];

  // 3. Pick 4 random items from the 9 for this specific test box
  const selectedForBox = [...testItems].sort(() => 0.5 - Math.random()).slice(0, 4);

  // 4. Start Mystery Box with these items
  game.startMysteryBox(selectedForBox);

  // 5. Send the Mystery Box UI
  const embed = GameUI.createMysteryBoxIntroEmbed(game);
  const buttons = GameUI.createMysteryBoxSelectionButtons(game);

  await safeInteractionResponse(interaction, 'editReply', {
    content: '🧪 **MYSTERY BOX TEST MODE**\n4 random items from the 9 test items have been loaded into these boxes!',
    embeds: [embed],
    components: buttons
  });
}

async function handleMysteryBoxItemsCommand(interaction) {
  await safeInteractionResponse(interaction, 'deferReply', {});

  const embeds = GameUI.createMysteryBoxInfoEmbeds();

  await safeInteractionResponse(interaction, 'editReply', { embeds: embeds });
}

async function handleBigBankCommand(interaction) {
  await interaction.deferReply();

  const totalLostMoney = await db.getGlobalLostMoney(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏦 Big Bank - Total Accumulated Money')
    .setDescription(
      '**Money lost from all Game Overs in this server:**\n\n' +
      `💰 ** Total in Big Bank:** $${GameUI.formatMoney(totalLostMoney)} \n\n` +
      '*Every time a player hits Game Over, their money is added to the Big Bank!*\n' +
      '*Get the "Big Bank" item from Mystery Box to claim all this money!*\n\n' +
      '**How it works:**\n' +
      '• When you hit Game Over, your current money goes to Big Bank\n' +
      '• Big Bank accumulates across all players in this server\n' +
      '• Get 🏦 Big Bank from Mystery Box to win it all!\n' +
      '• Big Bank item has 0.42% chance from Mystery Box'
    )
    .setFooter({ text: 'Keep playing to grow the Big Bank!' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// === DEAL OR NO DEAL HANDLERS ===

async function handleDondCommand(interaction) {
  await interaction.deferReply();

  const player = interaction.options.getUser('player');
  const mode = interaction.options.getString('mode') || 'auto';
  let banker = interaction.options.getUser('banker');

  // If auto mode and no banker specified, use bot as banker
  if (!banker) {
    if (mode === 'manual') {
      return interaction.editReply({
        content: '❌ Banker is required for Manual Banker mode!',
        ephemeral: true
      });
    }
    banker = interaction.client.user; // Use bot as banker for auto mode
  }

  // Create a temporary game state for DOND
  const game = new GameState(player.id, player.username, interaction.channelId, interaction.guildId);
  game.startDond(player.id, player.username, banker.id, banker.username, mode);
  gameManager.activeGames.set(interaction.channelId, game);

  const introEmbed = GameUI.createDondIntroEmbed(player, banker, mode);
  const caseButtons = GameUI.createDondCaseButtons(game);

  await interaction.editReply({ embeds: [introEmbed], components: caseButtons });
}

async function handleDondBoardCommand(interaction) {
  await interaction.deferReply();

  const viewOption = interaction.options.getString('view');

  if (viewOption === 'all') {
    // Show all 26 case values
    const boardEmbed = GameUI.createDondBoardEmbed(false);
    await interaction.editReply({ embeds: [boardEmbed] });
  } else if (viewOption === 'current') {
    // Show current board (remaining cases in active game)
    const game = gameManager.getGame(interaction.channelId);

    if (!game || !game.dondState) {
      return interaction.editReply({
        content: '❌ No active Deal or No Deal game in this channel!\n\nUse `/ dond - board view:All Board` to see all case values.',
        ephemeral: true
      });
    }

    if (game.dondState.gameOver) {
      return interaction.editReply({
        content: '❌ This Deal or No Deal game has ended!\n\nUse `/ dond - board view:All Board` to see all case values.',
        ephemeral: true
      });
    }

    const boardEmbed = GameUI.createDondBoardEmbed(true, game);
    await interaction.editReply({ embeds: [boardEmbed] });
  }
}

async function handleDondCaseSelection(interaction, game, caseNumber) {
  if (!game.dondState.playerCaseNumber) {
    // Player selecting their case
    game.selectPlayerCase(caseNumber);

    await interaction.update({
      content: `** ${game.dondState.playerName}** selected 💼 ${caseNumber} ! 🔒\n\nNow open cases for Round 1!`,
      components: GameUI.createDondCaseButtons(game)
    });

    game.dondState.currentRound = 0;
  } else {
    // Opening a case
    const result = game.openDondCase(caseNumber);
    if (!result) return;

    // Show case reveal
    await interaction.update({
      embeds: [GameUI.createDondCaseRevealEmbed(caseNumber, result.case.value)],
      components: []
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show current board after each pick
    const currentBoardEmbed = GameUI.createDondBoardEmbed(true, game);
    await interaction.followUp({
      embeds: [currentBoardEmbed]
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Calculate total cases that should be opened by the end of this round
    let targetOpenedCount = 0;
    for (let r = 0; r <= game.dondState.currentRound; r++) {
      if (r === 0) targetOpenedCount += 6;
      else if (r === 1) targetOpenedCount += 5;
      else if (r === 2) targetOpenedCount += 4;
      else if (r === 3) targetOpenedCount += 3;
      else if (r === 4) targetOpenedCount += 2;
      else targetOpenedCount += 1;
    }

    if (game.dondState.openedCases.length >= targetOpenedCount) {
      // Round complete - banker offer
      const offer = (game.dondState.offerMode === 'auto' || game.dondState.bankerId === interaction.client.user.id)
        ? game.calculateBankerOffer()
        : 0;

      // Check if offer mode is auto OR if the banker is the bot itself
      if (game.dondState.offerMode === 'auto' || game.dondState.bankerId === interaction.client.user.id) {
        // Auto mode - show offer immediately
        const offerEmbed = GameUI.createDondBankerOfferEmbed(game, offer);
        const dealButtons = GameUI.createDondDealButtons(game);

        await interaction.followUp({
          content: `📞 ** The banker has made an offer! ** `,
          embeds: [offerEmbed],
          components: dealButtons
        });
      } else {
        // Manual mode - wait for banker to set offer
        await postBankerOfferRequest(interaction, game);

        await interaction.followUp({
          content: `⏳ ** Waiting for Banker to make an offer...** `
        });
      }
    } else {
      // Continue opening cases
      const roundEmbed = GameUI.createDondRoundEmbed(game);
      const caseButtons = GameUI.createDondCaseButtons(game);

      await interaction.followUp({ embeds: [roundEmbed], components: caseButtons });
    }
  }
}



async function postBankerOfferRequest(interaction, game) {
  try {
    const remainingCases = game.dondState.cases.filter(c => !c.opened).length;

    const requestEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💼 Banker - Make Your Offer!')
      .setDescription(
        `** Player:** ${game.dondState.playerName} \n` +
        `** Round:** ${game.dondState.currentRound + 1}/9\n` +
        `**Cases Remaining:** ${remainingCases}/26\n\n` +
        `**Click the button below to enter your offer!**`
      )
      .setFooter({ text: 'Make a generous offer... or not!' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dond_banker_offer')
          .setLabel('Make Offer')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💵')
      );

    await interaction.followUp({
      content: `💵 Banker Time...`,
      embeds: [requestEmbed],
      components: [row]
    });
  } catch (error) {
    console.error('Error posting banker offer request:', error);
  }
}

async function handleDondDeal(interaction, game) {
  const result = game.acceptDeal();

  await interaction.update({ components: [] });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const resultEmbed = GameUI.createDondResultEmbed(game, result);
  await interaction.followUp({ embeds: [resultEmbed] });

  // Add to Big Bank
  const scoreChange = result.isGoodDeal ? result.finalValue : Math.floor(result.finalValue * 0.9);
  await db.addLostMoney(interaction.guildId, result.finalValue);
  
  // Show Big Bank update embed in game channel
  const newBigBankTotal = await db.getGlobalLostMoney(interaction.guildId);
  const bigBankChange = result.finalValue;
  await interaction.followUp({
    embeds: [new EmbedBuilder()
      .setColor(result.isGoodDeal ? '#00FF00' : '#FF6B6B')
      .setTitle('💰 Big Bank Updated!')
      .setDescription(
        `**${game.dondState.playerName}** added **$${GameUI.formatMoney(bigBankChange)}** to the Big Bank!\n\n` +
        `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}\n\n` +
        `${result.isGoodDeal ? '🎉 **Good Deal!** You made profit!' : '😔 **Bad Deal!** You could have done better.'}`
      )
    ]
  });

  // Post to Big Bank channel
  await postDondResultToBigBank(interaction, game, result);

  // Achievement Tracking
  const playerCaseValue = game.dondState.cases.find(c => c.number === game.dondState.playerCaseNumber).value;
  AchievementHelper.trackDond(game, result.finalValue, true, playerCaseValue);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

  gameManager.endGame(interaction.channelId);
}

async function handleDondNoDeal(interaction, game) {
  const result = game.noDeal();

  await interaction.update({ components: [] });

  if (result.finalRound) {
    // Final round - offer switch
    const switchEmbed = GameUI.createDondSwitchEmbed(game);
    const switchButtons = GameUI.createDondSwitchButtons();

    await interaction.followUp({ embeds: [switchEmbed], components: switchButtons });
  } else {
    // Next round
    await interaction.followUp({
      content: `**NO DEAL!** 🔴\n\nMoving to Round ${game.dondState.currentRound + 1}...`
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const roundEmbed = GameUI.createDondRoundEmbed(game);
    const caseButtons = GameUI.createDondCaseButtons(game);

    await interaction.followUp({ embeds: [roundEmbed], components: caseButtons });
  }
}

async function handleDondSwitch(interaction, game) {
  const switchResult = game.switchCase();
  const result = game.finalizeDond(true);

  await interaction.update({
    content: `🔄 **You switched to Case ${switchResult.newCase}!**`,
    components: []
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  const resultEmbed = GameUI.createDondResultEmbed(game, result);
  await interaction.followUp({ embeds: [resultEmbed] });

  // Add to Big Bank
  await db.addLostMoney(interaction.guildId, result.finalValue);
  
  // Show Big Bank update embed in game channel
  const newBigBankTotal = await db.getGlobalLostMoney(interaction.guildId);
  await interaction.followUp({
    embeds: [new EmbedBuilder()
      .setColor(result.isGoodDeal ? '#00FF00' : '#FF6B6B')
      .setTitle('💰 Big Bank Updated!')
      .setDescription(
        `**${game.dondState.playerName}** added **$${GameUI.formatMoney(result.finalValue)}** to the Big Bank!\n\n` +
        `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}\n\n` +
        `${result.isGoodDeal ? '🎉 **Good Switch!** You made the right choice!' : '😔 **Bad Switch!** You should have kept your case.'}`
      )
    ]
  });
  
  await postDondResultToBigBank(interaction, game, result);

  // Achievement Tracking
  AchievementHelper.trackDond(game, result.finalValue, false, result.finalValue);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

  gameManager.endGame(interaction.channelId);
}

async function handleDondKeep(interaction, game) {
  const result = game.finalizeDond(false);

  await interaction.update({
    content: `🛡️ **You kept Case ${game.dondState.playerCaseNumber}!**`,
    components: []
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  const resultEmbed = GameUI.createDondResultEmbed(game, result);
  await interaction.followUp({ embeds: [resultEmbed] });

  // Add to Big Bank
  await db.addLostMoney(interaction.guildId, result.finalValue);
  
  // Show Big Bank update embed in game channel
  const newBigBankTotal = await db.getGlobalLostMoney(interaction.guildId);
  await interaction.followUp({
    embeds: [new EmbedBuilder()
      .setColor(result.isGoodDeal ? '#00FF00' : '#FF6B6B')
      .setTitle('💰 Big Bank Updated!')
      .setDescription(
        `**${game.dondState.playerName}** added **$${GameUI.formatMoney(result.finalValue)}** to the Big Bank!\n\n` +
        `🏦 **New Big Bank Total:** $${GameUI.formatMoney(newBigBankTotal)}\n\n` +
        `${result.isGoodDeal ? '🎉 **Good Choice!** You kept the better case!' : '😔 **Bad Choice!** You should have switched.'}`
      )
    ]
  });
  
  await postDondResultToBigBank(interaction, game, result);

  // Achievement Tracking
  AchievementHelper.trackDond(game, result.finalValue, false, result.finalValue);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'event');

  gameManager.endGame(interaction.channelId);
}

async function postDondResultToBigBank(interaction, game, outcome) {
  try {
    const guild = interaction.guild;
    const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

    if (bigBankChannel) {
      const newTotal = await db.getGlobalLostMoney(interaction.guildId);
      const embed = new EmbedBuilder()
        .setColor(outcome.isGoodDeal ? '#32CD32' : '#FF6B6B')
        .setTitle('💼 Deal or No Deal Completed!')
        .setDescription(
          `**Player:** ${game.dondState.playerName}\n` +
          `**Result:** ${game.dondState.dealAccepted ? 'DEAL' : 'NO DEAL'}\n` +
          `**Winnings:** $${GameUI.formatMoney(outcome.finalValue)}\n` +
          `**Outcome:** ${outcome.isGoodDeal ? '🎉 Good Deal!' : '😔 Bad Deal'}\n\n` +
          `🏦 **Big Bank Total:** $${GameUI.formatMoney(newTotal)}`
        )
        .setTimestamp();

      await bigBankChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error posting to big-bank channel:', error);
  }
}


async function handleResetBigBankCommand(interaction) {
  await interaction.deferReply();

  const oldTotal = await db.getGlobalLostMoney(interaction.guildId);
  await db.resetBigBank(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🏦 Big Bank Reset')
    .setDescription(
      '**The Big Bank has been reset to $0!**\n\n' +
      `💰 **Previous Total:** $${GameUI.formatMoney(oldTotal)}\n` +
      `🔄 **New Total:** $0.00\n\n` +
      '*The Big Bank will start accumulating again from Game Overs.*'
    )
    .setFooter({ text: 'Reset by ' + interaction.user.username })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // Post to Big Bank channel
  try {
    const guild = interaction.guild;
    const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

    if (bigBankChannel) {
      const updateEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🏦 Big Bank Reset')
        .setDescription(
          `**The Big Bank has been reset!**\n\n` +
          `💰 **Previous Total:** $${GameUI.formatMoney(oldTotal)}\n` +
          `🔄 **New Total:** $0.00\n\n` +
          `*Fresh start!*`
        )
        .setTimestamp();

      await bigBankChannel.send({ embeds: [updateEmbed] });
    }
  } catch (error) {
    console.error('Error posting to big-bank channel:', error);
  }
}

async function handleSetBigBankCommand(interaction) {
  await interaction.deferReply();

  const amount = interaction.options.getNumber('amount');
  const oldTotal = await db.getGlobalLostMoney(interaction.guildId);
  await db.setBigBank(interaction.guildId, amount);

  const embed = new EmbedBuilder()
    .setColor('#32CD32')
    .setTitle('🏦 Big Bank Updated')
    .setDescription(
      '**The Big Bank has been set to a new amount!**\n\n' +
      `💰 **Previous Total:** $${GameUI.formatMoney(oldTotal)}\n` +
      `🔄 **New Total:** $${GameUI.formatMoney(amount)}\n\n` +
      `*Big Bank manually adjusted by admin.*`
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // Post to Big Bank channel
  try {
    const guild = interaction.guild;
    const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

    if (bigBankChannel) {
      const updateEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏦 Big Bank Adjusted')
        .setDescription(
          `**Admin has adjusted the Big Bank!**\n\n` +
          `💰 **Previous Total:** $${GameUI.formatMoney(oldTotal)}\n` +
          `🔄 **New Total:** $${GameUI.formatMoney(amount)}\n\n` +
          `*Manually adjusted by admin.*`
        )
        .setTimestamp();

      await bigBankChannel.send({ embeds: [updateEmbed] });
    }
  } catch (error) {
    console.error('Error posting to big-bank channel:', error);
  }
}

// === HOW MUCH IS ENOUGH? (HMIE) HANDLERS ===

async function handleHMIECommand(interaction) {
  await interaction.deferReply();

  // Check if this is an allowed channel for HMIE
  const channel = await client.channels.fetch(interaction.channelId);
  const allowedChannels = ['💰-hmie', '🧪-test'];
  const isAllowedChannel = allowedChannels.some(name => channel.name === name);
  
  if (!isAllowedChannel) {
    return interaction.editReply({ 
      content: '❌ HMIE can only be played in these channels:\n• #💰-hmie\n• #🧪-test' 
    });
  }

  // Check if there's already a lobby or game in this channel
  const existingLobby = hmieLobbies.get(interaction.channelId);
  const existingGame = gameManager.getGame(interaction.channelId);

  if (existingLobby) {
    return interaction.editReply({ content: '❌ There is already an HMIE lobby in this channel!' });
  }

  if (existingGame) {
    return interaction.editReply({ content: '❌ There is already a game active in this channel! Use `/stopgame` first.' });
  }

  // Create lobby
  const lobby = {
    players: [],
    createdAt: Date.now(),
    channelId: interaction.channelId,
    guildId: interaction.guildId,
    creatorId: interaction.user.id,
    messageId: null,
    countdown: null,
    countdownInterval: null
  };

  hmieLobbies.set(interaction.channelId, lobby);

  // Show lobby embed
  const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
  const lobbyEmbed = GameUI.createHMIELobbyEmbed(lobby, 60);
  const lobbyButtons = GameUI.createHMIELobbyButtons(isAdmin, 0);

  const message = await interaction.editReply({ embeds: [lobbyEmbed], components: lobbyButtons });
  lobby.messageId = message.id;

  // Start 60-second countdown (update per-second like OneEgg)
  let secondsLeft = 60;

  lobby.countdownInterval = setInterval(async () => {
    try {
      secondsLeft -= 1;

      if (secondsLeft <= 0 || lobby.players.length >= 4) {
        clearInterval(lobby.countdownInterval);
        await startHMIEFromLobby(interaction.channelId);
        return;
      }

      // Update lobby embed every second
      const updatedEmbed = GameUI.createHMIELobbyEmbed(lobby, secondsLeft);
      const updatedButtons = GameUI.createHMIELobbyButtons(isAdmin, lobby.players.length);
      await message.edit({ embeds: [updatedEmbed], components: updatedButtons });
    } catch (error) {
      console.error('Error updating lobby:', error);
    }
  }, 1000);

  // Store timeout for cleanup (safety fallback)
  lobby.countdown = setTimeout(async () => {
    clearInterval(lobby.countdownInterval);
    await startHMIEFromLobby(interaction.channelId);
  }, 60000);
}

async function startHMIEFromLobby(channelId) {
  const lobby = hmieLobbies.get(channelId);
  if (!lobby) return;

  // Clean up timers
  if (lobby.countdown) clearTimeout(lobby.countdown);
  if (lobby.countdownInterval) clearInterval(lobby.countdownInterval);

  // Auto-fill remaining slots with bots
  const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
  while (lobby.players.length < 4) {
    const botIndex = lobby.players.filter(p => p.isBot).length;
    lobby.players.push({
      id: `bot_${botIndex}`,
      name: botNames[botIndex],
      isBot: true
    });
  }

  // Check minimum players (at least 1 human required)
  const humanPlayers = lobby.players.filter(p => !p.isBot);
  if (humanPlayers.length === 0) {
    hmieLobbies.delete(channelId);
    return; // Silently cancel if no human players
  }

  // Create game instance (using first human player)
  const firstHuman = humanPlayers[0];
  const game = new GameState(firstHuman.id, firstHuman.name, lobby.channelId, lobby.guildId, false);

  // Initialize HMIE state
  game.startHMIE(lobby.players);

  // Register game
  gameManager.activeGames.set(channelId, game);

  // Remove lobby
  hmieLobbies.delete(channelId);

  // Get the channel and send intro
  const channel = await client.channels.fetch(channelId);
  const introEmbed = GameUI.createHMIEIntroEmbed(game);
  const startButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hmie_start_round')
      .setLabel('▶️ Start Round 1')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [introEmbed], components: [startButton] });
}

async function handleMountCashmoreCommand(interaction) {
  await interaction.deferReply();

  // Check if this is an allowed channel for Mount Ca$hmore
  const channel = await client.channels.fetch(interaction.channelId);
  const allowedChannels = ['🗻-mount-cashmore', '🧪-test'];
  const isAllowedChannel = allowedChannels.some(name => channel.name === name);
  
  if (!isAllowedChannel) {
    return interaction.editReply({ 
      content: '❌ Mount Ca$hmore can only be played in these channels:\n• #🗻-mount-cashmore\n• #🧪-test' 
    });
  }

  // Check if there's already a game in this channel
  const existingGame = mountCashmoreGames.get(interaction.channelId);
  if (existingGame) {
    return interaction.editReply({ content: '❌ There is already a Mount Ca$hmore game in this channel! Please wait for the current game to finish.' });
  }

  // Check daily play limit (admins have unlimited plays)
  const hasAdminRole = isAdmin(interaction.member);
  
  if (!hasAdminRole) {
    // Check if player has already played Mount Ca$hmore today
    const today = db.getTodayGMT7();
    const playKey = `mount_cashmore_${interaction.user.id}_${interaction.guildId}_${today}`;
    const grantKey = `${interaction.user.id}_${interaction.guildId}_${today}`;
    
    // Use a simple in-memory check (could be moved to database for persistence)
    if (!global.mountCashmorePlayTracker) {
      global.mountCashmorePlayTracker = new Map();
    }
    
    // Check for granted plays
    if (!global.mountCashmoreGrantedPlays) {
      global.mountCashmoreGrantedPlays = new Map();
    }
    
    const grantedPlays = global.mountCashmoreGrantedPlays.get(grantKey) || 0;
    
    const usedPlays = global.mountCashmorePlayTracker.get(playKey) || 0;
    const limit = 5 + grantedPlays;
    
    if (usedPlays >= limit) {
      // Calculate time until next day (midnight GMT+7)
      const timeLeft = db.getTimeUntilNextResetGMT7();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.editReply({
        content: `❌ You've used all your plays for today (${usedPlays}/${limit}).\n\n⏰ **Time until reset:** ${hoursLeft}h ${minutesLeft}m\nCome back tomorrow!`
      });
    }
    
    // Increment play count
    global.mountCashmorePlayTracker.set(playKey, usedPlays + 1);
    
    // Clean up old entries (older than 2 days)
    // Keys confirm to: mount_cashmore_${userId}_${guildId}_${today}
    const Now = Date.now();
    for (const [key] of global.mountCashmorePlayTracker.entries()) {
        const parts = key.split('_');
        const dateStr = parts[parts.length - 1];
        // dateStr is YYYY-MM-DD
        const entryDate = new Date(dateStr).getTime();
        // If entry is older than 2 days (approx check)
        if (Now - entryDate > (3 * 24 * 60 * 60 * 1000)) {
            global.mountCashmorePlayTracker.delete(key);
        }
    }
  }

  // Get user data for Big Bank mode
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  
  let bigBankAmount = 0;
  try {
    bigBankAmount = await db.getGlobalLostMoney(guildId);
  } catch (error) {
    console.error('Error getting Big Bank data:', error);
    return interaction.editReply({ content: '❌ Error loading Big Bank data. Please try again.' });
  }

  // Create mode selection embed
  const embed = new EmbedBuilder()
    .setTitle('🏔️ Welcome to Mount Ca$hmore!')
    .setDescription(
      '**Choose your climbing mode:**\n\n' +
      '**🎯 Normal Mode**\n' +
      '• Jackpot: $200,000,000\n' +
      '• Standard pyramid (1 skull per level)\n' +
      '• 9 levels to climb\n\n' +
      '**💰 Big Bank Mode**\n' +
      `• Jackpot: $${bigBankAmount.toLocaleString()} (50% of your Big Bank)\n` +
      '• **HARDER:** 2 skulls removed, 2 Fatal Traps added\n' +
      '• Fatal Traps = Instant Game Over with $0\n' +
      '• High risk, high reward!'
    )
    .setColor('#FFD700')
    .setFooter({ text: 'You have 3 lives • Reach the summit for the jackpot!' });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mount_cashmore_mode_normal')
      .setLabel('🎯 Normal Mode')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('mount_cashmore_mode_bigbank')
      .setLabel('💰 Big Bank Mode')
      .setStyle(ButtonStyle.Success)
      .setDisabled(bigBankAmount === 0)
  );

  await interaction.editReply({ embeds: [embed], components: [buttons] });
}

async function handleMountCashmoreModeSelect(interaction, isBigBank) {
  await interaction.deferUpdate();

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  
  // Get Big Bank data
  let bigBankAmount = 0;
  try {
    bigBankAmount = await db.getGlobalLostMoney(guildId);
  } catch (error) {
    console.error('Error getting Big Bank data:', error);
    return interaction.followUp({ content: '❌ Error loading Big Bank data. Please try again.', ephemeral: true });
  }

  // Create game instance
  const game = new MountCashmore(userId, interaction.user.username, interaction.channelId, guildId, isBigBank, bigBankAmount);
  
  // Fetch global jackpot
  try {
    const jackpot = await db.getGlobalJackpot(guildId);
    game.setSkullSeekerJackpot(jackpot);
  } catch (error) {
    console.error('Error fetching global jackpot on start:', error);
  }

  mountCashmoreGames.set(interaction.channelId, game);

  // Show first level
  const levelEmbed = createMountCashmoreLevelEmbed(game);
  const squareButtons = createMountCashmoreSquareButtons(game);
  
  await interaction.editReply({ embeds: [levelEmbed], components: squareButtons });
}

async function handleMountCashmoreSquareSelect(interaction, squareIndex) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) {
    return interaction.followUp({ content: '❌ No active Mount Ca$hmore game found!', ephemeral: true });
  }

  // Check if it's the player's game
  if (game.userId !== interaction.user.id) {
    return interaction.followUp({ content: '❌ This is not your game!', ephemeral: true });
  }

  // Pick the square
  const result = game.pickSquare(squareIndex);
  
  if (!result) {
    return interaction.followUp({ content: '❌ Invalid square selection!', ephemeral: true });
  }

  // Phase 1: Selection animation
  await interaction.editReply({ 
    content: `👆 **Square ${squareIndex + 1} selected...**\n\n⏳ *Opening...*`,
    components: []
  });

  await new Promise(resolve => setTimeout(resolve, 1200));

  // Phase 2: Only add extra tension for special squares (not regular cash or skull)
  const squareType = result.square.type;
  const isSpecialSquare = !['cash', 'skull'].includes(squareType);
  
  if (isSpecialSquare) {
    const tensionMessages = [
      '👀 **Peeking inside...**',
      '💫 **Revealing contents...**',
      '✨ **Opening the square...**',
      '🎯 **Here it comes...**',
      '🔮 **Revealing your fate...**'
    ];
    const tensionMsg = tensionMessages[Math.floor(Math.random() * tensionMessages.length)];
    
    await interaction.editReply({ 
      content: `${tensionMsg}\n\n🔳 *Almost there...*`,
      components: []
    });

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Handle different square types
  await handleMountCashmoreSquareResult(interaction, game, result, squareIndex);
}

async function handleMountCashmoreSquareResult(interaction, game, result, squareIndex) {
  // Check if game is over
  if (result.gameOver) {
    const state = game.getGameState();
    let lossReason = null;
    let moneyLostToTrap = 0;
    let moneyBeforePot = 0;
    let moneyLostInRiskMode = 0;
    
    if (result.towerOfCrash) {
      lossReason = 'tower_of_crash';
    } else if (result.snowStorm) {
      lossReason = 'snow_storm';
    } else if (result.square && result.square.type === 'fatal_trap') {
      lossReason = 'fatal_trap';
      moneyLostToTrap = result.moneyLostToTrap || 0;
    } else if (result.square && result.square.type === 'gameover' && state.currentLevel === 9) {
      if (state.level9RiskMode && result.moneyLostInRiskMode) {
        // Climb mode (Risk) - lost everything
        lossReason = 'level9_risk_gameover';
        moneyLostInRiskMode = result.moneyLostInRiskMode || 0;
      } else if (state.isBigBank) {
        // Zipline mode (Big Bank Safe) - lose everything
        lossReason = 'level9_safe_gameover';
      } else {
        // Normal mode - KEEP winnings (no special loss reason)
        lossReason = 'normal_mode_gameover';
      }
    } else if (state.lives === 0) {
      lossReason = 'no_lives';
      moneyBeforePot = result.moneyBeforePot || 0;
    }
    
    // Track stats for events
    if (result.square.type === 'fatal_trap') {
      await db.incrementMountCashmoreStat(game.userId, game.guildId, 'times_hit_fatal_trap');
    }
    
    await handleMountCashmoreGameEnd(interaction, game, false, result.finalMoney || 0, lossReason, moneyLostToTrap, moneyBeforePot, moneyLostInRiskMode, result.moneyToBigBank || 0);
    return;
  }

  // Check if won the game
  if (result.won) {
    if (game.level9RiskMode) {
      await db.incrementMountCashmoreStat(game.userId, game.guildId, 'risk_mode_wins');
    }
    await handleMountCashmoreGameEnd(interaction, game, true, result.totalMoney || game.getGameState().totalMoney);
    return;
  }

    // Check if level is cleared
    if (result.levelCleared) {
      const state = game.getGameState();
      
      // Special decision point: Cleared Level 8, about to go to Level 9
      if (state.currentLevel === 8) {
        
        // If not Big Bank mode (Normal mode), skip decision and go straight to Level 9
        if (!state.isBigBank) {
            await interaction.editReply({ 
              content: `🏔️ **LEVEL 8 CLEARED!**\n\n🧗 **Preparing for the Final Ascent...**`,
              components: [] 
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Automatically advance to Level 9
            await handleMountCashmoreLevel9Decision(interaction, 'normal_auto');
            return;
        }

        const jackpot = game.getJackpot();
        
        const decisionEmbed = new EmbedBuilder()
          .setTitle('🏔️ THE FINAL ASCENT')
        .setDescription(
          `You've cleared Level 8! The summit awaits on Level 9...\n\n` +
          `**Your Current Winnings:** $${state.totalMoney.toLocaleString()}\n` +
          `**Jackpot at Summit:** $${jackpot.toLocaleString()}\n` +
          `**Climb Jackpot:** $${(jackpot * 10).toLocaleString()} (x10!)\n\n` +
          `**Choose Your Path:**`
        )
        .addFields(
          { 
            name: '🎪 Use Zipline', 
            value: `Go for the jackpot!\n` +
                   `• Find **Clear**: Win $${jackpot.toLocaleString()} + keep money!\n` +
                   `• Find **Game Over**: ${state.isBigBank ? '**LOSE EVERYTHING** → Big Bank' : `Keep your $${state.totalMoney.toLocaleString()}`}`, 
            inline: false 
          },
          { 
            name: '⚠️ Climb by Hand', 
            value: `Go for **x10 JACKPOT**!\n` +
                   `• Find **Clear**: Win **$${(jackpot * 10).toLocaleString()}** (x10!)\n` +
                   `• Find **Game Over**: **LOSE EVERYTHING** → Big Bank\n` +
                   `• Find **Tower of Cra$h**: Reset Leaderboard + Lose Game!\n` +
                   `• Find **Snow Storm**: A blizzard — escape with half your money (remaining goes to the Big Bank).`, 
            inline: false 
          },
          { 
            name: '🚶 Walk Away', 
            value: `Cash out now with $${state.totalMoney.toLocaleString()}\nNo risk, guaranteed payout.`, 
            inline: false 
          }
        )
        .setColor('#FFD700')
        .setFooter({ text: '2 squares (Zipline) or 5 squares (Climb)' });

      const decisionButtons = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('mount_cashmore_level9_safe')
            .setLabel('🎪 Use Zipline')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('mount_cashmore_level9_risk')
            .setLabel('⚠️ Climb by Hand')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('mount_cashmore_level9_walkaway')
            .setLabel('🚶 Walk Away')
            .setStyle(ButtonStyle.Primary)
        )
      ];

      await interaction.editReply({
        content: '🚨 **CRITICAL DECISION** 🚨',
        embeds: [decisionEmbed],
        components: decisionButtons
      });
      return;
    }
    
    // Normal level clear (not Level 8)
    const embed = createMountCashmoreLevelEmbed(game);
    const buttons = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mount_cashmore_advance')
          .setLabel(`▶️ Continue to Level ${state.currentLevel + 1}`)
          .setStyle(ButtonStyle.Success)
      )
    ];

    // Check if cash out is available
    if (game.canCashOut()) {
      buttons[0].addComponents(
        new ButtonBuilder()
          .setCustomId('mount_cashmore_cashout_confirm')
          .setLabel(`💰 Cash Out ($${result.totalMoney.toLocaleString()})`)
          .setStyle(ButtonStyle.Primary)
      );
    }

    await interaction.editReply({
      content: result.message,
      embeds: [embed],
      components: buttons
    });
    return;
  }

  // Check if requires special input
  if (result.requiresInput) {
    let embed = null;
    let buttons = [];

    switch (result.requiresInput) {
      case 'skull_seeker':
        embed = createMountCashmoreSkullSeekerEmbed(game, result.jackpot);
        buttons = createMountCashmoreSkullSeekerButtons(game.currentLevelSquares.length, game);
        break;

      case 'gamblers_luck':
        embed = createMountCashmoreGamblersLuckEmbed();
        buttons = createMountCashmoreGamblersLuckButtons();
        break;

      case 'decimalizer':
        embed = createMountCashmoreDecimalizerEmbed();
        buttons = createMountCashmoreDecimalizerButtons();
        break;

      case 'hosts_deal':
        embed = createMountCashmoreHostsDealEmbed(result.totalMoney, result.dealAmount);
        buttons = createMountCashmoreHostsDealButtons();
        break;
    }

    await interaction.editReply({
      content: result.message,
      embeds: embed ? [embed] : [],
      components: buttons
    });
    return;
  }

  // Normal square reveal (cash, skull, cash crash, etc.)
  const embed = createMountCashmoreLevelEmbed(game);
  const buttons = createMountCashmoreSquareButtons(game);

  // Add tension based on square type
  let tensionPrefix = '';
  const state = game.getGameState();
  
  if (result.message.includes('SKULL')) {
    if (result.message.includes('immunity')) {
      tensionPrefix = `🛡️ **IMMUNITY SAVED YOU!** 🛡️\n\n`;
    } else {
      tensionPrefix = `⚠️ **DANGER!** ⚠️\n\n`;
    }
  } else if (result.message.includes('CASH')) {
    const randomCashMsg = ['💰 **JACKPOT!**', '💵 **MONEY!**', '🤑 **CHA-CHING!**', '💸 **PAYDAY!**'];
    tensionPrefix = `${randomCashMsg[Math.floor(Math.random() * randomCashMsg.length)]}\n\n`;
  } else if (result.message.includes('CA$H CRASH')) {
    tensionPrefix = `💥 **DISASTER!** 💥\n\n`;
  }

  await interaction.editReply({
    content: `${tensionPrefix}${result.message}\n\n🏔️ **Level ${state.currentLevel}** • ❤️ **Lives: ${state.lives}${game.skullImmunity ? ' 🛡️' : ''}** • 💰 **Total: $${state.totalMoney.toLocaleString()}**`,
    embeds: [embed],
    components: buttons
  });
}

async function handleMountCashmoreAdvance(interaction) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  // Show tension message before advancing
  const currentLevel = game.getGameState().currentLevel;
  const nextLevel = currentLevel + 1;
  
  const advanceMessages = [
    `🧗 **Climbing higher...** Level ${nextLevel} awaits!`,
    `⛰️ **Ascending to Level ${nextLevel}...** The air gets thinner!`,
    `🏔️ **Moving up to Level ${nextLevel}...** Getting closer to the summit!`,
    `📈 **Level ${nextLevel} ahead...** The stakes are rising!`
  ];
  
  await interaction.editReply({
    content: advanceMessages[Math.floor(Math.random() * advanceMessages.length)],
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Sync Global Jackpot
  try {
      const jackpot = await db.getGlobalJackpot(interaction.guildId);
      game.setSkullSeekerJackpot(jackpot);
  } catch (error) {
      console.error('Error syncing global jackpot:', error);
  }

  game.advanceLevel();

  const levelEmbed = createMountCashmoreLevelEmbed(game);
  const squareButtons = createMountCashmoreSquareButtons(game);

  const state = game.getGameState();
  await interaction.editReply({
    content: `🏔️ **Level ${state.currentLevel}** • Lives: ${state.lives} • Money: $${state.totalMoney.toLocaleString()}`,
    embeds: [levelEmbed],
    components: squareButtons
  });
}

// Handle decision for Level 9 (Risk vs Safe vs Walk Away)
async function handleMountCashmoreLevel9Decision(interaction, decision) {
  if (decision !== 'normal_auto') {
      await interaction.deferUpdate();
  }

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  const state = game.getGameState();

  if (decision === 'walkaway') {
    // Player chose to walk away - cash out
    await interaction.editReply({
      content: `💰 **Cashing out...**\n\n📊 *You chose to walk away from Level 9...*`,
      components: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = game.cashOut();
    await handleMountCashmoreGameEnd(interaction, game, true, result.finalMoney, null);
    return;
  }

  // Set mode based on decision
  if (decision === 'risk') {
    game.level9RiskMode = true;
  } else if (decision === 'safe') {
    game.level9RiskMode = false;
  } else if (decision === 'normal_auto') {
    // Explicitly set for normal mode, though logic handles it
    game.level9RiskMode = false; 
  }

  // Advance to Level 9
  game.advanceLevel();

  const levelEmbed = createMountCashmoreLevelEmbed(game);
  const squareButtons = createMountCashmoreSquareButtons(game);

  const newState = game.getGameState();
  let modeText = '';
  let descriptionText = `❤️ Lives: ${newState.lives} • 💰 Money: $${newState.totalMoney.toLocaleString()}`;
  
  if (game.isBigBank) {
      modeText = newState.level9RiskMode ? '⚠️ CLIMB MODE' : '🎯 ZIPLINE MODE';
      descriptionText += `\n\n🎲 **50/50 chance** - Pick your destiny!`;
  } else {
      modeText = '🏔️ THE FINAL CLIMB';
      descriptionText += `\n\n🏆 Reach the summit for the Jackpot!`;
  }
  
  await interaction.editReply({
    content: `🏔️ **LEVEL 9 - THE SUMMIT** ${modeText}\n\n${descriptionText}`,
    embeds: [levelEmbed],
    components: squareButtons
  });
}

async function handleMountCashmoreCashout(interaction, confirm) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  if (!confirm) {
    // Cancelled cash out, continue playing
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);
    await interaction.editReply({ 
      content: '✅ **Changed your mind!** Continuing the climb...', 
      embeds: [levelEmbed], 
      components: squareButtons 
    });
    return;
  }

  // Add dramatic cash out sequence
  await interaction.editReply({
    content: `💰 **Cashing out...**\n\n📊 *Calculating final amount...*`,
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  await interaction.editReply({
    content: `📦 **Preparing withdrawal...**\n\n⏳ *Processing payment...*`,
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = game.cashOut();
  await handleMountCashmoreGameEnd(interaction, game, true, result.finalMoney, null);
}

async function handleMountCashmoreSkullSeeker(interaction, guessIndex) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  // Add tension before revealing
  await interaction.editReply({
    content: `🔍 **Checking position ${guessIndex + 1}...**\n\n👀 *Is the skull here?*`,
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Fetch global jackpot FIRST (to ensure accuracy)
  let currentJackpot = 100000;
  try {
      currentJackpot = await db.getGlobalJackpot(interaction.guildId);
      game.setSkullSeekerJackpot(currentJackpot);
  } catch (error) {
      console.error('Error fetching global jackpot:', error);
  }

  const result = game.handleSkullSeekerGuess(guessIndex);
  
  // Update Global Jackpot based on result
  try {
      if (result.success) {
          // Won! Reset to 100k
          await db.updateGlobalJackpot(interaction.guildId, 100000, true);
          game.setSkullSeekerJackpot(100000); // Sync local state
          
          AchievementHelper.trackMountCashmoreSkull(game, true);
          await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');
      } else {
          // Lost! Increase by 50k
          await db.updateGlobalJackpot(interaction.guildId, 50000, false);
          // Fetch new value to display correctly
          const newJackpot = await db.getGlobalJackpot(interaction.guildId);
          game.setSkullSeekerJackpot(newJackpot);
          
          // Update the message specifically to show NEW jackpot
          result.message = `💀 **WRONG!** 💀\n\n**Square ${guessIndex + 1}** is not a skull.\n\n📈 Global Jackpot increased to **$${newJackpot.toLocaleString()}**!`;
      }
  } catch (error) {
      console.error('Error updating global jackpot:', error);
  }

  const state = game.getGameState();

  if (result.won) {
    // Award Skull Seeker achievement
    try {
      await towerAchievements.awardAchievement('MOUNT_CASHMORE_SKULL_SEEKER', game.userId, game.username, game.guildId, interaction.channel);
    } catch (error) {
      console.error('Error awarding Skull Seeker achievement:', error);
    }
    
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);
    await interaction.editReply({
      content: `🎊 **INCREDIBLE!** 🎊\n\n✅ **CORRECT!** You found the skull!\n\n💰 Won **$${result.won.toLocaleString()}**!\n🛡️ **+SKULL IMMUNITY**\n\n💵 Total: $${state.totalMoney.toLocaleString()}`,
      embeds: [levelEmbed],
      components: squareButtons
    });
  } else {
    // Update result message with new jackpot
    await interaction.editReply({
      content: result.message,
      components: []
    });

    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await interaction.editReply({
      content: `💀 **WRONG!** 💀\n\n**Square ${guessIndex + 1}** is not a skull.\n\n⏳ *Adjusting jackpot...*`,
      components: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);
    await interaction.editReply({
      content: `💀 **WRONG!** 💀\n\n**Square ${guessIndex + 1}** is not a skull.\n\n📈 Jackpot increased by **$50,000**!\n💰 New Jackpot: **$${state.skullSeekerJackpot.toLocaleString()}**`,
      embeds: [levelEmbed],
      components: squareButtons
    });
  }
}

async function handleMountCashmoreGamblersLuck(interaction, panel) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  // Add tension animation
  await interaction.editReply({
    content: `🎰 **Opening Panel ${panel + 1}...**\n\n🎲 *Rolling the dice of fate...*`,
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = game.handleGamblersLuck(panel);
  
  // Check for error result
  if (result && result.type === 'error') {
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);
    await interaction.editReply({ 
      content: result.message, 
      embeds: [levelEmbed], 
      components: squareButtons 
    });
    return;
  }
  
  const state = game.getGameState();

  let resultMessage = '';
  if (result.percentage > 0) {
    resultMessage = `✅ **+${result.percentage}%!** Gained $${result.amount.toLocaleString()}!\n\nTotal: $${state.totalMoney.toLocaleString()}`;
  } else if (result.percentage < 0) {
    resultMessage = `❌ **${result.percentage}%!** Lost $${Math.abs(result.amount).toLocaleString()}!\n\nTotal: $${state.totalMoney.toLocaleString()}`;
  } else if (result.bounty) {
    resultMessage = `🎁 **Bounty!** Won $${result.bounty.toLocaleString()}!\n\nTotal: $${state.totalMoney.toLocaleString()}`;
  }

  const levelEmbed = createMountCashmoreLevelEmbed(game);
  const squareButtons = createMountCashmoreSquareButtons(game);

  await interaction.editReply({ content: resultMessage, embeds: [levelEmbed], components: squareButtons });
}

async function handleMountCashmoreDecimalizer(interaction, shouldToss) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  // Check if player chose to skip
  if (!shouldToss) {
    const result = game.handleDecimalizer(false);
    const state = game.getGameState();
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);
    await interaction.editReply({ 
      content: `⏭️ **SKIPPED!** Playing it safe...\n\n💰 Money unchanged: $${state.totalMoney.toLocaleString()}`,
      embeds: [levelEmbed], 
      components: squareButtons 
    });
    return;
  }

  // Player chose to toss the coin
  await interaction.editReply({
    content: `🪙 **Flipping the coin...**\n\n⏳ *Your fortune hangs in the balance...*`,
    components: []
  });
  
  await new Promise(resolve => setTimeout(resolve, 2500));

  const result = game.handleDecimalizer(true);
  const state = game.getGameState();

  let resultMessage = '';
  if (result.heads) {
    resultMessage = `🎉 **HEADS!** 🎉\n\n✨ **MULTIPLIED** by ${result.decimal.toFixed(1)}x!\n💰 Gained $${result.gain.toLocaleString()}!\n\n💵 Total: $${state.totalMoney.toLocaleString()}`;
  } else {
    resultMessage = `😱 **TAILS!** 😱\n\n📉 **DIVIDED** by ${result.decimal.toFixed(1)}x!\n💸 Lost $${result.loss.toLocaleString()}!\n\n💵 Total: $${state.totalMoney.toLocaleString()}`;
  }

  const levelEmbed = createMountCashmoreLevelEmbed(game);
  const squareButtons = createMountCashmoreSquareButtons(game);

  await interaction.editReply({ content: resultMessage, embeds: [levelEmbed], components: squareButtons });
}

async function handleMountCashmoreHostsDeal(interaction, accept) {
  await interaction.deferUpdate();

  const game = mountCashmoreGames.get(interaction.channelId);
  if (!game) return;

  // Add tension for decision
  if (accept) {
    await interaction.editReply({
      content: `🤝 **Processing deal...**\n\n💼 *The host is preparing your payment...*`,
      components: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    await interaction.editReply({
      content: `💰 **Deal accepted!**\n\n📤 *Finalizing transaction...*`,
      components: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const result = game.handleHostsDeal(accept);

  if (accept) {
    await handleMountCashmoreGameEnd(interaction, game, true, result.amount);
  } else {
    const state = game.getGameState();
    const levelEmbed = createMountCashmoreLevelEmbed(game);
    const squareButtons = createMountCashmoreSquareButtons(game);

    await interaction.editReply({
      content: `💪 **Deal rejected!**\n\n🔥 Continuing the climb with $${state.totalMoney.toLocaleString()}!`,
      embeds: [levelEmbed],
      components: squareButtons
    });
  }
}

async function handleMountCashmoreGameEnd(interaction, game, won, finalMoney, lossReason = null, moneyLostToTrap = 0, moneyBeforePot = 0, moneyLostInRiskMode = 0, extraBigBankMoney = 0) {
  const state = game.getGameState();
  // Check game state validity to prevent crashes
  if (!state) {
      console.error('Invalid game state in handleMountCashmoreGameEnd');
      return;
  }
  
  
  // Track Stats
  try {
    await db.incrementMountCashmoreStat(game.userId, game.guildId, 'total_games_played');
    await db.updateMountCashmoreMaxStat(game.userId, game.guildId, 'highest_level_reached', state.currentLevel);
    
    // Automatic Achievement Tracking
    const livesLost = 3 - (state.lives || 0);
    // Use 'minigame_end' to trigger the check we added in TowerAchievements.js
    AchievementHelper.trackMountCashmore(game, state.currentLevel, won, finalMoney, game.isBigBank, game.level9RiskMode, livesLost);
    await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

    if (won) {
      await db.incrementMountCashmoreStat(game.userId, game.guildId, 'summit_victories');
      await db.updateMountCashmoreMaxStat(game.userId, game.guildId, 'biggest_cash_out', finalMoney);
      await db.updateMountCashmoreMoney(game.userId, game.guildId, finalMoney);
    } else {
      // Game Over stats
      if (lossReason === 'no_lives') {
          await db.incrementMountCashmoreStat(game.userId, game.guildId, 'lives_lost', 3); // Lost all 3 lives
      }
      if (finalMoney > 0) {
          // If they consolate prize
          await db.updateMountCashmoreMoney(game.userId, game.guildId, finalMoney);
      }
    }
  } catch (err) {
    console.error('Error tracking Mount Cashmore stats:', err);
  }

  // Award game-over achievements (Legacy/Special cases)
  if (!won) {
    // FIRST_FLOOR_DEATH - game over on Level 1
    if (state.currentLevel === 1) {
      await towerAchievements.awardAchievement('FIRST_FLOOR_DEATH', game.userId, game.username, game.guildId, interaction.channel, { reason: lossReason });
    }

    // BROKE_PLAYER - ended with exactly $0
    if (finalMoney === 0) {
      await towerAchievements.awardAchievement('BROKE_PLAYER', game.userId, game.username, game.guildId, interaction.channel, { reason: lossReason });
    }
  }

  // Add dramatic game end sequence
  if (won) {
    await interaction.editReply({
      content: `🎯 **Game complete!**\n\n📊 *Tallying your earnings...*`,
      components: []
    });
  } else {
    await interaction.editReply({
      content: `⚠️ **Game over...**\n\n💸 *Calculating final payout...*`,
      components: []
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Save money to user (add to Tower of Cash high score)
  if (finalMoney > 0) {
    try {
      await db.modifyHighScore(game.userId, game.guildId, finalMoney);
    } catch (error) {
      console.error('Error saving money to high score:', error);
    }
  }

  // Add money to Big Bank based on loss conditions
  if (!won) {
    try {
      let bigBankAddition = 0;
      let bigBankReason = '';
      
      if (lossReason === 'tower_of_crash') {
        // Tower of Crash: Add ALL high scores from everyone to Big Bank, then reset
        const totalHighScores = await db.sumAllHighScores(game.guildId);
        bigBankAddition = totalHighScores;
        bigBankReason = 'Tower of Cra$h Collapse';
        
        // Reset the guild leaderboard (just like New Year Gift Tower of Crash)
        try {
          await db.resetGuildProgress(game.guildId);
        } catch (resetErr) {
          console.error('Error resetting guild progress for Tower of Crash:', resetErr);
        }
      }
      else if (lossReason === 'snow_storm') {
        bigBankAddition = extraBigBankMoney;
        bigBankReason = 'Snow Storm Blizzard';
      }
      // Fatal trap: add the money player had before losing everything
      else if (lossReason === 'fatal_trap') {
        bigBankAddition = moneyLostToTrap;
        bigBankReason = 'Fatal Trap';
      } 
      // Level 9 Risk Mode game over: player chose risk and lost everything
      else if (lossReason === 'level9_risk_gameover') {
        bigBankAddition = moneyLostInRiskMode;
        bigBankReason = 'Level 9 Risk Mode Game Over';
      }
      // Ran out of lives (3 skulls): player gets Game Over Pot %, rest goes to Big Bank
      else if (lossReason === 'no_lives' || state.lives === 0) {
        // moneyBeforePot = what they had before pot calculation
        // finalMoney = what they got to keep (pot amount)
        // Difference goes to Big Bank
        bigBankAddition = moneyBeforePot - finalMoney;
        const potPercent = game.gameOverPot[state.currentLevel] || 0;
        bigBankReason = `Ran Out of Lives (Level ${state.currentLevel}, kept ${potPercent * 100}%)`;
      }
      // Level 9 Zipline Mode: Lose everything, but amount is not tracked nicely to add to Big Bank easily without extra work
      
      if (bigBankAddition > 0) {
        await db.addToBigBank(game.guildId, bigBankAddition);
        
        // Notify in Big Bank channel
        const guild = interaction.guild;
        const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');
        
        if (bigBankChannel) {
          const currentBigBank = await db.getGlobalLostMoney(game.guildId);
          const bigBankEmbed = new EmbedBuilder()
            .setTitle('🏔️ Mount Ca$hmore Loss')
            .setDescription(
              `**${game.username}** lost in Mount Ca$hmore!\n\n` +
              `💀 **Reason:** ${bigBankReason}\n` +
              `💸 **Added to Big Bank:** $${bigBankAddition.toLocaleString()}\n` +
              `📊 **New Big Bank Total:** $${currentBigBank.toLocaleString()}` +
              (lossReason === 'tower_of_crash' ? `\n\n🏢 **LEADERBOARD RESET!** All guild high scores set to $0!` : '')
            )
            .setColor('#FF6B6B')
            .setTimestamp();
          
          await bigBankChannel.send({ embeds: [bigBankEmbed] });
        }
      }
    } catch (error) {
      console.error('Error adding to Big Bank:', error);
    }
  }

  // Award achievements if won
  if (won) {
    try {
      // Summit achievement (Level 9)
      if (state.currentLevel === 9) {
        await towerAchievements.awardAchievement('MOUNT_CASHMORE_SUMMIT', game.userId, game.username, game.guildId, interaction.channel);
        
        // Jackpot achievement (won at summit)
        await towerAchievements.awardAchievement('MOUNT_CASHMORE_JACKPOT', game.userId, game.username, game.guildId, interaction.channel);
        
        // Risk Mode achievement (x10 jackpot victory)
        if (state.level9RiskMode) {
          await towerAchievements.awardAchievement('MOUNT_CASHMORE_RISK_MODE', game.userId, game.username, game.guildId, interaction.channel);
        }
        
        // If Big Bank mode, deduct the 50% jackpot from Big Bank
        if (game.isBigBank) {
          try {
            const jackpotAmount = game.getJackpot(); // 50% of Big Bank
            await db.addToBigBank(game.guildId, -jackpotAmount);
            
            // Announce in Big Bank channel
            const guild = interaction.guild;
            const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');
            
            if (bigBankChannel) {
              const newBigBank = await db.getGlobalLostMoney(game.guildId);
              const bigBankEmbed = new EmbedBuilder()
                .setTitle('🏔️ Mount Ca$hmore Big Bank Victory!')
                .setDescription(
                  `**${game.username}** conquered Mount Ca$hmore in Big Bank Mode!\n\n` +
                  `🏆 **Won 50% of Big Bank:** $${jackpotAmount.toLocaleString()}\n` +
                  `📉 **Deducted from Big Bank:** $${jackpotAmount.toLocaleString()}\n` +
                  `📊 **New Big Bank Total:** $${newBigBank.toLocaleString()}`
                )
                .setColor('#FFD700')
                .setTimestamp();
              
              await bigBankChannel.send({ embeds: [bigBankEmbed] });
            }
          } catch (error) {
            console.error('Error deducting from Big Bank:', error);
          }
        }
      }
      
      // Lucky Climber (Level 7+ with no lives lost)
      if (state.currentLevel >= 7 && state.lives === 3) {
        await towerAchievements.awardAchievement('MOUNT_CASHMORE_LUCKY', game.userId, game.username, game.guildId, interaction.channel);
      }
      
      // Big Bank mode completion
      if (game.isBigBank) {
        await towerAchievements.awardAchievement('MOUNT_CASHMORE_BIG_BANK', game.userId, game.username, game.guildId, interaction.channel);
      }
      
      // Strategic Exit (cash out with $50M+)
      if (state.currentLevel < 9 && finalMoney >= 50000000) {
        await towerAchievements.awardAchievement('MOUNT_CASHMORE_CASH_OUT', game.userId, game.username, game.guildId, interaction.channel);
      }
    } catch (error) {
      console.error('Error awarding Mount Cashmore achievements:', error);
    }
  }

  // Create final embed
  let resultDescription = '';
  if (won) {
    resultDescription = `You successfully ${state.currentLevel === 9 ? 'reached the summit' : 'cashed out'}!\n\n💰 **Final Winnings:** $${finalMoney.toLocaleString()}`;
  } else {
    if (lossReason === 'tower_of_crash') {
      resultDescription = `🏢 **The Tower Collapsed!**\nYou lost everything in the wreckage.\n\n💸 **Lost:** $${state.totalMoney.toLocaleString()}`;
    } else if (lossReason === 'snow_storm') {
      resultDescription = `❄️ **Buried in Snow!**\nYou escaped with half your loot.\n\n💰 **Kept:** $${finalMoney.toLocaleString()}\n🏦 **Lost to Big Bank:** $${extraBigBankMoney.toLocaleString()}`;
    } else if (lossReason === 'level9_safe_gameover') {
      resultDescription = `💀 **Game Over!**\nThe Zipline broke!\n\n💸 **Lost:** All winnings`;
    } else if (lossReason === 'normal_mode_gameover') {
      resultDescription = `💀 **Game Over!**\nYou fell just short!\n\n💰 **Kept your winnings:** $${finalMoney.toLocaleString()}`;
    } else if (lossReason === 'level9_risk_gameover') {
      resultDescription = `💀 **Climb Failed!**\nYou lost everything!\n\n💸 **Lost:** $${moneyLostInRiskMode.toLocaleString()}`;
    } else if (lossReason === 'fatal_trap') {
      resultDescription = `⚰️ **Fatal Trap!**\nImmediate Game Over.\n\n💸 **Lost:** $${moneyLostToTrap.toLocaleString()}`;
    } else {
      resultDescription = `You ${state.lives === 0 ? 'ran out of lives' : 'failed'}!\n\n💰 **Consolation:** $${finalMoney.toLocaleString()}`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(won ? '🎉 Congratulations!' : '💀 Game Over')
    .setDescription(resultDescription)
    .setColor(won ? '#00FF00' : '#FF0000')
    .addFields(
      { name: '🏔️ Level Reached', value: `Level ${state.currentLevel}`, inline: true },
      { name: '❤️ Lives Remaining', value: `${state.lives}/3`, inline: true },
      { name: '💵 Total Earned', value: `$${state.totalMoney.toLocaleString()}`, inline: true }
    )
    .setFooter({ text: `Mode: ${game.isBigBank ? 'Big Bank' : 'Normal'}` })
    .setTimestamp();

  await interaction.editReply({ content: '', embeds: [embed], components: [] });

  // Clean up game
  mountCashmoreGames.delete(interaction.channelId);
}

// Helper functions for creating embeds and buttons
function createMountCashmoreLevelEmbed(game, revealedIndices = []) {
  const state = game.getGameState();
  
  // Build pyramid visual
  let pyramidText = '```\n';
  const squareCount = game.currentLevelSquares.length;
  
  for (let i = 0; i < squareCount; i++) {
    const squareNum = i + 1;
    const isRevealed = game.revealedSquares.includes(i) || revealedIndices.includes(i);
    
    if (isRevealed) {
      const square = game.currentLevelSquares[i];
      if (square.type === 'clear') pyramidText += '[✓]';
      else if (square.type === 'skull') pyramidText += '[💀]';
      else if (square.type === 'cash') pyramidText += '[$]';
      else if (square.type === 'cash_crash') pyramidText += '[💥]';
      else if (square.type === 'skull_seeker') pyramidText += '[🔍]';
      else if (square.type === 'gamblers_luck') pyramidText += '[🎰]';
      else if (square.type === 'decimalizer') pyramidText += '[🧮]';
      else if (square.type === 'hosts_deal') pyramidText += '[🤝]';
      else if (square.type === 'fatal_trap') pyramidText += '[⚰️]';
      else pyramidText += `[${squareNum}]`;
    } else {
      pyramidText += `[${squareNum}]`;
    }
    
    pyramidText += ' ';
  }
  pyramidText += '\n```';

  const embed = new EmbedBuilder()
    .setTitle(`🏔️ Mount Ca$hmore - Level ${state.currentLevel}`)
    .setDescription(
      `**Lives:** ${'❤️'.repeat(state.lives)}${'🖤'.repeat(3 - state.lives)}${game.skullImmunity ? ' 🛡️' : ''}\n` +
      `**Money:** $${state.totalMoney.toLocaleString()}\n` +
      `**Game Over Pot:** ${(game.gameOverPot[state.currentLevel] * 100).toFixed(0)}%\n` +
      (game.skullImmunity ? `\n🛡️ **SKULL IMMUNITY ACTIVE!** 🛡️\n` : '') +
      `\n**Choose a square:**\n${pyramidText}`
    )
    .setColor('#FFD700')
    .setFooter({ text: `Mode: ${game.isBigBank ? 'Big Bank' : 'Normal'} • Jackpot: $${game.getJackpot().toLocaleString()}` });

  return embed;
}

function createMountCashmoreSquareButtons(game) {
  const state = game.getGameState();
  const squareCount = game.currentLevelSquares.length;
  const buttons = [];
  let currentRow = new ActionRowBuilder();

  for (let i = 0; i < squareCount; i++) {
    const isRevealed = game.revealedSquares.includes(i);
    const square = game.currentLevelSquares[i];
    
    let buttonLabel;
    let buttonStyle;
    
    if (isRevealed) {
      // Show the content with emoji for revealed squares
      switch (square.type) {
        case 'clear':
          buttonLabel = '✅';
          buttonStyle = ButtonStyle.Success;
          break;
        case 'cash':
          // Show cash amount in compact form
          const cashAmount = square.value;
          if (cashAmount >= 1000000) {
            buttonLabel = `💵 $${(cashAmount / 1000000).toFixed(1)}M`;
          } else if (cashAmount >= 1000) {
            buttonLabel = `💵 $${(cashAmount / 1000)}K`;
          } else {
            buttonLabel = `💵 $${cashAmount}`;
          }
          buttonStyle = ButtonStyle.Success;
          break;
        case 'skull':
          buttonLabel = '💀';
          buttonStyle = ButtonStyle.Danger;
          break;
        case 'cash_crash':
          buttonLabel = '💥';
          buttonStyle = ButtonStyle.Danger;
          break;
        case 'skull_seeker':
          buttonLabel = '🔍';
          buttonStyle = ButtonStyle.Primary;
          break;
        case 'gamblers_luck':
          buttonLabel = '🎰';
          buttonStyle = ButtonStyle.Primary;
          break;
        case 'decimalizer':
          buttonLabel = '🧪';
          buttonStyle = ButtonStyle.Primary;
          break;
        case 'hosts_deal':
          buttonLabel = '🤝';
          buttonStyle = ButtonStyle.Primary;
          break;
        case 'fatal_trap':
          buttonLabel = '⚰️';
          buttonStyle = ButtonStyle.Danger;
          break;
        case 'gameover':
          buttonLabel = '💀';
          buttonStyle = ButtonStyle.Danger;
          break;
        default:
          buttonLabel = square.emoji || '❓';
          buttonStyle = ButtonStyle.Secondary;
      }
    } else {
      // Show number for unrevealed squares
      buttonLabel = `${i + 1}`;
      buttonStyle = ButtonStyle.Secondary;
    }
    
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`mount_cashmore_square_${i}`)
        .setLabel(buttonLabel)
        .setStyle(buttonStyle)
        .setDisabled(isRevealed)
    );

    if (currentRow.components.length === 5) {
      buttons.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  }

  if (currentRow.components.length > 0) {
    buttons.push(currentRow);
  }

  // Add cash out button if available
  if (game.canCashOut() && buttons.length < 5) {
    const state = game.getGameState();
    const cashOutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mount_cashmore_cashout_confirm')
        .setLabel(`💰 Cash Out ($${state.totalMoney.toLocaleString()})`)
        .setStyle(ButtonStyle.Success)
    );
    buttons.push(cashOutRow);
  }

  return buttons;
}

function createMountCashmoreSkullSeekerEmbed(game, jackpot) {
  
  return new EmbedBuilder()
    .setTitle('🔍 Skull Seeker')
    .setDescription(
      `Guess which square the skull is hiding behind!\n\n` +
      `**Jackpot:** $${jackpot.toLocaleString()}\n` +
      `**Reward:** Jackpot + Skull immunity this level`
    )
    .setColor('#FFD700');
}

function createMountCashmoreSkullSeekerButtons(squareCount, game) {
  const buttons = [];
  let currentRow = new ActionRowBuilder();

  for (let i = 0; i < squareCount; i++) {
    const isRevealed = game.revealedSquares.includes(i);
    
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`mount_cashmore_skull_${i}`)
        .setLabel(`${i + 1}`)
        .setStyle(isRevealed ? ButtonStyle.Secondary : ButtonStyle.Danger)
        .setDisabled(isRevealed)
    );

    if (currentRow.components.length === 5) {
      buttons.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  }

  if (currentRow.components.length > 0) {
    buttons.push(currentRow);
  }

  return buttons;
}

function createMountCashmoreGamblersLuckEmbed() {
  return new EmbedBuilder()
    .setTitle('🎰 Gambler\'s Luck')
    .setDescription(
      `Choose one of three panels!\n\n` +
      `**Each panel contains ONE of these (randomized):**\n` +
      `• 📈 Gain +10% to +90% of your money\n` +
      `• 📉 Lose -10% to -90% of your money\n` +
      `• 💰 Win a bounty ($10,000 - $500,000)\n\n` +
      `❓ **Which panel will you choose?**`
    )
    .setColor('#FFD700');
}

function createMountCashmoreGamblersLuckButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mount_cashmore_gamblers_1')
        .setLabel('🕹️ 1')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('mount_cashmore_gamblers_2')
        .setLabel('🕹️ 2')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('mount_cashmore_gamblers_3')
        .setLabel('🕹️ 3')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function createMountCashmoreDecimalizerEmbed() {
  return new EmbedBuilder()
    .setTitle('🧮 Gatorade® Decimalizer')
    .setDescription(
      `**Toss the coin to decide your fate!**\n\n` +
      `• 🪙 **Heads:** Multiply money by 1.1x - 2.0x\n` +
      `• 🪙 **Tails:** Divide money by same amount\n` +
      `• **Skip:** No change`
    )
    .setColor('#FFD700');
}

function createMountCashmoreDecimalizerButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mount_cashmore_decimalizer_toss')
        .setLabel('🪙 Toss Coin')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('mount_cashmore_decimalizer_skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function createMountCashmoreHostsDealEmbed(currentMoney, offer) {
  return new EmbedBuilder()
    .setTitle('🤝 Host\'s Deal')
    .setDescription(
      `**Your Money:** $${currentMoney.toLocaleString()}\n` +
      `**Host's Offer:** $${offer.toLocaleString()}\n\n` +
      `Take the money and quit, or keep climbing?`
    )
    .setColor('#FFD700');
}

function createMountCashmoreHostsDealButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mount_cashmore_deal_accept')
        .setLabel('✅ Accept Deal')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('mount_cashmore_deal_reject')
        .setLabel('❌ Reject & Continue')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

async function handleHMIEStartRound(interaction, game) {
  // Prevent double start
  if (game.hmieState.roundStarting || game.hmieState.clockRunning) return;
  game.hmieState.roundStarting = true;

  game.hmieState.processingResults = false;
  await interaction.update({ content: '⏱️ **Starting round...**', embeds: [], components: [] });

  const round = game.hmieState.currentRound;
  const maximum = game.getHMIERoundMax();
  const direction = game.getHMIERoundDirection();

  // Show round announcement
  const roundEmbed = GameUI.createHMIERoundEmbed(game, round, maximum, direction);
  await interaction.editReply({ embeds: [roundEmbed] });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start money clock animation
  await runHMIEMoneyClock(interaction, game);
}

async function runHMIEMoneyClock(interaction, game) {
  const maximum = game.getHMIERoundMax();
  const direction = game.getHMIERoundDirection();
  const increment = Math.floor(maximum / 500); // 500 steps = 50 seconds at 100ms interval

  game.hmieState.clockRunning = true;
  game.hmieState.roundStarting = false;
  game.hmieState.clockValue = direction === 'up' ? 0 : maximum;

  const lockInButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hmie_lock_in')
      .setLabel('🔒 LOCK IN')
      .setStyle(ButtonStyle.Primary)
  );

  // Generate random lock-in points for bot players (30-70% of max)
  const botPlayers = game.hmieState.players.filter(p => !p.eliminated && p.isBot);
  botPlayers.forEach(bot => {
    const randomPercent = 0.3 + (Math.random() * 0.4); // 30-70%
    bot.botLockInValue = Math.floor(maximum * randomPercent);
  });

  // Clear any existing timers
  if (game.hmieState.clockInterval) clearInterval(game.hmieState.clockInterval);
  if (game.hmieState.autoStopTimeout) clearTimeout(game.hmieState.autoStopTimeout);

  let lastUpdate = Date.now();

  game.hmieState.clockInterval = setInterval(async () => {
    // Update clock value
    if (direction === 'up') {
      game.hmieState.clockValue += increment;
      if (game.hmieState.clockValue >= maximum) {
        game.hmieState.clockValue = maximum;
        clearInterval(game.hmieState.clockInterval);
      }
    } else {
      game.hmieState.clockValue -= increment;
      if (game.hmieState.clockValue <= 0) {
        game.hmieState.clockValue = 0;
        clearInterval(game.hmieState.clockInterval);
      }
    }

    // Bot players auto-lock at their predetermined values
    botPlayers.forEach(bot => {
      if (!bot.hasLocked) {
        const shouldLock = direction === 'up'
          ? game.hmieState.clockValue >= bot.botLockInValue
          : game.hmieState.clockValue <= bot.botLockInValue;

        if (shouldLock) {
          game.lockInHMIEAmount(bot.id, game.hmieState.clockValue);
        }
      }
    });

    // Update embed every 500ms (reduced frequency to prevent Discord API lag)
    const now = Date.now();
    if (now - lastUpdate >= 500) {
      lastUpdate = now;

      try {
        const clockEmbed = GameUI.createMoneyClockEmbed(game, game.hmieState.clockValue);
        await interaction.editReply({ embeds: [clockEmbed], components: [lockInButton] });
      } catch (error) {
        console.error('Error updating clock:', error);
      }
    }

    // Clock only stops when it reaches the limit or when manually stopped
    // Players locking in no longer stops the clock - it runs to completion
    if (!game.hmieState.clockRunning && !game.hmieState.processingResults) {
      clearInterval(game.hmieState.clockInterval);
      game.hmieState.processingResults = true;

      // Process round results
      await new Promise(resolve => setTimeout(resolve, 1000));
      await processHMIERoundResults(interaction, game);
    }
  }, 100);

  // Auto-stop after timeout (50 seconds)
  game.hmieState.autoStopTimeout = setTimeout(() => {
    if (game.hmieState.clockRunning && !game.hmieState.processingResults) {
      clearInterval(game.hmieState.clockInterval);
      game.hmieState.clockRunning = false;
      game.hmieState.processingResults = true;

      // Auto-lock remaining players at current value
      game.hmieState.players
        .filter(p => !p.eliminated && !p.hasLocked)
        .forEach(p => {
          // If clock reached limit (0 or max), they get nothing
          if ((direction === 'up' && game.hmieState.clockValue >= maximum) ||
            (direction === 'down' && game.hmieState.clockValue <= 0)) {
            p.lockedAmount = 0;
          } else {
            p.lockedAmount = game.hmieState.clockValue;
          }
          p.hasLocked = true;
        });

      processHMIERoundResults(interaction, game);
    }
  }, 50000);
}

async function revealHMIEResultsDramatically(interaction, game, results) {
  // Shuffle player results into random order
  const shuffledResults = [...results.results].sort(() => Math.random() - 0.5);
  const totalPlayers = shuffledResults.length;
  const isRound5 = results.round === 5;

  let highestPlayerSoFar = null;
  let highestAmountSoFar = 0;

  // Reveal each player sequentially
  for (let i = 0; i < shuffledResults.length; i++) {
    const playerResult = shuffledResults[i];
    const revealNumber = i + 1;
    const isLastPlayer = revealNumber === totalPlayers;

    // Determine status message based on position
    let statusMessage = '';

    if (revealNumber === 1) {
      // First player: simple reveal
      statusMessage = '🎲 First player revealed!';
    } else {
      // 2nd-4th players: comparative message based on LOCKED amount during reveal
      const lockedAmount = playerResult.lockedAmount || 0;

      // Determine who will be highest AFTER this reveal
      let actualHighestPlayer;
      let actualHighestAmount;

      if (lockedAmount > highestAmountSoFar) {
        // Current player is now highest
        actualHighestPlayer = playerResult.playerName;
        actualHighestAmount = lockedAmount;
        statusMessage = `✅ **${playerResult.playerName} locked in the most!**\n`;
        if (highestPlayerSoFar && !isLastPlayer) {
          statusMessage += `⚠️ ${highestPlayerSoFar} is now at risk!`;
        }
      } else if (lockedAmount === highestAmountSoFar && lockedAmount > 0) {
        // Tied with current highest
        actualHighestPlayer = highestPlayerSoFar; // Previous highest is still co-leader
        actualHighestAmount = highestAmountSoFar;
        statusMessage = `✅ **${playerResult.playerName} tied for the lead!**\n`;
        if (highestPlayerSoFar) {
          statusMessage += `🤝 Both ${playerResult.playerName} and ${highestPlayerSoFar} are tied!`;
        }
      } else {
        // Previous player is still highest
        actualHighestPlayer = highestPlayerSoFar;
        actualHighestAmount = highestAmountSoFar;
        statusMessage = `⚠️ **${playerResult.playerName} is at risk!**\n`;
        if (actualHighestPlayer) {
          statusMessage += `✅ ${actualHighestPlayer} is still safe!`;
        }
      }
    }

    // Update highest player tracking using LOCKED amount
    if (playerResult.lockedAmount > highestAmountSoFar) {
      highestAmountSoFar = playerResult.lockedAmount;
      highestPlayerSoFar = playerResult.playerName;
    }

    // Create and send individual reveal embed
    const revealEmbed = GameUI.createIndividualPlayerRevealEmbed(
      game,
      playerResult,
      statusMessage,
      revealNumber,
      totalPlayers
    );

    if (revealNumber === 1) {
      await interaction.editReply({ embeds: [revealEmbed], components: [] });
    } else {
      await interaction.followUp({ embeds: [revealEmbed] });
    }

    // Pause before next reveal (1.5 seconds)
    if (revealNumber < totalPlayers) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // NOW apply the awards to player balances (after all reveals are complete)
  game.applyHMIERoundAwards(results);

  // Final pause before continuing
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function processHMIERoundResults(interaction, game) {
  const results = game.processHMIERound();

  // Apply awards to player balances
  game.applyHMIERoundAwards(results);

  // Show results embed
  const resultEmbed = GameUI.createRoundResultEmbed(game, results);
  await interaction.editReply({ embeds: [resultEmbed], components: [] });

  await new Promise(resolve => setTimeout(resolve, 4000));


  // Check if this was Round 5
  if (game.hmieState.currentRound === 5) {
    // Eliminate players and move to face-off
    const elimination = game.eliminateHMIEPlayers();

    const eliminationEmbed = GameUI.createEliminationEmbed(game, elimination);
    await interaction.followUp({ embeds: [eliminationEmbed] });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start face-off
    const faceOffData = game.startHMIEFaceOff();
    const faceOffIntroEmbed = GameUI.createFaceOffIntroEmbed(game, faceOffData);

    const startFaceOffButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hmie_start_faceoff')
        .setLabel('▶️ Start Final Face-Off')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.followUp({ embeds: [faceOffIntroEmbed], components: [startFaceOffButton] });
  } else {
    // Advance to next round
    game.advanceHMIERound();

    const nextRoundButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hmie_start_round')
        .setLabel(`▶️ Start Round ${game.hmieState.currentRound}`)
        .setStyle(ButtonStyle.Success)
    );

    await interaction.followUp({ components: [nextRoundButton] });
  }
}

async function handleHMIEFaceOff(interaction, game) {
  await interaction.update({ content: '⏱️ **Starting Final Face-Off...**', embeds: [], components: [] });

  await new Promise(resolve => setTimeout(resolve, 2000));

  const maximum = game.hmieState.faceOffMax;
  const increment = Math.floor(maximum / 500); // 500 steps = 50 seconds

  game.hmieState.clockValue = 0;

  // Create single STOP button for face-off
  const finalists = game.hmieState.players.filter(p => !p.eliminated);
  const faceOffButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hmie_faceoff_stop')
      .setLabel('⛔ STOP!')
      .setStyle(ButtonStyle.Danger)
  );

  // If any finalist is a bot, set random press point (40-100% of max)
  const botFinalists = finalists.filter(p => p.isBot);
  botFinalists.forEach(bot => {
    const randomPercent = 0.4 + (Math.random() * 0.6); // 40-100%
    bot.botPressValue = Math.floor(maximum * randomPercent);
  });

  // Store loop function to be called recursively
  const runFaceOffLoop = async () => {
    // Check if game still exists (it gets deleted when winner is declared)
    if (!gameManager.activeGames.has(game.channelId)) {
      game.hmieState.faceOffTimeout = null;
      return;
    }

    // Check if winner has been declared (stops immediately)
    if (game.hmieState.faceOffWinner) {
      game.hmieState.faceOffTimeout = null;
      return;
    }

    game.hmieState.clockValue += increment;

    if (game.hmieState.clockValue >= maximum) {
      game.hmieState.clockValue = maximum;
    }

    // Bot players auto-press at their predetermined value
    try {
      for (const bot of botFinalists) {
        if (!game.hmieState.faceOffWinner && game.hmieState.clockValue >= bot.botPressValue) {
          const result = game.playHMIEFaceOff(bot.id, game.hmieState.clockValue);
          if (result) {
            game.hmieState.faceOffTimeout = null;
            const resultEmbed = GameUI.createFaceOffResultEmbed(game, result);
            await interaction.editReply({ embeds: [resultEmbed], components: [] });
            
            // Award HMIE Achievements if winner is human
            const winner = game.hmieState.players.find(p => p.id === result.winner.id);
            if (winner && !winner.isBot) {
               await towerAchievements.awardAchievement('HMIE_WINNER', winner.id, winner.name, interaction.guildId, interaction.channel, { winnings: result.winner.winnings });
               
               if (result.winner.winnings === 50000) {
                 await towerAchievements.awardAchievement('HMIE_PERFECT', winner.id, winner.name, interaction.guildId, interaction.channel, { winnings: 50000 });
               }
            }

            gameManager.activeGames.delete(game.channelId);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error in real game bot face-off logic:', error);
    }

    try {
      // LAST CHECK: If winner declared, stop immediately and DO NOT update clock
      if (game.hmieState.faceOffWinner) {
        game.hmieState.faceOffTimeout = null;
        return;
      }

      const clockEmbed = GameUI.createFaceOffClockEmbed(game, game.hmieState.clockValue);
      await interaction.editReply({ embeds: [clockEmbed], components: [faceOffButtons] });

      // Continue loop if not maxed out
      if (game.hmieState.clockValue < maximum) {
        game.hmieState.faceOffTimeout = setTimeout(runFaceOffLoop, 100);
      } else {
        game.hmieState.faceOffTimeout = null;
      }
    } catch (error) {
      console.error('Error updating face-off clock:', error);
      game.hmieState.faceOffTimeout = null;
    }
  };

  // Start the recursive loop
  game.hmieState.faceOffTimeout = setTimeout(runFaceOffLoop, 100);
}

// ===== RTAB (Race To A Billion) HANDLERS =====

async function handleRTABCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // Handle leaderboard subcommand (no admin required)
  if (subcommand === 'leaderboard') {
    await interaction.deferReply();
    const leaderboard = await RTABDatabase.getLeaderboard(interaction.guildId, 10);
    const totalGames = await RTABDatabase.getTotalGames(interaction.guildId);
    const embed = RTABUI.createLeaderboardEmbed(leaderboard, totalGames, interaction.client);
    return interaction.editReply({ embeds: [embed] });
  }

  // Handle stats subcommand (no admin required)
  if (subcommand === 'stats') {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('player') || interaction.user;
    const stats = await RTABDatabase.getPlayerStats(targetUser.id, interaction.guildId);
    const embed = RTABUI.createStatsEmbed(targetUser, stats);
    return interaction.editReply({ embeds: [embed] });
  }

  // Handle start subcommand (unchanged, creates lobby)
  await interaction.deferReply();

  // Check if there's already a lobby or game
  const existingLobby = rtabLobbies.get(interaction.channelId);
  const existingGame = rtabGames.get(interaction.channelId);

  if (existingLobby) {
    return interaction.editReply({ content: '❌ There is already an RTAB lobby in this channel!' });
  }

  if (existingGame) {
    return interaction.editReply({ content: '❌ There is already an RTAB game active in this channel!' });
  }

  // Create lobby
  const lobby = new RTABLobby(interaction.channelId, interaction.guildId, interaction.user.id);

  // Add creator as first player
  lobby.addPlayer(interaction.user.id, interaction.user.username);

  rtabLobbies.set(interaction.channelId, lobby);

  const lobbyEmbed = RTABUI.createLobbyEmbed(lobby);
  const buttons = RTABUI.createLobbyButtons();

  await interaction.editReply({ embeds: [lobbyEmbed], components: buttons });

  // Start countdown
  startRTABLobbyCountdown(interaction.channelId, interaction.channel, lobby);
}

async function handleRTABJoin(interaction) {
  const lobby = rtabLobbies.get(interaction.channelId);

  if (!lobby) {
    return interaction.reply({ content: '❌ No lobby found in this channel!', ephemeral: true });
  }

  const result = lobby.addPlayer(interaction.user.id, interaction.user.username);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  const lobbyEmbed = RTABUI.createLobbyEmbed(lobby);
  const buttons = RTABUI.createLobbyButtons();
  await interaction.update({ embeds: [lobbyEmbed], components: buttons });

  // Auto-start when full
  if (lobby.isFull()) {
    if (lobby.countdownTimer) clearTimeout(lobby.countdownTimer);
    if (lobby.countdownInterval) clearInterval(lobby.countdownInterval);
    setTimeout(async () => {
      await startRTABGame(interaction.channel, lobby);
    }, 1000);
  }
}

function startRTABLobbyCountdown(channelId, channel, lobby) {
  // If timer already exists, don't restart (unless we want to reset? usually keeps running)
  if (lobby.countdownTimer) return;

  const timeoutDuration = 90 * 1000; // 90 seconds
  const startTime = Date.now();
  lobby.expiresAt = startTime + timeoutDuration;

  // Interval to update embed with countdown
  lobby.countdownInterval = setInterval(async () => {
    const timeLeft = Math.max(0, Math.ceil((lobby.expiresAt - Date.now()) / 1000));

    // Safety check if lobby still exists
    if (!rtabLobbies.has(channelId)) {
      clearInterval(lobby.countdownInterval);
      return;
    }

    // Update lobby message with time remaining (optional, or just rely on static message)
    // To minimize API calls, we might only update every 30s or not at all if not requested.
    // User request: "like HMIE" which implied auto-fill after 90s.
    // We won't spam updates unless necessary.
  }, 10000);

  // Timeout to auto-start
  lobby.countdownTimer = setTimeout(async () => {
    clearInterval(lobby.countdownInterval);
    lobby.countdownTimer = null;
    lobby.countdownInterval = null;

    if (!rtabLobbies.has(channelId)) return;

    // Fill with bots
    while (lobby.players.length < 4) {
      if (typeof lobby.addBot === 'function') {
        lobby.addBot();
      } else {
        // Fallback
        const botCount = lobby.players.filter(p => p.isBot).length + 1;
        lobby.players.push({
          userId: `bot_${Date.now()}_${botCount}`,
          username: `🤖 Bot ${botCount}`,
          joinedAt: Date.now(),
          isBot: true
        });
      }
    }

    // Start game
    channel.send('⏱️ **Time\'s up! Auto-filling bots and starting game...**');
    await startRTABGame(channel, lobby);

  }, timeoutDuration);
}

// Remove handleRTABAddBot function entirely

async function handleRTABLeave(interaction) {
  const lobby = rtabLobbies.get(interaction.channelId);

  if (!lobby) {
    return interaction.reply({ content: '❌ No lobby found in this channel!', ephemeral: true });
  }

  const result = lobby.removePlayer(interaction.user.id);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  const lobbyEmbed = RTABUI.createLobbyEmbed(lobby);
  const buttons = RTABUI.createLobbyButtons();
  await interaction.update({ embeds: [lobbyEmbed], components: buttons });

  // If lobby empty, delete it
  if (lobby.players.length === 0) {
    if (lobby.countdownTimer) clearTimeout(lobby.countdownTimer);
    if (lobby.countdownInterval) clearInterval(lobby.countdownInterval);
    rtabLobbies.delete(interaction.channelId);
  }
}

async function handleRTABStart(interaction) {
  const lobby = rtabLobbies.get(interaction.channelId);

  if (!lobby) {
    return interaction.reply({ content: '❌ No lobby found in this channel!', ephemeral: true });
  }

  // Clear countdowns if manually starting
  if (lobby.countdownTimer) clearTimeout(lobby.countdownTimer);
  if (lobby.countdownInterval) clearInterval(lobby.countdownInterval);

  // Only creator can force start
  if (interaction.user.id !== lobby.creatorId) {
    return interaction.reply({ content: '❌ Only the lobby creator can start the game!', ephemeral: true });
  }

  // Need at least 2 players
  if (lobby.players.length < 2) {
    // Auto-fill with bots if starting alone
    await interaction.reply({ content: '🤖 **Not enough humans? No problem! Adding bots...**', ephemeral: true });

    // Fill to 4 players
    while (lobby.players.length < 4) {
      if (typeof lobby.addBot === 'function') {
        lobby.addBot();
      } else {
        // Fallback for stale lobbies without addBot method
        const botCount = lobby.players.filter(p => p.isBot).length + 1;
        lobby.players.push({
          userId: `bot_${Date.now()}_${botCount}`,
          username: `🤖 Bot ${botCount}`,
          joinedAt: Date.now(),
          isBot: true
        });
      }
    }

    // Update lobby UI one last time
    const lobbyEmbed = RTABUI.createLobbyEmbed(lobby);
    await interaction.message.edit({ embeds: [lobbyEmbed], components: [] });
  } else {
    await interaction.update({ content: '⏱️ **Starting game...**', embeds: [], components: [] });
  }

  await startRTABGame(interaction.channel, lobby);
}

async function startRTABGame(channel, lobby) {
  // Remove lobby
  rtabLobbies.delete(channel.id);

  // Create game instance
  const game = new RTABGame(lobby);
  rtabGames.set(channel.id, game);

  // PATCH: Ensure bots are correctly identified (in case of stale class def)
  game.players.forEach(p => {
    if (p.userId.startsWith('bot_')) {
      p.isBot = true;
    }
  });

  // PATCH: Ensure revealedSquares set exists (in case of stale class def)
  if (!game.revealedSquares) {
    game.revealedSquares = new Set();
  }

  // DM each player to place bomb
  const humanPlayers = game.players.filter(p => !p.isBot && !p.userId.startsWith('bot_'));
  const botPlayers = game.players.filter(p => p.isBot || p.userId.startsWith('bot_'));

  // Auto-place bombs for bots
  if (botPlayers.length > 0) {
    const botResults = game.autoPlaceBotBombs();
    console.log(`Placed ${botResults.length} bot bombs automatically.`);
  }

  // NEW: Button-based bomb placement system
  if (humanPlayers.length > 0) {
    await handleBombPlacementPhase(channel, game, humanPlayers);
  }

  // Start the game
  game.gameStarted = true;

  // PATCH: Check if first player is bot and start their turn
  const firstPlayer = game.getCurrentPlayer();
  if (firstPlayer.isBot) {
    // Small delay to let game start message appear
    setTimeout(() => executeBotTurns(channel, game), 2000);
  }

  const gridEmbed = RTABUI.createGridEmbed(game);
  const gridButtons = RTABUI.createGridButtons(game);
  await channel.send({ embeds: [gridEmbed], components: gridButtons });
}

// NEW: Modal-based bomb placement handler
async function handleBombPlacementPhase(channel, game, humanPlayers) {
  const pendingPlacements = new Set(humanPlayers.map(p => p.userId));
  const placedPlayers = new Set();
  const TIMEOUT_DURATION = 60000; // 60 seconds
  let timeoutHandle;
  let statusMessage;

  // Create button to open bomb placement modal
  const placeBombButton = new ButtonBuilder()
    .setCustomId('rtab_place_bomb')
    .setLabel('💣 Place Your Bomb')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(placeBombButton);

  // Send initial message with button
  const updateStatusEmbed = () => {
    const waitingPlayers = Array.from(pendingPlacements)
      .map(id => humanPlayers.find(p => p.userId === id)?.username)
      .filter(Boolean);
    const placedPlayerNames = Array.from(placedPlayers)
      .map(id => humanPlayers.find(p => p.userId === id)?.username)
      .filter(Boolean);

    let description = '**💣 BOMB PLACEMENT PHASE**\n\n';
    description += '⏰ You have 60 seconds to place your bomb!\n';
    description += 'Click the button below to select your square.\n\n';
    
    if (placedPlayerNames.length > 0) {
      description += `✅ **Placed:** ${placedPlayerNames.join(', ')}\n`;
    }
    if (waitingPlayers.length > 0) {
      description += `⏳ **Waiting:** ${waitingPlayers.join(', ')}\n`;
    }

    return new EmbedBuilder()
      .setColor(pendingPlacements.size === 0 ? '#4CAF50' : '#FFC107')
      .setDescription(description)
      .setFooter({ text: `${placedPlayers.size}/${humanPlayers.length} players ready` });
  };

  statusMessage = await channel.send({ 
    embeds: [updateStatusEmbed()], 
    components: pendingPlacements.size > 0 ? [row] : []
  });

  // Start timeout
  const startTimeout = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    timeoutHandle = setTimeout(async () => {
      if (pendingPlacements.size > 0) {
        await handleTimeout(channel, game, statusMessage, pendingPlacements, placedPlayers, humanPlayers);
      }
    }, TIMEOUT_DURATION);
  };

  startTimeout();

  // Wait for all placements or timeout
  return new Promise((resolve) => {
    const collector = channel.createMessageComponentCollector({
      filter: i => i.customId === 'rtab_place_bomb' || i.customId.startsWith('rtab_timeout_'),
      time: 300000 // 5 minutes max
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'rtab_place_bomb') {
        // Check if user is a player who hasn't placed yet
        if (!pendingPlacements.has(interaction.user.id)) {
          if (placedPlayers.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ You already placed your bomb!', ephemeral: true });
          } else {
            return interaction.reply({ content: '❌ You are not in this game!', ephemeral: true });
          }
        }

        // Show modal for bomb placement
        const modal = new ModalBuilder()
          .setCustomId(`rtab_bomb_modal_${interaction.user.id}`)
          .setTitle('Place Your Bomb');

        const squareInput = new TextInputBuilder()
          .setCustomId('square_number')
          .setLabel('Enter square number (1-25)')
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(2)
          .setPlaceholder('1-25')
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(squareInput);
        modal.addComponents(row);

        await interaction.showModal(modal);

        // Handle modal submission
        try {
          const submitted = await interaction.awaitModalSubmit({
            filter: i => i.customId === `rtab_bomb_modal_${interaction.user.id}`,
            time: 60000
          });

          const squareNum = parseInt(submitted.fields.getTextInputValue('square_number'));

          if (isNaN(squareNum) || squareNum < 1 || squareNum > 25) {
            return submitted.reply({ content: '❌ Invalid square! Enter a number between 1-25.', ephemeral: true });
          }

          const squareIndex = squareNum - 1;
          const result = game.placeBomb(interaction.user.id, squareIndex);

          if (result.success) {
            pendingPlacements.delete(interaction.user.id);
            placedPlayers.add(interaction.user.id);

            await submitted.reply({ content: `✅ Bomb placed at square ${squareNum}!`, ephemeral: true });
            await statusMessage.edit({ 
              embeds: [updateStatusEmbed()], 
              components: pendingPlacements.size > 0 ? [row] : []
            });

            // Check if all players placed
            if (pendingPlacements.size === 0) {
              clearTimeout(timeoutHandle);
              collector.stop();
              resolve();
            }
          } else {
            await submitted.reply({ content: `❌ ${result.message}`, ephemeral: true });
          }
        } catch (error) {
          console.error('Modal submission error:', error);
        }
      } else if (interaction.customId.startsWith('rtab_timeout_')) {
        // Handle timeout decision buttons
        const action = interaction.customId.split('_')[2];
        
        if (!placedPlayers.has(interaction.user.id)) {
          return interaction.reply({ content: '❌ Only players who placed bombs can vote!', ephemeral: true });
        }

        await interaction.deferUpdate();

        if (action === 'retry') {
          await statusMessage.edit({ 
            embeds: [new EmbedBuilder()
              .setColor('#FFC107')
              .setDescription(`**⏰ RETRY**\n\n${interaction.user.username} voted to retry.\nPlayers who didn't place get 60 more seconds!`)],
            components: [row]
          });
          startTimeout();
        } else if (action === 'continue') {
          // Replace non-placers with bots
          for (const userId of pendingPlacements) {
            const player = game.players.find(p => p.userId === userId);
            if (player) {
              // Place random bomb for them
              const randomSquare = Math.floor(Math.random() * 25);
              game.placeBomb(userId, randomSquare);
              
              // Mark as bot
              player.isBot = true;
              placedPlayers.add(userId);
            }
          }
          pendingPlacements.clear();
          
          await statusMessage.edit({
            embeds: [new EmbedBuilder()
              .setColor('#4CAF50')
              .setDescription(`**✅ CONTINUING**\n\nInactive players replaced with bots.\nGame starting...`)],
            components: []
          });
          
          clearTimeout(timeoutHandle);
          collector.stop();
          resolve();
        } else if (action === 'abort') {
          await statusMessage.edit({
            embeds: [new EmbedBuilder()
              .setColor('#F44336')
              .setDescription(`**❌ GAME ABORTED**\n\n${interaction.user.username} cancelled the game.`)],
            components: []
          });
          
          clearTimeout(timeoutHandle);
          collector.stop();
          rtabGames.delete(channel.id);
          resolve();
        }
      }
    });

    collector.on('end', () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });
  });
}

async function handleTimeout(channel, game, statusMessage, pendingPlacements, placedPlayers, humanPlayers) {
  const waitingPlayers = Array.from(pendingPlacements)
    .map(id => humanPlayers.find(p => p.userId === id)?.username)
    .filter(Boolean);

  const retryButton = new ButtonBuilder()
    .setCustomId('rtab_timeout_retry')
    .setLabel('⏰ Retry (60s)')
    .setStyle(ButtonStyle.Primary);

  const continueButton = new ButtonBuilder()
    .setCustomId('rtab_timeout_continue')
    .setLabel('🤖 Continue (Replace with Bots)')
    .setStyle(ButtonStyle.Secondary);

  const abortButton = new ButtonBuilder()
    .setCustomId('rtab_timeout_abort')
    .setLabel('❌ Abort Game')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(retryButton, continueButton, abortButton);

  await statusMessage.edit({
    embeds: [new EmbedBuilder()
      .setColor('#F44336')
      .setDescription(`**⏰ TIME'S UP!**\n\n` +
        `${waitingPlayers.join(', ')} didn't place their bomb!\n\n` +
        `**Players who placed can decide:**\n` +
        `⏰ **Retry** - Give them 60 more seconds\n` +
        `🤖 **Continue** - Replace them with bots\n` +
        `❌ **Abort** - Cancel the game`)],
    components: [row]
  });
}

async function handleRTABSquareClick(interaction) {
  const game = rtabGames.get(interaction.channelId);

  if (!game) {
    return interaction.reply({ content: '❌ No game found in this channel!', ephemeral: true });
  }

  const squareIndex = parseInt(interaction.customId.split('_')[2]);
  const result = game.revealSquare(interaction.user.id, squareIndex);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  // Check if this is a bot - bots shouldn't show square reveals
  const playerWhoRevealed = result.player;
  const isBot = playerWhoRevealed && playerWhoRevealed.isBot;

  if (isBot) {
    // Bot turn: Don't show any reveal UI, just dismiss the interaction
    await interaction.update({ components: [] });
    return; // Exit early, no reveal animation for bots
  }

  // AUTHENTIC RTAB REVEAL SYSTEM (for human players)
  // Stage 1: "[Player] selects space [X]..."
  const stage1Embed = RTABUI.createTensionRevealEmbed(game, result, 1);
  await interaction.update({ embeds: [stage1Embed], components: [] });
  
  // Delay and show Stage 2: Money/suspense dots
  await new Promise(resolve => setTimeout(resolve, 3000));
  const stage2Embed = RTABUI.createTensionRevealEmbed(game, result, 2);
  await interaction.editReply({ embeds: [stage2Embed] });

  // RTAB suspense system: Always trigger on bombs/events, random otherwise
  const isSuspenseful = result.isBomb || result.type === 'event' || Math.random() < 0.3;
  if (isSuspenseful) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Suspense pause
  } else {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Stage 3: Full reveal "It's a **BOMB**" / "It's a minigame: **Name**!"
  const stage3Embed = RTABUI.createTensionRevealEmbed(game, result, 3);
  await interaction.editReply({ embeds: [stage3Embed] });

  // Phase 5: Add extra animation for major events (unchanged)
  const majorEvents = ['event_jackpot', 'event_starman', 'event_super_joker', 'event_minefield', 'event_bowser'];
  if (result.type === 'event' && majorEvents.includes(result.content.id)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const anim1 = RTABUI.createEventAnimationEmbed(result.content.nameEn, 1);
    const animMsg = await interaction.followUp({ embeds: [anim1] });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const anim2 = RTABUI.createEventAnimationEmbed(result.content.nameEn, 2);
    await animMsg.edit({ embeds: [anim2] });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const anim3 = RTABUI.createEventAnimationEmbed(result.content.nameEn, 3);
    await animMsg.edit({ embeds: [anim3] });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await animMsg.delete();
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Show updated board after reveal
  const gridEmbed = RTABUI.createGridEmbed(game);
  const gridButtons = RTABUI.createGridButtons(game);
  await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if market event was triggered
  if (result.type === 'event' && result.content.effect === 'market') {
    const marketEmbed = RTABUI.createMarketEmbed(game);
    const marketButtons = RTABUI.createMarketButtons(game);
    
    await interaction.followUp({ 
      content: `<@${game.marketState.player.userId}>`,
      embeds: [marketEmbed], 
      components: marketButtons 
    });
    return; // Wait for market interaction
  }

  // Check if minigames for all event was triggered
  if (result.type === 'event' && result.content.effect === 'minigames_for_all') {
    const mgResult = game.startMinigamesForAll();
    const mgEmbed = RTABUI.createMinigamesForAllEmbed(mgResult.results);
    await interaction.followUp({ embeds: [mgEmbed] });
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Continue to next turn
  }

  // Check if Bowser event was triggered
  if (result.type === 'event' && result.content.effect === 'bowser') {
    const player = game.players.find(p => p.userId === interaction.user.id);
    const bowserState = game.startBowserEvent(player.username);
    
    // Show intro
    await interaction.followUp({ 
      content: "It's B-B-B-**BOWSER**!!" 
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await interaction.followUp({ 
      content: `Wah, hah, HAH! Welcome to the **Bowser Event**, ${player.username}!` 
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Spin roulette wheel
    const totalSpins = 5 + Math.floor(Math.random() * 5);
    let currentIndex = Math.floor(Math.random() * 5);
    
    let wheelMessage = await interaction.followUp({ 
      embeds: [RTABUI.createBowserRouletteEmbed(bowserState, currentIndex)] 
    });

    for (let i = 0; i < totalSpins; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      currentIndex = (currentIndex + 1) % 5;
      await wheelMessage.edit({ 
        embeds: [RTABUI.createBowserRouletteEmbed(bowserState, currentIndex)] 
      });
    }

    // Find which event landed on
    const landedEvent = bowserState.wheel[currentIndex];
    const eventId = bowserState.event;

    await new Promise(resolve => setTimeout(resolve, 2000));
    await wheelMessage.delete();

    // Execute bowser event
    const bowserResult = game.resolveBowserEvent(eventId);
    const resultEmbed = RTABUI.createBowserResultEmbed(bowserResult);
    await interaction.followUp({ embeds: [resultEmbed] });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Check if minigame was triggered
  if (result.startMinigame) {
    let minigameEmbed, minigameButtons;

    if (result.minigameId === 'mg_coinflip') {
      minigameEmbed = RTABUI.createCoinFlipIntroEmbed(game);
      minigameButtons = RTABUI.createCoinFlipButtons();
    } else if (result.minigameId === 'mg_highlow' || result.minigameId === 'mg_gamble') {
      minigameEmbed = RTABUI.createGambleIntroEmbed(game);
      minigameButtons = RTABUI.createGambleButtons(game);
    } else if (result.minigameId === 'mg_dond' || result.minigameId === 'mg_deal') {
      minigameEmbed = RTABUI.createDONDIntroEmbed(game);
      minigameButtons = RTABUI.createDONDButtons();
    } else if (result.minigameId === 'mg_updown') {
      minigameEmbed = RTABUI.createUpDownIntroEmbed(game);
      minigameButtons = RTABUI.createUpDownButtons();
    } else if (result.minigameId === 'mg_safecracker' || result.minigameId === 'mg_safe') {
      minigameEmbed = RTABUI.createSafeCrackerIntroEmbed(game);
      minigameButtons = RTABUI.createSafeCrackerSafeButtons();
    } else if (result.minigameId === 'mg_moneycards') {
      minigameEmbed = RTABUI.createMoneyCardsIntroEmbed(game.minigameState);
      minigameButtons = RTABUI.createMoneyCardsButtons(game.minigameState);
    }

    if (minigameEmbed) {
      await interaction.followUp({ embeds: [minigameEmbed], components: minigameButtons });
      return; // Wait for minigame completion
    }
  }

  // Check win condition
  if (game.checkWinCondition()) {
    const winCondition = {
      condition: game.revealedSquares.size === 25 ? 'board_clear' : 'last_standing',
      winner: game.winner
    };

    // Award wager pot if exists
    const wagerResult = game.awardWagerPot();
    if (wagerResult) {
      const wagerEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 Wager Pot Awarded!')
        .setDescription(
          `**Total Pot:** $${RTABUI.formatMoney(wagerResult.pot)}\n\n` +
          `**Winners:**\n` +
          wagerResult.winners.map(w => `• ${w}: $${RTABUI.formatMoney(wagerResult.share)}`).join('\n')
        );
      await interaction.followUp({ embeds: [wagerEmbed] });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const winnerEmbed = RTABUI.createWinnerEmbed(game, winCondition);
    await interaction.followUp({ embeds: [winnerEmbed], components: [] });

    // Phase 5: Show game end summary with detailed rankings
    await new Promise(resolve => setTimeout(resolve, 2000));
    const summaryEmbed = RTABUI.createGameEndSummaryEmbed(game, game.winner);
    await interaction.followUp({ embeds: [summaryEmbed] });
    
    // Phase 5: Show replay highlights if any epic moments occurred
    await new Promise(resolve => setTimeout(resolve, 2000));
    const highlights = game.replaySession?.epicMoments || [];
    if (highlights.length > 0) {
      // Enrich highlights with player names
      const enrichedHighlights = await Promise.all(
        highlights.map(async highlight => {
          try {
            const user = await client.users.fetch(highlight.playerId);
            return { ...highlight, playerName: user.username };
          } catch (error) {
            return { ...highlight, playerName: 'Unknown Player' };
          }
        })
      );
      
      const replayEmbed = RTABReplay.createHighlightEmbed(enrichedHighlights[0]);
      await interaction.followUp({ 
        content: '🎬 **Epic Moment from this game:**',
        embeds: [replayEmbed] 
      });
    }

    // Save to database
    try {
      for (const player of game.players) {
        await RTABDatabase.updatePlayerStats(player.userId, game.guildId, {
          won: player.userId === game.winner.userId,
          moneyEarned: player.money,
          eliminations: 0
        });
      }

      await RTABDatabase.saveGameHistory(
        game.guildId,
        game.winner,
        winCondition.condition,
        game.players
      );
    } catch (error) {
      console.error('Error saving RTAB game:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Read delay
  }

  // Handle Peek Logic for next player
  const nextPlayer = game.getCurrentPlayer();
  if (nextPlayer.peekTurns > 0) {
    try {
      const peekInfo = game.getPeekInfo();
      if (peekInfo) {
        const user = await client.users.fetch(nextPlayer.userId);
        const emoji = peekInfo.isBomb ? '💣' :
          peekInfo.type === 'prize' ? '💵' :
            peekInfo.type === 'multiplier' ? '✖️' : '❓';

        await user.send(`👁️ **Peek Active (${nextPlayer.peekTurns} turns left):**\nSquare **${peekInfo.index + 1}** is ${emoji} ${peekInfo.isBomb ? 'BOMB' : peekInfo.type.toUpperCase()}`);
      }
    } catch (e) {
      console.error('Could not DM peek info:', e);
    }
  }

  // Trigger bot turns if next player is bot
  await executeBotTurns(interaction.channel, game);
}

// Helper to execute bot turns recursively
async function executeBotTurns(channel, game) {
  let currentPlayer = game.getCurrentPlayer();

  // Loop while current player is a bot and game is not over
  while (currentPlayer.isBot && !game.gameEnded) {
    // 1. Announce turn
    await channel.sendTyping();
    await new Promise(resolve => setTimeout(resolve, 1500)); // Thinking delay

    // 2. Perform move
    const result = game.handleBotTurn();
    if (!result) break; // Should not happen unless error or game ended

    // 3. Show move result
    const revealEmbed = RTABUI.createSquareRevealEmbed(game, result);
    const msg = await channel.send({
      content: `🤖 **${currentPlayer.username}** selects space **${result.squareIndex + 1}**...`,
      embeds: [revealEmbed]
    });

    await new Promise(resolve => setTimeout(resolve, 2000)); // Read delay

    // Show updated board after bot reveal (embed only, no buttons)
    const gridEmbed = RTABUI.createGridEmbed(game);
    await channel.send({ embeds: [gridEmbed] });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Handle Minigames (Auto-play for bots)
    if (result.startMinigame) {
      const minigameName = rtabConfig.contentPool.minigames.find(m => m.id === result.minigameId)?.nameEn || 'Minigame';
      await channel.send(`🎲 **${currentPlayer.username}** is playing **${minigameName}**...`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simple bot logic
      const botWinnings = Math.floor(Math.random() * 50000) + 10000;
      currentPlayer.money += botWinnings;

      await channel.send(`💰 **${currentPlayer.username}** won **$${botWinnings.toLocaleString()}** in the minigame!`);
      game.minigameState = null; // Clear minigame

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 5. Check Win Condition
    if (game.checkWinCondition()) {
      const winCondition = {
        condition: game.revealedSquares.size === 25 ? 'board_clear' : 'last_standing',
        winner: game.winner
      };

      game.gameEnded = true;
      const winEmbed = RTABUI.createWinnerEmbed(game, winCondition);
      await channel.send({ embeds: [winEmbed] });

      // Cleanup
      rtabGames.delete(channel.id);
      return;
    }

    // 6. Update current player for next loop
    currentPlayer = game.getCurrentPlayer();
  }

  // If loop exits and game not ended, it's human turn -> Show Grid
  if (!game.gameEnded && !game.isMinigameActive()) {
    const gridEmbed = RTABUI.createGridEmbed(game);
    const gridButtons = RTABUI.createGridButtons(game);
    await channel.send({ embeds: [gridEmbed], components: gridButtons });
  }
}

// Handle RTAB Minigame button clicks
async function handleRTABMinigameAction(interaction) {
  const game = rtabGames.get(interaction.channelId);

  if (!game) {
    return interaction.reply({ content: '❌ No game found!', ephemeral: true });
  }

  if (!game.isMinigameActive()) {
    return interaction.reply({ content: '❌ No active minigame!', ephemeral: true });
  }

  const customId = interaction.customId;
  let result;

  // Handle CoinFlip actions
  if (game.minigameType === 'coinflip') {
    if (customId === 'rtab_mg_heads') {
      result = game.playCoinFlip('heads');
    } else if (customId === 'rtab_mg_tails') {
      result = game.playCoinFlip('tails');
    } else if (customId === 'rtab_mg_stop') {
      result = game.playCoinFlip('stop');
    }

    if (result) {
      const embed = RTABUI.createCoinFlipResultEmbed(game, result);

      if (result.jackpot || result.lost || result.stopped) {
        // Minigame ended
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Return to main game grid
        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        // Continue minigame
        const buttons = RTABUI.createCoinFlipButtons();
        await interaction.update({ embeds: [embed], components: buttons });
      }
    }
  }
  // Handle Gamble actions
  else if (game.minigameType === 'gamble') {
    if (customId === 'rtab_mg_stop') {
      result = game.playGamble('stop');
    } else if (customId.startsWith('rtab_mg_gamble_')) {
      const spaceNum = customId.split('_')[3];
      result = game.playGamble(spaceNum);
    }

    if (result && !result.invalid && !result.alreadyPicked) {
      const embed = RTABUI.createGambleResultEmbed(game, result);

      if (result.jackpot || result.lost || result.stopped) {
        // Minigame ended  
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Return to main game grid
        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        // Continue minigame - show updated board
        const introEmbed = RTABUI.createGambleIntroEmbed(game);
        const buttons = RTABUI.createGambleButtons(game);
        await interaction.update({ embeds: [introEmbed], components: buttons });
      }
    } else if (result?.alreadyPicked) {
      await interaction.reply({ content: '❌ Already picked that space!', ephemeral: true });
    }
  }
  // Handle Deal or No Deal actions
  else if (game.minigameType === 'dond') {
    if (customId === 'rtab_mg_deal') {
      result = game.playDealOrNoDeal('deal');
    } else if (customId === 'rtab_mg_nodeal') {
      result = game.playDealOrNoDeal('nodeal');
    }

    if (result) {
      const embed = RTABUI.createDONDResultEmbed(game, result);

      if (result.accepted || result.finalBox) {
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        // Continue game - show updated board
        const introEmbed = RTABUI.createDONDIntroEmbed(game);
        const buttons = RTABUI.createDONDButtons();
        await interaction.update({ embeds: [introEmbed], components: buttons });
      }
    }
  }
  // Handle Up And Down actions
  else if (game.minigameType === 'updown') {
    if (customId === 'rtab_mg_stop') {
      result = game.playUpAndDown('stop');
    } else if (customId.startsWith('rtab_mg_updown_')) {
      const envelope = customId.split('_')[3];
      result = game.playUpAndDown(envelope);
    }

    if (result && !result.invalid) {
      const embed = RTABUI.createUpDownResultEmbed(game, result);

      if (result.stopped || result.busted) {
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        // Continue game - show updated board with new values
        const introEmbed = RTABUI.createUpDownIntroEmbed(game);
        const buttons = RTABUI.createUpDownButtons();
        await interaction.update({ embeds: [introEmbed], components: buttons });
      }
    }
  }
  // Handle Safe Cracker actions
  else if (game.minigameType === 'safecracker') {
    // Safe selection
    if (customId.startsWith('rtab_mg_safe_')) {
      const safe = customId.split('_')[3];
      result = game.playSafeCracker(safe);

      if (result && !result.invalid) {
        const embed = RTABUI.createSafeCrackerResultEmbed(game, result);

        if (result.stopped || result.busted) {
          await interaction.update({ embeds: [embed], components: [] });
          await new Promise(resolve => setTimeout(resolve, 2000));

          const gridEmbed = RTABUI.createGridEmbed(game);
          const gridButtons = RTABUI.createGridButtons(game);
          await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
        } else {
          const introEmbed = RTABUI.createSafeCrackerGameEmbed(game);
          const buttons = RTABUI.createSafeCrackerSafeButtons();
          await interaction.update({ embeds: [introEmbed], components: buttons });
        }
      }
    }
  }
  // Handle Double Zeroes actions
  else if (game.minigameType === 'double_zeroes') {
    if (customId.startsWith('rtab_mg_dz_')) {
      const digit = customId.split('_')[3];
      result = game.playDoubleZeroes(digit);

      if (result && !result.invalid) {
        const embed = RTABUI.createDoubleZeroesResultEmbed(result, game.minigameState);

        if (result.completed) {
          await interaction.update({ embeds: [embed], components: [] });
          await new Promise(resolve => setTimeout(resolve, 2000));
          const gridEmbed = RTABUI.createGridEmbed(game);
          const gridButtons = RTABUI.createGridButtons(game);
          await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
        } else {
          const buttons = RTABUI.createDoubleZeroesButtons(game.minigameState);
          await interaction.update({ embeds: [embed], components: buttons });
        }
      } else if (result?.error) {
        await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
      }
    }
  }
  // Handle Supercash actions
  else if (game.minigameType === 'supercash') {
    if (customId.startsWith('rtab_mg_sc_')) {
      const space = parseInt(customId.split('_')[3]);
      result = game.playSupercash(space);
    }

    if (result && !result.error) {
      const embed = RTABUI.createSupercashResultEmbed(result, game.minigameState);

      if (result.completed) {
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        const buttons = RTABUI.createSupercashButtons(game.minigameState);
        await interaction.update({ embeds: [embed], components: buttons });
      }
    } else if (result?.error) {
      await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }
  }
  // Handle The Offer actions
  else if (game.minigameType === 'theoffer') {
    let choice;
    if (customId === 'rtab_mg_offer_low') choice = 'low';
    else if (customId === 'rtab_mg_offer_medium') choice = 'medium';
    else if (customId === 'rtab_mg_offer_high') choice = 'high';
    else if (customId === 'rtab_mg_offer_stop') choice = 'stop';

    if (choice) {
      result = game.playTheOffer(choice);
    }

    if (result && !result.error) {
      const embed = RTABUI.createTheOfferResultEmbed(result, game.minigameState);

      if (result.completed) {
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else {
        const buttons = RTABUI.createTheOfferButtons(result.nextOffers);
        await interaction.update({ embeds: [embed], components: buttons });
      }
    } else if (result?.error) {
      await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }
  }
  // Handle Money Cards actions
  else if (game.minigameType === 'moneycards') {
    let action, payload;

    if (customId === 'rtab_mg_mc_change') {
      action = 'change';
    } else if (customId === 'rtab_mg_mc_higher') {
      action = 'direction';
      payload = 'higher';
    } else if (customId === 'rtab_mg_mc_lower') {
      action = 'direction';
      payload = 'lower';
    } else if (customId === 'rtab_mg_mc_bet_min') {
      action = 'wager';
      payload = 'min';
    } else if (customId === 'rtab_mg_mc_bet_half') {
      action = 'wager';
      payload = 'half';
    } else if (customId === 'rtab_mg_mc_bet_all') {
      action = 'wager';
      payload = 'all';
    }

    if (action) {
      result = game.playMoneyCards(action, payload);
    }

    if (result && !result.error) {
      if (result.completed) {
        const embed = RTABUI.createMoneyCardsResultEmbed(result, game.minigameState);
        await interaction.update({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const gridEmbed = RTABUI.createGridEmbed(game);
        const gridButtons = RTABUI.createGridButtons(game);
        await interaction.followUp({ embeds: [gridEmbed], components: gridButtons });
      } else if (result.phase === 'pick_wager') {
        // Show wager selection
        const embed = RTABUI.createMoneyCardsIntroEmbed(game.minigameState);
        const buttons = RTABUI.createMoneyCardsButtons(game.minigameState);
        await interaction.update({ embeds: [embed], components: buttons });
      } else {
        // Continue or show result
        const embed = result.message ?
          RTABUI.createMoneyCardsResultEmbed(result, game.minigameState) :
          RTABUI.createMoneyCardsIntroEmbed(game.minigameState);
        const buttons = RTABUI.createMoneyCardsButtons(game.minigameState);
        await interaction.update({ embeds: [embed], components: buttons });
      }
    } else if (result?.error) {
      await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }
  }
}

// ==================== RTAB MARKET HANDLERS ====================

async function handleRTABMarketAction(interaction) {
  const game = rtabGames.get(interaction.channelId);
  
  if (!game || !game.marketState) {
    return interaction.reply({ 
      content: '❌ No active market!', 
      ephemeral: true 
    });
  }
  
  // Check if it's the correct player
  if (game.marketState.player.userId !== interaction.user.id) {
    return interaction.reply({ 
      content: '❌ Not your turn at the market!', 
      ephemeral: true 
    });
  }
  
  const action = interaction.customId.replace('rtab_market_', '').toUpperCase();
  
  // Resolve the purchase
  const result = game.resolveMarketPurchase(action);
  
  // Show result
  await interaction.update({
    embeds: [RTABUI.createMarketResultEmbed(result)],
    components: []
  });

  // If robbery, show detailed message
  if (result.robbery) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (result.robbery.success) {
      await interaction.followUp({
        content: `🎉 **${game.marketState?.player?.username || 'Player'} successfully robbed the market!**\n\n` +
                 `**Rewards:**\n` +
                 `💰 +$${RTABUI.formatMoney(result.robbery.rewards.money)}\n` +
                 `🔥 +${result.robbery.rewards.boost}% Boost\n` +
                 `👁️ +${result.robbery.rewards.peek} Peek\n` +
                 `🎮 +1 Minigame`
      });
    }
  }

  // If info was bought, send privately
  if (result.info) {
    const infoText = Object.entries(result.info)
      .map(([type, count]) => `**${type}:** ${count}`)
      .join('\n');
    
    try {
      await interaction.user.send({
        embeds: [new EmbedBuilder()
          .setColor('#4CAF50')
          .setTitle('📊 Remaining Spaces Info')
          .setDescription(`**Remaining Spaces on Board:**\n\n${infoText}`)
        ]
      });
    } catch (error) {
      console.log('Could not DM info to user');
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // If market still open (player can buy more), show updated market
  if (game.marketState) {
    const embed = RTABUI.createMarketEmbed(game);
    const buttons = RTABUI.createMarketButtons(game);
    
    await interaction.followUp({
      embeds: [embed],
      components: buttons
    });
  } else {
    // Market closed, continue game
    const gridEmbed = RTABUI.createGridEmbed(game);
    const gridButtons = RTABUI.createGridButtons(game);
    await interaction.followUp({ 
      embeds: [gridEmbed], 
      components: gridButtons 
    });
  }
}

// ==================== RTAB WAGER COMMAND ====================

async function handleWagerCommand(interaction) {
  const game = rtabGames.get(interaction.channelId);
  
  if (!game || !game.gameStarted || game.gameEnded) {
    return interaction.reply({ 
      content: '❌ No active RTAB game in this channel!', 
      ephemeral: true 
    });
  }
  
  const player = game.players.find(p => p.userId === interaction.user.id);
  
  if (!player || player.isEliminated) {
    return interaction.reply({ 
      content: '❌ You are not in this game or have been eliminated!', 
      ephemeral: true 
    });
  }
  
  const amount = interaction.options?.getInteger('amount') || 250000;
  
  // Start the wager
  const result = game.startWager(player.userId, amount);
  
  if (!result.success) {
    return interaction.reply({ 
      content: `❌ ${result.message}`, 
      ephemeral: true 
    });
  }
  
  // Announce wager to everyone
  await interaction.reply({
    embeds: [RTABUI.createWagerEmbed(result)]
  });
  
  // Update the game board to show wager pot
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const gridEmbed = RTABUI.createGridEmbed(game);
  const gridButtons = RTABUI.createGridButtons(game);
  await interaction.followUp({ 
    embeds: [gridEmbed], 
    components: gridButtons 
  });
}

// ==================== RTAB PEEK COMMAND ====================

async function handlePeekCommand(interaction) {
  const game = rtabGames.get(interaction.channelId);
  
  if (!game || !game.gameStarted || game.gameEnded) {
    return interaction.reply({ 
      content: '❌ No active RTAB game!', 
      ephemeral: true 
    });
  }
  
  const player = game.players.find(p => p.userId === interaction.user.id);
  
  if (!player || player.isEliminated) {
    return interaction.reply({ 
      content: '❌ You are not in this game!', 
      ephemeral: true 
    });
  }
  
  if (player.peeks <= 0) {
    return interaction.reply({ 
      content: '❌ You have no peeks! Buy some at the RtaB Market!', 
      ephemeral: true 
    });
  }
  
  const squareNum = interaction.options?.getInteger('square');
  if (!squareNum) {
    return interaction.reply({
      content: '❌ Please specify a square number (1-25)!',
      ephemeral: true
    });
  }
  
  const squareIndex = squareNum - 1;
  
  // Use the peek
  const result = game.usePeek(player.userId, squareIndex);
  
  if (!result.success) {
    return interaction.reply({ 
      content: `❌ ${result.message}`, 
      ephemeral: true 
    });
  }
  
  // Show peek result (EPHEMERAL - only to the player!)
  await interaction.reply({
    embeds: [RTABUI.createPeekResultEmbed(result)],
    ephemeral: true
  });
  
  // Announce to channel that peek was used (without revealing what was seen)
  await interaction.channel.send({
    content: `👁️ **${player.username}** used a peek! (${player.peeks} remaining)`
  });
}

// ==================== RTAB BLAMMO COMMAND ====================

async function handleBlammoCommand(interaction) {
  const game = rtabGames.get(interaction.channelId);
  
  if (!game || !game.gameStarted || game.gameEnded) {
    return interaction.reply({ 
      content: '❌ No active RTAB game!', 
      ephemeral: true 
    });
  }
  
  const player = game.players.find(p => p.userId === interaction.user.id);
  
  if (!player || player.isEliminated) {
    return interaction.reply({ 
      content: '❌ You are not in this game!', 
      ephemeral: true 
    });
  }
  
  if (!player.hiddenCommand || player.hiddenCommand !== 'blammo') {
    return interaction.reply({ 
      content: '❌ You don\'t have the BLAMMO hidden command!', 
      ephemeral: true 
    });
  }

  if (game.futureBlammo) {
    return interaction.reply({
      content: '❌ A BLAMMO is already summoned!',
      ephemeral: true
    });
  }
  
  // Use the blammo summoner
  const result = game.useBlammoSummoner(player.userId);
  
  if (!result.success) {
    return interaction.reply({ 
      content: `❌ ${result.message}`, 
      ephemeral: true 
    });
  }
  
  // Announce BLAMMO summon
  await interaction.reply({
    embeds: [RTABUI.createBlammoSummonedEmbed(player.username)]
  });
}

// ==================== PHASE 5: RTAB STATUS COMMAND ====================

async function handleRTABStatusCommand(interaction) {
  const game = rtabGames.get(interaction.channelId);
  
  if (!game || !game.gameStarted || game.gameEnded) {
    return interaction.reply({ 
      content: '❌ No active RTAB game in this channel!', 
      ephemeral: true 
    });
  }
  
  const targetUser = interaction.options.getUser('player') || interaction.user;
  const player = game.players.find(p => p.userId === targetUser.id);
  
  if (!player) {
    return interaction.reply({ 
      content: `❌ ${targetUser.username} is not in this game!`, 
      ephemeral: true 
    });
  }
  
  await interaction.reply({
    embeds: [RTABUI.createPlayerStatusEmbed(game, player)],
    ephemeral: true
  });
}

// ==================== PHASE 5: RTAB STATISTICS COMMAND ====================

async function handleRTABStatsCommand(interaction) {
  const targetUser = interaction.options.getUser('player') || interaction.user;
  
  try {
    const stats = RTABStatistics.getPlayerStats(targetUser.id);
    
    if (!stats) {
      return interaction.reply({
        content: `📊 ${targetUser.username} hasn't played any RTAB games yet!`,
        ephemeral: true
      });
    }
    
    await interaction.reply({
      embeds: [RTABStatistics.createStatsEmbed(targetUser, stats)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    await interaction.reply({
      content: '❌ Failed to fetch statistics!',
      ephemeral: true
    });
  }
}

// ==================== PHASE 5: RTAB LEADERBOARD COMMAND ====================

async function handleRTABLeaderboardCommand(interaction) {
  const category = interaction.options.getString('category') || 'wins';
  const limit = interaction.options.getInteger('limit') || 10;
  
  try {
    const leaderboard = RTABStatistics.getLeaderboard(category, limit);
    
    if (leaderboard.length === 0) {
      return interaction.reply({
        content: '📊 No statistics available yet! Play some RTAB games first!',
        ephemeral: true
      });
    }
    
    // Fetch user data for leaderboard
    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async entry => {
        try {
          const user = await client.users.fetch(entry.userId);
          return { ...entry, username: user.username };
        } catch (error) {
          return { ...entry, username: 'Unknown User' };
        }
      })
    );
    
    await interaction.reply({
      embeds: [RTABStatistics.createLeaderboardEmbed(enrichedLeaderboard, category)],
      ephemeral: false
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    await interaction.reply({
      content: '❌ Failed to fetch leaderboard!',
      ephemeral: true
    });
  }
}

// ==================== PHASE 5: RTAB ACHIEVEMENTS COMMAND ====================

async function handleRTABAchievementsCommand(interaction) {
  const targetUser = interaction.options.getUser('player') || interaction.user;
  
  try {
    const stats = RTABStatistics.getPlayerStats(targetUser.id);
    
    if (!stats) {
      return interaction.reply({
        content: `⭐ ${targetUser.username} hasn't earned any achievements yet!`,
        ephemeral: true
      });
    }
    
    const achievements = RTABAchievements.getPlayerAchievements(stats);
    const score = RTABAchievements.getPlayerScore(stats);
    
    // Create achievement progress embed
    const embed = new EmbedBuilder()
      .setTitle(`⭐ ${targetUser.username}'s Achievements`)
      .setColor('#FFD700')
      .setDescription(`**Total Score:** ${score} points\n**Achievements Unlocked:** ${achievements.length}/19\n\n`)
      .setThumbnail(targetUser.displayAvatarURL());
    
    // Group achievements by rarity
    const rarityGroups = {
      legendary: { emoji: '💎', achievements: [] },
      epic: { emoji: '🌟', achievements: [] },
      rare: { emoji: '💜', achievements: [] },
      uncommon: { emoji: '💙', achievements: [] },
      common: { emoji: '⚪', achievements: [] }
    };
    
    achievements.forEach(ach => {
      rarityGroups[ach.rarity].achievements.push(ach);
    });
    
    // Add achievement sections by rarity
    for (const [rarity, group] of Object.entries(rarityGroups)) {
      if (group.achievements.length > 0) {
        const achList = group.achievements
          .map(ach => `${group.emoji} **${ach.name}** (+${ach.points}pts)\n*${ach.description}*`)
          .join('\n\n');
        
        embed.addFields({
          name: `${rarity.toUpperCase()} Achievements`,
          value: achList,
          inline: false
        });
      }
    }
    
    // Show locked achievements
    const allAchievements = RTABAchievements.initializeAchievements();
    const lockedCount = allAchievements.length - achievements.length;
    
    if (lockedCount > 0) {
      embed.addFields({
        name: '🔒 Locked Achievements',
        value: `${lockedCount} achievements remaining to unlock!`,
        inline: false
      });
    }
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    await interaction.reply({
      content: '❌ Failed to fetch achievements!',
      ephemeral: true
    });
  }
}

// ==================== PHASE 5: RTAB REPLAY COMMAND ====================

async function handleRTABReplayCommand(interaction) {
  const limit = interaction.options.getInteger('limit') || 5;
  
  try {
    const recentHighlights = RTABReplay.getRecentEpicMoments(limit);
    
    if (recentHighlights.length === 0) {
      return interaction.reply({
        content: '🎬 No epic moments recorded yet! Play some RTAB games to create highlights!',
        ephemeral: true
      });
    }
    
    // Enrich with user data
    const enrichedHighlights = await Promise.all(
      recentHighlights.map(async highlight => {
        try {
          const user = await client.users.fetch(highlight.playerId);
          return { ...highlight, playerName: user.username };
        } catch (error) {
          return { ...highlight, playerName: 'Unknown Player' };
        }
      })
    );
    
    await interaction.reply({
      embeds: [RTABReplay.createReplayCompilationEmbed(enrichedHighlights)],
      ephemeral: false
    });
  } catch (error) {
    console.error('Error fetching replays:', error);
    await interaction.reply({
      content: '❌ Failed to fetch replays!',
      ephemeral: true
    });
  }
}

// ==================== PHASE 5: RTAB GLOBAL STATS COMMAND ====================

async function handleRTABGlobalCommand(interaction) {
  try {
    await interaction.reply({
      embeds: [RTABStatistics.createGlobalStatsEmbed()],
      ephemeral: false
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    await interaction.reply({
      content: '❌ Failed to fetch global statistics!',
      ephemeral: true
    });
  }
}

// END OF RTAB HANDLERS BLOCK

// ==================== RTAB6 PORT: NEW COMMAND HANDLERS ====================
// ALL TOURNAMENT/CHALLENGE/BOUNTY/LEVEL/MINIGAME HANDLERS COMMENTED OUT - USE RTAB CLASSES

/*
// Tournament Command Handler
async function handleTournamentCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const user = interaction.user;

  try {
    switch (subcommand) {
      case 'start': {
        // Admin only
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: '❌ Only administrators can start tournaments!',
            ephemeral: true
          });
        }

        const botCount = interaction.options.getInteger('botcount') || 0;

        // Check if tournament already exists
        const existingGame = rtabGames.get(channelId);
        if (existingGame && existingGame.tournament) {
          return interaction.reply({
            content: '❌ A tournament is already running in this channel!',
            ephemeral: true
          });
        }

        // Create or get RTAB game
        let game = rtabGames.get(channelId);
        if (!game) {
          // Create minimal game for tournament
          const lobby = new RTABLobby(channelId, guildId, user.id);
          lobby.addPlayer(user.id, user.username);
          game = new RTABGame(lobby);
          rtabGames.set(channelId, game);
        }

        // Initialize tournament
        await game.initTournament({ botCount, demoDelay: 45 });

        const embed = RTABUI.createTournamentLobbyEmbed(game.tournament);
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('tournament_ready')
            .setLabel('Ready!')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('tournament_leaderboard')
            .setLabel('Leaderboard')
            .setEmoji('🏆')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          content: '🏆 **Tournament Started!**',
          embeds: [embed],
          components: [buttons]
        });

        break;
      }

      case 'ready': {
        const game = rtabGames.get(channelId);
        if (!game || !game.tournament) {
          return interaction.reply({
            content: '❌ No tournament is running in this channel!',
            ephemeral: true
          });
        }

        await interaction.deferReply();

        // Register player
        await game.tournament.registerHuman(user.id, user.username);

        // Run tournament round
        const result = await game.tournament.runTournamentRound(
          { userId: user.id, username: user.username },
          new Set() // No enhancements for now
        );

        const resultEmbed = RTABUI.createMinigameResultEmbed({
          winnings: result.totalWinnings,
          result: `You completed the tournament round!\n\n**Total Winnings:** $${result.totalWinnings.toLocaleString()}\n**Rank:** ${result.rank}`
        });

        await interaction.editReply({
          embeds: [resultEmbed]
        });

        break;
      }

      case 'leaderboard': {
        const game = rtabGames.get(channelId);
        if (!game || !game.tournament) {
          return interaction.reply({
            content: '❌ No tournament is running in this channel!',
            ephemeral: true
          });
        }

        const limit = interaction.options.getInteger('limit') || 10;
        const embed = RTABUI.createTournamentLobbyEmbed(game.tournament);

        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

        break;
      }

      case 'status': {
        const game = rtabGames.get(channelId);
        if (!game || !game.tournament) {
          return interaction.reply({
            content: '❌ No tournament is running in this channel!',
            ephemeral: true
          });
        }

        const participant = game.tournament.participants.get(user.id);
        if (!participant) {
          return interaction.reply({
            content: '❌ You haven\'t joined the tournament yet! Use `/tournament ready` to play.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆 Your Tournament Status')
          .addFields(
            { name: '💰 Total Money', value: `$${participant.money.toLocaleString()}`, inline: true },
            { name: '🎮 Games Played', value: `${participant.gamesPlayed}`, inline: true },
            { name: '🏅 Current Rank', value: participant.rank, inline: true }
          );

        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

        break;
      }
    }
  } catch (error) {
    console.error('Error handling tournament command:', error);
    await interaction.reply({
      content: '❌ An error occurred!',
      ephemeral: true
    });
  }
}

// Challenge Command Handler
async function handleChallengeCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;
  const user = interaction.user;

  try {
    switch (subcommand) {
      case 'start': {
        // Admin only
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: '❌ Only administrators can start challenges!',
            ephemeral: true
          });
        }

        const botCount = interaction.options.getInteger('botcount') || 8;

        // Check if challenge already exists
        const existingGame = rtabGames.get(channelId);
        if (existingGame && existingGame.challenge) {
          return interaction.reply({
            content: '❌ A challenge is already running in this channel!',
            ephemeral: true
          });
        }

        // Create or get RTAB game
        let game = rtabGames.get(channelId);
        if (!game) {
          const lobby = new RTABLobby(channelId, guildId, user.id);
          lobby.addPlayer(user.id, user.username);
          game = new RTABGame(lobby);
          rtabGames.set(channelId, game);
        }

        // Initialize challenge
        await game.initChallenge({ 
          baseNumerator: 1, 
          baseDenominator: 1,
          runDemos: 3 
        });

        const embed = RTABUI.createChallengeEmbed(game.challenge);

        await interaction.reply({
          content: '⚔️ **Super Bot Challenge Started!**',
          embeds: [embed]
        });

        break;
      }

      case 'status': {
        const game = rtabGames.get(channelId);
        if (!game || !game.challenge) {
          return interaction.reply({
            content: '❌ No challenge is running in this channel!',
            ephemeral: true
          });
        }

        const embed = RTABUI.createChallengeEmbed(game.challenge);

        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

        break;
      }

      case 'find': {
        const game = rtabGames.get(channelId);
        if (!game || !game.challenge) {
          return interaction.reply({
            content: '❌ No challenge is running in this channel!',
            ephemeral: true
          });
        }

        const searchResult = await game.challenge.searchForHumanGame(user.id);

        if (!searchResult.found) {
          return interaction.reply({
            content: `❌ ${searchResult.message}`,
            ephemeral: true
          });
        }

        await interaction.reply({
          content: `✅ Found your next game!\n**Game #${searchResult.gameIndex + 1}** in the campaign.\n\nUse \`/challenge join\` to play!`,
          ephemeral: true
        });

        break;
      }

      case 'join': {
        const game = rtabGames.get(channelId);
        if (!game || !game.challenge) {
          return interaction.reply({
            content: '❌ No challenge is running in this channel!',
            ephemeral: true
          });
        }

        await interaction.deferReply();

        const searchResult = await game.challenge.searchForHumanGame(user.id);

        if (!searchResult.found) {
          return interaction.editReply({
            content: `❌ ${searchResult.message}`
          });
        }

        // Load the human game
        await game.challenge.loadHumanGame(searchResult.gameIndex, user.id);

        await interaction.editReply({
          content: `✅ Game loaded! Starting your campaign match...`,
          embeds: [RTABUI.createChallengeEmbed(game.challenge)]
        });

        break;
      }
    }
  } catch (error) {
    console.error('Error handling challenge command:', error);
    await interaction.reply({
      content: '❌ An error occurred!',
      ephemeral: true
    });
  }
}

// Level Command Handler
async function handleLevelCommand(interaction) {
  const targetUser = interaction.options.getUser('player') || interaction.user;
  const guildId = interaction.guildId;

  try {
    // Find any active game with player level system
    let playerLevel = null;
    
    for (const [channelId, game] of rtabGames.entries()) {
      if (game.playerLevel && game.guildId === guildId) {
        playerLevel = game.playerLevel;
        break;
      }
    }

    // Create a temporary instance if none found
    if (!playerLevel) {
      const PlayerLevel = require('./RTAB/PlayerLevel');
      playerLevel = new PlayerLevel(guildId);
      await playerLevel.load();
    }

    const playerData = await playerLevel.getPlayerData(targetUser.id, targetUser.username);

    if (!playerData) {
      return interaction.reply({
        content: `📊 ${targetUser.username} hasn't earned any XP yet!`,
        ephemeral: true
      });
    }

    const embed = RTABUI.createLevelEmbed(playerData);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling level command:', error);
    await interaction.reply({
      content: '❌ An error occurred!',
      ephemeral: true
    });
  }
}

// Bounty Command Handler
async function handleBountyCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channelId = interaction.channelId;

  try {
    switch (subcommand) {
      case 'list': {
        const game = rtabGames.get(channelId);
        if (!game || !game.bountyController) {
          return interaction.reply({
            content: '❌ No active game with bounties in this channel!',
            ephemeral: true
          });
        }

        // Get all players with bounties
        const bountyData = {};
        for (const player of game.players) {
          if (player.bountyValue > 0) {
            bountyData[player.userId] = {
              username: player.username,
              bountyValue: player.bountyValue
            };
          }
        }

        if (Object.keys(bountyData).length === 0) {
          return interaction.reply({
            content: '💰 No active bounties in this game!',
            ephemeral: true
          });
        }

        const embed = RTABUI.createBountyEmbed(bountyData);

        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });

        break;
      }

      case 'check': {
        const targetUser = interaction.options.getUser('player', true);
        const game = rtabGames.get(channelId);
        
        if (!game || !game.bountyController) {
          return interaction.reply({
            content: '❌ No active game with bounties in this channel!',
            ephemeral: true
          });
        }

        const player = game.players.find(p => p.userId === targetUser.id);
        
        if (!player) {
          return interaction.reply({
            content: `❌ ${targetUser.username} is not in this game!`,
            ephemeral: true
          });
        }

        if (player.bountyValue <= 0) {
          return interaction.reply({
            content: `💰 ${targetUser.username} has no bounty.`,
            ephemeral: true
          });
        }

        await interaction.reply({
          content: `💰 **${targetUser.username}** has a bounty of **$${player.bountyValue.toLocaleString()}**!`,
          ephemeral: true
        });

        break;
      }
    }
  } catch (error) {
    console.error('Error handling bounty command:', error);
    await interaction.reply({
      content: '❌ An error occurred!',
      ephemeral: true
    });
  }
}

// Minigame Command Handler
async function handleMinigameCommand(interaction) {
  const gameType = interaction.options.getString('game', true);
  const wager = interaction.options.getInteger('wager') || 1000;
  const user = interaction.user;
  const channelId = interaction.channelId;

  try {
    await interaction.deferReply();

    // Create a temporary game context for standalone minigame
    const game = rtabGames.get(channelId) || {
      minigameRegistry: { coinflip: require('./minigames/CoinFlip') }
    };

    const player = {
      userId: user.id,
      username: user.username,
      money: 0
    };

    const result = await game.playMinigame(gameType, player, wager, false, interaction.channel);

    if (!result) {
      return interaction.editReply({
        content: '❌ This minigame is not available yet!'
      });
    }

    const embed = RTABUI.createMinigameResultEmbed(result);

    await interaction.editReply({
      embeds: [embed]
    });
  } catch (error) {
    console.error('Error handling minigame command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while playing the minigame!'
    });
  }
}

*/
// END OF RTAB6 PORT HANDLERS COMMENT BLOCK


// Login with error handling
(async () => {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Failed to login:', error);
    console.log('⚠️ Bot will keep running, check your token in .env file');
  }
})();

// --- Who has only one EGG??? Handlers ---

async function handleOneEggCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

    // Only allow starting a One Egg lobby in specific channels
    const allowedChannels = new Set(['🧪-test', '🥚-one-egg']);
    if (subcommand === 'play') {
      try {
        const chan = await client.channels.fetch(channelId);
        const name = chan && chan.name ? chan.name : null;
        if (!name || !allowedChannels.has(name)) {
          return interaction.reply({ content: '❌ One Egg can only be played in #🧪-test and #🥚-one-egg channels.', ephemeral: true });
        }
      } catch (e) {
        console.warn('Could not verify channel for OneEgg play:', e);
        return interaction.reply({ content: '❌ Unable to start One Egg here.', ephemeral: true });
      }
    }

  // Note: 'help' subcommand removed; use global /help or /intro instead.

  if (subcommand === 'play') {
        if (oneEggGames.has(channelId)) {
            return interaction.reply({ content: '❌ A game is already active in this channel!', ephemeral: true });
        }
        
        // Create a lobby object with a 60s auto-join countdown for a bot
        const lobby = {
          type: 'LOBBY',
          host: interaction.user,
          players: [ { id: interaction.user.id, username: interaction.user.username, isBot: false } ],
          channelId: channelId,
          guildId: guildId,
          createdAt: Date.now(),
          countdown: null
        };
        oneEggGames.set(channelId, lobby);

        // Start 60s timer to auto-join a bot if nobody joins
        lobby.countdown = setTimeout(async () => {
          // If lobby still exists and still of type LOBBY, auto-join a bot
          const current = oneEggGames.get(channelId);
          console.log(`[OneEgg] Bot Auto-Join triggered for channel ${channelId}. Current type: ${current && current.type}`);
          if (!current || current.type !== 'LOBBY') return;

          try {
            const channel = await client.channels.fetch(channelId);

            // Announce bot joining by editing the lobby message
            if (lobby.messageId) {
              const lobbyMsg = await channel.messages.fetch(lobby.messageId).catch(() => null);
              if (lobbyMsg) {
                await lobbyMsg.edit({ content: '⏱️ No challenger joined — a Bot Challenger will join the game.', embeds: [], components: [] }).catch(() => {});
              } else {
                const noChallengerMsg = await channel.send('⏱️ No challenger joined — a Bot Challenger will join the game.');
                lobby.messageId = noChallengerMsg.id; // Correctly update messageId
              }
            } else {
              const noChallengerMsg = await channel.send('⏱️ No challenger joined — a Bot Challenger will join the game.');
              lobby.messageId = noChallengerMsg.id; // Correctly update messageId
            }

            // Clear countdown interval if running
            if (lobby.countdownInterval) {
              clearInterval(lobby.countdownInterval);
            }

            // Create OneEgg game with bot as challenger
            const oneEggGame = new OneEgg(
              channelId,
              channelId,
              guildId,
              { id: lobby.host.id, username: lobby.host.username },
              { id: 'bot_oneegg', username: 'Bot Challenger' }
            );

            // Preserve messageId so bot can edit the same message
            if (lobby.messageId) oneEggGame.messageId = lobby.messageId;

            oneEggGames.set(channelId, oneEggGame);
            
            // Bot picks a carton immediately (0-9)
            // Use logic from OneEgg.js to pick valid untaken carton (all free initially)
            const botCarton = Math.floor(Math.random() * 10);
            oneEggGame.handleCartonSelection('bot_oneegg', botCarton);

            // Edit the lobby message into the CARTON embed/buttons
            const embed = GameUI.createOneEggCartonEmbed(oneEggGame);
            const buttons = GameUI.createOneEggCartonButtons(oneEggGame);
            if (lobby.messageId) {
              const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
              if (msg) await msg.edit({ content: '🎮 Game Started (Bot Challenger)', embeds: [embed], components: buttons }).catch(() => {});
            } else {
              const newMsg = await channel.send({ content: '🎮 Game Started (Bot Challenger)', embeds: [embed], components: buttons });
              oneEggGame.messageId = newMsg.id;
            }

            // Start bot loop to auto-play remaining moves
            runOneEggBotLoop(channelId);

            // Start bot loop to auto-play remaining moves
            runOneEggBotLoop(channelId);
          } catch (err) {
            console.error('Error auto-starting OneEgg with bot:', err);
          }
        }, 60000);
        
        const embed = GameUI.createOneEggLobbyEmbedWithTimer(interaction.user.username, 60, lobby);
        const buttons = GameUI.createOneEggLobbyButtons(userId);

        // Reply and keep the message reference to update countdown every second
        const lobbyMsg = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });
        lobby.messageId = lobbyMsg.id;

        // Start countdown interval to update embed every second
        lobby.countdownInterval = setInterval(async () => {
          try {
            const elapsed = Math.floor((Date.now() - lobby.createdAt) / 1000);
            const remaining = Math.max(0, 60 - elapsed);
            const updatedEmbed = GameUI.createOneEggLobbyEmbedWithTimer(interaction.user.username, remaining, lobby);
            const channel = await client.channels.fetch(channelId);
            const msg = await channel.messages.fetch(lobby.messageId);
            const buttonsNow = GameUI.createOneEggLobbyButtons(userId);
            await msg.edit({ embeds: [updatedEmbed], components: [buttonsNow] });

            if (remaining <= 0) {
              clearInterval(lobby.countdownInterval);
            }
          } catch (err) {
            console.warn('Failed to update OneEgg lobby timer:', err);
          }
        }, 1000);
    }
}

async function handleOneEggInteraction(interaction) {
    const { customId, user, channelId } = interaction;
    // Block OneEgg interactions outside allowed channels
    const allowedChannels = new Set(['🧪-test', '🥚-one-egg']);
    const channelName = interaction.channel && interaction.channel.name ? interaction.channel.name : null;
    if (channelName && !allowedChannels.has(channelName)) {
      return interaction.reply({ content: '❌ One Egg games are only playable in #🧪-test and #🥚-one-egg channels.', ephemeral: true });
    }

    const game = oneEggGames.get(channelId);
    
    if (!game) {
        return interaction.reply({ content: '❌ Game not found!', ephemeral: true });
    }

    // Guard against duplicate clicks during long animations/suspense
    if (game.animationInProgress && !customId.startsWith('one_egg_cancel')) {
        return await safeInteractionResponse(interaction, 'reply', { content: '⏳ Animation in progress — please wait for the reveal to finish before interacting.', ephemeral: true });
    }
    
    if (game.type === 'LOBBY') {
        if (customId.startsWith('one_egg_join_')) {
            const hostId = customId.split('_')[3];
            if (user.id === hostId) {
                return await safeInteractionResponse(interaction, 'reply', { content: '❌ You cannot play against yourself!', ephemeral: true });
            }
            
            // Clear auto-start countdown and interval if present
            if (game.countdown) {
              clearTimeout(game.countdown);
              delete game.countdown;
            }
            if (game.countdownInterval) {
              clearInterval(game.countdownInterval);
              delete game.countdownInterval;
            }
            // Construct player objects with explicit properties
            // Acknowledge immediately to prevent Unknown Interaction errors
            await interaction.deferUpdate().catch(() => {});

            const oneEggGame = new OneEgg(
                channelId, 
                channelId, 
                interaction.guildId, 
                { id: game.host.id, username: game.host.username },
                { id: user.id, username: user.username }
            );
            oneEggGames.set(channelId, oneEggGame);
            
            // Start at Carton Phase
            const embed = GameUI.createOneEggCartonEmbed(oneEggGame);
            const buttons = GameUI.createOneEggCartonButtons(oneEggGame);
            
            await interaction.editReply({ content: '✅ Game Started! Select your Egg Carton.', embeds: [embed], components: buttons });
            
        } else if (customId === 'one_egg_cancel') {
            if (user.id !== game.host.id) {
                return await safeInteractionResponse(interaction, 'reply', { content: '❌ Only the host can cancel!', ephemeral: true });
            }
          // Clear countdown and interval if present
          if (game.countdown) {
            clearTimeout(game.countdown);
          }
          if (game.countdownInterval) {
            clearInterval(game.countdownInterval);
          }
          oneEggGames.delete(channelId);
          await interaction.update({ content: '❌ Game Cancelled.', embeds: [], components: [] }).catch(() => {});
        }
        return;
    }

    // --- Carton Selection ---
    if (customId.startsWith('one_egg_carton_')) {
        const parts = customId.split('_');
        const boxIndex = parseInt(parts[3]);
        
        await interaction.deferUpdate().catch(() => {});
        
        const res = game.handleCartonSelection(user.id, boxIndex);
        
        if (res.error) {
            return await interaction.followUp({ content: `❌ ${res.error}`, ephemeral: true });
        }
        
        if (res.complete) {
             // Both selected - move to Starter Phase
             const embed = GameUI.createOneEggStarterEmbed(game);
             const buttons = GameUI.createOneEggStarterButtons(game);
             const leftCap = game.players.left.maxEggs;
             const rightCap = game.players.right.maxEggs;
             
             await interaction.editReply({ 
                 content: `📦 **Cartons Selected!**\n🅰️ ${game.players.left.username}: Max ${leftCap} eggs\n🅱️ ${game.players.right.username}: Max ${rightCap} eggs\n\nStarting selection phase...`, 
                 embeds: [embed], 
                 components: buttons 
             });
        } else {
             // Waiting for other player
             const embed = GameUI.createOneEggCartonEmbed(game);
             const buttons = GameUI.createOneEggCartonButtons(game);
             await interaction.editReply({ embeds: [embed], components: buttons });
        }
        return;
    }

    // --- Bonus round interactions ---
    if (customId.startsWith('one_egg_bonus_pick_')) {
      try {
        // Format: one_egg_bonus_pick_<loserId>_<index>
        const parts = customId.split('_');
        const loserId = parts[4];
        const pickIndex = parseInt(parts[5]);
        const game = oneEggGames.get(channelId);
        if (!game) return interaction.reply({ content: '❌ No active One Egg game here.', ephemeral: true });
        
        // Execute the pick logic
        const res = game.loserPickBonusBox(interaction.user.id, pickIndex);
        
        if (res && res.error) {
          if (interaction.replied || interaction.deferred) {
            return await safeInteractionResponse(interaction, 'followUp', { content: `❌ ${res.error}`, ephemeral: true });
          }
          return await safeInteractionResponse(interaction, 'reply', { content: `❌ ${res.error}`, ephemeral: true });
        }
        // Now present champion decision UI
        const champId = game.players[game.winner].id;
        // Suspense: "Box Picked! Sending to Champion..."
        await interaction.update({ 
            content: `📦 **${game.players[game.bonus.loserSide] && game.players[game.bonus.loserSide].username ? game.players[game.bonus.loserSide].username : 'Loser'}** has selected a box!\n\nSending to Champion...`, 
            embeds: [], 
            components: [] 
        }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        const champEmbed = GameUI.createOneEggBonusChampionDecisionEmbed(game);
        const champBtns = GameUI.createOneEggBonusChampionDecisionButtons(champId);
        await interaction.editReply({ content: '👑 **CHAMPION\'S DECISION**', embeds: [champEmbed], components: [champBtns] }).catch(() => {});
        return;
      } catch (err) {
        console.error('Error in one_egg_bonus_pick_ handler:', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An internal error occurred while processing the pick.', ephemeral: true });
          } else {
            await interaction.followUp({ content: '❌ An internal error occurred while processing the pick.', ephemeral: true }).catch(() => {});
          }
        } catch (e) {
          console.error('Failed to send error reply for pick handler:', e);
        }
      }
    }

    if (customId.startsWith('one_egg_bonus_champ_')) {
      // Protect the champion decision flow from unhandled errors
      try {
        // Format: one_egg_bonus_champ_<champId>_open|decline
        // Robust parsing: Action is always the last part
        const parts = customId.split('_');
        const action = parts[parts.length - 1]; // open | decline
        // champId is everything between index 4 and the last element
        const champId = parts.slice(4, parts.length - 1).join('_');
        const game = oneEggGames.get(channelId);
        if (!game) return interaction.reply({ content: '❌ No active One Egg game here.', ephemeral: true });
        
        // Acknowledge quickly to avoid "This interaction failed" when we run suspense/timers
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate().catch(e => console.error('deferUpdate failed:', e));
        }

        // Set animation flag to prevent bot from acting during the reveal
        game.animationInProgress = true;
        
        if (action === 'open') {
          const r = game.championDecideOpen(interaction.user.id, true);
          if (r && r.error) {
            game.animationInProgress = false;
            return await safeInteractionResponse(interaction, 'followUp', { content: `❌ ${r.error}`, ephemeral: true });
          }
          // Suspense Animation
          const suspenseEmbed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('😱 CHAMPION GRIPS THE LID!')
              .setDescription(`**${interaction.user.username}** has decided to OPEN the box...\n\nIs it the **2 EGGS** (+$150,000) or **1 EGG** (-$30,000)?`);
          await interaction.editReply({ embeds: [suspenseEmbed], components: [] }).catch(e => { console.error('Failed to editReply suspense (champion open):', e); });
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Countdown
          for (let i = 3; i >= 1; i--) {
               const countEmbed = new EmbedBuilder()
                  .setColor('#FFD700')
                  .setTitle('⏳ Opening...')
                  .setDescription(`## ${i}...`);
                await interaction.editReply({ embeds: [countEmbed] }).catch(e => { console.error('Failed to editReply countdown (champion open):', e); });
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
          // REVEAL
          const revealed = r && r.revealed;
          const isWin = revealed && revealed.type === 'bonus_two'; // 2 eggs = Win big
          const champTotal = r && r.champTotal !== undefined ? r.champTotal : (game.players[game.winner] && game.players[game.winner].money);
          const revealEmbed = new EmbedBuilder()
            .setColor(isWin ? '#2ECC71' : '#E74C3C')
            .setTitle(isWin ? '🎉 JACKPOT!' : '💀 UNLUCKY!')
            .setDescription(
              `### The box contained...\n\n` +
              `# ${revealed && revealed.label ? revealed.label.toUpperCase() : 'UNKNOWN'}!\n\n` +
              (isWin 
                ? `💰 **${game.players[game.winner].username}** WINS **+$150,000**!` 
                : `💸 **${game.players[game.winner].username}** LOSES **$30,000**!\n(Loser gets +$30,000)`)
              + `\n\n🏦 Champion's Total Money: $${GameUI.formatMoney(champTotal || 0)}`
            );
          await interaction.editReply({ embeds: [revealEmbed] }).catch(e => { console.error('Failed to editReply reveal (champion open):', e); });
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          game.animationInProgress = false;

          // If the game is over after champion's open, end and delete. If not, continue to loser decision.
          if (r && r.gameEnded) {
            const finalEmbed = GameUI.createOneEggEndEmbed(game, game.winner);
            // Persist stats now that bonus resolved
            await db.updateOneEggStats(game.players[game.winner].id, game.guildId, { won: true, goldenEggs: game.players[game.winner].goldenEggs, money: game.players[game.winner].money });
            try { await db.addToPlayerHighScore(game.players[game.winner].id, game.guildId, Math.floor((game.players[game.winner].money || 0) * 2), game.players[game.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
            await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
            oneEggGames.delete(channelId);
            await interaction.editReply({ content: '✅ Game Over', embeds: [finalEmbed], components: [] }).catch(e => { console.error('Failed to editReply final game over (champion open):', e); });
            return;
          }
          // If not ended, do not delete game; let loser decide next.
          return;
        } else if (action === 'decline') {
          const r = game.championDecideOpen(interaction.user.id, false);
          if (r && r.error) {
            game.animationInProgress = false;
            return await safeInteractionResponse(interaction, 'followUp', { content: `❌ ${r.error}`, ephemeral: true });
          }
          // Suspense for Decline
          const declineEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('✋ CHAMPION DECLINES!')
            .setDescription(`**${interaction.user.username}** takes the guaranteed **+$20,000**!\n\nReturning box to Loser...`);
          await interaction.editReply({ embeds: [declineEmbed], components: [] }).catch(e => { console.error('Failed to editReply decline suspense (champion decline):', e); });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          game.animationInProgress = false;

          // Present loser decision UI
          const loserId = game.players[game.loser].id;
          const loserEmbed = GameUI.createOneEggBonusLoserDecisionEmbed(game);
          const loserBtns = GameUI.createOneEggBonusLoserDecisionButtons(loserId);
          await interaction.editReply({ content: '💀 **LOSER\'S LAST CHANCE**', embeds: [loserEmbed], components: [loserBtns] }).catch(e => { console.error('Failed to editReply present loser UI (champion decline):', e); });
          // Do NOT delete the game here; wait for loser's action.
          return;
        }
      } catch (err) {
        console.error('Error in one_egg_bonus_champ_ handler:', err);
        // Ensure flag is reset on error
        const game = oneEggGames.get(channelId);
        if (game) game.animationInProgress = false;
        
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An internal error occurred while processing the champion decision.', ephemeral: true });
          } else {
            await interaction.followUp({ content: '❌ An internal error occurred while processing the champion decision.', ephemeral: true }).catch(() => {});
          }
        } catch (e) {
          // swallow - we don't want this to bubble up
          console.error('Failed to send error reply for champion handler:', e);
        }
      }
    }

    if (customId.startsWith('one_egg_bonus_loser_')) {
      try {
        // Format: one_egg_bonus_loser_<loserId>_open|pass
        // Robust parsing: Action is always the last part
        const parts = customId.split('_');
        const action = parts[parts.length - 1]; // open | pass
        // loserId is everything between index 4 and the last element
        const loserId = parts.slice(4, parts.length - 1).join('_');

        const game = oneEggGames.get(channelId);
        if (!game) return await safeInteractionResponse(interaction, 'reply', { content: '❌ Game not found!', ephemeral: true });
        
        if (action === 'open') {
          const r = game.loserDecideOpen(interaction.user.id, true);
          if (r && r.error) {
            if (interaction.replied || interaction.deferred) {
              return await safeInteractionResponse(interaction, 'followUp', { content: `❌ ${r.error}`, ephemeral: true });
            }
            return await safeInteractionResponse(interaction, 'reply', { content: `❌ ${r.error}`, ephemeral: true });
          }
          
          // Suspense
          const suspenseEmbed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('💀 LOSER TAKES A RISK!')
              .setDescription(`**${interaction.user.username}** opens the box...\n\nWill it be **DOUBLE** or **HALF**?`);
          
          await interaction.update({ embeds: [suspenseEmbed], components: [] }).catch(() => {});
          await new Promise(r => setTimeout(r, 2000));
          
           // Countdown
          for (let i = 3; i >= 1; i--) {
               const countEmbed = new EmbedBuilder()
                  .setColor('#FFD700')
                  .setTitle('⏳ Opening...')
                  .setDescription(`## ${i}...`);
              await interaction.editReply({ embeds: [countEmbed] }).catch(() => {});
              await new Promise(r => setTimeout(r, 1000));
          }
          
          const revealed = r && r.revealed;
          const isWin = revealed && revealed.type === 'bonus_two'; // 2 eggs = Double
          
          const revealEmbed = new EmbedBuilder()
              .setColor(isWin ? '#2ECC71' : '#E74C3C')
              .setTitle(isWin ? '💰 DOUBLED UP!' : '📉 HALVED!')
              .setDescription(
                  `### The box contained...\n\n` +
                  `# ${revealed && revealed.label ? revealed.label.toUpperCase() : 'UNKNOWN'}!\n\n` +
                  (isWin 
                      ? `**${game.players[game.loser].username}** DOUBLES their money!` 
                      : `**${game.players[game.loser].username}** loses HALF their money!`)
              );

          await interaction.editReply({ embeds: [revealEmbed] }).catch(() => {});
          await new Promise(r => setTimeout(r, 4000));
          
          const finalEmbed = GameUI.createOneEggEndEmbed(game, game.winner);
          // Persist stats now that bonus resolved
          await db.updateOneEggStats(game.players[game.winner].id, game.guildId, { won: true, goldenEggs: game.players[game.winner].goldenEggs, money: game.players[game.winner].money });
          try { await db.addToPlayerHighScore(game.players[game.winner].id, game.guildId, Math.floor((game.players[game.winner].money || 0) * 2), game.players[game.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
          await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
          oneEggGames.delete(channelId);
          await interaction.editReply({ content: '✅ Game Over', embeds: [finalEmbed], components: [] }).catch(() => {});
          return;
        } else if (action === 'pass') {
          const r = game.loserDecideOpen(interaction.user.id, false);
          if (r && r.error) {
            if (interaction.replied || interaction.deferred) {
              return await safeInteractionResponse(interaction, 'followUp', { content: `❌ ${r.error}`, ephemeral: true });
            }
            return await safeInteractionResponse(interaction, 'reply', { content: `❌ ${r.error}`, ephemeral: true });
          }
          // small pause to add drama
          const passFrames = ['⏳ Loser is thinking...', '⏳ Loser is thinking..'];
          try { await simulateSuspense(interaction, passFrames, 600); } catch(e) { /* ignore */ }
          const finalEmbed = GameUI.createOneEggEndEmbed(game, game.winner);
          // Persist stats now that bonus resolved
          await db.updateOneEggStats(game.players[game.winner].id, game.guildId, { won: true, goldenEggs: game.players[game.winner].goldenEggs, money: game.players[game.winner].money });
          await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
          oneEggGames.delete(channelId);
          await interaction.editReply({ content: 'Loser declined to open. Bonus round ended.', embeds: [finalEmbed], components: [] }).catch(() => {});
          return;
        } else {
             // Fallback for unknown action (e.g. malformed id)
             console.warn('Unknown One Egg Bonus Loser action:', action);
             return await safeInteractionResponse(interaction, 'reply', { content: '❌ Unknown action. Please try again.', ephemeral: true });
        }
      } catch (err) {
        console.error('Error in one_egg_bonus_loser_ handler:', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An internal error occurred while processing the loser decision.', ephemeral: true });
          } else {
            await interaction.followUp({ content: '❌ An internal error occurred while processing the loser decision.', ephemeral: true }).catch(() => {});
          }
        } catch (e) {
          console.error('Failed to send error reply for loser handler:', e);
        }
      }
    }
    
    if (game.players.left.id !== user.id && game.players.right.id !== user.id) {
        return await safeInteractionResponse(interaction, 'reply', { content: '❌ You are not in this game!', ephemeral: true });
    }

    if (customId.startsWith('one_egg_starter_')) {
        const boxIndex = parseInt(customId.split('_')[3]);
        const result = game.handleStarterSelection(user.id, boxIndex);
        
        if (result.error) return await safeInteractionResponse(interaction, 'reply', { content: `❌ ${result.error}`, ephemeral: true });
        
        if (result.waiting) {
            // Update UI to show box is taken by disabling relevant buttons
            // Acknowledge immediately if not already deferred
            await interaction.deferUpdate().catch(() => {});
            
            const embed = GameUI.createOneEggStarterEmbed(game);
            // We need to re-create starter buttons but with taken boxes disabled
            // GameUI.createOneEggStarterButtons(game) handles this if boxSelections are set in game state
            const buttons = GameUI.createOneEggStarterButtons(game);
            
            await interaction.editReply({ content: `✅ Box selected! Waiting for opponent...`, embeds: [embed], components: buttons });

            // Also notify the picking player with an ephemeral embed and no buttons
            try {
              const waitingEmbed = GameUI.createOneEggStarterWaitingEmbed(game, result.side || (game.getPlayerSide(user.id)) );
              await interaction.followUp({ embeds: [waitingEmbed], ephemeral: true });
            } catch (e) {
              // If followUp fails, ignore silently
            }
        } else if (result.complete) {
            // REDESIGN: Add suspense and delayed reveals
            game.animationInProgress = true;
            await interaction.deferUpdate().catch(() => {});
            
            // Step 1: Show "Boxes selected!" message (3 seconds)
            const suspenseEmbed1 = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📦 Both Boxes Selected!')
                .setDescription('**Closing boxes...**\n\n🥚 Get ready to see what\'s inside!');
            await interaction.editReply({ embeds: [suspenseEmbed1], components: [GameUI.createDisabledPlaceholderButtons()] });
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s
            
            // Step 2: Countdown (3...2...1) (3 seconds total)
            for (let count = 3; count >= 1; count--) {
                const countdownEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('⏳ Opening Boxes...')
                    .setDescription(`**${count}...**`);
                
                await interaction.editReply({ embeds: [countdownEmbed] });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Step 3: Reveal Player Right's box (3 seconds)
            const rightRevealEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('📦➡️🥚 BOX REVEAL!')
                .setDescription(
                    `**🅰️ ${game.players.right.username}** found: **${result.rightEggs} EGGS!** 🥚\n\n` +
                    `Eggs: ${'🥚'.repeat(result.rightEggs)}${'⬜'.repeat(6 - result.rightEggs)} (${result.rightEggs}/6)`
                );
            
            await interaction.editReply({ embeds: [rightRevealEmbed] });
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3s
            
            // Step 4: Reveal Player Left's box (3 seconds)
            const leftRevealEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('📦➡️🥚 BOX REVEAL!')
                .setDescription(
                    `**🅰️ ${game.players.left.username}** found: **${result.leftEggs} EGGS!** 🥚\n\n` +
                    `Eggs: ${'🥚'.repeat(result.leftEggs)}${'⬜'.repeat(6 - result.leftEggs)} (${result.leftEggs}/6)`
                );
            
            await interaction.editReply({ embeds: [leftRevealEmbed] });
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3s
            
            // Step 5: Show decision maker (2 seconds before buttons)
            const decisionMaker = game.players[result.decisionMaker];
            game.phase = 'STARTER_DECISION';
            
            const preDecisionEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎲 TURN ORDER TIME!')
               .setDescription(
                    `**🅰️ ${game.players.left.username}**: ${result.leftEggs} eggs\n` +
                    `**🅱️ ${game.players.right.username}**: ${result.rightEggs} eggs\n\n` +
                    `**${decisionMaker.username}** has MORE eggs!\n\n` +
                    `Deciding who goes first...`
                );
            
            await interaction.editReply({ embeds: [preDecisionEmbed] });
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s
            
            // Step 6: Show decision buttons with new UI
            const decisionEmbed = GameUI.createOneEggTurnOrderEmbed(game, result.decisionMaker);
            const decisionButtons = GameUI.createOneEggTurnOrderButtons(decisionMaker.id);
            
            await interaction.editReply({ embeds: [decisionEmbed], components: [decisionButtons] });
            game.animationInProgress = false;
        }
        
    } else if (customId.startsWith('one_egg_turn_')) {
        // NEW: Handle turn order decision with new button IDs
        if (game.phase !== 'STARTER_DECISION') return await safeInteractionResponse(interaction, 'reply', { content: '❌ That action is not available right now — please wait for the turn-order prompt to appear.', ephemeral: true });
        
        const side = game.getPlayerSide(user.id);
        // Debug: Turn Order Button
        
           if (game.decisionMaker !== side) {
             return await safeInteractionResponse(interaction, 'reply', { content: `❌ Not your turn to decide — please wait for **${game.players[game.decisionMaker].username}** to choose.`, ephemeral: true });
           }
        
        const isFirst = customId.includes('_first');
        const goesFirst = isFirst ? side : (side === 'left' ? 'right' : 'left');
        
        game.setTurnOrder(goesFirst);
        
        // Show announcement (3 seconds)
        const announcementEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ TURN ORDER SET!')
            .setDescription(
                `**${game.players[goesFirst].username}** will select FIRST!\n\n` +
                `Starting Round 1...`
            );
        
        await interaction.update({ embeds: [announcementEmbed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Show main game UI
        const embed = GameUI.createOneEggMainEmbedEnhanced(game, null, goesFirst);
        const row = GameUI.createOneEggBoxButtons(game);
        
        await interaction.editReply({ embeds: [embed], components: row });
        
    } else if (customId.startsWith('one_egg_box_')) {
        // Guard: Don't process clicks during animations
        if (game.animationInProgress) {
          return await safeInteractionResponse(interaction, 'reply', { content: '⏳ Please wait for the current animation to finish...', ephemeral: true });
        }
        
        const boxIndex = parseInt(customId.split('_')[3]);
        const result = game.handleBoxSelection(user.id, boxIndex);
        
        if (result.error) return await safeInteractionResponse(interaction, 'reply', { content: `❌ ${result.error}`, ephemeral: true });
        
        if (result.waiting) {
             // Acknowledge immediately and DISABLE all buttons while waiting
             await interaction.deferUpdate().catch(() => {});
             const embed = GameUI.createOneEggMainEmbed(game);
             // Show ACTIVE buttons so the other player can pick
             const activeRow = GameUI.createOneEggBoxButtons(game);
             const nextPlayerSide = game.turnOrder[game.currentTurnIndex];
             const nextPlayerName = game.players[nextPlayerSide] ? game.players[nextPlayerSide].username : 'Opponent';
             
             await interaction.editReply({ 
               content: `📦 **Box selected!** Waiting for ${nextPlayerName} to pick...`,
               embeds: [embed], 
               components: activeRow // already an array
             });
             // Bot will pick automatically in the loop, which will trigger resolution
        } else if (result.results) {
            // REDESIGN: Main Game Suspense
            game.animationInProgress = true;
            await interaction.deferUpdate().catch(() => {});
            
            // 1. Box Selected! (Immediate feedback)
            const side = game.getPlayerSide(user.id);
            const boxEmoji = '📦'; // Could use result.item.type specific if revealed? No, hidden first.
            const suspenseEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${boxEmoji} Box Selected!`)
                .setDescription(`**${user.username}** has picked the box...\n\nTime to face the truth...`);
            await interaction.editReply({ embeds: [suspenseEmbed], components: [GameUI.createDisabledPlaceholderButtons()] }).catch(() => {});
            await new Promise(r => setTimeout(r, 2000));
            
            // 2. Countdown 3..2..1
            for (let i = 3; i >= 1; i--) {
                const countEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏳ Opening...')
                    .setDescription(`## ${i}...`);
                await interaction.editReply({ embeds: [countEmbed] });
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // 3. REVEAL Items (Sequential Loop based on Turn Order)
            // result.results now contains [{ side, item, ... }, { side, item, ... }] strictly ordered.
            for (const res of result.results) {
                 const revealSide = res.player || res.side; // OneEgg.js returns { player: side, ... }
                 const revealItem = res.item || { type: 'unknown' };
                 
                 const revealEmbed = GameUI.createOneEggItemFoundEmbed(game, revealSide, revealItem);
                 await interaction.editReply({ embeds: [revealEmbed] });
                 await new Promise(r => setTimeout(r, 3000)); // 3s per reveal
            }

            game.animationInProgress = false;

            // 4. Transition to next state
            if (result.gameEnded) {
                // Determine the EXACT result for better messaging
                const winnerPlayer = game.players[game.winner];
                const loserPlayer = game.players[game.loser];
                const winReason = winnerPlayer.eggs === 2 ? 'reached **2 EGGS**!' : `**${loserPlayer.username}** reached **1 EGG** and lost!`;

                // Auto-start bonus round immediately with Transition
                try {
                  const transitionEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏆 WINNER DECLARED!')
                    .setDescription(`**${winnerPlayer.username}** ${winReason}\n\nEntering **BONUS ROUND**...`);
                                    
                  await interaction.editReply({ embeds: [transitionEmbed], components: [] });
                  await new Promise(r => setTimeout(r, 3000));
                  
                  game.startBonusRound();
                  const loserId = game.players[game.loser].id;
                  const loserEmbed = GameUI.createOneEggBonusLoserPickEmbed(game);
                  const loserBtns = GameUI.createOneEggBonusLoserPickButtons(loserId);
                  
                  await interaction.editReply({ content: '🥚 **BONUS ROUND START!**', embeds: [loserEmbed], components: [loserBtns] });
                } catch (e) {
                  console.warn('Failed to start bonus round:', e);
                  // ... fallback code ...
                  const finalEmbed = GameUI.createOneEggEndEmbed(game, result.winner);
                  await db.updateOneEggStats(game.players[result.winner].id, game.guildId, { won: true, goldenEggs: game.players[result.winner].goldenEggs, money: game.players[result.winner].money });
                  try { await db.addToPlayerHighScore(game.players[result.winner].id, game.guildId, Math.floor((game.players[result.winner].money || 0) * 2), game.players[result.winner].username || 'Player'); } catch(e) { console.warn('Failed to add to high score:', e); }
                  await db.updateOneEggStats(game.players[game.loser].id, game.guildId, { won: false, goldenEggs: game.players[game.loser].goldenEggs, money: game.players[game.loser].money });
                  oneEggGames.delete(channelId);
                  await interaction.editReply({ embeds: [finalEmbed], components: [] });
                }
            } else if (result.phaseChange === 'FINAL_BOX') {
                // Transition to final box
                try {
                  await interaction.editReply({ content: '⏰ Time\'s up — final box incoming!', embeds: [], components: [] });
                } catch (e) { /* ignore */ }
                	// Enter FINAL_BOX phase: prepare final boxes and present UI instead of ending the game
                	try {
                		game.currentBoxes = game.generateRoundBoxes();
                		game.boxSelections = {};
                		game.currentTurnIndex = 0;
                		const finalEmbed = GameUI.createOneEggMainEmbed(game);
                		const finalRow = GameUI.createOneEggBoxButtons(game);
                		await interaction.editReply({ embeds: [finalEmbed], components: finalRow });
                	} catch (e) {
                		console.warn('Failed to present FINAL_BOX UI:', e);
                		// Fallback: sell eggs and end to avoid leaving game in limbo
                		game.sellAllEggs();
                		await interaction.editReply({ content: 'Game Over (Time Limit). Eggs sold.', components: [] });
                		oneEggGames.delete(channelId);
                	}
            } else {
                // Show round summary
                const summaryEmbed = GameUI.createOneEggRoundSummaryEmbed(game, game.round - 1, result.results);
                await interaction.editReply({ embeds: [summaryEmbed], components: [] });
                await new Promise(r => setTimeout(r, 4000)); // 4s delay

                const embed = GameUI.createOneEggMainEmbed(game, result.results);
                const row = GameUI.createOneEggBoxButtons(game);
                await interaction.editReply({ embeds: [embed], components: row });
            }
        }
    }
}

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

// --- NEW YEAR GIFT HANDLERS ---

// async function handleNewYearGiftCommand(interaction) {
//   await interaction.deferReply();

//   const userId = interaction.user.id;
//   const guildId = interaction.guildId;
//   const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

//   // Check cooldown (skip for admins)
//   if (!isAdmin) {
//     const canClaim = await db.checkNewYearGiftCooldown(userId, guildId);
//     if (!canClaim) {
//        return await interaction.editReply({ 
//            content: `❌ **Cooldown Active!** You have already claimed your New Year Gift today!\nTry again tomorrow! 🎆`, 
//            ephemeral: true 
//        });
//     }
//   }

//   // Show Gift Box
//   const embed = GameUI.createNewYearGiftEmbed(interaction.user.username);
//   const buttons = GameUI.createNewYearGiftButton();

//   await interaction.editReply({ embeds: [embed], components: buttons });
// }

async function handleTestEventCommand(interaction) {
  // Admin-only testing command for game events
  const eventType = interaction.options.getString('event');
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  
  await interaction.deferReply();

  // Get active game for the user
  const game = gameManager.getGame(channelId);
  
  if (!game || !game.isActive || game.userId !== userId) {
    return await interaction.editReply({ 
      content: '❌ You need an active Tower of Cash game to test events. Start a game first with `/play`.',
      ephemeral: true 
    });
  }

  try {
    switch(eventType) {
      case 'bruh_bank': {
        // Test Bruh Bank - seize all money
        const seizedAmount = game.totalMoney;
        
        if (seizedAmount > 0) {
          await db.addLostMoney(guildId, seizedAmount);
        }
        const newBigBank = await db.getGlobalLostMoney(guildId);
        game.totalMoney = 0;
        
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🧪 TEST: BRUH BANK')
            .setDescription(
              `💸 **Seized:** $${GameUI.formatMoney(seizedAmount)}\n` +
              `📈 **Big Bank:** $${GameUI.formatMoney(newBigBank)}\n` +
              `📉 **Your Money:** $0\n\n` +
              `*Test complete - money seized!*`
            )]
        });
        
        // Post to big-bank channel
        try {
          const bigBankChannel = interaction.guild.channels.cache.find(ch => ch.name === '💰-big-bank');
          if (bigBankChannel) {
            const bruhEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('🧪 TEST: BRUH BANK SEIZURE')
              .setDescription(
                `**${game.username}** got hit by the BRUH Bank! (Test Mode)\n\n` +
                `💸 **Seized Amount:** $${GameUI.formatMoney(seizedAmount)}\n` +
                `📈 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
                `*Thanks for the generous donation!*`
              )
              .setTimestamp();
            
            await bigBankChannel.send({ embeds: [bruhEmbed] });
          }
        } catch (e) {
          console.error('Failed to post to big-bank channel:', e);
        }
        break;
      }

      case 'small_bank': {
        // Test Small Bank - steal 10% from Big Bank
        const currentBigBank = await db.getGlobalLostMoney(guildId);
        
        if (currentBigBank <= 0) {
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🧪 TEST: SMALL BANK')
              .setDescription('🏦 Big Bank is empty - gave you $500k consolation.')
              .addFields({ name: 'Money Added', value: `$${GameUI.formatMoney(500000)}` })]
          });
          game.totalMoney += 500000;
        } else {
          const stolen = Math.floor(currentBigBank * 0.10);
          await db.addToBigBank(guildId, -stolen);
          const newBigBank = await db.getGlobalLostMoney(guildId);
          game.totalMoney += stolen;
          
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#2ECC71')
              .setTitle('🧪 TEST: SMALL BANK')
              .setDescription(
                `💰 **Stolen:** $${GameUI.formatMoney(stolen)} (10%)\n` +
                `📊 **Previous Big Bank:** $${GameUI.formatMoney(currentBigBank)}\n` +
                `📉 **New Big Bank:** $${GameUI.formatMoney(newBigBank)}\n` +
                `💵 **Your Money:** $${GameUI.formatMoney(game.totalMoney)}`
              )]
          });

          // Post to big-bank channel
          try {
            const guild = interaction.guild;
            const bigBankChannel = guild.channels.cache.find(ch => ch.name === '💰-big-bank');

            if (bigBankChannel) {
              const heistEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🏦 SMALL BANK HEIST!')
                .setDescription(
                  `**${game.username}** pulled off a Small Bank heist from Mystery Box! (Test Mode)\n\n` +
                  `💰 **Stolen Amount:** $${GameUI.formatMoney(stolen)} (10%)\n` +
                  `📊 **Previous Big Bank:** $${GameUI.formatMoney(currentBigBank)}\n` +
                  `📉 **New Big Bank Total:** $${GameUI.formatMoney(newBigBank)}\n\n` +
                  `*10% of the Big Bank has been stolen!*`
                )
                .setTimestamp();

              await bigBankChannel.send({ embeds: [heistEmbed] });
            }
          } catch (channelErr) {
            console.error('Error posting to big-bank channel:', channelErr);
          }
        }
        break;
      }

      case 'big_bank': {
        // Test Big Bank - claim all of Big Bank
        const bigBankAmount = await db.getGlobalLostMoney(guildId);
        
        if (bigBankAmount <= 0) {
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🧪 TEST: BIG BANK')
              .setDescription('🏦 Big Bank is empty - gave you $1M consolation.')
              .addFields({ name: 'Money Added', value: `$${GameUI.formatMoney(1000000)}` })]
          });
          game.totalMoney += 1000000;
        } else {
          game.totalMoney += bigBankAmount;
          await db.resetBigBank(guildId);
          
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('🧪 TEST: BIG BANK HEIST')
              .setDescription(
                `🏦 **Claimed:** $${GameUI.formatMoney(bigBankAmount)}\n` +
                `💰 **Your Money:** $${GameUI.formatMoney(game.totalMoney)}\n` +
                `📉 **Big Bank:** $0\n\n` +
                `*You claimed the entire Big Bank!*`
              )]
          });
          
          // Post to big-bank channel
          try {
            const bigBankChannel = interaction.guild.channels.cache.find(ch => ch.name === '💰-big-bank');
            if (bigBankChannel) {
              const claimEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏦 BIG BANK CLAIMED!')
                .setDescription(
                  `**${game.username}** claimed the ENTIRE Big Bank! (Test Mode)\n\n` +
                  `💰 **Claimed Amount:** $${GameUI.formatMoney(bigBankAmount)}\n` +
                  `📉 **Big Bank Total:** $0\n\n` +
                  `*The vault has been emptied!*`
                )
                .setTimestamp();
              
              await bigBankChannel.send({ embeds: [claimEmbed] });
            }
          } catch (e) {
            console.error('Failed to post to big-bank channel:', e);
          }
        }
        break;
      }

      case 'tower_of_crash': {
        // Test Tower of Crash - reset leaderboard
        await db.resetGuildProgress(guildId);
        game.totalMoney = 0;
        
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🧪 TEST: TOWER OF CRA$H')
            .setDescription(
              `🏢 **Market crashed!**\n` +
              `📊 **Guild Leaderboard:** RESET\n` +
              `💸 **Your Money:** $0\n\n` +
              `*The entire guild leaderboard has been reset!*`
            )]
        });
        
        // Announce to tower-of-cash
        try {
          const channel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash');
          if (channel) {
            await channel.send({
              embeds: [new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('📉 TOWER OF CRA$H!')
                .setDescription(`**${interaction.user.username}** triggered a market crash!\n\n**The Guild Leaderboard has been RESET!**`)]
            });
          }
        } catch (e) { console.error('Failed to announce Tower of Crash:', e); }
        break;
      }

      case 'announcement': {
        // Test Announcement - reveal money and gain 10%
        const bonus = Math.floor(game.totalMoney * 0.10);
        game.totalMoney += bonus;
        
        const announceEmbed = new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle('📢 FORTUNE ANNOUNCEMENT!')
          .setDescription(
            `🌟 **${game.username}** is reaching new heights!\n\n` +
            `💰 **Current Fortune:** $${GameUI.formatMoney(game.totalMoney)}\n` +
            `📈 **Bonus Received:** $${GameUI.formatMoney(bonus)} (10%)`
          )
          .setThumbnail(interaction.user.displayAvatarURL());
        
        await interaction.editReply({ embeds: [announceEmbed] });
        
        // Announce to tower-of-cash
        try {
          const channel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash');
          if (channel) {
            await channel.send({ embeds: [announceEmbed] });
          }
        } catch (e) { console.error('Failed to announce:', e); }
        break;
      }

      case 'tax_collector': {
        // Test Tax Collector - lose 20%, gain immunity
        const hasImmunity = game.hasActiveEffect('tax_immunity');
        
        if (hasImmunity) {
          // Consume immunity
          if (game.activeEffects) {
            game.activeEffects = game.activeEffects.filter(e => e.type !== 'tax_immunity');
          }
          
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#2ECC71')
              .setTitle('🧪 TEST: TAX COLLECTOR (Immune)')
              .setDescription(
                `💸 **Tax Collector appeared!**\n` +
                `🛡️ **Immunity Used:** You paid nothing!\n` +
                `💰 **Your Money:** $${GameUI.formatMoney(game.totalMoney)}\n\n` +
                `*Your tax immunity has been consumed.*`
              )]
          });
        } else {
          // Lose 20%, gain immunity
          const taxAmount = Math.floor(game.totalMoney * 0.2);
          game.totalMoney -= taxAmount;
          
          if (!game.activeEffects) game.activeEffects = [];
          game.activeEffects.push({ type: 'tax_immunity', floorsRemaining: 999, fresh: true });
          
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🧪 TEST: TAX COLLECTOR')
              .setDescription(
                `💸 **Tax Collected:** $${GameUI.formatMoney(taxAmount)} (20%)\n` +
                `💰 **Your Money:** $${GameUI.formatMoney(game.totalMoney)}\n` +
                `🛡️ **Immunity Granted:** Next % loss blocked!\n\n` +
                `*Strategic sacrifice - you're now immune to percentage losses!*`
              )]
          });
        }
        break;
      }

      default:
        await interaction.editReply({ content: '❌ Unknown event type.' });
    }
  } catch (err) {
    console.error('Error in handleTestEventCommand:', err);
    await interaction.editReply({ content: '❌ An error occurred while testing the event.' });
  }
}

async function handleNewYearGiftClaim(interaction) {
  // Double check cooldown to prevent race conditions
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
  
  // Check cooldown (skip for admins)
  if (!isAdmin) {
    const canClaim = await db.checkNewYearGiftCooldown(userId, guildId);
    if (!canClaim) {
       return await interaction.reply({ content: `❌ **Cooldown Active!** You have already claimed your New Year Gift today!`, ephemeral: true });
    }
  }

  // Update Cooldown IMMEDIATELY to prevent double claims (skip for admins)
  if (!isAdmin) {
    await db.claimNewYearGift(userId, guildId);
  }
  
  // Fetch required data
  const playerStats = await db.getPlayerStats(userId, guildId) || { highest_score: 0 };
  const bigBank = await db.getGlobalLostMoney(guildId);
  
  // Generate Outcome
  const result = await generateNewYearGiftOutcome(guildId, userId, playerStats.highest_score, bigBank);
  
  // Apply Effect
  await applyNewYearGiftEffect(interaction, result);

  // Show Result
  const resultEmbed = GameUI.createNewYearGiftResultEmbed(interaction.user.username, result);
  
  await interaction.update({ embeds: [resultEmbed], components: [] });
  
  // Post to Big Bank Channel if relevant
  if (result.logToBigBank) {
      logToBigBankChannel(interaction.guild, result.logEmbed);
  }
}

async function handleNewYearGiftListCommand(interaction) {
  await interaction.deferReply();
  
  const embed = GameUI.createNewYearGiftListEmbed(0);
  const buttons = GameUI.createNewYearGiftListButtons(0);
  
  await interaction.editReply({ embeds: [embed], components: buttons });
}

async function generateNewYearGiftOutcome(guildId, userId, currentHighScore, bigBank) {
    const roll = Math.random() * 100;
    
    // 77.5% Chance for Money Items
    if (roll < 77.5) {
        return generateMoneyItemOutcome(currentHighScore);
    } 
    
    // 22.5% Chance for Special/Rare Items
    return await generateSpecialGiftOutcome(guildId, userId, currentHighScore, bigBank);
}

function generateMoneyItemOutcome(currentHighScore) {
    const moneyRoll = Math.random() * 100;
    
    const items = [
        { chance: 14.83, name: '🧂 SALT', amount: 0, desc: 'Nothing! Absolutely nothing!' },
        { chance: 8.05, name: '🪙 Pennies', amount: 100000, desc: 'Every penny counts!' },
        { chance: 6.78, name: '💵 Pocket Change', amount: 500000, desc: 'Nice little bonus.' },
        { chance: 6.36, name: '📉 Small Tax', amount: -3000000, desc: 'The tax man cometh.' },
        { chance: 5.93, name: '💴 Payday', amount: 1500000, desc: 'Hard work pays off.' },
        { chance: 5.51, name: '🎟️ Parking Ticket', amount: -8000000, desc: 'Should have parked better.' },
        { chance: 5.08, name: '🎁 Treasure Chest', amount: 3500000, desc: 'Found some buried loot!' },
        { chance: 4.66, name: '🧾 Bill Payment', amount: -20000000, desc: 'Ouch, bills are due.' },
        { chance: 4.24, name: '🏆 Gold Bar', amount: 7500000, desc: 'Shiny and heavy!' },
        { chance: 3.81, name: '📈 Percentage Boost', type: 'pct_boost', amount: Math.floor(currentHighScore * 0.20), desc: '+20% of your High Score!' },
        { chance: 3.81, name: '📊 Percentage Tax', type: 'pct_tax', amount: -Math.floor(currentHighScore * 0.20), desc: '-20% of your High Score!' },
        { chance: 3.39, name: '💎 Diamond Cache', amount: 15000000, desc: 'Sparkling riches!' },
        { chance: 2.54, name: '👑 Royal Fortune', amount: 20000000, desc: 'A gift fit for a king.' },
        { chance: 0.42, name: '🧈🧂 SSR SALT', amount: 0, desc: 'Super Super Rare... Salt.' }
    ];

    let cumulative = 0;
    for (const item of items) {
        cumulative += item.chance / 0.775; // Normalize to 100 scale within this category
        if (moneyRoll <= cumulative) {
            return {
                name: item.name,
                outcomeName: item.name,
                description: item.desc,
                amount: item.amount,
                type: item.amount >= 0 ? 'good' : 'bad',
                highScoreBefore: currentHighScore,
                highScoreAfter: Math.max(0, currentHighScore + item.amount)
            };
        }
    }
    // Fallback to first item (SALT)
    const fallbackItem = items[0];
    return {
        name: fallbackItem.name,
        outcomeName: fallbackItem.name,
        description: fallbackItem.desc,
        amount: fallbackItem.amount,
        type: fallbackItem.amount >= 0 ? 'good' : 'bad',
        highScoreBefore: currentHighScore,
        highScoreAfter: Math.max(0, currentHighScore + fallbackItem.amount)
    };
}

async function generateSpecialGiftOutcome(guildId, userId, currentHighScore, bigBank) {
    const options = [
        'Instant Jackpot', 'Golden Ticket', 'Big Bank', 'Small Bank', 'Bonus Portal',
        'Gift Horse', 'Announcement', 'Black Hole', 'Gravity Well', 'Thief Shadow',
        'Tower of Crash', 'Cut Front', 'BRUH Bank', 'Chaos Orb', 'Mirror Match',
        'Trade Winds', 'Double or Nothing', 'Malfunction', 'Beyond 2nd', 'Beyond 3rd',
        'Back to Basic', 'Advance Boardwalk', 'Bank Buster', 'Block Party', 
        'Community Chest', 'Electric Company', 'No Vacancy', 'Park It', 'Ride Rails',
        'Mystery Box'
    ];
    
    // Simple uniform distribution for now as "Minigame items" and "Rares" were grouped
    // Logic can be refined if specific weights were given for these sub-items
    const choice = options[Math.floor(Math.random() * options.length)];
    
    // Default Result structure
    let result = {
        name: choice,
        outcomeName: choice,
        description: '',
        amount: 0,
        type: 'neutral',
        highScoreBefore: currentHighScore,
        highScoreAfter: currentHighScore,
        logToBigBank: false,
        logEmbed: null
    };

    switch(choice) {
        case 'Instant Jackpot':
            const jackpot = Math.floor(Math.random() * 401000000) + 100000000; // 100M-500M
            result.description = '💰 **INSTANT JACKPOT!** You won a massive cash prize!';
            result.amount = jackpot;
            result.type = 'good';
            result.highScoreAfter += jackpot;
            break;

        case 'Golden Ticket':
            result.description = '🎫 **Golden Ticket!** (Bonus Minigame Access - *Coming Soon*) -> Take $50,000,000 instead!';
            result.amount = 50000000;
            result.type = 'good';
            result.highScoreAfter += 50000000;
            break;

        case 'Big Bank':
            if (bigBank <= 0) {
                 result.description = '🏦 **Big Bank Claim!** ...But the bank is empty! You get $1,000,000 consolation.';
                 result.amount = 1000000;
            } else {
                 result.description = `🏦 **BIG BANK HEIST!** You claimed the ENTIRE Big Bank pot!`;
                 result.amount = bigBank;
                 result.logToBigBank = true;
                 result.logEmbed = createBigBankLog(choice, 'CLAIMED', bigBank, 0);
            }
            result.highScoreAfter += result.amount;
            result.type = 'good';
            break;

        case 'Small Bank':
             if (bigBank <= 0) {
                 result.description = '🏦 **Small Bank!** Bank is empty. $500k consolation.';
                 result.amount = 500000;
            } else {
                 const steal = Math.floor(bigBank * 0.10);
                 result.description = `🏦 **Small Bank!** You stole 10% of the Big Bank!`;
                 result.amount = steal;
                 result.logToBigBank = true;
                 result.logEmbed = createBigBankLog(choice, 'STOLEN (10%)', steal, bigBank - steal);
            }
            result.highScoreAfter += result.amount;
            result.type = 'good';
            break;

        case 'Bonus Portal': // Simulating 2x rewards as a flat bonus
             const bonus = 25000000;
             result.description = '🎪 **Bonus Portal!** You found a secret stash!';
             result.amount = bonus;
             result.highScoreAfter += bonus;
             result.type = 'good';
             break;
             
        case 'Gift Horse':
             const giftAmount = Math.floor(currentHighScore * 0.25);
             result.description = '🎁 **Gift Horse!** You generously donated 25% of your High Score to the Big Bank.\n(+2 Bonus Plays added!)';
             result.amount = -giftAmount;
             result.highScoreAfter = Math.max(0, currentHighScore - giftAmount);
             result.logToBigBank = true;
             result.logEmbed = createBigBankLog(choice, 'DONATED', giftAmount, bigBank + giftAmount);
             // TODO: Add bonus plays logic if DB supports it, otherwise text only
             break;
             
        case 'Announcement':
             const announceBonus = Math.floor(currentHighScore * 0.10);
             result.description = '📢 **Announcement!** You flexed your wealth to the server! (+10% Bonus)';
             result.amount = announceBonus;
             result.highScoreAfter += announceBonus;
             result.type = 'good';
             break;

        case 'Black Hole':
             const holeLoss = Math.floor(currentHighScore * 0.50);
             result.description = '🕳️ **BLACK HOLE!** 50% of your High Score was sucked into the Big Bank!';
             result.amount = -holeLoss;
             result.highScoreAfter = Math.max(0, currentHighScore - holeLoss);
             result.type = 'bad';
             result.logToBigBank = true;
             result.logEmbed = createBigBankLog(choice, 'SUCKED IN', holeLoss, bigBank + holeLoss);
             break;

        case 'Gravity Well':
             const gravLoss = Math.floor(currentHighScore * 0.80);
             result.description = '⬇️ **GRAVITY WELL!** Crushing gravity took 80% of your High Score to the Big Bank!';
             result.amount = -gravLoss;
             result.highScoreAfter = Math.max(0, currentHighScore - gravLoss);
             result.type = 'bad';
             result.logToBigBank = true;
             result.logEmbed = createBigBankLog(choice, 'CRUSHED', gravLoss, bigBank + gravLoss);
             break;
             
        case 'Thief Shadow':
             const theft = Math.floor(Math.random() * 990000000) + 10000000; // 10M-1B
             result.description = '🥷 **Thief\'s Shadow!** A master thief visited your vault.';
             result.amount = -theft;
             result.highScoreAfter = Math.max(0, currentHighScore - theft);
             result.type = 'bad';
             break;
             
        case 'Tower of Crash':
             result.description = '🏢 **TOWER OF CRA$H!** The market crashed! Leaderboard reset to 0! (Simulator: Just you for now)';
             result.amount = -currentHighScore;
             result.highScoreAfter = 0;
             result.type = 'bad';
             break;

        case 'Cut Front':
             const strScore = currentHighScore.toString();
             if (strScore.length > 1) {
                 const newScore = parseInt(strScore.substring(1));
                 result.description = '✂️ **Cut Front!** The first digit of your High Score was snipped off!';
                 result.amount = newScore - currentHighScore;
                 result.highScoreAfter = newScore;
                 result.type = 'bad';
             } else {
                 result.description = '✂️ **Cut Front!** ...But you didn\'t have enough digits!';
                 result.amount = 0;
             }
             break;
             
        case 'BRUH Bank':
             result.description = '🏦 **BRUH BANK!** You donated ALL your High Score to the Big Bank. Bruh.';
             result.amount = -currentHighScore;
             result.highScoreAfter = 0;
             result.logToBigBank = true;
             result.logEmbed = createBigBankLog(choice, 'DONATED EVERYTHING', currentHighScore, bigBank + currentHighScore);
             result.type = 'bad';
             break;
             
        case 'Chaos Orb':
             const chaos = (Math.floor(Math.random() * 100000000) - 50000000); // +/- 50M
             result.description = '🔴 **Chaos Orb!** Your score shifted unpredictably.';
             result.amount = chaos;
             result.highScoreAfter = Math.max(0, currentHighScore + chaos);
             break;
             
        case 'Mirror Match':
             const reversed = parseInt(currentHighScore.toString().split('').reverse().join(''));
             result.description = '🪩 **Mirror Match!** Your High Score digits were reversed!';
             result.amount = reversed - currentHighScore;
             result.highScoreAfter = reversed;
             break;
             
        case 'Trade Winds':
             let s = currentHighScore.toString();
             if (s.length > 1) {
                 const first = s[0];
                 const last = s[s.length-1];
                 const middle = s.substring(1, s.length-1);
                 const swapped = parseInt(last + middle + first);
                 result.description = '🌪️ **Trade Winds!** First and Last digits swapped places!';
                 result.amount = swapped - currentHighScore;
                 result.highScoreAfter = swapped;
             } else {
                 result.description = '🌪️ **Trade Winds!** Not enough digits to trade.';
             }
             break;
             
        case 'Double or Nothing':
             if (Math.random() < 0.5) {
                 result.description = '🎲 **Double or Nothing:** DOUBLE! Winner!';
                 result.amount = currentHighScore;
                 result.highScoreAfter = currentHighScore * 2;
                 result.type = 'good';
             } else {
                 const loss = Math.floor(currentHighScore * 0.5);
                 result.description = '🎲 **Double or Nothing:** Nothing (well, half). Loser!';
                 result.amount = -loss;
                 result.highScoreAfter = currentHighScore - loss;
                 result.type = 'bad';
             }
             break;
             
        case 'Malfunction':
             const mal = (Math.floor(Math.random() * 20000000000) - 10000000000); // +/- 10B
             result.description = '🔄 **MALFUNCTION!** Value corrupted!';
             result.amount = mal;
             result.highScoreAfter = Math.max(0, currentHighScore + mal);
             break;

        case 'Beyond 2nd':
             const topScores2 = await db.getTopThreeScores(guildId);
             if (topScores2.length > 0) {
                 const target = topScores2[0] - 1; // 1 less than 1st place
                 result.description = '🚀 **Beyond to 2nd!** You are now mostly rich!';
                 result.highScoreAfter = target;
                 result.amount = target - currentHighScore;
             } else {
                 result.description = '🚀 **Beyond to 2nd!** There is no 1st place to be behind!';
             }
             break;

        case 'Beyond 3rd':
             const topScores3 = await db.getTopThreeScores(guildId);
             if (topScores3.length > 1) {
                 const target = topScores3[1] - 1; // 1 less than 2nd place
                 result.description = '🚀 **Beyond to 3rd!** Bronze is nice too.';
                 result.highScoreAfter = target;
                 result.amount = target - currentHighScore;
             } else {
                 result.description = '🚀 **Beyond to 3rd!** Not enough players.';
             }
             break;

        case 'Back to Basic':
             result.description = '🔙 **Back to Basic!** Reset to $0 (Money vanishes, not to Big Bank).';
             result.amount = -currentHighScore;
             result.highScoreAfter = 0;
             result.type = 'bad';
             break;

        // Minigame placeholders - Giving cash for now
        case 'Advance Boardwalk': result.amount = 5000000; result.description = '🎲 **Advance to Boardwalk!** (Instant Prize)'; result.highScoreAfter += 5000000; break;
        case 'Bank Buster': result.amount = 7500000; result.description = '🔐 **Bank Buster!** Vault cracked!'; result.highScoreAfter += 7500000; break;
        case 'Block Party': result.amount = 2500000; result.description = '🏘️ **Block Party!** Rent collected.'; result.highScoreAfter += 2500000; break;
        case 'Community Chest': result.amount = 1000000; result.description = '🎁 **Community Chest!** Bank error in your favor.'; result.highScoreAfter += 1000000; break;
        case 'Electric Company': result.amount = 1500000; result.description = '💡 **Electric Company!** Power Bonus.'; result.highScoreAfter += 1500000; break;
        case 'No Vacancy': result.amount = 4000000; result.description = '🏨 **No Vacancy!** Hotel fully booked.'; result.highScoreAfter += 4000000; break;
        case 'Park It': result.amount = 2000000; result.description = '🚗 **Park It!** Valet fees collected.'; result.highScoreAfter += 2000000; break;
        case 'Ride Rails': result.amount = 3000000; result.description = '🚂 **Ride the Rails!** Ticket revenue.'; result.highScoreAfter += 3000000; break;
        case 'Mystery Box': result.amount = 5000000; result.description = '📦 **Mystery Box!** Rare item found!'; result.highScoreAfter += 5000000; break;
    }
    
    return result;
}

async function applyNewYearGiftEffect(interaction, result) {
    // 1. Update High Score
    // 1. Update High Score
    if (result.amount !== 0 || result.highScoreAfter !== result.highScoreBefore) {
        // Use set mode for transformative effects, add mode for simple adds
        const mode = (['Mirror Match', 'Cut Front', 'Trade Winds', 'Beyond 2nd', 'Beyond 3rd', 'Back to Basic', 'Tower of Crash', 'BRUH Bank'].includes(result.name)) ? 'set' : 'add';
        const val = mode === 'set' ? result.highScoreAfter : result.amount;
        
        await db.updateHighScoreDirectly(interaction.user.id, interaction.guildId, val, mode);
    }

    // --- APPLY SPECIAL EFFECTS ---

    // Gift Horse: Add 2 Bonus Plays
    if (result.name === 'Gift Horse') {
        try {
            await db.addBonusPlays(interaction.user.id, interaction.guildId, 2);
        } catch (e) {
            console.error('Failed to add bonus plays for Gift Horse:', e);
        }
    }

    // Tower of Crash: Reset Guild Leaderboard
    if (result.name === 'Tower of Crash') {
        try {
             await db.resetGuildProgress(interaction.guildId);
        } catch (e) {
             console.error('Failed to reset guild progress for Tower of Crash:', e);
        }
    }

    // Announcement / Big Bank / SSR SALT / Tower of Crash: Log to tower-of-cash channel
    const shouldLogToChannel = ['Announcement', 'Big Bank', 'Small Bank', 'Tower of Crash', 'BRUH Bank', 'Gift Horse'].includes(result.name) || result.name.includes('SSR SALT');
    
    if (shouldLogToChannel) {
        try {
            const channel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash');
            if (channel) {
                // Create custom embed for channel
                const announceEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`📢 TOWERS NEWS: ${result.name}!`)
                    .setDescription(
                        `**${interaction.user.username}** just triggered **${result.name}**!\n\n` +
                        `"${result.description}"`
                    )
                    .setTimestamp();

                // Specific tweaks
                if (result.name === 'Announcement') {
                    announceEmbed.setColor('#3498DB');
                    announceEmbed.setTitle('📢 SERVER ANNOUNCEMENT!');
                } else if (result.name === 'Tower of Crash') {
                    announceEmbed.setColor('#FF0000');
                    announceEmbed.setTitle('📉 MARKET CRASH!');
                    announceEmbed.setDescription(`**${interaction.user.username}** caused a **TOWER OF CRA$H** event!\n\nThe Guild Leaderboard has been RESET to 0!`);
                } else if (result.name.includes('SSR SALT')) {
                    announceEmbed.setColor('#FFFFFF');
                    announceEmbed.setTitle('🧂 SSR SALT FOUND!');
                }

                await channel.send({ embeds: [announceEmbed] });
            }
        } catch (e) {
            console.error('Failed to log to tower-of-cash:', e);
        }
    }

    // 2. Update Big Bank (if needed)
    if (result.logToBigBank) {
        if (result.name === 'Big Bank') {
            await db.resetBigBank(interaction.guildId);
        } else if (result.name === 'Small Bank') {
             await db.addToBigBank(interaction.guildId, -result.amount);
        } else {
             // For Donation/Loss events, we ADD the absolute loss to Big Bank
             await db.addToBigBank(interaction.guildId, Math.abs(result.amount));
        }
    }
}

function createBigBankLog(eventName, action, amount, newTotal) {
    return new EmbedBuilder()
      .setColor(eventName.includes('Bank') ? '#00FF00' : '#FF0000')
      .setTitle(`🏦 Big Bank Alert: ${eventName}`)
      .setDescription(
        `**Action:** ${action}\n` +
        `**Amount:** $${GameUI.formatMoney(amount)}\n` +
        `**New Pot:** $${GameUI.formatMoney(newTotal)}`
      )
      .setTimestamp();
}


async function logToBigBankChannel(guild, embed) {
    if (!guild || !config.bigBankChannelId) return;

    try {
        const channel = await guild.channels.fetch(config.bigBankChannelId).catch(() => null);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error logging to Big Bank Channel:', error);
    }
}
async function handleForceBigBankCommand(interaction) {
  // Check for admin permissions (double check, though command builder enforces it)
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('user');
  const channelId = interaction.channelId;
  const game = gameManager.getGame(channelId);

  // Validate active game
  if (!game || !game.isActive) {
    return await interaction.reply({ content: '❌ No active Tower of Cash game found in this channel.', ephemeral: true });
  }

  // Validate target user is the active player
  if (game.userId !== targetUser.id) {
    return await interaction.reply({ content: `❌ The target user **${targetUser.username}** is not the current player of this game.`, ephemeral: true });
  }

  try {
    // Get current Big Bank amount
    const lostMoney = await db.getGlobalLostMoney(interaction.guildId);

    if (lostMoney <= 0) {
      return await interaction.reply({ content: '❌ The Big Bank is currently empty ($0).', ephemeral: true });
    }

    // Add money to game
    game.totalMoney += lostMoney;

    // Reset Big Bank
    await db.resetBigBank(game.guildId, 0);

    // Reply with success
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏦 FORCE BIG BANK!')
        .setDescription(
          `**ADMIN INTERVENTION:**\n` +
          `💰 **${targetUser.username}** has been forcefully awarded the Big Bank!\n\n` +
          `💵 **Amount Added:** $${GameUI.formatMoney(lostMoney)}\n` +
          `🔄 **Big Bank Reset to:** $0\n\n` +
          `*Technical issue compensation applied.*`
        )
        .setFooter({ text: 'Admin Command Used' })]
    });

    // Log to big-bank channel
    try {
      const bigBankChannel = interaction.guild.channels.cache.find(ch => ch.name === '💰-big-bank');
      if (bigBankChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor('#FF0000') // Red for admin action
          .setTitle('⚠️ ADMIN FORCE BIG BANK')
          .setDescription(
            `**Admin:** ${interaction.user.username}\n` +
            `**Target:** ${targetUser.username}\n` +
            `**Amount Awarded:** $${GameUI.formatMoney(lostMoney)}\n` +
            `**Big Bank Reset to:** $0`
          )
          .setTimestamp();
        await bigBankChannel.send({ embeds: [logEmbed] });
      }
    } catch (e) {
      console.warn('Failed to log force-big-bank action:', e);
    }
    
    // Ensure game can continue
    // We call continueGameAfterMinigame to show the "Continue" or "Next Floor" buttons
    // This is crucial if the game was stuck
    await continueGameAfterMinigame(interaction, game);

  } catch (err) {
    console.error('Error handling force-big-bank command:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ An error occurred while forcing Big Bank.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ An error occurred while forcing Big Bank.', ephemeral: true });
    }
  }
}

async function handleCrashCommand(interaction) {
  // Check for admin permissions
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  try {
    await interaction.deferReply();

    // Reset guild progress
    await db.resetGuildProgress(interaction.guildId);

    // Reset current game money if active in this channel
    let game = gameManager.getGame(interaction.channelId);
    if (game && game.isActive) {
      game.totalMoney = 0;
      // Should we end the game? Usually crash implies game over.
      // But the event just resets money. Let's stick to event logic:
      // "Market crashed! Leaderboard reset to 0! Your Money: $0"
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📉 TOWER OF CRA$H!')
      .setDescription(
        `**${interaction.user.username}** triggered a market crash!\n\n` +
        `🏢 **The Guild Leaderboard has been RESET!**\n` +
        `💸 **All active games set to $0!**`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Announce to tower-of-cash channel if exists and not current channel
    try {
      const channel = interaction.guild.channels.cache.find(ch => ch.name === 'tower-of-cash');
      if (channel && channel.id !== interaction.channelId) {
        await channel.send({ embeds: [embed] });
      }
    } catch (e) {
      console.error('Failed to announce Tower of Crash:', e);
    }

  } catch (error) {
    console.error('Error handling crash command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ An error occurred while executing the crash.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ An error occurred while executing the crash.', ephemeral: true });
    }
  }
}

