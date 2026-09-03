const MountCashmore = require('./MountCashmore');

console.log("Starting verification...");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// Mock Database for stats verification
const mockDb = {
    stats: {},
    increments: [],
    updates: [],
    
    getMountCashmoreStats: async function(userId, guildId) {
        return this.stats[`${userId}_${guildId}`];
    },
    
    incrementMountCashmoreStat: async function(userId, guildId, statName, value = 1) {
        this.increments.push({ userId, guildId, statName, value });
        const key = `${userId}_${guildId}`;
        this.stats[key] = this.stats[key] || {};
        this.stats[key][statName] = (this.stats[key][statName] || 0) + value;
    },
    
    updateMountCashmoreMaxStat: async function(userId, guildId, statName, value) {
        this.updates.push({ userId, guildId, statName, value, type: 'MAX' });
        const key = `${userId}_${guildId}`;
        this.stats[key] = this.stats[key] || {};
        this.stats[key][statName] = Math.max(this.stats[key][statName] || 0, value);
    },
    
    updateMountCashmoreMoney: async function(userId, guildId, amount) {
        this.updates.push({ userId, guildId, amount, type: 'MONEY' });
        const key = `${userId}_${guildId}`;
        this.stats[key] = this.stats[key] || {};
        this.stats[key].total_money_earned = (this.stats[key].total_money_earned || 0) + amount;
    }
};

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
    const clearResult = game.pickSquare(clearIndex);
    assert(clearResult.won, "Expected clear to be a win");
    // Normal Mode Jackpot is 200M. Starting money logic varies but it starts at 0 + whatever gained.
    // If we set totalMoney = 100000, then 200,100,000.
    // So > 200,000,000 is correct.
    assert(clearResult.totalMoney > 200000000, "Expected jackpot money (Normal Mode ~200M+ starting money)");
    
    // Test 'gameover' behavior in Normal Mode
    // Reset squares for test
    game.initializeLevel();
    const gameOverIndex = game.currentLevelSquares.findIndex(s => s.type === 'gameover');
    if (gameOverIndex !== -1) {
        // Set total money first
        game.totalMoney = 150000;
        const gameOverResult = game.pickSquare(gameOverIndex);
        
        assert(gameOverResult.gameOver, "Expected game over");
        // In Normal Mode, you should KEEP your winnings
        assert(gameOverResult.finalMoney === 150000, `Expected to keep winnings ($150000), but got $${gameOverResult.finalMoney}`);
        console.log("✅ specific Normal Mode Game Over check passed (Kept Winnings)");
    } else {
        console.warn("Could not find Game Over square for test");
    }

} catch (e) {
    console.error("❌ Test 1 Failed:", e.stack);
}

console.log("\nVerification Complete.");
