# 💣 Modal-Based Bomb Placement System

## Overview
Changed from DM-based to button + modal bomb placement with real-time status tracking.

## How It Works

### Phase 1: Bomb Placement (60 seconds)
1. Game shows a button: **💣 Place Your Bomb**
2. Players click the button to open a modal
3. Modal asks for square number (1-25)
4. Player submits their choice
5. Status updates in real-time showing:
   - ✅ **Placed:** Players who finished
   - ⏳ **Waiting:** Players who haven't placed yet

### Phase 2: Timeout Handling (if someone doesn't place)
After 60 seconds, if players are still waiting:
- Message shows: **⏰ TIME'S UP!**
- Lists players who didn't place
- Players who DID place can vote on 3 options:

#### Option 1: ⏰ Retry (60s)
- Gives non-placers 60 more seconds
- Resets timer
- Same button/modal flow

#### Option 2: 🤖 Continue (Replace with Bots)
- Places random bombs for inactive players
- Converts them to bot players
- Game starts immediately

#### Option 3: ❌ Abort Game
- Cancels the entire game
- Removes game from active games
- Players can start a new game

## Benefits Over DM System

### ✅ Advantages:
- **No DM permissions needed** - Works in server channels
- **Real-time status** - Everyone sees who's ready
- **Better UX** - Modal input is cleaner than DM messages
- **Timeout handling** - Democratic decisions on what to do
- **Transparent** - All players see the process

### 🔧 Technical Details:
- Uses Discord.js ModalBuilder for input
- TextInputBuilder for square selection
- ButtonBuilder for actions
- MessageComponentCollector for handling interactions
- 60 second timeout with clearTimeout management

## Code Changes
- Removed DM-based collector system
- Added `handleBombPlacementPhase()` function
- Added `handleTimeout()` for timeout decisions
- Added modal interaction handling
- Added real-time status embed updates

## Example Flow

```
[Initial Message]
💣 BOMB PLACEMENT PHASE

⏰ You have 60 seconds to place your bomb!
Click the button below to select your square.

⏳ Waiting: Player1, Player2, Player3
━━━━━━━━━━━━━━━━━━━━━━
[💣 Place Your Bomb]
```

After Player1 places:
```
💣 BOMB PLACEMENT PHASE

⏰ You have 60 seconds to place your bomb!
Click the button below to select your square.

✅ Placed: Player1
⏳ Waiting: Player2, Player3
━━━━━━━━━━━━━━━━━━━━━━
[💣 Place Your Bomb]
```

If timeout occurs:
```
⏰ TIME'S UP!

Player2, Player3 didn't place their bomb!

Players who placed can decide:
⏰ Retry - Give them 60 more seconds
🤖 Continue - Replace them with bots
❌ Abort - Cancel the game
━━━━━━━━━━━━━━━━━━━━━━
[⏰ Retry (60s)] [🤖 Continue (Replace with Bots)] [❌ Abort Game]
```

## Testing
To test the new system:
1. Start an RTAB game with `/rtab`
2. Add players and start
3. Click "💣 Place Your Bomb" button
4. Enter a square number (1-25) in the modal
5. Submit and watch status update

To test timeout:
1. Start game
2. Have some players place, some not
3. Wait 60 seconds
4. See timeout options appear
5. Click Retry/Continue/Abort
