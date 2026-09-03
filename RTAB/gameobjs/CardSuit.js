/**
 * Card Suits
 */

class CardSuit {
    constructor(name, symbol, color) {
        this.name = name;
        this.symbol = symbol;
        this.color = color; // 'red' or 'black'
    }

    toString() {
        return this.symbol;
    }

    isRed() {
        return this.color === 'red';
    }

    isBlack() {
        return this.color === 'black';
    }
}

// Define all suits
CardSuit.CLUBS = new CardSuit('Clubs', '♣', 'black');
CardSuit.DIAMONDS = new CardSuit('Diamonds', '♦', 'red');
CardSuit.HEARTS = new CardSuit('Hearts', '♥', 'red');
CardSuit.SPADES = new CardSuit('Spades', '♠', 'black');

// Array of all suits for iteration
CardSuit.values = [
    CardSuit.CLUBS, CardSuit.DIAMONDS, CardSuit.HEARTS, CardSuit.SPADES
];

module.exports = CardSuit;
