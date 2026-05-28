# Subagent Findings 65: Direct Hallucination Potionhit

## Scope

Audit and implement the next compact direct hero-thrown potion `potionhit()` slice after confusion/booze, paralysis, sleeping, blindness, speed, and invisibility.

## Upstream C Anchors

- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` handles visible crash messaging; unseen targets use `Crash!`.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` one-HP chip when the target has more than one HP.
- `nethack-c/upstream/src/potion.c:1679` prints the visible non-oil evaporation message.
- `nethack-c/upstream/src/potion.c:1730` starts the monster-effect switch. There is no `POT_HALLUCINATION` arm, so direct hallucination potion hits get no monster-specific status effect.
- `nethack-c/upstream/src/potion.c:1897` applies the common survivor wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` applies the adjacent/same-square vapor gate or `trycall()` fallback.
- `nethack-c/upstream/src/potion.c:2024` gives the hero hallucination vapor message: `You have a momentary vision.`
- `nethack-c/upstream/src/potion.c:2108` only discovers vapor effects when `kn` is true; hallucination vapor does not set `kn`, so direct or adjacent hallucination vapor should not auto-discover the potion.

## JS Findings

- `js/cmd.js:12574` gated direct hero-thrown potion hits and omitted hallucination.
- `js/cmd.js:12702` already had the shared crash, `rn2(5)` chip, evaporation, wake/anger, adjacent vapor, and unpaid broken-object debt handling needed for C's no-effect direct hallucination branch.
- `js/cmd.js:12443` already had hero hallucination vapor output, so the narrow missing behavior was only routing direct hallucination through the existing common `potionhit()` helper.

## Implementation

- Added `hallucination` to `supportsHeroThrownPotionHit()` in `js/cmd.js`.
- Did not add a monster-effect branch. That is intentional: C has no `POT_HALLUCINATION` case in the direct monster switch.
- Added regression coverage in `test/shop-billing-helpers.test.mjs` for:
  - visible non-adjacent direct hallucination hit uses the common crash/chip/evaporate/wake/anger path without hero vapor or monster status effect;
  - adjacent direct hallucination hit applies hero vapor after the common hit tail;
  - unidentified appearance plus `potionIndex: 7` routes through the same direct hit path and keeps hallucination undiscovered.

## Remaining Gaps

- Direct healing, sickness/harming, water, oil, acid, and polymorph monster branches remain unported.
- C's non-`kn` `trycall()` prompt path after dknown vapor exposure is still broader than the current discovery helper.
- Forced chest long-occupation blade breakage and blunt `wake_nearby(FALSE)` remain open; the side audit found `lock.c:228` and `lock.c:241` as the next C anchors.
