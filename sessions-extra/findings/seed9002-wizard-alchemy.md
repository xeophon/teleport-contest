# seed9002-wizard-alchemy — findings

## What the session covers

Wizard-mode alchemy probe on seed 9002 (playmode:debug). All inputs land in the
C recording (verified via inspect-session.mjs):

- 7 `#wizwish`es: potion of healing (→`p`), 2 potions of gain level (→`q`),
  potion of booze (merges into starting stack at `h`, triggers type
  discovery), potion of fruit juice (→`r`), potion of water (→`s`),
  blessed potion of water (→`t`), potion of enlightenment (→`u`),
  plus an alchemy smock (→`v`, worn to suppress alchemic blasts — at this
  seed 2 of the first 3 mixes exploded 1-in-10 without it).
- `T`/`W` armor doff/don (multi-turn occupation, monster turns elapse).
- 5 `#dip`s, all executing:
  1. fruit juice + enlightenment → booze ("The mixture looks pink.")
  2. healing + gain level → extra healing ("The mixture looks golden.")
  3. booze + gain level → hallucination ("The mixture looks dark.")
  4. water + blessed water → holy water ("Your clear potion glows with a
     light blue aura." + deterministic `Call a clear potion:` docall prompt,
     answered with `\n`)
  5. spellbook of force bolt (`l`) into potion → "Interesting..." (invalid dip)

C wishes are free commands (ECMD_OK); turns only start elapsing at the
armor change (T:9 at end).

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9002-wizard-alchemy.session.json`
→ **RNG 2199/2305, Screen 234/292 (cells 234/292, cursors 277/292) — FAIL**

RNG mismatches come in exactly 3 runs; screens diverge at steps 62, 88-89,
120, 146, 180, 214, 238, 240, and 244-292.

## Divergence 1 (first screen, step 62): no plural in wish-landing message

C: `q - 2 orange potions.`  JS: `q - 2 orange potion.`

`wishedInventoryPhrase()` (js/cmd.js:15905) returns
`` `${displayQuan} ${visibleName}` `` for quan>1 without pluralizing the
object name. C runs the name through makeplural() in doname/xname.
Fix area: js/cmd.js `wishedInventoryPhrase` (needs a makeplural equivalent
for the multi-case).

## Divergence 2 (step 88-89): booze wish doesn't merge / no discovery

C step 88: `rn2(41)=16 @ rnd_otyp_by_namedesc(objnam.c:3522)` … then the
landing is `You learn more about your items by comparing them.--More--`
followed by `h - an uncursed potion of booze`: the wished (type-known)
booze merges into the hero's starting unidentified booze stack at `h`, and
the comparison auto-discovers the type.

JS step 88: `r - a pink potion.` — the wished booze arrives *unidentified*
(kind "pink potion", `known:false`) and does **not** merge with the
starting stack at `h`; no discovery message. This shifts every later
inventory letter by one (JS: r=booze,s=juice,t=water,u=water,v=enl,w=smock
vs C: r=juice,s=water,t=bles.water,u=enl,v=smock), so every subsequent dip
prompt/screen diverges and the JS `W` wear then picks letter `v` (a potion
in JS) instead of the smock — the JS smock is never worn.

Fix areas: JS wish-created potions (cmd.js:44440-44475, `makeWished...`
potion path) should arrive type-known like C's makewish result and merge
with matching stacks (check JS addinv/merge criteria re `wishedfor` /
dknown); the 5.0 discovery-by-comparison (`next_ident`/discoveries) path
looks unimplemented for wishes.

## Divergence 3 (first RNG, step 146 and 180): water wish skips namedesc roll

C step 146: `rn2(81)=52 @ rnd_otyp_by_namedesc(objnam.c:3522)`,
`rnd(2)=1 @ next_ident(mkobj.c:521)`, `rn2(4)=3 @ blessorcurse(mkobj.c:1846)`,
`rn2(100)=74 @ makewish(zap.c:6421)`.
JS at the same boundary: `rnd(2)=2`, `rn2(4)=0`, `rn2(2)=1`, `rn2(100)=74`.

In C, *every* non-gem wish resolves via `rnd_otyp_by_namedesc()` and pays
`rn2(oc_prob+1)` — potion of water is oc_prob 80 → `rn2(81)`. JS
(cmd.js:44454-44455) only rolls `rn2(POTION_WISH_PROBS[potionIndex]+1)`
when `'water'` is found in IDENTIFIED_POTION_NAMES — it isn't (water is
POT_WATER, outside the random-potion table), so JS skips the namedesc
roll entirely, then emits an extra `rn2(2)` later in its water path.
Draw *count* accidentally matches (streams re-align at `rn2(100)=74`),
so only these 3-call windows mismatch.

Cascade: JS's blessorcurse-equivalent roll reads a different raw draw
(rn2(4)=0 vs C's 3) → JS's *plain* water wish comes out blessed, and JS
displays `t - a potion of holy water.` where C shows `s - a clear potion.`
— JS also leaks the true BUC into the name (cmd.js:51494:
`if (raw === 'water' && item.blessed) phrase = 'potion of holy water'`)
without bknown; C shows "a clear potion" because the hero doesn't know.

Fix areas: cmd.js potion-wish path — water/holy water/unholy water must
consume `rn2(80+1)` like C's rnd_otyp_by_namedesc, and the "holy water"
display name must be gated on bknown, not the raw blessed flag.

## Divergence 4 (RNG tail, steps 241-292): monster turns missing in JS

From the first turn-elapsing command (armor doff/don) to end of session,
C logs 100 monster-AI calls JS never makes, starting with
`rn2(5)=1 @ distfleeck(monmove.c:538)` and `rn2(12)=9 @ m_move(monmove.c:1963)`
(3 monsters × ~9 turns; the rn2(5) is distfleeck's unconditional
brave-gremlin roll, so it fires for every moving monster each turn).

JS ends with T:3 vs C T:9 and zero monster-movement calls. Two suspected
JS gaps:
- js/cmd.js armor doff/don does not model C's multi-turn armor delays
  (C's wear occupation is what pushes turns 1-5 here), and the JS wear
  didn't even happen (letter skew, divergence 2).
- js/allmain.js:9904 only calls `processMonsterTurns()` when
  `u.umovement < NORMAL_SPEED`; the #dip handlers evidently don't spend
  movement the way C's ECMD_TIME does, so monsters starve.

Cursor-only mismatches (15 screens) are the --More-- cursor on the
divergent message steps; they follow the message fixes above.

## Suggested fix order

1. cmd.js wish potion path: namedesc rn2 for water + type-known wished
   potions + merge/discovery (fixes the letter skew that dominates the
   screen diffs).
2. cmd.js:15905 `wishedInventoryPhrase` pluralization.
3. cmd.js BUC display gating for (un)holy water.
4. Turn accounting: armor doff/don delays + monster-turn scheduling for
   time-consuming commands (allmain.js processMonsterTurns gating).
