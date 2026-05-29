# Subagent findings: next compact parity candidates

Date: 2026-05-29.

## Wand polymorph

- C anchors: `nethack-c/upstream/src/zap.c:263` (`bhitm()`), `zap.c:2191` (`bhito()`), `zap.c:2428` (`bhitpile()`), `zap.c:3421` (`zapwrapup()`).
- Current implemented slice: `docs/c-parity-audit/150-wand-polymorph-shudder-2026-05-29.md`.
- Remaining gaps: full ranged `bhit()` traversal, monster-first polymorph hits, `<`/`>` vertical pile handling, boulder eligibility, pile ordering, material golem creation, and broader `poly_obj()` replacement rules.

## `#tip` getobj source selection

- C anchors: `nethack-c/upstream/src/pickup.c:3481` (`tip_ok()`), `pickup.c:3562`/`3624` (`dotip()` inventory source selection), `invent.c:1872` and `invent.c:1963` (`getobj()` suggested/downplayed and `?` vs `*`).
- JS anchors: `js/cmd.js:30310` tip classifiers, `js/cmd.js:50104` source prompt/menu handling, `js/cmd.js:50977` `#tip` startup.
- Candidate slice: add a local `tipSelectionKind()` with C's suggest/downplay/exclude behavior. Containers and known horns of plenty are suggested; unknown horns and other non-coin inventory are downplayed; `?` shows suggestions or downplayed fallback, while `*` shows full inventory.
- Defer multi-floor-container source menu and floor-decline inventory fallback unless selected as a separate slice.

## Gray stone and touchstone apply

- C anchors: `nethack-c/upstream/src/apply.c:4151` (`apply_ok()`), `apply.c:4192` gray-stone candidates, `apply.c:4394` gray stones dispatching to `use_stone()`, `apply.c:2658` (`touchstone_ok()`), `apply.c:2680` (`use_stone()`).
- JS anchors: `js/cmd.js:7728` `applySelectionKind()`, `js/cmd.js:47158` apply command mode, `js/cmd.js:47270` generic gem rejection.
- Candidate slice: add semantic gray-stone detection, suggest unknown gray stones and touchstones, move known non-touchstones to selectable-invalid/full inventory, then add a narrow `useStone` second prompt before broader gem-identification and material-message behavior.

## Stairs, ladders, and special-stairs down-gates

- C anchors: `nethack-c/upstream/src/dokick.c:1943` (`down_gate()`), `dokick.c:1638` (`ship_object()`), `dokick.c:1657` ladder no-drop exception, `dokick.c:1768` reciprocal stair delivery, `include/dungeon.h:149` migration codes, `include/obj.h:177` migration route metadata.
- JS anchors: `js/cmd.js:3364` current shaft text, `js/cmd.js:3374` target-level-only migration queue, `js/cmd.js:3405` random delivery, `js/cmd.js:23293` projectile shipping gate, `js/cmd.js:27087` monster-thrown shipping.
- Candidate slice: add `downGateAt(x, y)` over stairs before traps, keep random routing for holes/trapdoors, record route/from-level metadata for queued projectiles, and deliver stair/ladder/special-stair migrations to reciprocal upstairs/ladder/stair squares.
- Defer kicked-object shipping because JS lacks the base kicked-floor-object movement path.

## Metal slow-digestion ring eating

- C anchors: `nethack-c/upstream/src/eat.c:2864` worn-ring allowance, `eat.c:2911` slow-digestion ring indigestible branch, `eat.c:1813` `rottenfood()`, `eat.c:2498` non-food `foodword()`.
- JS anchors: `js/metallivore.js:212` slow-digestion ring predicate, `js/cmd.js:18953` non-food metal eligibility, `js/cmd.js:19282` current slow-digestion branch, `js/cmd.js:34013` reusable rotten-food effect.
- Candidate slice: keep the slow-digestion ring uneaten and non-nutritive, but append C-shaped "Blecch! Awful metal!" rotten-food output and reuse the rotten-food side-effect helper. Defer generic ring `trycall()` UI.
