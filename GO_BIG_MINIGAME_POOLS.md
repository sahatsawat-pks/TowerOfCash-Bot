# Go Big or Go Broke - Minigame Pool Integration

## Summary
Added "Go Big or Go Broke" to all random minigame selection pools in the game.

## Updated Locations

### 1. Mystery Box - Random Minigame (Line ~1398)
**Pool:** 6 minigames
```javascript
const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'go_big_or_go_broke'];
```
- **Trigger:** Getting "Question Mark" (❓) item from Mystery Box
- **Routing:** Added at line ~1415

### 2. Golden Ticket (Line ~1795)
**Pool:** 19 minigames
```javascript
const allMinigames = [
  // Main game minigames
  'vault', 'mega_grid', 'boiling_point', 'operator_roshambo', 'infinity_percent',
  'hideout_breakthrough', 'babushka', 'door_escape', 'mystery_box',
  // Monopoly minigames from mystery box
  'community_chest', 'park_it', 'advance_boardwalk', 'bank_buster',
  'block_party', 'power_grid', 'no_vacancy', 'ride_rails',
  // Mart-of-Cash exclusive
  'six_zeroes',
  // Round 3 special minigame
  'go_big_or_go_broke'
];
```
- **Trigger:** Getting "Golden Ticket" (🎫) item from Mystery Box
- **Routing:** Added at line ~1853

### 3. Mart-of-Cash - Rob Rewards (Line ~6673)
**Pool:** 18 minigames
```javascript
const minigameTypes = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'operator_roshambo', 'babushka', 'door_escape', 'six_zeroes', 'advance_boardwalk', 'bank_buster', 'block_party', 'community_chest', 'electric_company', 'no_vacancy', 'park_it', 'ride_rails', 'go_big_or_go_broke'];
```
- **Trigger:** Successfully robbing Mart-of-Cash and getting minigame rewards
- **Name:** "🎲 Go Big or Go Broke" (line ~6695)
- **Routing:** Added at line ~6739

### 4. Mart-of-Cash - Rob Rewards (Next Minigame) (Line ~6757)
**Pool:** 18 minigames
- Same as #3, but for continuation when multiple minigames won
- **Routing:** Added at line ~6823

### 5. Mart-of-Cash - Buy Minigame (Line ~6903)
**Pool:** 18 minigames
```javascript
const minigames = ['vault', 'infinity_percent', 'mega_grid', 'hideout_breakthrough', 'boiling_point', 'operator_roshambo', 'babushka', 'door_escape', 'six_zeroes', 'advance_boardwalk', 'bank_buster', 'block_party', 'community_chest', 'electric_company', 'no_vacancy', 'park_it', 'ride_rails', 'go_big_or_go_broke'];
```
- **Trigger:** Purchasing "Minigame" item from Mart-of-Cash for $250,000
- **Name:** "🎲 Go Big or Go Broke" (line ~6918)
- **Routing:** Added at line ~6973

## Handler Function
All locations route to the same handler:
```javascript
await handleGoBigOrGoBrokeMinigame(interaction, game);
```

## Implementation Details

### What Changed
1. ✅ Added `'go_big_or_go_broke'` to 5 minigame pools
2. ✅ Added display name "🎲 Go Big or Go Broke" to 3 name mappings
3. ✅ Added routing in 5 handler sections
4. ✅ All syntax validated

### What This Means
Players can now encounter "Go Big or Go Broke" through:
- **Mystery Box** - Question Mark item (6 possible minigames)
- **Golden Ticket** - Random selection (19 possible minigames)
- **Mart Robbery** - As a reward for successful robbery (18 possible minigames)
- **Mart Purchase** - Buy from shop for $250,000 (18 possible minigames)

### Original Trigger
The minigame still has its **primary trigger**:
- Automatically after completing Round 3 without Game Over (one-time only)

### Probability
- **Mystery Box:** ~16.7% (1/6 chance)
- **Golden Ticket:** ~5.3% (1/19 chance)
- **Mart Robbery Reward:** ~5.6% (1/18 chance)
- **Mart Purchase:** ~5.6% (1/18 chance)

## Testing

### Test Cases
1. ✅ Mystery Box Question Mark → Random minigame
2. ✅ Mystery Box Golden Ticket → Random minigame
3. ✅ Mart Robbery → Win minigame rewards
4. ✅ Mart Purchase → Buy minigame
5. ✅ Round 3 completion → One-time trigger (still works)

### Verification
- All syntax checks passed ✅
- No duplicate code ✅
- Consistent naming ✅
- Proper routing ✅

## Notes
- Go Big or Go Broke can now appear **multiple times** per game via these random selections
- The Round 3 trigger still only happens **once per game**
- This significantly increases player access to the high-stakes minigame
- Maintains balance since random selection has low probability
