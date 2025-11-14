# Quick Start: High-Impact Improvements

This guide provides concrete implementation steps for the highest-impact improvements that will immediately elevate your game's quality.

## 1. Visual Polish: Text Animation & Color Coding

### Add Typewriter Effect for Log Entries

**File**: `src/ui/GameScreen.tsx`

Add a typewriter effect component:

```tsx
// Add to GameScreen.tsx
const [typingEntries, setTypingEntries] = useState<Set<string>>(new Set());

useEffect(() => {
  if (gameState.log.length === 0) return;
  
  const lastEntry = gameState.log[gameState.log.length - 1];
  if (!typingEntries.has(lastEntry.id)) {
    setTypingEntries(prev => new Set(prev).add(lastEntry.id));
    // Auto-remove after animation completes
    setTimeout(() => {
      setTypingEntries(prev => {
        const next = new Set(prev);
        next.delete(lastEntry.id);
        return next;
      });
    }, 2000);
  }
}, [gameState.log.length]);

// In the log rendering:
{gameState.log.map((entry) => {
  const isTyping = typingEntries.has(entry.id);
  return (
    <p 
      key={entry.id} 
      className={`ww-log-entry ww-log-entry-${entry.type} ${isTyping ? 'ww-log-entry-typing' : ''}`}
    >
      {entry.text}
    </p>
  );
})}
```

### Color-Code Log Entry Types

**File**: `src/index.css`

```css
.ww-log-entry-narration {
  color: #e0e0e0;
}

.ww-log-entry-combat {
  color: #ff6b6b;
}

.ww-log-entry-quest {
  color: #4ecdc4;
  font-weight: 500;
}

.ww-log-entry-system {
  color: #95a5a6;
  font-style: italic;
}

.ww-log-entry-typing {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 2. Combat Depth: Add Defend Action

### Update Actions

**File**: `src/engine/actions.ts`

Add a new defend action:

```typescript
/**
 * Performs a defend action during an encounter, reducing incoming damage.
 */
export function defend(state: GameState): ActionResult {
  if (!state.currentEncounter) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'There is nothing to defend against.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  const encounter = state.currentEncounter;
  const creature = creatures[encounter.creatureId];
  if (!creature) {
    return { state: { ...state, currentEncounter: null }, logEntries: [] };
  }

  const logEntries: LogEntry[] = [];
  let newState: GameState = { ...state };

  // Store that player is defending (add to encounter state or use a flag)
  // For now, we'll reduce damage by 50% on the next hit
  const defendingFlag = true; // In a real implementation, store this in encounter state

  // Creature still attacks, but with reduced damage
  const baseDamage = Math.max(0, creature.stats.attack - 1);
  const creatureDamage = Math.floor(baseDamage * 0.5); // 50% reduction
  const playerHpAfter = Math.max(0, newState.player.hp - creatureDamage);

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: `You brace yourself, ready to weather the ${creature.name}'s attack.`,
    timestamp: Date.now(),
  });

  newState = {
    ...newState,
    player: {
      ...newState.player,
      hp: playerHpAfter,
    },
  };

  if (creatureDamage > 0) {
    logEntries.push({
      id: generateLogId(),
      type: 'combat',
      text: `The ${creature.name} strikes, but your guard lessens the blow. You take ${creatureDamage} damage.`,
      timestamp: Date.now(),
    });
    audioManager.playSFX('hurt');
  } else {
    logEntries.push({
      id: generateLogId(),
      type: 'combat',
      text: `The ${creature.name}'s attack glances off your guard harmlessly.`,
      timestamp: Date.now(),
    });
  }

  if (playerHpAfter <= 0) {
    newState = {
      ...newState,
      player: { ...newState.player, hp: 0 },
      currentEncounter: null,
      flags: {
        ...newState.flags,
        runEnded: true,
      },
    };
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'Your vision blurs and the Whispering Wilds close in. This run has ended.',
      timestamp: Date.now(),
    });
  }

  audioManager.playSFX('defend'); // You'll need to add this SFX type

  return { state: newState, logEntries };
}
```

### Update UI

**File**: `src/ui/GameScreen.tsx`

Add defend button in combat:

```tsx
import { defend } from '../engine/actions';

const handleDefend = () => {
  const result = defend(gameState);
  let newState = result.state;
  for (const entry of result.logEntries) {
    newState = appendLog(newState, entry);
  }
  setGameState(newState);
};

// In the Actions section:
{inEncounter && (
  <>
    <button onClick={handleAttack} disabled={runEnded} className="ww-button ww-button-danger">
      Attack
    </button>
    <button onClick={handleDefend} disabled={runEnded} className="ww-button ww-button-secondary">
      Defend
    </button>
    <button onClick={handleEscape} disabled={runEnded} className="ww-button ww-button-secondary">
      Flee
    </button>
  </>
)}
```

---

## 3. Settings Menu

### Create Settings Component

**File**: `src/ui/Settings.tsx` (new file)

```tsx
import { useState, useEffect } from 'react';
import { audioManager } from '../audio/audioManager';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [audioEnabled, setAudioEnabled] = useState(audioManager.isEnabled());
  const [masterVolume, setMasterVolume] = useState(100);
  const [textSize, setTextSize] = useState(100);

  useEffect(() => {
    if (audioEnabled) {
      audioManager.enable();
    } else {
      audioManager.disable();
    }
  }, [audioEnabled]);

  if (!isOpen) return null;

  return (
    <div className="ww-overlay" onClick={onClose}>
      <div className="ww-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ww-settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="ww-button-close">×</button>
        </div>
        
        <div className="ww-settings-content">
          <section className="ww-settings-section">
            <h3>Audio</h3>
            <label>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
              />
              Enable Audio
            </label>
            <label>
              Master Volume: {masterVolume}%
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
              />
            </label>
          </section>

          <section className="ww-settings-section">
            <h3>Display</h3>
            <label>
              Text Size: {textSize}%
              <input
                type="range"
                min="80"
                max="150"
                value={textSize}
                onChange={(e) => {
                  setTextSize(Number(e.target.value));
                  document.documentElement.style.setProperty('--text-size', `${e.target.value}%`);
                }}
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
```

### Add Settings Button

**File**: `src/ui/GameScreen.tsx`

```tsx
import { Settings } from './Settings';

const [settingsOpen, setSettingsOpen] = useState(false);

// In header controls:
<button
  type="button"
  onClick={() => setSettingsOpen(true)}
  className="ww-button ww-button-small ww-button-secondary"
>
  Settings
</button>

// At the end of the component:
<Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

### Add CSS for Settings

**File**: `src/index.css`

```css
.ww-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.ww-settings-modal {
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.ww-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.ww-settings-header h2 {
  margin: 0;
}

.ww-button-close {
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ww-settings-section {
  margin-bottom: 1.5rem;
}

.ww-settings-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
}

.ww-settings-section label {
  display: block;
  margin-bottom: 0.75rem;
  color: #e0e0e0;
}

.ww-settings-section input[type="range"] {
  width: 100%;
  margin-top: 0.5rem;
}

.ww-settings-section input[type="checkbox"] {
  margin-right: 0.5rem;
}
```

---

## 4. Skill System Foundation

### Add Skills to Game State

**File**: `src/types/gameState.ts`

```typescript
export interface PlayerSkills {
  combat: number;
  survival: number;
  perception: number;
  diplomacy: number;
  crafting: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  skills: PlayerSkills;
}
```

### Update Initial State

**File**: `src/engine/gameState.ts`

```typescript
player: {
  hp: 20,
  maxHp: 20,
  xp: 0,
  level: 1,
  inventory: [],
  skills: {
    combat: 1,
    survival: 1,
    perception: 1,
    diplomacy: 1,
    crafting: 1,
  },
},
```

### Skill Checks in Actions

**File**: `src/engine/actions.ts`

```typescript
/**
 * Performs a skill check.
 * Returns true if the check succeeds.
 */
function skillCheck(state: GameState, skill: keyof PlayerSkills, difficulty: number): boolean {
  const skillValue = state.player.skills[skill];
  const roll = Math.random() * 20 + 1; // 1-20
  return roll + skillValue >= difficulty;
}

// Example: Use perception in sense action
export function sense(state: GameState): ActionResult {
  const perceptionCheck = skillCheck(state, 'perception', 10);
  const baseText = senseAt(state.currentLocation, state.flags.groveHealed);
  
  let enhancedText = baseText;
  if (perceptionCheck && state.player.skills.perception >= 3) {
    enhancedText += ' Your sharp eyes notice something others might miss...';
  }

  const logEntries: LogEntry[] = [
    {
      id: generateLogId(),
      type: 'narration',
      text: enhancedText,
      timestamp: Date.now(),
    },
  ];

  // ... rest of function
}
```

### Skill Points on Level Up

**File**: `src/engine/progression.ts`

```typescript
export interface XpResult {
  state: GameState;
  levelledUp: boolean;
  skillPointsGained?: number;
}

export function applyXp(state: GameState, xpGain: number): XpResult {
  const newXp = state.player.xp + xpGain;
  const nextLevelXp = getNextLevelXp(state.player.level);
  
  if (nextLevelXp !== null && newXp >= nextLevelXp) {
    const newLevel = state.player.level + 1;
    return {
      state: {
        ...state,
        player: {
          ...state.player,
          xp: newXp,
          level: newLevel,
          maxHp: state.player.maxHp + 5, // HP increase
        },
      },
      levelledUp: true,
      skillPointsGained: 2, // Give 2 skill points per level
    };
  }

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        xp: newXp,
      },
    },
    levelledUp: false,
  };
}
```

---

## 5. Enhanced Quest System

### Add Quest Rewards

**File**: `src/types/content.ts`

```typescript
export interface QuestReward {
  xp?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  reputation?: { [faction: string]: number };
  skillPoints?: number;
  unlocks?: string[]; // Unlock new locations, quests, etc.
}
```

### Quest Completion with Rewards

**File**: `src/engine/quests.ts`

```typescript
export function completeQuest(
  state: GameState,
  questId: QuestId,
  rewards?: QuestReward
): GameState {
  let newState = setQuestStatus(state, questId, 'completed');
  
  if (rewards) {
    // Apply XP
    if (rewards.xp) {
      const xpResult = applyXp(newState, rewards.xp);
      newState = xpResult.state;
    }
    
    // Apply items
    if (rewards.items) {
      for (const item of rewards.items) {
        newState = addItemToInventory(newState, item.itemId, item.quantity);
      }
    }
    
    // Apply reputation
    if (rewards.reputation) {
      const currentRep = newState.flags.reputation ?? {};
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          reputation: {
            ...currentRep,
            ...rewards.reputation,
          },
        },
      };
    }
  }
  
  return newState;
}
```

---

## 6. Improved Inventory Display

### Add Item Descriptions on Hover

**File**: `src/ui/GameScreen.tsx`

```tsx
const [hoveredItem, setHoveredItem] = useState<string | null>(null);

// In inventory rendering:
{gameState.player.inventory.map((item) => {
  const itemData = items[item.itemId];
  const itemName = itemData?.name ?? item.itemId;
  return (
    <div
      key={item.itemId}
      className="ww-inventory-item"
      onMouseEnter={() => setHoveredItem(item.itemId)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <p>
        {itemName} ×{item.quantity}
      </p>
      {hoveredItem === item.itemId && itemData?.description && (
        <p className="ww-inventory-item-description">
          {itemData.description}
        </p>
      )}
    </div>
  );
})}
```

### Add CSS

**File**: `src/index.css`

```css
.ww-inventory-item {
  position: relative;
  cursor: help;
}

.ww-inventory-item-description {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
  margin-top: 0.25rem;
}
```

---

## Next Steps

1. **Implement these improvements one at a time**
2. **Test thoroughly after each change**
3. **Gather feedback from playtesters**
4. **Iterate based on what feels best**

These improvements will immediately make your game feel more polished and engaging. Once these are in place, move on to the larger content expansions in the main roadmap.
