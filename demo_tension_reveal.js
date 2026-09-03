/**
 * Demo RTAB Tension Reveal System
 * Shows examples of dramatic reveals like the RTAB show
 */

console.log('🎬 RTAB Tension Reveal System Demo\n');
console.log('═'.repeat(60));
console.log('   Like the show: "So Dark selects space 13..."');
console.log('                  "(+$118,025)..."');
console.log('                  "It\'s a minigame: Bumper Grab!"');
console.log('═'.repeat(60) + '\n');

try {
    const { RTABLobby, RTABGame } = require('./RTAB/RTABGame');
    const RTABUI = require('./RTAB/rtabUI');

    // Create a test game
    const lobby = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby.players = [
        { userId: 'player1', username: 'Dark' },
        { userId: 'player2', username: 'Light' }
    ];

    const game = new RTABGame(lobby);

    // Example 1: Prize reveal
    console.log('🎬 EXAMPLE 1: Prize Reveal\n');
    let player = game.getCurrentPlayer();
    let result = game.revealSquare(player.userId, 0);
    
    console.log('   Stage 1 → "So Dark selects space 1..."');
    let embed = RTABUI.createTensionRevealEmbed(game, result, 1);
    console.log(`   💬 ${embed.data.description}\n`);
    
    console.log('   Stage 2 → Show the money first!');
    embed = RTABUI.createTensionRevealEmbed(game, result, 2);
    console.log(`   💬 ${embed.data.description.split('\n').join('\n      ')}\n`);
    
    console.log('   Stage 3 → The big reveal!');
    embed = RTABUI.createTensionRevealEmbed(game, result, 3);
    const lines = embed.data.description.split('\n');
    lines.forEach(line => console.log(`   💬 ${line}`));
    console.log('\n' + '─'.repeat(60) + '\n');

    // Example 2: Bomb reveal
    console.log('🎬 EXAMPLE 2: Bomb Reveal (OH NO!)\n');
    
    // Create a fresh game for bomb test
    const lobby3 = new RTABLobby('test-channel-2', 'test-guild', 'creator');
    lobby3.players = [
        { userId: 'player1', username: 'Dark' },
        { userId: 'player2', username: 'Light' }
    ];
    const game3 = new RTABGame(lobby3);
    
    // Place bomb on square 5
    const placer = game3.getCurrentPlayer();
    game3.placeBomb(placer.userId, 5);
    
    // Switch to next player by advancing turn
    game3.currentPlayerIndex = (game3.currentPlayerIndex + 1) % game3.players.length;
    
    // Hit the bomb
    player = game3.getCurrentPlayer();
    result = game3.revealSquare(player.userId, 5);
    
    console.log('   Stage 1 → "So Light selects space 6..."');
    embed = RTABUI.createTensionRevealEmbed(game3, result, 1);
    console.log(`   💬 ${embed.data.description}\n`);
    
    console.log('   Stage 3 → BOOM! 💣');
    embed = RTABUI.createTensionRevealEmbed(game3, result, 3);
    const bombLines = embed.data.description.split('\n');
    bombLines.forEach(line => console.log(`   💬 ${line}`));
    console.log('\n' + '─'.repeat(60) + '\n');

    // Example 3: Find a minigame or multiplier
    console.log('🎬 EXAMPLE 3: Special Square Reveal\n');
    
    // Create new game to get clean state
    const lobby2 = new RTABLobby('test-channel', 'test-guild', 'creator');
    lobby2.players = [
        { userId: 'player1', username: 'Dark' }
    ];
    const game2 = new RTABGame(lobby2);
    
    // Find first non-prize square
    let specialIndex = -1;
    for (let i = 0; i < game2.grid.length; i++) {
        if (game2.grid[i].type !== 'prize' && !game2.grid[i].isBomb) {
            specialIndex = i;
            break;
        }
    }
    
    if (specialIndex >= 0) {
        player = game2.getCurrentPlayer();
        result = game2.revealSquare(player.userId, specialIndex);
        
        console.log(`   Stage 1 → "So Dark selects space ${specialIndex + 1}..."`);
        embed = RTABUI.createTensionRevealEmbed(game2, result, 1);
        console.log(`   💬 ${embed.data.description}\n`);
        
        if (result.type === 'minigame' || result.type === 'prize') {
            console.log('   Stage 2 → Money reveal!');
            embed = RTABUI.createTensionRevealEmbed(game2, result, 2);
            console.log(`   💬 ${embed.data.description.split('\n').join('\n      ')}\n`);
        }
        
        console.log('   Stage 3 → What is it?!');
        embed = RTABUI.createTensionRevealEmbed(game2, result, 3);
        const specialLines = embed.data.description.split('\n');
        specialLines.forEach(line => console.log(`   💬 ${line}`));
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TENSION REVEAL SYSTEM READY!');
    console.log('═'.repeat(60) + '\n');
    console.log('How it works in Discord:');
    console.log('  1️⃣  Player clicks square');
    console.log('  2️⃣  Stage 1 appears (1.8s): "So [Player] selects space X..."');
    console.log('  3️⃣  Stage 2 appears (1.5s): Shows money amount');
    console.log('  4️⃣  Stage 3 appears: Full dramatic reveal!');
    console.log('  ⏱️  Total suspense time: ~3-4 seconds per reveal');
    console.log('\n✨ Just like watching the real RTAB show! ✨\n');

} catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
