/**
 * Test Prize Format Fix
 * Verify that prizes show "$XXX" without "Baht" or other currency names
 */

console.log('🧪 Testing Prize Format Fix\n');

try {
    const { RTABLobby, RTABGame } = require('./RTABGame');
    const RTABUI = require('./rtabUI');

    // Create a test game
    const lobby = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby.players = [
        { userId: 'player1', username: 'TestPlayer' }
    ];

    const game = new RTABGame(lobby);
    
    // Force a prize square
    for (let i = 0; i < game.grid.length; i++) {
        if (game.grid[i].type === 'prize' && !game.grid[i].isBomb) {
            console.log('Found prize square at index', i);
            console.log('Prize details:', game.grid[i]);
            
            const player = game.getCurrentPlayer();
            const result = game.revealSquare(player.userId, i);
            
            console.log('\nReveal result:', result);
            
            // Test Stage 3 (final reveal)
            const stage3 = RTABUI.createTensionRevealEmbed(game, result, 3);
            console.log('\nStage 3 Description:');
            console.log(stage3.data.description);
            
            // Check format
            if (stage3.data.description.includes('Baht')) {
                console.error('\n❌ FAILED: Prize still shows "Baht"!');
                process.exit(1);
            }
            
            if (stage3.data.description.includes('worth')) {
                console.error('\n❌ FAILED: Prize still shows "worth" text!');
                process.exit(1);
            }
            
            if (!stage3.data.description.match(/\$\d/)) {
                console.error('\n❌ FAILED: Prize doesn\'t show dollar amount!');
                process.exit(1);
            }
            
            console.log('\n✅ Prize format correct!');
            console.log('✅ No "Baht" or currency name');
            console.log('✅ Shows dollar amount only');
            console.log('\n✨ Test passed! ✨');
            process.exit(0);
        }
    }
    
    console.error('No prize square found in grid');
    process.exit(1);

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
