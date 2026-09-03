/**
 * OneEgg.js - "Who has only one EGG???" Game Logic
 * 2 Players: Challenger vs Winner (or Host)
 * Goal: Have exactly 2 eggs to win. 1 egg = Lose.
 */

// Timing constants for pacing and suspense
const ONE_EGG_TIMINGS = {
  STARTER_SELECTION: 60000,        // 60s to select starter box
  TURN_ORDER_DECISION: 30000,      // 30s to decide turn order
  BOX_SELECTION: 30000,            // 30s to select box
  ITEM_DECISION: 15000,            // 15s to decide item use
  BONUS_BOX_SELECTION: 20000,      // 20s for runner-up to pick
  BONUS_CHAMPION_DECISION: 20000,  // 20s for champion decision
  
  // Animation/Suspense delays - FASTER TENSION
  DELAY_BETWEEN_SELECTIONS: 2000,  // 2s after both picked (was 3s)
  DELAY_COUNTDOWN: 3000,           // 3s countdown (3...2...1) (was 5s)
  DELAY_REVEAL_P2: 3000,           // 3s to show P2's box (was 5s)
  DELAY_REVEAL_P1: 3000,           // 3s to show P1's box (was 5s)
  DELAY_BETWEEN_ROUNDS: 6000,      // 6s before next round (was 8s)
  DELAY_GAME_END: 8000,            // 8s to show final results (was 10s)
  
  // Bonus round
  DELAY_BONUS_START: 4000,         // 4s before bonus starts (was 5s)
  DELAY_BONUS_REVEAL: 5000         // 5s to show bonus result (was 8s)
};

class OneEgg {
  constructor(gameId, channelId, guildId, player1, player2) {
    this.gameId = gameId;
    this.channelId = channelId;
    this.guildId = guildId;
    // Map players: 'left' (Challenger/P1) and 'right' (Champion/P2)
    this.players = {
      left: { ...player1, eggs: 0, money: 0, tray: [] }, // Challenger
      right: { ...player2, eggs: 0, money: 0, tray: [] } // Champion/Opponent
    };
    
    this.phase = 'STARTER_SELECTION'; // STARTER_SELECTION, STARTER_DECISION, MAIN_GAME, FINAL_BOX, BONUS_ROUND
    this.round = 0; // 0=Starter, 1-4=Main
    this.turnOrder = []; // ['left', 'right'] or ['right', 'left']
    this.currentBoxes = [];
    this.boxSelections = {};
    this.winner = null; // 'left' or 'right'
    this.loser = null;
    this.isActive = true;
    
    // Config
    this.maxEggs = 6;
    this.eggPrice = 500;
    // Bonus round state
    this.bonus = null; // { boxes: [{type:'bonus_one'|'bonus_two',label}], loserSide, chosenIndex, championOpened, loserOpened }
    
    // NEW: Enhanced state tracking for redesign
    this.waitingForDecision = null; // { type, playerId, side, data, expiresAt }
    this.decisionTimeout = null; // Timeout reference for auto-decline
    this.lastUpdate = Date.now();
    this.animationInProgress = false;
    this.currentTurnIndex = 0; // Track whose turn it is in round
    this.starterSelectionOrder = [];
    this.decisionMaker = null;
    this.boxSelections = {};
    this.currentBoxes = [];
    this.maxEggs = 6;
    
    // Pre-calculate starter boxes to prevent race conditions during resolution
    const starterOptions = [0, 0, 3, 4, 5, 6];
    this.precalculatedStarterBoxes = [...starterOptions].sort(() => Math.random() - 0.5);
    
    // NEW: Win condition target (can be changed by Rule Changer Ticket)
    this.targetEggs = 2;
    
    // Carton Phase
    this.phase = 'CARTON_SELECTION'; // Starts here now
    this.cartonBoxes = this.generateCartonBoxes();
    this.cartonSelections = {}; // { left: index, right: index }
  }

  // --- Carton Phase ---
  
  generateCartonBoxes() {
      // 10 Boxes total
      // Sizes: 1(1), 2(1), 3(1), 4(1), 5(2), 6(2), 7(1), 8(1)
      const boxes = [
          { capacity: 1, label: 'Tiny Carton (Max 1)' },
          { capacity: 2, label: 'Small Carton (Max 2)' },
          { capacity: 3, label: 'Medium Carton (Max 3)' },
          { capacity: 4, label: 'Standard Carton (Max 4)' },
          { capacity: 5, label: 'Large Carton (Max 5)' },
          { capacity: 5, label: 'Large Carton (Max 5)' },
          { capacity: 6, label: 'Extra Large Carton (Max 6)' },
          { capacity: 6, label: 'Extra Large Carton (Max 6)' },
          { capacity: 7, label: 'Huge Carton (Max 7)' },
          { capacity: 8, label: 'Gigantic Carton (Max 8)' }
      ];
      // Shuffle
      return boxes.sort(() => Math.random() - 0.5);
  }

  handleCartonSelection(playerId, boxIndex) {
      const side = this.getPlayerSide(playerId);
      if (!side) return { error: 'Not a player' };
      
      // Check already selected
      if (this.cartonSelections[side] !== undefined) return { error: 'You already picked a carton!' };
      
      // Check box taken
      if (Object.values(this.cartonSelections).includes(boxIndex)) return { error: 'Carton already taken!' };
      
      if (boxIndex < 0 || boxIndex > 9) return { error: 'Invalid carton' };
      
      this.cartonSelections[side] = boxIndex;
      
      // Check if both selected
      if (this.cartonSelections.left !== undefined && this.cartonSelections.right !== undefined) {
          return this.resolveCartonPhase();
      }
      
      return { waiting: true, side, message: 'Carton checked. Waiting for opponent...' };
  }
  
  resolveCartonPhase() {
      if (this.phase !== 'CARTON_SELECTION') return { complete: true };
      
      const leftIdx = this.cartonSelections.left;
      const rightIdx = this.cartonSelections.right;
      
      const leftCarton = this.cartonBoxes[leftIdx];
      const rightCarton = this.cartonBoxes[rightIdx];
      
      this.players.left.maxEggs = leftCarton.capacity;
      this.players.right.maxEggs = rightCarton.capacity;
      
      // Move to Starter Phase
      this.phase = 'STARTER_SELECTION';
      
      return { 
          complete: true, 
          leftCarton, 
          rightCarton,
          nextPhase: 'STARTER_SELECTION'
      };
  }

  // --- Starter Box Phase ---
  
  getStarterBoxOptions() {
    return [0, 0, 3, 4, 5, 6];
  }

  handleStarterSelection(playerId, boxIndex) {
    const side = this.getPlayerSide(playerId);
    if (!side) return { error: 'Not a player' };
    
    const checkSide = side === 'left' ? 'right' : 'left';
    if (this.boxSelections[checkSide] === boxIndex) {
        return { error: 'Box already taken by opponent!' };
    }
    
    this.boxSelections[side] = boxIndex;
    
    // Robust check for missing property on existing game instances
    if (!this.starterSelectionOrder) this.starterSelectionOrder = [];
    
    if (!this.starterSelectionOrder.includes(side)) {
        this.starterSelectionOrder.push(side);
    }
    
    // Check if both selected
    if (this.boxSelections.left !== undefined && this.boxSelections.right !== undefined) {
      return this.resolveStarterPhase();
    }
    // Signal UI to show a "Waiting for another player" embed with no buttons
    return { waiting: true, side, starterWaiting: true };
  }

  resolveStarterPhase() {
    // Guard against race conditions: if already resolved, return current state
    if (this.phase !== 'STARTER_SELECTION') {
        // Debug: resolveStarterPhase called but phase already resolved
        return {
            complete: true,
            leftEggs: this.players.left.eggs,
            rightEggs: this.players.right.eggs,
            decisionMaker: this.decisionMaker
        };
    }

    // Use pre-calculated boxes for consistency across concurrent requests
    const leftVal = this.precalculatedStarterBoxes[this.boxSelections.left];
    const rightVal = this.precalculatedStarterBoxes[this.boxSelections.right];
    
    this.players.left.eggs = leftVal;
    this.players.right.eggs = rightVal;
    
    // Determine Turn Order
    let decisionMaker = 'right';
    if (leftVal > rightVal) {
        decisionMaker = 'left';
    } else if (rightVal > leftVal) {
        decisionMaker = 'right';
    } else {
        // Tie: Use selection order (index 0 = first picker)
        decisionMaker = this.starterSelectionOrder[0] || 'left';
        // Debug: Starter Tie
    }
    
    this.phase = 'STARTER_DECISION';
    this.decisionMaker = decisionMaker;
    
    return {
      complete: true,
      leftEggs: leftVal,
      rightEggs: rightVal,
      decisionMaker
    };
  }

  setTurnOrder(firstPlayerSide) {
    // Prevent re-starting the main round if we're already in the MAIN_GAME phase
    if (this.phase === 'MAIN_GAME') {
      // Debug: setTurnOrder duplicate call ignored
      return this.turnOrder;
    }

    this.turnOrder = [firstPlayerSide, firstPlayerSide === 'left' ? 'right' : 'left'];
    // Debug: setTurnOrder
    this.startMainRound(1);
    return this.turnOrder;
  }

  // --- Main Game Phase ---

  startMainRound(roundNum) {
    this.round = roundNum;
    this.phase = 'MAIN_GAME';
    this.currentBoxes = this.generateRoundBoxes();
    this.boxSelections = {};
    this.currentTurnIndex = 0;
    
    // Alternate turn order for subsequent rounds
    if (roundNum > 1) {
        // Swap elements: [0, 1] becomes [1, 0]
        // This toggles who picks first
        this.turnOrder = [this.turnOrder[1], this.turnOrder[0]];
    }
    // Debug: startMainRound
  }

  getCurrentTurnPlayer() {
    if (!this.turnOrder || this.turnOrder.length === 0) {
      return this.players.left; // Default fallback
    }
    return this.players[this.turnOrder[this.currentTurnIndex]];
  }

  generateRoundBoxes() {
    // Generate 3 boxes based on V.1.1.3 probabilities
    // Simplified pool based on "Ratio" column in rules or standard logic
    // For MVP/Simulation, let's use a weighted pool.
    const pool = [
        // Common
        { type: 'empty', count: 6 },
        { type: 'egg', count: 1, val: 1, weight: 15 }, 
        { type: 'egg', count: 2, val: 1, weight: 10 },
        { type: 'egg', count: 3, val: 1, weight: 5 },
        // Items
        { type: 'net', val: 1, count: 1, weight: 3 }, // Steal 1
        { type: 'hammer', val: 1, count: 1, weight: 3 }, // Break 1
        { type: 'gift', val: 1, count: 1, weight: 3 }, // Give 1
        // Special
        { type: 'ticket_lose_1', weight: 1 }, // Sell to 1 (Lose)
        { type: 'ticket_win_2', weight: 1 }, // Sell to 2 (Win)
        { type: 'golden_egg', weight: 1 }
    ];
    
    // Actually implement the "Ratio" from the update properly later if exact stats needed.
    // For now, generating 3 random items.
    const boxes = [];
    for(let i=0; i<3; i++) {
        // Random pick
        const item = this.getRandomBoxItem();
        boxes.push(item);
    }
    return boxes;
  }
  
  getRandomBoxItem() {
    const roll = Math.random();
    if (roll < 0.15) return { type: 'empty', label: 'Empty (0 eggs)' };
    if (roll < 0.40) return { type: 'egg', count: 1, label: '1 egg' };
    if (roll < 0.50) return { type: 'egg', count: 2, label: '2 eggs' };
    if (roll < 0.55) return { type: 'egg_plus', count: 1, label: 'Plus Egg (adds 1 egg)' };
    
    // New Items
    if (roll < 0.60) return { type: 'old_egg', count: Math.floor(Math.random() * 3) + 1, label: 'Old Egg (Immune to steal/give)' };
    if (roll < 0.65) return { type: 'twin_egg', count: 2, label: 'Twin Egg (Worth 2 eggs)' };
    
    if (roll < 0.72) {
      const qty = Math.floor(Math.random() * 3) + 1; // 1-3
      return { type: 'net', count: qty, label: `Net (Steal ${qty})` };
    }
    if (roll < 0.79) {
      const qty = Math.floor(Math.random() * 3) + 1;
      return { type: 'hammer', count: qty, label: `Hammer (Break ${qty})` };
    }
    if (roll < 0.86) {
      const qty = Math.floor(Math.random() * 3) + 1;
      return { type: 'gift', count: qty, label: `Gift (Give ${qty})` };
    }
    if (roll < 0.90) return { type: 'rotten_egg', label: '🥚💩 Rotten Egg (reset all eggs to 0)' };
    if (roll < 0.93) return { type: 'golden_egg', label: 'Golden Egg' };
    if (roll < 0.96) return { type: 'new_carton', label: '📦✨ New Carton (Sell all & New Size)' };
    
    // Rule Changer and Ticket
    if (roll < 0.98) return { type: 'ticket_rule', label: 'Ticket: Change Win Condition' };
    return { type: 'ticket_win_2', label: 'Ticket: Set to 2 eggs' };
  }

  handleBoxSelection(playerId, boxIndex) {
    if (boxIndex < 0 || boxIndex > 2) return { error: 'Invalid box' };
    
    const side = this.getPlayerSide(playerId);
    // Validate turn
    const expectedSide = this.turnOrder[this.currentTurnIndex];
    if (!expectedSide || !this.players[expectedSide]) {
        console.error('[OneEgg] Invalid turn state:', { turnOrder: this.turnOrder, index: this.currentTurnIndex });
        return { error: 'Internal game error: Invalid turn state' };
    }
    
    // Debug: Box Select
    
    if (side !== expectedSide) return { error: `Not your turn! (It's ${this.players[expectedSide].username}'s turn)` };
    
    // Check if player already picked a box in this round
    if (this.boxSelections[side] !== undefined) return { error: `You already picked Box ${this.boxSelections[side] + 1}!` };
    
    // REDESIGN: Allow multiple players to pick the same box
    // PREVIOUS BUG: The 'Object.values' check below was occasionally uncommented or causing issues.
    // We strictly DISABLE it now.
    
    this.boxSelections[side] = boxIndex;
    
    // Logic: First player selects, then Second player selects.
    // Reveal order: Second player opens FIRST (Immediate), then First player opens.
    // Wait, Rule: "First to pick = Last to open. Last to pick = First to open (Immediate)".
    
    const isFirstPicker = (this.currentTurnIndex === 0);
    
    if (isFirstPicker) {
        this.currentTurnIndex++;
        // Return the item info immediately so UI can reveal it
        // But wait, if we reveal it immediately, we spoil the suspense?
        // Ah, the suspense comes BEFORE showing the embed.
        // We need the item object to build the reveal embed.
        const item = this.currentBoxes[boxIndex];
        return { waiting: true, message: 'Box selected. Waiting for opponent...', lastItem: item };
    } else {
        // Second picker selected. Now resolve IMMEDIATE (Second picker) then DELAYED (First picker)
        return this.resolveRound();
    }
  }

  resolveRound() {
    if (this.phase !== 'MAIN_GAME' && this.phase !== 'FINAL_BOX') {
        // Debug: resolveRound duplicate call
        return { error: 'Round already resolved' };
    }
    const p1Side = this.turnOrder[0]; // First Picker
    const p2Side = this.turnOrder[1]; // Second Picker
    
    const p1BoxIdx = this.boxSelections[p1Side];
    const p2BoxIdx = this.boxSelections[p2Side];
    
    const p1Item = this.currentBoxes[p1BoxIdx];
    const p2Item = this.currentBoxes[p2BoxIdx];

    if (!p1Item || !p2Item) {
        console.error('[OneEgg] Item resolution failed:', { p1BoxIdx, p2BoxIdx, boxes: this.currentBoxes });
        return { error: 'Internal error: Could not resolve selected items' };
    }
    
    const results = [];
    
    // 3. Resolve effects: Second Picker (P2) FIRST, then First Picker (P1)
    // Rule: "Last to pick = First to open"
    // Variables p1Item and p2Item already declared above
    
    // Actions order: P2 then P1
    const actions = [
        { side: p2Side, item: p2Item }, // Second Picker (Reveal First)
        { side: p1Side, item: p1Item }  // First Picker (Reveal Second)
    ];

    let gameEnded = false;
    let winner = null;
    let loser = null;

    for (const action of actions) {
        // If game already ended, we still process the item for stats/money, 
        // but we might need to handle the fact that the result is already decided?
        // Actually, applyItem checks win condition internally.
        // If applyItem returns gameEnded, it updates this.winner/loser.
        // If gameEnded is already true, subsequent applyItem might overwrite winner/loser?
        // We want the FIRST trigger to decide the winner.
        // So we should check if game ended BEFORE calling applyItem? 
        // No, we want the stats (eggs/items) to happen.
        // But we want to preserve the ORIGINAL winner.
        
        const previousWinner = this.winner;
        const res = this.applyItem(action.side, action.item);
        
        // If this action triggered game end
        if (res.gameEnded) {
             if (!gameEnded) {
                 // First valid win/loss
                 gameEnded = true;
                 winner = this.winner;
                 loser = this.loser;
             } else {
                 // Game ALREADY ended by previous player.
                 // Restore the original winner to respect "First come first serve" rule
                 this.winner = winner;
                 this.loser = loser;
                 res.gameEnded = false; // Mark this specific action as NOT the trigger (so UI doesn't get confused?)
                 // Actually, returning gameEnded=true might be fine if we pass the canonical winner back.
             }
        }
        
        results.push(res);
    }
    
    if (gameEnded) {
        return { results, gameEnded: true, winner, loser };
    }

    // Check game end conditions for rounds
    if (this.phase === 'FINAL_BOX') {
        // End of game after Final Box resolution
        // The applyItem checks would have triggered 'gameEnded' if someone hit 2 or 1 eggs.
        // If we are here, nobody won/lost immediately.
        // So we proceed to sell eggs and end game?
        // Rules say: "If no winner after Final Box, sell eggs"
        this.sellAllEggs();
        // Since we return results here, the UI needs to know the game is OVER.
        return { results, gameEnded: true, reason: 'time_limit', winner: null, loser: null };
    }

    if (this.round >= 4) {
        this.phase = 'FINAL_BOX';
        return { results, phaseChange: 'FINAL_BOX' };
    } else {
        this.startMainRound(this.round + 1);
        return { results, nextRound: this.round };
    }
  }

  applyItem(side, item) {
    const player = this.players[side];
    const opponentSide = side === 'left' ? 'right' : 'left';
    const opponent = this.players[opponentSide];
    let message = `You found **${item.label}**!`;
    
    const playerMax = player.maxEggs || 6;
    const opponentMax = opponent.maxEggs || 6;
    
    switch(item.type) {
      case 'egg':
        player.eggs += item.count;
        break;
      case 'egg_plus':
        player.eggs += 1;
        break;
      case 'old_egg':
        player.eggs += item.count;
        player.oldEggs = (player.oldEggs || 0) + item.count; // Track old eggs
        message += ` Found ${item.count} Old Egg(s)! (Immune to steal/give)`;
        break;
      case 'twin_egg':
          player.eggs += 2;
          message += ` Found a Twin Egg! (+2 eggs)`;
          break;
      case 'ticket_rule':
          this.targetEggs = Math.floor(Math.random() * 5) + 2; // 2 to 6
          message += ` Rule Change! Win condition set to **${this.targetEggs} Eggs**!`;
          break;
      case 'net': {
        // Cannot steal Old Eggs
        const opponentAvailable = opponent.eggs - (opponent.oldEggs || 0);
        const steal = Math.min(Math.max(0, opponentAvailable), item.count || 1);
        
        if (opponent.eggs > 0 && opponentAvailable <= 0) {
            message += ` Opponent only has Old Eggs (Immune)!`;
        } else if (steal > 0) {
          opponent.eggs -= steal;
          player.eggs += steal;
          message += ` Stole ${steal} egg${steal === 1 ? '' : 's'} from opponent!`;
        } else {
          message += ` Opponent has no eggs!`;
        }
        break;
      }
      case 'hammer': {
        const broken = Math.min(opponent.eggs, item.count || 1);
        if (broken > 0) {
          opponent.eggs -= broken;
          // If we broke old eggs, reduce count
          if (opponent.oldEggs > 0) {
              // Assume hammer breaks normal/old regardless? Rule check: "Old Egg (1 - 3): Old Egg can't give or steal". Doesn't say can't break.
              // Assuming breakable.
              // Logic: Remove from total. If Total < OldEggs, reduce OldEggs cap.
              if (opponent.eggs < opponent.oldEggs) opponent.oldEggs = opponent.eggs;
          }
          message += ` Smashed ${broken} egg${broken === 1 ? '' : 's'} of opponent's!`;
        } else {
          message += ` Opponent has no eggs!`;
        }
        break;
      }
      case 'gift': {
        // Cannot give Old Eggs? "Old Egg can't give or steal"
        const playerAvailable = player.eggs - (player.oldEggs || 0);
        const give = Math.min(Math.max(0, playerAvailable), item.count || 1);
        
        if (player.eggs > 0 && playerAvailable <= 0) {
             message += ` You only have Old Eggs (Cannot give)!`;
        } else if (give > 0) {
          player.eggs -= give;
          opponent.eggs += give;
          message += ` Gave ${give} egg${give === 1 ? '' : 's'} to opponent!`;
        } else {
          message += ` You have no eggs to give!`;
        }
        break;
      }
      case 'rotten_egg': {
        player.eggs = 0;
        opponent.eggs = 0;
        player.oldEggs = 0;
        opponent.oldEggs = 0;
        message += ' Rotten Egg! All eggs reset to 0!';
        break;
      }
      case 'golden_egg':
        player.goldenEggs = (player.goldenEggs || 0) + 1;
        player.money = (player.money || 0) + 300000;
        message += ' Found a Golden Egg! +$300,000';
        break;
      case 'ticket_win_2':
        player.eggs = 2; // Sets exact
        // If they had old eggs, do we reset? Assume yes, "Set to 2".
        if (player.oldEggs > 2) player.oldEggs = 2; // Cap old eggs if any
        message += ` Eggs set to 2!`;
        break;
      case 'new_carton': {
        const soldEggs = player.eggs;
        const saleValue = soldEggs * 30000;
        player.money = (player.money || 0) + saleValue;
        player.eggs = 0;
        player.oldEggs = 0; // Reset old eggs too since we sold everything
        const newSize = Math.floor(Math.random() * 8) + 1;
        player.maxEggs = newSize;
        message += ` Sold ${soldEggs} eggs for $${GameUI.formatMoney(saleValue)}! New Carton Size: ${newSize}`;
        break;
      }
      default:
        // Already handled generic egg/item counts
    }
    
    // Check Max Eggs (Dynamic Cap) for both players
    [player, opponent].forEach(p => {
      const cap = p.maxEggs || 6;
      if (p.eggs > cap) {
        const excess = p.eggs - cap;
        p.eggs = cap;
        p.money += excess * 30000;
        if (p === player) message += ` (Sold ${excess} excess eggs for $${excess*30000})`;
      }
    });

    // Check Win Conditions for BOTH players
    // Priority: 
    // 1. Did Active Player WIN? (Target Eggs) -> WIN (Active)
    // 2. Did Active Player LOSE? (1 egg) -> LOSS (Active)
    // 3. Did Opponent LOSE? (1 egg) -> WIN (Active) (Opponent lost)
    // 4. Did Opponent WIN? (Target Eggs) -> LOSS (Active) (Opponent won - unlikely unless Gift used)
    
    // Check Active Player first
    const activeCheck = this.checkWinCondition(side);
    if (activeCheck) {
        return { player: side, item, message, gameEnded: true, result: activeCheck }; // Active player decided game
    }
    
    // Check Opponent second (if item affected them)
    if (['net', 'hammer', 'gift'].includes(item.type)) {
        const opponentCheck = this.checkWinCondition(opponentSide);
        if (opponentCheck) {
            // Opponent status changed to Win/Loss.
            // If opponent WON, active player LOST.
            // If opponent LOST, active player WON.
            // checkWinCondition sets this.winner/this.loser internally based on the side passed.
            // So if opponentCheck is 'WIN', this.winner is opponent.
            // We just return gameEnded: true.
            return { player: side, item, message, gameEnded: true, result: opponentCheck }; 
        }
    }
    
    return { player: side, item, message };
  }

  checkWinCondition(side) {
      const p = this.players[side];
      if (p.eggs === this.targetEggs) {
          this.winner = side;
          this.loser = side === 'left' ? 'right' : 'left';
          return 'WIN';
      }
      if (p.eggs === 1) {
          this.loser = side;
          this.winner = side === 'left' ? 'right' : 'left';
          // LOSS CONDITION: 1 egg
          return 'LOSS'; // Have 1 egg = Lose immediately
      }
      return null;
  }
  
  sellAllEggs() {
      // For Final Box or Game End
      ['left', 'right'].forEach(s => {
          const p = this.players[s];
          p.money += p.eggs * 500;
          p.eggs = 0;
      });
  }

  // ===== BONUS ROUND METHODS =====
  
  startBonusRound() {
    this.phase = 'BONUS_ROUND';
    // Winner gets +$50,000 for bonus round
    this.players[this.winner].money += 50000;
    // 2 boxes: [one has 1 egg (-$30,000), one has 2 eggs (+$150,000)]
    const badBox = { type: 'bonus_one', label: '🥚 1 Egg (-$30,000)', effect: 'lose_30k' };
    const goodBox = { type: 'bonus_two', label: '🥚🥚 2 Eggs (+$150,000)', effect: 'win_150k' };
    // Shuffle
    this.bonus = {
      boxes: Math.random() < 0.5 ? [badBox, goodBox] : [goodBox, badBox],
      pickedBoxIndex: null,
      loserSide: this.loser,
      winnerSide: this.winner,
      step: 'LOSER_PICK'
    };
    // Debug: Bonus Round started
  }

  loserPickBonusBox(playerId, boxIndex) {
    if (this.phase !== 'BONUS_ROUND') {
      // Debug: loserPickBonusBox wrong phase
      return { error: 'Not in bonus round' };
    }

    // Safety check: Restore bonus state if missing (e.g. game object reload issue)
    if (!this.bonus) {
        // Debug: Bonus state missing
        this.startBonusRound(); // Re-init
    }

    if (!this.bonus) {
      console.error('[OneEgg][ERROR] loserPickBonusBox: no bonus state after attempted restore');
      return { error: 'No active bonus game' };
    }

    const side = this.getPlayerSide(playerId);
    if (side !== this.bonus.loserSide) {
      // Debug: wrong player pick
      return { error: 'Only the loser picks the box!' };
    }

    if (boxIndex < 0 || boxIndex > 1) return { error: 'Invalid box' };

    // Guard against duplicate picks
    if (this.bonus.pickedBoxIndex !== null && this.bonus.pickedBoxIndex !== undefined) {
      // Debug: box already picked
      return { success: true, alreadyPicked: true, pickedBoxIndex: this.bonus.pickedBoxIndex };
    }

    this.bonus.pickedBoxIndex = boxIndex;
    this.bonus.step = 'CHAMPION_DECIDE';

    // Debug: box picked
    return { success: true };
  }

  championDecideOpen(playerId, isOpen) {
    try {
      if (this.phase !== 'BONUS_ROUND') {
        // Debug: championDecideOpen wrong phase
        return { error: 'Not in bonus round' };
      }

      if (!this.bonus) {
        console.error('[OneEgg][ERROR] championDecideOpen: no bonus state');
        return { error: 'No active bonus game' };
      }

      const side = this.getPlayerSide(playerId);
      if (side !== this.bonus.winnerSide) {
        // Debug: wrong player decide
        return { error: 'Only the champion decides!' };
      }

      const winner = this.players[this.winner];
      const loser = this.players[this.loser];

      // Ensure loser has picked
      if (this.bonus.pickedBoxIndex === null || this.bonus.pickedBoxIndex === undefined) {
        console.error('[OneEgg][ERROR] championDecideOpen: pickedBoxIndex missing', { bonus: this.bonus });
        return { error: 'No box has been picked yet by the loser' };
      }

      if (isOpen) {
        // Reveal content
        const box = this.bonus.boxes[this.bonus.pickedBoxIndex];
        if (!box) {
          console.error('[OneEgg][ERROR] championDecideOpen: resolved box is undefined', { pickedBoxIndex: this.bonus.pickedBoxIndex, boxes: this.bonus.boxes });
          return { error: 'Selected box could not be resolved' };
        }
        // Mark champion opened
        try {
          this.bonus.championOpened = true;
          this.bonus.step = 'RESOLVED';
        } catch (e) {
          console.warn('[OneEgg] Failed to set bonus flags for champion open', e);
        }
        if (box.type === 'bonus_two') { // 2 Eggs = Win
          winner.money += 150000;
          return { revealed: box, champAmount: 150000, loserAmount: 0, gameEnded: true, champTotal: winner.money };
        } else { // 1 Egg = Loss
          winner.money -= 30000;
          loser.money += 30000;
          return { revealed: box, champAmount: -30000, loserAmount: 30000, gameEnded: true, champTotal: winner.money };
        }
      } else {
        // Decline: Safe +20,000
        winner.money += 20000;
        this.bonus.step = 'LOSER_DECIDE';
        this.bonus.championOpened = false;
        return { declined: true, champTotal: winner.money, gameEnded: false };
      }
    } catch (err) {
      console.error('[OneEgg][EXCEPTION] championDecideOpen', err);
      return { error: 'Internal error in champion decision' };
    }
  }

  loserDecideOpen(playerId, isOpen) {
    try {
      if (this.phase !== 'BONUS_ROUND') {
        // Debug: loserDecideOpen wrong phase
        return { error: 'Not in bonus round' };
      }

      if (!this.bonus) {
        console.error('[OneEgg][ERROR] loserDecideOpen: no bonus state');
        return { error: 'No active bonus game' };
      }

      const side = this.getPlayerSide(playerId);
      if (side !== this.bonus.loserSide) {
        // Debug: wrong player loser decide
        return { error: 'Only the loser decides!' };
      }

      const loser = this.players[this.loser];

      if (this.bonus.pickedBoxIndex === null || this.bonus.pickedBoxIndex === undefined) {
        console.error('[OneEgg][ERROR] loserDecideOpen: pickedBoxIndex missing', { bonus: this.bonus });
        return { error: 'No box has been picked yet' };
      }

      const box = this.bonus.boxes[this.bonus.pickedBoxIndex];
      if (!box) {
        console.error('[OneEgg][ERROR] loserDecideOpen: resolved box is undefined', { pickedBoxIndex: this.bonus.pickedBoxIndex, boxes: this.bonus.boxes });
        return { error: 'Selected box could not be resolved' };
      }

      if (isOpen) {
        // Reveal SAME box (the one they picked to give away)
        try {
          this.bonus.loserOpened = true;
          this.bonus.step = 'RESOLVED';
        } catch (e) {
          console.warn('[OneEgg] Failed to set bonus flags for loser open', e);
        }
        if (box.type === 'bonus_two') {
          // 2 Eggs = Double Money
          loser.money *= 2;
          return { revealed: box, loserAmount: 'x2', gameEnded: true };
        } else {
          // 1 Egg = Halve Money
          loser.money = Math.floor(loser.money / 2);
          return { revealed: box, loserAmount: '/2', gameEnded: true };
        }
      } else {
        // Pass: No change
        try {
          this.bonus.loserOpened = false;
          this.bonus.step = 'RESOLVED';
        } catch (e) {
          console.warn('[OneEgg] Failed to set bonus flags for loser pass', e);
        }
        return { passed: true, loserAmount: 'x1', gameEnded: true };
      }
    } catch (err) {
      console.error('[OneEgg][EXCEPTION] loserDecideOpen', err);
      return { error: 'Internal error in loser decision' };
    }
  }

  // ===== DECISION MANAGEMENT METHODS =====
  createItemDecision(playerId, side, itemType, data = {}) {
    const expiresAt = Date.now() + ONE_EGG_TIMINGS.ITEM_DECISION;
    this.waitingForDecision = {
      type: 'ITEM_USE',
      playerId,
      side,
      itemType,
      data,
      expiresAt
    };
    return this.waitingForDecision;
  }

  clearDecision() {
    if (this.decisionTimeout) {
      clearTimeout(this.decisionTimeout);
      this.decisionTimeout = null;
    }
    this.waitingForDecision = null;
  }

  handleDecisionTimeout() {
    // Auto-decline if no response
    if (this.waitingForDecision) {
      const decision = { ...this.waitingForDecision, action: 'declined', timedOut: true };
      this.clearDecision();
      return decision;
    }
    return null;
  }

  // ===== VISUAL FORMATTING METHODS =====
  getEggStatus(eggCount) {
    if (eggCount === 2) return '🎯 WIN READY!';
    if (eggCount === 1) return '⚠️ DANGER!';
    if (eggCount === 0) return '📦 EMPTY';
    if (eggCount >= 5) return '⚡ ALMOST FULL';
    return '✅ SAFE';
  }

  formatEggDisplay(side) {
    const player = this.players[side];
    if (!player) return '⬜⬜⬜⬜⬜⬜ (0/6) 📦 EMPTY';
    
    const max = player.maxEggs || 6;
    const tray = '🥚'.repeat(player.eggs || 0) + '⬜'.repeat(Math.max(0, max - (player.eggs || 0)));
    const label = `(${player.eggs || 0}/${max})${(player.eggs || 0) >= max ? ' ⭐ MAX' : ''}`;
    
    return `${tray} ${label}`;
  }

  getTimingDelay(key) {
    return ONE_EGG_TIMINGS[key] || 0;
  }

  // Helper
  getPlayerSide(playerId) {
    if (this.players.left && this.players.left.id === playerId) return 'left';
    if (this.players.right && this.players.right.id === playerId) return 'right';
    return null;
  }
}

module.exports = OneEgg;

