// gstate.js — Global game state reference.
// All game modules import `game` from here.

export let game = {};

let _resumeTrap = null;
export function trapResumeIndex(fn) { _resumeTrap = fn; }
let _resumeVal = 0;

export function resetGame() {
    game = {};
    _resumeVal = 0;
    if (_resumeTrap) {
        Object.defineProperty(game, '_monster_resume_index', {
            get() { return _resumeVal; },
            set(v) { _resumeTrap(v); _resumeVal = v; },
            configurable: true,
            enumerable: true,
        });
    }
    return game;
}
