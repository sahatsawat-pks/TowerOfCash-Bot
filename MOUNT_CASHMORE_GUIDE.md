# Mount Ca$hmore - Game Guide

## Overview

Mount Ca$hmore is a pyramid-climbing spin-off game where players must navigate through 9 levels to reach the summit and claim the jackpot!

## Game Modes

### 🎯 Normal Mode

- **Jackpot:** $200,000,000
- **Lives:** 3
- **Skulls:** 1 per level (Levels 1-8)
- **Fatal Traps:** Fewer fatal traps

### 💰 Big Bank Mode

- **Jackpot:** 50% of player's Big Bank
- **Lives:** 3
- **Skulls:** 2 fewer skulls (removed from levels 3 and 5)
- **Fatal Traps:** 2 additional fatal traps (replacing removed skulls)
- **Risk/Reward:** Higher risk but potential for bigger payout
- **Level 9 Rule:** Both paths (Zipline) or (Climb) lead to LOSE EVERYTHING on Game Over!

## Level Structure

### Pyramid Levels

- **Level 1:** 10 squares
- **Level 2:** 9 squares
- **Level 3:** 8 squares
- **Level 4:** 7 squares
- **Level 5:** 6 squares
- **Level 6:** 5 squares
- **Level 7:** 4 squares
- **Level 8:** 3 squares

### Level 9 Special

On the final level, you must choose your path to the summit:

#### 🎪 Zipline Mode (2 squares)

- Find **Clear**: Win the **JACKPOT** + all your money!
- Find **Game Over**: Keep your current winnings (Normal Mode) or lose all (Big Bank).

#### ⚠️ Climb by Hand (5 squares)

- Find **Clear**: Win **10x JACKPOT** + all your money!
- Find **Game Over**: **LOSE EVERYTHING** and end game.
- Find **Tower of Cra$h**: Leaderboard Reset + Lose Everything.
- Find **Snow Storm**: A blizzard — you escape with **half your money**; the remainder is added to the Big Bank.

## Square Types

### Basic Squares

- **💵 Cash:** Add money to your total (values multiplied by 10x)
- **✅ Clear:** Advance to the next level
- **💀 Skull:** Lose one life (1 per level on Levels 1-8)

### Special Squares

#### 🔍 Skull Seeker (Levels 1-3)

- Guess where the skull is hiding
- **Jackpot:** Starts at $50,000, increases by $5,000 each time not won
- **Reward:** Win jackpot + immunity from skull this level
- **Risk:** None if wrong, just jackpot increases

#### 💥 Ca$h Crash (Levels 2-6)

- Reset your total money to $0
- Keep your lives and continue playing

#### 🎰 Gambler's Luck (Random levels)

- Choose one of 3 panels:
  - **Panel 1:** +10% to +90% of current money
  - **Panel 2:** -10% to -90% of current money
  - **Panel 3:** Random bounty ($1,000 - $50,000)

#### 🧮 Gatorade® Decimalizer (Level 4)

- Toss a coin to determine the outcome
- **Heads:** Multiply money by 1.1x - 2.0x
- **Tails:** Divide money by same amount
- **Skip:** No change

#### 🤝 Host's Deal (Level 5)

- Host offers you money to quit now
- **Formula:** Current Money × (0.6 + Level × 0.05)
- **Accept:** Take the money and end game
- **Reject:** Continue climbing

#### ⚰️ Fatal Trap (Levels 1-8)

- **Instant Game Over** - lose all money
- More common in Big Bank Mode

## Lives System

### Starting Lives

- All players start with **3 lives**

### Losing Lives

- Hit a **Skull** square (unless you have immunity)

### Game Over

- When all 3 lives are lost, receive the **Game Over Pot**

## Game Over Pot

If you lose all lives, you receive a percentage of your total money based on the level you reached:

| Level | Game Over Pot |
| ----- | ------------- |
| 1-3   | 0%            |
| 4     | 5%            |
| 5     | 10%           |
| 6     | 25%           |
| 7     | 50%           |
| 8     | 75%           |
| 9     | 100%          |

## Cash Out Feature

### When Can You Cash Out?

- **Levels 3-7 ONLY**
- **AFTER** finding the Clear square on that level
- Cannot cash out during Level 1, 2, 8, or 9

### How to Cash Out

1. Find the Clear square on levels 3-7
2. Choose between:
   - **Continue:** Advance to next level
   - **Cash Out:** Take your money and end game

## Money Multiplier

All money values in Mount Ca$hmore are multiplied by **10x** compared to regular Tower of Cash:

- Cash squares: $10,000 - $100,000+
- Jackpot: $200,000,000 (Normal Mode)
- Skull Seeker: $50,000 starting jackpot

## How to Play

### Starting the Game

1. Use command: `/mount-cashmore`
2. Choose your game mode:
   - 🎯 **Normal Mode**
   - 💰 **Big Bank Mode** (requires Big Bank balance)

### During the Game

1. View the current level pyramid
2. Click a numbered button to reveal that square
3. React to special squares when they appear
4. Decide whether to cash out or continue (if eligible)
5. Advance to the next level when you find Clear

### Winning the Game

- Reach **Level 9**
- Find the **Clear** square (50% chance)
- Win your accumulated money + jackpot bonus!

## Strategy Tips

### General Strategy

1. **Early Levels (1-3):** Focus on finding Clear quickly
2. **Mid Levels (4-6):** Consider cash out options carefully
3. **Late Levels (7-9):** High risk, high reward - evaluate your lives

### Special Square Tips

- **Skull Seeker:** Low risk, high reward - always worth trying
- **Ca$h Crash:** Can appear early, so don't accumulate too much before Level 7
- **Gambler's Luck:** Panel 3 (bounty) is safest if you have high money
- **Decimalizer:** Pure 50/50 coin flip - skip if you have high money and are risk-averse
- **Host's Deal:** Compare offer to (remaining levels × average cash value)
- **Fatal Trap:** More common in Big Bank - be extra cautious

### Mode Selection

- **Normal Mode:** Safer, consistent jackpot
- **Big Bank Mode:** High risk/high reward
  - Best when Big Bank is very large (>$1B)
  - More Fatal Traps but fewer Skulls
  - Consider your risk tolerance

## Commands

- `/mount-cashmore` - Start a new Mount Ca$hmore game

## Game Statistics

### Completion Rates (Estimated)

- **Reach Level 5:** ~40%
- **Reach Level 7:** ~20%
- **Reach Level 9:** ~5%
- **Win Level 9:** ~2.5%

### Risk Assessment

- **Low Risk:** Levels 1-3
- **Medium Risk:** Levels 4-6
- **High Risk:** Levels 7-8
- **Very High Risk:** Level 9 (50% chance)

---

## Technical Details

### Files

- `MountCashmore.js` - Game logic and mechanics
- `index.js` - Command handlers and button interactions
- Integration with existing Tower of Cash database

### Features Implemented

- ✅ Mode selection (Normal/Big Bank)
- ✅ 9-level pyramid structure
- ✅ Lives system
- ✅ Game Over Pot
- ✅ All 6 special squares
- ✅ Cash out system
- ✅ Level 9 special mechanic
- ✅ Money saving to database
- ✅ Complete UI with embeds and buttons

### Button IDs

- `mount_cashmore_mode_normal` - Select Normal Mode
- `mount_cashmore_mode_bigbank` - Select Big Bank Mode
- `mount_cashmore_square_{0-9}` - Select a square
- `mount_cashmore_advance` - Continue to next level
- `mount_cashmore_cashout_confirm` - Confirm cash out
- `mount_cashmore_cashout_cancel` - Cancel cash out
- `mount_cashmore_skull_{0-9}` - Skull Seeker guess
- `mount_cashmore_gamblers_{1-3}` - Gambler's Luck panel
- `mount_cashmore_decimalizer_answer` - Answer trivia
- `mount_cashmore_decimalizer_skip` - Skip trivia
- `mount_cashmore_deal_accept` - Accept Host's Deal
- `mount_cashmore_deal_reject` - Reject Host's Deal

---

**Good luck climbing Mount Ca$hmore!** 🏔️💰
