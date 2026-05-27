# Royal Jelly `#rub` Egg Audit - 2026-05-27

This note records the source-backed follow-up after the royal-jelly eating slice. The target behavior is NetHack C's `#rub` path for `LUMP_OF_ROYAL_JELLY` on eggs.

## Upstream C Anchors

- `apply.c:dorub()` selects lamps, gray stones, and `LUMP_OF_ROYAL_JELLY`; no hands blocks the command before object selection.
- `apply.c:use_royal_jelly()` splits exactly one lump from a stack, removes it from inventory during target selection, and restores it if target selection is canceled.
- `apply.c:jelly_ok()` suggests only eggs. The defensive non-egg branch says nothing happens but normal selection should not reach it.
- One lump affects the whole target egg stack. The C comment says this explicitly, and the code mutates `eobj` without splitting eggs.
- Killer bee eggs become queen bee eggs before BUC handling.
- Cursed jelly calls `kill_egg()`, which stops the hatch timer but does not clear the egg species.
- Uncursed jelly attaches a random hatch timer only when `corpsenm != NON_PM` and the egg is not already timed.
- Blessed jelly sets `spe = 2` only for fertile eggs and only if the egg was not already yours.
- Consumption uses `obfree()` after `freeinv()`. For unpaid jelly, generic shop logic preserves a used-up bill row; after a split stack, only the single used lump becomes used-up debt.

## JS Status

- `js/cmd.js` now keeps the existing visible prompt flow but applies the C egg semantics in `rubRoyalJellyOnEgg()`.
- Cursed rub clears all JS hatch timer bookkeeping fields while preserving the transformed species, matching C's timer-only `kill_egg()` effect.
- Blessed rub now marks only fertile eggs with `spe = 2`; generic eggs stay infertile and report no apparent effect.
- Royal jelly rub consumption now uses a stack-aware used-up billing helper so unpaid single lumps and split stack lumps preserve shop debt like C `obfree()`.
- `#rub` prompt handling now follows C `getobj()` quitchars for space, Enter, and Escape at both the first object prompt and the royal-jelly target prompt, including no-turn `Never mind.` cancellation.
- Empty royal-jelly target selection now uses the C forced-prompt `[*]` form, and `#rub` with no rub-suitable object reports `You don't have anything to rub.`
- Public tests in `test/shop-billing-helpers.test.mjs` now cover target prompting, killer-bee stack conversion/timing, blessed fertile vs generic eggs, cursed timer cancellation, and unpaid stack split billing.

## Remaining Gaps

- The JS path does not physically split and remove one jelly lump before the egg-target prompt, so cancellation restoration is not internally C-shaped yet. The visible successful path and no-consumption cancellation behavior remain covered by the command flow.
- Broader object timer parity still needs a central timer registry rather than local `eggHatchTurn` fields.
