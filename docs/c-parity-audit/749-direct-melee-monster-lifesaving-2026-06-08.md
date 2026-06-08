# 749 - Direct melee monster lifesaving

## Implemented Slice

Direct hero melee lethal hits now route through the same C-shaped death-survivor order as `hmon()`/`mondead()`:

- lethal direct melee preserves C's plain hand-to-hand hit suppression when the target is already destroyed;
- a worn monster amulet of life saving is consumed before ordinary kill cleanup;
- life-saved and shifted-vampire targets remain on the level with inventory, XP, corpse, and vanquish cleanup skipped;
- genocided targets consume the worn amulet, print the visible failure message, and then continue ordinary cleanup;
- lethal survivors restore the pre-hit sleep, eating, and peaceful state while still clearing the direct-melee wait strategy mask from the outer attack command.

C anchors:

- `hmon()` subtracts melee damage and sets the lethal `hmd.destroyed` snapshot before message and death handling: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1863`, `nethack-c/upstream/src/uhitm.c:1870`.
- `hmon_hitmon_msg_hit()` suppresses the ordinary hand-to-hand `You hit ...` message when `hmd.destroyed` is true; the thrown multi-shot exception does not apply to direct melee: `nethack-c/upstream/src/uhitm.c:1637`, `nethack-c/upstream/src/uhitm.c:1642`, `nethack-c/upstream/src/uhitm.c:1646`.
- Ordinary lethal direct melee calls `killed(mon)`, which reaches `xkilled()` and then `mondead()` for survivor and cleanup handling: `nethack-c/upstream/src/uhitm.c:1904`, `nethack-c/upstream/src/uhitm.c:1908`, `nethack-c/upstream/src/mon.c:3470`, `nethack-c/upstream/src/mon.c:3503`.
- The normal post-hit wakeup path is guarded by `!hmd.destroyed && !hmd.offmap`, so a monster that survives only via `mondead()` life saving or vampire revival does not run that wake/anger follow-up: `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`.
- The outer direct attack command clears `STRAT_WAITMASK` after `hitum()` returns, independent of the inner lethal survivor branch: `nethack-c/upstream/src/uhitm.c:568`.
- Monster life saving accepts only a worn amulet for living monsters or vampire shifters, emits the medallion messages, restores movement and HP, and returns from `mondead()` when the species is not genocided: `nethack-c/upstream/src/mon.c:2825`, `nethack-c/upstream/src/mon.c:2849`, `nethack-c/upstream/src/mon.c:2863`, `nethack-c/upstream/src/mon.c:2868`, `nethack-c/upstream/src/mon.c:2873`, `nethack-c/upstream/src/mon.c:3091`, `nethack-c/upstream/src/mon.c:3093`.
- Genocided life saving consumes the amulet first, resets HP to zero, then continues ordinary death cleanup: `nethack-c/upstream/src/mon.c:2876`, `nethack-c/upstream/src/mon.c:2881`, `nethack-c/upstream/src/mon.c:3134`, `nethack-c/upstream/src/mon.c:3175`.
- Shifted vampires revive after the life-saving check and before ordinary cleanup: `nethack-c/upstream/src/mon.c:2890`, `nethack-c/upstream/src/mon.c:2911`, `nethack-c/upstream/src/mon.c:2920`, `nethack-c/upstream/src/mon.c:2937`, `nethack-c/upstream/src/mon.c:3096`.

JS changes:

- Added direct-melee lethal survivor restoration helpers near the shared monster life-saving and shifted-vampire helpers.
- Direct melee lethal cleanup now marks the monster dead, applies worn-amulet life saving, then tries shifted-vampire revival before XP, inventory drop, vanquish, corpse, and treasure cleanup.
- Successful life-saving or vampire revival returns from the command after showing the combined kill/survivor message.
- Genocided life-saving keeps the helper's false return so normal cleanup continues after amulet consumption.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- direct melee lethal life saving preserves monster inventory, skips XP/vanquish/corpse/drop cleanup, restores sleep/peace/eating, and clears `STRAT_WAITFORU`;
- direct melee genocided life saving consumes the amulet, prints the visible failure message, removes the monster, drops remaining inventory, and awards XP/vanquish cleanup;
- direct melee shifted-vampire revival transforms the target to its base vampire form before cleanup while preserving inventory and skipping XP/vanquish/corpse side effects.

## Deferred Gaps

- Invisible/unseen direct-melee life-saving wording is covered through the shared helper but is not independently asserted for direct melee.
- Deadly poisoned direct melee already has separate projectile coverage for poison/life-saving ordering; this slice only covers ordinary direct-melee lethal damage.
- Broader `hitum()` cases such as jousting, swallowed weapon hits, and special artifacts should remain separate source-backed slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal target uses monster life saving|direct hero melee genocided target consumes life saving|direct hero melee revives shifted vampire" test/shop-billing-helpers.test.mjs` - 3 pass, 2691 skipped
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal target uses monster life saving|direct hero melee genocided target consumes life saving|direct hero melee revives shifted vampire|direct hero melee against disenchanter drains unpaid enchanted weapon|direct hero melee against rust monster rusts wielded weapon|direct hero melee against acid passive can corrode wielded weapon|direct hero melee against fire passive can burn flammable wielded weapon|hero-thrown dagger lethal target uses monster life saving|hero-thrown dagger genocided target consumes life saving|hero-thrown dagger revives shifted vampire lethal target" test/shop-billing-helpers.test.mjs` - 10 pass, 2684 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
