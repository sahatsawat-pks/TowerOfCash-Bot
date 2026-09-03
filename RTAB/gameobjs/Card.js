/**
 * Playing Card
 */

const CardRank = require('./CardRank');
const CardSuit = require('./CardSuit');

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    /**
     * Get the rank
     */
    getRank() {
        return this.rank;
    }

    /**
     * Get the suit
     */
    getSuit() {
        return this.suit;
    }

    /**
     * Get numeric value (Ace=1, 2-10=face, J=11, Q=12, K=13)
     */
    getValue() {
        return this.rank.value;
    }

    /**
     * Get blackjack value (Ace=11, Face=10, others=face)
     */
    getBlackjackValue() {
        if (this.rank === CardRank.ACE) return 11;
        if (this.rank.value >= 10) return 10;
        return this.rank.value;
    }

    /**
     * Check if card is face card (J, Q, K)
     */
    isFaceCard() {
        return this.rank.value >= 11;
    }

    /**
     * Check if card is Ace
     */
    isAce() {
        return this.rank === CardRank.ACE;
    }

    /**
     * Get string representation
     */
    toString() {
        return `${this.rank.symbol}${this.suit.symbol}`;
    }

    /**
     * Compare cards by rank
     */
    compareTo(other) {
        return this.rank.value - other.rank.value;
    }
}

module.exports = Card;
