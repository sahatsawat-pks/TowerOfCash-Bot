# 👑 Admin Guide - Tower of Cash

## Admin Privileges

Users with admin permissions in Tower of Cash have special privileges to manage and reward players.

### Who is an Admin?

A user is recognized as an admin if they have:
- Discord **Administrator** permission, OR
- A role named **"admin"** (case-insensitive)

---

## Admin Features

### 1. 🎮 Unlimited Plays

**Benefit:** Admins can play as many games as they want per day.

**How it works:**
- Admins bypass the daily 2-game limit
- Play count is not tracked for admins
- Stats display shows "∞ (Admin)" for remaining plays

**Usage:**
```
/play
```
Just use the normal play command. The bot automatically detects your admin status.

---

### 2. 🎁 Grant Bonus Plays

**Purpose:** Reward users with additional plays as prizes or incentives.

**Command:**
```
/grantplay @user <amount>
```

**Parameters:**
- `@user` - The Discord user to grant plays to
- `<amount>` - Number of bonus plays (1-100)

**Examples:**
```
/grantplay @JohnDoe 1
/grantplay @JaneSmith 5
/grantplay @TopPlayer 10
```

**What happens:**
1. The specified user receives bonus plays immediately
2. These are added to their daily limit (2 + bonus)
3. The user gets a DM notification (if DMs are enabled)
4. The grant is announced in the channel

**Bonus Play Duration:**
- Bonus plays are valid **only for the current day**
- They expire at midnight (reset daily)
- Cannot be carried over to the next day

---

### 3. 🛑 Force Stop Games

**Purpose:** Forcefully terminate active games when needed.

**Command:**
```
/stopgame
```

**Options:**
- **Current Channel** - Stop the game in the current channel only
- **All Games** - Stop all active games across all channels

**When to use:**
- Game is stuck or frozen
- Player is unresponsive
- Bot maintenance or restart
- Emergency situations
- Resolving game conflicts
- Clearing channels before events

**What happens:**
1. Selected game(s) are immediately terminated
2. Game state is removed from memory
3. Channel receives stop notification
4. No stats are saved for stopped games

**Examples:**
```
Stop game in this channel:
/stopgame → Select "Current Channel"

Stop all games everywhere:
/stopgame → Select "All Games"
```

**Warning:**
- Stopped games cannot be resumed
- No data is saved (scores, progress lost)
- Use with caution!

---

## Use Cases

### 🏆 Event Prizes
```
Event winner gets 10 bonus plays!
/grantplay @Winner 10
```

### 🎉 Community Engagement
```
First person to reach level 50 gets 5 plays!
/grantplay @FirstToLevel50 5
```

### 🎂 Special Occasions
```
Birthday gift - 3 bonus plays!
/grantplay @BirthdayUser 3
```

### 🎯 Competition Rewards
```
Tournament champion receives 20 plays!
/grantplay @Champion 20
```

### 💎 VIP Rewards
```
Monthly top supporter gets 15 plays!
/grantplay @TopSupporter 15
```

---

## Admin Commands Reference

### `/config`
View game configuration and available admin commands.

**Access:** Admin only  
**Usage:** `/config`

### `/grantplay`
Grant bonus plays to a user.

**Access:** Admin only  
**Usage:** `/grantplay @user <amount>`  
**Parameters:**
- `@user` (required) - User to grant plays to
- `<amount>` (required) - Number of plays (1-100)

**Response:**
```
✅ Successfully granted 5 bonus plays to JohnDoe#1234!

They can now play 5 additional games today.
```

### `/stopgame`
Force stop active games.

**Access:** Admin only  
**Usage:** `/stopgame`  
**Options:**
- **Current Channel** - Stop game in current channel
- **All Games** - Stop all active games

**Response (Current Channel):**
```
🛑 Game Stopped

The game for Username in this channel has been force stopped by an admin.
```

**Response (All Games):**
```
🛑 All Games Stopped

5 active games have been force stopped by an admin.
```

---

## Tips for Admins

### 1. Set Up Rewards System
Create a rewards structure for your community:
- Daily challenges: 1-2 bonus plays
- Weekly events: 5 bonus plays
- Monthly tournaments: 10+ bonus plays

### 2. Track Granted Plays
Keep a log of who receives bonus plays and why:
```
📋 Bonus Plays Log
- JohnDoe: 5 plays (Event winner)
- JaneSmith: 3 plays (Community helper)
- TopPlayer: 10 plays (Tournament champion)
```

### 3. Announce Rewards
Make granting plays a public celebration:
```
🎉 Congratulations @Winner! 
You've earned 5 bonus Tower of Cash plays!
Use /play to start playing!
```

### 4. Be Fair and Consistent
- Apply the same criteria to all users
- Document your reward system
- Be transparent about how to earn bonus plays

### 5. Use Strategically
Bonus plays can:
- Increase server engagement
- Reward active community members
- Create excitement around events
- Incentivize participation

---

## Technical Details

### Database Storage
Bonus plays are stored in the `daily_plays` table:
```sql
user_id | play_date  | play_count | bonus_plays
--------|------------|------------|------------
123456  | 2025-11-17 | 2          | 5
```

### Daily Reset
- All play counts and bonus plays reset at midnight
- Admins maintain unlimited plays regardless
- Users start fresh with 2 plays + any new bonuses

### Admin Detection
The bot checks for admin status by:
1. Checking Discord Administrator permission
2. Looking for a role named "admin" (case-insensitive)

```javascript
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) || 
         member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
}
```

---

## FAQ

**Q: Can I grant plays to myself?**  
A: Yes, but as an admin you already have unlimited plays, so it's not necessary.

**Q: What's the maximum bonus plays I can grant?**  
A: 100 plays per grant command.

**Q: Can I grant plays multiple times to the same user?**  
A: Yes! Bonus plays stack. If you grant 5, then grant 3 more, they'll have 8 bonus plays.

**Q: Do bonus plays expire?**  
A: Yes, they reset at midnight along with regular daily plays.

**Q: Can non-admins see who granted the plays?**  
A: The grant message shows in the channel, but doesn't specify which admin granted them.

**Q: Can I revoke bonus plays?**  
A: Not currently supported. Be careful when granting!

**Q: What if a user already used their plays?**  
A: They can still use the bonus plays immediately.

---

## Best Practices

### ✅ Do:
- Use bonus plays as rewards and incentives
- Be consistent with your reward system
- Celebrate users publicly when granting plays
- Keep track of who you grant to and why
- Use reasonable amounts (1-20 plays)

### ❌ Don't:
- Grant plays without reason
- Create unfair advantages
- Grant excessive amounts (50+)
- Forget to announce in the community
- Use it as punishment (can't revoke)

---

## Example Reward System

### Daily Challenges (1-2 plays)
- First to play: 1 bonus play
- Reach certain score: 2 bonus plays
- Play during happy hour: 1 bonus play

### Weekly Events (3-5 plays)
- Week's highest score: 5 bonus plays
- Most games played: 3 bonus plays
- Best comeback: 3 bonus plays

### Monthly Tournaments (10-20 plays)
- 1st place: 20 bonus plays
- 2nd place: 15 bonus plays
- 3rd place: 10 bonus plays
- Participation: 5 bonus plays

### Special Occasions (varies)
- Birthday: 5 bonus plays
- Server anniversary: 10 bonus plays
- Milestone achievement: 5-10 bonus plays

---

**Happy gaming and rewarding! 🎮👑**
