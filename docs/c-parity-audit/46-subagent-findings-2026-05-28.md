# C Parity Audit 46: Forced Chest Shatter and Fresh Follow-Ups

## Purpose

This note records the implemented forced locked-box destruction slice plus the fresh read-only follow-up audits run against `nethack-c/upstream`. The code slice is intentionally narrow: force-lock chest destruction, potion content shatter/vapor, stack survivor placement, and shop loss for destroyed box contents.

## Implemented Slice

C `forcelock()` treats blade forcing as prying and blunt forcing as bashing. Only blunt forcing can request chest destruction because `breakchestlock(box, !picktyp && !rn2(3))` short-circuits the destroy roll for blades. JS now mirrors that at the helper and command-entry level: a wielded dagger starts with the prying message, sets `picktyp`, and does not consume the chest-destruction `rn2(3)`.

Destroyed boxes now process contents closer to `breakchestlock()`: each content object consumes one `rn2(3)`, potions always shatter, potion shatter uses direct `potionBreathe()` without the broken-potion odor prelude, one unit is destroyed from potion stacks, and live stack survivors are placed and stacked at the hero. Destroyed shop-floor contents are valued before stack decrement, with contained bags valued like inventory/free contents so nested unbilled gold and non-gold children are not charged as floor stock. The destroyed box is charged after contents, shop credit reduces the visible debt, and the final debt message follows the last content shatter message.

## C Anchors

- `nethack-c/upstream/src/lock.c:707-743`: `#force` computes `picktyp = is_blade(uwep) && !is_pick(uwep)` and chooses prying versus bashing messages.
- `nethack-c/upstream/src/lock.c:228-252`: blade weapon breakage, blunt wake-nearby behavior, and `breakchestlock(box, !picktyp && !rn2(3))`.
- `nethack-c/upstream/src/lock.c:162-210`: non-destroyed lock-break billing, destroyed-box content extraction, per-content `rn2(3)`, potion-always-destroy behavior, shop-loss accumulation, survivor placement, and aggregate debt line.
- `nethack-c/upstream/src/invent.c:1321-1329`: `useup()` destroys exactly one unit from a stack and leaves the survivor.
- `nethack-c/upstream/src/lock.c:1276-1285`, `nethack-c/upstream/src/potion.c:1932-1955`, `nethack-c/upstream/src/potion.c:2080-2090`: chest potion shatter wording and direct `potionbreathe()` effects.
- `nethack-c/upstream/src/shk.c:3712-3818`: `stolen_value()` owner lookup, bill removal, credit/debit/robbed routing, and returned post-credit loss.

## JS Notes

- `js/cmd.js:8934-8942`: command-side blade/pick recognition for the covered force path.
- `js/cmd.js:9032-9147`: chest shatter bottle names, direct potion vapor, destroyed-content placement, one-unit stack consumption, final `delobj()` RNG, and shop-loss helpers.
- `js/cmd.js:9150-9185`: `finishForceLock()` now short-circuits the destroy roll for blades and records the destroyed-box shop context.
- `js/cmd.js:36706-36727`, `js/cmd.js:36777-36793`, `js/cmd.js:36949-36978`: delayed chest-content processing now handles potion shatter, inventory-like contained valuation, stack survivors, silent content continuation, monster-turn resume, and debt sequencing.
- `js/cmd.js:45882-45889`: real `#force` now sets `picktyp` from the wielded weapon and uses the C prying message for blades.
- `test/shop-billing-helpers.test.mjs:9552-9715`: covers blade short-circuit, dagger command prying, direct vapor without odor prelude, potion stack survivors, aggregate box/content debt, post-credit debt text, inventory-like nested contained valuation, and message ordering.

## Fresh Follow-Up Findings

### Direct Hero-Thrown Potionhit

- C consumes the ordinary `rnd(20)` projectile hit roll, then potions directly hit on `DEX > rnd(25)` and call `potionhit()` rather than landing/breaking (`nethack-c/upstream/src/dothrow.c:1477-2265`).
- A known confusion potion hitting a visible ordinary monster prints the bottle crash/evaporation messages, may chip 1 HP with `rn2(5)`, and sets `mconf` unless potion resistance succeeds at attack level 6 (`nethack-c/upstream/src/potion.c:1623-1927`, `nethack-c/upstream/src/zap.c:6099-6141`).
- JS still routes hero-thrown potions through the generic miss/landing path (`js/cmd.js:48271-48393`).
- Smallest safe slice: known hero-thrown potion of confusion, visible ordinary hostile target at range 2+, C hit rolls, no floor object on hit, crash/evaporation messages, `mconf`, and miss/landing path preserved.

### Statue Shatter Shop Debt

- C `animate_statue()` charges `stolen_value()` after the animation message and before moving statue contents to monster inventory (`nethack-c/upstream/src/trap.c:713-880`).
- JS `activateStatueTrap()` still moves contents and removes the statue without debt (`js/cmd.js:14426`).
- Smallest safe slice: only `activateStatueTrap(..., { shatter: true })`, charge a tended costly statue spot before `moveStatueContentsToMonster()`, while keeping normal/search activation free.

### Stone To Flesh Follow-Ups

- The next compact stone-to-flesh object slice is petrification rescue and stone-golem polyself rescue, because JS already has `_stonedTimeout` and clearing helpers near the self-cast path.
- Broader rings-to-meat-ring, gems/stones, boulders, statues, figurines, and beam/floor transformations should wait for registry-backed material metadata.

### Shop Helper Follow-Ups

- The chest slice still uses local wrappers around `lostShopMerchandiseValueForObject()` and `chargeShopkeeperForLostMerchandise()`.
- A reusable `stolen_value()`-style helper remains valuable for statue shatter, magic-bag valuation, projectile/container loss, and future generic `obfree()` cleanup.

## Remaining Forced-Chest Gaps

- Blade weapon breakage during a long forcing occupation is still not modeled.
- Blunt forcing still does not wake nearby monsters during the occupation.
- Non-potion destroyed-content messages remain generic rather than C material-specific `chest_shatter_msg()` variants.

## Ranking

1. Direct hero-thrown confusion-potion `potionhit()` is the next smallest potion delivery row.
2. Statue-trap shatter debt is compact and can reuse the chest loss helper shape.
3. Petrification-rescue stone to flesh is a small status/runtime slice before broader material-object transforms.
4. Generic `stolen_value()`/`obfree()` helper consolidation should follow another user-visible caller so the abstraction stays grounded.
