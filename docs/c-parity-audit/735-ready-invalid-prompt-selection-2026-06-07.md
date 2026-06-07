# 735 - Ready Invalid Prompt Selection

## C Source

- `nethack-c/upstream/src/wield.c:507-532` routes both `Q` and empty-quiver manual `f` through `doquiver_core()` and `getobj(..., GETOBJ_ALLOWCNT)`.
- `nethack-c/upstream/src/invent.c:1937-1944` sends direct prompt digits into `get_count()` before object selection.
- `nethack-c/upstream/src/invent.c:1950` cancels direct object selection on `quitchars`; `nethack-c/upstream/src/decl.c:96` defines those as escape, space, carriage return, and newline.
- `nethack-c/upstream/src/cmd.c:5055-5078` makes backspace/delete erase count digits; a further erase at empty exits `get_count()` as the erase key.
- `nethack-c/upstream/src/invent.c:2063-2069` reports `You don't have that object.` for an invalid direct object key and continues the `getobj()` loop instead of cancelling.

## Port Notes

- Direct `Q` prompt misses now keep `quiverObject` active after `You don't have that object.`.
- Direct manual `f` prompt misses now keep `fireQuiverObject` active and preserve the top-level shot limit.
- Direct object prompt quit keys now cancel after a prompt count, clear the ready-selection count, and report `Never mind.`; manual `f` also clears its top-level shot limit.
- Invalid direct prompt keys after a typed count clear the ready-selection count and keep the prompt active.
- A second backspace/delete after erasing a count to `Count: ` is treated as an invalid object key and keeps the prompt active.
- Ready inventory menu misses are covered separately in `736`.

## Tests

- `Q command invalid prompt letter keeps ready prompt active`
- `Q command invalid prompt letter after count clears count and keeps prompt active`
- `Q command prompt count quit keys cancel ready prompt`
- `Q command extra backspace after erased count is invalid object and keeps prompt active`
- `Q command extra delete after erased count is invalid object and keeps prompt active`
- `f command invalid manual prompt letter keeps fire prompt and shot limit`
- `f command prompt count Escape cancels fire prompt and clears shot limit`
- `f command invalid prompt letter after count clears prompt count and keeps shot limit`

## Remaining Follow-Ups

- No direct prompt follow-up known from this slice.
