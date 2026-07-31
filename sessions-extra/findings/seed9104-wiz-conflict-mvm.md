# seed9104-wiz-conflict-mvm — findings

## What the session covers

Ring of conflict + monster-vs-monster combat (wizard mode, midday, Dlvl:1):

1. `#wizwish ring of conflict` → "p - a steel ring."
2. `P p l` wear on left hand ("Which ring-finger, Right or Left?" prompt).
3. `#wizgenesis orc` x2 + `#wizgenesis orc-captain` — three hostile orcs adjacent.
4. 30 counted searches: conflict-driven mvm ("The orc-captain hits the orc.  The orc is
killed!"), monster weapon equipping ("The orc wields a curved sword!"), hero-targeted
hits + Die?-no revival cycles.

RNG shows mvm paths: `mattackm(mhitm.c:441)`, `mdamagem(mhitm.c:1025)`,
`mhitm_knockback` etc.

Recorded with seed 9104. 181 steps, T:11 by end; recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 2697/2936, Screen 92/181 (cursors 130/181)**.

Everything matched through wish/wear/genesis triple (2693 calls). First mismatch at
step 95 (the first mvm kill resolution): C `d(2,4)=8` then `rn2(3)`-targeting vs JS
`d(1,2)=2`.
Gap guess: JS monster-vs-monster damage uses wrong weapon/damage dice for an armed
attacker (orc-captain's 2d4 attack resolved as d(1,2) in JS) — mattackm/mdamagem
damage-computation branch mismatch.
