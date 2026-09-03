/**
 * Achievement Helper
 * Utility functions to update achievement tracking during gameplay
 */

class AchievementHelper {
  /**
   * Track a correct pick (for perfect floor achievement)
   */
  static trackCorrectPick(game) {
    if (!game.achievementTracking) return;
    
    game.achievementTracking.consecutiveCorrectPicks++;
    game.achievementTracking.lastPickWasCorrect = true;
    game.achievementTracking.currentFloorPicks++;
    game.achievementTracking.firstPickOfFloor = false;
    
    // Check if floor is perfect (3 correct picks)
    if (game.achievementTracking.consecutiveCorrectPicks >= 3 &&
        game.achievementTracking.currentFloorPicks === 3) {
      game.achievementTracking.perfectFloorsCount++;
    }
  }

  /**
   * Track an incorrect pick (resets consecutive counter)
   */
  static trackIncorrectPick(game) {
    if (!game.achievementTracking) return;
    
    game.achievementTracking.consecutiveCorrectPicks = 0;
    game.achievementTracking.lastPickWasCorrect = false;
    game.achievementTracking.currentFloorPicks++;
    game.achievementTracking.firstPickOfFloor = false;
  }

  /**
   * Reset floor tracking when moving to next floor
   */
  static resetFloorTracking(game) {
    if (!game.achievementTracking) return;
    
    game.achievementTracking.currentFloorPicks = 0;
    game.achievementTracking.firstPickOfFloor = true;
  }

  /**
   * Track peek usage
   */
  static trackPeekUsed(game) {
    if (!game.achievementTracking) return;
    game.achievementTracking.peeksUsed++;
  }

  /**
   * Track minigame played
   */
  static trackMinigamePlayed(game, minigameName) {
    if (!game.achievementTracking) return;
    if (!game.achievementTracking.minigamesPlayed.includes(minigameName)) {
      game.achievementTracking.minigamesPlayed.push(minigameName);
    }
  }

  /**
   * Track Mart-Of-Cash purchase
   */
  static trackMartPurchase(game, itemName, cost) {
    if (!game.achievementTracking) return;
    
    if (!game.achievementTracking.martItemsBought.includes(itemName)) {
      game.achievementTracking.martItemsBought.push(itemName);
    }
    game.achievementTracking.martTotalSpent += cost;
  }

  /**
   * Track X-Level survival
   */
  static trackXLevelSurvival(game) {
    if (!game.achievementTracking) return;
    game.achievementTracking.xLevelsSurvived++;
  }

  /**
   * Track Random % result
   */
  static trackRandomPercent(game, percentage) {
    if (!game.achievementTracking) return;
    game.achievementTracking.randomPercentResult = Math.max(
      game.achievementTracking.randomPercentResult,
      percentage
    );
  }

  /**
   * Track Babushka minigame stats
   */
  static trackBabushka(game, winnings, strikes, dollsOpened) {
    if (!game.achievementTracking) return;
    game.achievementTracking.babushkaStats.winnings = winnings;
    game.achievementTracking.babushkaStats.strikes = strikes;
    game.achievementTracking.babushkaStats.dollsOpened = dollsOpened;
    if (strikes === 3) {
      game.achievementTracking.babushkaStats.maxStrikesReached++;
    }
  }

  /**
   * Track Hideout Breakthrough stats
   */
  static trackHideout(game, jackpotWon, firstPickWas12, failedPicks) {
    if (!game.achievementTracking) return;
    game.achievementTracking.hideoutStats.jackpotWon = jackpotWon;
    game.achievementTracking.hideoutStats.firstPickWas12 = firstPickWas12;
    game.achievementTracking.hideoutStats.failedPicks = failedPicks;
  }

  /**
   * Track Door Escape stats
   */
  static trackDoorEscape(game, rounds, treasureFound, fatalPicked, healthLost) {
    if (!game.achievementTracking) return;
    game.achievementTracking.doorEscapeStats.rounds = rounds;
    game.achievementTracking.doorEscapeStats.treasureFound = treasureFound;
    game.achievementTracking.doorEscapeStats.fatalPicked = fatalPicked;
    game.achievementTracking.doorEscapeStats.healthLost = healthLost;
  }

  /**
   * Track Six Zeroes stats
   */
  static trackSixZeroes(game, zerosFound, goldenTicket, noodlesPicked) {
    if (!game.achievementTracking) return;
    game.achievementTracking.sixZeroesStats.zerosFound = zerosFound;
    game.achievementTracking.sixZeroesStats.goldenTicket = goldenTicket;
    game.achievementTracking.sixZeroesStats.noodlesPicked = noodlesPicked;
  }

  /**
   * Track Community Chest winnings
   */
  static trackCommunityChest(game, winnings) {
    if (!game.achievementTracking) return;
    game.achievementTracking.communityChestWinnings += winnings;
  }

  /**
   * Track Basement stats
   */
  static trackBasement(game, escaped, moneyKept, moneyLost) {
    if (!game.achievementTracking) return;
    game.achievementTracking.basementStats.escaped = escaped;
    game.achievementTracking.basementStats.moneyKept = moneyKept;
    game.achievementTracking.basementStats.moneyLost = moneyLost;
  }

  /**
   * Track Mystery Box stats
   */
  static trackMysteryBox(game, legendaryReceived, bigBankWon, moneyLost) {
    if (!game.achievementTracking) return;
    if (legendaryReceived) {
      game.achievementTracking.mysteryBoxStats.legendaryReceived = true;
    }
    if (bigBankWon) {
      game.achievementTracking.mysteryBoxStats.bigBankWon = true;
    }
    if (moneyLost > 0) {
      game.achievementTracking.mysteryBoxStats.moneyLost += moneyLost;
    }
  }

  /**
   * Track game over
   */
  static trackGameOver(game, reason, floor) {
    if (!game.achievementTracking) return;
    game.achievementTracking.gameOverReason = reason;
    game.achievementTracking.gameOverFloor = floor;
  }

  /**
   * Track Mount Cashmore stats
   */
  static trackMountCashmore(game, level, won, finalMoney, isBigBank, riskMode, livesLost) {
    if (!game.achievementTracking) return;
    if (!game.achievementTracking.mountCashmoreStats) {
        game.achievementTracking.mountCashmoreStats = {
            levelReached: 0,
            won: false,
            finalMoney: 0,
            isBigBank: false,
            riskMode: false,
            livesLost: 0,
            skullJackpot: false
        };
    }
    const s = game.achievementTracking.mountCashmoreStats;
    s.levelReached = level;
    s.won = won;
    s.finalMoney = finalMoney;
    s.isBigBank = isBigBank;
    s.riskMode = riskMode;
    if (livesLost !== undefined) s.livesLost = livesLost;
  }

  static trackMountCashmoreSkull(game, jackpot) {
    if (!game.achievementTracking) return;
    if (!game.achievementTracking.mountCashmoreStats) {
        game.achievementTracking.mountCashmoreStats = {
            levelReached: 0,
            won: false,
            finalMoney: 0,
            isBigBank: false,
            riskMode: false,
            livesLost: 0,
            skullJackpot: false
        };
    }
    if (jackpot) game.achievementTracking.mountCashmoreStats.skullJackpot = true;
  }

  static trackVault(game, cracked, attempts, reward) {
    if (!game.achievementTracking) return;
    game.achievementTracking.vaultStats = game.achievementTracking.vaultStats || { cracked: false, attempts: 0, reward: '' };
    if (cracked) game.achievementTracking.vaultStats.cracked = true;
    if (attempts) game.achievementTracking.vaultStats.attempts = attempts;
    if (reward) game.achievementTracking.vaultStats.reward = reward;
  }

  static trackMegaGrid(game, tilesRevealed, multiplier, moneyWon, jackpotWon) {
    if (!game.achievementTracking) return;
    game.achievementTracking.megaGridStats = game.achievementTracking.megaGridStats || { tilesRevealed: 0, multiplier: 1, moneyWon: 0, jackpotWon: false, safeClear: false };
    const s = game.achievementTracking.megaGridStats;
    if (tilesRevealed) s.tilesRevealed = tilesRevealed;
    if (multiplier) s.multiplier = Math.max(s.multiplier, multiplier);
    if (moneyWon) s.moneyWon = moneyWon;
    if (jackpotWon) s.jackpotWon = true;
    if (tilesRevealed >= 10 && moneyWon > 0) s.safeClear = true; // Approx check for safe clear
  }

  static trackDond(game, moneyWon, dealAccepted, caseValue) {
    if (!game.achievementTracking) return;
    game.achievementTracking.dondStats = game.achievementTracking.dondStats || { moneyWon: 0, dealAccepted: false, caseValue: 0, beatBanker: false };
    const s = game.achievementTracking.dondStats;
    s.moneyWon = moneyWon;
    s.dealAccepted = dealAccepted;
    s.caseValue = caseValue;
    if (dealAccepted && moneyWon > caseValue) s.beatBanker = true;
  }

  static trackRideRails(game, moneyWon, jackpotWon, goalReached) {
    if (!game.achievementTracking) return;
    game.achievementTracking.rideRailsStats = game.achievementTracking.rideRailsStats || { moneyWon: 0, jackpotWon: false, goalReached: false };
    const s = game.achievementTracking.rideRailsStats;
    s.moneyWon = moneyWon;
    if (jackpotWon) s.jackpotWon = true;
    if (goalReached) s.goalReached = true;
  }

  static trackItemUsage(game, itemType, resultData) {
    if (!game.achievementTracking) return;
    game.achievementTracking.itemStats = game.achievementTracking.itemStats || { removeZerosCount: 0, blastDigitResult: '' };
    if (itemType === 'remove_zeros') {
        game.achievementTracking.itemStats.removeZerosCount = resultData.zerosRemoved;
    } else if (itemType === 'blast_digit') {
        game.achievementTracking.itemStats.blastDigitAllNines = resultData.allNines;
    }
  }

  /**
   * Get tracking summary for debugging
   */
  static getTrackingSummary(game) {
    if (!game.achievementTracking) return 'No tracking initialized';
    
    const t = game.achievementTracking;
    return `
Achievement Tracking Summary:
- Consecutive Correct: ${t.consecutiveCorrectPicks}
- Perfect Floors: ${t.perfectFloorsCount}
- Peeks Used: ${t.peeksUsed}
- Minigames: ${t.minigamesPlayed.join(', ') || 'None'}
- Mart Items: ${t.martItemsBought.length} (Spent: $${t.martTotalSpent.toLocaleString()})
- X-Levels Survived: ${t.xLevelsSurvived}
- Random %: ${t.randomPercentResult}%
- Babushka: $${t.babushkaStats.winnings.toLocaleString()}, ${t.babushkaStats.strikes} strikes
- Hideout: Jackpot=${t.hideoutStats.jackpotWon}
- Door Escape: ${t.doorEscapeStats.rounds} rounds
- Six Zeroes: ${t.sixZeroesStats.zerosFound} zeros
- Community Chest: $${t.communityChestWinnings.toLocaleString()}
- Vault: Cracked=${t.vaultStats?.cracked}, Attempts=${t.vaultStats?.attempts}
- Mega Grid: Tiles=${t.megaGridStats?.tilesRevealed}, Multi=${t.megaGridStats?.multiplier}x
- DOND: Won=$${t.dondStats?.moneyWon}, BeatBanker=${t.dondStats?.beatBanker}
- Rails: Won=$${t.rideRailsStats?.moneyWon}, Jackpot=${t.rideRailsStats?.jackpotWon}
`.trim();
  }
}

module.exports = AchievementHelper;
