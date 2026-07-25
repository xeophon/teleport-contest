# Wish namedesc table audit (readobjnam/rnd_otyp_by_namedesc) — 2026-07-24

Scope: `js/cmd.js` wish/readobjnam area vs `nethack-c/upstream/src/objnam.c`
(`readobjnam`, `rnd_otyp_by_namedesc` at objnam.c:3455-3528) and
`nethack-c/upstream/include/objects.h`. Driver sessions:
sessions-extra/seed9002-wizard-alchemy, seed9008-wizard-polyself,
seed9010-wizard-instruments, seed9011-wizard-loot-chest.

## C model

Every non-gem object wish goes through `rnd_otyp_by_namedesc(name, oclass, 1)`
(readobjnam_postparse3, objnam.c:4749): it sums `oc_prob + 1` over every
object whose objects.h name, `" of "`-tail, description, or description tail
`wishymatch`es the wish text (exact whole-string match, space/hyphen/case
blind), then consumes one `rn2(maxprob)` draw (objnam.c:3522) — even for a
single match. `mksobj(typ, TRUE, FALSE)` follows (next_ident, class init,
`mkobj_erosions` when the material is damageable), then
`u.ublesscnt += rn1(100, 50)` (zap.c:6421).

## Fixed in this slice

- Missing wishable names added to `WISH_BASE_OBJECTS` /
  `WISH_BASE_NAMEDESC_BOUNDS` (bound = oc_prob + 1):
  - weapons: `silver dagger` (4), `elven dagger` (11), `orcish dagger` (13),
    `athame` (1), `stiletto` (6) — with objects.h appearances
    (runed/crude dagger) for the shuffled kinds.
  - tools: `skeleton key` (81, appearance "key"), `credit card` (16),
    `bell` (3), `bugle` (5), `leather drum` (5, appearance "drum").
  - tool-regex path (`WISH_TOOL_NAMEDESC_BOUNDS` / `WISH_TOOL_APPEARANCES`):
    `saddle` (6), `tin whistle` (101, "whistle"), `magic whistle` (31,
    "whistle"), `wooden flute` (5, "flute").
- `silver dagger` creation is routed through the generic WEAPON_CLASS
  `mksobj_init` with erosion rolls suppressed — silver is not damageable, so
  C's `mkobj_erosions` (mkobj.c:1172 via may_generate_eroded, mkobj.c:183)
  consumes nothing; keeps `rn2(11)/rne(3)/rn2(2)` order without inventing
  erosion draws.
- Wished appearance-named potion stacks pluralize ("2 orange potions",
  `pickupObjectName` potion branch, matching C's makeplural in doname).
- Wished water potions display "clear potion" until the type is known;
  "potion of [un]holy water" requires a known type — anything not
  explicitly created unidentified (`known === false`, as wish-created
  potions are) or the `potion of water` discovery — plus `bknown` for the
  holy/unholy qualifier (objnam.c:835-848); no more BUC/type leak from raw
  blessed/cursed flags.
- Wished type-known potions merge into matching inventory stacks
  (invent.c mergable/merged via hold_another_object->addinv): same
  potion type/BUC/spe/dilution/grease, knowledge gaps learned with
  "You learn more about your items by comparing them." (invent.c:941) and
  the prinv landing line shows the wished-for quantity of the combined
  stack without a period ("h - an uncursed potion of booze").
- Water wish `rn2(80+1)` for "water"/"potion of water" (landed concurrently
  by another agent; verified): "holy water"/"unholy water" go through
  adjective parsing (objnam.c:3997-4002) and still consume `rn2(81)`;
  "potion of [un]holy water" takes the objnam.c:4489 shortcut with no roll.

Regression coverage: test/wish-namedesc.test.mjs (8 tests).

## Verified session impact

- seed9002-wizard-alchemy: RNG 2205→2219/2305, screens 234→250/292; every
  wish/dip beat through step 238 now matches. Remaining diffs start at the
  armor doff/don occupation and monster turns (allmain.js scope).
- seed9008-wizard-polyself: RNG 2449→2468/2720, screens 103→122/154; the
  `silver dagger` wish matches. Remaining diffs are polymon HP/AC and
  metallivore eating (polyself scope).
- seed9010-wizard-instruments: RNG 2504→2554/2641, screens 119→145/170;
  `bugle`/`leather drum`/`horn of plenty`/`frost horn` wishes match.
  Remaining diffs are music.c improvise/blast paths and mksobj_init charge
  init for charged tools (mklev.js scope).
- seed9011-wizard-loot-chest: RNG 2602→2610/2659, screens 41→44/80; the
  `skeleton key` wish matches ("p - a key."). Remaining diffs are the
  picklock occupation (lock.c) and per-turn encumber_msg (allmain.js scope).
- Public gates: `bash frozen/score.sh` 44/44, seed9001 pilot PASS,
  seed0108 wizard wishlist PASS (starting-inventory water stays identified
  via the discovery list).

## Still-missing wish names (audit vs objects.h) — follow-up

These objects.h names still have no JS wish table entry. Bounds are
`oc_prob + 1` unless noted (single exact-name match). Weapons marked [*]
also need mklev.js `SPECIFIC_WEAPONS`/erosion handling before they can be
granted with correct mksobj_init draws (silver = no erosion rolls);
armor wishes additionally route through the ARMOR_CLASS init.

- weapons: `arrow` 56, `elven arrow` 21 ("runed arrow"), `orcish arrow` 21
  ("crude arrow"), `silver arrow` 13 [*], `ya` 16 ("bamboo arrow"),
  `crossbow bolt` 56, `shuriken` 36 ("throwing star"), `boomerang` 16,
  `spear` 51, `elven spear` 11 ("runed spear"), `orcish spear` 14 ("crude
  spear"), `dwarvish spear` 13 ("stout spear"), `silver spear` 3 [*],
  `javelin` 11 ("throwing spear"), `trident` 9, `scalpel` 1, `worm tooth` 1,
  `crysknife` 1, `axe` 41, `battle-axe` 11 ("double-headed axe"),
  `tsurugi` 1 ("long samurai sword"), `runesword` 1 ("runed broadsword"),
  `lance` 5, `mace` 41, `silver mace` 3 [*], `morning star` 13,
  `war hammer` 16, `club` 13, `rubber hose` 1, `quarterstaff` 12 ("staff"),
  `aklys` 9 ("thonged club"), `bow` 25, `elven bow` 13 ("runed bow"),
  `orcish bow` 13 ("crude bow"), `yumi` 1 ("long bow"), `sling` 41,
  `crossbow` 46, `unicorn horn` 1 (weptool, prob 0).
- armor: `crystal plate mail` 1, `bronze plate mail` 24, `splint mail` 58,
  `banded mail` 67, `dwarvish mithril-coat` 1, `chain mail` 67,
  `orcish chain mail` 1 ("crude chain mail"), `scale mail` 67,
  `orcish ring mail` 1 ("crude ring mail"), `leather jacket` 12.

Notes:
- `wizkit` startup wishes are unaffected; nothing here touches terrain or
  artifact wishes.
- Wishing by shared appearance (`flute`, `harp`, `whistle`, `drum`, `key`,
  `lamp`, `candle`, `horn`, `bag`) matches multiple objects in C, bound
  sum(oc_prob+1): flute 8, harp 8, whistle 132, drum 8, key 81, lamp 62,
  candle 27, horn 15, bag 84. The JS `WISH_OBJECT_RANGES` pick now uses the
  C rn2(sum(oc_prob+1)) semantics for the ranges whose entries share an
  exact objects.h description (`bag`, `lamp`, `candle`, `horn`, `harp`,
  `drum`, `key`); the armor category ranges (`shield`, `hat`, `helm`,
  `gloves`, `cloak`, ...) have no exact C namedesc match and keep their
  legacy weighted pick. Bare `flute`/`whistle` wishes still fall through to
  the generic tool branch (their targets are not base objects yet).
