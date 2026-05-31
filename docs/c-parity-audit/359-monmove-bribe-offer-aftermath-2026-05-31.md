# Monster-turn bribe offer aftermath

Date: 2026-05-31

## Summary

Added focused regression coverage for the remaining true apparent-target `MS_BRIBE` positive-demand aftermath rows. The tests now cover monster-carried Amulet demand escalation, all-gold failure against that unpayable demand, positive partial-offer failure, positive partial-offer success, same-demon attack resume after failed offers, and following-monster resume after a successful automatic-turn bribe removes the demon.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:802`: automatic demonic blackmail is attempted only for nearby peaceful untame `MS_BRIBE` monsters targeting the real hero.
- `nethack-c/upstream/src/monmove.c:823`: when `demon_talk()` returns false, monster movement continues into the hostile attack tail.
- `nethack-c/upstream/src/minion.c:309`: positive demand uses carried cash, `rnd(80)`, Gehennom home bonus, and same-alignment divisor.
- `nethack-c/upstream/src/minion.c:325`: monster-carried Amulet or deaf hero forces `demand = cash + rn1(1000, 125)`.
- `nethack-c/upstream/src/minion.c:335`: full offers vanish without charisma RNG; positive underpayments make one `rnd(5 * ACURR(A_CHA))` charisma roll.
- `nethack-c/upstream/src/minion.c:343`: refused or failed offers anger the demon and return false so the same monster turn can continue.
- `nethack-c/upstream/src/minion.c:350`: successful full or partial bribes call `mongone()` and return true.
- `nethack-c/upstream/src/minion.c:367`: positive bribe offers transfer gold before outcome resolution.
- `nethack-c/upstream/src/wizard.c:106`: `mon_has_amulet()` checks monster inventory for the real Amulet.

## JS coverage

- `test/shop-billing-helpers.test.mjs`
  - Added reusable automatic-turn briber and attacker fixtures for the bribe demand rows.
  - Added an automatic Amulet-carrier test proving the demand is above carried gold, uses `rnd(80)` plus `rn2(1000)`, transfers all offered gold, preserves the carried Amulet, angers the demon, and resumes the same demon's attack.
  - Added an automatic partial-failure test proving positive gold transfer, one charisma roll, hostility, and same-demon attack resume.
  - Added an automatic partial-success test proving positive gold transfer, one charisma roll, demon removal, and following-monster resume in the reversed monster-turn list.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern="automatic monster turn Amulet carrier|automatic monster turn partial bribe|automatic monster turn full bribe offer|automatic monster turn refused bribe" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`

## Remaining gaps

- Broader `domonnoise()`/`#chat` sharing and generated monster sound/race metadata remain separate.
- Reusable command/menu primitives such as shared `getobj()` extraction remain separate.
