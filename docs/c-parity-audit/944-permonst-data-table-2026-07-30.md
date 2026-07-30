# 944. permonst data table — complete monster database port (2026-07-30)

Slice: additive pure-data module `js/permonst.js` carrying the full NetHack 5.0
`mons[]` monster table plus the flag/symbol/resistance constant space, as the
foundation for all subsequent combat parity work. No runtime wiring by design:
nothing in `js/` imports `js/permonst.js` yet.

## C references

| C entity | Upstream location | JS result |
|---|---|---|
| `struct permonst` layout, `NATTK`, `monnums` bounds | `include/permonst.h` | field layout of `MONS[]` entries; `NUMMONS`, `NON_PM=-1`, `LOW_PM=0`, `HIGH_PM`, `SPECIAL_PM` |
| `struct attack` field order (aatyp, adtyp, damn, damd) | `include/permonst.h:36-41` | `attacks[i]` objects |
| All 383 `MON()` entries, `NAM()/NAMS()/LVL()/SIZ()/A()/ATTK()` macro field order | `include/monsters.h`, `src/monst.c:17-45` | `MONS` array in exact C order, `PM_*` constants, `PM` map |
| `NO_ATTK` = `{0,0,0,0}` | `src/monst.c:17` | zero attack objects |
| terminator entry | `src/monst.c:51-65` | omitted (not part of `enum monnums`) |
| `AT_*` / `AD_*` attack+damage codes | `include/monattk.h` | `AT_*` / `AD_*` exports |
| `MS_*` sounds, `MZ_*` sizes, `MR_*`/`MR2_*` resistances, `M1_*`/`M2_*`/`M3_*` flag bits, `G_*` geno bits, `MGENDER` order | `include/monflag.h` | same-named exports |
| `WT_*` body weights used by `SIZ()` | `include/weight.h` | inlined numeric `weight` values |
| `CLR_*`/`HI_*` colors used by monsters.h | `include/color.h` | same-named exports, numeric `color` field |
| `S_*` class indexes + display letters | `include/defsym.h:295-360` (via `include/sym.h`) | `S_*` exports, `sym` letter + `mlet` index fields |
| alignments `A_NONE=-128`, `A_CHAOTIC=-1`, `A_NEUTRAL=0`, `A_LAWFUL=1` | `include/align.h:19-22` | numeric `align` field |
| predicate macros | `include/mondata.h` | predicate functions |

## Coverage

- `MONS`: 383 entries, index-equal to the C `enum monnums` value
  (`PM_GIANT_ANT = 0` … `PM_APPRENTICE = 382`), each entry carrying every
  `struct permonst` field: `name`, `names` (NAMS triple or null), `sym`,
  `mlet`, `lvl`, `mmove`, `ac`, `mr`, `align`, `geno`, `attacks[6]`
  (`{aatyp, adtyp, damn, damd}`), `weight`, `nutrition`, `sound`, `size`,
  `mres`, `cres`, `m1`, `m2`, `m3`, `difficulty`, `color`, `pm`.
- `PM_<BASENAME>` named exports for every monster plus a `PM` name->index map.
- 5.0 deviations handled explicitly (and tested):
  - No playermon/`PM_NULL` slot: `PM_GIANT_ANT == 0`
    (`include/permonst.h` LOW_PM; `src/dog.c:226` comment). Existing JS code
    (`js/const.js:2846` `LOW_PM = 0`, `js/monster_data.js` PM-index tables)
    already assumes this numbering; inserting a fake index 0 would break them.
  - `#ifdef CHARON` monsters (Cerberus, Charon) and all `#if 0` DEFERRED /
    OBSOLETE monsters excluded, matching the C build (CHARON is never defined).
  - The mail daemon IS included: `MAIL_STRUCTURES` is defined at
    `include/global.h:430` (PM_MAIL_DAEMON = 314).
  - `SEDUCTION_ATTACKS_YES/NO` macros (`include/monsters.h:2922-2927`)
    expanded for `AMOROUS_DEMON` (NAMS incubus/succubus).
- JS pitfall dealt with: flag masks using bit 31 (`M1_METALLIVORE`,
  `M2_MAGIC`) would go negative through JS `|`; all `m1`/`m2` values are stored
  precomputed as **unsigned** integers, and predicates use `(x & FLAG) !== 0`,
  which is truthy-correct even for the sign bit.

## Predicates ported (include/mondata.h)

Flag-based: `verysmall`, `bigmonst`, `is_flyer`, `is_clinger`, `is_swimmer`,
`breathless`, `amphibious`, `passes_walls`, `amorphous`, `tunnels`,
`needspick`, `hides_under`, `is_hider`, `haseyes`, `nohands`, `nolimbs`,
`notake`, `has_head`, `is_silent`, `unsolid`, `mindless` (+ `is_mindless`),
`humanoid`, `is_animal`, `slithy`, `thick_skinned`, `lays_eggs`, `regenerates`
(+ `species_regenerates`), `perceives`, `can_teleport`, `control_teleport`,
`acidic`, `poisonous`, `carnivorous`/`carnivore`, `herbivorous`/`herbivore`,
`metallivorous`/`metallivore`, `polyok`, `is_shapeshifter`, `is_undead`,
`is_were`, `is_elf`, `is_dwarf`, `is_gnome`, `is_orc`, `is_human`, `is_giant`,
`is_domestic`, `is_demon`, `is_mercenary`, `is_male`, `is_female`,
`is_neuter`, `is_wanderer`, `always_hostile`, `always_peaceful`,
`extra_nasty`, `strongmonst`, `throws_rocks`, `type_is_pname`, `is_lord`,
`is_prince`, `is_ndemon`, `is_minion`, `likes_gold`, `likes_gems`,
`likes_magic`, `is_covetous`, `infravision`, `infravisible`, `is_displacer`.

Membership-based: `is_floater`, `noncorporeal`, `is_golem`,
`touch_petrifies`, `flesh_petrifies` (Medusa special case), `telepathic`,
`is_mind_flayer`, `is_vampire`, `weirdnonliving`, `nonliving`, `is_whirly`,
`flaming`, `is_bat`, `is_longworm`, `is_rider`, `is_reviver`,
`is_placeholder`.

Skipped as needing live game state or attack-scanning helpers
(come with the combat port): `grounded`, `your_race`, `race_hostile`,
`race_peaceful`, `eyecount`, `digests`, `enfolds`, `slimeproof`,
`eggs_in_water`, `is_wooden`, `hug_throttles`, `is_armed`, `can_breathe`,
`cantwield`, `could_twoweap`, `cantweararm`, `likes_objs`, `webmaker`,
`is_unicorn`, `is_mplayer`, `is_watch`, `hates_light`, `completelyburns/rots/rusts`,
`likes_fire`/`likes_lava`, `pm_resistance`, `immune_poisongas`.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` — loads OK
  (module is additive, so the frozen runtime is untouched).
- `node --test test/permonst-data.test.mjs` — 4 tests pass:
  constant values vs C headers; order/count invariants, including a
  programmatic recount of live `MON(` entries in the C `include/monsters.h`
  (conditional-aware: drops `#if 0`/`#ifdef CHARON`, keeps MAIL_STRUCTURES);
  82 named monsters checked field-for-field (values hardcoded in the test from
  the C source); predicate spot checks.
- `bash frozen/score.sh` — 44/44 passing.

## What's next (unported, intentionally out of scope for this slice)

- Wiring `MONS` into the runtime (`js/monster_data.js`'s bespoke tables,
  `rndmonst`, monster creation/polymorph, combat, seduction/AD_SSEX handling,
  `adj_erinys`, difficulty-based placement).
- `mondata.h` predicates needing runtime helpers (list above).
- Monster attack message/damage routines (`muat`, `mhitm`), `monstr`
  difficulty recomputation, and `mon[]`-indexed uppercase/plural name logic
  beyond simple `name`/`names` fields.
