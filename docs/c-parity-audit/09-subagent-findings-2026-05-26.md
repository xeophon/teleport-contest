# C Parity Audit 09: Sub-Agent Findings 2026-05-26

This note preserves the latest parallel source audits. These are implementation candidates only; they are derived from upstream C and current JS, not from private-test inference.

## Completed From This Round

- Object/wish no-match handling: C `makewish()` retries failed `readobjnam()` descriptions and calls `readobjnam(NULL, NULL)` after `MAXWISHTRY` failures (`nethack-c/upstream/src/zap.c:6313-6366`). JS now removes the arbitrary named-weapon fallback, keeps invalid descriptions out of wish conduct, retries the prompt, and randomizes on the fifth bad description.
- Carried fire-ignition shop billing: C `catch_lit()` charges carried unpaid ignitable objects in shops through `check_unpaid()`, prints the additional-cost message, and preserves the bill row with `bill_dummy_object()` before `begin_burn()` (`nethack-c/upstream/src/apply.c:1577-1620`). JS now charges unpaid carried lamps/light sources that catch fire in a shop, records the used-up bill row, and leaves off-shop ignition on the live bill row.

## Candidate Slices

1. Generic floor `fire_damage()` ownership billing.
   - C refs: `nethack-c/upstream/src/trap.c:4455-4541`, `nethack-c/upstream/src/zap.c:4598-4661`, `nethack-c/upstream/src/invent.c:4763-4777`, `nethack-c/upstream/src/shk.c:3307-3710`.
   - JS refs: `js/cmd.js:7794`, `js/cmd.js:7811`, `js/cmd.js:8219`.
   - Narrow slice: keep floor catch-light unbilled, but add a hero-caused billing wrapper for generic floor-item fire destruction that corresponds to C `useupf()`: same-shop destruction should create used-up bill rows, outside-shop destruction should record robbed value, and non-hero destruction should stay unbilled.

2. Projectile and drop shop landing parity.
   - C refs: `nethack-c/upstream/src/dothrow.c:1180`, `nethack-c/upstream/src/dothrow.c:1780`, `nethack-c/upstream/src/do.c:827`, `nethack-c/upstream/src/dokick.c:409`, `nethack-c/upstream/src/shk.c:3692-3927`.
   - JS refs: `js/cmd.js:14901-14945`, `js/cmd.js:42499`, `js/cmd.js:42743`.
   - Narrow slice: add a shared shop-object landing helper for unpaid same-shop return, off-shop stolen-value conversion, and paid landing sale handling before broad breakage/container-impact work.

3. Victual runtime after first-bite billing.
   - C refs: `nethack-c/upstream/src/eat.c:360`, `nethack-c/upstream/src/eat.c:519`, `nethack-c/upstream/src/eat.c:2020`, `nethack-c/upstream/src/eat.c:3049-3129`, `nethack-c/upstream/src/eat.c:3806`.
   - JS refs: `js/cmd.js:10611-10753`, `js/cmd.js:41878-42119`, `js/allmain.js:10812`.
   - Narrow slice: use the existing `oeaten` and first-bite billing helpers for ordinary non-special food so one bite happens at command start, later bites happen during occupation, and the object is removed only at finish.

4. Tin follow-up.
   - C refs: `nethack-c/upstream/src/eat.c:1389`, `nethack-c/upstream/src/eat.c:1514-1721`.
   - JS refs: `js/cmd.js:11992-12235`.
   - Narrow slice: handle metallivorous empty/meat/spinach tin nutrition and prompt bypass exactly, after ordinary victual runtime is stable.

5. Wish parser and object finalization.
   - C refs: `nethack-c/upstream/src/objnam.c:3978-3996`, `nethack-c/upstream/src/objnam.c:4177-4237`, `nethack-c/upstream/src/objnam.c:5037-5189`, `nethack-c/upstream/src/objnam.c:5255-5268`, `nethack-c/upstream/include/objclass.h:52`, `nethack-c/upstream/include/objclass.h:60`, `nethack-c/upstream/include/obj.h:49`, `nethack-c/upstream/src/zap.c:6360`.
   - JS refs: `js/cmd.js:9485`, `js/cmd.js:9504`, `js/cmd.js:19322`, `js/cmd.js:38258-38512`.
   - Narrow slice: keep the new no-match result kind, then add C-shaped quantity and `spe` constraints without changing the whole parser at once. Quantity should remain limited to mergeable object classes; requested `spe` should follow C class rules for weapons/armor/weapon-tools/charged rings, wands, crystal balls, and non-`spe` objects.
