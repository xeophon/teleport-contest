# Subagent Findings 66: Direct Healing-Family Potionhit

## Scope

Audit and implement direct hero-thrown healing-family monster effects for the shared `potionhit()` path after the hallucination no-effect branch.

## Upstream C Anchors

- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` handles visible versus unseen crash messaging; unseen targets get `Crash!`.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` one-HP chip when the target has more than one HP and no saddle was hit.
- `nethack-c/upstream/src/potion.c:1679` prints visible non-oil evaporation.
- `nethack-c/upstream/src/potion.c:1731` starts healing-family handling. Full healing always sets `cureblind`; extra healing sets it unless cursed; ordinary healing sets it only when blessed.
- `nethack-c/upstream/src/potion.c:1743` sends healing-family potions against Pestilence to the illness branch instead of healing.
- `nethack-c/upstream/src/potion.c:1747` routes restore ability and gain ability through the same monster HP restoration path without the Pestilence illness special case and without blindness cure.
- `nethack-c/upstream/src/potion.c:1750` clears `angermon`, heals wounded monsters to current `mhpmax`, and prints `looks sound and hale again` when visible.
- `nethack-c/upstream/src/potion.c:1756` calls `mcureblindness()` only when the healing-family BUC rules set `cureblind`.
- `nethack-c/upstream/src/potion.c:1771` halves HP above two and prints `looks rather ill` for illness, keeping hero-thrown anger.
- `nethack-c/upstream/src/mon.c:4596` shows `healmon(mon, mon->mhpmax, 0)` caps at current maximum HP and does not increase `mhpmax`.
- `nethack-c/upstream/src/muse.c:2872` shows `mcureblindness()` clears `mcansee`/`mblinded` and only prints `can see again` when verbose and the monster has eyes.
- `nethack-c/upstream/src/potion.c:1897` applies the survivor wake/anger tail after the monster effect.
- `nethack-c/upstream/src/potion.c:1906` applies adjacent/same-square vapor after the monster effect.

## JS Findings

- `js/cmd.js:12574` already had the direct hero-thrown potion hit gate, but it stopped at confusion, booze, paralysis, sleeping, blindness, speed, invisibility, and hallucination.
- `js/cmd.js:12702` already modeled the common crash, chip, evaporation, survivor wake/anger, and adjacent vapor sequence.
- The missing direct monster branch was narrowly contained: healing-family and restore/gain ability needed C-shaped HP restoration, BUC blindness cure, and Pestilence illness handling before vapor delivery.

## Implementation

- Added `healing`, `extra healing`, `full healing`, `restore ability`, and `gain ability` to direct hero-thrown `potionhit()` support in `js/cmd.js`.
- Added healing helpers that:
  - identify Pestilence by monster data/name;
  - apply the healing-family BUC blindness-cure rules;
  - heal wounded monsters to `mhpmax` without increasing max HP;
  - clear monster blindness through the existing monster-eye visibility helper;
  - keep healing/restoration non-angering except for the Pestilence illness branch.
- Added regression coverage in `test/shop-billing-helpers.test.mjs` for ordinary healing, blessed healing blindness cure, uncursed healing no-cure, cursed extra healing no-cure, cursed full healing cure, restore ability healing without cure, Pestilence illness/anger, and adjacent full-healing vapor after monster healing.

## Remaining Gaps

- Direct sickness/harming, water, oil, acid, and polymorph monster branches remain unported.
- Sickness and acid need broader monster resistance/damage/death plumbing before they should be generalized.
- C's saddle-hit water/polymorph handling, bash delivery, and non-`kn` `trycall()` prompt path remain broader than the current direct-hit helper.
- Lycanthropy water vapor and exact discovery/redraw behavior remain outside this slice.
