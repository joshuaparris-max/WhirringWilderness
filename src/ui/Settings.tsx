import { useState, useEffect } from 'react';
import { audioManager } from '../audio/audioManager';
import type { RunSummary } from '../types/runSummary';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  lastRunSummary?: RunSummary | null;
  /** Optional callback to reset the first-time tutorial flag (replay tutorial) */
  onResetTutorial?: () => void;
}

interface SettingsState {
  audioEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  textSize: number;
  logHeight: number;
  animationsEnabled: boolean;
  typewriterEffect: boolean;
  showLogTags: boolean;
}

const STORAGE_KEY = 'ww_settings';

function loadSettings(): Partial<SettingsState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveSettings(settings: Partial<SettingsState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore save errors
  }
}

export function Settings({ isOpen, onClose, lastRunSummary, onResetTutorial }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const loaded = loadSettings();
    return {
      audioEnabled: audioManager.isEnabled(),
      masterVolume: 100,
      musicVolume: 100,
      sfxVolume: 100,
      textSize: 100,
      logHeight: 50,
      animationsEnabled: true,
      typewriterEffect: false,
      showLogTags: false,
      ...loaded,
    };
  });

  useEffect(() => {
    if (settings.audioEnabled) {
      audioManager.enable().catch(() => undefined);
    } else {
      audioManager.disable();
    }
    audioManager.setMasterVolume(settings.masterVolume / 100);
    audioManager.setMusicVolume(settings.musicVolume / 100);
    audioManager.setSfxVolume(settings.sfxVolume / 100);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-size', `${settings.textSize}%`);
    document.documentElement.style.setProperty('--log-max-height', `${settings.logHeight}vh`);
    document.documentElement.style.setProperty(
      '--animations-enabled',
      settings.animationsEnabled ? '1' : '0',
    );
  }, [settings.textSize, settings.logHeight, settings.animationsEnabled]);

  const lastRunSummaryText = lastRunSummary
    ? [
        `Finished: ${new Date(lastRunSummary.finishedAt ?? Date.now()).toLocaleString()}`,
        `Level: ${lastRunSummary.level}`,
        `XP earned: ${lastRunSummary.xp}`,
        `Forest reputation: ${lastRunSummary.forestReputation}`,
        `Grove healed: ${lastRunSummary.groveHealed ? 'Yes' : 'No'}`,
        `Last location: ${lastRunSummary.location}`,
        `Items carried: ${lastRunSummary.itemsCarried}`,
        `Death cause: ${lastRunSummary.deathCause || 'Survived'}`,
      ].join('\n')
    : '';

  const copyLastRunSummary = async () => {
    if (!lastRunSummaryText) return;
    await navigator.clipboard.writeText(lastRunSummaryText);
  };

  const downloadLastRunSummary = () => {
    if (!lastRunSummaryText) return;
    const blob = new Blob([lastRunSummaryText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `whirring-wilderness-summary-${new Date(lastRunSummary?.finishedAt ?? Date.now()).toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="ww-overlay" onClick={onClose}>
      <div className="ww-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ww-settings-header">
          <h2>Settings</h2>
          <button
            onClick={onClose}
            className="ww-button-close"
            aria-label="Close settings"
          >
            x
          </button>
        </div>

        <div className="ww-settings-content">
          <section className="ww-settings-section">
            <h3>Audio</h3>
            <label className="ww-settings-checkbox">
              <input
                type="checkbox"
                checked={settings.audioEnabled}
                onChange={(e) => updateSetting('audioEnabled', e.target.checked)}
              />
              <span>Enable Audio</span>
            </label>
            <label className="ww-settings-slider">
              <span>Master Volume: {settings.masterVolume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.masterVolume}
                onChange={(e) => updateSetting('masterVolume', Number(e.target.value))}
                disabled={!settings.audioEnabled}
              />
            </label>
            <label className="ww-settings-slider">
              <span>Music Volume: {settings.musicVolume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={(e) => updateSetting('musicVolume', Number(e.target.value))}
                disabled={!settings.audioEnabled}
              />
            </label>
            <label className="ww-settings-slider">
              <span>Sound Effects: {settings.sfxVolume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sfxVolume}
                onChange={(e) => updateSetting('sfxVolume', Number(e.target.value))}
                disabled={!settings.audioEnabled}
              />
            </label>
          </section>

          <section className="ww-settings-section">
            <h3>Display</h3>
            <label className="ww-settings-slider">
              <span>Text Size: {settings.textSize}%</span>
              <input
                type="range"
                min="80"
                max="150"
                value={settings.textSize}
                onChange={(e) => updateSetting('textSize', Number(e.target.value))}
              />
            </label>
            <label className="ww-settings-slider">
              <span>Log Height: {settings.logHeight}vh</span>
              <input
                type="range"
                min="30"
                max="80"
                step="2"
                value={settings.logHeight}
                onChange={(e) => updateSetting('logHeight', Number(e.target.value))}
              />
            </label>
            <label className="ww-settings-checkbox">
              <input
                type="checkbox"
                checked={settings.animationsEnabled}
                onChange={(e) => updateSetting('animationsEnabled', e.target.checked)}
              />
              <span>Enable Animations</span>
            </label>
            <label className="ww-settings-checkbox">
              <input
                type="checkbox"
                checked={settings.typewriterEffect}
                onChange={(e) => updateSetting('typewriterEffect', e.target.checked)}
              />
              <span>Typewriter Effect (Experimental)</span>
            </label>
            <label className="ww-settings-checkbox">
              <input
                type="checkbox"
                checked={settings.showLogTags}
                onChange={(e) => updateSetting('showLogTags', e.target.checked)}
              />
              <span>Show compact log tags (Story / Combat / Quest)</span>
            </label>
          </section>

          <section className="ww-settings-section">
            <h3>Accessibility</h3>
            <p className="ww-settings-note">
              Keyboard navigation: Use Tab to navigate, Enter/Space to activate buttons, Escape to
              close dialogs.
            </p>
            {onResetTutorial && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="ww-button ww-button-secondary"
                  onClick={() => onResetTutorial()}
                >
                  Replay tutorial
                </button>
              </div>
            )}
          </section>

          {lastRunSummary && (
            <section className="ww-settings-section">
              <h3>Last run summary</h3>
              <pre className="ww-summary-box">{lastRunSummaryText}</pre>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="ww-button ww-button-secondary" onClick={copyLastRunSummary}>
                  Copy summary
                </button>
                <button className="ww-button ww-button-secondary" onClick={downloadLastRunSummary}>
                  Download summary
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
