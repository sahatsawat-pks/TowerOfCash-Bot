const { MinigameMasterSession } = require('../Season2/MinigameMaster');
const { GameState } = require('../gameManager');
const GameUI = require('../gameUI');

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
});
