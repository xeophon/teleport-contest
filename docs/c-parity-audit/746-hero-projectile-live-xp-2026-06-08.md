# 746 - Hero projectile live experience

## Implemented Slice

Hero projectile kills now award live hero experience and run level-up checks on the same C-shaped path already used by direct melee kills:

- final projectile deaths add live `u.uexp` in addition to score `u.urexp`;
- level-up messages are folded into the existing projectile hit/kill message before projectile landing resumes;
- shifted-vampire fake deaths still return before drops, luck, live XP, score XP, and monster removal;
- gas spore deaths still consume treasure/corpse-side RNG and run their explosion before live XP and level-up checks;
- direct melee and projectile kills now share the same monster XP calculation helper.

C anchors:

- Hero projectile hits route through `thitmonst()` and `hmon()` before projectile mulch/passive/landing resumes: `nethack-c/upstream/src/dothrow.c:1481`, `nethack-c/upstream/src/dothrow.c:2205`, `nethack-c/upstream/src/dothrow.c:2220`, `nethack-c/upstream/src/dothrow.c:1780`.
- Fatal `hmon()` reaches `killed()`/`xkilled()`; poison-deadly projectiles can use the no-message `xkilled()` route while still awarding XP: `nethack-c/upstream/src/uhitm.c:1900`, `nethack-c/upstream/src/uhitm.c:1908`.
- `xkilled()` performs the kill message and `mondead()` before random treasure, corpse/gas-spore handling, `newsym()`, luck, and finally `experience()`/`more_experienced()`/`newexplevel()`: `nethack-c/upstream/src/mon.c:3498`, `nethack-c/upstream/src/mon.c:3543`, `nethack-c/upstream/src/mon.c:3586`, `nethack-c/upstream/src/mon.c:3618`, `nethack-c/upstream/src/mon.c:3642`, `nethack-c/upstream/src/mon.c:3648`, `nethack-c/upstream/src/mon.c:3671`, `nethack-c/upstream/src/exper.c:83`, `nethack-c/upstream/src/exper.c:168`, `nethack-c/upstream/src/exper.c:300`.
- Shifted vampire revival returns from `mondead()` before `xkilled()` continues to drops/luck/XP: `nethack-c/upstream/src/mon.c:2889`, `nethack-c/upstream/src/mon.c:3091`, `nethack-c/upstream/src/mon.c:3552`.

JS changes:

- Added `monsterExperienceValue()` as the shared monster XP calculation source for score XP and live XP.
- Added `applyHeroKillLiveExperience()` to add live `uexp`, run `advanceExperienceLevel(true)`, clear level-change transient state, and append the C-style welcome message to the active kill message list.
- Made projectile impact helpers async only where they can reach a lethal hero kill: launcher ammo, thrown-by-hand ammo, thrown/kicked weapons, thrown/kicked gems, and applied polearms.
- Awaited the affected `#fire`, direct throw, kicked floor object, and polearm call sites.
- Replaced direct melee's duplicated live-XP formula with the shared helper.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- lethal thrown dagger and kicked ruby projectile kills add both score XP and live XP;
- a forced-RNG lethal thrown dagger kill at `uexp: 18` levels the hero to level 2, includes `Welcome to experience level 2.`, and still lands the dagger afterward;
- shifted-vampire revival through thrown and kicked projectile paths preserves the previous live XP and level.

## Deferred Gaps

- Monster lifesaving for projectile deaths is still separate from the shifted-vampire revival branch.
- Broader `hmon()` side effects outside the current projectile helper families remain open.
- Direct melee and projectile kills now share XP calculation, but other kill sources should be audited before reusing this helper elsewhere.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal target removes monster|hero-thrown dagger lethal target grants live experience|hero-thrown dagger lethal target can drop random treasure|hero-thrown dagger lethal gas spore|hero-thrown dagger revives shifted vampire|command kicked ruby lethal target removes monster|command kicked ruby revives shifted vampire|hero-thrown ruby lethal target removes monster|command kicked ruby lethal target removes monster|hero-thrown lawful poisoned crossbow bolt can wear off" test/shop-billing-helpers.test.mjs` - 9 pass, 2677 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
