# 136 - Special thrown-egg monster hits and fresh follow-up audits

## Implemented Slice

Horizontal hero-thrown eggs now share the C `thitmonst()` direct-hit delivery path for ordinary, touch-petrifying, and pyrolisk eggs. The hit gate still consumes `rnd(20)` and then hits when hero Dexterity beats `rnd(25)`, but special egg hits no longer fall through to generic projectile landing.

Petrifying cockatrice/chickatrice eggs now print the C `Splat!` hit text, identify the egg species, apply the fertilized-egg luck penalty, consume the egg through used-up billing, and then either petrify the target, leave stone-resistant targets alive with the nominal 1 damage, or polymorph golem targets into stone golems before the same nominal damage. Pyrolisk eggs now consume the egg and trigger the `d(3,6)` fiery explosion at the target square instead of landing as an ordinary object.

C anchors:

- `thitmonst()` uses the egg/cream-pie/venom direct-hit gate: `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2256`.
- `hmon_hitmon_misc_obj()` sets egg damage to 1, suppresses ordinary damage bonuses, applies the fertilized-egg luck penalty, and handles ordinary, petrifying, and pyrolisk egg subcases: `nethack-c/upstream/src/uhitm.c:1189`, `nethack-c/upstream/src/uhitm.c:1197`, `nethack-c/upstream/src/uhitm.c:1205`, `nethack-c/upstream/src/uhitm.c:1242`.
- Thrown splatted eggs use `obfree()`/shop used-up preservation instead of floor breakage: `nethack-c/upstream/src/uhitm.c:1178`, `nethack-c/upstream/src/shk.c:1187`.
- Petrifying eggs call `minstapetrify()`, including stone resistance and `mon_to_stone()` golem conversion: `nethack-c/upstream/src/trap.c:3858`, `nethack-c/upstream/src/mon.c:3748`.

JS changes:

- Added shared direct egg helpers for target wording, fertilized-egg luck loss, stoning resistance, stone-golem conversion, petrifying hit handling, and pyrolisk explosion delivery: `js/cmd.js:15388`, `js/cmd.js:15438`, `js/cmd.js:15445`, `js/cmd.js:15461`, `js/cmd.js:15489`, `js/cmd.js:15501`.
- The horizontal throw branch now routes all egg direct hits through `heroThrownEggHitMonster()` instead of excluding petrifying and pyrolisk eggs from the ordinary branch: `js/cmd.js:52602`.
- Direct-hit pyrolisk egg explosions propagate the resulting multi-message prompt state through `setMessage(..., more)`: `js/cmd.js:52607`.

## Tests Added

Added focused throw coverage in `test/shop-billing-helpers.test.mjs`:

- fertilized ordinary egg direct hits apply the C luck penalty before splatting: `test/shop-billing-helpers.test.mjs:18459`;
- cockatrice eggs petrify ordinary direct-hit targets and leave a statue at the monster square: `test/shop-billing-helpers.test.mjs:18556`;
- stone-resistant targets survive a cockatrice egg with only the nominal 1 damage: `test/shop-billing-helpers.test.mjs:18588`;
- golem targets become stone golems before taking nominal egg damage: `test/shop-billing-helpers.test.mjs:18614`;
- unpaid cockatrice egg stacks split the live bill and preserve the thrown unit as a used-up bill row: `test/shop-billing-helpers.test.mjs:18642`;
- pyrolisk egg direct hits explode at the monster square and catch adjacent hero/monster targets in the fireball: `test/shop-billing-helpers.test.mjs:18678`.

## Fresh Follow-Up Audits

Russell audited kicked floor-object shipping. C routes adjacent kicked objects through `kick_object()` and `ship_object()`, while JS `#kick` currently reaches empty-space feedback without inspecting floor objects. A narrow next slice can add a kick-only floor-object path for ordinary movable objects and initially reuse the existing seen hole/trapdoor shipping helpers before broadening `down_gate()` to stairs and ladders.

McClintock audited monster-thrown projectile flight. C checks occupied monster squares before the hero and applies `drop_throw()`/`passive_obj()` object disposition, while JS often resolves rocks, arrows, daggers, and darts directly against the hero. The right slice is a shared monster-projectile flight resolver plus an `ohit`/mulch-aware landing parameter, without routing monster-thrown objects through hero shop billing.

Godel audited forced chest mimic wake and ice-box survivor timers. The mimic wake helper already preserves disguise state, but visible object and furniture mimic tests should be added. The real gap is helper-level destroyed ice-box survivors: surviving corpse contents need lock-path thawing, corpse timeout restart without ordinary takeout `norevive`, and floor ice effects after placement.

Raman audited burning-oil drawbridge and liquid fallout. There is no C parity reason to destroy drawbridges with burning oil. The real gaps are hero liquid fallout after oil melts ice under the hero, raised-drawbridge under-terrain classification for movement, and broader terrain-created liquid handling for fire-resistant lava and water inventory effects.

Tesla audited remaining stone-to-flesh statue lifecycle edges. Named non-unique statues should christen the animated monster, Archeologist historic statues should print the guilt message and reduce alignment, and unique/cant-revive statues should animate through a directed doppelganger path instead of being skipped.

## Deferred Gaps From This Agent Round

- Wielded or melee egg `hmon()` paths remain separate; this slice only covers horizontal hero-thrown direct hits.
- Kicked-object shipping needs object selection, impact/drop routing, and later stairs/ladders `down_gate()` support.
- Monster-thrown projectile occupied-target resolution, hit-only missile loss, and passive-object mutation remain open.
- Destroyed ice-box survivor corpse timers and visible/furniture mimic wake preservation need focused tests/implementation.
- Burning-oil hero liquid fallout and raised drawbridge under-terrain movement should be handled in terrain work, not by adding drawbridge destruction.
- Stone-to-flesh named/historic/cant-revive statue side effects remain open.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown .*egg" test/shop-billing-helpers.test.mjs` - 20 pass, 885 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 905/905
- `npm run score` - 44/44
