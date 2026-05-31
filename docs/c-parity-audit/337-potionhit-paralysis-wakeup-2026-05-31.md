# C Parity Audit 337: Potionhit Paralysis Wakeup Ordering

## Sources

- `nethack-c/upstream/src/potion.c:1675`: direct monster potion hits consume `rn2(5)` before checking `mon->mhp > 1` and `!hit_saddle`, so one-HP targets still advance the chip RNG.
- `nethack-c/upstream/src/potion.c:1809-1815`: potion of paralysis only calls `paralyze_monst(mon, rnd(25))` when `mon->mcanmove` is true.
- `nethack-c/upstream/src/potion.c:1897-1900`: surviving angry body hits call `wakeup(mon, TRUE)` after the potion effect switch.
- `nethack-c/upstream/src/mhitm.c:1209-1218`: `paralyze_monst()` clears monster eating and wait-for-you strategy when it applies a new paralysis duration.
- `nethack-c/upstream/src/mon.c:4337-4355`: `wakeup()` clears sleeping, finishes monster eating, and calls `setmangry()` for attack wakeups.
- `nethack-c/upstream/src/mon.c:4287-4288`: `setmangry()` clears `STRAT_WAITMASK`.

## JS Changes

- Moved the direct potionhit chip roll ahead of the HP gate so one-HP monster hits consume the same `rn2(5)` as C while preserving HP at one.
- Added a small wait-strategy cleanup helper for potion paralysis and wakeup handling so numeric `STRAT_WAITMASK` state and legacy string `waitforu` state are both cleared.
- Extended the surviving angry-target tail to clear monster eating and wait strategy after non-saddle direct body hits, matching the `wakeup(mon, TRUE)` cleanup that C runs even when an already immobile paralysis target does not receive a new `mfrozen` duration.

## Tests

- `hero-thrown paralysis potion does not extend an already immobile monster` now asserts unchanged `mfrozen` plus cleared eating/local waiting and numeric `STRAT_WAITMASK`, while preserving unrelated `STRAT_APPEARMSG`.
- `hero-thrown one-hp paralysis potion hit still consumes chip RNG before duration` covers the C-shaped RNG order `rnd(20)`, `rnd(25)`, `rn2(7)`, `rn2(5)`, `rnd(25)` with HP remaining at one.
- Existing direct sleeping-potion tests now expect the shared angry-target wakeup tail to clear eating and wait state after both newly applied and already-immobile sleep hits.
- The one-HP blessed-water vampire shifter regression now expects the common chip roll before lethal holy-water damage and revival.

## Remaining Gaps

- Full C `wakeup()` side effects such as mimic undisguise, `mundetected` revelation, priest/shopkeeper special retaliation, and wake messages remain outside this narrow direct potionhit helper.
- Wielded-potion bash delivery and remaining potion families still need separate source-backed slices.
