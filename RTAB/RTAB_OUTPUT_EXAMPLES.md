# RtaB Market Example Output

This document shows the exact output format for the RtaB Market mechanics, matching the original RtaB Season 6 style.

## Example Game Session

```
BOTIN8R joined the game.
So Dark joined the game.
So_BRN +ระเบิดเถิดเทิง joined the game.
Starting game...
Let's go!

     RtaB     
01 02 03 04 05
06 07 08 09 10
11 12 13 14 15
16 17 18 19 20
21 22 23 24 25


> BOTIN8R                +$0 [200%P] 👁️0
  So Dark                +$0 [100%P] 👁️0
  So_BRN +ระเบิดเถิดเทิง +$0 [100%P] 👁️0

BOTIN8R started a wager!
Everyone bets $250,000 as a wager on the game!

💰 WAGER POT: $750,000

(BOTIN8R peeks at space 5)
BOTIN8R selects space 5...
It's the RtaB Market! 🏪

BOTIN8R, you have ninety seconds to make a selection!
Feel free to browse, but try not to carouse!

Available Wares:
🔼 BUY BOOST - +50% Boost (Cost: $320,000)
🔽 SELL BOOST - $400,000 (Cost: 40% Boost)
🎮 BUY GAME - Random Minigame (Cost: $240,240)
👁️ BUY PEEK - 1 Peek (Cost: $1,000,000)
⚡ BUY COMMAND - Random Hidden Command (Cost: $100,000)
📊 BUY INFO - List of Remaining Spaces (Cost: $100,000)

Rob the Market - Choose your weapon:
🪨 ROB ROCK
📄 ROB PAPER
✂️ ROB SCISSORS

🚪 LEAVE

💰 Current Cash: $1,500,000
📈 Boost: 200%
👁️ Peeks: 0

(BOTIN8R clicks "Rob with Rock")

You confidently stride up to the shopkeeper with your trusty rock,
intent on stealing as much as you can...

They grab a rock to fight back with, 
but at the sight of your obviously-superior rock they flee in terror. Success!

The shopkeeper dealt with, you make off with the following...
💰 +$1,000,000
🔥 +150% Boost
👁️ +1 Peek
🎮 Coin Flip

BOTIN8R robbed the market successfully!

     RtaB     
01 02 03 04 🏪
06 07 08 09 10
11 12 13 14 15
16 17 18 19 20
21 22 23 24 25

💰 WAGER POT: $750,000

> BOTIN8R                +$2,500,000 [350%🔥] 👁️1 📦1
  So Dark                -$250,000 [100%P] 👁️0
  So_BRN +ระเบิดเถิดเทิง -$250,000 [100%P] 👁️0

So Dark's turn...
```

## Market Purchase Example

```
So Dark selects space 12...
It's the RtaB Market! 🏪

So Dark, you have ninety seconds to make a selection!

Available Wares:
🔼 BUY BOOST - +30% Boost (Cost: $240,000)
🎮 BUY GAME - Random Minigame (Cost: $240,240)
👁️ BUY PEEK - 1 Peek (Cost: $1,000,000)
📊 BUY INFO - List of Remaining Spaces (Cost: $100,000)

Rob the Market - Choose your weapon:
🪨 ROB ROCK
📄 ROB PAPER
✂️ ROB SCISSORS

🚪 LEAVE

💰 Current Cash: $500,000
📈 Boost: 100%
👁️ Peeks: 0

(So Dark clicks "Buy Boost")

Boost bought!
Bought +30% Boost for $240,000!

(Market reopens)

Available Wares:
🎮 BUY GAME - Random Minigame (Cost: $240,240)
📊 BUY INFO - List of Remaining Spaces (Cost: $100,000)

🚪 LEAVE

💰 Current Cash: $260,000
📈 Boost: 130%
👁️ Peeks: 0

(So Dark clicks "Leave")

Alright, see you next time.
```

## Market Robbery Failure Example

```
So_BRN selects space 18...
It's the RtaB Market! 🏪

(So_BRN clicks "Rob with Scissors")

You confidently stride up to the shopkeeper with your trusty scissors,
intent on stealing as much as you can...

...but they grab a rock from the ground and quickly destroy your scissors. Whoops!

So_BRN was arrested. $250,000 fine.

💀 So_BRN eliminated!

     RtaB     
01 02 03 04 🏪
06 07 08 09 10
11 12 🏪 14 15
16 17 🏪 19 20
21 22 23 24 25

💀 Eliminated:
   ~~So_BRN +ระเบิดเถิดเทิง~~ - $0

> BOTIN8R                +$2,500,000 [350%🔥] 👁️1 📦1
  So Dark                +$260,000 [130%P] 👁️0
```

## Info Purchase Example

```
BOTIN8R types: /peek square:7

(Private message to BOTIN8R)
👁️ Peek Result
Peeked at Space 7

💣 BOMB! (Normal Bomb)
⚠️ Danger! Avoid this space!

(Public message)
👁️ BOTIN8R used a peek! (0 remaining)
```

## Buy Info Example

```
(Player buys info at market)

Information coming your way!
Bought Info for $100,000!

(Private message to player)
Remaining spaces:

CASH: $10,000 | $50,000 | $100,000 | $500,000 | $1,000,000
BOOST: +100% | +200%
EVENT: Swap Money | Reset to 1M | RtaB Market
MINIGAME: Coin Flip | High/Low
BOMB: 💣 | 💣 | 💣

Total remaining: 17 spaces
```

## Wager Usage Example

```
(During BOTIN8R's turn)
BOTIN8R types: /wager amount:500000

💰 WAGER STARTED!

BOTIN8R started a wager!
Everyone bets $500,000 as a wager on the game!

Wager Amount: $500,000
Total Pot: $1,500,000

Winners take all at the end!

     RtaB     
01 02 03 04 🏪
06 07 💰 09 10
11 12 🏪 14 15
16 17 🏪 19 20
21 22 23 24 25

💰 WAGER POT: $1,500,000

> BOTIN8R                +$2,000,000 [350%🔥] 👁️1 📦1
  So Dark                -$240,000 [130%P] 👁️0
  Bot 1                  -$500,000 [100%P] 👁️0
```

## Game End with Wager

```
BOTIN8R selects space 20...
It's $10,000,000!

With 350% boost: +$35,000,000!

All spaces revealed!

🎉 BOTIN8R WINS! 🎉

Final Standings:
1st: BOTIN8R - $37,000,000
2nd: So Dark - $5,260,000
3rd: Bot 1 - $0 (Eliminated)

💰 Wager Pot Awarded!

Total Pot: $1,500,000

Winners:
• BOTIN8R: $750,000
• So Dark: $750,000

Final Winnings:
🏆 BOTIN8R: $37,750,000
🥈 So Dark: $6,010,000
💀 Bot 1: -$500,000
```

## Market Tie Example (Backup Weapon)

```
Player selects space 9...
It's the RtaB Market!

(Player clicks "Rob with Paper")

You confidently stride up to the shopkeeper with your trusty paper,
intent on stealing as much as you can...

...and find them carrying some paper of their own. A tie?!

At an impasse, they reach down but find only a rock on the ground. Got'em!

The shopkeeper dealt with, you make off with the following...
💰 +$1,000,000
🔥 +150% Boost
👁️ +1 Peek
🎮 High/Low

Player robbed the market successfully!
```

## Market Tie + Backup Failure Example

```
(Player clicks "Rob with Rock")

You confidently stride up to the shopkeeper with your trusty rock,
intent on stealing as much as you can...

...and find them carrying a rock of their own. A tie?!

They then reach into a drawer and pull out a sheet of paper... *oh no*.

Player was arrested. $250,000 fine.
```

## Sell Options Example

```
(Player has 200% boost and 2 peeks)

Available Wares:
🔽 SELL BOOST - $600,000 (Cost: 60% Boost)
💰 SELL PEEK - $250,000 (Cost: 1 Peek)
🎮 BUY GAME - Random Minigame (Cost: $240,240)

(Player clicks "Sell Boost")
Boost sold!
Sold 60% Boost for $600,000!

💰 Current Cash: $1,100,000
📈 Boost: 140%
👁️ Peeks: 2

(Player clicks "Sell Peek")
Peek sold!
Sold 1 Peek for $250,000!

💰 Current Cash: $1,350,000
📈 Boost: 140%
👁️ Peeks: 1
```

## Discord Embed Format

The UI is shown using Discord embeds with this structure:

```
╔══════════════════════════════════╗
║   🏪 RtaB Market                 ║
╠══════════════════════════════════╣
║ Welcome to the RtaB Market!      ║
║ Feel free to browse, but try     ║
║ not to carouse!                  ║
║                                  ║
║ Available Wares:                 ║
║ 🔼 BUY BOOST - +50% (Cost: $320k)║
║ 🔽 SELL BOOST - $400k (Cost: 40%)║
║ 🎮 BUY GAME - Minigame ($240k)   ║
║ 👁️ BUY PEEK - 1 Peek ($1M)       ║
║ ⚡ BUY COMMAND - Command ($100k)  ║
║ 📊 BUY INFO - Space List ($100k) ║
║                                  ║
║ Rob the Market:                  ║
║ 🪨 ROB ROCK                      ║
║ 📄 ROB PAPER                     ║
║ ✂️ ROB SCISSORS                  ║
║                                  ║
║ 🚪 LEAVE                         ║
║                                  ║
║ 💰 Current Cash: $1,500,000      ║
║ 📈 Boost: 200%                   ║
║ 👁️ Peeks: 0                      ║
╚══════════════════════════════════╝

[🔼 Buy Boost] [🔽 Sell Boost] [🎮 Buy Game] [💸 Sell Game]
[👁️ Buy Peek] [💰 Sell Peek] [⚡ Buy Command] [📊 Buy Info]
[🪨 Rob Rock] [📄 Rob Paper] [✂️ Rob Scissors]
[🚪 Leave Market]
```

---

## Key Output Elements

1. **Grid Display**
   - Numbers for unrevealed spaces (01-25)
   - Emojis for revealed spaces (🏪, 💰, 💣, etc.)
   - Wager pot shown at top when active

2. **Player Status**
   - Arrow (>) indicates current turn
   - Money with +/- prefix
   - [Boost%🔥] shows boost percentage
   - 👁️X shows peek count
   - 📦X shows item count

3. **Market Messages**
   - Welcome message with time limit
   - Item lists with costs/rewards
   - Purchase confirmations
   - Robbery narratives with suspense
   - Updated stats after each action

4. **Color Coding**
   - Purple (#9C27B0) for market
   - Gold (#FFD700) for wager
   - Green (#4CAF50) for success
   - Red (#F44336) for failure/danger

---

This output format creates an engaging, game-show-like experience that matches the original RtaB Season 6 style!
