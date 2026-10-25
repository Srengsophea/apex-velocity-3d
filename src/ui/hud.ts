import {
  CAR_CATALOG,
  GAME_MODE_CATALOG,
  TRACK_CATALOG,
  TRACK_LIST,
} from '../game/rules';
import {
  CameraModeId,
  CarSpec,
  ControlInputState,
  ControllerModeId,
  GameModeId,
  GameState,
  RaceRunSnapshot,
  RivalState,
  TrackId,
  TrackSpec,
  VehiclePhysicsState,
  Waypoint2D,
} from '../game/types';

export interface HudCallbacks {
  onSelectCar: (carIndex: number) => void;
  onSelectTrack: (trackId: TrackId) => void;
  onSelectMode: (modeId: GameModeId) => void;
  onSelectController: (ctrlId: ControllerModeId) => void;
  onStartRace: () => void;
  onResumeRace: () => void;
  onRestartRace: () => void;
  onReturnToTitle: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => boolean;
  onOrientationChange: () => void;
}

function hexToCss(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

function formatTimeSec(sec: number): string {
  const totalSec = Math.max(0, Math.floor(sec));
  const mins = Math.floor(totalSec / 60);
  const rem = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function ordinalSuffix(pos: number): string {
  if (pos === 1) return '1st';
  if (pos === 2) return '2nd';
  if (pos === 3) return '3rd';
  return `${pos}th`;
}

function buildMiniTrackSvgPath(points: Array<[number, number]>): string {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const coords = points.map(([x, z]) => {
    const sx = (1 - (x - minX) / spanX) * 28 + 4;
    const sy = (1 - (z - minZ) / spanZ) * 20 + 4;
    return `${sx.toFixed(1)},${sy.toFixed(1)}`;
  });
  return `M ${coords.join(' L ')} Z`;
}

export class GameShellUI {
  private callbacks: HudCallbacks;
  private selectedCarIdx = 0;
  private selectedTrack: TrackId = 'city_day';
  private selectedMode: GameModeId = 'grand_prix';
  private selectedController: ControllerModeId = 'wheel';
  private autoRotatePortrait = true;

  // DOM References
  private titleScreen!: HTMLElement;
  private playingHud!: HTMLElement;
  private modalBackdrop!: HTMLElement;
  private modalCard!: HTMLElement;
  private damageVignette!: HTMLElement;

  // Showroom refs
  private carTitleEl!: HTMLElement;
  private carCategoryEl!: HTMLElement;
  private trackTitleEl!: HTMLElement;
  private carButtons: HTMLButtonElement[] = [];
  private trackButtons = new Map<TrackId, HTMLButtonElement>();
  private barSpeedFill!: HTMLElement;
  private barSpeedVal!: HTMLElement;
  private barAccelFill!: HTMLElement;
  private barAccelVal!: HTMLElement;
  private barHandFill!: HTMLElement;
  private barHandVal!: HTMLElement;
  private barNitroFill!: HTMLElement;
  private barNitroVal!: HTMLElement;
  private modeBtns = new Map<GameModeId, HTMLButtonElement>();
  private ctrlBtns = new Map<ControllerModeId, HTMLButtonElement>();

  // Playing HUD refs
  private posValEl!: HTMLElement;
  private lapValEl!: HTMLElement;
  private timeValEl!: HTMLElement;
  private scoreValEl!: HTMLElement;
  private speedValEl!: HTMLElement;
  private gearValEl!: HTMLElement;
  private rpmBarPath!: SVGPathElement;
  private nitroFillEl!: HTMLElement;
  private nitroGhostEl!: HTMLElement;
  private nitroGhostValue = 100;
  private camBtnLabelEl!: HTMLElement;
  private ctrlBtnLabelEl!: HTMLElement;
  private muteBtnEl!: HTMLButtonElement;
  private minimapTitleEl!: HTMLElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D | null;

  // Steering controller containers
  private wheelContainer!: HTMLElement;
  private wheelSvgEl!: SVGSVGElement;
  private buttonsContainer!: HTMLElement;
  private joystickContainer!: HTMLElement;
  private joystickKnob!: HTMLElement;
  private tiltContainer!: HTMLElement;
  private tiltSliderInput!: HTMLInputElement;

  // Unified Input Hub
  private keysHeld = new Set<string>();
  private touchThrottle = 0;
  private touchBrake = 0;
  private touchSteer = 0;
  private touchNitro = false;
  private touchDrift = false;
  private gyroSteer = 0;

  private pendingCameraPress = false;
  private pendingPausePress = false;
  private pendingRestartPress = false;
  private pendingMutePress = false;

  // Minimap bounds cache
  private mapMinX = -180;
  private mapMaxX = 180;
  private mapMinZ = -210;
  private mapMaxZ = 210;

  constructor(callbacks: HudCallbacks, waypoints: Waypoint2D[]) {
    this.callbacks = callbacks;
    this.updateWaypoints(waypoints);
    this.mountDOM();
    this.bindInputEvents();
    this.refreshShowroomUI();
    this.refreshControllerModeUI();
    this.syncLandscapeOrientationClass();
  }

  updateWaypoints(waypoints: Waypoint2D[]): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const w of waypoints) {
      if (w.x < minX) minX = w.x;
      if (w.x > maxX) maxX = w.x;
      if (w.z < minZ) minZ = w.z;
      if (w.z > maxZ) maxZ = w.z;
    }
    const pad = 28;
    this.mapMinX = minX - pad;
    this.mapMaxX = maxX + pad;
    this.mapMinZ = minZ - pad;
    this.mapMaxZ = maxZ + pad;
  }

  isPortraitRotatedActive(): boolean {
    return document.body.classList.contains('portrait-rotated');
  }

  syncLandscapeOrientationClass(): void {
    const isPortraitViewport = window.innerWidth < window.innerHeight;
    const shouldRotate = isPortraitViewport && this.autoRotatePortrait;
    document.body.classList.toggle('portrait-rotated', shouldRotate);
    this.callbacks.onOrientationChange();
  }

  private async requestDeviceLandscape(): Promise<void> {
    try {
      const scr = window.screen as Screen & {
        orientation?: { lock?: (mode: string) => Promise<void> };
      };
      if (scr.orientation?.lock) {
        await scr.orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore if iframe or browser blocks orientation lock
    }
    this.syncLandscapeOrientationClass();
  }

  private mountDOM(): void {
    const root = document.getElementById('root') || document.body;
    root.innerHTML = '';

    this.damageVignette = document.createElement('div');
    this.damageVignette.id = 'damage-vignette';
    document.body.appendChild(this.damageVignette);

    const shell = document.createElement('div');
    shell.id = 'game-shell';
    document.body.appendChild(shell);

    // 1. TITLE SCREEN & GARAGE
    this.titleScreen = document.createElement('section');
    this.titleScreen.id = 'title-screen';
    this.titleScreen.setAttribute('aria-label', 'Title Screen and Car Garage');
    this.titleScreen.innerHTML = `
      <div class="title-top-row">
        <div class="title-logo-wrap">
          <svg width="390" height="72" viewBox="0 0 430 84" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Apex Velocity 3D City Grand Prix">
            <path d="M8 16L28 8H164L152 24H8V16Z" fill="#F59E0B"/>
            <path d="M172 12H360L348 20H172V12Z" fill="#EF4444" fill-opacity="0.85"/>
            <text x="8" y="21" fill="#090D16" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="11" letter-spacing="2">WORLD STREET SERIES</text>
            <text x="6" y="60" fill="#F8FAFC" font-family="Chakra Petch, sans-serif" font-style="italic" font-weight="700" font-size="42" letter-spacing="1">APEX VELOCITY</text>
            <text x="334" y="60" fill="#F59E0B" font-family="Chakra Petch, sans-serif" font-style="italic" font-weight="700" font-size="38">3D</text>
            <text x="8" y="79" fill="#94A3B8" font-family="Plus Jakarta Sans, sans-serif" font-weight="600" font-size="13" letter-spacing="3">6 CIRCUITS · 6 SUPERCARS · LANDSCAPE PRO</text>
          </svg>
        </div>
        <div class="interactive title-top-actions">
          <button id="title-rotate-btn" type="button" class="util-icon-btn" aria-label="Toggle Landscape Orientation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d="M6 12h12"/>
            </svg>
            <span>Landscape</span>
          </button>
          <button id="title-prev-car-btn" type="button" class="util-icon-btn" aria-label="Previous Car Model">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            <span>Prev Car</span>
          </button>
          <button id="title-next-car-btn" type="button" class="util-icon-btn" aria-label="Next Car Model">
            <span>Next Car</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
          </button>
        </div>
      </div>

      <div class="title-bottom-dock">
        <!-- Header Info Row: Selected Car & Selected Circuit -->
        <div class="dock-header-row">
          <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
            <h2 id="showroom-car-name" class="font-display" style="margin:0; font-size:20px; color:#f8fafc;">Apex GT-R V10</h2>
            <span id="showroom-car-cat" style="font-size:11px; color:#f59e0b; font-weight:700;">Grand Touring Supercar</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="hud-kicker">SELECTED MAP:</span>
            <span id="showroom-track-name" style="font-size:12px; font-weight:700; color:#38bdf8;">Metro Downtown GP — Financial District Skyscrapers & Park Chicanes</span>
          </div>
        </div>

        <!-- 6-Car Selection Strip -->
        <div class="selector-section">
          <span class="row-section-tag">GARAGE (6 CARS)</span>
          <div id="car-roster-strip" class="car-Roster-strip" role="group" aria-label="Select Car Model"></div>
        </div>

        <!-- 6-Map Selection Strip -->
        <div class="selector-section">
          <span class="row-section-tag">CIRCUITS (6 MAPS)</span>
          <div id="map-roster-strip" class="map-roster-strip" role="group" aria-label="Select Circuit Map"></div>
        </div>

        <div class="showroom-grid">
          <!-- Car Performance Specs -->
          <div class="spec-bars-grid">
            <div class="spec-bar-item">
              <div class="spec-bar-header"><span>TOP SPEED</span><span id="spec-speed-val" class="tabular-nums" style="color:#f8fafc;">318 KM/H</span></div>
              <div class="spec-bar-track"><div id="spec-speed-fill" class="spec-bar-fill" style="width:88%;"></div></div>
            </div>
            <div class="spec-bar-item">
              <div class="spec-bar-header"><span>ACCEL</span><span id="spec-accel-val" class="tabular-nums" style="color:#f8fafc;">78</span></div>
              <div class="spec-bar-track"><div id="spec-accel-fill" class="spec-bar-fill" style="width:78%;"></div></div>
            </div>
            <div class="spec-bar-item">
              <div class="spec-bar-header"><span>HANDLING</span><span id="spec-hand-val" class="tabular-nums" style="color:#f8fafc;">80</span></div>
              <div class="spec-bar-track"><div id="spec-hand-fill" class="spec-bar-fill" style="width:80%;"></div></div>
            </div>
            <div class="spec-bar-item">
              <div class="spec-bar-header"><span>NITRO</span><span id="spec-nitro-val" class="tabular-nums" style="color:#f8fafc;">61</span></div>
              <div class="spec-bar-track"><div id="spec-nitro-fill" class="spec-bar-fill" style="width:61%;"></div></div>
            </div>
          </div>

          <!-- Play Options: Mode & Controller -->
          <div class="options-column">
            <div class="segmented-row">
              <span class="segmented-label">Mode</span>
              <div class="segmented-group" role="group" aria-label="Select Game Mode">
                <button type="button" class="seg-btn active" data-mode="grand_prix">Grand Prix</button>
                <button type="button" class="seg-btn" data-mode="time_trial">Time Attack</button>
                <button type="button" class="seg-btn" data-mode="eliminator">Street Rush</button>
              </div>
            </div>
            <div class="segmented-row">
              <span class="segmented-label">Controls</span>
              <div class="segmented-group" role="group" aria-label="Select Controller Mode">
                <button type="button" class="seg-btn active" data-ctrl="wheel">Wheel</button>
                <button type="button" class="seg-btn" data-ctrl="buttons">Buttons</button>
                <button type="button" class="seg-btn" data-ctrl="joystick">Joystick</button>
                <button type="button" class="seg-btn" data-ctrl="tilt">Tilt</button>
              </div>
            </div>
          </div>

          <!-- Primary Start CTA -->
          <div>
            <button id="start-race-btn" type="button" data-start="true" class="start-cta-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
              START RACE
            </button>
          </div>
        </div>
      </div>
    `;
    shell.appendChild(this.titleScreen);

    // Populate 6 Car Selection Buttons
    const rosterStrip = this.titleScreen.querySelector(
      '#car-roster-strip',
    ) as HTMLElement;
    CAR_CATALOG.forEach((car, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `car-select-btn ${index === 0 ? 'active' : ''}`;
      btn.setAttribute('aria-label', `Select ${car.name}`);
      btn.innerHTML = `
        <span class="car-swatch" style="background-color:${hexToCss(car.primaryColor)}; border:1px solid ${hexToCss(car.accentColor)};"></span>
        <span class="car-btn-name">${car.name}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectedCarIdx = index;
        this.refreshShowroomUI();
        this.callbacks.onSelectCar(index);
      });
      this.carButtons.push(btn);
      rosterStrip.appendChild(btn);
    });

    // Populate 6 Map Selection Buttons with Mini SVG Circuit Previews
    const mapStrip = this.titleScreen.querySelector(
      '#map-roster-strip',
    ) as HTMLElement;
    TRACK_LIST.forEach((track) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.track = track.id;
      btn.className = `map-select-btn ${track.id === this.selectedTrack ? 'active' : ''}`;
      btn.setAttribute('aria-label', `Select Map ${track.name}`);
      const svgPath = buildMiniTrackSvgPath(track.controlPoints);
      const accentHex = hexToCss(track.archAccentColor);
      btn.innerHTML = `
        <svg width="34" height="26" viewBox="0 0 36 28" fill="none" aria-hidden="true" class="map-mini-svg">
          <path d="${svgPath}" stroke="${accentHex}" stroke-width="2.5" stroke-linejoin="round"/>
        </svg>
        <div class="map-btn-meta">
          <span class="map-btn-name">${track.shortName}</span>
          <span class="map-btn-diff" style="color:${accentHex};">${track.difficulty}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.selectedTrack = track.id;
        this.refreshShowroomUI();
        this.callbacks.onSelectTrack(track.id);
      });
      this.trackButtons.set(track.id, btn);
      mapStrip.appendChild(btn);
    });

    this.carTitleEl = this.titleScreen.querySelector(
      '#showroom-car-name',
    ) as HTMLElement;
    this.carCategoryEl = this.titleScreen.querySelector(
      '#showroom-car-cat',
    ) as HTMLElement;
    this.trackTitleEl = this.titleScreen.querySelector(
      '#showroom-track-name',
    ) as HTMLElement;
    this.barSpeedFill = this.titleScreen.querySelector(
      '#spec-speed-fill',
    ) as HTMLElement;
    this.barSpeedVal = this.titleScreen.querySelector(
      '#spec-speed-val',
    ) as HTMLElement;
    this.barAccelFill = this.titleScreen.querySelector(
      '#spec-accel-fill',
    ) as HTMLElement;
    this.barAccelVal = this.titleScreen.querySelector(
      '#spec-accel-val',
    ) as HTMLElement;
    this.barHandFill = this.titleScreen.querySelector(
      '#spec-hand-fill',
    ) as HTMLElement;
    this.barHandVal = this.titleScreen.querySelector(
      '#spec-hand-val',
    ) as HTMLElement;
    this.barNitroFill = this.titleScreen.querySelector(
      '#spec-nitro-fill',
    ) as HTMLElement;
    this.barNitroVal = this.titleScreen.querySelector(
      '#spec-nitro-val',
    ) as HTMLElement;

    // Bind Title Screen Rotate / Landscape Button
    this.titleScreen
      .querySelector('#title-rotate-btn')
      ?.addEventListener('click', () => {
        this.autoRotatePortrait = !this.autoRotatePortrait;
        void this.requestDeviceLandscape();
      });

    // Bind Prev/Next Car buttons
    this.titleScreen
      .querySelector('#title-prev-car-btn')
      ?.addEventListener('click', () => {
        this.selectedCarIdx =
          (this.selectedCarIdx - 1 + CAR_CATALOG.length) % CAR_CATALOG.length;
        this.refreshShowroomUI();
        this.callbacks.onSelectCar(this.selectedCarIdx);
      });
    this.titleScreen
      .querySelector('#title-next-car-btn')
      ?.addEventListener('click', () => {
        this.selectedCarIdx = (this.selectedCarIdx + 1) % CAR_CATALOG.length;
        this.refreshShowroomUI();
        this.callbacks.onSelectCar(this.selectedCarIdx);
      });

    // Bind Mode buttons
    this.titleScreen
      .querySelectorAll<HTMLButtonElement>('[data-mode]')
      .forEach((btn) => {
        const mid = btn.dataset.mode as GameModeId;
        this.modeBtns.set(mid, btn);
        btn.addEventListener('click', () => {
          this.selectedMode = mid;
          this.modeBtns.forEach((b, k) =>
            b.classList.toggle('active', k === mid),
          );
          this.callbacks.onSelectMode(mid);
        });
      });

    // Bind Controller buttons
    this.titleScreen
      .querySelectorAll<HTMLButtonElement>('[data-ctrl]')
      .forEach((btn) => {
        const cid = btn.dataset.ctrl as ControllerModeId;
        this.ctrlBtns.set(cid, btn);
        btn.addEventListener('click', () => {
          this.setControllerMode(cid);
        });
      });

    // Bind Start CTA
    const startBtn = this.titleScreen.querySelector(
      '#start-race-btn',
    ) as HTMLButtonElement;
    startBtn.addEventListener('click', () => {
      startBtn.blur();
      void this.requestDeviceLandscape();
      this.callbacks.onStartRace();
    });

    // 2. PLAYING HUD
    this.playingHud = document.createElement('section');
    this.playingHud.id = 'playing-hud';
    this.playingHud.setAttribute('aria-label', 'Active Race HUD');
    this.playingHud.innerHTML = `
      <div class="hud-top-bar">
        <!-- Cluster 1: Top-Left Race Telemetry -->
        <div class="hud-telemetry-card">
          <div class="hud-stat-block">
            <span class="hud-kicker">POS</span>
            <span id="hud-pos-val" class="hud-hero-val accent">1st/6</span>
          </div>
          <div class="hud-divider"></div>
          <div class="hud-stat-block">
            <span class="hud-kicker">LAP</span>
            <span id="hud-lap-val" class="hud-hero-val">1/3</span>
          </div>
          <div class="hud-divider"></div>
          <div class="hud-stat-block">
            <span class="hud-kicker">TIME</span>
            <span id="hud-time-val" class="hud-hero-val font-mono-num">00:00</span>
          </div>
          <div class="hud-divider"></div>
          <div class="hud-stat-block">
            <span class="hud-kicker">SCORE</span>
            <span id="hud-score-val" class="hud-hero-val tabular-nums">0</span>
          </div>
        </div>

        <!-- Cluster 2: Top-Right Utility Controls + Live Circuit Radar Map -->
        <div class="hud-right-cluster">
          <div class="hud-utility-row">
            <button id="hud-cam-btn" type="button" tabindex="-1" class="util-icon-btn" aria-label="Switch Camera View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span id="hud-cam-label">Chase</span>
            </button>
            <button id="hud-ctrl-btn" type="button" tabindex="-1" class="util-icon-btn" aria-label="Switch Steering Controller">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M12 14v7M4.5 9.5L10 11.5M19.5 9.5L14 11.5"/>
              </svg>
              <span id="hud-ctrl-label">Wheel</span>
            </button>
            <button id="hud-mute-btn" type="button" tabindex="-1" class="util-icon-btn" aria-label="Mute Audio">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
            <button id="hud-restart-btn" type="button" tabindex="-1" class="util-icon-btn" aria-label="Restart Race">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button id="hud-pause-btn" type="button" tabindex="-1" class="util-icon-btn" aria-label="Pause Game">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              <span class="util-btn-text">Pause</span>
            </button>
          </div>

          <div class="minimap-frame" aria-label="Live GPS Circuit Map">
            <div style="display:flex; justify-content:space-between; width:100%; padding:0 2px;">
              <span class="hud-kicker" style="font-size:8.5px;">LIVE GPS</span>
              <span id="hud-minimap-title" class="hud-kicker" style="font-size:8.5px; color:#10b981;">METRO GP</span>
            </div>
            <canvas id="live-minimap-canvas" width="136" height="136" data-testid="live-minimap"></canvas>
          </div>
        </div>
      </div>

      <!-- Bottom Bar: Left Mobile Steering Controller + Right Pedals & Speedometer -->
      <div class="hud-bottom-bar">
        <div class="steer-controller-zone">
          <!-- Mode 1: Virtual Steering Wheel -->
          <div id="ctrl-wheel-box" class="wheel-touch-area" role="slider" aria-label="Virtual Steering Wheel" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0">
            <svg id="virtual-wheel-svg" width="114" height="114" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="50" stroke="#CBD5E1" stroke-width="10"/>
              <path d="M52 10H68" stroke="#EF4444" stroke-width="10" stroke-linecap="round"/>
              <path d="M15 56H44M76 56H105M60 72V106" stroke="#94A3B8" stroke-width="9" stroke-linecap="round"/>
              <circle cx="60" cy="60" r="16" fill="#1E293B" stroke="#F59E0B" stroke-width="3"/>
            </svg>
          </div>

          <!-- Mode 2: Dual Touch Arrow Buttons -->
          <div id="ctrl-buttons-box" class="dpad-buttons-row" style="display:none;">
            <button id="steer-left-btn" type="button" tabindex="-1" class="steer-pad-btn" aria-label="Steer Left">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
              LEFT
            </button>
            <button id="steer-right-btn" type="button" tabindex="-1" class="steer-pad-btn" aria-label="Steer Right">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
              RIGHT
            </button>
          </div>

          <!-- Mode 3: Virtual Analog Thumbstick -->
          <div id="ctrl-joystick-box" class="joystick-base" style="display:none;" role="slider" aria-label="Virtual Joystick" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0">
            <div id="joystick-knob-el" class="joystick-knob"></div>
          </div>

          <!-- Mode 4: Tilt / Gyro Steer -->
          <div id="ctrl-tilt-box" class="tilt-steer-box" style="display:none;">
            <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:700; color:#f59e0b;">
              <span>TILT L</span>
              <span>GYRO STEER</span>
              <span>TILT R</span>
            </div>
            <input id="tilt-steer-slider" type="range" min="-100" max="100" value="0" aria-label="Tilt Steering Angle" style="width:100%; accent-color:#f59e0b; cursor:pointer;" />
          </div>
        </div>

        <!-- Right Cluster: Touch Action Pedals + Speedometer/Tachometer -->
        <div class="pedals-and-gauge-zone">
          <div class="action-pedals-grid">
            <button id="pedal-nitro-btn" type="button" tabindex="-1" class="pedal-btn nitro" aria-label="Activate Nitro Boost">
              <span>NITRO</span>
              <span class="pedal-sub">SPACE</span>
            </button>
            <button id="pedal-drift-btn" type="button" tabindex="-1" class="pedal-btn drift" aria-label="Hold Drift">
              <span>DRIFT</span>
              <span class="pedal-sub">SHIFT</span>
            </button>
            <button id="pedal-brake-btn" type="button" tabindex="-1" class="pedal-btn brake" aria-label="Brake or Reverse">
              <span>BRAKE</span>
              <span class="pedal-sub">S / DOWN</span>
            </button>
            <button id="pedal-gas-btn" type="button" tabindex="-1" class="pedal-btn gas" aria-label="Accelerate Gas">
              <span>GAS</span>
              <span class="pedal-sub">W / UP</span>
            </button>
          </div>

          <div class="speedo-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="hud-kicker">SPEED</div>
                <div style="display:flex; align-items:baseline; gap:4px;">
                  <span id="hud-speed-val" class="hud-hero-val font-mono-num" style="font-size:28px;">0</span>
                  <span style="font-size:10px; font-weight:700; color:#94a3b8;">KM/H</span>
                </div>
              </div>
              <div style="text-align:right;">
                <div class="hud-kicker">GEAR</div>
                <div id="hud-gear-val" class="font-display" style="font-size:24px; font-weight:700; color:#f59e0b;">1</div>
              </div>
            </div>

            <!-- SVG Tachometer RPM Bar -->
            <svg width="100%" height="12" viewBox="0 0 160 14">
              <rect x="0" y="2" width="160" height="10" rx="5" fill="#1E293B"/>
              <path id="hud-rpm-bar" d="M 0 7 L 20 7" stroke="#10B981" stroke-width="10" stroke-linecap="round"/>
            </svg>

            <!-- Nitro Boost Bar with Delayed Ghost Drain -->
            <div>
              <div style="display:flex; justify-content:space-between; font-size:9.5px; font-weight:700; color:#38bdf8; margin-bottom:2px;">
                <span>N2O BOOST</span>
                <span>READY</span>
              </div>
              <div style="position:relative; height:7px; background:#1e293b; border-radius:4px; overflow:hidden;">
                <div id="hud-nitro-ghost" style="position:absolute; left:0; top:0; bottom:0; width:100%; background:#fef08a; opacity:0.55; transition:width 220ms ease;"></div>
                <div id="hud-nitro-fill" style="position:relative; height:100%; width:100%; background:#06b6d4; border-radius:4px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    shell.appendChild(this.playingHud);

    this.posValEl = this.playingHud.querySelector('#hud-pos-val') as HTMLElement;
    this.lapValEl = this.playingHud.querySelector('#hud-lap-val') as HTMLElement;
    this.timeValEl = this.playingHud.querySelector('#hud-time-val') as HTMLElement;
    this.scoreValEl = this.playingHud.querySelector('#hud-score-val') as HTMLElement;
    this.speedValEl = this.playingHud.querySelector('#hud-speed-val') as HTMLElement;
    this.gearValEl = this.playingHud.querySelector('#hud-gear-val') as HTMLElement;
    this.rpmBarPath = this.playingHud.querySelector(
      '#hud-rpm-bar',
    ) as unknown as SVGPathElement;
    this.nitroFillEl = this.playingHud.querySelector(
      '#hud-nitro-fill',
    ) as HTMLElement;
    this.nitroGhostEl = this.playingHud.querySelector(
      '#hud-nitro-ghost',
    ) as HTMLElement;
    this.camBtnLabelEl = this.playingHud.querySelector(
      '#hud-cam-label',
    ) as HTMLElement;
    this.ctrlBtnLabelEl = this.playingHud.querySelector(
      '#hud-ctrl-label',
    ) as HTMLElement;
    this.muteBtnEl = this.playingHud.querySelector(
      '#hud-mute-btn',
    ) as HTMLButtonElement;
    this.minimapTitleEl = this.playingHud.querySelector(
      '#hud-minimap-title',
    ) as HTMLElement;
    this.minimapCanvas = this.playingHud.querySelector(
      '#live-minimap-canvas',
    ) as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.wheelContainer = this.playingHud.querySelector(
      '#ctrl-wheel-box',
    ) as HTMLElement;
    this.wheelSvgEl = this.playingHud.querySelector(
      '#virtual-wheel-svg',
    ) as unknown as SVGSVGElement;
    this.buttonsContainer = this.playingHud.querySelector(
      '#ctrl-buttons-box',
    ) as HTMLElement;
    this.joystickContainer = this.playingHud.querySelector(
      '#ctrl-joystick-box',
    ) as HTMLElement;
    this.joystickKnob = this.playingHud.querySelector(
      '#joystick-knob-el',
    ) as HTMLElement;
    this.tiltContainer = this.playingHud.querySelector(
      '#ctrl-tilt-box',
    ) as HTMLElement;
    this.tiltSliderInput = this.playingHud.querySelector(
      '#tilt-steer-slider',
    ) as HTMLInputElement;

    // 3. STATUS MODAL BACKDROP (Pause / Victory / Defeat)
    this.modalBackdrop = document.createElement('div');
    this.modalBackdrop.id = 'status-modal-backdrop';
    this.modalCard = document.createElement('div');
    this.modalCard.className = 'status-modal-card';
    this.modalBackdrop.appendChild(this.modalCard);
    shell.appendChild(this.modalBackdrop);
  }

  /**
   * Computes relative horizontal/vertical offset in (-1..1) from an element's center,
   * accounting for 90-degree CSS rotation when portrait-rotated is active.
   */
  private getRelativePointerOffsets(
    el: HTMLElement,
    clientX: number,
    clientY: number,
  ): { normX: number; normY: number } {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;

    if (this.isPortraitRotatedActive()) {
      // When rotated +90deg clockwise, landscape +X corresponds to screen +Y (rawDy)
      // and landscape +Y corresponds to screen -X (-rawDx)
      const halfSpan = Math.max(10, rect.height * 0.42);
      return {
        normX: Math.max(-1, Math.min(1, rawDy / halfSpan)),
        normY: Math.max(-1, Math.min(1, -rawDx / halfSpan)),
      };
    }

    const halfSpan = Math.max(10, rect.width * 0.42);
    return {
      normX: Math.max(-1, Math.min(1, rawDx / halfSpan)),
      normY: Math.max(-1, Math.min(1, rawDy / halfSpan)),
    };
  }

  private bindInputEvents(): void {
    window.addEventListener('resize', () => {
      this.syncLandscapeOrientationClass();
    });

    const camBtn = this.playingHud.querySelector(
      '#hud-cam-btn',
    ) as HTMLButtonElement;
    camBtn.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.callbacks.onCycleCamera();
    });

    const ctrlBtn = this.playingHud.querySelector(
      '#hud-ctrl-btn',
    ) as HTMLButtonElement;
    ctrlBtn.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      const order: ControllerModeId[] = [
        'wheel',
        'buttons',
        'joystick',
        'tilt',
      ];
      const next =
        order[(order.indexOf(this.selectedController) + 1) % order.length];
      this.setControllerMode(next);
    });

    this.muteBtnEl.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      const muted = this.callbacks.onToggleMute();
      this.muteBtnEl.innerHTML = muted
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    });

    const restartBtn = this.playingHud.querySelector(
      '#hud-restart-btn',
    ) as HTMLButtonElement;
    restartBtn.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.callbacks.onRestartRace();
    });

    const pauseBtn = this.playingHud.querySelector(
      '#hud-pause-btn',
    ) as HTMLButtonElement;
    pauseBtn.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.pendingPausePress = true;
    });

    // Touch Pedals (Gas, Brake, Nitro, Drift)
    const bindHoldButton = (
      selector: string,
      onChange: (held: boolean) => void,
    ) => {
      const el = this.playingHud.querySelector(selector) as HTMLButtonElement;
      if (!el) return;
      const start = (e: Event) => {
        e.preventDefault();
        el.classList.add('pressed');
        onChange(true);
      };
      const end = (e: Event) => {
        e.preventDefault();
        el.classList.remove('pressed');
        onChange(false);
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('pointercancel', end);
    };

    bindHoldButton('#pedal-gas-btn', (held) => {
      this.touchThrottle = held ? 1 : 0;
    });
    bindHoldButton('#pedal-brake-btn', (held) => {
      this.touchBrake = held ? 1 : 0;
    });
    bindHoldButton('#pedal-nitro-btn', (held) => {
      this.touchNitro = held;
    });
    bindHoldButton('#pedal-drift-btn', (held) => {
      this.touchDrift = held;
    });

    // Mode 2: Steer Left/Right Buttons
    let leftBtnHeld = false;
    let rightBtnHeld = false;
    const updateBtnSteer = () => {
      this.touchSteer = (rightBtnHeld ? 1 : 0) - (leftBtnHeld ? 1 : 0);
    };
    bindHoldButton('#steer-left-btn', (held) => {
      leftBtnHeld = held;
      updateBtnSteer();
    });
    bindHoldButton('#steer-right-btn', (held) => {
      rightBtnHeld = held;
      updateBtnSteer();
    });

    // Mode 1: Virtual Steering Wheel Drag
    let wheelDragging = false;
    const updateWheelFromPointer = (clientX: number, clientY: number) => {
      const { normX } = this.getRelativePointerOffsets(
        this.wheelContainer,
        clientX,
        clientY,
      );
      this.touchSteer = normX;
    };
    this.wheelContainer.addEventListener('pointerdown', (e) => {
      wheelDragging = true;
      this.wheelContainer.setPointerCapture(e.pointerId);
      updateWheelFromPointer(e.clientX, e.clientY);
    });
    this.wheelContainer.addEventListener('pointermove', (e) => {
      if (!wheelDragging) return;
      updateWheelFromPointer(e.clientX, e.clientY);
    });
    const endWheel = () => {
      wheelDragging = false;
      this.touchSteer = 0;
    };
    this.wheelContainer.addEventListener('pointerup', endWheel);
    this.wheelContainer.addEventListener('pointercancel', endWheel);

    // Mode 3: Virtual Joystick Drag
    let joyDragging = false;
    const updateJoystickFromPointer = (clientX: number, clientY: number) => {
      const { normX, normY } = this.getRelativePointerOffsets(
        this.joystickContainer,
        clientX,
        clientY,
      );
      const maxPx = 32;
      const dist = Math.hypot(normX, normY);
      const scale = dist > 1 ? 1 / dist : 1;
      const clampedX = normX * scale;
      const clampedY = normY * scale;
      this.joystickKnob.style.transform = `translate(${(clampedX * maxPx).toFixed(1)}px, ${(clampedY * maxPx).toFixed(1)}px)`;
      this.touchSteer = Math.max(-1, Math.min(1, clampedX));
    };
    this.joystickContainer.addEventListener('pointerdown', (e) => {
      joyDragging = true;
      this.joystickContainer.setPointerCapture(e.pointerId);
      updateJoystickFromPointer(e.clientX, e.clientY);
    });
    this.joystickContainer.addEventListener('pointermove', (e) => {
      if (!joyDragging) return;
      updateJoystickFromPointer(e.clientX, e.clientY);
    });
    const endJoy = () => {
      joyDragging = false;
      this.touchSteer = 0;
      this.joystickKnob.style.transform = 'translate(0px, 0px)';
    };
    this.joystickContainer.addEventListener('pointerup', endJoy);
    this.joystickContainer.addEventListener('pointercancel', endJoy);

    // Mode 4: Tilt / Gyro Slider & DeviceOrientation
    this.tiltSliderInput.addEventListener('input', () => {
      this.gyroSteer = Number(this.tiltSliderInput.value) / 100;
    });
    window.addEventListener('deviceorientation', (e) => {
      if (this.selectedController === 'tilt' && typeof e.gamma === 'number') {
        const clamped = Math.max(-35, Math.min(35, e.gamma));
        this.gyroSteer = clamped / 35;
        this.tiltSliderInput.value = String(Math.round(this.gyroSteer * 100));
      }
    });

    // Keyboard Listeners on window
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const state = document.body.dataset.state as GameState;

      if (state === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        this.callbacks.onStartRace();
        return;
      }

      if (!this.keysHeld.has(code)) {
        if (code === 'KeyC') this.pendingCameraPress = true;
        if (code === 'KeyP' || code === 'Escape') this.pendingPausePress = true;
        if (code === 'KeyR') this.pendingRestartPress = true;
        if (code === 'KeyM') this.pendingMutePress = true;
      }
      this.keysHeld.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    const clearInputs = () => {
      this.keysHeld.clear();
      this.touchThrottle = 0;
      this.touchBrake = 0;
      this.touchSteer = 0;
      this.touchNitro = false;
      this.touchDrift = false;
    };
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInputs();
    });
  }

  setControllerMode(ctrlId: ControllerModeId): void {
    this.selectedController = ctrlId;
    this.ctrlBtns.forEach((b, k) => b.classList.toggle('active', k === ctrlId));
    this.refreshControllerModeUI();
    this.callbacks.onSelectController(ctrlId);
  }

  private refreshControllerModeUI(): void {
    const labels: Record<ControllerModeId, string> = {
      wheel: 'Wheel',
      buttons: 'Buttons',
      joystick: 'Joystick',
      tilt: 'Tilt',
    };
    if (this.ctrlBtnLabelEl) {
      this.ctrlBtnLabelEl.textContent = labels[this.selectedController];
    }
    this.wheelContainer.style.display =
      this.selectedController === 'wheel' ? 'flex' : 'none';
    this.buttonsContainer.style.display =
      this.selectedController === 'buttons' ? 'flex' : 'none';
    this.joystickContainer.style.display =
      this.selectedController === 'joystick' ? 'flex' : 'none';
    this.tiltContainer.style.display =
      this.selectedController === 'tilt' ? 'flex' : 'none';
  }

  refreshShowroomUI(): void {
    const car: CarSpec = CAR_CATALOG[this.selectedCarIdx];
    const track: TrackSpec = TRACK_CATALOG[this.selectedTrack];

    this.carTitleEl.textContent = car.name;
    this.carCategoryEl.textContent = car.category;
    this.trackTitleEl.textContent = `${track.name} — ${track.subtitle}`;
    if (this.minimapTitleEl) {
      this.minimapTitleEl.textContent = track.shortName.toUpperCase();
    }

    this.carButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === this.selectedCarIdx);
    });

    this.trackButtons.forEach((btn, tid) => {
      btn.classList.toggle('active', tid === this.selectedTrack);
    });

    const speedPct = Math.round(((car.topSpeedKmh - 240) / 115) * 100);
    const accelPct = Math.round((car.accelRate / 36) * 100);
    const handPct = Math.round((car.handling / 1.6) * 100);
    const nitroPct = Math.round(((car.nitroBoost - 1.1) / 0.36) * 100);

    this.barSpeedVal.textContent = `${car.topSpeedKmh} KM/H`;
    this.barSpeedFill.style.width = `${Math.min(100, Math.max(20, speedPct))}%`;

    this.barAccelVal.textContent = `${accelPct}`;
    this.barAccelFill.style.width = `${Math.min(100, Math.max(20, accelPct))}%`;

    this.barHandVal.textContent = `${handPct}`;
    this.barHandFill.style.width = `${Math.min(100, Math.max(20, handPct))}%`;

    this.barNitroVal.textContent = `${nitroPct}`;
    this.barNitroFill.style.width = `${Math.min(100, Math.max(20, nitroPct))}%`;
  }

  setGameState(state: GameState): void {
    document.body.dataset.state = state;
    this.titleScreen.style.display = state === 'title' ? 'flex' : 'none';
    this.playingHud.style.display =
      state === 'playing' || state === 'paused' ? 'flex' : 'none';
    this.modalBackdrop.style.display =
      state === 'paused' || state === 'gameover' ? 'flex' : 'none';

    if (state === 'playing') {
      this.keysHeld.clear();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }

  updateCameraLabel(camMode: CameraModeId): void {
    const names: Record<CameraModeId, string> = {
      chase: 'Chase',
      cockpit: 'Cockpit',
      far: 'Action',
      heli: 'Heli TV',
    };
    this.camBtnLabelEl.textContent = names[camMode];
  }

  sampleControlInput(): ControlInputState {
    const kbThrottle =
      this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp') ? 1 : 0;
    const kbBrake =
      this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown') ? 1 : 0;
    const kbLeft =
      this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft') ? 1 : 0;
    const kbRight =
      this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight') ? 1 : 0;
    const kbSteer = kbRight - kbLeft;

    let steer = kbSteer !== 0 ? kbSteer : this.touchSteer;
    if (
      this.selectedController === 'tilt' &&
      kbSteer === 0 &&
      this.touchSteer === 0
    ) {
      steer = this.gyroSteer;
    }

    const throttle = Math.max(kbThrottle, this.touchThrottle);
    const brake = Math.max(kbBrake, this.touchBrake);
    const nitroHeld =
      this.keysHeld.has('Space') ||
      this.keysHeld.has('KeyN') ||
      this.touchNitro;
    const driftHeld =
      this.keysHeld.has('ShiftLeft') ||
      this.keysHeld.has('ShiftRight') ||
      this.touchDrift;

    const input: ControlInputState = {
      throttle,
      brake,
      steer: Math.max(-1, Math.min(1, steer)),
      driftHeld,
      nitroHeld,
      cameraJustPressed: this.pendingCameraPress,
      pauseJustPressed: this.pendingPausePress,
      restartJustPressed: this.pendingRestartPress,
      muteJustPressed: this.pendingMutePress,
    };

    this.pendingCameraPress = false;
    this.pendingPausePress = false;
    this.pendingRestartPress = false;
    this.pendingMutePress = false;

    return input;
  }

  updatePlayingHud(params: {
    player: VehiclePhysicsState;
    rivals: RivalState[];
    waypoints: Waypoint2D[];
    position: number;
    totalRacers: number;
    totalLaps: number;
    elapsedSec: number;
    score: number;
  }): void {
    const {
      player,
      rivals,
      waypoints,
      position,
      totalRacers,
      totalLaps,
      elapsedSec,
      score,
    } = params;

    this.posValEl.textContent = `${ordinalSuffix(position)}/${totalRacers}`;
    this.lapValEl.textContent = `${Math.min(player.lap, totalLaps)}/${totalLaps}`;
    this.timeValEl.textContent = formatTimeSec(elapsedSec);
    this.scoreValEl.textContent = `${Math.round(score)}`;

    const speedKmh = Math.round(Math.abs(player.speed) * 3.6);
    this.speedValEl.textContent = `${speedKmh}`;
    this.gearValEl.textContent = player.speed < -1 ? 'R' : `${player.gear}`;

    const rpmNorm = Math.max(0.08, Math.min(1, (player.rpm - 1000) / 8000));
    const endX = (rpmNorm * 160).toFixed(1);
    this.rpmBarPath.setAttribute('d', `M 0 7 L ${endX} 7`);
    this.rpmBarPath.setAttribute(
      'stroke',
      rpmNorm > 0.85 ? '#EF4444' : rpmNorm > 0.65 ? '#F59E0B' : '#10B981',
    );

    const nitroPct = Math.round(player.nitro);
    this.nitroFillEl.style.width = `${nitroPct}%`;
    this.nitroGhostValue += (player.nitro - this.nitroGhostValue) * 0.08;
    this.nitroGhostEl.style.width = `${Math.round(this.nitroGhostValue)}%`;

    const deg = Math.round(player.steerAngle * 115);
    this.wheelSvgEl.style.transform = `rotate(${deg}deg)`;

    this.damageVignette.style.opacity = player.damageFlash.toFixed(2);

    this.renderMinimap(waypoints, player, rivals);
  }

  private renderMinimap(
    waypoints: Waypoint2D[],
    player: VehiclePhysicsState,
    rivals: RivalState[],
  ): void {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const spanX = Math.max(1, this.mapMaxX - this.mapMinX);
    const spanZ = Math.max(1, this.mapMaxZ - this.mapMinZ);

    const toMapX = (wx: number) =>
      (1 - (wx - this.mapMinX) / spanX) * (w - 16) + 8;
    const toMapY = (wz: number) =>
      (1 - (wz - this.mapMinZ) / spanZ) * (h - 16) + 8;

    const trackAccent = hexToCss(
      TRACK_CATALOG[this.selectedTrack].archAccentColor,
    );

    ctx.beginPath();
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const mx = toMapX(wp.x);
      const my = toMapY(wp.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.strokeStyle = trackAccent;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    if (waypoints.length > 0) {
      const sx = toMapX(waypoints[0].x);
      const sy = toMapY(waypoints[0].z);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
    }

    for (const r of rivals) {
      const rx = toMapX(r.x);
      const ry = toMapY(r.z);
      ctx.beginPath();
      ctx.arc(rx, ry, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = hexToCss(r.carSpec.primaryColor);
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const px = toMapX(player.x);
    const py = toMapY(player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-player.heading);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 5.5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 5.5);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  showPauseModal(): void {
    this.setGameState('paused');
    const car = CAR_CATALOG[this.selectedCarIdx];
    const track = TRACK_CATALOG[this.selectedTrack];
    const mode = GAME_MODE_CATALOG[this.selectedMode];

    this.modalCard.innerHTML = `
      <div>
        <div class="hud-kicker" style="color:#f59e0b;">RACE PAUSED</div>
        <h2 class="font-display" style="margin:4px 0 0; font-size:26px; color:#f8fafc;">PIT WALL MENU</h2>
      </div>

      <div class="modal-stat-grid">
        <div class="modal-stat-tile">
          <span class="hud-kicker">VEHICLE</span>
          <span style="font-size:13px; font-weight:700; color:#f8fafc;">${car.name}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">CIRCUIT</span>
          <span style="font-size:13px; font-weight:700; color:#f8fafc;">${track.name}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">MODE</span>
          <span style="font-size:13px; font-weight:700; color:#f8fafc;">${mode.name}</span>
        </div>
      </div>

      <div class="modal-btn-row">
        <button id="modal-resume-btn" type="button" class="start-cta-btn" style="height:48px; font-size:17px;">
          RESUME RACE
        </button>
        <button id="modal-restart-btn" type="button" class="modal-secondary-btn">
          Restart Current Race
        </button>
        <button id="modal-garage-btn" type="button" class="modal-secondary-btn">
          Change Car / Map (Garage)
        </button>
      </div>
    `;

    this.modalCard
      .querySelector('#modal-resume-btn')
      ?.addEventListener('click', () => this.callbacks.onResumeRace());
    this.modalCard
      .querySelector('#modal-restart-btn')
      ?.addEventListener('click', () => this.callbacks.onRestartRace());
    this.modalCard
      .querySelector('#modal-garage-btn')
      ?.addEventListener('click', () => this.callbacks.onReturnToTitle());
  }

  showGameOverModal(snapshot: RaceRunSnapshot): void {
    this.setGameState('gameover');
    const isWin = snapshot.outcome === 'victory';

    this.modalCard.innerHTML = `
      <div>
        <div class="hud-kicker" style="color:${isWin ? '#10b981' : '#ef4444'};">
          ${isWin ? 'CHECKERED FLAG · PODIUM FINISH' : 'RACE COMPLETE'}
        </div>
        <h2 class="font-display" style="margin:4px 0 2px; font-size:28px; color:#f8fafc;">
          ${snapshot.title}
        </h2>
        <div style="font-size:13px; color:#94a3b8;">${snapshot.subtitle}</div>
      </div>

      <div class="modal-stat-grid">
        <div class="modal-stat-tile">
          <span class="hud-kicker">POSITION</span>
          <span class="hud-hero-val accent tabular-nums">${ordinalSuffix(snapshot.position)}/${snapshot.totalRacers}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">RACE TIME</span>
          <span class="hud-hero-val font-mono-num">${formatTimeSec(snapshot.totalTimeSec)}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">TOP SPEED</span>
          <span class="hud-hero-val tabular-nums">${snapshot.topSpeedReachedKmh} <small style="font-size:11px;">KM/H</small></span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">DRIFT PTS</span>
          <span class="hud-hero-val tabular-nums">${snapshot.driftPoints}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">SCORE</span>
          <span class="hud-hero-val tabular-nums" style="color:#10b981;">${snapshot.score}</span>
        </div>
        <div class="modal-stat-tile">
          <span class="hud-kicker">BEST SCORE</span>
          <span class="hud-hero-val tabular-nums">${snapshot.bestScore}</span>
        </div>
      </div>

      <div class="modal-btn-row">
        <button id="modal-play-again-btn" type="button" data-start="true" class="start-cta-btn" style="height:50px; font-size:18px;">
          RACE AGAIN
        </button>
        <button id="modal-change-car-btn" type="button" class="modal-secondary-btn">
          Car Garage & Map Selection
        </button>
      </div>
    `;

    this.modalCard
      .querySelector('#modal-play-again-btn')
      ?.addEventListener('click', () => this.callbacks.onRestartRace());
    this.modalCard
      .querySelector('#modal-change-car-btn')
      ?.addEventListener('click', () => this.callbacks.onReturnToTitle());
  }
}
