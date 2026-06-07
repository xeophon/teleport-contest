# Hero Launcher Ammo Multishot Bonuses

## C Source

- `nethack-c/upstream/src/dothrow.c:161-168` starts launcher-ammo multishot at one shot and only enters the bonus block for stacks, matching wielded launchers, and non-confused/non-stunned heroes.
- `nethack-c/upstream/src/dothrow.c:170-186` applies weak-multishot gates, then adds skilled/expert weapon-skill bonuses.
- `nethack-c/upstream/src/dothrow.c:39-76` and `:190` apply role bonuses, including Samurai or Ninja `ya` fired from a `yumi`.
- `nethack-c/upstream/src/dothrow.c:193-222` applies weak-gated race bonuses for elf/elven bow, orc/orcish bow, gnome/crossbow, plus matching current-role quest-artifact launchers.
- `nethack-c/upstream/src/dothrow.c:228-236` applies low-strength crossbow reduction with a pre-roll, then the final `rnd(multishot)` and quantity clamp.

## JS Gap

Direct `t` and `f` matching launcher ammo both used a hard `rnd(2)` cap. That allowed basic bow users to fire two arrows, but prevented C-legal higher volleys from role, race, quest artifact, and crossbow strength rules.

## Change

- Added a shared `heroLauncherAmmoMultishotCount()` helper for matching launcher ammo.
- Ported skill, weak-role, dexterity/fumbling, role, race, quest-artifact launcher, and low-strength crossbow rules.
- Reused the helper from both direct throw and `f` command launcher paths.

## Coverage

- `hero-thrown stacked arrows with matching bow hit monster as separate shots`
- `hero-thrown gnome skilled crossbow bolts use racial multishot bonus`
- `f command basic stacked arrows with matching bow fires one shot`
- `f command Samurai skilled ya with yumi uses role multishot bonus`

## Remaining

- Dedicated regressions for elf/orc racial bow bonuses, Longbow of Diana quest-artifact bonus, and low-strength crossbow pre-roll would improve coverage.
- Explicit count prefixes still need to cap launcher and non-launcher multishot after the C final RNG roll.
