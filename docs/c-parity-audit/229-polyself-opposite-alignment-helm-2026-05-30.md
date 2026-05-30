# C Parity Audit 229: Polyself Opposite-Alignment Helm Removal

## Sources

- `nethack-c/upstream/src/polyself.c:1239-1244`: horned-form headgear fallout reports the fall message, calls `Helmet_off()`, then drops the object.
- `nethack-c/upstream/src/polyself.c:1264-1270`: no-hands or very small forms force worn headgear through the same `Helmet_off()` then `dropp()` sequence.
- `nethack-c/upstream/src/do_wear.c:552-557`: removing a helm of opposite alignment calls `uchangealign(u.ualignbase[A_CURRENT], A_CG_HELM_OFF)`.
- `nethack-c/upstream/src/attrib.c:1320-1361`: `uchangealign()` clears divine protection, restores the supplied alignment, prints the helm-off mind-sync message, resets alignment record only when alignment changes, and retouches equipment.

## JS Changes

- Added alignment normalization helpers for this forced-removal path, using explicit `game.u` base-alignment fields when present and falling back to `game._startup_align`.
- Extended forced polyself helmet removal so a dropped helm of opposite alignment restores the hero's current alignment to the modeled base alignment.
- Matched the C side effects that are modeled in JS: `game.u.ublessed` is cleared, `game.u.ualign.record` is reset only if the alignment type changed, and the C mind-sync message is appended after the fall message.
- Reused the existing hallucination helper for the alternate C message wording, with support for the legacy `game.u.hallu` flag as well as current status fields.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful no-hands polyself into a wererat while wearing a helm of opposite alignment; the helm drops, the hero returns from chaotic to lawful startup alignment, alignment record resets, `ualign.abuse` is preserved, divine protection clears, AC recomputes, and the dropped helm lands unworn on the hero square.

## Remaining Gaps

- `Helmet_off()` telepathy/caution display refresh remains open.
- C `retouch_equipment(0)` cascades from alignment changes are only partially modeled in JS.
- JS still lacks a full `u.ualignbase[]` model; this change supports likely explicit current-base fields but otherwise falls back to startup alignment.
- Terrain-specific wording still uses the existing JS `ground` wording for forced helmet drops.
- Normal wear/takeoff paths remain broader work for several helmet side effects.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "successful no-hands polyself drops helm of opposite alignment and restores alignment" test/shop-billing-helpers.test.mjs` (`1` matching test passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1117/1117` tests passed)
- `node --test test/*.mjs` (`1214/1214` tests passed)
- `npm run score` (`44/44` passing)
