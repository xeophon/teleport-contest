# 747 - Hero projectile monster lifesaving

## Implemented Slice

Hero projectile kills now honor worn monster amulets of life saving on the shared projectile death path:

- only a worn monster inventory amulet of life saving is consumed;
- living monsters and shifted vampires are eligible, while ordinary nonliving monsters are not;
- hero killer conduct and the normal kill/destroy message happen before the amulet triggers;
- visible saves print the C-ordered medallion glow, recovery, and crumble messages;
- unseen saves print only the post-`mondead()` `Maybe not...` fallback after the hit/kill text;
- successful saves restore movement state and HP, keep remaining monster inventory attached, skip drops, corpse/treasure, luck, score XP, live XP, vanquish counts, and monster removal;
- projectile landing remains unchanged and still happens after the survivor path returns.

C anchors:

- Projectile hits route through `thitmonst()`/`hmon()` and lethal hits call `killed()`/`xkilled()` before projectile mulch/passive/landing resumes: `nethack-c/upstream/src/dothrow.c:1481`, `nethack-c/upstream/src/dothrow.c:2205`, `nethack-c/upstream/src/dothrow.c:2220`, `nethack-c/upstream/src/uhitm.c:1863`, `nethack-c/upstream/src/uhitm.c:1900`, `nethack-c/upstream/src/uhitm.c:1908`, `nethack-c/upstream/src/uhitm.c:1934`.
- `xkilled()` sets monster HP to zero, records killer conduct, emits the kill/destroy message when requested, then calls `mondead()`: `nethack-c/upstream/src/mon.c:3470`, `nethack-c/upstream/src/mon.c:3498`, `nethack-c/upstream/src/mon.c:3503`, `nethack-c/upstream/src/mon.c:3548`.
- `mlifesaver()` only finds a worn `W_AMUL` amulet of life saving on living monsters, plus vampshifters: `nethack-c/upstream/src/mon.c:2825`.
- `lifesaved_monster()` emits the visible medallion messages, consumes the amulet with `m_useup()`, restores movement and HP, and leaves genocided species dead: `nethack-c/upstream/src/mon.c:2847`, `nethack-c/upstream/src/mon.c:2855`, `nethack-c/upstream/src/mon.c:2865`, `nethack-c/upstream/src/mon.c:2872`, `nethack-c/upstream/src/mon.c:2881`, `nethack-c/upstream/src/mthrowu.c:1152`.
- `mondead()` returns immediately when life saving leaves the monster alive, before vampshifter revival and before ordinary death cleanup; `xkilled()` then prints `Maybe not...` for unseen survivors: `nethack-c/upstream/src/mon.c:3089`, `nethack-c/upstream/src/mon.c:3091`, `nethack-c/upstream/src/mon.c:3552`, `nethack-c/upstream/src/mon.c:3555`.
- The skipped cleanup includes `mvitals`, monster detachment, inventory drops, random treasure/corpse/glob handling, luck, score XP, and live XP: `nethack-c/upstream/src/mon.c:3134`, `nethack-c/upstream/src/mon.c:3175`, `nethack-c/upstream/src/mon.c:3582`, `nethack-c/upstream/src/mon.c:3644`.

JS changes:

- Added a projectile-local monster life-saving detector for worn amulets in `mon.minvent`.
- Added life-saving restoration and message handling before shifted-vampire revival and before real death cleanup.
- Kept projectile landing and impact callers unchanged; fired, thrown, kicked, and polearm projectile families all continue through the shared death helper.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- visible thrown-dagger monster life saving consumes the worn amulet, discovers it, restores the monster to 10 HP, preserves remaining inventory, skips corpse/drop/vanquish/XP cleanup, records hero killer conduct, and lands the projectile;
- unseen thrown-dagger monster life saving emits only `Maybe not...`, consumes the amulet without discovery, skips death cleanup, and lands the projectile;
- an unworn monster amulet of life saving is ignored, drops with the monster inventory, and ordinary kill cleanup proceeds.

## Deferred Gaps

- Deadly-poison projectile kills use the same no-kill-message helper path but still need a dedicated life-saving canary.
- Genocided monster life saving consumes the amulet and resumes normal death cleanup in C; the JS helper includes the branch, but it is not yet independently covered by a projectile test.
- Broader non-projectile monster life-saving consumers remain separate audits.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal target uses monster life saving|hero-thrown dagger unseen monster life saving|hero-thrown dagger lethal target ignores unworn monster life saving|hero-thrown dagger lethal target removes monster|hero-thrown dagger revives shifted vampire|hero-thrown dagger lethal target grants live experience|f command arrow revives shifted vampire" test/shop-billing-helpers.test.mjs` - 7 pass, 2682 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
