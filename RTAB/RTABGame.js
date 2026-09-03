const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rtabConfig = require('./rtab_config.json');

// Phase 5 Systems
const RTABAchievements = require('./RTABAchievements');
const RTABReplay = require('./RTABReplay');
const RTABStatistics = require('./RTABStatistics');

// RtaB6 Port: Core Systems
const PlayerLevel = require('./PlayerLevel');
const BountyController = require('../BountyController');
const MinigameTournament = require('./MinigameTournament');
const SuperBotChallenge = require('./SuperBotChallenge');
const GameBot = require('../GameBot');
const RTABEnums = require('./RTABEnums');
const RtaBMath = require('./RtaBMath');

// RtaB6 Port: Game Objects
const Card = require('./gameobjs/Card');
const Deck = require('./gameobjs/Deck');
const Dice = require('./gameobjs/Dice');
const Jackpots = require('./gameobjs/Jackpots');

// RtaB6 Port: Bomb System
const Bomb = require('../bombs/Bomb');
const NormalBomb = require('../bombs/NormalBomb');
const BankruptBomb = require('../bombs/BankruptBomb');
const CursedBomb = require('../bombs/CursedBomb');

// RtaB6 Port: Event System
const EventSpace = require('../events/EventSpace');
const Joker = require('../events/Joker');
const JackpotEvent = require('../events/Jackpot');

// RtaB6 Port: Minigame System
const MiniGame = require('./minigames/MiniGame');
const CoinFlip = require('./minigames/CoinFlip');

/**
 * RTAB Lobby Class
 * Manages pre-game lobby for 2-4 players
 */
class RTABLobby {
    constructor(channelId, guildId, creatorId) {
        this.channelId = channelId;
        this.guildId = guildId;
        this.creatorId = creatorId;
        this.players = [];
        this.createdAt = Date.now();
        this.maxPlayers = rtabConfig.gameSettings.maxPlayers;
    }

    addPlayer(userId, username) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, message: 'Lobby is full!' };
        }

        if (this.players.find(p => p.userId === userId)) {
            return { success: false, message: 'You are already in this lobby!' };
        }

        this.players.push({
            userId,
            username,
            joinedAt: Date.now()
        });

        return { success: true, message: 'Joined lobby successfully!' };
    }

    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) {
            return { success: false, message: 'You are not in this lobby!' };
        }

        this.players.splice(index, 1);
        return { success: true, message: 'Left lobby successfully!' };
    }

    addBot() {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, message: 'Lobby is full!' };
        }

        const botCount = this.players.filter(p => p.isBot).length + 1;
        const botId = `bot_${Date.now()}_${botCount}`;

        this.players.push({
            userId: botId,
            username: `🤖 Bot ${botCount}`,
            joinedAt: Date.now(),
            isBot: true
        });

        return { success: true, message: 'Bot added successfully!' };
    }

    canStart() {
        return this.players.length >= rtabConfig.gameSettings.minPlayers;
    }

    isFull() {
        return this.players.length >= this.maxPlayers;
    }
}

/**
 * RTAB Game Class
 * Manages active RTAB game state and logic
 */
class RTABGame {
    constructor(lobby) {
        this.channelId = lobby.channelId;
        this.guildId = lobby.guildId;
        this.players = lobby.players.map((p, index) => ({
            userId: p.userId,
            username: p.username,
            isBot: !!p.isBot,
            money: 0,
            items: [],
            multiplier: 1,
            isEliminated: false,
            bombSquare: null,
            bombPlaced: false,
            turnOrder: index,
            boostTurns: 0, // Turns remaining for boost effects
            boostMultiplier: 1,
            peekTurns: 0, // Turns remaining for peek ability
            peeks: 0, // Number of peek items available
            booster: 100, // Boost percentage (100 = 100% = x1.0, matching RtaB6)
            streak: 0, // Pick streak counter
            minigames: [], // Minigames owned by player
            hiddenCommand: null, // Hidden command (blammo, wager, etc)
            hiddenCommands: [], // Array of all hidden commands owned
            startingMoney: 0, // Money at start of round for delta calculation
            
            // RtaB6 Port: Enhanced Player Features
            lives: 3, // Player lives (default 3)
            status: RTABEnums.PlayerStatus.ALIVE, // Player status
            winstreak: 0, // Consecutive wins streak
            annuities: 0, // Annuity bonuses
            boostCharge: 0, // Boost charge meter
            minigameLock: 0, // Turns locked from minigames
            splitAndShare: 0, // Split and share effect turns
            threshold: 0, // Money threshold effect
            bountyValue: 0, // Bounty on this player
            playerXP: 0, // Player experience points
            champXP: 0, // Champion experience
            playerLevel: 1, // Player level
            champLevel: 0, // Champion level
            achievementLevel: 0, // Achievement level
            jokers: 0, // Joker tokens
            jackpot: 0, // Jackpot winnings this game
            cursed: 0, // Turns remaining of curse
            activeEffects: {
                failsafe: false,      // Bomb immunity next hit
                repellent: false,     // Repel next bomb
                wagerer: false,       // Double next pick
                starman: 0,           // Turns of invincibility
                quadDamage: false,    // 4× next pick
                doubleDeal: false     // Pick 2 spaces this turn
            },
            bombsRepelled: 0,    // Stats tracking
            bombsDefused: 0,     // Stats tracking
            commandsUsed: 0,     // Stats tracking
            cursePenalty: 0      // Cumulative curse penalties
        }));

        this.currentTurn = 0;
        this.direction = 1; // 1 = forward, -1 = backward
        this.grid = this.generateGrid();
        this.bombsPlaced = 0;
        this.bombsRequired = this.players.length;
        this.gameStarted = false;
        this.gameEnded = false;
        this.winner = null;
        this.revealedSquares = new Set();
        this.wagerPot = 0; // Wager pot for the round
        this.futureBlammo = false; // Whether next player hits a blammo
        this.blammoSummoner = null; // Player who summoned the blammo
        this.bowserState = null; // Current bowser event state

        // Minigame state
        this.minigameState = null;
        this.minigameType = null;
        this.round = 1;

        // Market state
        this.marketState = null;

        // ==================== PHASE 5: SYSTEM INITIALIZATION ====================
        
        // Replay system - start recording
        this.replaySession = RTABReplay.startRecording(this.channelId, this.players);
        
        // Statistics system - start game session
        RTABStatistics.startGameSession(this.channelId, this.players);
        
        this.gameStartTime = Date.now(); // Track game duration
        
        // ==================== RTAB6 PORT: ENHANCED SYSTEMS ====================
        
        // Player level system
        this.playerLevel = new PlayerLevel(this.guildId);
        this.playerLevel.load().catch(err => console.error('Failed to load player levels:', err));
        
        // Bounty system
        this.bountyController = new BountyController(this.channelId);
        this.bountyController.load().catch(err => console.error('Failed to load bounties:', err));
        
        // Game objects
        this.deck = new Deck();
        this.deck.shuffle();
        this.dice = new Dice();
        this.jackpots = new Jackpots(this.channelId);
        this.jackpots.load().catch(err => console.error('Failed to load jackpots:', err));
        
        // Tournament and Challenge modes (optional)
        this.tournament = null; // Set via initTournament()
        this.challenge = null; // Set via initChallenge()
        
        // Weather system (from RtaB6)
        this.weather = RTABEnums.Weather.CLEAR;
        
        // Enhanced bomb types
        this.bombPool = {
            normal: NormalBomb,
            bankrupt: BankruptBomb,
            cursed: CursedBomb
        };
        
        // Event space registry
        this.eventRegistry = {
            joker: new Joker(),
            jackpot: new JackpotEvent()
        };
        
        // Minigame registry
        this.minigameRegistry = {
            coinflip: CoinFlip
        };
    }

    /**
     * Generate 5x5 grid with weighted content (25 squares to fit Discord button limits)
     * Uses RTAB6 official weights: SpaceType total = 200 (0.5% per weight point)
     * - CASH: 116 base (58%)
     * - BOOSTER: 26 base (13%)
     * - GAME: 26 base (13%)
     * - EVENT: 26 base (13%)
     * - GRAB_BAG: 5 (2.5%)
     * - BLAMMO: 1 (0.5%)
     */
    generateGrid() {
        const gridSize = 5; // Fixed at 5x5 for Discord button compatibility
        const totalSquares = 25;
        const grid = [];
        const playerCount = this.players.length;

        // Calculate total weights for each content category
        const prizeWeights = rtabConfig.contentPool.prizes.reduce((sum, p) => sum + p.weight, 0);
        const multWeights = rtabConfig.contentPool.multipliers.reduce((sum, m) => sum + m.weight, 0);
        const eventWeights = rtabConfig.contentPool.events.reduce((sum, e) => sum + e.weight, 0);
        const itemWeights = rtabConfig.contentPool.items.reduce((sum, i) => sum + i.weight, 0);
        const mgWeights = rtabConfig.contentPool.minigames.reduce((sum, m) => sum + m.weight, 0);

        // Generate content for grid (excluding bomb squares)
        for (let i = 0; i < totalSquares; i++) {
            // RTAB6 Space Type weights with player count adjustments
            let cashWeight = 116;
            let boostWeight = 26;
            let gameWeight = 26;
            let eventWeight = 26;
            const grabBagWeight = 5;
            const blammoWeight = 1;

            // Player count adjustments (from SpaceType.java)
            if (playerCount >= 8) {
                cashWeight += 10; // Extra large games: more cash
                gameWeight -= 10; // Fewer minigames
            } else if (playerCount >= 6) {
                cashWeight += 5; // Large games: more cash
                gameWeight -= 5; // Fewer minigames
            } else if (playerCount < 4) {
                gameWeight += 5; // Small games: more minigames
                eventWeight -= 5; // Fewer events
            }

            const spaceTypes = [
                { type: 'cash', weight: cashWeight },
                { type: 'boost', weight: boostWeight },
                { type: 'minigame', weight: gameWeight },
                { type: 'event', weight: eventWeight },
                { type: 'grab_bag', weight: grabBagWeight },
                { type: 'blammo', weight: blammoWeight }
            ];

            const spaceType = this.weightedRandom(spaceTypes);

            let content;
            let actualType = spaceType;

            // For grab bags, randomly select cash/boost/game (not event per RTAB6)
            if (spaceType === 'grab_bag') {
                const gbTypes = ['cash', 'boost', 'minigame'];
                actualType = gbTypes[Math.floor(Math.random() * gbTypes.length)];
            }

            // Generate content based on type
            switch (actualType) {
                case 'cash':
                    content = this.weightedRandomFromPool(rtabConfig.contentPool.prizes, prizeWeights);
                    break;
                case 'boost':
                    content = this.weightedRandomFromPool(rtabConfig.contentPool.multipliers, multWeights);
                    break;
                case 'event':
                    content = this.weightedRandomFromPool(rtabConfig.contentPool.events, eventWeights);
                    break;
                case 'minigame':
                    content = this.weightedRandomFromPool(rtabConfig.contentPool.minigames, mgWeights);
                    break;
                case 'blammo':
                    content = { id: 'blammo', nameEn: 'Blammo', effect: 'blammo' };
                    actualType = 'event';
                    break;
            }

            grid.push({
                index: i,
                type: actualType,
                content: content,
                revealed: false,
                isBomb: false,
                bombType: null,
                placedBy: null,
                isGrabBag: spaceType === 'grab_bag'
            });
        }

        return grid;
    }

    /**
     * Weighted random selection
     */
    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            random -= item.weight;
            if (random <= 0) {
                return item.type;
            }
        }

        return items[0].type;
    }

    /**
     * Weighted random from content pool
     */
    weightedRandomFromPool(pool, totalWeight) {
        let random = Math.random() * totalWeight;

        for (const item of pool) {
            random -= item.weight;
            if (random <= 0) {
                return { ...item };
            }
        }

        return { ...pool[0] };
    }

    /**
     * Place bomb at specified square
     */
    placeBomb(playerId, squareIndex) {
        const player = this.players.find(p => p.userId === playerId);
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (player.bombPlaced) {
            return { success: false, message: 'You have already placed your bomb!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square!' };
        }

        // Select weighted bomb type
        const bombWeights = Object.values(rtabConfig.bombTypes).reduce((sum, b) => sum + b.weight, 0);
        let random = Math.random() * bombWeights;

        let selectedBombType = 'normal';
        for (const [key, bomb] of Object.entries(rtabConfig.bombTypes)) {
            random -= bomb.weight;
            if (random <= 0) {
                selectedBombType = key;
                break;
            }
        }

        this.grid[squareIndex].isBomb = true;
        this.grid[squareIndex].bombType = selectedBombType;
        this.grid[squareIndex].placedBy = playerId;

        player.bombSquare = squareIndex;
        player.bombPlaced = true;

        return {
            success: true,
            message: 'Bomb placed successfully!',
            bombType: selectedBombType,
            square: squareIndex
        };
    }

    /**
     * Get current player with direction handling
     */
    getCurrentPlayer() {
        // Use python-style modulo for negative numbers: ((n % m) + m) % m
        const index = ((this.currentTurn % this.players.length) + this.players.length) % this.players.length;
        return this.players[index];
    }

    /**
     * Check win condition
     */
    checkWinCondition() {
        const activePlayers = this.players.filter(p => !p.isEliminated);

        if (activePlayers.length === 1) {
            this.winner = activePlayers[0];
            this.gameEnded = true;
            this.finalizeGame(); // Phase 5: Finalize statistics and achievements
            return true;
        } else if (activePlayers.length === 0) {
            this.gameEnded = true;
            this.finalizeGame(); // Phase 5: Finalize statistics and achievements
            return true;
        } else if (this.revealedSquares.size === 25) {
            // Board Clear condition
            this.winner = activePlayers.reduce((prev, current) => (prev.money > current.money) ? prev : current);
            this.gameEnded = true;
            this.finalizeGame(); // Phase 5: Finalize statistics and achievements
            return true;
        }

        return false;
    }

    /**
     * Phase 5: Finalize game - process achievements, statistics, and replay
     */
    finalizeGame() {
        const gameDuration = Date.now() - this.gameStartTime;
        
        // End replay recording
        this.replaySession = RTABReplay.endRecording(this.channelId);
        
        // End statistics session
        RTABStatistics.endGameSession(this.channelId, this.winner, this.players);
        
        // Check achievements for each player
        this.players.forEach(player => {
            const newAchievements = RTABAchievements.checkAchievements(this, player, 'game_end');
            
            // Record achievement unlocks in replay
            if (newAchievements.length > 0) {
                newAchievements.forEach(achievement => {
                    RTABReplay.recordEvent(this.channelId, {
                        type: 'achievement_unlock',
                        playerId: player.userId,
                        achievementId: achievement.id,
                        achievementName: achievement.name,
                        timestamp: Date.now()
                    });
                });
            }
        });
    }


    /**
     * Reveal square and apply effects
     */
    revealSquare(playerId, squareIndex) {
        const player = this.getCurrentPlayer();

        if (player.userId !== playerId) {
            return { success: false, message: 'Not your turn!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square!' };
        }

        const square = this.grid[squareIndex];

        if (square.revealed) {
            return { success: false, message: 'Square already revealed!' };
        }

        square.revealed = true;
        this.revealedSquares.add(squareIndex);

        // Check if future blammo was summoned
        if (this.checkFutureBlammo()) {
            // Force this square to be a bomb
            square.isBomb = true;
            square.bombType = 'normal';
            square.summonedBlammo = true;
        }

        // Check if bomb
        let result;
        if (square.isBomb) {
            result = this.handleBombHit(player, square);
            
            // Phase 5: Record bomb hit event and check achievements
            RTABReplay.recordEvent(this.channelId, {
                type: 'bomb_hit',
                playerId: player.userId,
                bombType: square.bombType,
                money: player.money,
                timestamp: Date.now()
            });
            RTABAchievements.checkAchievements(this, player, 'bomb_hit');
        } else {
            // Apply square effects
            result = this.applySquareEffect(player, square);
            
            // Phase 5: Record square reveal and check achievements
            RTABReplay.recordEvent(this.channelId, {
                type: 'square_reveal',
                playerId: player.userId,
                content: square.type,
                value: square.value || 0,
                money: player.money,
                timestamp: Date.now()
            });
            
            // Check for money-based achievements
            if (square.type === 'prize') {
                RTABAchievements.checkAchievements(this, player, 'money_gain');
            }
        }

        // Add square index to result for UI
        result.squareIndex = squareIndex;
        return result;
    }

    /**
     * Handle bomb hit - RtaB Season 6 complete bomb system
     */
    handleBombHit(player, square) {
        const bombConfig = rtabConfig.bombTypes[square.bombType];
        const effects = bombConfig.effects;

        let result = {
            success: true,
            isBomb: true,
            bombType: square.bombType,
            bombConfig: bombConfig,
            player: player,
            playerAffected: player,
            message: '',
            effects: {}
        };

        // Check for Repellent protection
        if (player.activeEffects && player.activeEffects.repellent) {
            player.activeEffects.repellent = false;
            player.bombsRepelled = (player.bombsRepelled || 0) + 1;
            result.repelled = true;
            result.message = `${player.username} repelled the ${bombConfig.nameEn || bombConfig.name}! 🛡️`;
            
            // Phase 5: Check achievements and record event
            RTABAchievements.checkAchievements(this, player, 'bomb_repelled');
            RTABStatistics.recordSessionEvent(this.channelId, {
                type: 'bomb_repelled',
                userId: player.userId
            });
            
            this.advanceTurn();
            return result;
        }

        // Check for Failsafe protection
        if (player.activeEffects && player.activeEffects.failsafe) {
            player.activeEffects.failsafe = false;
            result.failsafe = true;
            result.message = `${player.username}'s Failsafe protected them from ${bombConfig.nameEn || bombConfig.name}! ✨`;
            this.advanceTurn();
            return result;
        }

        // Check for Starman invincibility
        if (player.activeEffects && player.activeEffects.starman > 0) {
            result.invincible = true;
            result.message = `${player.username} is invincible! The ${bombConfig.nameEn || bombConfig.name} has no effect! ⭐`;
            
            // Phase 5: Check achievements
            RTABAchievements.checkAchievements(this, player, 'starman_active');
            
            this.advanceTurn();
            return result;
        }

        // Check for defuse item
        const defuseIndex = player.items.findIndex(item => item.id === 'item_defuse');
        if (defuseIndex !== -1) {
            player.items.splice(defuseIndex, 1);
            player.bombsDefused = (player.bombsDefused || 0) + 1;
            result.defused = true;
            result.message = `${player.username} defused the ${bombConfig.nameEn || bombConfig.name}! 💣✂️`;
            
            // Phase 5: Check achievements and record event
            RTABAchievements.checkAchievements(this, player, 'bomb_defused');
            RTABStatistics.recordSessionEvent(this.channelId, {
                type: 'bomb_defused',
                userId: player.userId
            });
            
            this.advanceTurn();
            return result;
        }

        // Route to specific bomb handler based on type
        const bombType = square.bombType;
        
        switch (bombType) {
            case 'normal':
                return this.handleNormalBomb(player, square, bombConfig, result);
            case 'bankrupt':
                return this.handleBankruptBomb(player, square, bombConfig, result);
            case 'cluster':
                return this.handleClusterBomb(player, square, bombConfig, result);
            case 'collateral':
                return this.handleCollateralBomb(player, square, bombConfig, result);
            case 'loothold':
                return this.handleLootHoldBomb(player, square, bombConfig, result);
            case 'reverse':
                return this.handleReverseBomb(player, square, bombConfig, result);
            case 'boostblast':
                return this.handleBoostBlastBomb(player, square, bombConfig, result);
            case 'streakblast':
                return this.handleStreakBlastBomb(player, square, bombConfig, result);
            case 'loserwheel':
                return this.handleLoserWheelBomb(player, square, bombConfig, result);
            case 'dud':
                return this.handleDudBomb(player, square, bombConfig, result);
            case 'thresholddud':
                return this.handleThresholdDudBomb(player, square, bombConfig, result);
            case 'cursed':
                return this.handleCursedBomb(player, square, bombConfig, result);
            case 'lockdown':
                return this.handleLockdownBomb(player, square, bombConfig, result);
            default:
                // Fallback to old system for unknown bombs
                return this.handleNormalBomb(player, square, bombConfig, result);
        }
    }

    /**
     * Normal Bomb - Standard elimination, lose all money
     */
    handleNormalBomb(player, square, bombConfig, result) {
        // Check for Save Multiplier Item
        const saveMultIndex = player.items.findIndex(item => item.id === 'item_save_mult');
        let savedMultiplier = 1;

        if (saveMultIndex !== -1) {
            savedMultiplier = player.multiplier;
            player.items.splice(saveMultIndex, 1);
            result.multiplierSaved = true;
        }

        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        result.oldMultiplier = player.multiplier;
        
        player.money = 0;
        player.items = [];
        player.multiplier = result.multiplierSaved ? savedMultiplier : 1;

        result.message = `💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Game over!`;
        result.effects = { eliminated: true, moneyLost: 'all', itemsLost: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Bankrupt Bomb - Lose all money but stay in game
     */
    handleBankruptBomb(player, square, bombConfig, result) {
        result.moneyLost = player.money;
        player.money = 0;
        
        result.message = `💸 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Lost all money but still alive!`;
        result.effects = { moneyLost: 'all', staysInGame: true };
        
        this.advanceTurn();
        return result;
    }

    /**
     * Cluster Bomb - Places 3 more bombs on the board
     */
    handleClusterBomb(player, square, bombConfig, result) {
        // Eliminate player
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        result.oldMultiplier = player.multiplier;
        
        player.money = 0;
        player.items = [];
        player.multiplier = 1;

        // Place 3 more bombs
        const bombsPlaced = this.placeClusterBombs(3, player.userId);
        result.clusterBombsPlaced = bombsPlaced;

        result.message = `💥🔗 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Placed ${bombsPlaced} more bombs!`;
        result.effects = { eliminated: true, placesMoreBombs: bombsPlaced };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Collateral Damage Bomb - Damages all other players
     */
    handleCollateralBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        player.money = 0;
        player.items = [];

        // Damage all other players
        const alivePlayers = this.players.filter(p => !p.isEliminated && p.userId !== player.userId);
        const damages = [];

        alivePlayers.forEach(p => {
            const damage = Math.floor(p.money * 0.25); // 25% damage
            p.money = Math.max(0, p.money - damage);
            damages.push({ username: p.username, damage: damage });
        });

        result.collateralDamages = damages;
        result.message = `💥💢 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! All players lose 25% of their money!`;
        result.effects = { eliminated: true, damagesAllPlayers: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Loot Hold Bomb - Eliminated but keep all money (RtaB6: player can still play queued minigames)
     */
    handleLootHoldBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.itemsLost = player.items.length;
        player.items = [];
        
        result.moneyLost = 0; // Keep money!
        result.lootHold = true; // Flag that minigames can still be played
        result.message = `💰💣 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Eliminated but kept $${player.money.toLocaleString()}!`;
        result.effects = { eliminated: true, moneyLost: 'none', canPlayMinigames: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Reverse Bomb - Bomb placer loses instead of picker
     */
    handleReverseBomb(player, square, bombConfig, result) {
        const placer = this.players.find(p => p.userId === square.placedBy);
        
        if (placer && !placer.isEliminated) {
            placer.isEliminated = true;
            result.moneyLost = placer.money;
            result.itemsLost = placer.items.length;
            placer.money = 0;
            placer.items = [];
            placer.multiplier = 1;

            result.placerAffected = placer;
            result.message = `🔄💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! ${placer.username} loses instead!`;
            result.effects = { placerLoses: true };
        } else {
            // No valid placer, treat as normal bomb
            return this.handleNormalBomb(player, square, bombConfig, result);
        }

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Boost Blast Bomb - Resets boost multiplier to 100%
     */
    handleBoostBlastBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        result.oldBooster = player.booster;
        
        player.money = 0;
        player.items = [];
        player.booster = 100; // Reset to 100% (x1.0)
        player.boostMultiplier = 1.0;
        player.boostTurns = 0;

        result.message = `⚡💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Boost reset to 100%!`;
        result.effects = { eliminated: true, boostReset: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Streak Blast Bomb - Resets pick streak to 0
     */
    handleStreakBlastBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        result.oldStreak = player.streak || 0;
        
        player.money = 0;
        player.items = [];
        player.streak = 0;

        result.message = `📊💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Streak reset to 0!`;
        result.effects = { eliminated: true, streakReset: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Loser Wheel Bomb - Eliminated and forced to spin loser wheel
     */
    handleLoserWheelBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        
        player.money = 0;
        player.items = [];

        // Generate loser wheel penalty
        const penalties = [
            { type: 'money_penalty', amount: 1000000, message: 'Lose $1,000,000 from final score!' },
            { type: 'money_penalty', amount: 2000000, message: 'Lose $2,000,000 from final score!' },
            { type: 'money_penalty', amount: 5000000, message: 'Lose $5,000,000 from final score!' },
            { type: 'stat_penalty', stat: 'games_played', message: 'This game doesn\'t count!' },
            { type: 'stat_penalty', stat: 'win_penalty', message: 'Next 3 wins don\'t count!' }
        ];
        
        const penalty = penalties[Math.floor(Math.random() * penalties.length)];
        result.loserWheelPenalty = penalty;

        result.message = `🎡💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Spun the Loser Wheel: ${penalty.message}`;
        result.effects = { eliminated: true, forcesLoserWheel: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Dud Bomb - Fake bomb, no effect!
     */
    handleDudBomb(player, square, bombConfig, result) {
        result.isDud = true;
        result.message = `🎭💣 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! It was a dud! Nothing happens! 🎉`;
        result.effects = { isDud: true };
        
        this.advanceTurn();
        return result;
    }

    /**
     * Threshold Dud Bomb - Fake bomb, gives $50,000 threshold bonus
     */
    handleThresholdDudBomb(player, square, bombConfig, result) {
        const threshold = 50000;
        player.money += threshold;
        
        result.isDud = true;
        result.thresholdGained = threshold;
        result.message = `💎💣 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Gained $${threshold.toLocaleString()} threshold!`;
        result.effects = { isDud: true, givesThreshold: true };
        
        this.advanceTurn();
        return result;
    }

    /**
     * Cursed Bomb - Generated by Bowser event, extra nasty effects
     */
    handleCursedBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        result.oldMultiplier = player.multiplier;
        
        player.money = 0;
        player.items = [];
        player.multiplier = 1;

        // Cursed effect: Also lose a random amount from final score
        const cursePenalty = Math.floor(Math.random() * 5000000) + 1000000; // $1M-$6M
        player.cursePenalty = (player.cursePenalty || 0) + cursePenalty;
        result.cursePenalty = cursePenalty;

        result.message = `😈💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! Also cursed with -$${cursePenalty.toLocaleString()} penalty!`;
        result.effects = { eliminated: true, cursed: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Lockdown Bomb - Generated by Lockdown event, can't be defused normally
     */
    handleLockdownBomb(player, square, bombConfig, result) {
        player.isEliminated = true;
        result.moneyLost = player.money;
        result.itemsLost = player.items.length;
        
        player.money = 0;
        player.items = [];

        // Lockdown effect: Remove all hidden commands from other players
        const alivePlayers = this.players.filter(p => !p.isEliminated && p.userId !== player.userId);
        let commandsLost = 0;
        
        alivePlayers.forEach(p => {
            if (p.hiddenCommands && p.hiddenCommands.length > 0) {
                commandsLost += p.hiddenCommands.length;
                p.hiddenCommands = [];
            }
        });

        result.lockdownCommandsLost = commandsLost;
        result.message = `🔒💥 ${player.username} hit a ${bombConfig.nameEn || bombConfig.name}! All players lost their hidden commands!`;
        result.effects = { eliminated: true, lockdown: true };

        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }
        return result;
    }

    /**
     * Place cluster bombs on random unrevealed squares
     */
    placeClusterBombs(count, placerId) {
        const availableSquares = this.grid.filter(s => !s.revealed && !s.isBomb);
        let placed = 0;

        for (let i = 0; i < count && availableSquares.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableSquares.length);
            const square = availableSquares.splice(randomIndex, 1)[0];
            
            square.isBomb = true;
            square.bombType = 'normal';
            square.placedBy = placerId;
            placed++;
        }

        return placed;
    }

    /**
     * Apply square effect (non-bomb)
     */
    applySquareEffect(player, square) {
        let result = {
            success: true,
            isBomb: false,
            type: square.type,
            content: square.content,
            player: player,
            message: ''
        };

        switch (square.type) {
            case 'prize':
            case 'cash':
                const amount = square.content.amount;
                const multiplied = amount * (player.boostMultiplier || 1);
                player.money += multiplied;
                result.amountGained = multiplied;
                result.message = `${player.username} gained $${multiplied.toLocaleString()}!`;
                break;

            case 'multiplier':
            case 'boost':
                if (square.content.effect === 'multiply') {
                    player.money *= square.content.value;
                    result.message = `${player.username}'s money multiplied by ${square.content.value}!`;
                } else if (square.content.effect === 'divide') {
                    player.money = Math.floor(player.money / square.content.value);
                    result.message = `${player.username}'s money divided by ${square.content.value}!`;
                } else if (square.content.effect === 'boost_3turns') {
                    player.boostMultiplier = square.content.value;
                    player.boostTurns = square.content.duration;
                    result.message = `${player.username} got x${square.content.value} boost for 3 turns!`;
                }
                break;

            case 'event':
                result.message = this.applyEvent(player, square.content);
                break;

            case 'item':
                if (square.content.effect === 'reverse_turn') {
                    this.direction *= -1;
                    result.message = `${player.username} got Reverse Card! Turn order reversed! 🔄`;
                } else {
                    player.items.push(square.content);
                    result.message = `${player.username} got item: ${square.content.nameEn}!`;

                    if (square.content.effect === 'peek') {
                        player.peekTurns = 3;
                        result.message += ` (Auto-peeking enabled for 3 turns)`;
                    }
                }
                break;

            case 'minigame':
                // RtaB6: Minigames are queued and played AFTER main game ends (or after bomb if loot hold)
                const minigameId = square.content.id;
                result.queueMinigame = true; // Queue for later
                result.minigameId = minigameId;
                result.minigameContent = square.content;
                result.message = `${player.username} won a minigame: ${square.content.nameEn}! 🎮\nIt will be played after this turn ends.`;
                
                // Store minigame for later
                if (!player.queuedMinigames) player.queuedMinigames = [];
                player.queuedMinigames.push({
                    id: minigameId,
                    content: square.content
                });
                
                // Advance turn normally - minigame plays AFTER
                this.advanceTurn();
                return result;
        }

        this.advanceTurn();
        return result;
    }

    /**
     * Apply event effects
     */
    applyEvent(player, event) {
        // Phase 5: Record event trigger and check achievements
        RTABReplay.recordEvent(this.channelId, {
            type: 'event_triggered',
            playerId: player.userId,
            eventId: event.id,
            eventName: event.nameEn,
            timestamp: Date.now()
        });
        RTABStatistics.recordSessionEvent(this.channelId, {
            type: 'event_triggered',
            userId: player.userId
        });
        RTABAchievements.checkAchievements(this, player, 'event_triggered');
        
        switch (event.effect) {
            // ===== COMMON EVENTS =====
            case 'boost_charger':
                return this.handleBoostCharger(player, event);
            
            case 'double_deal':
                return this.handleDoubleDeal(player, event);
            
            case 'streak_bonus':
                return this.handleStreakBonus(player, event);
            
            case 'draw_cards':
                return this.handleDrawCards(player, event);
            
            case 'market':
                return this.startMarket(player);
            
            case 'one_shot_booster':
                return this.handleOneShotBooster(player, event);

            // ===== UNCOMMON EVENTS =====
            case 'bowser':
                return this.startBowserEvent(player.username);
            
            case 'peek_replenish':
                return this.handlePeekReplenish(player, event);
            
            case 'something_for_all':
                return this.handleSomethingForAll(player, event);
            
            case 'hidden_commands_for_all':
                return this.handleHiddenCommandsForAll(player, event);
            
            case 'joker':
                return this.handleJoker(player, event);
            
            case 'one_buck_behind':
                return this.handleOneBuckBehind(player, event);

            // ===== RARE EVENTS =====
            case 'split_share':
                return this.handleSplitShare(player, event);
            
            case 'boost_magnet':
                return this.handleBoostMagnet(player, event);
            
            case 'minefield':
                return this.handleMinefield(player, event);
            
            case 'lockdown':
                return this.handleLockdown(player, event);
            
            case 'final_countdown':
                return this.handleFinalCountdown(player, event);

            // ===== EPIC EVENTS =====
            case 'super_joker':
                return this.handleSuperJoker(player, event);
            
            case 'starman':
                return this.handleStarman(player, event);
            
            case 'jackpot':
                return this.handleJackpot(player, event);

            // ===== SEASONAL EVENTS =====
            case 'lucky_space':
                return this.handleLuckySpace(player, event);
            
            case 'revival_chance':
                return this.handleRevivalChance(player, event);
            
            case 'reverse_order':
                return this.handleReverseOrder(player, event);
            
            case 'cursed_bomb_event':
                return this.handleCursedBombEvent(player, event);
            
            case 'cash_for_all':
                return this.handleCashForAll(player, event);
            
            case 'minigames_for_all':
                return this.triggerMinigamesForAll(player);

            // ===== LEGACY EVENTS =====
            case 'swap_money':
                const opponent = this.players.find(p => !p.isEliminated && p.userId !== player.userId);
                if (opponent) {
                    const temp = player.money;
                    player.money = opponent.money;
                    opponent.money = temp;
                    return `Money swapped between ${player.username} and ${opponent.username}!`;
                }
                break;

            case 'reset':
                player.money = event.value;
                return `${player.username}'s money reset to $${event.value.toLocaleString()}!`;

            default:
                return `Event: ${event.nameEn || event.name}`;
        }
    }

    // ============================================================================
    // EVENT HANDLERS - RtaB Season 6
    // ============================================================================

    /**
     * Boost Charger - Grant 50% boost for 3 turns
     */
    handleBoostCharger(player, event) {
        const boost = event.boost || 50;
        const duration = event.duration || 3;
        
        player.booster += boost;
        player.boostMultiplier = player.booster / 100; // RtaB6: 100 = x1.0, 200 = x2.0
        player.boostTurns = Math.max(player.boostTurns, duration);
        
        return `⚡ ${player.username} gained +${boost}% boost for ${duration} turns! (Total: ${player.booster}%)`;
    }

    /**
     * Double Deal - Pick 2 spaces this turn
     */
    handleDoubleDeal(player, event) {
        if (!player.activeEffects) player.activeEffects = {};
        player.activeEffects.doubleDeal = true;
        
        return `🎴 ${player.username} can pick ${event.choices || 2} spaces this turn!`;
    }

    /**
     * Streak Bonus - Reward based on pick streak
     */
    handleStreakBonus(player, event) {
        const streak = player.streak || 0;
        const rewardPerStreak = event.rewardPerStreak || 100000;
        const reward = streak * rewardPerStreak;
        
        player.money += reward;
        
        return `📊 ${player.username}'s ${streak} pick streak earned $${reward.toLocaleString()}!`;
    }

    /**
     * Draw Cards - Grant hidden commands to player(s)
     */
    handleDrawCards(player, event) {
        const cardCount = event.cardCount || 2;
        const commands = ['fold', 'blammo', 'shuffler', 'wagerer', 'bonusbag', 'eyeoftruth', 'failsafe', 'minesweeper', 'repellent'];
        
        for (let i = 0; i < cardCount; i++) {
            const cmd = commands[Math.floor(Math.random() * commands.length)];
            this.grantCommand(player, cmd);
        }
        
        return `🎴 ${player.username} drew ${cardCount} hidden commands!`;
    }

    /**
     * One Shot Booster - Temporary massive multiplier
     */
    handleOneShotBooster(player, event) {
        const multiplier = event.multiplier || 4;
        
        if (!player.activeEffects) player.activeEffects = {};
        player.activeEffects.quadDamage = multiplier;
        
        return `💥 ${player.username}'s next pick is worth ${multiplier}× the amount!`;
    }

    /**
     * Peek Replenish - Grant peeks to all players
     */
    handlePeekReplenish(player, event) {
        const peeks = event.peeksGranted || 3;
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        
        alivePlayers.forEach(p => {
            p.peeks = (p.peeks || 0) + peeks;
        });
        
        return `👁️ All players gained ${peeks} peeks!`;
    }

    /**
     * Something For Everyone - Random rewards for all
     */
    handleSomethingForAll(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const results = [];
        
        alivePlayers.forEach(p => {
            const roll = Math.random();
            if (roll < 0.4) {
                // Cash
                const amount = (Math.floor(Math.random() * 10) + 1) * 100000;
                p.money += amount;
                results.push(`${p.username}: $${amount.toLocaleString()}`);
            } else if (roll < 0.7) {
                // Boost
                p.booster += 50;
                p.boostMultiplier = (100 + p.booster) / 100;
                results.push(`${p.username}: +50% boost`);
            } else {
                // Hidden command
                const cmd = ['fold', 'blammo', 'shuffler'][Math.floor(Math.random() * 3)];
                this.grantCommand(p, cmd);
                results.push(`${p.username}: Hidden command`);
            }
        });
        
        return `🎁 Everyone got something!\n${results.join('\n')}`;
    }

    /**
     * Spoiler Tag / Hidden Commands For All
     */
    handleHiddenCommandsForAll(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const commands = ['fold', 'blammo', 'shuffler', 'wagerer', 'bonusbag', 'eyeoftruth', 'failsafe', 'minesweeper', 'repellent'];
        
        alivePlayers.forEach(p => {
            const cmd = commands[Math.floor(Math.random() * commands.length)];
            this.grantCommand(p, cmd);
        });
        
        return `🏷️ All players received a hidden command!`;
    }

    /**
     * Joker - Money redistribution among players
     */
    handleJoker(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        if (alivePlayers.length < 2) {
            return `🃏 Joker had no effect (only 1 player alive)!`;
        }
        
        // Take 10-30% from richest, give to poorest
        const sorted = [...alivePlayers].sort((a, b) => b.money - a.money);
        const richest = sorted[0];
        const poorest = sorted[sorted.length - 1];
        
        const percent = 0.1 + Math.random() * 0.2;
        const amount = Math.floor(richest.money * percent);
        
        richest.money -= amount;
        poorest.money += amount;
        
        return `🃏 Joker! ${richest.username} gave $${amount.toLocaleString()} to ${poorest.username}!`;
    }

    /**
     * One Buck Behind - Steal $1 from leader
     */
    handleOneBuckBehind(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated && p.userId !== player.userId);
        if (alivePlayers.length === 0) {
            return `💵 No other players to steal from!`;
        }
        
        const leader = alivePlayers.reduce((prev, current) => (prev.money > current.money) ? prev : current);
        const stolen = event.amountStolen || 1;
        
        if (leader.money >= stolen) {
            leader.money -= stolen;
            player.money += stolen;
            return `💵 ${player.username} stole $${stolen} from ${leader.username}!`;
        }
        
        return `💵 ${leader.username} has no money to steal!`;
    }

    /**
     * Split and Share - Share money with another player
     */
    handleSplitShare(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated && p.userId !== player.userId);
        if (alivePlayers.length === 0) {
            return `🤝 No other players to share with!`;
        }
        
        const partner = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const percent = event.splitPercent || 50;
        const shareAmount = Math.floor(player.money * (percent / 100));
        
        player.money -= shareAmount;
        partner.money += shareAmount;
        
        return `🤝 ${player.username} shared $${shareAmount.toLocaleString()} (${percent}%) with ${partner.username}!`;
    }

    /**
     * Boost Magnet - Steal all boosters from other players
     */
    handleBoostMagnet(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated && p.userId !== player.userId);
        let totalBoost = 0;
        
        alivePlayers.forEach(p => {
            if (p.booster > 100) {
                const stolen = p.booster - 100;
                totalBoost += stolen;
                p.booster = 100;
                p.boostMultiplier = 1;
            }
        });
        
        if (totalBoost > 0) {
            player.booster += totalBoost;
            player.boostMultiplier = (100 + player.booster) / 100;
            return `🧲 ${player.username} stole ${totalBoost}% boost from all players! (Total: ${player.booster}%)`;
        }
        
        return `🧲 No boosts to steal!`;
    }

    /**
     * Minefield - Place 3 bombs on board
     */
    handleMinefield(player, event) {
        const count = event.bombsPlaced || 3;
        const placed = this.placeMinefieldBombs(count);
        
        return `💣 Minefield! ${placed} bombs added to the board!`;
    }

    /**
     * Lockdown - Place 2 lockdown bombs
     */
    handleLockdown(player, event) {
        const count = event.lockdownBombs || 2;
        const placed = this.placeLockdownBombs(count);
        
        return `🔒 Lockdown! ${placed} special bombs added to the board!`;
    }

    /**
     * Final Countdown - End round in 3 turns
     */
    handleFinalCountdown(player, event) {
        const turns = event.turnsUntilEnd || 3;
        this.finalCountdownTurns = turns;
        
        return `⏰ Final Countdown! Round ends in ${turns} turns!`;
    }

    /**
     * Super Joker - Mega money redistribution (4+ players)
     */
    handleSuperJoker(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        
        if (alivePlayers.length < 4) {
            return `🌟 Super Joker requires 4+ players!`;
        }
        
        // Redistribute all money evenly
        const totalMoney = alivePlayers.reduce((sum, p) => sum + p.money, 0);
        const share = Math.floor(totalMoney / alivePlayers.length);
        
        alivePlayers.forEach(p => {
            p.money = share;
        });
        
        return `🌟 Super Joker! All money redistributed evenly ($${share.toLocaleString()} each)!`;
    }

    /**
     * Starman - Grant invincibility for 3 turns
     */
    handleStarman(player, event) {
        const duration = event.invincibilityTurns || 3;
        
        if (!player.activeEffects) player.activeEffects = {};
        player.activeEffects.starman = duration;
        
        return `⭐ ${player.username} is invincible for ${duration} turns!`;
    }

    /**
     * Jackpot - Win huge cash prize
     */
    handleJackpot(player, event) {
        const min = event.minReward || 10000000;
        const max = event.maxReward || 100000000;
        const jackpot = Math.floor(Math.random() * (max - min + 1)) + min;
        
        player.money += jackpot;
        
        return `🎰 JACKPOT! ${player.username} won $${jackpot.toLocaleString()}!`;
    }

    /**
     * Lucky Space - All spaces become cash (seasonal)
     */
    handleLuckySpace(player, event) {
        let converted = 0;
        
        this.grid.forEach(square => {
            if (!square.revealed && !square.isBomb) {
                square.type = 'prize';
                square.content = { amount: (Math.floor(Math.random() * 10) + 1) * 100000 };
                converted++;
            }
        });
        
        return `🍀 Lucky Space! ${converted} spaces became cash!`;
    }

    /**
     * Revival Chance - Revive an eliminated player (seasonal)
     */
    handleRevivalChance(player, event) {
        const eliminated = this.players.filter(p => p.isEliminated);
        
        if (eliminated.length === 0) {
            return `💫 No eliminated players to revive!`;
        }
        
        const revived = eliminated[Math.floor(Math.random() * eliminated.length)];
        revived.isEliminated = false;
        revived.money = 1000000; // Start with $1M
        
        return `💫 Revival! ${revived.username} is back in the game with $1,000,000!`;
    }

    /**
     * Reverse - Reverse turn order (seasonal)
     */
    handleReverseOrder(player, event) {
        this.direction *= -1;
        
        return `🔄 Turn order reversed!`;
    }

    /**
     * Cursed Bomb Event - Place cursed bombs (seasonal)
     */
    handleCursedBombEvent(player, event) {
        const count = Math.floor(Math.random() * 3) + 2; // 2-4 bombs
        const placed = this.placeCursedBombs(count);
        
        return `😈 Bowser placed ${placed} cursed bombs on the board!`;
    }

    /**
     * Cash For All - Everyone gets random cash (seasonal)
     */
    handleCashForAll(player, event) {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const results = [];
        
        alivePlayers.forEach(p => {
            const amount = (Math.floor(Math.random() * 20) + 5) * 100000; // $500k-$2.5M
            p.money += amount;
            results.push(`${p.username}: $${amount.toLocaleString()}`);
        });
        
        return `💰 Cash for everyone!\n${results.join('\n')}`;
    }

    /**
     * Advance to next turn
     */
    advanceTurn() {
        const currentPlayer = this.getCurrentPlayer();

        // Decrement effects
        if (currentPlayer.boostTurns > 0) {
            currentPlayer.boostTurns--;
            if (currentPlayer.boostTurns === 0) currentPlayer.boostMultiplier = 1;
        }
        if (currentPlayer.peekTurns > 0) currentPlayer.peekTurns--;

        // Move turn
        this.currentTurn += this.direction;

        // Handle wrapping manually since % doesn't work well with negative numbers
        if (this.currentTurn < 0) this.currentTurn = this.players.length - 1;

        // Skip eliminated players
        let attempts = 0;
        while (this.getCurrentPlayer().isEliminated && !this.gameEnded && attempts < this.players.length) {
            this.currentTurn += this.direction;
            attempts++;
        }
    }

    /**
     * Get unique peek info for current player
     */
    getPeekInfo() {
        const unrevealed = this.grid.filter(s => !s.revealed);
        if (unrevealed.length === 0) return null;

        const randomSquare = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        return {
            index: randomSquare.index,
            type: randomSquare.type,
            isBomb: randomSquare.isBomb,
            bombType: randomSquare.bombType // if it is a bomb
        };
    }

    // ==================== MINIGAME METHODS ====================

    /**
     * CoinFlip Minigame
     * Player starts with 10 coins, picks Heads/Tails
     * Coins that land on wrong side are removed
     * Must have at least 1 coin land on chosen side to continue
     * Can stop at any stage to collect winnings
     */
    startCoinFlip(player) {
        const paytable = [10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000];
        this.minigameType = 'coinflip';
        this.minigameState = {
            player: player,
            stage: 0,
            coins: 10,
            paytable: paytable,
            maxStage: paytable.length - 1,
            alive: true,
            completed: false
        };
        return this.minigameState;
    }

    playCoinFlip(choice) {
        if (!this.minigameState || this.minigameType !== 'coinflip') return null;

        const state = this.minigameState;
        let result = { stage: state.stage, coinsRemaining: state.coins };

        if (choice === 'stop') {
            // Player stops - collect current stage winnings
            state.completed = true;
            const winnings = state.paytable[state.stage];
            state.player.money += winnings;
            result.stopped = true;
            result.winnings = winnings;
            result.message = `Cashed out with $${winnings.toLocaleString()}!`;
            this.endMinigame();
            return result;
        }

        // Flip coins
        let correctCoins = 0;
        for (let i = 0; i < state.coins; i++) {
            const flip = Math.random() < 0.5 ? 'heads' : 'tails';
            if (flip === choice) correctCoins++;
        }

        result.flipped = state.coins;
        result.correct = correctCoins;
        result.choice = choice;

        if (correctCoins === 0) {
            // Lost all coins - lose everything
            state.alive = false;
            state.completed = true;
            result.lost = true;
            result.message = `All ${state.coins} coins landed on ${choice === 'heads' ? 'TAILS' : 'HEADS'}! You lose!`;
            this.endMinigame();
        } else {
            // Advance stage
            state.coins = correctCoins;
            state.stage++;
            result.stageCleared = true;
            result.newStage = state.stage;
            result.currentValue = state.paytable[state.stage];
            result.message = `${correctCoins} ${choice.toUpperCase()}! Stage ${state.stage} cleared - $${state.paytable[state.stage].toLocaleString()}`;

            if (state.stage >= state.maxStage) {
                // Won the jackpot!
                state.completed = true;
                const winnings = state.paytable[state.stage];
                state.player.money += winnings;
                result.jackpot = true;
                result.winnings = winnings;
                result.message = `JACKPOT! You won $${winnings.toLocaleString()}!`;
                this.endMinigame();
            }
        }

        return result;
    }

    /**
     * The Gamble Minigame
     * 20 spaces with hidden values ($100 to $1,000,000)
     * Pick spaces - each must be higher than previous
     * Can stop anytime to keep total
     */
    startGamble(player) {
        const baseValues = [100, 300, 500, 700, 1000, 3000, 5000, 7000,
            10000, 20000, 30000, 40000, 50000, 70000, 100000,
            200000, 300000, 400000, 500000, 1000000];

        // Shuffle values
        const shuffled = [...baseValues].sort(() => Math.random() - 0.5);

        this.minigameType = 'gamble';
        this.minigameState = {
            player: player,
            values: shuffled,
            pickedSpaces: new Array(20).fill(false),
            lastPick: 0,
            total: 0,
            alive: true,
            completed: false
        };
        return this.minigameState;
    }

    playGamble(choice) {
        if (!this.minigameState || this.minigameType !== 'gamble') return null;

        const state = this.minigameState;
        let result = { total: state.total, lastPick: state.lastPick };

        if (choice === 'stop' && state.total > 0) {
            // Player stops - keep total
            state.completed = true;
            state.player.money += state.total;
            result.stopped = true;
            result.winnings = state.total;
            result.message = `Cashed out with $${state.total.toLocaleString()}!`;
            this.endMinigame();
            return result;
        }

        // Parse space number (1-20)
        const spaceNum = parseInt(choice);
        if (isNaN(spaceNum) || spaceNum < 1 || spaceNum > 20) {
            result.invalid = true;
            return result;
        }

        const spaceIndex = spaceNum - 1;
        if (state.pickedSpaces[spaceIndex]) {
            result.alreadyPicked = true;
            return result;
        }

        // Reveal space
        state.pickedSpaces[spaceIndex] = true;
        const revealed = state.values[spaceIndex];

        result.space = spaceNum;
        result.revealed = revealed;

        if (revealed < state.lastPick) {
            // Value is lower - lose everything!
            state.alive = false;
            state.completed = true;
            state.total = 0;
            result.lost = true;
            result.message = `$${revealed.toLocaleString()} is LOWER than $${state.lastPick.toLocaleString()}! You lose everything!`;
            this.endMinigame();
        } else {
            // Success!
            state.lastPick = revealed;
            state.total += revealed;
            result.success = true;
            result.newTotal = state.total;
            result.message = `$${revealed.toLocaleString()}! Total: $${state.total.toLocaleString()}`;

            if (revealed === 1000000) {
                // Hit the jackpot space!
                state.completed = true;
                state.player.money += state.total;
                result.jackpot = true;
                result.winnings = state.total;
                result.message = `$1,000,000 - THE MAX! You win $${state.total.toLocaleString()}!`;
                this.endMinigame();
            }
        }

        return result;
    }

    /**
     * Deal or No Deal Minigame
     * 22 boxes with values, player opens boxes and receives offers
     */
    startDealOrNoDeal(player) {
        const valueList = [1, 10, 50, 100, 250, 500, 750, 1000, 2500, 5000, 7500,
            10000, 30000, 50000, 100000, 250000, 500000, 750000, 1000000, 2000000, 3500000, 5000000];

        // Shuffle values into boxes
        const shuffled = [...valueList].sort(() => Math.random() - 0.5);

        this.minigameType = 'dond';
        this.minigameState = {
            player: player,
            values: shuffled, // Values in remaining boxes
            allValues: valueList,
            casesLeft: 22,
            offer: 0,
            offerPoints: [17, 14, 11, 8, 5, 3, 2], // Cases left when offers happen
            completed: false
        };

        // Open first 5 boxes automatically
        for (let i = 0; i < 5; i++) {
            this.minigameState.values.shift();
            this.minigameState.casesLeft--;
        }

        // Generate first offer
        this.generateDONDOffer();
        return this.minigameState;
    }

    generateDONDOffer() {
        const state = this.minigameState;
        const values = state.values;

        // Calculate fair deal (geometric mean approach)
        let fairDeal = 0;
        let average = 0;
        for (const v of values) {
            fairDeal += Math.sqrt(v);
            average += v;
        }
        fairDeal = Math.pow(fairDeal / values.length, 2);
        average /= values.length;

        // Offer increases as game progresses
        const progress = (22 - state.casesLeft) / 40;
        let offer = fairDeal + (average - fairDeal) * progress;

        // Add random factor (90-110%)
        offer *= (0.9 + Math.random() * 0.2);

        // Round nicely
        if (offer > 1000000) offer = Math.floor(offer / 100000) * 100000;
        else if (offer > 100000) offer = Math.floor(offer / 10000) * 10000;
        else if (offer > 10000) offer = Math.floor(offer / 1000) * 1000;
        else offer = Math.floor(offer / 100) * 100;

        state.offer = Math.floor(offer);
        return state.offer;
    }

    playDealOrNoDeal(choice) {
        if (!this.minigameState || this.minigameType !== 'dond') return null;

        const state = this.minigameState;
        let result = { offer: state.offer, casesLeft: state.casesLeft };

        if (choice === 'deal') {
            state.completed = true;
            state.player.money += state.offer;
            result.accepted = true;
            result.winnings = state.offer;
            result.message = `DEAL! Won $${state.offer.toLocaleString()}!`;
            this.endMinigame();
            return result;
        }

        if (choice === 'nodeal') {
            // Determine how many boxes to open
            let boxesToOpen = 3;
            for (const point of state.offerPoints) {
                if (state.casesLeft > point) {
                    boxesToOpen = state.casesLeft - point;
                    break;
                }
            }

            result.boxesOpened = [];
            for (let i = 0; i < boxesToOpen && state.values.length > 1; i++) {
                const opened = state.values.shift();
                result.boxesOpened.push(opened);
                state.casesLeft--;
            }

            // Check if down to 1 box (player's box)
            if (state.casesLeft <= 2) {
                state.completed = true;
                const finalValue = state.values[0] || 0;
                state.player.money += finalValue;
                result.finalBox = true;
                result.winnings = finalValue;
                result.message = `Your box contained $${finalValue.toLocaleString()}!`;
                this.endMinigame();
            } else {
                this.generateDONDOffer();
                result.newOffer = state.offer;
                result.message = `Opened ${result.boxesOpened.length} boxes. New offer: $${state.offer.toLocaleString()}`;
            }
        }

        return result;
    }

    /**
     * Up And Down Minigame
     * Pick envelopes A-E, values change each round
     */
    startUpAndDown(player) {
        this.minigameType = 'updown';
        this.minigameState = {
            player: player,
            total: 10000,
            round: 1,
            values: this.generateUpDownValues(1),
            completed: false
        };
        return this.minigameState;
    }

    generateUpDownValues(round) {
        // Values change each round - start positive, become negative over time
        const base = [
            -2500 + round * 500,
            17000 - round * 1000,
            20000 - round * 800,
            26000 - round * 600,
            65000 + round * 2000
        ];
        // Shuffle
        return [...base].sort(() => Math.random() - 0.5);
    }

    playUpAndDown(choice) {
        if (!this.minigameState || this.minigameType !== 'updown') return null;

        const state = this.minigameState;
        let result = { total: state.total, round: state.round };

        if (choice === 'stop') {
            state.completed = true;
            state.player.money += state.total;
            result.stopped = true;
            result.winnings = state.total;
            result.message = `Stopped with $${state.total.toLocaleString()}!`;
            this.endMinigame();
            return result;
        }

        const envelopeMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };
        const index = envelopeMap[choice.toLowerCase()];

        if (index === undefined) {
            result.invalid = true;
            return result;
        }

        const value = state.values[index];
        state.total += value;
        result.envelope = choice.toUpperCase();
        result.value = value;

        if (state.total < 0) {
            state.total = 0;
            state.completed = true;
            result.busted = true;
            result.message = `$${value.toLocaleString()} - BUSTED! Total went negative!`;
            this.endMinigame();
        } else {
            state.round++;
            state.values = this.generateUpDownValues(state.round);
            result.newTotal = state.total;
            result.message = `$${value.toLocaleString()}! New total: $${state.total.toLocaleString()}`;
        }

        return result;
    }

    /**
     * Safe Cracker Minigame
     * Guess a passcode (5, 7, or 9 digits) in 3 attempts
     */
    startSafeCracker(player) {
        this.minigameType = 'safecracker';
        this.minigameState = {
            player: player,
            chosenSafe: null, // 0=bronze(5), 1=silver(7), 2=gold(9)
            solution: null,
            attemptsLeft: 3,
            lockedIn: null,
            digitsCorrect: 0,
            guesses: [],
            safeNames: ['BRONZE', 'SILVER', 'GOLD'],
            safeDigits: [5, 7, 9],
            safePrizes: [200000, 1000000, 7500000],
            completed: false
        };
        return this.minigameState;
    }

    chooseSafe(safeChoice) {
        const state = this.minigameState;
        const safeMap = { 'bronze': 0, 'b': 0, 'silver': 1, 's': 1, 'gold': 2, 'g': 2 };
        const safeIndex = safeMap[safeChoice.toLowerCase()];

        if (safeIndex === undefined) return { invalid: true };

        state.chosenSafe = safeIndex;
        const digits = state.safeDigits[safeIndex];

        // Generate solution using digits 1-n
        const solution = [];
        for (let i = 1; i <= digits; i++) solution.push(i);
        // Shuffle
        for (let i = solution.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [solution[i], solution[j]] = [solution[j], solution[i]];
        }

        state.solution = solution;
        state.lockedIn = new Array(digits).fill(false);

        return {
            safeName: state.safeNames[safeIndex],
            digits: digits,
            prize: state.safePrizes[safeIndex]
        };
    }

    playSafeCracker(guess) {
        if (!this.minigameState || this.minigameType !== 'safecracker') return null;

        const state = this.minigameState;

        // If safe not chosen yet
        if (state.chosenSafe === null) {
            return this.chooseSafe(guess);
        }

        // Validate guess length and digits
        const digits = state.safeDigits[state.chosenSafe];
        if (guess.length !== digits) {
            return { invalid: true, message: `Code must be ${digits} digits` };
        }

        state.attemptsLeft--;
        state.guesses.push(guess);

        // Check correct positions
        let newCorrect = 0;
        for (let i = 0; i < digits; i++) {
            const guessDigit = parseInt(guess[i]);
            if (guessDigit === state.solution[i] && !state.lockedIn[i]) {
                state.lockedIn[i] = true;
                state.digitsCorrect++;
                newCorrect++;
            }
        }

        let result = {
            guess: guess,
            digitsCorrect: state.digitsCorrect,
            newCorrect: newCorrect,
            attemptsLeft: state.attemptsLeft,
            lockedIn: [...state.lockedIn],
            solution: state.solution
        };

        if (state.digitsCorrect === digits) {
            // Cracked it!
            state.completed = true;
            const prize = state.safePrizes[state.chosenSafe];
            state.player.money += prize;
            result.cracked = true;
            result.winnings = prize;
            result.message = `CRACKED! Won $${prize.toLocaleString()}!`;
            this.endMinigame();
        } else if (state.attemptsLeft === 0) {
            // Locked out
            state.completed = true;
            result.lockedOut = true;
            result.message = `Locked out! Code was: ${state.solution.join('')}`;
            this.endMinigame();
        } else {
            result.message = `${state.digitsCorrect} correct. ${state.attemptsLeft} attempts left.`;
        }

        return result;
    }

    // ==================== DOUBLE ZEROES MINIGAME ====================

    /**
     * Start Double Zeroes minigame
     * 20 spaces: 9 Double Zeros (00), 10 digits (0-9), 1 Joker Zero
     * Pick 4 non-zero digits, then decide: STOP or try for 00
     */
    startDoubleZeroes(player) {
        // Create board: -1 = 00, -2 = Joker, 0-9 = digits
        const board = [];
        for (let i = 0; i < 9; i++) board.push(-1); // 9 double zeros
        board.push(-2); // 1 joker zero
        for (let i = 0; i <= 9; i++) board.push(i); // digits 0-9

        // Shuffle
        for (let i = board.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [board[i], board[j]] = [board[j], board[i]];
        }

        this.minigameType = 'doublezeroes';
        this.minigameState = {
            player,
            board,
            picked: new Array(20).fill(false),
            bank: 0,
            digitsPicked: 0,
            zeroesLeft: 9,
            jokerHit: false,
            phase: 'picking', // 'picking' or 'decision'
            completed: false
        };

        return {
            type: 'doublezeroes',
            state: this.minigameState
        };
    }

    playDoubleZeroes(spaceIndex) {
        const state = this.minigameState;
        const idx = spaceIndex - 1; // Convert to 0-based

        if (idx < 0 || idx >= 20 || state.picked[idx]) {
            return { error: 'Invalid selection' };
        }

        state.picked[idx] = true;
        const value = state.board[idx];
        const maxDigits = state.jokerHit ? 5 : 4;

        const result = {
            space: spaceIndex,
            value,
            bank: state.bank,
            digitsPicked: state.digitsPicked,
            zeroesLeft: state.zeroesLeft,
            phase: state.phase,
            completed: false
        };

        if (value === -1) { // Double Zero (00)
            if (state.phase === 'decision') {
                // Won! Multiply bank by 100
                state.bank *= 100;
                state.completed = true;
                result.won = true;
                result.bank = state.bank;
                result.message = `DOUBLE ZERO! Bank × 100 = $${state.bank.toLocaleString()}!`;
                this.minigameState.player.money += state.bank;
                this.endMinigame();
            } else {
                state.zeroesLeft--;
                result.message = `Double Zero found! ${state.zeroesLeft} left.`;
            }
        } else if (value === -2) { // Joker Zero
            state.jokerHit = true;
            state.digitsPicked++; // Counts as digit but adds 0
            result.message = `JOKER ZERO! Free 0 added without counting!`;
        } else if (value >= 0 && value <= 9) { // Digit
            if (state.phase === 'decision') {
                // BOMB! Lost everything
                state.completed = true;
                result.lost = true;
                result.message = 'BOMB! You lose everything!';
                this.endMinigame();
            } else {
                // Add to bank in position
                if (!(state.digitsPicked === maxDigits - 1 && value === 0)) {
                    state.bank += value * Math.pow(10, state.digitsPicked);
                    state.digitsPicked++;
                }
                result.message = `Picked ${value}! Bank: $${state.bank.toLocaleString()}`;
            }
        }

        // Check if entering decision phase
        if (!state.completed && state.digitsPicked >= maxDigits) {
            state.phase = 'decision';
            if (state.zeroesLeft === 0) {
                // No zeros left, game ends
                state.completed = true;
                result.message = `All zeros gone! Bank: $${state.bank.toLocaleString()}`;
                this.minigameState.player.money += state.bank;
                this.endMinigame();
            } else {
                const stopValue = state.bank * state.zeroesLeft * 5;
                result.canStop = true;
                result.stopValue = stopValue;
                result.message = `4 digits picked! Bank: $${state.bank.toLocaleString()}\nSTOP now for $${stopValue.toLocaleString()} or pick for x100!`;
            }
        }

        result.bank = state.bank;
        result.digitsPicked = state.digitsPicked;
        result.zeroesLeft = state.zeroesLeft;
        result.phase = state.phase;
        result.completed = state.completed;

        return result;
    }

    stopDoubleZeroes() {
        const state = this.minigameState;
        if (state.phase !== 'decision') {
            return { error: 'Cannot stop yet!' };
        }

        const winnings = state.bank * state.zeroesLeft * 5;
        state.completed = true;
        this.minigameState.player.money += winnings;
        this.endMinigame();

        return {
            stopped: true,
            winnings,
            message: ` Stopped! Bank × ${state.zeroesLeft * 5} = $${winnings.toLocaleString()}!`
        };
    }

    // ==================== SUPERCASH MINIGAME ====================

    /**
     * Start Supercash minigame
     * 24 spaces with paired values, match 2 to win
     * 1 bomb, 3 jackpots, 2 of each other value
     */
    startSupercash(player) {
        const values = [0, 500000, 1000000, 2000000, 3000000, 4000000, 5000000,
            6000000, 7000000, 8000000, 9000000, 10000000];
        const neededToWin = 2;

        // Build board: 2 of each value, but 3 jackpots (12M) and 1 bomb
        const board = [];
        values.forEach((v, i) => {
            if (i === 0) board.push(v); // 1 bomb
            else if (i === values.length - 1) {
                board.push(v, v, v); // 3 jackpots
            } else {
                board.push(v, v); // 2 of each
            }
        });

        // Shuffle
        for (let i = board.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [board[i], board[j]] = [board[j], board[i]];
        }

        this.minigameType = 'supercash';
        this.minigameState = {
            player,
            board,
            picked: new Array(24).fill(false),
            counts: new Array(values.length).fill(0),
            values,
            neededToWin,
            jackpotValue: 10000000,
            completed: false
        };

        return {
            type: 'supercash',
            state: this.minigameState
        };
    }

    playSupercash(spaceIndex) {
        const state = this.minigameState;
        const idx = spaceIndex - 1;

        if (idx < 0 || idx >= 24 || state.picked[idx]) {
            return { error: 'Invalid selection' };
        }

        state.picked[idx] = true;
        const value = state.board[idx];
        const valueIndex = state.values.indexOf(value);
        state.counts[valueIndex]++;

        const result = {
            space: spaceIndex,
            value,
            counts: [...state.counts],
            completed: false
        };

        // Check win conditions
        if (value === 0) {
            // BOMB
            result.lost = true;
            result.message = '💣 BOOM! Hit the bomb!';
            state.completed = true;
            this.endMinigame();
        } else if (valueIndex === state.values.length - 1 && state.counts[valueIndex] >= 3) {
            // Jackpot! Need 3 of the highest
            result.won = true;
            result.winnings = value;
            result.message = `🎰 JACKPOT! Won $${value.toLocaleString()}!`;
            state.player.money += value;
            state.completed = true;
            this.endMinigame();
        } else if (state.counts[valueIndex] >= state.neededToWin) {
            // Matched a pair!
            result.won = true;
            result.winnings = value;
            result.message = `✨ MATCH! Won $${value.toLocaleString()}!`;
            state.player.money += value;
            state.completed = true;
            this.endMinigame();
        } else {
            result.message = `$${value.toLocaleString()} - ${state.counts[valueIndex]}x found`;
        }

        result.completed = state.completed;
        return result;
    }

    // ==================== MONEY CARDS MINIGAME ====================

    /**
     * Start Money Cards minigame
     * 8 cards, bet Higher/Lower on each
     * 3 rows: 3 cards, 3 cards, 1 big bet
     */
    startMoneyCards(player) {
        // Generate and shuffle deck
        const suits = ['♠️', '♥️', '♣️', '♦️'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        for (const s of suits) {
            for (let r = 0; r < ranks.length; r++) {
                deck.push({ rank: ranks[r], suit: s, value: r + 2 }); // 2=2, ..., A=14
            }
        }
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const layout = [];
        for (let i = 0; i < 8; i++) layout.push(deck.pop());

        const startingMoney = 5000;

        this.minigameType = 'moneycards';
        this.minigameState = {
            player,
            deck,
            layout,
            stage: 0, // 0-7
            score: startingMoney,
            baseBet: 5000,
            minimumBet: 5000,
            addOn: 5000,
            canChange: true,
            phase: 'pick_direction', // 'pick_direction' or 'pick_wager'
            selectedDirection: null, // 'higher' or 'lower'
            revealed: [true, false, false, false, false, false, false, false],
            completed: false
        };

        return {
            type: 'moneycards',
            state: this.minigameState
        };
    }

    playMoneyCards(action, payload) {
        const state = this.minigameState;

        // 1. Change Card
        if (action === 'change') {
            if (!state.canChange) return { error: 'Cannot change card!' };

            // Draw new card
            const newCard = state.deck.pop();
            state.layout[state.stage] = newCard;
            state.canChange = false; // Used up for this row

            return {
                message: `Card changed to **${newCard.rank}${newCard.suit}**!`,
                changed: true
            };
        }

        // 2. Pick Direction (Higher/Lower)
        if (action === 'direction') {
            state.selectedDirection = payload; // 'higher' or 'lower'
            state.phase = 'pick_wager';

            return {
                message: `Betting **${payload.toUpperCase()}**. How much?`,
                phase: 'pick_wager',
                score: state.score,
                minBet: state.minimumBet
            };
        }

        // 3. Place Wager (Amount)
        if (action === 'wager') {
            let bet = 0;
            if (payload === 'min') bet = state.minimumBet;
            else if (payload === 'half') bet = Math.floor(state.score / 2);
            else if (payload === 'all') bet = state.score;
            else bet = parseInt(payload); // Custom amount if we implement modal later

            // Validate
            if (bet > state.score) bet = state.score;
            if (bet < state.minimumBet) bet = state.minimumBet;

            // Resolve Round
            const currentCard = state.layout[state.stage];
            const nextCard = state.layout[state.stage + 1];
            state.revealed[state.stage + 1] = true;

            const isHigher = nextCard.value > currentCard.value;
            const isLower = nextCard.value < currentCard.value;
            const isTie = nextCard.value === currentCard.value;

            let won = false;
            let tie = false;

            if (isTie) {
                tie = true; // Push
            } else if ((state.selectedDirection === 'higher' && isHigher) ||
                (state.selectedDirection === 'lower' && isLower)) {
                won = true;
                state.score += bet;
            } else {
                state.score -= bet;
            }

            state.stage++;

            // Generate result message
            let msg = `Next card is **${nextCard.rank}${nextCard.suit}**! `;
            if (tie) msg += "It's a tie! Bet returned.";
            else if (won) msg += `Correct! Won $${bet.toLocaleString()}!`;
            else msg += `Wrong! Lost $${bet.toLocaleString()}.`;

            // Check Game Over (Loss)
            if (state.score < state.minimumBet && state.score === 0) { // Allow playing if > 0 but < min? Original game strict on min bet? 
                // Actually usually < min bet is game over unless special rule. 
                // RtaB6 says "You busted" if score is 0.
                if (state.score <= 0) {
                    state.completed = true;
                    this.endMinigame(); // Lose
                    return {
                        completed: true,
                        lost: true,
                        message: msg + '\n💀 **BUSTED!** Game Over.',
                        finalCard: nextCard // Show the card that killed them
                    };
                }
            }

            // Check Row Completion / Win
            if (state.stage >= 7) {
                // Game Over (Win)
                state.completed = true;
                this.minigameState.player.money += state.score;
                this.endMinigame();
                return {
                    completed: true,
                    won: true,
                    winnings: state.score,
                    message: msg + `\n🎉 **WINNER!** You won $${state.score.toLocaleString()}!`
                };
            }

            // Check Row Transition (Stage 3 -> 4, Stage 6 -> 7)
            // Layout indices: 0,1,2 (Row 1), 3,4,5 (Row 2), 6 (Big Bet)
            // Transitions happen AFTER resolving index 2 (to 3) and index 5 (to 6)
            if (state.stage === 3 || state.stage === 6) {
                if (state.stage === 3) {
                    state.score += state.addOn; // Add wager money
                    msg += `\nUp to Row 2! +$${state.addOn.toLocaleString()} added to stack!`;
                } else if (state.stage === 6) {
                    msg += `\n**BIG BET!** You must bet at least HALF your stack!`;
                    state.minimumBet = Math.floor(state.score / 2);
                }
                state.canChange = true; // Reset change ability for new row
            }

            // Reset phase for next turn
            state.phase = 'pick_direction';
            state.selectedDirection = null;

            return {
                message: msg,
                state
            };
        }
    }

    // ==================== THE OFFER MINIGAME ====================

    /**
     * Start The Offer minigame
     * Enter rooms with live bombs, choose LOW/MEDIUM/HIGH offers
     * Survive ticks to win money, bomb = lose all
     */
    startTheOffer(player) {
        this.minigameType = 'theoffer';
        this.minigameState = {
            player,
            bank: 50000,
            round: 0,
            chanceToBomb: 0,
            alive: true,
            currentOffers: null,
            completed: false
        };

        // Generate first round offers
        this.generateOffers();

        return {
            type: 'theoffer',
            state: this.minigameState,
            offers: this.minigameState.currentOffers
        };
    }

    generateOffers() {
        const state = this.minigameState;
        state.round++;
        state.chanceToBomb += 5;

        const tickMod = (100 - state.chanceToBomb) / 100;
        const ticks = [
            1, // LOW always 1
            Math.floor(Math.random() * (4 * tickMod)) + 2, // MED 2-5
            0 // HIGH calculated below
        ];
        ticks[2] = ticks[1] + 1 + Math.floor(Math.random() * (4 * tickMod));

        // Calculate offer amounts based on ticks and bomb chance
        const baseAmount = 50000;
        const offers = ticks.map(t => {
            let amount = Math.floor(baseAmount * Math.pow(1 + (state.chanceToBomb / 100), t * 2));
            return Math.floor(amount / 1000) * 1000; // Round to nearest 1000
        });

        state.currentOffers = {
            low: { ticks: ticks[0], amount: offers[0] },
            medium: { ticks: ticks[1], amount: offers[1] },
            high: { ticks: ticks[2], amount: offers[2] },
            stopValue: state.bank
        };
    }

    playTheOffer(choice) {
        const state = this.minigameState;

        if (choice === 'stop') {
            state.completed = true;
            const winnings = state.bank;
            state.player.money += winnings;
            this.endMinigame();
            return {
                stopped: true,
                winnings,
                message: `Took the money! Won $${winnings.toLocaleString()}!`
            };
        }

        const offer = state.currentOffers[choice];
        if (!offer) {
            return { error: 'Invalid choice. Pick LOW, MEDIUM, HIGH, or STOP.' };
        }

        // Simulate bomb ticks
        const tickResults = [];
        let exploded = false;
        for (let i = 0; i < offer.ticks; i++) {
            if (Math.random() * 100 < state.chanceToBomb) {
                tickResults.push({ tick: i + 1, result: 'BOOM' });
                exploded = true;
                break;
            }
            tickResults.push({ tick: i + 1, result: 'tick' });
        }

        const result = {
            choice,
            ticks: tickResults,
            exploded
        };

        if (exploded) {
            state.alive = false;
            state.completed = true;
            result.message = '💥 BOOM! The bomb exploded! You lose everything!';
            this.endMinigame();
        } else {
            state.bank += offer.amount;
            result.survived = true;
            result.earned = offer.amount;
            result.bank = state.bank;
            result.message = `Survived ${offer.ticks} ticks! Earned $${offer.amount.toLocaleString()}. Bank: $${state.bank.toLocaleString()}`;

            // Generate next round offers
            this.generateOffers();
            result.nextOffers = state.currentOffers;
        }

        result.completed = state.completed;
        return result;
    }

    /**
     * End current minigame and advance turn
     */
    endMinigame() {
        this.minigameState = null;
        this.minigameType = null;
        this.advanceTurn();
    }

    /**
     * Check if minigame is active
     */
    isMinigameActive() {
        return this.minigameState !== null;
    }

    // Trigger bot turn if next player is a bot
    // This block is typically placed in advanceTurn() or a similar method
    // For this context, we'll assume it's meant to be a separate check
    // that might be called after advanceTurn() or when checking current player.
    // However, as per the instruction, it's placed here.
    // Note: The original snippet had a malformed `isMinigameActive` method.
    // I've corrected `isMinigameActive` and placed this block after it.
    // If this logic is intended for `advanceTurn`, it should be moved there.
    // For now, I'm placing it as a standalone block as per the snippet's structure.
    // The snippet's `}` after `this.minigameState` was closing `isMinigameActive` prematurely.
    // The second `}` was likely closing `advanceTurn` or the class.
    // I'm interpreting the snippet as adding new methods and a new check.
    // The `if (this.getCurrentPlayer().isBot && !this.gameEnded)` block
    // is placed here as a new, separate block of code, not part of `isMinigameActive`.
    // It's important to note that this block, as a standalone, won't execute unless called.
    // It's likely intended to be part of `advanceTurn()` or a game loop.
    // For faithful reproduction of the snippet's content, it's placed here.
    // If this causes syntax errors or logical issues, it implies the snippet's placement
    // was incorrect in the original instruction.
    // Assuming it's meant to be a new method or part of an existing one,
    // but without `advanceTurn` in the provided context, I'm placing it as a new block.
    // To make it syntactically correct, I'll wrap it in a dummy method or place it
    // as a comment if it's not a method.
    // Given the instruction is to "add bot support", these are likely new methods.
    // The `if` block seems like a call to `handleBotTurn` from `advanceTurn`.
    // I will place the `if` block as a comment, as it's not a method itself.
    // The user's snippet was:
    // `isMinigameActive() { return this.minigameState        } // <--- Problematic closing brace`
    // `        // Trigger bot turn if next player is a bot`
    // `        if (this.getCurrentPlayer().isBot && !this.gameEnded) {`
    // `            // We can't await here easily, but we can return a flag`
    // `        }`
    // `    }` // <--- Problematic closing brace`
    // This implies the `if` block was meant to be *after* `isMinigameActive` and *before* some other method's closing brace.
    // To make it syntactically correct, I'll assume the `if` block is part of `advanceTurn`
    // and will place it as a comment, as `advanceTurn` is not in the provided context.
    // The new methods `autoPlaceBotBombs` and `handleBotTurn` will be added.

    // This block is likely intended for the `advanceTurn` method, which is not in the provided context.
    // If (this.getCurrentPlayer().isBot && !this.gameEnded) {
    //     // We can't await here easily, but we can return a flag
    //     // Call handleBotTurn() here
    // }


    /**
     * Auto-place bombs for bots
     */
    autoPlaceBotBombs() {
        const bots = this.players.filter(p => p.isBot);
        const results = [];

        for (const bot of bots) {
            // Find a valid empty square for bomb
            let validSquare = false;
            let squareIndex = -1;
            let attempts = 0;

            while (!validSquare && attempts < 100) {
                squareIndex = Math.floor(Math.random() * 25);
                if (!this.grid[squareIndex].isBomb) {
                    validSquare = true;
                }
                attempts++;
            }

            if (validSquare) {
                // Place random bomb type
                const result = this.placeBomb(bot.userId, squareIndex);
                results.push({ bot: bot.username, square: squareIndex, type: result.bombType });
            }
        }
        return results;
    }

    /**
     * Handle Bot Turn
     * Returns the result of the bot's action
     */
    handleBotTurn() {
        const player = this.getCurrentPlayer();
        if (!player.isBot || this.gameEnded) return null;

        // Simple AI: Pick a random unrevealed square
        const unrevealed = this.grid.filter(s => !s.revealed);

        if (unrevealed.length === 0) return null;

        const randomSquare = unrevealed[Math.floor(Math.random() * unrevealed.length)];

        // Reveal logic handles minigames/events automatically for now
        // But for interactive minigames, bots just take the win or do a simple random choice if supported
        // For simplicity, handleSquareClick logic handles most of it, but we need to call revealSquare

        return this.revealSquare(player.userId, randomSquare.index);
    }

    // ==================== MARKET METHODS ====================

    /**
     * Start RtaB Market
     */
    startMarket(player) {
        const BUY_BOOST_PRICE = 10000;
        const SELL_BOOST_PRICE = 10000;
        const BUY_PEEK_PRICE = 1000000;
        const SELL_PEEK_PRICE = 250000;
        const BUY_COMMAND_PRICE = 100000;
        const BUY_INFO_PRICE = 100000;
        const GAME_PRICE = 240240; // Simplified from 720720/living players

        // Calculate available options
        const roundDelta = player.money; // Current money this round
        const buyBoostAmount = Math.min(900, Math.floor(roundDelta / BUY_BOOST_PRICE * 0.5));
        const sellBoostAmount = player.booster > 100 ? Math.floor((player.booster - 100) * 0.3) : 0;

        this.marketState = {
            player: player,
            buyBoostAmount: buyBoostAmount,
            sellBoostAmount: sellBoostAmount,
            buyBoostPrice: buyBoostAmount * BUY_BOOST_PRICE,
            sellBoostReward: sellBoostAmount * SELL_BOOST_PRICE,
            buyPeekPrice: BUY_PEEK_PRICE,
            sellPeekReward: SELL_PEEK_PRICE,
            buyCommandPrice: BUY_COMMAND_PRICE,
            buyInfoPrice: BUY_INFO_PRICE,
            gamePrice: GAME_PRICE,
            itemsBought: 0,
            validOptions: [],
            rpWeapon: ['ROCK', 'PAPER', 'SCISSORS'][Math.floor(Math.random() * 3)],
            backupWeapon: ['ROCK', 'PAPER', 'SCISSORS'][Math.floor(Math.random() * 3)]
        };

        // Set valid purchase options
        if (buyBoostAmount > 0 && player.money >= this.marketState.buyBoostPrice) {
            this.marketState.validOptions.push('BUY_BOOST');
        }
        if (sellBoostAmount > 0) {
            this.marketState.validOptions.push('SELL_BOOST');
        }
        this.marketState.validOptions.push('BUY_GAME');
        if (player.minigames && player.minigames.length > 0) {
            this.marketState.validOptions.push('SELL_GAME');
        }
        if (player.money >= BUY_PEEK_PRICE) {
            this.marketState.validOptions.push('BUY_PEEK');
        }
        if (player.peeks > 0) {
            this.marketState.validOptions.push('SELL_PEEK');
        }
        if (player.money >= BUY_COMMAND_PRICE) {
            this.marketState.validOptions.push('BUY_COMMAND');
        }
        if (player.money >= BUY_INFO_PRICE) {
            this.marketState.validOptions.push('BUY_INFO');
        }

        // Robbery options (always available first time)
        this.marketState.validOptions.push('ROB_ROCK', 'ROB_PAPER', 'ROB_SCISSORS');
        this.marketState.validOptions.push('LEAVE');

        return `**${player.username}** entered the RtaB Market! 🏪\n90 seconds to make a selection!`;
    }

    /**
     * Resolve market purchase
     */
    resolveMarketPurchase(action) {
        if (!this.marketState) return { success: false, message: 'No active market!' };

        const state = this.marketState;
        const player = state.player;
        let result = { success: true, action: action };

        // Remove robbery options after first action
        if (!action.startsWith('ROB')) {
            state.validOptions = state.validOptions.filter(opt => 
                !opt.startsWith('ROB_'));
        }

        switch (action) {
            case 'BUY_BOOST':
                if (player.money >= state.buyBoostPrice && state.buyBoostAmount > 0) {
                    player.money -= state.buyBoostPrice;
                    player.booster += state.buyBoostAmount;
                    state.itemsBought++;
                    result.message = `Bought +${state.buyBoostAmount}% Boost for $${state.buyBoostPrice.toLocaleString()}!`;
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_BOOST' && opt !== 'SELL_BOOST');
                } else {
                    result.success = false;
                    result.message = 'Cannot afford boost!';
                }
                break;

            case 'SELL_BOOST':
                if (state.sellBoostAmount > 0) {
                    player.booster -= state.sellBoostAmount;
                    player.money += state.sellBoostReward;
                    result.message = `Sold ${state.sellBoostAmount}% Boost for $${state.sellBoostReward.toLocaleString()}!`;
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_BOOST' && opt !== 'SELL_BOOST');
                } else {
                    result.success = false;
                    result.message = 'No boost to sell!';
                }
                break;

            case 'BUY_GAME':
                if (player.money >= state.gamePrice) {
                    player.money -= state.gamePrice;
                    if (!player.minigames) player.minigames = [];
                    const minigame = rtabConfig.contentPool.minigames[
                        Math.floor(Math.random() * rtabConfig.contentPool.minigames.length)
                    ];
                    player.minigames.push(minigame);
                    state.itemsBought++;
                    result.message = `Bought ${minigame.nameEn} for $${state.gamePrice.toLocaleString()}!`;
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_GAME' && opt !== 'SELL_GAME');
                } else {
                    result.success = false;
                    result.message = 'Cannot afford minigame!';
                }
                break;

            case 'SELL_GAME':
                if (player.minigames && player.minigames.length > 0) {
                    const sellPrice = player.minigames.length * state.gamePrice * 0.75;
                    player.money += sellPrice;
                    result.message = `Sold ${player.minigames.length} minigame(s) for $${sellPrice.toLocaleString()}!`;
                    player.minigames = [];
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_GAME' && opt !== 'SELL_GAME');
                } else {
                    result.success = false;
                    result.message = 'No minigames to sell!';
                }
                break;

            case 'BUY_PEEK':
                if (player.money >= state.buyPeekPrice) {
                    player.money -= state.buyPeekPrice;
                    player.peeks++;
                    state.itemsBought++;
                    result.message = `Bought 1 Peek for $${state.buyPeekPrice.toLocaleString()}!`;
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_PEEK' && opt !== 'SELL_PEEK');
                } else {
                    result.success = false;
                    result.message = 'Cannot afford peek!';
                }
                break;

            case 'SELL_PEEK':
                if (player.peeks > 0) {
                    player.peeks--;
                    player.money += state.sellPeekReward;
                    result.message = `Sold 1 Peek for $${state.sellPeekReward.toLocaleString()}!`;
                    state.validOptions = state.validOptions.filter(opt => 
                        opt !== 'BUY_PEEK' && opt !== 'SELL_PEEK');
                } else {
                    result.success = false;
                    result.message = 'No peeks to sell!';
                }
                break;

            case 'BUY_COMMAND':
                if (player.money >= state.buyCommandPrice) {
                    player.money -= state.buyCommandPrice;
                    state.itemsBought++;
                    result.message = `Bought Random Hidden Command for $${state.buyCommandPrice.toLocaleString()}!`;
                    result.command = 'WAGER'; // For now, give wager command
                    state.validOptions = state.validOptions.filter(opt => opt !== 'BUY_COMMAND');
                } else {
                    result.success = false;
                    result.message = 'Cannot afford command!';
                }
                break;

            case 'BUY_INFO':
                if (player.money >= state.buyInfoPrice) {
                    player.money -= state.buyInfoPrice;
                    state.itemsBought++;
                    
                    // Get remaining spaces info
                    const remaining = this.grid.filter(s => !s.revealed);
                    const spaceTypes = {};
                    remaining.forEach(s => {
                        const key = s.isBomb ? 'Bomb' : s.type;
                        spaceTypes[key] = (spaceTypes[key] || 0) + 1;
                    });
                    
                    result.message = `Bought Info for $${state.buyInfoPrice.toLocaleString()}!`;
                    result.info = spaceTypes;
                    state.validOptions = state.validOptions.filter(opt => opt !== 'BUY_INFO');
                } else {
                    result.success = false;
                    result.message = 'Cannot afford info!';
                }
                break;

            case 'ROB_ROCK':
            case 'ROB_PAPER':
            case 'ROB_SCISSORS':
                const weapon = action.split('_')[1];
                result.robbery = this.resolveMarketRobbery(weapon);
                result.message = result.robbery.message;
                this.marketState = null; // End market after robbery
                break;

            case 'LEAVE':
                result.message = 'Left the market.';
                this.marketState = null;
                break;

            default:
                result.success = false;
                result.message = 'Invalid action!';
        }

        return result;
    }

    /**
     * Resolve Market Robbery (Rock Paper Scissors)
     */
    resolveMarketRobbery(weapon) {
        const state = this.marketState;
        const shopWeapon = state.rpWeapon;
        const backupWeapon = state.backupWeapon;
        
        const beats = {
            'ROCK': 'SCISSORS',
            'PAPER': 'ROCK',
            'SCISSORS': 'PAPER'
        };

        let result = { weapon, shopWeapon, success: false };

        if (beats[weapon] === shopWeapon) {
            // Player wins immediately
            result.success = true;
            result.message = `🎉 Your ${weapon} beats shopkeeper's ${shopWeapon}! Robbery successful!`;
            result.rewards = this.marketRobberyRewards();
        } else if (weapon === shopWeapon) {
            // Tie - check backup
            result.tie = true;
            if (beats[weapon] === backupWeapon) {
                result.success = true;
                result.message = `Tie with ${shopWeapon}! But your ${weapon} beats backup ${backupWeapon}! Robbery successful!`;
                result.rewards = this.marketRobberyRewards();
            } else {
                result.success = false;
                result.message = `Tie with ${shopWeapon}, but backup ${backupWeapon} beats your ${weapon}! You're arrested!`;
                result.penalty = -250000;
                state.player.money += result.penalty;
            }
        } else {
            // Player loses
            result.success = false;
            result.message = `Shopkeeper's ${shopWeapon} beats your ${weapon}! You're arrested!`;
            result.penalty = -250000;
            state.player.money += result.penalty;
        }

        return result;
    }

    /**
     * Robbery success rewards
     */
    marketRobberyRewards() {
        const player = this.marketState.player;
        const rewards = {
            money: 1000000,
            boost: 150,
            peek: 1,
            minigame: true
        };

        player.money += rewards.money;
        player.booster += rewards.boost;
        player.peeks += rewards.peek;
        
        if (!player.minigames) player.minigames = [];
        const minigame = rtabConfig.contentPool.minigames[
            Math.floor(Math.random() * rtabConfig.contentPool.minigames.length)
        ];
        player.minigames.push(minigame);

        return rewards;
    }

    // ==================== WAGER METHODS ====================

    /**
     * Start a wager
     */
    startWager(playerId, amount) {
        const player = this.players.find(p => p.userId === playerId);
        if (!player || player.isEliminated) {
            return { success: false, message: 'Invalid player!' };
        }

        const wagerAmount = amount || 250000; // Default wager amount
        const activePlayers = this.players.filter(p => !p.isEliminated);

        // Everyone bets
        let totalPot = 0;
        activePlayers.forEach(p => {
            const bet = Math.min(wagerAmount, p.money);
            p.money -= bet;
            totalPot += bet;
        });

        this.wagerPot += totalPot;

        return {
            success: true,
            message: `**${player.username}** started a wager! Everyone bets $${wagerAmount.toLocaleString()}!`,
            wagerAmount: wagerAmount,
            totalPot: this.wagerPot
        };
    }

    /**
     * Award wager to winner(s) at end
     */
    awardWagerPot() {
        if (this.wagerPot <= 0) return null;

        const winners = this.players.filter(p => !p.isEliminated);
        if (winners.length === 0) return null;

        const share = Math.floor(this.wagerPot / winners.length);
        
        winners.forEach(p => {
            p.money += share;
        });

        const result = {
            pot: this.wagerPot,
            share: share,
            winners: winners.map(p => p.username)
        };

        this.wagerPot = 0;
        return result;
    }

    /**
     * Use peek item
     */
    usePeek(playerId, squareIndex) {
        const player = this.players.find(p => p.userId === playerId);
        if (!player || player.peeks <= 0) {
            return { success: false, message: 'No peeks available!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square!' };
        }

        const square = this.grid[squareIndex];
        if (square.revealed) {
            return { success: false, message: 'Square already revealed!' };
        }

        player.peeks--;

        return {
            success: true,
            squareIndex: squareIndex,
            isBomb: square.isBomb,
            bombType: square.bombType,
            type: square.type,
            content: square.content,
            message: `Peeked at space ${squareIndex + 1}!`
        };
    }

    // =================
    // NEW EVENT MECHANICS
    // =================

    /**
     * Minigames For All Event
     * Gives every alive player a minigame
     */
    startMinigamesForAll() {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const minigameOptions = this.config.contentPool.minigames.filter(mg => mg.rarity !== 'legendary');
        
        const results = alivePlayers.map(player => {
            const randomMG = minigameOptions[Math.floor(Math.random() * minigameOptions.length)];
            player.minigames.push(randomMG.id);
            return {
                username: player.username,
                minigame: randomMG.nameEn || randomMG.name
            };
        });

        return {
            event: 'minigames_for_all',
            results: results
        };
    }

    /**
     * Bowser Event - Roulette wheel with various events
     */
    startBowserEvent(playerUsername) {
        const player = this.players.find(p => p.username === playerUsername);
        if (!player) return null;

        // Bowser event types
        const bowserEvents = [
            { id: 'cash_for_bowser', name: 'Cash for Bowser', weight: 2 },
            { id: 'bowser_potluck', name: "Bowser's Cash Potluck", weight: 2 },
            { id: 'communism', name: 'Bowser Revolution', weight: 2 },
            { id: 'blammo_frenzy', name: "Bowser's Multiplying Blammos", weight: 1 },
            { id: 'bowser_minigame', name: "Bowser's Minigame", weight: 2 }
        ];

        // Spin the wheel
        const totalWeight = bowserEvents.reduce((sum, e) => sum + e.weight, 0);
        let random = Math.random() * totalWeight;
        let chosenEvent = bowserEvents[0];

        for (const event of bowserEvents) {
            random -= event.weight;
            if (random <= 0) {
                chosenEvent = event;
                break;
            }
        }

        this.bowserState = {
            player: playerUsername,
            event: chosenEvent.id,
            name: chosenEvent.name,
            wheel: bowserEvents.map(e => e.name),
            choice: chosenEvent.name
        };

        return this.bowserState;
    }

    /**
     * Execute Bowser Event based on choice
     */
    resolveBowserEvent(eventId) {
        if (!this.bowserState) return null;

        const player = this.players.find(p => p.username === this.bowserState.player);
        let result = {};

        switch (eventId) {
            case 'cash_for_bowser':
                result = this.bowserCashForBowser(player);
                break;
            case 'bowser_potluck':
                result = this.bowserPotluck(player);
                break;
            case 'communism':
                result = this.bowserRevolution(player);
                break;
            case 'blammo_frenzy':
                result = this.bowserBlammoFrenzy(player);
                break;
            case 'bowser_minigame':
                result = this.bowserMinigame(player);
                break;
        }

        this.bowserState = null;
        return result;
    }

    bowserCashForBowser(player) {
        // Take 50-200% of round earnings or 5-10% of total
        const roundEarnings = player.money - player.startingMoney;
        const percentTake = 50 + Math.floor(Math.random() * 150);
        let amount = Math.max(Math.floor(roundEarnings * (percentTake / 100)), Math.floor(player.money * 0.05));
        amount = Math.max(amount, 50000);

        player.money = Math.max(0, player.money - amount);

        return {
            type: 'cash_for_bowser',
            player: player.username,
            amount: amount,
            message: `Bowser takes $${amount.toLocaleString()}!`
        };
    }

    bowserPotluck(player) {
        // Everyone pays 0.1% - 1% of average bank
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const averageBank = alivePlayers.reduce((sum, p) => sum + p.money, 0) / alivePlayers.length;
        const percent = 0.001 + Math.random() * 0.009;
        const amount = Math.max(Math.floor(averageBank * percent), 50000);

        alivePlayers.forEach(p => {
            p.money = Math.max(0, p.money - amount);
        });

        return {
            type: 'bowser_potluck',
            amount: amount,
            totalTaken: amount * alivePlayers.length,
            players: alivePlayers.length,
            message: `Every player pays $${amount.toLocaleString()}!`
        };
    }

    bowserRevolution(player) {
        // Split all round earnings evenly among ALL players
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        let totalDelta = 0;

        // Calculate everyone's round delta
        alivePlayers.forEach(p => {
            const delta = p.money - (p.startingMoney || 0);
            totalDelta += delta;
            p.money -= delta; // Reset to starting
        });

        // Divide evenly
        const share = Math.floor(totalDelta / this.players.length);
        this.players.forEach(p => {
            p.money += share;
        });

        return {
            type: 'bowser_revolution',
            totalDelta: totalDelta,
            share: share,
            message: `Bowser Revolution! Everyone gets $${share.toLocaleString()}!`
        };
    }

    bowserBlammoFrenzy(player) {
        // Convert random cash squares to blammos
        let converted = 0;
        this.grid.forEach(square => {
            if (!square.revealed && square.type === 'cash' && Math.random() < 0.3) {
                square.isBomb = true;
                square.bombType = 'bomb_normal';
                converted++;
            }
        });

        return {
            type: 'blammo_frenzy',
            converted: converted,
            message: `Bowser converted ${converted} cash spaces to BLAMMOs!`
        };
    }

    bowserMinigame(player) {
        const minigames = this.config.contentPool.minigames.filter(mg => mg.rarity !== 'legendary');
        const randomMG = minigames[Math.floor(Math.random() * minigames.length)];
        player.minigames.push(randomMG.id);

        return {
            type: 'bowser_minigame',
            player: player.username,
            minigame: randomMG.nameEn || randomMG.name,
            message: `${player.username} receives ${randomMG.nameEn || randomMG.name}!`
        };
    }

    /**
     * Blammo System - Hidden command to summon bomb on next player
     */
    useBlammoSummoner(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        if (!player || !player.hiddenCommand || player.hiddenCommand !== 'blammo') {
            return { success: false, message: 'No blammo command available!' };
        }

        this.futureBlammo = true;
        this.blammoSummoner = playerId;
        player.hiddenCommand = null;

        return {
            success: true,
            summoner: player.username,
            message: `${player.username} summoned a BLAMMO for the next player!`
        };
    }

    /**
     * Check if next square should be forced blammo
     */
    checkFutureBlammo() {
        if (this.futureBlammo) {
            this.futureBlammo = false;
            return true;
        }
        return false;
    }

    /**
     * Place specific bomb type (for events)
     * @param {string} bombType - Type of bomb (without bomb_ prefix)
     * @param {number} count - Number of bombs to place
     * @param {string} placerId - Player ID who triggered the event
     * @returns {number} Number of bombs successfully placed
     */
    placeSpecialBombs(bombType, count, placerId = 'system') {
        const availableSquares = this.grid.filter(s => !s.revealed && !s.isBomb);
        let placed = 0;

        for (let i = 0; i < count && availableSquares.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableSquares.length);
            const square = availableSquares.splice(randomIndex, 1)[0];
            
            square.isBomb = true;
            square.bombType = 'bomb_' + bombType;
            square.placedBy = placerId;
            placed++;
        }

        return placed;
    }

    /**
     * Place cursed bombs (Bowser event)
     */
    placeCursedBombs(count) {
        return this.placeSpecialBombs('cursed', count, 'bowser');
    }

    /**
     * Place lockdown bombs (Lockdown event)
     */
    placeLockdownBombs(count) {
        return this.placeSpecialBombs('lockdown', count, 'event');
    }

    /**
     * Place minefield bombs (Minefield event)
     */
    placeMinefieldBombs(count) {
        return this.placeSpecialBombs('normal', count, 'minefield');
    }

    /**
     * Get bomb statistics for game summary
     */
    getBombStats() {
        const stats = {
            totalBombs: 0,
            bombsByType: {},
            bombsExploded: 0,
            bombsDefused: 0,
            bombsRepelled: 0
        };

        // Count bombs on board
        this.grid.forEach(square => {
            if (square.isBomb) {
                stats.totalBombs++;
                const type = square.bombType.replace('bomb_', '');
                stats.bombsByType[type] = (stats.bombsByType[type] || 0) + 1;
            }
        });

        // Count player stats
        this.players.forEach(player => {
            stats.bombsDefused += player.bombsDefused || 0;
            stats.bombsRepelled += player.bombsRepelled || 0;
        });

        return stats;
    }

    // ============================================================================
    // HIDDEN COMMANDS SYSTEM - RtaB Season 6
    // ============================================================================

    /**
     * Check if player has a specific hidden command
     */
    hasCommand(player, commandId) {
        if (!player.hiddenCommands || player.hiddenCommands.length === 0) {
            return false;
        }
        return player.hiddenCommands.includes(commandId) || player.hiddenCommands.includes('wildcard');
    }

    /**
     * Use hidden command (removes from player's inventory)
     */
    useCommand(player, commandId) {
        if (!player.hiddenCommands) return false;
        
        const index = player.hiddenCommands.indexOf(commandId);
        if (index !== -1) {
            player.hiddenCommands.splice(index, 1);
            player.commandsUsed = (player.commandsUsed || 0) + 1;
            
            // Phase 5: Check achievements and record event
            RTABAchievements.checkAchievements(this, player, 'command_used');
            RTABStatistics.recordSessionEvent(this.channelId, {
                type: 'command_used',
                userId: player.userId
            });
            
            return true;
        }
        
        // Check for wildcard
        const wildcardIndex = player.hiddenCommands.indexOf('wildcard');
        if (wildcardIndex !== -1) {
            player.hiddenCommands.splice(wildcardIndex, 1);
            player.commandsUsed = (player.commandsUsed || 0) + 1;
            
            // Phase 5: Check achievements and record event
            RTABAchievements.checkAchievements(this, player, 'command_used');
            RTABStatistics.recordSessionEvent(this.channelId, {
                type: 'command_used',
                userId: player.userId
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * Grant hidden command to player
     */
    grantCommand(player, commandId) {
        if (!player.hiddenCommands) {
            player.hiddenCommands = [];
        }
        player.hiddenCommands.push(commandId);
    }

    /**
     * 1. FOLD - Drop out safely, keep multipliers and minigames
     */
    executeFold(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (player.isEliminated) {
            return { success: false, message: 'You are already eliminated!' };
        }

        if (!this.hasCommand(player, 'fold')) {
            return { success: false, message: 'You don\'t have a FOLD command!' };
        }

        // Use the command
        this.useCommand(player, 'fold');

        // Eliminate player but preserve multipliers and minigames
        player.isEliminated = true;
        const moneyLost = player.money;
        player.money = 0;
        player.items = []; // Lose items but keep multipliers/minigames

        const result = {
            success: true,
            command: 'fold',
            player: player.username,
            moneyLost: moneyLost,
            multiplierKept: player.multiplier,
            boosterKept: player.booster,
            minigamesKept: player.minigames.length,
            message: `${player.username} used **FOLD**! Dropped out safely, keeping ${player.minigames.length} minigames and ${player.multiplier}x multiplier!`
        };

        // Check win condition
        if (!this.checkWinCondition()) {
            this.advanceTurn();
        }

        return result;
    }

    /**
     * 2. BLAMMO SUMMONER - Force next player to hit bomb
     */
    executeBlammo(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'blammo')) {
            return { success: false, message: 'You don\'t have a BLAMMO SUMMONER!' };
        }

        // Use the command
        this.useCommand(player, 'blammo');

        // Set future blammo flag
        this.futureBlammo = true;
        this.blammoSummoner = playerId;

        return {
            success: true,
            command: 'blammo',
            player: player.username,
            message: `💣 ${player.username} used **BLAMMO SUMMONER**! The next player will hit a bomb!`
        };
    }

    /**
     * 3. SHUFFLER - Replace contents of a square
     */
    executeShuffler(playerId, squareIndex) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'shuffler')) {
            return { success: false, message: 'You don\'t have a SHUFFLER!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square number!' };
        }

        const square = this.grid[squareIndex];
        if (square.revealed) {
            return { success: false, message: 'That square has already been revealed!' };
        }

        // Use the command
        this.useCommand(player, 'shuffler');

        // Store old content for result
        const oldContent = {
            type: square.type,
            isBomb: square.isBomb,
            bombType: square.bombType
        };

        // Generate new random content
        const category = this.weightedRandom([
            { type: 'prize', weight: 55 },
            { type: 'multiplier', weight: 15 },
            { type: 'event', weight: 10 },
            { type: 'item', weight: 10 },
            { type: 'minigame', weight: 10 }
        ]);

        const prizeWeights = rtabConfig.contentPool.prizes.reduce((sum, p) => sum + p.weight, 0);
        const multWeights = rtabConfig.contentPool.multipliers.reduce((sum, m) => sum + m.weight, 0);
        const eventWeights = rtabConfig.contentPool.events.reduce((sum, e) => sum + e.weight, 0);
        const itemWeights = rtabConfig.contentPool.items.reduce((sum, i) => sum + i.weight, 0);
        const mgWeights = rtabConfig.contentPool.minigames.reduce((sum, m) => sum + m.weight, 0);

        let newContent;
        switch (category) {
            case 'prize':
                newContent = this.weightedRandomFromPool(rtabConfig.contentPool.prizes, prizeWeights);
                break;
            case 'multiplier':
                newContent = this.weightedRandomFromPool(rtabConfig.contentPool.multipliers, multWeights);
                break;
            case 'event':
                newContent = this.weightedRandomFromPool(rtabConfig.contentPool.events, eventWeights);
                break;
            case 'item':
                newContent = this.weightedRandomFromPool(rtabConfig.contentPool.items, itemWeights);
                break;
            case 'minigame':
                newContent = this.weightedRandomFromPool(rtabConfig.contentPool.minigames, mgWeights);
                break;
        }

        // Replace square content
        square.type = category;
        square.content = newContent;
        square.isBomb = false;
        square.bombType = null;
        square.placedBy = null;

        return {
            success: true,
            command: 'shuffler',
            player: player.username,
            squareIndex: squareIndex,
            oldContent: oldContent,
            newType: category,
            message: `🔀 ${player.username} used **SHUFFLER** on space ${squareIndex + 1}! ${oldContent.isBomb ? 'Removed a bomb!' : 'Shuffled the contents!'}`
        };
    }

    /**
     * 4. WAGERER - Force all players to add money to prize pool
     */
    executeWagerer(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'wagerer')) {
            return { success: false, message: 'You don\'t have a WAGERER!' };
        }

        // Use the command
        this.useCommand(player, 'wagerer');

        // Calculate wager based on total banks
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const totalBanks = alivePlayers.reduce((sum, p) => sum + p.money, 0);
        const averageBank = totalBanks / alivePlayers.length;
        
        // Wager is 5-15% of average bank
        const wagerPercent = 0.05 + Math.random() * 0.10;
        const wagerAmount = Math.floor(averageBank * wagerPercent);
        
        // Collect wagers
        let totalPool = 0;
        const wagers = [];
        
        alivePlayers.forEach(p => {
            const amount = Math.min(wagerAmount, p.money);
            p.money -= amount;
            totalPool += amount;
            wagers.push({ username: p.username, amount: amount });
        });

        // Store pool for round winner
        if (!this.wagerPool) this.wagerPool = 0;
        this.wagerPool += totalPool;

        return {
            success: true,
            command: 'wagerer',
            player: player.username,
            wagerAmount: wagerAmount,
            totalPool: totalPool,
            wagers: wagers,
            message: `💰 ${player.username} used **WAGERER**! All players wagered ~$${wagerAmount.toLocaleString()}. Prize pool: $${this.wagerPool.toLocaleString()}!`
        };
    }

    /**
     * 5. BONUS BAG - Draw random reward by category
     */
    executeBonusBag(playerId, category) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'bonusbag')) {
            return { success: false, message: 'You don\'t have a BONUS BAG!' };
        }

        const validCategories = ['cash', 'boost', 'game', 'event'];
        if (!validCategories.includes(category)) {
            return { success: false, message: 'Invalid category! Choose: cash, boost, game, or event' };
        }

        // Use the command
        this.useCommand(player, 'bonusbag');

        let result = {
            success: true,
            command: 'bonusbag',
            player: player.username,
            category: category
        };

        switch (category) {
            case 'cash':
                const cashPrizes = rtabConfig.contentPool.prizes;
                const cashWeights = cashPrizes.reduce((sum, p) => sum + p.weight, 0);
                const prize = this.weightedRandomFromPool(cashPrizes, cashWeights);
                const amount = prize.amount * (player.boostMultiplier || 1);
                player.money += amount;
                result.reward = { type: 'cash', amount: amount };
                result.message = `🎁 ${player.username} used **BONUS BAG** (cash)! Gained $${amount.toLocaleString()}!`;
                break;

            case 'boost':
                const boosts = rtabConfig.contentPool.multipliers.filter(m => m.effect === 'boost_3turns');
                const boost = boosts[Math.floor(Math.random() * boosts.length)] || { value: 2, duration: 3 };
                player.boostMultiplier = boost.value;
                player.boostTurns = boost.duration;
                result.reward = { type: 'boost', multiplier: boost.value, turns: boost.duration };
                result.message = `🎁 ${player.username} used **BONUS BAG** (boost)! Gained x${boost.value} boost for ${boost.duration} turns!`;
                break;

            case 'game':
                const minigames = rtabConfig.contentPool.minigames;
                const mgWeights = minigames.reduce((sum, m) => sum + m.weight, 0);
                const minigame = this.weightedRandomFromPool(minigames, mgWeights);
                player.minigames.push(minigame.id);
                result.reward = { type: 'minigame', game: minigame.nameEn || minigame.name };
                result.message = `🎁 ${player.username} used **BONUS BAG** (game)! Gained ${minigame.nameEn || minigame.name}!`;
                break;

            case 'event':
                const events = rtabConfig.contentPool.events;
                const eventWeights = events.reduce((sum, e) => sum + e.weight, 0);
                const event = this.weightedRandomFromPool(events, eventWeights);
                const eventResult = this.applyEvent(player, event);
                result.reward = { type: 'event', name: event.nameEn || event.name };
                result.eventResult = eventResult;
                result.message = `🎁 ${player.username} used **BONUS BAG** (event)! Triggered: ${event.nameEn || event.name}!`;
                break;
        }

        // Skip player's turn (they used bonus bag instead)
        this.advanceTurn();

        return result;
    }

    /**
     * 6. EYE OF TRUTH - Reveal exact contents of a square
     */
    executeEyeOfTruth(playerId, squareIndex) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'eyeoftruth')) {
            return { success: false, message: 'You don\'t have an EYE OF TRUTH!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square number!' };
        }

        const square = this.grid[squareIndex];
        if (square.revealed) {
            return { success: false, message: 'That square has already been revealed!' };
        }

        // Use the command
        this.useCommand(player, 'eyeoftruth');

        // Reveal exact contents
        let contentDescription;
        if (square.isBomb) {
            const bombType = square.bombType.replace('bomb_', '');
            const bombConfig = rtabConfig.bombTypes[bombType];
            contentDescription = `💣 **${bombConfig.nameEn || bombConfig.name}**`;
        } else {
            switch (square.type) {
                case 'prize':
                    contentDescription = `💰 **$${square.content.amount.toLocaleString()}**`;
                    break;
                case 'multiplier':
                    contentDescription = `📈 **${square.content.nameEn || square.content.name}**`;
                    break;
                case 'event':
                    contentDescription = `🎯 **${square.content.nameEn || square.content.name}**`;
                    break;
                case 'item':
                    contentDescription = `🎁 **${square.content.nameEn || square.content.name}**`;
                    break;
                case 'minigame':
                    contentDescription = `🎮 **${square.content.nameEn || square.content.name}**`;
                    break;
            }
        }

        return {
            success: true,
            command: 'eyeoftruth',
            player: player.username,
            squareIndex: squareIndex,
            isBomb: square.isBomb,
            type: square.type,
            content: square.content,
            bombType: square.bombType,
            description: contentDescription,
            message: `👁️ ${player.username} used **EYE OF TRUTH** on space ${squareIndex + 1}!\nRevealed: ${contentDescription}`
        };
    }

    /**
     * 7. FAILSAFE - Win immediately if all remaining spaces are bombs
     */
    executeFailsafe(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'failsafe')) {
            return { success: false, message: 'You don\'t have a FAILSAFE!' };
        }

        // Check if all remaining spaces are bombs
        const unrevealed = this.grid.filter(s => !s.revealed);
        const allBombs = unrevealed.every(s => s.isBomb);

        // Use the command
        this.useCommand(player, 'failsafe');

        if (allBombs) {
            // Success! Player wins immediately
            this.winner = player;
            this.gameEnded = true;

            return {
                success: true,
                command: 'failsafe',
                player: player.username,
                won: true,
                message: `✨ ${player.username} used **FAILSAFE**! All ${unrevealed.length} remaining spaces were bombs! ${player.username} wins!`
            };
        } else {
            // Penalty - lost command and pay $1,000,000
            const penalty = 1000000;
            player.money = Math.max(0, player.money - penalty);

            return {
                success: true,
                command: 'failsafe',
                player: player.username,
                won: false,
                penalty: penalty,
                safeSpacesLeft: unrevealed.filter(s => !s.isBomb).length,
                message: `⚠️ ${player.username} used **FAILSAFE** but there were still safe spaces! Lost the command and paid $${penalty.toLocaleString()} penalty!`
            };
        }
    }

    /**
     * 8. MINESWEEPER - Count bombs in 8 adjacent spaces
     */
    executeMinesweeper(playerId, squareIndex) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'minesweeper')) {
            return { success: false, message: 'You don\'t have a MINESWEEPER!' };
        }

        if (squareIndex < 0 || squareIndex >= this.grid.length) {
            return { success: false, message: 'Invalid square number!' };
        }

        const square = this.grid[squareIndex];
        if (square.revealed) {
            return { success: false, message: 'That square has already been revealed!' };
        }

        // Use the command
        this.useCommand(player, 'minesweeper');

        // Calculate adjacent squares (5x5 grid)
        const row = Math.floor(squareIndex / 5);
        const col = squareIndex % 5;
        
        const adjacentIndices = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue; // Skip center
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
                    adjacentIndices.push(newRow * 5 + newCol);
                }
            }
        }

        // Count bombs in adjacent squares
        let bombCount = 0;
        adjacentIndices.forEach(idx => {
            if (!this.grid[idx].revealed && this.grid[idx].isBomb) {
                bombCount++;
            }
        });

        return {
            success: true,
            command: 'minesweeper',
            player: player.username,
            squareIndex: squareIndex,
            adjacentSquares: adjacentIndices.length,
            bombCount: bombCount,
            message: `💣🔍 ${player.username} used **MINESWEEPER** on space ${squareIndex + 1}!\nThere ${bombCount === 1 ? 'is' : 'are'} **${bombCount}** bomb${bombCount === 1 ? '' : 's'} in the ${adjacentIndices.length} adjacent spaces!`
        };
    }

    /**
     * ==================== RTAB6 PORT: ENHANCED FEATURES ====================
     */

    /**
     * Initialize tournament mode
     */
    async initTournament(config) {
        this.tournament = new MinigameTournament(this.channelId, this.guildId, config);
        await this.tournament.initialize();
        return this.tournament;
    }

    /**
     * Initialize challenge mode
     */
    async initChallenge(config) {
        this.challenge = new SuperBotChallenge(this.channelId, this.guildId, config);
        await this.challenge.initialize(this);
        return this.challenge;
    }

    /**
     * Award XP to player
     */
    async awardXP(player, amount) {
        if (!this.playerLevel) return;
        
        const result = await this.playerLevel.addPlayerXP(player.userId, player.username, amount);
        
        if (result.leveledUp) {
            return {
                xpGained: amount,
                leveledUp: true,
                newLevel: result.newLevel,
                message: `🎉 **Level Up!** ${player.username} reached level ${result.newLevel}!`
            };
        }
        
        return {
            xpGained: amount,
            leveledUp: false
        };
    }

    /**
     * Award champion XP
     */
    async awardChampXP(player, amount) {
        if (!this.playerLevel) return;
        
        const result = await this.playerLevel.addChampXP(player.userId, player.username, amount);
        
        if (result.leveledUp) {
            return {
                xpGained: amount,
                leveledUp: true,
                newLevel: result.newLevel,
                message: `👑 **Champion Rank Up!** ${player.username} reached champion level ${result.newLevel}!`
            };
        }
        
        return {
            xpGained: amount,
            leveledUp: false
        };
    }

    /**
     * Calculate and assign bounties
     */
    async assignBounties() {
        if (!this.bountyController) return;
        
        const playerData = this.players.map(p => ({
            userId: p.userId,
            username: p.username,
            money: p.money,
            winstreak: p.winstreak,
            booster: p.booster,
            gamesPlayed: 1
        }));
        
        await this.bountyController.assignBounties(playerData);
        
        // Update player bounty values
        for (const player of this.players) {
            player.bountyValue = this.bountyController.getBounty(player.userId);
        }
    }

    /**
     * Award bounty when player is eliminated
     */
    async awardBounty(eliminatedPlayer, eliminator) {
        if (!this.bountyController || !eliminatedPlayer.bountyValue) return null;
        
        const bountyAmount = await this.bountyController.awardBounty(
            eliminatedPlayer.userId,
            eliminator.userId
        );
        
        if (bountyAmount > 0) {
            eliminator.money += bountyAmount;
            return {
                amount: bountyAmount,
                message: `💰 **Bounty Claimed!** ${eliminator.username} earned $${bountyAmount.toLocaleString()} for eliminating ${eliminatedPlayer.username}!`
            };
        }
        
        return null;
    }

    /**
     * Execute event space
     */
    async executeEvent(eventId, playerIndex) {
        const event = this.eventRegistry[eventId];
        if (!event) {
            console.error(`Event not found: ${eventId}`);
            return;
        }
        
        await event.execute(this, playerIndex);
    }

    /**
     * Play a minigame
     */
    async playMinigame(minigameId, player, wager, enhanced = false, channel) {
        const MinigameClass = this.minigameRegistry[minigameId];
        if (!MinigameClass) {
            console.error(`Minigame not found: ${minigameId}`);
            return null;
        }
        
        const minigame = new MinigameClass();
        await minigame.init(player, wager, enhanced);
        const winnings = await minigame.play(channel);
        
        return {
            winnings,
            result: minigame.getResult()
        };
    }

    /**
     * Create enhanced bomb with RtaB6 types
     */
    createBomb(bombType) {
        const BombClass = this.bombPool[bombType] || this.bombPool.normal;
        return new BombClass();
    }

    /**
     * Send embed message helper
     */
    async sendEmbed(channel, embedData) {
        const embed = new EmbedBuilder()
            .setColor(embedData.color || '#9C27B0')
            .setTitle(embedData.title || 'Race To A Billion')
            .setDescription(embedData.description || '');
        
        if (embedData.fields) {
            embedData.fields.forEach(field => {
                embed.addFields(field);
            });
        }
        
        if (embedData.footer) {
            embed.setFooter({ text: embedData.footer });
        }
        
        if (embedData.thumbnail) {
            embed.setThumbnail(embedData.thumbnail);
        }
        
        if (embedData.image) {
            embed.setImage(embedData.image);
        }
        
        return await channel.send({ embeds: [embed] });
    }

    /**
     * Apply money with multipliers and modifiers
     */
    applyMoney(player, baseAmount, useMultipliers = true) {
        let amount = baseAmount;
        
        // Apply booster (RtaB6: 100 = x1.0, 200 = x2.0)
        if (useMultipliers && player.booster > 0) {
            const multiplier = player.booster / 100;
            amount = Math.floor(amount * multiplier);
        }
        
        // Apply curse (negative money)
        if (player.cursed > 0 && amount > 0) {
            amount = -amount;
        }
        
        // Apply weather effects
        if (this.weather === RTABEnums.Weather.BONUS) {
            amount = Math.floor(amount * 1.5);
        } else if (this.weather === RTABEnums.Weather.DROUGHT) {
            amount = Math.floor(amount * 0.5);
        }
        
        player.money += amount;
        
        return amount;
    }

    /**
     * Update winstreak
     */
    updateWinstreak(winner) {
        // Winner's streak increases
        winner.winstreak++;
        
        // Award bonus at streak milestone
        if (winner.winstreak === 40) { // REQUIRED_STREAK_FOR_BONUS from RtaB6
            const bonus = 10000000; // $10M bonus
            winner.money += bonus;
            return {
                milestone: true,
                bonus: bonus,
                message: `🔥 **STREAK BONUS!** ${winner.username} reached a 40-win streak and earned $${bonus.toLocaleString()}!`
            };
        }
        
        // Reset other players' streaks
        this.players.forEach(p => {
            if (p.userId !== winner.userId) {
                p.winstreak = 0;
            }
        });
        
        return { milestone: false };
    }

    /**
     * Apply life penalty based on type
     */
    applyLifePenalty(player, penaltyType, basePenalty = 1) {
        switch (penaltyType) {
            case RTABEnums.LifePenaltyType.NONE:
                return 0;
                
            case RTABEnums.LifePenaltyType.FLAT:
                player.lives -= basePenalty;
                return basePenalty;
                
            case RTABEnums.LifePenaltyType.SCALED:
                // Penalty scales with money
                const scaledPenalty = Math.min(3, Math.floor(player.money / 10000000));
                player.lives -= scaledPenalty;
                return scaledPenalty;
                
            case RTABEnums.LifePenaltyType.INCREASING:
                // Penalty increases each time
                const increasingPenalty = basePenalty + Math.floor(player.bombsHit / 3);
                player.lives -= increasingPenalty;
                return increasingPenalty;
                
            case RTABEnums.LifePenaltyType.HARDCAP:
                // Set lives to specific value
                const previousLives = player.lives;
                player.lives = Math.min(player.lives, basePenalty);
                return previousLives - player.lives;
                
            default:
                player.lives -= basePenalty;
                return basePenalty;
        }
    }

    /**
     * Get player statistics for end game
     */
    getPlayerStats(player) {
        return {
            username: player.username,
            finalMoney: player.money,
            totalPicks: this.revealedSquares.size,
            bombsHit: player.bombsHit || 0,
            minigamesPlayed: player.minigamesPlayed || 0,
            eventsTriggered: player.eventsTriggered || 0,
            commandsUsed: player.commandsUsed || 0,
            winstreak: player.winstreak,
            level: player.playerLevel,
            bountyEarned: player.bountyEarned || 0,
            jackpotWon: player.jackpot,
            xpGained: player.xpGained || 0
        };
    }

    /**
     * 9. REPELLENT - Block a blammo or remove threshold
     */
    executeRepellent(playerId) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!this.hasCommand(player, 'repellent')) {
            return { success: false, message: 'You don\'t have BLAMMO REPELLENT!' };
        }

        // Use the command
        this.useCommand(player, 'repellent');

        // Check if there's an active blammo
        if (this.futureBlammo) {
            this.futureBlammo = false;
            const summoner = this.players.find(p => p.userId === this.blammoSummoner);
            this.blammoSummoner = null;

            return {
                success: true,
                command: 'repellent',
                player: player.username,
                effect: 'blocked_blammo',
                summoner: summoner ? summoner.username : 'unknown',
                message: `🛡️ ${player.username} used **BLAMMO REPELLENT**! Blocked the incoming blammo!`
            };
        } else {
            // No blammo - activate repellent for next bomb hit
            if (!player.activeEffects) player.activeEffects = {};
            player.activeEffects.repellent = true;

            return {
                success: true,
                command: 'repellent',
                player: player.username,
                effect: 'repellent_active',
                message: `🛡️ ${player.username} used **BLAMMO REPELLENT**! Next bomb will be repelled!`
            };
        }
    }

    /**
     * 10. WILDCARD - Can mimic any other command
     * This is handled by the useCommand() method checking for wildcard
     */
    executeWildcard(playerId, mimicCommand, ...args) {
        const player = this.players.find(p => p.userId === playerId);
        
        if (!player) {
            return { success: false, message: 'Player not found!' };
        }

        if (!player.hiddenCommands || !player.hiddenCommands.includes('wildcard')) {
            return { success: false, message: 'You don\'t have a WILDCARD!' };
        }

        // Route to the mimicked command
        switch (mimicCommand) {
            case 'fold':
                return this.executeFold(playerId);
            case 'blammo':
                return this.executeBlammo(playerId);
            case 'shuffler':
                return this.executeShuffler(playerId, ...args);
            case 'wagerer':
                return this.executeWagerer(playerId);
            case 'bonusbag':
                return this.executeBonusBag(playerId, ...args);
            case 'eyeoftruth':
                return this.executeEyeOfTruth(playerId, ...args);
            case 'failsafe':
                return this.executeFailsafe(playerId);
            case 'minesweeper':
                return this.executeMinesweeper(playerId, ...args);
            case 'repellent':
                return this.executeRepellent(playerId);
            default:
                return { success: false, message: 'Invalid command to mimic!' };
        }
    }
}

module.exports = { RTABLobby, RTABGame };
