# RtaB Season 6 Mechanics Implemented in TowerOfCash Bot

## Overview
This document describes the Race to a Billion (RtaB) Season 6 game mechanics that have been successfully implemented in the TowerOfCash bot based on the RtaB6 Java codebase.

## Implemented Features

### 1. **RtaB Market Event** 🏪

The RtaB Market is a special event space where players can buy and sell various items to enhance their gameplay.

#### Market Options Available:

**Buying:**
- **Buy Boost** - Purchase boost percentage to increase earnings (Cost: $10,000 per %)
- **Buy Game** - Purchase a random minigame (Cost: $240,240)
- **Buy Peek** - Purchase 1 peek to see a hidden square (Cost: $1,000,000)
- **Buy Command** - Purchase a random hidden command like Wager (Cost: $100,000)
- **Buy Info** - Get list of remaining space types on board (Cost: $100,000)

**Selling:**
- **Sell Boost** - Sell boost percentage for cash (Reward: $10,000 per %)
- **Sell Game** - Sell all minigames at 75% of purchase price
- **Sell Peek** - Sell peek for cash (Reward: $250,000)

#### Market Robbery (Rock-Paper-Scissors) 🎮

Players can attempt to rob the market instead of purchasing:
- Choose Rock 🪨, Paper 📄, or Scissors ✂️
- Shopkeeper has a weapon and backup weapon
- **Success**: Win big rewards (money, boost, peek, minigame)
- **Failure**: Arrested with $250,000 penalty

**Robbery Rewards on Success:**
- $1,000,000 cash
- +150% boost
- 1 peek
- 1 random minigame

---

### 2. **Wager System** 💰

Based on the RtaB hidden command system, players can start wagers during the game.

#### How Wagers Work:
1. A player uses the wager command
2. All alive players bet a fixed amount (default: $250,000)
3. Money goes into the **Wager Pot**
4. Wager pot is displayed on the game board
5. Winners at the end of the round split the pot

#### Implementation Details:
- `startWager(playerId, amount)` - Initiates wager
- `awardWagerPot()` - Distributes pot to winners at game end
- Wager pot visible on game UI
- Default wager amount: $250,000

---

### 3. **Peek System** 👁️

Players can peek at hidden squares before revealing them.

#### Peek Features:
- **Buy peeks** from the RtaB Market
- **Sell peeks** back to the market
- **Use peek** on any unrevealed square
- Reveals if square contains:
  - Bomb (with bomb type)
  - Prize/Cash
  - Event
  - Item
  - Minigame

#### Player Properties:
- `peeks` - Number of peek items available
- `peekTurns` - Temporary peek ability from items (3 turns)

#### Implementation:
- `usePeek(playerId, squareIndex)` - Use a peek on a square
- Returns full information about the square
- Peek count decrements after use

---

### 4. **Boost System** 📈

Enhanced boost mechanics similar to RtaB Season 6.

#### Boost Properties:
- `booster` - Base boost percentage (100 = 200% = x2 multiplier)
- Can be increased by:
  - Buying boost at market
  - Finding boost items
  - Robbery success
- Can be decreased by:
  - Selling boost at market

#### How Boost Works:
- Every cash prize is multiplied by boost percentage
- Example: 150% boost means prizes are 2.5x
- Boost persists throughout the game
- Strategic: High boost = high risk, high reward

---

### 5. **Player State Extensions**

New player properties added:

```javascript
{
    peeks: 0,           // Number of peek items
    booster: 100,       // Boost percentage (100 = x2)
    minigames: []       // Owned minigames
}
```

### 6. **Game State Extensions**

New game properties added:

```javascript
{
    wagerPot: 0,        // Current wager pot
    marketState: null   // Active market state
}
```

---

## UI Updates

### Grid Display Enhancements
- Shows boost percentage next to player names `[150%🔥]`
- Shows peek count `👁️2`
- Shows wager pot at top of grid `💰 WAGER POT: $500,000`

### Market UI
- **Market Embed** - Shows all available options with prices
- **Market Buttons** - Interactive buttons for each option
- **Robbery Buttons** - Three buttons for Rock, Paper, Scissors
- **Result Embeds** - Shows purchase/sale results

### Wager UI
- **Wager Announcement** - Special embed when wager starts
- **Pot Display** - Always visible on game board when active

### Peek UI
- **Peek Result** - Shows what was peeked with appropriate colors
- Red for bombs, green for safe spaces

---

## Configuration Updates

### rtab_config.json Changes

Added RtaB Market event to the events pool:

```json
{
    "id": "rtab_market",
    "name": "RtaB Market",
    "nameEn": "RtaB Market",
    "emoji": "🏪",
    "effect": "market",
    "weight": 5,
    "rarity": "uncommon"
}
```

---

## Technical Implementation

### Files Modified:

1. **RTABGame.js**
   - Added market methods (startMarket, resolveMarketPurchase, resolveMarketRobbery)
   - Added wager methods (startWager, awardWagerPot)
   - Added peek method (usePeek)
   - Extended player and game state
   - Updated applyEvent to handle market

2. **rtabUI.js**
   - Added createMarketEmbed
   - Added createMarketButtons
   - Added createMarketResultEmbed
   - Added createWagerEmbed
   - Added createPeekResultEmbed
   - Updated createGridEmbed to show boost and peek counts
   - Updated createGridEmbed to show wager pot

3. **rtab_config.json**
   - Added RtaB Market event definition

---

## Game Flow Example

```
1. Player lands on RtaB Market event space
2. Market opens with available options
3. Player can:
   - Buy/sell items
   - Attempt robbery (Rock-Paper-Scissors)
   - Leave market
4. After purchase, can buy more or leave
5. Robbery ends market immediately (win or lose)
6. Game continues with enhanced items/boost
```

## Example Market Scenario

```
BOTIN8R selects space 5...
It's the RtaB Market! 🏪

Available Wares:
🔼 BUY BOOST - +50% Boost (Cost: $500,000)
🔽 SELL BOOST - $300,000 (Cost: 30% Boost)
🎮 BUY GAME - Random Minigame (Cost: $240,240)
👁️ BUY PEEK - 1 Peek (Cost: $1,000,000)
💰 SELL PEEK - $250,000 (Cost: 1 Peek)
⚡ BUY COMMAND - Random Hidden Command (Cost: $100,000)
📊 BUY INFO - List of Remaining Spaces (Cost: $100,000)

Rob the Market - Choose your weapon:
🪨 ROB ROCK
📄 ROB PAPER
✂️ ROB SCISSORS

🚪 LEAVE

💰 Current Cash: $5,000,000
📈 Boost: 100%
👁️ Peeks: 0
```

---

## Benefits of These Mechanics

1. **Strategic Depth** - Players must decide when to invest vs save money
2. **Risk vs Reward** - Market robbery offers huge rewards but big penalty on failure
3. **Information Warfare** - Peek and info purchases provide strategic advantage
4. **Economic Management** - Boost buying/selling creates interesting trade-offs
5. **Excitement** - Wagers add tension and bigger stakes to the game
6. **Player Agency** - More choices and control over game progression

---

## Future Enhancements

Potential additions based on full RtaB Season 6:

- [ ] Chaos Options at Market (25% chance)
- [ ] Multiple hidden commands (Defuse, Bonus, etc.)
- [ ] Life system with penalties
- [ ] Tribal mode support
- [ ] More complex bomb types
- [ ] Event chains and special spaces
- [ ] Achievement system
- [ ] Player statistics tracking

---

## Testing Checklist

- [x] Market opens on market event space
- [x] All buy/sell options functional
- [x] Rock-Paper-Scissors robbery logic works
- [x] Wager system deducts from all players
- [x] Wager pot displays on board
- [x] Peek reveals correct information
- [x] Boost multipliers apply to prizes
- [x] UI displays all new information
- [x] Config properly loads market event

---

## Credits

Based on the **RtaB Season 6** Java implementation from the [RtaB6 repository](https://github.com/StrangeStudio/RtaB6).

Special mechanics ported:
- Market.java event space
- WagerCommand.java hidden command
- Peek and boost systems
- Player inventory management

---

*This implementation brings the core RtaB Season 6 market and wager mechanics to Discord.js in a format compatible with the TowerOfCash bot architecture.*
