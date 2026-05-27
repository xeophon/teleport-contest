# C Parity Audit 48: Statue Shatter Debt

## Purpose

This note records the implemented statue-trap shatter shop-debt slice and the fresh follow-up audits. The code change is deliberately limited to hero-caused shatter animation: normal/search statue trap activation still transfers statue contents to the animated monster without billing the hero.

## Implemented Slice

C `animate_statue()` is explicit about sequencing: create the monster, print the animation message, charge `stolen_value()` for a shop-owned statue before moving statue contents, then transfer contents to the monster and delete the statue. JS now mirrors that timing for `activateStatueTrap(..., { shatter: true })`.

The new JS path bills while the statue still owns its contents, removes live bill rows through the existing lost-merchandise helper, applies shop credit before debit, formats the C-style debt line after "Instead of shattering...", and only then moves contents to the animated monster inventory and removes the statue. Normal/search activation remains free, matching C's `cause != ANIMATE_NORMAL` gate. No-charge statues and dead/nonresident shopkeepers do not charge.

## C Anchors

- `nethack-c/upstream/src/trap.c:713-720`: `animate_statue()` documents the required ordering: message, `stolen_value()`, content transfer, deletion.
- `nethack-c/upstream/src/trap.c:854-867`: hero-caused shatter/spell consequences charge costly statue spots when the statue is not `no_charge`.
- `nethack-c/upstream/src/trap.c:880-890`: contents move to monster inventory after `stolen_value()` and the statue is deleted.
- `nethack-c/upstream/src/trap.c:923-925`: statue-trap activation passes `ANIMATE_SHATTER` only for shatter attempts; normal activation uses `ANIMATE_NORMAL`.
- `nethack-c/upstream/src/shk.c:3712-3750`: `stolen_container()` prices contents and removes live bill rows before debt conversion.
- `nethack-c/upstream/src/shk.c:3768-3855`: `stolen_value()` handles owner lookup, content counts, credit, debit/robbed routing, and "for it/its contents" debt wording.

## JS Notes

- `js/cmd.js`: `statueShatterShopDebtMessage()` now runs between animation-message construction and `moveStatueContentsToMonster()`.
- `js/cmd.js`: the helper reuses `lostShopMerchandiseValueForObject()` and `chargeShopkeeperForLostMerchandise()` so contents and bill rows are valued before transfer.
- `js/cmd.js`: `activateStatueTrap()` appends any debt/credit line after the shatter animation text and still skips the helper for `normal`/`search` activation.
- `test/shop-billing-helpers.test.mjs`: focused tests cover shatter debt before inventory transfer, normal activation staying free, no-charge statues staying free, and dead shopkeeper charging gates.

## Fresh Follow-Up Findings

### Stone To Flesh Rescue

The next compact runtime slice is still self-cast stone to flesh rescue: clear active stoning with "You feel limber!" and convert stone-golem polyself to flesh-golem polyself before the existing carried marble-wand transform. Relevant C anchors remain `nethack-c/upstream/src/spell.c:1478`, `nethack-c/upstream/src/spell.c:1500`, `nethack-c/upstream/src/zap.c:2966-2990`, and `nethack-c/upstream/src/eat.c:867`.

### Direct Potionhit: Paralysis

The smallest next direct `potionhit()` family is potion of paralysis. C uses the already-covered thrown-potion hit gate, then applies `paralyze_monst(mon, rnd(25))` for movable monsters without potion resistance. JS already has hero paralysis vapor and monster `mcanmove`/`mfrozen` lifecycle support, so this can be a narrow follow-up after stone-to-flesh rescue.

Relevant C anchors: `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2262-2264`, `nethack-c/upstream/src/potion.c:1809`, and `nethack-c/upstream/src/mhitm.c:1209`.

### Shop Helper Consolidation

Statue shatter used the existing lost-merchandise primitives, but the broader consolidation remains open. The strongest next shop-helper callers are floor polymorph/stone-to-flesh costly alteration, burying merchandise, boulder push shop-boundary transitions, shared `sellobj()`, and generic `obfree()` preservation.

### Plan Hygiene

`PORTING_PLAN.md` should now remove statue shatter debt from the near-term caller and immediate-slice lists, promote stone-to-flesh rescue, and keep broader shop helper consolidation open. The README's stale "Selected Next Slice" prose should point to the active plan instead of duplicating completed coverage.

## Ranking

1. Stone-to-flesh stoning/polyself rescue is the next compact, source-backed runtime slice.
2. Direct hero-thrown potion of paralysis is the next bounded `potionhit()` family after confusion/booze.
3. Costly floor-object alteration and burying merchandise are the next useful `stolen_value()` consolidation callers.
4. Remaining forced-chest details are still valid but lower priority than the smaller source-backed rows above.
