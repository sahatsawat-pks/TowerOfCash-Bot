# Achievement Validation & Archival System

## Overview
Complete validation system to ensure each achievement is properly validated before being archived. Includes validation checks, archival logs, verification tools, and statistics tracking.

## Features Added

### 1. Achievement Structure Validation
- **`validateAchievement(achievementId, validationData)`** - Validates achievement exists and has proper structure
- Checks:
  - Achievement exists in master list
  - Has valid id, name, description
  - Has valid bitLocation (0-31)
  - Has valid type
  - Structure integrity

### 2. Criteria Validation
- **`validateCriteria(achievementId, data)`** - Validates if achievement criteria are met
- Validates before awarding:
  - **Money Achievements**: Checks if money threshold met ($1M, $5M, $10M, $100M, $1B, $5B, $10B, $1T, $5T, $10T)
  - **Floor Achievements**: Checks if floor threshold met (10, 20, 30, 40, 50 floors)
  - **Minigame Achievements**: Validates minigame-specific conditions
  - **Special Conditions**: Perfect floors, veteran status, etc.

### 3. Record Validation
- **`validateRecord(record)`** - Validates record structure before saving
- Checks:
  - Valid userId and username
  - All category bitflags are valid integers
  - No negative or invalid values

### 4. Achievement Archival Log
- **`logAchievementAward(userId, username, achievement, guildId, validationData)`**
- Creates detailed log entries in `guild_{guildId}_log.txt`
- Format: `[timestamp] userId (username) earned "name" (id) - description | Data: {validationData}`
- Includes validation data for audit trail

### 5. Verification Commands

#### `/verify-achievements [user]`
Verify and validate archived achievements for a player.

**Features:**
- Validates all earned achievements
- Checks for data inconsistencies
- Verifies bitflag integrity
- Shows archive log entries
- Admin-only for viewing other users

**Validation Checks:**
- Achievement exists in master list
- BitLocation matches
- Type matches
- Bit is actually set correctly
- No duplicate achievements

**Output:**
```
🔍 Achievement Verification: Username
Status: ✅ Valid / ⚠️ Issues Found
Total Earned: X achievements

⚠️ Errors Found:
• Error description

⚡ Warnings:
• Warning description

📋 Archive Log: X entries

Recent Archive Entries (Last 5):
• Achievement Name - Date
```

#### `/achievement-stats`
View achievement statistics for the server.

**Shows:**
- Total players with achievements
- Average achievements per player
- Most earned achievement
- Rarest achievement
- Top 10 most earned achievements

**Output:**
```
📊 Achievement Statistics - Server Name
👥 Total Players: X
📈 Avg. Achievements: X.XX

🏆 Most Earned Achievement
Name
X players

💎 Rarest Achievement
Name
X players

📋 Top 10 Achievements
1. 🎉 Name - X players
2. 💰 Name - X players
...
```

### 6. Enhanced Award System
Updated `awardAchievement()` to include validation:

```javascript
await towerAchievements.awardAchievement(
  achievementId,
  userId,
  username,
  guildId,
  channel,
  validationData  // NEW: Optional validation data
);
```

**Validation Flow:**
1. Validate achievement structure
2. Get player record
3. Check if already earned
4. Validate record format
5. Award achievement (flip bit)
6. Validate record before saving
7. Save to database
8. Log to archive
9. Send notification

## Validation Data Examples

### Money & Floor Achievements
```javascript
const validationData = {
  money: 5000000,
  floor: 25,
  gameCompleted: true
};
```

### Minigame Achievements
```javascript
const validationData = {
  babushkaWinnings: 10000000,
  strikes: 0,
  dollsOpened: 12
};
```

### Special Achievements
```javascript
const validationData = {
  consecutiveCorrect: 3,
  gamesPlayed: 100,
  hideoutJackpot: true
};
```

## Archive File Structure

### Player Records: `guild_{guildId}.csv`
Format: `userId#username#milestone#event#minigame#gameover`
```
459917242633682955#Player1#4095#65535#131071#2047
123456789012345678#Player2#15#7#3#1
```

### Archive Log: `guild_{guildId}_log.txt`
Format: `[timestamp] userId (username) earned "name" (id) - description | Data: {json}`
```
[2025-12-17T00:30:45.123Z] 459917242633682955 (Player1) earned "Millionaire" (MILLIONAIRE) - Earn $1,000,000 in a single game | Data: {"money":5000000,"floor":15,"gameCompleted":true}
[2025-12-17T00:31:12.456Z] 459917242633682955 (Player1) earned "Floor 10" (FLOOR_10) - Complete 10 floors in a single game | Data: {"money":2500000,"floor":12,"gameCompleted":true}
```

## Error Handling

### Validation Failures
- Achievement not found → Returns false, logs error
- Invalid structure → Returns false, logs error  
- Criteria not met → Returns false, logs reason
- Record invalid → Returns false, prevents save

### Recovery
- All validations fail gracefully
- Logs detailed error messages
- Does not crash the bot
- Does not corrupt existing data

## Integration Points

### Game Completion ([index.js](index.js#L4295))
```javascript
const validationData = {
  money: game.totalMoney,
  floor: game.floorsCompleted,
  gameCompleted: true
};

await towerAchievements.awardAchievement(
  'MILLIONAIRE',
  game.userId,
  game.username,
  interaction.guildId,
  interaction.channel,
  validationData
);
```

### Basement Outcome
```javascript
const validationData = {
  basementEscaped: true,
  moneyRetained: percentRetained,
  basementAttempts: 1
};
```

### Mart-Of-Cash Robbery
```javascript
const validationData = {
  martRobbery: true,
  robberySuccess: result === 'win',
  amountStolen: stolenAmount
};
```

## Statistics Tracking

### `getAchievementStatistics(guildId)`
Returns comprehensive server statistics:
```javascript
{
  totalPlayers: 50,
  achievementCounts: {
    'FIRST_WIN': 45,
    'MILLIONAIRE': 30,
    'FLOOR_10': 25,
    ...
  },
  mostEarnedAchievement: {
    id: 'FIRST_WIN',
    name: 'First Victory',
    count: 45
  },
  leastEarnedAchievement: {
    id: 'FLOOR_50',
    name: 'Skyscraper',
    count: 2
  },
  averageAchievements: 8.5
}
```

## Verification Methods

### `getPlayerAchievementLog(userId, guildId)`
Returns all archive log entries for a player:
```javascript
[
  {
    timestamp: '2025-12-17T00:30:45.123Z',
    userId: '459917242633682955',
    username: 'Player1',
    achievementName: 'Millionaire',
    achievementId: 'MILLIONAIRE',
    description: 'Earn $1,000,000 in a single game',
    validationData: { money: 5000000, floor: 15 }
  },
  ...
]
```

### `verifyPlayerAchievements(userId, guildId)`
Complete verification with error detection:
```javascript
{
  valid: true,
  errors: [],
  warnings: [],
  totalEarned: 15,
  record: { ... }
}
```

## Benefits

1. **Data Integrity**: Ensures all achievements are valid before archiving
2. **Audit Trail**: Complete log of when and why achievements were earned
3. **Error Detection**: Identifies corrupted or invalid achievement data
4. **Statistics**: Server-wide achievement tracking and analytics
5. **Verification**: Admin tools to verify player achievements
6. **Debugging**: Validation data helps debug achievement issues
7. **Security**: Prevents invalid achievement data from being saved
8. **Transparency**: Players can verify their own achievements

## Admin Features

- View any player's achievement verification
- Access archive logs
- See validation data for each achievement
- Monitor server-wide achievement statistics
- Identify rarest and most common achievements

## Future Enhancements

Potential additions:
- Achievement import/export
- Bulk verification for all players
- Achievement reset tools (admin only)
- Achievement trading system
- Season-based achievement tracking
- Achievement leaderboards
- Custom achievement creation
- Achievement difficulty ratings
