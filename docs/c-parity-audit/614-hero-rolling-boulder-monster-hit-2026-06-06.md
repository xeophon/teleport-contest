# Hero Rolling Boulder Monster Hit

Date: 2026-06-06

## Scope

Cover the ordinary `ohitmon()` fallout for hero-triggered rolling-boulder paths after a failed rock-thrower snatch or when the path square contains a non-rock-thrower monster.

This slice stays source-backed and local. It does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, ROLL)`.
- `nethack-c/upstream/src/trap.c:3274` through `:3408` advances each rolling object square, checks `m_at(x, y)`, tries the rock-thrower snatch branch, and otherwise falls through to `ohitmon(mtmp, singleobj, -1, FALSE)`.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350` computes the object-vs-monster hit roll as `5 + find_mac(mtmp) + omon_adj(mtmp, otmp, FALSE)` against `rnd(20)`.
- `nethack-c/upstream/src/dothrow.c:1917` through `:1937` defines `omon_adj()`: monster size relative to medium, sleeping +2, immobile +4, and boulder +6.
- `nethack-c/upstream/src/weapon.c:225` and `:263`, with `nethack-c/upstream/include/objects.h:1617`, give boulders `dmgval()` of `rnd(20)`.
- `nethack-c/upstream/src/zap.c:3550` through `:3570` defines visible hit and miss wording: `The <object> misses <mon>.`, `The <object> hits <mon>.`, or `The <object> hits <mon>!` for damage greater than 4.
- `nethack-c/upstream/src/mthrowu.c:357` through `:494` keeps a rolling boulder in flight with range `-1`; ordinary hit/miss does not stop later down-gate, trap, or floor processing.

## JS Coverage

- `js/cmd.js` now runs a generic monster-hit check immediately after the rock-thrower snatch attempt and before down-gates, traps, floor effects, boulder chaining, doors, bars, and wall/tree stops.
- Failed rock-thrower snatches consume the snatch `rn2(3)` and then consume the normal hit `rnd(20)` plus damage `rnd(20)` only on hit.
- Non-rock-throwers skip snatch RNG entirely and go straight to the hit roll.
- The hit threshold uses monster AC plus the C `omon_adj()` pieces currently modeled for hero projectiles: target size, sleeping, immobile, and boulder +6.
- Visible misses and hits append to the rolling-boulder trigger message using the C punctuation split at damage `<= 4` vs `> 4`.
- Successful harmless rock-passer hits still consume damage RNG, clear monster sleep, leave HP unchanged, and keep the boulder rolling.
- Ordinary nonlethal hits reduce monster HP, wake the target, anger surviving non-pet targets, and keep the boulder rolling into later same-square or downstream path effects.
- Basic lethal cleanup removes the monster, drops inventory, records the vanquish, and redraws the square so ordinary fatal hits do not leave stale live monsters.

## Tests

- `hero rolling boulder failed rock thrower snatch falls through to hit roll`
- `hero rolling boulder miss against monster keeps rolling into downstream stairs`
- `hero rolling boulder hits monster before same-square land mine`
- `hero rolling boulder passes harmlessly through rock-passing monster after hit roll`

## Remaining Edges

- Full C lethal attribution is still broader than the local cleanup here: `xkilled()` vs `mondied()`, lifesaving, corpse/statue creation, special death callbacks, and side-effect ordering need separate canaries.
- Full `drop_throw()` follow-up is still incomplete for same-square shop billing, passive-object erosion, and floor-effect object routing after monster hits.
- Special `ohitmon()` object effects remain separate: potionhit, cream pies, eggs/petrification, poison, silver searing, acid, blindness, and related discovery/anger details.
- Mimic reveal and miss suppression for object/furniture mimics are not covered by this ordinary monster-hit slice.
- Broader passive combat and monster lifecycle fallout should stay in smaller C-backed slices rather than being folded into rolling-boulder path control.
