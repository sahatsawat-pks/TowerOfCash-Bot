/**
 * Mart-Of-Cash Event Space
 * Similar to RTAB Market from RTAB6 Bot
 * Players can ROB (pick from 12 spaces against bot) or BUY items
 */

class MartOfCash {
  constructor() {
    this.name = 'Mart-Of-Cash';
    this.emoji = '🏪';
  }

  /**
   * Get the 12 robbery spaces configuration
   * Spaces: 1, 2, 3, 4, 5, 6, 7, 8, 9, Money Bag (10), Money Bank (11), Skull (instant loss)
   */
  static getRobberySpaces() {
    return [
      { id: 1, value: 1, label: '1', emoji: '1️⃣' },
      { id: 2, value: 2, label: '2', emoji: '2️⃣' },
      { id: 3, value: 3, label: '3', emoji: '3️⃣' },
      { id: 4, value: 4, label: '4', emoji: '4️⃣' },
      { id: 5, value: 5, label: '5', emoji: '5️⃣' },
      { id: 6, value: 6, label: '6', emoji: '6️⃣' },
      { id: 7, value: 7, label: '7', emoji: '7️⃣' },
      { id: 8, value: 8, label: '8', emoji: '8️⃣' },
      { id: 9, value: 9, label: '9', emoji: '9️⃣' },
      { id: 10, value: 10, label: 'Money Bag', emoji: '💰', type: 'money_bag' },
      { id: 11, value: 11, label: 'Money Bank', emoji: '🏦', type: 'money_bank' },
      { id: 12, value: -1, label: 'Skull', emoji: '💀', type: 'skull' }
    ];
  }

  /**
   * Get robbery rewards based on success
   */
  static getRobberyRewards() {
    return {
      peek: { name: 'PEEK', emoji: '👁️', weight: 2 },
      minigame: { name: 'MINIGAME', emoji: '🎮', weight: 2 },
      mysteryBox: { name: 'MYSTERY BOX', emoji: '📦', weight: 2, onlyGoodOrNeutral: true },
      xProtection: { name: 'X-PROTECTION', emoji: '🛡️', weight: 1.5 },
      randomPercentage: { name: 'RANDOM PERCENTAGE', emoji: '🎲', weight: 1.5 }
    };
  }

  /**
   * Get all robbery items (for guaranteed rewards)
   */
  static getRobberyItems() {
    return {
      peek: { key: 'peek', name: 'PEEK', emoji: '👁️' },
      minigame: { key: 'minigame', name: 'MINIGAME', emoji: '🎮' },
      mysteryBox: { key: 'mysteryBox', name: 'MYSTERY BOX', emoji: '📦' },
      xProtection: { key: 'xProtection', name: 'X-PROTECTION', emoji: '🛡️' },
      randomPercentage: { key: 'randomPercentage', name: 'RANDOM PERCENTAGE', emoji: '🎲' },
      what: { key: 'what', name: 'WHAT?', emoji: '❓' },
      nothing: { key: 'nothing', name: 'NOTHING', emoji: '⚪' }
    };
  }

  /**
   * Get purchasable items with prices
   */
  static getPurchaseItems() {
    return {
      peek: { 
        name: 'BUY PEEK', 
        price: 300000, 
        emoji: '👁️', 
        desc: 'See content in 1 floor without revealing left/right',
        buyLimit: 1
      },
      minigame: { 
        name: 'BUY MINIGAME', 
        price: 250000, 
        emoji: '🎮', 
        desc: 'Play a random minigame after leaving',
        buyLimit: 1
      },
      sixZeroes: { 
        name: 'BUY SIX ZEROES', 
        price: 1000000, 
        emoji: '🎫', 
        desc: 'Hidden minigame: Pick 6 from 12 spaces!',
        buyLimit: 1
      },
      mysteryBox: { 
        name: 'BUY MYSTERY BOX', 
        price: 100000, 
        emoji: '📦', 
        desc: 'Open a mystery box after leaving',
        buyLimit: 2
      },
      xProtection: { 
        name: 'BUY X-PROTECTION', 
        price: 500000, 
        emoji: '🛡️', 
        desc: 'Protect from X-Level once',
        buyLimit: 1
      },
      randomPercentage: { 
        name: 'BUY RANDOM PERCENTAGE', 
        price: -50, // Special: reduces player money by 50%
        emoji: '🎲', 
        desc: 'Random 0-150% multiplier (costs 50% of money)',
        buyLimit: 1
      },
      what: { 
        name: 'BUY WHAT?', 
        price: 50000, 
        emoji: '❓', 
        desc: 'Mystery item or floor content (can be game over!)',
        buyLimit: 10
      },
      nothing: { 
        name: 'BUY NOTHING', 
        price: 10000, 
        emoji: '⚪', 
        desc: 'Literally nothing... waste of money',
        buyLimit: null
      },
      sanghaOfferings: {
        name: 'BUY SANGHA OFFERINGS',
        price: 750000,
        emoji: '🙏',
        desc: 'Divine blessing: Keep all money and exit the building',
        buyLimit: 1
      },
    };
  }

  /**
   * Select weighted robbery reward
   */
  static selectRobberyReward() {
    const rewards = this.getRobberyRewards();
    const items = Object.entries(rewards);
    const totalWeight = items.reduce((sum, [_, item]) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [key, item] of items) {
      random -= item.weight;
      if (random <= 0) return { key, ...item };
    }

    return { key: 'peek', ...rewards.peek };
  }
}

module.exports = MartOfCash;
