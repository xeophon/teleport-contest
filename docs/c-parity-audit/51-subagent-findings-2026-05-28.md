# C Parity Audit 51: Burying Merchandise Shop-Helper Cleanup

## Purpose

Record the burying-merchandise cleanup and the remaining boundary around direct ice/cold-ray burial callers.

## Implemented Slice

C `bury_objs()` computes the costly shop context once, calls `stolen_value()` on each floor object before physical burial, marks every non-coin top-level buried candidate `no_charge`, and emits one aggregate "burying merchandise" debt message from the post-credit residual loss.

JS now keeps that burial-specific aggregate message for the two `cmd.js` boulder burial callers, but routes valuation through the shared lost-merchandise charge map. That path removes live bill rows, respects owner-billed objects, includes contents and contained gold, consumes shop credit before debt, and routes angry/non-peaceful value to `robbed` through the shared debt helper. The `no_charge` mark remains burial-specific and top-level only.

## C Anchors

- `nethack-c/upstream/src/dig.c:2050-2079`: `bury_objs()` costly-spot gate, `stolen_value()`, top-level non-coin `no_charge`, and final aggregate message.
- `nethack-c/upstream/src/shk.c:3712-3750`: `stolen_container()` content and bill-row handling.
- `nethack-c/upstream/src/shk.c:3754-3855`: `stolen_value()` owner lookup, bill removal, contained gold, credit, debit, robbed, and message behavior.
- `nethack-c/upstream/src/do.c:50-94`, `nethack-c/upstream/src/do.c:185-267`: boulder pool and pit/hole floor-effect callers.
- `nethack-c/upstream/src/zap.c:5069`, `nethack-c/upstream/src/zap.c:5277`: ray/ice terrain callers that can still reach `bury_objs()` in C.

## JS Anchors

- `js/cmd.js:20135-20173`: owner-aware `lostShopMerchandiseChargesForObject()` map used by burial and magic-bag loss.
- `js/cmd.js:20650-20668`: `buriedMerchandiseDebtMessage()` now values through the shared charge/debt helpers and applies burial's top-level `no_charge` mark.
- `js/cmd.js:20833-20839`: boulder pit/hole burial charges before `buryObjectsAt()`.
- `js/cmd.js:22405-22406`: boulder liquid-fill burial charges before `buryObjectsAt()`.
- `js/ice.js:725-752`, `js/ice.js:915`, `js/ice.js:991`: direct ice/cold-ray burial callers remain physical-object transitions only and are a follow-up boundary.

## Focused Coverage

- Unpaid shop-floor burial removes the live bill row, consumes credit, and reports only the residual debt.
- Owner-billed no-charge floor merchandise charges the bill owner rather than the burial spot shopkeeper.
- No-charge top-level containers still charge chargeable contents and contained gold.
- Angry shopkeeper burial records the value as `robbed` while retaining the C aggregate "owe" wording.
- Physical burial still happens after debt collection and leaves non-coin top-level objects marked `no_charge`.

## Follow-Up Findings

Direct `js/ice.js` burial from ice settling and cold-ray terrain remains a real parity gap, but fixing it cleanly needs either a neutral shop-billing module or callback plumbing because `cmd.js` currently owns billing and imports from `ice.js`.

Floor polymorph and floor stone-to-flesh costly alteration are now the next strongest `stolen_value()`/`costly_alteration()` consolidation callers. Direct hero-thrown sleeping `potionhit()` remains the next compact potion family. Boulder push shop-boundary transitions, shared `sellobj()`, and generic `obfree()` preservation remain broader shop-helper work.

## Ranking

1. Floor polymorph or floor stone-to-flesh costly alteration.
2. Direct hero-thrown sleeping `potionhit()`.
3. Direct ice/cold-ray burial callback or shop-helper extraction.
4. Boulder push shop-boundary transitions and shared `sellobj()`.
5. Generic `obfree()` and ownership consolidation.
