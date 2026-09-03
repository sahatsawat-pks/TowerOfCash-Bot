// Race To A Billion (RTAB) UI Module
// Discord embeds and buttons for RTAB game

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rtabConfig = require('./rtab_config.json');

class RTABUI {
    // Lobby Embed
    static createLobbyEmbed(lobby) {
        const playerSlots = [];
        for (let i = 0; i < 4; i++) {
            if (lobby.players[i]) {
                playerSlots.push(`👤 **${lobby.players[i].username}**`);
            } else {
                playerSlots.push(`⬜ *Empty Slot*`);
            }
        }

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🎯 Race To A Billion - Lobby')
            .setDescription(
                `**Players: ${lobby.players.length}/4**\n\n` +
                playerSlots.join('\n') + '\n\n' +
                `**How to play:**\n` +
                `• Click **Join** to enter the game\n` +
                `• **Auto-Start:** Game starts in 90s (bots fill empty slots)\n` +
                `• **Manual Start:** Click "Start Game" to fill bots immediately\n` +
                `• Each player places 1 bomb via DM\n` +
                `• Take turns revealing squares\n` +
                `• Last player standing wins!`
            )
            .setFooter({ text: 'Place bombs → Pick squares → Win money!' });
    }

    // Lobby Buttons
    static createLobbyButtons() {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_join')
                    .setLabel('Join Game')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rtab_leave')
                    .setLabel('Leave')
                    .setEmoji('🚪')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rtab_start')
                    .setLabel('Start Game')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
            )
        ];
    }

    // Bomb Placement Instructions (DM)
    static createBombPlacementEmbed(game) {
        return new EmbedBuilder()
            .setColor('#FF5722')
            .setTitle('💣 Place Your Bomb!')
            .setDescription(
                `**Instructions:**\n` +
                `Type a number from **1 to 25** to place your bomb.\n\n` +
                `⚠️ **Warning:**\n` +
                `• If someone picks your bomb, they're eliminated!\n` +
                `• Don't pick your own bomb!\n` +
                `• Choose wisely - this is strategic!\n\n` +
                `**Type your number now (1-25):**`
            )
            .setFooter({ text: 'Game will start when all bombs are placed' });
    }

    // Grid Display
    static createGridEmbed(game) {
        const currentPlayer = game.getCurrentPlayer();
        const alivePlayers = game.players.filter(p => !p.isEliminated);

        // Build 5x5 grid - show emojis for ALL squares (RtaB6 style)
        let gridDisplay = '';
        for (let row = 0; row < 5; row++) {
            let rowStr = '';
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                const square = game.grid[index];

                if (square.revealed) {
                    // Show category emoji for revealed squares
                    const emoji = this.getCategoryEmoji(square.type, square.isBomb);
                    rowStr += `${emoji} `;
                } else {
                    // Show square number with proper formatting
                    const num = (index + 1).toString().padStart(2, '0');
                    rowStr += `${num} `;
                }
            }
            gridDisplay += rowStr + '\n';
        }

        // Player status
        let playerStatus = '';
        alivePlayers.forEach(p => {
            const indicator = p.userId === currentPlayer?.userId ? '👉' : '  ';
            const boostIndicator = p.booster > 100 ? ` [${p.booster}%🔥]` : '';
            const peekIndicator = p.peeks > 0 ? ` 👁️${p.peeks}` : '';
            const itemsIndicator = p.items.length > 0 ? ` 📦${p.items.length}` : '';
            const botIcon = p.isBot ? '🤖 ' : '';
            playerStatus += `${indicator} ${botIcon}${p.username} - $${this.formatMoney(p.money)}${boostIndicator}${peekIndicator}${itemsIndicator}\n`;
        });

        const eliminatedPlayers = game.players.filter(p => p.isEliminated);
        if (eliminatedPlayers.length > 0) {
            playerStatus += '\n💀 **Eliminated:**\n';
            eliminatedPlayers.forEach(p => {
                playerStatus += `   ~~${p.username}~~ - $${this.formatMoney(p.money)}\n`;
            });
        }

        // Add wager pot if active
        let wagerInfo = '';
        if (game.wagerPot > 0) {
            wagerInfo = `\n💰 **WAGER POT:** $${this.formatMoney(game.wagerPot)}\n`;
        }

        return new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🎯 Race To A Billion - Grid')
            .setDescription(
                gridDisplay + '\n' +
                `**Revealed: ${game.revealedSquares.size}/25**\n` +
                wagerInfo +
                playerStatus + '\n' +
                `🎮 **${currentPlayer.username}'s Turn**\n` +
                `Pick a square below!`
            );
    }

    // Grid Buttons (5 rows of 5 buttons each)
    static createGridButtons(game) {
        const rows = [];

        for (let row = 0; row < 5; row++) {
            const buttons = [];
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                const square = game.grid[index];

                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`rtab_square_${index}`)
                        .setLabel((index + 1).toString())
                        .setStyle(square.revealed ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(square.revealed)
                );
            }
            rows.push(new ActionRowBuilder().addComponents(buttons));
        }

        return rows;
    }

    // Tension Reveal System - Creates dramatic suspense like the show
    static createTensionRevealEmbed(game, result, stage) {
        const { player, isBomb, type, content } = result;
        const squareNum = result.squareIndex + 1;

        // Stage 1: "[Player] selects space [X]..." (RTAB format)
        if (stage === 1) {
            const embed = new EmbedBuilder()
                .setColor('#2F3136')
                .setDescription(`**${player.username}** selects space **${squareNum}**...`);
            return embed;
        }

        // Stage 2: Show value in RTAB format or suspense dots
        if (stage === 2) {
            let description = `**${player.username}** selects space **${squareNum}**...`;
            
            // Show money for prizes (like annuity display in RTAB)
            if (type === 'prize') {
                const amount = result.amountGained || content.amount;
                description += `\n**(+$${this.formatMoney(amount)})**`;
                if (player.boostMultiplier > 1) {
                    description += ` x${player.boostMultiplier}`;
                }
            } else if (type === 'minigame') {
                // For minigames, show suspense dots (revealed later)
                description += `\n**...**`;
            } else if (isBomb || type === 'event') {
                // Bombs and events get suspense dots
                description += `\n**...**`;
            }

            const embed = new EmbedBuilder()
                .setColor('#2F3136')
                .setDescription(description);
            return embed;
        }

        // Stage 3: Full reveal (RTAB format)
        if (stage === 3) {
            let color = '#4CAF50';
            let description = '';

            if (isBomb) {
                const bombConfig = result.bombConfig;
                color = '#F44336';
                
                // RTAB format: "It's a **BOMB**."
                if (result.defused) {
                    description = `It's a **${bombConfig.nameEn.toUpperCase()}**, but you **DEFUSED** it!\n\n`;
                    description += `🔧 Used defuse item.\n`;
                    description += `💚 Safe! Game continues...`;
                    color = '#4CAF50';
                } else if (bombConfig.effects.losesGame) {
                    if (result.playerAffected.userId === player.userId) {
                        description = `It's a **${bombConfig.nameEn.toUpperCase()}**.\n\n`;
                    } else {
                        description = `It's your own **${bombConfig.nameEn.toUpperCase()}**.\n\n`;
                    }
                    description += `💀 ${player.username} is **ELIMINATED**!\n`;
                    if (result.moneyLost > 0) {
                        description += `💸 Lost: $${this.formatMoney(result.moneyLost)}\n`;
                    }
                    if (result.statsPenalty > 0) {
                        description += `📉 Stats Penalty: -$${this.formatMoney(result.statsPenalty)}`;
                    }
                } else if (bombConfig.effects.placerLoses) {
                    description = `It's a **${bombConfig.nameEn.toUpperCase()}**!\n\n`;
                    description += `🔄 **BACKFIRE!**\n`;
                    description += `💀 ${result.placerAffected?.username} (bomb placer) is eliminated!`;
                } else {
                    description = `It's a **${bombConfig.nameEn.toUpperCase()}**.\n\n`;
                    description += `✨ Nothing happened! It was a fake bomb!`;
                }
            } else {
                // Non-bomb reveals (RTAB format)
                switch (type) {
                    case 'prize':
                        const amount = result.amountGained || content.amount;
                        // RTAB format: Just show dollar amount, no prize name
                        description = `**$${this.formatMoney(amount)}**!`;
                        if (player.boostMultiplier > 1) {
                            description += `\n(x${player.boostMultiplier} boost applied!)`;
                        }
                        color = '#4CAF50';
                        break;

                    case 'multiplier':
                        color = '#FFD700';
                        if (content.effect === 'multiply') {
                            description = `A **x${content.value}** Multiplier!\n\n📈 Money multiplied by ${content.value}!`;
                        } else if (content.effect === 'divide') {
                            description = `A **÷${content.value}** Divider.\n\n📉 Money divided by ${content.value}.`;
                        } else if (content.effect === 'boost_3turns') {
                            description = `A **+${content.value}%** Booster!\n\n🔥 x${content.value} boost for 3 turns!`;
                        }
                        break;

                    case 'event':
                        color = '#9C27B0';
                        description = `It's an event: **${content.nameEn}**!\n\n`;
                        description += `${content.emoji} ${result.message || content.description || ''}`;
                        break;

                    case 'item':
                        color = '#2196F3';
                        description = `You found an item: **${content.nameEn}**!\n\n`;
                        description += `${content.emoji} ${content.description || ''}`;
                        break;

                    case 'minigame':
                        color = '#E91E63';
                        // RTAB format: "It's a minigame: **Name**!"
                        description = `It's a minigame: **${content.nameEn}**!\n\n`;
                        description += `${content.emoji} Winner earns **$${this.formatMoney(content.winReward)}**!`;
                        break;

                    default:
                        description = 'Content revealed!';
                }
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(description);

            return embed;
        }
    }

    // Square Reveal Result
    static createSquareRevealEmbed(game, result) {
        const { player, isBomb } = result;

        if (isBomb) {
            const bombConfig = result.bombConfig;
            const color = '#F44336';
            const title = `${bombConfig.emoji} ${bombConfig.nameEn.toUpperCase()}!`;

            let description = `**${player.username} hit a bomb!**\n\n`;

            if (result.defused) {
                description = `**${player.username} hit a bomb but DEFUSED it!** 🔧\n\n`;
                description += `💚 **Safe!** Used defuse item.\n`;
                description += `Game continues...`;
            } else if (bombConfig.effects.losesGame) {
                description += `💀 **Player Eliminated!**\n`;
                if (result.moneyLost > 0) {
                    description += `💰 **Lost:** $${this.formatMoney(result.moneyLost)}\n`;
                }
                if (result.statsPenalty > 0) {
                    description += `📉 **Stats Penalty:** -$${this.formatMoney(result.statsPenalty)}`;
                }
            } else if (bombConfig.effects.placerLoses) {
                description = `**${bombConfig.nameEn}!**\n\n`;
                description += `🔄 **Backfire!** The bomb placer ${result.placerAffected?.username} loses instead!\n`;
                description += `💀 ${result.placerAffected?.username} eliminated!`;
            } else {
                description += `✨ **Nothing happened!** This was a fake bomb!`;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description);
        } else {
            // Non-bomb reveal
            const content = result.content;
            let color = '#4CAF50';
            let title = '📍 SPACE REVEALED'; // Default title to avoid empty string
            let description = `**${player.username} revealed:**\n\n`;

            // Debug logging
            if (!content) {
                console.error('ERROR: No content in result:', result);
                description += `⚠️ Error: No content data (type: ${result.type})`;
            } else {
                switch (result.type) {
                    case 'prize':
                    case 'cash':
                        title = `💵 PRIZE!`;
                        description += `💰 +$${this.formatMoney(result.amountGained || content.amount)}`;
                        if (player.boostMultiplier > 1) {
                            description += ` (x${player.boostMultiplier} boost!)`;
                        }
                        break;

                    case 'multiplier':
                    case 'boost':
                        color = '#FFD700';
                        title = `✖️ MULTIPLIER!`;
                        if (content.effect === 'multiply') {
                            description += `📈 Money x${content.value}!`;
                        } else if (content.effect === 'divide') {
                            description += `📉 Money ÷${content.value}`;
                        } else if (content.effect === 'boost_3turns') {
                            description += `🔥 x${content.value} boost for 3 turns!`;
                        }
                        break;

                    case 'event':
                        color = '#9C27B0';
                        title = `🎲 EVENT!`;
                        description += result.message || content.nameEn;
                        break;

                    case 'item':
                        color = '#2196F3';
                        title = `📦 ITEM!`;
                        description += `${content.emoji} **${content.nameEn}**`;
                        break;

                    case 'minigame':
                        color = '#E91E63';
                        title = `🎮 MINIGAME!`;
                        description += `${content.emoji} **${content.nameEn}**\n\n`;
                        description += `🎉 **Winner!** +$${this.formatMoney(content.winReward)}`;
                        break;

                    default:
                        console.error('ERROR: Unhandled content type:', result.type, result);
                        title = '📍 SPACE REVEALED';
                        description += `⚠️ Unknown content type: ${result.type}`;
                }
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description);
        }
    }

    // Winner Embed
    static createWinnerEmbed(game, winCondition) {
        const { condition, winner } = winCondition;

        let title, description;
        if (condition === 'last_standing') {
            title = '👑 LAST PLAYER STANDING!';
            description =
                `**${winner.username} survived!**\n\n` +
                `💰 **Final Money:** $${this.formatMoney(winner.money)}\n` +
                `🏆 **Victory!**\n\n` +
                `*All other players were eliminated!*`;
        } else {
            title = '🎊 BOARD CLEARED!';
            description =
                `**${winner.username} wins!**\n\n` +
                `💰 **Final Money:** $${this.formatMoney(winner.money)}\n` +
                `📊 **All 25 squares revealed!**`;
        }

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: 'Game Over - Thanks for playing!' });
    }

    // Helper: Get category emoji
    static getCategoryEmoji(type, isBomb = false) {
        // RtaB6 style emojis
        if (isBomb) return '💣';
        
        const emojis = {
            prize: '💵',
            cash: '💵',
            multiplier: '✖️',
            boost: '⚡',
            event: '🎲',
            item: '📦',
            minigame: '🎮',
            bomb: '💣'
        };
        return emojis[type] || '❓';
    }

    // Helper: Format money
    static formatMoney(amount) {
        return new Intl.NumberFormat('en-US').format(amount);
    }

    // ==================== MINIGAME UI ====================

    // CoinFlip Intro Embed
    static createCoinFlipIntroEmbed(game) {
        const state = game.minigameState;
        const paytableText = state.paytable.map((v, i) =>
            `Stage ${i}: $${this.formatMoney(v)}`
        ).join('\n');

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🪙 COINFLIP 🪙')
            .setDescription(
                `**Player:** ${state.player.username}\n\n` +
                `You have **${state.coins} coins**!\n\n` +
                `**Rules:**\n` +
                `• Choose HEADS or TAILS\n` +
                `• All coins that land on your choice stay\n` +
                `• If ANY survive, you advance a stage\n` +
                `• If ALL lose, you lose everything!\n` +
                `• STOP anytime to collect winnings\n\n` +
                `**Paytable:**\n\`\`\`${paytableText}\`\`\`\n` +
                `Current Stage: **${state.stage}** - $${this.formatMoney(state.paytable[state.stage])}`
            )
            .setFooter({ text: 'Pick HEADS, TAILS, or STOP!' });
    }

    // CoinFlip Buttons
    static createCoinFlipButtons() {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_heads')
                    .setLabel('HEADS')
                    .setEmoji('🪙')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_tails')
                    .setLabel('TAILS')
                    .setEmoji('🪙')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_stop')
                    .setLabel('STOP')
                    .setEmoji('🛑')
                    .setStyle(ButtonStyle.Danger)
            )
        ];
    }

    // CoinFlip Result Embed
    static createCoinFlipResultEmbed(game, result) {
        const state = game.minigameState;
        let color, title, description;

        if (result.stopped) {
            color = '#32CD32';
            title = '🪙 CASHED OUT!';
            description = `**${state.player.username}** stopped at Stage ${state.stage}\n\n` +
                `💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else if (result.lost) {
            color = '#FF0000';
            title = '🪙 LOST! 🪙';
            description = `**Flipped ${result.flipped} coins...**\n\n` +
                `❌ ${result.message}\n\n` +
                `💸 **Lost everything!**`;
        } else if (result.jackpot) {
            color = '#FFD700';
            title = '🪙 JACKPOT! 🪙';
            description = `**${result.correct} ${result.choice.toUpperCase()}!**\n\n` +
                `🎉 ${result.message}\n\n` +
                `🏆 **You are a CHAMPION!**`;
        } else {
            color = '#00FF00';
            title = '🪙 CLEARED!';
            description = `**Flipped ${result.flipped} coins...**\n\n` +
                `✅ Got **${result.correct} ${result.choice.toUpperCase()}**!\n\n` +
                `📈 Stage ${result.newStage} - $${this.formatMoney(result.currentValue)}\n` +
                `🪙 Coins remaining: ${result.coinsRemaining}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: result.jackpot || result.lost || result.stopped ? 'Returning to game...' : 'Pick HEADS, TAILS, or STOP!' });
    }

    // Gamble Intro Embed
    static createGambleIntroEmbed(game) {
        const state = game.minigameState;

        // Generate board
        let board = '';
        for (let i = 0; i < 20; i++) {
            if (state.pickedSpaces[i]) {
                board += '  ';
            } else {
                board += String(i + 1).padStart(2, '0');
            }
            board += (i % 5 === 4) ? '\n' : ' ';
        }

        return new EmbedBuilder()
            .setColor('#8B00FF')
            .setTitle('🎰 THE GAMBLE 🎰')
            .setDescription(
                `**Player:** ${state.player.username}\n\n` +
                `**Rules:**\n` +
                `• 20 hidden values from $100 to $1,000,000\n` +
                `• Each pick must be HIGHER than previous\n` +
                `• Lower value = LOSE EVERYTHING!\n` +
                `• STOP anytime to keep your total\n\n` +
                `**Board:**\n\`\`\`\n${board}\`\`\`\n` +
                `**Last Pick:** $${this.formatMoney(state.lastPick)}\n` +
                `**Total:** $${this.formatMoney(state.total)}`
            )
            .setFooter({ text: 'Pick a number 1-20 or STOP!' });
    }

    // Gamble Buttons (numbers 1-20 in rows + STOP)
    static createGambleButtons(game) {
        const state = game.minigameState;
        const rows = [];

        // 4 rows of 5 numbers each
        for (let row = 0; row < 4; row++) {
            const buttons = [];
            for (let col = 0; col < 5; col++) {
                const num = row * 5 + col + 1;
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`rtab_mg_gamble_${num}`)
                        .setLabel(String(num))
                        .setStyle(state.pickedSpaces[num - 1] ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(state.pickedSpaces[num - 1])
                );
            }
            rows.push(new ActionRowBuilder().addComponents(buttons));
        }

        // Stop button
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rtab_mg_stop')
                .setLabel('STOP')
                .setEmoji('🛑')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(state.total === 0)
        ));

        return rows;
    }

    // Gamble Result Embed
    static createGambleResultEmbed(game, result) {
        const state = game.minigameState;
        let color, title, description;

        if (result.stopped) {
            color = '#32CD32';
            title = '🎰 CASHED OUT!';
            description = `**${state.player.username}** stopped!\n\n` +
                `💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else if (result.lost) {
            color = '#FF0000';
            title = '🎰 BUSTED! 🎰';
            description = `**Space ${result.space}: $${this.formatMoney(result.revealed)}**\n\n` +
                `❌ ${result.message}\n\n` +
                `💸 **You walked away with nothing!**`;
        } else if (result.jackpot) {
            color = '#FFD700';
            title = '🎰 MILLION DOLLAR WIN! 🎰';
            description = `**Space ${result.space}: $${this.formatMoney(result.revealed)}**\n\n` +
                `🎉 ${result.message}\n\n` +
                `🏆 **THE MAX - GAME OVER!**`;
        } else {
            color = '#00FF00';
            title = '🎰 SUCCESS!';
            description = `**Space ${result.space}: $${this.formatMoney(result.revealed)}**\n\n` +
                `✅ Higher than $${this.formatMoney(result.lastPick)}!\n\n` +
                `💰 **New Total:** $${this.formatMoney(result.newTotal)}\n` +
                `📊 Pick another or STOP!`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: result.jackpot || result.lost || result.stopped ? 'Returning to game...' : 'Pick a number or STOP!' });
    }

    // ==================== DEAL OR NO DEAL ====================

    static createDONDIntroEmbed(game) {
        const state = game.minigameState;
        const remainingValues = state.values.slice().sort((a, b) => a - b);

        // Format board
        let board = remainingValues.map(v => `$${this.formatMoney(v)}`).join(' | ');

        return new EmbedBuilder()
            .setColor('#FF6600')
            .setTitle('💼 DEAL OR NO DEAL 💼')
            .setDescription(
                `**Player:** ${state.player.username}\n\n` +
                `**Boxes Remaining:** ${state.casesLeft}\n` +
                `**Values in Play:**\n${board}\n\n` +
                `💰 **BANK OFFER: $${this.formatMoney(state.offer)}**\n\n` +
                `Will you take the deal?`
            )
            .setFooter({ text: 'DEAL or NO DEAL?' });
    }

    static createDONDButtons() {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_deal')
                    .setLabel('DEAL')
                    .setEmoji('💰')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_nodeal')
                    .setLabel('NO DEAL')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            )
        ];
    }

    static createDONDResultEmbed(game, result) {
        let color, title, description;

        if (result.accepted) {
            color = '#32CD32';
            title = '💼 DEAL ACCEPTED!';
            description = `💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else if (result.finalBox) {
            color = '#FFD700';
            title = '💼 YOUR BOX REVEALED!';
            description = `📦 ${result.message}\n\n💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else {
            color = '#FF6600';
            title = '💼 NO DEAL!';
            const opened = result.boxesOpened.map(v => `$${this.formatMoney(v)}`).join(', ');
            description = `**Opened:** ${opened}\n\n` +
                `📊 **New Offer:** $${this.formatMoney(result.newOffer)}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: result.accepted || result.finalBox ? 'Returning to game...' : 'DEAL or NO DEAL?' });
    }

    // ==================== UP AND DOWN ====================

    static createUpDownIntroEmbed(game) {
        const state = game.minigameState;
        const displayValues = state.values.map(v =>
            v >= 0 ? `+$${this.formatMoney(v)}` : `-$${this.formatMoney(Math.abs(v))}`
        );

        return new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle('📈 UP AND DOWN 📉')
            .setDescription(
                `**Player:** ${state.player.username}\n\n` +
                `**Round ${state.round}**\n` +
                `**Current Total:** $${this.formatMoney(state.total)}\n\n` +
                `**Envelope Values (shuffled):**\n` +
                `${displayValues.join(' | ')}\n\n` +
                `Pick **A, B, C, D, or E** - or **STOP**!`
            )
            .setFooter({ text: 'Values change each round!' });
    }

    static createUpDownButtons() {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('rtab_mg_updown_a').setLabel('A').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rtab_mg_updown_b').setLabel('B').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rtab_mg_updown_c').setLabel('C').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rtab_mg_updown_d').setLabel('D').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rtab_mg_updown_e').setLabel('E').setStyle(ButtonStyle.Primary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_stop')
                    .setLabel('STOP')
                    .setEmoji('🛑')
                    .setStyle(ButtonStyle.Danger)
            )
        ];
    }

    static createUpDownResultEmbed(game, result) {
        const state = game.minigameState;
        let color, title, description;

        if (result.stopped) {
            color = '#32CD32';
            title = '📈 CASHED OUT!';
            description = `💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else if (result.busted) {
            color = '#FF0000';
            title = '📉 BUSTED!';
            description = `**Envelope ${result.envelope}:** ${result.value >= 0 ? '+' : ''}$${this.formatMoney(result.value)}\n\n` +
                `❌ Total went negative! Lost everything!`;
        } else {
            color = result.value >= 0 ? '#00FF00' : '#FFA500';
            title = `📈 ENVELOPE ${result.envelope}`;
            description = `**Value:** ${result.value >= 0 ? '+' : ''}$${this.formatMoney(result.value)}\n\n` +
                `💰 **New Total:** $${this.formatMoney(result.newTotal)}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: result.stopped || result.busted ? 'Returning to game...' : 'Pick an envelope or STOP!' });
    }

    // ==================== SAFE CRACKER ====================

    static createSafeCrackerIntroEmbed(game) {
        const state = game.minigameState;

        return new EmbedBuilder()
            .setColor('#708090')
            .setTitle('🔒 SAFE CRACKER 🔒')
            .setDescription(
                `**Player:** ${state.player.username}\n\n` +
                `**Choose a Safe:**\n\n` +
                `🥉 **BRONZE** - 5 digits - $200,000\n` +
                `🥈 **SILVER** - 7 digits - $1,000,000\n` +
                `🥇 **GOLD** - 9 digits - $7,500,000\n\n` +
                `You have **3 attempts** to crack the code!`
            )
            .setFooter({ text: 'Choose BRONZE, SILVER, or GOLD' });
    }

    static createSafeCrackerSafeButtons() {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('rtab_mg_safe_bronze').setLabel('BRONZE').setEmoji('🥉').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rtab_mg_safe_silver').setLabel('SILVER').setEmoji('🥈').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rtab_mg_safe_gold').setLabel('GOLD').setEmoji('🥇').setStyle(ButtonStyle.Success)
            )
        ];
    }

    static createSafeCrackerGameEmbed(game) {
        const state = game.minigameState;
        const digits = state.safeDigits[state.chosenSafe];

        // Show locked in digits
        let codeDisplay = '';
        for (let i = 0; i < digits; i++) {
            codeDisplay += state.lockedIn[i] ? state.solution[i] : '-';
        }

        // Show previous guesses
        const guessHistory = state.guesses.map(g => `\`${g}\``).join(' → ') || 'None yet';

        return new EmbedBuilder()
            .setColor('#708090')
            .setTitle(`🔒 ${state.safeNames[state.chosenSafe]} SAFE`)
            .setDescription(
                `**Prize:** $${this.formatMoney(state.safePrizes[state.chosenSafe])}\n\n` +
                `**Code:** \`${codeDisplay}\`\n` +
                `**Correct:** ${state.digitsCorrect}/${digits}\n` +
                `**Attempts Left:** ${state.attemptsLeft}\n\n` +
                `**Previous Guesses:** ${guessHistory}\n\n` +
                `Type a ${digits}-digit code using digits 1-${digits}`
            )
            .setFooter({ text: `Use digits 1-${digits} only` });
    }

    static createSafeCrackerResultEmbed(game, result) {
        const state = game.minigameState;
        let color, title, description;

        if (result.cracked) {
            color = '#32CD32';
            title = '🔓 SAFE CRACKED!';
            description = `✅ **Code:** ${result.solution.join('')}\n\n` +
                `💰 **Won:** $${this.formatMoney(result.winnings)}`;
        } else if (result.lockedOut) {
            color = '#FF0000';
            title = '🔒 LOCKED OUT!';
            description = `❌ ${result.message}\n\n💸 Won nothing!`;
        } else {
            color = result.newCorrect > 0 ? '#00FF00' : '#FFA500';
            title = `🔒 ${result.digitsCorrect} CORRECT`;
            description = `**Guess:** \`${result.guess}\`\n` +
                `**New digits found:** ${result.newCorrect}\n\n` +
                `**Attempts Left:** ${result.attemptsLeft}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: result.cracked || result.lockedOut ? 'Returning to game...' : 'Enter your next guess!' });
    }

    // ==================== LEADERBOARD & STATS ====================

    static createLeaderboardEmbed(leaderboard, totalGames, client) {
        let rankingText = '';

        if (leaderboard.length === 0) {
            rankingText = '*No games played yet!*';
        } else {
            const medals = ['🥇', '🥈', '🥉'];
            for (let i = 0; i < leaderboard.length; i++) {
                const player = leaderboard[i];
                const medal = medals[i] || `**${i + 1}.**`;
                const winRate = player.games_played > 0
                    ? Math.round((player.games_won / player.games_played) * 100)
                    : 0;
                rankingText += `${medal} <@${player.user_id}>\n`;
                rankingText += `   💰 $${this.formatMoney(player.total_money_earned)} | `;
                rankingText += `🏆 ${player.games_won}W / ${player.games_played}P (${winRate}%)\n`;
            }
        }

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🏆 RTAB Leaderboard')
            .setDescription(rankingText)
            .setFooter({ text: `Total games played: ${totalGames}` })
            .setTimestamp();
    }

    static createStatsEmbed(user, stats) {
        const winRate = stats.games_played > 0
            ? Math.round((stats.games_won / stats.games_played) * 100)
            : 0;

        const lastPlayed = stats.last_played
            ? `<t:${Math.floor(stats.last_played / 1000)}:R>`
            : 'Never';

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle(`📊 RTAB Stats - ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '🎮 Games Played', value: `${stats.games_played}`, inline: true },
                { name: '🏆 Wins', value: `${stats.games_won}`, inline: true },
                { name: '📈 Win Rate', value: `${winRate}%`, inline: true },
                { name: '💰 Total Earnings', value: `$${this.formatMoney(stats.total_money_earned)}`, inline: true },
                { name: '💥 Eliminations', value: `${stats.total_eliminations}`, inline: true },
                { name: '🕐 Last Played', value: lastPlayed, inline: true }
            )
            .setTimestamp();
    }

    // ==================== DOUBLE ZEROES UI ====================

    static createDoubleZeroesIntroEmbed() {
        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🔢 Double Zeroes!')
            .setDescription(
                '**20 spaces: 9 Double Zeros (00), 10 digits (0-9), 1 Joker Zero**\n\n' +
                '• Pick spaces to build a 4-digit bank\n' +
                '• After 4 digits: STOP to multiply bank × (00s left × 5)\n' +
                '• Or continue picking - hit 00 = ×100, hit digit = LOSE ALL!\n\n' +
                'Pick a number (1-20) to begin!'
            );
    }

    static createDoubleZeroesButtons(state) {
        const rows = [];
        for (let rowIdx = 0; rowIdx < 4; rowIdx++) {
            const row = new ActionRowBuilder();
            for (let colIdx = 0; colIdx < 5; colIdx++) {
                const idx = rowIdx * 5 + colIdx;
                const picked = state.picked[idx];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rtab_mg_dz_${idx + 1}`)
                        .setLabel(picked ? '  ' : `${idx + 1}`)
                        .setStyle(picked ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(picked)
                );
            }
            rows.push(row);
        }
        // Add STOP button if in decision phase
        if (state.phase === 'decision') {
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_dz_stop')
                    .setLabel(`STOP (Win $${(state.bank * state.zeroesLeft * 5).toLocaleString()})`)
                    .setStyle(ButtonStyle.Success)
            ));
        }
        return rows;
    }

    static createDoubleZeroesResultEmbed(result, state) {
        let color = '#9C27B0';
        let title = '🔢 Double Zeroes';

        if (result.won) color = '#4CAF50';
        else if (result.lost) color = '#F44336';
        else if (result.stopped) color = '#4CAF50';

        let description = result.message + '\n\n';
        description += `💰 **Bank:** $${state.bank.toLocaleString()}\n`;
        description += `📊 **Digits:** ${state.digitsPicked}/4\n`;
        description += `🎯 **00s Left:** ${state.zeroesLeft}`;

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description);
    }

    // ==================== SUPERCASH UI ====================

    static createSupercashIntroEmbed() {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Supercash!')
            .setDescription(
                '**Match 2 of the same value to win!**\n\n' +
                '• 24 spaces with values $500K - $10M\n' +
                '• Match 3 jackpots ($10M) to win big!\n' +
                '• ⚠️ 1 hidden BOMB ends the game!\n\n' +
                'Pick a number (1-24) to begin!'
            );
    }

    static createSupercashButtons(state) {
        const rows = [];
        for (let rowIdx = 0; rowIdx < 4; rowIdx++) {
            const row = new ActionRowBuilder();
            for (let colIdx = 0; colIdx < 6; colIdx++) {
                const idx = rowIdx * 6 + colIdx;
                const picked = state.picked[idx];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rtab_mg_sc_${idx + 1}`)
                        .setLabel(picked ? '  ' : `${idx + 1}`)
                        .setStyle(picked ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(picked)
                );
            }
            rows.push(row);
        }
        return rows;
    }

    static createSupercashResultEmbed(result, state) {
        let color = '#FFD700';
        let title = '💎 Supercash';

        if (result.won) color = '#4CAF50';
        else if (result.lost) color = '#F44336';

        let description = result.message + '\n\n**Found:**\n';
        state.values.forEach((v, i) => {
            if (state.counts[i] > 0 && v > 0) {
                const marker = state.counts[i] >= (i === state.values.length - 1 ? 3 : 2) ? '✅' : '🔸';
                description += `${marker} $${v.toLocaleString()} × ${state.counts[i]}\n`;
            }
        });

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description);
    }

    // ==================== THE OFFER UI ====================

    static createTheOfferIntroEmbed(offers) {
        return new EmbedBuilder()
            .setColor('#FF5722')
            .setTitle('💣 Three Offers!')
            .setDescription(
                '**Enter rooms with live bombs!**\n\n' +
                `🔵 **LOW:** Survive ${offers.low.ticks} tick → +$${offers.low.amount.toLocaleString()}\n` +
                `🟡 **MEDIUM:** Survive ${offers.medium.ticks} ticks → +$${offers.medium.amount.toLocaleString()}\n` +
                `🔴 **HIGH:** Survive ${offers.high.ticks} ticks → +$${offers.high.amount.toLocaleString()}\n\n` +
                `💰 **Bank:** $${offers.stopValue.toLocaleString()}\n` +
                `💥 **Bomb Chance:** 5% per tick\n\n` +
                'Choose your risk level!'
            );
    }

    static createTheOfferButtons(offers) {
        return [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rtab_mg_offer_low')
                .setLabel(`LOW (${offers.low.ticks} tick)`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rtab_mg_offer_medium')
                .setLabel(`MED (${offers.medium.ticks} ticks)`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rtab_mg_offer_high')
                .setLabel(`HIGH (${offers.high.ticks} ticks)`)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('rtab_mg_offer_stop')
                .setLabel(`STOP ($${offers.stopValue.toLocaleString()})`)
                .setStyle(ButtonStyle.Success)
        )];
    }

    static createTheOfferResultEmbed(result, state) {
        let color = '#FF5722';
        let title = '💣 Three Offers';

        if (result.exploded) color = '#F44336';
        else if (result.stopped) color = '#4CAF50';
        else if (result.survived) color = '#4CAF50';

        let description = '';

        // Show tick animation
        if (result.ticks) {
            result.ticks.forEach(t => {
                description += t.result === 'BOOM' ? '💥 **BOOM!**\n' : `⏱️ Tick ${t.tick}...\n`;
            });
            description += '\n';
        }

        description += result.message;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description);

        // Add next round info if continuing
        if (result.nextOffers) {
            embed.addFields(
                { name: '─────────────────', value: `**Room ${state.round}** | Bomb: ${state.chanceToBomb}%`, inline: false },
                { name: '🔵 LOW', value: `${result.nextOffers.low.ticks} tick → +$${result.nextOffers.low.amount.toLocaleString()}`, inline: true },
                { name: '🟡 MEDIUM', value: `${result.nextOffers.medium.ticks} ticks → +$${result.nextOffers.medium.amount.toLocaleString()}`, inline: true },
                { name: '🔴 HIGH', value: `${result.nextOffers.high.ticks} ticks → +$${result.nextOffers.high.amount.toLocaleString()}`, inline: true }
            );
        }

        return embed;
    }

    // ==================== MONEY CARDS UI ====================

    static createMoneyCardsIntroEmbed(state) {
        const currentCard = state.layout[state.stage];
        const cardDisplay = `${currentCard.rank}${currentCard.suit}`;

        return new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🃏 Money Cards!')
            .setDescription(
                '**Bet Higher or Lower on each card!**\n\n' +
                `💰 **Current Stake:** $${state.score.toLocaleString()}\n` +
                `🃏 **Current Card:** **${cardDisplay}**\n` +
                `📊 **Stage:** ${state.stage + 1}/8\n\n` +
                `Minimum Bet: $${state.minimumBet.toLocaleString()}`
            );
    }

    static createMoneyCardsButtons(state) {
        const rows = [];

        if (state.phase === 'pick_direction') {
            // Direction buttons
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_mc_higher')
                    .setLabel('📈 HIGHER')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_mc_lower')
                    .setLabel('📉 LOWER')
                    .setStyle(ButtonStyle.Danger)
            ));

            // Change button if available
            if (state.canChange) {
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('rtab_mg_mc_change')
                        .setLabel('🔄 Change Card')
                        .setStyle(ButtonStyle.Secondary)
                ));
            }
        } else if (state.phase === 'pick_wager') {
            // Wager buttons
            const halfBet = Math.floor(state.score / 2);
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rtab_mg_mc_bet_min')
                    .setLabel(`Min ($${state.minimumBet.toLocaleString()})`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_mc_bet_half')
                    .setLabel(`Half ($${halfBet.toLocaleString()})`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(halfBet < state.minimumBet),
                new ButtonBuilder()
                    .setCustomId('rtab_mg_mc_bet_all')
                    .setLabel(`All-In ($${state.score.toLocaleString()})`)
                    .setStyle(ButtonStyle.Danger)
            ));
        }

        return rows;
    }

    static createMoneyCardsResultEmbed(result, state) {
        let color = '#4169E1';
        if (result.won) color = '#4CAF50';
        else if (result.lost) color = '#F44336';

        let description = result.message + '\n\n';
        description += `💰 **Stake:** $${state.score.toLocaleString()}\n`;
        description += `🃏 **Stage:** ${state.stage + 1}/8`;

        // Show card layout
        if (!result.completed) {
            const currentCard = state.layout[state.stage];
            description += `\n**Current Card:** ${currentCard.rank}${currentCard.suit}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle('🃏 Money Cards')
            .setDescription(description);
    }

    // ==================== MARKET UI ====================

    static createMarketEmbed(game) {
        const state = game.marketState;
        if (!state) return null;

        const player = state.player;
        
        let description = `**Welcome to the RtaB Market!**\n`;
        description += `Feel free to browse, but try not to carouse!\n\n`;
        description += `**Available Wares:**\n`;

        if (state.validOptions.includes('BUY_BOOST')) {
            description += `🔼 **BUY BOOST** - +${state.buyBoostAmount}% Boost (Cost: $${state.buyBoostPrice.toLocaleString()})\n`;
        }
        if (state.validOptions.includes('SELL_BOOST')) {
            description += `🔽 **SELL BOOST** - $${state.sellBoostReward.toLocaleString()} (Cost: ${state.sellBoostAmount}% Boost)\n`;
        }
        if (state.validOptions.includes('BUY_GAME')) {
            description += `🎮 **BUY GAME** - Random Minigame (Cost: $${state.gamePrice.toLocaleString()})\n`;
        }
        if (state.validOptions.includes('SELL_GAME')) {
            description += `💸 **SELL GAME** - $${(player.minigames.length * state.gamePrice * 0.75).toLocaleString()} (Cost: Your Minigames)\n`;
        }
        if (state.validOptions.includes('BUY_PEEK')) {
            description += `👁️ **BUY PEEK** - 1 Peek (Cost: $${state.buyPeekPrice.toLocaleString()})\n`;
        }
        if (state.validOptions.includes('SELL_PEEK')) {
            description += `💰 **SELL PEEK** - $${state.sellPeekReward.toLocaleString()} (Cost: 1 Peek)\n`;
        }
        if (state.validOptions.includes('BUY_COMMAND')) {
            description += `⚡ **BUY COMMAND** - Random Hidden Command (Cost: $${state.buyCommandPrice.toLocaleString()})\n`;
        }
        if (state.validOptions.includes('BUY_INFO')) {
            description += `📊 **BUY INFO** - List of Remaining Spaces (Cost: $${state.buyInfoPrice.toLocaleString()})\n`;
        }

        // Robbery options
        if (state.validOptions.includes('ROB_ROCK')) {
            description += `\n**Rob the Market - Choose your weapon:**\n`;
            description += `🪨 **ROB ROCK**\n`;
            description += `📄 **ROB PAPER**\n`;
            description += `✂️ **ROB SCISSORS**\n`;
        }

        description += `\n🚪 **LEAVE**\n`;
        description += `\n💰 **Current Cash:** $${player.money.toLocaleString()}`;
        description += `\n📈 **Boost:** ${player.booster}%`;
        description += `\n👁️ **Peeks:** ${player.peeks}`;

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🏪 RtaB Market')
            .setDescription(description)
            .setFooter({ text: 'Click a button to make your selection' });
    }

    static createMarketButtons(game) {
        const state = game.marketState;
        if (!state) return [];

        const rows = [];
        const row1 = [];
        const row2 = [];
        const row3 = [];
        const row4 = [];

        if (state.validOptions.includes('BUY_BOOST')) {
            row1.push(new ButtonBuilder()
                .setCustomId('rtab_market_buy_boost')
                .setLabel('Buy Boost')
                .setEmoji('🔼')
                .setStyle(ButtonStyle.Success));
        }
        if (state.validOptions.includes('SELL_BOOST')) {
            row1.push(new ButtonBuilder()
                .setCustomId('rtab_market_sell_boost')
                .setLabel('Sell Boost')
                .setEmoji('🔽')
                .setStyle(ButtonStyle.Secondary));
        }
        if (state.validOptions.includes('BUY_GAME')) {
            row1.push(new ButtonBuilder()
                .setCustomId('rtab_market_buy_game')
                .setLabel('Buy Game')
                .setEmoji('🎮')
                .setStyle(ButtonStyle.Success));
        }
        if (state.validOptions.includes('SELL_GAME')) {
            row1.push(new ButtonBuilder()
                .setCustomId('rtab_market_sell_game')
                .setLabel('Sell Game')
                .setEmoji('💸')
                .setStyle(ButtonStyle.Secondary));
        }

        if (state.validOptions.includes('BUY_PEEK')) {
            row2.push(new ButtonBuilder()
                .setCustomId('rtab_market_buy_peek')
                .setLabel('Buy Peek')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Success));
        }
        if (state.validOptions.includes('SELL_PEEK')) {
            row2.push(new ButtonBuilder()
                .setCustomId('rtab_market_sell_peek')
                .setLabel('Sell Peek')
                .setEmoji('💰')
                .setStyle(ButtonStyle.Secondary));
        }
        if (state.validOptions.includes('BUY_COMMAND')) {
            row2.push(new ButtonBuilder()
                .setCustomId('rtab_market_buy_command')
                .setLabel('Buy Command')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Success));
        }
        if (state.validOptions.includes('BUY_INFO')) {
            row2.push(new ButtonBuilder()
                .setCustomId('rtab_market_buy_info')
                .setLabel('Buy Info')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Success));
        }

        // Robbery options
        if (state.validOptions.includes('ROB_ROCK')) {
            row3.push(
                new ButtonBuilder()
                    .setCustomId('rtab_market_rob_rock')
                    .setLabel('Rob with Rock')
                    .setEmoji('🪨')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('rtab_market_rob_paper')
                    .setLabel('Rob with Paper')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('rtab_market_rob_scissors')
                    .setLabel('Rob with Scissors')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        // Leave button
        row4.push(new ButtonBuilder()
            .setCustomId('rtab_market_leave')
            .setLabel('Leave Market')
            .setEmoji('🚪')
            .setStyle(ButtonStyle.Secondary));

        if (row1.length > 0) rows.push(new ActionRowBuilder().addComponents(row1));
        if (row2.length > 0) rows.push(new ActionRowBuilder().addComponents(row2));
        if (row3.length > 0) rows.push(new ActionRowBuilder().addComponents(row3));
        if (row4.length > 0) rows.push(new ActionRowBuilder().addComponents(row4));

        return rows;
    }

    static createMarketResultEmbed(result) {
        let color = result.success ? '#4CAF50' : '#F44336';
        let title = result.action.replace(/_/g, ' ');
        
        if (result.robbery) {
            color = result.robbery.success ? '#4CAF50' : '#F44336';
            title = result.robbery.success ? '🎉 Robbery Successful!' : '👮 Arrested!';
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(result.message);
    }

    // ==================== WAGER & PEEK UI ====================

    static createWagerEmbed(result) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 WAGER STARTED!')
            .setDescription(
                result.message + '\n\n' +
                `**Wager Amount:** $${result.wagerAmount.toLocaleString()}\n` +
                `**Total Pot:** $${result.totalPot.toLocaleString()}\n\n` +
                `Winners take all at the end!`
            );
    }

    static createPeekResultEmbed(result) {
        let description = `**Peeked at Space ${result.squareIndex + 1}**\n\n`;
        
        if (result.isBomb) {
            description += `💣 **BOMB!** (${result.bombType})\n`;
            description += `⚠️ **Danger!** Avoid this space!`;
        } else {
            description += `✅ **Safe!**\n`;
            description += `Type: ${result.type}\n`;
            if (result.content) {
                description += `Content: ${result.content.nameEn || result.content.name}`;
            }
        }

        return new EmbedBuilder()
            .setColor(result.isBomb ? '#F44336' : '#4CAF50')
            .setTitle('👁️ Peek Result')
            .setDescription(description);
    }

    // Update grid embed to show wager pot
    static updateGridEmbedWithWager(embed, wagerPot) {
        if (wagerPot > 0) {
            const currentDescription = embed.data.description || '';
            const wagerText = `\n💰 **WAGER POT: $${wagerPot.toLocaleString()}**\n`;
            embed.setDescription(currentDescription + wagerText);
        }
        return embed;
    }

    // ==================
    // NEW EVENT EMBEDS
    // ==================

    /**
     * Minigames For All embed
     */
    static createMinigamesForAllEmbed(results) {
        let description = '**Minigames For All**!\n';
        description += 'All alive players receive a minigame!\n\n';

        results.forEach(r => {
            description += `🎮 **${r.username}** receives **${r.minigame}**!\n`;
        });

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🎮 Minigames For All!')
            .setDescription(description);
    }

    /**
     * Bowser Event Roulette Wheel
     */
    static createBowserRouletteEmbed(bowserState, spinIndex) {
        let description = '**Bowser\'s Roulette Wheel**\n\n';
        description += '```\n';

        bowserState.wheel.forEach((event, index) => {
            if (index === spinIndex) {
                description += '> ';
            } else {
                description += '  ';
            }
            description += event + '\n';
        });

        description += '```';

        return new EmbedBuilder()
            .setColor('#FF6F00')
            .setTitle('🐢 B-B-B-BOWSER!!')
            .setDescription(description)
            .setFooter({ text: 'Spinning the wheel...' });
    }

    /**
     * Bowser Event Result
     */
    static createBowserResultEmbed(result) {
        let color = '#FF6F00';
        let description = '';

        switch (result.type) {
            case 'cash_for_bowser':
                description = `**Cash for Bowser!**\n\n`;
                description += `${result.player} gives **$${result.amount.toLocaleString()}** to Bowser!\n`;
                description += `Wah, hah, hah, HAH!`;
                break;

            case 'bowser_potluck':
                description = `**Bowser's Cash Potluck!**\n\n`;
                description += `Every player pays **$${result.amount.toLocaleString()}**!\n`;
                description += `Bowser collects **$${result.totalTaken.toLocaleString()}** total!\n`;
                description += `Wah, hah, hah, HAH!`;
                break;

            case 'bowser_revolution':
                color = '#4CAF50';
                description = `**Bowser Revolution!**\n\n`;
                description += `All round earnings divided evenly!\n`;
                description += `Everyone gets **$${result.share.toLocaleString()}**!\n`;
                description += `"Why can't we all be friends?"`;
                break;

            case 'blammo_frenzy':
                color = '#F44336';
                description = `**Bowser's Multiplying Blammos!**\n\n`;
                description += `Bowser converted **${result.converted}** cash spaces to BLAMMOs!\n`;
                description += `Good luck! Gwah, hah, hah!`;
                break;

            case 'bowser_minigame':
                description = `**Bowser's Minigame!**\n\n`;
                description += `${result.player} receives **${result.minigame}**!\n`;
                description += `You'd better not lose this minigame, HAH!`;
                break;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle('🐢 Bowser Event Result')
            .setDescription(description);
    }

    /**
     * Blammo Summoned embed
     */
    static createBlammoSummonedEmbed(summonerName) {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('💣 BLAMMO SUMMONED!')
            .setDescription(`**${summonerName}** summoned a BLAMMO for the next player!\n\n⚠️ The next square revealed will be a BOMB!`);
    }

    /**
     * Event announcement embed (generic)
     */
    static createEventAnnouncementEmbed(eventName, emoji, description) {
        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle(`${emoji} ${eventName}`)
            .setDescription(description);
    }

    // ============================================================================
    // EVENT RESULT EMBEDS - RtaB Season 6
    // ============================================================================

    /**
     * Create rich embed for any event result
     */
    static createEventResultEmbed(eventId, result, player) {
        const eventConfig = rtabConfig.events.find(e => e.id === eventId);
        if (!eventConfig) {
            return new EmbedBuilder()
                .setColor('#9C27B0')
                .setDescription(result);
        }

        const rarityColors = {
            'common': '#4CAF50',
            'uncommon': '#2196F3',
            'rare': '#9C27B0',
            'epic': '#FF9800',
            'seasonal': '#F44336'
        };

        const color = rarityColors[eventConfig.rarity] || '#9C27B0';

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`✨ ${eventConfig.nameEn}`)
            .setDescription(result)
            .addFields(
                { name: '🎯 Rarity', value: eventConfig.rarity.toUpperCase(), inline: true },
                { name: '👤 Player', value: player.username, inline: true }
            )
            .setTimestamp();
    }

    /**
     * Boost Charger event embed
     */
    static createBoostChargerEmbed(player, boost, duration, totalBoost) {
        return new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('⚡ Boost Charger!')
            .setDescription(`**${player.username}** charged up their multiplier!`)
            .addFields(
                { name: '📈 Boost Gained', value: `+${boost}%`, inline: true },
                { name: '⏱️ Duration', value: `${duration} turns`, inline: true },
                { name: '🔋 Total Boost', value: `${totalBoost}%`, inline: true }
            )
            .setFooter({ text: 'Common Event' })
            .setTimestamp();
    }

    /**
     * Quad Damage / One Shot Booster embed
     */
    static createQuadDamageEmbed(player, multiplier) {
        return new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('💥 ONE SHOT BOOSTER!')
            .setDescription(`**${player.username}**'s next pick is worth **${multiplier}×** the amount!`)
            .setFooter({ text: 'Common Event • Use it wisely!' })
            .setTimestamp();
    }

    /**
     * Peek Replenish event embed
     */
    static createPeekReplenishEmbed(peeksGranted) {
        return new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('👁️ Peek Replenish!')
            .setDescription(`All players gained **${peeksGranted} peeks**!`)
            .setFooter({ text: 'Uncommon Event' })
            .setTimestamp();
    }

    /**
     * Joker event embed
     */
    static createJokerEmbed(richest, poorest, amount) {
        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🃏 Joker!')
            .setDescription(`Money redistribution time!`)
            .addFields(
                { name: '💸 From', value: richest.username, inline: true },
                { name: '💰 To', value: poorest.username, inline: true },
                { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: 'Uncommon Event • Robin Hood style!' })
            .setTimestamp();
    }

    /**
     * Boost Magnet embed
     */
    static createBoostMagnetEmbed(player, totalBoost, newTotal) {
        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🧲 Boost Magnet!')
            .setDescription(`**${player.username}** stole all boosts from other players!`)
            .addFields(
                { name: '🧲 Stolen', value: `${totalBoost}%`, inline: true },
                { name: '🔋 New Total', value: `${newTotal}%`, inline: true }
            )
            .setFooter({ text: 'Rare Event' })
            .setTimestamp();
    }

    /**
     * Minefield event embed
     */
    static createMinefieldEmbed(bombsPlaced) {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('💣 MINEFIELD!')
            .setDescription(`**${bombsPlaced} bombs** have been added to the board!`)
            .setFooter({ text: 'Rare Event • Watch your step!' })
            .setTimestamp();
    }

    /**
     * Lockdown event embed
     */
    static createLockdownEmbed(bombsPlaced) {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('🔒 LOCKDOWN!')
            .setDescription(`**${bombsPlaced} lockdown bombs** have been placed on the board!`)
            .setFooter({ text: 'Rare Event • These bombs cannot be defused!' })
            .setTimestamp();
    }

    /**
     * Final Countdown embed
     */
    static createFinalCountdownEmbed(turnsRemaining) {
        return new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('⏰ FINAL COUNTDOWN!')
            .setDescription(`The round will end in **${turnsRemaining} turns**!`)
            .setFooter({ text: 'Rare Event • Make your moves count!' })
            .setTimestamp();
    }

    /**
     * Super Joker embed
     */
    static createSuperJokerEmbed(playerCount, shareAmount) {
        return new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('🌟 SUPER JOKER!')
            .setDescription(`All money has been redistributed evenly among ${playerCount} players!`)
            .addFields(
                { name: '💰 Share Per Player', value: `$${shareAmount.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: 'Epic Event • Everyone starts equal!' })
            .setTimestamp();
    }

    /**
     * Starman embed
     */
    static createStarmanEmbed(player, duration) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ STARMAN!')
            .setDescription(`**${player.username}** is **INVINCIBLE** for ${duration} turns!`)
            .setFooter({ text: 'Epic Event • Nothing can hurt them!' })
            .setTimestamp();
    }

    /**
     * Jackpot embed
     */
    static createJackpotEmbed(player, amount) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎰 JACKPOT!')
            .setDescription(`**${player.username}** hit the JACKPOT!`)
            .addFields(
                { name: '💰 Prize', value: `$${amount.toLocaleString()}`, inline: false }
            )
            .setFooter({ text: 'Epic Event • MEGA WIN!' })
            .setTimestamp();
    }

    /**
     * Lucky Space embed
     */
    static createLuckySpaceEmbed(converted) {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('🍀 Lucky Space!')
            .setDescription(`**${converted} spaces** have been converted to cash!`)
            .setFooter({ text: 'Seasonal Event • Everything is money!' })
            .setTimestamp();
    }

    /**
     * Revival Chance embed
     */
    static createRevivalEmbed(revivedPlayer) {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('💫 Revival Chance!')
            .setDescription(`**${revivedPlayer.username}** has been revived!`)
            .addFields(
                { name: '💰 Starting Cash', value: '$1,000,000', inline: true }
            )
            .setFooter({ text: 'Seasonal Event • Second chance!' })
            .setTimestamp();
    }

    /**
     * Reverse Order embed
     */
    static createReverseEmbed() {
        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle('🔄 Reverse!')
            .setDescription('The turn order has been **reversed**!')
            .setFooter({ text: 'Seasonal Event' })
            .setTimestamp();
    }

    /**
     * Cursed Bomb Event embed
     */
    static createCursedBombEventEmbed(bombsPlaced) {
        return new EmbedBuilder()
            .setColor('#6A0DAD')
            .setTitle('😈 Cursed Bombs!')
            .setDescription(`Bowser placed **${bombsPlaced} cursed bombs** on the board!`)
            .setFooter({ text: 'Seasonal Event • Extra dangerous!' })
            .setTimestamp();
    }

    // ============================================================================
    // BOMB RESULT EMBEDS
    // ============================================================================

    /**
     * Generic bomb hit embed
     */
    static createBombHitEmbed(player, bombType, damage) {
        const bombEmojis = {
            'normal': '💣',
            'chain': '🔗',
            'lockdown': '🔒',
            'surprise': '🎁',
            'payback': '💸',
            'mimic': '👤',
            'bowser': '🐢',
            'doubloon': '🪙',
            'cursed': '😈',
            'dud': '🧨',
            'blammo': '💥',
            'wager': '🎲',
            'superblammo': '🌟'
        };

        const emoji = bombEmojis[bombType.toLowerCase()] || '💣';

        return new EmbedBuilder()
            .setColor('#F44336')
            .setTitle(`${emoji} ${bombType} Bomb Hit!`)
            .setDescription(`**${player.username}** hit a **${bombType}** bomb!`)
            .addFields(
                { name: '💥 Damage', value: damage > 0 ? `-$${damage.toLocaleString()}` : 'Special Effect', inline: true },
                { name: '💰 Remaining', value: `$${player.money.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
    }

    /**
     * Chain Reaction embed
     */
    static createChainReactionEmbed(totalBombs, totalDamage) {
        return new EmbedBuilder()
            .setColor('#FF5722')
            .setTitle('🔗 CHAIN REACTION!')
            .setDescription(`Multiple bombs detonated in a chain!`)
            .addFields(
                { name: '💣 Bombs', value: `${totalBombs}`, inline: true },
                { name: '💥 Total Damage', value: `-$${totalDamage.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
    }

    /**
     * Protection activated embed
     */
    static createProtectionEmbed(player, protectionType) {
        const protectionEmojis = {
            'starman': '⭐',
            'failsafe': '🛡️',
            'repellent': '🚫',
            'minesweeper': '🔍'
        };

        const emoji = protectionEmojis[protectionType] || '🛡️';

        return new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle(`${emoji} Protection Activated!`)
            .setDescription(`**${player.username}**'s **${protectionType}** blocked the bomb!`)
            .setTimestamp();
    }

    // ============================================================================
    // COMMAND USAGE EMBEDS
    // ============================================================================

    /**
     * Command used embed
     */
    static createCommandUsedEmbed(player, commandName, result) {
        const commandEmojis = {
            'fold': '🃏',
            'blammo': '💥',
            'shuffler': '🔀',
            'wagerer': '🎲',
            'bonusbag': '💰',
            'eyeoftruth': '👁️',
            'failsafe': '🛡️',
            'minesweeper': '🔍',
            'repellent': '🚫',
            'peeker': '👀',
            'double': '2️⃣'
        };

        const emoji = commandEmojis[commandName.toLowerCase()] || '🎮';

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle(`${emoji} ${commandName.toUpperCase()} Command Used!`)
            .setDescription(`**${player.username}** used **${commandName}**!\n\n${result}`)
            .setTimestamp();
    }

    /**
     * Command granted embed
     */
    static createCommandGrantedEmbed(player, commandName) {
        return new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('🎁 Hidden Command Granted!')
            .setDescription(`**${player.username}** received: **${commandName.toUpperCase()}**`)
            .setTimestamp();
    }

    // ============================================================================
    // GAME STATE EMBEDS
    // ============================================================================

    /**
     * Player status embed
     */
    static createPlayerStatusEmbed(player) {
        const statusFields = [
            { name: '💰 Money', value: `$${player.money.toLocaleString()}`, inline: true },
            { name: '🔋 Boost', value: `${player.booster}%`, inline: true },
            { name: '👁️ Peeks', value: `${player.peeks || 0}`, inline: true }
        ];

        if (player.hiddenCommands && player.hiddenCommands.length > 0) {
            statusFields.push({
                name: '🎮 Commands',
                value: player.hiddenCommands.map(c => c.name.toUpperCase()).join(', '),
                inline: false
            });
        }

        const activeEffects = [];
        if (player.activeEffects) {
            if (player.activeEffects.starman) activeEffects.push(`⭐ Starman (${player.activeEffects.starman} turns)`);
            if (player.activeEffects.quadDamage) activeEffects.push(`💥 ${player.activeEffects.quadDamage}× multiplier`);
            if (player.activeEffects.doubleDeal) activeEffects.push(`🎴 Double Deal active`);
        }

        if (activeEffects.length > 0) {
            statusFields.push({
                name: '✨ Active Effects',
                value: activeEffects.join('\n'),
                inline: false
            });
        }

        return new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle(`📊 ${player.username}'s Status`)
            .addFields(statusFields)
            .setTimestamp();
    }

    /**
     * Round summary embed
     */
    static createRoundSummaryEmbed(roundNumber, alivePlayers) {
        const playerList = alivePlayers
            .sort((a, b) => b.money - a.money)
            .map((p, i) => `${i + 1}. **${p.username}** - $${p.money.toLocaleString()}`)
            .join('\n');

        return new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle(`🏁 Round ${roundNumber} Summary`)
            .setDescription(playerList)
            .setFooter({ text: 'Keep racing to a billion!' })
            .setTimestamp();
    }

    /**
     * Event animation - suspenseful countdown
     */
    static createEventAnimationEmbed(eventName, stage = 1) {
        const stages = [
            { emoji: '⏳', text: 'Something is happening...' },
            { emoji: '✨', text: 'Event incoming...' },
            { emoji: '🎯', text: `**${eventName}**` }
        ];

        const currentStage = stages[stage - 1] || stages[0];

        return new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle(`${currentStage.emoji} ${currentStage.text}`)
            .setDescription(stage < 3 ? '*Stand by...*' : `Event: **${eventName}**`)
            .setTimestamp();
    }

    /**
     * Game end summary with detailed stats
     */
    static createGameEndSummaryEmbed(game, winner) {
        const allPlayers = game.players.sort((a, b) => {
            if (a.isEliminated && !b.isEliminated) return 1;
            if (!a.isEliminated && b.isEliminated) return -1;
            return b.money - a.money;
        });

        const rankings = allPlayers.map((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const status = p.isEliminated ? '💥' : '✅';
            const stats = [
                `$${this.formatMoney(p.money)}`,
                `Streak: ${p.streak || 0}`,
                `Bombs: ${p.bombsHit || 0}`
            ];
            return `${medal} ${status} **${p.username}**\n   ${stats.join(' • ')}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('🏆 Game Complete!')
            .setDescription(`**Winner: ${winner.username}**\n\n${rankings}`)
            .addFields(
                { name: '💰 Total Money', value: `$${this.formatMoney(winner.money)}`, inline: true },
                { name: '🎮 Duration', value: this.formatDuration(game.startTime), inline: true },
                { name: '🔢 Squares Revealed', value: game.revealedSquares.size.toString(), inline: true }
            )
            .setFooter({ text: 'Thanks for playing Race To A Billion!' })
            .setTimestamp();

        return embed;
    }

    /**
     * Loading/animation embed for suspense
     */
    static createLoadingEmbed(message, color = '#FF9800') {
        return new EmbedBuilder()
            .setColor(color)
            .setDescription(`⏳ ${message}`)
            .setTimestamp();
    }

    /**
     * Helper: Format money
     */
    static formatMoney(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'K';
        }
        return amount.toLocaleString();
    }

    /**
     * Helper: Format duration
     */
    static formatDuration(startTime) {
        const duration = Date.now() - startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * ==================== RTAB6 PORT: ENHANCED UI ====================
     */

    /**
     * Create Tournament Lobby Embed
     */
    static createTournamentLobbyEmbed(tournament) {
        const leaderboard = tournament.getLeaderboard(5);
        
        let leaderboardText = '';
        if (leaderboard.length > 0) {
            leaderboard.forEach((player, index) => {
                leaderboardText += `${index + 1}. **${player.username}** - $${player.money.toLocaleString()} (${player.rank})\n`;
            });
        } else {
            leaderboardText = '*No participants yet*';
        }

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Minigame Tournament')
            .setDescription(
                `**Status:** ${tournament.status}\n` +
                `**Round:** ${tournament.round}\n` +
                `**Minigames:** ${tournament.minigameList.length}\n` +
                `**Enhancements:** ${tournament.enhancements} per round\n\n` +
                `**Top Players:**\n${leaderboardText}\n\n` +
                `**Ranks:**\n` +
                `🥉 Bronze: $50,000+\n` +
                `🥈 Silver: $100,000+\n` +
                `🥇 Gold: $250,000+\n` +
                `💎 Platinum: $500,000+\n` +
                `💠 Diamond: $1,000,000+`
            )
            .setFooter({ text: 'Click Ready to play your tournament round!' });
    }

    /**
     * Create Challenge Progress Embed
     */
    static createChallengeEmbed(challenge) {
        const progress = `Round ${Math.floor(challenge.gamesRun / challenge.totalGames * 100)}%`;
        const playersRemaining = challenge.playerList.length;

        return new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('⚔️ Super Bot Challenge')
            .setDescription(
                `**Campaign Progress:** ${challenge.gamesRun}/${challenge.totalGames} games\n` +
                `**Players Remaining:** ${playersRemaining}\n` +
                `**Current Multiplier:** ${challenge.gameHandler?.baseNumerator || 1}x\n\n` +
                `**How it works:**\n` +
                `• Elimination tournament format\n` +
                `• Bottom half eliminated each round\n` +
                `• Multipliers increase as players fall\n` +
                `• Last bot standing wins!\n\n` +
                `Type \`!challenge\` to find your next game!`
            )
            .setFooter({ text: 'Survive to the end!' });
    }

    /**
     * Create Player Level Embed
     */
    static createLevelEmbed(playerData) {
        const xpNeeded = playerData.requiredXP - playerData.playerXP;
        const champXPNeeded = playerData.requiredChampXP - playerData.champXP;
        const progress = Math.floor((playerData.playerXP / playerData.requiredXP) * 100);

        return new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`📊 ${playerData.username}'s Progress`)
            .addFields(
                {
                    name: '🎮 Player Level',
                    value: `**Level ${playerData.playerLevel}**\n` +
                           `XP: ${playerData.playerXP.toLocaleString()}/${playerData.requiredXP.toLocaleString()}\n` +
                           `Progress: ${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))} ${progress}%`,
                    inline: false
                },
                {
                    name: '👑 Champion Level',
                    value: `**Level ${playerData.champLevel}**\n` +
                           `XP: ${playerData.champXP.toLocaleString()}/${playerData.requiredChampXP.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🏆 Achievement Level',
                    value: `**Level ${playerData.achievementLevel}**`,
                    inline: true
                }
            )
            .setFooter({ text: 'Keep playing to level up!' });
    }

    /**
     * Create Bounty Announcement Embed
     */
    static createBountyEmbed(bountyData) {
        let description = '**🎯 Bounties Assigned!**\n\n';
        
        for (const [userId, data] of Object.entries(bountyData)) {
            description += `💰 **${data.username}**: $${data.bountyValue.toLocaleString()}\n`;
        }
        
        description += `\n*Eliminate bountied players to claim their reward!*`;

        return new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('💰 Bounty Hunter')
            .setDescription(description)
            .setFooter({ text: 'The hunt is on!' });
    }

    /**
     * Create Minigame Result Embed
     */
    static createMinigameResultEmbed(minigameResult) {
        const color = minigameResult.winnings > 0 ? '#00FF00' : minigameResult.winnings < 0 ? '#FF0000' : '#FFFF00';
        const emoji = minigameResult.winnings > 0 ? '✅' : minigameResult.winnings < 0 ? '❌' : '⚖️';

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Minigame Result`)
            .setDescription(minigameResult.result)
            .addFields(
                {
                    name: 'Winnings',
                    value: `$${Math.abs(minigameResult.winnings).toLocaleString()}`,
                    inline: true
                }
            );
    }

    /**
     * Create Event Result Embed
     */
    static createEventEmbed(eventName, description, color = '#9C27B0') {
        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`✨ ${eventName}`)
            .setDescription(description);
    }

    /**
     * Create Weather Change Embed
     */
    static createWeatherEmbed(weather) {
        const weatherInfo = {
            CLEAR: { emoji: '☀️', description: 'Normal conditions', color: '#FFD700' },
            BONUS: { emoji: '🌟', description: '1.5x money from all sources!', color: '#00FF00' },
            DROUGHT: { emoji: '🌵', description: '0.5x money from all sources', color: '#FF8C00' },
            STORM: { emoji: '⛈️', description: 'Random bomb reveals!', color: '#4B0082' },
            BLIZZARD: { emoji: '❄️', description: 'Skip next turn!', color: '#87CEEB' }
        };

        const info = weatherInfo[weather] || weatherInfo.CLEAR;

        return new EmbedBuilder()
            .setColor(info.color)
            .setTitle(`${info.emoji} Weather Change!`)
            .setDescription(`**${weather}**\n${info.description}`)
            .setFooter({ text: 'Weather affects all players' });
    }

    /**
     * Create Game Stats Embed
     */
    static createGameStatsEmbed(game, winner) {
        const stats = game.getPlayerStats(winner);
        const duration = this.formatDuration(game.gameStartTime);

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 Victory - ${winner.username}`)
            .addFields(
                {
                    name: '💰 Final Money',
                    value: `$${stats.finalMoney.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🔥 Winstreak',
                    value: `${stats.winstreak} wins`,
                    inline: true
                },
                {
                    name: '⏱️ Duration',
                    value: duration,
                    inline: true
                },
                {
                    name: '📊 Statistics',
                    value: `Picks: ${stats.totalPicks}\n` +
                           `Bombs Hit: ${stats.bombsHit}\n` +
                           `Minigames: ${stats.minigamesPlayed}\n` +
                           `Commands Used: ${stats.commandsUsed}`,
                    inline: false
                },
                {
                    name: '🎯 Rewards',
                    value: `XP Gained: ${stats.xpGained}\n` +
                           `Bounty Earned: $${stats.bountyEarned.toLocaleString()}\n` +
                           `Jackpot Won: $${stats.jackpotWon.toLocaleString()}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Congratulations!' });
    }

}

module.exports = RTABUI;
