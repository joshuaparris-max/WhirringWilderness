import type { Biome } from '../types/gameState';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type SfxType = 'move' | 'sense' | 'gather' | 'attack' | 'hurt' | 'heal' | 'trade';

const SAFE_MIN_GAIN = 0.0001;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private currentAmbientSource: AudioBufferSourceNode | null = null;
  private currentAmbientGain: GainNode | null = null;
  private currentBiome: Biome | null = null;

  private ambientCache = new Map<Biome, AudioBuffer>();
  private sfxCache = new Map<SfxType, AudioBuffer>();

  private muted = true;
  private initializing = false;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  public isEnabled(): boolean {
    return !!this.context && !this.muted;
  }

  public async init(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[AudioManager] AudioContext not supported in this browser');
      return;
    }
    if (this.context || this.initializing) return;

    this.initializing = true;
    try {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AudioManager] AudioContext constructor not available');
        this.initializing = false;
        return;
      }

      const context = new AudioCtx();
      this.context = context;

      this.masterGain = context.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(context.destination);

      this.ambientBus = context.createGain();
      this.ambientBus.gain.value = 0.7;
      this.ambientBus.connect(this.masterGain);

      this.sfxGain = context.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);
    } catch (error) {
      console.error('[AudioManager] Failed to initialize audio context:', error);
    } finally {
      this.initializing = false;
    }
  }

  public async enable(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[AudioManager] Cannot enable audio: not supported');
      return;
    }
    try {
      await this.init();
      if (!this.context || !this.masterGain) {
        console.warn('[AudioManager] Cannot enable audio: context not initialized');
        return;
      }
      if (this.context.state === 'suspended') {
        try {
          await this.context.resume();
        } catch (error) {
          console.warn('[AudioManager] Failed to resume audio context:', error);
        }
      }
      this.setMuted(false);
    } catch (error) {
      console.error('[AudioManager] Failed to enable audio:', error);
    }
  }

  public disable(): void {
    this.setMuted(true);
    this.fadeOutAmbient();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const current = clamp(this.masterGain.gain.value, SAFE_MIN_GAIN, 1);
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(current, now);
    const target = muted ? SAFE_MIN_GAIN : 1;
    this.masterGain.gain.linearRampToValueAtTime(target, now + 0.6);
  }

  public setMasterVolume(volume: number): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    const target = clamp(volume, 0, 1);
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(target, now);
  }

  public setMusicVolume(volume: number): void {
    if (!this.context || !this.ambientBus) return;
    const now = this.context.currentTime;
    const target = clamp(volume, 0, 1);
    this.ambientBus.gain.cancelScheduledValues(now);
    this.ambientBus.gain.setValueAtTime(target * 0.7, now); // Base ambient volume is 0.7
  }

  public setSfxVolume(volume: number): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const target = clamp(volume, 0, 1);
    this.sfxGain.gain.cancelScheduledValues(now);
    this.sfxGain.gain.setValueAtTime(target * 0.9, now); // Base SFX volume is 0.9
  }

  public playAmbient(biome: Biome): void {
    if (!this.context || !this.ambientBus) return;
    if (this.currentBiome === biome && this.currentAmbientSource) return;

    this.stopAmbient(0.8);
    if (this.muted) {
      this.currentBiome = biome;
      return;
    }

    const buffer = this.getAmbientBuffer(biome);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.getAmbientFilterFrequency(biome);

    const gainNode = this.context.createGain();
    gainNode.gain.value = SAFE_MIN_GAIN;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ambientBus);

    const now = this.context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(SAFE_MIN_GAIN, now);
    gainNode.gain.linearRampToValueAtTime(this.getAmbientTargetGain(biome), now + 1.5);

    source.start(now + 0.05);

    source.onended = () => {
      if (this.currentAmbientSource === source) {
        this.currentAmbientSource = null;
        this.currentAmbientGain = null;
        this.currentBiome = null;
      }
    };

    this.currentAmbientSource = source;
    this.currentAmbientGain = gainNode;
    this.currentBiome = biome;
  }

  public fadeOutAmbient(duration = 1.0): void {
    this.stopAmbient(duration);
  }

  public playSFX(type: SfxType): void {
    if (!this.context || !this.sfxGain || this.muted) return;
    const buffer = this.getSfxBuffer(type);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGain);
    try {
      source.start();
    } catch (error) {
      console.warn(`[AudioManager] Failed to play SFX "${type}":`, error);
    }
  }

  public playRitualSwell(): void {
    if (!this.context || !this.sfxGain || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 3.2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(SAFE_MIN_GAIN, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 1.6);
    gain.gain.linearRampToValueAtTime(SAFE_MIN_GAIN, now + 3.4);

    const shimmer = this.context.createOscillator();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 660;
    const shimmerGain = this.context.createGain();
    shimmerGain.gain.setValueAtTime(0.0005, now);
    shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.8);
    shimmerGain.gain.linearRampToValueAtTime(0.0005, now + 2.2);

    osc.connect(gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 3.6);
    shimmer.stop(now + 2.5);
  }

  private stopAmbient(duration: number): void {
    if (!this.context) return;
    const source = this.currentAmbientSource;
    const gainNode = this.currentAmbientGain;
    if (!source || !gainNode) return;

    const now = this.context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(clamp(gainNode.gain.value, SAFE_MIN_GAIN, 1), now);
    gainNode.gain.linearRampToValueAtTime(SAFE_MIN_GAIN, now + duration);
    try {
      source.stop(now + duration + 0.1);
    } catch (error) {
      // Source may already be stopped, which is fine
      if (error instanceof Error && !error.message.includes('already stopped')) {
        console.warn('[AudioManager] Error stopping ambient source:', error);
      }
    }
    this.currentAmbientSource = null;
    this.currentAmbientGain = null;
    this.currentBiome = null;
  }

  private getAmbientBuffer(biome: Biome): AudioBuffer | null {
    if (!this.context) return null;
    const cached = this.ambientCache.get(biome);
    if (cached) return cached;

    const sampleRate = this.context.sampleRate;
    const duration = 8;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    let previous = 0;
    for (let i = 0; i < data.length; i += 1) {
      const t = i / sampleRate;
      const random = Math.random() * 2 - 1;
      previous = previous * 0.98 + random * 0.02;

      let tone = 0;
      switch (biome) {
        case 'sanctum':
          tone =
            0.25 * Math.sin(2 * Math.PI * 110 * t) +
            0.12 * Math.sin(2 * Math.PI * 220 * (t + 0.1));
          break;
        case 'forest':
          tone =
            0.18 * Math.sin(2 * Math.PI * 180 * t) +
            0.1 * Math.sin(2 * Math.PI * 60 * t);
          break;
        case 'deep_forest':
          // Slightly more shimmering, higher harmonic content for mysterious glow
          tone =
            0.14 * Math.sin(2 * Math.PI * 260 * t) +
            0.12 * Math.sin(2 * Math.PI * 90 * (t + 0.08)) +
            0.06 * Math.sin(2 * Math.PI * 660 * t);
          break;
        case 'lake':
          tone =
            0.2 * Math.sin(2 * Math.PI * 140 * t) +
            0.14 * Math.sin(2 * Math.PI * 70 * (t + 0.2));
          break;
        case 'mine':
          tone =
            0.22 * Math.sin(2 * Math.PI * 90 * t) +
            0.08 * Math.sin(2 * Math.PI * 45 * t);
          break;
        case 'camp':
        default:
          tone =
            0.16 * Math.sin(2 * Math.PI * 200 * t) +
            0.08 * Math.sin(2 * Math.PI * 120 * (t + 0.15));
          break;
      }

      const gentleNoise = previous * 0.3;
      data[i] = clamp(tone + gentleNoise, -1, 1);
    }

    this.ambientCache.set(biome, buffer);
    return buffer;
  }

  private getAmbientFilterFrequency(biome: Biome): number {
    switch (biome) {
      case 'sanctum':
        return 600;
      case 'forest':
        return 900;
      case 'deep_forest':
        return 1200;
      case 'lake':
        return 750;
      case 'mine':
        return 500;
      case 'camp':
      default:
        return 850;
    }
  }

  private getAmbientTargetGain(biome: Biome): number {
    switch (biome) {
      case 'sanctum':
        return 0.25;
      case 'forest':
        return 0.35;
      case 'deep_forest':
        return 0.38;
      case 'lake':
        return 0.3;
      case 'mine':
        return 0.28;
      case 'camp':
      default:
        return 0.3;
    }
  }

  private getSfxBuffer(type: SfxType): AudioBuffer | null {
    if (!this.context) return null;
    const cached = this.sfxCache.get(type);
    if (cached) return cached;

    const sampleRate = this.context.sampleRate;
    const durationMap: Record<SfxType, number> = {
      move: 0.25,
      sense: 0.35,
      gather: 0.35,
      attack: 0.25,
      hurt: 0.3,
      heal: 0.6,
      trade: 0.4,
    };
    const duration = durationMap[type] ?? 0.3;
    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const t = i / sampleRate;
      const envelope = Math.pow(1 - t / duration, type === 'heal' ? 3 : 2);
      let value = 0;

      switch (type) {
        case 'move':
          value =
            envelope *
            (Math.sin(2 * Math.PI * 180 * t) + 0.3 * Math.sin(2 * Math.PI * 260 * t));
          break;
        case 'sense':
          value =
            envelope *
            (0.5 * Math.sin(2 * Math.PI * 520 * t + Math.sin(2 * Math.PI * 4 * t)) +
              0.2 * (Math.random() * 2 - 1));
          break;
        case 'gather':
          value =
            envelope *
            (Math.sin(2 * Math.PI * 320 * t) + 0.4 * Math.sin(2 * Math.PI * 480 * t));
          break;
        case 'attack':
          value = envelope * (Math.random() * 2 - 1);
          break;
        case 'hurt':
          value = envelope * (0.6 * Math.sin(2 * Math.PI * 120 * t) + 0.8 * (Math.random() * 2 - 1));
          break;
        case 'heal':
          value =
            envelope *
            (0.6 * Math.sin(2 * Math.PI * 240 * t) +
              0.4 * Math.sin(2 * Math.PI * 360 * t) +
              0.2 * Math.sin(2 * Math.PI * 480 * t));
          break;
        case 'trade':
        default:
          value =
            envelope *
            (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * (t + 0.05)));
          break;
      }

      data[i] = clamp(value, -1, 1);
    }

    this.sfxCache.set(type, buffer);
    return buffer;
  }
}

export const audioManager = new AudioManager();

