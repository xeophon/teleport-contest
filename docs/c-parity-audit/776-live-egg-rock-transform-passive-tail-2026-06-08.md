# C Parity Audit 776: Live Egg Rock Transform Passive Tail

## Sources

- `nethack-c/upstream/src/uhitm.c:1186-1195`: wielded eggs in `hmon()` use nominal one-point damage, suppress damage bonuses, and mark the next hand attack as bashing-style after the egg is used or transformed.
- `nethack-c/upstream/src/uhitm.c:1222-1243`: a fresh ordinary egg hitting a touch-petrifying target prints the egg hit text, prints the "isn't alive any more" line, stops egg timers, mutates the same object into `ROCK`/`GEM_CLASS`, clears artifact/enchantment/knowledge metadata, recomputes weight, and only places the transformed object when it was thrown.
- `nethack-c/upstream/src/uhitm.c:622-628` and `:786-789`: survivor low-HP flee runs after `hmon()` returns alive and before `hitum()` calls `passive()` with the current `uwep`.
- `nethack-c/upstream/src/uhitm.c:5934-5957`: cockatrice/chickatrice `AD_STON` passive does not call `passive_obj()`; a still-present weapon object prevents bare-hand passive stoning.
- `nethack-c/upstream/include/objects.h:1606-1607`: ordinary rocks have C weight 10.

## JS Changes

- Updated both live-egg rock conversion helpers to produce C-weight rocks and clear JS artifact metadata along with species/timer metadata.
- Preserved the in-place carried-object transform for wielded melee eggs, so the later low-HP and passive-object tail sees the transformed rock rather than a consumed egg or null weapon.

## Tests

Extended focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- thrown live ordinary egg versus cockatrice now verifies the resulting floor rock has cleared artifact/knowledge metadata and C weight 10;
- wielded live ordinary egg versus cockatrice now verifies the carried wielded rock has the same cleanup and remains in inventory;
- a synthetic touch-petrifying acid-passive target proves the transformed carried rock reaches the post-hit tail after low-HP flee by pinning `rn2(25)`, `rnd(100)`, `rn2(6)`, and final `rn2(3)` ordering.

## Remaining Gaps

- Real `AD_STON` direct-melee passive consequences are covered separately in audit 777.
- Stale ordinary egg versus touch-petrifying targets is covered separately in audit 778.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "wielded egg|wielded ordinary egg|hero-thrown live ordinary egg hitting cockatrice becomes rock|hero-thrown ordinary egg hits visible monster|hero-thrown cockatrice egg splats on stone-resistant monster|hero-thrown pyrolisk egg direct hit" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs` (pass)
- `npm run score` (`44/44`)
