# Achievement System Integration Guide

## Automatic Achievement Checking

The achievement system now includes **automatic checking** and **game state tracking** to unlock achievements without manual checks.

## How It Works

### 1. Game State Tracking
Every game now has an `achievementTracking` object that monitors:
- Consecutive correct picks
- Perfect floors completed
- Peeks used
- Minigames played
- Mart-Of-Cash purchases
- Minigame-specific stats
- Game over conditions

### 2. Achievement Helper
Use `AchievementHelper` to update tracking during gameplay:

```javascript
const AchievementHelper = require('./achievementHelper');

// Track a correct pick
AchievementHelper.trackCorrectPick(game);

// Track peek usage
AchievementHelper.trackPeekUsed(game);

// Track minigame
AchievementHelper.trackMinigamePlayed(game, 'babushka');

// Track Mart purchase
AchievementHelper.trackMartPurchase(game, 'Peek', 50000);
```

### 3. Automatic Checker
Call `checkAndAwardAchievements()` at key moments:

```javascript
const { TowerAchievements } = require('./TowerAchievements');
const towerAchievements = new TowerAchievements();

// After completing a floor
await towerAchievements.checkAndAwardAchievements(game, interaction, 'floor_complete');

// After a minigame ends
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

// At game end
await towerAchievements.checkAndAwardAchievements(game, interaction, 'game_end');

// At game over
await towerAchievements.checkAndAwardAchievements(game, interaction, 'game_over');
```

## Integration Points

### Floor Selection/Completion
```javascript
// In handlePlayChoice (after player makes a choice)
// Track if pick was correct
if (chosenAmount.value > 0 || chosenAmount.type === 'percentage') {
  AchievementHelper.trackCorrectPick(game);
} else {
  AchievementHelper.trackIncorrectPick(game);
}

// When moving to next floor
AchievementHelper.resetFloorTracking(game);

// After floor completes
await towerAchievements.checkAndAwardAchievements(game, interaction, 'floor_complete');
```

### Peek Usage
```javascript
// When player uses Peek from Mart
AchievementHelper.trackPeekUsed(game);
await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');
```

### Mart-Of-Cash
```javascript
// After each purchase
AchievementHelper.trackMartPurchase(game, itemName, cost);
await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');
```

### Babushka Minigame
```javascript
// At end of Babushka
AchievementHelper.trackBabushka(game, totalWinnings, strikes, dollsOpened);
AchievementHelper.trackMinigamePlayed(game, 'babushka');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

// Game over by strike out
if (strikes === 3) {
  await towerAchievements.awardAchievement('BABUSHKA_STRIKE_OUT', ...);
}
```

### Hideout Breakthrough
```javascript
// At end of Hideout
const jackpotWon = /* check if won $1M */;
const firstPickWas12 = /* check if first pick was 12 */;
AchievementHelper.trackHideout(game, jackpotWon, firstPickWas12, failedPicks);
AchievementHelper.trackMinigamePlayed(game, 'hideout');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');
```

### Door Escape
```javascript
// At end of Door Escape
AchievementHelper.trackDoorEscape(game, rounds, treasureFound, fatalPicked, healthLost);
AchievementHelper.trackMinigamePlayed(game, 'door_escape');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

// Game over by death
if (health <= 0) {
  await towerAchievements.awardAchievement('DOOR_ESCAPE_DEATH', ...);
}
```

### Six Zeroes
```javascript
// At end of Six Zeroes
AchievementHelper.trackSixZeroes(game, zerosFound, goldenTicket, noodlesPicked);
AchievementHelper.trackMinigamePlayed(game, 'six_zeroes');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');

// Game over by instant noodles
if (gotNoodlesWithNoMoney) {
  await towerAchievements.awardAchievement('INSTANT_NOODLES', ...);
}
```

### Community Chest
```javascript
// At end of Community Chest
AchievementHelper.trackCommunityChest(game, totalWinnings);
AchievementHelper.trackMinigamePlayed(game, 'community_chest');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');
```

### Basement
```javascript
// At end of Basement
AchievementHelper.trackBasement(game, escaped, moneyKept, moneyLost);
AchievementHelper.trackMinigamePlayed(game, 'basement');
await towerAchievements.checkAndAwardAchievements(game, interaction, 'minigame_end');
```

### Mystery Box
```javascript
// When opening Mystery Box
const isLegendary = /* check if legendary item */;
const isBigBank = /* check if Big Bank */;
const moneyLost = /* calculate if lost money */;
AchievementHelper.trackMysteryBox(game, isLegendary, isBigBank, moneyLost);
await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');
```

### Random %
```javascript
// After Random % resolves
const percentage = /* the percentage rolled */;
AchievementHelper.trackRandomPercent(game, percentage);
await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');
```

### X-Level
```javascript
// When surviving X-Level with protection
AchievementHelper.trackXLevelSurvival(game);
await towerAchievements.checkAndAwardAchievements(game, interaction, 'check');

// Game over by X-Level
if (hitXLevel) {
  AchievementHelper.trackGameOver(game, 'x_level', game.floorsCompleted);
  await towerAchievements.awardAchievement('X_LEVEL_DEATH', ...);
  await towerAchievements.checkAndAwardAchievements(game, interaction, 'game_over');
}
```

### Game Completion
```javascript
// At cashout/game end
await towerAchievements.checkAndAwardAchievements(game, interaction, 'game_end');

// Existing manual checks still work
if (game.totalMoney >= 1000000) {
  await towerAchievements.awardAchievement('MILLIONAIRE', ...);
}
```

## Event Types

- `'check'` - General check, use anytime
- `'floor_complete'` - After completing a floor
- `'minigame_end'` - After minigame concludes
- `'game_end'` - At successful game completion
- `'game_over'` - At game over

## Debugging

Check tracking status:
```javascript
const summary = AchievementHelper.getTrackingSummary(game);
console.log(summary);
```

## Benefits

1. **Automatic** - No need to manually check each achievement
2. **Comprehensive** - Checks all applicable achievements at once
3. **Efficient** - Only awards if not already earned
4. **Validated** - All awards go through validation system
5. **Logged** - All awards automatically logged to archive

## What's Still Manual

Some achievements still require manual calls because they happen at specific moments:
- Mart robbery outcomes (MART_ROBBER, MART_BUSTED, SKULL_PICKER, etc.)
- Basement escape/failure (already implemented)
- What? purchase (WHAT_GAMEOVER)
- Commercial timeout (COMMERCIAL_TIMEOUT)

These should still call `awardAchievement()` directly when they occur.
