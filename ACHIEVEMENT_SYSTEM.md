# Tower of Cash - Achievement System

## Overview
Complete achievement system for Tower of Cash game based on RtaB Achievement.java structure, using bitflags for efficient storage (32 achievements per category max).

## Achievement Categories

### 1. MILESTONE (🏆 Gold) - 20 Achievements
Achievements for game progression milestones:

**Money Milestones:**
- **First Victory** - Win your first game
- **Millionaire** - Earn $1,000,000 in a single game
- **Multi-Millionaire** - Earn $5,000,000 in a single game
- **Mega Rich** - Earn $10,000,000 in a single game
- **Ultra Rich** - Earn $100,000,000 in a single game
- **Billionaire** - Earn $1,000,000,000 in a single game
- **Mega Billionaire** - Earn $10,000,000,000 in a single game
- **Ultra Billionaire** - Earn $100,000,000,000 in a single game
- **Trillionaire** - Earn $1,000,000,000,000 in a single game
- **Mega Trillionaire** 🚀 - Reach $10,000,000,000,000 in Season 1 mode!

**Floor Milestones:**
- **Halfway There** - Complete 10 floors in a single game
- **Tower Climber** - Complete 20 floors in a single game
- **Skyscraper Conqueror** - Complete 30 floors in a single game
- **Cloud Breaker** - Complete 40 floors in a single game
- **Heaven Reacher** - Complete 50 floors in a single game

**Skill & Dedication:**
- **Perfect Floor** - Complete a floor with 3 correct choices in a row
- **Flawless Climber** - Complete 5 floors with perfect choices
- **Veteran Player** - Play 100 games
- **Dedicated Player** - Play 500 games
- **Legendary Player** - Play 1000 games

### 2. EVENT (🎉 Pink) - 16 Achievements
Achievements for special in-game events:

**Mart-Of-Cash Events:**
- **Successful Heist** - Successfully rob Mart-Of-Cash
- **Caught Red-Handed** - Get busted while robbing Mart-Of-Cash
- **Big Spender** - Spend over $1,000,000 at Mart-Of-Cash in one visit
- **Shopping Spree** - Buy 5 different items at Mart-Of-Cash in one visit
- **Unlucky Pick** - Pick the Skull space in Mart-Of-Cash robbery
- **Money Bag Snatcher** - Pick Money Bag (💰) space in Mart-Of-Cash robbery
- **Bank Heist** - Pick Money Bank (🏦) space and win Mart-Of-Cash robbery

**Special Events:**
- **Basement Survivor** - Win the Basement minigame negotiation
- **Mystery Box Master** - Get a legendary item from Mystery Box
- **Big Bank Jackpot** - Win the Big Bank from a Mystery Box
- **Peek Master** - Use 3 peeks in a single game
- **All-Seeing Eye** - Use 5 peeks in a single game
- **X Survivor** - Survive an X-Level with X-Protection
- **Close Call** - Survive X-Level with less than $100,000 remaining
- **Lucky Percentage** - Get 150% from Random Percentage
- **Minigame Marathon** - Play 5 different minigames in one game

### 3. MINIGAME (🎮 Blue) - 17 Achievements
Hard-to-achieve minigame accomplishments:

**Babushka Bonanza:**
- **Babushka Master** - Win $10,000,000 in Babushka Bonanza
- **Risk Taker** - Open 10 dolls with 2 strikes in Babushka
- **Babushka Perfectionist** - Complete Babushka with 0 strikes and 10+ dolls opened

**Hideout Breakthrough:**
- **Hideout Jackpot** - Win the $1,000,000 jackpot in Hideout Breakthrough
- **Number 12** - Pick number 12 on the first pick in Hideout Breakthrough
- **Lucky Guesser** - Win Hideout Breakthrough on first 6 picks without fail

**Door Escape:**
- **Treasure Hunter** - Find the Treasure Escape door in Door Escape
- **Fatal Choice** - Pick the Fatal Trap door in Door Escape
- **Door Escape Master** - Complete 5 rounds in Door Escape
- **Endless Escape** - Complete 10 rounds in Door Escape
- **Untouchable** - Complete 5+ rounds in Door Escape with 100% health

**Six Zeroes:**
- **Six Zeroes Champion** - Find all 6 zeros in Six Zeroes minigame
- **Golden Ticket** - Find the Golden Ticket in Six Zeroes
- **Zero Noodles** - Complete Six Zeroes without picking any instant noodles

**Community Chest:**
- **Community Jackpot** - Win over $5,000,000 in Community Chest
- **Community Mega Jackpot** - Win over $10,000,000 in Community Chest

**Basement:**
- **Master Negotiator** - Win Basement with over 90% of original money kept

### 4. GAME_OVER (💀 Red) - 11 Achievements
Special game over conditions:

**Minigame Deaths:**
- **What Happened?** - Get game over from buying What? at Mart-Of-Cash
- **Three Strikes** - Strike out in Babushka Bonanza
- **No Escape** - Die from health reaching 0% in Door Escape
- **Instant Regret** - Get instant noodles without money in Six Zeroes
- **Commercial Break** - Run out of time during Commercial Break minigame

**Combat Deaths:**
- **Crossed Out** - Get eliminated by X-Level
- **Instant Elimination** - Hit X-Level on your first pick of the floor
- **Permanent Resident** - Fail to escape the Basement

**Financial Deaths:**
- **Completely Broke** - End a game with exactly $0
- **Quick Exit** - Get game over on the first floor
- **Cursed Box** - Lose over 50% of money from a Mystery Box item

## Commands

### `/achievements [user]`
View your or another player's earned achievements
- Shows all unlocked achievements grouped by category
- Displays progress percentage (X/Y achievements)
- Optional: View another player's achievements

### `/achievement-list [category]`
Browse all available achievements
- No category: Shows overview of all categories with counts
- With category: Shows detailed list of achievements in that category
  - Categories: `milestone`, `event`, `minigame`, `game-over`
  - ✅ = Earned, 🔒 = Locked

## Implementation Details

### Storage Format
- CSV files stored in `/achievements/` directory
- Format: `playerID#username#milestone#event#minigame#gameover`
- Each category uses integer bitflags (32 achievements max per category)
- Efficient storage: 1 bit per achievement

### Achievement Flow
1. Game event occurs (e.g., win game, rob mart, complete minigame)
2. `towerAchievements.awardAchievement()` called with achievement ID
3. System checks if player already has achievement
4. If new: Flips the bit, saves record, sends notification
5. Notification appears in game channel with emoji and description

### Integration Points
Achievement checks are integrated at:
- Game completion (milestone achievements)
- Mart-Of-Cash robbery results (event achievements)
- Basement minigame results (event + game over achievements)
- Minigame completions (minigame achievements)
- Special game over scenarios (game over achievements)

## Files Modified

### New Files:
1. **TowerAchievements.js** - Core achievement system
   - `TowerAchievements` class with all methods
   - `ACHIEVEMENTS` object with all achievement definitions
   - `AchievementType` enum for categories

### Modified Files:
1. **index.js**
   - Added achievement system import
   - Added command handlers for `/achievements` and `/achievement-list`
   - Integrated achievement checks at key game moments
   - Added commands to command array

2. **gameUI.js**
   - Added `createAchievementsListEmbed()` for player achievements
   - Added `createAchievementsCategoryEmbed()` for category views

3. **events/MartOfCash.js**
   - Changed `randomPercentage.buyLimit` from `null` to `1`
   - Nothing remains unlimited (buyLimit: null)

## Purchase Limits Summary
- **Peek**: 1 time ($325,000)
- **Minigame**: 1 time ($350,000)
- **Mystery Box**: 2 times ($200,000 each)
- **X-Protection**: 1 time ($500,000)
- **Random %**: 1 time (50% of money)
- **What?**: 10 times ($100,000 each)
- **Six Zeroes**: 1 time ($500,000)
- **Nothing**: Unlimited ($10,000)

## Future Expansion
- Each category can hold up to 32 achievements (bitflags)
- Current usage: 
  - **MILESTONE**: 20/32 achievements (12 slots remaining)
  - **EVENT**: 16/32 achievements (16 slots remaining)
  - **MINIGAME**: 17/32 achievements (15 slots remaining)
  - **GAME_OVER**: 11/32 achievements (21 slots remaining)
- **Total achievements: 64** (up from 32!)
- Room for future expansion in all categories!

## Testing
All files pass syntax validation:
```bash
node -c TowerAchievements.js && node -c gameUI.js && node -c events/MartOfCash.js && node -c index.js
```

## Notes
- Achievement system uses same architecture as RtaB for consistency
- Achievements persist across seasons/resets
- No achievement points system (could be added later)
- Notifications appear inline during gameplay
