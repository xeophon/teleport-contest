# Throw Getobj Count 2026-05-29

Implemented the narrow `getobj(GETOBJ_ALLOWCNT)` count behavior for the throw object prompt. No private fixtures were inspected or encoded.

## C Anchors

- `dothrow()` asks for the object with `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- `getobj()` resets count state on each prompt loop, so invalid count selections do not carry into the next prompt: `nethack-c/upstream/src/invent.c:1916`.
- Prompt digits call `get_count(NULL, first_digit, LARGEST_INT, &tmpcnt, GC_SAVEHIST)` and reuse the first non-digit as the selected key: `nethack-c/upstream/src/invent.c:1937`, `nethack-c/upstream/src/cmd.c:5008`.
- Counted throw validation happens before direction selection. Non-gold count greater than one is rejected; gold accepts a count up to the stack size: `nethack-c/upstream/src/invent.c:2028`.
- Counted gold is split before `throw_obj()`, then `throw_gold()` throws the selected gold object; uncounted gold throws the whole purse: `nethack-c/upstream/src/invent.c:2075`, `nethack-c/upstream/src/dothrow.c:112`, `nethack-c/upstream/src/dothrow.c:2656`.
- Prompt and direction cancellation do not spend a turn: `nethack-c/upstream/src/invent.c:1950`, `nethack-c/upstream/src/dothrow.c:97`, `nethack-c/upstream/src/cmd.c:4095`.

## JS Work

- Added throw-local prompt count state in `throwObject`, so digits typed after `t` are accumulated instead of treated as inventory letters.
- Added pre-direction count validation for direct throw selections:
  - counted non-gold stacks above one stay in the throw prompt and use C-shaped rejection text;
  - counted gold above the carried amount stays in the throw prompt and uses the C-shaped "You only have N." text;
  - count one and uncounted non-gold keep existing one-object throw behavior.
- Applied valid counted gold to the later throw-direction path while preserving uncounted gold as whole-purse throwing.
- Cleared throw count state on prompt cancel, inventory-menu transitions, invalid selection, direction cancel, invalid direction help, loadstone refusal, and completed throws.
- Cleared top-level `_count_prefix` when entering `t`, so command-prefix counts do not leak into prompt counts.

JS anchors: `js/cmd.js:53917`, `js/cmd.js:53925`, `js/cmd.js:53964`, `js/cmd.js:54517`, `js/cmd.js:54702`.

## Public Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `throw prompt count digit is not treated as an inventory letter`
- `throw prompt count rejects multi-count non-gold stack before direction`
- `throw prompt count limits gold stack`
- `throw prompt count rejects too much gold before direction`
- `throw prompt count clears after direction cancel`
- `top-level throw count does not leak into prompt count`

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "throw prompt count|top-level throw count" test/shop-billing-helpers.test.mjs`

## Fresh Follow-Up Findings

A parallel object-range audit selected generic `lamp` wishes as the next small registry slice:

- C `o_ranges[]` routes `lamp` through `OIL_LAMP..MAGIC_LAMP` with 45/15 object probabilities, then non-wizard `MAGIC_LAMP` substitutes to oil lamp: `nethack-c/upstream/src/objnam.c:3348`, `nethack-c/upstream/include/objects.h:927`, `nethack-c/upstream/src/objnam.c:5016`.
- JS exact magic-lamp substitution exists, but generic `lamp` currently collapses through the local tool roll rather than C `rnd_class` in wizard mode.

A parallel kicked-object audit confirmed ordinary adjacent floor-object `#kick` is still absent:

- C checks floor objects before terrain/door fallback and launches them with `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`, `nethack-c/upstream/src/dokick.c:733`.
- A down-gate test should place the gate beyond the adjacent object because `bhit()` advances before checking in-flight squares: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.

A parallel floor-statue audit selected saved traits and `cant_revive()` ordering:

- C `animate_statue()` runs `cant_revive()` before golem conversion and saved-traits restoration: `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:761`.
- JS currently defers broad unique/no-corpse/cant-revive cases before animation and does not use saved `omonst`: `js/cmd.js:13346`, `js/cmd.js:13514`, `js/cmd.js:13550`.

A parallel monster-thrown audit selected `drop_throw(ohit)` hit-state fallout:

- C hard-deletes hit eggs, then applies hit-only missile mulch before shipping/floor effects and passive object fallout: `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`.
- JS `landMonsterThrownObject()` has an `ohit` parameter, but production callers generally do not pass hit state and hit-only mulch/passive fallout remains missing: `js/cmd.js:27797`, `js/allmain.js:5932`.

## Remaining Gaps

- Throw inventory-menu count return is covered locally for throw selection by audit 193; reusable `getobj()` extraction remains separate.
- Prompt-count backspace editing is covered by audit 192.
- Top-level throw shot limits remain separate from this prompt-count slice.
- Kicked floor-object shipping, monster-thrown `drop_throw(ohit)`, floor-statue saved traits, and generic `lamp` object-range wishes remain separate slices.
