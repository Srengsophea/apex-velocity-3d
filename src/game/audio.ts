export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private scrapeGain: GainNode | null = null;
  private scrapeNode: AudioBufferSourceNode | null = null;
  private lastScrapePlayTime = 0;
  private muted = false;
  private running = false;

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.045,
        this.ctx.currentTime,
        0.05,
      );
    }
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  startEngineLoop(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.running) return;
    try {
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = this.muted ? 0 : 0.04;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;

      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 65;

      this.engineSubOsc = ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.value = 32.5;

      this.engineOsc.connect(filter);
      this.engineSubOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.running = true;
    } catch {
      // Ignore audio restrictions in headless environments
    }
  }

  updateEngine(rpm: number, isBoosting: boolean, isDrifting: boolean, paused: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain) {
      return;
    }
    const now = this.ctx.currentTime;
    if (paused || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    const pitchJitter = 1 + (Math.random() - 0.5) * 0.015;
    const baseFreq = (42 + (rpm / 9000) * 145) * (isBoosting ? 1.18 : 1.0) * pitchJitter;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    const targetGain = isBoosting ? 0.075 : isDrifting ? 0.06 : 0.042;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  playShift(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.07);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } catch {}
  }

  /**
   * Visceral multi-layered crash sound:
   * 1. Sub-bass chassis punch (transient weight)
   * 2. Resonant bandpass metallic crunch (crumpling sheet metal)
   * 3. Polycarbonate / glass shatter crackle
   */
  playCollision(severity = 0.6): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sev = Math.min(1.0, Math.max(0.15, severity));

    try {
      // Layer 1: Sub-Bass Transient Chassis Punch
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(115, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.16);
      subGain.gain.setValueAtTime(0.24 * sev, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.24);

      // Layer 2: Resonant Metallic Sheet-Metal Crunch
      const noise = this.getNoiseBuffer();
      if (noise) {
        const metalSource = ctx.createBufferSource();
        metalSource.buffer = noise;
        metalSource.playbackRate.value = 0.8 + Math.random() * 0.4;

        const metalFilter = ctx.createBiquadFilter();
        metalFilter.type = 'bandpass';
        metalFilter.frequency.setValueAtTime(920 + Math.random() * 400, now);
        metalFilter.frequency.exponentialRampToValueAtTime(240, now + 0.28);
        metalFilter.Q.value = 3.8;

        const metalGain = ctx.createGain();
        metalGain.gain.setValueAtTime(0.28 * sev, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

        metalSource.connect(metalFilter);
        metalFilter.connect(metalGain);
        metalGain.connect(ctx.destination);

        metalSource.start(now);
        metalSource.stop(now + 0.32);

        // Layer 3: High-Frequency Carbon Fiber / Glass Shatter
        const shatterSource = ctx.createBufferSource();
        shatterSource.buffer = noise;
        shatterSource.playbackRate.value = 1.6 + Math.random() * 0.6;

        const shatterFilter = ctx.createBiquadFilter();
        shatterFilter.type = 'highpass';
        shatterFilter.frequency.setValueAtTime(4200, now);

        const shatterGain = ctx.createGain();
        shatterGain.gain.setValueAtTime(0.14 * sev, now);
        shatterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        shatterSource.connect(shatterFilter);
        shatterFilter.connect(shatterGain);
        shatterGain.connect(ctx.destination);

        shatterSource.start(now);
        shatterSource.stop(now + 0.20);
      }
    } catch {}
  }

  /**
   * High-frequency metal-on-metal screech when grinding against track barriers.
   */
  playGuardrailScrape(intensity = 0.5): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastScrapePlayTime < 0.12) return;
    this.lastScrapePlayTime = now;

    try {
      const noise = this.getNoiseBuffer();
      if (!noise) return;

      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.playbackRate.value = 1.35 + Math.random() * 0.35;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400 + (Math.random() - 0.5) * 600, now);
      filter.Q.value = 5.5;

      const gain = ctx.createGain();
      const val = Math.min(0.18, 0.05 + intensity * 0.12);
      gain.gain.setValueAtTime(val, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + 0.18);
    } catch {}
  }

  /**
   * Screeching tire rubber friction during hard drift / brake lockup.
   */
  playTireScreech(intensity = 0.5): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastScrapePlayTime < 0.15) return;
    this.lastScrapePlayTime = now;

    try {
      const noise = this.getNoiseBuffer();
      if (!noise) return;

      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.playbackRate.value = 0.95 + Math.random() * 0.2;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950 + (Math.random() - 0.5) * 200, now);
      filter.Q.value = 4.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.12, 0.03 + intensity * 0.08), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + 0.2);
    } catch {}
  }

  playLapChime(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + idx * 0.07;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      } catch {}
    });
  }

  playFinishFanfare(victory: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = victory
      ? [440, 554.37, 659.25, 880, 1108.73]
      : [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = ctx.currentTime + idx * 0.1;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      } catch {}
    });
  }
}
