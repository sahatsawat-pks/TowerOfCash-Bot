/**
 * RTAB Enums Module
 * Defines game status enums and types from Java RtaB6
 */

const GameStatus = {
    LOADING: 'LOADING',
    SIGNUPS_OPEN: 'SIGNUPS_OPEN',
    ADD_BOT_QUESTION: 'ADD_BOT_QUESTION',
    BOMB_PLACEMENT: 'BOMB_PLACEMENT',
    IN_PROGRESS: 'IN_PROGRESS',
    END_GAME: 'END_GAME',
    SEASON_OVER: 'SEASON_OVER'
};

const PlayerStatus = {
    OUT: 'OUT',
    ALIVE: 'ALIVE',
    WINNER: 'WINNER',
    FOLDED: 'FOLDED',
    DONE: 'DONE'
};

const LifePenaltyType = {
    NONE: 'NONE',
    FLAT: 'FLAT',
    SCALED: 'SCALED',
    INCREASING: 'INCREASING',
    HARDCAP: 'HARDCAP'
};

const MoneyMultipliersToUse = {
    NOTHING: { useBoost: false, useBonus: false },
    BOOSTER_ONLY: { useBoost: true, useBonus: false },
    BONUS_ONLY: { useBoost: false, useBonus: true },
    BOOSTER_OR_BONUS: { useBoost: true, useBonus: true }
};

const Weather = {
    BORING: 'BORING',
    KYOGRE: 'KYOGRE',        // Water-themed weather
    MYSTIC: 'MYSTIC',        // Mysterious effects
    HYPE: 'HYPE',            // High energy
    ECLIPSE: 'ECLIPSE',      // Dark effects
    WIMDY: 'WIMDY',          // Windy effects
    GROUDON: 'GROUDON',      // Fire-themed weather
    ACCADACCA: 'ACCADACCA',  // Thunder effects
    PERFECT: 'PERFECT',      // Ideal conditions
    MYSTERY: 'MYSTERY'       // Unknown effects
};

const BlammoChoices = {
    BLOCK: 'BLOCK',
    ELIM_YOU: 'ELIM_YOU',
    THRESH_OPP: 'THRESH_OPP',
    THRESHOLD: 'THRESHOLD'
};

const TournamentStatus = {
    LOADING: 'LOADING',
    OPEN: 'OPEN',
    PLAYING: 'PLAYING',
    SHUTDOWN: 'SHUTDOWN'
};

module.exports = {
    GameStatus,
    PlayerStatus,
    LifePenaltyType,
    MoneyMultipliersToUse,
    Weather,
    BlammoChoices,
    TournamentStatus
};
