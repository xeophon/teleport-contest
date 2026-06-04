# Monster Launcher Poisoned Projectile Hit

Date: 2026-06-04

## Summary

Monster-fired launcher projectiles that already carry `opoisoned` now apply the upstream thrown-weapon poison side effect after a confirmed nonlethal physical hit. Poisoned projectiles display with C-style `xname()` wording such as `poisoned crude arrow`, poison resistance prints the resistance message without consuming poison RNG, and nonresistant hits use the C thrown-weapon `rn2(30)` branch ordering before exercise and `drop_throw()` landing/mulch follow-ups.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:722` through `:745`: monster-to-hero projectile hits call `thitu()` for physical damage first, then test `singleobj->opoisoned && is_poisonable(singleobj)` and call `poisoned(...)`.
- `nethack-c/upstream/include/obj.h:264` through `:268`: `is_poisonable()` includes launcher and thrown missile weapon skills from shuriken through bow ammo, including crossbow bolts.
- `nethack-c/upstream/src/objnam.c:685`: poisoned weapon `xname()` includes the `poisoned ` prefix used in hit text and poison reason.
- `nethack-c/upstream/src/objnam.c:1969`: `killer_xname()` clears `opoisoned`, so fatal poison killer names are not redundantly poisoned.
- `nethack-c/upstream/src/attrib.c:338` through `:370`: poison resistance returns after the resistance message; nonresistant thrown-weapon poison uses `rn2(30)`, with severe `d(4,6)`, attribute-only, and HP-damage `rnd(6)` branches.
- `nethack-c/upstream/src/mthrowu.c:786` through `:816`: surviving ordinary weapon hits continue to occupation stopping and `drop_throw()` only after the poison side effect returns.

## JS Changes

- `js/allmain.js`
  - Prefixes launcher projectile display names with `poisoned ` when the extracted projectile already has `opoisoned` and is poisonable.
  - Adds a launcher projectile poisonability predicate covering bow ammo, crossbow bolts, and shuriken-style names.
  - Queues a deferred hero poison effect for already-poisoned, poisonable launcher projectiles after nonlethal physical hits.
  - Preserves projectile-specific lethal arrow death causes instead of overwriting them with the generic arrow wording.
- `js/cmd.js`
  - Adds a deferred poisoned-projectile handler that applies C thrown-weapon poison resistance, `rn2(30)`, `d(4,6)`, `rnd(6)`, HP loss, and STR/CON loss branches after physical damage.
  - Lets topline appends report whether they queued an extra `--More--` line, so long poison messages remain visible.
- `test/shop-billing-helpers.test.mjs`
  - Extends the launcher fixture with a direct hero poison-resistance knob.
  - Adds focused poisoned crude-arrow canaries for resistance and nonresistant thrown-weapon poison ordering.

## Tests

- `production monster poisoned crude launcher arrow hit respects poison resistance`
- `production monster poisoned crude launcher arrow hit applies thrown-weapon poison after damage`

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'production monster poisoned crude launcher arrow hit (respects poison resistance|applies thrown-weapon poison after damage)' test/shop-billing-helpers.test.mjs` - 2 pass, 1612 skipped

## Remaining Gaps

- Natural monster inventory generation still does not hard-poison C `ORCISH_ARROW` stacks from `m_initthrow()`.
- Physical-hit life-saving before poison, poison-caused life-saving, and full poison-death cleanup ordering need a separate source-backed slice.
- Launcher poison handling is covered for already-`opoisoned` projectiles; broader dart, shuriken, and non-launcher thrown poison side effects remain separate.
