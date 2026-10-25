import {
  CarSpec,
  ControlInputState,
  GameModeId,
  GameModeSpec,
  RivalPolicy,
  RivalState,
  TrackId,
  TrackSpec,
  VehiclePhysicsState,
  Waypoint2D,
} from './types';

export const CAR_CATALOG: CarSpec[] = [
  {
    id: 'apex_gtr',
    name: 'Apex GT-R V10',
    category: 'Grand Touring Supercar',
    bodyStyle: 'supercar',
    primaryColor: 0xe11d48, // Crimson Red
    secondaryColor: 0x18181b, // Carbon Black
    accentColor: 0xfef08a,
    rimColor: 0xd4d4d8,
    topSpeedKmh: 318,
    accelRate: 28,
    handling: 1.28,
    driftGrip: 0.86,
    nitroBoost: 1.32,
    massKg: 1420,
    description: 'Precision twin-turbo V10 coupe with swan-neck GT aero wing and balanced grip.',
  },
  {
    id: 'volt_cyber',
    name: 'Volt Sovereign EV-X',
    category: 'Tri-Motor Hypercar',
    bodyStyle: 'hypercar',
    primaryColor: 0x06b6d4, // Electric Cyan
    secondaryColor: 0x0f172a, // Deep Slate
    accentColor: 0x38bdf8,
    rimColor: 0xe2e8f0,
    topSpeedKmh: 342,
    accelRate: 33,
    handling: 1.32,
    driftGrip: 0.9,
    nitroBoost: 1.38,
    massKg: 1510,
    description: 'Low-slung sculpted wedge hypercar with instant electric torque and active diffuser.',
  },
  {
    id: 'titan_v8',
    name: 'Titan Hellfire V8',
    category: 'Supercharged Muscle',
    bodyStyle: 'muscle',
    primaryColor: 0xf59e0b, // Amber Gold
    secondaryColor: 0x111827, // Matte Obsidian Stripes
    accentColor: 0xfbbf24,
    rimColor: 0x71717a,
    topSpeedKmh: 298,
    accelRate: 30,
    handling: 1.12,
    driftGrip: 0.76,
    nitroBoost: 1.42,
    massKg: 1740,
    description: 'Brawny American V8 fastback with exposed hood blower and massive drift slip angles.',
  },
  {
    id: 'aero_fx',
    name: 'Aero Formula X-26',
    category: 'Open-Wheel Prototype',
    bodyStyle: 'formula',
    primaryColor: 0x10b981, // Racing Emerald
    secondaryColor: 0x090d16, // Carbon Weave
    accentColor: 0x6ee7b7,
    rimColor: 0xfacc15,
    topSpeedKmh: 334,
    accelRate: 34,
    handling: 1.52,
    driftGrip: 0.94,
    nitroBoost: 1.28,
    massKg: 890,
    description: 'Featherweight open-wheel single-seater with ground-effect venturi tunnels.',
  },
  {
    id: 'phantom_rx',
    name: 'Phantom Spec-D RX',
    category: 'Widebody Street Tuner',
    bodyStyle: 'tuner',
    primaryColor: 0x8b5cf6, // Royal Violet
    secondaryColor: 0x1e1b4b, // Midnight Indigo
    accentColor: 0xf472b6,
    rimColor: 0xfef08a,
    topSpeedKmh: 305,
    accelRate: 29,
    handling: 1.38,
    driftGrip: 0.72,
    nitroBoost: 1.36,
    massKg: 1260,
    description: 'Rotary widebody street legend engineered for high-angle tandem city drifting.',
  },
  {
    id: 'interceptor_911',
    name: 'Vanguard Enforcer GT',
    category: 'Highway Pursuit Unit',
    bodyStyle: 'police',
    primaryColor: 0xf8fafc, // Crisp Patrol White
    secondaryColor: 0x0f172a, // Tactical Black Doors
    accentColor: 0x3b82f6, // Strobe Blue/Red
    rimColor: 0x334155,
    topSpeedKmh: 322,
    accelRate: 31,
    handling: 1.26,
    driftGrip: 0.84,
    nitroBoost: 1.35,
    massKg: 1620,
    description: 'Armored high-speed metro pursuit interceptor with roof strobe lightbar and bullbar.',
  },
  {
    id: 'valkyrie_lmp',
    name: 'Valkyrie LMP-99 Hyper-Hybrid',
    category: 'Endurance Le Mans Prototype',
    bodyStyle: 'hypercar',
    primaryColor: 0xe2e8f0, // Liquid Silver Metallic
    secondaryColor: 0x090d16, // Carbon Weave
    accentColor: 0x84cc16, // Fluorescent Solar Acid Green
    rimColor: 0x0f172a,
    topSpeedKmh: 356,
    accelRate: 36,
    handling: 1.48,
    driftGrip: 0.92,
    nitroBoost: 1.40,
    massKg: 1040,
    description: 'Twin-turbo V6 hybrid Le Mans prototype with full-length shark fin and 350+ km/h top end.',
  },
  {
    id: 'monza_spider',
    name: 'Monza Stradale V12 Spider',
    category: 'Open-Cockpit Italian Exotic',
    bodyStyle: 'supercar',
    primaryColor: 0xeab308, // Giallo Modena Pearl Yellow
    secondaryColor: 0x18181b, // Nero Carbon
    accentColor: 0xf97316,
    rimColor: 0xd4d4d8,
    topSpeedKmh: 346,
    accelRate: 32,
    handling: 1.36,
    driftGrip: 0.84,
    nitroBoost: 1.34,
    massKg: 1390,
    description: 'Pure atmospheric 6.5L V12 open-top barchetta with twin aerodynamic headrest fairings.',
  },
  {
    id: 'sandstorm_raid',
    name: 'Sandstorm Dakar Trophy 4x4',
    category: 'Desert Raid Trophy Truck',
    bodyStyle: 'muscle',
    primaryColor: 0xd97706, // Tactical Dune Tan
    secondaryColor: 0x1e293b, // Gunmetal Slate
    accentColor: 0xf97316,
    rimColor: 0x111827,
    topSpeedKmh: 294,
    accelRate: 32,
    handling: 1.18,
    driftGrip: 0.88,
    nitroBoost: 1.45,
    massKg: 1850,
    description: 'Heavy-duty desert raid trophy machine with roof spotlight bar, brush bar, and rear spares.',
  },
  {
    id: 'skyline_spec_r',
    name: 'Kurogane Skyline R34 Spec-R',
    category: 'JDM Midnight Wangan Legend',
    bodyStyle: 'tuner',
    primaryColor: 0x1d4ed8, // Midnight Bayside Blue
    secondaryColor: 0x0f172a, // Deep Carbon
    accentColor: 0x38bdf8,
    rimColor: 0xd97706, // Bronze Forged
    topSpeedKmh: 326,
    accelRate: 33,
    handling: 1.44,
    driftGrip: 0.70,
    nitroBoost: 1.40,
    massKg: 1330,
    description: 'Twin-turbo straight-six Japanese legend tuned for 9000 RPM high-speed expressway drifting.',
  },
  {
    id: 'nexus_pursuit',
    name: 'Nexus Cyber-Interceptor Black',
    category: 'Stealth High-Speed Interceptor',
    bodyStyle: 'police',
    primaryColor: 0x09090b, // Matte Stealth Obsidian
    secondaryColor: 0x18181b, // Carbon Kevlar
    accentColor: 0x06b6d4, // Cyan/Magenta Strobe
    rimColor: 0x3f3f46,
    topSpeedKmh: 338,
    accelRate: 34,
    handling: 1.30,
    driftGrip: 0.82,
    nitroBoost: 1.44,
    massKg: 1580,
    description: 'Next-gen stealth pursuit interceptor with integrated push bumper and cybernetic strobe bar.',
  },
  {
    id: 'silver_arrow_f1',
    name: 'Silver Arrow Grand Prix GP-01',
    category: 'Turbo-Hybrid Formula Grand Prix',
    bodyStyle: 'formula',
    primaryColor: 0xf1f5f9, // Liquid Chrome Silver
    secondaryColor: 0x090d16, // Gloss Carbon Weave
    accentColor: 0x14b8a6, // Petronas Emerald
    rimColor: 0xfacc15,
    topSpeedKmh: 362,
    accelRate: 38,
    handling: 1.58,
    driftGrip: 0.96,
    nitroBoost: 1.36,
    massKg: 798,
    description: 'Pinnacle motorsport single-seater with titanium halo, DRS wing flap, and maximum downforce.',
  },
];

/**
 * Default control points for Metro Downtown Circuit.
 * All circuits start along (0, -Y) -> (0, 0) -> (0, +Y) so the starting grid & gantry
 * align cleanly on a straight boulevard heading +Z, then diverge into unique layouts.
 */
export const CIRCUIT_CONTROL_POINTS: Array<[number, number]> = [
  [0, -90],
  [0, 0],
  [0, 105],
  [42, 175],
  [120, 185],
  [168, 120],
  [145, 30],
  [95, -20],
  [145, -85],
  [135, -165],
  [55, -195],
  [-40, -175],
  [-72, -135],
];

export const TRACK_CATALOG: Record<TrackId, TrackSpec> = {
  city_day: {
    id: 'city_day',
    name: 'Metro Downtown GP',
    shortName: 'Metro GP',
    subtitle: 'Financial District Skyscrapers & Park Chicanes',
    difficulty: 'MEDIUM',
    envKind: 'metro',
    controlPoints: CIRCUIT_CONTROL_POINTS,
    skyTopColor: 0x0f2952,
    skyHorizonColor: 0x60a5fa,
    sunDiscColor: 0xfffbeb,
    fogColor: 0x60a5fa,
    fogDensity: 0.0018,
    sunColor: 0xfffbeb,
    sunIntensity: 2.8,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 1.15,
    groundColor: 0x162032,
    infieldColor: 0x14532d,
    foliageColors: [0x15803d, 0x166534, 0x047857],
    archAccentColor: 0x3b82f6,
    roadWidth: 18.5,
    targetLapTimeSec: 38,
  },
  sunset_coast: {
    id: 'sunset_coast',
    name: 'Golden Coast Bay',
    shortName: 'Sunset Bay',
    subtitle: 'Oceanfront Palm Boulevard & Sweeping Bay Arcs',
    difficulty: 'EASY',
    envKind: 'coastal',
    controlPoints: [
      [0, -95],
      [0, 0],
      [0, 110],
      [65, 195],
      [165, 210],
      [225, 130],
      [230, 10],
      [195, -110],
      [120, -195],
      [25, -210],
      [-55, -165],
    ],
    skyTopColor: 0x1e3a8a, // Natural deep Mediterranean twilight blue zenith
    skyHorizonColor: 0xfdba74, // Soft radiant golden-peach sunset horizon
    sunDiscColor: 0xfff7ed, // Luminous golden-white sunset core
    fogColor: 0xfdba74, // Soft natural golden sunset aerial mist
    fogDensity: 0.001, // Low natural density for clear view distance
    sunColor: 0xffedd5, // Natural warm golden-hour sunlight
    sunIntensity: 2.6,
    hemiSkyColor: 0x93c5fd, // Clear sky ambient fill
    hemiGroundColor: 0x1e293b, // Natural dark coastal shadow
    hemiIntensity: 1.0,
    groundColor: 0x1e293b, // Coastal asphalt / seaside ground
    infieldColor: 0x0284c7, // Natural azure Mediterranean bay water
    foliageColors: [0x15803d, 0x166534, 0x14532d], // Natural lush coastal palm greens
    archAccentColor: 0x38bdf8, // Clean architectural coastal azure accents
    roadWidth: 19.5,
    targetLapTimeSec: 36,
  },
  neon_night: {
    id: 'neon_night',
    name: 'Neo-Tokyo Cyber Loop',
    shortName: 'Cyber Night',
    subtitle: 'Holographic Towers, Neon Portals & Drift Hairpins',
    difficulty: 'HARD',
    envKind: 'cyber',
    controlPoints: [
      [0, -90],
      [0, 0],
      [0, 95],
      [35, 165],
      [115, 160],
      [130, 75],
      [55, 45],
      [60, -25],
      [155, -45],
      [175, -135],
      [105, -195],
      [5, -185],
      [-55, -145],
    ],
    skyTopColor: 0x020617, // Natural obsidian midnight deep sky
    skyHorizonColor: 0x0f172a, // Real city night ambient horizon glow
    sunDiscColor: 0xf1f5f9, // Natural silvery moon disc
    fogColor: 0x0a0f1d, // Clean dark night atmospheric haze
    fogDensity: 0.0012,
    sunColor: 0x94a3b8, // Natural silver-blue moonlight
    sunIntensity: 1.3,
    hemiSkyColor: 0x1e293b, // Natural deep navy night ambient
    hemiGroundColor: 0x020617, // Natural dark tarmac shadow
    hemiIntensity: 0.9,
    groundColor: 0x030712, // Dark clean midnight asphalt
    infieldColor: 0x090d16, // Dark city plaza tarmac
    foliageColors: [0x164e63, 0x155e75, 0x0e7490], // Deep evening urban pine foliage
    archAccentColor: 0x38bdf8, // Clean modern architectural LED ice-blue
    roadWidth: 17.5,
    targetLapTimeSec: 39,
  },
  alpine_pass: {
    id: 'alpine_pass',
    name: 'Alpine Glacier Pass',
    shortName: 'Alpine Pass',
    subtitle: 'Mountain Forest Switchbacks & Canyon Bridges',
    difficulty: 'HARD',
    envKind: 'alpine',
    controlPoints: [
      [0, -90],
      [0, 0],
      [0, 95],
      [-55, 165],
      [-145, 175],
      [-185, 95],
      [-115, 25],
      [-165, -55],
      [-155, -155],
      [-75, -195],
      [25, -180],
      [45, -130],
    ],
    skyTopColor: 0x0c4a6e,
    skyHorizonColor: 0xbae6fd,
    sunDiscColor: 0xffffff,
    fogColor: 0xbae6fd,
    fogDensity: 0.0019,
    sunColor: 0xf0f9ff,
    sunIntensity: 2.7,
    hemiSkyColor: 0xe0f2fe,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 1.2,
    groundColor: 0x1e293b,
    infieldColor: 0x064e3b,
    foliageColors: [0x065f46, 0x047857, 0x115e59],
    archAccentColor: 0x10b981,
    roadWidth: 17.5,
    targetLapTimeSec: 40,
  },
  desert_dunes: {
    id: 'desert_dunes',
    name: 'Sahara Red Canyon',
    shortName: 'Red Canyon',
    subtitle: 'High-Speed Desert Speedway & Sandstone Mesas',
    difficulty: 'EASY',
    envKind: 'desert',
    controlPoints: [
      [0, -100],
      [0, 0],
      [0, 115],
      [55, 200],
      [155, 195],
      [205, 95],
      [185, -35],
      [155, -155],
      [75, -210],
      [-25, -195],
    ],
    skyTopColor: 0x0284c7, // Natural high-altitude desert cerulean sky
    skyHorizonColor: 0xfef3c7, // Soft warm desert sand horizon haze
    sunDiscColor: 0xffffff, // Blazing natural white desert sun
    fogColor: 0xfef3c7, // Soft natural desert dust haze
    fogDensity: 0.00075, // Crystal-clear long desert view distance
    sunColor: 0xfffbeb, // Brilliant natural desert sunlight
    sunIntensity: 2.8,
    hemiSkyColor: 0x7dd3fc, // Crisp desert sky-blue fill on cliff shadows
    hemiGroundColor: 0x78350f, // Natural sandstone ground bounce
    hemiIntensity: 1.1,
    groundColor: 0xb45309, // Natural warm ochre & sandstone desert floor
    infieldColor: 0xd97706, // Natural golden desert sand dunes
    foliageColors: [0x3f6212, 0x4d7c0f, 0x65a30d], // Authentic desert sage, agave & cactus green
    archAccentColor: 0xd97706, // Natural sandstone ochre rally accents
    roadWidth: 20.0,
    targetLapTimeSec: 35,
  },
  harbor_docks: {
    id: 'harbor_docks',
    name: 'Storm Harbor Docks',
    shortName: 'Harbor Port',
    subtitle: 'Industrial Container Gantries & 90° Dock Corners',
    difficulty: 'MEDIUM',
    envKind: 'harbor',
    controlPoints: [
      [0, -90],
      [0, 0],
      [0, 100],
      [15, 165],
      [110, 165],
      [135, 110],
      [135, 15],
      [190, -15],
      [190, -135],
      [110, -175],
      [10, -175],
      [-35, -140],
    ],
    skyTopColor: 0x0f172a, // Deep slate navy maritime twilight zenith
    skyHorizonColor: 0x334155, // Moody steel ocean horizon
    sunDiscColor: 0xf1f5f9, // Veiled maritime silver moon
    fogColor: 0x1e293b, // Natural maritime sea fog
    fogDensity: 0.0014,
    sunColor: 0xcfd8dc, // Cool maritime moonlight and shipyard illumination
    sunIntensity: 1.8,
    hemiSkyColor: 0x475569, // Cool overcast maritime sky fill
    hemiGroundColor: 0x0f172a, // Dark wet dock shadow
    hemiIntensity: 1.0,
    groundColor: 0x0f172a, // Dark wet industrial shipping dock concrete
    infieldColor: 0x071527, // Deep cold oceanic harbor bay water
    foliageColors: [0x14532d, 0x166534, 0x0f766e], // Natural coastal maritime cypress & dark pine
    archAccentColor: 0xf59e0b, // Industrial international safety amber & crane yellow
    roadWidth: 18.5,
    targetLapTimeSec: 38,
  },
  continental_highway: {
    id: 'continental_highway',
    name: 'Pacific Continental Expressway',
    shortName: 'Pacific Highway',
    subtitle: 'Endless Ocean Bridge Straightaway & High-Speed Coastal Sweepers',
    difficulty: 'MEDIUM',
    envKind: 'coastal',
    controlPoints: [
      [0, -180],
      [0, 0],
      [0, 260],
      [45, 450],
      [190, 580],
      [390, 540],
      [540, 370],
      [560, 120],
      [520, -160],
      [390, -420],
      [220, -560],
      [40, -600],
      [-110, -510],
      [-80, -290],
    ],
    skyTopColor: 0x1e3a8a,
    skyHorizonColor: 0x93c5fd,
    sunDiscColor: 0xffffff,
    fogColor: 0x93c5fd,
    fogDensity: 0.00065,
    sunColor: 0xffffff,
    sunIntensity: 2.7,
    hemiSkyColor: 0xbae6fd,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 1.1,
    groundColor: 0x1e293b,
    infieldColor: 0x0284c7,
    foliageColors: [0x15803d, 0x166534, 0x047857],
    archAccentColor: 0x06b6d4,
    roadWidth: 22.0,
    targetLapTimeSec: 52,
  },
  trans_sahara_speedway: {
    id: 'trans_sahara_speedway',
    name: 'Grand Sahara Desert Runway',
    shortName: 'Desert Runway',
    subtitle: 'Supersonic Salt-Flat Straight & Colossal Sandstone Mesas',
    difficulty: 'EASY',
    envKind: 'desert',
    controlPoints: [
      [0, -240],
      [0, 0],
      [0, 340],
      [90, 560],
      [270, 640],
      [500, 550],
      [640, 320],
      [640, -120],
      [640, -400],
      [520, -610],
      [290, -670],
      [70, -600],
      [-100, -460],
      [-65, -310],
    ],
    skyTopColor: 0x0284c7,
    skyHorizonColor: 0xfef3c7,
    sunDiscColor: 0xffffff,
    fogColor: 0xfef3c7,
    fogDensity: 0.0005,
    sunColor: 0xfffbeb,
    sunIntensity: 2.9,
    hemiSkyColor: 0x7dd3fc,
    hemiGroundColor: 0x78350f,
    hemiIntensity: 1.15,
    groundColor: 0xb45309,
    infieldColor: 0xd97706,
    foliageColors: [0x4d7c0f, 0x65a30d, 0x3f6212],
    archAccentColor: 0xf59e0b,
    roadWidth: 23.0,
    targetLapTimeSec: 55,
  },
  tokyo_wangan_express: {
    id: 'tokyo_wangan_express',
    name: 'Midnight Wangan Bay Expressway',
    shortName: 'Wangan Express',
    subtitle: 'Tokyo Bay Suspension Bridge & High-Velocity Midnight Artery',
    difficulty: 'HARD',
    envKind: 'cyber',
    controlPoints: [
      [0, -200],
      [0, 0],
      [0, 280],
      [80, 480],
      [250, 560],
      [450, 500],
      [590, 320],
      [600, 60],
      [550, -260],
      [400, -500],
      [190, -580],
      [-20, -520],
      [-115, -390],
      [-70, -280],
    ],
    skyTopColor: 0x020617,
    skyHorizonColor: 0x0f172a,
    sunDiscColor: 0xf1f5f9,
    fogColor: 0x0a0f1d,
    fogDensity: 0.00075,
    sunColor: 0x94a3b8,
    sunIntensity: 1.4,
    hemiSkyColor: 0x1e293b,
    hemiGroundColor: 0x020617,
    hemiIntensity: 0.95,
    groundColor: 0x030712,
    infieldColor: 0x090d16,
    foliageColors: [0x164e63, 0x155e75, 0x0e7490],
    archAccentColor: 0xf43f5e,
    roadWidth: 20.5,
    targetLapTimeSec: 53,
  },
  nordic_skyline_pass: {
    id: 'nordic_skyline_pass',
    name: 'Nordic Skyline Mountain Autobahn',
    shortName: 'Nordic Skyline',
    subtitle: 'Colossal Glacier Valley Straight & Downhill Gorge Viaducts',
    difficulty: 'HARD',
    envKind: 'alpine',
    controlPoints: [
      [0, -200],
      [0, 0],
      [0, 270],
      [-80, 470],
      [-250, 570],
      [-480, 500],
      [-600, 330],
      [-620, 60],
      [-560, -270],
      [-400, -500],
      [-190, -590],
      [35, -530],
      [90, -400],
      [50, -280],
    ],
    skyTopColor: 0x0c4a6e,
    skyHorizonColor: 0xbae6fd,
    sunDiscColor: 0xffffff,
    fogColor: 0xbae6fd,
    fogDensity: 0.00095,
    sunColor: 0xf0f9ff,
    sunIntensity: 2.7,
    hemiSkyColor: 0xe0f2fe,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 1.2,
    groundColor: 0x1e293b,
    infieldColor: 0x064e3b,
    foliageColors: [0x065f46, 0x047857, 0x115e59],
    archAccentColor: 0x10b981,
    roadWidth: 21.0,
    targetLapTimeSec: 54,
  },
  countryside_meadows: {
    id: 'countryside_meadows',
    name: 'Verdant Meadowlands GP',
    shortName: 'Countryside',
    subtitle: 'Rolling Farmland Hills, Red Barns, Windmills & Amber Wheat Straights',
    difficulty: 'MEDIUM',
    envKind: 'countryside',
    controlPoints: [
      [0, -180],
      [0, 0],
      [0, 240],
      [140, 440],
      [340, 520],
      [560, 460],
      [620, 240],
      [620, -120],
      [600, -360],
      [480, -560],
      [280, -640],
      [80, -580],
      [-120, -480],
      [-180, -340],
      [-120, -220],
    ],
    skyTopColor: 0x0284c7, // Crisp summer blue sky
    skyHorizonColor: 0xbae6fd, // Soft warm atmospheric horizon
    sunDiscColor: 0xfffbeb,
    fogColor: 0xdbeafe,
    fogDensity: 0.00078,
    sunColor: 0xfff7ed,
    sunIntensity: 2.85,
    hemiSkyColor: 0xe0f2fe,
    hemiGroundColor: 0x14532d,
    hemiIntensity: 1.25,
    groundColor: 0x15803d, // Lush emerald pasture
    infieldColor: 0xd97706, // Amber golden wheat field
    foliageColors: [0x15803d, 0x166534, 0xca8a04],
    archAccentColor: 0x22c55e, // Emerald green
    roadWidth: 21.5,
    targetLapTimeSec: 56,
  },
};

export const TRACK_LIST: TrackSpec[] = [
  TRACK_CATALOG.city_day,
  TRACK_CATALOG.sunset_coast,
  TRACK_CATALOG.neon_night,
  TRACK_CATALOG.alpine_pass,
  TRACK_CATALOG.desert_dunes,
  TRACK_CATALOG.harbor_docks,
  TRACK_CATALOG.continental_highway,
  TRACK_CATALOG.trans_sahara_speedway,
  TRACK_CATALOG.tokyo_wangan_express,
  TRACK_CATALOG.nordic_skyline_pass,
  TRACK_CATALOG.countryside_meadows,
];

export const GAME_MODE_CATALOG: Record<GameModeId, GameModeSpec> = {
  grand_prix: {
    id: 'grand_prix',
    name: 'City Grand Prix',
    shortLabel: '3-Lap Circuit Race',
    description: 'Battle 5 AI rivals across 3 laps of the circuit. Finish on the podium to win.',
    totalLaps: 3,
    rivalCount: 5,
  },
  time_trial: {
    id: 'time_trial',
    name: 'Time Attack Pro',
    shortLabel: '2-Lap Clock Sprint',
    description: 'Pure speed against the stopwatch with rapid nitro regeneration.',
    totalLaps: 2,
    rivalCount: 1,
  },
  eliminator: {
    id: 'eliminator',
    name: 'Street Rush',
    shortLabel: 'Overtake & Drift Score',
    description: 'High-density rival pack. Chain clean overtakes and drifts for maximum points.',
    totalLaps: 2,
    rivalCount: 5,
  },
};

function catmullRomPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1[0] +
      (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  const z =
    0.5 *
    (2 * p1[1] +
      (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return [x, z];
}

export function buildTrackWaypoints(
  controlPoints: Array<[number, number]> = CIRCUIT_CONTROL_POINTS,
  subdivisionsPerSegment = 20,
): { waypoints: Waypoint2D[]; totalLength: number } {
  const n = controlPoints.length;
  const rawPoints: Array<[number, number]> = [];

  for (let i = 0; i < n; i++) {
    const p0 = controlPoints[(i - 1 + n) % n];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % n];
    const p3 = controlPoints[(i + 2) % n];
    for (let s = 0; s < subdivisionsPerSegment; s++) {
      const t = s / subdivisionsPerSegment;
      rawPoints.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  // Rotate array so index 0 is closest to (0, 0) heading +Z
  let startIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < rawPoints.length; i++) {
    const dx = rawPoints[i][0] - 0;
    const dz = rawPoints[i][1] - 0;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      startIdx = i;
    }
  }

  const orderedPoints: Array<[number, number]> = [];
  for (let i = 0; i < rawPoints.length; i++) {
    orderedPoints.push(rawPoints[(startIdx + i) % rawPoints.length]);
  }

  const waypoints: Waypoint2D[] = [];
  let totalLength = 0;
  const totalPts = orderedPoints.length;

  for (let i = 0; i < totalPts; i++) {
    const curr = orderedPoints[i];
    const next = orderedPoints[(i + 1) % totalPts];
    const prev = orderedPoints[(i - 1 + totalPts) % totalPts];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const tx = dx / len;
    const tz = dz / len;
    // Right-hand normal in XZ plane when looking along (tx, tz)
    const nx = -tz;
    const nz = tx;

    waypoints.push({
      x: curr[0],
      z: curr[1],
      tx,
      tz,
      nx,
      nz,
      distFromStart: totalLength,
    });

    const segDx = next[0] - curr[0];
    const segDz = next[1] - curr[1];
    totalLength += Math.hypot(segDx, segDz);
  }

  return { waypoints, totalLength };
}

export function sampleTrackAtDistance(
  waypoints: Waypoint2D[],
  totalLength: number,
  sDistance: number,
): Waypoint2D {
  const count = waypoints.length;
  if (count === 0) {
    return { x: 0, z: 0, tx: 0, tz: 1, nx: -1, nz: 0, distFromStart: 0 };
  }
  const wrappedS = ((sDistance % totalLength) + totalLength) % totalLength;

  // Binary search by distFromStart
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (waypoints[mid].distFromStart <= wrappedS) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const i0 = low;
  const i1 = (low + 1) % count;
  const w0 = waypoints[i0];
  const w1 = waypoints[i1];
  const segStart = w0.distFromStart;
  const segEnd = i1 === 0 ? totalLength : w1.distFromStart;
  const segLen = Math.max(0.0001, segEnd - segStart);
  const alpha = Math.max(0, Math.min(1, (wrappedS - segStart) / segLen));

  const tx = w0.tx + (w1.tx - w0.tx) * alpha;
  const tz = w0.tz + (w1.tz - w0.tz) * alpha;
  const tLen = Math.hypot(tx, tz) || 1;
  const ntx = tx / tLen;
  const ntz = tz / tLen;

  return {
    x: w0.x + (w1.x - w0.x) * alpha,
    z: w0.z + (w1.z - w0.z) * alpha,
    tx: ntx,
    tz: ntz,
    nx: -ntz,
    nz: ntx,
    distFromStart: wrappedS,
  };
}

export function projectOntoTrack(
  x: number,
  z: number,
  waypoints: Waypoint2D[],
): {
  index: number;
  waypoint: Waypoint2D;
  lateralOffset: number;
  distSq: number;
} {
  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const w = waypoints[i];
    const dx = x - w.x;
    const dz = z - w.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      bestIdx = i;
    }
  }
  const wp = waypoints[bestIdx];
  const dx = x - wp.x;
  const dz = z - wp.z;
  const lateralOffset = dx * wp.nx + dz * wp.nz;
  return {
    index: bestIdx,
    waypoint: wp,
    lateralOffset,
    distSq: bestDistSq,
  };
}

export function createInitialPlayerState(carSpec: CarSpec): VehiclePhysicsState {
  return {
    x: 0,
    z: 0,
    heading: 0, // facing +Z
    speed: 0,
    lateralSpeed: 0,
    steerAngle: 0,
    rpm: 1200,
    gear: 1,
    nitro: 100,
    isDrifting: false,
    isBoosting: false,
    driftScoreCurrent: 0,
    totalDriftScore: 0,
    lap: 1,
    maxSIndexReached: 0,
    trackProgress: 0,
    lateralOffset: 0,
    damageFlash: 0,
    invulnTimer: 0,
  };
}

export function computeGearAndRpm(
  speedMs: number,
  topSpeedKmh: number,
): { gear: number; rpm: number } {
  const speedKmh = Math.abs(speedMs) * 3.6;
  const ratio = Math.min(1, speedKmh / Math.max(100, topSpeedKmh));
  const gearThresholds = [0, 0.16, 0.32, 0.5, 0.68, 0.84, 1.05];
  let gear = 1;
  for (let g = 1; g <= 6; g++) {
    if (ratio >= gearThresholds[g - 1]) {
      gear = g;
    }
  }
  const low = gearThresholds[gear - 1];
  const high = gearThresholds[gear];
  const gearProgress = Math.max(0, Math.min(1, (ratio - low) / (high - low)));
  const rpm = Math.round(1400 + gearProgress * 7100);
  return { gear, rpm };
}

export function stepPlayerVehicle(
  state: VehiclePhysicsState,
  input: ControlInputState,
  car: CarSpec,
  waypoints: Waypoint2D[],
  totalLength: number,
  roadWidth: number,
  dt: number,
  isTimeTrial = false,
): {
  crossedLap: boolean;
  hitBarrier: boolean;
  barrierSide?: number;
} {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  if (clampedDt <= 0) {
    return { crossedLap: false, hitBarrier: false, barrierSide: 0 };
  }

  // Smooth steering
  const steerResponsiveness = 7.5 * car.handling;
  const steerBlend = 1 - Math.exp(-steerResponsiveness * clampedDt);
  state.steerAngle += (input.steer - state.steerAngle) * steerBlend;

  // Nitro management
  const canBoost =
    input.nitroHeld && state.nitro > 1 && (input.throttle > 0.1 || state.speed > 5);
  state.isBoosting = canBoost;
  if (canBoost) {
    state.nitro = Math.max(0, state.nitro - (isTimeTrial ? 14 : 24) * clampedDt);
  } else {
    const passiveRegen = isTimeTrial ? 14 : 5.5;
    state.nitro = Math.min(100, state.nitro + passiveRegen * clampedDt);
  }

  // Forward acceleration & braking
  const maxSpeedMs =
    (car.topSpeedKmh / 3.6) * (state.isBoosting ? car.nitroBoost : 1.0);
  const boostAccelMult = state.isBoosting ? 1.45 : 1.0;

  if (input.throttle > 0) {
    const speedRatio = Math.min(1, Math.max(0, state.speed / maxSpeedMs));
    const torqueCurve = 1.0 - 0.55 * speedRatio * speedRatio;
    state.speed +=
      input.throttle * car.accelRate * boostAccelMult * torqueCurve * clampedDt;
  }

  if (input.brake > 0) {
    if (state.speed > 1.0) {
      state.speed -= input.brake * 42 * clampedDt;
    } else {
      // Reverse gear
      state.speed -= input.brake * 14 * clampedDt;
    }
  }

  // Aerodynamic drag + rolling resistance
  const drag = 0.0032 * state.speed * Math.abs(state.speed) + 0.35 * state.speed;
  state.speed -= drag * clampedDt;
  state.speed = Math.max(-18, Math.min(maxSpeedMs, state.speed));

  // Drift physics
  const speedAbs = Math.abs(state.speed);
  const wantsDrift =
    input.driftHeld && speedAbs > 16 && Math.abs(state.steerAngle) > 0.2;
  state.isDrifting = wantsDrift;

  // Angular turn rate scales with speed at low speeds and stabilizes at high speed
  const lowSpeedFactor = Math.min(1, speedAbs / 8);
  const highSpeedDamp = 1 / (1 + speedAbs * 0.012);
  const driftTurnBoost = state.isDrifting ? 1.32 : 1.0;
  const turnSign = state.speed >= -0.1 ? 1 : -1;
  const angularVel =
    state.steerAngle *
    2.45 *
    car.handling *
    lowSpeedFactor *
    highSpeedDamp *
    driftTurnBoost *
    turnSign;

  // In Three.js right-handed space (looking down +Z with +Y up),
  // screen-right is -X (negative heading rotation around +Y),
  // and screen-left is +X (positive heading rotation around +Y).
  state.heading -= angularVel * clampedDt;

  // Lateral slip velocity for drift feel
  if (state.isDrifting) {
    const targetSlip = -state.steerAngle * state.speed * (1.0 - car.driftGrip * 0.55);
    state.lateralSpeed += (targetSlip - state.lateralSpeed) * Math.min(1, 8 * clampedDt);
    const frameDriftPts = Math.abs(state.lateralSpeed) * 12 * clampedDt;
    state.driftScoreCurrent += frameDriftPts;
    state.totalDriftScore += frameDriftPts;
    state.nitro = Math.min(100, state.nitro + 10 * clampedDt);
  } else {
    state.lateralSpeed *= Math.exp(-10 * clampedDt);
    state.driftScoreCurrent = 0;
  }

  // Integrate world position (heading 0 = +Z, screen-right vector = (-cosH, sinH))
  const sinH = Math.sin(state.heading);
  const cosH = Math.cos(state.heading);
  const forwardVx = sinH * state.speed;
  const forwardVz = cosH * state.speed;
  const rightVx = -cosH * state.lateralSpeed;
  const rightVz = sinH * state.lateralSpeed;

  state.x += (forwardVx + rightVx) * clampedDt;
  state.z += (forwardVz + rightVz) * clampedDt;

  // Project onto track for barriers and lap counting
  const proj = projectOntoTrack(state.x, state.z, waypoints);
  state.lateralOffset = proj.lateralOffset;

  const maxAllowedOffset = roadWidth * 0.54;
  let hitBarrier = false;

  if (Math.abs(proj.lateralOffset) > maxAllowedOffset) {
    hitBarrier = true;
    const clampedOffset = Math.sign(proj.lateralOffset) * maxAllowedOffset;
    state.x = proj.waypoint.x + proj.waypoint.nx * clampedOffset;
    state.z = proj.waypoint.z + proj.waypoint.nz * clampedOffset;
    state.lateralOffset = clampedOffset;
    state.speed *= 0.84;

    // Gently align heading toward track tangent so player never gets stuck on barrier
    const trackHeading = Math.atan2(proj.waypoint.tx, proj.waypoint.tz);
    let angleDiff = trackHeading - state.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    state.heading += angleDiff * 0.35;
  }

  // Checkpoint / Lap progression
  let crossedLap = false;
  const totalWps = waypoints.length;
  const idx = proj.index;

  // Advance maxSIndexReached if within reasonable forward window
  if (idx > state.maxSIndexReached && idx - state.maxSIndexReached < totalWps * 0.45) {
    state.maxSIndexReached = idx;
  }

  // Detect crossing start/finish line forward after completing at least 70% of track
  if (
    state.maxSIndexReached > totalWps * 0.7 &&
    idx < totalWps * 0.18 &&
    state.speed > 0
  ) {
    state.lap += 1;
    state.maxSIndexReached = idx;
    crossedLap = true;
  }

  state.trackProgress =
    (state.lap - 1) * totalLength + proj.waypoint.distFromStart;

  const { gear, rpm } = computeGearAndRpm(state.speed, car.topSpeedKmh);
  state.gear = gear;
  state.rpm = rpm;

  if (state.damageFlash > 0) {
    state.damageFlash = Math.max(0, state.damageFlash - clampedDt * 3.5);
  }
  if (state.invulnTimer > 0) {
    state.invulnTimer = Math.max(0, state.invulnTimer - clampedDt);
  }

  return {
    crossedLap,
    hitBarrier,
    barrierSide: hitBarrier ? Math.sign(proj.lateralOffset) : 0,
  };
}

export function createRivals(
  playerCarId: string,
  count: number,
  waypoints: Waypoint2D[],
  totalLength: number,
): RivalState[] {
  const availableCars = CAR_CATALOG.filter((c) => c.id !== playerCarId);
  const policies: RivalPolicy[] = ['apex_speedster', 'blocker', 'charger'];
  const driverNames = [
    'K. Takahashi',
    'M. Vance',
    'E. Rostova',
    'D. Sterling',
    'S. Moreau',
  ];

  const rivals: RivalState[] = [];
  for (let i = 0; i < count; i++) {
    const carSpec = availableCars[i % availableCars.length] || CAR_CATALOG[0];
    const policy = policies[i % policies.length];
    const sDistance = 14 + i * 16; // Staggered starting grid ahead of player
    const laneSign = i % 2 === 0 ? -1 : 1;
    const lateralOffset = laneSign * 3.6;
    const wp = sampleTrackAtDistance(waypoints, totalLength, sDistance);

    rivals.push({
      id: `rival_${i}`,
      name: driverNames[i % driverNames.length],
      carSpec,
      policy,
      sDistance,
      lateralOffset,
      targetLateralOffset: lateralOffset,
      speed: 12,
      basePaceMultiplier: 0.74 + i * 0.032,
      x: wp.x + wp.nx * lateralOffset,
      z: wp.z + wp.nz * lateralOffset,
      heading: Math.atan2(wp.tx, wp.tz),
      lap: 1,
      totalProgress: sDistance,
      aggressionTimer: 1.5 + i * 0.8,
      telegraphingMove: false,
    });
  }
  return rivals;
}

/**
 * Updates AI Rival with 3 distinct driving policies:
 * 1. 'apex_speedster': Hugs inside racing line on corners, high top speed, smooth lane transitions.
 * 2. 'blocker': Tracks player lateral offset when player is approaching from behind to defend position.
 * 3. 'charger': Periodically telegraphs a burst overtake maneuver with a lateral lane sweep and speed surge.
 */
export function stepRivalVehicle(
  rival: RivalState,
  player: VehiclePhysicsState,
  waypoints: Waypoint2D[],
  totalLength: number,
  roadWidth: number,
  elapsedRaceSec: number,
  dt: number,
): void {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  if (clampedDt <= 0) return;

  // Smooth difficulty ramp: gentle opening 10s, scales gradually with elapsed time
  const rampFactor = Math.min(1.08, 0.88 + Math.min(elapsedRaceSec, 60) * 0.003);
  const maxRivalSpeedMs =
    (rival.carSpec.topSpeedKmh / 3.6) * rival.basePaceMultiplier * rampFactor;

  rival.aggressionTimer -= clampedDt;
  const distToPlayer = rival.totalProgress - player.trackProgress;

  // Rubber-band balance so pack stays exciting without unfair teleporting
  let rubberBand = 1.0;
  if (distToPlayer > 95) {
    rubberBand = 0.86;
  } else if (distToPlayer < -85) {
    rubberBand = 1.14;
  }

  let policySpeedBoost = 1.0;

  if (rival.policy === 'apex_speedster') {
    // Look ahead on track to hug the apex of upcoming curve
    const wpNow = sampleTrackAtDistance(waypoints, totalLength, rival.sDistance);
    const wpAhead = sampleTrackAtDistance(
      waypoints,
      totalLength,
      rival.sDistance + 35,
    );
    const cross = wpNow.tx * wpAhead.tz - wpNow.tz * wpAhead.tx;
    rival.targetLateralOffset = Math.max(
      -roadWidth * 0.35,
      Math.min(roadWidth * 0.35, -cross * 18),
    );
    rival.telegraphingMove = false;
  } else if (rival.policy === 'blocker') {
    // If player is within 35m behind, mirror player's lane with a telegraph
    if (distToPlayer > 4 && distToPlayer < 38) {
      rival.telegraphingMove = true;
      rival.targetLateralOffset = Math.max(
        -roadWidth * 0.36,
        Math.min(roadWidth * 0.36, player.lateralOffset * 0.85),
      );
    } else {
      rival.telegraphingMove = false;
      if (rival.aggressionTimer <= 0) {
        rival.aggressionTimer = 3.2;
        rival.targetLateralOffset = (Math.sin(rival.sDistance * 0.05) > 0 ? 1 : -1) * 3.5;
      }
    }
  } else if (rival.policy === 'charger') {
    // Charger cycles through telegraph -> burst surge -> cooldown
    if (rival.aggressionTimer <= 0) {
      rival.aggressionTimer = 4.5;
      rival.targetLateralOffset = rival.lateralOffset > 0 ? -4.2 : 4.2;
    }
    if (rival.aggressionTimer > 3.2) {
      rival.telegraphingMove = true; // Windup telegraph before surge
      policySpeedBoost = 1.0;
    } else if (rival.aggressionTimer > 1.8) {
      rival.telegraphingMove = false;
      policySpeedBoost = 1.15; // Active surge
    } else {
      rival.telegraphingMove = false;
    }
  }

  const targetSpeed = maxRivalSpeedMs * rubberBand * policySpeedBoost;
  rival.speed += (targetSpeed - rival.speed) * Math.min(1, 2.8 * clampedDt);

  // Advance along spline
  const prevS = rival.sDistance;
  rival.sDistance += rival.speed * clampedDt;
  if (rival.sDistance >= totalLength) {
    rival.sDistance -= totalLength;
    rival.lap += 1;
  } else if (prevS > totalLength * 0.85 && rival.sDistance < totalLength * 0.15) {
    rival.lap += 1;
  }

  rival.totalProgress = (rival.lap - 1) * totalLength + rival.sDistance;

  // Smooth lateral movement
  rival.lateralOffset +=
    (rival.targetLateralOffset - rival.lateralOffset) * Math.min(1, 3.5 * clampedDt);

  const wp = sampleTrackAtDistance(waypoints, totalLength, rival.sDistance);
  const nextX = wp.x + wp.nx * rival.lateralOffset;
  const nextZ = wp.z + wp.nz * rival.lateralOffset;

  const moveDx = nextX - rival.x;
  const moveDz = nextZ - rival.z;
  if (moveDx * moveDx + moveDz * moveDz > 0.0001) {
    rival.heading = Math.atan2(moveDx, moveDz);
  } else {
    rival.heading = Math.atan2(wp.tx, wp.tz);
  }

  rival.x = nextX;
  rival.z = nextZ;
}

export interface VehicleCollisionResult {
  collided: boolean;
  impactSeverity: number;
  impactNx: number;
  impactNz: number;
  isSideScrape?: boolean;
  isRearBump?: boolean;
  bumpDirection?: 'player_rear_ended_rival' | 'rival_rear_ended_player';
  contactPointX?: number;
  contactPointZ?: number;
  relSpeed?: number;
}

/**
 * Calculates the shortest distance squared and closest points between two 2D line segments
 * S1: P0 -> P1, and S2: Q0 -> Q1.
 */
export function closestPointsBetweenSegments2D(
  p0x: number,
  p0z: number,
  p1x: number,
  p1z: number,
  q0x: number,
  q0z: number,
  q1x: number,
  q1z: number,
): {
  distSq: number;
  px: number;
  pz: number;
  qx: number;
  qz: number;
} {
  const d1x = p1x - p0x;
  const d1z = p1z - p0z;
  const d2x = q1x - q0x;
  const d2z = q1z - q0z;
  const rx = p0x - q0x;
  const rz = p0z - q0z;

  const a = d1x * d1x + d1z * d1z;
  const e = d2x * d2x + d2z * d2z;
  const f = d2x * rx + d2z * rz;

  let s = 0;
  let t = 0;

  if (a <= 0.0001 && e <= 0.0001) {
    s = 0;
    t = 0;
  } else if (a <= 0.0001) {
    s = 0;
    t = Math.max(0, Math.min(1, f / (e || 0.0001)));
  } else {
    const c = d1x * rx + d1z * rz;
    if (e <= 0.0001) {
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = d1x * d2x + d1z * d2z;
      const denom = a * e - b * b;

      if (Math.abs(denom) > 0.00001) {
        s = Math.max(0, Math.min(1, (b * f - c * e) / denom));
      } else {
        s = 0;
      }

      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }

  const px = p0x + s * d1x;
  const pz = p0z + s * d1z;
  const qx = q0x + t * d2x;
  const qz = q0z + t * d2z;
  const distSq = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);

  return { distSq, px, pz, qx, qz };
}

export function resolveVehicleCollision(
  player: VehiclePhysicsState,
  rival: RivalState,
  waypoints?: Waypoint2D[],
  totalLength?: number,
  roadWidth?: number,
): VehicleCollisionResult {
  const pFx = Math.sin(player.heading);
  const pFz = Math.cos(player.heading);
  const pRx = Math.cos(player.heading);
  const pRz = -Math.sin(player.heading);

  const rFx = Math.sin(rival.heading);
  const rFz = Math.cos(rival.heading);

  // High-precision oriented capsule bounds: spine of length 2.3m and radius 1.04m (combined 2.08m)
  // Perfectly fits 2.0m wide by 4.5m long GT car dimensions without phantom side collisions.
  const spineHalfLen = 1.15;
  const minRadius = 2.08;

  const p0x = player.x - pFx * spineHalfLen;
  const p0z = player.z - pFz * spineHalfLen;
  const p1x = player.x + pFx * spineHalfLen;
  const p1z = player.z + pFz * spineHalfLen;

  const q0x = rival.x - rFx * spineHalfLen;
  const q0z = rival.z - rFz * spineHalfLen;
  const q1x = rival.x + rFx * spineHalfLen;
  const q1z = rival.z + rFz * spineHalfLen;

  const { distSq, px, pz, qx, qz } = closestPointsBetweenSegments2D(
    p0x, p0z, p1x, p1z,
    q0x, q0z, q1x, q1z,
  );

  if (distSq >= minRadius * minRadius) {
    return {
      collided: false,
      impactSeverity: 0,
      impactNx: 0,
      impactNz: 0,
    };
  }

  const dist = Math.sqrt(distSq);
  const overlap = minRadius - dist;

  let nx = 0;
  let nz = 0;
  if (dist > 0.001) {
    nx = (px - qx) / dist;
    nz = (pz - qz) / dist;
  } else {
    const cdx = player.x - rival.x;
    const cdz = player.z - rival.z;
    const cdist = Math.hypot(cdx, cdz) || 0.001;
    nx = cdx / cdist;
    nz = cdz / cdist;
  }

  const contactPointX = (px + qx) * 0.5;
  const contactPointZ = (pz + qz) * 0.5;

  const relSpeed = Math.abs(player.speed - rival.speed);

  // Directional classification:
  // Dot product of vehicle headings (> 0.60 means racing roughly parallel along track)
  const dotHeading = pFx * rFx + pFz * rFz;
  const normLateral = Math.abs(nx * pRx + nz * pRz);
  const normForward = nx * pFx + nz * pFz;

  const isParallel = dotHeading > 0.60;
  const isSideScrape = isParallel && normLateral > 0.45;
  const isRearBump = isParallel && !isSideScrape;

  let bumpDirection: 'player_rear_ended_rival' | 'rival_rear_ended_player' | undefined;
  if (isRearBump) {
    if (normForward < -0.2) {
      bumpDirection = 'player_rear_ended_rival';
    } else if (normForward > 0.2) {
      bumpDirection = 'rival_rear_ended_player';
    } else {
      bumpDirection = player.speed >= rival.speed ? 'player_rear_ended_rival' : 'rival_rear_ended_player';
    }
  }

  // Calculate realistic arcade impact severity
  let impactSeverity: number;
  if (isSideScrape) {
    impactSeverity = Math.max(0.20, Math.min(0.55, 0.20 + relSpeed / 35));
  } else if (isRearBump) {
    impactSeverity = Math.max(0.30, Math.min(0.85, 0.30 + relSpeed / 22));
  } else {
    impactSeverity = Math.max(0.40, Math.min(1.0, 0.40 + relSpeed / 18 + overlap * 0.25));
  }

  // Handle physics response & momentum transfer
  if (isSideScrape) {
    // Door-to-door side rub: minimal speed drop (gentle friction), smooth lateral deflection
    player.x += nx * overlap * 0.58;
    player.z += nz * overlap * 0.58;
    rival.x -= nx * overlap * 0.42;
    rival.z -= nz * overlap * 0.42;

    player.speed = Math.max(8, player.speed * 0.985);
    rival.speed = Math.max(8, rival.speed * 0.985);

    if (player.invulnTimer <= 0) {
      player.damageFlash = 1.0;
      player.invulnTimer = 0.35;
    }
  } else if (isRearBump) {
    // Bump drafting / rear collision: exchange momentum!
    player.x += nx * overlap * 0.55;
    player.z += nz * overlap * 0.55;
    rival.x -= nx * overlap * 0.45;
    rival.z -= nz * overlap * 0.45;

    if (bumpDirection === 'player_rear_ended_rival') {
      const speedDelta = player.speed - rival.speed;
      if (speedDelta > 0) {
        const transfer = Math.min(speedDelta * 0.45, 8.5);
        rival.speed += transfer * 1.1; // Boost bumped car forward
        player.speed = Math.max(6, player.speed - transfer * 0.65); // Player keeps forward momentum
      }
    } else {
      const speedDelta = rival.speed - player.speed;
      if (speedDelta > 0) {
        const transfer = Math.min(speedDelta * 0.45, 8.5);
        player.speed += transfer * 1.05; // Player gets bumped forward
        rival.speed = Math.max(6, rival.speed - transfer * 0.7);
      }
    }

    if (player.invulnTimer <= 0) {
      player.damageFlash = 1.0;
      player.invulnTimer = 0.38;
    }
  } else {
    // Blunt / T-Bone / Head-On Impact
    player.x += nx * overlap * 0.65;
    player.z += nz * overlap * 0.65;
    rival.x -= nx * overlap * 0.45;
    rival.z -= nz * overlap * 0.45;

    if (player.invulnTimer <= 0) {
      player.speed = Math.max(6, player.speed * 0.88);
      player.damageFlash = 1.0;
      player.invulnTimer = 0.42;
    }
  }

  // Update rival lane offset and reaction so AI yields space instead of snapping back
  if (waypoints && totalLength) {
    const wp = sampleTrackAtDistance(waypoints, totalLength, rival.sDistance);
    const latPush = (-nx * wp.nx - nz * wp.nz) * overlap;
    const longPush = (-nx * wp.tx - nz * wp.tz) * overlap;
    const maxHalfRoad = (roadWidth ?? 18) * 0.40;
    rival.lateralOffset = Math.max(-maxHalfRoad, Math.min(maxHalfRoad, rival.lateralOffset + latPush * 0.6));
    rival.sDistance += longPush * 0.4;
    rival.targetLateralOffset = Math.max(
      -maxHalfRoad,
      Math.min(maxHalfRoad, rival.lateralOffset + Math.sign(latPush || 1) * 0.85),
    );
    rival.aggressionTimer = Math.max(rival.aggressionTimer, 1.2);
  } else {
    const rRx = Math.cos(rival.heading);
    const rRz = -Math.sin(rival.heading);
    const latPush = (-nx * rRx - nz * rRz) * overlap;
    rival.lateralOffset += latPush * 0.55;
    rival.targetLateralOffset = rival.lateralOffset + Math.sign(latPush || 1) * 0.85;
    rival.aggressionTimer = Math.max(rival.aggressionTimer, 1.2);
  }

  return {
    collided: true,
    impactSeverity,
    impactNx: nx,
    impactNz: nz,
    isSideScrape,
    isRearBump,
    bumpDirection,
    contactPointX,
    contactPointZ,
    relSpeed,
  };
}

export function computeRaceStandings(
  player: VehiclePhysicsState,
  rivals: RivalState[],
): { playerPosition: number; orderedIds: string[] } {
  const entries = [
    { id: 'player', progress: player.trackProgress },
    ...rivals.map((r) => ({ id: r.id, progress: r.totalProgress })),
  ];
  entries.sort((a, b) => b.progress - a.progress);
  const playerPosition = entries.findIndex((e) => e.id === 'player') + 1;
  return {
    playerPosition: playerPosition > 0 ? playerPosition : 1,
    orderedIds: entries.map((e) => e.id),
  };
}

export function calculateFinalRaceScore(params: {
  position: number;
  totalLaps: number;
  totalTimeSec: number;
  driftPoints: number;
  overtakes: number;
}): number {
  const placementBonus = Math.max(500, (7 - params.position) * 1500);
  const speedBonus = Math.max(
    0,
    Math.round((params.totalLaps * 52 - params.totalTimeSec) * 45),
  );
  const driftBonus = Math.round(params.driftPoints);
  const overtakeBonus = params.overtakes * 250;
  return placementBonus + speedBonus + driftBonus + overtakeBonus;
}

export interface MountainPlacement {
  x: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotY: number;
  footprintRadius: number;
}

export function minDistanceToWaypoints(
  px: number,
  pz: number,
  waypoints: Waypoint2D[],
): number {
  let minD2 = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const dx = px - waypoints[i].x;
    const dz = pz - waypoints[i].z;
    const d2 = dx * dx + dz * dz;
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

/**
 * Computes a 360-degree panoramic ring of mountain placements around the circuit,
 * pushing any mountain radially outward until its full 3D base footprint is
 * guaranteed to clear every road waypoint by at least (roadWidth * 0.65 + 48) meters.
 */
export function computeSafeMountainRing(
  waypoints: Waypoint2D[],
  roadWidth: number,
  count = 44,
  baseGeometryRadius = 56,
): MountainPlacement[] {
  let sumX = 0;
  let sumZ = 0;
  for (const wp of waypoints) {
    sumX += wp.x;
    sumZ += wp.z;
  }
  const cx = waypoints.length > 0 ? sumX / waypoints.length : 0;
  const cz = waypoints.length > 0 ? sumZ / waypoints.length : 0;

  let maxWpRadius = 0;
  for (const wp of waypoints) {
    const d = Math.hypot(wp.x - cx, wp.z - cz);
    if (d > maxWpRadius) maxWpRadius = d;
  }

  const placements: MountainPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);

    const scaleX = 1.05 + (i % 4) * 0.24;
    const scaleY = 0.95 + (i % 5) * 0.36;
    const scaleZ = 1.05 + (i % 3) * 0.24;
    const maxScaleXZ = Math.max(scaleX, scaleZ);
    // Account for ridge buttress wave extension (up to 1.38x of baseRadius)
    const footprintRadius = baseGeometryRadius * maxScaleXZ * 1.42;
    const minRequiredDist = footprintRadius + roadWidth * 0.65 + 48;

    let distFromCenter = Math.max(360, maxWpRadius + footprintRadius + 55) + (i % 3) * 38;
    let mx = cx + dirX * distFromCenter;
    let mz = cz + dirZ * distFromCenter;

    let safetyIter = 0;
    while (
      minDistanceToWaypoints(mx, mz, waypoints) < minRequiredDist &&
      safetyIter < 40
    ) {
      distFromCenter += 25;
      mx = cx + dirX * distFromCenter;
      mz = cz + dirZ * distFromCenter;
      safetyIter++;
    }

    placements.push({
      x: mx,
      z: mz,
      scaleX,
      scaleY,
      scaleZ,
      rotY: i * 0.85,
      footprintRadius,
    });
  }

  return placements;
}

