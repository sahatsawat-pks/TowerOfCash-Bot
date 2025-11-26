# Event Mode & Enhanced Stats Testing Guide

## ✅ Implementation Complete

All requested features have been implemented and syntax-validated. Here's what's ready to test:

---

## 🎯 New Features Implemented

### 1. Admin Commands

#### `/day_limit <limit>`
- **Purpose**: Set per-guild daily play limits
- **Permission**: Administrator or 💻 Owner role
- **Usage**: 
  - `/day_limit 5` - Sets limit to 5 plays per day
  - `/day_limit 0` - Removes limit (unlimited plays)
- **Test Cases**:
  - ✓ Set limit to 3, verify players can only play 3 times
  - ✓ Set limit to 0, verify unlimited plays (except default)
  - ✓ Verify non-admins cannot use command

#### `/event-mode <enable|disable>`
- **Purpose**: Toggle event mode for the guild
- **Permission**: Administrator or 💻 Owner role
- **Usage**:
  - `/event-mode enable` - Enables event mode
  - `/event-mode disable` - Disables event mode
- **Test Cases**:
  - ✓ Enable event mode, start game, verify event tiles appear (The Vault, Operator Offer, Hideout Breakthrough)
  - ✓ Disable event mode, verify only normal tiles appear
  - ✓ Verify 3 "Nothing" tiles are replaced with 3 event tiles (plus 2 built-in event tiles in config)

---

### 2. Event Tiles

#### 🏦 The Vault Minigame
**Trigger**: Player selects "The Vault" tile during event mode

**Mechanics**:
- Player must guess a 6-digit code (no duplicate digits)
- 4 attempts maximum
- 2-minute time limit
- After each guess, shows:
  - ✅ Digits in correct positions
  - 🟡 Digits that exist but in wrong positions
- Progress tracker reveals correctly guessed positions

**Rewards**:
- 1 attempt: Random from [$500k, $1M, $2.5M, $5M, $10M]
- 2 attempts: $250,000
- 3 attempts: $100,000
- 4 attempts: $50,000

**Test Cases**:
- ✓ Enter valid 6-digit guess
- ✓ Try invalid guesses (duplicates, wrong length)
- ✓ Crack code in 1 attempt, verify reward is from high tier
- ✓ Crack code in 4 attempts, verify $50k reward
- ✓ Fail all 4 attempts, verify game continues
- ✓ Let timer expire, verify game continues

#### 📞 Operator Offer
**Trigger**: Player selects "Operator Offer" tile during event mode

**Mechanics**:
- Calculates offer: ±50% of current money
- If player has $0: Random $100k-$5M
- Present Accept/Decline buttons
- **Accept**: Take offer, end game (counts as WIN)
- **Decline**: Continue with current money

**Test Cases**:
- ✓ Get offer with $100k balance, verify offer is in $50k-$150k range
- ✓ Get offer with $0 balance, verify offer is $100k-$5M
- ✓ Accept offer, verify final score = offer amount and counts as win
- ✓ Decline offer, verify game continues with original money

#### 🏚️ Hideout Breakthrough
**Trigger**: Player selects "Hideout Breakthrough" tile during event mode

**Mechanics**:
- 12 buttons hiding numbers 1-12 (3 rows × 4 buttons)
- Player picks buttons to reveal numbers
- Must pick numbers in **ascending order**
- Each successful pick earns **$20,000**
- Picking **12** (highest number) = forced stop, keep accumulated rewards
- 6 successful ascending picks = **$1,000,000 JACKPOT**
- Pick a lower/equal number = Game Over (keep accumulated rewards)
- 1.5-second suspense delay before each reveal

**Rewards**:
- $20,000 per successful pick
- $1,000,000 for completing 6 ascending picks
- Keep all accumulated money when game stops

**Test Cases**:
- ✓ Pick number 12 on first pick, verify $20k earned and game stops
- ✓ Pick number 12 on 3rd pick, verify accumulated rewards (e.g., $60k)
- ✓ Pick ascending sequence (e.g., 3→5→7→9→11), verify rewards accumulate
- ✓ Pick 6 ascending numbers, verify $1M jackpot
- ✓ Pick lower number, verify game ends but keeps accumulated rewards
- ✓ Verify suspense delay works before reveal
- ✓ Verify unpicked numbers are revealed after game ends

---

### 3. Enhanced Stats

#### `/stats` Command Updates
**New Information Displayed**:
- Last 5 games with scores and timestamps
- Top 5 games ranked with medals (🥇🥈🥉)
- Enhanced formatting

**Test Cases**:
- ✓ Check stats with no games, verify clean display
- ✓ Play 3 games, verify last 5 shows all 3
- ✓ Play 10 games, verify top 5 shows highest scores
- ✓ Verify timestamps are readable and correct

---

### 4. Player Profile on Game Start

**New Welcome Screen**:
When `/play` is used, displays:
- Player's Discord avatar
- Username with admin badge if applicable
- High score, wins, total games, win rate
- Remaining plays today
- "First time playing!" message for new players

**Test Cases**:
- ✓ Start game with existing stats, verify all stats shown
- ✓ Start game as first-time player, verify welcome message
- ✓ Start game as admin, verify crown badge and unlimited plays
- ✓ Verify avatar displays correctly

---

## 🧪 Testing Workflow

### Phase 1: Basic Admin Commands
```
1. Run bot: node index.js
2. Test /day_limit 3
3. Try playing 4 times (should block 4th)
4. Test /day_limit 0
5. Test /event-mode enable
```

### Phase 2: Event Mode Testing
```
1. Enable event mode: /event-mode enable
2. Start multiple games until you encounter event tiles
3. When you hit "The Vault":
   - Try invalid guesses (test validation)
   - Try cracking code in different attempts
   - Test timeout scenario
4. When you hit "Operator Offer":
   - Test accepting offer
   - Test declining offer
   - Verify win is recorded when accepted
5. When you hit "Hideout Breakthrough":
   - Try picking number 12 for instant win
   - Try picking ascending sequence
   - Try picking lower number to test failure
   - Verify rewards accumulate correctly
```

### Phase 3: Stats & Profile Testing
```
1. Check /stats before playing (should show "no games")
2. Play 5+ games with varying scores
3. Check /stats again (verify recent and top 5)
4. Start new game, verify profile embed shows:
   - Your avatar
   - Your stats
   - Remaining plays
```

### Phase 4: Integration Testing
```
1. Enable event mode
2. Set day limit to 2
3. Play 2 complete games (try to encounter event tiles)
4. Check stats after each game
5. Verify can't play 3rd game (day limit)
6. Verify stats show both games correctly
```

---

## 🐛 Known Limitations & Notes

1. **The Vault Message Collector**: 
   - Uses 2-minute timeout
   - Guesses must be sent as regular chat messages
   - Bot will attempt to delete guess messages

2. **Event Tile Randomness**:
   - Event tiles are randomly placed during floor generation
   - May take several games to encounter both tiles
   - Only 2 tiles per game (replaces 2 of 5 "Nothing" tiles)

3. **Database Changes**:
   - New `guild_settings` table created automatically
   - Existing games won't be affected
   - Settings persist across bot restarts

4. **Admin Privileges**:
   - Admins bypass daily limits
   - Shown as "∞ (Admin)" in stats
   - Crown badge (👑) on profile

---

## 📊 Database Schema Updates

### `guild_settings` Table
```sql
guild_id TEXT PRIMARY KEY
day_limit INTEGER
event_mode INTEGER DEFAULT 0
```

### New Helper Functions
- `setDayLimit(guildId, limit)`
- `getDayLimit(guildId)`
- `setEventMode(guildId, enabled)`
- `getEventMode(guildId)`
- `getRecentPlays(userId, guildId, limit)`
- `getTopPlays(userId, guildId, limit)`

---

## 🚀 Quick Start Commands

```bash
# Start the bot
node index.js

# In Discord:
/event-mode enable          # Enable event mode
/day_limit 5                # Set daily limit to 5
/play                       # Start a game (see new profile!)
/stats                      # View enhanced stats
/checkdaily                 # Check remaining plays
```

---

## ✨ Event Tile Appearance

In normal mode (5 "Nothing" tiles):
- Nothing, Nothing, Nothing, Nothing, Nothing

In event mode (3 "Nothing", 2 event tiles):
- Nothing, Nothing, Nothing, The Vault 🏦, Operator Offer 📞

---

## 🎮 Expected User Experience

1. Admin enables event mode
2. Player starts game → sees profile with avatar and stats
3. Player selects floors and plays normally
4. **Encounters The Vault**:
   - Interactive guessing game appears
   - Player types guesses in chat
   - Receives feedback after each attempt
   - Wins money if successful
5. **Encounters Operator Offer**:
   - Shown offer amount
   - Must decide: Accept (end with money) or Decline (continue)
6. After game, checks `/stats`:
   - Sees game in "Last 5 Games"
   - If high score, appears in "Top 5 Games"

---

## 📝 Success Criteria

- ✅ All syntax checks pass
- ✅ Bot starts without errors
- ✅ Admin commands work and save to database
- ✅ Event tiles appear when enabled
- ✅ The Vault minigame is interactive and rewards correctly
- ✅ Operator Offer presents choices and handles both paths
- ✅ Stats show recent and top plays
- ✅ Profile embed displays on game start
- ✅ Daily limits respect guild settings

---

**Ready to test! Start the bot and try the features.** 🎉
