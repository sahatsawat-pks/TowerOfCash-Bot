// Race To A Billion (RTAB) Database Module
// Separate database for RTAB statistics

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'racetoabillion.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    // Player statistics table
    db.run(`
    CREATE TABLE IF NOT EXISTS rtab_stats (
      user_id TEXT,
      guild_id TEXT,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      total_money_earned INTEGER DEFAULT 0,
      total_eliminations INTEGER DEFAULT 0,
      last_played INTEGER,
      PRIMARY KEY (user_id, guild_id)
    )
  `);

    // Game history table
    db.run(`
    CREATE TABLE IF NOT EXISTS rtab_history (
      game_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      winner_id TEXT,
      winner_name TEXT,
      win_condition TEXT,
      players TEXT,
      timestamp INTEGER
    )
  `);

    // Leaderboard view (virtual table)
    console.log('✅ RTAB Database initialized');
});

class RTABDatabase {
    // Get player stats
    static getPlayerStats(userId, guildId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM rtab_stats WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {
                        user_id: userId,
                        guild_id: guildId,
                        games_played: 0,
                        games_won: 0,
                        total_money_earned: 0,
                        total_eliminations: 0
                    });
                }
            );
        });
    }

    // Update player stats after game
    static async updatePlayerStats(userId, guildId, updates) {
        return new Promise((resolve, reject) => {
            const { won, moneyEarned, eliminations } = updates;

            db.run(`
        INSERT INTO rtab_stats (user_id, guild_id, games_played, games_won, total_money_earned, total_eliminations, last_played)
        VALUES (?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(user_id, guild_id)
        DO UPDATE SET
          games_played = games_played + 1,
          games_won = games_won + ?,
          total_money_earned = total_money_earned + ?,
          total_eliminations = total_eliminations + ?,
          last_played = ?
      `,
                [
                    userId, guildId, won ? 1 : 0, moneyEarned || 0, eliminations || 0, Date.now(),
                    won ? 1 : 0, moneyEarned || 0, eliminations || 0, Date.now()
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Save game history
    static saveGameHistory(guildId, winner, winCondition, players) {
        return new Promise((resolve, reject) => {
            db.run(`
        INSERT INTO rtab_history (guild_id, winner_id, winner_name, win_condition, players, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
                [
                    guildId,
                    winner.id,
                    winner.username,
                    winCondition,
                    JSON.stringify(players),
                    Date.now()
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Get leaderboard
    static getLeaderboard(guildId, limit = 10) {
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT user_id, games_played, games_won, total_money_earned, total_eliminations
        FROM rtab_stats
        WHERE guild_id = ?
        ORDER BY total_money_earned DESC
        LIMIT ?
      `,
                [guildId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Get total games played in guild
    static getTotalGames(guildId) {
        return new Promise((resolve, reject) => {
            db.get(`
        SELECT COUNT(*) as total
        FROM rtab_history
        WHERE guild_id = ?
      `,
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.total || 0);
                }
            );
        });
    }
}

module.exports = RTABDatabase;
