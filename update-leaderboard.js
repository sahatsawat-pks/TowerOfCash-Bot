const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'towerofcash.db'));

// ⚠️ IMPORTANT: You need to fill in the actual Discord user IDs and guild ID
// To get user IDs: Right-click on users in Discord (with Developer Mode enabled) -> Copy ID
// To get guild ID: Right-click on your server icon -> Copy ID

// Leaderboard data to update
const leaderboardData = [
  {
    username: 'peemsuwitsakittaling',
    user_id: '900394061331070998', // ⚠️ REPLACE with actual Discord user ID
    highest_score: 14858350.00,
    total_wins: 1,
    total_games: 1
  },
  {
    username: 'supakorn_mhee',
    user_id: '488002283091525663', // ⚠️ REPLACE with actual Discord user ID
    highest_score: 12406223.00,
    total_wins: 1,
    total_games: 2
  },
  {
    username: 'phukkhombnkamioshi48',
    user_id: '436053225620242432', // ⚠️ REPLACE with actual Discord user ID
    highest_score: 0.00,
    total_wins: 0,
    total_games: 2
  },
  {
    username: 'nine5999',
    user_id: '954642463237230603', // ⚠️ REPLACE with actual Discord user ID
    highest_score: 0.00,
    total_wins: 0,
    total_games: 1
  },
  {
    username: 'phai_28293',
    user_id: '1135507189717536900', // ⚠️ REPLACE with actual Discord user ID
    highest_score: 0.00,
    total_wins: 0,
    total_games: 2
  }
];

// ⚠️ REPLACE with your actual Discord server (guild) ID
const GUILD_ID = '1242123657468317707';

console.log('🔄 Updating leaderboard data...\n');

db.serialize(() => {
  let completed = 0;
  
  leaderboardData.forEach((player, index) => {
    db.run(
      `INSERT INTO players (user_id, guild_id, username, total_wins, highest_score, total_games, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, guild_id) DO UPDATE SET
         username = ?,
         total_wins = ?,
         highest_score = ?,
         total_games = ?,
         last_updated = CURRENT_TIMESTAMP`,
      [
        player.user_id,
        GUILD_ID,
        player.username,
        player.total_wins,
        player.highest_score,
        player.total_games,
        player.username,
        player.total_wins,
        player.highest_score,
        player.total_games
      ],
      (err) => {
        if (err) {
          console.error(`❌ Error updating ${player.username}:`, err);
        } else {
          console.log(`✅ Updated ${player.username} - Score: $${player.highest_score.toLocaleString()}, Wins: ${player.total_wins}, Games: ${player.total_games}`);
        }
        
        completed++;
        if (completed === leaderboardData.length) {
          console.log('\n✅ Leaderboard update complete!');
          db.close();
        }
      }
    );
  });
});
