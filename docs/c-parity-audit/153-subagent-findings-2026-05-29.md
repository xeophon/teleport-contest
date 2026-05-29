# Subagent findings: follow-up candidate queue

Date: 2026-05-29.

## Slow-digestion ring follow-ups

- Implemented slice: `docs/c-parity-audit/152-slow-digestion-ring-rotten-metal-2026-05-29.md`.
- C anchors: `nethack-c/upstream/src/eat.c:2911` slow-digestion branch, `eat.c:1813` `rottenfood()`, `eat.c:2498` `foodword()`, `nethack-c/upstream/src/do.c:392` `trycall()`.
- Remaining gaps: optional `trycall()` prompt when the ring is described but uncalled, and the confusion follow-up message from `rottenfood()` (`You feel rather light headed.` or hallucination variant).

## `#tip` source-selection getobj

- C anchors: `nethack-c/upstream/src/pickup.c:3481` (`tip_ok()`), `pickup.c:3562`/`3624` (`dotip()`), `invent.c:1872` suggested/downplayed split, `invent.c:1963` `?` versus `*`.
- JS anchors: `js/cmd.js:30342`/`30370` current source classifiers, `js/cmd.js:50104` carried source prompt/menu, `js/cmd.js:51008` no-carried-source fallback.
- Candidate slice: add `tipSelectionKind()` for carried source selection. Containers and bag-of-tricks sources are suggested, horns of plenty are suggested only when described and globally known, coins are excluded, and other inventory is downplayed but selectable. `?` should show suggestions or downplayed fallback; `*` should show full inventory.
- Defer floor-source multi-menu and floor-decline inventory fallback as separate command-contract work.

## Gray stone apply prompt

- C anchors: `nethack-c/upstream/include/obj.h:412` `is_graystone()`, `nethack-c/upstream/src/apply.c:4151` `apply_ok()`, `apply.c:4192` gray-stone rules, `apply.c:4394` `use_stone()` dispatch, `apply.c:2695` second prompt.
- JS anchors: `js/cmd.js:7728` `applySelectionKind()`, `js/cmd.js:47167` apply handler, `js/cmd.js:47279` generic gem rejection, `js/cmd.js:28524` wished gray-stone metadata.
- Candidate slice: implement prompt parity only. Suggest unknown gray stones and all touchstones, hide known non-touchstone gray stones from prompt/`?` while allowing `*` selection, and hand selected gray stones to a minimal "What do you want to rub on the stone?" prompt/cancel mode.
- Defer gem identification, cursed touchstone shatter, scratch/streak/material messages, and known-touchstone target-menu filtering.

## Projectile down-stairs migration

- C anchors: `nethack-c/upstream/src/dokick.c:1941` `down_gate()`, `dokick.c:1657` stairs/stay and ladder/drop rules, `dokick.c:1743` migration metadata, `dokick.c:1802` reciprocal delivery, `dothrow.c:1819` hero-thrown shipping, `mthrowu.c:180` monster-thrown `drop_throw()`.
- JS anchors: `js/cmd.js:23293` trap-only remote shaft helper, `js/cmd.js:23350` hero projectile landing pipeline, `js/cmd.js:27094` monster-thrown hook, `js/cmd.js:3374` raw-object migration queue, `js/cmd.js:3405` random delivery.
- Candidate slice: add a separate down-stairs-only thrown-object helper that preserves the existing object-array queue shape by attaching `_migration = { kind, from, where }` to the migrating object. Keep holes/trapdoors on the current random path and defer ladders/special stairs until the metadata delivery path is proven.
- Data-shape caution: do not replace `_impact_drop_migrations` arrays with entry objects; tests and timer scans assume raw objects.

## Vertical wand polymorph

- C anchors: `nethack-c/upstream/src/zap.c:3440` immediate wand vertical dispatch, `zap.c:3219` `zap_updown()`, `zap.c:3382` downward `bhitpile()`, `zap.c:3391` upward hiding-under top-object case, `zap.c:2191` `bhito()`.
- JS anchors: `js/cmd.js:43787` wand of polymorph command mode, `js/cmd.js:43807` normal zap vertical parsing, `js/cmd.js:44506` polymorph path currently ignores `<`/`>`, `js/cmd.js:44536` reusable floor-pile body.
- Candidate slice: refactor the existing floor-pile body into a helper and use it for `>` on the hero square. Let `<` consume a move without touching the pile unless/until hiding-under top-object behavior is implemented.
- Defer monster-first adjacent hits and full ranged `bhit()` traversal.
