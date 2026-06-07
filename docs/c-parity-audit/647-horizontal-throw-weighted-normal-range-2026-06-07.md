# 647 - Horizontal Throw Weighted Normal Range

## C Source

- `nethack-c/upstream/src/dothrow.c:122-130` rejects unwielded/weak Mjollnir and rejects boulders unless the hero's form `throws_rocks()`.
- `nethack-c/upstream/src/attrib.c:1244-1262` condenses encoded strength for `ACURRSTR`, mapping ordinary strength and exceptional strength into the 3..25 formula value.
- `nethack-c/upstream/src/dothrow.c:1613-1633` computes the normal horizontal range from condensed strength and single-object weight, with heavy iron balls using `/100`, other objects using `/40`, attached-ball pre-caps, and a minimum range of one.
- `nethack-c/upstream/src/dothrow.c:1635-1648` applies ammo adjustments after the base weighted range; unmatched gem-class sling ammo skips the unmatched non-gem half-range warning path.
- `nethack-c/upstream/src/dothrow.c:1650-1658` applies air/levitation reaction splitting before the later special range overrides.
- `nethack-c/upstream/src/dothrow.c:1660-1672` applies final special overrides in order: boulder range 20, Mjollnir half range, tethered aklys cap, floor-stuck attached ball range one, and underwater final range one.
- `nethack-c/upstream/src/zap.c:3851-3870` advances `bhit()` one tile while `range-- > 0`, so a computed range of one lands adjacent to the hero.

## Port Notes

- Direct hero `t` horizontal throws no longer use the fixed `8` fallback for ordinary non-ammo objects; they now use the shared C-style strength/weight range helper.
- The direct throw path now preserves the C ordering by applying ammo/weighted range, then air/levitation split, then boulder/Mjollnir/aklys/floor-ball special overrides, with underwater as the final cap.
- Non-rock-throwing heroes now get the C boulder preflight rejection before flight, while rock-throwing forms use the C boulder range of 20.
- Ordinary non-ammo objects such as loadstones, lances, crystal plate mail, and gold stacks now stop according to their weight instead of reaching the old fixed-range endpoint.
- Unmatched gem-class sling ammo, including loadstones, now keeps the weighted range path without the unmatched non-gem launcher warning.

## Tests

- `hero-thrown loadstone falls short of rock-passing monster by C weight range`
- `hero-thrown stone missile range stops before rock-passer miss roll`
- `direct hero-thrown crystal plate mail range-one landing remains intact after resisted hard landing`
- `direct hero-thrown crystal plate mail range-one landing cracks on hard landing`
- `direct hero-thrown fully cracked crystal plate mail range-one landing shatters on hard landing`
- `hero-thrown heavy ordinary weapon uses C weight range on normal ground`
- `hero-thrown high-strength ordinary weapon range exceeds old fixed fallback`
- `hero-thrown boulder requires rock-throwing form`
- `throws-rocks hero-thrown boulder uses C range twenty on normal ground`
- `throwing gold from inventory uses C weighted range before donation accounting`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern="hero-thrown loadstone|stone missile|glass gem|ruby harms|crystal plate mail|ordinary weapon range|heavy ordinary weapon|high-strength ordinary weapon|boulder requires|boulder uses C range twenty|weighted range before donation|Mjollnir|primary-wielded aklys range" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full ball-and-chain throwing still needs dedicated attached-ball and buried/floor-stuck landing/recoil coverage.
- The separate `f` command path still needs C `dofire()`/`throw_obj()` parity for launcher matching, flight, hits, and range.
- Dedicated Valkyrie Mjollnir return-message and failed-catch canaries remain open.
