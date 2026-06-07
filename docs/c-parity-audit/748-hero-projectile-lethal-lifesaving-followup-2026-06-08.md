# 748 - Hero projectile lethal lifesaving follow-up

## Implemented Slice

Hero projectile lethal hits now keep C's distinction between an ordinary surviving hit and a lethal hit whose target survives only because of monster life saving or shifted-vampire revival:

- projectile impact callers track `lethalHit` before invoking `xkilled()`-style cleanup;
- life-saved and vampire-revived targets no longer run the ordinary post-hit wake, wait-strategy clear, mimic reveal, peaceful anger, or polearm worm-cut follow-up;
- ordinary nonlethal projectile hits still run the existing wake/anger follow-up;
- deadly poison plus monster life saving keeps no-kill-message ordering and leaves poison wear-off feedback after the amulet messages;
- genocided monsters with a worn life-saving amulet consume the amulet, print the visible failure message, and then continue ordinary death cleanup.

C anchors:

- `hmon()` computes damage, applies poison, sets `hmd.destroyed` when HP reaches zero, then prints hit text before poison/death text: `nethack-c/upstream/src/uhitm.c:1806`, `nethack-c/upstream/src/uhitm.c:1809`, `nethack-c/upstream/src/uhitm.c:1863`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1897`.
- Deadly poison prints `The poison was deadly...` and calls `xkilled(mon, XKILL_NOMSG)`, suppressing the normal `You kill ...!` message while still recording conduct: `nethack-c/upstream/src/uhitm.c:1899`, `nethack-c/upstream/src/uhitm.c:1902`, `nethack-c/upstream/src/mon.c:3498`.
- The ordinary post-hit wakeup block only runs when `!hmd.destroyed && !hmd.offmap`; lethal life-saving leaves `hmd.destroyed` set even if `mondead()` returns with the monster alive: `nethack-c/upstream/src/uhitm.c:1917`.
- Monster life saving consumes only a worn amulet, restores HP and movement, then returns before ordinary cleanup when the species survives genocide checks: `nethack-c/upstream/src/mon.c:2825`, `nethack-c/upstream/src/mon.c:2849`, `nethack-c/upstream/src/mon.c:2863`, `nethack-c/upstream/src/mon.c:2873`, `nethack-c/upstream/src/mon.c:3091`.
- Genocided monster life saving consumes the amulet before setting HP back to zero, prints `Unfortunately, ... is still genocided...` if the square is visible, and then ordinary death cleanup continues: `nethack-c/upstream/src/mon.c:2876`, `nethack-c/upstream/src/mon.c:2881`, `nethack-c/upstream/src/mon.c:3134`, `nethack-c/upstream/src/mon.c:3175`, `nethack-c/upstream/src/mon.c:3582`, `nethack-c/upstream/src/mon.c:3671`.
- Projectile fallout resumes after `hmon()` via hit-only mulch and passive-object handling: `nethack-c/upstream/src/dothrow.c:2220`, `nethack-c/upstream/src/dothrow.c:2226`.

JS changes:

- Added `lethalHit` guards in kicked gem, fired launcher ammo, thrown-by-hand ammo, thrown/kicked weapon, thrown gem, and applied polearm projectile impact helpers.
- Kept ordinary hit wake/anger behavior for nonlethal hits only.
- Left the shared monster life-saving helper's cleanup bypass intact for successful saves and ordinary cleanup path intact for genocided saves.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- ordinary monster life-saving after a lethal thrown dagger does not wake or anger a peaceful sleeping target and does not clear eating/wait strategy;
- unseen monster life-saving preserves the same target state while printing only `Maybe not...`;
- deadly poisoned crossbow bolt life-saving suppresses `You kill`, orders alignment warning, hit text, poison-deadly text, medallion messages, and poison wear-off feedback, and skips cleanup/XP/drop side effects;
- genocided monster life-saving consumes the worn amulet, prints the visible failure message, drops only remaining monster inventory, removes the monster, and awards conduct/XP/vanquish cleanup.

## Deferred Gaps

- Fired-launcher deadly-poison life-saving has the same shared helper path but is not independently covered.
- Unseen genocided life-saving is not independently covered.
- Broader non-projectile monster life-saving callers should stay separate from this projectile `hmon()` follow-up slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal target uses monster life saving|hero-thrown dagger unseen monster life saving|hero-thrown deadly poisoned crossbow bolt uses monster life saving|hero-thrown dagger genocided target consumes life saving|hero-thrown dagger lethal target ignores unworn monster life saving|hero-thrown deadly poisoned crossbow bolt revives shifted vampire|hero-thrown lawful poisoned crossbow bolt can wear off" test/shop-billing-helpers.test.mjs` - 7 pass, 2684 skipped
- `node --test --test-reporter=spec --test-name-pattern "revives shifted vampire lethal target|deadly poisoned crossbow bolt uses monster life saving|genocided target consumes life saving|lethal target uses monster life saving|unseen monster life saving" test/shop-billing-helpers.test.mjs` - 8 pass, 2683 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
