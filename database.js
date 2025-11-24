const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config.json');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'towerofcash.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Players table for leaderboard (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS players (
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          username TEXT NOT NULL,
          total_wins INTEGER DEFAULT 0,
          highest_score INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, guild_id)
        )
      `);

      // Daily plays tracking (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS daily_plays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          play_date DATE NOT NULL,
          play_count INTEGER DEFAULT 0,
          bonus_plays INTEGER DEFAULT 0,
          UNIQUE(user_id, guild_id, play_date)
        )
      `);

      // Game history (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS game_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          username TEXT NOT NULL,
          final_score INTEGER NOT NULL,
          floors_completed INTEGER NOT NULL,
          game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_reason TEXT NOT NULL
        )
      `);

      // Allowed channels table (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS allowed_channels (
          guild_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          PRIMARY KEY (guild_id, channel_id)
        )
      `);
      // Guild settings (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS guild_settings (
          guild_id TEXT PRIMARY KEY,
          day_limit INTEGER,
          event_mode INTEGER DEFAULT 0
        )
      `);
    });
  }

  // Check if user can play today
  canPlayToday(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      // Get guild-specific day limit if set
      this.db.get('SELECT day_limit FROM guild_settings WHERE guild_id = ?', [guildId], (err, settingRow) => {
        if (err) return reject(err);
        const guildLimit = settingRow && settingRow.day_limit ? settingRow.day_limit : config.maxPlaysPerDay || 2;

        this.db.get(
          'SELECT play_count, bonus_plays FROM daily_plays WHERE user_id = ? AND guild_id = ? AND play_date = ?',
          [userId, guildId, today],
          (err, row) => {
            if (err) return reject(err);
            const playCount = row ? row.play_count : 0;
            const bonusPlays = row ? row.bonus_plays : 0;
            const maxPlays = guildLimit + bonusPlays;
            resolve(playCount < maxPlays);
          }
        );
      });
    });
  }

  // Get remaining plays for today
  getRemainingPlays(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      // Respect guild day limit
      this.db.get('SELECT day_limit FROM guild_settings WHERE guild_id = ?', [guildId], (err, settingRow) => {
        if (err) return reject(err);
        const guildLimit = settingRow && settingRow.day_limit ? settingRow.day_limit : config.maxPlaysPerDay || 2;

        this.db.get(
          'SELECT play_count, bonus_plays FROM daily_plays WHERE user_id = ? AND guild_id = ? AND play_date = ?',
          [userId, guildId, today],
          (err, row) => {
            if (err) return reject(err);
            const playCount = row ? row.play_count : 0;
            const bonusPlays = row ? row.bonus_plays : 0;
            const maxPlays = guildLimit + bonusPlays;
            resolve(maxPlays - playCount);
          }
        );
      });
    });
  }

  // Increment play count
  incrementPlayCount(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      this.db.run(
        `INSERT INTO daily_plays (user_id, guild_id, play_date, play_count, bonus_plays) 
         VALUES (?, ?, ?, 1, 0) 
         ON CONFLICT(user_id, guild_id, play_date) 
         DO UPDATE SET play_count = play_count + 1`,
        [userId, guildId, today],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Add bonus plays to a user (admin only)
  addBonusPlays(userId, guildId, amount) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      this.db.run(
        `INSERT INTO daily_plays (user_id, guild_id, play_date, play_count, bonus_plays) 
         VALUES (?, ?, ?, 0, ?) 
         ON CONFLICT(user_id, guild_id, play_date) 
         DO UPDATE SET bonus_plays = bonus_plays + ?`,
        [userId, guildId, today, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Update player stats (auto-updates username)
  updatePlayerStats(userId, guildId, username, score, floorsCompleted, isWin) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Update or insert player (always updates username to current)
        this.db.run(
          `INSERT INTO players (user_id, guild_id, username, total_wins, highest_score, total_games)
           VALUES (?, ?, ?, ?, ?, 1)
           ON CONFLICT(user_id, guild_id) DO UPDATE SET
             username = ?,
             total_wins = total_wins + ?,
             highest_score = MAX(highest_score, ?),
             total_games = total_games + 1,
             last_updated = CURRENT_TIMESTAMP`,
          [userId, guildId, username, isWin ? 1 : 0, score, username, isWin ? 1 : 0, score],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  // Save game history
  saveGameHistory(userId, guildId, username, finalScore, floorsCompleted, endedReason) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO game_history (user_id, guild_id, username, final_score, floors_completed, ended_reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, guildId, username, finalScore, floorsCompleted, endedReason],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Get leaderboard (per server)
  getLeaderboard(guildId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT username, highest_score, total_wins, total_games 
         FROM players 
         WHERE guild_id = ?
         ORDER BY highest_score DESC, total_wins DESC 
         LIMIT ?`,
        [guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Get player stats (per server)
  getPlayerStats(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM players WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Reset all progress for a guild
  resetGuildProgress(guildId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM players WHERE guild_id = ?', [guildId]);
        this.db.run('DELETE FROM daily_plays WHERE guild_id = ?', [guildId]);
        this.db.run('DELETE FROM game_history WHERE guild_id = ?', [guildId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Archive leaderboard data and reset
  archiveAndResetGuild(guildId) {
    return new Promise((resolve, reject) => {
      // First, get the leaderboard data to return for archiving
      this.db.all(
        `SELECT username, highest_score, total_wins, total_games, last_updated 
         FROM players 
         WHERE guild_id = ?
         ORDER BY highest_score DESC, total_wins DESC`,
        [guildId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Then delete all data for this guild
          this.db.serialize(() => {
            this.db.run('DELETE FROM players WHERE guild_id = ?', [guildId]);
            this.db.run('DELETE FROM daily_plays WHERE guild_id = ?', [guildId]);
            this.db.run('DELETE FROM game_history WHERE guild_id = ?', [guildId], (err) => {
              if (err) reject(err);
              else resolve(rows); // Return the archived data
            });
          });
        }
      );
    });
  }

  // Add allowed channel
  addAllowedChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO allowed_channels (guild_id, channel_id) VALUES (?, ?)',
        [guildId, channelId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Remove allowed channel
  removeAllowedChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM allowed_channels WHERE guild_id = ? AND channel_id = ?',
        [guildId, channelId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Get all allowed channels for a guild
  getAllowedChannels(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT channel_id FROM allowed_channels WHERE guild_id = ?',
        [guildId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.channel_id));
        }
      );
    });
  }

  // Check if channel is allowed (returns true if no restrictions set or channel is allowed)
  isChannelAllowed(guildId, channelId) {
    return new Promise((resolve, reject) => {
      // First check if any channels are set for this guild
      this.db.get(
        'SELECT COUNT(*) as count FROM allowed_channels WHERE guild_id = ?',
        [guildId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          // If no channels are set, allow all channels
          if (row.count === 0) {
            resolve(true);
            return;
          }
          
          // If channels are set, check if this specific channel is allowed
          this.db.get(
            'SELECT channel_id FROM allowed_channels WHERE guild_id = ? AND channel_id = ?',
            [guildId, channelId],
            (err, row) => {
              if (err) reject(err);
              else resolve(!!row); // Convert to boolean
            }
          );
        }
      );
    });
  }

  // Guild settings helpers
  setDayLimit(guildId, limit) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO guild_settings (guild_id, day_limit) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET day_limit = ?`,
        [guildId, limit, limit],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getDayLimit(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT day_limit FROM guild_settings WHERE guild_id = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        if (!row || row.day_limit === null) return resolve(null);
        resolve(row.day_limit);
      });
    });
  }

  setEventMode(guildId, enabled) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO guild_settings (guild_id, event_mode) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET event_mode = ?`,
        [guildId, enabled ? 1 : 0, enabled ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getEventMode(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT event_mode FROM guild_settings WHERE guild_id = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        resolve(row && row.event_mode === 1);
      });
    });
  }

  // Recent plays (last N) for a user
  getRecentPlays(userId, guildId, limit = 5) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT final_score, game_date, ended_reason FROM game_history
         WHERE user_id = ? AND guild_id = ?
         ORDER BY game_date DESC
         LIMIT ?`,
        [userId, guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Top plays (highest final_score) for a user
  getTopPlays(userId, guildId, limit = 5) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT final_score, game_date, ended_reason FROM game_history
         WHERE user_id = ? AND guild_id = ?
         ORDER BY final_score DESC
         LIMIT ?`,
        [userId, guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
