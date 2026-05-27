# C Parity Audit 25: Tripe and Candy Simple Food Pickup Merges

## Scope

This slice closes two stale simple `FOOD(...)` merge omissions: `tripe ration` and `candy bar`. It is intentionally limited to ordinary pickup inventory merging, shop unpaid merge proof, C unit price coverage, and the no-charge full-inventory merge preflight. It does not add a full object metadata registry or port the missing `meat stick` object identity.

## C Source Notes

- `nethack-c/upstream/include/objects.h:1033-1037`: the `FOOD(...)` macro uses mergeable `BITS(1, 1, ...)` for ordinary comestibles unless a row opts out with a custom `OBJECT(...)` definition.
- `nethack-c/upstream/include/objects.h:1048-1049`: `tripe ration` is an ordinary mergeable food row with delay 2, weight 10, nutrition 200, and base cost 15.
- `nethack-c/upstream/include/objects.h:1054-1064`: meatball and meat stick are mergeable `FOOD(...)` rows, while `meat ring` is explicitly non-mergeable. JS already has meatball coverage; meat stick still needs object-definition/runtime identity work before it should enter the pickup merge allowlist.
- `nethack-c/upstream/include/objects.h:1100-1102`: `candy bar` is an ordinary mergeable food row with delay 1, weight 2, nutrition 100, and base cost 10.
- `nethack-c/upstream/src/eat.c:2131-2139`: tripe's first-bite feedback is runtime eating behavior, not a merge exception.
- `nethack-c/upstream/src/eat.c:3015-3019`: candy bars count as animal products for conduct, also runtime eating behavior rather than a merge exception.

## JS Status

- `js/cmd.js:18747-18772` now includes `candy bar` and `tripe ration` in `COVERED_SIMPLE_MERGEABLE_FOOD_KINDS`, so they share the existing C-shaped simple-food merge predicate: exact identity, BUC/state checks, `oeaten`/`orotten` exclusion, object-name compatibility, no-charge normalization, age averaging, and same-shop bill-row proof for unpaid targets.
- `test/shop-billing-helpers.test.mjs:11748-11789` now covers paid floor pickup merges for tripe rations and candy bars into compatible inventory stacks.
- `test/shop-billing-helpers.test.mjs:11895-11923` proves shop-floor tripe/candy pickup does not merge into paid targets, but does merge same-shop unpaid targets while carrying the bill total forward.
- `test/shop-billing-helpers.test.mjs:12178-12213` covers no-charge full-inventory preflight merges for tripe rations and candy bars.
- `test/shop-billing-helpers.test.mjs:12215-12231` covers C base prices for tripe rations, `tripe` aliases, and candy bars.

## Remaining Follow-Ups

- Add the missing `meat stick` object identity/metadata before adding it to the simple-food merge allowlist.
- Replace the local simple-food allowlist with registry-backed `oc_merge`, cost, weight, material, and delay metadata.
- Continue broadening shared acquisition helpers so pickup, container take-out, monster pickup, and generated-object insertion use one C-shaped merge path.
