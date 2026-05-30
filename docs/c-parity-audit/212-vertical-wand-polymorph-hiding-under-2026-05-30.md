# C Parity Audit 212: Vertical Wand-Polymorph Hiding-Under Targeting

## Sources

- `nethack-c/upstream/include/objects.h:1388-1390` and `1474-1475`: spell and wand polymorph are `IMMEDIATE`, so vertical zaps route through the immediate zap path.
- `nethack-c/upstream/src/zap.c:3436-3451`: `weffects()` exercises wisdom, dispatches vertical immediate effects through `zap_updown()`, and only uses lateral `bhit(... rn1(8, 6) ...)` when there is no vertical direction.
- `nethack-c/upstream/src/zap.c:3382-3390`: downward zaps call `bhitpile(obj, bhito, x, y, u.dz)` before map effects.
- `nethack-c/upstream/src/zap.c:3391-3407`: upward zaps while `u.uundetected && hides_under(...)` directly hit the top hero-square object with `bhito()` and disclose the wand when that hit succeeds.
- `nethack-c/upstream/src/zap.c:2419-2422`: observable object effects call `learnwand()`.
- `nethack-c/upstream/src/zap.c:2426-2505`: `bhitpile()` skips the first object when zapping down while hiding under an object, skips the rest of the pile when zapping up, then rechecks hiding state.
- `nethack-c/upstream/src/zap.c:2191-2221`: `bhito()` handles object polymorph conduct, shuddering, visible discovery, replacement, and cover rehide.
- `nethack-c/upstream/src/mkobj.c:665-672`: floor object replacement preserves the object's floor-chain position rather than appending replacement objects to the end of the pile.

## JS Changes

- Added object-pile targeting controls so floor polymorph can process only selected objects or omit selected objects.
- Added hiding-under helpers using the current polymorphed form's `hidesUnder` flag and `u.uundetected`.
- Upward wand-polymorph zaps while hiding under an object now hit only the top hero-square floor object and can identify an unknown polymorph wand when that hit affects the object.
- Downward wand-polymorph zaps while hiding under an object now skip the top cover object and process lower same-square objects.
- Preserved floor-pile order when polymorph replaces objects, keeping an untouched cover object on top after lower-pile polymorph.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- An upward polymorph wand zap while hiding under objects hits only the top cover object, leaves lower pile contents alone, preserves hiding, and identifies the wand on an affected visible hit.
- A downward polymorph wand zap while hiding under objects skips the top cover object, polymorphs the lower object, preserves the cover as the top same-square item, and keeps the hero hidden.

## Remaining Gaps

- Boulder polymorph and pile restacking remain broader object-polymorph work.
- The `create_polymon()`/`polyuse()` edge where lower-pile shudder fallout can consume skipped cover is not modeled yet.
- Exact `hideunder()` and `maybe_unhide_at()` object eligibility is approximated by whether any visible same-square object remains.
- Spell polymorph floor-pile behavior remains separate from the wand command path.
- The upward direct-hit path identifies the wand but does not model the C discovery XP award.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="floor polymorph (upward|downward)|lateral wand polymorph|lateral floor polymorph" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1088/1088`)
- `node --test test/*.mjs` (`1185/1185`)
- `npm run score` (`44/44`)
