# Kicked object web and pit refusal

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/src/dokick.c:489` selects the top floor object for `kick_object()`.
- `nethack-c/upstream/src/dokick.c:517` rejects boulders, the hero's ball, and the hero's chain before the trap-under-object checks.
- `nethack-c/upstream/src/dokick.c:521` refuses objects in pits, unless the hero passes walls, and objects in webs.
- `nethack-c/upstream/src/dokick.c:523` reveals an unseen trap before reporting the refusal.
- `nethack-c/upstream/src/detect.c:1939` `find_trap()` sets `tseen`, exercises Wisdom, updates the glyph, and reports `You find <trap>.`
- `nethack-c/upstream/src/dokick.c:525` reports `You can't kick something that's in a web!`, `pit!`, or hallucination's `tizzy!`.
- `nethack-c/upstream/src/dokick.c:1452` checks floor objects before ordinary terrain fallback.

## JS update

- `js/cmd.js` now checks for a web or pit under a kicked floor object before kicked-object support gates, range rolls, fragile preflight, splitting, or flight.
- The refusal marks unseen traps as seen, exercises Wisdom, reports the C `You find ...` discovery message, leaves the object in place, spends the command turn, and uses the C normal/hallucinating wording.
- `test/shop-billing-helpers.test.mjs` adds command-level canaries for unseen web, unseen pit, and hallucinating `tizzy` wording.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "floor object in unseen web|floor object in unseen pit|trap while hallucinating" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44 passing`)
