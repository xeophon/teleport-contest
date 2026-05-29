# Throw Getobj Downplayed Fallback Parity

Date: 2026-05-29

## C Source

- `dothrow()` routes throw selection through `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- `throw_ok()` classifies auto-return weapons, coins, ordinary weapons, sling gems, and throwable boulders as `GETOBJ_SUGGEST`, while known-welded items, wielded single weapons, offhand weapons, and the final catch-all are `GETOBJ_DOWNPLAY`: `nethack-c/upstream/src/dothrow.c:317`.
- `getobj()` builds suggested letters in `lets` and acceptable downplayed letters in `altlets`; `GETOBJ_DOWNPLAY` removes the letter from the prompt/menu suggestion set and appends it to `altlets`: `nethack-c/upstream/src/invent.c:1760`, `nethack-c/upstream/src/invent.c:1885`.
- For a `?` inventory menu, C normally passes `lets`, but if there are no suggested letters and `altlets` is non-empty it falls back to the downplayed letters. Prompt-level `*` passes no allowed-choice filter, so it shows full inventory: `nethack-c/upstream/src/invent.c:1964`, `nethack-c/upstream/src/invent.c:1969`.
- Counted menu return via `display_pickinv(... allowcnt ? &ctmp : NULL)` remains a separate prompt/menu primitive: `nethack-c/upstream/src/invent.c:1979`.

## JS Gap

- JS throw `?` always opened a menu filtered to suggested throw candidates.
- If inventory only contained downplayed-but-legal throw objects, the prompt correctly showed `[*]`, but `?` produced an empty filtered menu instead of falling back to those downplayed letters.
- Prompt-level `*` already opened full inventory; menu-level `*` remains handled inside the active inventory menu rather than widening the prompt filter.

## Implemented

- Added a throw downplay predicate that treats lettered non-suggested inventory as acceptable downplayed throw candidates.
- Added a shared throw menu filter resolver so paging and widening use the same active filter.
- Updated throw `?` to choose the suggested menu when suggestions exist, otherwise use the downplayed fallback.
- Kept filtered-menu `*` inside the active throw menu while preserving prompt-level `*` as the full-inventory path.

## Tests

- Added `throw question menu falls back to downplayed inventory when no suggestions exist`.
- Added `throw question menu keeps suggested subset when suggestions exist`.
- The existing throw prompt count regression still guards direct count parsing independently of this menu fallback slice.

## Remaining Gaps

- Throw menu count return remains open reusable `getobj()` work.
- A broader reusable `getobj()` primitive would still need to model direct-letter validation, menu count return, hands/self rows, and command-queue behavior across commands.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'throw question menu|throw prompt count' test/shop-billing-helpers.test.mjs`
- `bash frozen/score.sh sessions/seed0004-feeding-pony.session.json`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` - 44/44 passing
