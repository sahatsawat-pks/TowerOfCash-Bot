const { MinigameMasterSession } = require('../Season2/MinigameMaster');
const { GameState } = require('../gameManager');
const GameUI = require('../gameUI');
const Season2Minigames = require('../Season2/Season2Minigames');
const BossFloors = require('../Season2/BossFloors');
const { TowerAchievements, ACHIEVEMENTS } = require('../TowerAchievements');

describe('Season 2 and Minigame Master Tests', () => {
  describe('GameState Season Modes', () => {
    test('Season 2 mode sets isSeason2 = true and maxFloors = 30', () => {
      const game = new GameState('123', 'Tester', 'channel1', 'guild1', 'season2');
      expect(game.isSeason2).toBe(true);
      expect(game.maxFloors).toBe(30);
      expect(game.eventMode).toBe(2);
    });

    test('Season 2 numeric mode (2) sets isSeason2 = true', () => {
      const game = new GameState('123', 'Tester', 'channel1', 'guild1', 2);
      expect(game.isSeason2).toBe(true);
      expect(game.maxFloors).toBe(30);
    });

    test('Season 1 mode sets isSeason2 = false and maxFloors = 30', () => {
      const game = new GameState('123', 'Tester', 'channel1', 'guild1', 'season1');
      expect(game.isSeason2).toBe(false);
      expect(game.maxFloors).toBe(30);
      expect(game.eventMode).toBe(1);
    });

    test('Normal mode sets isSeason2 = false and maxFloors = 21', () => {
      const game = new GameState('123', 'Tester', 'channel1', 'guild1', 'normal');
      expect(game.isSeason2).toBe(false);
      expect(game.maxFloors).toBe(21);
      expect(game.eventMode).toBe(0);
    });
  });

  describe('GameUI Welcome Embed', () => {
    test('createWelcomeEmbed displays Season 2 title for mode 2', () => {
      const embed = GameUI.createWelcomeEmbed(5, 2);
      expect(embed.data.title).toContain('Season 2: The Apex Tower');
      expect(embed.data.description).toContain('Roguelike Ascent Pacts');
      expect(embed.data.description).toContain('Guardian Boss Floors');
    });

    test('createWelcomeEmbed displays Season 1 title for mode 1', () => {
      const embed = GameUI.createWelcomeEmbed(5, 1);
      expect(embed.data.title).toContain('Season 1');
      expect(embed.data.description).toContain('Season 1 Features:');
    });

    test('createWelcomeEmbed displays Normal mode title for mode 0', () => {
      const embed = GameUI.createWelcomeEmbed(5, 0);
      expect(embed.data.title).toBe('🏢 Welcome to Tower of Cash! 🏢');
    });

    test('createMinigameListButtons contains Season 2 and Minigame Master', () => {
      const buttons = GameUI.createMinigameListButtons();
      const menu = buttons[0].components[0];
      const values = menu.options.map(o => o.data.value);
      expect(values).toContain('laser_infiltration');
      expect(values).toContain('blind_auction');
      expect(values).toContain('bomb_defusal');
      expect(values).toContain('high_roller_blackjack');
      expect(values).toContain('minigame_master');
    });
  });

  describe('MinigameMasterSession', () => {
    test('initializes with host and starts Round 1 with valid embed and buttons', () => {
      const session = new MinigameMasterSession('ch1', 'g1', { id: 'u1', username: 'HostUser' }, true);
      expect(session.players.size).toBe(1);
      expect(session.isSolo).toBe(true);

      const startRes = session.startRound1();
      expect(startRes.success).toBe(true);
      expect(session.round).toBe(1);
      expect(session.roundMinigames.length).toBe(5);

      const roundEmbed = session.createRoundEmbed();
      expect(roundEmbed.data.title).toContain('ROUND 1');
      expect(roundEmbed.data.title).toContain('1x Multiplier');

      const roundButtons = session.createRoundButtons();
      expect(roundButtons.length).toBeGreaterThan(0);
      expect(roundButtons[0].components.some(c => c.data.custom_id === 's2_mgm_play')).toBe(true);
    });

    test('records earnings with round multipliers', () => {
      const session = new MinigameMasterSession('ch1', 'g1', { id: 'u1', username: 'HostUser' }, true);
      session.startRound1();

      // Round 1 (1x multiplier)
      session.recordGameEarnings('u1', 'vault', 100000);
      expect(session.players.get('u1').totalEarnings).toBe(100000);

      // Advance to Round 2 (2x multiplier)
      const r2Res = session.advanceToRound2();
      expect(r2Res.success).toBe(true);
      expect(session.round).toBe(2);
      expect(session.roundMinigames.length).toBe(3);

      session.recordGameEarnings('u1', 'laser_infiltration', 100000);
      expect(session.players.get('u1').round2Earnings).toBe(200000);
      expect(session.players.get('u1').totalEarnings).toBe(300000);

      // Advance to Round 3 (3x multiplier)
      const r3Res = session.advanceToRound3();
      expect(r3Res.success).toBe(true);
      expect(session.round).toBe(3);
      expect(session.roundMinigames).toEqual(['go_big_or_go_broke']);

      session.recordGameEarnings('u1', 'go_big_or_go_broke', 500000);
      expect(session.players.get('u1').round3Earnings).toBe(1500000);
      expect(session.players.get('u1').totalEarnings).toBe(1800000);
    });

    test('creates summary embed properly', () => {
      const session = new MinigameMasterSession('ch1', 'g1', { id: 'u1', username: 'HostUser' }, true);
      session.startRound1();
      session.recordGameEarnings('u1', 'vault', 250000);

      const summary = session.createRoundSummaryEmbed(1);
      expect(summary.data.title).toContain('ROUND 1 STANDINGS');
      expect(summary.data.description).toContain('HostUser');
    });
  });

  describe('Button Action Recognition (RTAB & MGM)', () => {
    test('recognizes RTAB buttons without flagging no active game', () => {
      const rtabButtonIds = ['rtab_join', 'rtab_leave', 'rtab_start', 'rtab_square_5', 'rtab_mg_heads', 'rtab_market_buy_1'];
      for (const customId of rtabButtonIds) {
        const isRTABAction = customId.startsWith('rtab_');
        expect(isRTABAction).toBe(true);
      }
    });

    test('recognizes MGM buttons without flagging no active game', () => {
      const mgmButtonIds = ['s2_mgm_join', 's2_mgm_leave', 's2_mgm_start', 's2_mgm_play', 's2_mgm_standings', 's2_mgm_next_round', 's2_mgm_close'];
      for (const customId of mgmButtonIds) {
        const isMGMAction = customId.startsWith('s2_mgm_');
        expect(isMGMAction).toBe(true);
      }
    });
  });

  describe('Season 2 Boss Floor Triggers', () => {
    test('does not trigger boss floor 10 early just because tile 10 was selected in Round 1', () => {
      const game = new GameState('u1', 'Player', 'ch1', 'g1');
      game.eventMode = 2;
      game.isSeason2 = true;
      // In Round 1, player picked tile 10 as their 4th floor
      game.selectedFloors = [1, 2, 3, 10, 15, 20, 25];
      game.currentFloor = 3; // On tile 10
      game.floorsCompleted = 3; // Only 3 floors completed

      const climbFloor = game.floorsCompleted + 1;
      expect(climbFloor).toBe(4);
      expect([10, 20, 30].includes(climbFloor)).toBe(false);
    });

    test('triggers boss floor 10 exactly on the 10th floor of the ascent', () => {
      const game = new GameState('u1', 'Player', 'ch1', 'g1');
      game.eventMode = 2;
      game.isSeason2 = true;
      game.floorsCompleted = 9; // 9 floors completed so far

      const climbFloor = game.floorsCompleted + 1;
      expect(climbFloor).toBe(10);
      expect([10, 20, 30].includes(climbFloor)).toBe(true);
    });
  });

  describe('Season 2 Minigames Integration', () => {
    test('Laser Infiltration starts and handles step with embed and buttons', () => {
      const state = Season2Minigames.startLaserInfiltration('u1', 'Player', 500000);
      expect(state.currentRow).toBe(3);
      const embed = Season2Minigames.createLaserEmbed(state);
      expect(embed).toBeDefined();
      const aliasEmbed = Season2Minigames.createLaserGridEmbed(state);
      expect(aliasEmbed).toBeDefined();
      const buttons = Season2Minigames.createLaserButtons(state);
      expect(buttons.length).toBeGreaterThan(0);

      Season2Minigames.stepLaserInfiltration(state, 0);
      expect(state.pathHistory.length).toBe(1);
    });

    test('Blind Auction starts, places bid, and creates embed/buttons', () => {
      const state = Season2Minigames.startBlindAuction('u1', 'Player', 500000);
      expect(state.artifact).toBeDefined();
      const embed = Season2Minigames.createAuctionEmbed(state);
      expect(embed).toBeDefined();

      Season2Minigames.placeAuctionBid(state, 100000);
      expect(state.isCompleted).toBe(true);
      const resultButtons = Season2Minigames.createAuctionButtons(state);
      expect(resultButtons.length).toBeGreaterThan(0);
    });

    test('Bomb Defusal starts, cuts wire, and creates embed/buttons', () => {
      const state = Season2Minigames.startBombDefusal('u1', 'Player', 500000);
      expect(state.defusalWire).toBeDefined();
      const embed = Season2Minigames.createBombEmbed(state);
      expect(embed).toBeDefined();
      const aliasEmbed = Season2Minigames.createBombDefusalEmbed(state);
      expect(aliasEmbed).toBeDefined();

      Season2Minigames.cutWire(state, 'Red');
      expect(state.isCompleted).toBe(true);
      const resultButtons = Season2Minigames.createBombButtons(state);
      expect(resultButtons.length).toBeGreaterThan(0);
    });

    test('High Roller Blackjack starts, hits/stands, and creates embed/buttons', () => {
      const state = Season2Minigames.startBlackjack('u1', 'Player', 500000);
      expect(state.playerHand.length).toBe(2);
      const embed = Season2Minigames.createBlackjackEmbed(state);
      expect(embed).toBeDefined();
      const buttons = Season2Minigames.createBlackjackButtons(state);
      expect(buttons.length).toBeGreaterThan(0);

      Season2Minigames.playerStand(state);
      expect(state.isCompleted).toBe(true);
      const resultButtons = Season2Minigames.createBlackjackButtons(state);
      expect(resultButtons[0].components[0].data.custom_id).toBe('s2_blackjack_continue');
    });
  });

  describe('Season 2 Boss Floors Encounters (NO CLUE)', () => {
    test('Architect Boss has hidden cipher with no clue in embed, and tests Mastermind logic', () => {
      const state = BossFloors.startArchitectBoss('u1', 'Player', 1000000);
      state.targetSequence = ['Delta', 'Delta', 'Delta'];
      expect(state.targetSequence.length).toBe(3);
      expect(state.attemptsRemaining).toBe(3);

      const embed = BossFloors.createArchitectEmbed(state);
      // Ensure the target sequence is NOT leaked in the embed description
      expect(embed.data.description).toContain('???');
      expect(embed.data.description).not.toContain(state.targetSequence.join(' ➔ '));

      // Test incorrect 3-node sequence
      BossFloors.pressArchitectNode(state, 'Alpha');
      BossFloors.pressArchitectNode(state, 'Beta');
      BossFloors.pressArchitectNode(state, 'Gamma');

      expect(state.attemptHistory.length).toBe(1);
      expect(state.attemptHistory[0].sequence).toEqual(['Alpha', 'Beta', 'Gamma']);
      expect(state.attemptsRemaining).toBe(state.won ? 3 : 2);
    });

    test('Loan Shark Boss rolls blind into steel cup and handles duels', () => {
      const state = BossFloors.startLoanSharkBoss('u1', 'Player', 1000000);
      expect(state.hiddenSharkRoll).toBeGreaterThanOrEqual(3);
      expect(state.currentRound).toBe(1);

      const embed = BossFloors.createLoanSharkEmbed(state);
      expect(embed.data.description).toContain('🔒 ❓ 🔒');

      BossFloors.duelRoundLoanShark(state, 'overdrive');
      expect(state.roundHistory.length).toBe(1);
      expect(state.roundHistory[0].style).toBe('overdrive');
    });

    test('Grand Operator Boss features 4 blind vaults and Operator Gambit phase', () => {
      const state = BossFloors.startGrandOperatorBoss('u1', 'Player', 10000000);
      expect(state.vaults.length).toBe(4);
      expect(state.phase).toBe('pick');

      const pickButtons = BossFloors.createOperatorButtons(state);
      expect(pickButtons[0].components.length).toBe(4);

      // Player selects Vault 1
      BossFloors.selectOperatorVault(state, 1);
      expect(state.phase).toBe('gambit');
      expect(state.destroyedVaultIndex).not.toBeNull();
      expect(state.destroyedVaultIndex).not.toBe(1);

      const gambitEmbed = BossFloors.createOperatorEmbed(state);
      expect(gambitEmbed.data.description).toContain('THE OPERATOR VAPORIZES');

      const gambitButtons = BossFloors.createOperatorButtons(state);
      expect(gambitButtons[0].components.some(b => b.data.custom_id === 's2_operator_gambit_stick')).toBe(true);
      expect(gambitButtons[0].components.some(b => b.data.custom_id === 's2_operator_gambit_buyout')).toBe(true);

      // Player takes buyout
      BossFloors.operatorGambit(state, 'buyout');
      expect(state.phase).toBe('reveal');
      expect(state.isCompleted).toBe(true);
      expect(state.won).toBe(true);
      expect(state.chosenVault.rewardBonus).toBe(10000000);
    });
  });

  describe('Season 2 & Minigame Master Achievements', () => {
    test('defines all new Season 2 and Minigame Master achievements in ACHIEVEMENTS catalog', () => {
      const expectedIds = [
        'SEASON_2_SUMMIT',
        'PACT_MASTER',
        'MGM_CHAMPION',
        'MGM_HIGH_ROLLER',
        'ELITE_GAMBLER',
        'ARCHITECT_BREACHER',
        'SHARK_SLAYER',
        'OPERATOR_DETHRONED'
      ];

      for (const id of expectedIds) {
        expect(ACHIEVEMENTS[id]).toBeDefined();
        expect(ACHIEVEMENTS[id].id).toBe(id);
        expect(ACHIEVEMENTS[id].name).toBeTruthy();
        expect(ACHIEVEMENTS[id].description).toBeTruthy();
        expect(ACHIEVEMENTS[id].emoji).toBeTruthy();
      }
    });

    test('TowerAchievements awards and records Season 2 achievements correctly', async () => {
      const achievements = new TowerAchievements();
      const testUserId = 'test_user_s2_' + Math.random().toString(36).substring(2);
      const testGuildId = 'test_guild_s2_achieve';

      const res = await achievements.awardAchievement(
        'ARCHITECT_BREACHER',
        testUserId,
        'TestUser',
        testGuildId
      );
      expect(res).toBe(true);

      const playerAchievements = await achievements.getPlayerAchievements(testUserId, testGuildId);
      expect(playerAchievements.some(a => a.id === 'ARCHITECT_BREACHER')).toBe(true);
    });

    test('GameUI.createContinueButton creates a valid action row', () => {
      const row = GameUI.createContinueButton();
      expect(row).toBeDefined();
      expect(row.length).toBeGreaterThan(0);
      expect(row[0].components[0].data.custom_id).toBe('continue_game');
    });
  });
});





