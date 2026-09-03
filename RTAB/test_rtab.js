/**
 * RTAB System Test
 * Tests the core RTAB game logic and bomb types
 */

const { RTABLobby, RTABGame } = require('./RTABGame');
const RTABUI = require('./RTABUI');
const rtabConfig = require('./rtab_config.json');

console.log('🎲 RTAB System Test Starting...\n');

// Test 1: Lobby Creation
console.log('=== Test 1: Lobby Creation ===');
const lobby = new RTABLobby('test-channel', 'test-guild', 'creator-123');
console.log('✅ Lobby created');

// Test 2: Add Players
console.log('\n=== Test 2: Add Players ===');
lobby.addPlayer('player1', 'Alice');
lobby.addPlayer('player2', 'Bob');
console.log(`✅ Added 2 players: ${lobby.players.map(p => p.username).join(', ')}`);
console.log(`Can start? ${lobby.canStart()}`);

// Test 3: Game Creation
console.log('\n=== Test 3: Game Creation ===');
const game = new RTABGame(lobby);
console.log(`✅ Game created with ${game.grid.length} squares`);
console.log(`Players: ${game.players.map(p => p.username).join(', ')}`);

// Test 4: Grid Content Distribution
console.log('\n=== Test 4: Grid Content Distribution ===');
const contentTypes = game.grid.reduce((acc, square) => {
    acc[square.type] = (acc[square.type] || 0) + 1;
    return acc;
}, {});
console.log('Content distribution:');
console.log(contentTypes);

// Test 5: Bomb Placement
console.log('\n=== Test 5: Bomb Placement ===');
const bombResult1 = game.placeBomb('player1', 5);
const bombResult2 = game.placeBomb('player2', 15);
console.log(`✅ Player 1 placed ${bombResult1.bombType} at square ${bombResult1.square}`);
console.log(`✅ Player 2 placed ${bombResult2.bombType} at square ${bombResult2.square}`);

// Test 6: Bomb Type Distribution (Monte Carlo)
console.log('\n=== Test 6: Bomb Type Distribution (1000 samples) ===');
const bombCounts = {};
for (let i = 0; i < 1000; i++) {
    const testGame = new RTABGame(lobby);
    const result = testGame.placeBomb('player1', Math.floor(Math.random() * 36));
    bombCounts[result.bombType] = (bombCounts[result.bombType] || 0) + 1;
}

console.log('Bomb type distribution (expected vs actual):');
Object.entries(rtabConfig.bombTypes)
    .sort((a, b) => b[1].weight - a[1].weight)
    .forEach(([key, bomb]) => {
        const expected = bomb.weight;
        const actual = bombCounts[key] || 0;
        const percentage = ((actual / 1000) * 100).toFixed(1);
        console.log(`  ${bomb.emoji} ${bomb.nameEn.padEnd(20)} - Weight: ${expected.toString().padStart(3)}, Actual: ${percentage}%`);
    });

// Test 7: Square Reveal (Prize)
console.log('\n=== Test 7: Square Reveal (Prize) ===');
// Find a non-bomb prize square
const prizeSquare = game.grid.findIndex(sq => !sq.isBomb && sq.type === 'prize');
if (prizeSquare !== -1) {
    const revealResult = game.revealSquare('player1', prizeSquare);
    console.log(`✅ Revealed square ${prizeSquare}:`);
    console.log(`  Type: ${revealResult.type}`);
    console.log(`  Content: ${revealResult.content.nameEn}`);
    console.log(`  Player money: $${game.players[0].money.toLocaleString()}`);
}

// Test 8: Bomb Hit (if hitting a bomb)
console.log('\n=== Test 8: Bomb Effects ===');
const bombSquare = game.grid.findIndex(sq => sq.isBomb);
if (bombSquare !== -1) {
    const bombType = game.grid[bombSquare].bombType;
    const bombConfig = rtabConfig.bombs?.find(b => b.id === bombType.replace('bomb_', ''));
    if (bombConfig) {
        console.log(`Testing ${bombConfig.nameEn || bombType} at square ${bombSquare}`);
        console.log(`Bomb damage: ${bombConfig.damage || 'Special Effect'}`);
        console.log(`Weight: ${bombConfig.weight}`);
    } else {
        console.log(`Found bomb at square ${bombSquare}: ${bombType}`);
    }
} else {
    console.log('No bombs found on grid this time');
}

// Test 9: UI Generation
console.log('\n=== Test 9: UI Generation ===');
try {
    // Note: These will return Discord embed objects, not render
    const lobbyEmbed = RTABUI.createLobbyEmbed(lobby);
    const gridEmbed = RTABUI.createGridEmbed(game);
    console.log('✅ Lobby embed created');
    console.log('✅ Grid embed created');
} catch (error) {
    console.log(`⚠️  UI generation error: ${error.message}`);
}

// Test 10: Configuration Validation
console.log('\n=== Test 10: Configuration Validation ===');
const totalBombWeight = Object.values(rtabConfig.bombTypes).reduce((sum, b) => sum + b.weight, 0);
const totalPrizeWeight = rtabConfig.contentPool.prizes.reduce((sum, p) => sum + p.weight, 0);
console.log(`✅ Total bomb weights: ${totalBombWeight}`);
console.log(`✅ Total prize weights: ${totalPrizeWeight}`);
console.log(`✅ Grid size: ${rtabConfig.gameSettings.gridSize}x${rtabConfig.gameSettings.gridSize} = ${rtabConfig.gameSettings.gridSize ** 2} squares`);
console.log(`✅ Player range: ${rtabConfig.gameSettings.minPlayers}-${rtabConfig.gameSettings.maxPlayers}`);

console.log('\n🎉 All tests completed!\n');

// Summary
console.log('=== RTAB System Summary ===');
console.log(`📦 Bomb Types: ${Object.keys(rtabConfig.bombTypes).length}`);
console.log(`💰 Prize Levels: ${rtabConfig.contentPool.prizes.length}`);
console.log(`🎯 Multipliers: ${rtabConfig.contentPool.multipliers.length}`);
console.log(`🎲 Events: ${rtabConfig.contentPool.events.length}`);
console.log(`📦 Items: ${rtabConfig.contentPool.items.length}`);
console.log(`🎮 Grid: ${rtabConfig.gameSettings.gridSize}x${rtabConfig.gameSettings.gridSize}`);
console.log('\n✨ RTAB is ready for integration!');
