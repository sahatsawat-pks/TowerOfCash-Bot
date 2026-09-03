/**
 * Mount Ca$hmore - Pyramid Climbing Game
 * 9 levels with decreasing squares (10→9→8→7→6→5→4→3→2)
 * Goal: Find "Clear" on each level to advance to the top
 */

class MountCashmore {
  constructor(userId, username, channelId, guildId, isBigBank = false, bigBankAmount = 0) {
    this.userId = userId;
    this.username = username;
    this.channelId = channelId;
    this.guildId = guildId;
    this.isBigBank = isBigBank;
    this.bigBankAmount = bigBankAmount;
    this.currentLevel = 1;
    this.lives = 3;
    this.totalMoney = 0;
    this.isActive = true;
    this.currentLevelSquares = [];
    this.revealedSquares = [];
    this.levelCleared = false;
    this.skullSeekerJackpot = 100000; // Default, will be updated by sync
    this.skullImmunity = false;
    this.gamblersLuckPanels = null; // Store shuffled panels for current Gambler's Luck
    this.level9RiskMode = false; // Track if player chose risk mode for Level 9
    
    // Game Over Pot percentages
    this.gameOverPot = {
      1: 0, 2: 0, 3: 0,
      4: 0.05, 5: 0.10,
      6: 0.25, 7: 0.50,
      8: 0.75, 9: 1.00
    };

    // Initialize achievement tracking
    this.achievementTracking = {
        mountCashmoreStats: {
            levelReached: 0,
            won: false,
            finalMoney: 0,
            isBigBank: isBigBank,
            riskMode: false,
            livesLost: 0,
            skullJackpot: false
        }
    };
    
    this.initializeLevel();
  }

  getJackpot() {
    if (!this.isBigBank) {
      return 200000000; // $200M (20M x 10)
    } else {
      return Math.floor(this.bigBankAmount * 0.5);
    }
  }

  initializeLevel() {
    const squareCount = 11 - this.currentLevel; // Level 1=10, Level 2=9, etc.
    this.currentLevelSquares = [];
    this.revealedSquares = [];
    this.levelCleared = false;
    this.skullImmunity = false;
    this.gamblersLuckPanels = null;

    // Special case for Level 9
    if (this.currentLevel === 9) {
      if (this.level9RiskMode) {
        // Risk Mode: 5 squares
        // 1 Jackpot (Clear), 2 Game Over, 1 Tower of Cra$h, 1 Snow Storm
        this.currentLevelSquares = [
          { type: 'clear', emoji: '✅' },
          { type: 'gameover', emoji: '💀' },
          { type: 'gameover', emoji: '💀' },
          { type: 'tower_of_crash', emoji: '🏢' },
          { type: 'snow_storm', emoji: '❄️' }
        ];
      } else {
        // Zipline Mode: 2 squares
        // 1 Jackpot (Clear), 1 Game Over (Lose everything)
        this.currentLevelSquares = [
          { type: 'clear', emoji: '✅' },
          { type: 'gameover', emoji: '💀' }
        ];
      }
      this.shuffleSquares();
      return;
    }

    // Add Clear square
    this.currentLevelSquares.push({ type: 'clear', emoji: '✅' });

    // Add Skull square (unless Big Bank mode removes them)
    if (!this.isBigBank) {
      this.currentLevelSquares.push({ type: 'skull', emoji: '💀' });
    } else {
      // Big Bank mode: 2 fewer skulls, but may add Fatal Traps
      if (this.currentLevel <= 7) {
        // Add skulls normally except 2 are replaced
        const removedSkulls = [3, 5]; // Remove skulls on levels 3 and 5
        if (!removedSkulls.includes(this.currentLevel)) {
          this.currentLevelSquares.push({ type: 'skull', emoji: '💀' });
        }
      } else {
        this.currentLevelSquares.push({ type: 'skull', emoji: '💀' });
      }
    }

    // Add special squares based on level
    this.addSpecialSquares();

    // Fill remaining with cash squares
    const remaining = squareCount - this.currentLevelSquares.length;
    for (let i = 0; i < remaining; i++) {
      const cashValue = this.generateCashValue();
      this.currentLevelSquares.push({ 
        type: 'cash', 
        value: cashValue,
        emoji: '💵' 
      });
    }

    // Shuffle squares
    this.shuffleSquares();
  }

  addSpecialSquares() {
    const level = this.currentLevel;

    // Skull Seeker (Levels 1-3)
    if (level >= 1 && level <= 3) {
      this.currentLevelSquares.push({ 
        type: 'skull_seeker', 
        emoji: '🔍',
        jackpot: this.skullSeekerJackpot 
      });
    }

    // Ca$h Crash (Levels 2-6)
    if (level >= 2 && level <= 6) {
      this.currentLevelSquares.push({ 
        type: 'cash_crash', 
        emoji: '💥' 
      });
    }

    // Gambler's Luck (distributed across levels)
    if ([2, 4, 6].includes(level)) {
      this.currentLevelSquares.push({ 
        type: 'gamblers_luck', 
        emoji: '🎰' 
      });
    }

    // Gatorade Decimalizer (Level 4)
    if (level === 4) {
      this.currentLevelSquares.push({ 
        type: 'decimalizer', 
        emoji: '🧪' 
      });
    }

    // Host's Deal (Level 5)
    if (level === 5) {
      this.currentLevelSquares.push({ 
        type: 'hosts_deal', 
        emoji: '🤝' 
      });
    }

    // Fatal Trap (Levels 1-8, increased in Big Bank mode)
    if (level >= 1 && level <= 8) {
      if (!this.isBigBank) {
        // 1 fatal trap somewhere
        if ([3, 6, 8].includes(level)) {
          this.currentLevelSquares.push({ 
            type: 'fatal_trap', 
            emoji: '⚰️' 
          });
        }
      } else {
        // 2 additional fatal traps (replacing 2 skulls)
        if ([3, 5, 6, 8].includes(level)) {
          this.currentLevelSquares.push({ 
            type: 'fatal_trap', 
            emoji: '⚰️' 
          });
        }
      }
    }
  }

  generateCashValue() {
    // Cash values range from $10,000 to $10,000,000
    const cashValues = [
      10000, 25000, 50000, 75000, 100000,
      150000, 200000, 250000, 300000, 400000,
      500000, 750000, 1000000, 1500000, 2000000,
      2500000, 3000000, 4000000, 5000000, 6000000,
      7000000, 8000000, 9000000, 10000000
    ];
    
    return cashValues[Math.floor(Math.random() * cashValues.length)];
  }

  shuffleSquares() {
    for (let i = this.currentLevelSquares.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.currentLevelSquares[i], this.currentLevelSquares[j]] = 
        [this.currentLevelSquares[j], this.currentLevelSquares[i]];
    }
  }

  pickSquare(index) {
    if (!this.isActive || this.levelCleared) {
      return { error: 'Cannot pick square in current state' };
    }

    if (index < 0 || index >= this.currentLevelSquares.length) {
      return { error: 'Invalid square index' };
    }

    if (this.revealedSquares.includes(index)) {
      return { error: 'Square already revealed' };
    }

    this.revealedSquares.push(index);
    const square = this.currentLevelSquares[index];

    return this.handleSquare(square, index);
  }

  handleSquare(square, index) {
    const result = {
      square,
      index,
      totalMoney: this.totalMoney,
      lives: this.lives,
      level: this.currentLevel,
      levelCleared: false,
      gameOver: false,
      requiresInput: false
    };

    switch (square.type) {
      case 'clear':
        this.levelCleared = true;
        result.levelCleared = true;
        result.message = `✅ **CLEAR!** Level ${this.currentLevel} complete!`;
        
        if (this.currentLevel === 9) {
          // Won the game!
          const baseJackpot = this.getJackpot();
          let jackpot = baseJackpot;
          
          // Risk Mode: x10 jackpot multiplier!
          if (this.level9RiskMode) {
            jackpot = baseJackpot * 10;
            result.riskModeWin = true;
          }
          
          this.totalMoney += jackpot;
          result.won = true;
          result.jackpot = jackpot;
          result.baseJackpot = baseJackpot;
          result.totalMoney = this.totalMoney; // Update totalMoney in result
          
          if (this.level9RiskMode) {
            result.message = `🏆⚡ **CLIMB MODE VICTORY!** 🔥\n\n**YOU REACHED THE TOP!**\nBase Jackpot: $${this.formatMoney(baseJackpot)}\n**x10 MULTIPLIER: $${this.formatMoney(jackpot)}!**`;
          } else {
            result.message = `🏆 **YOU REACHED THE TOP!** Won $${this.formatMoney(jackpot)}!`;
          }
        }
        break;

      case 'cash':
        this.totalMoney += square.value;
        result.message = `💵 **CASH!** +$${this.formatMoney(square.value)}`;
        break;

      case 'skull':
        if (this.skullImmunity) {
          result.message = `💀 **SKULL!** But you have immunity!`;
          this.skullImmunity = false;
        } else {
          this.lives--;
          result.message = `💀 **SKULL!** Lost a life! (${this.lives} remaining)`;
          
          if (this.lives <= 0) {
            result.gameOver = true;
            const potPercent = this.gameOverPot[this.currentLevel];
            const moneyBeforePot = this.totalMoney; // Store original amount
            const potAmount = Math.floor(this.totalMoney * potPercent);
            this.totalMoney = potAmount;
            result.finalMoney = potAmount;
            result.moneyBeforePot = moneyBeforePot; // For Big Bank calculation
            result.message = `💀 **GAME OVER!** Lost all lives!\nGame Over Pot (${potPercent*100}%): $${this.formatMoney(potAmount)}`;
          }
        }
        break;

      case 'skull_seeker':
        result.requiresInput = 'skull_seeker';
        result.jackpot = this.skullSeekerJackpot;
        result.message = `🔍 **SKULL SEEKER!**\nGuess where the skull is for $${this.formatMoney(this.skullSeekerJackpot)}!`;
        break;

      case 'cash_crash':
        this.totalMoney = 0;
        result.message = `💥 **CA$H CRASH!** All money lost!`;
        break;

      case 'gamblers_luck':
        // Generate and shuffle panels when square is revealed
        this.generateGamblersLuckPanels();
        result.requiresInput = 'gamblers_luck';
        result.message = `🎰 **GAMBLER'S LUCK!**\nPick a panel (1-3):\n1️⃣ ???\n2️⃣ ???\n3️⃣ ???`;
        break;

      case 'decimalizer':
        result.requiresInput = 'decimalizer';
        result.message = `🧪 **GATORADE® DECIMALIZER!**\nAnswer correctly to multiply, or skip!`;
        break;

      case 'hosts_deal':
        const dealAmount = this.calculateHostsDeal();
        result.requiresInput = 'hosts_deal';
        result.dealAmount = dealAmount;
        result.message = `🤝 **HOST'S DEAL!**\nLeave now with $${this.formatMoney(dealAmount)}?`;
        break;

      case 'fatal_trap':
        const moneyBeforeTrap = this.totalMoney; // Store money before losing it
        this.totalMoney = 0;
        this.isActive = false;
        result.gameOver = true;
        result.finalMoney = 0;
        result.moneyLostToTrap = moneyBeforeTrap; // Store for Big Bank calculation
        result.message = `⚰️ **FATAL TRAP!** Game Over! Lost everything!`;
        break;

      case 'gameover':
        // Level 9 Game Over square
        this.isActive = false;
        result.gameOver = true;
        
        // Check mode
        if (this.level9RiskMode) {
          // Risk mode (Big Bank): lose everything
          const moneyLost = this.totalMoney;
          this.totalMoney = 0;
          result.finalMoney = 0;
          result.moneyLostInRiskMode = moneyLost; // For Big Bank calculation
          result.message = `💀 **GAME OVER!** Climb mode activated - Lost everything!\n💸 Lost: $${this.formatMoney(moneyLost)}`;
        } else if (this.isBigBank) {
          // Safe mode (Big Bank): lose everything (as per new rule)
          this.totalMoney = 0;
          result.finalMoney = 0;
          result.message = `💀 **GAME OVER!** You fell from the Zipline!\n💸 Lost everything!`;
        } else {
          // Normal mode (Standard): Keep winnings
          result.finalMoney = this.totalMoney;
          result.message = `💀 **GAME OVER!** You fell just short of the summit!\n💰 But you kept your winnings: $${this.formatMoney(this.totalMoney)}`;
        }
        break;

      case 'tower_of_crash':
        this.isActive = false;
        result.gameOver = true;
        result.towerOfCrash = true;
        result.message = `🏢 **TOWER OF CRA$H!**\nThe tower has collapsed on you!`;
        break;

      case 'snow_storm':
        this.isActive = false;
        result.gameOver = true;
        // Half money home, half to Big Bank
        const halfMoney = Math.floor(this.totalMoney / 2);
        const bigBankMoney = this.totalMoney - halfMoney;
        this.totalMoney = halfMoney;
        
        result.snowStorm = true;
        result.finalMoney = halfMoney;
        result.moneyToBigBank = bigBankMoney;
        result.message = `❄️ **SNOW STORM!**\nA sudden blizzard buries part of your haul — you manage to escape with only half your money. The remainder is swept into the Big Bank.\n\n💰 You kept: $${this.formatMoney(halfMoney)}\n🏦 Added to Big Bank: $${this.formatMoney(bigBankMoney)}`;
        break;
    }

    result.totalMoney = this.totalMoney;
    result.lives = this.lives;
    return result;
  }

  setSkullSeekerJackpot(amount) {
    this.skullSeekerJackpot = amount;
  }

  handleSkullSeekerGuess(guessIndex) {
    const skullIndex = this.currentLevelSquares.findIndex(sq => sq.type === 'skull');
    
    if (guessIndex === skullIndex) {
      // Correct guess!
      this.totalMoney += this.skullSeekerJackpot;
      this.skullImmunity = true;
      const result = {
        success: true,
        won: this.skullSeekerJackpot,
        immunity: true,
        message: `🔍 **CORRECT!** Won $${this.formatMoney(this.skullSeekerJackpot)} + Skull Immunity!`,
        totalMoney: this.totalMoney
      };
      // Note: effective reset happens in DB
      return result;
    } else {
      // Wrong guess
      // Note: Increment happens in DB
      return {
        success: false,
        message: `💀 **WRONG!** 💀\n\n**Square ${guessIndex + 1}** is not a skull.\n\n📈 Jackpot grows!`,
        totalMoney: this.totalMoney
      };
    }
  }

  generateGamblersLuckPanels() {
    const panels = [
      { type: 'percent_plus', value: Math.floor(Math.random() * 81) + 10 }, // 10-90%
      { type: 'percent_minus', value: Math.floor(Math.random() * 81) + 10 }, // 10-90%
      { type: 'bounty', value: Math.floor(Math.random() * 49000) + 1000 } // $1,000-$50,000
    ];
    
    // Shuffle panels
    for (let i = panels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [panels[i], panels[j]] = [panels[j], panels[i]];
    }
    
    this.gamblersLuckPanels = panels;
    return panels;
  }

  handleGamblersLuck(panelChoice) {
    // Validate panel choice
    if (panelChoice < 0 || panelChoice > 2) {
      console.error(`Invalid panel choice: ${panelChoice}`);
      return {
        type: 'error',
        message: '❌ Invalid panel selection!',
        totalMoney: this.totalMoney
      };
    }
    
    // Use pre-generated panels if they exist, otherwise generate new ones
    if (!this.gamblersLuckPanels || !Array.isArray(this.gamblersLuckPanels)) {
      this.generateGamblersLuckPanels();
    }
    
    const chosen = this.gamblersLuckPanels[panelChoice];
    
    // Safety check for undefined panel
    if (!chosen || !chosen.type) {
      console.error(`Panel at index ${panelChoice} is undefined or invalid`);
      console.error('Panels:', this.gamblersLuckPanels);
      // Regenerate panels and try again
      this.generateGamblersLuckPanels();
      const newChosen = this.gamblersLuckPanels[panelChoice];
      if (!newChosen || !newChosen.type) {
        return {
          type: 'error',
          message: '❌ Error processing panel. Please try again.',
          totalMoney: this.totalMoney
        };
      }
      return this.processPanelChoice(newChosen);
    }
    
    return this.processPanelChoice(chosen);
  }
  
  processPanelChoice(chosen) {
    let result;
    if (chosen.type === 'percent_plus') {
      const gain = Math.floor(this.totalMoney * (chosen.value / 100));
      this.totalMoney += gain;
      result = {
        type: 'percent_plus',
        percentage: chosen.value,
        amount: gain,
        message: `📈 **+${chosen.value}%!** Gained $${this.formatMoney(gain)}`,
        totalMoney: this.totalMoney
      };
    } else if (chosen.type === 'percent_minus') {
      const loss = Math.floor(this.totalMoney * (chosen.value / 100));
      this.totalMoney -= loss;
      result = {
        type: 'percent_minus',
        percentage: -chosen.value,
        amount: -loss,
        message: `📉 **-${chosen.value}%!** Lost $${this.formatMoney(loss)}`,
        totalMoney: this.totalMoney
      };
    } else {
      const bounty = chosen.value * 10; // Multiply by 10
      this.totalMoney += bounty;
      result = {
        type: 'bounty',
        bounty: bounty,
        amount: bounty,
        message: `💰 **BOUNTY!** Won $${this.formatMoney(bounty)}`,
        totalMoney: this.totalMoney
      };
    }
    
    // Clear panels after use
    this.gamblersLuckPanels = null;
    return result;
  }

  handleDecimalizer(toss = null, skip = false) {
    if (skip) {
      return {
        skipped: true,
        message: '⏭️ **SKIPPED** Decimalizer',
        totalMoney: this.totalMoney
      };
    }

    const decimal = (Math.floor(Math.random() * 10) + 11) / 10; // 1.1 to 2.0
    const coinFlip = Math.random() < 0.5 ? 'heads' : 'tails'; // Random coin flip
    const isHeads = coinFlip === 'heads';

    if (isHeads) {
      // Heads = Multiply
      const oldMoney = this.totalMoney;
      this.totalMoney = Math.floor(this.totalMoney * decimal);
      const gain = this.totalMoney - oldMoney;
      return {
        heads: true,
        coinFlip,
        decimal,
        gain,
        message: `🪙 **HEADS!** Money x${decimal.toFixed(1)} = +$${this.formatMoney(gain)}`,
        totalMoney: this.totalMoney
      };
    } else {
      // Tails = Divide
      const oldMoney = this.totalMoney;
      this.totalMoney = Math.floor(this.totalMoney / decimal);
      const loss = oldMoney - this.totalMoney;
      return {
        heads: false,
        coinFlip,
        decimal,
        loss,
        message: `🪙 **TAILS!** Money ÷${decimal.toFixed(1)} = -$${this.formatMoney(loss)}`,
        totalMoney: this.totalMoney
      };
    }
  }

  handleHostsDeal(accept) {
    const dealAmount = this.calculateHostsDeal();
    
    if (accept) {
      this.totalMoney = dealAmount;
      this.isActive = false;
      return {
        accepted: true,
        amount: dealAmount,
        message: `🤝 **DEAL ACCEPTED!** Left with $${this.formatMoney(dealAmount)}`,
        gameOver: true,
        finalMoney: dealAmount
      };
    } else {
      return {
        accepted: false,
        message: `🤝 **DEAL REJECTED!** Continuing...`,
        totalMoney: this.totalMoney
      };
    }
  }

  calculateHostsDeal() {
    // Formula: Current money * (0.6 + level * 0.05)
    const multiplier = 0.6 + (this.currentLevel * 0.05);
    return Math.floor(this.totalMoney * multiplier);
  }

  canCashOut() {
    // Players can walk away after clearing any level except level 9 (jackpot)
    return this.levelCleared && this.currentLevel >= 1 && this.currentLevel <= 8;
  }

  cashOut() {
    if (!this.canCashOut()) {
      return { error: 'Cannot cash out at this level' };
    }

    this.isActive = false;
    return {
      success: true,
      finalMoney: this.totalMoney,
      message: `💰 **CASHED OUT!** Left with $${this.formatMoney(this.totalMoney)}`,
      gameOver: true
    };
  }

  advanceLevel() {
    if (!this.levelCleared) {
      return { error: 'Level not cleared yet' };
    }

    this.currentLevel++;
    
    if (this.currentLevel > 9) {
      // Won the game!
      return {
        won: true,
        finalMoney: this.totalMoney,
        message: `🏆 **CONGRATULATIONS!** You conquered Mount Ca$hmore!`
      };
    }

    this.initializeLevel();
    return {
      success: true,
      level: this.currentLevel,
      message: `⬆️ **Advanced to Level ${this.currentLevel}!**`
    };
  }

  setLevel9RiskMode(isRisk) {
    this.level9RiskMode = isRisk;
  }

  getGameState() {
    return {
      isBigBank: this.isBigBank,
      currentLevel: this.currentLevel,
      lives: this.lives,
      totalMoney: this.totalMoney,
      isActive: this.isActive,
      levelCleared: this.levelCleared,
      squareCount: this.currentLevelSquares.length,
      revealedCount: this.revealedSquares.length,
      skullSeekerJackpot: this.skullSeekerJackpot,
      canCashOut: this.canCashOut(),
      jackpot: this.getJackpot(),
      level9RiskMode: this.level9RiskMode
    };
  }

  formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

module.exports = MountCashmore;
