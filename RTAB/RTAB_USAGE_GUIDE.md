# RtaB Mechanics Usage Guide

This guide shows how to integrate the new RtaB Season 6 mechanics (Market, Wager, Peek) into your Discord bot handlers.

## Table of Contents
1. [Market Event Handling](#market-event-handling)
2. [Wager Command Handling](#wager-command-handling)
3. [Peek Command Handling](#peek-command-handling)
4. [Button Interaction Handlers](#button-interaction-handlers)

---

## Market Event Handling

### Triggering the Market

The market automatically triggers when a player lands on a market event space. The event is handled in the `applyEvent` method:

```javascript
// In RTABGame.js - applyEvent method
case 'market':
    return this.startMarket(player);
```

### Display Market UI

After the market starts, show the market embed and buttons:

```javascript
async function handleMarketOpen(interaction, game) {
    const embed = RTABUI.createMarketEmbed(game);
    const buttons = RTABUI.createMarketButtons(game);
    
    await interaction.channel.send({
        content: `<@${game.marketState.player.userId}>`,
        embeds: [embed],
        components: buttons
    });
}
```

---

## Market Button Handlers

Add these button handlers to your interaction handler:

```javascript
// In your button interaction handler
if (customId.startsWith('rtab_market_')) {
    await handleMarketAction(interaction);
}

async function handleMarketAction(interaction) {
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
    
    // If market still open (player can buy more), show updated market
    if (game.marketState) {
        setTimeout(async () => {
            const embed = RTABUI.createMarketEmbed(game);
            const buttons = RTABUI.createMarketButtons(game);
            
            await interaction.channel.send({
                embeds: [embed],
                components: buttons
            });
        }, 2000);
    } else {
        // Market closed, continue game
        setTimeout(async () => {
            await interaction.channel.send({
                embeds: [RTABUI.createGridEmbed(game)],
                components: RTABUI.createGridButtons(game)
            });
        }, 2000);
    }
}
```

---

## Individual Market Actions

### Buy Boost Example

```javascript
case 'BUY_BOOST':
    const result = game.resolveMarketPurchase('BUY_BOOST');
    if (result.success) {
        // Player now has increased boost
        console.log(`New boost: ${game.marketState.player.booster}%`);
    }
    break;
```

### Sell Peek Example

```javascript
case 'SELL_PEEK':
    const result = game.resolveMarketPurchase('SELL_PEEK');
    if (result.success) {
        // Player gained money, lost a peek
        console.log(`Peeks remaining: ${game.marketState.player.peeks}`);
    }
    break;
```

### Market Robbery Example

```javascript
case 'ROB_ROCK':
case 'ROB_PAPER':
case 'ROB_SCISSORS':
    const result = game.resolveMarketPurchase(action);
    
    if (result.robbery.success) {
        // Player won! Got rewards
        await interaction.channel.send({
            content: `🎉 ${game.marketState.player.username} successfully robbed the market!`,
            embeds: [RTABUI.createMarketResultEmbed(result)]
        });
    } else {
        // Player arrested, lost $250,000
        await interaction.channel.send({
            content: `👮 ${game.marketState.player.username} was arrested!`,
            embeds: [RTABUI.createMarketResultEmbed(result)]
        });
    }
    break;
```

---

## Wager Command Handling

### Slash Command Definition

```javascript
// In your slash command setup
{
    name: 'wager',
    description: 'Start a wager in the current RTAB game',
    options: [
        {
            name: 'amount',
            description: 'Amount to wager (default: $250,000)',
            type: ApplicationCommandOptionType.Integer,
            required: false
        }
    ]
}
```

### Wager Command Handler

```javascript
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
    
    const amount = interaction.options.getInteger('amount') || 250000;
    
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
    setTimeout(async () => {
        await interaction.channel.send({
            embeds: [RTABUI.createGridEmbed(game)],
            components: RTABUI.createGridButtons(game)
        });
    }, 2000);
}
```

### Award Wager at Game End

```javascript
// When game ends and there's a winner
if (game.gameEnded) {
    const wagerResult = game.awardWagerPot();
    
    if (wagerResult) {
        await interaction.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💰 Wager Pot Awarded!')
                .setDescription(
                    `**Total Pot:** $${RTABUI.formatMoney(wagerResult.pot)}\n\n` +
                    `**Winners:**\n` +
                    wagerResult.winners.map(w => `• ${w}: $${RTABUI.formatMoney(wagerResult.share)}`).join('\n')
                )
            ]
        });
    }
}
```

---

## Peek Command Handling

### Slash Command Definition

```javascript
{
    name: 'peek',
    description: 'Use a peek to see what\'s in a square',
    options: [
        {
            name: 'square',
            description: 'Square number to peek at (1-25)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1,
            max_value: 25
        }
    ]
}
```

### Peek Command Handler

```javascript
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
    
    const squareNum = interaction.options.getInteger('square');
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
```

---

## Button Handlers Summary

Add these to your main button interaction handler:

```javascript
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId } = interaction;
    
    // Existing handlers...
    if (customId.startsWith('rtab_square_')) {
        await handleRTABSquareClick(interaction);
    }
    // NEW: Market handlers
    else if (customId.startsWith('rtab_market_')) {
        await handleMarketAction(interaction);
    }
    // Existing minigame handlers...
    else if (customId.startsWith('rtab_mg_')) {
        await handleRTABMinigameAction(interaction);
    }
});
```

---

## Complete Integration Example

Here's how it all works together:

```javascript
// 1. Player lands on market square
const result = game.revealSquare(playerId, squareIndex);

if (result.type === 'event' && result.content.effect === 'market') {
    // 2. Market opens automatically
    const embed = RTABUI.createMarketEmbed(game);
    const buttons = RTABUI.createMarketButtons(game);
    
    await channel.send({
        content: `<@${player.userId}> entered the RtaB Market!`,
        embeds: [embed],
        components: buttons
    });
}

// 3. Player clicks a market button
// -> handleMarketAction processes it
// -> Shows result
// -> Either reopens market or continues game

// 4. Player uses /wager command during their turn
// -> Deducts money from all players
// -> Adds to wager pot
// -> Shows on game board

// 5. Player uses /peek command
// -> Shows them what's in a square (ephemeral)
// -> Decrements peek count
// -> Can make informed decision

// 6. Game ends
// -> Award wager pot to winners
// -> Show final standings
```

---

## Tips for Implementation

### 1. **Timeout Handling**
```javascript
// Give players 90 seconds at market
const marketTimeout = setTimeout(() => {
    if (game.marketState) {
        game.resolveMarketPurchase('LEAVE');
        channel.send('⏰ Market timeout! Moving on...');
    }
}, 90000);
```

### 2. **Validation**
```javascript
// Always check if player can afford purchases
if (player.money < cost) {
    return interaction.reply({ 
        content: '❌ Insufficient funds!', 
        ephemeral: true 
    });
}
```

### 3. **State Management**
```javascript
// Clean up market state when done
if (!game.marketState) {
    // Market closed, clear any timers
    clearTimeout(marketTimeout);
}
```

### 4. **Bot Behavior**
```javascript
// Bots should make simple choices
if (player.isBot && game.marketState) {
    const choices = game.marketState.validOptions.filter(
        opt => !opt.startsWith('BUY_') && !opt.startsWith('SELL_')
    );
    const choice = choices[Math.floor(Math.random() * choices.length)];
    game.resolveMarketPurchase(choice);
}
```

---

## Error Handling

```javascript
try {
    const result = game.resolveMarketPurchase(action);
    
    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.message}`,
            ephemeral: true
        });
        return;
    }
    
    // Success path...
    
} catch (error) {
    console.error('Market error:', error);
    await interaction.reply({
        content: '❌ An error occurred at the market!',
        ephemeral: true
    });
}
```

---

## Testing Checklist

- [ ] Market opens when landing on market square
- [ ] All buy/sell buttons work correctly
- [ ] Rock-Paper-Scissors robbery functions properly
- [ ] Wager command deducts from all players
- [ ] Wager pot displays on board
- [ ] Peek reveals correct information (ephemeral)
- [ ] Boost multipliers apply to prizes
- [ ] Market can be used multiple times in one visit
- [ ] Market closes properly on leave/robbery
- [ ] Bot players can interact with market
- [ ] Timeouts work correctly
- [ ] Money/item changes save correctly

---

## Example Game Flow

```
1. Player A picks square 5
2. "It's the RtaB Market! 🏪"
3. Market embed shows with buttons
4. Player A clicks "Buy Boost"
5. "Bought +50% Boost for $500,000!"
6. Market reopens with updated options
7. Player A clicks "Rob with Rock"
8. "Your ROCK beats shopkeeper's SCISSORS!"
9. "Robbery successful! Got $1M, +150% boost, 1 peek, 1 minigame"
10. Market closes, game continues
11. Player B types /wager
12. "Everyone bets $250,000! Wager pot: $1,000,000"
13. Player C types /peek square:15
14. (Shows them privately: "💣 BOMB! Avoid this space!")
15. Player C picks a different square
16. Game continues...
```

---

*These mechanics add significant depth to the TowerOfCash RTAB game mode!*
