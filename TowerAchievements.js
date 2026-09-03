const fs = require('fs').promises;
const path = require('path');

/**
 * Achievement System for Tower of Cash
 * Based on RtaB Achievement.java structure
 * Uses bitflags for efficient storage (32 achievements per category max)
 */

const AchievementType = {
  MILESTONE: { name: 'MILESTONE', recordLocation: 2, color: '#FFD700' },
  EVENT: { name: 'EVENT', recordLocation: 3, color: '#FF6B9D' },
  MINIGAME: { name: 'MINIGAME', recordLocation: 4, color: '#4169E1' },
  GAME_OVER: { name: 'GAME_OVER', recordLocation: 5, color: '#FF4500' }
};

const ACHIEVEMENTS = {
  // MILESTONE ACHIEVEMENTS (0-31)
  FIRST_WIN: {
    id: 'FIRST_WIN',
    name: 'First Victory',
    description: 'Win your first game',
    type: AchievementType.MILESTONE,
    bitLocation: 0,
    emoji: '🎉'
  },
  MILLIONAIRE: {
    id: 'MILLIONAIRE',
    name: 'Millionaire',
    description: 'Earn $1,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 1,
    emoji: '💰'
  },
  MULTI_MILLIONAIRE: {
    id: 'MULTI_MILLIONAIRE',
    name: 'Multi-Millionaire',
    description: 'Earn $5,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 2,
    emoji: '💎'
  },
  MEGA_RICH: {
    id: 'MEGA_RICH',
    name: 'Mega Rich',
    description: 'Earn $10,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 3,
    emoji: '👑'
  },
  FLOOR_10: {
    id: 'FLOOR_10',
    name: 'Halfway There',
    description: 'Complete 10 floors in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 4,
    emoji: '🏢'
  },
  FLOOR_20: {
    id: 'FLOOR_20',
    name: 'Tower Climber',
    description: 'Complete 20 floors in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 5,
    emoji: '🗼'
  },
  PERFECT_FLOOR: {
    id: 'PERFECT_FLOOR',
    name: 'Perfect Floor',
    description: 'Complete a floor with 3 correct choices in a row',
    type: AchievementType.MILESTONE,
    bitLocation: 6,
    emoji: '⭐'
  },
  VETERAN: {
    id: 'VETERAN',
    name: 'Veteran Player',
    description: 'Play 100 games',
    type: AchievementType.MILESTONE,
    bitLocation: 7,
    emoji: '🎖️'
  },
  ULTRA_RICH: {
    id: 'ULTRA_RICH',
    name: 'Ultra Rich',
    description: 'Earn $100,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 8,
    emoji: '💵'
  },
  BILLIONAIRE: {
    id: 'BILLIONAIRE',
    name: 'Billionaire',
    description: 'Earn $1,000,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 9,
    emoji: '🏦'
  },
  MEGA_BILLIONAIRE: {
    id: 'MEGA_BILLIONAIRE',
    name: 'Mega Billionaire',
    description: 'Earn $10,000,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 10,
    emoji: '🌟'
  },
  ULTRA_BILLIONAIRE: {
    id: 'ULTRA_BILLIONAIRE',
    name: 'Ultra Billionaire',
    description: 'Earn $100,000,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 11,
    emoji: '⭐'
  },
  TRILLIONAIRE: {
    id: 'TRILLIONAIRE',
    name: 'Trillionaire',
    description: 'Earn $1,000,000,000,000 in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 12,
    emoji: '🌌'
  },
  MEGA_TRILLIONAIRE: {
    id: 'MEGA_TRILLIONAIRE',
    name: 'Mega Trillionaire',
    description: 'Reach $10,000,000,000,000 in Season 1 mode!',
    type: AchievementType.MILESTONE,
    bitLocation: 13,
    emoji: '🚀'
  },
  FLOOR_30: {
    id: 'FLOOR_30',
    name: 'Skyscraper Conqueror',
    description: 'Complete 30 floors in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 14,
    emoji: '🏙️'
  },
  FLOOR_40: {
    id: 'FLOOR_40',
    name: 'Cloud Breaker',
    description: 'Complete 40 floors in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 15,
    emoji: '☁️'
  },
  FLOOR_50: {
    id: 'FLOOR_50',
    name: 'Heaven Reacher',
    description: 'Complete 50 floors in a single game',
    type: AchievementType.MILESTONE,
    bitLocation: 16,
    emoji: '👼'
  },
  PERFECT_5_FLOORS: {
    id: 'PERFECT_5_FLOORS',
    name: 'Flawless Climber',
    description: 'Complete 5 floors with perfect choices',
    type: AchievementType.MILESTONE,
    bitLocation: 17,
    emoji: '✨'
  },
  GAMES_500: {
    id: 'GAMES_500',
    name: 'Dedicated Player',
    description: 'Play 500 games',
    type: AchievementType.MILESTONE,
    bitLocation: 18,
    emoji: '🏅'
  },
  GAMES_1000: {
    id: 'GAMES_1000',
    name: 'Legendary Player',
    description: 'Play 1000 games',
    type: AchievementType.MILESTONE,
    bitLocation: 19,
    emoji: '🏆'
  },
  ROUND_3_CHAMPION: {
    id: 'ROUND_3_CHAMPION',
    name: 'Round 3 Champion',
    description: 'Complete Round 3 without getting Game Over',
    type: AchievementType.MILESTONE,
    bitLocation: 20,
    emoji: '🎲'
  },

  // EVENT ACHIEVEMENTS (0-31)
  MART_ROBBER: {
    id: 'MART_ROBBER',
    name: 'Successful Heist',
    description: 'Successfully rob Mart-Of-Ca$h',
    type: AchievementType.EVENT,
    bitLocation: 0,
    emoji: '🦹'
  },
  MART_BUSTED: {
    id: 'MART_BUSTED',
    name: 'Caught Red-Handed',
    description: 'Get busted while robbing Mart-Of-Ca$h',
    type: AchievementType.EVENT,
    bitLocation: 1,
    emoji: '🚨'
  },
  BIG_SPENDER: {
    id: 'BIG_SPENDER',
    name: 'Big Spender',
    description: 'Spend over $1,000,000 at Mart-Of-Ca$h in one visit',
    type: AchievementType.EVENT,
    bitLocation: 2,
    emoji: '🛒'
  },
  SKULL_PICKER: {
    id: 'SKULL_PICKER',
    name: 'Unlucky Pick',
    description: 'Pick the Skull space in Mart-Of-Ca$h robbery',
    type: AchievementType.EVENT,
    bitLocation: 3,
    emoji: '💀'
  },
  BASEMENT_ESCAPE: {
    id: 'BASEMENT_ESCAPE',
    name: 'Basement Survivor',
    description: 'Win the Basement minigame negotiation',
    type: AchievementType.EVENT,
    bitLocation: 4,
    emoji: '🔓'
  },
  MYSTERY_BOX_LUCK: {
    id: 'MYSTERY_BOX_LUCK',
    name: 'Mystery Box Master',
    description: 'Get a legendary item from Mystery Box',
    type: AchievementType.EVENT,
    bitLocation: 5,
    emoji: '📦'
  },
  PEEK_MASTER: {
    id: 'PEEK_MASTER',
    name: 'Peek Master',
    description: 'Use 3 peeks in a single game',
    type: AchievementType.EVENT,
    bitLocation: 6,
    emoji: '👁️'
  },
  X_SURVIVOR: {
    id: 'X_SURVIVOR',
    name: 'X Survivor',
    description: 'Survive an X-Level with X-Protection',
    type: AchievementType.EVENT,
    bitLocation: 7,
    emoji: '🛡️'
  },
  MONEY_BAG_ROBBERY: {
    id: 'MONEY_BAG_ROBBERY',
    name: 'Money Bag Snatcher',
    description: 'Pick Money Bag (💰) space in Mart-Of-Ca$h robbery',
    type: AchievementType.EVENT,
    bitLocation: 8,
    emoji: '💰'
  },
  MONEY_BANK_ROBBERY: {
    id: 'MONEY_BANK_ROBBERY',
    name: 'Bank Heist',
    description: 'Pick Money Bank (🏦) space and win Mart-Of-Ca$h robbery',
    type: AchievementType.EVENT,
    bitLocation: 9,
    emoji: '🏦'
  },
  MART_SHOPPING_SPREE: {
    id: 'MART_SHOPPING_SPREE',
    name: 'Shopping Spree',
    description: 'Buy 5 different items at Mart-Of-Ca$h in one visit',
    type: AchievementType.EVENT,
    bitLocation: 10,
    emoji: '🛍️'
  },
  BIG_BANK_WINNER: {
    id: 'BIG_BANK_WINNER',
    name: 'Big Bank Jackpot',
    description: 'Win the Big Bank from a Mystery Box',
    type: AchievementType.EVENT,
    bitLocation: 11,
    emoji: '🏦'
  },
  PEEK_5_TIMES: {
    id: 'PEEK_5_TIMES',
    name: 'All-Seeing Eye',
    description: 'Use 5 peeks in a single game',
    type: AchievementType.EVENT,
    bitLocation: 12,
    emoji: '👀'
  },
  RANDOM_PERCENT_LUCKY: {
    id: 'RANDOM_PERCENT_LUCKY',
    name: 'Lucky Percentage',
    description: 'Get 150% from Random Percentage',
    type: AchievementType.EVENT,
    bitLocation: 13,
    emoji: '🍀'
  },
  FIVE_MINIGAMES: {
    id: 'FIVE_MINIGAMES',
    name: 'Minigame Marathon',
    description: 'Play 5 different minigames in one game',
    type: AchievementType.EVENT,
    bitLocation: 14,
    emoji: '🎮'
  },
  X_LEVEL_CLOSE_CALL: {
    id: 'X_LEVEL_CLOSE_CALL',
    name: 'Close Call',
    description: 'Survive X-Level with less than $100,000 remaining',
    type: AchievementType.EVENT,
    bitLocation: 15,
    emoji: '😰'
  },
  PEEK_MASTER_PRO: {
    id: 'PEEK_MASTER_PRO',
    name: 'Peek Pro',
    description: 'Use peek to avoid X-Level or Game Over',
    type: AchievementType.EVENT,
    bitLocation: 16,
    emoji: '🔍'
  },
  GOLDEN_TICKET_WINNER: {
    id: 'GOLDEN_TICKET_WINNER',
    name: 'Golden Ticket Winner',
    description: 'Win Golden Ticket from Mystery Box',
    type: AchievementType.EVENT,
    bitLocation: 17,
    emoji: '🎫'
  },
  VAULT_CRACKED: {
    id: 'VAULT_CRACKED',
    name: 'Master Cracker',
    description: 'Crack the safe code in The Vault',
    type: AchievementType.EVENT,
    bitLocation: 18,
    emoji: '🔐'
  },
  VAULT_MASTER: {
    id: 'VAULT_MASTER',
    name: 'One Shot Wonder',
    description: 'Crack the safe code on the first attempt',
    type: AchievementType.EVENT,
    bitLocation: 19,
    emoji: '⚡'
  },
  MEGA_GRID_JACKPOT: {
    id: 'MEGA_GRID_JACKPOT',
    name: 'Grid Master',
    description: 'Reach 10x multiplier in Mega Grid',
    type: AchievementType.EVENT,
    bitLocation: 20,
    emoji: '🔲'
  },
  MEGA_GRID_SAFE: {
    id: 'MEGA_GRID_SAFE',
    name: 'Mine Sweeper',
    description: 'Clear 10 tiles in Mega Grid without hitting a black tile',
    type: AchievementType.EVENT,
    bitLocation: 21,
    emoji: '🚩'
  },
  DOND_MILLIONAIRE: {
    id: 'DOND_MILLIONAIRE',
    name: 'Briefcase Millionaire',
    description: 'Win over $1,000,000 in Deal or No Deal',
    type: AchievementType.EVENT,
    bitLocation: 22,
    emoji: '💼'
  },
  DOND_BANKER_BEATER: {
    id: 'DOND_BANKER_BEATER',
    name: 'Smart Deal',
    description: 'Make a deal that is higher than your case value',
    type: AchievementType.EVENT,
    bitLocation: 23,
    emoji: '🧠'
  },
  RIDE_RAILS_JACKPOT: {
    id: 'RIDE_RAILS_JACKPOT',
    name: 'Rail Tycoon',
    description: 'Win the $3,000,000 Jackpot in Ride the Rails',
    type: AchievementType.EVENT,
    bitLocation: 24,
    emoji: '🚂'
  },
  RIDE_RAILS_CONDUCTOR: {
    id: 'RIDE_RAILS_CONDUCTOR',
    name: 'Conductor',
    description: 'Reach the $500,000 goal in Ride the Rails',
    type: AchievementType.EVENT,
    bitLocation: 25,
    emoji: '👮'
  },
  REMOVE_ZEROS_LUCKY: {
    id: 'REMOVE_ZEROS_LUCKY',
    name: 'Zero Hero',
    description: 'Remove 3 or more zeros from your money',
    type: AchievementType.EVENT,
    bitLocation: 26,
    emoji: '0️⃣'
  },
  BLAST_DIGIT_MAX: {
    id: 'BLAST_DIGIT_MAX',
    name: 'Maxed Out',
    description: 'Blast digits to become all 9s',
    type: AchievementType.EVENT,
    bitLocation: 27,
    emoji: '9️⃣'
  },

  // MINIGAME ACHIEVEMENTS (0-31) - Hard conditions
  BABUSHKA_PERFECT: {
    id: 'BABUSHKA_PERFECT',
    name: 'Babushka Master',
    description: 'Win $10,000,000 in Babushka Bonanza',
    type: AchievementType.MINIGAME,
    bitLocation: 0,
    emoji: '🪆'
  },
  BABUSHKA_RISKY: {
    id: 'BABUSHKA_RISKY',
    name: 'Risk Taker',
    description: 'Open 10 dolls with 2 strikes in Babushka',
    type: AchievementType.MINIGAME,
    bitLocation: 1,
    emoji: '🎲'
  },
  HIDEOUT_JACKPOT: {
    id: 'HIDEOUT_JACKPOT',
    name: 'Hideout Jackpot',
    description: 'Win the $1,000,000 jackpot in Hideout Breakthrough',
    type: AchievementType.MINIGAME,
    bitLocation: 2,
    emoji: '🏆'
  },
  HIDEOUT_MAXED: {
    id: 'HIDEOUT_MAXED',
    name: 'Number 12',
    description: 'Pick number 12 on the first pick in Hideout Breakthrough',
    type: AchievementType.MINIGAME,
    bitLocation: 3,
    emoji: '🔢'
  },
  DOOR_ESCAPE_TREASURE: {
    id: 'DOOR_ESCAPE_TREASURE',
    name: 'Treasure Hunter',
    description: 'Find the Treasure Escape door in Door Escape',
    type: AchievementType.MINIGAME,
    bitLocation: 4,
    emoji: '💎'
  },
  DOOR_ESCAPE_FATAL: {
    id: 'DOOR_ESCAPE_FATAL',
    name: 'Fatal Choice',
    description: 'Pick the Fatal Trap door in Door Escape',
    type: AchievementType.MINIGAME,
    bitLocation: 5,
    emoji: '⚰️'
  },
  DOOR_ESCAPE_SURVIVOR: {
    id: 'DOOR_ESCAPE_SURVIVOR',
    name: 'Door Escape Master',
    description: 'Complete 5 rounds in Door Escape',
    type: AchievementType.MINIGAME,
    bitLocation: 6,
    emoji: '🚪'
  },
  SIX_ZEROES_PERFECT: {
    id: 'SIX_ZEROES_PERFECT',
    name: 'Six Zeroes Champion',
    description: 'Find all 6 zeros in Six Zeroes minigame',
    type: AchievementType.MINIGAME,
    bitLocation: 7,
    emoji: '🎫'
  },
  COMMUNITY_CHEST_JACKPOT: {
    id: 'COMMUNITY_CHEST_JACKPOT',
    name: 'Community Jackpot',
    description: 'Win over $5,000,000 in Community Chest',
    type: AchievementType.MINIGAME,
    bitLocation: 8,
    emoji: '🎁'
  },
  BABUSHKA_NO_STRIKES: {
    id: 'BABUSHKA_NO_STRIKES',
    name: 'Babushka Perfectionist',
    description: 'Complete Babushka with 0 strikes and 10+ dolls opened',
    type: AchievementType.MINIGAME,
    bitLocation: 9,
    emoji: '💯'
  },
  HIDEOUT_FIRST_TRY: {
    id: 'HIDEOUT_FIRST_TRY',
    name: 'First Breakthrough',
    description: 'Play Hideout Breakthrough for the first time',
    type: AchievementType.MINIGAME,
    bitLocation: 10,
    emoji: '🎯'
  },
  DOOR_ESCAPE_10_ROUNDS: {
    id: 'DOOR_ESCAPE_10_ROUNDS',
    name: 'Endless Escape',
    description: 'Complete 10 rounds in Door Escape',
    type: AchievementType.MINIGAME,
    bitLocation: 11,
    emoji: '🚪'
  },
  SANGHA_BLESSING: {
    id: 'SANGHA_BLESSING',
    name: 'Divine Blessing',
    description: 'Receive Sangha Offerings and exit with all your money',
    type: AchievementType.EVENT,
    bitLocation: 12,
    emoji: '🙏'
  },
  COMMUNITY_CHEST_MEGA: {
    id: 'COMMUNITY_CHEST_MEGA',
    name: 'Community Mega Jackpot',
    description: 'Win over $10,000,000 in Community Chest',
    type: AchievementType.MINIGAME,
    bitLocation: 12,
    emoji: '🎊'
  },
  DOOR_ESCAPE_FULL_HEALTH: {
    id: 'DOOR_ESCAPE_FULL_HEALTH',
    name: 'Untouchable',
    description: 'Complete 5+ rounds in Door Escape with 100% health',
    type: AchievementType.MINIGAME,
    bitLocation: 13,
    emoji: '💪'
  },
  BASEMENT_PERFECT_DEAL: {
    id: 'BASEMENT_PERFECT_DEAL',
    name: 'Master Negotiator',
    description: 'Win Basement with over 90% of original money kept',
    type: AchievementType.MINIGAME,
    bitLocation: 14,
    emoji: '🤝'
  },
  GO_BIG_MONEY_HUNT: {
    id: 'GO_BIG_MONEY_HUNT',
    name: 'Money Hunter',
    description: 'Collect 5+ money spaces in Go Big or Go Broke',
    type: AchievementType.MINIGAME,
    bitLocation: 15,
    emoji: '💰'
  },
  GO_BIG_ALL_IN: {
    id: 'GO_BIG_ALL_IN',
    name: 'All In',
    description: 'Collect all 8 money spaces in Go Big or Go Broke',
    type: AchievementType.MINIGAME,
    bitLocation: 16,
    emoji: '🎰'
  },
  GO_BIG_BOMB_SQUAD: {
    id: 'GO_BIG_BOMB_SQUAD',
    name: 'Bomb Squad',
    description: 'Find all 4 bombs and win $1,000,000 jackpot',
    type: AchievementType.MINIGAME,
    bitLocation: 17,
    emoji: '💎'
  },
  GO_BIG_ONE_AND_DONE: {
    id: 'GO_BIG_ONE_AND_DONE',
    name: 'One and Done',
    description: 'Hit bomb on 2nd pick in Money Hunt mode',
    type: AchievementType.MINIGAME,
    bitLocation: 18,
    emoji: '💥'
  },
  GO_BIG_CLOSE_CALL: {
    id: 'GO_BIG_CLOSE_CALL',
    name: 'Close Call',
    description: 'Find 3 bombs then hit money in Bomb Hunt mode',
    type: AchievementType.MINIGAME,
    bitLocation: 19,
    emoji: '😰'
  },

  // HMIE Achievements
  HMIE_WINNER: {
    id: 'HMIE_WINNER',
    name: 'How Much Is Enough?',
    description: 'Win an HMIE game',
    type: AchievementType.MINIGAME,
    bitLocation: 20,
    emoji: '🏆'
  },
  HMIE_PERFECT_LOCK: {
    id: 'HMIE_PERFECT_LOCK',
    name: 'Perfect Timing',
    description: 'Lock in at exactly $1,000,000 in HMIE',
    type: AchievementType.MINIGAME,
    bitLocation: 21,
    emoji: '🎯'
  },
  HMIE_HIGH_ROLLER: {
    id: 'HMIE_HIGH_ROLLER',
    name: 'High Roller',
    description: 'Lock in over $5,000,000 in HMIE',
    type: AchievementType.MINIGAME,
    bitLocation: 22,
    emoji: '💎'
  },
  HMIE_UNDERDOG: {
    id: 'HMIE_UNDERDOG',
    name: 'Underdog Victory',
    description: 'Win HMIE with the lowest lock-in amount',
    type: AchievementType.MINIGAME,
    bitLocation: 23,
    emoji: '🥉'
  },

  // Mount Ca$hmore Achievements
  MOUNT_CASHMORE_SUMMIT: {
    id: 'MOUNT_CASHMORE_SUMMIT',
    name: 'Summit Conqueror',
    description: 'Reach the summit of Mount Ca$hmore (Level 9)',
    type: AchievementType.MINIGAME,
    bitLocation: 24,
    emoji: '🏔️'
  },
  MOUNT_CASHMORE_JACKPOT: {
    id: 'MOUNT_CASHMORE_JACKPOT',
    name: 'Jackpot Winner',
    description: 'Win the jackpot at Mount Ca$hmore summit',
    type: AchievementType.MINIGAME,
    bitLocation: 25,
    emoji: '💰'
  },
  MOUNT_CASHMORE_SKULL_SEEKER: {
    id: 'MOUNT_CASHMORE_SKULL_SEEKER',
    name: 'Skull Seeker Champion',
    description: 'Win Skull Seeker jackpot in Mount Ca$hmore',
    type: AchievementType.MINIGAME,
    bitLocation: 26,
    emoji: '🔍'
  },
  MOUNT_CASHMORE_LUCKY: {
    id: 'MOUNT_CASHMORE_LUCKY',
    name: 'Lucky Climber',
    description: 'Reach Level 7 without losing a life',
    type: AchievementType.MINIGAME,
    bitLocation: 27,
    emoji: '🍀'
  },
  MOUNT_CASHMORE_BIG_BANK: {
    id: 'MOUNT_CASHMORE_BIG_BANK',
    name: 'Big Bank Climber',
    description: 'Complete Mount Ca$hmore in Big Bank mode',
    type: AchievementType.MINIGAME,
    bitLocation: 28,
    emoji: '🏦'
  },
  MOUNT_CASHMORE_CASH_OUT: {
    id: 'MOUNT_CASHMORE_CASH_OUT',
    name: 'Strategic Exit',
    description: 'Cash out with over $50,000,000',
    type: AchievementType.MINIGAME,
    bitLocation: 29,
    emoji: '💵'
  },
  MOUNT_CASHMORE_RISK_MODE: {
    id: 'MOUNT_CASHMORE_RISK_MODE',
    name: 'Risk Taker Supreme',
    description: 'Win Mount Ca$hmore Level 9 in Climb Mode (x10 Jackpot)',
    type: AchievementType.MINIGAME,
    bitLocation: 30,
    emoji: '⚡'
  },
  SIX_ZEROES_NO_NOODLES: {
    id: 'SIX_ZEROES_NO_NOODLES',
    name: 'No Noodles',
    description: 'Get all 6 zeroes in Six Zeroes without picking any noodles',
    type: AchievementType.MINIGAME,
    bitLocation: 31,
    emoji: '🚫'
  },

  // GAME OVER ACHIEVEMENTS (0-31) - Special game over conditions
  WHAT_GAMEOVER: {
    id: 'WHAT_GAMEOVER',
    name: 'What Happened?',
    description: 'Get game over from buying What? at Mart-Of-Ca$h',
    type: AchievementType.GAME_OVER,
    bitLocation: 0,
    emoji: '❓'
  },
  BABUSHKA_STRIKE_OUT: {
    id: 'BABUSHKA_STRIKE_OUT',
    name: 'Three Strikes',
    description: 'Strike out in Babushka Bonanza',
    type: AchievementType.GAME_OVER,
    bitLocation: 1,
    emoji: '💔'
  },
  X_LEVEL_DEATH: {
    id: 'X_LEVEL_DEATH',
    name: 'Crossed Out',
    description: 'Get eliminated by X-Level',
    type: AchievementType.GAME_OVER,
    bitLocation: 2,
    emoji: '❌'
  },
  BASEMENT_FAILED: {
    id: 'BASEMENT_FAILED',
    name: 'Permanent Resident',
    description: 'Fail to escape the Basement',
    type: AchievementType.GAME_OVER,
    bitLocation: 3,
    emoji: '🔒'
  },
  DOOR_ESCAPE_DEATH: {
    id: 'DOOR_ESCAPE_DEATH',
    name: 'No Escape',
    description: 'Die from health reaching 0% in Door Escape',
    type: AchievementType.GAME_OVER,
    bitLocation: 4,
    emoji: '💀'
  },
  INSTANT_NOODLES: {
    id: 'INSTANT_NOODLES',
    name: 'Instant Regret',
    description: 'Get instant noodles without money in Six Zeroes',
    type: AchievementType.GAME_OVER,
    bitLocation: 5,
    emoji: '🍜'
  },
  BROKE_PLAYER: {
    id: 'BROKE_PLAYER',
    name: 'Completely Broke',
    description: 'End a game with exactly $0',
    type: AchievementType.GAME_OVER,
    bitLocation: 6,
    emoji: '💸'
  },
  FIRST_FLOOR_DEATH: {
    id: 'FIRST_FLOOR_DEATH',
    name: 'Quick Exit',
    description: 'Get game over on the first floor',
    type: AchievementType.GAME_OVER,
    bitLocation: 7,
    emoji: '⚡'
  },
  X_LEVEL_FIRST_PICK: {
    id: 'X_LEVEL_FIRST_PICK',
    name: 'Instant Elimination',
    description: 'Hit X-Level on your first pick of the floor',
    type: AchievementType.GAME_OVER,
    bitLocation: 8,
    emoji: '☠️'
  },
  MYSTERY_BOX_CURSE: {
    id: 'MYSTERY_BOX_CURSE',
    name: 'Cursed Box',
    description: 'Lose over 50% of money from a Mystery Box item',
    type: AchievementType.GAME_OVER,
    bitLocation: 9,
    emoji: '📦'
  },
  COMMERCIAL_TIMEOUT: {
    id: 'COMMERCIAL_TIMEOUT',
    name: 'Commercial Break',
    description: 'Run out of time during Commercial Break minigame',
    type: AchievementType.GAME_OVER,
    bitLocation: 10,
    emoji: '⏰'
  },
  GO_BIG_INSTANT_LOSS: {
    id: 'GO_BIG_INSTANT_LOSS',
    name: 'Go Broke',
    description: 'Hit bomb on first pick in Bomb Hunt mode for only $100k',
    type: AchievementType.GAME_OVER,
    bitLocation: 11,
    emoji: '💸'
  }
};

class TowerAchievements {
  constructor() {
    this.achievementsDir = path.join(__dirname, 'achievements');
    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.achievementsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create achievements directory:', error);
    }
  }

  /**
   * Get player's achievement record
   * Format: playerID#username#milestone#event#minigame#gameover
   */
  async getAchievementRecord(userId, guildId) {
    try {
      const filePath = path.join(this.achievementsDir, `guild_${guildId}.csv`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.split('#');
          if (parts[0] === userId) {
            return {
              userId: parts[0],
              username: parts[1] || 'Unknown',
              [AchievementType.MILESTONE.name]: parseInt(parts[2] || '0', 10) || 0,
              [AchievementType.EVENT.name]: parseInt(parts[3] || '0', 10) || 0,
              [AchievementType.MINIGAME.name]: parseInt(parts[4] || '0', 10) || 0,
              [AchievementType.GAME_OVER.name]: parseInt(parts[5] || '0', 10) || 0
            };
          }
        }
      } catch (error) {
        // File doesn't exist, create new record
      }

      // Return default record
      return {
        userId,
        username: 'Unknown',
        [AchievementType.MILESTONE.name]: 0,
        [AchievementType.EVENT.name]: 0,
        [AchievementType.MINIGAME.name]: 0,
        [AchievementType.GAME_OVER.name]: 0
      };
    } catch (error) {
      console.error('Failed to get achievement record:', error);
      return null;
    }
  }

  /**
   * Save player's achievement record
   */
  async saveAchievementRecord(record, guildId) {
    try {
      const filePath = path.join(this.achievementsDir, `guild_${guildId}.csv`);
      let lines = [];

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        lines = content.split('\n').filter(line => line.trim());
      } catch (error) {
        // File doesn't exist yet
      }

      // Format: playerID#username#milestone#event#minigame#gameover
      const newLine = `${record.userId}#${record.username}#${record.MILESTONE}#${record.EVENT}#${record.MINIGAME}#${record.GAME_OVER}`;
      
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('#');
        if (parts[0] === record.userId) {
          lines[i] = newLine;
          found = true;
          break;
        }
      }

      if (!found) {
        lines.push(newLine);
      }

      await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save achievement record:', error);
      return false;
    }
  }

  /**
   * Check if player has an achievement
   */
  hasAchievement(record, achievement) {
    const flags = record[achievement.type.name];
    return (flags >>> achievement.bitLocation) % 2 === 1;
  }

  /**
   * Validate achievement data before archiving
   * @param {string} achievementId - Achievement ID to validate
   * @param {Object} validationData - Data to validate against achievement criteria
   * @returns {Object} - { valid: boolean, reason: string, achievement: Object }
   */
  validateAchievement(achievementId, validationData = {}) {
    const achievement = ACHIEVEMENTS[achievementId];
    
    if (!achievement) {
      return {
        valid: false,
        reason: `Achievement ${achievementId} does not exist`,
        achievement: null
      };
    }

    // Validate achievement structure
    if (!achievement.id || !achievement.name || !achievement.description) {
      return {
        valid: false,
        reason: `Achievement ${achievementId} has invalid structure`,
        achievement
      };
    }

    if (typeof achievement.bitLocation !== 'number' || achievement.bitLocation < 0 || achievement.bitLocation > 31) {
      return {
        valid: false,
        reason: `Achievement ${achievementId} has invalid bitLocation (must be 0-31)`,
        achievement
      };
    }

    if (!achievement.type || !achievement.type.name) {
      return {
        valid: false,
        reason: `Achievement ${achievementId} has invalid type`,
        achievement
      };
    }

    // Validate specific achievement criteria if validation data provided
    if (validationData && Object.keys(validationData).length > 0) {
      const criteriaCheck = this.validateCriteria(achievementId, validationData);
      if (!criteriaCheck.valid) {
        return criteriaCheck;
      }
    }

    return {
      valid: true,
      reason: 'Achievement is valid',
      achievement
    };
  }

  /**
   * Validate if achievement criteria are met
   * @param {string} achievementId - Achievement ID
   * @param {Object} data - Game data to validate (money, floor, etc.)
   * @returns {Object} - { valid: boolean, reason: string }
   */
  validateCriteria(achievementId, data) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
      return { valid: false, reason: 'Achievement not found' };
    }

    // Money-based achievements
    if (achievementId === 'MILLIONAIRE' && data.money < 1000000) {
      return { valid: false, reason: `Money ${data.money} is below $1,000,000 threshold` };
    }
    if (achievementId === 'MULTI_MILLIONAIRE' && data.money < 5000000) {
      return { valid: false, reason: `Money ${data.money} is below $5,000,000 threshold` };
    }
    if (achievementId === 'MEGA_RICH' && data.money < 10000000) {
      return { valid: false, reason: `Money ${data.money} is below $10,000,000 threshold` };
    }
    if (achievementId === 'ULTRA_RICH' && data.money < 100000000) {
      return { valid: false, reason: `Money ${data.money} is below $100,000,000 threshold` };
    }
    if (achievementId === 'BILLIONAIRE' && data.money < 1000000000) {
      return { valid: false, reason: `Money ${data.money} is below $1,000,000,000 threshold` };
    }
    if (achievementId === 'MEGA_BILLIONAIRE' && data.money < 5000000000) {
      return { valid: false, reason: `Money ${data.money} is below $5,000,000,000 threshold` };
    }
    if (achievementId === 'ULTRA_BILLIONAIRE' && data.money < 10000000000) {
      return { valid: false, reason: `Money ${data.money} is below $10,000,000,000 threshold` };
    }
    if (achievementId === 'TRILLIONAIRE' && data.money < 1000000000000) {
      return { valid: false, reason: `Money ${data.money} is below $1,000,000,000,000 threshold` };
    }
    if (achievementId === 'MEGA_TRILLIONAIRE' && data.money < 5000000000000) {
      return { valid: false, reason: `Money ${data.money} is below $5,000,000,000,000 threshold` };
    }
    if (achievementId === 'ULTRA_TRILLIONAIRE' && data.money < 10000000000000) {
      return { valid: false, reason: `Money ${data.money} is below $10,000,000,000,000 threshold` };
    }

    // Floor-based achievements
    if (achievementId === 'FLOOR_10' && data.floor < 10) {
      return { valid: false, reason: `Floor ${data.floor} is below floor 10 threshold` };
    }
    if (achievementId === 'FLOOR_20' && data.floor < 20) {
      return { valid: false, reason: `Floor ${data.floor} is below floor 20 threshold` };
    }
    if (achievementId === 'FLOOR_30' && data.floor < 30) {
      return { valid: false, reason: `Floor ${data.floor} is below floor 30 threshold` };
    }
    if (achievementId === 'FLOOR_40' && data.floor < 40) {
      return { valid: false, reason: `Floor ${data.floor} is below floor 40 threshold` };
    }
    if (achievementId === 'FLOOR_50' && data.floor < 50) {
      return { valid: false, reason: `Floor ${data.floor} is below floor 50 threshold` };
    }

    // Minigame achievements
    if (achievementId === 'BABUSHKA_PERFECT' && data.babushkaWinnings < 10000000) {
      return { valid: false, reason: `Babushka winnings ${data.babushkaWinnings} below $10,000,000` };
    }
    if (achievementId === 'HIDEOUT_JACKPOT' && data.hideoutJackpot !== true) {
      return { valid: false, reason: 'Did not win Hideout jackpot' };
    }
    if (achievementId === 'COMMUNITY_CHEST_JACKPOT' && data.communityChestWinnings < 5000000) {
      return { valid: false, reason: `Community Chest winnings ${data.communityChestWinnings} below $5,000,000` };
    }
    if (achievementId === 'COMMUNITY_CHEST_MEGA' && data.communityChestWinnings < 10000000) {
      return { valid: false, reason: `Community Chest winnings ${data.communityChestWinnings} below $10,000,000` };
    }

    // Special condition achievements
    if (achievementId === 'PERFECT_FLOOR' && data.consecutiveCorrect < 3) {
      return { valid: false, reason: `Only ${data.consecutiveCorrect} consecutive correct, need 3` };
    }
    if (achievementId === 'VETERAN' && data.gamesPlayed < 100) {
      return { valid: false, reason: `Only ${data.gamesPlayed} games played, need 100` };
    }

    // All criteria met
    return { valid: true, reason: 'Criteria validated' };
  }

  /**
   * Award achievement to player with validation
   */
  async awardAchievement(achievementId, userId, username, guildId, channel = null, validationData = null) {
    try {
      // First validate the achievement exists and has valid structure
      const validation = this.validateAchievement(achievementId, validationData);
      
      if (!validation.valid) {
        console.error(`Achievement validation failed for ${achievementId}: ${validation.reason}`);
        return false;
      }

      const achievement = validation.achievement;
      const record = await this.getAchievementRecord(userId, guildId);
      
      if (!record) {
        console.error(`Failed to get achievement record for user ${userId}`);
        return false;
      }

      // Update username
      record.username = username;

      // Check if already has achievement
      if (this.hasAchievement(record, achievement)) {
        return false; // Already has it
      }

      // Award achievement by flipping the bit
      const typeName = achievement.type.name;
      record[typeName] += (1 << achievement.bitLocation);

      // Validate the record before saving (detailed errors logged in validateRecord)
      if (!this.validateRecord(record)) {
        return false;
      }

      // Save record with validation
      const saved = await this.saveAchievementRecord(record, guildId);
      if (!saved) {
        console.error(`Failed to save achievement record for ${achievementId}`);
        return false;
      }

      // Log achievement award for archival
      await this.logAchievementAward(userId, username, achievement, guildId, validationData);

      // Send notification if channel provided
      if (channel) {
        await channel.send(
          `${achievement.emoji} **${username}** earned a new achievement: **${achievement.name}**!\n` +
          `*${achievement.description}*`
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to award achievement:', error);
      return false;
    }
  }

  /**
   * Validate record structure before saving
   */
  validateRecord(record) {
    if (!record.userId || !record.username) {
      console.error(`Invalid record: missing userId (${record.userId}) or username (${record.username})`);
      return false;
    }

    // Validate each category bitflag is a valid number
    for (const type of Object.values(AchievementType)) {
      const value = record[type.name];
      // Allow negative values (signed 32-bit integers usage for bit 31)
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        console.error(`Invalid record for user ${record.userId}: ${type.name} is not a valid integer (value: ${value}, type: ${typeof value})`);
        return false;
      }
    }

    return true;
  }

  /**
   * Remove achievement from a player (admin command)
   */
  async removeAchievement(achievementId, userId, guildId) {
    try {
      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) {
        console.error(`Achievement ${achievementId} not found`);
        return false;
      }

      const record = await this.getAchievementRecord(userId, guildId);
      if (!record) {
        return false; // Player doesn't have any achievements
      }

      // Check if player has this achievement
      if (!this.hasAchievement(record, achievement)) {
        return false; // Player doesn't have this achievement
      }

      // Remove the bit flag
      const category = achievement.type.name;
      record[category] &= ~(1 << achievement.bitLocation);

      // Save updated record
      await this.saveAchievementRecord(record, guildId);

      // Log removal
      const logPath = path.join(this.achievementsDir, `guild_${guildId}_log.txt`);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] REMOVED: ${userId} lost "${achievement.name}" (${achievement.id})\n`;
      await fs.appendFile(logPath, logEntry, 'utf-8');

      return true;
    } catch (error) {
      console.error('Failed to remove achievement:', error);
      return false;
    }
  }

  /**
   * Log achievement award to archive file
   */
  async logAchievementAward(userId, username, achievement, guildId, validationData) {
    try {
      const logPath = path.join(this.achievementsDir, `guild_${guildId}_log.txt`);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${userId} (${username}) earned "${achievement.name}" (${achievement.id}) - ${achievement.description}`;
      
      let logData = logEntry;
      if (validationData) {
        logData += ` | Data: ${JSON.stringify(validationData)}`;
      }
      logData += '\n';

      await fs.appendFile(logPath, logData, 'utf-8');
    } catch (error) {
      console.error('Failed to log achievement award:', error);
    }
  }

  /**
   * Get all achievements for a player
   */
  async getPlayerAchievements(userId, guildId) {
    const record = await this.getAchievementRecord(userId, guildId);
    if (!record) return [];

    const earned = [];
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (this.hasAchievement(record, achievement)) {
        earned.push({
          id,
          ...achievement
        });
      }
    }

    return earned;
  }

  /**
   * Get achievement progress for a player
   */
  async getPlayerProgress(userId, guildId) {
    const record = await this.getAchievementRecord(userId, guildId);
    if (!record) return { total: 0, earned: 0, percentage: 0 };

    let earned = 0;
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      if (this.hasAchievement(record, achievement)) {
        earned++;
      }
    }

    const total = Object.keys(ACHIEVEMENTS).length;
    const percentage = Math.round((earned / total) * 100);

    return { total, earned, percentage };
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category) {
    return Object.entries(ACHIEVEMENTS)
      .filter(([_, achievement]) => achievement.type.name === category)
      .map(([id, achievement]) => ({ id, ...achievement }));
  }

  /**
   * Get achievement archive log for a player
   */
  async getPlayerAchievementLog(userId, guildId) {
    try {
      const logPath = path.join(this.achievementsDir, `guild_${guildId}_log.txt`);
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.includes(userId));
      
      return lines.map(line => {
        const match = line.match(/\[(.*?)\] (.*?) \((.*?)\) earned "(.*?)" \((.*?)\) - (.*?)(?:\s*\|\s*Data:\s*(.*))?$/);
        if (match) {
          return {
            timestamp: match[1],
            userId: match[2],
            username: match[3],
            achievementName: match[4],
            achievementId: match[5],
            description: match[6],
            validationData: match[7] ? JSON.parse(match[7]) : null
          };
        }
        return null;
      }).filter(entry => entry !== null);
    } catch (error) {
      console.error('Failed to get achievement log:', error);
      return [];
    }
  }

  /**
   * Verify all archived achievements for a player
   * Returns list of any inconsistencies found
   */
  async verifyPlayerAchievements(userId, guildId) {
    try {
      const record = await this.getAchievementRecord(userId, guildId);
      if (!record) {
        return { valid: false, errors: ['Player record not found'] };
      }

      const errors = [];
      const warnings = [];

      // Verify record structure
      if (!this.validateRecord(record)) {
        errors.push('Invalid record structure');
      }

      // Verify each earned achievement
      const earnedAchievements = await this.getPlayerAchievements(userId, guildId);
      
      for (const achievement of earnedAchievements) {
        // Verify achievement exists in master list
        if (!ACHIEVEMENTS[achievement.id]) {
          errors.push(`Achievement ${achievement.id} not found in master list`);
          continue;
        }

        // Verify bitLocation is correct
        const masterAchievement = ACHIEVEMENTS[achievement.id];
        if (achievement.bitLocation !== masterAchievement.bitLocation) {
          errors.push(`Achievement ${achievement.id} has mismatched bitLocation`);
        }

        // Verify type is correct
        if (achievement.type.name !== masterAchievement.type.name) {
          errors.push(`Achievement ${achievement.id} has mismatched type`);
        }

        // Verify the bit is actually set
        if (!this.hasAchievement(record, masterAchievement)) {
          errors.push(`Achievement ${achievement.id} appears in list but bit not set`);
        }
      }

      // Check for duplicate achievements (impossible with bitflags but verify)
      const achievementIds = earnedAchievements.map(a => a.id);
      const uniqueIds = new Set(achievementIds);
      if (achievementIds.length !== uniqueIds.size) {
        warnings.push('Duplicate achievements detected in earned list');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        totalEarned: earnedAchievements.length,
        record
      };
    } catch (error) {
      console.error('Failed to verify achievements:', error);
      return { valid: false, errors: ['Verification failed: ' + error.message] };
    }
  }

  /**
   * Automatic achievement checker - checks all possible achievements based on game state
   * Call this at key moments: after each floor, at game end, after minigames, etc.
   * @param {Object} game - Game state object with achievementTracking
   * @param {Object} interaction - Discord interaction for notifications
   * @param {string} eventType - Type of event: 'floor_complete', 'game_end', 'minigame_end', etc.
   */
  async checkAndAwardAchievements(game, interaction, eventType = 'check') {
    const awarded = [];
    const tracking = game.achievementTracking || {};
    
    try {
      // MILESTONE ACHIEVEMENTS
      
      // Perfect floor - 3 consecutive correct picks
      if (tracking.consecutiveCorrectPicks >= 3 && eventType === 'floor_complete') {
        const result = await this.awardAchievement(
          'PERFECT_FLOOR',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { consecutiveCorrect: tracking.consecutiveCorrectPicks }
        );
        if (result) awarded.push('PERFECT_FLOOR');
      }
      
      // Perfect 5 floors
      if (tracking.perfectFloorsCount >= 5) {
        const result = await this.awardAchievement(
          'PERFECT_5_FLOORS',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { perfectFloors: tracking.perfectFloorsCount }
        );
        if (result) awarded.push('PERFECT_5_FLOORS');
      }
      
      // Veteran - check total games from database
      if (eventType === 'game_end') {
        const db = require('./database');
        const stats = await db.getPlayerStats(game.userId, game.guildId);
        if (stats && stats.gamesPlayed >= 100) {
          const result = await this.awardAchievement(
            'VETERAN',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { gamesPlayed: stats.gamesPlayed }
          );
          if (result) awarded.push('VETERAN');
        }
        if (stats && stats.gamesPlayed >= 500) {
          const result = await this.awardAchievement(
            'GAMES_500',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { gamesPlayed: stats.gamesPlayed }
          );
          if (result) awarded.push('GAMES_500');
        }
        if (stats && stats.gamesPlayed >= 1000) {
          const result = await this.awardAchievement(
            'GAMES_1000',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { gamesPlayed: stats.gamesPlayed }
          );
          if (result) awarded.push('GAMES_1000');
        }
      }
      
      // EVENT ACHIEVEMENTS
      
      // Peek Master - 3 peeks
      if (tracking.peeksUsed >= 3) {
        const result = await this.awardAchievement(
          'PEEK_MASTER',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { peeksUsed: tracking.peeksUsed }
        );
        if (result) awarded.push('PEEK_MASTER');
      }
      
      // All-Seeing Eye - 5 peeks
      if (tracking.peeksUsed >= 5) {
        const result = await this.awardAchievement(
          'PEEK_5_TIMES',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { peeksUsed: tracking.peeksUsed }
        );
        if (result) awarded.push('PEEK_5_TIMES');
      }
      
      // Big Spender - $1M spent at Mart
      if (tracking.martTotalSpent >= 1000000) {
        const result = await this.awardAchievement(
          'BIG_SPENDER',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { spent: tracking.martTotalSpent }
        );
        if (result) awarded.push('BIG_SPENDER');
      }
      
      // Shopping Spree - 5 different items
      if (tracking.martItemsBought && tracking.martItemsBought.length >= 5) {
        const result = await this.awardAchievement(
          'MART_SHOPPING_SPREE',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { itemsBought: tracking.martItemsBought.length }
        );
        if (result) awarded.push('MART_SHOPPING_SPREE');
      }
      
      // X Survivor
      if (tracking.xLevelsSurvived > 0) {
        const result = await this.awardAchievement(
          'X_SURVIVOR',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { survived: tracking.xLevelsSurvived }
        );
        if (result) awarded.push('X_SURVIVOR');
      }
      
      // X-Level Close Call
      if (tracking.xLevelsSurvived > 0 && game.totalMoney < 100000) {
        const result = await this.awardAchievement(
          'X_LEVEL_CLOSE_CALL',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { money: game.totalMoney }
        );
        if (result) awarded.push('X_LEVEL_CLOSE_CALL');
      }
      
      // Lucky Percentage - 150% from Random %
      if (tracking.randomPercentResult >= 150) {
        const result = await this.awardAchievement(
          'RANDOM_PERCENT_LUCKY',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { percentage: tracking.randomPercentResult }
        );
        if (result) awarded.push('RANDOM_PERCENT_LUCKY');
      }
      
      // Minigame Marathon - 5 different minigames
      if (tracking.minigamesPlayed && tracking.minigamesPlayed.length >= 5) {
        const result = await this.awardAchievement(
          'FIVE_MINIGAMES',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { minigames: tracking.minigamesPlayed.length }
        );
        if (result) awarded.push('FIVE_MINIGAMES');
      }
      
      // Mystery Box achievements
      if (tracking.mysteryBoxStats) {
        if (tracking.mysteryBoxStats.legendaryReceived) {
          const result = await this.awardAchievement(
            'MYSTERY_BOX_LUCK',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { legendary: true }
          );
          if (result) awarded.push('MYSTERY_BOX_LUCK');
        }
        
        if (tracking.mysteryBoxStats.bigBankWon) {
          const result = await this.awardAchievement(
            'BIG_BANK_WINNER',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { bigBank: true }
          );
          if (result) awarded.push('BIG_BANK_WINNER');
        }
      }
      
      // MINIGAME ACHIEVEMENTS
      
      // Babushka achievements
      if (tracking.babushkaStats && eventType === 'minigame_end') {
        if (tracking.babushkaStats.winnings >= 10000000) {
          const result = await this.awardAchievement(
            'BABUSHKA_PERFECT',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { babushkaWinnings: tracking.babushkaStats.winnings }
          );
          if (result) awarded.push('BABUSHKA_PERFECT');
        }
        
        if (tracking.babushkaStats.dollsOpened >= 10 && tracking.babushkaStats.strikes === 2) {
          const result = await this.awardAchievement(
            'BABUSHKA_RISKY',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { dollsOpened: tracking.babushkaStats.dollsOpened, strikes: 2 }
          );
          if (result) awarded.push('BABUSHKA_RISKY');
        }
        
        if (tracking.babushkaStats.strikes === 0 && tracking.babushkaStats.dollsOpened >= 10) {
          const result = await this.awardAchievement(
            'BABUSHKA_NO_STRIKES',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { dollsOpened: tracking.babushkaStats.dollsOpened, strikes: 0 }
          );
          if (result) awarded.push('BABUSHKA_NO_STRIKES');
        }
      }
      
      // Hideout achievements
      if (tracking.hideoutStats && eventType === 'minigame_end') {
        if (tracking.hideoutStats.jackpotWon) {
          const result = await this.awardAchievement(
            'HIDEOUT_JACKPOT',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { hideoutJackpot: true }
          );
          if (result) awarded.push('HIDEOUT_JACKPOT');
        }
        
        if (tracking.hideoutStats.firstPickWas12) {
          const result = await this.awardAchievement(
            'HIDEOUT_MAXED',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { firstPick12: true }
          );
          if (result) awarded.push('HIDEOUT_MAXED');
        }
        
        // Award HIDEOUT_FIRST_TRY only if player doesn't have it yet (truly first time playing)
        const hasFirstTry = await this.hasAchievement(game.userId, game.guildId, 'HIDEOUT_FIRST_TRY');
        if (!hasFirstTry) {
          const result = await this.awardAchievement(
            'HIDEOUT_FIRST_TRY',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { firstTime: true }
          );
          if (result) awarded.push('HIDEOUT_FIRST_TRY');
        }
      }
      
      // Door Escape achievements
      if (tracking.doorEscapeStats && eventType === 'minigame_end') {
        if (tracking.doorEscapeStats.rounds >= 5) {
          const result = await this.awardAchievement(
            'DOOR_ESCAPE_SURVIVOR',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { rounds: tracking.doorEscapeStats.rounds }
          );
          if (result) awarded.push('DOOR_ESCAPE_SURVIVOR');
        }
        
        if (tracking.doorEscapeStats.rounds >= 10) {
          const result = await this.awardAchievement(
            'DOOR_ESCAPE_10_ROUNDS',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { rounds: tracking.doorEscapeStats.rounds }
          );
          if (result) awarded.push('DOOR_ESCAPE_10_ROUNDS');
        }
        
        if (tracking.doorEscapeStats.treasureFound) {
          const result = await this.awardAchievement(
            'DOOR_ESCAPE_TREASURE',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { treasure: true }
          );
          if (result) awarded.push('DOOR_ESCAPE_TREASURE');
        }
        
        if (tracking.doorEscapeStats.fatalPicked) {
          const result = await this.awardAchievement(
            'DOOR_ESCAPE_FATAL',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { fatal: true }
          );
          if (result) awarded.push('DOOR_ESCAPE_FATAL');
        }
        
        if (tracking.doorEscapeStats.rounds >= 5 && tracking.doorEscapeStats.healthLost === 0) {
          const result = await this.awardAchievement(
            'DOOR_ESCAPE_FULL_HEALTH',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { rounds: tracking.doorEscapeStats.rounds, healthLost: 0 }
          );
          if (result) awarded.push('DOOR_ESCAPE_FULL_HEALTH');
        }
      }
      
      // Six Zeroes achievements
      if (tracking.sixZeroesStats && eventType === 'minigame_end') {
        if (tracking.sixZeroesStats.zerosFound >= 6) {
          const result = await this.awardAchievement(
            'SIX_ZEROES_PERFECT',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { zerosFound: 6 }
          );
          if (result) awarded.push('SIX_ZEROES_PERFECT');
        }
        
        // Award NO_NOODLES only if they got all 6 zeroes AND picked no noodles
        if (tracking.sixZeroesStats.zerosFound === 6 && tracking.sixZeroesStats.noodlesPicked === 0) {
          const result = await this.awardAchievement(
            'SIX_ZEROES_NO_NOODLES',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { zerosFound: 6, noodles: 0 }
          );
          if (result) awarded.push('SIX_ZEROES_NO_NOODLES');
        }
      }
      
      // Community Chest achievements
      if (tracking.communityChestWinnings >= 5000000 && eventType === 'minigame_end') {
        const result = await this.awardAchievement(
          'COMMUNITY_CHEST_JACKPOT',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { communityChestWinnings: tracking.communityChestWinnings }
        );
        if (result) awarded.push('COMMUNITY_CHEST_JACKPOT');
      }
      
      if (tracking.communityChestWinnings >= 10000000 && eventType === 'minigame_end') {
        const result = await this.awardAchievement(
          'COMMUNITY_CHEST_MEGA',
          game.userId,
          game.username,
          game.guildId,
          interaction.channel,
          { communityChestWinnings: tracking.communityChestWinnings }
        );
        if (result) awarded.push('COMMUNITY_CHEST_MEGA');
      }
      
      // Basement achievements
      if (tracking.basementStats && eventType === 'minigame_end') {
        const percentKept = tracking.basementStats.moneyKept / (tracking.basementStats.moneyKept + tracking.basementStats.moneyLost);
        if (tracking.basementStats.escaped && percentKept >= 0.90) {
          const result = await this.awardAchievement(
            'BASEMENT_PERFECT_DEAL',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { percentKept: Math.round(percentKept * 100) }
          );
          if (result) awarded.push('BASEMENT_PERFECT_DEAL');
        }
      }

      // Mount Cashmore achievements
      if (tracking.mountCashmoreStats && (eventType === 'game_end' || eventType === 'minigame_end')) {
        const s = tracking.mountCashmoreStats;
        
        if (s.skullJackpot) {
          const result = await this.awardAchievement(
            'MOUNT_CASHMORE_SKULL_SEEKER',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { skullJackpot: true }
          );
          if (result) awarded.push('MOUNT_CASHMORE_SKULL_SEEKER');
        }
        
        if (s.levelReached >= 7 && s.livesLost === 0) {
          const result = await this.awardAchievement(
            'MOUNT_CASHMORE_LUCKY',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { level: s.levelReached, livesLost: 0 }
          );
          if (result) awarded.push('MOUNT_CASHMORE_LUCKY');
        }
        
        if (s.won && s.isBigBank) {
          const result = await this.awardAchievement(
            'MOUNT_CASHMORE_BIG_BANK',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { isBigBank: true, won: true }
          );
          if (result) awarded.push('MOUNT_CASHMORE_BIG_BANK');
        }
        
        if (s.finalMoney >= 50000000) {
          const result = await this.awardAchievement(
            'MOUNT_CASHMORE_CASH_OUT',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { finalMoney: s.finalMoney }
          );
          if (result) awarded.push('MOUNT_CASHMORE_CASH_OUT');
        }
        
        if (s.won && s.levelReached === 9 && s.riskMode) {
          const result = await this.awardAchievement(
            'MOUNT_CASHMORE_RISK_MODE',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { riskMode: true, won: true }
          );
          if (result) awarded.push('MOUNT_CASHMORE_RISK_MODE');
        }
      }
      
      // GAME OVER ACHIEVEMENTS
      if (eventType === 'game_over' && tracking.gameOverReason) {
        // Broke player
        if (game.totalMoney === 0) {
          const result = await this.awardAchievement(
            'BROKE_PLAYER',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { money: 0 }
          );
          if (result) awarded.push('BROKE_PLAYER');
        }
        
        // First floor death
        if (tracking.gameOverFloor <= 1) {
          const result = await this.awardAchievement(
            'FIRST_FLOOR_DEATH',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { floor: tracking.gameOverFloor }
          );
          if (result) awarded.push('FIRST_FLOOR_DEATH');
        }
        
        // X-Level instant elimination
        if (tracking.gameOverReason === 'x_level' && tracking.firstPickOfFloor) {
          const result = await this.awardAchievement(
            'X_LEVEL_FIRST_PICK',
            game.userId,
            game.username,
            game.guildId,
            interaction.channel,
            { firstPick: true }
          );
          if (result) awarded.push('X_LEVEL_FIRST_PICK');
        }
        
        // Mystery Box Curse
        if (tracking.mysteryBoxStats && tracking.mysteryBoxStats.moneyLost > 0) {
          const lossPercent = tracking.mysteryBoxStats.moneyLost / (game.totalMoney + tracking.mysteryBoxStats.moneyLost);
          if (lossPercent >= 0.50) {
            const result = await this.awardAchievement(
              'MYSTERY_BOX_CURSE',
              game.userId,
              game.username,
              game.guildId,
              interaction.channel,
              { lossPercent: Math.round(lossPercent * 100) }
            );
            if (result) awarded.push('MYSTERY_BOX_CURSE');
          }
        }
      }
      
      return awarded;
    } catch (error) {
      console.error('Error in automatic achievement checking:', error);
      return awarded;
    }
  }

  /**
   * Get achievement statistics for validation
   */
  async getAchievementStatistics(guildId) {
    try {
      const filePath = path.join(this.achievementsDir, `guild_${guildId}.csv`);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      const stats = {
        totalPlayers: lines.length,
        achievementCounts: {},
        mostEarnedAchievement: null,
        leastEarnedAchievement: null,
        averageAchievements: 0
      };

      // Count each achievement
      const achievementCounts = {};
      let totalAchievements = 0;

      for (const line of lines) {
        const parts = line.split('#');
        if (parts.length < 6) continue;

        const record = {
          userId: parts[0],
          username: parts[1],
          MILESTONE: parseInt(parts[2] || '0'),
          EVENT: parseInt(parts[3] || '0'),
          MINIGAME: parseInt(parts[4] || '0'),
          GAME_OVER: parseInt(parts[5] || '0')
        };

        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
          if (this.hasAchievement(record, achievement)) {
            achievementCounts[id] = (achievementCounts[id] || 0) + 1;
            totalAchievements++;
          }
        }
      }

      stats.achievementCounts = achievementCounts;
      stats.averageAchievements = lines.length > 0 ? (totalAchievements / lines.length).toFixed(2) : 0;

      // Find most and least earned
      let maxCount = 0;
      let minCount = Infinity;
      for (const [id, count] of Object.entries(achievementCounts)) {
        if (count > maxCount) {
          maxCount = count;
          stats.mostEarnedAchievement = { id, count, name: ACHIEVEMENTS[id]?.name };
        }
        if (count < minCount && count > 0) {
          minCount = count;
          stats.leastEarnedAchievement = { id, count, name: ACHIEVEMENTS[id]?.name };
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get achievement statistics:', error);
      return null;
    }
  }
}

module.exports = { TowerAchievements, ACHIEVEMENTS, AchievementType };
