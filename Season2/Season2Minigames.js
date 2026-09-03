/**
 * Season 2 Elite Minigames Module
 * Implements:
 * 1. Laser Security Infiltration (4x4 grid, sweeping lasers)
 * 2. The Blind Auction (compete against 3 AI bots)
 * 3. Bomb Sweeper / Defusal (cut 1 of 4 wires with cryptic clues)
 * 4. High Roller Blackjack (single-hand Blackjack vs Operator)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class Season2Minigames {
  // ==========================================
  // 1. 🚨 LASER SECURITY INFILTRATION
  // ==========================================
  static startLaserInfiltration(userId, username, floorEarnings = 100000) {
    // 4 rows, 4 columns.
    // Row 0 is summit (target), Row 3 is start.
    // In each row, 1 column has a laser (or 2 on summit row 0).
    const laserGrid = [];
    for (let r = 0; r < 4; r++) {
      const lasersInRow = (r === 0) ? 2 : 1;
      const cols = [0, 1, 2, 3];
      // Shuffle cols
      for (let i = cols.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cols[i], cols[j]] = [cols[j], cols[i]];
      }
      laserGrid.push(cols.slice(0, lasersInRow));
    }

    return {
      type: 'laser_infiltration',
      userId,
      username,
      currentRow: 3, // Start at row 3 (bottom)
      laserGrid,     // laser columns per row [row0, row1, row2, row3]
      pathHistory: [], // [{ row, col, safe: boolean }]
      floorEarnings: Math.max(50000, floorEarnings),
      jackpot: 5000000,
      isCompleted: false,
      isSuccess: false,
      lostAmount: 0
    };
  }

  static stepLaserInfiltration(state, chosenCol) {
    if (state.isCompleted) return state;

    const row = state.currentRow;
    const isLaser = state.laserGrid[row].includes(chosenCol);

    if (isLaser) {
      state.isCompleted = true;
      state.isSuccess = false;
      state.lostAmount = Math.floor(state.floorEarnings * 0.5);
      state.pathHistory.push({ row, col: chosenCol, safe: false });
    } else {
      state.pathHistory.push({ row, col: chosenCol, safe: true });
      if (row === 0) {
        // Reached summit!
        state.isCompleted = true;
        state.isSuccess = true;
      } else {
        state.currentRow--;
      }
    }

    return state;
  }

  static createLaserEmbed(state) {
    const rowSymbols = [];
    for (let r = 0; r < 4; r++) {
      let rowStr = `**Level ${4 - r}** | `;
      for (let c = 0; c < 4; c++) {
        const visited = state.pathHistory.find(p => p.row === r && p.col === c);
        if (visited) {
          rowStr += visited.safe ? ' 🟩 ' : ' 💥 ';
        } else if (state.isCompleted && state.laserGrid[r].includes(c)) {
          rowStr += ' 🚨 ';
        } else if (r === state.currentRow && !state.isCompleted) {
          rowStr += ' ❓ ';
        } else {
          rowStr += ' ⬛ ';
        }
      }
      if (r === 0) rowStr += ' 🏆 **SUMMIT ($5M)**';
      rowSymbols.push(rowStr);
    }

    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.isSuccess ? '#00FF00' : '#FF0000') : '#FF9900')
      .setTitle('🚨 LASER SECURITY INFILTRATION 🚨')
      .setDescription(
        `**Infiltrator**: <@${state.userId}>\n` +
        `Navigate through the 4-tier high security laser field to the penthouse summit!\n\n` +
        `${rowSymbols.join('\n')}\n\n` +
        (state.isCompleted
          ? (state.isSuccess
              ? `🎉 **MISSION ACCOMPLISHED!** You breached the summit and secured **$${state.jackpot.toLocaleString()}**!`
              : `🚨 **ALARM TRIGGERED!** You stepped into an active infrared laser! Security confiscated 50% of this floor's earnings (-$${state.lostAmount.toLocaleString()})!`)
          : `📍 **Current Row**: Level ${4 - state.currentRow} of 4\n⚠️ Avoid the active security beams. Choose a sector below:`)
      )
      .setFooter({ text: 'Season 2 Elite Challenge • Sector 1 to 4' });

    return embed;
  }

  static createLaserButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_laser_continue')
            .setLabel('Proceed to Next Floor ➔')
            .setStyle(ButtonStyle.Primary)
        )
      ];
    }

    const row = new ActionRowBuilder();
    for (let c = 0; c < 4; c++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`s2_laser_step_${c}`)
          .setLabel(`Sector ${c + 1}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🛡️')
      );
    }
    return [row];
  }

  // ==========================================
  // 2. 🔨 THE BLIND AUCTION
  // ==========================================
  static startBlindAuction(userId, username, playerMoney = 100000) {
    const artifacts = [
      {
        id: 'golden_aegis',
        name: '🛡️ Golden Aegis',
        desc: 'Absorbs 1 fatal Game Over or -100% bankrupt tile.',
        effect: 'gameOverImmunity',
        baseVal: 150000
      },
      {
        id: 'overdrive_3x',
        name: '🚀 3x Overdrive Multiplier',
        desc: 'Triples the next positive cash award.',
        effect: 'tripleNextFloor',
        baseVal: 200000
      },
      {
        id: 'xray_monocle',
        name: '👓 X-Ray Monocle',
        desc: 'Permanently reveals both sides of the next selected floor.',
        effect: 'revealNext2',
        baseVal: 100000
      },
      {
        id: 'tax_haven',
        name: '🏛️ Tax Haven Certificate',
        desc: 'Immunity against the next negative percentage deduction.',
        effect: 'tax_immunity',
        baseVal: 120000
      }
    ];

    const artifact = artifacts[Math.floor(Math.random() * artifacts.length)];

    // 3 Bot Bidders
    const botBidders = [
      { name: '🤖 Alpha Bot', bid: Math.floor(artifact.baseVal * (0.6 + Math.random() * 0.5)) },
      { name: '🤖 Beta Bot', bid: Math.floor(artifact.baseVal * (0.8 + Math.random() * 0.6)) },
      { name: '🤖 Gamma Bot', bid: Math.floor(artifact.baseVal * (0.5 + Math.random() * 0.8)) }
    ];

    return {
      type: 'blind_auction',
      userId,
      username,
      playerMoney: Math.max(0, playerMoney),
      artifact,
      botBidders,
      playerBid: null,
      winner: null,
      highestBid: 0,
      isCompleted: false
    };
  }

  static placeAuctionBid(state, bidAmount) {
    state.playerBid = Math.min(state.playerMoney, Math.max(0, bidAmount));

    let highest = { name: state.username, bid: state.playerBid, isPlayer: true };
    for (const bot of state.botBidders) {
      if (bot.bid > highest.bid) {
        highest = { name: bot.name, bid: bot.bid, isPlayer: false };
      }
    }

    state.winner = highest;
    state.highestBid = highest.bid;
    state.isCompleted = true;
    return state;
  }

  static createAuctionEmbed(state) {
    const embed = new EmbedBuilder()
      .setColor(state.isCompleted ? (state.winner.isPlayer ? '#00FF00' : '#FFA500') : '#9B59B6')
      .setTitle('🔨 THE HIGH-ROLLER BLIND AUCTION 🔨')
      .setDescription(
        `**Auctioneer**: Welcome, high-rollers! Today's exclusive relic on the block:\n\n` +
        `### ${state.artifact.name}\n` +
        `> *${state.artifact.desc}*\n\n` +
        `**Participating Bidders**:\n` +
        `• 👤 **${state.username}** (Balance: $${state.playerMoney.toLocaleString()})\n` +
        state.botBidders.map(b => `• ${b.name} *(Secret bid locked in)*`).join('\n') + '\n\n' +
        (state.isCompleted
          ? `### 🏁 AUCTION RESULTS:\n` +
            `• 👤 **Your Bid**: $${state.playerBid.toLocaleString()}\n` +
            state.botBidders.map(b => `• ${b.name}: $${b.bid.toLocaleString()}`).join('\n') + '\n\n' +
            (state.winner.isPlayer
              ? `🏆 **YOU WON THE AUCTION!** You secured the **${state.artifact.name}** for **$${state.playerBid.toLocaleString()}**!`
              : `❌ **OUTBID!** **${state.winner.name}** won the artifact with a bid of **$${state.winner.bid.toLocaleString()}**. You keep your money!`)
          : `⚠️ All bids are secret and revealed simultaneously. Choose your bid wisely:`)
      )
      .setFooter({ text: 'Season 2 Elite Challenge • Outbid the AI without overpaying!' });

    return embed;
  }

  static createAuctionButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_auction_continue')
            .setLabel('Claim & Continue ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    // Bid tiers based on artifact base value
    const bids = [
      Math.floor(state.artifact.baseVal * 0.5),
      Math.floor(state.artifact.baseVal * 0.8),
      Math.floor(state.artifact.baseVal * 1.0),
      Math.floor(state.artifact.baseVal * 1.3),
      Math.floor(state.artifact.baseVal * 1.6)
    ];

    const row = new ActionRowBuilder();
    bids.slice(0, 4).forEach((amount) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`s2_auction_bid_${amount}`)
          .setLabel(`$${(amount / 1000).toFixed(0)}k`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`s2_auction_bid_${bids[4]}`)
        .setLabel(`High Bid: $${(bids[4] / 1000).toFixed(0)}k`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('s2_auction_bid_0')
        .setLabel('Pass / Bid $0')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row, row2];
  }

  // ==========================================
  // 3. 💣 BOMB SWEEPER / DEFUSAL
  // ==========================================
  static startBombDefusal(userId, username) {
    const wires = ['Red', 'Blue', 'Green', 'Yellow'];
    const shuffled = [...wires];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const defusalWire = shuffled[0]; // jackpot wire
    const safeWire = shuffled[1];    // safe disarm
    const liveWires = [shuffled[2], shuffled[3]]; // detonators

    // Generate 2 logical clues
    const clues = [];
    // Clue 1: Tells which color is NOT the defusal wire
    const badWire = liveWires[0];
    clues.push(`Diagnostic: The **${badWire}** wire is carrying an unstable live charge (Detonator). Do NOT cut it!`);

    // Clue 2: Relation or hint
    if (defusalWire === 'Blue' || defusalWire === 'Green') {
      clues.push(`Manual Note: The master defusal bypass wire shares a cool hue (Water / Earth).`);
    } else {
      clues.push(`Manual Note: The master defusal bypass wire shares a warm hue (Fire / Sun).`);
    }

    return {
      type: 'bomb_defusal',
      userId,
      username,
      wires,
      defusalWire,
      safeWire,
      liveWires,
      clues,
      chosenWire: null,
      result: null, // 'jackpot', 'safe', 'detonated'
      isCompleted: false,
      reward: 2500000,
      penalty: 250000
    };
  }

  static cutWire(state, wire) {
    state.chosenWire = wire;
    state.isCompleted = true;

    if (wire === state.defusalWire) {
      state.result = 'jackpot';
    } else if (wire === state.safeWire) {
      state.result = 'safe';
    } else {
      state.result = 'detonated';
    }
    return state;
  }

  static createBombEmbed(state) {
    const embed = new EmbedBuilder()
      .setColor(
        state.isCompleted
          ? (state.result === 'jackpot' ? '#00FF00' : state.result === 'safe' ? '#3498DB' : '#FF0000')
          : '#E74C3C'
      )
      .setTitle('💣 BOMB SWEEPER / DEFUSAL 💣')
      .setDescription(
        `**Operator Emergency Alert**: An active explosive device has locked down the floor!\n` +
        `Cut the correct bypass wire to disarm the bomb and secure the bounty.\n\n` +
        `### 📋 Manual Clues & Sensor Readings:\n` +
        state.clues.map(c => `• ${c}`).join('\n') + '\n\n' +
        `**Available Wires**: 🔴 Red • 🔵 Blue • 🟢 Green • 🟡 Yellow\n\n` +
        (state.isCompleted
          ? (state.result === 'jackpot'
              ? `🎉 **MASTER DEFUSAL SUCCESS!** You clipped the **${state.chosenWire}** wire! The bomb is disarmed! Awarded **+$${state.reward.toLocaleString()}** and a Bomb Shield!`
              : state.result === 'safe'
              ? `✅ **SAFE DISARM!** You clipped the **${state.chosenWire}** wire! Neutralized without detonation. No bonus, but you survived safely!`
              : `💥 **BOOM! DETONATION!** You cut the **${state.chosenWire}** wire, triggering the blast! Lost -$${state.penalty.toLocaleString()} in structural damage!`)
          : `⏰ Ticking down... Choose which wire to snip:`)
      )
      .setFooter({ text: 'Season 2 Elite Challenge • 1 Defusal ($2.5M) • 1 Safe • 2 Detonators' });

    return embed;
  }

  static createBombButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_bomb_continue')
            .setLabel('Continue Climbing ➔')
            .setStyle(ButtonStyle.Primary)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_bomb_wire_Red').setLabel('Red Wire').setEmoji('🔴').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('s2_bomb_wire_Blue').setLabel('Blue Wire').setEmoji('🔵').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_bomb_wire_Green').setLabel('Green Wire').setEmoji('🟢').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('s2_bomb_wire_Yellow').setLabel('Yellow Wire').setEmoji('🟡').setStyle(ButtonStyle.Secondary)
    );

    return [row];
  }

  // ==========================================
  // 4. 🃏 HIGH ROLLER BLACKJACK
  // ==========================================
  static startBlackjack(userId, username, playerMoney = 100000) {
    const deck = this.generateDeck();

    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const defaultWager = Math.max(25000, Math.floor(playerMoney * 0.2));

    return {
      type: 'high_roller_blackjack',
      userId,
      username,
      deck,
      playerMoney: Math.max(0, playerMoney),
      wager: defaultWager,
      wagerLocked: false,
      playerHand,
      dealerHand,
      isCompleted: false,
      outcome: null, // 'player_bust', 'dealer_bust', 'player_win', 'dealer_win', 'push'
      payout: 0
    };
  }

  static generateDeck() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = [
      { name: '2', val: 2 }, { name: '3', val: 3 }, { name: '4', val: 4 },
      { name: '5', val: 5 }, { name: '6', val: 6 }, { name: '7', val: 7 },
      { name: '8', val: 8 }, { name: '9', val: 9 }, { name: '10', val: 10 },
      { name: 'J', val: 10 }, { name: 'Q', val: 10 }, { name: 'K', val: 10 },
      { name: 'A', val: 11 }
    ];

    const deck = [];
    for (const s of suits) {
      for (const r of ranks) {
        deck.push({ ...r, suit: s, label: `${r.name}${s}` });
      }
    }
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static calculateHandValue(hand) {
    let sum = 0;
    let aces = 0;
    for (const card of hand) {
      sum += card.val;
      if (card.name === 'A') aces++;
    }
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }
    return sum;
  }

  static playerHit(state) {
    if (state.isCompleted) return state;
    state.playerHand.push(state.deck.pop());
    const val = this.calculateHandValue(state.playerHand);
    if (val > 21) {
      state.isCompleted = true;
      state.outcome = 'player_bust';
      state.payout = -Math.floor(state.wager);
    }
    return state;
  }

  static playerDoubleDown(state) {
    if (state.isCompleted) return state;
    state.wager *= 2;
    state.playerHand.push(state.deck.pop());
    const val = this.calculateHandValue(state.playerHand);
    if (val > 21) {
      state.isCompleted = true;
      state.outcome = 'player_bust';
      state.payout = -Math.floor(state.wager);
    } else {
      return this.playerStand(state);
    }
    return state;
  }

  static playerStand(state) {
    if (state.isCompleted) return state;

    // Dealer draws to at least 17
    let dealerVal = this.calculateHandValue(state.dealerHand);
    while (dealerVal < 17) {
      state.dealerHand.push(state.deck.pop());
      dealerVal = this.calculateHandValue(state.dealerHand);
    }

    const playerVal = this.calculateHandValue(state.playerHand);
    state.isCompleted = true;

    if (dealerVal > 21) {
      state.outcome = 'dealer_bust';
      state.payout = Math.floor(state.wager);
    } else if (playerVal > dealerVal) {
      state.outcome = 'player_win';
      state.payout = Math.floor(state.wager);
    } else if (dealerVal > playerVal) {
      state.outcome = 'dealer_win';
      state.payout = -Math.floor(state.wager * 0.35); // Lose 35% stake
    } else {
      state.outcome = 'push';
      state.payout = 0;
    }

    return state;
  }

  static createBlackjackEmbed(state) {
    const playerVal = this.calculateHandValue(state.playerHand);
    const dealerVal = state.isCompleted
      ? this.calculateHandValue(state.dealerHand)
      : state.dealerHand[0].val;

    const dealerDisplay = state.isCompleted
      ? state.dealerHand.map(c => c.label).join(' ') + ` *(${dealerVal})*`
      : `${state.dealerHand[0].label} 🂠 *(?)*`;

    const playerDisplay = state.playerHand.map(c => c.label).join(' ') + ` *(${playerVal})*`;

    const embed = new EmbedBuilder()
      .setColor(
        state.isCompleted
          ? (state.payout > 0 ? '#00FF00' : state.payout < 0 ? '#FF0000' : '#FFFF00')
          : '#2ECC71'
      )
      .setTitle('🃏 HIGH ROLLER BLACKJACK 🃏')
      .setDescription(
        `**Table**: VIP Penthouse Suite vs The Operator\n` +
        `**Stake Wagered**: $${state.wager.toLocaleString()}\n\n` +
        `🎩 **Operator's Hand**:\n> ${dealerDisplay}\n\n` +
        `👤 **Your Hand**:\n> ${playerDisplay}\n\n` +
        (state.isCompleted
          ? (state.outcome === 'player_bust'
              ? `💥 **BUST!** Hand exceeded 21! Lost wager (-$${Math.abs(state.payout).toLocaleString()}).`
              : state.outcome === 'dealer_bust'
              ? `🎉 **OPERATOR BUST!** Operator went over 21! You win **+$${state.payout.toLocaleString()}** (+100%)!`
              : state.outcome === 'player_win'
              ? `🏆 **YOU WIN!** Your ${playerVal} beat the Operator's ${dealerVal}! Won **+$${state.payout.toLocaleString()}** (+100%)!`
              : state.outcome === 'dealer_win'
              ? `❌ **OPERATOR WINS.** Operator had ${dealerVal} vs your ${playerVal}. Lost -$${Math.abs(state.payout).toLocaleString()}.`
              : `🤝 **PUSH!** Both hands equal (${playerVal}). Wager refunded.`)
          : `⚡ Choose your action:`)
      )
      .setFooter({ text: 'Season 2 Elite Challenge • Blackjack vs Dealer' });

    return embed;
  }

  static createBlackjackButtons(state) {
    if (state.isCompleted) {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('s2_blackjack_continue')
            .setLabel('Collect & Return to Tower ➔')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('s2_blackjack_hit').setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('s2_blackjack_stand').setLabel('Stand').setEmoji('✋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('s2_blackjack_double').setLabel('Double Down').setEmoji('⚡').setStyle(ButtonStyle.Danger)
    );

    return [row];
  }
}

// Method aliases for compatibility
Season2Minigames.createLaserGridEmbed = Season2Minigames.createLaserEmbed;
Season2Minigames.playLaserStep = Season2Minigames.stepLaserInfiltration;
Season2Minigames.submitAuctionBid = Season2Minigames.placeAuctionBid;
Season2Minigames.createBombDefusalEmbed = Season2Minigames.createBombEmbed;
Season2Minigames.createBombDefusalButtons = Season2Minigames.createBombButtons;
Season2Minigames.playBlackjackAction = function(state, action) {
  if (action === 'hit') return Season2Minigames.playerHit(state);
  if (action === 'double') return Season2Minigames.playerDoubleDown(state);
  if (action === 'stand') return Season2Minigames.playerStand(state);
  return state;
};

module.exports = Season2Minigames;

