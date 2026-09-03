/**
 * Card Ranks
 */

class CardRank {
    constructor(name, symbol, value) {
        this.name = name;
        this.symbol = symbol;
        this.value = value;
    }

    toString() {
        return this.symbol;
    }
}

// Define all ranks
CardRank.ACE = new CardRank('Ace', 'A', 1);
CardRank.TWO = new CardRank('Two', '2', 2);
CardRank.THREE = new CardRank('Three', '3', 3);
CardRank.FOUR = new CardRank('Four', '4', 4);
CardRank.FIVE = new CardRank('Five', '5', 5);
CardRank.SIX = new CardRank('Six', '6', 6);
CardRank.SEVEN = new CardRank('Seven', '7', 7);
CardRank.EIGHT = new CardRank('Eight', '8', 8);
CardRank.NINE = new CardRank('Nine', '9', 9);
CardRank.TEN = new CardRank('Ten', '10', 10);
CardRank.JACK = new CardRank('Jack', 'J', 11);
CardRank.QUEEN = new CardRank('Queen', 'Q', 12);
CardRank.KING = new CardRank('King', 'K', 13);

// Array of all ranks for iteration
CardRank.values = [
    CardRank.ACE, CardRank.TWO, CardRank.THREE, CardRank.FOUR,
    CardRank.FIVE, CardRank.SIX, CardRank.SEVEN, CardRank.EIGHT,
    CardRank.NINE, CardRank.TEN, CardRank.JACK, CardRank.QUEEN, CardRank.KING
];

module.exports = CardRank;
