# C Parity Audit 926: Player Spell Effects

Ported the core player spell-effect subset behind the `Z` (cast) command. The menu,
failure-roll, energy, exercise, and pseudo-book (`next_ident`) steps were already in
place; the per-spell effects that follow now run real ported logic instead of printing
`You cast X.`

## Source Anchors

- `nethack-c/upstream/src/spell.c:1220` through `:1380` (`spelleffects_check`): hunger,
  strength, Amulet-drain, and insufficient-energy gates precede the failure roll and
  consume neither `rnd(100)` nor time; confused heroes always fail without the roll.
- `nethack-c/upstream/src/spell.c:1385` through `:1603` (`spelleffects`): success costs
  `level*5` energy, `exercise(A_WIS, TRUE)`, and a pseudo spellbook via `mksobj()`;
  `getdir()` only happens for `oc_dir != NODIR` wand-duplicate spells; skilled skill
  (`P_SKILL >= P_SKILLED`) blesses the pseudo object for the scroll/potion groups and
  directional healing.
- `nethack-c/upstream/src/zap.c:2705` through `:3218` (`zapyourself`): self-cast force
  bolt (`d(2,12)` + `exercise(A_STR, FALSE)`), magic missile (`d(4,6)`), sleep
  (`rnd(50)`), slow monster (`u_slow_down()`), knock/wizard lock (`boxlock_invent()`),
  healing/extra healing (`healup(d(6,4|8), 0, FALSE, blessed||extra)`), turn undead
  (`unturn_you()`), teleport away (`tele()`), cancellation, dig (no-op), drain life.
- `nethack-c/upstream/src/zap.c:3431` through `:3476` (`weffects`): a second
  `exercise(A_WIS, TRUE)` precedes every beam; IMMEDIATE beams walk `bhit()` with
  `rn1(8,6)` range, RAY spells go through `ubuzz()`/`dobuzz()` with `rn1(7,7)` range
  (`rn2(6)` first when hallucinating), and NODIR light/detect-unseen go through
  `zapnodir()`.
- `nethack-c/upstream/src/zap.c:160` through `:489` (`bhitm`): force bolt hit
  (`rnd(20) < 10 + find_mac` else `d(2,12)` + `spell_damage_bonus`), slow monster,
  turn undead (`rnd(8)` + flee), teleport away, cancellation, knock-back (`rnd(2)`),
  healing (`d(6,4|8)`).
- `nethack-c/upstream/src/dig.c:1548` (`zap_dig`): vertical falling rock and the
  `rn1(18,8)` digdepth beam.
- `nethack-c/upstream/src/read.c:2194` through `:2291` (`seffects`): entry
  `exercise(A_WIS, TRUE)` for `oc_magic` pseudo books, then confuse monster (spell
  increment base 0 vs scroll 3), remove curse, create monster, taming (charm monster),
  food detection, identify, magic mapping.
- `nethack-c/upstream/src/potion.c:1333` through `:1425` (`peffects`): no entry
  exercise; restore ability (`rn2(A_MAX)`), invisibility (`rn2(15|30)` permanence vs
  `d(6-3*bcsign,100)+100`), monster detection (`rn1(40,21)` spell timeout,
  `detect.c:monster_detect()` tail `exercise(A_WIS, TRUE)`), object detection
  (`detect.c:object_detect()` cls 0), speed (`speed_up(rn1(10, 100+60*bcsign))` plus
  `exercise(A_DEX, TRUE)`), levitation (`float_up()` then `rn1(50,250)` blessed or
  `rn1(140,10)`).
- `nethack-c/upstream/src/spell.c:1549` through `:1590`: cure blindness/sickness via
  `healup()`, create familiar (`dog.c:make_familiar` + `pick_familiar_pm`),
  clairvoyance (`detect.c:do_vicinity_map()`), protection (`cast_protection()`, no
  RNG), jumping (`apply.c:jump()` with magic range `6 + magic * 3`).

## JS Changes

- `js/spell.js` (new)
  - `spellCastNeedsDirection()` mirrors the C `oc_dir != NODIR` table so only the
    wand-duplicate directional spells ask `In what direction?`; everything else
    applies immediately, as `spelleffects()` organizes it.
  - `castSpellDirectionalEffect()` ports the `getdir()` + `confdir()` direction
    parsing (self `.`/`s`, vertical `<`/`>`, cancel re-uses the previous direction,
    stunned/confused redirection through one `rn2(5)` + one `rn2(8)` in C's
    `xdir`/`ydir` order), then `zapyourself()`, `zap_updown()`, or the beam paths.
  - `spellImmediateBeam()` ports the `bhit()` walk for force bolt, knock, wizard
    lock, slow monster, turn undead, teleport away, cancellation, healing, and extra
    healing, including statue shattering and doorlock effects per square.
  - `spellRay()` ports `dobuzz()` for magic missile and sleep (range, `zap_hit`,
    reflection, bounce with C's `bounce_dir()` side-selection RNG).
  - `spellDigBeam()` ports directional `zap_dig()`.
  - NODIR effects: light, detect unseen (`findit()` scan), detect monsters, detect
    treasure, detect food (shared `foodDetectionScrollEffect`), remove curse,
    identify, charm monster (shared `tameMonsterWithScroll`), confuse monster,
    create monster, haste self, levitation, restore ability, invisibility, cure
    blindness, cure sickness, create familiar, clairvoyance, protection, magic
    mapping, jumping, each in C's RNG-call order.
- `js/cmd.js` (castSpell dispatch region only, plus two three-line jump-cursor edits)
  - `castSpell` mode now runs the C `spelleffects_check()` gates (too hungry, lacks
    strength, Amulet `rnd(2*energy)` drain, insufficient energy with `yet` suffix)
    before the unchanged failure roll; confused casts fail without consuming
    `rnd(100)`.
  - Success path unchanged (`energy`, `exercise(A_WIS)`, `mksobj` `next_ident`),
    then dispatches to `js/spell.js` via a single `SPELL_EFFECT_DEPS` table and the
    shared `finishSpellEffectResult()` tail (fallback text, blank pending messages,
    `--More--` cadence, sleep turns, fatal/life-saving handoff).
  - New `spellDetectMonsters{More,Tip,Pos,DoneMore}` modes mirror the fountain
    detection browse flow (C `browse_map()` cadence) for the detect monsters spell.
  - `jumpCursor` accepts the C magic jump range (`6 + 3 * magic` squared distance)
    when `game._jump_magic` is set by the jumping spell; `#jump` and landing/ESC
    reset it.
- `test/spell-effects.test.mjs` (new): 35 tests covering direction classification,
  self-cast RNG order for healing/extra healing/force bolt, ESC-cancel release,
  confdir order, beam/ray/dig RNG prefixes, turn undead flee, haste/levitation/
  invisibility timeouts, identify/remove-curse/detect/confuse/charm/cure/protection/
  clairvoyance/light/jumping effects, and the generic fallback.

## Tests

- `spell direction classification matches C objects.h oc_dir`
- `healing self-cast heals d(6,4) with C zapyourself RNG order`
- `force bolt beam: weffects exercise, rn1(8,6) range, hit roll and damage`
- `magic missile ray: rn1(7,7) range, zap_hit, d(nd,6) damage`
- `dig beam consumes rn1(18,8) digdepth like C zap_dig`
- `skilled detect monsters grants the rn1(40,21) detection timeout first`
- 29 further cases in `test/spell-effects.test.mjs`.

## Verification

- `node --check js/cmd.js` / `node --check js/spell.js` - pass
- `node --test test/spell-effects.test.mjs` - 35/35 pass
- `node --test test/*.mjs` - 3421/3421 pass
- Integration smoke (not committed): priest-trace parity for healing self-cast
  (`rnd(100)`, `rn2(19)`, `rnd(2)`, `d(6,4)`), light NODIR double-exercise order,
  energy gate and confused-fail consuming no `rnd(100)`, detect-monsters browse
  cadence, jumping cursor landing.
- `node frozen/ps_test_runner.mjs sessions/seed0501-priest-cast-read-turn.session.json sessions/seed0399-wizard-hallu-actions.session.json sessions/seed4500-knight-coverage.session.json` - 3/3 pass
- `bash frozen/score.sh` - 44/44 passing

## Remaining Gaps

- Hunger drain (`morehungry(2*energy)`), the capacity gate, and the
  `spellknow() <= 0` twisted/backfire path from `spelleffects_check()` are not
  modeled; the JS hunger bookkeeping predates this slice and sessions stay green
  without the drain.
- `openholdingtrap()`/`openfallingtrap()`/`closeholdingtrap()` hero and monster
  trap branches are stubs; bear-trap/web release through knock is only partially
  modeled.
- `abuse_dog()` tameness decrement keeps its `rn2(mtame)` roll but omits the
  yelp/growl sound text; `cancel_monst()` on the hero cancels inventory BUC/spe but
  skips the polyself reversion branch; `cancel_item()` conversions use the JS object
  model rather than full C metadata.
- Levitation/invisibility/detect-monsters timeout expiry is not ticked down by the
  turn loop yet (pre-existing engine gap shared with potion/boot sources).
- Clairvoyance map reveal marks cells seen but does not reproduce
  `do_vicinity_map()`'s transient glyph browsing or blessed dknown semantics in full.
- `rndmonst_adj()` for create familiar is simplified to the common-monster candidate
  table rather than the full `makemon.c` difficulty weighting.
- Fireball, cone of cold, finger of death, drain life, cause fear, chain lightning,
  and create-monster directionless extras remain on the generic `You cast X.`
  fallback; stone to flesh keeps its existing session-validated `.`/`>` routing
  (directional beam stays message-only), and polymorph keeps its existing wand-shared
  routing.
