# Subagent Findings 76: Water Vapor Lycanthropy

## Scope

Implement the hero lycanthropy effects from potion vapor when water is destroyed near the hero. This slice covers cursed water transforming an unpolymorphed lycanthrope into the matching were-beast and blessed water reverting a matching were-beast form without curing lycanthropy. Gremlin water-vapor splitting remains first-priority in the branch and still suppresses lycan handling.

## Upstream C Anchors

- `nethack-c/upstream/src/potion.c:1906` gates potion vapor after direct or nearby destruction; direct hits use distance zero and nearby vapor is probabilistic.
- `nethack-c/upstream/src/potion.c:1943` lets a wet worn towel block all vapor effects with `Some vapor passes harmlessly around you.`
- `nethack-c/upstream/src/potion.c:2080` through `potion.c:2089` define the water-vapor branch: gremlin polyself calls `split_mon()` first; otherwise, lycanthropy checks `u.ulycn`.
- `nethack-c/upstream/src/potion.c:2083` calls `you_unwere(FALSE)` for blessed water only when the current hero form is exactly `mons[u.ulycn]`.
- `nethack-c/upstream/src/potion.c:2084` notes that holy/unholy water vapor triggers transformation but does not cure lycanthropy.
- `nethack-c/upstream/src/potion.c:2088` calls `you_were()` for cursed water only when the hero is not currently polymorphed.
- `nethack-c/upstream/src/were.c:191` through `were.c:207` show `you_were()` aborting under `Unchanging`, already-matching were form, polymorph-control refusal, or nearby monster pressure before `polymon(u.ulycn)`.
- `nethack-c/upstream/src/were.c:213` through `were.c:226` show `you_unwere(FALSE)` reverting without `set_ulycn(NON_PM)` when allowed, or extending the were timer when blocked.
- `nethack-c/upstream/src/polyself.c:1367` through `polyself.c:1435` show `rehumanize()` restoring the base hero form and printing `You return to <race-adj> form!`

## JS Findings

- `js/cmd.js` already routes inventory-fire, hard-landing, and direct/adjacent potion vapor through `potionBreathe()`.
- The existing water branch only performed gremlin polyself splitting, so blessed and cursed water vapor had no lycanthropy effect.
- Existing polyself helpers already support compact monster-form transitions and base-form restoration, but the form table lacked were-beast entries.
- Existing wolfsbane lycanthropy coverage only cured flags; it did not provide vapor-triggered shape changes.

## Implementation

- Added `wererat`, `werejackal`, and `werewolf` entries to `POLYSELF_EXTRA_FORMS` with C-shaped glyphs, levels, movement, monster AC, no-hands state, no-corpse state, and `wereBeast` marking.
- Added `heroLycanthropeBeastName()` to map JS lycanthropy state to the matching beast-form name, including `human werewolf` and `wolf werewolf` style names.
- Added a narrow `monster_nearby()` analogue for were changes so visible adjacent hostile pressure can block involuntary changes.
- Added `waterVaporLycanthropyEffect()` after the gremlin split branch:
  - blessed water reverts only if the current polyself form exactly matches the lycanthrope beast and leaves `ulycn`/`lycanthrope` intact;
  - cursed water transforms only if the hero is not already polymorphed;
  - both paths abort under `Unchanging`, nearby hostile pressure, or unsupported polymorph-control prompts.
- Hardened `becomeMonster()` rank preservation for tests and callers without initialized `game.urole`.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- cursed water vapor transforms an unpolymorphed lycanthrope into a werewolf, preserves `ulycn`, and avoids ordinary odor/eyes-water vapor prelude for water;
- blessed water vapor reverts a matching werewolf form, restores the saved base HP, preserves lycanthropy, and does not print the wolfsbane purification message.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='water vapor|lycanthrope|were-beast|gremlin polyself' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Full numeric monster-id mapping for `u.ulycn` remains deferred; the JS slice supports string/object/fallback name state used by current tests and helpers.
- Polymorph-control prompts for `you_were()` and `you_unwere()` remain deferred, so this slice conservatively aborts those automatic vapor changes when control is active.
- C's complete `monster_nearby()` details, including hallucination, helpless monsters, scary squares, and exact `canspotmon()` behavior, are only approximated for this narrow vapor path.
- Full `polymon()`/`rehumanize()` equipment side effects, were timers, armor breakage, weapon dropping, and intrinsic recalculation remain broader polyself-core follow-ups.
