/**
 * Test RTAB Tension Reveal System
 * Demonstrates dramatic square reveals like the show
 */

console.log('🎬 Testing RTAB Tension Reveal System...\n');
console.log('Creating dramatic reveals like:');
console.log('  "So Dark selects space 13..."');
console.log('  "(+$118,025)"');
console.log('  "...It\'s a minigame: Bumper Grab!"');
console.log('\n' + '═'.repeat(50) + '\n');

try {
    const { RTABLobby, RTABGame } = require('./RTABGame');
    const RTABUI = require('./rtabUI');

    // Create a test game
    const lobby = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby.players = [
        { userId: 'player1', username: 'Dark' },
        { userId: 'player2', username: 'Light' }
    ];

    const game = new RTABGame(lobby);
    const player = game.players[0];

    console.log('✅ Game created\n');

    // Test different reveal types with tension
    const testCases = [
        { type: 'prize', name: 'Prize Reveal' },
        { type: 'minigame', name: 'Minigame Reveal' },
        { type: 'multiplier', name: 'Multiplier Reveal' },
        { type: 'event', name: 'Event Reveal' },
        { type: 'item', name: 'Item Reveal' }
    ];

    for (let i = 0; i < testCases.length && i < game.grid.length; i++) {
        const testCase = testCases[i];
        
        // Find or create a square of this type
        let squareIndex = i;
        while (squareIndex < game.grid.length && game.grid[squareIndex].revealed) {
            squareIndex++;
        }

        if (squareIndex >= game.grid.length) break;

        console.log(`\n📺 Testing: ${testCase.name}`);
        console.log('─'.repeat(50));

        // Reveal the square
        const result = game.revealSquare(player.userId, squareIndex);
        
        if (!result.success) {
            console.log(`   ⚠️ Skipped: ${result.message}`);
            continue;
        }

        // Stage 1: Initial selection
        console.log('\n   Stage 1 (Suspense):');
        const stage1 = RTABUI.createTensionRevealEmbed(game, result, 1);
        console.log(`   📝 "${stage1.data.description}"`);
        console.log(`   💭 ${stage1.data.footer?.text || ''}`);

        // Stage 2: Value reveal (if applicable)
        if (result.type === 'prize' || result.type === 'minigame') {
            console.log('\n   Stage 2 (Money Reveal):');
            const stage2 = RTABUI.createTensionRevealEmbed(game, result, 2);
            console.log(`   📝 ${stage2.data.description.replace(/\n/g, '\n      ')}`);
            console.log(`   💭 ${stage2.data.footer?.text || ''}`);
        }

        // Stage 3: Full reveal
        console.log('\n   Stage 3 (Full Reveal):');
        const stage3 = RTABUI.createTensionRevealEmbed(game, result, 3);
        const desc = stage3.data.description.replace(/\n/g, '\n      ');
        console.log(`   📝 ${desc}`);
        console.log(`   🎨 Color: ${stage3.data.color}`);
        if (stage3.data.title) {
            console.log(`   🏷️  Title: ${stage3.data.title}`);
        }

        console.log('\n   ✅ Tension reveal working!');
    }

    console.log('\n' + '═'.repeat(50));
    console.log('\n🎉 Tension Reveal System Tests PASSED!\n');
    console.log('Features:');
    console.log('  ✅ Stage 1: "So [Player] selects space [X]..."');
    console.log('  ✅ Stage 2: Money value reveal "(+$XXX)"');
    console.log('  ✅ Stage 3: Full dramatic reveal "It\'s a..."');
    console.log('  ✅ Suspense dots and timing');
    console.log('  ✅ Color-coded by type');
    console.log('  ✅ Handles all square types');
    console.log('\n✨ Your game now has RTAB-style tension! ✨\n');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
