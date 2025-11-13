# AI Coding Instructions for Whispering Wilds

## Project Overview
**Whispering Wilds** is a text-first wildlands RPG built with React + TypeScript. The codebase strictly separates game logic (`src/engine/`) from UI rendering (`src/ui/`) to maintain framework-agnostic, testable game systems.

**Key Stack:** Vite, React 18, TypeScript 5.2+, ESLint with strict type checking

## Critical Architecture Patterns

### 1. Immutable State + ActionResult Pattern
**Never mutate game state.** All game actions return `{ state: GameState; logEntries: LogEntry[] }`:
```typescript
// ✅ CORRECT - actions.ts
export function gather(state: GameState): ActionResult {
  let newState = state; // Create new reference
  newState = addItemToInventory(state, itemId, 1);
  return maybeTriggerEncounter(newState, [logEntry]);
}

// ❌ WRONG - mutating directly
state.player.inventory.push(item); // Never do this
```
This pattern ensures predictable state transitions and enables easy debugging via log replay.

### 2. Engine Layer (Framework-Agnostic)
**Location:** `src/engine/` — Pure TypeScript, **no React imports allowed**

Core modules:
- `actions.ts` - All player actions (move, attack, gather, talk) return `ActionResult`
- `gameState.ts` - State creation and log appending
- `encounters.ts` - Creature encounter helpers
- `locations.ts` - Location data and navigation validation
- `quests.ts` - Quest state management via `upsertQuestState()`
- `progression.ts` - XP thresholds and leveling (fixed thresholds at `[0, 10, 30, 60, 100]`)
- `trading.ts` - Trade validation and application
- `text.ts` - Narrative text generation using `pick()` utility for variation

**Key Principle:** Engine functions are deterministic and composable. Action handlers sequence operations:
```typescript
let newState = state;
newState = removeItems(newState, 'forest_herb', 3);
newState = removeItems(newState, 'lake_water', 1);
newState = activateQuestIfNeeded(newState, 'heal_the_grove');
newState = setQuestStep(newState, 'heal_the_grove', 'return_to_caretaker');
```

### 3. UI Layer (React Components)
**Location:** `src/ui/GameScreen.tsx` — Renders state, dispatches actions

Pattern: State hooks → action handler → update via `appendLog()`:
```typescript
const handleMove = (destination: LocationId) => {
  const result = moveTo(gameState, destination);
  let newState = result.state;
  for (const entry of result.logEntries) {
    newState = appendLog(newState, entry);
  }
  setGameState(newState);
};
```
**Do not** add game logic here—only rendering and event delegation.

### 4. Content Definition Pattern
**Location:** `src/content/` — Static data files (creatures, items, locations, quests, NPCs)

Each file exports a typed record:
- `creatures.ts`: `Record<string, CreatureData>` with biome-based spawning
- `items.ts`: `Record<string, ItemData>` 
- `quests.ts`: `Record<QuestId, QuestDefinition>` with step arrays
- `shop.ts`: `RANGER_TRADES` array of `TradeOffer`

**Usage:** Engine queries content by ID with optional fallbacks:
```typescript
const creature = creatures[creatureId];
if (!creature) { /* handle gracefully */ }
```

## Development Workflows

### Building & Running
```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # TypeScript compile + Vite bundle
npm run lint       # ESLint strict mode (zero warnings allowed)
npm run format     # Prettier formatting
```

### Adding a New Game Action
1. Define the action function in `src/engine/actions.ts` returning `ActionResult`
2. Import and call it from `GameScreen.tsx` handler
3. Always append log entries via the handler loop
4. Test encounter interruption (actions disabled during combat)

### Adding Quest Logic
- **Quest definitions** live in `src/content/quests.ts` (steps, names, descriptions)
- **Quest state** managed in `GameState` type (id, step, status)
- **Quest logic** in `src/engine/quests.ts` via `upsertQuestState()`, `setQuestStep()`, `setQuestStatus()`
- **Quest transitions** triggered in action handlers (e.g., `talkTo()` for caretaker branching)

**Example:** Quest step progression on ritual completion:
```typescript
newState = setQuestStep(newState, 'heal_the_grove', 'return_to_caretaker');
newState.flags.groveHealed = true; // Flag for branching dialogue
```

### Combat Flow
1. Encounter triggered randomly (25% per move/gather) via `maybeTriggerEncounter()`
2. Creature selected from biome-matching pool: `getRandomCreatureForLocation()`
3. Attack applies damage: player damage = `4 - creature.defence`, creature damage = `creature.attack - 1`
4. Defender retaliates unless defeated (HP ≤ 0)
5. Player death → respawn in Sanctum with 1 HP
6. Victory awards 10 XP + potential level-up with +5 maxHp per level

## Key Type Definitions

Located in `src/types/`:
- `GameState` - Main runtime state (location, player stats, inventory, quests, flags, log, encounter)
- `LocationId` - Union of valid location IDs (sanctum, gate, wilds, lake, mine, hermit_hut, trader_post)
- `LogEntry` - {id, type ('narration'|'combat'|'system'|'quest'), text, timestamp, metadata?}
- `InventoryItemInstance` - {itemId, quantity}
- `NarrativeFlags` - {groveHealed?, lakeTreatment?, ...} for branching dialogue

## Project-Specific Patterns

### Narrative Variation
`src/engine/text.ts` uses `pick<T>(array: T[]): T` to select random strings:
```typescript
function senseAt(locationId: LocationId, groveHealed?: boolean): string {
  if (locationId === 'wilds' && groveHealed) {
    return pick([
      'The Wilds breathe easy. Leaves murmur, but the edge has gone from the silence.',
      'A gentler quiet now. The tension has lifted...',
    ]);
  }
}
```
**Always add variation** to repeated actions (sense, gather) via `pick()`.

### Log ID Generation
```typescript
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```
Use this for all log entries to ensure uniqueness and debugging.

### Encounter Disabling
Track `isInEncounter(state)` to disable non-combat actions:
```typescript
const inEncounter = isInEncounter(gameState);
<button disabled={inEncounter}>Gather</button> // Disabled during fight
<button onClick={handleAttack} disabled={!inEncounter}>Attack</button>
```

### Movement Validation
Navigation only follows exits defined in location data:
```typescript
const exits = Object.values(currentLocation.exits);
if (!exits.includes(destination)) {
  return { state, logEntries: [invalidMoveLog] };
}
```

## Code Quality Rules

1. **No React in engine/** - Pure functions, no imports from 'react'
2. **Strict TypeScript** - `noUnusedLocals: true`, `noFallthroughCasesInSwitch: true`, exact optional properties
3. **Immutability** - Always return new state objects, spread operator required
4. **Functional composition** - Chain state updates in sequence, each function transforms state once
5. **Narrative consistency** - Use existing dialogue branches; check quest status before branching
6. **ESLint enforced** - Build will fail with lint errors; `_` prefix suppresses unused-vars warning

## Common Pitfalls

- **Mutating state in place:** `state.player.hp -= 5` ❌ Use spread operator instead ✅
- **React in engine:** Importing from ui/ or react into engine/actions.ts ❌
- **Silent failures:** Always return meaningful log entries for invalid actions
- **Missing type guards:** Check that NPCs exist before accessing location
- **Forgetting to update flags:** Quest steps should synchronize with narrative flags for dialogue branching
- **Not appending logs in UI handler:** Actions return logEntries but UI must append them via loop

## References

- **Main game loop:** `src/ui/GameScreen.tsx` (state hook + handlers)
- **All actions:** `src/engine/actions.ts` (ActionResult return type)
- **Quest system:** `src/engine/quests.ts`, `src/content/quests.ts`
- **Progression:** `src/engine/progression.ts` (fixed XP thresholds)
- **Encounters:** `src/engine/encounters.ts`, `src/content/creatures.ts` (biome-based spawning)
- **Type safety:** `src/types/gameState.ts`, `src/types/content.ts`
