# Hero Count Prefix Iron Bars Break

## C Source

- `nethack-c/upstream/src/dothrow.c:240-247` prints `You throw/shoot 1 ...` when a top-level command count was supplied, even when the final volley count is one.
- `nethack-c/upstream/src/dothrow.c:254-275` runs each projectile after that volley message.
- `nethack-c/upstream/src/dothrow.c:2582-2608` handles hard-impact break testing for fragile objects that hit terrain such as iron bars.

## JS Gap

The direct throw path now preserved top-level count prefixes as `_throw_shot_limit`, but the fragile iron-bars break branch returned before the normal multishot/volley message path. A counted throw of one fragile object could shatter on bars without the C-shaped `You throw 1 ...` line.

## Change

- Prepended the forced one-shot volley message in the hero-thrown fragile iron-bars break branch when a top-level shot limit is present.
- Kept the existing bars break RNG unchanged: non-point-blank `rn2(5)` force-hit evaluation followed by the hard-impact break `rn2(100)`.

## Coverage

- `top-level throw count reports one crystal ball before iron bars shatter`

## Remaining

- Nonbreaking bars hits are covered separately in audit 696; other early terrain-stop count-message paths still need source-backed coverage.
