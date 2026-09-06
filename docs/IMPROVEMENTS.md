# Whirring Wilderness — Improvement Backlog

Ranked by value. Every item was observed in the codebase, not guessed.
Baseline: 9,579 LOC TypeScript, `tsc` and `eslint` clean, build 49 modules
/ 209KB (64KB gzipped).

## 1. There are no tests

A 9,579-line game with a real engine (`actions`, `encounters`,
`progression`, `persistence`, `quests`) had no test framework at all.
`vitest@2` is now installed (v5 requires vite 6; this project is on vite
5.4.21). Start with content-integrity tests — the equivalent checks in
Sword Chronicles caught real referential bugs.

## 2. Content referential integrity is unchecked

`items.ts`, `creatures.ts`, `npcs.ts`, `quests.ts`, `shop.ts` and
`locations.ts` cross-reference each other by string id with nothing
verifying the links. A quest rewarding a deleted item, or an exit pointing
at a missing location, fails silently at runtime.

## 3. Seven LifeHub `index.html` files are committed to this repo

`src/index.html`, `src/ui/`, `src/types/`, `src/platform/`, `src/content/`,
`src/audio/`, `src/engine/` all contain directory listings titled
"LifeHub / Projects/Software/WhirringWilderness/src/...". They are output
from the parent LifeHub repo's generator leaking into this one. Delete them
and fix the generator.

## 4. `WhirringWildernessv28/` is an untracked duplicate

A full second copy of the project, untracked. It broke `npm run lint` for
the whole repo (5 errors) until it was excluded. Decide whether it is a
real variant or an abandoned snapshot, then keep or delete it deliberately.

## 5. `AdventureWildsWhisper/` is a third copy

Same question. Three parallel copies of one game make it unclear which is
canonical and guarantee divergence.

## 6. Save data has no schema version

`persistence.ts` writes save state with no version field. An old save
loaded by a newer build fails in undefined ways. Stamp a version and
migrate or reject explicitly.

## 7. No CI

`lint`, `tsc` and `build` all pass and none of them run automatically.

## 8. Bundle is one 209KB chunk

Vite emits a single `index-*.js`. Content data (creatures, items, quests,
art) could be split from engine code so the first paint is not blocked by
the full content catalogue.

## 9. `prettier` is configured but unenforced

`npm run format` rewrites files; nothing checks formatting. Add
`format:check` so it cannot drift.

## 10. Engine modules lack behavioural tests

`progression.ts` (XP thresholds), `encounters.ts` (creature selection) and
`actions.ts` (NPC dialogue, trading) hold the rules most likely to regress.
The recent merge resolved conflicts in all three by choosing upstream; no
test would have caught it had the wrong side been chosen.
