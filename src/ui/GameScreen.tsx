import { useEffect, useRef, useState } from 'react';
import { createInitialState, appendLog } from '../engine/gameState';
import { moveTo, sense, gather, talkTo, attack, attemptEscape, performGroveRitual, performTrade, consumeHealingTonic, communeWithGlow } from '../engine/actions';
import { getLocation, getAvailableExitsForState } from '../engine/locations';
import { items } from '../content/items';
import { npcs, type NpcId } from '../content/npcs';
import { isInEncounter } from '../engine/encounters';
import { creatures } from '../content/creatures';
import { getNextLevelXp } from '../engine/progression';
import { QUESTS, type QuestId } from '../content/quests';
import type { LogEntryType } from '../types/log';
import { RANGER_TRADES, type TradeId } from '../content/shop';
import { canAffordTrade, canUseTrade, getEffectiveTradeLimit } from '../engine/trading';
import type { GameState } from '../types/gameState';
import type { LocationId } from '../types/gameState';
import { loadState, saveState, clearState } from '../engine/persistence';
import { audioManager } from '../audio/audioManager';
import { Settings } from './Settings';
import { getLocationArtKey } from '../content/art';

function isQuestId(id: string): id is QuestId {
  return Object.prototype.hasOwnProperty.call(QUESTS, id);
}

export function GameScreen() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const loaded = loadState();
    return loaded ?? createInitialState();
  });
  const logRef = useRef<HTMLDivElement | null>(null);
  const [isLogPinnedToBottom, setIsLogPinnedToBottom] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastNpcId, setLastNpcId] = useState<string | null>(null);
  const [hoveredItemDesc, setHoveredItemDesc] = useState<string | null>(null);
  const gameStateRef = useRef(gameState);
  
  // Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Tutorial visibility derived flag
  const seenTutorial = gameState.flags.seenTutorial ?? false;
  const showTutorial = !seenTutorial && !(gameState.flags.runEnded ?? false);

  // Central UI lock: disables interactions when in encounter, run ended, or tutorial visible
  const uiLocked = isInEncounter(gameState) || (gameState.flags.runEnded ?? false) || showTutorial;

  const handleLogScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    const threshold = 24; // px from bottom counts as "pinned"
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    setIsLogPinnedToBottom(distanceFromBottom < threshold);
  };

  useEffect(() => {
    if (!logRef.current) return;
    if (!isLogPinnedToBottom) return;

    const el = logRef.current;
    el.scrollTop = el.scrollHeight;
  }, [gameState.log.length, isLogPinnedToBottom]);

  useEffect(() => {
    if (audioManager.isSupported()) {
      audioManager.init().catch(() => undefined);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

  const currentState = gameStateRef.current;
  const currentInEncounter = isInEncounter(currentState);
  const currentRunEnded = currentState.flags.runEnded ?? false;
  const currentShowTutorial = !(currentState.flags.seenTutorial ?? false) && !currentRunEnded;

  // Freeze keyboard shortcuts while tutorial is visible
  if (currentShowTutorial) return;

      // Escape key closes settings
      if (event.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
        return;
      }

      // Don't handle shortcuts when settings are open
      if (settingsOpen) return;

      // S key for Sense
      if (event.key === 's' || event.key === 'S') {
        if (!currentInEncounter && !currentRunEnded) {
          event.preventDefault();
          const result = sense(currentState);
          let newState = result.state;
          for (const entry of result.logEntries) {
            newState = appendLog(newState, entry);
          }
          setGameState(newState);
        }
        return;
      }

      // G key for Gather
      if (event.key === 'g' || event.key === 'G') {
        if (!currentInEncounter && !currentRunEnded) {
          event.preventDefault();
          const result = gather(currentState);
          let newState = result.state;
          for (const entry of result.logEntries) {
            newState = appendLog(newState, entry);
          }
          setGameState(newState);
        }
        return;
      }

      // Space/Enter for primary action
      if (event.key === ' ' || event.key === 'Enter') {
        if (currentInEncounter && !currentRunEnded) {
          event.preventDefault();
          const result = attack(currentState);
          let newState = result.state;
          for (const entry of result.logEntries) {
            newState = appendLog(newState, entry);
          }
          setGameState(newState);
        }
        return;
      }

      // F key for Flee
      if (event.key === 'f' || event.key === 'F') {
        if (currentInEncounter && !currentRunEnded) {
          event.preventDefault();
          const result = attemptEscape(currentState);
          let newState = result.state;
          for (const entry of result.logEntries) {
            newState = appendLog(newState, entry);
          }
          setGameState(newState);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  const handleMove = (destination: LocationId) => {
    const result = moveTo(gameState, destination);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleSense = () => {
    const result = sense(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleGather = () => {
    const result = gather(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleTalk = (npcId: NpcId) => {
    const result = talkTo(gameState, npcId);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
    setLastNpcId(npcId);
  };

  const handleAttack = () => {
    const result = attack(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleEscape = () => {
    const result = attemptEscape(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handlePerformRitual = () => {
    const result = performGroveRitual(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleTrade = (tradeId: TradeId) => {
    const result = performTrade(gameState, tradeId);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  const handleUseHealingTonic = () => {
    const result = consumeHealingTonic(gameState);
    let newState = result.state;
    for (const entry of result.logEntries) {
      newState = appendLog(newState, entry);
    }
    setGameState(newState);
  };

  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  function handleNewRun() {
    const confirmReset = window.confirm(
      'Start a new run? Your current progress in the Wilds will be lost.',
    );
    if (!confirmReset) return;

    audioManager.fadeOutAmbient();
    const fresh = createInitialState();
    clearState();
    setGameState(fresh);
  }

  const currentLocation = getLocation(gameState.currentLocation);
  const availableExits = getAvailableExitsForState(gameState);
  const npcsAtLocation = Object.values(npcs).filter(
    (npc) => npc.location === gameState.currentLocation
  );
  const inEncounter = isInEncounter(gameState);
  const currentEncounter = gameState.currentEncounter ?? null;
  const currentCreature = currentEncounter ? creatures[currentEncounter.creatureId] : null;
  const currentBiome = currentLocation.biome;
  const nextLevelXp = getNextLevelXp(gameState.player.level);
  const atTraderPost = gameState.currentLocation === 'trader_post';
  const hasHealingTonic = gameState.player.inventory.some(
    (item) => item.itemId === 'healing_tonic' && item.quantity > 0,
  );
  const runEnded = gameState.flags.runEnded ?? false;
  const forestRep = gameState.flags.reputation?.forest ?? 0;
  const groveHealed = !!gameState.flags.groveHealed;
  const level = gameState.player.level;
  const xp = gameState.player.xp;
  const totalItems = gameState.player.inventory.reduce(
    (sum, item) => sum + (item.quantity ?? 1),
    0,
  );

  // Quest/Journal state
  const getQuest = (id: QuestId) => gameState.quests.find((q) => q.id === id);
  const healQuestState = getQuest('heal_the_grove');

  const healQuestStatus = healQuestState?.status ?? 'not_started';
  const healQuestStep = healQuestState?.step ?? '';
  const ritualStepReady =
    healQuestStatus === 'active' &&
    (healQuestStep === 'gather_ingredients' || healQuestStep === 'perform_ritual');
  const ritualAvailable =
    gameState.currentLocation === 'wilds' &&
    ritualStepReady &&
    !inEncounter &&
    !runEnded &&
    !groveHealed;
  const groveAtPeace = groveHealed || healQuestStatus === 'completed';

  // Hermit's Glow commune availability
  const hermitsGlow = getQuest('hermits_glow');
  const hermitsGlowActive = hermitsGlow && hermitsGlow.status === 'active';
  const canCommuneWithGlow =
    gameState.currentLocation === 'deep_wilds' &&
    hermitsGlowActive &&
    (hermitsGlow?.step === 'found_glow' || hermitsGlow?.step === 'commune_with_glow') &&
    !inEncounter &&
    !runEnded;

  // Trading
  const availableTrades = RANGER_TRADES.map((trade) => {
    const affordable = canAffordTrade(gameState, trade);
    const usable = canUseTrade(gameState, trade.id);
    const limit = getEffectiveTradeLimit(gameState, trade.id);
    const used = gameState.tradeUsage[trade.id] ?? 0;
    return { trade, affordable, usable, limit, used };
  });

  // Art panel state
  const artKey = getLocationArtKey(gameState.currentLocation);
  const lastNpc = lastNpcId ? Object.values(npcs).find((n) => n.id === lastNpcId) : null;

  // Small helper to render a tiny tag for each log entry type
  function getLogTag(type: LogEntryType) {
    switch (type) {
      case 'narration':
      case 'choice':
        return { label: 'Story', icon: '🌲', className: 'ww-log-tag-narration' };
      case 'combat':
        return { label: 'Combat', icon: '⚔', className: 'ww-log-tag-combat' };
      case 'quest':
        return { label: 'Quest', icon: '✦', className: 'ww-log-tag-quest' };
      case 'system':
      default:
        return { label: 'System', icon: '⚙', className: 'ww-log-tag-system' };
    }
  }

  // Read user's display preferences (saved by Settings) for log tags.
  const [showLogTags, setShowLogTags] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('ww_settings');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!parsed.showLogTags;
    } catch {
      return false;
    }
  });

  // When the settings modal is closed, re-read the persisted settings in case the user toggled them.
  useEffect(() => {
    if (!settingsOpen) {
      try {
        const raw = localStorage.getItem('ww_settings');
        if (!raw) {
          setShowLogTags(false);
        } else {
          const parsed = JSON.parse(raw);
          setShowLogTags(!!parsed.showLogTags);
        }
      } catch {
        setShowLogTags(false);
      }
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (audioManager.isEnabled()) {
      audioManager.playAmbient(currentBiome);
    }
  }, [currentBiome]);

  useEffect(() => {
    if (runEnded) {
      audioManager.fadeOutAmbient();
    }
  }, [runEnded]);

  return (
    <div className="ww-root">
      <header className="ww-header">
        <h1 className="ww-header-title">{currentLocation.name}</h1>
        <p className="ww-header-stats">
          Level {gameState.player.level}{' '}
          — XP {gameState.player.xp}
          {nextLevelXp !== null ? ` / ${nextLevelXp}` : ' (max)'}
        </p>
        <p className="ww-header-stats">
          HP: {gameState.player.hp} / {gameState.player.maxHp}
        </p>
        <div className="ww-header-controls">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="ww-button ww-button-small ww-button-secondary"
            aria-label="Open settings"
            title="Settings (Esc to close)"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={handleNewRun}
            className="ww-button ww-button-small ww-button-secondary"
          >
            New Run
          </button>
        </div>
      </header>

      <div className="ww-main">
        <div className="ww-column ww-primary">
          {currentCreature && (
            <section className="ww-panel ww-encounter">
              <h2 className="ww-panel-title">Encounter</h2>
              <div className="ww-encounter-info">
                <p className="ww-encounter-creature">
                  <strong>{currentCreature.name}</strong>
                </p>
                <p className="ww-encounter-hp">
                  HP: {currentEncounter?.hp} / {currentCreature.stats.hp}
                </p>
                <p className="ww-encounter-stats">
                  Attack: {currentCreature.stats.attack} | Defence: {currentCreature.stats.defence}
                </p>
                {currentCreature.description && (
                  <p className="ww-encounter-description">{currentCreature.description}</p>
                )}
              </div>
              <div className="ww-encounter-player">
                <p className="ww-encounter-player-hp">
                  Your HP: {gameState.player.hp} / {gameState.player.maxHp}
                </p>
              </div>
            </section>
          )}

          <section className="ww-panel ww-log-panel">
            <h2 className="ww-panel-title">Log</h2>
            <div className="ww-log" ref={logRef} onScroll={handleLogScroll}>
              {gameState.log.length === 0 ? (
                <p className="ww-log-empty">The log is empty.</p>
              ) : (
                gameState.log.map((entry) => {
                  const tag = getLogTag(entry.type as LogEntryType);
                  return (
                    <div
                      key={entry.id}
                      className={`ww-log-entry ww-log-entry-${entry.type}`}
                    >
                      {showLogTags && (
                        <span className={`ww-log-tag ww-log-tag-${entry.type}`} aria-hidden="true">
                          <span className="ww-log-tag-icon">{tag.icon}</span>
                          <span className="ww-log-tag-label">{tag.label}</span>
                        </span>
                      )}
                      <p className="ww-log-text">{entry.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="ww-panel ww-section ww-actions">
            <h2 className="ww-section-title">Actions</h2>
            <div className="ww-actions-row">
              {inEncounter && (
                <>
                  <button
                    onClick={handleAttack}
                    disabled={!inEncounter}
                    className="ww-button ww-button-danger"
                    title="Attack (Space/Enter)"
                  >
                    Attack
                  </button>
                  <button
                    onClick={handleEscape}
                    disabled={!inEncounter}
                    className="ww-button ww-button-secondary"
                    title="Flee (F) - 70% chance to escape"
                  >
                    Flee (70%)
                  </button>
                </>
              )}
              <button
                onClick={handleSense}
                disabled={uiLocked}
                className="ww-button ww-button-primary"
                title="Sense (S)"
              >
                Sense
              </button>
              <button
                onClick={handleGather}
                disabled={uiLocked}
                className="ww-button ww-button-primary"
                title="Gather (G)"
              >
                Gather
              </button>
              {npcsAtLocation.length > 0 && (
                <>
                  {npcsAtLocation.map((npc) => (
                    <button
                      key={npc.id}
                      onClick={() => handleTalk(npc.id)}
                      disabled={uiLocked}
                      className="ww-button ww-button-primary"
                    >
                      Talk to {npc.name}
                    </button>
                  ))}
                </>
              )}
              {hasHealingTonic && (
                <button
                  onClick={handleUseHealingTonic}
                  disabled={uiLocked}
                  className="ww-button ww-button-success"
                >
                  Use Healing Tonic
                </button>
              )}
              {ritualAvailable && (
                <button onClick={handlePerformRitual} disabled={uiLocked} className="ww-button ww-button-success">
                  Perform Grove Ritual
                </button>
              )}
              {canCommuneWithGlow && (
                <button
                  onClick={() => {
                    const result = communeWithGlow(gameState);
                    let newState = result.state;
                    for (const entry of result.logEntries) {
                      newState = appendLog(newState, entry);
                    }
                    setGameState(newState);
                  }}
                  disabled={uiLocked}
                  className="ww-button ww-button-success"
                >
                  Reach for the Glow
                </button>
              )}
              {canCommuneWithGlow && (
                <button
                  onClick={() => {
                    const result = communeWithGlow(gameState);
                    let newState = result.state;
                    for (const entry of result.logEntries) {
                      newState = appendLog(newState, entry);
                    }
                    setGameState(newState);
                  }}
                  disabled={runEnded}
                  className="ww-button ww-button-success"
                >
                  Reach for the Glow
                </button>
              )}
            </div>
            {gameState.currentLocation === 'wilds' && !ritualAvailable && groveAtPeace && (
              <p className="ww-ritual-note">The grove is already at peace.</p>
            )}
          </section>

          {availableExits.length > 0 && (
            <section className="ww-panel ww-section ww-movement">
              <h2 className="ww-section-title">Movement</h2>
              <div className="ww-actions-row">
                {availableExits.map((exit) => {
                  const destinationLocation = getLocation(exit.to);
                  const directionLabel = exit.direction.charAt(0).toUpperCase() + exit.direction.slice(1);
                  return (
                    <button
                      key={`${exit.direction}-${exit.to}`}
                        onClick={() => handleMove(exit.to)}
                        disabled={uiLocked}
                      className="ww-button ww-button-primary"
                    >
                      Go {directionLabel} to {destinationLocation.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="ww-column ww-secondary">
          <section className={`ww-panel ww-art-panel ww-art-${artKey}`}>
            <div className="ww-art-overlay">
              <div className="ww-art-location-name">{currentLocation.name}</div>
              {lastNpc && lastNpc.location === gameState.currentLocation && (
                <div className="ww-art-portrait">
                  <div className={`ww-art-portrait-circle ww-art-portrait-${lastNpc.id}`} />
                  <div className="ww-art-portrait-meta">
                    <div className="ww-art-portrait-name">{lastNpc.name}</div>
                    <div className="ww-art-portrait-role">NPC</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="ww-panel ww-inventory">
            <h2 className="ww-panel-title">Inventory</h2>
            {gameState.player.inventory.length === 0 ? (
              <p className="ww-inventory-empty">You are carrying very little.</p>
            ) : (
              <div className="ww-inventory-list">
                {gameState.player.inventory.map((item) => {
                  const itemData = items[item.itemId];
                  const itemName = itemData?.name ?? item.itemId;
                  const itemDescription = itemData?.description ?? '';
                  return (
                    <p
                      key={item.itemId}
                      className="ww-inventory-item"
                      title={itemDescription || undefined}
                      onMouseEnter={() => setHoveredItemDesc(itemDescription || null)}
                      onMouseLeave={() => setHoveredItemDesc(null)}
                    >
                      {itemName} ×{item.quantity}
                    </p>
                  );
                })}
              </div>
            )}
            {hoveredItemDesc && (
              <div className="ww-inventory-tooltip" role="note">
                {hoveredItemDesc}
              </div>
            )}
          </section>

          <section className="ww-panel ww-journal">
            <h2 className="ww-panel-title">Journal</h2>
            {(() => {
              const activeQuests = gameState.quests.filter((quest) => quest.status === 'active');
              const fallbackQuests =
                activeQuests.length > 0
                  ? activeQuests
                  : (() => {
                      const completed = gameState.quests.filter((quest) => quest.status === 'completed');
                      if (completed.length > 0) {
                        return [completed[completed.length - 1]];
                      }
                      return gameState.quests.slice(0, 1);
                    })();

              const prioritizedQuests = fallbackQuests.filter(
                (quest): quest is (typeof gameState.quests)[number] => quest !== undefined,
              );

              const journalEntries: Array<{
                quest: (typeof gameState.quests)[number];
                definition: (typeof QUESTS)[keyof typeof QUESTS];
                stepSummary: string;
              }> = [];

              prioritizedQuests.forEach((quest) => {
                if (!isQuestId(quest.id)) {
                  return;
                }
                const definition = QUESTS[quest.id];
                const stepSummary =
                  definition.steps.find((step) => step.id === quest.step)?.summary ?? '';
                journalEntries.push({ quest, definition, stepSummary });
              });

              if (journalEntries.length === 0) {
                return <div className="ww-journal-content">No active quests.</div>;
              }

              return journalEntries.map(({ quest, definition, stepSummary }) => {
                // Calculate progress for heal_the_grove quest
                let progressText = '';
                if (quest.id === 'heal_the_grove' && quest.status === 'active') {
                  if (quest.step === 'gather_ingredients' || quest.step === 'perform_ritual') {
                    const herbs = gameState.player.inventory.find(
                      (item) => item.itemId === 'forest_herb',
                    )?.quantity ?? 0;
                    const water = gameState.player.inventory.find(
                      (item) => item.itemId === 'lake_water',
                    )?.quantity ?? 0;
                    progressText = ` (Herbs: ${herbs}/3, Water: ${water}/1)`;
                  }
                }

                return (
                  <div key={quest.id} className="ww-journal-content">
                    <div>
                      <span className="ww-journal-quest-name">{definition.name}</span>{' '}
                      <span className="ww-journal-quest-status">({quest.status})</span>
                      {progressText && (
                        <span className="ww-journal-progress">{progressText}</span>
                      )}
                    </div>
                    {stepSummary && <div className="ww-journal-step">{stepSummary}</div>}
                  </div>
                );
              });
            })()}
          </section>

          <section className="ww-panel ww-section ww-shop">
            <h2 className="ww-section-title">Shop</h2>
            {(() => {
              const forestRep = gameState.flags.reputation?.forest ?? 0;
              const label =
                forestRep > 0
                  ? `favour +${forestRep}`
                  : forestRep < 0
                  ? `unease ${forestRep}`
                  : 'neutral';
              return (
                <p className="ww-shop-reputation">
                  Forest regard: {label}
                </p>
              );
            })()}
            {!atTraderPost ? (
              <p className="ww-empty-state">
                Find the Trader's Post (go down from the Wilds) to make deals with the Ranger.
              </p>
            ) : (
              <>
                {availableTrades.length === 0 && (
                  <p className="ww-empty-state">The Ranger has no deals to offer right now.</p>
                )}
                {availableTrades.map(({ trade, affordable, usable, limit, used }) => {
                  const forestRep = gameState.flags.reputation?.forest ?? 0;
                  const friendlyLabel =
                    forestRep >= 10
                      ? `${trade.label} (the Ranger quietly sets aside a little extra for you)`
                      : trade.label;
                  return (
                    <div key={trade.id} className="ww-shop-trade">
                      <button
                        onClick={() => handleTrade(trade.id)}
                        disabled={!affordable || !usable || uiLocked}
                        className="ww-button ww-button-primary ww-button-small"
                      >
                        {friendlyLabel}
                        {!usable ? ' (exhausted)' : ''}
                      </button>
                      {limit !== undefined && (
                        <div className="ww-shop-trade-uses">
                          Uses: {used}/{limit}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </aside>
      </div>

      {runEnded && (
        <div className="ww-run-overlay">
          <div className="ww-run-overlay-content">
            <h2>You fell in the Whispering Wilds</h2>
            <p>Your journey in this run is over.</p>
            <ul className="ww-run-summary">
              <li>
                <strong>Level:</strong> {level} (XP: {xp})
              </li>
              <li>
                <strong>Forest regard:</strong>{' '}
                {forestRep > 0
                  ? `favour +${forestRep}`
                  : forestRep < 0
                  ? `unease ${forestRep}`
                  : 'neutral'}
              </li>
              <li>
                <strong>Sanctum ritual:</strong>{' '}
                {groveHealed ? 'the grove has been healed' : 'the grove remains wounded'}
              </li>
              <li>
                <strong>Items carried:</strong> {totalItems}
              </li>
            </ul>
            <button
              type="button"
              onClick={handleNewRun}
              className="ww-button ww-button-primary"
            >
              Start New Run
            </button>
            <p className="ww-run-summary-note">
              (You can still scroll the log to reread your final moments.)
            </p>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="ww-tutorial-overlay">
          <div className="ww-tutorial-content">
            <h2 className="ww-tutorial-title">Welcome to the Whispering Wilds</h2>
            <p className="ww-tutorial-text">
              You begin in the Sanctum. From here, you step out into the Wilds and try to survive one run at a time.
            </p>
            <ul className="ww-tutorial-list">
              <li><strong>Move</strong> between locations using the Movement buttons.</li>
              <li><strong>Sense</strong> to feel what the forest is doing around you.</li>
              <li><strong>Gather</strong> herbs, water, and ore — but don’t take more than you need.</li>
              <li><strong>Fight or flee</strong> when creatures appear. Use Healing Tonics to recover.</li>
              <li><strong>Trade</strong> with the Ranger at the Trader’s Post to turn resources into supplies.</li>
              <li><strong>Heal the Grove</strong> to calm the Wilds… and see what the forest thinks of you.</li>
            </ul>
            <button
              onClick={() => {
                setGameState((prev) => ({
                  ...prev,
                  flags: {
                    ...prev.flags,
                    seenTutorial: true,
                  },
                }));
              }}
              className="ww-button ww-button-primary ww-tutorial-button"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetTutorial={() => {
          // Reset the tutorial flag so the overlay shows again on top of the game
          setGameState((prev) => ({
            ...prev,
            flags: {
              ...prev.flags,
              seenTutorial: false,
            },
          }));
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}

