# HMIE & Mount Ca$hmore Achievements

## Overview
Added 10 new achievements for HMIE and Mount Ca$hmore games.

## HMIE Achievements (bitLocations 20-23)

### 🏆 HMIE_WINNER (bitLocation 20)
- **Name:** "How Much Is Enough?"
- **Description:** "Win an HMIE game"
- **Award Condition:** Win the face-off round
- **Type:** MINIGAME

### 🎯 HMIE_PERFECT_LOCK (bitLocation 21)
- **Name:** "Perfect Timing"
- **Description:** "Lock in at exactly $1,000,000 in HMIE"
- **Award Condition:** Lock in with exactly $1,000,000 and win
- **Type:** MINIGAME

### 💎 HMIE_HIGH_ROLLER (bitLocation 22)
- **Name:** "High Roller"
- **Description:** "Lock in over $5,000,000 in HMIE"
- **Award Condition:** Lock in with $5M+ and win
- **Type:** MINIGAME

### 🥉 HMIE_UNDERDOG (bitLocation 23)
- **Name:** "Underdog Victory"
- **Description:** "Win HMIE with the lowest lock-in amount"
- **Award Condition:** Win face-off with lowest banked money among all non-bot players (requires 2+ players)
- **Type:** MINIGAME

## Mount Ca$hmore Achievements (bitLocations 24-29)

### 🏔️ MOUNT_CASHMORE_SUMMIT (bitLocation 24)
- **Name:** "Summit Conqueror"
- **Description:** "Reach the summit of Mount Ca$hmore (Level 9)"
- **Award Condition:** Complete Level 9
- **Type:** MINIGAME

### 💰 MOUNT_CASHMORE_JACKPOT (bitLocation 25)
- **Name:** "Jackpot Winner"
- **Description:** "Win the jackpot at Mount Ca$hmore summit"
- **Award Condition:** Win the game at Level 9 (awarded with Summit achievement)
- **Type:** MINIGAME

### 🔍 MOUNT_CASHMORE_SKULL_SEEKER (bitLocation 26)
- **Name:** "Skull Seeker Champion"
- **Description:** "Win Skull Seeker jackpot in Mount Ca$hmore"
- **Award Condition:** Correctly guess skull position in Skull Seeker minigame
- **Type:** MINIGAME

### 🍀 MOUNT_CASHMORE_LUCKY (bitLocation 27)
- **Name:** "Lucky Climber"
- **Description:** "Reach Level 7 without losing a life"
- **Award Condition:** Win the game at Level 7+ with all 3 lives remaining
- **Type:** MINIGAME

### 🏦 MOUNT_CASHMORE_BIG_BANK (bitLocation 28)
- **Name:** "Big Bank Climber"
- **Description:** "Complete Mount Ca$hmore in Big Bank mode"
- **Award Condition:** Win in Big Bank mode (50% of Big Bank jackpot)
- **Type:** MINIGAME

### 💵 MOUNT_CASHMORE_CASH_OUT (bitLocation 29)
- **Name:** "Strategic Exit"
- **Description:** "Cash out with over $50,000,000"
- **Award Condition:** Cash out (not at summit) with $50M+ total winnings
- **Type:** MINIGAME

## Implementation Details

### Files Modified
1. **TowerAchievements.js**
   - Added 10 new achievement definitions (lines 497-543)
   - Used bitLocations 20-29 in MINIGAME category

2. **index.js**
   - HMIE achievements: Added in face-off winner handler (around line 3809)
   - Mount Cashmore achievements: Added in `handleMountCashmoreGameEnd()` (around line 8575)
   - Skull Seeker achievement: Added in `handleMountCashmoreSkullSeeker()` (around line 8473)

### Achievement Award Locations

#### HMIE (index.js)
- **Location:** Button interaction handler for `hmie_face_off_stop`
- **Function:** Face-off winner processing section
- **Line:** ~3809

#### Mount Ca$hmore (index.js)
- **Location 1:** `handleMountCashmoreGameEnd()` function
- **Function:** Game completion handler
- **Line:** ~8575
- **Awards:** Summit, Jackpot, Lucky Climber, Big Bank, Strategic Exit

- **Location 2:** `handleMountCashmoreSkullSeeker()` function
- **Function:** Skull Seeker result handler
- **Line:** ~8473
- **Awards:** Skull Seeker Champion

## Available Slots Remaining
- MILESTONE: 21-31 (11 slots available)
- EVENT: 18-31 (14 slots available)
- MINIGAME: 30-31 (2 slots available)
- GAME_OVER: 12-31 (20 slots available)

## Testing Recommendations
1. **HMIE Winner:** Play HMIE and win face-off
2. **HMIE Perfect Lock:** Lock in at exactly $1M in HMIE
3. **HMIE High Roller:** Lock in at $5M+ in HMIE
4. **HMIE Underdog:** Win with lowest lock-in amount (2+ players)
5. **Summit/Jackpot:** Reach Level 9 in Mount Ca$hmore
6. **Skull Seeker:** Win Skull Seeker minigame
7. **Lucky Climber:** Reach Level 7+ without losing lives
8. **Big Bank:** Complete in Big Bank mode
9. **Strategic Exit:** Cash out with $50M+
