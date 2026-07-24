# Sacrifice (#offer) at Altars

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/pray.c:103-107` defines `ugod_is_angry()` (`u.ualign.record < 0`), `on_altar()`, `on_shrine()`, and `a_align(x, y)` macros.
- `nethack-c/upstream/src/pray.c:1854` `dosacrifice()`: rejects non-altar (`You are not on an altar.`) and confused/stunned heroes, then takes an object via `floorfood("sacrifice", 1)` and dispatches on amulets vs corpses; only those paths consume a turn (`ECMD_TIME`).
- `nethack-c/upstream/src/eat.c:3579` `floorfood()`: prompts for a floor corpse first (`There is <corpse> here; sacrifice it?`), then the inventory via `getobj("sacrifice", offer_ok, ...)`; `nethack-c/upstream/src/eat.c:3539` `offer_ok()` fills the prompt with food and amulet classes; non-corpse food is rejected with `You can't sacrifice that!` and costs no turn. Empty packs print `You don't have anything [else] to sacrifice.` (`nethack-c/upstream/src/invent.c:1913`).
- `nethack-c/upstream/src/pray.c:1839` `sacrifice_value()`: `difficulty + 1` when the corpse is an acid blob or `moves <= age + 50`, scaled by `eaten_stat()` (`nethack-c/upstream/src/eat.c:3788`) for partly eaten corpses; 0 when too old.
- `nethack-c/upstream/src/pray.c:1907` `eval_offering()`: +1 for undead (wraith keeps the bonus for non-vegetarian chaotics); unicorn matrix — insult when unicorn alignment equals altar alignment (`adjattrib(A_WIS, -1)`, value -1), `adjalign(5)` and +3 on your own altar, `record = -1` when sacrificing your own alignment's unicorn to a foreign altar, +3 otherwise.
- `nethack-c/upstream/src/pray.c:1977` `offer_corpse()`: increments `uconduct.gnostic`, handles cockatrice touch and rider revival, same-race and former-pet (`So this is how you repay loyalty?`, `adjalign(-3)`) penalties before valuation; too-old corpses print `Nothing happens.`; negative-valued offerings go to `offer_negative_valued()` (`nethack-c/upstream/src/pray.c:1592`).
- `nethack-c/upstream/src/pray.c:1446` `consume_offering()`: hallucinating heroes get one of three silly messages via `rn2(3)`; blind lawful heroes get `Your sacrifice disappears!`; otherwise `consumed in a flash of light / plume of smoke / burst of flame` by hero alignment; then `exercise(A_WIS, TRUE)` — `nethack-c/upstream/src/attrib.c:489` rolls `rn2(19)` (gain) or `rn2(2)` (loss) unless the exercise counter is capped at `AVAL` (50).
- `nethack-c/upstream/src/pray.c:2048-2146` coaligned brownie points: `u.ugangr` reduction by `value * (chaotic ? 2 : 3) / 24` with mollification messages and luck repair; `ugod_is_angry()` absolution capped by `-record` and `MAXVALUE` (24); `u.ublesscnt` reduction by `value * (chaotic ? 500 : 300) / 24` with hope/reconciliation messages; otherwise `bestow_artifact()` gate (`nethack-c/upstream/src/pray.c:1781`: `rn2(6 + 2 * ugifts * nartifacts)` when `ulevel > 2 && uluck >= 0`) and the luck increase `value * LUCKMAX / 48` capped by the sacrifice value, with the four-leaf-clover/crabgrass/`brushed your foot` feedback.
- `nethack-c/upstream/src/pray.c:1631` `offer_different_alignment_altar()`: angry-god path either converts the hero (`uchangealign`, `nethack-c/upstream/src/attrib.c:1320`, `change_luck(-3)`, `ublesscnt += 300`) or rejects (`ugangr += 3`, `adjalign(-5)`, `godvoice` "Suffer, infidel!" rolling `rn2(4)` over `godvoices[]`, `change_luck(-5)`, `adjattrib(A_WIS, -2)`); otherwise `rn2(8 + ulevel) > 5` converts the altar (`altarmask = Align2amask(ualign) | AM_SHRINE` preservation, `change_luck(1)`, altar-glow message via `hcolor()` — display-RNG when hallucinating, `nethack-c/upstream/src/do_name.c:1461`) or weakens your god (`change_luck(-1)`, `exercise(A_WIS, FALSE)`); both arms then run `rnl(ulevel) > 6 && record > 0 && rnd(record)` gates toward `summon_minion()`.
- `nethack-c/upstream/src/pray.c:1501` `desecrate_altar()` for negative-valued offerings on cross-aligned high altars; `nethack-c/upstream/src/pray.c:1436` `gods_upset()` anger bookkeeping (`ugangr` ++/--) before `angrygods()`.
- `nethack-c/upstream/src/pray.c:1480` `offer_too_soon()` and `nethack-c/upstream/src/pray.c:1602` `offer_fake_amulet()` for the amulet branches of `dosacrifice()`.

## JS Parity Slice

- New `js/offer.js` ports the slice as pure game-state functions returning `{ messages, consumed, timeUsed, newsym, deferred }`: `heroOnAltar()`, `altarAlignAt()`, `isHighAltarAt()`, `alignGodName()` (pantheon table matching the existing `GODS_BY_ROLE` copies), `sacrificeValue()`, `offerCorpse()`, `offerAmulet()`; internals mirror `consume_offering`, `eval_offering`, `offer_different_alignment_altar`, `offer_negative_valued`, `gods_upset`, `desecrate_altar`, `change_luck`, `adjalign` (with `ALIGNLIM = 10 + trunc(moves/200)`), `exercise(A_WIS)` including its `rn2(19)`/`rn2(2)` rolls, and `hcolor()` via `rn2_on_display_rng`.
- `js/cmd.js` keeps the interactive state machine: `beginOfferCommand()` (non-altar stub message byte-identical; confused/stunned rite message; floor-corpse `[ynq]` prompt before the inventory prompt), `promptOfferInventoryObject()` (food+amulet letters, `You don't have anything [else] to sacrifice.`), `finishOfferObject()` (amulet/corpse dispatch, `You can't sacrifice that!` for non-corpse food, useup/useupf equivalents, `game.context.move = 1` only on `ECMD_TIME` paths), and `offerFloorObject`/`offerObject`/`offerInvalidMore` command modes next to the dip handlers.
- RNG order is C's exactly: hallucination `rn2(3)` then exercise `rn2(19)` inside consume; conversion `rn2(8 + ulevel)` then exercise then `rnl(ulevel)` (and `rnd(record)` only when its gate passes); the `bestow_artifact` gate roll `rn2(6 + 2 * ugifts * nartifacts)` still runs for level 3+ heroes with non-negative luck even though the gift drop itself is deferred, keeping the stream aligned when no gift would occur.
- Unicorn special cases (insult on altar's own alignment, `appropriately <align>` / `thoroughly on the right path` with `adjalign(5)` and +3 value, `record = -1` own-alignment-to-foreign-altar leading into the conversion branch) and the former-pet penalty (`adjalign(-3)`, `gods_upset`) are in, including the C detail that insulted/pet/too-old corpses are *not* consumed.
- Cross-aligned altar conversion is included (altar `altarmask` rewrite with shrine-bit preservation, luck and exercise effects, glow message); the `summon_minion`/`angry_priest` consequences are deferred but their `rnl`/`rnd` gate rolls still execute in C's order.

## Tests

New `test/offer.test.mjs` (39 tests) drives both the `rhack` command flow (prompts, consumption, turn cost) and `offerCorpse()`/`offerAmulet()` directly with `initRng(seed)` + `enableRngLog()`:

- stub parity: non-altar message, confused rite message, empty-pack message, escape/abort paths cost no turn
- prompts: floor-corpse `[ynq]` prompt, floor-decline fall-through (`anything else`), inventory letters, non-corpse food rejection
- consumption messages: flash/plume/burst by alignment, blind-lawful `disappears`, hallucination `rn2(3)` before the exercise roll
- value formula: 50-move freshness window, acid blob exception, `eaten_stat` scaling, undead +1 with the wraith/vegetarian exception
- coaligned rewards: gradual/full mollification, inadequacy, partial absolution, `ublesscnt` burn-down with both multipliers, value-capped luck gains, clover/crabgrass/foot-brush feedback
- RNG sequence assertions: `['rn2(19)']` at level 1, `['rn2(19)', 'rn2(6)']` with the bestow gate at level 5 (both gate outcomes), conversion `['rn2(19)', 'rn2(13)', 'rn2(19)', 'rnl(5)']` and failure `['rn2(19)', 'rn2(13)', 'rn2(2)', 'rnl(5)']`, rejection `['rn2(4)']`
- unicorns: altar-aligned insult (wisdom -1, no consumption, `gods_upset`), cross-aligned-on-own-altar bonus, right-path feedback, own-alignment-to-foreign conversion (message order, alignment flip, `change_luck(-3)`, `ublesscnt += 300`)
- former pet penalty, same-race deferral, altar conversion success/failure/shrine preservation, rejection after prior conversion, high-altar desecration messages, amulet-too-soon and fake-amulet feedback

Verification:

```sh
node --check js/offer.js
node --check js/cmd.js
node --test test/offer.test.mjs
node frozen/ps_test_runner.mjs sessions/seed0106-priest-extcmd-sweep.session.json
node frozen/ps_test_runner.mjs sessions/seed4500-knight-coverage.session.json
node frozen/ps_test_runner.mjs sessions/seed2200-wizard-quaff-zap-read.session.json
bash frozen/score.sh
```

Result: `node --check` passed for both edited files; all 39 new tests passed; the three public sessions that type `#offer` passed with full RNG/screen/cursor matches; full public score stayed 44/44.

## Remaining Gaps

- `feel_cockatrice()` (fatal bare-handed cockatrice-corpse handling) and `rider_corpse_revival()` have no JS helpers yet; both run before valuation in C and are skipped here.
- `sacrifice_your_race()` (same-race sacrifice: altar staining/vanishing, `dlord()` demon summoning, terror paralysis) is detected and deferred as a no-op rather than falling through to normal valuation.
- `bestow_artifact()` never drops a gift: the gate roll runs, but a successful roll only marks `deferred: ['bestow_artifact']` (no artifact, no `rnz` bless-count reset, no luck feedback for that offering).
- `summon_minion()` and `angry_priest()` consequences of cross-aligned sacrifice are not ported; their gate rolls run, so the RNG stream only diverges from C when a minion would actually appear. `angrygods()`/`god_zaps_you()` divine wrath (lightning, wide-angle disintegration) behind `gods_upset()`/`desecrate_altar()`/rejection is likewise deferred; anger bookkeeping and messages are in place.
- `HAggravate_monster |= FROMOUTSIDE` from the former-pet path has no JS equivalent yet, and JS corpse objects do not currently retain pet traits, so the penalty only triggers on corpses explicitly carrying `omonst`/`mtraits` markers.
- Monster data is sparse in JS: `is_undead`/`is_unicorn` use glyph-and-name heuristics, and `eaten_stat` scaling needs `cnutrit`, which most JS monster entries lack (falls back to `obj.nutrition`).
- `peek_at_iced_corpse_age()` ice-box age adjustment is not modeled; `obj.age` is used directly. The C `Levitation||Flying` wording `You are not over an altar.` is intentionally not adopted — the non-altar stub message stays byte-identical to prior behavior per the slice rules.
