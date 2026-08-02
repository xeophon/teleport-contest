# Audit 971 — seed9010-wizard-instruments (2026-08-02)

Target: sessions-extra/seed9010-wizard-instruments.session.json.
Result: PASS (RNG 2641/2641, screens 170/170, cursors 170/170, cells
170/170 — animFrames are the runner's supplemental metric and are not
scored).  Publics stay 44/44; unit tests 3643/3643.

## Ground truth

Rebuilt/reused the patched C recorder binary
(nethack-c/recorder/install, upstream @ NetHack-5.0.0_Release with the
six recorder patches).  Note: the shipped sysconf needs
`WIZARDS=*` to authorize debug mode for the local user
(sysconf WIZARDS=root games refuses `-D` otherwise); with a private
install copy, `node scripts/record-session.mjs` reproduces the recorded
session byte-for-byte (2641 rng entries identical).  Additionally, a
scratch rebuild of the recorder tree with a backtrace logger inside
`exercise()` (attrib.c) identified the two otherwise-mysterious
rn2(19) rolls in this session.

## Fixes (all in js/cmd.js + js/display.js)

1. **Amulet of reflection worn state** (fix of the cascade): `%P`ut-on
   of an amulet never refreshed `game.u.reflecting`, so the frost-horn
   bolt reflected by the worn amulet instead killed the hero
   (HP 0 -> death flow; every later RNG diverged).  The amulet branch
   of the put-on handler now calls updateReflectionFromInventory().
   C refs: do_wear.c amulet-on (EReflecting), muse.c:2847-2852
   (ureflects W_AMUL branch prints "medallion").

2. **Frost/fire horn RNG shape** (music.c:611-637):
   - The horn's damage dice are `rn1(6, 6)` rolled as the ubuzz()
     argument — i.e. a `rn2(6)` ahead of dobuzz()'s range roll
     `rn1(7, 7)` (zap.c:4823).  The JS wand/horn shared beam handler
     now rolls it for horns and keeps wand behavior (fixed 6 dice,
     zap.c:3464-3465) untouched.
   - The "exercise wisdom" roll (rn2(19)) that used to lead this path
     is wand-only (weffects, zap.c:3435-3436); horns never call
     weffects().  Same for the fire horn path's early rn2(19).
   - Hero-hit reflection now prints the true ureflects() source word
     ("medallion" for the amulet) via new heroZapReflectSourceWord()
     (muse.c:2836-2857 ordering: shield > weapon > amulet > armor).
   - Newly-discovered object types via makeknown() exercise wisdom:
     ureflects()->makeknown(AMULET_OF_REFLECTION) (o_init.c:483) and
     music.c:637 makeknown(instr->otyp).  The two mystery rn2(19) rolls
     rn2(19)=8 / rn2(19)=11 in the recording are exactly these two
     discoveries (verified with the backtrace-instrumented recorder:
     discover_object called from ureflects and from the FROST_HORN
     case epilogue).  Newly-discovered shield of reflection via a
     reflected bolt now also exercises wisdom (muse.c:2840-2846).
   - Cold bolt damage sites now use the horn dice count
     (zhitm/zhitu use d(nd, 6), zap.c zhitm ZT_COLD + zhitu cases).

3. **Topline packing for instrument/multi-part zap messages**
   (win/tty/topl.c:251-282 update_topl()): plines join the pending
   topline while `len(new) + len(cur) + 3 < CO - 8`; otherwise the
   pending line ends in --More-- and the overflow becomes the next
   line.  The improvise/horn-of-plenty apply paths previously always
   forced --More-- for multi-message output. White-box flow adjusted:
   new packToplineMessages()/setPackedToplineMessages() pack by that
   rule and route overflow through _queued_messages_after_more with
   processTime on the final entry.  A drum's Deaf suffix now follows
   the botl boundary: visible immediately when no --More-- interrupts
   (seed 9010 step 162), deferred across a dismissed --More-- (seed
   0002 step 569-580) — matches both recordings (both paths verified
   by the two sessions now scoring PASS).

4. **Improvise direction prompt deferral** (music.c:613 getdir after
   the opening pline): when the improvise opening message is still on
   the line, C shows it + --More-- and the "In what direction?" prompt
   appears only after dismissal (seed 9010 steps 152-153).  New
   `_zap_direction_prompt_after_more` flag plus a dismissal handler in
   rhack's more-block reveal the prompt then.

5. **awaken_scare flee messages** (music.c:59-73 via monflee
   monmove.c:517 "The <mon> turns to flee."): the JS side generated
   the messages but stuffed them into _topline_after_more instead of
   the message stream; they are now plined inline through the packing
   path.  This is what regenerates seed0002's mid-game flow (drum
   application wakes a little dog on the far edge; the flee message
   pushes the topline over CO-8 and the --More-- chain lives across ten
   discarded keys before the turn tail runs).

6. **Cold bolt beam glyph color**: CLR_WHITE for cold zap beams
   (drawing.c zap glyph tables; recorded frames show white '---'
   dashes).  Also per-phase tmp_at beam snapshots so the recorded
   --More-- frames show the exact beam cells C had at that pause
   (display.c tmp_at DISP_BEAM semantics; shieldeff() restores the hero
   glyph over its beam cell).

7. **getlin-tune cursor**: the instrument "What tune are you playing?
   [5 notes, A-G]" getlin echo now uses the same end-of-text cursor
   rule as wizwish etc.  (steps 143-147 of seed 9010).

## Test file updates

test/shop-billing-helpers.test.mjs — the seven instrument tests
asserted that game._pending_message always contains every message,
with --More-- forced; the recording-verified tty packing rule
(topl.c:264) now packs or splits.  The assertions were switched to a
small emittedToplineText() helper (pending + queued lines), and the two
horn-direction flows now explicitly consume the deferral dismissal key
(the C getdir forces it).  No assertion contents weakened: they assert
the same message texts, only at the correct topline layer.

## What remains unported in this subsystem

- animFrames for the cold-bolt beam animation (the runner labels this
  metric "supplemental — never combined with pass/fail"; js produces no
  nh_delay_output frame bursts for beams anywhere).
- Fire horn / frost horn zaps still share the pre-existing wand bolt
  implementation skeleton; monster-hit outcomes (corpse drops,
  inventory damage, shieldeff display cycles) follow the old paths and
  are only partially C-ordered for horns.  In particular the horn
  zap-over-floor terrain effects (pool/lava freezing per
  zap.c:5246-5290) route through the existing applyColdRayTerrain
  helper rather than a literal zap_over_floor port.
- STRAT_WAITMASK unwinding, waiting/peaceful flag details of
  awaken_scare are approximated by awakenScareInstrumentMonster.
- Shop billing of charged instrument usage reuses the existing
  billing helpers (they were already recording-verified).
- estimation of monster resistance bounds in awaken_scare uses the
  shared monsterResistsEffect() helper; that's C resist()
  (zap.c:6141-ish), matching modulo the same assumptions the rest of
  the port makes.
