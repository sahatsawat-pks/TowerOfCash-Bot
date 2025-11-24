# 🤖 Discord Bot Setup Guide - Tower of Cash

## Complete Step-by-Step Instructions

Follow these steps carefully to get your Tower of Cash bot up and running!

---

## 📋 Prerequisites

- Node.js installed (v16 or higher) - [Download here](https://nodejs.org/)
- A Discord account
- A Discord server where you have admin permissions

---

## 🎯 Step 1: Create a Discord Application

### 1.1 Go to Discord Developer Portal
- Visit: https://discord.com/developers/applications
- Log in with your Discord account

### 1.2 Create New Application
1. Click the **"New Application"** button (top right)
2. Enter a name for your bot (e.g., "Tower of Cash")
3. Accept the Terms of Service
4. Click **"Create"**

### 1.3 Copy Your Application ID
1. In the "General Information" tab
2. Find **"APPLICATION ID"**
3. Click **"Copy"** button
4. **Save this ID** - you'll need it later as `CLIENT_ID`

---

## 🤖 Step 2: Create the Bot User

### 2.1 Navigate to Bot Section
1. In the left sidebar, click **"Bot"**
2. Click **"Add Bot"** (if you don't see this, the bot is already created)
3. Click **"Yes, do it!"** to confirm

### 2.2 Configure Bot Settings
1. Scroll down to **"Privileged Gateway Intents"**
2. Enable these intents:
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**
3. Click **"Save Changes"** at the bottom

### 2.3 Copy Your Bot Token
1. Scroll to the top of the Bot page
2. Under the bot's username, find **"TOKEN"**
3. Click **"Reset Token"** (or "Copy" if visible)
4. Click **"Yes, do it!"** to confirm
5. **Copy the token** and save it somewhere safe
   - ⚠️ **IMPORTANT**: Never share this token publicly!
   - ⚠️ You can only see this token once. If you lose it, you'll need to regenerate it.

---

## 🔗 Step 3: Invite Bot to Your Server

### 3.1 Generate Invite URL
1. In the left sidebar, click **"OAuth2"**
2. Click **"URL Generator"**

### 3.2 Select Scopes
In the "SCOPES" section, check:
- ✅ `bot`
- ✅ `applications.commands`

### 3.3 Select Bot Permissions
In the "BOT PERMISSIONS" section, check:
- ✅ **Send Messages**
- ✅ **Send Messages in Threads**
- ✅ **Embed Links**
- ✅ **Attach Files**
- ✅ **Read Message History**
- ✅ **Use Slash Commands**
- ✅ **Add Reactions**

Or simply select: ✅ **Administrator** (for simplicity)

### 3.4 Invite the Bot
1. Scroll down and copy the **"GENERATED URL"**
2. Paste the URL in your browser
3. Select the server you want to add the bot to
4. Click **"Authorize"**
5. Complete the CAPTCHA
6. The bot should now appear in your server (offline)

---

## ⚙️ Step 4: Configure Your Bot Project

### 4.1 Create Environment File
In your project folder (`/Users/pks_aito/Documents/GitHub/TowerOfCash`), create a `.env` file:

```bash
cp .env.example .env
```

Or manually create a file named `.env` with this content:

```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
CLIENT_ID=YOUR_APPLICATION_ID_HERE
```

### 4.2 Add Your Credentials
Open `.env` and replace:
- `YOUR_BOT_TOKEN_HERE` → Paste the bot token from Step 2.3
- `YOUR_APPLICATION_ID_HERE` → Paste the application ID from Step 1.3

⚠️ **Security Note**: Never commit `.env` to git or share it publicly!

---

## 📦 Step 5: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

This will install:
- `discord.js` - Discord API library
- `sqlite3` - Database for storing game data
- `dotenv` - Environment variable management

Wait for the installation to complete (may take 1-2 minutes).

---

## 🚀 Step 6: Start Your Bot

### 6.1 Run the Bot
In your terminal, run:

```bash
npm start
```

### 6.2 Verify It's Working
You should see:
```
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
✅ Logged in as Tower of Cash#1234!
🎮 Tower of Cash bot is ready!
```

### 6.3 Check Discord
- Your bot should now show as **online** (green status) in your server
- The bot's status will change from offline to online

---

## 🎮 Step 7: Test the Bot

### 7.1 Use Slash Commands
In any text channel in your Discord server, type:
```
/play
```

The bot should respond with the game interface!

### 7.2 Try Other Commands
- `/help` - View instructions
- `/stats` - View your statistics
- `/leaderboard` - View top players

---

## 🐛 Troubleshooting

### ❌ Bot shows as offline
**Solutions:**
- Make sure the bot is running (terminal should show "Logged in as...")
- Check that your `DISCORD_TOKEN` in `.env` is correct
- Regenerate the token in Discord Developer Portal if needed

### ❌ Slash commands not appearing
**Solutions:**
- Wait 5-10 minutes for Discord to register commands
- Try typing `/` in the chat to see if commands appear
- Kick and re-invite the bot using the OAuth2 URL
- Restart the bot

### ❌ Bot crashes with "Invalid Token"
**Solutions:**
- Your token is incorrect or expired
- Go to Discord Developer Portal → Bot → Reset Token
- Copy the new token to your `.env` file
- Restart the bot

### ❌ "Message Content Intent" error
**Solutions:**
- Go to Discord Developer Portal → Bot
- Enable "MESSAGE CONTENT INTENT" under Privileged Gateway Intents
- Click "Save Changes"
- Restart the bot

### ❌ Commands work but bot doesn't respond
**Solutions:**
- Check bot permissions in your server
- Make sure bot has "Send Messages" and "Embed Links" permissions
- Check the terminal for error messages

### ❌ Database errors
**Solutions:**
- Delete `towerofcash.db` file
- Restart the bot (it will recreate the database)

---

## 🔄 Running in Production

### Option 1: Run in Background (Screen/Tmux)
```bash
# Using screen
screen -S towerofcash
npm start
# Press Ctrl+A, then D to detach

# Reattach later
screen -r towerofcash
```

### Option 2: Use PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name towerofcash

# Other PM2 commands
pm2 list          # View running processes
pm2 logs          # View logs
pm2 restart towerofcash
pm2 stop towerofcash
pm2 startup       # Auto-start on server reboot
```

### Option 3: Use a Hosting Service
- **Heroku**: https://www.heroku.com/
- **Railway**: https://railway.app/
- **Render**: https://render.com/
- **DigitalOcean**: https://www.digitalocean.com/

---

## 📝 Quick Reference

### Important Files
- `.env` - Your bot credentials (NEVER share this!)
- `config.json` - Game configuration (amounts, daily limits)
- `towerofcash.db` - Game database (auto-created)
- `index.js` - Main bot code

### Commands to Remember
```bash
npm install           # Install dependencies
npm start            # Start the bot
npm run dev          # Start with auto-restart (development)
node index.js        # Alternative way to start
```

### Environment Variables
```env
DISCORD_TOKEN=       # Your bot token from Discord Developer Portal
CLIENT_ID=           # Your application ID from Discord Developer Portal
```

---

## 🎨 Customization

### Change Daily Play Limit
Edit `config.json`:
```json
"maxPlaysPerDay": 5  // Change from 2 to 5
```

### Modify Game Amounts
Edit `config.json` → `gameAmounts` array to add/remove/modify amounts

### Change Floor Structure
Edit `config.json`:
```json
"roundFloors": [6, 5, 4, 3, 2, 1]  // Modify these numbers
```

---

## 🆘 Need More Help?

### Discord Developer Documentation
- https://discord.com/developers/docs/intro

### Discord.js Guide
- https://discordjs.guide/

### Common Issues
1. **Token Invalid**: Regenerate token in Discord Developer Portal
2. **Missing Permissions**: Check bot role permissions in server settings
3. **Commands Not Registering**: Wait 10 minutes or restart bot
4. **Database Locked**: Close any other instances of the bot

---

## ✅ Final Checklist

Before going live, make sure:
- [ ] Bot token is in `.env` file
- [ ] Client ID is in `.env` file
- [ ] Bot is invited to your server
- [ ] Privileged Gateway Intents are enabled
- [ ] `npm install` completed successfully
- [ ] Bot starts without errors
- [ ] `/play` command works
- [ ] `.env` file is in `.gitignore` (security)

---

## 🎉 You're Done!

Your Tower of Cash Discord bot is now ready! Players can start playing by typing `/play` in any channel.

**Have fun and good luck climbing the tower! 🏢💰**
