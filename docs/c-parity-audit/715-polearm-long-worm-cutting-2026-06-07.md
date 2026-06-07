# 715 - Polearm Long Worm Cutting

## C Source

- `nethack-c/upstream/src/apply.c:3491-3521` stores the selected polearm square in `gb.bhitpos`, resolves `m_at()` at that square, records whether the target is not on the worm head, then calls `thitmonst(mtmp, uwep)`.
- `nethack-c/upstream/src/dothrow.c:2051-2054` applies the distance hit modifier from the long worm head coordinates, while `nethack-c/upstream/src/dothrow.c:2199-2208` runs `hmon()` first and then calls `cutworm(mon, gb.bhitpos.x, gb.bhitpos.y, chopper)` if the long worm survived.
- `nethack-c/upstream/src/uhitm.c:934-944` and `nethack-c/upstream/src/uhitm.c:1070-1088` use melee weapon damage for applied polearm hits, so a glaive uses its normal small/large damage dice rather than the old JS `rnd(2)` fallback.
- `nethack-c/upstream/src/worm.c:373-393` ignores head hits and uses `rnd(20) >= 17` for ordinary applied polearm body/tail cuts because `thitmonst()` passes only `is_axe(obj)` as the extra cut bonus.
- `nethack-c/upstream/src/worm.c:406-448` shrinks a tail hit silently, while a non-splitting body hit restores the cut square as the old worm's new tail, removes the severed tail side, prints `You cut part of the tail off of <worm>.`, and halves current HP when above 1.
- `nethack-c/upstream/src/worm.c:451-476` handles the surviving-tail split: both worms drop two levels but not below 3, both roll new max HP with `<level>d8`, the new worm head appears on the cut square, and C prints `You cut <worm> in half.`
- `nethack-c/upstream/include/objects.h:292-341` defines the named polearm base small/large damage dice, while `nethack-c/upstream/src/weapon.c:225-289` adds polearm-specific extra damage such as `rnd(4)`, `rnd(6)`, or `d(2,4)`.

## Port Notes

- Polearm target lookup now treats visible long worm body/tail segment coordinates as real monster targets for preview, manual `a` targeting, remembered-hit fallback, and `f` autohit.
- Applied polearm hits now use named polearm melee damage dice, polearm-specific extra damage dice, and weapon-skill damage bonus when the concrete polearm kind is known. Snickersnee keeps the generic fallback because this slice only ports ordinary polearm damage rows.
- Long worm segment cuts now run after damage and wakeup but before Dexterity exercise and passive object effects, matching C's `thitmonst()` order.
- JS long worm segments are stored head-adjacent to tail. Tail cuts remove the last segment; non-splitting body cuts keep the head side plus the hit square; splitting body cuts keep the old head side on the original worm and create a new worm on the hit square with the old tail side.

## Tests

- `applying polearm cursor describes visible long worm segment`
- `applying polearm cut on long worm tail segment removes tail segment`
- `applying polearm cut on long worm body segment removes severed tail`
- `applying polearm cut on long worm body segment can split into new worm`
- `applying generated spetum uses large-target extra damage die`
- Existing polearm damage canaries now assert the concrete glaive die and skill-damage bonus where applicable.

## Remaining Follow-Ups

- Full applied-polearm artifact parity still has additional special cases outside this worm-cutting slice.
