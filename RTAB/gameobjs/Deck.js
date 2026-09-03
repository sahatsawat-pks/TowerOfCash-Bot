/**
 * Deck of Playing Cards
 */

const Card = require('./Card');
const CardRank = require('./CardRank');
const CardSuit = require('./CardSuit');

class Deck {
    constructor(numDecks = 1) {
        this.cards = [];
        this.reset(numDecks);
    }

    /**
     * Reset deck with specified number of decks
     */
    reset(numDecks = 1) {
        this.cards = [];
        
        for (let d = 0; d < numDecks; d++) {
            for (const suit of CardSuit.values) {
                for (const rank of CardRank.values) {
                    this.cards.push(new Card(rank, suit));
                }
            }
        }
    }

    /**
     * Shuffle the deck
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Draw a card from the deck
     */
    draw() {
        if (this.cards.length === 0) {
            throw new Error('Deck is empty');
        }
        return this.cards.pop();
    }

    /**
     * Draw multiple cards
     */
    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.cards.length === 0) break;
            drawn.push(this.draw());
        }
        return drawn;
    }

    /**
     * Get remaining cards in deck
     */
    size() {
        return this.cards.length;
    }

    /**
     * Check if deck is empty
     */
    isEmpty() {
        return this.cards.length === 0;
    }
}

module.exports = Deck;
