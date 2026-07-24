# seed9010-wizard-instruments — findings

## Coverage (all beats verified in the recording)

- Wishes: tooled horn (o), leather drum (p), bugle (q), horn of plenty (r),
  frost horn (s), amulet of reflection (t). The amulet is worn (`Pt`) so the
  frost horn's bounced bolt reflects harmlessly (dobuzz self-hit → `Reflecting`
  branch, zap.c:4958-4968) instead of killing the XL-1 hero.
- `a`pply tooled horn → "Improvise? [ynq]" → `y` — step 138: "You start playing
  your horn.  You produce a frightful, grave sound." + awaken_monsters
  (music.c:639-647). RNG: `rn2(2)=0 @ do_improvisation(music.c:535)`,
  `rnd(5)=2 @ improvised_notes(music.c:742)`,
  `rn2(7)=5/6 @ improvised_notes(music.c:745)`.
- `a`pply bugle → Improvise? → `n` → getlin "What tune are you playing?
  [5 notes, A-G]" → `ABCDE` — step 148: "You extract a strange sound from the
  bugle!" (do_play_instrument tune path, music.c:793/806-808).
- `a`pply frost horn → Improvise? → `y` → --More-- → "In what direction?" → `l`
  — step 154: "A bolt of cold blasts out of the horn!  The bolt of cold
  bounces!", step 155: "The bolt of cold hits you!  But it reflects from your
  medallion!" (music.c:611-637 FROST_HORN case: consume_obj_charge, getdir,
  `ubuzz(BZ_U_WAND(AD_COLD), rn1(6,6))`). RNG: `rn2(6)=2 @ do_improvisation
  (music.c:634)`, `rn2(7)=4 @ dobuzz(zap.c:4823)` (ray range rn1(7,7)),
  `rn2(20)=19 @ zap_hit(zap.c:4709)`.
  NOTE: in this version only FIRE/FROST horns are directional; the tooled horn
  is awaken+scare only (task text's "tooled horn directional blast" does not
  exist here — the frost horn covers the directional-blast path).
- `a`pply horn of plenty, twice — steps 159/165: "Some food spills out."
  RNG: `rn2(13)=4 @ hornoplenty(mkobj.c:2867)`, `rnd(1000)=656 @ mkobj
  (mkobj.c:289)`, `rn2(6)=3 @ mksobj_init(mkobj.c:971)`, first apply also
  `rn2(7)=6 @ hornoplenty(mkobj.c:2880)` (charge consumption).
- `a`pply leather drum — step 162: "You start playing your drum.  You beat a
  deafening row!" → hero deafened (`incr_itimeout(&HDeaf, rn1(20,30))` seen as
  `rn2(20)=12 @ do_improvisation(music.c:709)`).
- `a`pply leather drum again while Deaf — step 168: "You pound on the drum."
  (Deaf branch, music.c:710-711). No "Improvise?" prompt for drums
  (music.c:776).

## JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9010-wizard-instruments.session.json`
→ **RNG 2504/2641, screens 119/170 (cursors 135/170), animFrames 0/28**
(supplemental: the recorded cold-bolt beam animation frames — JS produced
none; beam `tmp_at` display likely unimplemented in the JS zap path).

## Divergence 1 (fatal cascade): wish "bugle" unknown to JS

Step 58, key `\n` (third wish). C:

```
rn2(5)=3   @ rnd_otyp_by_namedesc(objnam.c:3522)
rnd(2)=1   @ next_ident(mkobj.c:521)
rn2(100)=85 @ makewish(zap.c:6421)
```
→ "q - a bugle."

JS: "Nothing fitting that description exists in the game.  For what do you
wish?" — `WISH_BASE_OBJECTS` (js/cmd.js ~3562) has no `bugle` entry (bugle only
appears in `WISH_TOOL_ROLLS`, js/cmd.js:3869, which is not consulted for this
name). The wish retries then eat the following `#wizwish`/`horn of plenty`
text, so JS ends up with NO bugle and every later wished item shifted by one
inventory letter (C: q=bugle, r=plenty, s=frost horn, t=amulet; JS: q=plenty,
r=frost horn, s=amulet — visible at steps 82/102/132/133, e.g. put-on prompt
`[des or ?*]` vs C `[det or ?*]`). All applies from ~step 140 on hit the wrong
items in JS; screens 133-169 all mismatch. This single missing table entry
accounts for nearly the whole 51-screen mismatch.

Suspect: js/cmd.js wish name tables (`WISH_BASE_OBJECTS`,
`WISH_TOOL_APPEARANCES` — the latter also lacks `bugle` and `leather drum`).

## Divergence 2: "leather drum" wish — wrong display name + missing weighted-pick roll

Step 43. C: "p - a drum." (unidentified appearance; objects.h:1002
`TOOL("leather drum", "drum", ...)`). JS: "p - a leather drum." (true name
leaked; cf. tooled horn correctly shown as "o - a horn." at step 21).
RNG at step 43, C:

```
rn2(5)=4   @ rnd_otyp_by_namedesc(objnam.c:3522)   <- weighted pick, ALWAYS rolled
rnd(2)=2   @ next_ident(mkobj.c:521)
rn2(100)=38 @ makewish(zap.c:6421)
```
JS produced no `rn2(5)` there — it went straight to `rnd(2)` (next_ident).
C's `rnd_otyp_by_namedesc` rolls `rn2(maxprob)` (objnam.c:3521) for EVERY
successful wish, even single matches. JS got this right for "tooled horn"
(step 21: `rn2(6)=5` matched exactly) and "horn of plenty" (step 82: `rn2(3)=0`
matched), so the coverage is partial — likely only names routed through
`WISH_OBJECT_RANGES`/`calledRangeBaseNamedescName` (js/cmd.js:43715-43740)
get the roll; plain base-name wishes skip it.

Suspect: js/cmd.js `wishedBaseObjectFromName` / `makeWishedRangeObjectByName`
(missing rnd_otyp_by_namedesc-equivalent roll for direct table hits) and the
missing appearance data for leather drum (`WISH_TOOL_APPEARANCES`).

## Divergence 3: mksobj_init charge/BUC init for tools & amulets

Visible in the C annotations where the JS stream (before the cascade) has
different or shifted calls:

- horn of plenty (step 82): `rn2(18)=17 @ mksobj_init(mkobj.c:1038)` =
  `spe = rn1(18, 3)` (mkobj.c:1037, HORN_OF_PLENTY/BAG_OF_TRICKS).
- frost horn (step 102): `rn2(5)=4 @ mksobj_init(mkobj.c:1056)` =
  `spe = rn1(5, 4)` (mkobj.c:1050-1055, MAGIC_FLUTE/MAGIC_HARP/FROST_HORN/
  FIRE_HORN/DRUM_OF_EARTHQUAKE).
- amulet of reflection (step 132): `rn2(10)=4 @ mksobj_init(mkobj.c:1063)` +
  `rn2(10)=6 @ blessorcurse(mkobj.c:1846)` (AMULET_CLASS init,
  mkobj.c:1058-1066).

C's wish call order is: `rn2(maxprob)` (rnd_otyp_by_namedesc) → `mksobj`
(next_ident → class-specific init incl. charges → blessorcurse where
applicable) → `rn2(100)` (makewish "god's notice" roll, zap.c:6421).
js/mklev.js `mksobj_init` (line 4183) should be audited against these
TOOL_CLASS/AMULET_CLASS branches.

## Suggested fix areas

1. js/cmd.js wish tables: add `bugle` (and audit all instrument/tool names
   against objects.h), add leather-drum/bugle appearance entries.
2. js/cmd.js wish fulfillment: always consume the `rn2(maxprob)` weighted-pick
   roll, with maxprob matching C's `rnd_otyp_by_namedesc` for that wish text.
3. js/mklev.js `mksobj_init`: TOOL_CLASS charge init (rn1(18,3), rn1(5,4),
   etc.) and AMULET_CLASS `rn2(10)`+`blessorcurse(10)`.
4. Once the wish cascade is gone this session probes: music.c improvise flow
   (`rn2(2)` music.c:535, `rnd(5)`+`rn2(7)xN` improvised_notes), the getlin
   tune path, drum deafness `rn1(20,30)`, hornoplenty (mkobj.c:2867/2880),
   directional horn blast (dobuzz range `rn1(7,7)`, zap_hit, bounce,
   reflection) — plus the supplemental animFrames for the beam display.
