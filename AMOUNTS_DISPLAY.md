# Remaining Amounts Display - Visual Guide

## 📊 How It Works

The bot now tracks and displays all available amounts during gameplay, similar to the Tower Challenge game shown in your image.

### Display Format

Amounts are organized by category with color-coded emojis:

```
💰 Cash: $1, $2, $4, $8, $16, $32, $64, $125, $250, $500, $1,000, $2,000, $4,000, $8,000, $16,000, $32,000, $64,000, $125,000, $250,000, $500,000, $1,000,000

🔵 Losses: -25%, -50%, -75%, -100%

🟣 Gains: +25%, +50%, +75%, +100%

🟢 Random: Random 1, Random 2, Random 3, Random 4

🟠 Special: Add a 0, Add a 1, X Level

⚪ Other: Nothing x5, Game Over
```

### During Gameplay

#### 1. **Floor Selection Screen**
Shows all remaining amounts so you can strategize which floors to pick.

#### 2. **Floor Choice Screen** (Left/Right decision)
Displays remaining amounts to help you assess risk.

#### 3. **Result Screen** (After choosing)
- Shows what you got and what you avoided
- Updates the remaining amounts list
- **Revealed amounts are crossed out** (~~like this~~)
- Multiple copies shown as "x2", "x3", etc.

#### 4. **Round End Screen**
Shows remaining amounts to help you decide whether to continue or cash out.

## 🎯 Example Display During Game

### Before Any Floors Played:
```
**Available Amounts:**
💰 Cash: $1, $2, $4, $8, $16, $32, $64, $125, $250, $500, $1,000, $2,000, $4,000, $8,000, $16,000, $32,000, $64,000, $125,000, $250,000, $500,000, $1,000,000
🔵 Losses: -25%, -50%, -75%, -100%
🟣 Gains: +25%, +50%, +75%, +100%
🟢 Random: Random 1, Random 2, Random 3, Random 4
🟠 Special: Add a 0, Add a 1, X Level
⚪ Other: Nothing x5, Game Over
```

### After Playing 3 Floors (Example):
If you revealed: $1,000, +50%, and Nothing

```
**Available Amounts:**
💰 Cash: $1, $2, $4, $8, $16, $32, $64, $125, $250, $500, ~~$1,000~~, $2,000, $4,000, $8,000, $16,000, $32,000, $64,000, $125,000, $250,000, $500,000, $1,000,000
🔵 Losses: -25%, -50%, -75%, -100%
🟣 Gains: +25%, ~~+50%~~, +75%, +100%
🟢 Random: Random 1, Random 2, Random 3, Random 4
🟠 Special: Add a 0, Add a 1, X Level
⚪ Other: Nothing x4, Game Over
```

### Late Game (Many Amounts Used):
```
**Available Amounts:**
💰 Cash: $16,000, $125,000, $1,000,000
🔵 Losses: -100%
🟣 Gains: +100%
🟢 Random: Random 3, Random 4
🟠 Special: X Level
⚪ Other: Nothing x2, Game Over
```

## 🎮 Strategic Value

### Why This Helps:

1. **Risk Assessment**: See what percentages are left (good or bad)
2. **Prize Knowledge**: Know if big cash prizes are still available
3. **Danger Awareness**: Track if Game Over or -100% tiles are still in play
4. **Planning**: Decide when to cash out based on remaining amounts

### Example Strategy:

**Early Rounds (Rounds 1-2):**
- Many good amounts still available
- Safer to continue

**Mid Game (Rounds 3-4):**
- If mostly negative percentages left → consider cashing out
- If many cash prizes remain → worth the risk

**Late Game (Rounds 5-6):**
- Check if Game Over is still available
- If only bad amounts left → cash out!
- If good amounts remain → go for it!

## 📋 Categories Explained

### 💰 Cash Amounts
Fixed dollar values from $1 to $1,000,000

### 🔵 Losses (Negative Percentages)
- -25%: Lose 25% of current money
- -50%: Lose 50% of current money
- -75%: Lose 75% of current money
- -100%: Lose everything (ends game after Round 1)

### 🟣 Gains (Positive Percentages)
- +25%: Gain 25% more money
- +50%: Gain 50% more money
- +75%: Gain 75% more money
- +100%: Double your money!

### 🟢 Random
- Random 1: $0-$9,999
- Random 2: $0-$99,999
- Random 3: $0-$999,999
- Random 4: $0-$9,999,999

### 🟠 Special
- **Add a 0**: Multiply money by 10 ($1,000 → $10,000)
- **Add a 1**: Add "1" to front ($9,100 → $19,100)
- **X Level**: Game Over (cancels last floor)

### ⚪ Other
- **Nothing**: No effect (5 tiles)
- **Game Over**: Instant game over

## 🔄 Tracking Features

### Count Display
If multiple copies exist: `Nothing x5` means 5 "Nothing" tiles remain

### Strikethrough
Used amounts shown with ~~strikethrough~~ so you know they're revealed

### Real-Time Updates
List updates after every floor reveal!

---

## 💡 Pro Tips

1. **Count the bad tiles**: If -100%, Game Over, and X Level are all still in play, be cautious
2. **Track the Nothings**: 5 "Nothing" tiles mean ~12% chance of getting nothing
3. **Watch the percentages**: Late game with money, percentages are more valuable than small cash
4. **Random values**: These can be huge or tiny - pure luck!

Enjoy the enhanced strategic gameplay! 🎰💰
