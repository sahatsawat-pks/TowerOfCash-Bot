# Testing Guide - Go Big or Go Broke & Tension Enhancements

## Quick Start Testing

### 1. Test Go Big or Go Broke Trigger
**Objective:** Verify minigame triggers after Round 3

**Steps:**
1. Start a new game with `/play`
2. Complete Round 1 (floors 1-7)
3. Complete Round 2 (floors 8-14)
4. Complete Round 3 (floors 15-21)
5. After floor 21, verify:
   - ✅ "SPECIAL EVENT UNLOCKED!" message appears
   - ✅ Dramatic announcement with delays
   - ✅ Go Big or Go Broke intro embed shows
   - ✅ 12 space buttons appear (3 rows × 4 buttons)

**Expected Result:** Minigame starts automatically after Round 3 completion

---

### 2. Test Money Hunt Mode
**Objective:** Verify money accumulation mode works

**Steps:**
1. Trigger Go Big or Go Broke (complete Round 3)
2. Pick spaces until first pick is 💰 (money)
3. Verify:
   - ✅ Mode shows as "MONEY HUNT"
   - ✅ Green color scheme (#00FF00)
   - ✅ Can continue picking more spaces
   - ✅ Money accumulates ($100k per space)
4. Continue picking until hitting 💥 (bomb)
5. Verify:
   - ✅ Game ends
   - ✅ Keep accumulated money
   - ✅ Continues to next floor
   - ✅ Money added to totalMoney

**Expected Results:**
- First money pick → Money Hunt mode
- Each money space adds $100,000
- Bomb ends game with all accumulated money
- Maximum: $800,000 (if all 8 money spaces picked)

---

### 3. Test Bomb Hunt Mode
**Objective:** Verify bomb clearance for jackpot

**Steps:**
1. Trigger Go Big or Go Broke
2. Pick spaces until first pick is 💥 (bomb)
3. Verify:
   - ✅ Mode shows as "BOMB HUNT"
   - ✅ Red color scheme (#FF0000)
   - ✅ Shows "Find all 4 bombs for $1M jackpot!"
   - ✅ Progress shows "X/4 Bombs Found"
4. **Test Path A - Hit Money:**
   - Pick spaces until hitting 💰
   - Verify game ends with $100,000 consolation
5. **Test Path B - Find All Bombs:**
   - Pick only bomb spaces (avoid money)
   - After 4th bomb, verify:
     - ✅ "JACKPOT!" message
     - ✅ Win $1,000,000
     - ✅ Gold color embed (#FFD700)
     - ✅ Game continues

**Expected Results:**
- First bomb pick → Bomb Hunt mode
- Hitting money → Game over with $100k
- Finding all 4 bombs → $1M jackpot win

---

### 4. Test Suspense Animations
**Objective:** Verify timing and messages feel right

#### Go Big or Go Broke:
1. Pick any space
2. Watch for sequence:
   - "🎲 Revealing space..." (~0.8s)
   - "🎲 Wait for it..." (~1.0s)
   - "🎲 Almost there..." (~0.7s)
   - [Space revealed]
3. Verify timing feels dramatic but not too slow

#### Six Zeroes:
1. Go to Mart-of-Cash and buy Six Zeroes ($1M)
2. Pick any space
3. Watch for sequence:
   - "🎫 Revealing your pick..." (~0.8s)
   - "🎫 Is it a ZERO...?" (~1.0s)
   - "🎫 Or a NOODLE...?" (~0.9s)
   - [Result shown]
4. On 5th pick with pattern:
   - Verify "🔥 ONE MORE [TYPE] FOR PERFECT BONUS! 🔥" shows
5. After 6th pick:
   - Verify "Checking for perfect bonus..." message
   - If perfect, verify bonus awarded

#### Mart Robbery:
1. Encounter Mart-of-Cash event
2. Choose "Rob the Mart"
3. Pick any space
4. Watch for sequence:
   - "🎰 Picking your space..." (~0.8s)
   - "🎰 The bot is making its choice..." (~1.2s)
   - "🎰 Comparing results..." (~1.0s)
   - "🎰 Revealing..." (~0.8s)
   - [Result shown]
5. If win with Money Bank:
   - Verify special jackpot announcement

**Expected Results:**
- Smooth animation sequences
- Messages are readable
- Timing feels dramatic not tedious
- Special cases trigger appropriately

---

## Edge Cases

### Edge Case 1: One-Time Trigger
**Test:** Verify minigame only triggers once
1. Complete Round 3 → Minigame triggers
2. Complete Round 4 (floors 22-28) → No trigger
3. Verify `game.hasPlayedGoBigOrGoBroke` is true

### Edge Case 2: Can't Pick Same Space
**Test:** Try clicking same button twice
1. In Go Big or Go Broke, pick a space
2. Try clicking same space again
3. Verify: "❌ You already picked this space!" error

### Edge Case 3: Button States
**Test:** Verify buttons update correctly
1. Pick a space
2. Verify:
   - Picked button shows emoji (💰 or 💥)
   - Picked button becomes disabled
   - Other buttons remain active
3. On game over:
   - Verify all buttons become disabled

### Edge Case 4: Game State Persistence
**Test:** Verify state maintains correctly
1. Pick 3 money spaces in Money Hunt
2. Verify money is $300,000
3. Pick 4th space
4. Verify money is $400,000
5. Continue until end
6. Verify final money matches pick count

---

## Performance Testing

### Test Delay Timing
**Objective:** Ensure delays don't break Discord interaction

1. Start Go Big or Go Broke
2. Wait 5 minutes without picking (idle test)
3. Pick a space
4. Verify: Interaction still works

**Note:** Discord interactions valid for 15 minutes, all suspense delays are under 5 seconds per action.

### Test Rapid Clicking
**Objective:** Verify no race conditions

1. In Go Big or Go Broke, try clicking multiple buttons rapidly
2. Verify: Only one space processes at a time
3. Verify: No duplicate picks or errors

---

## Integration Testing

### Test Flow Continuation
**Objective:** Verify game continues properly after minigame

1. Complete Go Big or Go Broke
2. Verify:
   - ✅ Floor selection embed appears
   - ✅ Shows correct floor number (22)
   - ✅ Can pick left/right floor
   - ✅ Money persists correctly
   - ✅ No duplicate triggers

### Test With Other Features
**Objective:** Verify compatibility with existing features

1. **With Peek:**
   - Have Peek items before Round 3
   - Complete Round 3 → Go Big or Go Broke
   - After minigame, verify Peek still works

2. **With X-Protection:**
   - Have X-Protection before Round 3
   - Complete Round 3 → Go Big or Go Broke
   - After minigame, verify X-Protection active

3. **With Mystery Box Queue:**
   - Have Mystery Box in queue
   - Complete Round 3 → Go Big or Go Broke
   - After minigame, verify Mystery Box appears

---

## Visual Testing

### Embed Appearance
**Check each embed for:**
- ✅ Appropriate color (gold for money, red for bombs)
- ✅ Clear title and description
- ✅ Properly formatted money values
- ✅ Emoji display correctly
- ✅ No text overflow or wrapping issues

### Button Layout
**Verify:**
- ✅ 3 rows × 4 columns = 12 buttons
- ✅ Buttons labeled "Space 1" through "Space 12"
- ✅ After pick, button shows emoji
- ✅ Disabled buttons appear grayed out
- ✅ Layout looks good on desktop and mobile

---

## Regression Testing

### Existing Features Still Work
After implementing Go Big or Go Broke:

- [ ] All main minigames work (Vault, Mega Grid, etc.)
- [ ] Mystery Box works correctly
- [ ] Mart-of-Cash purchase and robbery work
- [ ] Six Zeroes works with new suspense
- [ ] Floor selection works normally
- [ ] Peek functionality works
- [ ] X-Protection works
- [ ] Achievements still trigger
- [ ] Leaderboard updates correctly

---

## Bug Checklist

### Common Issues to Watch For
- [ ] Buttons not responding after pick
- [ ] Money not accumulating correctly
- [ ] Game not ending when it should
- [ ] Mode not switching properly
- [ ] Suspense delays too long/short
- [ ] Embed colors incorrect
- [ ] Jackpot not awarding $1M
- [ ] Game triggering multiple times
- [ ] Interaction timeout errors
- [ ] Race conditions with rapid clicks

---

## Success Criteria

### Go Big or Go Broke
✅ Triggers after Round 3 once
✅ Two modes work correctly
✅ Money Hunt accumulates properly
✅ Bomb Hunt jackpot awards $1M
✅ Suspense timing feels good
✅ UI is clear and informative
✅ Game continues properly after

### Tension Enhancements
✅ All suspense animations play smoothly
✅ Timing doesn't feel too slow or fast
✅ Special messages trigger appropriately
✅ Six Zeroes perfect bonus tease works
✅ Mart robbery jackpot announcement works
✅ No negative impact on gameplay flow

### Integration
✅ Doesn't break existing features
✅ Works with Peek, X-Protection, Mystery Box
✅ Proper flow continuation
✅ Money persists correctly
✅ Achievements still work

---

## Quick Test Commands

### Fast Test (5 minutes)
1. Start game
2. Use cheat/admin commands to skip to Round 3 end (if available)
3. Test Go Big or Go Broke once (Money Hunt path)
4. Verify continuation to Round 4
5. Check for errors in console

### Full Test (30 minutes)
1. Play through normally to Round 3
2. Test Go Big or Go Broke (Money Hunt)
3. Start new game, get to Round 3 again
4. Test Go Big or Go Broke (Bomb Hunt - hit money)
5. Start new game, get to Round 3 again
6. Test Go Big or Go Broke (Bomb Hunt - full jackpot)
7. Test all suspense enhancements
8. Verify all edge cases

### Stress Test (1 hour)
1. Full test above
2. Test with multiple concurrent games
3. Test all integration scenarios
4. Complete regression testing
5. Document any issues found

---

## Reporting Issues

### Issue Template
```
**Issue:** [Brief description]
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [If applicable]
**Console Errors:** [If any]
```

### Priority Levels
- **Critical:** Game-breaking, prevents play
- **High:** Major feature doesn't work as intended
- **Medium:** Minor feature issue, has workaround
- **Low:** Polish, cosmetic, or edge case issue

---

## Notes

- All syntax validated ✅
- No compile errors ✅
- Documentation complete ✅
- Ready for testing ✅

Test thoroughly and enjoy the new minigame! 🎲💰💥
