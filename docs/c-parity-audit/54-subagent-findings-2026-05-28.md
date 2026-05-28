# C Parity Audit 54: Direct Ice And Cold-Ray Burial Billing

## Purpose

Record the callback plumbing that brings direct ice/cold-ray burial callers onto the shared buried-merchandise shop helper.

## Implemented Slice

C keeps `bury_an_obj()` physical-only and routes shop billing through `bury_objs()` before physical burial. This slice threads an optional billing callback through JS ice terrain code so hero cold rays and hero fire rays melting ice can charge shop-owned floor merchandise before `buryObjectsAt()` moves it to the buried list.

The direct cold-ray path now charges water/moat/lava freeze burial through `buriedMerchandiseDebtMessage()`, marks non-coin top-level buried objects `no_charge`, preserves owner-billed routing through the shared lost-merchandise helper, and emits the aggregate "burying merchandise" line before the visible terrain message. Hero fire rays now pass the same callback only when melting ice can make a boulder settle and fill the resulting pool. Timer-driven ice melt and non-hero fire-breath melt remain debt-free because they do not pass the callback.

## C Anchors

- `nethack-c/upstream/src/dig.c:1984-2047`: `bury_an_obj()` handles physical extraction, ball/leash/burning/timer state, and buried-list insertion without shop accounting.
- `nethack-c/upstream/src/dig.c:2050-2079`: `bury_objs()` computes the costly shop, calls `stolen_value()`, marks non-coin top-level objects `no_charge`, then emits the aggregate debt line.
- `nethack-c/upstream/src/zap.c:5238-5277`: cold terrain handling freezes liquid terrain, calls `bury_objs(x, y)`, then continues with freeze messages and ice effects.
- `nethack-c/upstream/src/zap.c:5040-5076`: melting ice can settle a boulder into the resulting pool.
- `nethack-c/upstream/src/do.c:50-105`: `boulder_hits_pool()` fills liquid terrain and calls `bury_objs()` when the boulder fills the pool.
- `nethack-c/upstream/src/zap.c:5119-5130`: timer-driven ice melt sets `svc.context.mon_moving`, suppressing shop-debt charging inside `bury_objs()`.

## JS Anchors

- `js/cmd.js:39599`: hero cold rays pass `buriedMerchandiseDebtMessage` into cold terrain handling.
- `js/cmd.js:39785`: hero fire rays pass the same callback into ice-melt terrain handling.
- `js/fire_breath.js:327`: fire-ray ice terrain forwards the callback only for hero-caused fire rays.
- `js/ice.js:897`: boulder-settling after ice melt can run the callback before physical burial and append the debt line after burial messages.
- `js/ice.js:933`: cold-ray terrain can run the callback before physical burial and append the debt line before freeze messages.
- `js/ice.js:1031`: `meltIceAt()` accepts the optional callback while timer callers keep the default debt-free path.
- `test/shop-billing-helpers.test.mjs:9669`: focused coverage for direct cold-ray burial, owner-billed no-charge merchandise, and hero fire-ray boulder-settle burial.

## Follow-Up Findings

Remaining shop-helper consolidation still includes boulder push shop-boundary transitions, shared `sellobj()`, generic `obfree()` preservation, remaining magic-bag source/target cases, and broader costly-alteration callers. Ice terrain itself still has broader parity gaps outside this billing slice, including deeper liquid/monster handling, exact visibility ordering, water-wall/lava-wall edge cases, and full timer/save ownership.

## Ranking

1. Direct hero-thrown sleeping `potionhit()`.
2. Boulder push shop-boundary transitions and shared `sellobj()`.
3. Remaining magic-bag valuation/source/target cases.
4. Generic `obfree()` and ownership consolidation.
5. Remaining stone-to-flesh object rows, resistance, and beam traversal.
