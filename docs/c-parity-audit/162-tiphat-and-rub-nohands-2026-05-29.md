# Worn Helmet `#tip` And `#rub` No-Hands Guard

## C Anchors

- `tip_ok()` excludes coins, suggests containers or known horns, and downplays ordinary inventory including helmets: `nethack-c/upstream/src/pickup.c:3481`.
- Carried `#tip` uses `getobj("tip", tip_ok, GETOBJ_PROMPT)`: `nethack-c/upstream/src/pickup.c:3624`.
- Helmet handling is strictly `uarmh && cobj == uarmh`; non-worn helmets fall through to ordinary no-effect: `nethack-c/upstream/src/pickup.c:3670`.
- `tiphat()` checks cursed state before asking for a direction and returns a move only when C would spend one: `nethack-c/upstream/src/sounds.c:1436`.
- Uncursed worn helmets prompt `At whom? (in what direction)` and successful direction starts with `You briefly doff your helm/hat.`: `nethack-c/upstream/src/sounds.c:1441` and `nethack-c/upstream/src/sounds.c:1449`.
- Self direction prints `The lout here doesn't acknowledge you...`: `nethack-c/upstream/src/sounds.c:1451`.
- `cursed()` prints `You can't.  It is cursed.`, sets `bknown`, and lets unknown cursed gear consume a move: `nethack-c/upstream/src/do_wear.c:1893`.
- `dorub()` blocks no-hands forms before object selection with `You aren't able to rub anything without hands.`: `nethack-c/upstream/src/apply.c:1785`.

## JS State Before

- Carried `#tip` already accepted ordinary downplayed inventory, but worn helmets went through `tipOrdinaryObjectMessages()` and printed `Nothing happens.` with no move.
- There was no `tipHatDirection` mode, cursed worn helmet handling, or identity check limiting the branch to the actually worn helmet.
- `#rub` checked inventory candidates before no-hands, so no-hands forms could see prompts or route gray stones into `use_stone()`.

## Change

- Selecting the actually worn helmet via carried `#tip` now enters a `tipHatDirection` prompt unless the helmet is cursed.
- Cursed worn helmets now print the C curse message, set `bknown`, and only spend a move when the curse was previously unknown.
- Self direction now spends a move and prints `You briefly doff your helm/hat.` plus the C lout message.
- Non-worn helmets remain ordinary downplayed objects and still produce no-effect behavior.
- `#rub` now checks `polyselfNoHands()` before rub-candidate filtering, preserving C's pre-selection ordering and avoiding gray-stone observation in no-hands forms.

## Tests

- `worn uncursed helmet tip prompts for direction then self doffs`
- `worn soft hat tip uses hat wording`
- `unknown cursed worn helmet tip learns curse and spends action`
- `known cursed worn helmet tip blocks without spending action`
- `non-worn helmet tip remains ordinary no-effect`
- `#rub no-hands form blocks before gray-stone selection or observation`

## Remaining Gaps

- Full `tiphat()` target reactions: steed noise, vertical no-target wording is present but not broadly tested, ray scan through statues/unseen glyphs, peaceful humanoid helmet response, hostile humanoid rude reactions with C RNG, and monster wait-strategy details.
- Reusable `getobj()` primitives remain local to command implementations.
- Full touchstone effect matrix and ordinary stairs/ladders migration remain open.
