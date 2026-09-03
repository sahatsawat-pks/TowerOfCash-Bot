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
          last_new_year_gift DATE,
          PRIMARY KEY (user_id, guild_id)
        )
      `);

      // Migration: Add last_new_year_gift if it doesn't exist
      this.db.run("ALTER TABLE players ADD COLUMN last_new_year_gift DATE", (err) => {
        // Ignore error if column already exists
      });

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

      // Global stats (per server) for Big Bank mystery box and Skull Seeker
      this.db.run(`
        CREATE TABLE IF NOT EXISTS global_stats (
          guild_id TEXT PRIMARY KEY,
          total_money_lost INTEGER DEFAULT 0,
          skull_seeker_jackpot INTEGER DEFAULT 100000
        )
      `);

      // Mount Ca$hmore Stats (per server)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS mount_cashmore_stats (
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          total_games_played INTEGER DEFAULT 0,
          summit_victories INTEGER DEFAULT 0,
          risk_mode_wins INTEGER DEFAULT 0,
          highest_level_reached INTEGER DEFAULT 1,
          biggest_cash_out INTEGER DEFAULT 0,
          total_money_earned INTEGER DEFAULT 0,
          skull_seeker_wins INTEGER DEFAULT 0,
          times_hit_fatal_trap INTEGER DEFAULT 0,
          lives_lost INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, guild_id)
        )
      `);

      // One Egg Stats Table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS one_egg_stats (
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          games_played INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          golden_eggs_collected INTEGER DEFAULT 0,
          total_money_earned INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, guild_id)
        )
      `);
    });
  }

  // --- Mount Ca$hmore Stats Methods ---

  getMountCashmoreStats(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM mount_cashmore_stats WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null); // Return null if no stats found
        }
      );
    });
  }

  // Increment a specific stat
  incrementMountCashmoreStat(userId, guildId, statName, value = 1) {
    return new Promise((resolve, reject) => {
      // Validate stat name to prevent SQL injection
      const allowedStats = [
        'total_games_played', 'summit_victories', 'risk_mode_wins', 
        'skull_seeker_wins', 'times_hit_fatal_trap', 'lives_lost'
      ];
      if (!allowedStats.includes(statName)) {
        return reject(new Error(`Invalid stat name: ${statName}`));
      }

      this.db.run(
        `INSERT INTO mount_cashmore_stats (user_id, guild_id, ${statName}) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, guild_id) 
         DO UPDATE SET ${statName} = ${statName} + ?`,
        [userId, guildId, value, value],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Update a "Max" stat (only updates if new value is higher)
  updateMountCashmoreMaxStat(userId, guildId, statName, value) {
    return new Promise((resolve, reject) => {
      const allowedStats = ['highest_level_reached', 'biggest_cash_out'];
      if (!allowedStats.includes(statName)) {
        return reject(new Error(`Invalid stat name: ${statName}`));
      }

      this.db.run(
        `INSERT INTO mount_cashmore_stats (user_id, guild_id, ${statName}) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, guild_id) 
         DO UPDATE SET ${statName} = MAX(${statName}, ?)`,
        [userId, guildId, value, value],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Add money earned
  updateMountCashmoreMoney(userId, guildId, amount) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO mount_cashmore_stats (user_id, guild_id, total_money_earned) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, guild_id) 
         DO UPDATE SET total_money_earned = total_money_earned + ?`,
        [userId, guildId, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // One Egg Stats Methods
  getOneEggStats(userId, guildId) {
    return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM one_egg_stats WHERE user_id = ? AND guild_id = ?', [userId, guildId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
  }

  updateOneEggStats(userId, guildId, stats) {
    return new Promise((resolve, reject) => {
        this.getOneEggStats(userId, guildId).then(current => {
            current = current || { games_played: 0, wins: 0, golden_eggs_collected: 0, total_money_earned: 0 };
            
            const newGames = current.games_played + 1;
            const newWins = current.wins + (stats.won ? 1 : 0);
            const newGolden = current.golden_eggs_collected + (stats.goldenEggs || 0);
            const newMoney = current.total_money_earned + (stats.money || 0);
             
            this.db.run(`
                INSERT OR REPLACE INTO one_egg_stats (user_id, guild_id, games_played, wins, golden_eggs_collected, total_money_earned)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, guildId, newGames, newWins, newGolden, newMoney], (err) => {
                 if (err) reject(err);
                 else resolve();
            });
        }).catch(reject);
    });
  }

  // Add lost money to global stats
  addLostMoney(guildId, amount) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO global_stats (guild_id, total_money_lost) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET total_money_lost = total_money_lost + ?`,
        [guildId, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Get global lost money
  getGlobalLostMoney(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT total_money_lost FROM global_stats WHERE guild_id = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.total_money_lost : 0);
      });
    });
  }

  // Reset Big Bank to 0
  resetBigBank(guildId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE global_stats SET total_money_lost = 0 WHERE guild_id = ?',
        [guildId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Set Big Bank to specific amount
  setBigBank(guildId, amount) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO global_stats (guild_id, total_money_lost) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET total_money_lost = ?`,
        [guildId, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Add/subtract amount from Big Bank (can be positive or negative)
  addToBigBank(guildId, amount) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO global_stats (guild_id, total_money_lost) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET total_money_lost = total_money_lost + ?`,
        [guildId, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }



  // Get global Skull Seeker Jackpot
  getGlobalJackpot(guildId) {
    return new Promise((resolve, reject) => {
      // Ensure column exists first (migration)
      this.db.run("ALTER TABLE global_stats ADD COLUMN skull_seeker_jackpot INTEGER DEFAULT 100000", (err) => {
        // Find or init
        this.db.get('SELECT skull_seeker_jackpot FROM global_stats WHERE guild_id = ?', [guildId], (err, row) => {
          if (err) return reject(err);
          if (!row) {
            // Initialize if missing
            this.db.run('INSERT INTO global_stats (guild_id, total_money_lost, skull_seeker_jackpot) VALUES (?, 0, 100000)', [guildId], (err) => {
              if (err) return reject(err);
              resolve(100000);
            });
          } else {
            resolve(row.skull_seeker_jackpot);
          }
        });
      });
    });
  }

  // Update global Skull Seeker Jackpot
  updateGlobalJackpot(guildId, amount, isReset = false) {
    return new Promise((resolve, reject) => {
      if (isReset) {
        // Reset to base amount (usually 100,000)
        this.db.run(
          `INSERT INTO global_stats (guild_id, skull_seeker_jackpot) VALUES (?, ?)
           ON CONFLICT(guild_id) DO UPDATE SET skull_seeker_jackpot = ?`,
          [guildId, amount, amount],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      } else {
        // Add amount (increment)
        this.db.run(
          `INSERT INTO global_stats (guild_id, skull_seeker_jackpot) VALUES (?, ?)
           ON CONFLICT(guild_id) DO UPDATE SET skull_seeker_jackpot = skull_seeker_jackpot + ?`,
          [guildId, 100000 + amount, amount], // Default start + amount if new
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }
    });
  }

  // Reset guild progress (for Tower of cra$h mystery box item)
  resetGuildProgress(guildId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Reset all player stats for this guild
        this.db.run(
          'UPDATE players SET total_wins = 0, highest_score = 0, total_games = 0 WHERE guild_id = ?',
          [guildId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  // Helper function to get current date in GMT+7 timezone
  getTodayGMT7() {
    const now = new Date();
    // Add 7 hours (GMT+7 offset)
    const gmt7Time = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return gmt7Time.toISOString().split('T')[0];
  }

  // Helper function to get milliseconds until next GMT+7 midnight
  getTimeUntilNextResetGMT7() {
    const now = new Date();
    // Use the same offset as getTodayGMT7 to ensure alignment
    const gmt7Offset = 7 * 60 * 60 * 1000;
    const nowGMT7 = new Date(now.getTime() + gmt7Offset);
    
    // Set to end of day (next midnight)
    const endOfDayGMT7 = new Date(nowGMT7);
    endOfDayGMT7.setUTCHours(24, 0, 0, 0);
    
    // Calculate difference (milliseconds)
    return endOfDayGMT7 - nowGMT7;
  }

  // Add amount to player's highest_score (increments existing highest_score)
  addToPlayerHighScore(userId, guildId, amount, username = 'Player') {
    return new Promise((resolve, reject) => {
      // Insert row if missing, or update highest_score by adding amount
      this.db.run(
        `INSERT INTO players (user_id, guild_id, username, total_wins, highest_score, total_games, last_updated) 
         VALUES (?, ?, ?, 0, ?, 0, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, guild_id) DO UPDATE SET highest_score = highest_score + ?, last_updated = CURRENT_TIMESTAMP`,
        [userId, guildId, username, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Check if user can play today
  canPlayToday(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = this.getTodayGMT7();
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
      const today = this.getTodayGMT7();
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

  // Get current play count for today
  getPlayCount(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = this.getTodayGMT7();
      this.db.get(
        'SELECT play_count FROM daily_plays WHERE user_id = ? AND guild_id = ? AND play_date = ?',
        [userId, guildId, today],
        (err, row) => {
          if (err) return reject(err);
          resolve(row ? row.play_count : 0);
        }
      );
    });
  }

  // Increment play count
  incrementPlayCount(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = this.getTodayGMT7();
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
      const today = this.getTodayGMT7();
      this.db.run(
        `INSERT INTO daily_plays (user_id, guild_id, play_date, play_count, bonus_plays) 
         VALUES (?, ?, ?, 0, ?) 
         ON CONFLICT(user_id, guild_id, play_date) 
         DO UPDATE SET bonus_plays = COALESCE(bonus_plays, 0) + ?`,
        [userId, guildId, today, amount, amount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Modify high score (Admin command)
  modifyHighScore(userId, guildId, amount) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // First ensure user exists
        this.db.run(
          `INSERT OR IGNORE INTO players (user_id, guild_id, username, total_wins, highest_score, total_games)
           VALUES (?, ?, 'Unknown', 0, 0, 0)`,
          [userId, guildId],
          (err) => {
            if (err) return reject(err);

            // Then update score
            this.db.run(
              `UPDATE players 
               SET highest_score = MAX(0, highest_score + ?) 
               WHERE user_id = ? AND guild_id = ?`,
              [amount, userId, guildId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          }
        );
      });
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
        `SELECT user_id, username, highest_score, total_wins, total_games 
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

  // Deduct bail from player's leaderboard score (Go to Jail)
  deductBail(userId, guildId, amount = 5000000) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT highest_score FROM players WHERE user_id = ? AND guild_id = ?`,
        [userId, guildId],
        (err, row) => {
          if (err) return reject(err);
          const currentScore = row ? (row.highest_score || 0) : 0;
          const newScore = Math.max(0, currentScore - amount);
          const actualDeducted = currentScore - newScore;

          this.db.run(
            `UPDATE players SET highest_score = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ? AND guild_id = ?`,
            [newScore, userId, guildId],
            (updateErr) => {
              if (updateErr) return reject(updateErr);
              resolve({ oldScore: currentScore, newScore, deducted: actualDeducted });
            }
          );
        }
      );
    });
  }

  // Execute The Heist: 10% from every other player on the leaderboard
  executeTheHeist(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT user_id, username, highest_score FROM players WHERE guild_id = ? AND user_id != ? AND highest_score > 0`,
        [guildId, userId],
        async (err, rows) => {
          if (err) return reject(err);
          if (!rows || rows.length === 0) {
            return resolve({ totalStolen: 0, victimsCount: 0, victims: [] });
          }

          let totalStolen = 0;
          const victims = [];

          for (const player of rows) {
            const stolen = Math.floor(player.highest_score * 0.10);
            if (stolen > 0) {
              totalStolen += stolen;
              const newScore = player.highest_score - stolen;
              victims.push({ username: player.username, stolen, newScore });
              await new Promise((res) => {
                this.db.run(
                  `UPDATE players SET highest_score = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ? AND guild_id = ?`,
                  [newScore, player.user_id, guildId],
                  () => res()
                );
              });
            }
          }

          resolve({ totalStolen, victimsCount: victims.length, victims });
        }
      );
    });
  }

  // Update player username only
  updatePlayerUsername(userId, guildId, username) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE players 
         SET username = ?, last_updated = CURRENT_TIMESTAMP
         WHERE user_id = ? AND guild_id = ?`,
        [username, userId, guildId],
        (err) => {
          if (err) reject(err);
          else resolve();
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

  // Sum all high scores for a guild
  sumAllHighScores(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT SUM(highest_score) as total FROM players WHERE guild_id = ?',
        [guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.total || 0 : 0);
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

  setEventMode(guildId, mode) {
    return new Promise((resolve, reject) => {
      let val = 0;
      if (mode === 2 || mode === 'season2' || mode === '2') val = 2;
      else if (mode === 3 || mode === 'minigame_master' || mode === '3') val = 3;
      else if (mode === true || mode === 1 || mode === 'season1' || mode === '1' || mode === 'enable') val = 1;
      this.db.run(
        `INSERT INTO guild_settings (guild_id, event_mode) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET event_mode = ?`,
        [guildId, val, val],
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
        if (!row || row.event_mode === null || row.event_mode === undefined) return resolve(0);
        resolve(row.event_mode);
      });
    });
  }

  setGameOverMode(guildId, mode) {
    return new Promise((resolve, reject) => {
      // First ensure column exists (poor man's migration for sqlite)
      this.db.run("ALTER TABLE guild_settings ADD COLUMN game_over_mode TEXT DEFAULT 'normal'", (err) => {
        // Ignore error if column already exists
        this.db.run(
          `INSERT INTO guild_settings (guild_id, game_over_mode) VALUES (?, ?)
           ON CONFLICT(guild_id) DO UPDATE SET game_over_mode = ?`,
          [guildId, mode, mode],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  getGameOverMode(guildId) {
    return new Promise((resolve, reject) => {
      // First ensure column exists
      this.db.run("ALTER TABLE guild_settings ADD COLUMN game_over_mode TEXT DEFAULT 'normal'", (err) => {
        // Then query
        this.db.get('SELECT game_over_mode FROM guild_settings WHERE guild_id = ?', [guildId], (err, row) => {
          if (err) return reject(err);
          resolve(row && row.game_over_mode ? row.game_over_mode : 'normal');
        });
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

  // --- New Year Gift Methods ---

  // Check if user has claimed gift today
  checkNewYearGiftCooldown(userId, guildId) {
    return new Promise((resolve, reject) => {
      // Ensure column exists first (double check)
      this.db.run("ALTER TABLE players ADD COLUMN last_new_year_gift DATE", (err) => {
        const today = this.getTodayGMT7();
        this.db.get(
          'SELECT last_new_year_gift FROM players WHERE user_id = ? AND guild_id = ?',
          [userId, guildId],
          (err, row) => {
            if (err) return reject(err);
            
            // If no row found, they haven't claimed (or played at all)
            if (!row) return resolve(true);

            // If last_new_year_gift is not today, they can claim
            resolve(row.last_new_year_gift !== today);
          }
        );
      });
    });
  }

  // Claim New Year Gift (updates/sets date)
  claimNewYearGift(userId, guildId) {
    return new Promise((resolve, reject) => {
      const today = this.getTodayGMT7();
      // Update the date
      this.db.run(
        `UPDATE players SET last_new_year_gift = ? WHERE user_id = ? AND guild_id = ?`,
        [today, userId, guildId],
        (err) => {
          if (err) return reject(err);
          // Check if row existed (changes > 0). If not, we might need to insert.
          // But usually players exist if they invoke commands. 
          // If they don't exist, we should probably insert them.
          // Let's use INSERT OR IGNORE then UPDATE... essentially upsert logic but just for the date?
          // Actually, addToPlayerHighScore is usually called first to init player.
          // But to be safe:
          this.db.run(
            `INSERT INTO players (user_id, guild_id, username, last_new_year_gift) 
             VALUES (?, ?, 'Unknown', ?)
             ON CONFLICT(user_id, guild_id) DO UPDATE SET last_new_year_gift = ?`,
            [userId, guildId, today, today],
            (err) => {
               if (err) reject(err);
               else resolve();
            }
          );
        }
      );
    });
  }

  // Update high score directly (for New Year Gift effects)
  // Mode: 'add' (default), 'set', 'multiply'
  updateHighScoreDirectly(userId, guildId, amount, mode = 'add') {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Ensure player exists
        this.db.run(
            `INSERT OR IGNORE INTO players (user_id, guild_id, username, total_wins, highest_score, total_games)
             VALUES (?, ?, 'Unknown', 0, 0, 0)`,
            [userId, guildId],
            (err) => {
              if (err) return reject(err);

              let sql = '';
              let params = [];

              if (mode === 'add') {
                sql = `UPDATE players SET highest_score = MAX(0, highest_score + ?) WHERE user_id = ? AND guild_id = ?`;
                params = [amount, userId, guildId];
              } else if (mode === 'set') {
                sql = `UPDATE players SET highest_score = ? WHERE user_id = ? AND guild_id = ?`;
                params = [amount, userId, guildId];
              } else if (mode === 'multiply') {
                // Integer multiplication
                sql = `UPDATE players SET highest_score = CAST(highest_score * ? AS INTEGER) WHERE user_id = ? AND guild_id = ?`;
                params = [amount, userId, guildId];
              }

              this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
        );
      });
    });
  }

  // Get Top 3 scores (for "Beyond" effects)
  getTopThreeScores(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT highest_score FROM players WHERE guild_id = ? ORDER BY highest_score DESC LIMIT 3`,
        [guildId],
        (err, rows) => {
          if (err) return reject(err);
          // Return array of scores, pad with 0 if not enough players
          const scores = rows.map(r => r.highest_score);
          while (scores.length < 3) scores.push(0);
          resolve(scores);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
