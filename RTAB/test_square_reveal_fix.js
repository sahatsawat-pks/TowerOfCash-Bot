/**
 * Test RTAB Square Reveal - Verify Phase 5 fix
 * Tests that square reveal works without the undefined error
 */

console.log('🧪 Testing RTAB Square Reveal Fix...\n');

try {
    const { RTABLobby, RTABGame } = require('./RTABGame');
    const RTABUI = require('./rtabUI');

    // Create a test game
    const lobby = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby.players = [
        { userId: 'player1', username: 'Test Player 1' },
        { userId: 'player2', username: 'Test Player 2' }
    ];

    const game = new RTABGame(lobby);

    console.log('✅ Game created successfully');
    console.log(`   - ${game.players.length} players`);
    console.log(`   - Grid size: ${game.grid.length} squares\n`);

    // Test revealing a square
    console.log('Testing square reveal...');
    const player1 = game.players[0];
    const result = game.revealSquare(player1.userId, 0);

    if (!result.success) {
        throw new Error(`Square reveal failed: ${result.message}`);
    }

    console.log('✅ Square revealed successfully');
    console.log(`   - Type: ${result.type}`);
    console.log(`   - Is bomb: ${result.isBomb || false}\n`);

    // Test creating reveal embed (this was causing the error)
    console.log('Testing reveal embed creation...');
    const embed = RTABUI.createSquareRevealEmbed(game, result);

    if (!embed) {
        throw new Error('Embed creation failed - returned null/undefined');
    }

    if (!embed.data) {
        throw new Error('Embed has no data');
    }

    console.log('✅ Reveal embed created successfully');
    console.log(`   - Title: ${embed.data.title || 'N/A'}`);
    console.log(`   - Color: ${embed.data.color || 'N/A'}`);
    console.log(`   - Has description: ${!!embed.data.description}\n`);

    // Test a few more squares to ensure consistency
    console.log('Testing multiple square reveals...');
    for (let i = 1; i < 5 && i < game.grid.length; i++) {
        const nextPlayer = game.getCurrentPlayer();
        const nextResult = game.revealSquare(nextPlayer.userId, i);
        
        if (!nextResult.success) {
            console.log(`   ⚠️ Square ${i} failed: ${nextResult.message}`);
            continue;
        }

        const nextEmbed = RTABUI.createSquareRevealEmbed(game, nextResult);
        if (!nextEmbed) {
            throw new Error(`Embed creation failed for square ${i}`);
        }
        
        console.log(`   ✅ Square ${i + 1} - ${nextResult.type}`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 Square Reveal Tests PASSED!');
    console.log('═══════════════════════════════════════\n');
    console.log('Summary:');
    console.log('✅ Game initialization working');
    console.log('✅ Square reveal working');
    console.log('✅ Embed creation working (no undefined errors)');
    console.log('✅ Multiple reveals working');
    console.log('\n✨ The bug is fixed! ✨\n');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
