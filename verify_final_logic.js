const MountCashmore = require('./MountCashmore');

console.log("Starting FINAL verification...");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// Test 1: Level 9 Normal Mode Logic
console.log("\nTesting Level 9 Normal Mode Logic...");
try {
    const game = new MountCashmore('user1', 'User', 'channel1', 'guild1', false); // false = Normal Mode (Not Big Bank)
    game.totalMoney = 100000;
    game.currentLevel = 8;
    game.levelCleared = true;
    
    // Simulate what happens in index.js for Normal Mode
    // 1. Check isBigBank - should be false
    assert(game.isBigBank === false, "Expected isBigBank to be false");
    
    // 2. Logic simulation: proceed to Level 9 without setting risk mode
    game.advanceLevel();
    
    // 3. Verify Level 9 setup
    assert(game.currentLevel === 9, "Expected to be at Level 9");
    assert(game.currentLevelSquares.length === 2, `Expected 2 squares, got ${game.currentLevelSquares.length}`);
    
    // 4. Verify outcomes for Normal Mode Level 9
    // 'clear' = Jackpot
    const clearIndex = game.currentLevelSquares.findIndex(s => s.type === 'clear');
    if (clearIndex !== -1) {
        const clearResult = game.pickSquare(clearIndex);
        assert(clearResult.won, "Expected clear to be a win");
        assert(clearResult.totalMoney > 200000000, `Expected jackpot money > 200M, got ${clearResult.totalMoney}`);
        console.log("✅ Normal Mode Jackpot Check Passed");
    }

    // Reset and test 'gameover' behavior in Normal Mode
    // Create new game instance to avoid state pollution
    const game2 = new MountCashmore('user1', 'User', 'channel1', 'guild1', false);
    game2.totalMoney = 150000;
    game2.currentLevel = 9;
    game2.initializeLevel(); // Force init level 9
    
    const gameOverIndex = game2.currentLevelSquares.findIndex(s => s.type === 'gameover');
    if (gameOverIndex !== -1) {
        const gameOverResult = game2.pickSquare(gameOverIndex);
        
        assert(gameOverResult.gameOver, "Expected game over");
        // In Normal Mode, you should KEEP your winnings
        assert(gameOverResult.finalMoney === 150000, `Expected to keep winnings ($150000), but got $${gameOverResult.finalMoney}`);
        console.log("✅ Normal Mode Game Over Check Passed (Kept Winnings)");
    } else {
        console.warn("Could not find Game Over square for test");
    }

} catch (e) {
    console.error("❌ Test Failed:", e.stack);
    process.exit(1);
}

console.log("\nVerification Complete. All Checks Passed.");
