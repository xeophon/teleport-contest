# 729 - Fire Manual Ready Candidates

## C Source

- `nethack-c/upstream/src/dothrow.c:543-550` calls `doquiver_core("fire")` when `f` has no readied object and autoquiver is disabled or fails.
- `nethack-c/upstream/src/wield.c:294-326` defines `ready_ok()`: matching ammo is suggested, unmatched ammo and launchers are downplayed, weapons and coins are suggested, and `-` is downplayed when the quiver is already empty.
- `nethack-c/upstream/src/wield.c:532-566` uses `GETOBJ_ALLOWCNT`, lets cancellation return `ECMD_CANCEL`, and rejects worn armor/accessories after selection with `You cannot fire that!`.
- `nethack-c/upstream/src/wield.c:652-662` prints `You ready:` before setting `uquiver` for `verb=="fire"`, so the ready line does not include the quiver suffix.
- `nethack-c/upstream/src/dothrow.c:105-112` skips `throw_gold()` when gold is in the quiver, so a quivered coin stack is fired one coin at a time.

## Port Notes

- Manual `f` fallback now suggests and accepts ordinary weapons and coins in addition to the existing projectile/gem candidates.
- Manual selection now uses the same `You ready:` staging path as autoquiver, so selected weapons/coins wait for the More acknowledgement before `In what direction?`.
- Worn non-weapon inventory selected from an open manual fire prompt now reports `You cannot fire that!` instead of pretending the letter is absent.
- `fireDirection` now updates `_goldCount` and the carried gold line when firing a quivered coin, preserving the remaining stack as readied and landing one coin.

## Tests

- `f command manual prompt readies weapon before direction prompt`
- `f command manual prompt can ready and fire one quivered coin`
- `f command manual prompt rejects worn armor after selection`

## Remaining Follow-Ups

- Manual `?`/`*` inventory help and downplayed selection are still broader than this prompt-letter slice.
- Selecting the primary wielded weapon, confirming it as the quiver object, and preserving ready-time across later direction cancellation still needs dedicated parity work.
- Manual count handling for `GETOBJ_ALLOWCNT`, including split stacks and the C `"can't ready only part of your gold."` branch, remains incomplete.
