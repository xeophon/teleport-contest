# Put-on facewear state

## C anchors

- `nethack-c/upstream/src/do_wear.c:2209` through `:2425` routes `P` accessory put-on through the same eyewear checks and `Blindf_on()` state as `W`.
- `nethack-c/upstream/src/do_wear.c:2329` through `:2345` rejects facewear conflicts through `ublindf`, with distinct wording for towel, blindfold, and lenses.
- `nethack-c/upstream/src/do_wear.c:1461` through `:1492` applies blindfold/towel/lenses through the facewear slot, preserves pre-existing blindness sources, and emits ordinary messages rather than a forced `--More--`.
- `nethack-c/upstream/src/do_wear.c:1495` through `:1520` removes facewear without clearing independent blindness sources.

## JS parity

- `js/cmd.js` now shares facewear put-on/removal helpers for blindfold, towel, and lenses.
- `P` and fallback `W` facewear paths now set `owornmask = W_TOOL`, set `blindfolded`/`Blindfolded` for blinding facewear, preserve timed/cream blindness, use C-style conflict messages, and do not force a more prompt solely because blindness changed.
- The internal `takeOffObject` facewear path now uses the same removal helper so it no longer clears temporary blindness unconditionally.

## Tests

- `putting on blindfold with P preserves temporary blindness source`
- `putting on lenses while blindfolded reports C puton conflict`
- `wear command fallback puts on towel as facewear state`
- Existing `#apply` blindfold coverage now asserts the same no-forced-more behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "putting on.*blindfold|putting on.*lenses|wear command fallback.*towel|applying.*blindfold|applying.*lenses|towel or lenses|temporarily blind" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`; seed5006 now `RNG 13923/13923, Screen 249/249`)

## Remaining follow-up

- Top-level `T` still only gathers worn armor, and top-level `R`/remove is not wired despite the help entry. A separate slice should route worn accessories and facewear through the shared removal helper.
