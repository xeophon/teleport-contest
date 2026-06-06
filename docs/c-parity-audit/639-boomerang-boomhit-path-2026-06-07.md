# Boomerang Boomhit Path

## C anchors

- `nethack-c/upstream/src/dothrow.c:1601` through `:1611`: non-underwater boomerangs divert from ordinary `bhit()` into `boomhit()`, and a caught boomerang returns to inventory after Dexterity exercise.
- `nethack-c/upstream/src/dothrow.c:1671` through `:1677`: underwater throws use the ordinary straight path with forced range 1 instead of `boomhit()`.
- `nethack-c/upstream/src/zap.c:4172` through `:4232`: `boomhit()` converts the throw direction with `xytodir()`, walks ten curved steps, repeats the initial and opposite headings on steps 0 and 5, uses `DIR_LEFT()` for right-handed heroes and `DIR_RIGHT()` for left-handed heroes, backs up one square on off-map or blocked terrain, catches on `rn2(20) < ACURR(A_DEX)`, prints `Klonk!` on sinks, and otherwise leaves the final landing square in `gb.bhitpos`.
- `nethack-c/upstream/src/cmd.c:3847` through `:3855`, `nethack-c/upstream/include/hack.h:656` through `:662`, and `nethack-c/upstream/src/decl.c:77` through `:78`: direction indexes, `DIR_LEFT()`/`DIR_RIGHT()`/`DIR_CLAMP()`, and the shared `xdir[]`/`ydir[]` ordering.

## JS parity

- `heroThrownBoomerangFlightResult()` now computes the C ten-step curve for non-underwater boomerangs before the ordinary straight throw scan.
- Successful return to the hero square consumes the C catch roll, exercises Dexterity through the existing projectile helper, leaves the boomerang in inventory, and prints `You skillfully catch the boomerang.`
- Curved path monster interception feeds the existing hero-thrown weapon impact path, preserving audit 638 boomerang hit value and damage data.
- Sink and blocked/off-map outcomes now use the C curved final square before ordinary landing, with audible sink `Klonk!` routed through the existing landing code.
- Underwater boomerangs intentionally fall through to the ordinary path.

## Replay-free coverage

- `hero-thrown boomerang follows C return path and is skillfully caught`
- `hero-thrown boomerang curves into off-line monster before returning`
- `hero-thrown boomerang curves onto sink and falls there with Klonk`

The catch canary drives the real `t` command with Dexterity 25, asserts the first C-order RNG calls `rn2(20)` then Dexterity exercise `rn2(19)`, and verifies the boomerang remains carried with no floor landing.

The off-line monster canary places a target at the right-handed east-throw curve square `(8,4)`, proving the path no longer uses only the ordinary east line before applying the existing weapon hit/damage branch.

The sink canary places a sink at the same curved square and verifies `Klonk!`, inventory removal, hard-landing resistance roll, and landing at the sink square rather than the old straight-line terminal square.

## Remaining candidates

- Failed self-catch currently consumes the C catch roll and lands the boomerang at the hero square, but does not yet model `thitu(10 + obj->spe, Maybe_Half_Phys(dmgval(...)), ..., "boomerang")`.
- Levitation and air-level recoil from `dothrow.c:1602` through `:1603` remain open.
- The monster-hit repeat budget `nhits = max(1, obj->spe + 1)` and `throwit_mon_hit()` continuation after non-terminal monster hits remain open.
