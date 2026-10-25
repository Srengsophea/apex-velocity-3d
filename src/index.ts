import * as THREE from 'three';
import * as xb from 'xrblocks';

import { ProceduralAudioEngine } from './game/audio';
import {
  BuiltCarRig,
  applyCarDamage,
  buildRealisticCar,
  resetCarDamage,
} from './game/carBuilder';
import { PooledParticleSystem } from './game/particles';
import {
  CAR_CATALOG,
  GAME_MODE_CATALOG,
  TRACK_CATALOG,
  buildTrackWaypoints,
  calculateFinalRaceScore,
  computeRaceStandings,
  createInitialPlayerState,
  createRivals,
  projectOntoTrack,
  resolveVehicleCollision,
  stepPlayerVehicle,
  stepRivalVehicle,
} from './game/rules';
import {
  CameraModeId,
  ControllerModeId,
  GameModeId,
  GameState,
  RaceRunSnapshot,
  RivalState,
  TrackId,
  VehiclePhysicsState,
  Waypoint2D,
} from './game/types';
import {
  WorldEnvironmentRefs,
  buildRacingWorld,
  createOutdoorEnvironment,
  updateSunLightFollow,
} from './game/worldBuilder';
import { GameShellUI } from './ui/hud';

export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return true;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Pre-allocated scratch vectors to ensure zero GC inside the per-frame loop
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.2, 12);

class ApexVelocityRacingScript extends xb.Script {
  private waypoints: Waypoint2D[] = [];
  private totalTrackLength = 1000;
  private worldRefs!: WorldEnvironmentRefs;
  private particles!: PooledParticleSystem;
  private audio = new ProceduralAudioEngine();
  private hud!: GameShellUI;

  private gameState: GameState = 'title';
  private selectedCarIndex = 0;
  private selectedTrackId: TrackId = 'city_day';
  private selectedModeId: GameModeId = 'grand_prix';
  private selectedControllerId: ControllerModeId = 'wheel';
  private cameraMode: CameraModeId = 'chase';

  private playerState!: VehiclePhysicsState;
  private playerCarRig!: BuiltCarRig;

  private rivals: RivalState[] = [];
  private rivalRigs: BuiltCarRig[] = [];

  // Telemetry & juice state
  private elapsedRaceSec = 0;
  private bestLapSec = 0;
  private currentLapStartSec = 0;
  private topSpeedReachedKmh = 0;
  private bestScore = 8450;
  private overtakesCount = 0;
  private lastKnownPosition = 6;
  private lastGear = 1;

  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private titleOrbitAngle = 0;
  private particleSpawnAccum = 0;

  // Spatial 3D Gantry Telemetry Card (XR Blocks UI)
  private gantryCard?: xb.UICard;
  private gantryStatusText?: xb.UIText;
  private gantrySpeedText?: xb.UIText;

  init(): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const scene = xb.core.scene;
    const camera = xb.core.camera as THREE.PerspectiveCamera;

    // 1. Configure Physical Renderer & Studio Environment Reflection
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    camera.fov = 60;
    camera.near = 0.25;
    camera.far = 960;
    camera.updateProjectionMatrix();

    // 2. Build Closed-Loop Circuit & 3D World for initial map
    const initialTrackSpec = TRACK_CATALOG[this.selectedTrackId];
    scene.environment = createOutdoorEnvironment(renderer, initialTrackSpec);
    scene.environmentIntensity = 1.0;
    const trackData = buildTrackWaypoints(initialTrackSpec.controlPoints, 22);
    this.waypoints = trackData.waypoints;
    this.totalTrackLength = trackData.totalLength;

    const maxAnisotropy = renderer.capabilities?.getMaxAnisotropy?.() || 1;
    this.worldRefs = buildRacingWorld(
      scene,
      this.waypoints,
      this.totalTrackLength,
      initialTrackSpec,
      maxAnisotropy,
      isSoftwareGl,
    );

    this.particles = new PooledParticleSystem(scene);

    // 3. Add Spatial 3D Pit-Wall Telemetry Card on the Starting Gantry
    this.createGantrySpatialCard();

    // 4. Spawn Initial Player Car & Rivals
    this.rebuildPlayerCar(0);
    this.resetRaceEntities();

    // 5. Mount World-Matched Game Shell UI
    this.hud = new GameShellUI(
      {
        onSelectCar: (idx) => {
          this.selectedCarIndex = idx;
          this.rebuildPlayerCar(idx);
        },
        onSelectTrack: (trackId) => {
          this.selectTrackAndRebuild(trackId);
        },
        onSelectMode: (modeId) => {
          this.selectedModeId = modeId;
          this.resetRaceEntities();
        },
        onSelectController: (ctrlId) => {
          this.selectedControllerId = ctrlId;
        },
        onStartRace: () => this.startRace(),
        onResumeRace: () => this.resumeRace(),
        onRestartRace: () => this.startRace(),
        onReturnToTitle: () => this.returnToTitle(),
        onCycleCamera: () => this.cycleCamera(),
        onToggleMute: () => this.audio.toggleMute(),
        onOrientationChange: () => this.syncViewportOrientation(),
      },
      this.waypoints,
    );

    this.syncViewportOrientation();

    // Support ?autostart=1 for instant gameplay entry
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.startRace();
    } else {
      this.returnToTitle();
    }
  }

  private syncViewportOrientation(): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const camera = xb.core.camera as THREE.PerspectiveCamera;
    if (!renderer || !camera) return;

    renderer.domElement.classList.add('webgl-main-canvas');

    const applySize = () => {
      const isPortraitRotated = document.body.classList.contains('portrait-rotated');
      const effW = isPortraitRotated ? window.innerHeight : window.innerWidth;
      const effH = isPortraitRotated ? window.innerWidth : window.innerHeight;

      if (effW > 0 && effH > 0) {
        renderer.setSize(effW, effH, false);
        camera.aspect = effW / effH;
        camera.updateProjectionMatrix();
      }
    };

    applySize();
    window.setTimeout(applySize, 30);
  }

  private selectTrackAndRebuild(trackId: TrackId): void {
    this.selectedTrackId = trackId;
    const spec = TRACK_CATALOG[trackId];
    const trackData = buildTrackWaypoints(spec.controlPoints, 22);
    this.waypoints = trackData.waypoints;
    this.totalTrackLength = trackData.totalLength;

    this.worldRefs.rebuildForTrack(spec, this.waypoints, this.totalTrackLength);
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    xb.core.scene.environment = createOutdoorEnvironment(renderer, spec);
    this.hud.updateWaypoints(this.waypoints);
    this.updateGantryCardPlacement(spec.shortName);
    this.resetRaceEntities();
  }

  private createGantrySpatialCard(): void {
    if (xb.core.user) {
      xb.core.user.visible = false;
    }
    this.gantryStatusText = new xb.UIText({
      text: 'METRO GP · LIVE TIMING',
      pointerEvents: 'none',
      style: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#f59e0b',
        textAlign: 'center',
      },
    });
    this.gantrySpeedText = new xb.UIText({
      text: 'GRID READY · 6 RACERS',
      pointerEvents: 'none',
      style: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#f8fafc',
        textAlign: 'center',
      },
    });

    this.gantryCard = new xb.UICard({
      size: { width: 3.8, height: 0.76 },
      pixelSize: 0.003,
      pointerEvents: 'none',
      style: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        padding: 10,
        backgroundColor: '#090d16',
        borderRadius: 10,
      },
      children: [this.gantryStatusText, this.gantrySpeedText],
    });
    this.updateGantryCardPlacement(TRACK_CATALOG[this.selectedTrackId].shortName);
    this.add(this.gantryCard);
  }

  private updateGantryCardPlacement(shortTrackName: string): void {
    if (!this.gantryCard) return;
    const gantryWp = this.waypoints[2] || this.waypoints[0];
    this.gantryCard.position.set(gantryWp.x, 7.25, gantryWp.z - 0.55);
    this.gantryCard.rotation.y = Math.atan2(gantryWp.tx, gantryWp.tz) + Math.PI;
    if (this.gantryStatusText) {
      this.gantryStatusText.text = `${shortTrackName.toUpperCase()} · LIVE TIMING`;
    }
  }

  private rebuildPlayerCar(carIdx: number): void {
    if (this.playerCarRig) {
      this.remove(this.playerCarRig.root);
    }
    const spec = CAR_CATALOG[carIdx] || CAR_CATALOG[0];
    this.playerCarRig = buildRealisticCar(spec, false);
    if (this.playerState) {
      this.playerCarRig.root.position.set(
        this.playerState.x,
        this.gameState === 'title' ? 0.14 : 0,
        this.playerState.z,
      );
      this.playerCarRig.root.rotation.y = this.playerState.heading;
    }
    this.add(this.playerCarRig.root);
  }

  private resetRaceEntities(): void {
    const carSpec = CAR_CATALOG[this.selectedCarIndex];
    this.playerState = createInitialPlayerState(carSpec);
    const startWp = this.waypoints[0];
    this.playerState.x = startWp.x;
    this.playerState.z = startWp.z;
    this.playerState.heading = Math.atan2(startWp.tx, startWp.tz);

    resetCarDamage(this.playerCarRig);

    this.playerCarRig.root.position.set(
      this.playerState.x,
      this.gameState === 'title' ? 0.14 : 0,
      this.playerState.z,
    );
    this.playerCarRig.root.rotation.y = this.playerState.heading;

    // Clear old rival meshes
    for (const rig of this.rivalRigs) {
      this.remove(rig.root);
    }
    this.rivalRigs = [];

    const modeSpec = GAME_MODE_CATALOG[this.selectedModeId];
    this.rivals = createRivals(
      carSpec.id,
      modeSpec.rivalCount,
      this.waypoints,
      this.totalTrackLength,
    );

    for (const r of this.rivals) {
      const rig = buildRealisticCar(r.carSpec, true);
      rig.root.position.set(r.x, 0, r.z);
      rig.root.rotation.y = r.heading;
      this.rivalRigs.push(rig);
      this.add(rig.root);
    }

    this.elapsedRaceSec = 0;
    this.bestLapSec = 0;
    this.currentLapStartSec = 0;
    this.topSpeedReachedKmh = 0;
    this.overtakesCount = 0;
    this.lastKnownPosition = this.rivals.length + 1;
    this.lastGear = 1;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
  }

  private startRace(): void {
    this.gameState = 'playing';
    this.worldRefs.showroomPodium.visible = false;
    this.resetRaceEntities();
    this.hud.setGameState('playing');
    this.audio.startEngineLoop();

    // Immediately snap camera behind player car on race start
    const sinH = Math.sin(this.playerState.heading);
    const cosH = Math.cos(this.playerState.heading);
    const cam = xb.core.camera as THREE.PerspectiveCamera;
    cam.position.set(
      this.playerState.x - sinH * 6.8,
      2.55,
      this.playerState.z - cosH * 6.8,
    );
    _currentLookAt.set(
      this.playerState.x + sinH * 8,
      1.1,
      this.playerState.z + cosH * 8,
    );
    cam.lookAt(_currentLookAt);
  }

  private resumeRace(): void {
    if (this.gameState !== 'paused') return;
    this.gameState = 'playing';
    this.hud.setGameState('playing');
  }

  private returnToTitle(): void {
    this.gameState = 'title';
    this.worldRefs.showroomPodium.visible = true;
    this.resetRaceEntities();
    this.hud.setGameState('title');
    this.audio.updateEngine(1200, false, false, true);
  }

  private cycleCamera(): void {
    const order: CameraModeId[] = ['chase', 'cockpit', 'far', 'heli'];
    this.cameraMode = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.hud.updateCameraLabel(this.cameraMode);
  }

  override update(): void {
    const rawDt = xb.getDeltaTime();
    const dt = Math.min(Math.max(rawDt || 0.016, 0.001), 0.05);

    if (document.body.classList.contains('portrait-rotated')) {
      const renderer = xb.core.renderer as THREE.WebGLRenderer;
      const targetW = window.innerHeight;
      const targetH = window.innerWidth;
      if (
        renderer.domElement.width !==
        Math.floor(targetW * renderer.getPixelRatio())
      ) {
        this.syncViewportOrientation();
      }
    }

    const input = this.hud.sampleControlInput();

    if (input.muteJustPressed) {
      this.audio.toggleMute();
    }

    if (this.gameState === 'title') {
      this.updateTitleShowroomCamera(dt);
      return;
    }

    if (input.pauseJustPressed) {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
        this.hud.showPauseModal();
        this.audio.updateEngine(1200, false, false, true);
        return;
      } else if (this.gameState === 'paused') {
        this.resumeRace();
        return;
      }
    }

    if (input.restartJustPressed && this.gameState === 'playing') {
      this.startRace();
      return;
    }

    if (input.cameraJustPressed && this.gameState === 'playing') {
      this.cycleCamera();
    }

    if (this.gameState !== 'playing') {
      return;
    }

    // Hitstop freeze on heavy collisions (rendering & camera shake continue in real dt)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateGameplayCamera(dt);
      this.particles.update(dt);
      return;
    }

    this.elapsedRaceSec += dt;

    const carSpec = CAR_CATALOG[this.selectedCarIndex];
    const trackSpec = TRACK_CATALOG[this.selectedTrackId];
    const modeSpec = GAME_MODE_CATALOG[this.selectedModeId];

    const stepResult = stepPlayerVehicle(
      this.playerState,
      input,
      carSpec,
      this.waypoints,
      this.totalTrackLength,
      trackSpec.roadWidth,
      dt,
      this.selectedModeId === 'time_trial',
    );

    if (this.playerState.gear !== this.lastGear) {
      this.lastGear = this.playerState.gear;
      this.audio.playShift();
    }

    const currentKmh = Math.round(Math.abs(this.playerState.speed) * 3.6);
    if (currentKmh > this.topSpeedReachedKmh) {
      this.topSpeedReachedKmh = currentKmh;
    }

    // Follow player car with sunlight and high-resolution shadow frustum
    updateSunLightFollow(
      this.worldRefs.sunLight,
      this.playerState.x,
      this.playerState.z,
      trackSpec,
    );

    if (stepResult.hitBarrier && this.playerState.speed > 6) {
      const scrapeIntensity = Math.min(1.0, this.playerState.speed / 48);
      this.audio.playGuardrailScrape(scrapeIntensity);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + scrapeIntensity * 0.28);

      const proj = projectOntoTrack(
        this.playerState.x,
        this.playerState.z,
        this.waypoints,
      );
      this.particles.spawnGuardrailSparks(
        this.playerState.x,
        0.42,
        this.playerState.z,
        proj.waypoint.tx,
        proj.waypoint.tz,
        this.playerState.speed,
      );

      const side = stepResult.barrierSide || 1;
      const impactPoint = new THREE.Vector3(side * 0.95, 0.35, 0.4);
      applyCarDamage(this.playerCarRig, impactPoint, scrapeIntensity * 0.45);

      if (this.playerState.speed > 35) {
        this.particles.spawnCrashDebrisBurst(
          this.playerState.x,
          0.5,
          this.playerState.z,
          -proj.waypoint.nx * side,
          -proj.waypoint.nz * side,
          scrapeIntensity,
        );
      }
    }

    if (stepResult.crossedLap) {
      const lapDuration = this.elapsedRaceSec - this.currentLapStartSec;
      this.currentLapStartSec = this.elapsedRaceSec;
      if (this.bestLapSec === 0 || lapDuration < this.bestLapSec) {
        this.bestLapSec = lapDuration;
      }
      this.audio.playLapChime();

      if (this.playerState.lap > modeSpec.totalLaps) {
        this.finishRace();
        return;
      }
    }

    // Step AI Rivals & Resolve Collisions
    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];
      stepRivalVehicle(
        rival,
        this.playerState,
        this.waypoints,
        this.totalTrackLength,
        trackSpec.roadWidth,
        this.elapsedRaceSec,
        dt,
      );

      const col = resolveVehicleCollision(
        this.playerState,
        rival,
        this.waypoints,
        this.totalTrackLength,
        trackSpec.roadWidth,
      );

      if (col.collided) {
        if (col.isSideScrape) {
          // Smooth 60 FPS door-to-door grinding: NO HITSTOP!
          this.cameraTrauma = Math.min(0.24, this.cameraTrauma + 0.02);
          this.audio.playGuardrailScrape(0.5);

          const contactX = col.contactPointX ?? (this.playerState.x + rival.x) * 0.5;
          const contactZ = col.contactPointZ ?? (this.playerState.z + rival.z) * 0.5;
          const playerForwardX = Math.sin(this.playerState.heading);
          const playerForwardZ = Math.cos(this.playerState.heading);
          this.particles.spawnGuardrailSparks(
            contactX,
            0.42,
            contactZ,
            playerForwardX * this.playerState.speed,
            playerForwardZ * this.playerState.speed,
            5,
          );

          // Side paint scuff only (no vertex crumple deformation)
          const relX = rival.x - this.playerState.x;
          const relZ = rival.z - this.playerState.z;
          const playerRightX = Math.cos(this.playerState.heading);
          const playerRightZ = -Math.sin(this.playerState.heading);
          const localX = relX * playerRightX + relZ * playerRightZ;
          applyCarDamage(
            this.playerCarRig,
            new THREE.Vector3(Math.sign(localX || 1) * 0.95, 0.35, 0),
            0.2,
            undefined,
            true,
          );
          applyCarDamage(
            this.rivalRigs[i],
            new THREE.Vector3(-Math.sign(localX || 1) * 0.95, 0.35, 0),
            0.2,
            undefined,
            true,
          );
        } else {
          // Heavy or bumper collision:
          // Trigger punchy hitstop, crash audio, camera thud, and debris burst on fresh impact
          const isFreshImpact = this.playerState.invulnTimer >= 0.28;
          if (isFreshImpact) {
            // Crisp arcade hitstop: 10ms to 18ms (punchy feedback, NO 45ms stuttering!)
            this.hitstopTimer = Math.min(0.018, 0.008 + col.impactSeverity * 0.010);
            this.cameraTrauma = Math.min(
              0.45,
              this.cameraTrauma + col.impactSeverity * 0.30,
            );
            this.audio.playCollision(col.impactSeverity);

            const contactX = col.contactPointX ?? (this.playerState.x + rival.x) * 0.5;
            const contactZ = col.contactPointZ ?? (this.playerState.z + rival.z) * 0.5;
            this.particles.spawnCrashDebrisBurst(
              contactX,
              0.55,
              contactZ,
              col.impactNx,
              col.impactNz,
              col.impactSeverity,
            );

            // Convert collision vector into local player body space
            const playerForwardX = Math.sin(this.playerState.heading);
            const playerForwardZ = Math.cos(this.playerState.heading);
            const playerRightX = Math.cos(this.playerState.heading);
            const playerRightZ = -Math.sin(this.playerState.heading);

            const relX = rival.x - this.playerState.x;
            const relZ = rival.z - this.playerState.z;
            const localZ = relX * playerForwardX + relZ * playerForwardZ;
            const localX = relX * playerRightX + relZ * playerRightZ;
            const impactLocalPoint = new THREE.Vector3(
              THREE.MathUtils.clamp(localX * 0.6, -1.0, 1.0),
              0.35,
              THREE.MathUtils.clamp(localZ * 0.8, -2.1, 2.2),
            );
            applyCarDamage(this.playerCarRig, impactLocalPoint, col.impactSeverity, undefined, false);

            // Apply damage to rival car as well
            const rRig = this.rivalRigs[i];
            const rForwardX = Math.sin(rival.heading);
            const rForwardZ = Math.cos(rival.heading);
            const rRightX = Math.cos(rival.heading);
            const rRightZ = -Math.sin(rival.heading);
            const rRelX = this.playerState.x - rival.x;
            const rRelZ = this.playerState.z - rival.z;
            const rLocalZ = rRelX * rForwardX + rRelZ * rForwardZ;
            const rLocalX = rRelX * rRightX + rRelZ * rRightZ;
            const rImpactLocalPoint = new THREE.Vector3(
              THREE.MathUtils.clamp(rLocalX * 0.6, -1.0, 1.0),
              0.35,
              THREE.MathUtils.clamp(rLocalZ * 0.8, -2.1, 2.2),
            );
            applyCarDamage(rRig, rImpactLocalPoint, col.impactSeverity, undefined, false);
          }
        }
      }

      // Update rival 3D mesh transform & damage shudder
      const rRig = this.rivalRigs[i];
      rRig.root.position.set(rival.x, 0, rival.z);
      rRig.root.rotation.y = rival.heading;
      if (rRig.shudderTimer > 0) {
        rRig.shudderTimer = Math.max(0, rRig.shudderTimer - dt);
        const amp = rRig.shudderTimer * rRig.shudderSeverity * 0.055;
        rRig.bodyGroup.position.set(
          (Math.random() - 0.5) * amp,
          (Math.random() - 0.5) * amp * 0.5,
          (Math.random() - 0.5) * amp,
        );
      } else {
        rRig.bodyGroup.position.set(0, 0, 0);
      }
      for (const w of rRig.wheelMeshes) {
        w.rotation.x += rival.speed * dt * 2.4;
      }
      if (rRig.telegraphRing) {
        rRig.telegraphRing.visible = rival.telegraphingMove;
      }
    }

    // Sync Player 3D Car Mesh, Wheels, Suspension Roll, Brake Lights & Nitro Flames
    this.syncPlayerCarVisuals(dt, input.brake > 0);

    // Compute Standings & Overtakes
    const standings = computeRaceStandings(this.playerState, this.rivals);
    if (standings.playerPosition < this.lastKnownPosition) {
      this.overtakesCount += this.lastKnownPosition - standings.playerPosition;
    }
    this.lastKnownPosition = standings.playerPosition;

    const liveScore =
      Math.round(this.playerState.trackProgress * 1.5) +
      Math.round(this.playerState.totalDriftScore) +
      this.overtakesCount * 250;

    // Update Gantry Spatial UI Card
    if (this.gantrySpeedText) {
      this.gantrySpeedText.text = `POS ${standings.playerPosition}/${this.rivals.length + 1} · ${currentKmh} KM/H`;
    }

    // Update Audio, Particles, Camera, and HUD
    this.audio.updateEngine(
      this.playerState.rpm,
      this.playerState.isBoosting,
      this.playerState.isDrifting,
      false,
    );
    this.particles.update(dt);
    this.updateGameplayCamera(dt);

    this.hud.updatePlayingHud({
      player: this.playerState,
      rivals: this.rivals,
      waypoints: this.waypoints,
      position: standings.playerPosition,
      totalRacers: this.rivals.length + 1,
      totalLaps: modeSpec.totalLaps,
      elapsedSec: this.elapsedRaceSec,
      score: liveScore,
    });
  }

  private syncPlayerCarVisuals(dt: number, braking: boolean): void {
    const rig = this.playerCarRig;
    rig.root.position.set(this.playerState.x, 0, this.playerState.z);

    // Visual drift slip angle on the car root
    const slipYaw = Math.atan2(
      this.playerState.lateralSpeed * 0.35,
      Math.max(5, Math.abs(this.playerState.speed)),
    );
    rig.root.rotation.y = this.playerState.heading + slipYaw;

    // Body roll and pitch suspension feel
    const targetRoll =
      -this.playerState.steerAngle *
      Math.min(1, this.playerState.speed / 35) *
      0.065;
    const targetPitch = this.playerState.isBoosting
      ? -0.025
      : braking && this.playerState.speed > 4
        ? 0.032
        : 0;
    rig.bodyGroup.rotation.z +=
      (targetRoll - rig.bodyGroup.rotation.z) * Math.min(1, 10 * dt);
    rig.bodyGroup.rotation.x +=
      (targetPitch - rig.bodyGroup.rotation.x) * Math.min(1, 10 * dt);

    // Physical vehicle shudder from impact trauma
    if (rig.shudderTimer > 0) {
      rig.shudderTimer = Math.max(0, rig.shudderTimer - dt);
      const amp = rig.shudderTimer * rig.shudderSeverity * 0.055;
      rig.bodyGroup.position.set(
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp * 0.5,
        (Math.random() - 0.5) * amp,
      );
    } else {
      rig.bodyGroup.position.set(0, 0, 0);
    }
    rig.paintMat.emissive.setHex(0x000000);
    rig.paintMat.emissiveIntensity = 0;

    // Front wheel steering & all-wheel spin
    const wheelSteer = -this.playerState.steerAngle * 0.42;
    rig.frontLeftWheelPivot.rotation.y = wheelSteer;
    rig.frontRightWheelPivot.rotation.y = wheelSteer;

    const wheelSpinDelta = this.playerState.speed * dt * 2.6;
    for (const w of rig.wheelMeshes) {
      w.rotation.x += wheelSpinDelta;
    }

    // Brake light intensity
    rig.tailLightMat.emissiveIntensity = braking ? 4.2 : 1.5;

    // Nitro exhaust flames
    rig.nitroLeftMesh.visible = this.playerState.isBoosting;
    rig.nitroRightMesh.visible = this.playerState.isBoosting;
    if (this.playerState.isBoosting) {
      const flicker = 0.85 + Math.random() * 0.35;
      rig.nitroLeftMesh.scale.set(1, 1, flicker);
      rig.nitroRightMesh.scale.set(1, 1, flicker);
    }

    // Police lightbar strobe animation if Vanguard Enforcer selected
    if (rig.policeStrobeLeft && rig.policeStrobeRight) {
      const phase = Math.floor(this.elapsedRaceSec * 8) % 2 === 0;
      (
        rig.policeStrobeLeft.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = phase ? 3.5 : 0.4;
      (
        rig.policeStrobeRight.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = phase ? 0.4 : 3.5;
    }

    // Pooled drift smoke & nitro sparks
    this.particleSpawnAccum += dt;
    if (this.particleSpawnAccum >= 0.035) {
      this.particleSpawnAccum = 0;
      const sinH = Math.sin(this.playerState.heading);
      const cosH = Math.cos(this.playerState.heading);
      const rearX = this.playerState.x - sinH * 1.8;
      const rearZ = this.playerState.z - cosH * 1.8;

      if (this.playerState.isDrifting) {
        this.audio.playTireScreech(Math.min(1.0, this.playerState.speed / 45));
        this.particles.spawnTireDriftSmoke(
          rearX - cosH * 0.8,
          0.22,
          rearZ + sinH * 0.8,
          sinH,
          cosH,
        );
        this.particles.spawnTireDriftSmoke(
          rearX + cosH * 0.8,
          0.22,
          rearZ - sinH * 0.8,
          sinH,
          cosH,
        );
      }
      if (this.playerState.isBoosting) {
        this.particles.spawnNitroSparks(rearX, 0.32, rearZ, sinH, cosH);
      }

      // Radiator steam if car is heavily damaged
      if (rig.totalDamage > 0.42 && Math.random() < 0.25) {
        this.particles.spawnRadiatorSteam(
          this.playerState.x + sinH * 1.9,
          0.45,
          this.playerState.z + cosH * 1.9,
        );
      }
    }
  }

  private updateTitleShowroomCamera(dt: number): void {
    updateSunLightFollow(this.worldRefs.sunLight, 0, 0);
    this.titleOrbitAngle += dt * 0.38;
    const cam = xb.core.camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - 50) > 0.1) {
      cam.fov = 50;
      cam.updateProjectionMatrix();
    }
    // Sweep smoothly around a 3/4 front-side showroom angle
    const sweepAngle = 0.72 + Math.sin(this.titleOrbitAngle) * 0.26;
    const isPortraitRotated = document.body.classList.contains('portrait-rotated');
    const effH = isPortraitRotated ? window.innerWidth : window.innerHeight;
    const isCompactLandscape = effH < 520;
    const radius = isCompactLandscape ? 5.05 : 4.72;
    const cx = this.playerState.x + Math.sin(sweepAngle) * radius;
    const cz = this.playerState.z + Math.cos(sweepAngle) * radius;

    // Position the player car on top of the illuminated showroom podium
    this.playerCarRig.root.position.set(
      this.playerState.x,
      0.14,
      this.playerState.z,
    );
    // Slowly rotate the wheels slightly for showroom presentation
    for (const w of this.playerCarRig.wheelMeshes) {
      w.rotation.x += dt * 0.6;
    }

    cam.position.set(cx, isCompactLandscape ? 1.34 : 1.44, cz);
    // Aim slightly below the car's centerline so the car sits in the upper-middle canvas above the bottom dock
    cam.lookAt(
      this.playerState.x,
      isCompactLandscape ? -0.02 : 0.14,
      this.playerState.z - 0.12,
    );
  }

  private updateGameplayCamera(dt: number): void {
    const cam = xb.core.camera as THREE.PerspectiveCamera;
    const sinH = Math.sin(this.playerState.heading);
    const cosH = Math.cos(this.playerState.heading);

    // Dynamic FOV kick with speed & nitro
    const speedRatio = Math.min(1, Math.abs(this.playerState.speed) / 90);
    const targetFov =
      58 + speedRatio * 12 + (this.playerState.isBoosting ? 7 : 0);
    cam.fov += (targetFov - cam.fov) * Math.min(1, 6 * dt);
    cam.updateProjectionMatrix();

    if (this.cameraMode === 'cockpit') {
      _desiredCamPos.set(
        this.playerState.x + sinH * 0.45,
        1.18,
        this.playerState.z + cosH * 0.45,
      );
      _desiredLookAt.set(
        this.playerState.x + sinH * 24,
        1.05,
        this.playerState.z + cosH * 24,
      );
      cam.position.copy(_desiredCamPos);
      cam.lookAt(_desiredLookAt);
    } else if (this.cameraMode === 'heli') {
      _desiredCamPos.set(
        this.playerState.x - sinH * 16,
        18.5,
        this.playerState.z - cosH * 16,
      );
      _desiredLookAt.set(
        this.playerState.x + sinH * 10,
        0.5,
        this.playerState.z + cosH * 10,
      );
      const damp = 1 - Math.exp(-7 * dt);
      cam.position.lerp(_desiredCamPos, damp);
      _currentLookAt.lerp(_desiredLookAt, damp);
      cam.lookAt(_currentLookAt);
    } else {
      const distBack = this.cameraMode === 'far' ? 9.2 : 6.4;
      const heightUp = this.cameraMode === 'far' ? 3.4 : 2.35;
      const lateralSwing = -this.playerState.steerAngle * 0.85;

      _desiredCamPos.set(
        this.playerState.x - sinH * distBack + cosH * lateralSwing,
        heightUp,
        this.playerState.z - cosH * distBack - sinH * lateralSwing,
      );
      _desiredLookAt.set(
        this.playerState.x + sinH * 9,
        1.05,
        this.playerState.z + cosH * 9,
      );

      const dampPos = 1 - Math.exp(-11 * dt);
      const dampLook = 1 - Math.exp(-14 * dt);
      cam.position.lerp(_desiredCamPos, dampPos);
      _currentLookAt.lerp(_desiredLookAt, dampLook);
      cam.lookAt(_currentLookAt);
    }

    // Decaying trauma^2 camera shake
    if (this.cameraTrauma > 0.001) {
      const shake = this.cameraTrauma * this.cameraTrauma;
      cam.position.x += (Math.random() - 0.5) * shake * 0.42;
      cam.position.y += (Math.random() - 0.5) * shake * 0.32;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.4);
    }
  }

  private finishRace(): void {
    this.gameState = 'gameover';
    this.audio.updateEngine(1200, false, false, true);

    const standings = computeRaceStandings(this.playerState, this.rivals);
    const modeSpec = GAME_MODE_CATALOG[this.selectedModeId];
    const carSpec = CAR_CATALOG[this.selectedCarIndex];
    const trackSpec = TRACK_CATALOG[this.selectedTrackId];

    const score = calculateFinalRaceScore({
      position: standings.playerPosition,
      totalLaps: modeSpec.totalLaps,
      totalTimeSec: this.elapsedRaceSec,
      driftPoints: Math.round(this.playerState.totalDriftScore),
      overtakes: this.overtakesCount,
    });

    if (score > this.bestScore) {
      this.bestScore = score;
    }

    const isVictory = standings.playerPosition <= 3;
    this.audio.playFinishFanfare(isVictory);

    const snapshot: RaceRunSnapshot = {
      outcome: isVictory ? 'victory' : 'defeat',
      title:
        standings.playerPosition === 1
          ? 'GRAND PRIX CHAMPION!'
          : isVictory
            ? 'PODIUM FINISH!'
            : 'FINISHED OFF PODIUM',
      subtitle: `${carSpec.name} · ${trackSpec.name}`,
      position: standings.playerPosition,
      totalRacers: this.rivals.length + 1,
      totalTimeSec: this.elapsedRaceSec,
      bestLapSec: this.bestLapSec || this.elapsedRaceSec / modeSpec.totalLaps,
      topSpeedReachedKmh: this.topSpeedReachedKmh,
      score,
      bestScore: this.bestScore,
      driftPoints: Math.round(this.playerState.totalDriftScore),
      overtakes: this.overtakesCount,
      carName: carSpec.name,
      trackName: trackSpec.name,
      modeName: modeSpec.name,
    };

    this.hud.showGameOverModal(snapshot);
  }
}

function startSoftwareGlPacedLoop(): void {
  const renderer = xb.core.renderer as THREE.WebGLRenderer;
  if (!renderer || typeof renderer.getContext !== 'function') return;

  // Replace unpaced animation loop with fenceSync-paced afterDraw loop on software WebGL
  renderer.setAnimationLoop(null);
  let lastTime = performance.now();

  function afterDraw(cb: () => void): void {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 80);
      }
    };
    window.setTimeout(poll, 5);
  }

  function tick(): void {
    const now = performance.now();
    const dtMs = Math.min(50, Math.max(8, now - lastTime));
    lastTime = now;
    try {
      xb.core.stepFrame(dtMs);
    } catch (err) {
      console.error(err);
    }
    afterDraw(tick);
  }

  tick();
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.antialias = !isSoftwareGl;
  options.enableSimulator = false;
  options.xrButton.enabled = false;
  options.reticles.enabled = false;
  options.controllers.visualizeRays = false;

  xb.add(new ApexVelocityRacingScript());
  await xb.init(options);

  if (isSoftwareGl) {
    startSoftwareGlPacedLoop();
  }
});
