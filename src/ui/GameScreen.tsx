import { useState } from 'react';
import { createInitialState, appendLog } from '../engine/gameState';
import { moveTo, sense, gather, talkTo } from '../engine/actions';
import { getLocation, getAvailableExits } from '../engine/locations';
import { items } from '../content/items';
import { npcs, type NpcId } from '../content/npcs';
import type { GameState } from '../types/gameState';
import type { LocationId } from '../types/gameState';

export function GameScreen() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());

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

  const currentLocation = getLocation(gameState.currentLocation);
  const availableExits = getAvailableExits(gameState.currentLocation);
  const npcsAtLocation = Object.values(npcs).filter(
    (npc) => npc.location === gameState.currentLocation
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '1rem',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      <header
        style={{
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #333',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#000000', fontSize: '2rem' }}>
          {currentLocation.name}
        </h1>
        <p style={{ margin: 0, color: '#000000', fontSize: '1.1rem', fontWeight: '500' }}>
          HP: {gameState.player.hp} / {gameState.player.maxHp}
        </p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '1rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            border: '2px solid #333',
            borderRadius: '4px',
            minHeight: 0,
          }}
        >
          {gameState.log.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic', fontSize: '1rem' }}>
              The log is empty.
            </p>
          ) : (
            gameState.log.map((entry) => (
              <p
                key={entry.id}
                style={{
                  margin: '0 0 1rem 0',
                  color: '#000000',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                }}
              >
                {entry.text}
              </p>
            ))
          )}
        </div>

        <div
          style={{
            width: '250px',
            padding: '1rem',
            backgroundColor: '#f9f9f9',
            border: '2px solid #333',
            borderRadius: '4px',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
            Inventory
          </h2>
          {gameState.player.inventory.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem', margin: 0 }}>
              You are carrying very little.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {gameState.player.inventory.map((item) => {
                const itemData = items[item.itemId];
                const itemName = itemData?.name ?? item.itemId;
                return (
                  <p
                    key={item.itemId}
                    style={{
                      margin: 0,
                      color: '#000000',
                      fontSize: '0.9rem',
                    }}
                  >
                    {itemName} ×{item.quantity}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {availableExits.length > 0 && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              Movement
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableExits.map((exit) => {
                const destinationLocation = getLocation(exit.to);
                const directionLabel = exit.direction.charAt(0).toUpperCase() + exit.direction.slice(1);
                return (
                  <button
                    key={`${exit.direction}-${exit.to}`}
                    onClick={() => handleMove(exit.to)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: '#333',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                    }}
                  >
                    Go {directionLabel} to {destinationLocation.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
            Actions
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              onClick={handleSense}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: '#333',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Sense
            </button>
            <button
              onClick={handleGather}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: '#333',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Gather
            </button>
          </div>
        </div>

        {npcsAtLocation.length > 0 && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              Talk
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {npcsAtLocation.map((npc) => (
                <button
                  key={npc.id}
                  onClick={() => handleTalk(npc.id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: '#333',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                >
                  Talk to {npc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {npcsAtLocation.length === 0 && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              Talk
            </h2>
            <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem', margin: 0 }}>
              No one to talk to here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

