# Subagent Findings 119 - Upward Touch-Petrifying Egg Toss-Up

## Implemented Slice: Hero-Thrown Cockatrice/Chickatrice Egg Upward Impact

Covered upward hero-thrown touch-petrifying eggs. Cockatrice and chickatrice eggs now use the C `toss_up()` roof/self-hit ordering, can petrify the hero immediately when they break on the hero's face, respect stone resistance and stone-golem polyself rescue, and keep Medusa eggs and petrifying corpses out of this slice.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`, so `rn2(5)` is always consumed first.
- `nethack-c/upstream/src/dothrow.c:1260`: `toss_up()` marks only `EGG`/`CORPSE` objects whose `corpsenm` passes `touch_petrifies()` as petrifiers.
- `nethack-c/upstream/include/mondata.h:200`: `touch_petrifies()` is exactly cockatrice or chickatrice; Medusa is only `flesh_petrifies()`.
- `nethack-c/upstream/src/dothrow.c:1268`: ceiling hits call `breaktest()` before ceiling-break messaging.
- `nethack-c/upstream/src/dothrow.c:1269`: breaking ceiling hits print the ceiling-hit message before `breakmsg()` and `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: objects that do not break on the ceiling fall back onto the hero's head.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion self-hits get an independent `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1306`: broken petrifying eggs check stone resistance and stone-golem rescue before stoning.
- `nethack-c/upstream/src/dothrow.c:1311`: any worn helmet or hat fails to protect against broken-egg face contact.
- `nethack-c/upstream/src/dothrow.c:1319`: if stoning is blocked, a broken egg prints the ordinary face-splat message.
- `nethack-c/upstream/src/dothrow.c:1344`: a hard helmet can reduce intact-egg falling damage and print the hard-helmet message.
- `nethack-c/upstream/src/dothrow.c:1401`: without a helmet, intact petrifying eggs can still petrify if they resist breaking.
- `nethack-c/upstream/src/dothrow.c:1404`: toss-up stoning uses killer name `elementary physics`.
- `nethack-c/upstream/src/dothrow.c:1408`: the stoning message is `You turn to stone.`
- `nethack-c/upstream/src/dothrow.c:1409`: an intact egg that petrifies the hero is dropped before death.
- `nethack-c/upstream/src/dothrow.c:2582`: `breaktest()` uses object resistance, then marks eggs as breakable.
- `nethack-c/upstream/src/topten.c:96`: `STONING` death formats as `petrified by <killer>`.

Subagent findings:

- Egg-only is the compact slice. Petrifying corpses also have the corpse-only bare-hand throw check before `toss_up()` and a separate falling-object branch.
- Medusa eggs should not be included because C `touch_petrifies()` excludes Medusa.
- Ceiling breaks never petrify the hero; they print the ceiling-hit message and `Splat!`, delete the egg, and return.
- Broken self-hit petrifying eggs do not apply HP damage. They either petrify immediately or, if blocked by stone resistance or stone-golem rescue, fall through to `You've got it all over your face!`.
- Rare intact self-hit eggs follow the nonbreaking object path: hard helmets can print the hard-helmet message, unhelmeted non-resistant heroes petrify, and surviving eggs can land.

Covered JS behavior:

- `js/cmd.js`: added a dedicated upward touch-petrifying egg branch for cockatrice/chickatrice eggs.
- `js/cmd.js`: broken self-hit eggs now print `Splat!`, helmet-failure wording when applicable, and `You turn to stone.` with death cause `petrified by elementary physics`.
- `js/cmd.js`: stone resistance and stone-golem polyself rescue block the fatal broken-egg branch and allow the ordinary face-splat message.
- `js/cmd.js`: rare intact self-hit eggs use hard-helmet protection, 1 HP falling-object damage, and floor landing.
- `js/cmd.js`: ceiling-hit touch-petrifying eggs break without petrification or face-splat feedback.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: a self-hit cockatrice egg that breaks while the hero wears a hard helmet prints the helmet-failure message and petrifies by elementary physics.
- `test/shop-billing-helpers.test.mjs`: stone resistance blocks broken-egg petrification and keeps the ordinary face-splat message.
- `test/shop-billing-helpers.test.mjs`: a rare intact cockatrice egg is blocked by a hard helmet, deals 1 HP, and lands at the hero square.
- `test/shop-billing-helpers.test.mjs`: a ceiling-breaking cockatrice egg prints only ceiling-hit and `Splat!` feedback and does not petrify.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "cockatrice egg|ordinary egg|pyrolisk egg" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "venom|cream pie|upward hero-thrown scroll|upward hero-thrown harmless|upward hero-thrown unpaid harmless|melon|ordinary egg|pyrolisk egg|cockatrice egg|glass-material wand|unknown glass wand|crystal plate mail|upward hero-thrown.*oil" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Touch-petrifying corpses remain separate because they need bare-hand throw prechecks plus nonbreaking corpse impact/helmet handling.
- Generic damaging upward impacts still need full `dmgval()`, artifact hits, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and heavier falling-object effects.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
