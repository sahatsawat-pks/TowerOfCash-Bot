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
    this.currentRound = 1; // 1-6 (6 rounds total)
    this.currentFloor = 0; // Current floor index in selected floors
    this.totalMoney = 0;
    this.selectedFloors = []; // Floors selected for current round (from 1-21)
    this.floorsToSelect = config.roundFloors[0]; // 6 floors for first round
    this.gameHistory = []; // Track all choices
    this.isSelectingFloors = true; // Start with floor selection
    this.isSelectingSide = false;
    this.currentFloorChoices = null;
    this.floorsCompleted = 0;
    this.playedFloors = []; // Track all floors played across all rounds
    this.preGeneratedFloors = this.preGenerateAllFloors(); // Pre-generate all 21 floors at game start (this may replace Nothing with events)
    this.remainingAmounts = this.initializeRemainingAmounts(); // Track what amounts are still available (must be after pre-generation)
    this.vaultState = null; // For The Vault minigame state
    this.operatorOfferState = null; // For Operator Offer state
  }

  initializeRemainingAmounts() {
    // Create a deep copy of game amounts with count tracking
    // This reads from the pre-generated floors to get the ACTUAL amounts (including event tiles)
    const amounts = {};
    
    // Count amounts from the pre-generated floors instead of config
    for (let floorNum = 1; floorNum <= 21; floorNum++) {
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
    
    // If event mode is enabled, replace 2 "Nothing" entries with event tiles
    if (this.eventMode) {
      const nothingIndices = [];
      allAmounts.forEach((amount, index) => {
        if (amount.type === 'nothing') {
          nothingIndices.push(index);
        }
      });
      
      // Replace first two Nothing entries with event tiles
      if (nothingIndices.length >= 2) {
        allAmounts[nothingIndices[0]] = { type: 'event', action: 'vault', label: 'The Vault' };
        allAmounts[nothingIndices[1]] = { type: 'event', action: 'operator_offer', label: 'Operator Offer' };
      }
    }
    
    // Shuffle the amounts
    for (let i = allAmounts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAmounts[i], allAmounts[j]] = [allAmounts[j], allAmounts[i]];
    }

    // Pre-generate all 21 floors with left/right choices
    const floors = {};
    for (let floorNum = 1; floorNum <= 21; floorNum++) {
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
    // Return floors from 1-21 that haven't been played yet
    const available = [];
    for (let i = 1; i <= 21; i++) {
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
      }
    } else if (amount.type === 'nothing') {
      // Do nothing
    } else if (amount.type === 'game_over') {
      // Handled elsewhere
    }

    return { ...amount, moneyBefore, moneyAfter: this.totalMoney };
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
    for (let floorNum = 1; floorNum <= 21; floorNum++) {
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
