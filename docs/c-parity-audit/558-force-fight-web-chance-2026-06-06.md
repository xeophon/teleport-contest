# Force-Fight Web Chance Branches

## Scope

Port the remaining non-artifact force-fight branches for a seen destination spider web. This covers web-cutting blades, weapon-class axes and mattocks that fall inside C's `is_blade()` macro range, a non-blade primary paired with an offhand blade under two-weapon combat, and weaponless attempts.

The JS path now follows C's strength, enchantment, skill, and RNG formula without replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/hack.c:2021` through `:2094` implements `domove_fight_web()`.
- `nethack-c/upstream/src/hack.c:2025` gates the branch on force-fight, destination `WEB`, and `trap->tseen`.
- `nethack-c/upstream/src/hack.c:2028` computes `wtype = uwep_skill_type()` and `wskill_minus_2 = max(P_SKILL(wtype), P_UNSKILLED) - 2`.
- `nethack-c/upstream/src/hack.c:2032` rolls `rn2(uwep ? 20 : 45 - 5 * wskill_minus_2)`.
- `nethack-c/upstream/src/hack.c:2073` through `:2089` handles ineffectual `hack`/`thrash`, successful `cut`/`punch`, `use_skill(wtype, 1)`, and web deletion.
- `nethack-c/upstream/src/weapon.c:1516` through `:1537` defines `weapon_type(NULL)` as `P_BARE_HANDED_COMBAT` and `uwep_skill_type()` as `P_TWO_WEAPON_COMBAT` while two-weaponing.
- `nethack-c/upstream/include/obj.h:213` through `:216` defines runtime `is_blade()` as weapon-class skills `P_DAGGER` through `P_SABER`; `P_AXE` and weapon-class `P_PICK_AXE` are inside that range despite the stale `hack.c` comment.
- `nethack-c/upstream/src/attrib.c:1243` through `:1261` implements the condensed `acurrstr()` value used by the threshold.

## JS Change

- `js/cmd.js` now handles the chance branch after the artifact and immediate no-cut exits.
- The branch computes C's `wskill_minus_2`, web roll range, and threshold: effective strength minus two, plus primary weapon enchantment and skill bonus only when a primary weapon exists.
- Success deletes the web, consumes the turn, prints `You cut through the web.` or `You punch through the web.`, and advances the matching existing weapon skill entry.
- Failure leaves the web in place, consumes the turn, and prints `You hack ineffectually at some of the strands.` or `You thrash ineffectually at some of the strands.`
- Web blade classification now covers axes, weapon-class mattocks, scimitar, and athame. Athame maps through knife skill, axes through axe skill, mattocks through pick-axe skill, and two-weapon attempts use `P_TWO_WEAPON_COMBAT` only when an offhand item is present.

## Tests

- `force-fighting a seen destination web with a dagger can cut it`
- `force-fighting a seen destination web with a dagger can hack ineffectually`
- `force-fighting a seen destination web with an axe uses axe skill`
- `force-fighting a seen destination web with a battle-axe uses axe skill`
- `force-fighting a seen destination web with a dwarvish mattock uses pick-axe skill`
- `force-fighting a seen destination web with an athame uses knife skill`
- `force-fighting a seen destination web with a scimitar uses saber skill`
- `force-fighting a seen destination web with a nonblade primary and offhand blade uses two-weapon chance`
- `force-fighting a seen destination web with a nonblade primary and offhand blade can hack ineffectually`
- `force-fighting a seen destination web ignores offhand blade enchantment`
- `force-fighting a seen destination web barehanded can punch through it`
- `force-fighting a seen destination web barehanded can thrash ineffectually`

These tests drive normal `rhack('F')` plus direction input and assert the C-shaped RNG call, exact message, web deletion or persistence, no hero displacement, no trap-state mutation, skill advancement on success, and turn consumption.

## Remaining Work

- `#untrap` web removal, failed untrap, trapped-monster extraction, and web-spread `NOWEBMSG` behavior are tracked in `559-untrap-web-2026-06-06.md`.
- Monster web-spinning remains separate monster-movement parity.
