# Subagent Findings 2026-05-29

Fresh read-only agents audited five separate C parity areas. No private-suite details were used.

## Implemented Slice: Worn Helmet `#tip` And `#rub` No-Hands

- C anchors: `pickup.c:3670` worn-helmet dispatch, `sounds.c:1436` `tiphat()`, `sounds.c:1441` direction prompt, `sounds.c:1451` self/lout response, `do_wear.c:1893` cursed gear handling, and `apply.c:1785` `#rub` no-hands guard.
- JS anchor before work: carried `#tip` sent worn helmets to ordinary no-effect, and `#rub` filtered inventory before checking no-hands.
- Implemented in `docs/c-parity-audit/162-tiphat-and-rub-nohands-2026-05-29.md`.
- Remaining from the agent: full `tiphat()` target reactions and reusable `getobj()` primitives.

## Touchstone Effect Bodies

- C `use_stone()` effective touchstone identifies unknown gems for blessed touchstones, or uncursed touchstones used by Archeologists or Gnomes.
- C gates ring handling by material: gemstone or mineral rings can use gem/ring streak logic; other ring materials fall through to material handling.
- JS now has prompt routing and cursed shatter, but visible non-shatter effects still fall through to generic `"scritch, scritch"`.
- Safe next slice: effective touchstone gem identification plus one color-streak/scratch material row.

## Ordinary Stairs And Ladder Shipping

- C migration is object-metadata driven: target level, source level, and delivery mode travel with the object.
- C down stairs use `MIGR_STAIRS_UP` with a `rn2(3)` stay roll; down ladders use `MIGR_LADDER_UP` and skip that stay roll for ordinary objects.
- JS still queues raw objects by target level only and delivers queued objects randomly.
- Safe next slice: attach `_migration` metadata and deliver same-dungeon stairs/ladders at reciprocal up stair/up ladder coordinates.

## Monster-Thrown Hit Follow-Ups

- C `drop_throw(obj, ohit, x, y)` uses `ohit` for hit egg breakage and hit-only `should_mulch_missile()` before shipping or floor effects.
- JS `landMonsterThrownObject()` accepts `ohit`, but only uses it for eggs, and monster-thrown call sites mostly omit hit state.
- Safe next slice: C-shaped hit missile mulch inside `landMonsterThrownObject()`, then propagate `ohit` only from confirmed hit paths.

## `#rub` No-Hands Ordering

- C blocks no-hands `#rub` before selecting any object.
- JS gap was implemented in this slice, with a canary proving gray stones are not observed before the guard.

## Helmet `tiphat()` Target Reactions

- C `tiphat()` has additional reactions for steeds, visible peaceful humanoids, cursed monster helmets, hostile humanoids, nonhumanoids, unseen creatures, and statues.
- JS now covers worn-helmet dispatch, cursed self-blocking, direction prompt, self doff, and non-worn helmet no-effect.
- Safe next slice: visible peaceful humanoid response, then hostile humanoid C RNG reactions.
