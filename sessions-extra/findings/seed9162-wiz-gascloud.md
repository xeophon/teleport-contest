# seed9162-wiz-gascloud — findings

## What the session covers

Stinking-cloud region machinery (read.c: do_stinking_cloud → create_gas_cloud):

1. `#levelchange 15`; `#wizgenesis shrieker` (adjacent stationary target).
2. `#wizwish scroll of stinking cloud` (o - scroll labeled VE FORBRYDERNE).
3. `r o` → "As you read the scroll, it disappears." + discovery
   "You have found a scroll of stinking cloud!" (two --More--) →
   getpos "Where do you want to center the cloud?" (+ one-time farlook tip
   window: TWO extra dismiss keys) → cursor onto the shrieker → '.'.
4. Gas cloud created AROUND the shrieker with hero at the rim:
   "You are enveloped in a cloud of noxious gas!  Your eyes sting." (blindness)
   + "Something is burning your lungs!  You cough and spit blood!" (-7 HP),
   hero still shown "in a cloud of poison gas" while blind.
5. `^T` blind controlled teleport out of the cloud (getpos without vision).
6. Blindness expiry ("You can see again."), 7 counted searches through the
   cloud's life: "You see some gas clouds dissipate." (T:9), the shrieker
   dies inside the cloud, and a wandering newt attacks mid-search
   (search-interruption messages).

Recorded with seed 9162. 130 steps, ends T:16; recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 3073/3254, Screen 90/130 (cursors 120/130)**.
Matches everything through scroll-read + getpos centering; divergence at the
'.' cloud-creation input event itself.

## Divergence (RNG index 3004, input step 98) — create_gas_cloud

At cloud creation C calls `rn2(4), rn2(3), rn2(2), rn2(1)` (hero poison-gas
application: eyes-sting blinding duration / lung damage etc.) while JS makes
the same small set of rolls in a DIFFERENT ORDER (rn2(2), rn2(4), rn2(3),
rn2(2)…) — a permutation, not an omission, so screen totals still mostly line
up (90/130) until later turns diverge.
Gap guess: JS region.c/create_gas_cloud hero-first-tick effects run in a
different call order than C (blindness-before-damage vs damage-before-
blindness); cloud region ticking on subsequent turns matches C.
