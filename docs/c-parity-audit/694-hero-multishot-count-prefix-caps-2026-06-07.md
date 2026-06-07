# Hero Multishot Count Prefix Caps

## C Source

- `nethack-c/upstream/src/dothrow.c:299-306` stores the command count in `shotlimit` for both `t` and `f`.
- `nethack-c/upstream/src/dothrow.c:357-365` documents the modern behavior: a count limits the number of missiles in one throw/fire action rather than repeating the command.
- `nethack-c/upstream/src/dothrow.c:233-237` applies `shotlimit` after the final `rnd(multishot)` and quantity clamp.
- `nethack-c/upstream/src/dothrow.c:240-247` prints the volley message when either multishot is greater than one or a count was supplied, including count-capped one-shot volleys.
- `nethack-c/upstream/src/invent.c:2028-2045` still rejects counts typed inside `getobj("throw", ...)` for non-gold objects; the C shot limit is only the top-level command count consumed by `ok_to_throw()`.

## JS Gap

Top-level count prefixes were only retained as prompt text or thrown-gold amounts. Non-gold stackable missiles and launcher ammo could not carry C's separate command `shotlimit` through object selection into direction handling.

## Change

- Preserved top-level `t` count prefixes through object selection as a separate shot limit rather than a `getobj` inventory count.
- Stored `f` count prefixes until direction selection.
- Applied optional shot limits after launcher-ammo and non-launcher stackable-weapon multishot RNG.
- Forced the C-shaped `You shoot/throw 1 ...` volley message when a count was supplied and the cap reduces the result to one shot.
- Kept prompt/menu-selected counts separate from top-level shot limits; non-gold selected counts above one still reject before direction, while audit 737 covers count-one stack splitting.

## Coverage

- `hero-thrown count prefix caps launcher multishot after roll`
- `f command count prefix caps launcher multishot after roll`
- `top-level throw count accepts single dart and forces one-shot volley`
- `top-level throw count caps dart multishot after roll`
- `top-level throw count does not limit prompt-selected gold stack`

## Remaining

- Count-prefix coverage for additional non-launcher stackable weapon families such as daggers and spears would improve breadth.
- Audit 695 covers the fragile iron-bars break count-message path; other early terrain-stop count-message paths remain outside this slice.
