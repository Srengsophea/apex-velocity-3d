export type CarBodyStyle =
  | 'supercar'
  | 'hypercar'
  | 'muscle'
  | 'formula'
  | 'tuner'
  | 'police';

export interface CarSpec {
  id: string;
  name: string;
  category: string;
  bodyStyle: CarBodyStyle;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  rimColor: number;
  topSpeedKmh: number; // e.g., 280 - 340
  accelRate: number; // m/s^2 base
  handling: number; // steering responsiveness 1.0 - 1.5
  driftGrip: number; // lateral grip factor
  nitroBoost: number; // multiplier 1.25 - 1.45
  massKg: number;
  description: string;
}

export type TrackId =
  | 'city_day'
  | 'sunset_coast'
  | 'neon_night'
  | 'alpine_pass'
  | 'desert_dunes'
  | 'harbor_docks';

export type TrackEnvironmentKind =
  | 'metro'
  | 'coastal'
  | 'cyber'
  | 'alpine'
  | 'desert'
  | 'harbor';

export interface TrackSpec {
  id: TrackId;
  name: string;
  shortName: string;
  subtitle: string;
  difficulty: string;
  envKind: TrackEnvironmentKind;
  controlPoints: Array<[number, number]>;
  skyTopColor: number;
  skyHorizonColor: number;
  sunDiscColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  groundColor: number;
  infieldColor: number;
  foliageColors: [number, number, number];
  archAccentColor: number;
  roadWidth: number;
  targetLapTimeSec: number;
}

export type GameModeId = 'grand_prix' | 'time_trial' | 'eliminator';

export interface GameModeSpec {
  id: GameModeId;
  name: string;
  shortLabel: string;
  description: string;
  totalLaps: number;
  rivalCount: number;
}

export type ControllerModeId = 'wheel' | 'buttons' | 'joystick' | 'tilt';

export type CameraModeId = 'chase' | 'cockpit' | 'far' | 'heli';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type RivalPolicy = 'apex_speedster' | 'blocker' | 'charger';

export interface Waypoint2D {
  x: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  distFromStart: number;
}

export interface VehiclePhysicsState {
  x: number;
  z: number;
  heading: number; // radians, 0 = +Z or track tangent
  speed: number; // m/s
  lateralSpeed: number; // m/s sideways slip
  steerAngle: number; // -1 to 1 smoothed
  rpm: number; // 1000 to 9000
  gear: number; // 1 to 6
  nitro: number; // 0 to 100
  isDrifting: boolean;
  isBoosting: boolean;
  driftScoreCurrent: number;
  totalDriftScore: number;
  lap: number;
  maxSIndexReached: number;
  trackProgress: number; // total distance along track across laps
  lateralOffset: number; // signed distance from track centerline
  damageFlash: number; // 0 to 1
  invulnTimer: number; // seconds
}

export interface RivalState {
  id: string;
  name: string;
  carSpec: CarSpec;
  policy: RivalPolicy;
  sDistance: number; // distance along track loop
  lateralOffset: number;
  targetLateralOffset: number;
  speed: number;
  basePaceMultiplier: number;
  x: number;
  z: number;
  heading: number;
  lap: number;
  totalProgress: number;
  aggressionTimer: number;
  telegraphingMove: boolean;
}

export interface RaceRunSnapshot {
  outcome: 'victory' | 'defeat';
  title: string;
  subtitle: string;
  position: number;
  totalRacers: number;
  totalTimeSec: number;
  bestLapSec: number;
  topSpeedReachedKmh: number;
  score: number;
  bestScore: number;
  driftPoints: number;
  overtakes: number;
  carName: string;
  trackName: string;
  modeName: string;
}

export interface ControlInputState {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1 (left is -1, right is +1)
  driftHeld: boolean;
  nitroHeld: boolean;
  cameraJustPressed: boolean;
  pauseJustPressed: boolean;
  restartJustPressed: boolean;
  muteJustPressed: boolean;
}
