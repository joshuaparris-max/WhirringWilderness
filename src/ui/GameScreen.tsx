import { useEffect, useRef, useState } from 'react';
import { createInitialState, appendLog } from '../engine/gameState';
import { moveTo, sense, gather, talkTo, attack, attemptEscape, performGroveRitual, performTrade, consumeHealingTonic } from '../engine/actions';
import { getLocation, getAvailableExits } from '../engine/locations';
import { items } from '../content/items';
import { npcs, type NpcId } from '../content/npcs';
import { isInEncounter } from '../engine/encounters';
import { creatures } from '../content/creatures';
import { getNextLevelXp } from '../engine/progression';
import { QUESTS, type QuestId } from '../content/quests';
import { RANGER_TRADES, type TradeId } from '../content/shop';
import { canAffordTrade, canUseTrade } from '../engine/trading';
import type { GameState } from '../types/gameState';
import type { LocationId } from '../types/gameState';

export function GameScreen() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const logRef = useRef<HTMLDivElement | null>(null);
  const [isLogPinnedToBottom, setIsLogPinnedToBottom] = useState(true);

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

  const currentLocation = getLocation(gameState.currentLocation);
  const availableExits = getAvailableExits(gameState.currentLocation);
  const npcsAtLocation = Object.values(npcs).filter(
    (npc) => npc.location === gameState.currentLocation
  );
  const inEncounter = isInEncounter(gameState);
  const currentEncounter = gameState.currentEncounter ?? null;
  const currentCreature = currentEncounter ? creatures[currentEncounter.creatureId] : null;
  const nextLevelXp = getNextLevelXp(gameState.player.level);
  const canPerformRitual =
    gameState.currentLocation === 'wilds' && !isInEncounter(gameState);
  const atTraderPost = gameState.currentLocation === 'trader_post';
  const hasHealingTonic = gameState.player.inventory.some(
    (item) => item.itemId === 'healing_tonic' && item.quantity > 0,
  );

  // Quest/Journal state
  const mainQuestId: QuestId = 'heal_the_grove';
  const mainQuestState = gameState.quests.find((q) => q.id === mainQuestId);
  const mainQuestDefinition = QUESTS[mainQuestId];

  let mainQuestStepSummary = '';
  if (mainQuestState && mainQuestDefinition) {
    const stepDef = mainQuestDefinition.steps.find(
      (step) => step.id === mainQuestState.step,
    );
    mainQuestStepSummary = stepDef ? stepDef.summary : '';
  }

  // Trading
  const availableTrades = RANGER_TRADES.map((trade) => {
    const affordable = canAffordTrade(gameState, trade);
    const usable = canUseTrade(gameState, trade.id);
    return { trade, affordable, usable };
  });

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
      </header>

      <div className="ww-main">
        <div className="ww-left-column">
          {currentCreature && (
            <div className="ww-encounter">
              <h2>Encounter</h2>
              <p>
                {currentCreature.name} — HP {currentEncounter?.hp} / {currentCreature.stats.hp}
              </p>
            </div>
          )}
          <div className="ww-journal">
            <strong>Journal</strong>
            {mainQuestState ? (
              <div className="ww-journal-content">
                <div>
                  <span className="ww-journal-quest-name">{mainQuestState.name}</span>{' '}
                  <span className="ww-journal-quest-status">({mainQuestState.status})</span>
                </div>
                {mainQuestStepSummary && (
                  <div className="ww-journal-step">{mainQuestStepSummary}</div>
                )}
              </div>
            ) : (
              <div className="ww-journal-content">No active quests.</div>
            )}
          </div>
          <div
            className="ww-log"
            ref={logRef}
            onScroll={handleLogScroll}
            style={{ overflowY: 'auto' }}
          >
            {gameState.log.length === 0 ? (
              <p className="ww-log-empty">The log is empty.</p>
            ) : (
              gameState.log.map((entry) => (
                <p key={entry.id} className="ww-log-entry">
                  {entry.text}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="ww-inventory">
          <h2 className="ww-panel-title">Inventory</h2>
          {gameState.player.inventory.length === 0 ? (
            <p className="ww-inventory-empty">You are carrying very little.</p>
          ) : (
            <div className="ww-inventory-list">
              {gameState.player.inventory.map((item) => {
                const itemData = items[item.itemId];
                const itemName = itemData?.name ?? item.itemId;
                return (
                  <p key={item.itemId} className="ww-inventory-item">
                    {itemName} ×{item.quantity}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="ww-section">
        {availableExits.length > 0 && (
          <div>
            <h2 className="ww-section-title">Movement</h2>
            <div className="ww-actions-row">
              {availableExits.map((exit) => {
                const destinationLocation = getLocation(exit.to);
                const directionLabel = exit.direction.charAt(0).toUpperCase() + exit.direction.slice(1);
                return (
                  <button
                    key={`${exit.direction}-${exit.to}`}
                    onClick={() => handleMove(exit.to)}
                    disabled={inEncounter}
                    className="ww-button ww-button-primary"
                  >
                    Go {directionLabel} to {destinationLocation.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="ww-section-title">Actions</h2>
          <div className="ww-actions-row">
            {inEncounter && (
              <>
                <button onClick={handleAttack} className="ww-button ww-button-danger">
                  Attack
                </button>
                <button onClick={handleEscape} className="ww-button ww-button-secondary">
                  Flee
                </button>
              </>
            )}
            <button
              onClick={handleSense}
              disabled={inEncounter}
              className="ww-button ww-button-primary"
            >
              Sense
            </button>
            <button
              onClick={handleGather}
              disabled={inEncounter}
              className="ww-button ww-button-primary"
            >
              Gather
            </button>
            {hasHealingTonic && (
              <button
                onClick={handleUseHealingTonic}
                disabled={inEncounter}
                className="ww-button ww-button-success"
              >
                Use Healing Tonic
              </button>
            )}
            {canPerformRitual && (
              <button onClick={handlePerformRitual} className="ww-button ww-button-success">
                Perform Grove Ritual
              </button>
            )}
          </div>
        </div>

        {npcsAtLocation.length > 0 && (
          <div>
            <h2 className="ww-section-title">Talk</h2>
            <div className="ww-actions-row">
              {npcsAtLocation.map((npc) => (
                <button
                  key={npc.id}
                  onClick={() => handleTalk(npc.id)}
                  disabled={inEncounter}
                  className="ww-button ww-button-primary"
                >
                  Talk to {npc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {npcsAtLocation.length === 0 && (
          <div>
            <h2 className="ww-section-title">Talk</h2>
            <p className="ww-empty-state">No one to talk to here.</p>
          </div>
        )}

        <div>
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
              <p style={{ fontSize: '0.8rem', color: '#888' }}>
                Forest regard: {label}
              </p>
            );
          })()}
          {!atTraderPost ? (
            <p className="ww-empty-state">Find the Trader's Post to make deals.</p>
          ) : (
            <>
              {availableTrades.length === 0 && (
                <p className="ww-empty-state">The Ranger has no deals to offer right now.</p>
              )}
              {availableTrades.map(({ trade, affordable, usable }) => {
                const forestRep = gameState.flags.reputation?.forest ?? 0;
                const friendlyLabel =
                  forestRep >= 10
                    ? `${trade.label} (the Ranger gives you a small discount from gratitude)`
                    : trade.label;
                return (
                <div key={trade.id} style={{ marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => handleTrade(trade.id)}
                    disabled={!affordable || !usable || inEncounter}
                    className="ww-button ww-button-primary ww-button-small"
                  >
                    {friendlyLabel}{!usable ? ' (exhausted)' : ''}
                  </button>
                </div>
              );})}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

