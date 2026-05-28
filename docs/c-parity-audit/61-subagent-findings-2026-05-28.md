# Kicked Container Impact Shop Billing

## Scope

Parallel read-only audits compared upstream projectile and kicked-container impact ordering with the JS projectile shop helpers. The implemented slice covers the `container_impact_dmg()` distinction between thrown/dropped inventory containers and kicked shop-floor containers.

## C Anchors

- `dothrow.c` places thrown objects, runs hard-container content impact with the throw origin, then settles shop ownership at `nethack-c/upstream/src/dothrow.c:1780`.
- `container_impact_dmg()` handles only normal non-magic containers and checks glass/egg contents for breakage at `nethack-c/upstream/src/dokick.c:412`.
- C computes `frominv = (obj != gk.kickedobj)` at `nethack-c/upstream/src/dokick.c:432`. If a broken content item came from inventory and is not unpaid, C marks it `no_charge`; if the container is the kicked floor object, shop-owned contents remain billable.
- Broken contents in a costly spot are valued through `stolen_value()` at `nethack-c/upstream/src/dokick.c:456`, then removed with `useup()` or `obfree()` at `nethack-c/upstream/src/dokick.c:461`.
- Kicked boxes run `container_impact_dmg()` before lock/lid effects at `nethack-c/upstream/src/dokick.c:650`.

## JS Status

- `projectileContainerImpactDmg()` now accepts a C-shaped `fromInventory` option.
- Existing projectile/thrown callers keep the default `fromInventory: true`, so non-unpaid carried contents broken after a hard landing are marked `no_charge` and do not create shop debt.
- The kicked floor-object path can call the same helper with `fromInventory: false`, allowing broken shop-floor contents to go through the owner-aware `stolen_value()`-style charge map.
- The helper still removes broken contents, clears container knowledge, updates glob weights, and uses the existing inside/outside shop damage messages.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- A thrown paid container with paid fragile contents can break on hard landing without billing the hero, matching C's `frominv && !unpaid -> no_charge` rule.
- A kicked shop-floor container with fragile shop-owned contents charges the broken contents as lost merchandise, removes them from the container, and does not mark them `no_charge`.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "hard-landing|kicked shop-floor container impact" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`

## Remaining Work

The broader C `ship_object()` path is still not fully shared with projectile landing or command-level kicks. Remaining compact follow-ups include down-gate shipping before projectile floor placement/container impact, impact-drop billing for existing floor piles, and command-level floor-object kicking through `container_impact_dmg()`, `ship_object()`, and final shop settlement.
