# 744 - Hero projectile gas spore and invisible cleanup

## Implemented Slice

Hero projectile kills now share the C death cleanup rows that were still missing from the JS projectile helper:

- remembered invisible markers on the killed monster square are cleared when the projectile kill is final;
- shifted vampire revival still returns before final death cleanup, so it does not clear `map_invisible`;
- gas spore projectile deaths consume C's corpse-treasure gate roll before the `G_NOCORPSE` explosion path;
- gas spore explosions run before projectile landing and preserve the queued More flow for monster and hero blast fallout.

C anchors:

- `thitmonst()` routes hero projectiles through `hmon()` and then ordinary `killed()`/`xkilled()` death handling before projectile landing continues: `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/uhitm.c:1189`.
- Final monster death clears remembered invisible glyphs on the monster square: `nethack-c/upstream/src/mon.c:3170`.
- Corpse handling checks the random treasure/corpse gate before `G_NOCORPSE` suppresses actual corpse placement: `nethack-c/upstream/src/mon.c:3485`.
- Gas spore death explosions consume two `d(4,6)` rolls, print `Boom!`, then apply adjacent monster and hero blast effects: `nethack-c/upstream/src/mon.c:3602`.

JS changes:

- `killMonsterFromHeroProjectileHit()` now clears `map_invisible` and `remembered_glyph` after confirmed projectile kills, before corpse/explosion handling: `js/cmd.js:22767`.
- The same helper now consumes `rn2(6)` before queuing a gas spore death explosion and skips corpse placement when the explosion path runs: `js/cmd.js:22774`.
- Projectile impact helpers now return `more` when kill handling queued follow-up messages: `js/cmd.js:22589`, `js/cmd.js:22682`, `js/cmd.js:22899`, `js/cmd.js:22937`.
- Fire, volley, and ordinary throw command paths now preserve projectile-impact More state alongside landing/recoil More state: `js/cmd.js:70019`, `js/cmd.js:71110`, `js/cmd.js:71216`.

## Tests Added

Added focused regression coverage in `test/shop-billing-helpers.test.mjs`:

- hero-thrown dagger killing a gas spore consumes `rnd(20)`, `rnd(4)`, `rn2(6)`, then two `d(4,6)` rolls, prints `Boom!`, applies adjacent monster and half-physical hero blast damage, leaves no gas spore corpse, and lands the dagger on the target square;
- hero-thrown dagger killing a remembered invisible goblin clears that square's invisible marker before the projectile lands while leaving an unrelated remembered marker untouched;
- the existing shifted vampire projectile revival test now uses a stable cell and asserts the final-death cleanup did not clear `map_invisible` when the target revived.

## Deferred Gaps

- Hero projectile kill XP, grow-up, and full treasure object placement are still approximate.
- Monster lifesaving for projectile deaths remains separate from the shifted-vampire revival branch.
- Broader `hmon()` object-hit side effects outside the current weapon/ammo/gem projectile helpers remain open.
- Projectile gas spore coverage currently exercises ordinary horizontal throws; fired launcher ammo should get a dedicated canary when the bow/arrow kill tail is expanded.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal gas spore explodes|hero-thrown dagger lethal remembered invisible target clears marker|hero-thrown dagger revives shifted vampire lethal target" test/shop-billing-helpers.test.mjs` - 3 pass, 2681 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
