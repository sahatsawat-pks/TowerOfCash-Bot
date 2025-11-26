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
    this.eventMode = eventMode;
    this.currentRound = 1; // 1-6 for normal mode, 1-7 for Season 1 mode
    this.currentFloor = 0; // Current floor index in selected floors
    this.totalMoney = 0;
    this.selectedFloors = []; // Floors selected for current round (from 1-28)
    this.floorsToSelect = config.roundFloors[0]; // 6 floors for first round
    this.gameHistory = []; // Track all choices
    this.isSelectingFloors = true; // Start with floor selection
    this.isSelectingSide = false;
    this.currentFloorChoices = null;
    this.floorsCompleted = 0;
    this.playedFloors = []; // Track all floors played across all rounds
    this.floorSelectionPage = 0; // Track pagination for floor selection (0 = floors 1-14, 1 = floors 15-28)
    this.preGeneratedFloors = this.preGenerateAllFloors(); // Pre-generate all 28 floors at game start
    this.remainingAmounts = this.initializeRemainingAmounts(); // Track what amounts are still available
    this.vaultState = null; // For The Vault minigame state
    this.operatorOfferState = null; // For Operator Offer state
    this.megaGridState = null; // For Mega Grid minigame state
    this.infinityPercentState = null; // For The ∞% minigame state
    this.hideoutBreakthroughState = null; // For Hideout Breakthrough minigame state
    this.babushkaState = null; // For Babushka minigame state
  }

  initializeRemainingAmounts() {
    // Create a deep copy of game amounts with count tracking
    // This reads from the pre-generated floors to get the ACTUAL amounts (including event tiles)
    const amounts = {};

    // Count amounts from the pre-generated floors instead of config
    for (let floorNum = 1; floorNum <= 28; floorNum++) {
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

    // If event mode is enabled, replace 3 "Nothing" entries with event tiles
    if (this.eventMode) {
      const nothingIndices = [];
      allAmounts.forEach((amount, index) => {
        if (amount.type === 'nothing') {
          nothingIndices.push(index);
        }
      });

      // Replace first 10 Nothing entries with event tiles (8 minigames + 2 Mystery Boxes)
      if (nothingIndices.length >= 10) {
        allAmounts[nothingIndices[0]] = { type: 'event', action: 'vault', label: 'The Vault' };
        allAmounts[nothingIndices[1]] = { type: 'event', action: 'operator_offer', label: 'Operator Offer' };
        allAmounts[nothingIndices[2]] = { type: 'event', action: 'hideout_breakthrough', label: ' Breakthrough' };
        allAmounts[nothingIndices[3]] = { type: 'event', action: 'babushka', label: 'Babushka' };
        allAmounts[nothingIndices[4]] = { type: 'event', action: 'mega_grid', label: 'Mega Grid' };
        allAmounts[nothingIndices[5]] = { type: 'event', action: 'infinity_percent', label: 'The ∞%' };
        allAmounts[nothingIndices[6]] = { type: 'event', action: 'boiling_point', label: 'Boiling Point' };
        allAmounts[nothingIndices[7]] = { type: 'event', action: 'operator_roshambo', label: 'Operator Roshambo' };
        allAmounts[nothingIndices[8]] = { type: 'event', action: 'mystery_box', label: 'Mystery Box' };
        allAmounts[nothingIndices[9]] = { type: 'event', action: 'mystery_box', label: 'Mystery Box' };
      }

      // Replace next 1 Nothing entry with Random ±% tile
      if (nothingIndices.length >= 11) {
        allAmounts[nothingIndices[10]] = { type: 'special', action: 'random_percentage', label: 'Random ±%' };
      }

      // Leave remaining 3 as Nothing (indices 11, 12, 13)
    }

    // Shuffle the amounts
    for (let i = allAmounts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAmounts[i], allAmounts[j]] = [allAmounts[j], allAmounts[i]];
    }

    // Pre-generate all 28 floors with left/right choices
    const floors = {};
    for (let floorNum = 1; floorNum <= 28; floorNum++) {
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
    this.floorsToSelect = config.roundFloors[this.currentRound - 1];
    this.isSelectingFloors = true;
    this.isSelectingSide = false;
  }

  getAvailableFloors() {
    // Return floors from 1-26 that haven't been played yet
    const available = [];
    for (let i = 1; i <= 28; i++) {
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
    return this.currentRound >= config.roundFloors.length;
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

    if (amount.type === 'cash') {
      this.totalMoney += amount.value;
    } else if (amount.type === 'percentage') {
      const change = Math.floor((this.totalMoney * amount.value) / 100);
      this.totalMoney += change;
      if (this.totalMoney < 0) this.totalMoney = 0;
    } else if (amount.type === 'random') {
      const randomValue = amount.generatedValue || Math.floor(Math.random() * (amount.max - amount.min + 1)) + amount.min;
      this.totalMoney += randomValue;
      return { ...amount, actualValue: randomValue, moneyBefore, moneyAfter: this.totalMoney };
    } else if (amount.type === 'special') {
      if (amount.action === 'add_zero') {
        this.totalMoney = this.totalMoney * 10;
      } else if (amount.action === 'add_one') {
        const moneyStr = this.totalMoney.toString();
        this.totalMoney = parseInt('1' + moneyStr);
      } else if (amount.action === 'boost_multiplier') {
        const multiplier = parseFloat(amount.generatedValue || (Math.random() * 3).toFixed(2));
        this.totalMoney = Math.floor(this.totalMoney * multiplier);
        return { ...amount, actualValue: multiplier, moneyBefore, moneyAfter: this.totalMoney };
      }
    } else if (amount.type === 'nothing') {
      // Do nothing
    } else if (amount.type === 'game_over') {
      // Handled elsewhere
    }

    return { ...amount, moneyBefore, moneyAfter: this.totalMoney };
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
      history: []
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

    const tile = this.megaGridState.grid[choiceIndex];
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
      isActive: true,
      round: 0,
      history: [] // Track all picks
    };
    return this.infinityPercentState;
  }

  playInfinityPercentRound(choice) {
    if (!this.infinityPercentState || !this.infinityPercentState.isActive) return null;

    this.infinityPercentState.round++;

    // 50/50 chance
    const isCorrect = Math.random() < 0.5;

    const result = {
      round: this.infinityPercentState.round,
      choice,
      isCorrect,
      strikes: this.infinityPercentState.strikes,
      accumulatedPercent: this.infinityPercentState.accumulatedPercent,
      gameOver: false
    };

    if (isCorrect) {
      this.infinityPercentState.accumulatedPercent += 5;
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
      totalMoney: this.totalMoney
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
        return `${amount.label}: $${this.formatMoney(amount.actualValue)}`;
      }
      return `${amount.label} ($${this.formatMoney(amount.min)}-$${this.formatMoney(amount.max)})`;
    } else if (amount.type === 'special' || amount.type === 'event' || amount.type === 'nothing' || amount.type === 'game_over') {
      return amount.label;
    }
    return 'Unknown';
  }

  getUnplayedFloors() {
    // Return what was behind all unplayed floors
    const unplayed = [];
    for (let floorNum = 1; floorNum <= 28; floorNum++) {
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
        { id: 'golden_shield', name: 'Golden Shield', effect: 'gameOverImmunity', emoji: '🛡️', desc: 'Protected from disaster!', weight: 5 },
        { id: 'money_magnet', name: 'Money Magnet', effect: 'doubleRewards3', emoji: '🧲', desc: 'Everything you touch turns to gold!', weight: 8 },
        { id: 'lucky_clover', name: 'Lucky Clover', effect: 'guaranteedPositive5', emoji: '🍀', desc: 'Luck is on your side!', weight: 10 },
        { id: 'instant_jackpot', name: 'Instant Jackpot', effect: 'addMoney', value: () => 100000 + Math.floor(Math.random() * 400000), emoji: '💎', desc: 'Jackpot! Fortune smiles upon you!', weight: 3 },
        { id: 'vision_stone', name: 'Vision Stone', effect: 'revealNext2', emoji: '🔮', desc: 'The future is clear!', weight: 12 },
        { id: 'treasure_map', name: 'Treasure Map', effect: 'addToAllFloors', value: 50000, emoji: '🗺️', desc: 'Everything just got more valuable!', weight: 6 },
        { id: 'phoenix_feather', name: 'Phoenix Feather', effect: 'autoRevive', emoji: '🪶', desc: 'Death is not the end!', weight: 4 },
        { id: 'crown_greed', name: 'Crown of Greed', effect: 'tripleNextFloor', emoji: '👑', desc: 'Royalty has its privileges!', weight: 9 },
        { id: 'angel_wing', name: 'Angel Wing', effect: 'autoWinMinigame', emoji: '👼', desc: 'Victory is guaranteed!', weight: 5 },
        { id: 'midas_touch', name: 'Midas Touch', effect: 'convertNothing3', emoji: '✋', desc: 'Turn nothing into something!', weight: 10 },
        { id: 'safety_net', name: 'Safety Net', effect: 'noLoss4', emoji: '🪂', desc: 'Risk-free zone activated!', weight: 11 },
        { id: 'divine_intervention', name: 'Divine Intervention', effect: 'skipToHighest', emoji: '✨', desc: 'The gods favor you!', weight: 4 },
        { id: 'golden_ticket', name: 'Golden Ticket', effect: 'bonusMinigame', emoji: '🎫', desc: 'Exclusive opportunity unlocked!', weight: 7 },
        { id: 'time_reversal', name: 'Time Reversal', effect: 'undoLast', emoji: '⏪', desc: 'Second chance granted!', weight: 3 },
        { id: 'wish_granter', name: 'Wish Granter', effect: 'chooseFloor', emoji: '⭐', desc: 'Your wish is my command!', weight: 3 }
      ],
      bad: [
        { id: 'black_hole', name: 'Black Hole', effect: 'multiplyMoney', value: 0.5, emoji: '🕳️', desc: 'Your fortune vanishes into the void!', weight: 5 },
        { id: 'cursed_mirror', name: 'Cursed Mirror', effect: 'reverseChoice', emoji: '🪞', desc: 'Reality inverts around you!', weight: 8 },
        { id: 'devils_contract', name: 'Devil\'s Contract', effect: 'hardModeNext', emoji: '😈', desc: 'Next minigame change 1 grid to game over!', weight: 7 },
        { id: 'poison_chalice', name: 'Poison Chalice', effect: 'lose10k3', emoji: '☠️', desc: 'Every step costs you dearly!', weight: 10 },
        { id: 'bankruptcy_bill', name: 'Bankruptcy Bill', effect: 'addMoney', value: -100000, emoji: '📜', desc: 'The taxman cometh!', weight: 4 },
        { id: 'rusty_trap', name: 'Rusty Trap', effect: 'noBankCashout', emoji: '⚙️', desc: 'Can\'t bank next 5 floors and can\'t cashout this round!', weight: 9 },
        { id: 'fog_of_war', name: 'Fog of War', effect: 'hideNext3', emoji: '🌫️', desc: 'Blind choices lie ahead!', weight: 11 },
        { id: 'gravity_well', name: 'Gravity Well', effect: 'multiplyMoney', value: 0.2, emoji: '⬇️', desc: 'Everything falls down!', weight: 3 },
        { id: 'sabotage_kit', name: 'Sabotage Kit', effect: 'halveMultipliers4', emoji: '🔧', desc: 'Your luck has been sabotaged!', weight: 8 },
        { id: 'thiefs_shadow', name: 'Thief\'s Shadow', effect: 'stolen', value: () => 10000 + Math.floor(Math.random() * 40000), emoji: '🥷', desc: 'A thief in the night!', weight: 6 },
        { id: 'broken_compass', name: 'Broken Compass', effect: 'randomChoice2', emoji: '🧭', desc: 'You\'ve lost your way!', weight: 10 },
        { id: 'time_bomb', name: 'Time Bomb', effect: 'tickingBomb', emoji: '💣', desc: 'Tick tock, tick tock...', weight: 5 },
        { id: 'snake_bite', name: 'Snake Bite', effect: 'invertNext', emoji: '🐍', desc: 'Poison corrupts everything!', weight: 9 },
        { id: 'locked_door', name: 'Locked Door', effect: 'skipNextFloor', emoji: '🔒', desc: 'The path forward is blocked!', weight: 8 },
        { id: 'bad_omen', name: 'Bad Omen', effect: 'nothingToGameOver3', emoji: '🌩️', desc: 'Disaster looms ahead!', weight: 7 }
      ],
      neutral: [
        { id: 'chaos_orb', name: 'Chaos Orb', effect: 'random50k', emoji: '🔴', desc: 'Embrace the chaos!', weight: 15 },
        { id: 'gamblers_dice', name: 'Gambler\'s Dice', effect: 'diceRoll', emoji: '🎲', desc: 'Let the dice decide!', weight: 12 },
        { id: 'memory_wipe', name: 'Memory Wipe', effect: 'restartRound', emoji: '💭', desc: 'A fresh start!', weight: 8 },
        { id: 'trade_winds', name: 'Trade Winds', effect: 'swapMoney', emoji: '🌪️', desc: 'The winds of change!', weight: 10 },
        { id: 'question_mark', name: 'Question Mark', effect: 'randomMinigame', emoji: '❓', desc: 'Mystery awaits!', weight: 13 },
        { id: 'balance_scale', name: 'Balance Scale', effect: 'balanceMoney', emoji: '⚖️', desc: 'Seeking equilibrium!', weight: 14 },
        { id: 'wild_card', name: 'Wild Card', effect: 'randomEffect', emoji: '🃏', desc: 'Anything can happen!', weight: 8 },
        { id: 'hourglass', name: 'Hourglass', effect: 'add2Floors', emoji: '⏳', desc: 'Time expands!', weight: 11 },
        { id: 'echo_chamber', name: 'Echo Chamber', effect: 'repeatLast', emoji: '📢', desc: 'History repeats itself!', weight: 13 },
        { id: 'mood_ring', name: 'Mood Ring', effect: 'adaptiveMoney', emoji: '💍', desc: 'Adapts to your fortune!', weight: 9 },
        { id: 'butterfly', name: 'Butterfly Effect', effect: 'delayedRandom', emoji: '🦋', desc: 'Small actions, big consequences!', weight: 7 },
        { id: 'crossroads', name: 'Crossroads', effect: 'choice30kOrLobby', emoji: '🚦', desc: 'A choice must be made!', weight: 6 },
        { id: 'recycler', name: 'Recycler', effect: 'averageLast3', emoji: '♻️', desc: 'Efficiency over quantity!', weight: 10 },
        { id: 'mirror_match', name: 'Mirror Match', effect: 'copyOpponent', emoji: '🪩', desc: 'Imitation is flattery!', weight: 12 },
        { id: 'karma_wheel', name: 'Karma Wheel', effect: 'karma', emoji: '☯️', desc: 'What goes around comes around!', weight: 12 }
      ],
      money: [
        { id: 'pennies', name: 'Pennies', effect: 'addMoney', value: 1000, emoji: '🪙', desc: 'Every penny counts!', weight: 20 },
        { id: 'pocket_change', name: 'Pocket Change', effect: 'addMoney', value: 5000, emoji: '💵', desc: 'A nice little bonus!', weight: 18 },
        { id: 'payday', name: 'Payday', effect: 'addMoney', value: 15000, emoji: '💴', desc: 'Time to collect!', weight: 15 },
        { id: 'treasure_chest', name: 'Treasure Chest', effect: 'addMoney', value: 35000, emoji: '🎁', desc: 'A generous gift!', weight: 12 },
        { id: 'gold_bar', name: 'Gold Bar', effect: 'addMoney', value: 75000, emoji: '🏆', desc: 'Solid gold value!', weight: 9 },
        { id: 'diamond_cache', name: 'Diamond Cache', effect: 'addMoney', value: 125000, emoji: '💎', desc: 'Wealth beyond measure!', weight: 6 },
        { id: 'royal_fortune', name: 'Royal Fortune', effect: 'addMoney', value: 200000, emoji: '👑', desc: 'Fit for a king!', weight: 3 },
        { id: 'small_tax', name: 'Small Tax', effect: 'addMoney', value: -3000, emoji: '📉', desc: 'The cost of doing business!', weight: 17 },
        { id: 'parking_ticket', name: 'Parking Ticket', effect: 'addMoney', value: -8000, emoji: '🎟️', desc: 'Oops, forgot to pay!', weight: 14 },
        { id: 'bill_payment', name: 'Bill Payment', effect: 'addMoney', value: -20000, emoji: '🧾', desc: 'Gotta pay the bills!', weight: 11 },
        { id: 'percent_boost', name: 'Percentage Boost', effect: 'percentageMoney', value: 0.20, emoji: '📈', desc: 'Growth multiplier!', weight: 13 },
        { id: 'percent_tax', name: 'Percentage Tax', effect: 'percentageMoney', value: -0.20, emoji: '📊', desc: 'The taxman takes his cut!', weight: 10 },
        { id: 'double_nothing', name: 'Double or Nothing', effect: 'addMoney', value: 2000000, emoji: '🎰', desc: 'High risk, high reward!', weight: 8 },
        { id: 'lucky_lottery', name: 'Lucky Lottery', effect: 'addMoney', value: () => 1000 + Math.floor(Math.random() * 9999000), emoji: '🎫', desc: 'Winner winner!', weight: 12 },
        { id: 'debt_collector', name: 'Debt Collector', effect: 'loseLeftRight', emoji: '💸', desc: 'Pay what you owe!', weight: 12 },
        { id: 'panty_pant', name: 'Panty Pant', effect: 'addMoney', value: 189, emoji: '👖', desc: 'Fashion finds!', weight: 16 },
        { id: 'gold_coin', name: 'Gold (Chocolate) Coin', effect: 'addMoney', value: 0.50, emoji: '🪙', desc: 'Sweet treasure!', weight: 19 },
        { id: 'lottery_ticket', name: 'Lottery Ticket', effect: 'addMoney', value: 40, emoji: '🎟️', desc: 'A small win!', weight: 17 },
        { id: 'ipad_pro', name: 'iPad Pro Gen 11 (Lifetime)', effect: 'addMoney', value: 359900, emoji: '📱', desc: 'Premium tech package!', weight: 5 },
        { id: 'million_cheque', name: '1 Million Dollar Cheque', effect: 'addMoney', value: 1000000, emoji: '💵', desc: 'The big one!', weight: 2 }
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

  startMysteryBox() {
    // Generate 4 boxes with items from different categories
    const categories = ['good', 'bad', 'neutral', 'money'];
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
    this.applyMysteryBoxEffect(selectedItem);

    return {
      selectedItem,
      unselectedBoxes,
      totalMoney: this.totalMoney
    };
  }

  applyMysteryBoxEffect(item) {
    const value = typeof item.value === 'function' ? item.value() : item.value;

    switch (item.effect) {
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
      case 'balanceMoney':
        if (this.totalMoney > 100000) {
          this.totalMoney -= 50000;
        } else {
          this.totalMoney += 50000;
        }
        break;
      case 'loseLeftRight':
        // Lose money equal to current floor's left + right values
        if (this.preGeneratedFloors[this.currentFloor]) {
          const leftValue = this.preGeneratedFloors[this.currentFloor].left?.value || 0;
          const rightValue = this.preGeneratedFloors[this.currentFloor].right?.value || 0;
          this.totalMoney -= (leftValue + rightValue);
        }
        break;
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
      case 'hideNext3':
      case 'halveMultipliers4':
      case 'randomChoice2':
      case 'tickingBomb':
      case 'invertNext':
      case 'skipNextFloor':
      case 'nothingToGameOver3':
        // Store effect for later application
        if (!this.activeEffects) this.activeEffects = [];
        this.activeEffects.push({ type: item.effect, duration: this.parseDuration(item.effect), floorsRemaining: this.parseDuration(item.effect) });
        break;
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

  // Decrement effect durations after floor
  decrementActiveEffects() {
    if (!this.activeEffects) return;

    this.activeEffects = this.activeEffects.filter(effect => {
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
    if (this.hasActiveEffect('noBankCashout')) {
      return false;
    }
    return true;
  }

  // Check if player can bank (in minigames)
  canBank() {
    if (this.hasActiveEffect('noBankCashout')) {
      const effect = this.activeEffects.find(e => e.type === 'noBankCashout');
      return effect && effect.floorsRemaining && effect.floorsRemaining > 0 ? false : true;
    }
    return true;
  }
}

class GameManager {
  constructor() {
    this.activeGames = new Map(); // channelId -> GameState
  }

  async createGame(userId, username, channelId, guildId, db) {
    if (this.activeGames.has(channelId)) {
      return null; // Game already exists in this channel
    }
    // Check if event mode is enabled for this guild
    const eventMode = await db.getEventMode(guildId);
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
      return game.preGeneratedFloors[currentFloorNum];
    }

    // Fallback (shouldn't happen, but just in case)
    const availableAmounts = [];
    for (const key in game.remainingAmounts) {
      const amount = game.remainingAmounts[key];
      for (let i = 0; i < amount.count; i++) {
        availableAmounts.push({ ...amount });
      }
    }

    const shuffled = availableAmounts.sort(() => Math.random() - 0.5);
    const left = { ...shuffled[0] };
    const right = { ...shuffled[1] };

    if (left.type === 'random') {
      left.generatedValue = Math.floor(Math.random() * (left.max - left.min + 1)) + left.min;
    }
    if (right.type === 'random') {
      right.generatedValue = Math.floor(Math.random() * (right.max - right.min + 1)) + right.min;
    }

    return { left, right };
  }
}

module.exports = { GameState, GameManager };
