// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';
import { flushDeferredWereTransforms } from './were.js';

const _inputQueue = [];

export function pushKey(key) {
    _inputQueue.push(typeof key === 'number' ? key : key.charCodeAt(0));
}

export function pushKeys(keys) {
    for (const k of keys) pushKey(k);
}

// C ref: tty_nhgetch — read one key.
// In replay mode, reads from the input queue.
// In browser mode, waits for a real keypress.
export async function nhgetch() {
    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook) await hook();

    // C ref: pline() -> tty putmsg --More-- blocking (win/tty) — a were
    // transformation whose feedback message overflowed the topline blocks
    // inside new_were() (were.c:113-115); its map repaint (newsym,
    // were.c:126-128) lands when the player dismisses the "--More--", i.e.
    // after the pre-dismissal screen snapshot, at this keypress.
    flushDeferredWereTransforms();

    if (_inputQueue.length > 0) {
        return _inputQueue.shift();
    }

    // Browser mode: wait for keypress from the display
    const display = game?.nhDisplay;
    if (display?.readKey) {
        return await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
    }

    throw new Error('Input queue empty - test may be missing keystrokes');
}

// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
