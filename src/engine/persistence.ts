import type { GameState } from '../types/gameState';

const STORAGE_KEY = 'whispering-wilds-save-v1';
const SAVE_VERSION = 1;

interface PersistedState {
  version: number;
  state: GameState;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadState(): GameState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state) {
      return null;
    }

    const state = parsed.state as GameState;

    if (!state.currentLocation || !state.player) return null;

    return state;
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  if (!isBrowser()) return;
  try {
    const payload: PersistedState = {
      version: SAVE_VERSION,
      state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / serialisation issues
  }
}

export function clearState(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createStateBackup(state: GameState): string {
  const payload: PersistedState = {
    version: SAVE_VERSION,
    state,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseStateBackup(raw: string): GameState {
  const parsed = JSON.parse(raw) as Partial<PersistedState>;
  const state = parsed?.state as GameState | undefined;

  if (
    parsed?.version !== SAVE_VERSION ||
    !state?.currentLocation ||
    !state.player ||
    !Array.isArray(state.log) ||
    !Array.isArray(state.quests)
  ) {
    throw new Error('This is not a valid Whispering Wilds journey backup.');
  }

  return state;
}

