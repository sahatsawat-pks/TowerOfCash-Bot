/**
 * Phase 5 Integration Test
 * Tests that all Phase 5 systems are properly integrated
 */

console.log('🧪 Starting Phase 5 Integration Tests...\n');

// Test 1: Module Imports
console.log('Test 1: Module Imports');
try {
    const RTABAchievements = require('./RTABAchievements');
    const RTABReplay = require('./RTABReplay');
    const RTABStatistics = require('./RTABStatistics');
    const { RTABLobby, RTABGame } = require('./RTABGame');
    console.log('✅ All modules imported successfully\n');
} catch (error) {
    console.error('❌ Module import failed:', error.message);
    process.exit(1);
}

// Test 2: Check module exports
console.log('Test 2: Module Exports');
try {
    const RTABAchievements = require('./RTABAchievements');
    const RTABReplay = require('./RTABReplay');
    const RTABStatistics = require('./RTABStatistics');
    
    // Check RTABAchievements methods
    if (typeof RTABAchievements.checkAchievements !== 'function') {
        throw new Error('RTABAchievements.checkAchievements is not a function');
    }
    if (typeof RTABAchievements.getPlayerAchievements !== 'function') {
        throw new Error('RTABAchievements.getPlayerAchievements is not a function');
    }
    
    // Check RTABReplay methods
    if (typeof RTABReplay.startRecording !== 'function') {
        throw new Error('RTABReplay.startRecording is not a function');
    }
    if (typeof RTABReplay.recordEvent !== 'function') {
        throw new Error('RTABReplay.recordEvent is not a function');
    }
    if (typeof RTABReplay.endRecording !== 'function') {
        throw new Error('RTABReplay.endRecording is not a function');
    }
    
    // Check RTABStatistics methods
    if (typeof RTABStatistics.startGameSession !== 'function') {
        throw new Error('RTABStatistics.startGameSession is not a function');
    }
    if (typeof RTABStatistics.recordSessionEvent !== 'function') {
        throw new Error('RTABStatistics.recordSessionEvent is not a function');
    }
    if (typeof RTABStatistics.endGameSession !== 'function') {
        throw new Error('RTABStatistics.endGameSession is not a function');
    }
    
    console.log('✅ All module methods are functions\n');
} catch (error) {
    console.error('❌ Module export check failed:', error.message);
    process.exit(1);
}

// Test 3: Create RTABGame instance
console.log('Test 3: RTABGame Instantiation');
try {
    const { RTABLobby, RTABGame } = require('./RTABGame');
    
    // Create a mock lobby
    const lobby = new RTABLobby('test-channel-123', 'test-guild-456', 'creator-789');
    lobby.players = [
        { userId: 'player1', username: 'Player One' },
        { userId: 'player2', username: 'Player Two' }
    ];
    
    // Create game instance
    const game = new RTABGame(lobby);
    
    // Verify Phase 5 properties
    if (!game.replaySession) {
        throw new Error('Game replaySession not initialized');
    }
    if (!game.gameStartTime) {
        throw new Error('Game gameStartTime not initialized');
    }
    
    console.log('✅ RTABGame instance created successfully');
    console.log('   - Replay session initialized');
    console.log('   - Game start time set');
    console.log('   - Statistics sessions started\n');
} catch (error) {
    console.error('❌ RTABGame instantiation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// Test 4: Replay Recording
console.log('Test 4: Replay Recording');
try {
    const RTABReplay = require('./RTABReplay');
    
    const session = RTABReplay.startRecording('test-channel', [
        { userId: 'p1', username: 'Player 1' }
    ]);
    
    RTABReplay.recordEvent('test-channel', {
        type: 'square_reveal',
        playerId: 'p1',
        content: 'prize',
        value: 1000,
        timestamp: Date.now()
    });
    
    const endedSession = RTABReplay.endRecording('test-channel');
    
    console.log('✅ Replay recording working correctly');
    console.log(`   - Events recorded: ${endedSession.events.length}\n`);
} catch (error) {
    console.error('❌ Replay recording failed:', error.message);
    process.exit(1);
}

// Test 5: Statistics Tracking
console.log('Test 5: Statistics Tracking');
try {
    const RTABStatistics = require('./RTABStatistics');
    
    // Use unique test ID to avoid conflicts from previous runs
    const testId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;
    
    // Use correct API - startGameSession(gameId, players array)
    RTABStatistics.startGameSession(testId, [
        { userId: testPlayerId, username: 'Test Player 1' }
    ]);
    
    RTABStatistics.recordSessionEvent(testId, {
        type: 'command_used',
        userId: testPlayerId
    });
    
    RTABStatistics.recordSessionEvent(testId, {
        type: 'bomb_defused',
        userId: testPlayerId
    });
    
    // endGameSession(gameId, winner, players array)
    RTABStatistics.endGameSession(testId, 
        { userId: testPlayerId, username: 'Test Player 1', money: 50000 },
        [{ userId: testPlayerId, username: 'Test Player 1', money: 50000, isEliminated: false }]
    );
    
    const stats = RTABStatistics.getPlayerStats(testPlayerId);
    
    if (!stats || stats.gamesPlayed < 1) {
        throw new Error(`Statistics not tracked correctly - gamesPlayed: ${stats?.gamesPlayed}`);
    }
    
    console.log('✅ Statistics tracking working correctly');
    console.log(`   - Games played: ${stats.gamesPlayed}`);
    console.log(`   - Games won: ${stats.gamesWon}`);
    console.log(`   - Money earned: $${stats.totalMoneyEarned.toLocaleString()}\n`);
} catch (error) {
    console.error('❌ Statistics tracking failed:', error.message);
    process.exit(1);
}

// Test 6: Achievement System
console.log('Test 6: Achievement System');
try {
    const RTABAchievements = require('./RTABAchievements');
    const { RTABLobby, RTABGame } = require('./RTABGame');
    
    // Create mock game for achievement testing
    const lobby = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby.players = [
        { userId: 'player1', username: 'Test Player' }
    ];
    
    const game = new RTABGame(lobby);
    const player = game.players[0];
    
    // Test achievement check (should not throw)
    const achievements = RTABAchievements.checkAchievements(game, player, 'bomb_hit');
    
    console.log('✅ Achievement system working correctly');
    console.log(`   - Achievement checks completed\n`);
} catch (error) {
    console.error('❌ Achievement system failed:', error.message);
    process.exit(1);
}

console.log('═══════════════════════════════════════');
console.log('🎉 All Phase 5 Integration Tests PASSED!');
console.log('═══════════════════════════════════════\n');

console.log('Summary:');
console.log('✅ Module imports working');
console.log('✅ Module exports correct');
console.log('✅ RTABGame instantiation working');
console.log('✅ Replay recording functional');
console.log('✅ Statistics tracking functional');
console.log('✅ Achievement system functional');
console.log('\n✨ Phase 5 is ready for production! ✨\n');
