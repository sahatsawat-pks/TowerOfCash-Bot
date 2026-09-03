# 🎬 RTAB Tension Reveal System (RTAB6-Authentic)

## Overview
Based on the **official RTAB Season 6 bot code**, your Tower of Cash bot now has authentic dramatic reveals!

## Reference Implementation
Directly based on `RtaB6/src/tel/discord/rtab/GameController.java` lines 1510-1750

## How It Works (Authentic RTAB Format)

### Stage 1: Selection Announcement
```
"Dark selects space 13..."
```
- Format: `[Player] selects space [X]...`
- No "So" prefix (authentic to RTAB6)
- Dark gray embed color (#2F3136)
- 3 second delay

### Stage 2: Money/Suspense Reveal
```
"Dark selects space 13...
(+$118,025)"
```
OR for bombs/events:
```
"Dark selects space 13...
..."
```
- Shows money for prizes: `(+$XXX)` format
- Shows suspense dots `...` for bombs/events/minigames
- Matches RTAB6's annuity display format
- 1.5-3 second delay (longer for suspenseful squares)

### Stage 3: Full Reveal (RTAB6 Format)
**Prizes:**
```
"It's **10,000 Baht**, worth **$10,000**!"
```

**Bombs:**
```
"It's a **BOMB**."
💀 Dark is ELIMINATED!
```
OR
```
"It's your own **BOMB**."
```

**Minigames:**
```
"It's a minigame: **Bumper Grab**!"
🎯 Winner earns $118,025!
```

**Multipliers:**
```
"A **x2** Multiplier!"
📈 Money multiplied by 2!
```

## RTAB6 Suspense System
```java
// From GameController.java line 1560
if((random < threshold && no joker && no starman)
    || bomb || blammo)
{
    sleep(5000);
    sendMessage("...");
}
sleep(5000);
```

Implemented as:
- **Bombs:** Always get 3s extra suspense
- **Events:** Always get 3s extra suspense  
- **Random chance:** 30% for other squares (was based on players/spaces left in RTAB6)
- **Normal squares:** 1.5s delay

## Authentic Message Formats

### From RTAB6 Source:
- Selection: `players.get(player).getName() + " selects space " + (location+1) + "..."`
- Annuity: `String.format("(+$%,d)", amount)`
- Cash: `"It's **" + prizeName + "**, worth **$" + amount + "**!"`
- Bomb: `"It's a **BOMB**."`
- Game: `"It's a minigame: **" + gameName + "**!"`
- Boost: `String.format("A **%+d%%** Booster", boost)`

### Our Implementation:
✅ Player name format: `**Dark**`
✅ Space format: `space **13**...`
✅ Money format: `(+$118,025)` or `**$118,025**`
✅ Prize format: `It's **Name**, worth **$XXX**!`
✅ Bomb format: `It's a **BOMB**.` or `It's your own **BOMB**.`
✅ Minigame format: `It's a minigame: **Name**!`

## Timing Breakdown
1. **Stage 1:** Instant (selection announcement)
2. **Stage 2:** +3 seconds
3. **Suspense:** +3s (bombs/events) or +1.5s (normal)
4. **Stage 3:** Final reveal
5. **Total:** 4.5-6.5 seconds per square (authentic to RTAB)

## Supported Reveal Types

### 💵 Prizes
- Shows amount in Stage 2
- Includes boost multipliers
- Green color scheme

### 💣 Bombs
- Dramatic reveal in Stage 3
- Shows elimination message
- Red color scheme
- Money lost details

### ✖️ Multipliers
- Shows effect (multiply/divide/boost)
- Gold color scheme
- Duration for boosts

### 🎲 Events
- Event name and emoji
- Purple color scheme
- Major events get extra animation

### 📦 Items
- Item name and emoji
- Blue color scheme
- Simple reveal

### 🎮 Minigames
- Shows reward in Stage 2
- Minigame name in Stage 3
- Pink color scheme
- Winner celebration

## Discord Implementation
The tension system automatically triggers when players click squares in the game grid. The message updates in place, creating smooth tension-building animation.

## Files Modified
- `index.js` - Square click handler with 3-stage reveals
- `rtabUI.js` - New `createTensionRevealEmbed()` method with 3 stages
- `RTABGame.js` - Already had `squareIndex` support

## Test It!
Run: `node demo_tension_reveal.js` to see examples

## Just Like The Show! ✨
Players will feel the same excitement as watching RTAB on YouTube:
- "What did they get??"
- "How much is it??"  
- "OH NO A BOMB!!"
- "YES! MINIGAME!!"

The suspense makes every square click feel dramatic and exciting! 🎉
