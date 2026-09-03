# Go Big or Go Broke Implementation

## Overview
A new high-stakes minigame that triggers when a player completes Round 3 without getting a Game Over.

## Game Mechanics

### Setup
- **12 Spaces Total:**
  - 8 spaces contain 💰 $100,000
  - 4 spaces contain 💥 Bombs
  - Spaces are shuffled randomly

### Two Game Modes

#### 1. Money Hunt Mode
- **Triggered:** When first pick is 💰 (money)
- **Goal:** Keep picking money spaces to accumulate winnings
- **How it works:**
  - Each money space adds $100,000 to your total
  - Game continues until you hit a 💥 bomb
  - When you hit a bomb, game ends and you keep all accumulated money
- **Strategy:** High risk, high reward - pick as many as you dare

#### 2. Bomb Hunt Mode
- **Triggered:** When first pick is 💥 (bomb)
- **Goal:** Find all 4 bombs to win $1,000,000 jackpot
- **How it works:**
  - Must find all 4 bombs without hitting money
  - If you hit 💰 money during the hunt, game ends immediately
  - Consolation prize: $100,000 (the money you hit)
  - If you successfully find all 4 bombs: WIN $1,000,000!
- **Strategy:** All or nothing - complete bomb clearance for massive jackpot

### Trigger Condition
- Automatically triggers after completing Round 3 without Game Over
- Only triggers once per game (tracked via `game.hasPlayedGoBigOrGoBroke`)
- Shows dramatic announcement: "SPECIAL EVENT UNLOCKED!"

## Implementation Details

### Files Modified

#### 1. gameManager.js
**Added State Properties (Lines 39-40):**
```javascript
this.goBigOrGoBrokeState = null;
this.hasPlayedGoBigOrGoBroke = false;
```

**New Methods (Lines 1285-1434):**
- `startGoBigOrGoBroke()` - Initializes game with 12 shuffled spaces
- `pickGoBigOrGoBrokeSpace(spaceIndex)` - Handles pick logic and game modes

**Return Values:**
- `isFirstPick`: Boolean indicating if this was the first pick
- `space`: The picked space data (type, emoji)
- `mode`: Current game mode ('money_hunt' or 'bomb_hunt')
- `winnings`: Current accumulated money
- `bombsFound`: Number of bombs found (in bomb hunt mode)
- `gameOver`: Boolean indicating if game ended
- `won`: Boolean indicating if player won
- `jackpot`: Boolean indicating if $1M jackpot won

#### 2. gameUI.js
**New UI Functions (Lines 1130-1268):**

1. **`createGoBigOrGoBrokeIntroEmbed()`**
   - Shows rules and instructions
   - Color-coded mode explanations:
     - 🟢 Green for Money Hunt
     - 🔴 Red for Bomb Hunt
   - Displays both possible game modes

2. **`createGoBigOrGoBrokePickEmbed(game, result)`**
   - Dynamic embed based on game state
   - Shows different messages for:
     - First pick (reveals mode)
     - Money hunt progress
     - Bomb hunt progress
     - Game over (with winnings)
     - Jackpot win
   - Color scheme changes based on outcome

3. **`createGoBigOrGoBrokeButtons(game)`**
   - Creates 3 rows × 4 columns = 12 buttons
   - Custom IDs: `gobig_space_0` through `gobig_space_11`
   - Shows revealed space emoji (💰 or 💥) after pick
   - Disables picked buttons
   - Disables all buttons when game over

#### 3. index.js
**Round 3 Trigger (Lines 4668-4689):**
- Checks if `currentRound === 3` after round completion
- Checks if `!game.hasPlayedGoBigOrGoBroke`
- Shows dramatic announcement with delays
- Calls `handleGoBigOrGoBrokeMinigame()`

**Handler Functions (Lines 6268-6316):**

1. **`handleGoBigOrGoBrokeMinigame(interaction, game)`**
   - Initializes game state
   - Shows intro embed with rules
   - Creates 12 space buttons

2. **`handleGoBigOrGoBrokeSpace(interaction, game, spaceIndex)`**
   - Multi-stage suspense animation (2.5 seconds total)
     - "Revealing space..." (800ms)
     - "Wait for it..." (1000ms)
     - "Almost there..." (700ms)
   - Picks the space and gets result
   - Shows result embed with updated buttons
   - If game over, waits 3 seconds then continues game

**Button Routing (Lines 2984-2987):**
```javascript
} else if (customId.startsWith('gobig_space_')) {
  const spaceIndex = parseInt(customId.split('_')[2]);
  await handleGoBigOrGoBrokeSpace(interaction, game, spaceIndex);
}
```

## Tension & Suspense Enhancements

### Go Big or Go Broke
- **Multi-stage reveal:** 3 suspense messages before revealing space
- **Total suspense time:** ~2.5 seconds per pick
- **Game over delay:** 3 seconds before continuing to next floor
- **Visual feedback:** Button states change to show picked spaces

### Six Zeroes (Enhanced)
**Added Suspense (Lines 7102-7240):**
- Multi-stage animation before reveal:
  - "Revealing your pick..." (800ms)
  - "Is it a ZERO...?" (1000ms)
  - "Or a NOODLE...?" (900ms)
- **Perfect bonus tease:** When on 5th pick with all same type, shows:
  - "🔥 ONE MORE ZERO FOR PERFECT BONUS! 🔥"
  - "🔥 ONE MORE NOODLE FOR PERFECT BONUS! 🔥"
- **Perfect bonus check:** 2-second suspense before revealing $20M or $10M bonus
- **Extended delays:** 2 seconds after each pick (up from 1.5 seconds)

### Mart-of-Cash Robbery (Enhanced)
**Added Suspense (Lines 6399-6487):**
- Multi-stage animation:
  - "Picking your space..." (800ms)
  - "The bot is making its choice..." (1200ms)
  - "Comparing results..." (1000ms)
  - "Revealing..." (800ms)
- **Total suspense:** ~3.8 seconds before showing result
- **Money Bank jackpot:** Special announcement when hitting 🏦
  - "JACKPOT! You hit the MONEY BANK!"
  - 2-second dramatic pause
- **Victory message:** "You picked the better space!" with 1.5-second delay

## Testing Checklist

### Basic Functionality
- [ ] Complete Round 3 without Game Over → Minigame triggers
- [ ] Minigame only triggers once per game
- [ ] All 12 buttons are clickable
- [ ] Picked buttons become disabled

### Money Hunt Mode
- [ ] First pick is 💰 → Enters Money Hunt mode
- [ ] Can pick multiple money spaces
- [ ] Winnings accumulate ($100k per space)
- [ ] Hitting 💥 ends game with accumulated money
- [ ] Can win up to $800,000 (all 8 money spaces)

### Bomb Hunt Mode
- [ ] First pick is 💥 → Enters Bomb Hunt mode
- [ ] Hitting 💰 during hunt ends with $100k
- [ ] Finding all 4 💥 awards $1,000,000 jackpot
- [ ] Progress shows bombs found (e.g., "3/4 Bombs Found")

### Suspense & Polish
- [ ] Suspense animations play correctly (not too fast/slow)
- [ ] Reveals feel dramatic and exciting
- [ ] Six Zeroes shows perfect bonus tease on 5th pick
- [ ] Mart robbery has dramatic comparison sequence
- [ ] Money Bank hit shows special jackpot message

### Edge Cases
- [ ] Cannot pick same space twice
- [ ] Game properly ends after final pick
- [ ] Continues to next floor correctly
- [ ] State persists properly between picks

## Prize Structure

| Outcome | Prize |
|---------|-------|
| Money Hunt - 1 space | $100,000 |
| Money Hunt - 2 spaces | $200,000 |
| Money Hunt - 3 spaces | $300,000 |
| Money Hunt - 4 spaces | $400,000 |
| Money Hunt - 5 spaces | $500,000 |
| Money Hunt - 6 spaces | $600,000 |
| Money Hunt - 7 spaces | $700,000 |
| Money Hunt - 8 spaces | $800,000 (maximum) |
| Bomb Hunt - Hit Money | $100,000 (consolation) |
| Bomb Hunt - Find All 4 Bombs | $1,000,000 (jackpot!) |

## Achievement Opportunities
Consider adding achievements for:
- 🏆 "All In" - Collect all 8 money spaces in Money Hunt
- 💎 "Bomb Squad" - Successfully complete Bomb Hunt jackpot
- 🎯 "One and Done" - Hit bomb on 2nd pick in Money Hunt
- 💥 "Close Call" - Find 3/4 bombs then hit money
- 🍀 "Lucky Strike" - Win $1M jackpot on first round 3 completion

## Notes
- Game state is stored in `game.goBigOrGoBrokeState`
- Uses `continueGameAfterMinigame()` for proper flow continuation
- Button IDs use format: `gobig_space_0` through `gobig_space_11`
- All money amounts properly formatted with `GameUI.formatMoney()`
- Embeds use appropriate color coding (gold for money, red for bombs)
