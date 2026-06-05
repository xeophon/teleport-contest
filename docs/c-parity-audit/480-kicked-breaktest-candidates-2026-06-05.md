# C Parity Audit 480: Kicked Breaktest Candidates

Implemented the next kicked fragile-object `breaktest()` candidate slice without replay maps, private seeds, player names, move-count branches, or fixture-specific production branches. The slice admits kicked melons, concrete blinding/acid venom, and non-armor non-gem glass-material objects into the existing kicked floor-object fragile preflight path. It also corrects the glass-material artifact branch: C consumes the resistance roll, but `obj->oartifact` prevents the material-glass break branch from firing even on the rare roll-99 continuation.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile floor objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when it breaks.
- `nethack-c/upstream/src/dokick.c:692` through `:695`: non-gold stack splitting only happens after the preflight break/resistance branch.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2608`: `breaktest()` first calls `obj_resists(obj, nonbreakchance, 99)`, then breaks non-artifact non-gem `GLASS` material objects, and explicitly breaks expensive cameras, all potions, eggs, cream pies, melons, acid venom, and blinding venom.
- `nethack-c/upstream/src/dothrow.c:2612` through `:2637`: visible break messages include `Splat!` for eggs/melons, `Splash!` for acid/blinding venom, and shatter wording with thousand-pieces suffix for glass-material tools.
- `nethack-c/upstream/include/objects.h:1084` and `:1634` through `:1642`: `MELON`, `BLINDING_VENOM`, and `ACID_VENOM` are concrete object rows.

## JS Changes

- `js/cmd.js`
  - Adds a concrete `breaktestExplicitSwitchObject()` classifier for C's explicit non-glass-material break candidates.
  - Adds `isBreaktestVenomObject()` so only concrete acid/blinding venom, not a generic local `cls: "venom"` placeholder, uses the C breaktest venom branch.
  - Adds `breaktestGlassMaterialObject()` for non-gem, non-armor glass material. Glass armor remains excluded because C routes it through crack erosion rather than simple shatter/delete.
  - Updates top-level projectile and impact-drop break checks so artifact glass-material-only objects consume the resistance roll and then survive.
  - Admits kicked melon, concrete venom, and glass-material objects into `kickedFragilePreflightBreakKind()`.

## Tests

- `command kicked melon splats before remote projectile flight`
  - Asserts a kicked melon runs preflight `hero_breaks()`, prints `Splat!`, is removed, and never reaches remote-hole shipping.
- `command kicked blinding venom splashes before remote projectile flight`
  - Asserts concrete blinding venom prints `Splash!`, is removed, and does not apply hero blindness/face effects from thrown self-hit paths.
- `command kicked glass-material object shatters before remote projectile flight`
  - Asserts a non-armor non-gem glass-material object uses the thousand-pieces shatter branch before remote-hole shipping.
- `command kicked oartifact glass-material object cannot break on artifact roll 99`
  - Asserts an `oartifact` looking glass consumes a roll-99 preflight check but survives into ladder shipping without breakage or bad luck.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "command kicked (melon|blinding venom|glass-material|oartifact glass-material|fragile stack resistance|oartifact fragile object|confusion potion|unlit oil|lit oil|expensive camera|fertile egg stack|pyrolisk egg|glass wand|mirror|lenses|fragile crystal ball|cream pie)" test/shop-billing-helpers.test.mjs` - pass, 17 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1770 tests
- `node --test` - pass, 1921 tests
- `node --test test/*.mjs` - pass, 1921 tests
- `npm run score` - pass, 44/44

## Remaining

- Low-range resisted fragile `Thump!`/`kick_ouch` return-roll coverage is covered in audit 482.
- Glass armor kicked preflight crack erosion is covered in audit 483.
- Generic local venom placeholders remain excluded unless resolved to concrete acid/blinding venom.
