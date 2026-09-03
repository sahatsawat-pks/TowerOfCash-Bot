/**
 * Dice Rolling Utility
 */

const RtaBMath = require('../RtaBMath');

class Dice {
    constructor(numDice = 2, numFaces = 6) {
        this.numDice = numDice;
        this.numFaces = numFaces;
        this.dice = new Array(numDice).fill(1);
    }

    /**
     * Roll all dice
     */
    roll() {
        for (let i = 0; i < this.numDice; i++) {
            this.dice[i] = Math.floor(Math.random() * this.numFaces) + 1;
        }
    }

    /**
     * Get the values of all dice
     */
    getDice() {
        return [...this.dice];
    }

    /**
     * Get value of a specific die
     */
    getDie(index) {
        return this.dice[index];
    }

    /**
     * Get sum of all dice
     */
    getSum() {
        return this.dice.reduce((sum, die) => sum + die, 0);
    }

    /**
     * Get number of dice
     */
    getNumDice() {
        return this.numDice;
    }

    /**
     * Get number of faces per die
     */
    getNumFaces() {
        return this.numFaces;
    }

    /**
     * Check if all dice show the same value
     */
    areAllSame() {
        return this.dice.every(die => die === this.dice[0]);
    }

    /**
     * Count how many dice show a specific value
     */
    countValue(value) {
        return this.dice.filter(die => die === value).length;
    }

    /**
     * Get string representation
     */
    toString() {
        return this.dice.join(', ');
    }
}

module.exports = Dice;
