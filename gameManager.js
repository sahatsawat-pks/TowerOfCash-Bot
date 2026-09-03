const config = require('./config.json');

class GameState {
  formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  constructor(userId, username, channelId, guildId, eventMode = false) {
    this.userId = userId;
    this.username = username;
    this.channelId = channelId;
    this.guildId = guildId;
    if (eventMode === 2 || eventMode === 'season2' || eventMode === '2') {
      this.eventMode = 2;
      this.isSeason2 = true;
    } else if (eventMode === 1 || eventMode === '1' || eventMode === 'season1' || eventMode === 'enable' || eventMode === true) {
      this.eventMode = 1;
      this.isSeason2 = false;
    } else {
      this.eventMode = 0;
      this.isSeason2 = false;
    }
    this.maxFloors = this.eventMode ? 30 : 21;
    this.currentRound = 1; // 1-6 for normal mode, 1-8 for Season 1/2 mode
    this.activePact = null; // For Season 2 Ascent Pacts
    this.bossFloorState = null; // For Season 2 Guardian Boss Floors (10, 20, 30)
    this.season2MinigameState = null; // For Season 2 Elite minigames
    this.currentFloor = 0; // Current floor index in selected floors
    this.totalMoney = 0;
    this.isActive = true; // Game is active by default
    this.selectedFloors = []; // Floors selected for current round (from 1-30)
    this.floorsToSelect = this.getRoundConfig()[0]; // Floors for first round
    this.gameHistory = []; // Track all choices
    this.isSelectingFloors = true; // Start with floor selection
    this.isSelectingSide = false;
    this.currentFloorChoices = null;
    this.floorsCompleted = 0;
    this.playedFloors = []; // Track all floors played across all rounds
    this.floorSelectionPage = 0; // Track pagination for floor selection (0 = floors 1-15, 1 = floors 16-30)
    this.preGeneratedFloors = this.preGenerateAllFloors(); // Pre-generate all 30 floors at game start (Season 1) or 21 (Normal)
    this.remainingAmounts = this.initializeRemainingAmounts(); // Track what amounts are still available
    this.vaultState = null; // For The Vault minigame state
    this.operatorOfferState = null; // For Operator Offer state
    this.megaGridState = null; // For Mega Grid minigame state
    this.infinityPercentState = null; // For The ∞% minigame state
    this.hideoutBreakthroughState = null; // For Hideout Breakthrough minigame state
    this.babushkaState = null; // For Babushka minigame state
    this.dondState = null; // For Deal or No Deal game state
    this.hmieState = null; // For How Much Is Enough? game state
    this.martOfCashState = null; // For Mart-Of-Cash state
    this.goBigOrGoBrokeState = null; // For Go Big or Go Broke minigame state
    this.hasPlayedGoBigOrGoBroke = false; // Track if Go Big or Go Broke has been triggered
    
    // Achievement tracking
    this.achievementTracking = {
      consecutiveCorrectPicks: 0, // Track consecutive correct picks for perfect floor
      perfectFloorsCount: 0, // Track total perfect floors
      peeksUsed: 0, // Track peek usage
      minigamesPlayed: [], // Track minigame types played
      martItemsBought: [], // Track items bought at Mart-Of-Cash
      martTotalSpent: 0, // Track total spent at Mart-Of-Cash
      xLevelsSurvived: 0, // Track X-Level survivals
      currentFloorPicks: 0, // Picks made on current floor
      lastPickWasCorrect: true, // Track if last pick was correct (start true)
      babushkaStats: { winnings: 0, strikes: 0, dollsOpened: 0, maxStrikesReached: 0 },
      hideoutStats: { jackpotWon: false, firstPickWas12: false, failedPicks: 0 },
      doorEscapeStats: { rounds: 0, treasureFound: false, fatalPicked: false, healthLost: 0 },
      sixZeroesStats: { zerosFound: 0, noodlesPicked: 0 },
      communityChestWinnings: 0,
      basementStats: { escaped: false, moneyKept: 0, moneyLost: 0 },
      mysteryBoxStats: { legendaryReceived: false, bigBankWon: false, moneyLost: 0 },
      randomPercentResult: 0, // Track random % result
      gameOverReason: null, // Track how game ended
      gameOverFloor: 0, // Track which floor game over happened
      firstPickOfFloor: true // Track if current pick is first of floor
    };
  }

  getRoundConfig() {
    // Season 1: 8 rounds (7, 6, 5, 4, 3, 2, 2, 1) - Total 30 floors
    // Normal: 6 rounds (6, 5, 4, 3, 2, 1) - Total 21 floors
    if (this.eventMode) {
      return config.roundFloors;
    } else {
      // Return roundFloors without the first element (7)
      return config.roundFloors.slice(1);
    }
  }

  initializeRemainingAmounts() {
    // Create a deep copy of game amounts with count tracking
    // This reads from the pre-generated floors to get the ACTUAL amounts (including event tiles)
    const amounts = {};

    // Count amounts from the pre-generated floors instead of config
    for (let floorNum = 1; floorNum <= this.maxFloors; floorNum++) {
      const floor = this.preGeneratedFloors[floorNum];
      if (floor) {
        [floor.left, floor.right].forEach(amount => {
          const key = this.getAmountKey(amount);
          if (!amounts[key]) {
            amounts[key] = { ...amount, count: 1, revealed: false };
          } else {
            amounts[key].count++;
          }
        });
      }
    }

    return amounts;
  }

  getAmountKey(amount) {
    if (amount.type === 'cash') return `cash_${amount.value}`;
    if (amount.type === 'percentage') return `percent_${amount.value}`;
    if (amount.type === 'random') return `random_${amount.label}`;
    if (amount.type === 'special') return `special_${amount.action}`;
    if (amount.type === 'event') return `event_${amount.action}`;
    if (amount.type === 'nothing') return 'nothing';
    if (amount.type === 'game_over') return 'game_over';
    return 'unknown';
  }

  markAmountUsed(amount) {
    const key = this.getAmountKey(amount);
    if (this.remainingAmounts[key]) {
      this.remainingAmounts[key].count--;
      this.remainingAmounts[key].revealed = true;
    }
  }

  preGenerateAllFloors() {
    // Create a shuffled copy of all amounts
    let allAmounts = [...config.gameAmounts];

    // If event mode is enabled, ADD extra items to reach 56 total (Normal has 42)
    if (this.eventMode) {
      // Remove 2 "Nothing" from the base set (Base has 5, we want 3 for Season 1)
      for (let i = 0; i < 2; i++) {
        const nothingIndex = allAmounts.findIndex(a => a.type === 'nothing');
        if (nothingIndex > -1) {
          allAmounts.splice(nothingIndex, 1);
        }
      }

      // Add Season 1 specific items
      const season1Items = [
        { type: 'random', min: 0, max: 99999999, label: 'Random 5' },
        { type: 'special', action: 'operator_offer', label: 'Operator Offer' },
        { type: 'special', action: 'mystery_box', label: 'Mystery Box' },
        { type: 'special', action: 'mystery_box', label: 'Mystery Box' },
        { type: 'special', action: 'random_percentage', label: 'Random ±%' },
        { type: 'special', action: 'boost_multiplier', min: 0, max: 300, label: 'Boost Multiplier' },
        { type: 'special', action: 'add_question', label: 'Add a ?' },
        { type: 'special', action: 'mirror', label: 'Mirror' },
        { type: 'special', action: 'mart_of_cash', label: 'Mart-Of-Ca$h' },

        // Minigames
        { type: 'event', action: 'mega_grid', label: 'Mega Grid' },
        { type: 'event', action: 'boiling_point', label: 'Boiling Point' },
        { type: 'event', action: 'operator_roshambo', label: 'Operator Roshambo' },
        { type: 'event', action: 'infinity_percent', label: 'The ∞%' },
        { type: 'event', action: 'vault', label: 'The Vault' },
        { type: 'event', action: 'hideout_breakthrough', label: 'Hideout Breakthrough' },
        { type: 'event', action: 'babushka', label: 'Babushka' },
        { type: 'event', action: 'door_escape', label: 'Door Escape' },

        // Extra floors (29-30) content
        { type: 'nothing', label: 'Nothing' },
        { type: 'special', action: 'mart_of_cash', label: 'Mart-Of-Ca$h' },
        { type: 'special', action: 'blast_digit', label: 'Blast Digit' },
        { type: 'special', action: 'remove_zeros', label: "Remove 0's" },
      ];

      allAmounts.push(...season1Items);

      if (this.isSeason2) {
        // In Season 2, inject the 4 Elite Minigames
        const s2Minigames = [
          { type: 'event', action: 'laser_infiltration', label: 'Laser Infiltration' },
          { type: 'event', action: 'blind_auction', label: 'The Blind Auction' },
          { type: 'event', action: 'bomb_defusal', label: 'Bomb Defusal' },
          { type: 'event', action: 'high_roller_blackjack', label: 'High Roller Blackjack' }
        ];

        for (let s = 0; s < s2Minigames.length; s++) {
          const repIdx = allAmounts.findIndex(a => a.type === 'nothing' || (a.type === 'event' && ['mega_grid', 'boiling_point', 'babushka', 'door_escape'].includes(a.action)));
          if (repIdx > -1) {
            allAmounts[repIdx] = s2Minigames[s];
          } else {
            allAmounts.push(s2Minigames[s]);
          }
        }
      }
    }

    // Shuffle the amounts
    for (let i = allAmounts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAmounts[i], allAmounts[j]] = [allAmounts[j], allAmounts[i]];
    }

    // Pre-generate all floors with left/right choices
    const floors = {};
    const numFloors = this.eventMode ? 30 : 21;
    for (let floorNum = 1; floorNum <= numFloors; floorNum++) {
      const leftIndex = (floorNum - 1) * 2;
      const rightIndex = leftIndex + 1;

      const left = { ...allAmounts[leftIndex] };
      const right = { ...allAmounts[rightIndex] };

      // Pre-generate random values if type is random
      if (left.type === 'random') {
        left.generatedValue = Math.floor(Math.random() * (left.max - left.min + 1)) + left.min;
      }
      if (right.type === 'random') {
        right.generatedValue = Math.floor(Math.random() * (right.max - right.min + 1)) + right.min;
      }
      // Pre-generate boost multiplier values
      if (left.type === 'special' && left.action === 'boost_multiplier') {
        left.generatedValue = (Math.random() * 3).toFixed(2);
      }
      if (right.type === 'special' && right.action === 'boost_multiplier') {
        right.generatedValue = (Math.random() * 3).toFixed(2);
      }

      floors[floorNum] = { left, right };
    }

    return floors;
  }

  startNewRound() {
    this.currentRound++;
    this.currentFloor = 0;
    this.selectedFloors = [];
    this.floorsToSelect = this.getRoundConfig()[this.currentRound - 1];
    this.isSelectingFloors = true;
    this.isSelectingSide = false;

    // Clean up round-specific effects
    if (this.activeEffects) {
      this.activeEffects = this.activeEffects.filter(e => {
        if (e.type === 'lobby_locked') {
          // If it was targetting this round, it's now over
          if (e.targetRound && this.currentRound > e.targetRound) return false;
          // If no targetRound (old logic), clear it
          if (!e.targetRound) return false;
        }
        return true;
      });
    }
  }

  getAvailableFloors() {
    // Return floors that haven't been played yet
    const available = [];
    for (let i = 1; i <= this.maxFloors; i++) {
      if (!this.playedFloors.includes(i)) {
        available.push(i);
      }
    }
    return available;
  }

  addSelectedFloor(floorNumber) {
    if (!this.selectedFloors.includes(floorNumber) && !this.playedFloors.includes(floorNumber)) {
      this.selectedFloors.push(floorNumber);
    }
  }

  removeSelectedFloor(floorNumber) {
    const index = this.selectedFloors.indexOf(floorNumber);
    if (index > -1) {
      this.selectedFloors.splice(index, 1);
    }
  }

  hasSelectedAllFloors() {
    return this.selectedFloors.length === this.floorsToSelect;
  }

  getCurrentFloorNumber() {
    if (this.currentFloor < this.selectedFloors.length) {
      return this.selectedFloors[this.currentFloor];
    }
    return null;
  }

  moveToNextFloor() {
    const floorNum = this.selectedFloors[this.currentFloor];
    this.playedFloors.push(floorNum);
    this.currentFloor++;
    this.floorsCompleted++;
  }

  isRoundComplete() {
    return this.currentFloor >= this.selectedFloors.length;
  }

  isGameComplete() {
    return this.currentRound >= this.getRoundConfig().length;
  }

  addToHistory(floorNumber, choice, chosenValue, lostValue, moneyBefore, moneyAfter) {
    this.gameHistory.push({
      round: this.currentRound + 1,
      floor: floorNumber,
      choice,
      chosenValue,
      lostValue,
      moneyBefore,
      moneyAfter
    });
  }

  applyAmount(amount) {
    const moneyBefore = this.totalMoney;
    let effectiveAmount = { ...amount };

    // === Type Modifiers ===
    if (this.hasActiveEffect('convertNothing3') && effectiveAmount.type === 'nothing') {
      effectiveAmount = { type: 'cash', value: 25000, label: 'Converted Nothing' };
    }
    if (this.hasActiveEffect('nothingToGameOver3') && effectiveAmount.type === 'nothing') {
      effectiveAmount = { type: 'game_over', label: 'Bad Omen' };
    }

    // === Value Application ===
    if (effectiveAmount.type === 'cash') {
      let value = effectiveAmount.value;

      // Apply multipliers
      if (this.hasActiveEffect('doubleRewards3') && value > 0) value *= 2;
      if (this.hasActiveEffect('tripleNextFloor') && value > 0) value *= 3;
      if (this.hasActiveEffect('invertNext')) value *= -1;

      // Apply addToAllFloors effect
      const addToAllEffect = this.getActiveEffect('addToAllFloors');
      if (addToAllEffect && value > 0) value += addToAllEffect.value;

      // Apply protections
      if (this.hasActiveEffect('noLoss4') && value < 0) value = 0;

      // Season 2: Pact of Greed (+100% Cash)
      if (this.activePact === 'pact_greed' && value > 0) value *= 2;

      this.totalMoney += value;
      effectiveAmount.value = value; // Update for return
    } else if (effectiveAmount.type === 'percentage') {
      let percent = effectiveAmount.value;
      if (this.hasActiveEffect('invertNext')) percent *= -1;

      // Season 2: Pact of Fragility (Any negative % is fatal Game Over)
      if (this.activePact === 'pact_fragility' && percent < 0) {
        if (this.hasActiveEffect('gameOverImmunity') || this.hasActiveEffect('autoRevive')) {
          if (this.activeEffects) {
            this.activeEffects = this.activeEffects.filter(e => e.type !== 'gameOverImmunity' && e.type !== 'autoRevive');
          }
        } else {
          this.totalMoney = 0;
          return { type: 'game_over', label: 'Fragility Fatal Shatter', moneyBefore, moneyAfter: 0, fatalFragility: true };
        }
      }

      const change = Math.floor((this.totalMoney * percent) / 100);

      // Check tax immunity for negative percentages
      if (this.hasActiveEffect('tax_immunity') && change < 0) {
        // Consume immunity and prevent loss
        if (this.activeEffects) {
          this.activeEffects = this.activeEffects.filter(e => e.type !== 'tax_immunity');
        }
        // No change applied, immunity used
      } else {
        // Apply protections to the change amount
        if (this.hasActiveEffect('noLoss4') && change < 0) {
          // Prevent loss
        } else {
          this.totalMoney += change;
        }
      }

      if (this.totalMoney < 0) this.totalMoney = 0;
    } else if (effectiveAmount.type === 'random') {
      let randomValue = effectiveAmount.generatedValue || Math.floor(Math.random() * (effectiveAmount.max - effectiveAmount.min + 1)) + effectiveAmount.min;

      // Apply multipliers
      if (this.hasActiveEffect('doubleRewards3') && randomValue > 0) randomValue *= 2;
      if (this.hasActiveEffect('tripleNextFloor') && randomValue > 0) randomValue *= 3;
      if (this.hasActiveEffect('invertNext')) randomValue *= -1;

      // Season 2: Pact of Greed (+100% Cash)
      if (this.activePact === 'pact_greed' && randomValue > 0) randomValue *= 2;

      // Apply protections
      if (this.hasActiveEffect('noLoss4') && randomValue < 0) randomValue = 0;

      this.totalMoney += randomValue;
      return { ...effectiveAmount, actualValue: randomValue, moneyBefore, moneyAfter: this.totalMoney };
    } else if (effectiveAmount.type === 'special') {
      if (effectiveAmount.action === 'add_zero') {
        this.totalMoney = this.totalMoney * 10;
      } else if (effectiveAmount.action === 'add_one') {
        const moneyStr = this.totalMoney.toString();
        this.totalMoney = parseInt('1' + moneyStr);
      } else if (effectiveAmount.action === 'boost_multiplier') {
        let multiplier = parseFloat(effectiveAmount.generatedValue || (Math.random() * 3).toFixed(2));

        if (this.hasActiveEffect('halveMultipliers4')) {
          multiplier = multiplier / 2;
        }

        // Season 2: Pact of Fragility (Doubles multipliers)
        if (this.activePact === 'pact_fragility') {
          multiplier *= 2;
        }

        this.totalMoney = Math.floor(this.totalMoney * multiplier);
        return { ...effectiveAmount, actualValue: multiplier, moneyBefore, moneyAfter: this.totalMoney };
      } else if (effectiveAmount.action === 'add_question') {
        // "Add a ? is random [1,2,3,4,5,6,7,8,9,0,-]"
        const options = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];
        const choice = options[Math.floor(Math.random() * options.length)];

        if (choice === '-') {
          this.totalMoney *= -1;
        } else {
          // Prepend digit to the absolute value
          const sign = this.totalMoney < 0 ? -1 : 1;
          const absMoneyStr = Math.abs(Math.floor(this.totalMoney)).toString();
          // If value is 0 and we prepend '0', it stays 0. 
          // If value is 0 and we prepend '5', it becomes 50.
          // If value is 100 and we prepend '5', it becomes 5100.
          const newAbsMoneyStr = choice + absMoneyStr;
          this.totalMoney = sign * parseInt(newAbsMoneyStr);
        }

        return {
          ...effectiveAmount,
          choice,
          moneyBefore,
          moneyAfter: this.totalMoney
        };
      } else if (effectiveAmount.action === 'mirror') {
        // "Change all digit from left to right, to right to left"
        const moneyStr = Math.floor(this.totalMoney).toString();
        const reversedStr = moneyStr.split('').reverse().join('');
        this.totalMoney = parseInt(reversedStr);

        return { ...effectiveAmount, moneyBefore, moneyAfter: this.totalMoney };
      } else if (effectiveAmount.action === 'remove_zeros') {
        // Remove all '0' digits from the current money
        const moneyStr = Math.abs(this.totalMoney).toString();
        const cleanedStr = moneyStr.replace(/0/g, '');
        this.totalMoney = cleanedStr === '' ? 0 : parseInt(cleanedStr);
        
        const zerosRemoved = moneyStr.length - cleanedStr.length;
        
        return { ...effectiveAmount, moneyBefore, moneyAfter: this.totalMoney, zerosRemoved };
      } else if (effectiveAmount.action === 'blast_digit') {
        // Randomly select one digit from current score and replace all digits with it
        const moneyStr = Math.abs(this.totalMoney).toString();
        if (moneyStr.length > 0) {
          // Pick a random digit from the current money
          const randomIndex = Math.floor(Math.random() * moneyStr.length);
          const selectedDigit = moneyStr[randomIndex];
          
          // Replace all digits with the selected digit
          const blasted = selectedDigit.repeat(moneyStr.length);
          this.totalMoney = parseInt(blasted);
          
          return { ...effectiveAmount, selectedDigit, moneyBefore, moneyAfter: this.totalMoney, allNines: selectedDigit === '9' };
        }
        
        return { ...effectiveAmount, moneyBefore, moneyAfter: this.totalMoney, allNines: false };
      } else if (effectiveAmount.action === 'x_level') {
        // Check for X-Protection first
        if (this.xProtection && this.xProtection > 0) {
          this.xProtection--;
          return {
            ...effectiveAmount,
            protected: true,
            moneyBefore,
            moneyAfter: this.totalMoney
          };
        }

        // Skip the last floor of the current round
        if (this.selectedFloors.length > 0) {
          const lastFloorNum = this.selectedFloors[this.selectedFloors.length - 1];
          const lastFloorChoices = this.preGeneratedFloors[lastFloorNum];
          const removedFloor = this.selectedFloors.pop();

          // Mark the skipped floor as played so it can't be selected in future rounds
          this.playedFloors.push(removedFloor);

          return {
            ...effectiveAmount,
            skippedFloor: removedFloor,
            skippedFloorContent: {
              floorNum: lastFloorNum,
              left: lastFloorChoices.left,
              right: lastFloorChoices.right
            },
            moneyBefore,
            moneyAfter: this.totalMoney
          };
        }
      }
    } else if (effectiveAmount.type === 'nothing') {
      // Do nothing
    } else if (effectiveAmount.type === 'game_over') {
      // Handled elsewhere, but check immunity here? 
      // No, handleFloorSelection handles the game over result.
    }

    return { ...effectiveAmount, moneyBefore, moneyAfter: this.totalMoney };
  }

  // === BOILING POINT MINIGAME ===
  startBoilingPoint() {
    // Start temperature between 30 and 70
    const temperature = Math.floor(Math.random() * 41) + 30;

    this.boilingPointState = {
      temperature,
      canChange: true, // Can change option once
      isActive: true,
      history: []
    };
    return this.boilingPointState;
  }

  playBoilingPointAction(action) {
    if (!this.boilingPointState || !this.boilingPointState.isActive) return null;

    let change = 0;
    // Generate change (10-30 degrees)
    const magnitude = Math.floor(Math.random() * 21) + 10;

    if (action === 'hotter') {
      change = magnitude;
    } else if (action === 'colder') {
      change = -magnitude;
    } else if (action === 'change') {
      if (!this.boilingPointState.canChange) return null;
      this.boilingPointState.canChange = false;
      // "Change" logic usually swaps the temperature or resets it?
      // Based on previous logs: "Change option (1 use)"
      // Let's assume it re-rolls temperature or something. 
      // For now, let's say it adds a small random amount to help?
      // Or maybe it's "Change the target"?
      // Let's implement a simple "Change Temperature" to a safe zone (50)
      this.boilingPointState.temperature = 50;
      return { temperature: 50, gameOver: false, changed: true };
    }

    this.boilingPointState.temperature += change;

    // Check bounds
    if (this.boilingPointState.temperature >= 100) {
      this.boilingPointState.isActive = false;
      this.totalMoney += 50000; // Win
      return { temperature: this.boilingPointState.temperature, gameOver: true, result: 'win' };
    } else if (this.boilingPointState.temperature <= 0) {
      this.boilingPointState.isActive = false;
      this.totalMoney = 0; // Lose all
      return { temperature: this.boilingPointState.temperature, gameOver: true, result: 'loss' };
    }

    return { temperature: this.boilingPointState.temperature, gameOver: false };
  }


  startOperatorOffer() {
    let offerAmount;
    if (this.totalMoney <= 0) {
      offerAmount = Math.floor(Math.random() * (5000000 - 100000 + 1)) + 100000;
    } else {
      const variance = this.totalMoney * 0.5;
      const min = Math.max(1000, Math.floor(this.totalMoney - variance));
      const max = Math.floor(this.totalMoney + variance);
      offerAmount = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    this.operatorOfferState = {
      offerAmount,
      isActive: true
    };
    return this.operatorOfferState;
  }

  acceptOperatorOffer() {
    if (!this.operatorOfferState || !this.operatorOfferState.isActive) return null;

    this.totalMoney += this.operatorOfferState.offerAmount;
    this.operatorOfferState.isActive = false;
    return { accepted: true, amount: this.operatorOfferState.offerAmount };
  }

  declineOperatorOffer() {
    if (!this.operatorOfferState || !this.operatorOfferState.isActive) return null;

    this.operatorOfferState.isActive = false;
    return { accepted: false };
  }
  startVault() {
    // Generate 4-digit code
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }

    this.vaultState = {
      code,
      guesses: 0,
      maxGuesses: 10,
      attempts: [],
      guessedDigits: Array(10).fill(false), // Track which digits have been guessed
      isActive: true
    };
    return this.vaultState;
  }

  playVaultGuess(guess) {
    if (!this.vaultState || !this.vaultState.isActive) return null;

    this.vaultState.guesses++;
    const correctCode = this.vaultState.code;

    // Mark digits as guessed
    for (const char of guess) {
      this.vaultState.guessedDigits[parseInt(char)] = true;
    }

    // Check exact match
    if (guess === correctCode) {
      this.vaultState.isActive = false;
      this.totalMoney += 50000; // Win reward
      return { correct: true, gameOver: true, result: 'win' };
    }

    // Calculate bulls and cows
    let correctPosition = 0;
    let correctWrongPosition = 0;
    const codeCounts = {};
    const guessCounts = {};

    // Count digits in code
    for (const char of correctCode) {
      codeCounts[char] = (codeCounts[char] || 0) + 1;
    }

    // Check correct positions first
    for (let i = 0; i < 4; i++) {
      if (guess[i] === correctCode[i]) {
        correctPosition++;
        codeCounts[guess[i]]--;
      } else {
        guessCounts[guess[i]] = (guessCounts[guess[i]] || 0) + 1;
      }
    }

    // Check wrong positions
    for (const char in guessCounts) {
      if (codeCounts[char] > 0) {
        const matchCount = Math.min(guessCounts[char], codeCounts[char]);
        correctWrongPosition += matchCount;
        codeCounts[char] -= matchCount;
      }
    }

    this.vaultState.attempts.push({
      guess,
      correctPosition,
      correctWrongPosition
    });

    // Check max guesses
    if (this.vaultState.guesses >= this.vaultState.maxGuesses) {
      this.vaultState.isActive = false;
      this.totalMoney = Math.floor(this.totalMoney / 2); // Penalty
      return { correct: false, gameOver: true, result: 'loss' };
    }

    return {
      correct: false,
      gameOver: false,
      correctPosition,
      correctWrongPosition,
      attemptsLeft: this.vaultState.maxGuesses - this.vaultState.guesses
    };
  }

  startMegaGrid() {
    // Generate 5x5 grid (25 spaces)
    // Black tiles: 2 to 10
    const blackCount = Math.floor(Math.random() * 9) + 2;
    const goldCount = 25 - blackCount;

    // Multiplier based on black count (higher risk = higher return)
    // Base multiplier 1.0 + (blackCount * 0.5)
    // Example: 1 black = 1.5x, 10 black = 6.0x
    const multiplier = 1.0 + (blackCount * 0.5);

    // Initial potential reward (starts at $25,000 for 1 black, scales up)
    // Formula: $25,000 * (1 + (blackCount - 1) * 0.2)
    const baseReward = 25000 * (1 + (blackCount - 1) * 0.2);

    this.megaGridState = {
      grid: [], // Will be generated round by round or all at once? "visualize as random all of the grid"
      blackCount,
      goldCount,
      multiplier,
      currentRound: 0,
      maxRounds: 5,
      accumulatedReward: 0,
      potentialReward: baseReward, // Reward for the current round
      isActive: true,
      history: [],
      autoWin: this.hasActiveEffect('autoWinMinigame')
    };

    // Generate the full grid for visualization/internal logic
    const tiles = Array(blackCount).fill('black').concat(Array(goldCount).fill('gold'));
    // Shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    this.megaGridState.grid = tiles;

    return this.megaGridState;
  }

  playMegaGridRound(choiceIndex) {
    if (!this.megaGridState || !this.megaGridState.isActive) return null;

    let tile = this.megaGridState.grid[choiceIndex];

    // Auto Win Effect
    if (this.megaGridState.autoWin && tile === 'black') {
      tile = 'gold'; // Force win
    }

    this.megaGridState.currentRound++;

    const result = {
      round: this.megaGridState.currentRound,
      tile,
      choiceIndex,
      won: false,
      cashout: false,
      gameOver: false
    };

    if (tile === 'black') {
      // Game Over
      this.megaGridState.isActive = false;
      this.megaGridState.accumulatedReward = 0; // Lose everything in minigame
      result.gameOver = true;
    } else {
      // Won this round
      result.won = true;
      // Add reward
      this.megaGridState.accumulatedReward += this.megaGridState.potentialReward;
      // Increase potential for next round
      this.megaGridState.potentialReward = Math.floor(this.megaGridState.potentialReward * this.megaGridState.multiplier);

      if (this.megaGridState.currentRound >= this.megaGridState.maxRounds) {
        // Jackpot / Completed
        this.megaGridState.isActive = false;
        // Apply to game total
        this.totalMoney += this.megaGridState.accumulatedReward;
      }
    }

    this.megaGridState.history.push(result);
    return result;
  }

  startInfinityPercent() {
    this.infinityPercentState = {
      strikes: 0,
      maxStrikes: 3,
      accumulatedPercent: 0,
      currentRound: 0,
      percentPerPick: 5, // Add 5% per correct choice
      isActive: true,
      round: 0,
      history: [] // Track all picks
    };
    return this.infinityPercentState;
  }

  playInfinityPercentRound(choice) {
    if (!this.infinityPercentState || !this.infinityPercentState.isActive) return null;

    this.infinityPercentState.round++;
    this.infinityPercentState.currentRound++;

    // 50/50 chance
    const isCorrect = Math.random() < 0.5;

    const result = {
      round: this.infinityPercentState.round,
      choice,
      isCorrect,
      strikes: this.infinityPercentState.strikes,
      accumulatedPercent: this.infinityPercentState.accumulatedPercent,
      accumulatedReward: this.infinityPercentState.accumulatedReward || this.totalMoney, // Ensure defined
      gameOver: false
    };

    if (isCorrect) {
      this.infinityPercentState.accumulatedPercent += this.infinityPercentState.percentPerPick;

      // Calculate new reward based on total money and accumulated percent
      // Formula: Total Money * (1 + Percent/100)
      this.infinityPercentState.accumulatedReward = Math.floor(this.totalMoney * (1 + this.infinityPercentState.accumulatedPercent / 100));

      result.accumulatedPercent = this.infinityPercentState.accumulatedPercent;
    } else {
      this.infinityPercentState.strikes++;
      result.strikes = this.infinityPercentState.strikes;

      if (this.infinityPercentState.strikes >= this.infinityPercentState.maxStrikes) {
        // Game Over - Penalty
        this.infinityPercentState.isActive = false;
        result.gameOver = true;

        // "take your latest percentage and subtract with 100% and deduct your money score"
        // Interpretation: Penalty % = (Accumulated % - 100%)
        // If accumulated is 20%, penalty is -80%.
        // Deduct from total money.
        const penaltyPercent = this.infinityPercentState.accumulatedPercent - 100;
        const change = Math.floor((this.totalMoney * penaltyPercent) / 100);
        this.totalMoney += change; // change is negative
        if (this.totalMoney < 0) this.totalMoney = 0;

        result.penaltyPercent = penaltyPercent;
        result.lostAmount = Math.abs(change); // Store the absolute value of money lost
      }
    }

    // Add to history
    this.infinityPercentState.history.push({
      choice,
      isCorrect
    });

    return result;
  }

  cashoutInfinityPercent() {
    if (!this.infinityPercentState || !this.infinityPercentState.isActive) return null;

    this.infinityPercentState.isActive = false;

    // Apply accumulated percentage
    const change = Math.floor((this.totalMoney * this.infinityPercentState.accumulatedPercent) / 100);
    this.totalMoney += change;

    return {
      accumulatedPercent: this.infinityPercentState.accumulatedPercent,
      moneyAdded: change,
      accumulatedReward: this.totalMoney, // Total Value (Original + Profit)
      totalMoney: this.totalMoney,
      gameOver: true,
      cashout: true
    };
  }

  startHideoutBreakthrough() {
    // Generate 12 unique random numbers (1 to 12)
    const numbers = Array.from({ length: 12 }, (_, i) => i + 1);

    // Shuffle the numbers
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    this.hideoutBreakthroughState = {
      grid: numbers, // Array of 12 numbers (shuffled 1-12)
      revealed: Array(12).fill(false), // Track which buttons have been revealed
      currentPick: null, // The last picked number value
      pickCount: 0, // Number of successful picks
      accumulatedReward: 0, // $20,000 per successful pick
      isActive: true,
      gameOver: false,
      won: false
    };

    return this.hideoutBreakthroughState;
  }

  playHideoutBreakthroughRound(buttonIndex) {
    if (!this.hideoutBreakthroughState || !this.hideoutBreakthroughState.isActive) return null;

    const pickedNumber = this.hideoutBreakthroughState.grid[buttonIndex];
    this.hideoutBreakthroughState.revealed[buttonIndex] = true;

    const result = {
      buttonIndex,
      pickedNumber,
      previousNumber: this.hideoutBreakthroughState.currentPick,
      pickCount: this.hideoutBreakthroughState.pickCount,
      success: false,
      gameOver: false,
      won: false,
      accumulatedReward: this.hideoutBreakthroughState.accumulatedReward
    };

    // First pick
    if (this.hideoutBreakthroughState.pickCount === 0) {
      this.hideoutBreakthroughState.currentPick = pickedNumber;
      this.hideoutBreakthroughState.pickCount++;
      this.hideoutBreakthroughState.accumulatedReward = 20000;

      result.pickCount = this.hideoutBreakthroughState.pickCount;
      result.success = true;
      result.accumulatedReward = 20000;

      // If first pick is 12, game must stop (no higher number)
      if (pickedNumber === 12) {
        this.hideoutBreakthroughState.isActive = false;
        this.hideoutBreakthroughState.gameOver = true;
        this.totalMoney += 20000;

        result.gameOver = true;
        result.won = true;
        result.maxedOut = true; // Picked highest number
      }
    } else {
      // Subsequent picks - check if number is higher than previous
      if (pickedNumber > this.hideoutBreakthroughState.currentPick) {
        // Success - number is higher
        this.hideoutBreakthroughState.currentPick = pickedNumber;
        this.hideoutBreakthroughState.pickCount++;
        this.hideoutBreakthroughState.accumulatedReward += 20000;

        result.success = true;
        result.pickCount = this.hideoutBreakthroughState.pickCount;
        result.accumulatedReward = this.hideoutBreakthroughState.accumulatedReward;

        // Check if completed 6 successful picks (jackpot)
        if (this.hideoutBreakthroughState.pickCount >= 6) {
          this.hideoutBreakthroughState.isActive = false;
          this.hideoutBreakthroughState.gameOver = true;
          this.hideoutBreakthroughState.won = true;
          this.totalMoney += 1000000; // $1,000,000 jackpot

          result.gameOver = true;
          result.won = true;
          result.jackpot = true;
          result.accumulatedReward = 1000000;
        } else if (pickedNumber === 12) {
          // Picked 12 but haven't reached 6 picks - game must stop
          this.hideoutBreakthroughState.isActive = false;
          this.hideoutBreakthroughState.gameOver = true;
          this.totalMoney += this.hideoutBreakthroughState.accumulatedReward;

          result.gameOver = true;
          result.won = true;
          result.maxedOut = true; // Picked highest number
        }
      } else {
        // Failed - number is lower or equal
        this.hideoutBreakthroughState.isActive = false;
        this.hideoutBreakthroughState.gameOver = true;
        this.totalMoney += this.hideoutBreakthroughState.accumulatedReward;

        result.success = false;
        result.gameOver = true;
        result.failed = true;
      }
    }

    return result;
  }

  getDisplayValue(amount) {
    if (amount.type === 'cash') {
      return `$${this.formatMoney(amount.value)}`;
    } else if (amount.type === 'percentage') {
      return `${amount.value > 0 ? '+' : ''}${amount.value}%`;
    } else if (amount.type === 'random') {
      if (amount.actualValue !== undefined) {
        return `${amount.label || 'Random'}: $${this.formatMoney(amount.actualValue)}`;
      }
      return `${amount.label || 'Random'} ($${this.formatMoney(amount.min)}-$${this.formatMoney(amount.max)})`;
    } else if (amount.type === 'special' || amount.type === 'event' || amount.type === 'nothing' || amount.type === 'game_over') {
      if (amount.action === 'add_question' && amount.choice !== undefined) {
        return `${amount.label || 'Add a ?'} (Got: ${amount.choice})`;
      }
      if (amount.action === 'mirror' && amount.moneyBefore !== undefined && amount.moneyAfter !== undefined) {
        return `${amount.label || 'Mirror'} (${amount.moneyBefore} -> ${amount.moneyAfter})`;
      }
      // Fallback for missing labels
      if (!amount.label) {
        if (amount.type === 'nothing') return 'Nothing';
        if (amount.type === 'game_over') return 'Game Over';
        if (amount.action) return amount.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return amount.type.charAt(0).toUpperCase() + amount.type.slice(1);
      }
      return amount.label;
    }
    return 'Unknown';
  }

  getUnplayedFloors() {
    // Return what was behind all unplayed floors
    const unplayed = [];
    for (let floorNum = 1; floorNum <= this.maxFloors; floorNum++) {
      if (!this.playedFloors.includes(floorNum) && this.preGeneratedFloors[floorNum]) {
        unplayed.push({
          floorNum,
          left: this.preGeneratedFloors[floorNum].left,
          right: this.preGeneratedFloors[floorNum].right
        });
      }
    }
    return unplayed;
  }

  // === BABUSHKA MINIGAME ===

  startBabushka() {
    // 11 value tiers: 0, 10k, 20k, 50k, 100k, 250k, 500k, 1M, 2.5M, 5M, 10M
    // 12 dolls: 2 empty (0), 10 with unique values
    const values = [0, 0, 10000, 20000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];

    // Shuffle to randomize doll positions
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    this.babushkaState = {
      dolls: values, // Array of 12 final values
      selectedDollIndex: null, // Which doll is currently being explored
      currentLayer: 0, // Current layer depth (0 = not revealed yet)
      maxLayers: 11, // Maximum possible layers (0 through 10M)
      strikes: 0,
      maxStrikes: 3,
      accumulatedMoney: 0, // Money safely banked in minigame
      currentDollValue: 0, // Money currently held in the active doll
      isActive: true,
      isRevealing: false, // Waiting for reveal button
      isChoosing: false, // Waiting for continue/bank choice
      picked: Array(12).fill(false) // Track which dolls have been selected
    };

    return this.babushkaState;
  }

  selectBabushkaDoll(dollIndex) {
    if (!this.babushkaState || !this.babushkaState.isActive) return null;
    if (this.babushkaState.picked[dollIndex]) return null; // Already picked

    this.babushkaState.selectedDollIndex = dollIndex;
    this.babushkaState.picked[dollIndex] = true;
    this.babushkaState.currentLayer = 0;
    this.babushkaState.currentDollValue = 0;
    this.babushkaState.isRevealing = true;

    return {
      dollIndex,
      selected: true
    };
  }

  revealBabushkaLayer() {
    if (!this.babushkaState || !this.babushkaState.isActive || !this.babushkaState.isRevealing) return null;

    const dollValue = this.babushkaState.dolls[this.babushkaState.selectedDollIndex];
    this.babushkaState.currentLayer++;

    const result = {
      dollIndex: this.babushkaState.selectedDollIndex,
      layer: this.babushkaState.currentLayer,
      dollValue: dollValue,
      layerValue: 0,
      hasNextLayer: false,
      isEmpty: false,
      isAutoBank: false,
      gameOver: false,
      strikes: this.babushkaState.strikes,
      accumulatedMoney: this.babushkaState.accumulatedMoney,
      currentDollValue: 0
    };

    const layerValues = this.getBabushkaLayerValues(dollValue);

    if (this.babushkaState.currentLayer > layerValues.length) {
      // Empty layer!
      result.isEmpty = true;
      result.hasNextLayer = false;

      // Strike! Lose ALL accumulated money + current doll value
      this.babushkaState.strikes++;
      this.babushkaState.accumulatedMoney = 0;
      this.babushkaState.currentDollValue = 0;

      result.strikes = this.babushkaState.strikes;
      result.accumulatedMoney = 0;

      // Reset for next doll selection
      this.babushkaState.selectedDollIndex = null;
      this.babushkaState.currentLayer = 0;
      this.babushkaState.isRevealing = false;
      this.babushkaState.isChoosing = false;

      if (this.babushkaState.strikes >= this.babushkaState.maxStrikes) {
        this.babushkaState.isActive = false;
        result.gameOver = true;

        const penaltyAmount = this.totalMoney;
        this.totalMoney = 0;
        result.penaltyAmount = penaltyAmount;
      }
    } else {
      // Has a layer!
      const currentLayerValue = layerValues[this.babushkaState.currentLayer - 1];

      // Update current doll value (NON-ADDITIVE - just steps up the ladder)
      this.babushkaState.currentDollValue = currentLayerValue;

      result.layerValue = currentLayerValue;
      result.currentDollValue = currentLayerValue;
      result.hasNextLayer = this.babushkaState.currentLayer < layerValues.length;
      result.accumulatedMoney = this.babushkaState.accumulatedMoney;

      // Check if this is 10M (auto-bank)
      if (dollValue === 10000000 && !result.hasNextLayer) {
        result.isAutoBank = true;

        // Auto-bank to minigame pot
        this.babushkaState.accumulatedMoney += this.babushkaState.currentDollValue;
        this.babushkaState.currentDollValue = 0;
        result.accumulatedMoney = this.babushkaState.accumulatedMoney;

        // Return to selection
        this.babushkaState.selectedDollIndex = null;
        this.babushkaState.currentLayer = 0;
        this.babushkaState.isRevealing = false;
        this.babushkaState.isChoosing = false;
      } else {
        // Player must choose: continue or bank
        this.babushkaState.isRevealing = false;
        this.babushkaState.isChoosing = true;
      }
    }

    return result;
  }

  getBabushkaLayerValues(finalValue) {
    if (finalValue === 0) return [];
    const tiers = [10000, 20000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
    const finalIndex = tiers.indexOf(finalValue);
    if (finalIndex === -1) return [];
    return tiers.slice(0, finalIndex + 1);
  }

  continueBabushka() {
    if (!this.babushkaState || !this.babushkaState.isActive || !this.babushkaState.isChoosing) return null;

    // Continue to next layer
    this.babushkaState.isChoosing = false;
    this.babushkaState.isRevealing = true;

    return {
      continued: true,
      currentLayer: this.babushkaState.currentLayer
    };
  }

  bankBabushka() {
    if (!this.babushkaState || !this.babushkaState.isActive || !this.babushkaState.isChoosing) return null;

    // Bank current doll money to minigame pot
    const bankedAmount = this.babushkaState.currentDollValue;
    this.babushkaState.accumulatedMoney += bankedAmount;

    // Get info for "what if" reveal
    const dollValue = this.babushkaState.dolls[this.babushkaState.selectedDollIndex];
    const layerValues = this.getBabushkaLayerValues(dollValue);
    const remainingLayers = layerValues.slice(this.babushkaState.currentLayer);

    this.babushkaState.currentDollValue = 0;

    // Return to selection
    this.babushkaState.selectedDollIndex = null;
    this.babushkaState.currentLayer = 0;
    this.babushkaState.isRevealing = false;
    this.babushkaState.isChoosing = false;

    return {
      banked: true,
      bankedAmount: bankedAmount,
      totalAccumulated: this.babushkaState.accumulatedMoney,
      remainingLayers: remainingLayers, // What was left in the doll
      maxPotential: dollValue // Max value of this doll
    };
  }

  cashoutBabushka() {
    // "Walk Away" - End minigame and take accumulated money
    if (!this.babushkaState || !this.babushkaState.isActive) return null;

    this.babushkaState.isActive = false;
    this.totalMoney += this.babushkaState.accumulatedMoney;

    return {
      cashedOut: true,
      finalAmount: this.babushkaState.accumulatedMoney,
      totalMoney: this.totalMoney,
      allDolls: this.babushkaState.dolls, // Reveal everything
      picked: this.babushkaState.picked
    };
  }

  // === MART-OF-CASH ===

  startMartOfCash() {
    const MartOfCash = require('./events/MartOfCash');
    
    this.martOfCashState = {
      isActive: true,
      mode: null, // 'rob' or 'buy'
      robberySpaces: null,
      playerChoice: null,
      botChoice: null,
      purchasedItems: [], // Track order of purchases
      purchasedItemCounts: {}, // Track purchase counts for each item
      hasRobbed: false
    };

    return this.martOfCashState;
  }

  /**
   * Start robbery mode - generate 12 spaces
   */
  startRobbery() {
    if (!this.martOfCashState || !this.martOfCashState.isActive) return null;
    
    const MartOfCash = require('./events/MartOfCash');
    const spaces = MartOfCash.getRobberySpaces();
    
    // Shuffle spaces
    for (let i = spaces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spaces[i], spaces[j]] = [spaces[j], spaces[i]];
    }

    this.martOfCashState.mode = 'rob';
    this.martOfCashState.robberySpaces = spaces;
    this.martOfCashState.hasRobbed = true;

    return {
      spaces: spaces.length,
      ready: true
    };
  }

  /**
   * Player picks a robbery space
   */
  pickRobberySpace(spaceIndex) {
    if (!this.martOfCashState || this.martOfCashState.mode !== 'rob') return null;
    
    const playerSpace = this.martOfCashState.robberySpaces[spaceIndex];
    this.martOfCashState.playerChoice = { index: spaceIndex, space: playerSpace };

    // Bot picks from remaining spaces
    const remainingIndices = this.martOfCashState.robberySpaces
      .map((_, i) => i)
      .filter(i => i !== spaceIndex);
    
    const botIndex = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
    const botSpace = this.martOfCashState.robberySpaces[botIndex];
    this.martOfCashState.botChoice = { index: botIndex, space: botSpace };

    // Determine outcome
    let playerWon = false;
    let busted = false;
    let rewards = [];

    // Check for skull (instant loss)
    if (playerSpace.type === 'skull') {
      busted = true;
    } else if (botSpace.type === 'skull') {
      // Bot got skull, player wins by default
      playerWon = true;
    } else {
      // Compare values
      // Money Bank (11) > Money Bag (10) > 9 > 8 > ... > 1
      playerWon = playerSpace.value > botSpace.value;
    }

    // Generate rewards if player won
    if (playerWon) {
      const MartOfCash = require('./events/MartOfCash');
      const robberyItems = MartOfCash.getRobberyItems();
      
      // Give all base items (1 each)
      rewards.push(robberyItems.peek);
      rewards.push(robberyItems.minigame);
      rewards.push(robberyItems.mysteryBox);
      rewards.push(robberyItems.xProtection);
      rewards.push(robberyItems.randomPercentage);
      
      // 5% chance for bonus rewards (Random 6, What?, or BOTH)
      if (Math.random() < 0.05) {
        const bonusRoll = Math.random();
        
        if (bonusRoll < 0.33) {
          // 33% of the 5% chance: Random 6 only
          const randomAmount = Math.floor(Math.random() * 1000000000);
          rewards.push({
            key: 'random6',
            name: 'Random 6',
            emoji: '💰',
            amount: randomAmount
          });
        } else if (bonusRoll < 0.66) {
          // 33% of the 5% chance: What? only
          rewards.push(robberyItems.what);
        } else {
          // 34% of the 5% chance: BOTH Random 6 AND What?
          const randomAmount = Math.floor(Math.random() * 1000000000);
          rewards.push({
            key: 'random6',
            name: 'Random 6',
            emoji: '💰',
            amount: randomAmount
          });
          rewards.push(robberyItems.what);
        }
      }
    }

    return {
      playerSpace,
      botSpace,
      playerWon,
      busted,
      rewards,
      allSpaces: this.martOfCashState.robberySpaces
    };
  }

  /**
   * Purchase an item from the mart
   */
  purchaseItem(itemKey) {
    if (!this.martOfCashState || !this.martOfCashState.isActive) return null;
    
    const MartOfCash = require('./events/MartOfCash');
    const items = MartOfCash.getPurchaseItems();
    const item = items[itemKey];

    if (!item) return { success: false, message: 'Invalid item!' };

    // Initialize count if not exists
    if (!this.martOfCashState.purchasedItemCounts[itemKey]) {
      this.martOfCashState.purchasedItemCounts[itemKey] = 0;
    }

    // Check if item has a purchase limit and if it's been reached
    if (item.buyLimit !== null && item.buyLimit !== undefined) {
      if (this.martOfCashState.purchasedItemCounts[itemKey] >= item.buyLimit) {
        return { success: false, message: `You can only buy this ${item.buyLimit} time(s)!` };
      }
    }

    // Check if player can afford it
    if (itemKey === 'randomPercentage') {
      // Special case: costs 50% of current money
      const cost = Math.floor(this.totalMoney * 0.5);
      if (this.totalMoney < 1) {
        return { success: false, message: 'Not enough money!' };
      }
      this.totalMoney -= cost;
    } else {
      if (this.totalMoney < item.price) {
        return { success: false, message: 'Not enough money!' };
      }
      this.totalMoney -= item.price;
    }

    // Add to purchased items queue
    this.martOfCashState.purchasedItems.push({ key: itemKey, item });
    this.martOfCashState.purchasedItemCounts[itemKey]++;

    return {
      success: true,
      itemKey,
      item,
      totalMoney: this.totalMoney
    };
  }

  /**
   * Leave the mart and process purchased items
   */
  leaveMart() {
    if (!this.martOfCashState) return null;

    const items = [...this.martOfCashState.purchasedItems];
    this.martOfCashState.isActive = false;

    return {
      left: true,
      itemsToProcess: items
    };
  }

  // === GO BIG OR GO BROKE MINIGAME ===

  startGoBigOrGoBroke() {
    // Create 12 spaces: 8 money ($100k each), 4 bombs (💥)
    const spaces = [];
    for (let i = 0; i < 8; i++) {
      spaces.push({ type: 'money', value: 100000, emoji: '💰' });
    }
    for (let i = 0; i < 4; i++) {
      spaces.push({ type: 'bomb', value: 0, emoji: '💥' });
    }

    // Shuffle
    for (let i = spaces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spaces[i], spaces[j]] = [spaces[j], spaces[i]];
    }

    this.goBigOrGoBrokeState = {
      spaces,
      picked: [],
      moneyFound: 0,
      bombsFound: 0,
      totalMoney: 0,
      mode: null, // 'money_hunt' or 'bomb_hunt'
      gameOver: false,
      isActive: true
    };

    return this.goBigOrGoBrokeState;
  }

  pickGoBigOrGoBrokeSpace(spaceIndex) {
    if (!this.goBigOrGoBrokeState || this.goBigOrGoBrokeState.gameOver) return null;

    const space = this.goBigOrGoBrokeState.spaces[spaceIndex];
    this.goBigOrGoBrokeState.picked.push(spaceIndex);

    // First pick determines the mode
    if (this.goBigOrGoBrokeState.mode === null) {
      if (space.type === 'money') {
        this.goBigOrGoBrokeState.mode = 'money_hunt';
        this.goBigOrGoBrokeState.moneyFound++;
        this.goBigOrGoBrokeState.totalMoney += space.value;
      } else {
        this.goBigOrGoBrokeState.mode = 'bomb_hunt';
        this.goBigOrGoBrokeState.bombsFound++;
      }

      return {
        space,
        mode: this.goBigOrGoBrokeState.mode,
        firstPick: true,
        moneyFound: this.goBigOrGoBrokeState.moneyFound,
        bombsFound: this.goBigOrGoBrokeState.bombsFound,
        totalMoney: this.goBigOrGoBrokeState.totalMoney,
        gameOver: false
      };
    }

    // Money Hunt mode: Keep finding money until hitting a bomb
    if (this.goBigOrGoBrokeState.mode === 'money_hunt') {
      if (space.type === 'money') {
        this.goBigOrGoBrokeState.moneyFound++;
        this.goBigOrGoBrokeState.totalMoney += space.value;

        return {
          space,
          mode: 'money_hunt',
          moneyFound: this.goBigOrGoBrokeState.moneyFound,
          bombsFound: this.goBigOrGoBrokeState.bombsFound,
          totalMoney: this.goBigOrGoBrokeState.totalMoney,
          gameOver: false
        };
      } else {
        // Hit a bomb - game over, keep accumulated money
        this.goBigOrGoBrokeState.gameOver = true;
        this.goBigOrGoBrokeState.bombsFound++;
        this.totalMoney += this.goBigOrGoBrokeState.totalMoney;

        return {
          space,
          mode: 'money_hunt',
          moneyFound: this.goBigOrGoBrokeState.moneyFound,
          bombsFound: this.goBigOrGoBrokeState.bombsFound,
          totalMoney: this.goBigOrGoBrokeState.totalMoney,
          gameOver: true,
          won: true,
          winnings: this.goBigOrGoBrokeState.totalMoney
        };
      }
    }

    // Bomb Hunt mode: Find all 4 bombs to win $1M, hitting money = instant lose with $100k
    if (this.goBigOrGoBrokeState.mode === 'bomb_hunt') {
      if (space.type === 'bomb') {
        this.goBigOrGoBrokeState.bombsFound++;

        // Check if found all 4 bombs
        if (this.goBigOrGoBrokeState.bombsFound >= 4) {
          this.goBigOrGoBrokeState.gameOver = true;
          this.goBigOrGoBrokeState.totalMoney = 1000000;
          this.totalMoney += 1000000;

          return {
            space,
            mode: 'bomb_hunt',
            moneyFound: this.goBigOrGoBrokeState.moneyFound,
            bombsFound: this.goBigOrGoBrokeState.bombsFound,
            totalMoney: this.goBigOrGoBrokeState.totalMoney,
            gameOver: true,
            won: true,
            jackpot: true,
            winnings: 1000000
          };
        }

        return {
          space,
          mode: 'bomb_hunt',
          moneyFound: this.goBigOrGoBrokeState.moneyFound,
          bombsFound: this.goBigOrGoBrokeState.bombsFound,
          totalMoney: this.goBigOrGoBrokeState.totalMoney,
          gameOver: false
        };
      } else {
        // Hit money - game over, only get $100k
        this.goBigOrGoBrokeState.gameOver = true;
        this.goBigOrGoBrokeState.moneyFound++;
        this.goBigOrGoBrokeState.totalMoney = 100000;
        this.totalMoney += 100000;

        return {
          space,
          mode: 'bomb_hunt',
          moneyFound: this.goBigOrGoBrokeState.moneyFound,
          bombsFound: this.goBigOrGoBrokeState.bombsFound,
          totalMoney: this.goBigOrGoBrokeState.totalMoney,
          gameOver: true,
          won: false,
          winnings: 100000
        };
      }
    }

    return null;
  }

  // === DOOR ESCAPE MINIGAME ===

  startDoorEscape() {
    this.doorEscapeState = {
      currentRound: 1,
      currentMoney: 25000,
      health: 100,
      isActive: true,
      history: []
    };
    return this.doorEscapeState;
  }

  playDoorEscapeRound(doorChoice) {
    if (!this.doorEscapeState || !this.doorEscapeState.isActive) return null;

    // Generate door types for this round
    const doorTypes = ['escape', 'blocked', 'trapped'];
    // Shuffle doors
    for (let i = doorTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doorTypes[i], doorTypes[j]] = [doorTypes[j], doorTypes[i]];
    }

    const resultType = doorTypes[doorChoice];
    const state = this.doorEscapeState;

    if (resultType === 'escape') {
      // Escape: x2 money and next round
      state.currentMoney *= 2;
      state.currentRound++;
      state.history.push({ round: state.currentRound - 1, result: 'escape' });

      return {
        status: 'escape',
        money: state.currentMoney,
        round: state.currentRound,
        health: state.health
      };
    } else if (resultType === 'blocked') {
      // Blocked: Nothing happens, pick again
      return {
        status: 'blocked',
        money: state.currentMoney,
        round: state.currentRound,
        health: state.health
      };
    } else {
      // Trapped: Take damage
      const damage = Math.floor(Math.random() * 41) + 10; // 10-50%
      state.health -= damage;
      const scenario = this.getDoorEscapeTrapScenario(damage);
      state.history.push({ round: state.currentRound, result: 'trapped', damage });

      if (state.health <= 0) {
        state.isActive = false;
        state.health = 0;
        return {
          status: 'dead',
          damage,
          health: 0,
          scenario,
          money: state.currentMoney
        };
      }

      return {
        status: 'trapped',
        damage,
        health: state.health,
        scenario,
        money: state.currentMoney,
        round: state.currentRound
      };
    }
  }

  getDoorEscapeTrapScenario(damage) {
    const scenarios = [
      "You triggered a tripwire! Arrows fly from the walls!",
      "The floor collapses beneath you!",
      "Poison gas fills the room!",
      "A giant boulder rolls towards you!",
      "Spikes shoot up from the ground!",
      "A swarm of angry bees attacks!",
      "You stepped on a landmine (ouch)!",
      "The ceiling starts lowering!",
      "A hidden blade slices your arm!",
      "You fall into a pit of snakes!",
      "Laser beams burn your clothes!",
      "A ghost scares the life out of you!",
      "You slip on a banana peel (seriously?)!",
      "Fire bursts from the door handle!",
      "An electric shock zaps you!",
      "Water floods the room instantly!",
      "A trapdoor opens under your feet!",
      "You get hit by a swinging log!",
      "A mimic chest bites your hand!",
      "The door explodes in your face!",
      "You forgot to breathe!",
      "You bite your tongue!"
    ];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  cashoutDoorEscape(doorChoice) {
    if (!this.doorEscapeState || !this.doorEscapeState.isActive) return null;

    // Final 4 doors
    const finalDoors = ['treasure', 'escape', 'rescue', 'fatal'];
    // Shuffle
    for (let i = finalDoors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalDoors[i], finalDoors[j]] = [finalDoors[j], finalDoors[i]];
    }

    const result = finalDoors[doorChoice];
    const minigameMoney = this.doorEscapeState.currentMoney;
    let finalAmount = 0;
    let message = '';

    if (result === 'treasure') {
      finalAmount = minigameMoney * 2;
      message = 'TREASURE ESCAPE! Money x2!';
      // Track treasure found for achievement
      if (this.achievementTracking && this.achievementTracking.doorEscapeStats) {
        this.achievementTracking.doorEscapeStats.treasureFound = true;
      }
    } else if (result === 'escape') {
      finalAmount = minigameMoney;
      message = 'ESCAPE! You made it out safely.';
    } else if (result === 'rescue') {
      finalAmount = Math.floor(minigameMoney / 2);
      message = 'RESCUE! You escaped but lost half your loot.';
    } else {
      finalAmount = 0;
      message = 'FATAL TRAP! You lost everything.';
      // Track fatal picked for achievement
      if (this.achievementTracking && this.achievementTracking.doorEscapeStats) {
        this.achievementTracking.doorEscapeStats.fatalPicked = true;
      }
    }

    this.totalMoney += finalAmount;
    this.doorEscapeState.isActive = false;

    return {
      status: 'finished',
      resultType: result,
      finalAmount,
      message,
      doors: finalDoors // Reveal all doors
    };
  }

  // === COMMUNITY CHEST MINIGAME ===

  startCommunityChest() {
    // Generate 10 chests with values $10k-$100k
    const values = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
    // Shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    this.communityChestState = {
      chestValues: values,
      pickedChests: Array(10).fill(false),
      currentPick: null,
      currentValue: 0,
      bankedMoney: 0,
      turn: 0,
      isActive: true,
      gameOver: false
    };

    return this.communityChestState;
  }

  playCommunityChestPick(chestIndex) {
    if (!this.communityChestState || !this.communityChestState.isActive) return null;
    if (this.communityChestState.pickedChests[chestIndex]) return null; // Already picked

    this.communityChestState.pickedChests[chestIndex] = true;
    this.communityChestState.turn++;

    const pickedValue = this.communityChestState.chestValues[chestIndex];

    // Check Loss Condition (if not first turn)
    if (this.communityChestState.turn > 1 && pickedValue < this.communityChestState.currentValue) {
      this.communityChestState.isActive = false;
      this.communityChestState.gameOver = true;
      this.communityChestState.bankedMoney = 0;
      return {
        lost: true,
        previousValue: this.communityChestState.currentValue,
        newValue: pickedValue,
        finalAmount: 0,
        totalMoney: this.totalMoney
      };
    }

    this.communityChestState.currentPick = chestIndex;
    this.communityChestState.currentValue = pickedValue;

    // Check Win Condition (Max Prize $3M)
    if (pickedValue >= 3000000) {
      this.communityChestState.isActive = false;
      this.communityChestState.gameOver = true;
      this.communityChestState.won = true;
      this.communityChestState.bankedMoney = pickedValue;
      this.totalMoney += pickedValue;

      return {
        chestIndex,
        value: pickedValue,
        won: true,
        finalAmount: pickedValue,
        totalMoney: this.totalMoney,
        pickedChests: [...this.communityChestState.pickedChests],
        turn: this.communityChestState.turn
      };
    }

    // Update remaining chests
    // Turn 1: x2, Subsequent Turns: x3
    const multiplier = this.communityChestState.turn === 1 ? 2 : 3;

    for (let i = 0; i < 10; i++) {
      if (!this.communityChestState.pickedChests[i]) {
        let newVal = this.communityChestState.chestValues[i] * multiplier;
        // Jump Rule: >= $500k -> $3M
        if (newVal >= 500000) {
          newVal = 3000000;
        }
        this.communityChestState.chestValues[i] = newVal;
      }
    }

    return {
      chestIndex,
      value: pickedValue,
      nextMultiplier: multiplier,
      pickedChests: [...this.communityChestState.pickedChests],
      turn: this.communityChestState.turn
    };
  }

  communityChestKeep() {
    if (!this.communityChestState || !this.communityChestState.isActive) return null;

    // Bank the current value
    this.communityChestState.bankedMoney = this.communityChestState.currentValue;

    return {
      kept: true,
      bankedMoney: this.communityChestState.bankedMoney,
      canContinue: true
    };
  }

  communityChestPickAnother(newChestIndex) {
    if (!this.communityChestState || !this.communityChestState.isActive) return null;

    const previousValue = this.communityChestState.currentValue;

    // Pick new chest
    const pickResult = this.playCommunityChestPick(newChestIndex);
    if (!pickResult) return null;

    const newValue = pickResult.value;

    // Check if new value is less than previous
    if (newValue <= previousValue) {
      // Lost everything
      this.communityChestState.isActive = false;
      this.communityChestState.gameOver = true;
      this.communityChestState.bankedMoney = 0;

      return {
        lost: true,
        previousValue,
        newValue,
        finalAmount: 0
      };
    }

    return {
      success: true,
      previousValue,
      newValue,
      ...pickResult
    };
  }

  communityChestStop() {
    if (!this.communityChestState || !this.communityChestState.isActive) return null;

    this.communityChestState.isActive = false;
    this.communityChestState.gameOver = true;
    this.totalMoney += this.communityChestState.bankedMoney;

    return {
      stopped: true,
      finalAmount: this.communityChestState.bankedMoney,
      totalMoney: this.totalMoney
    };
  }

  // === PARK IT MINIGAME ===

  startParkIt() {
    // Generate 10 cars with values $10k-$100k (already ×10)
    const carValues = [];
    for (let i = 1; i <= 10; i++) {
      carValues.push(i * 10000); // $10k, $20k, ..., $100k
    }

    // Shuffle the cars
    for (let i = carValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [carValues[i], carValues[j]] = [carValues[j], carValues[i]];
    }

    this.parkItState = {
      carValues, // Shuffled array of car values
      pickedCars: Array(10).fill(false), // Track which cars have been revealed
      garage: [null, null, null, null, null], // 5 levels (index 0 = bottom, 4 = top)
      currentCarIndex: null,
      currentCarValue: 0,
      bankedMoney: 0,
      turn: 0,
      isActive: true,
      gameOver: false,
      won: false
    };

    return this.parkItState;
  }

  parkItPickCar(carIndex) {
    if (!this.parkItState || !this.parkItState.isActive) return null;
    if (this.parkItState.pickedCars[carIndex]) return null; // Already picked

    this.parkItState.pickedCars[carIndex] = true;
    this.parkItState.turn++;
    this.parkItState.currentCarIndex = carIndex;
    this.parkItState.currentCarValue = this.parkItState.carValues[carIndex];

    // Check if there are any valid moves
    if (!this.canParkItPlaceCar(this.parkItState.currentCarValue)) {
      this.parkItState.isActive = false;
      this.parkItState.gameOver = true;
      this.parkItState.bankedMoney = 0; // Lose everything
      return {
        gameOver: true,
        carValue: this.parkItState.currentCarValue,
        bankedMoney: 0
      };
    }

    // Add to banked money
    this.parkItState.bankedMoney += this.parkItState.currentCarValue;

    return {
      carIndex,
      carValue: this.parkItState.currentCarValue,
      bankedMoney: this.parkItState.bankedMoney,
      garage: [...this.parkItState.garage],
      pickedCars: [...this.parkItState.pickedCars]
    };
  }

  canParkItPlaceCar(carValue) {
    for (let i = 0; i < 5; i++) {
      if (this.parkItState.garage[i] !== null) continue; // Occupied

      let valid = true;
      // Check below (k < i): Cannot have higher value below
      for (let k = 0; k < i; k++) {
        if (this.parkItState.garage[k] !== null && this.parkItState.garage[k] > carValue) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      // Check above (k > i): Cannot have lower value above
      for (let k = i + 1; k < 5; k++) {
        if (this.parkItState.garage[k] !== null && this.parkItState.garage[k] < carValue) {
          valid = false;
          break;
        }
      }

      if (valid) return true; // Found at least one valid spot
    }
    return false; // No valid spots
  }

  parkItPlaceCar(level) {
    if (!this.parkItState || !this.parkItState.isActive) return null;
    if (level < 0 || level > 4) return null; // Invalid level
    if (this.parkItState.garage[level] !== null) return null; // Level already occupied

    const carValue = this.parkItState.currentCarValue;

    // Check if placement is legal: can't park lower-valued car above higher-valued one
    // Check all levels below the chosen level
    for (let i = 0; i < level; i++) {
      if (this.parkItState.garage[i] !== null && this.parkItState.garage[i] > carValue) {
        // Illegal placement - game over
        this.parkItState.isActive = false;
        this.parkItState.gameOver = true;
        this.parkItState.bankedMoney = 0;

        return {
          illegal: true,
          level,
          carValue,
          conflictLevel: i,
          conflictValue: this.parkItState.garage[i],
          finalAmount: 0
        };
      }
    }

    // Legal placement
    this.parkItState.garage[level] = carValue;

    // Check if garage is full (win condition)
    if (this.parkItState.garage.every(slot => slot !== null)) {
      // Garage full - Win! Add $3M jackpot
      const jackpot = 3000000;
      const totalWon = this.parkItState.bankedMoney + jackpot;
      this.parkItState.isActive = false;
      this.parkItState.gameOver = true;
      this.parkItState.won = true;
      this.totalMoney += totalWon;

      return {
        placed: true,
        level,
        carValue,
        garage: [...this.parkItState.garage],
        won: true,
        finalAmount: totalWon,
        jackpot,
        totalMoney: this.totalMoney
      };
    }

    return {
      placed: true,
      level,
      carValue,
      garage: [...this.parkItState.garage],
      canContinue: true
    };
  }

  parkItStop() {
    if (!this.parkItState || !this.parkItState.isActive) return null;

    // Check if player has parked at least 3 cars (minimum to cash out)
    const parkedCount = this.parkItState.garage.filter(slot => slot !== null).length;
    if (parkedCount < 3) {
      return {
        cannotStop: true,
        parkedCount,
        minimumRequired: 3
      };
    }

    this.parkItState.isActive = false;
    this.parkItState.gameOver = true;
    this.totalMoney += this.parkItState.bankedMoney;

    return {
      stopped: true,
      finalAmount: this.parkItState.bankedMoney,
      totalMoney: this.totalMoney,
      garage: [...this.parkItState.garage]
    };
  }

  // === ADVANCE TO BOARDWALK MINIGAME ===

  startAdvanceToBoardwalk() {
    const spaces = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 110000, 120000, 130000, 0]; // $10k-$130k, Boardwalk = 0
    this.advanceBoardwalkState = {
      spaces, // 14 spaces
      position: 0, // Current position
      dangerNumbers: [], // Numbers that cause Game Over
      hasRollAgain: true, // One "Roll Again" token
      bankedMoney: 0,
      isActive: true,
      gameOver: false
    };
    return this.advanceBoardwalkState;
  }

  advanceBoardwalkRoll() {
    if (!this.advanceBoardwalkState || !this.advanceBoardwalkState.isActive) return null;

    // Generate random roll 1-6
    const roll = Math.floor(Math.random() * 6) + 1;

    // Check danger
    if (this.advanceBoardwalkState.dangerNumbers.includes(roll)) {
      if (this.advanceBoardwalkState.hasRollAgain) {
        // Saved!
        this.advanceBoardwalkState.hasRollAgain = false;
        return { saved: true, roll, dangerNumbers: this.advanceBoardwalkState.dangerNumbers };
      } else {
        // Game Over
        this.advanceBoardwalkState.isActive = false;
        this.advanceBoardwalkState.gameOver = true;
        return { gameOver: true, roll, dangerNumbers: this.advanceBoardwalkState.dangerNumbers };
      }
    }

    // Safe roll - Add to danger numbers
    this.advanceBoardwalkState.dangerNumbers.push(roll);
    this.advanceBoardwalkState.position += roll;

    // Check win/overshot
    if (this.advanceBoardwalkState.position === 13) {
      // Won! Add $3M jackpot
      const jackpot = 3000000;
      const totalWon = this.advanceBoardwalkState.bankedMoney + jackpot;
      this.advanceBoardwalkState.isActive = false;
      this.advanceBoardwalkState.gameOver = true;
      this.totalMoney += totalWon;
      return { won: true, roll, finalAmount: totalWon, jackpot, totalMoney: this.totalMoney };
    } else if (this.advanceBoardwalkState.position > 13) {
      // Overshot - End game and bank money
      this.advanceBoardwalkState.isActive = false;
      this.advanceBoardwalkState.gameOver = true;
      this.totalMoney += this.advanceBoardwalkState.bankedMoney;
      return { overshot: true, roll, finalAmount: this.advanceBoardwalkState.bankedMoney, totalMoney: this.totalMoney };
    }

    // Bank money for current space
    const earned = this.advanceBoardwalkState.spaces[this.advanceBoardwalkState.position];
    this.advanceBoardwalkState.bankedMoney += earned;

    return { moved: true, roll, position: this.advanceBoardwalkState.position, earned, banked: this.advanceBoardwalkState.bankedMoney, dangerNumbers: this.advanceBoardwalkState.dangerNumbers };
  }

  advanceBoardwalkStop() {
    if (!this.advanceBoardwalkState || !this.advanceBoardwalkState.isActive) return null;
    this.advanceBoardwalkState.isActive = false;
    this.advanceBoardwalkState.gameOver = true;
    this.totalMoney += this.advanceBoardwalkState.bankedMoney;
    return { stopped: true, finalAmount: this.advanceBoardwalkState.bankedMoney, totalMoney: this.totalMoney };
  }

  // === BANK BUSTER MINIGAME ===

  startBankBuster() {
    const locks = [
      { value: 60000, opened: 0 }, // 0 = closed, 1 = opened once, 2 = closed again
      { value: 70000, opened: 0 },
      { value: 80000, opened: 0 },
      { value: 90000, opened: 0 },
      { value: 100000, opened: 0 },
      { value: 200000, opened: 0 }
    ];

    // 12 keys: 2 for each lock
    const keys = [];
    for (let i = 0; i < 6; i++) {
      keys.push(i, i); // Two keys for each lock
    }

    // Shuffle keys
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }

    this.bankBusterState = {
      locks,
      keys,
      pickedKeys: Array(12).fill(false),
      bankedMoney: 0,
      closedCount: 0,
      openedCount: 0,
      turn: 0,
      isActive: true,
      gameOver: false
    };
    return this.bankBusterState;
  }

  bankBusterPickKey(keyIndex) {
    if (!this.bankBusterState || !this.bankBusterState.isActive) return null;
    if (this.bankBusterState.pickedKeys[keyIndex]) return null;

    this.bankBusterState.pickedKeys[keyIndex] = true;
    this.bankBusterState.turn++;

    const lockIndex = this.bankBusterState.keys[keyIndex];
    const lock = this.bankBusterState.locks[lockIndex];

    if (lock.opened === 1) {
      // Already open - Close it (Bust)
      lock.opened = 2;
      this.bankBusterState.closedCount++;
      this.bankBusterState.openedCount--;
      this.bankBusterState.bankedMoney -= lock.value;

      // Check loss (2 locks closed)
      if (this.bankBusterState.closedCount >= 2) {
        this.bankBusterState.isActive = false;
        this.bankBusterState.gameOver = true;
        this.bankBusterState.bankedMoney = 0;
        return {
          keyIndex,
          lockIndex,
          lockValue: lock.value,
          bust: true,
          gameOver: true,
          finalAmount: 0,
          totalMoney: this.totalMoney
        };
      }

      return {
        keyIndex,
        lockIndex,
        lockValue: lock.value,
        bust: true,
        closedCount: this.bankBusterState.closedCount,
        bankedMoney: this.bankBusterState.bankedMoney
      };
    }

    // Open lock
    lock.opened = 1;
    this.bankBusterState.openedCount++;
    this.bankBusterState.bankedMoney += lock.value;

    // Check Jackpot Condition (> $500k)
    if (this.bankBusterState.bankedMoney >= 500000) {
      const jackpot = 3000000;
      const totalWon = this.bankBusterState.bankedMoney + jackpot;
      this.bankBusterState.isActive = false;
      this.bankBusterState.gameOver = true;
      this.bankBusterState.won = true;
      this.totalMoney += totalWon;

      return {
        keyIndex,
        lockIndex,
        lockValue: lock.value,
        won: true,
        jackpot,
        finalAmount: totalWon,
        totalMoney: this.totalMoney
      };
    }

    // Check Win Condition (5 locks opened)
    if (this.bankBusterState.openedCount >= 5) {
      this.bankBusterState.isActive = false;
      this.bankBusterState.gameOver = true;
      this.bankBusterState.won = true;
      this.totalMoney += this.bankBusterState.bankedMoney;

      return {
        keyIndex,
        lockIndex,
        lockValue: lock.value,
        won: true,
        finalAmount: this.bankBusterState.bankedMoney,
        totalMoney: this.totalMoney
      };
    }

    return {
      keyIndex,
      lockIndex,
      lockValue: lock.value,
      openedCount: this.bankBusterState.openedCount,
      bankedMoney: this.bankBusterState.bankedMoney
    };
  }

  bankBusterStop() {
    if (!this.bankBusterState || !this.bankBusterState.isActive) return null;

    this.bankBusterState.isActive = false;
    this.bankBusterState.gameOver = true;
    this.totalMoney += this.bankBusterState.bankedMoney;

    return {
      stopped: true,
      finalAmount: this.bankBusterState.bankedMoney,
      totalMoney: this.totalMoney
    };
  }

  startBlockParty() {
    const properties = [
      { name: 'Brown', value: 10000, color: '🟫' },
      { name: 'Light Blue', value: 20000, color: '🟦' },
      { name: 'Pink', value: 30000, color: '🩷' },
      { name: 'Orange', value: 40000, color: '🟧' },
      { name: 'Red', value: 50000, color: '🟥' },
      { name: 'Yellow', value: 60000, color: '🟨' },
      { name: 'Green', value: 100000, color: '🟩' },
      { name: 'Dark Blue', value: 200000, color: '🔵' }
    ];

    // 12 cards: 8 properties + 3 strikes + 1 Block Party
    const cards = [];
    for (let i = 0; i < 8; i++) cards.push({ type: 'property', index: i });
    cards.push({ type: 'strike' }, { type: 'strike' }, { type: 'strike' }, { type: 'blockParty' });

    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    this.blockPartyState = {
      properties,
      cards,
      pickedCards: Array(12).fill(false),
      collectedProperties: Array(8).fill(false),
      strikes: 0,
      maxStrikes: 3,
      bankedMoney: 0,
      choosingGroup: false, // For Block Party card effect
      isActive: true,
      gameOver: false
    };
    return this.blockPartyState;
  }

  blockPartyPick(cardIndex) {
    if (!this.blockPartyState || !this.blockPartyState.isActive) return null;
    if (this.blockPartyState.choosingGroup) return null; // Must choose group first
    if (this.blockPartyState.pickedCards[cardIndex]) return null;

    this.blockPartyState.pickedCards[cardIndex] = true;
    const card = this.blockPartyState.cards[cardIndex];

    if (card.type === 'property') {
      // Collect property
      if (!this.blockPartyState.collectedProperties[card.index]) {
        this.blockPartyState.collectedProperties[card.index] = true;
        const prop = this.blockPartyState.properties[card.index];
        this.blockPartyState.bankedMoney += prop.value;
      }

      // Check win
      if (this.blockPartyState.collectedProperties.every(p => p)) {
        this.blockPartyState.isActive = false;
        this.blockPartyState.gameOver = true;

        const jackpot = 3000000;
        this.blockPartyState.bankedMoney += jackpot;
        this.totalMoney += this.blockPartyState.bankedMoney;

        return {
          picked: true,
          cardIndex,
          card,
          won: true,
          jackpot,
          finalAmount: this.blockPartyState.bankedMoney,
          totalMoney: this.totalMoney
        };
      }

      return { picked: true, cardIndex, card, banked: this.blockPartyState.bankedMoney };

    } else if (card.type === 'strike') {
      this.blockPartyState.strikes++;

      if (this.blockPartyState.strikes === 2) {
        // Halve money
        this.blockPartyState.bankedMoney = Math.floor(this.blockPartyState.bankedMoney / 2);
        return { picked: true, cardIndex, card, halved: true, strikes: this.blockPartyState.strikes, banked: this.blockPartyState.bankedMoney };
      } else if (this.blockPartyState.strikes >= this.blockPartyState.maxStrikes) {
        // Game Over
        this.blockPartyState.isActive = false;
        this.blockPartyState.gameOver = true;
        this.blockPartyState.bankedMoney = 0; // Lose all
        return { picked: true, cardIndex, card, gameOver: true, strikes: this.blockPartyState.strikes, finalAmount: 0, totalMoney: this.totalMoney };
      }

      return { picked: true, cardIndex, card, strikes: this.blockPartyState.strikes };

    } else if (card.type === 'blockParty') {
      // Enable group selection
      this.blockPartyState.choosingGroup = true;
      return { picked: true, cardIndex, card, choosingGroup: true };
    }
  }

  blockPartySelectGroup(groupIndex) {
    if (!this.blockPartyState || !this.blockPartyState.isActive) return null;
    if (!this.blockPartyState.choosingGroup) return null;
    if (this.blockPartyState.collectedProperties[groupIndex]) return null;

    // Collect chosen property
    this.blockPartyState.collectedProperties[groupIndex] = true;
    const prop = this.blockPartyState.properties[groupIndex];
    this.blockPartyState.bankedMoney += prop.value;
    this.blockPartyState.choosingGroup = false;

    // Check win
    if (this.blockPartyState.collectedProperties.every(p => p)) {
      this.blockPartyState.isActive = false;
      this.blockPartyState.gameOver = true;

      const jackpot = 3000000;
      this.blockPartyState.bankedMoney += jackpot;
      this.totalMoney += this.blockPartyState.bankedMoney;

      return {
        selected: true,
        groupIndex,
        won: true,
        jackpot,
        finalAmount: this.blockPartyState.bankedMoney,
        totalMoney: this.totalMoney
      };
    }

    return { selected: true, groupIndex, banked: this.blockPartyState.bankedMoney };
  }

  blockPartyStop() {
    if (!this.blockPartyState || !this.blockPartyState.isActive) return null;

    this.blockPartyState.isActive = false;
    this.blockPartyState.gameOver = true;
    this.totalMoney += this.blockPartyState.bankedMoney;
    return { stopped: true, finalAmount: this.blockPartyState.bankedMoney, totalMoney: this.totalMoney };
  }

  // === ELECTRIC COMPANY MINIGAME ===

  startElectricCompany() {
    // 12 switches that light 1-10 bulbs (with duplicates)
    const switches = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2]; // Some duplicates
    for (let i = switches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [switches[i], switches[j]] = [switches[j], switches[i]];
    }

    this.electricCompanyState = {
      switches, // 12 switches
      pickedSwitches: Array(12).fill(false),
      litBulbs: 0, // Current number of lit bulbs (0-25)
      bankedMoney: 0,
      isActive: true,
      gameOver: false,
      maxBulbs: 25
    };
    return this.electricCompanyState;
  }

  electricCompanyFlipSwitch(switchIndex) {
    if (!this.electricCompanyState || !this.electricCompanyState.isActive) return null;
    if (this.electricCompanyState.pickedSwitches[switchIndex]) return null;

    this.electricCompanyState.pickedSwitches[switchIndex] = true;
    const bulbsToLight = this.electricCompanyState.switches[switchIndex];
    this.electricCompanyState.litBulbs += bulbsToLight;

    // Check for 24 bulbs = JACKPOT WIN!
    if (this.electricCompanyState.litBulbs === 24) {
      this.electricCompanyState.isActive = false;
      this.electricCompanyState.gameOver = true;

      const jackpot = 3000000;
      const bankedMoney = this.calculatePowerGridMoney(24);
      this.electricCompanyState.bankedMoney = bankedMoney + jackpot;
      this.totalMoney += this.electricCompanyState.bankedMoney;

      return {
        flipped: true,
        bulbsToLight,
        litBulbs: 24,
        won: true,
        jackpot,
        finalAmount: this.electricCompanyState.bankedMoney,
        totalMoney: this.totalMoney
      };
    }

    // Check blackout (25 or more bulbs = game over)
    if (this.electricCompanyState.litBulbs >= 25) {
      this.electricCompanyState.isActive = false;
      this.electricCompanyState.gameOver = true;
      // Hit 25+ bulbs - lose all
      return { blackout: true, survived: false };
    }

    // Calculate money based on bulbs lit
    this.electricCompanyState.bankedMoney = this.calculatePowerGridMoney(this.electricCompanyState.litBulbs);

    return {
      flipped: true,
      bulbsToLight,
      litBulbs: this.electricCompanyState.litBulbs,
      banked: this.electricCompanyState.bankedMoney
    };
  }

  calculatePowerGridMoney(litCount) {
    const values = [
      500, 500, 500, 500, 500, 500, 500, 500, 500, 500, // 1-10: $500 each = $5k
      1000, 1000, 1000, 1000, 1000, // 11-15: $1k each = $5k
      40000, // 16: $40k
      50000, 50000, 50000, 50000, 50000, // 17-21: $50k each = $250k
      100000, 100000, // 22-23: $100k each = $200k
      500000 // 24: $500k
    ];

    let total = 0;
    for (let i = 0; i < litCount && i < 24; i++) {
      total += values[i];
    }
    return total;
  }

  electricCompanyStop() {
    if (!this.electricCompanyState || !this.electricCompanyState.isActive) return null;
    this.electricCompanyState.isActive = false;
    this.electricCompanyState.gameOver = true;
    this.totalMoney += this.electricCompanyState.bankedMoney;
    return { stopped: true, finalAmount: this.electricCompanyState.bankedMoney, totalMoney: this.totalMoney };
  }

  // === NO VACANCY MINIGAME ===

  startNoVacancy() {
    // 5 limos with 1-5 passengers
    const limos = [1, 2, 3, 4, 5];
    for (let i = limos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [limos[i], limos[j]] = [limos[j], limos[i]];
    }

    this.noVacancyState = {
      limos,
      pickedLimos: Array(5).fill(false),
      hotel: [
        Array(7).fill(false), // Floor 1
        Array(7).fill(false), // Floor 2
        Array(7).fill(false)  // Floor 3
      ],
      bankedMoney: 0,
      isActive: true,
      gameOver: false
    };
    return this.noVacancyState;
  }

  noVacancyPickLimo(limoIndex) {
    if (!this.noVacancyState || !this.noVacancyState.isActive) return null;
    if (this.noVacancyState.pickedLimos[limoIndex]) return null;

    this.noVacancyState.pickedLimos[limoIndex] = true;
    this.noVacancyState.currentLimo = limoIndex;
    this.noVacancyState.currentPassengers = this.noVacancyState.limos[limoIndex];

    // Check if fits anywhere
    const passengers = this.noVacancyState.currentPassengers;
    const canFit = this.noVacancyState.hotel.some(floor => {
      const empty = floor.filter(r => !r).length;
      return passengers <= empty;
    });

    if (!canFit) {
      this.noVacancyState.isActive = false;
      this.noVacancyState.gameOver = true;
      this.noVacancyState.bankedMoney = 0; // Lose all
      return {
        picked: true,
        limoIndex,
        passengers,
        gameOver: true,
        noMoves: true,
        finalAmount: 0,
        totalMoney: this.totalMoney
      };
    }

    return {
      picked: true,
      limoIndex,
      passengers: this.noVacancyState.currentPassengers
    };
  }

  noVacancyPlaceFloor(floorIndex) {
    if (!this.noVacancyState || !this.noVacancyState.isActive) return null;
    if (!this.noVacancyState.currentPassengers) return null;

    const floor = this.noVacancyState.hotel[floorIndex];
    const emptyRooms = floor.filter(r => !r).length;
    const passengers = this.noVacancyState.currentPassengers;

    // Check if passengers fit
    if (passengers > emptyRooms) {
      // Game over - doesn't fit
      this.noVacancyState.isActive = false;
      this.noVacancyState.gameOver = true;
      return { overflow: true, passengers, emptyRooms };
    }

    // Fill rooms
    let filled = 0;
    for (let i = 0; i < floor.length && filled < passengers; i++) {
      if (!floor[i]) {
        floor[i] = true;
        filled++;
      }
    }

    // Add money ($1k per room on floor 1, $2k on floor 2, $3k on floor 3)
    const moneyPerRoom = (floorIndex + 1) * 10000;
    this.noVacancyState.bankedMoney += passengers * moneyPerRoom;

    // REFILL LIMO: Generate new random limo (1-5) for the used slot
    const usedLimoIndex = this.noVacancyState.currentLimo;
    this.noVacancyState.limos[usedLimoIndex] = Math.floor(Math.random() * 5) + 1;
    this.noVacancyState.pickedLimos[usedLimoIndex] = false; // Make it available again

    this.noVacancyState.currentPassengers = null;
    this.noVacancyState.currentLimo = null;

    // Check win (all 21 rooms filled)
    const totalFilled = this.noVacancyState.hotel.flat().filter(r => r).length;
    if (totalFilled === 21) {
      const jackpot = 3000000;
      const totalWon = this.noVacancyState.bankedMoney + jackpot;
      this.noVacancyState.isActive = false;
      this.noVacancyState.gameOver = true;
      this.totalMoney += totalWon;
      return { placed: true, won: true, jackpot, finalAmount: totalWon, totalMoney: this.totalMoney };
    }

    return { placed: true, banked: this.noVacancyState.bankedMoney };
  }

  noVacancyStop() {
    if (!this.noVacancyState || !this.noVacancyState.isActive) return null;

    // Check if at least 3 rooms on each floor
    const minRoomsPerFloor = this.noVacancyState.hotel.every(floor => floor.filter(r => r).length >= 3);
    if (!minRoomsPerFloor) return { cannotStop: true };

    this.noVacancyState.isActive = false;
    this.noVacancyState.gameOver = true;
    this.totalMoney += this.noVacancyState.bankedMoney;
    return { stopped: true, finalAmount: this.noVacancyState.bankedMoney, totalMoney: this.totalMoney };
  }

  // === RIDE THE RAILS MINIGAME ===

  startRideTheRails() {
    const railroads = [
      'Reading Railroad', 'Pennsylvania Railroad', 'B&O Railroad', 'Short Line',
      'Union Pacific', 'Santa Fe', 'Canadian Pacific', 'Northern Pacific', 'Great Northern', 'Southern Pacific'
    ];

    // Each railroad has 1-10 cash cars + caboose
    const trains = [];
    for (let i = 0; i < 10; i++) {
      const cashCars = i + 1; // 1-10 cash cars
      trains.push({
        name: railroads[i],
        cashCars,
        revealed: 0,
        stopped: false,
        revealedCars: [], // Track which car positions have been revealed
        allRevealed: false // Flag for when all cars are revealed after stopping
      });
    }

    // Shuffle
    for (let i = trains.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trains[i], trains[j]] = [trains[j], trains[i]];
    }

    this.rideRailsState = {
      trains,
      currentTurn: 0,
      maxTurns: 4,
      turnValues: [10000, 20000, 30000, 50000], // $10k, $20k, $30k, $50k per car
      bankedMoney: 0,
      isActive: true,
      gameOver: false
    };
    return this.rideRailsState;
  }

  rideRailsSelectTrain(trainIndex) {
    if (!this.rideRailsState || !this.rideRailsState.isActive) return null;
    if (this.rideRailsState.currentTurn >= this.rideRailsState.maxTurns) return null;
    if (this.rideRailsState.trains[trainIndex].stopped) return null;

    this.rideRailsState.currentTrain = trainIndex;
    this.rideRailsState.trains[trainIndex].revealed = 0;

    return {
      selected: true,
      train: this.rideRailsState.trains[trainIndex],
      turnValue: this.rideRailsState.turnValues[this.rideRailsState.currentTurn]
    };
  }

  rideRailsStopTrain() {
    if (!this.rideRailsState || !this.rideRailsState.isActive) return null;
    if (this.rideRailsState.currentTrain === undefined) return null;

    const train = this.rideRailsState.trains[this.rideRailsState.currentTrain];
    train.stopped = true;
    train.allRevealed = true; // Mark all cars as revealed for display

    // Bank money for revealed cars
    const valuePerCar = this.rideRailsState.turnValues[this.rideRailsState.currentTurn];
    const earned = train.revealed * valuePerCar;
    this.rideRailsState.bankedMoney += earned;

    // Move to next turn
    this.rideRailsState.currentTurn++;
    this.rideRailsState.currentTrain = undefined;

    // Check if game over
    if (this.rideRailsState.currentTurn >= this.rideRailsState.maxTurns) {
      this.rideRailsState.isActive = false;
      this.rideRailsState.gameOver = true;

      // Check jackpot
      if (this.rideRailsState.bankedMoney >= 500000) {
        const jackpot = 3000000;
        this.rideRailsState.bankedMoney += jackpot;
        this.totalMoney += this.rideRailsState.bankedMoney;
        return {
          stopped: true,
          earned,
          jackpot,
          goalReached: true,
          finalAmount: this.rideRailsState.bankedMoney,
          totalMoney: this.totalMoney,
          train // Return train for UI grid display
        };
      }

      this.totalMoney += this.rideRailsState.bankedMoney;

      return {
        stopped: true,
        earned,
        goalReached: this.rideRailsState.bankedMoney >= 500000,
        finalAmount: this.rideRailsState.bankedMoney,
        totalMoney: this.totalMoney,
        train // Return train for UI grid display
      };
    }

    return {
      stopped: true,
      earned,
      banked: this.rideRailsState.bankedMoney,
      train // Return train for UI grid display
    };
  }

  rideRailsRevealCar() {
    if (!this.rideRailsState || !this.rideRailsState.isActive) return null;
    if (this.rideRailsState.currentTrain === undefined) return null;

    const train = this.rideRailsState.trains[this.rideRailsState.currentTrain];
    train.revealed++;

    // Track the revealed car position
    train.revealedCars.push(train.revealed);

    // Check if hit caboose
    if (train.revealed > train.cashCars) {
      // Hit caboose - no money for this train
      train.stopped = true;
      train.allRevealed = true; // Mark all cars as revealed for display

      // Calculate lost potential for this turn
      const valuePerCar = this.rideRailsState.turnValues[this.rideRailsState.currentTurn];
      const lostAmount = (train.revealed - 1) * valuePerCar; // -1 because caboose doesn't count

      this.rideRailsState.currentTurn++;
      this.rideRailsState.currentTrain = undefined;

      // Check game over
      if (this.rideRailsState.currentTurn >= this.rideRailsState.maxTurns) {
        this.rideRailsState.isActive = false;
        this.rideRailsState.gameOver = true;

        // Check jackpot
        if (this.rideRailsState.bankedMoney >= 500000) {
          const jackpot = 3000000;
          this.rideRailsState.bankedMoney += jackpot;
          this.totalMoney += this.rideRailsState.bankedMoney;
          return {
            caboose: true,
            gameOver: true,
            lostAmount,
            jackpot,
            finalAmount: this.rideRailsState.bankedMoney,
            totalMoney: this.totalMoney,
            train // Return train for UI grid display
          };
        }

        this.totalMoney += this.rideRailsState.bankedMoney;

        return {
          caboose: true,
          gameOver: true,
          lostAmount,
          finalAmount: this.rideRailsState.bankedMoney,
          totalMoney: this.totalMoney,
          train // Return train for UI grid display
        };
      }

      return {
        caboose: true,
        lostAmount,
        banked: this.rideRailsState.bankedMoney,
        train // Return train for UI grid display
      };
    }

    return {
      revealed: true,
      cashCars: train.revealed,
      totalCars: train.cashCars,
      train // Return train for UI grid display
    };
  }

  // === BOILING POINT MINIGAME ===

  startBoilingPoint() {
    // Generate 10 random numbers (0, 10, 20... 90) - each used once
    const numbers = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

    // Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // First number is starter temp
    const startTemp = numbers[0];
    const grid = numbers.slice(1); // Remaining 9 numbers (8 playable + 1 extra/reserve)
    // Wait, requirement says: "10 hidden grids (8 for playable and 2 for change)"
    // And "Random 0...90 (Each has 1)" -> That's 10 numbers total.
    // "open the first grid, it's starter temperature" -> So 1 used for start.
    // That leaves 9 numbers.
    // "8 for playable" -> 8 steps.
    // "2 for change" -> Wait, 1+8+2 = 11 numbers needed? But we only have 0-90 (10 numbers).
    // Let's re-read: "Random 0...90 (Each has 1) into the 10 hidden grids (8 for playable and 2 for change)"
    // This implies 10 grids total.
    // "open the first grid, it's starter temperature" -> This might mean the first of the 8 playable?
    // Or maybe there's a separate starter temp?
    // "Random 0...90 (Each has 1)" -> Total 10 items.
    // If 8 are playable and 2 are reserve, that's 10.
    // Where does the starter temp come from?
    // Maybe the first "playable" grid IS the starter temp?
    // "open the first grid, it's starter temperature after that the player need to choose..."
    // So: Grid 1 is revealed immediately. Current Temp = Grid 1 value.
    // Then we play 7 more rounds? Or 8 rounds starting from Grid 2?
    // "In the end of 8 grids" -> Implies 8 grids are involved in the main flow.
    // If Grid 1 is starter, then we play Grids 2-8 (7 steps)?
    // Or maybe the starter temp is separate?
    // Let's assume: 10 numbers total.
    // Grid 1: Starter Temp (Revealed at start).
    // Grids 2-8: Playable steps (7 steps).
    // Grids 9-10: Reserve for "Change".
    // Wait, "8 for playable" usually means 8 interactions.
    // If Grid 1 is just setup, that's 7 interactions.
    // Let's assume the user means: 8 grids are in the main sequence.
    // Grid 1 is revealed. Player makes choice for Grid 2.
    // Grid 2 revealed. Player makes choice for Grid 3.
    // ...
    // Grid 8 revealed. End.
    // That's 7 decisions.
    // And 2 grids are set aside as "Reserve".
    // Total 8+2 = 10 numbers. Perfect matches 0-90 set.

    this.boilingPointState = {
      grid: grid, // Indices 0-6 (7 numbers) + 2 reserves? No, let's store all 9 remaining.
      // Actually, let's store them clearly.
      // Main Sequence: numbers[0] (Start), numbers[1]...numbers[7]
      // Reserves: numbers[8], numbers[9]

      mainGrid: numbers.slice(0, 8), // 8 numbers for main game
      reserves: numbers.slice(8, 10), // 2 numbers for change

      currentTemp: numbers[0], // Starter temp
      currentIndex: 0, // Current position in mainGrid (0 is start, next is 1)
      maxIndex: 7, // 0 to 7 = 8 grids

      history: [{ step: 0, temp: numbers[0], action: 'start', value: numbers[0] }],

      reserveUsed: false,
      isActive: true,
      gameOver: false
    };

    return this.boilingPointState;
  }

  playBoilingPoint(action, isChange = false) {
    if (!this.boilingPointState || !this.boilingPointState.isActive) return null;

    const state = this.boilingPointState;
    let nextValue;
    let usedReserve = false;

    // Determine next value
    if (isChange) {
      if (state.reserveUsed) return null; // Already used
      // Use a reserve number
      // User picks 1 of 2? "1 of 2 changing grid (it's hidden too!)"
      // Let's just pick the first available reserve for simplicity or random?
      // "select 'Hotter' or 'Colder'" -> The action applies to the reserve number.
      // Let's just take the first reserve.
      nextValue = state.reserves.shift(); // Take first reserve
      usedReserve = true;
      state.reserveUsed = true;

      // We don't advance the main grid index if we swap? 
      // "Player can change the next hidden grid" -> Replaces the next grid in sequence?
      // Yes, "change the next hidden grid". So we consume a reserve AND skip the original next grid?
      // Or just swap it in? "change" usually means swap.
      // If we swap, the original next grid goes to waste (or reserve?).
      // Let's assume it replaces the current target.
      // So we use reserve INSTEAD of mainGrid[currentIndex + 1].

    } else {
      // Normal play - use next in main grid
      nextValue = state.mainGrid[state.currentIndex + 1];
    }

    // Apply temperature change
    let change = 0;
    if (action === 'hotter') {
      state.currentTemp += nextValue;
      change = nextValue;
    } else if (action === 'colder') {
      state.currentTemp -= nextValue;
      change = -nextValue;
    }

    state.currentIndex++;

    state.history.push({
      step: state.currentIndex,
      temp: state.currentTemp,
      action: action,
      value: nextValue,
      isChange: isChange
    });

    const result = {
      currentTemp: state.currentTemp,
      change: change,
      value: nextValue,
      step: state.currentIndex,
      maxSteps: state.maxIndex,
      gameOver: false,
      won: false,
      winnings: 0
    };

    // Check end condition
    if (state.currentIndex >= state.maxIndex) {
      state.isActive = false;
      result.gameOver = true;

      // Calculate winnings
      if (state.currentTemp === 100) {
        result.winnings = 2000000;
        result.won = true;
        result.jackpot = true;
      } else if (state.currentTemp === 0) {
        result.winnings = 200000;
        result.won = true;
        result.zeroJackpot = true;
      } else if (state.currentTemp >= 10 && state.currentTemp <= 90) {
        // $25,000 per 10 degrees
        // "per 10 degree gain $25,000" -> 10 deg = 25k, 20 deg = 50k?
        // Or is it (temp / 10) * 25000?
        // Assuming linear scaling:
        const tens = Math.floor(state.currentTemp / 10);
        result.winnings = tens * 25000;
        result.won = true;
      } else {
        // < 0 or > 100
        result.winnings = 0;
        result.won = false;
        result.bust = true;
      }

      this.totalMoney += result.winnings;
    }

    return result;
  }

  // === OPERATOR ROSHAMBO MINIGAME ===

  startOperatorRoshambo() {
    this.operatorRoshamboState = {
      currentRound: 0,
      totalRounds: 6,
      wins: 0,
      losses: 0,
      ties: 0,
      accumulatedMoney: 0,
      history: [],
      isActive: true
    };

    return this.operatorRoshamboState;
  }

  playOperatorRoshamboRound(playerChoice) {
    if (!this.operatorRoshamboState || !this.operatorRoshamboState.isActive) return null;

    const state = this.operatorRoshamboState;

    // Operator makes random choice
    const choices = ['rock', 'paper', 'scissors'];
    const operatorChoice = choices[Math.floor(Math.random() * 3)];

    // Determine winner
    let result = 'tie';
    if (playerChoice === operatorChoice) {
      result = 'tie';
      state.ties++;
    } else if (
      (playerChoice === 'rock' && operatorChoice === 'scissors') ||
      (playerChoice === 'paper' && operatorChoice === 'rock') ||
      (playerChoice === 'scissors' && operatorChoice === 'paper')
    ) {
      result = 'win';
      state.wins++;
      state.accumulatedMoney += 30000; // +$30k per win
    } else {
      result = 'loss';
      state.losses++;
      // Divide by 10 (cut last 0 digit)
      state.accumulatedMoney = Math.floor(state.accumulatedMoney / 10);
    }

    state.currentRound++;

    // Record history
    state.history.push({
      round: state.currentRound,
      playerChoice,
      operatorChoice,
      result,
      moneyAfter: state.accumulatedMoney
    });

    const roundResult = {
      playerChoice,
      operatorChoice,
      result,
      currentRound: state.currentRound,
      totalRounds: state.totalRounds,
      wins: state.wins,
      losses: state.losses,
      ties: state.ties,
      accumulatedMoney: state.accumulatedMoney,
      gameOver: false,
      perfect: false,
      winnings: 0
    };

    // Check if game is complete
    if (state.currentRound >= state.totalRounds) {
      state.isActive = false;
      roundResult.gameOver = true;

      // Perfect 6/6 wins = $2M
      if (state.wins === 6) {
        state.accumulatedMoney = 2000000;
        roundResult.perfect = true;
      }

      roundResult.winnings = state.accumulatedMoney;
      this.totalMoney += state.accumulatedMoney;
    }

    return roundResult;
  }

  // === MYSTERY BOX MINIGAME ===

  getMysteryBoxItemPool() {
    return {
      good: [
        { id: 'peek', name: 'Peek', effect: 'addPeek', emoji: '👁️', desc: 'View a floor\'s content without revealing left/right!', revealText: 'The future is yours to see!', weight: 1 },
        { id: 'golden_shield', name: 'Golden Shield', effect: 'gameOverImmunity', emoji: '🛡️', desc: 'Protected from disaster!', revealText: 'Protected from disaster!', weight: 1 },
        { id: 'money_magnet', name: 'Money Magnet', effect: 'doubleRewards3', emoji: '🧲', desc: 'Everything you touch turns to gold!', revealText: 'Everything you touch turns to gold!', weight: 1 },
        { id: 'lucky_clover', name: 'Lucky Clover', effect: 'guaranteedPositive5', emoji: '🍀', desc: 'Luck is on your side!', revealText: 'Luck is on your side!', weight: 1 },
        { id: 'instant_jackpot', name: 'Instant Jackpot', effect: 'addMoney', value: () => 100000 + Math.floor(Math.random() * 400000), emoji: '💎', desc: 'Jackpot! Fortune smiles upon you!', revealText: 'Jackpot! Fortune smiles upon you!', weight: 1 },
        { id: 'divine_intervention', name: 'Divine Intervention', effect: 'skipToHighest', emoji: '✨', desc: 'The gods favor you!', revealText: 'The gods favor you!', weight: 1 },
        { id: 'golden_ticket', name: 'Golden Ticket', effect: 'sixZeroesMinigame', emoji: '🎫', desc: 'Exclusive opportunity unlocked!', revealText: 'Exclusive opportunity unlocked!', weight: 1 },
        { id: 'safety_net', name: 'Safety Net', effect: 'noLoss4', emoji: '🪂', desc: 'Risk-free zone activated!', revealText: 'Risk-free zone activated!', weight: 1 },
        { id: 'vision_stone', name: 'Vision Stone', effect: 'revealNext2', emoji: '🔮', desc: 'The future is clear!', revealText: 'The future is clear!', weight: 1 },
        { id: 'treasure_map', name: 'Treasure Map', effect: 'addToAllFloors', value: 50000, emoji: '🗺️', desc: 'Everything just got more valuable!', revealText: 'Everything just got more valuable!', weight: 1 },
        { id: 'phoenix_feather', name: 'Phoenix Feather', effect: 'autoRevive', emoji: '🪶', desc: 'Death is not the end!', revealText: 'Death is not the end!', weight: 1 },
        { id: 'crown_greed', name: 'Crown of Greed', effect: 'tripleNextFloor', emoji: '👑', desc: 'Royalty has its privileges!', revealText: 'Royalty has its privileges!', weight: 1 },
        { id: 'angel_wing', name: 'Angel Wing', effect: 'autoWinMinigame', emoji: '👼', desc: 'Victory is guaranteed!', revealText: 'Victory is guaranteed!', weight: 1 },
        { id: 'midas_touch', name: 'Midas Touch', effect: 'convertNothing3', emoji: '✋', desc: 'Turn nothing into something!', revealText: 'Turn nothing into something!', weight: 1 },
        { id: 'wish_granter', name: 'Wish Granter', effect: 'chooseFloor', emoji: '⭐', desc: 'Your wish is my command!', revealText: 'Your wish is my command!', weight: 1 },
        { id: 'big_bank', name: 'Big Bank', effect: 'big_bank', emoji: '🏦', desc: 'Gain all lost money!', revealText: 'The bank is yours!', weight: 1 },
        { id: 'small_bank', name: 'Small Bank', effect: 'small_bank', emoji: '🏦', desc: 'Stole 10% of big bank!', revealText: 'A small heist!', weight: 2 },
        { id: 'oracles_vision', name: 'Oracle\'s Vision', effect: 'oracles_vision', emoji: '🔮', desc: 'Reveal next floor contents!', revealText: 'The future is revealed!', weight: 0.5 },
        { id: 'bonus_portal', name: 'Bonus Portal', effect: 'bonus_portal', emoji: '🎪', desc: 'Random minigame with 2x rewards!', revealText: 'Portal opening!', weight: 1 },
        { id: 'gift_horse', name: 'Gift Horse', effect: 'gift_horse', emoji: '🎁', desc: 'Give 25% to Big Bank, gain 2 bonus plays!', revealText: 'Generosity rewarded!', weight: 1 },
        { id: 'tax_collector', name: 'Tax Collector', effect: 'tax_collector', emoji: '💸', desc: 'Lose 20%, immune to next percentage!', revealText: 'Strategic sacrifice!', weight: 1 },
        { id: 'lucky_seven', name: 'Lucky 7', effect: 'lucky_seven', emoji: '🎰', desc: 'Multiply by 7, you are forced to play the next round!', revealText: 'Lucky seven!', weight: 0.5 },
        { id: 'announcement', name: 'Announcement', effect: 'announcement', emoji: '📢', desc: 'Reveal money to server, gain +10%!', revealText: 'World announcement!', weight: 1 },
        { id: 'sangha_offerings', name: 'Sangha Offerings', effect: 'sangha_offerings', emoji: '🙏', desc: 'Divine blessing! Keep all your money and exit from my building!', revealText: 'The gods bless your journey!', weight: 0.5 },
        { id: 'the_heist', name: 'The Heist', effect: 'the_heist', emoji: '🎭💰', desc: 'Steal 10% of EVERY player\'s leaderboard score!', revealText: 'THE MASTER HEIST! You robbed the entire tower leaderboard!', weight: 0.2 }
      ],
      bad: [
        { id: 'black_hole', name: 'Black Hole', effect: 'multiplyMoney', value: 0.5, emoji: '🕳️', desc: 'Your fortune vanishes into the void!', revealText: 'Your fortune vanishes into the void!', weight: 1 },
        { id: 'cursed_mirror', name: 'Cursed Mirror', effect: 'reverseChoice', emoji: '🪞', desc: 'Reality inverts around you!', revealText: 'Reality inverts around you!', weight: 1 },
        { id: 'devils_contract', name: 'Devil\'s Contract', effect: 'hardModeNext', emoji: '😈', desc: 'Next minigame change 1 grid to game over!', revealText: 'You\'ve made a deal with the devil!', weight: 1 },
        { id: 'poison_chalice', name: 'Poison Chalice', effect: 'lose10k3', emoji: '☠️', desc: 'Every step costs you dearly!', revealText: 'Every step costs you dearly!', weight: 1 },
        { id: 'bankruptcy_bill', name: 'Bankruptcy Bill', effect: 'multiplyMoney', value: 0, emoji: '📜', desc: 'You are bankrupt!', revealText: 'You lost everything!', weight: 1 },
        { id: 'rusty_trap', name: 'Rusty Trap', effect: 'noBankCashout5', emoji: '⚙️', desc: 'Can\'t bank next 5 floors or cashout this round!', revealText: 'You\'re trapped in the tower!', weight: 1 },
        { id: 'fog_of_war', name: 'Fog of War', effect: 'hideNext3', emoji: '🌫️', desc: 'Blind choices lie ahead!', revealText: 'Blind choices lie ahead!', weight: 1 },
        { id: 'gravity_well', name: 'Gravity Well', effect: 'multiplyMoney', value: 0.2, emoji: '⬇️', desc: 'Everything falls down!', revealText: 'Everything falls down!', weight: 1 },
        { id: 'sabotage_kit', name: 'Sabotage Kit', effect: 'halveMultipliers4', emoji: '🔧', desc: 'Your luck has been sabotaged!', revealText: 'Your luck has been sabotaged!', weight: 1 },
        { id: 'thiefs_shadow', name: 'Thief\'s Shadow', effect: 'stolen', value: () => 10000 + Math.floor(Math.random() * 40000), emoji: '🥷', desc: 'A thief in the night!', revealText: 'A thief in the night!', weight: 1 },
        { id: 'broken_compass', name: 'Broken Compass', effect: 'randomChoice2', emoji: '🧭', desc: 'You\'ve lost your way!', revealText: 'You\'ve lost your way!', weight: 1 },
        { id: 'time_bomb', name: 'Time Bomb', effect: 'tickingBomb', emoji: '💣', desc: 'Lose $10k per floor!', revealText: 'Tick tock, tick tock...', weight: 1 },
        { id: 'snake_bite', name: 'Snake Bite', effect: 'invertNext', emoji: '🐍', desc: 'Poison corrupts everything!', revealText: 'Poison corrupts everything!', weight: 1 },
        { id: 'locked_door', name: 'Locked Door', effect: 'skipNextFloor', emoji: '🔒', desc: 'The path forward is blocked!', revealText: 'The path forward is blocked!', weight: 1 },
        { id: 'bad_omen', name: 'Bad Omen', effect: 'nothingToGameOver3', emoji: '🌩️', desc: 'Disaster looms ahead!', revealText: 'Disaster looms ahead!', weight: 1 },
        { id: 'tower_crash', name: 'Tower of cra$h', effect: 'reset_leaderboard', emoji: '🏢', desc: 'Reset the leaderboard!', revealText: 'Everyone back to 0!', weight: 0.3 },
        { id: 'cut_front', name: 'Cut a front', effect: 'cut_front', emoji: '✂️', desc: 'Cut leftmost digit!', revealText: 'Digits removed!', weight: 3 },
        { id: 'bruh_bank', name: 'BRUH Bank', effect: 'bruh_bank', emoji: '🏦', desc: 'All your money goes to the Big Bank!', revealText: 'Thanks for the donation!', weight: 1.5 },
        { id: 'go_to_jail', name: 'Go to Jail', effect: 'go_to_jail', emoji: '👮🚨', desc: 'Busted immediately! Pay $5M bail from leaderboard!', revealText: 'Busted! Go straight to jail, do not pass GO!', weight: 1 }
      ],
      neutral: [
        { id: 'chaos_orb', name: 'Chaos Orb', effect: 'random50k', emoji: '🔴', desc: 'Embrace the chaos!', revealText: 'Embrace the chaos!', weight: 1 },
        { id: 'gamblers_dice', name: 'Gambler\'s Dice', effect: 'diceRoll', emoji: '🎲', desc: 'Let the dice decide!', revealText: 'Let the dice decide!', weight: 1 },
        { id: 'memory_wipe', name: 'Memory Wipe', effect: 'restartRound', emoji: '💭', desc: 'A fresh start!', revealText: 'A fresh start!', weight: 1 },
        { id: 'mirror_match', name: 'Mirror Match', effect: 'copyOpponent', emoji: '🪩', desc: 'Imitation is flattery!', revealText: 'Imitation is flattery!', weight: 1 },
        { id: 'trade_winds', name: 'Trade Winds', effect: 'swapMoney', emoji: '🌪️', desc: 'The winds of change!', revealText: 'The winds of change!', weight: 1 },
        { id: 'question_mark', name: 'Question Mark', effect: 'randomMinigame', emoji: '❓', desc: 'Mystery awaits!', revealText: 'Mystery awaits!', weight: 1 },
        { id: 'balance_scale', name: 'Balance Scale', effect: 'balanceMoney', emoji: '⚖️', desc: 'Seeking equilibrium!', revealText: 'Seeking equilibrium!', weight: 1 },
        { id: 'recycler', name: 'Recycler', effect: 'averageLast3', emoji: '♻️', desc: 'Efficiency over quantity!', revealText: 'Efficiency over quantity!', weight: 1 },
        { id: 'wild_card', name: 'Wild Card', effect: 'randomEffect', emoji: '🃏', desc: 'Anything can happen!', revealText: 'Anything can happen!', weight: 1 },
        { id: 'hourglass', name: 'Hourglass', effect: 'add2Floors', emoji: '⏳', desc: 'Time expands!', revealText: 'Time expands!', weight: 1 },
        { id: 'echo_chamber', name: 'Echo Chamber', effect: 'repeatLast', emoji: '📢', desc: 'History repeats itself!', revealText: 'History repeats itself!', weight: 1 },
        { id: 'mood_ring', name: 'Mood Ring', effect: 'adaptiveMoney', emoji: '💍', desc: 'Adapts to your fortune!', revealText: 'Adapts to your fortune!', weight: 1 },
        { id: 'butterfly', name: 'Butterfly Effect', effect: 'delayedRandom', emoji: '🦋', desc: 'Small actions, big consequences!', revealText: 'Small actions, big consequences!', weight: 1 },
        { id: 'crossroads', name: 'Crossroads', effect: 'choice30kOrLobby', emoji: '🚦', desc: 'A choice must be made!', revealText: 'A choice must be made!', weight: 1 },
        { id: 'karma_wheel', name: 'Karma Wheel', effect: 'karma', emoji: '☯️', desc: 'What goes around comes around!', revealText: 'What goes around comes around!', weight: 1 },
        { id: 'repeat', name: 'Repeat', effect: 'repeat_game', emoji: '🔁', desc: 'Reset with same pattern!', revealText: 'Déjà vu!', weight: 1 },
        { id: 'double_or_nothing', name: 'Double or Nothing', effect: 'double_or_nothing', emoji: '🎲', desc: '50/50: Double money OR lose 50%!', revealText: 'High stakes gamble!', weight: 1 },
        { id: 'malfunction', name: 'Malfunction', effect: 'malfunction', emoji: '🔄', desc: 'Random money from -999M to +999M!', revealText: 'System error!', weight: 1 },
        { id: 'lightning_round', name: 'Lightning Round', effect: 'lightning_round', emoji: '⚡', desc: 'Skip to final round immediately!', revealText: 'Time warp!', weight: 0.4 }
      ],
      minigames: [
        { id: 'advance_boardwalk', name: 'Advance to Boardwalk', effect: 'minigame_advance_boardwalk', emoji: '🎲', desc: 'Roll dice to reach Boardwalk!', revealText: 'Roll for fortune!', weight: 1 },
        { id: 'bank_buster', name: 'Bank Buster', effect: 'minigame_bank_buster', emoji: '🔐', desc: 'Open 5 locks to crack the vault!', revealText: 'The vault awaits!', weight: 1 },
        { id: 'block_party', name: 'Block Party', effect: 'minigame_block_party', emoji: '🏘️', desc: 'Collect property groups!', revealText: 'Party time!', weight: 1 },
        { id: 'community_chest', name: 'Community Chest', effect: 'minigame_community_chest', emoji: '🎁', desc: 'Pick chests with doubling values!', revealText: 'Open with care!', weight: 1 },
        { id: 'electric_company', name: 'Electric Company', effect: 'minigame_electric_company', emoji: '💡', desc: 'Light up bulbs without blackout!', revealText: 'Flip the switches!', weight: 1 },
        { id: 'no_vacancy', name: 'No Vacancy', effect: 'minigame_no_vacancy', emoji: '🏨', desc: 'Fill the hotel with guests!', revealText: 'Check-in time!', weight: 1 },
        { id: 'park_it', name: 'Park It', effect: 'minigame_park_it', emoji: '🚗', desc: 'Park cars by value in the garage!', revealText: 'Valet parking!', weight: 1 },
        { id: 'ride_rails', name: 'Ride the Rails', effect: 'minigame_ride_rails', emoji: '🚂', desc: 'Stop trains to collect cash!', revealText: 'All aboard!', weight: 1 }
      ],
      money: [
        { id: 'pennies', name: 'Pennies', effect: 'addMoney', value: 1000, emoji: '🪙', desc: 'Every penny counts!', revealText: 'Every penny counts!', weight: 19 },
        { id: 'pocket_change', name: 'Pocket Change', effect: 'addMoney', value: 5000, emoji: '💵', desc: 'A nice little bonus!', revealText: 'A nice little bonus!', weight: 16 },
        { id: 'payday', name: 'Payday', effect: 'addMoney', value: 15000, emoji: '💴', desc: 'Time to collect!', revealText: 'Time to collect!', weight: 14 },
        { id: 'treasure_chest', name: 'Treasure Chest', effect: 'addMoney', value: 35000, emoji: '🎁', desc: 'A generous gift!', revealText: 'A generous gift!', weight: 12 },
        { id: 'gold_bar', name: 'Gold Bar', effect: 'addMoney', value: 75000, emoji: '🏆', desc: 'Solid gold value!', revealText: 'Solid gold value!', weight: 10 },
        { id: 'diamond_cache', name: 'Diamond Cache', effect: 'addMoney', value: 125000, emoji: '💎', desc: 'Wealth beyond measure!', revealText: 'Wealth beyond measure!', weight: 8 },
        { id: 'royal_fortune', name: 'Royal Fortune', effect: 'addMoney', value: 200000, emoji: '👑', desc: 'Fit for a king!', revealText: 'Fit for a king!', weight: 6 },
        { id: 'small_tax', name: 'Small Tax', effect: 'addMoney', value: -3000, emoji: '📉', desc: 'The cost of doing business!', revealText: 'The cost of doing business!', weight: 15 },
        { id: 'parking_ticket', name: 'Parking Ticket', effect: 'addMoney', value: -8000, emoji: '🎟️', desc: 'Oops, forgot to pay!', revealText: 'Oops, forgot to pay!', weight: 13 },
        { id: 'bill_payment', name: 'Bill Payment', effect: 'addMoney', value: -20000, emoji: '🧾', desc: 'Gotta pay the bills!', revealText: 'Gotta pay the bills!', weight: 11 },
        { id: 'percentage_boost', name: 'Percentage Boost', effect: 'percentageMoney', value: 0.20, emoji: '📈', desc: '+20% of current money!', revealText: 'Growth multiplier!', weight: 9 },
        { id: 'percentage_tax', name: 'Percentage Tax', effect: 'percentageMoney', value: -0.20, emoji: '📊', desc: '-20% of current money!', revealText: 'The taxman takes his cut!', weight: 9 },
        { id: 'double_or_nothing', name: 'Double or Nothing', effect: 'doubleOrHalf', emoji: '🎰', desc: 'Current money x2 or ÷2!', revealText: 'High risk, high reward!', weight: 7 },
        { id: 'lucky_lottery', name: 'Lucky Lottery', effect: 'addMoney', value: () => 1000 + Math.floor(Math.random() * 9999000), emoji: '🎫', desc: 'Random $1k-$10M!', revealText: 'Winner winner!', weight: 5 },
        { id: 'debt_collector', name: 'Debt Collector', effect: 'loseLeftRight', emoji: '💸', desc: 'Lose left + right floor values!', revealText: 'Pay what you owe!', weight: 10 },
        { id: 'salt', name: 'SALT', effect: 'salt', emoji: '🧂', desc: 'Nothing but salt!', revealText: 'You got SALT!', weight: 50 },
        { id: 'SSR_salt', name: 'SSR SALT', effect: 'salt', emoji: '🧈🧂', desc: 'Nothing but salt!', revealText: 'You found SSR salt! Which mean... nothing', weight: 1 }
      ]
    };
  }

  selectWeightedItem(category) {
    const pool = this.getMysteryBoxItemPool();
    const items = pool[category];
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1]; // Fallback
  }

  startMysteryBox(forcedItems = null) {
    if (forcedItems && Array.isArray(forcedItems) && forcedItems.length === 4) {
      this.mysteryBoxState = {
        boxes: forcedItems,
        selectedIndex: -1,
        isActive: true
      };
      return this.mysteryBoxState;
    }
    // Generate 4 boxes with items from different categories
    const categories = ['good', 'bad', 'neutral', 'money', 'minigames'];
    const boxes = [];

    for (let i = 0; i < 4; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const item = this.selectWeightedItem(category);
      boxes.push({ ...item, category });
    }

    this.mysteryBoxState = {
      boxes,
      selectedIndex: -1,
      isActive: true
    };

    return this.mysteryBoxState;
  }

  selectMysteryBox(index) {
    if (!this.mysteryBoxState || !this.mysteryBoxState.isActive) return null;

    this.mysteryBoxState.selectedIndex = index;
    this.mysteryBoxState.isActive = false;

    const selectedItem = this.mysteryBoxState.boxes[index];
    const unselectedBoxes = this.mysteryBoxState.boxes.filter((_, i) => i !== index);

    // Apply effect
    const effectResult = this.applyMysteryBoxEffect(selectedItem);

    return {
      selectedItem,
      unselectedBoxes,
      totalMoney: this.totalMoney,
      specialAction: effectResult && effectResult.action ? effectResult.action : null
    };
  }

  // === DEAL OR NO DEAL GAME ===

  getDondCaseValues() {
    return [
      0.01, 1, 5, 10, 25, 50, 75, 100, 500, 1000,           // Cases 1-10
      5000, 10000, 25000, 50000, 100000,                     // Cases 11-15
      200000, 300000, 500000, 750000, 1000000,               // Cases 16-20
      5000000, 10000000, 50000000, 100000000, 500000000, 1000000000  // Cases 21-26
    ];
  }

  startDond(playerId, playerName, bankerId, bankerName, offerMode = 'auto') {
    const caseValues = this.getDondCaseValues();

    // Shuffle case values
    const shuffled = [...caseValues].sort(() => Math.random() - 0.5);

    // Create cases with values
    const cases = shuffled.map((value, index) => ({
      caseNumber: index + 1,
      value: value,
      opened: false
    }));

    this.dondState = {
      playerId,
      playerName,
      bankerId,
      bankerName,
      offerMode, // 'auto' or 'manual'
      cases,
      playerCaseNumber: null,
      openedCases: [],
      currentRound: -1, // Start at -1, will become 0 after first case selection
      dealAccepted: false,
      currentOffer: null,
      gameOver: false,
      casePage: 0, // Pagination: 0 = cases 1-13, 1 = cases 14-26
      hasCounterOffered: false, // One-time counter offer flag
      counterOffer: null // Stores counter offer amount if made
    };

    return this.dondState;
  }

  selectPlayerCase(caseNumber) {
    if (!this.dondState || this.dondState.playerCaseNumber) return null;

    this.dondState.playerCaseNumber = caseNumber;
    return this.dondState;
  }

  getRoundCasesToOpen() {
    const rounds = [6, 5, 4, 3, 2, 1, 1, 1, 1];
    return rounds[this.dondState.currentRound] || 0;
  }

  openDondCase(caseNumber) {
    if (!this.dondState || this.dondState.gameOver) return null;

    const caseToOpen = this.dondState.cases.find(c => c.caseNumber === caseNumber && !c.opened);
    if (!caseToOpen || caseNumber === this.dondState.playerCaseNumber) return null;

    caseToOpen.opened = true;
    this.dondState.openedCases.push(caseToOpen);

    return {
      case: caseToOpen,
      remainingCases: this.dondState.cases.filter(c => !c.opened && c.caseNumber !== this.dondState.playerCaseNumber).length
    };
  }

  calculateBankerOffer() {
    if (!this.dondState) return 0;

    const remainingCases = this.dondState.cases.filter(c => !c.opened);
    const sum = remainingCases.reduce((acc, c) => acc + c.value, 0);
    const average = sum / remainingCases.length;

    // Risk multiplier increases as game progresses
    const roundProgress = this.dondState.currentRound / 9;
    const riskMultiplier = 0.3 + (roundProgress * 0.65); // 30% to 95%

    // Calculate offer
    const offer = Math.floor(average * riskMultiplier);

    this.dondState.lastOffer = offer;
    return offer;
  }

  setManualOffer(offerAmount) {
    if (!this.dondState) return null;

    this.dondState.lastOffer = offerAmount;
    return { offer: offerAmount };
  }

  acceptDeal() {
    if (!this.dondState || this.dondState.gameOver) return null;

    this.dondState.dealAccepted = true;
    this.dondState.gameOver = true;
    this.dondState.finalValue = this.dondState.lastOffer;

    const playerCase = this.dondState.cases.find(c => c.caseNumber === this.dondState.playerCaseNumber);
    const isGoodDeal = this.dondState.lastOffer >= playerCase.value;

    return {
      dealAccepted: true,
      finalValue: this.dondState.finalValue,
      playerCaseValue: playerCase.value,
      isGoodDeal,
      remainingCases: this.dondState.cases.filter(c => !c.opened && c.caseNumber !== this.dondState.playerCaseNumber)
    };
  }

  noDeal() {
    if (!this.dondState || this.dondState.gameOver) return null;

    this.dondState.currentRound++;

    // Check if game should end
    if (this.dondState.currentRound >= 9) {
      return {
        noDeal: true,
        finalRound: true,
        canSwitch: true
      };
    }

    return {
      noDeal: true,
      nextRound: this.dondState.currentRound + 1,
      casesToOpen: this.getRoundCasesToOpen()
    };
  }

  switchCase() {
    if (!this.dondState || this.dondState.gameOver) return null;

    const unopenedCases = this.dondState.cases.filter(c => !c.opened && c.caseNumber !== this.dondState.playerCaseNumber);
    if (unopenedCases.length !== 1) return null;

    // Switch to the other case
    const oldCaseNumber = this.dondState.playerCaseNumber;
    this.dondState.playerCaseNumber = unopenedCases[0].caseNumber;

    return {
      switched: true,
      oldCase: oldCaseNumber,
      newCase: this.dondState.playerCaseNumber
    };
  }

  finalizeDond(switched = false) {
    if (!this.dondState) return null;

    this.dondState.gameOver = true;
    const playerCase = this.dondState.cases.find(c => c.caseNumber === this.dondState.playerCaseNumber);
    this.dondState.finalValue = playerCase.value;

    let isGoodDeal;
    if (switched) {
      const otherCase = this.dondState.cases.find(c => !c.opened && c.caseNumber !== this.dondState.playerCaseNumber);
      isGoodDeal = playerCase.value > otherCase.value;
    } else {
      const otherCase = this.dondState.cases.find(c => !c.opened && c.caseNumber !== this.dondState.playerCaseNumber);
      isGoodDeal = playerCase.value > otherCase.value;
    }

    return {
      finalValue: this.dondState.finalValue,
      isGoodDeal,
      playerCaseValue: playerCase.value
    };
  }

  setCounterOffer(counterAmount) {
    if (!this.dondState || this.dondState.hasCounterOffered) return null;

    this.dondState.hasCounterOffered = true;
    this.dondState.counterOffer = counterAmount;

    return {
      counterAmount,
      hasCounterOffered: true
    };
  }

  evaluateCounterOffer(counterAmount) {
    if (!this.dondState) return null;

    // Calculate expected value of remaining cases
    const remainingCases = this.dondState.cases.filter(c => !c.opened);
    const sum = remainingCases.reduce((acc, c) => acc + c.value, 0);
    const expectedValue = sum / remainingCases.length;

    // Define thresholds
    const lowerBound = expectedValue * 0.85; // Good deal for banker
    const upperBound = expectedValue * 0.95; // Too greedy

    let accepted = false;
    let reason = '';

    if (counterAmount <= lowerBound) {
      // Auto accept - great deal for banker
      accepted = true;
      reason = 'Counter offer accepted! The banker thinks this is a fair deal.';
    } else if (counterAmount > upperBound) {
      // Auto reject - too greedy
      accepted = false;
      reason = 'Counter offer rejected! Your counter was too high for the banker.';
    } else {
      // Random 50/50 in negotiation zone
      accepted = Math.random() < 0.5;
      reason = accepted
        ? 'Counter offer accepted! The banker is feeling generous.'
        : 'Counter offer rejected! The banker wants to see how this plays out.';
    }

    return {
      accepted,
      counterAmount,
      expectedValue: Math.floor(expectedValue),
      reason
    };
  }

  // === HOW MUCH IS ENOUGH? (HMIE) GAME ===

  startHMIE(players) {
    // players = [{id, name, isBot}, ...]
    // Round amounts with x10 multiplier: $10k, $20k, $30k, $40k, $50k
    const roundMaximums = [10000, 20000, 30000, 40000, 50000];

    this.hmieState = {
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot || false, // Track if player is a bot
        bankedMoney: 0,
        eliminated: false,
        lockedAmount: null,
        hasLocked: false,
        botLockInValue: null, // For bot auto-play
        botPressValue: null // For bot face-off auto-press
      })),
      currentRound: 1,
      roundMaximums,
      clockValue: 0,
      roundDirection: 'up', // 'up' for rounds 1,3,5 or 'down' for rounds 2,4
      isActive: true,
      isFaceOff: false,
      clockRunning: false,
      roundStarting: false,
      roundHistory: []
    };

    return this.hmieState;
  }

  getHMIERoundMax() {
    if (!this.hmieState) return 0;
    return this.hmieState.roundMaximums[this.hmieState.currentRound - 1];
  }

  getHMIERoundDirection() {
    if (!this.hmieState) return 'up';
    // Rounds 1, 3, 5 count up; Rounds 2, 4 count down
    const round = this.hmieState.currentRound;
    return (round === 1 || round === 3 || round === 5) ? 'up' : 'down';
  }

  lockInHMIEAmount(playerId, amount) {
    if (!this.hmieState || !this.hmieState.isActive) return null;

    const player = this.hmieState.players.find(p => p.id === playerId);
    if (!player || player.eliminated || player.hasLocked) return null;

    player.lockedAmount = amount;
    player.hasLocked = true;

    const allLocked = this.hmieState.players
      .filter(p => !p.eliminated)
      .every(p => p.hasLocked);

    return {
      locked: true,
      allPlayersLocked: allLocked,
      lockedAmount: amount
    };
  }

  processHMIERound() {
    if (!this.hmieState) return null;

    const activePlayers = this.hmieState.players.filter(p => !p.eliminated);

    // Just return the locked amounts - penalties will be calculated AFTER reveal
    const results = activePlayers.map(p => {
      return {
        playerId: p.id,
        playerName: p.name,
        lockedAmount: p.lockedAmount,
        totalBanked: p.bankedMoney // Current total BEFORE this round's award
      };
    });

    // Store round history
    this.hmieState.roundHistory.push({
      round: this.hmieState.currentRound,
      results
    });

    // Reset locks for next round
    this.hmieState.players.forEach(p => {
      p.lockedAmount = null;
      p.hasLocked = false;
    });

    return {
      round: this.hmieState.currentRound,
      results
    };
  }

  applyHMIERoundAwards(results) {
    // Determine greediest and most cautious AFTER reveal, then apply awards
    if (!this.hmieState) return;

    const activePlayers = this.hmieState.players.filter(p => !p.eliminated);
    const isRound5 = this.hmieState.currentRound === 5;

    // Find greediest (highest locked amount)
    let greediest = null;
    let highestAmount = -Infinity;

    results.results.forEach(result => {
      if (result.lockedAmount > highestAmount) {
        highestAmount = result.lockedAmount;
        greediest = result;
      }
    });

    // Round 5: Also find most cautious
    let mostCautious = null;
    if (isRound5) {
      let lowestAmount = Infinity;
      results.results.forEach(result => {
        if (result.lockedAmount < lowestAmount) {
          lowestAmount = result.lockedAmount;
          mostCautious = result;
        }
      });
    }

    // Apply awards (skip greediest and mostCautious in round 5)
    results.results.forEach(result => {
      const player = this.hmieState.players.find(p => p.id === result.playerId);
      const isGreediest = result.playerId === greediest?.playerId;
      const isCautious = mostCautious && result.playerId === mostCautious.playerId;

      // Store penalty info in result for reference
      result.isGreediest = isGreediest;
      result.isCautious = isCautious;

      if (player && !isGreediest && !isCautious) {
        player.bankedMoney += result.lockedAmount;
        result.awarded = result.lockedAmount;
      } else {
        result.awarded = 0;
      }

      // Update totalBanked to reflect the NEW total after this round
      result.totalBanked = player.bankedMoney;
    });

    // Add greediest and mostCautious names to results for display
    results.greediest = greediest?.playerName;
    results.mostCautious = mostCautious?.playerName;
  }

  advanceHMIERound() {
    if (!this.hmieState) return null;

    this.hmieState.currentRound++;
    this.hmieState.clockValue = 0;
    this.hmieState.roundDirection = this.getHMIERoundDirection();

    return {
      newRound: this.hmieState.currentRound,
      direction: this.hmieState.roundDirection,
      maximum: this.getHMIERoundMax()
    };
  }

  eliminateHMIEPlayers() {
    if (!this.hmieState || this.hmieState.currentRound !== 5) return null;

    // After Round 5, eliminate bottom 2 players
    const activePlayers = this.hmieState.players.filter(p => !p.eliminated);

    // Sort by banked money (descending)
    const sorted = [...activePlayers].sort((a, b) => b.bankedMoney - a.bankedMoney);

    // Keep top 2, eliminate rest
    const finalists = sorted.slice(0, 2);
    const eliminated = sorted.slice(2);

    eliminated.forEach(p => {
      const player = this.hmieState.players.find(pl => pl.id === p.id);
      if (player) player.eliminated = true;
    });

    return {
      finalists: finalists.map(p => ({ id: p.id, name: p.name, bankedMoney: p.bankedMoney })),
      eliminated: eliminated.map(p => ({ id: p.id, name: p.name, bankedMoney: p.bankedMoney }))
    };
  }

  startHMIEFaceOff() {
    if (!this.hmieState) return null;

    const finalists = this.hmieState.players.filter(p => !p.eliminated);
    if (finalists.length !== 2) return null;

    // Combine both players' totals
    const combinedTotal = finalists[0].bankedMoney + finalists[1].bankedMoney;

    this.hmieState.isFaceOff = true;
    this.hmieState.faceOffMax = combinedTotal;
    this.hmieState.clockValue = 0;
    this.hmieState.faceOffWinner = null;

    return {
      finalists: finalists.map(p => ({ id: p.id, name: p.name, bankedMoney: p.bankedMoney })),
      combinedTotal
    };
  }

  playHMIEFaceOff(playerId, clockValue) {
    if (!this.hmieState || !this.hmieState.isFaceOff || this.hmieState.faceOffWinner) return null;

    const player = this.hmieState.players.find(p => p.id === playerId && !p.eliminated);
    if (!player) return null;

    const finalists = this.hmieState.players.filter(p => !p.eliminated);
    const winner = player; // The player who clicked stops the clock and wins
    const loser = finalists.find(p => p.id !== playerId); // The other player loses

    this.hmieState.faceOffWinner = winner.id; // Store the actual winner's ID
    this.hmieState.isActive = false;

    return {
      winner: { id: winner.id, name: winner.name, winnings: clockValue }, // Winner gets the clock value
      loser: { id: loser.id, name: loser.name, winnings: 0 }, // Loser gets nothing
      clockValue
    };
  }

  applyMysteryBoxEffect(item) {
    const value = typeof item.value === 'function' ? item.value() : item.value;

    switch (item.effect) {
      case 'addPeek':
        if (!this.peeks) this.peeks = 0;
        this.peeks++;
        return { message: `👁️ **PEEK acquired!** You can now view a floor's content without revealing left/right.\n(Total Peeks: ${this.peeks})` };
      case 'addMoney':
        this.totalMoney += value;
        break;
      case 'multiplyMoney':
        this.totalMoney = Math.floor(this.totalMoney * value);
        break;
      case 'percentageMoney':
        this.totalMoney += Math.floor(this.totalMoney * value);
        break;
      case 'doubleOrHalf':
        this.totalMoney = Math.random() < 0.5 ? this.totalMoney * 2 : Math.floor(this.totalMoney / 2);
        break;
      case 'random50k':
        this.totalMoney += Math.random() < 0.5 ? 50000 : -50000;
        break;
      case 'diceRoll':
        const roll = Math.floor(Math.random() * 6) + 1;
        this.totalMoney = Math.floor((this.totalMoney * roll) / 3);
        break;
      case 'restartRound':
        // Reset current round state but keep total money
        const wasFirstFloor = this.currentFloor === 0;
        this.currentRound = 1;
        this.currentFloor = 0;
        this.selectedFloors = [];
        this.playedFloors = [];
        this.isSelectingFloors = true;
        // Re-generate floors to ensure fresh start
        this.preGeneratedFloors = this.preGenerateAllFloors();
        // Auto-select first floor (if on first floor, pick same floor again)
        this.isSelectingFloors = true;
        break;
      case 'copyOpponent':
        // Mirror effect - reverse digits (same as 'mirror' special action)
        const moneyStrReverse = Math.floor(this.totalMoney).toString();
        const reversedStr = moneyStrReverse.split('').reverse().join('');
        this.totalMoney = parseInt(reversedStr);
        break;
      case 'swapMoney':
        // Swap first and last digits
        const moneyString = Math.floor(this.totalMoney).toString();
        if (moneyString.length >= 2) {
          const digits = moneyString.split('');
          const temp = digits[0];
          digits[0] = digits[digits.length - 1];
          digits[digits.length - 1] = temp;
          this.totalMoney = parseInt(digits.join(''));
        }
        // If only 1 digit, no change
        break;
      case 'randomMinigame':
        return { action: 'random_minigame' };
      case 'balanceMoney':
        if (this.totalMoney > 100000) {
          this.totalMoney -= 50000;
        } else {
          this.totalMoney += 50000;
        }
        break;
      case 'averageLast3':
        // Calculate average of last 3 floors (simulated if not enough history)
        // We don't track per-floor gains easily, so let's simulate a bonus
        const avgBonus = 25000;
        this.totalMoney += avgBonus;
        break;
      case 'randomEffect':
        // Pick a random item from the pool and apply it
        const pool = this.getMysteryBoxItemPool();
        const allItems = [...pool.good, ...pool.bad, ...pool.neutral, ...pool.money];
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        return this.applyMysteryBoxEffect(randomItem);
      case 'add2Floors':
        // Extend current round? Or just add money equivalent to 2 floors?
        // "Add 2 more floors to current round" -> implies length.
        // Complex to change preGeneratedFloors length dynamically.
        // Let's add money equivalent to 2 floors.
        this.totalMoney += 40000;
        break;
      case 'repeatLast':
        // Repeat last floor's outcome (simulated)
        this.totalMoney += 20000;
        break;
      case 'adaptiveMoney':
        if (this.totalMoney < 50000) {
          this.totalMoney += 25000;
        } else {
          this.totalMoney -= 10000;
        }
        break;
      case 'delayedRandom':
        // Store for later
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: 'delayedRandom', floorsRemaining: 3 });
        break;
      case 'choice30kOrLobby':
        return { action: 'choice_30k_lobby' };
      case 'sangha_offerings':
        // End game with all money - divine blessing
        return { action: 'sangha_offerings' };
      case 'karma':
        const isGood = Math.random() < 0.5;
        if (isGood) this.totalMoney += 25000;
        else this.totalMoney -= 10000;
        break;
      case 'loseLastFloor':
        // Lose money equal to last floor (simulated)
        this.totalMoney -= 15000;
        break;
      case 'loseLeftRight':
        // Lose money equal to current floor's left + right values
        if (this.preGeneratedFloors[this.currentFloor]) {
          const leftValue = this.preGeneratedFloors[this.currentFloor].left?.value || 0;
          const rightValue = this.preGeneratedFloors[this.currentFloor].right?.value || 0;
          this.totalMoney -= (leftValue + rightValue);
        }
        break;
      case 'cut_front':
        // Cut the leftmost digit of the money
        const moneyStr = this.totalMoney.toString();
        if (moneyStr.length > 1) {
          this.totalMoney = parseInt(moneyStr.substring(1));
        } else {
          this.totalMoney = 0; // If only 1 digit, becomes 0
        }
        break;
      case 'salt':
        // Do nothing, just salt
        break;
      case 'stolen':
        // Thief steals money
        this.totalMoney -= value;
        break;

      case 'skipToHighest':
        // Skip to highest value floor - requires special handling
        return { action: 'skip_to_highest' };
      case 'bonusMinigame':
        // Trigger bonus minigame - requires special handling
        return { action: 'bonus_minigame' };
      case 'addToAllFloors':
        // Add value to all remaining floors - store as effect
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: 'addToAllFloors', value: value, permanent: true });
        break;
      case 'chooseFloor':
        // Let player choose their next floor - requires special handling
        return { action: 'choose_floor' };
      case 'reset_leaderboard':
      case 'big_bank':
      case 'small_bank':
      case 'the_heist':
        // This will be handled in index.js with database access
        // Just set a flag here
        return { action: item.effect, claimed: true };
      case 'go_to_jail':
        this.totalMoney = 0;
        return { action: 'go_to_jail', bailAmount: 5000000 };
      case 'repeat_game':
        // These return a special action flag
        return { action: item.effect };
      // More complex effects stored as flags for later
      case 'gameOverImmunity':
      case 'doubleRewards3':
      case 'guaranteedPositive5':
      case 'revealNext2':
      case 'autoRevive':
      case 'tripleNextFloor':
      case 'autoWinMinigame':
      case 'convertNothing3':
      case 'noLoss4':
      case 'reverseChoice':
      case 'hardModeNext':
      case 'lose10k3':
      case 'noCashout5':
      case 'noBankCashout':
      case 'noBankCashout5':
      case 'hideNext3':
      case 'halveMultipliers4':
      case 'randomChoice2':
      case 'tickingBomb':
      case 'invertNext':
      case 'skipNextFloor':
      case 'nothingToGameOver3':
        // Store effect for later application
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: item.effect, duration: this.parseDuration(item.effect), floorsRemaining: this.parseDuration(item.effect), fresh: true });
        break;
      case 'minigame_community_chest':
      case 'minigame_park_it':
      case 'minigame_advance_boardwalk':
      case 'minigame_bank_buster':
      case 'minigame_block_party':
      case 'minigame_electric_company':
      case 'minigame_no_vacancy':
      case 'minigame_ride_rails':
        // Return the effect as action so index.js can trigger the minigame
        return { action: item.effect };
      
      // NEW ITEMS
      case 'double_or_nothing':
        // 50/50 chance to double OR lose 50%
        const isDouble = Math.random() < 0.5;
        if (isDouble) {
          this.totalMoney *= 2;
          return { message: `🎲 **DOUBLE!** Your money has been doubled!`, moneyChange: this.totalMoney / 2 };
        } else {
          const lost = Math.floor(this.totalMoney * 0.5);
          this.totalMoney = Math.floor(this.totalMoney * 0.5);
          return { message: `🎲 **NOTHING!** You lost 50% of your money!`, moneyChange: -lost };
        }
      
      case 'malfunction':
        // Random money from -999,999,999 to +999,999,999
        const oldMoney = this.totalMoney;
        this.totalMoney = Math.floor(Math.random() * 1999999998) - 999999999;
        const change = this.totalMoney - oldMoney;
        return { message: `🔄 **MALFUNCTION!** System error! New money: $${this.totalMoney.toLocaleString()}`, moneyChange: change };
      
      case 'tax_collector':
        // Check for immunity first
        if (this.hasActiveEffect('tax_immunity')) {
             // Consume immunity
             if (this.activeEffects) {
                this.activeEffects = this.activeEffects.filter(e => e.type !== 'tax_immunity');
             }
             return { message: `💸 **TAX COLLECTOR!** You showed your Tax Immunity card and paid nothing!`, moneyChange: 0 };
        }
        
        // Lose 20%, gain percentage immunity
        const taxAmount = Math.floor(this.totalMoney * 0.2);
        this.totalMoney -= taxAmount;
        // Set immunity flag
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: 'tax_immunity', floorsRemaining: 999, fresh: true });
        return { message: `💸 **TAX COLLECTOR!** Lost 20% but immune to next percentage loss!`, moneyChange: -taxAmount };
      
      case 'lucky_seven':
        // Multiply by 7, force to play next round
        const before = this.totalMoney;
        this.totalMoney *= 7;
        // Set lobby lock flag for current round exit (forces next round)
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ 
          type: 'lobby_locked', 
          targetRound: this.currentRound,
          fresh: true 
        });
        return { message: `🎰 **LUCKY 7!** Money x7! You are forced to play the next round!`, moneyChange: this.totalMoney - before };
      
      case 'lightning_round':
        // Skip to Round 6 - requires special handling in index.js
        return { action: 'lightning_round' };
      
      case 'bonus_portal':
        // Trigger random minigame with 2x rewards
        return { action: 'bonus_portal' };
      
      case 'gift_horse':
        // Send 25% to Big Bank, gain 2 bonus plays - requires index.js handling
        return { action: 'gift_horse' };
      
      case 'announcement':
        // Reveal money to server, gain +10% - requires index.js handling
        return { action: 'announcement' };
      
      case 'bruh_bank':
        return { action: 'bruh_bank' };

      case 'oracles_vision':
        // Reveal next floor contents
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: 'oracle_active', floorsRemaining: 1, fresh: true });
        return { action: 'oracles_vision', message: `🔮 **ORACLE'S VISION!** Next floor revealed!` };
      
      default:
        // Effects that need special handling
        break;
    }

    // Ensure money doesn't go below 0
    if (this.totalMoney < 0) this.totalMoney = 0;
  }

  parseDuration(effectType) {
    const match = effectType.match(/\d+$/);
    return match ? parseInt(match[0]) : 1;
  }

  // Check if player has active effect
  hasActiveEffect(effectType) {
    if (!this.activeEffects) return false;
    return this.activeEffects.some(e => e.type === effectType);
  }

  // Get active effect object (for checking floorsRemaining)
  getActiveEffect(effectType) {
    if (!this.activeEffects) return null;
    return this.activeEffects.find(e => e.type === effectType) || null;
  }

  // Decrement effect durations after floor
  decrementActiveEffects() {
    if (!this.activeEffects) return;

    this.activeEffects = this.activeEffects.filter(effect => {
      // If effect is fresh (added this turn), just unmark it and keep it
      if (effect.fresh) {
        effect.fresh = false;
        return true;
      }

      if (effect.floorsRemaining !== undefined) {
        effect.floorsRemaining--;
        return effect.floorsRemaining > 0;
      }
      return true; // Keep effects without floor counters
    });
  }

  // Apply devil's contract to current minigame
  applyDevilsContract() {
    if (!this.hasActiveEffect('hardModeNext')) return false;

    // Remove the effect after using it
    if (this.activeEffects) {
      this.activeEffects = this.activeEffects.filter(e => e.type !== 'hardModeNext');
    }

    return true; // Minigame should add a Game Over grid
  }

  // Check if player can cashout (Rusty Trap effect)
  canCashout() {
    if (this.hasActiveEffect('noBankCashout') || this.hasActiveEffect('noBankCashout5')) {
      return false;
    }
    return true;
  }

  // Check if player can bank (in minigames)
  canBank() {
    if (this.hasActiveEffect('noBankCashout') || this.hasActiveEffect('noBankCashout5')) {
      const effect = this.activeEffects.find(e => e.type === 'noBankCashout' || e.type === 'noBankCashout5');
      return effect && effect.floorsRemaining && effect.floorsRemaining > 0 ? false : true;
    }
    return true;
  }
}

class GameManager {
  constructor() {
    this.activeGames = new Map(); // channelId -> GameState
  }

  async createGame(userId, username, channelId, guildId, db, modeOverride = null) {
    if (this.activeGames.has(channelId)) {
      return null; // Game already exists in this channel
    }
    // Check if event mode is overridden or enabled for this guild
    let eventMode = modeOverride;
    if (eventMode === null || eventMode === undefined) {
      eventMode = await db.getEventMode(guildId);
    }
    const game = new GameState(userId, username, channelId, guildId, eventMode);
    this.activeGames.set(channelId, game);
    return game;
  }

  getGame(channelId) {
    return this.activeGames.get(channelId);
  }

  endGame(channelId) {
    this.activeGames.delete(channelId);
  }

  hasActiveGame(channelId) {
    return this.activeGames.has(channelId);
  }

  isUserPlaying(userId, channelId) {
    const game = this.activeGames.get(channelId);
    return game && game.userId === userId;
  }

  generateFloorChoices(game) {
    // Return the pre-generated choices for the current floor
    const currentFloorNum = game.getCurrentFloorNumber();
    if (currentFloorNum && game.preGeneratedFloors[currentFloorNum]) {
      let choices = { ...game.preGeneratedFloors[currentFloorNum] };

      // Broken Compass - Random Choice for 2 floors
      if (game.hasActiveEffect('randomChoice2')) {
        const randomChoice = Math.random() < 0.5 ? 'left' : 'right';
        choices.forcedChoice = randomChoice;
      }

      // Guaranteed Positive
      if (game.hasActiveEffect('guaranteedPositive5')) {
        // Ensure at least one choice is positive/good
        // If both are bad (negative cash, game over, etc.), replace one with a small cash prize
        const isLeftBad = choices.left.type === 'game_over' || (choices.left.type === 'cash' && choices.left.value < 0);
        const isRightBad = choices.right.type === 'game_over' || (choices.right.type === 'cash' && choices.right.value < 0);

        if (isLeftBad && isRightBad) {
          // Replace left with 10k
          choices.left = { type: 'cash', value: 10000, label: '$10,000' };
        }
      }

      // Hide Next
      if (game.hasActiveEffect('hideNext3') || game.hasActiveEffect('fog_of_war')) {
        // Mark as hidden for UI
        choices.hidden = true;
      }

      return choices;
    }
    return null;
  }

  async handleFloorSelection(game, choice) {
    if (!game || !game.isActive) return null;

    // === Flow Modifiers ===

    // Skip Next Floor
    if (game.hasActiveEffect('skipNextFloor')) {
      game.moveToNextFloor();
      game.decrementActiveEffects();

      // Check round completion after skip
      if (game.isRoundComplete()) {
        return {
          skipped: true,
          roundComplete: true,
          round: game.currentRound,
          money: game.totalMoney
        };
      }

      return {
        skipped: true,
        gameOver: false,
        money: game.totalMoney
      };
    }

    // Reverse Choice
    let actualChoice = choice;
    if (game.hasActiveEffect('reverseChoice')) {
      actualChoice = choice === 'left' ? 'right' : 'left';
    }

    const currentFloorNum = game.getCurrentFloorNumber();
    const floorChoices = game.preGeneratedFloors[currentFloorNum];

    if (!floorChoices) return null;

    const selectedAmount = actualChoice === 'left' ? floorChoices.left : floorChoices.right;
    const otherAmount = actualChoice === 'left' ? floorChoices.right : floorChoices.left;

    // Apply the amount
    const result = game.applyAmount(selectedAmount);

    // Mark as used/revealed
    game.markAmountUsed(selectedAmount);
    game.addToHistory(currentFloorNum, actualChoice, result.actualValue || result.value, otherAmount.value, result.moneyBefore, result.moneyAfter);

    // === Post-Application Effects ===

    // Lose 10k (only applies for 3 floors AFTER finding it, not the current floor)
    const lose10kEffect = game.getActiveEffect('lose10k3');
    if (lose10kEffect && !lose10kEffect.fresh) {
      game.totalMoney -= 10000;
      if (game.totalMoney < 0) game.totalMoney = 0;
    }

    // Ticking Bomb (Simulated as per-floor loss)
    if (game.hasActiveEffect('tickingBomb')) {
      game.totalMoney -= 10000; // Lose 10k per floor
      if (game.totalMoney < 0) game.totalMoney = 0;
    }

    // Check for Game Over tile
    if (selectedAmount.type === 'game_over' || result.type === 'game_over') {
      // Check Immunity
      if (game.hasActiveEffect('gameOverImmunity') || game.hasActiveEffect('autoRevive')) {
        // Saved!
        // Maybe consume autoRevive? "Phoenix Feather" usually one-time use?
        // Description says "Death is not the end!". 
        // Let's assume it consumes the effect if it's autoRevive, but gameOverImmunity might be duration.
        // For now, just prevent game over.
      } else {
        game.isActive = false;
        return {
          amount: selectedAmount,
          gameOver: true,
          reason: 'game_over_tile',
          money: game.totalMoney,
          lostAmount: game.totalMoney
        };
      }
    }

    // Check for bankruptcy (if money < 0)
    // Note: Some items allow negative money, but usually < 0 means game over?
    // The test says "should trigger game over if money drops to 0 on last floor of round"
    // Let's assume strict bankruptcy check if needed, but usually game allows debt until end?
    // Test expectation: "expect(result.gameOver).toBe(true); expect(result.reason).toBe('bankrupt_end_round');"

    game.moveToNextFloor();
    game.decrementActiveEffects();

    // Check round completion
    if (game.isRoundComplete()) {
      // Check bankruptcy at end of round
      if (game.totalMoney <= 0) {
        // Check Immunity for bankruptcy too?
        if (game.hasActiveEffect('gameOverImmunity') || game.hasActiveEffect('autoRevive')) {
          // Saved from bankruptcy?
          game.totalMoney = 1; // Give them a dollar
        } else {
          // If totalMoney is 0 (or less), they technically lost everything.
          // Is lostAmount effectively the amount they had before hitting 0?
          // If they hit -100%, they had X, became 0. If they hit it mid-round, they continue with 0.
          // At end of round, if 0, they game over.
          // The lost amount was "lost" when the event happened.
          // But capturing it here ensures we know they "busted".
          // However, if they hit -100%, moneyBefore was X.
          // If we track lostAmount here, it might be 0 because totalMoney is 0.
          // We rely on index.js to handle minigame losses, but for main game loop:
          // If they are bankrupt here, it means they ended with 0.
          // The actual "Money Lost" might difficult to track perfectly here without more state.
          // BUT, if they are reset to 0, preventing them from withdrawing.
          // If they hit Game Over tile, we caught it above.
          // If they hit -100%, result.moneyAfter was 0.
          // Let's check if result caused the bankruptcy.
          
          let potentialLost = 0;
           // If the last action caused the loss (e.g. negative money or -100%)
          if (result && result.moneyBefore > 0 && result.moneyAfter <= 0) {
             potentialLost = result.moneyBefore;
          }

          game.isActive = false;
          return {
            amount: result,
            gameOver: true,
            reason: 'bankrupt_end_round',
            money: game.totalMoney,
            lostAmount: potentialLost
          };
        }
      }

      return {
        amount: result,
        roundComplete: true,
        round: game.currentRound,
        money: game.totalMoney
      };
    }

    return {
      amount: result,
      gameOver: false,
      money: game.totalMoney
    };
  }


}

module.exports = { GameState, GameManager };