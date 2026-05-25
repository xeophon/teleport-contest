# C Parity Audit 09: Sub-Agent Findings 2026-05-26

This note preserves the latest parallel source audits. These are implementation candidates only; they are derived from upstream C and current JS, not from private-test inference.

## Completed From This Round

- Object/wish no-match handling: C `makewish()` retries failed `readobjnam()` descriptions and calls `readobjnam(NULL, NULL)` after `MAXWISHTRY` failures (`nethack-c/upstream/src/zap.c:6313-6366`). JS now removes the arbitrary named-weapon fallback, keeps invalid descriptions out of wish conduct, retries the prompt, and randomizes on the fifth bad description.

## Candidate Slices

1. Charged-use billing gaps.
   - C refs: `nethack-c/upstream/src/shk.c:5627-5739`, `nethack-c/upstream/src/apply.c:1577-1619`, `nethack-c/upstream/src/engrave.c:784-805`.
   - JS refs: `js/cmd.js:21789-21856`, `js/cmd.js:7756`, `js/cmd.js:35582`, `js/cmd.js:43849`.
   - Narrow slice: add carried unpaid fire-ignition billing for lit lamps/candles in shop context; defer wand engraving billing until wand engraving behavior exists.

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
   - C refs: `nethack-c/upstream/src/objnam.c:3963-4174`, `nethack-c/upstream/src/objnam.c:4920-5255`, `nethack-c/upstream/src/zap.c:6360`.
   - JS refs: `js/cmd.js:9470-9486`, `js/cmd.js:19255-19298`, `js/cmd.js:19638-19980`, `js/cmd.js:38225-38535`.
   - Narrow slice: keep the new no-match result kind, then add C-shaped quantity and `spe` constraints without changing the whole parser at once.
