# 739 - Hero Poisoned Projectile Alignment And Wear-Off

## C Source

- `nethack-c/upstream/src/dothrow.c:2011-2205` routes direct hero projectile monster hits through `thitmonst()` and `hmon()`.
- `nethack-c/upstream/src/uhitm.c:1509-1537` applies poisoned weapon role/alignment penalties, rolls `rn2(nopoison)` for poison wear-off, then handles resistance, nonfatal `rnd(6)` damage, or deadly poison.
- `nethack-c/upstream/src/uhitm.c:1894-1925` reports poison effects after the visible hit text, suppresses the ordinary kill message for deadly poison, and prints the no-longer-poisoned message last.

## Port Notes

- Added focused canaries for the already-ported helper branches from audit 687.
- Samurai fired poisoned arrows now have direct coverage that the dishonor message precedes the hit text, the Samurai abuse/record penalty applies, and nonfatal poison adds `rnd(6)` damage after ammo damage.
- Lawful direct-thrown matching crossbow bolts now have coverage for wear-off before the hit message, deadly poison cleanup without `You kill ...!`, and a landed projectile whose `opoisoned` flag was cleared while the carried source stack remains unchanged.

## Tests

- `f command Samurai poisoned arrow applies alignment penalty before nonfatal poison damage`
- `hero-thrown lawful poisoned crossbow bolt can wear off before deadly poison cleanup`

## Remaining

- Poisoned multishot stack behavior and broader special death/passive cleanup remain separate projectile slices.
