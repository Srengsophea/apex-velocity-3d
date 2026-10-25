import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { computeSafeMountainRing, minDistanceToWaypoints } from './rules';
import { TrackSpec, Waypoint2D } from './types';

export interface WorldEnvironmentRefs {
  root: THREE.Group;
  showroomPodium: THREE.Group;
  sunLight: THREE.DirectionalLight;
  currentTrackSpec: TrackSpec;
  rebuildForTrack: (
    spec: TrackSpec,
    waypoints: Waypoint2D[],
    totalLength: number,
  ) => void;
}

function hexToRgbString(hex: number, alpha = 1): string {
  const c = new THREE.Color(hex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Deterministic pseudo-random helper in [0, 1)
function hash01(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * 1. REALISTIC ATMOSPHERIC SKY DOME TEXTURE (2048x1024)
 * Features Rayleigh/Mie horizon scattering, multi-layered cumulus clouds with sunlit
 * silver linings and shaded bases, crepuscular god-rays, and starfield/nebula at night.
 */
function createSkyDomeTexture(spec: TrackSpec): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const horizonY = Math.floor(h * 0.50); // Exact sphere equator

    const isNight = spec.id === 'neon_night' || spec.id === 'tokyo_wangan_express';
    const isStormy = spec.id === 'harbor_docks';
    const isSunset = spec.id === 'sunset_coast';
    const isDesert = spec.id === 'desert_dunes' || spec.id === 'trans_sahara_speedway';
    const isCountryside = spec.envKind === 'countryside';

    // 1. Photorealistic Atmospheric Zenith-to-Horizon Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isSunset) {
      // Natural Rayleigh sunset: deep twilight blue -> clear sky -> warm periwinkle -> soft peach -> golden horizon
      skyGrad.addColorStop(0, '#1e3a8a');
      skyGrad.addColorStop(0.22, '#2563eb');
      skyGrad.addColorStop(0.38, '#60a5fa');
      skyGrad.addColorStop(0.45, '#fdba74');
      skyGrad.addColorStop(0.50, '#fef08a');
      skyGrad.addColorStop(0.54, '#fdba74');
      skyGrad.addColorStop(0.65, '#1e3a8a');
      skyGrad.addColorStop(1, '#0f172a');
    } else if (isNight) {
      // True midnight sky: obsidian deep space -> dark midnight blue -> subtle city horizon glow
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.28, '#080e1e');
      skyGrad.addColorStop(0.46, '#0f172a');
      skyGrad.addColorStop(0.50, '#162032');
      skyGrad.addColorStop(0.55, '#0f172a');
      skyGrad.addColorStop(1, '#020617');
    } else if (isCountryside) {
      // Crisp pastoral summer sky: deep azure zenith -> radiant cerulean -> sunlit golden horizon
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.22, '#38bdf8');
      skyGrad.addColorStop(0.42, '#7dd3fc');
      skyGrad.addColorStop(0.48, '#fed7aa');
      skyGrad.addColorStop(0.50, '#fef08a');
      skyGrad.addColorStop(0.55, '#fde68a');
      skyGrad.addColorStop(0.70, '#15803d');
      skyGrad.addColorStop(1, '#14532d');
    } else if (isDesert) {
      // Crisp high-altitude desert sky: deep cerulean -> bright azure -> pale sand dust horizon
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.24, '#38bdf8');
      skyGrad.addColorStop(0.42, '#7dd3fc');
      skyGrad.addColorStop(0.48, '#fed7aa');
      skyGrad.addColorStop(0.50, '#fef3c7');
      skyGrad.addColorStop(0.55, '#fde68a');
      skyGrad.addColorStop(0.70, '#b45309');
      skyGrad.addColorStop(1, '#78350f');
    } else if (isStormy) {
      // Maritime blue hour / overcast ocean sky
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.28, '#1e293b');
      skyGrad.addColorStop(0.46, '#334155');
      skyGrad.addColorStop(0.50, '#475569');
      skyGrad.addColorStop(0.55, '#334155');
      skyGrad.addColorStop(1, '#071527');
    } else {
      // General daylight (Metro GP / Alpine)
      skyGrad.addColorStop(0, hexToRgbString(spec.skyTopColor, 1));
      skyGrad.addColorStop(0.42, hexToRgbString(spec.skyTopColor, 0.95));
      skyGrad.addColorStop(0.50, hexToRgbString(spec.skyHorizonColor, 1));
      skyGrad.addColorStop(0.55, hexToRgbString(spec.skyHorizonColor, 0.95));
      skyGrad.addColorStop(1, hexToRgbString(spec.groundColor, 1));
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    if (isNight) {
      // ==========================================
      // CYBER NIGHT: Realistic dark night with 650 pin-point stars & ONE silver moon (NO SUN)
      // ==========================================
      for (let i = 0; i < 650; i++) {
        const sx = Math.floor(hash01(i * 3.17) * w);
        const sy = Math.floor(hash01(i * 7.31) * (horizonY - 40));
        const bright = 0.25 + hash01(i * 13.9) * 0.75;
        const size = i % 31 === 0 ? 2.2 : i % 9 === 0 ? 1.5 : 1.0;
        ctx.fillStyle = `rgba(248, 250, 252, ${bright})`;
        ctx.fillRect(sx, sy, size, size);
      }

      // ONE Single Realistic Silver Crescent Moon
      const moonX = Math.floor(w * 0.58);
      const moonY = horizonY - 210;
      const moonR = 26;

      // Soft natural cool lunar corona
      const moonGlow = ctx.createRadialGradient(
        moonX,
        moonY,
        8,
        moonX,
        moonY,
        110,
      );
      moonGlow.addColorStop(0, 'rgba(241, 245, 249, 0.35)');
      moonGlow.addColorStop(0.35, 'rgba(203, 213, 225, 0.12)');
      moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 110, 0, Math.PI * 2);
      ctx.fill();

      // Sharp luminous silver moon disc
      const moonGrad = ctx.createRadialGradient(
        moonX - 5,
        moonY - 5,
        2,
        moonX,
        moonY,
        moonR,
      );
      moonGrad.addColorStop(0, '#ffffff');
      moonGrad.addColorStop(0.8, '#e2e8f0');
      moonGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Delicate lunar dark limb / crescent shadow
      ctx.fillStyle = '#0a1128';
      ctx.beginPath();
      ctx.arc(moonX + 9, moonY - 3, moonR * 0.88, 0, Math.PI * 2);
      ctx.fill();

      // Subtle city horizon ambient haze
      const cityHaze = ctx.createLinearGradient(
        0,
        horizonY - 45,
        0,
        horizonY + 25,
      );
      cityHaze.addColorStop(0, 'rgba(0,0,0,0)');
      cityHaze.addColorStop(0.6, 'rgba(15, 23, 42, 0.45)');
      cityHaze.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cityHaze;
      ctx.fillRect(0, horizonY - 45, w, 70);
    } else if (isStormy) {
      // ==========================================
      // HARBOR PORT: Moody maritime overcast & ONE veiled silver moon (NO SUN)
      // ==========================================
      // Soft layered stratus cloud banks
      for (let i = 0; i < 24; i++) {
        const cx = (i * 193) % w;
        const cy = 70 + ((i * 41) % (horizonY - 140));
        const rw = 240 + (i % 5) * 70;
        const rh = 16 + (i % 3) * 10;
        const cGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, rw);
        cGrad.addColorStop(0, 'rgba(30, 41, 59, 0.45)');
        cGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.22)');
        cGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ONE Veiled Silver Moon
      const moonX = Math.floor(w * 0.55);
      const moonY = horizonY - 190;
      const moonR = 24;

      const stormGlow = ctx.createRadialGradient(
        moonX,
        moonY,
        6,
        moonX,
        moonY,
        130,
      );
      stormGlow.addColorStop(0, 'rgba(241, 245, 249, 0.35)');
      stormGlow.addColorStop(0.4, 'rgba(148, 163, 184, 0.12)');
      stormGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = stormGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Misty maritime cloud veil
      ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.beginPath();
      ctx.ellipse(
        moonX + 6,
        moonY + 4,
        moonR * 1.5,
        moonR * 0.5,
        0.08,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Maritime horizon fog belt
      const seaFog = ctx.createLinearGradient(
        0,
        horizonY - 50,
        0,
        horizonY + 30,
      );
      seaFog.addColorStop(0, 'rgba(0,0,0,0)');
      seaFog.addColorStop(0.5, 'rgba(51, 65, 85, 0.42)');
      seaFog.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = seaFog;
      ctx.fillRect(0, horizonY - 50, w, 80);
    } else {
      // ==========================================
      // DAYTIME & SUNSET: Natural sky with ONE single sun (NO MULTIPLE SUNS)
      // ==========================================
      // Delicate high-altitude wispy cirrus streaks
      for (let i = 0; i < 20; i++) {
        const cx = (i * 223) % w;
        const cy = 70 + ((i * 47) % (horizonY - 200));
        const rw = 180 + (i % 6) * 60;
        const rh = 9 + (i % 4) * 6;
        const cGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, rw);
        const colStr = isSunset
          ? 'rgba(255, 247, 237, 0.22)'
          : 'rgba(255, 255, 255, 0.18)';
        cGrad.addColorStop(0, colStr);
        cGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // ONE Single Photorealistic Sun
      const sunX = Math.floor(w * 0.5);
      const sunY = isSunset
        ? horizonY - 35 // Golden sunset sitting right at the ocean horizon
        : isDesert
          ? horizonY - 180 // High brilliant desert sun
          : horizonY - 150; // City / Alpine sun

      const coreRadius = isSunset ? 24 : 18;
      const haloR = isSunset ? 220 : 160;

      // Natural atmospheric corona halo (smooth exponential falloff)
      const sunHalo = ctx.createRadialGradient(
        sunX,
        sunY,
        coreRadius * 0.7,
        sunX,
        sunY,
        haloR,
      );
      if (isSunset) {
        sunHalo.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        sunHalo.addColorStop(0.2, 'rgba(253, 186, 116, 0.45)');
        sunHalo.addColorStop(0.55, 'rgba(251, 146, 60, 0.15)');
        sunHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        sunHalo.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
        sunHalo.addColorStop(0.25, 'rgba(254, 243, 199, 0.35)');
        sunHalo.addColorStop(0.65, 'rgba(224, 242, 254, 0.12)');
        sunHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Brilliant crisp solar core
      const sunCore = ctx.createRadialGradient(
        sunX,
        sunY,
        0,
        sunX,
        sunY,
        coreRadius,
      );
      sunCore.addColorStop(0, '#ffffff');
      sunCore.addColorStop(0.85, '#ffffff');
      sunCore.addColorStop(1, isSunset ? '#fef08a' : '#fffbeb');
      ctx.fillStyle = sunCore;
      ctx.beginPath();
      ctx.arc(sunX, sunY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Soft natural horizon aerial haze belt
      const hBelt = ctx.createLinearGradient(
        0,
        horizonY - 45,
        0,
        horizonY + 25,
      );
      hBelt.addColorStop(0, 'rgba(255, 255, 255, 0)');
      hBelt.addColorStop(
        0.55,
        hexToRgbString(spec.skyHorizonColor, isSunset ? 0.4 : 0.25),
      );
      hBelt.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hBelt;
      ctx.fillRect(0, horizonY - 45, w, 70);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 2. REALISTIC PROCEDURAL GRASS / TERRAIN TEXTURE (1024x1024 tiled)
 * Generates detailed multi-blade grass turf, clover patches, wildflowers, and organic soil micro-detail.
 */
function createTerrainGrassTexture(
  spec: TrackSpec,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const isCountryside = spec.envKind === 'countryside';
  const canvas = document.createElement('canvas');
  canvas.width = isCountryside ? 2048 : 1024;
  canvas.height = isCountryside ? 2048 : 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const isDesert = spec.envKind === 'desert';
    const isAlpine = spec.envKind === 'alpine';
    const isNight = spec.id === 'neon_night';
    const isHarbor = spec.id === 'harbor_docks';
    const isCoastal = spec.envKind === 'coastal';

    if (isCountryside) {
      // Authentic Southeast Asian Tropical Terraced Rice Paddy Landscape (High Resolution 2048x2048)
      // 1. Deep moist fertile tropical agricultural loam soil base
      ctx.fillStyle = '#1e160e';
      ctx.fillRect(0, 0, 2048, 2048);

      // 2. 6x6 Expansive Agricultural Paddy Parcels (~36m x 36m in world space with repeat 10)
      const gridSize = 6;
      const cellSize = 2048 / gridSize; // ~341.3px per parcel
      const dykeWidth = 12;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x0 = Math.floor(c * cellSize);
          const y0 = Math.floor(r * cellSize);
          const w0 = Math.floor((c + 1) * cellSize) - x0;
          const h0 = Math.floor((r + 1) * cellSize) - y0;
          const seed = hash01(r * 23.3 + c * 41.7);

          // Earthen grass-crested dyke / bund border
          ctx.fillStyle = '#382312';
          ctx.fillRect(x0, y0, w0, h0);
          ctx.fillStyle = '#234410';
          ctx.fillRect(x0 + 2, y0 + 2, w0 - 4, h0 - 4);

          // Interior Paddy Field Basin
          const basinX = x0 + dykeWidth;
          const basinY = y0 + dykeWidth;
          const basinW = w0 - dykeWidth * 2;
          const basinH = h0 - dykeWidth * 2;

          if (seed < 0.72) {
            // Emerald Lush Young Rice Paddy (matching vibrant green fields in reference photo)
            const emeraldGrad = ctx.createLinearGradient(basinX, basinY, basinX + basinW, basinY + basinH);
            const isDarker = seed < 0.36;
            emeraldGrad.addColorStop(0, isDarker ? '#275e21' : '#327329');
            emeraldGrad.addColorStop(0.5, isDarker ? '#347b2b' : '#3f8d34');
            emeraldGrad.addColorStop(1, isDarker ? '#22521c' : '#2b6623');
            ctx.fillStyle = emeraldGrad;
            ctx.fillRect(basinX, basinY, basinW, basinH);

            // Continuous parallel linear crop planting rows (fine agricultural furrows)
            const isHorizontal = seed > 0.36;
            if (isHorizontal) {
              for (let py = basinY + 4; py < basinY + basinH - 4; py += 6) {
                ctx.fillStyle = 'rgba(74, 222, 128, 0.20)';
                ctx.fillRect(basinX + 2, py, basinW - 4, 1.8);
                ctx.fillStyle = 'rgba(15, 45, 12, 0.22)';
                ctx.fillRect(basinX + 2, py + 1.8, basinW - 4, 1.4);
              }
            } else {
              for (let px = basinX + 4; px < basinX + basinW - 4; px += 6) {
                ctx.fillStyle = 'rgba(74, 222, 128, 0.20)';
                ctx.fillRect(px, basinY + 2, 1.8, basinH - 4);
                ctx.fillStyle = 'rgba(15, 45, 12, 0.22)';
                ctx.fillRect(px + 1.8, basinY + 2, 1.4, basinH - 4);
              }
            }
          } else {
            // Golden Mature Harvest Rice Field (warm natural straw golden grain)
            const goldGrad = ctx.createLinearGradient(basinX, basinY, basinX + basinW, basinY + basinH);
            goldGrad.addColorStop(0, '#a87820');
            goldGrad.addColorStop(0.5, '#c29235');
            goldGrad.addColorStop(1, '#946618');
            ctx.fillStyle = goldGrad;
            ctx.fillRect(basinX, basinY, basinW, basinH);

            // Sunlit golden crop shimmer rows
            const isHorizontal = seed > 0.85;
            if (isHorizontal) {
              for (let py = basinY + 4; py < basinY + basinH - 4; py += 5) {
                ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
                ctx.fillRect(basinX + 2, py, basinW - 4, 1.8);
                ctx.fillStyle = 'rgba(113, 63, 18, 0.20)';
                ctx.fillRect(basinX + 2, py + 1.8, basinW - 4, 1.4);
              }
            } else {
              for (let px = basinX + 4; px < basinX + basinW - 4; px += 5) {
                ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
                ctx.fillRect(px, basinY + 2, 1.8, basinH - 4);
                ctx.fillStyle = 'rgba(113, 63, 18, 0.20)';
                ctx.fillRect(px + 1.8, basinY + 2, 1.4, basinH - 4);
              }
            }
          }
        }
      }

      // 3. Earthen bund pathways & farmer trails
      ctx.fillStyle = '#452b14';
      ctx.fillRect(0, 1021, 2048, 6);
      ctx.fillRect(1021, 0, 6, 2048);
    } else {
      const baseHex = isDesert
        ? '#d97706' // Natural warm golden desert sand
        : isAlpine
          ? '#1d4d32' // Alpine mountain evergreen turf
          : isNight
            ? '#0f172a' // Clean dark city plaza asphalt
            : isHarbor
              ? '#1e293b' // Dark industrial dock concrete
              : isCoastal
                ? '#15803d' // Lush coastal turf
                : '#15803d';
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 1024, 1024);

      // Organic terrain mottling patches tailored per biome
      for (let i = 0; i < 240; i++) {
        const px = hash01(i * 5.1) * 1024;
        const py = hash01(i * 9.7) * 1024;
        const rad = 32 + hash01(i * 3.3) * 76;
        const g = ctx.createRadialGradient(px, py, 4, px, py, rad);
        if (isDesert) {
          g.addColorStop(
            0,
            i % 2 === 0 ? 'rgba(180, 83, 9, 0.35)' : 'rgba(253, 230, 138, 0.35)',
          );
        } else if (isNight) {
          g.addColorStop(
            0,
            i % 2 === 0
              ? 'rgba(30, 41, 59, 0.35)'
              : 'rgba(15, 23, 42, 0.45)',
          );
        } else if (isHarbor) {
          g.addColorStop(
            0,
            i % 2 === 0
              ? 'rgba(51, 65, 85, 0.35)'
              : 'rgba(15, 23, 42, 0.45)',
          );
        } else if (isCoastal) {
          g.addColorStop(
            0,
            i % 2 === 0
              ? 'rgba(22, 101, 52, 0.35)'
              : 'rgba(253, 230, 138, 0.22)',
          );
        } else {
          g.addColorStop(
            0,
            i % 2 === 0 ? 'rgba(74, 222, 128, 0.18)' : 'rgba(6, 46, 22, 0.28)',
          );
        }
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle lawn-mowing / wind-ripple stripes
      for (let y = 0; y < 1024; y += 128) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, y, 1024, 64);
      }

      // 16,000 individual grass blades / sand pebbles for razor-sharp close-up detail
      for (let i = 0; i < 16000; i++) {
        const gx = hash01(i * 1.73) * 1024;
        const gy = hash01(i * 2.91) * 1024;
        if (isDesert) {
          ctx.fillStyle =
            i % 3 === 0
              ? 'rgba(253, 186, 116, 0.3)'
              : i % 3 === 1
                ? 'rgba(154, 52, 18, 0.36)'
                : 'rgba(67, 20, 7, 0.26)';
          ctx.fillRect(gx, gy, 4, 3);
        } else {
          const bladeLen = 6 + (i % 7);
          const tilt = ((i % 7) - 3) * 0.65;
          ctx.strokeStyle =
            i % 4 === 0
              ? 'rgba(134, 239, 172, 0.38)'
              : i % 4 === 1
                ? 'rgba(34, 197, 94, 0.36)'
                : i % 4 === 2
                  ? 'rgba(21, 128, 61, 0.42)'
                  : 'rgba(5, 46, 22, 0.38)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + tilt, gy - bladeLen);
          ctx.stroke();
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(isCountryside ? 10 : 96, isCountryside ? 10 : 96);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * 3. PROCEDURAL TREE BARK & FOLIAGE LEAF TEXTURES (512x512)
 */
function createBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 3) {
      const shade = hash01(x * 3.7);
      ctx.fillStyle =
        shade > 0.6
          ? 'rgba(125, 88, 60, 0.48)'
          : shade < 0.3
            ? 'rgba(24, 15, 10, 0.58)'
            : 'rgba(68, 46, 32, 0.38)';
      ctx.fillRect(x, 0, 3, 256);
    }
    for (let i = 0; i < 520; i++) {
      const bx = hash01(i * 4.1) * 256;
      const by = hash01(i * 8.3) * 256;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(18, 10, 6, 0.48)' : 'rgba(150, 112, 80, 0.32)';
      ctx.fillRect(bx, by, 3, 20);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFoliageLeafTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#245c34';
    ctx.fillRect(0, 0, 512, 512);
    // Rich multi-toned needle & leaf clusters with sunlit tips and deep inner bough shadows
    for (let i = 0; i < 5200; i++) {
      const lx = hash01(i * 2.3) * 512;
      const ly = hash01(i * 5.9) * 512;
      const r = 3.2 + (i % 5) * 1.6;
      ctx.fillStyle =
        i % 4 === 0
          ? 'rgba(187, 247, 208, 0.44)'
          : i % 4 === 1
            ? 'rgba(74, 222, 128, 0.4)'
            : i % 4 === 2
              ? 'rgba(22, 101, 52, 0.5)'
              : 'rgba(5, 42, 20, 0.55)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r, r * 0.55, (i % 7) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Procedural Tropical River Water Texture (512x512)
 * Deep emerald/olive river water with organic wave ripples, caustics, and subtle sun glints.
 */
function createRiverWaterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Deep tropical olive-emerald water base
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#103822');
    grad.addColorStop(0.5, '#194d32');
    grad.addColorStop(1, '#0e301d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Soft organic water ripples and gentle caustic highlights
    for (let y = 0; y < 512; y += 10) {
      ctx.strokeStyle = y % 20 === 0 ? 'rgba(186, 230, 253, 0.22)' : 'rgba(74, 222, 128, 0.16)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x < 512; x += 32) {
        const waveY = y + Math.sin(x * 0.05 + y * 0.08) * 3.2;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    // 3. Subtle dappled sky reflections
    for (let i = 0; i < 80; i++) {
      const rx = (i * 97) % 512;
      const ry = (i * 139) % 512;
      const rad = 12 + (i % 5) * 8;
      const rGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      rGrad.addColorStop(0, 'rgba(254, 240, 138, 0.18)');
      rGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.10)');
      rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * 4. PROCEDURAL STRATIFIED MOUNTAIN ROCK & SNOW TEXTURE (1024x1024)
 */
function createMountainRockTexture(
  spec: TrackSpec,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const isDesert = spec.envKind === 'desert';
    const isAlpine = spec.envKind === 'alpine';

    // Vertical elevation gradient: dark forested/rocky base -> cliff rock -> snow/sunlit peak
    const elevGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    if (isDesert) {
      elevGrad.addColorStop(0, '#fde68a'); // Warm buff sandstone cap
      elevGrad.addColorStop(0.24, '#d97706'); // Natural ochre sandstone
      elevGrad.addColorStop(0.55, '#b45309'); // Natural terracotta sienna
      elevGrad.addColorStop(0.82, '#78350f'); // Canyon rock shadow
      elevGrad.addColorStop(1, '#451a03'); // Deep canyon floor
    } else if (isAlpine) {
      elevGrad.addColorStop(0, '#ffffff'); // Crisp glacier snow cap
      elevGrad.addColorStop(0.34, '#e2e8f0');
      elevGrad.addColorStop(0.46, '#64748b'); // Snowline transition
      elevGrad.addColorStop(0.78, '#334155');
      elevGrad.addColorStop(1, '#1e293b');
    } else {
      elevGrad.addColorStop(0, '#f8fafc'); // High alpine snow & mist cap
      elevGrad.addColorStop(0.28, '#cbd5e1');
      elevGrad.addColorStop(0.45, '#64748b');
      elevGrad.addColorStop(0.76, '#334155');
      elevGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = elevGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Jagged snowline fingers reaching down into mountain couloirs
    if (!isDesert) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.68)';
      for (let x = 0; x < 1024; x += 24) {
        const fingerLen = 180 + hash01(x * 2.7) * 260;
        ctx.beginPath();
        ctx.moveTo(x, 220);
        ctx.lineTo(x + 12, 220 + fingerLen);
        ctx.lineTo(x + 24, 220);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Geological rock strata bands & craggy vertical cliff fissures
    for (let y = 0; y < 1024; y += 18) {
      const alpha = 0.05 + hash01(y * 1.9) * 0.08;
      ctx.strokeStyle = isDesert
        ? y % 36 === 0
          ? `rgba(254, 215, 170, ${alpha * 1.4})`
          : `rgba(67, 20, 7, ${alpha * 1.6})`
        : y % 36 === 0
          ? `rgba(248, 250, 252, ${alpha})`
          : `rgba(15, 23, 42, ${alpha * 1.4})`;
      ctx.lineWidth = 4 + (y % 7);
      ctx.beginPath();
      for (let x = 0; x <= 1024; x += 64) {
        const wy = y + Math.sin(x * 0.012 + y * 0.05) * 8;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 3600; i++) {
      const rx = hash01(i * 3.7) * 1024;
      const ry = hash01(i * 6.1) * 1024;
      ctx.fillStyle = isDesert
        ? i % 3 === 0
          ? 'rgba(253, 186, 116, 0.12)'
          : 'rgba(67, 20, 7, 0.22)'
        : i % 3 === 0
          ? 'rgba(255,255,255,0.14)'
          : 'rgba(0,0,0,0.24)';
      ctx.fillRect(rx, ry, 4 + (i % 6), 18 + (i % 24));
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Procedural Rainforest Mountain Ridge Texture (1024x1024)
 * Natural atmospheric vertical elevation gradient: golden sunlit crests -> lush rainforest canopy -> misty emerald foothills.
 */
function createTropicalMountainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Vertical Atmospheric Tropical Rainforest Elevation Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#3f6212'); // Sunlit golden-green mountain crests
    grad.addColorStop(0.22, '#1e5a22'); // Upper lush rainforest canopy
    grad.addColorStop(0.55, '#143d1a'); // Mid-mountain deep jungle foliage
    grad.addColorStop(0.82, '#164e2e'); // Lower foothills
    grad.addColorStop(1.0, '#2d5214'); // Base blending into valley rice paddies
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Billowing Rainforest Canopy Volumes (Organic Dappling)
    for (let i = 0; i < 450; i++) {
      const cx = (i * 179) % 1024;
      const cy = (i * 283) % 1024;
      const rad = 28 + (i % 7) * 14;
      const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      const isSunlit = cy < 380;
      cGrad.addColorStop(
        0,
        isSunlit ? 'rgba(74, 222, 128, 0.22)' : 'rgba(5, 46, 22, 0.35)',
      );
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Soft Atmospheric Mountain Mist Belt across lower slopes
    const mistGrad = ctx.createLinearGradient(0, 680, 0, 920);
    mistGrad.addColorStop(0, 'rgba(220, 252, 231, 0)');
    mistGrad.addColorStop(0.5, 'rgba(220, 252, 231, 0.28)');
    mistGrad.addColorStop(1, 'rgba(220, 252, 231, 0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 680, 1024, 240);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * 5. HIGH-DETAIL RIDGED 3D MOUNTAIN GEOMETRY WITH CREASED NORMALS
 * Uses 48 radial segments x 24 height segments + BufferGeometryUtils.toCreasedNormals
 * so slopes shade smoothly while rocky ridge arêtes remain crisp!
 */
function buildRealisticMountainGeometry(
  baseRadius: number,
  height: number,
  radialSegs = 48,
  heightSegs = 24,
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(
    baseRadius,
    height,
    radialSegs,
    heightSegs,
    false,
  );
  geo.translate(0, height * 0.5, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const elevNorm = Math.max(0, Math.min(1, vy / height));

    if (elevNorm > 0.01 && elevNorm < 0.98) {
      const angle = Math.atan2(vz, vx);
      // 5 major mountain ridge buttresses + 9 secondary gullies + 15 fine crags
      const ridgeWave =
        Math.cos(angle * 5) * 0.2 +
        Math.sin(angle * 9 + elevNorm * 3.8) * 0.11 +
        Math.cos(angle * 15 - elevNorm * 5.5) * 0.05;
      const radialScale = 1 + ridgeWave * (1 - elevNorm * 0.52);
      const cragY =
        Math.sin(angle * 7 + elevNorm * 7) * height * 0.032 * (1 - elevNorm);
      pos.setXYZ(i, vx * radialScale, vy + cragY, vz * radialScale);
    } else if (elevNorm >= 0.98) {
      pos.setY(i, vy * 0.96);
    }
  }

  const creased = BufferGeometryUtils.toCreasedNormals(
    geo,
    THREE.MathUtils.degToRad(42),
  );
  creased.computeBoundingSphere();
  return creased;
}

/**
 * 5B. MONUMENT VALLEY TERRACED SANDSTONE MESA / BUTTE GEOMETRY
 * Flat-topped stepped canyon plateau with talus base, vertical fluted cliff walls, and upper caprock bench.
 */
function buildTerracedSandstoneMesaGeometry(
  baseRadius = 0.72,
  height = 1.0,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(
    baseRadius * 0.46,
    baseRadius,
    height,
    36,
    18,
    false,
  );
  geo.translate(0, height * 0.5, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const elev = Math.max(0, Math.min(1, vy / height));
    const angle = Math.atan2(vz, vx);

    // Fluted vertical canyon columns + 6 major sandstone buttress lobes
    const flute =
      1 +
      Math.cos(angle * 6) * 0.16 +
      Math.sin(angle * 14) * 0.06 +
      Math.cos(angle * 22) * 0.03;

    // Stepped terrace profile: wide talus apron (0..0.32), vertical cliff (0.32..0.72), bench step (0.72..0.82), upper caprock (0.82..1.0)
    let stepScale = 1.0;
    if (elev < 0.32) {
      stepScale = 1.12 - (elev / 0.32) * 0.24;
    } else if (elev < 0.72) {
      stepScale = 0.88 - ((elev - 0.32) / 0.4) * 0.06;
    } else if (elev < 0.82) {
      stepScale = 0.82 - ((elev - 0.72) / 0.1) * 0.16;
    } else {
      stepScale = 0.66;
    }

    pos.setXYZ(i, vx * flute * stepScale, vy, vz * flute * stepScale);
  }

  const creased = BufferGeometryUtils.toCreasedNormals(
    geo,
    THREE.MathUtils.degToRad(38),
  );
  creased.computeBoundingSphere();
  return creased;
}

/**
 * 6. REALISTIC MULTI-SPECIES TREE & DESERT FLORA GEOMETRIES WITH SMOOTH CREASED NORMALS
 * Builds (A) 6-tier drooping Spruce/Pine Conifer, (B) Lush Multi-Cluster Broadleaf Oak/Maple,
 * (C) 10-segment Curved Coconut Palm with 16 Arching Fronds, and (D) Desert Red-Rock Boulder + Saguaro Cactus.
 */
function buildDetailedTreeGeometries(kind: 'pine' | 'oak' | 'palm' | 'desert'): {
  trunkGeo: THREE.BufferGeometry;
  lowerCanopyGeo: THREE.BufferGeometry;
  upperCanopyGeo: THREE.BufferGeometry;
} {
  const creaseRad = THREE.MathUtils.degToRad(52);

  if (kind === 'desert') {
    // Red-rock sandstone boulder cluster (trunkGeo) + Multi-arm Saguaro Cactus & Agave (lower/upperCanopyGeo)
    const b1 = new THREE.DodecahedronGeometry(1.35, 1);
    b1.scale(1.35, 0.78, 1.15);
    b1.translate(-0.55, 0.48, 0.25);
    const b2 = new THREE.DodecahedronGeometry(0.95, 1);
    b2.scale(1.1, 0.72, 1.25);
    b2.translate(0.75, 0.36, -0.35);
    const trunkGeo = BufferGeometryUtils.mergeGeometries(
      [
        BufferGeometryUtils.toCreasedNormals(b1, THREE.MathUtils.degToRad(36)),
        BufferGeometryUtils.toCreasedNormals(b2, THREE.MathUtils.degToRad(36)),
      ],
      false,
    );

    // Tall Ribbed Saguaro Cactus Stem + Twin Arms
    const mainStem = new THREE.CylinderGeometry(0.24, 0.28, 4.4, 12);
    mainStem.translate(0, 2.2, 0);
    const mainCap = new THREE.SphereGeometry(0.24, 12, 8);
    mainCap.translate(0, 4.4, 0);

    const armL1 = new THREE.CylinderGeometry(0.17, 0.18, 0.75, 10);
    armL1.rotateZ(Math.PI * 0.5);
    armL1.translate(-0.48, 2.35, 0);
    const armL2 = new THREE.CylinderGeometry(0.16, 0.17, 1.45, 10);
    armL2.translate(-0.82, 3.05, 0);

    const armR1 = new THREE.CylinderGeometry(0.16, 0.17, 0.68, 10);
    armR1.rotateZ(Math.PI * 0.5);
    armR1.translate(0.45, 2.85, 0);
    const armR2 = new THREE.CylinderGeometry(0.15, 0.16, 1.25, 10);
    armR2.translate(0.76, 3.45, 0);

    const lowerCanopyGeo = BufferGeometryUtils.mergeGeometries(
      [
        BufferGeometryUtils.toCreasedNormals(mainStem, creaseRad),
        BufferGeometryUtils.toCreasedNormals(mainCap, creaseRad),
        BufferGeometryUtils.toCreasedNormals(armL1, creaseRad),
        BufferGeometryUtils.toCreasedNormals(armL2, creaseRad),
      ],
      false,
    );
    const upperCanopyGeo = BufferGeometryUtils.mergeGeometries(
      [
        BufferGeometryUtils.toCreasedNormals(armR1, creaseRad),
        BufferGeometryUtils.toCreasedNormals(armR2, creaseRad),
      ],
      false,
    );
    return { trunkGeo, lowerCanopyGeo, upperCanopyGeo };
  }

  if (kind === 'palm') {
    const trunkParts: THREE.BufferGeometry[] = [];
    const segs = 9;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const rBottom = 0.35 * (1 - t0 * 0.46);
      const rTop = 0.31 * (1 - (t0 + 1 / segs) * 0.46);
      const segGeo = new THREE.CylinderGeometry(rTop, rBottom, 0.62, 12);
      const curveX = Math.sin(t0 * Math.PI * 0.68) * 0.46;
      segGeo.rotateZ(-0.08 * (1 - t0 * 0.5));
      segGeo.translate(curveX, s * 0.56 + 0.31, 0);
      trunkParts.push(BufferGeometryUtils.toCreasedNormals(segGeo, creaseRad));
    }

    const lowerFronds: THREE.BufferGeometry[] = [];
    const upperFronds: THREE.BufferGeometry[] = [];
    const topX = Math.sin(Math.PI * 0.68) * 0.42;
    const topY = 5.05;

    for (let f = 0; f < 9; f++) {
      const yaw = (f / 9) * Math.PI * 2;
      const frond = new THREE.BoxGeometry(0.62, 0.06, 2.85, 3, 1, 7);
      const fPos = frond.attributes.position;
      for (let k = 0; k < fPos.count; k++) {
        const x = fPos.getX(k);
        const z = fPos.getZ(k);
        const distNorm = (z + 1.425) / 2.85;
        const archY =
          Math.sin(distNorm * Math.PI) * 0.52 -
          distNorm * distNorm * 0.68 -
          Math.abs(x) * 0.18;
        const taperX = Math.sin(Math.max(0.08, distNorm) * Math.PI * 0.92);
        fPos.setX(k, x * Math.max(0.14, taperX));
        fPos.setY(k, fPos.getY(k) + archY);
      }
      frond.translate(0, 0, 1.32);
      frond.rotateX(0.24);
      frond.rotateY(yaw);
      frond.translate(topX, topY, 0);
      lowerFronds.push(BufferGeometryUtils.toCreasedNormals(frond, creaseRad));
    }

    for (let f = 0; f < 7; f++) {
      const yaw = (f / 7) * Math.PI * 2 + 0.38;
      const frond = new THREE.BoxGeometry(0.5, 0.055, 2.2, 3, 1, 6);
      const fPos = frond.attributes.position;
      for (let k = 0; k < fPos.count; k++) {
        const x = fPos.getX(k);
        const z = fPos.getZ(k);
        const distNorm = (z + 1.1) / 2.2;
        const archY =
          Math.sin(distNorm * Math.PI * 0.85) * 0.54 -
          distNorm * 0.25 -
          Math.abs(x) * 0.14;
        const taperX = Math.sin(Math.max(0.08, distNorm) * Math.PI * 0.92);
        fPos.setX(k, x * Math.max(0.14, taperX));
        fPos.setY(k, fPos.getY(k) + archY);
      }
      frond.translate(0, 0, 0.98);
      frond.rotateX(-0.16);
      frond.rotateY(yaw);
      frond.translate(topX, topY + 0.28, 0);
      upperFronds.push(BufferGeometryUtils.toCreasedNormals(frond, creaseRad));
    }

    return {
      trunkGeo: BufferGeometryUtils.mergeGeometries(trunkParts, false),
      lowerCanopyGeo: BufferGeometryUtils.mergeGeometries(lowerFronds, false),
      upperCanopyGeo: BufferGeometryUtils.mergeGeometries(upperFronds, false),
    };
  }

  // Shared Multi-Limb Bark Trunk for Pine & Oak
  const mainTrunk = new THREE.CylinderGeometry(0.18, 0.46, 3.2, 12, 3);
  mainTrunk.translate(0, 1.6, 0);
  const b1 = new THREE.CylinderGeometry(0.08, 0.17, 1.5, 8);
  b1.rotateZ(0.66);
  b1.translate(-0.48, 2.4, 0);
  const b2 = new THREE.CylinderGeometry(0.08, 0.16, 1.4, 8);
  b2.rotateZ(-0.62);
  b2.rotateY(1.8);
  b2.translate(0.34, 2.55, 0.35);
  const b3 = new THREE.CylinderGeometry(0.07, 0.15, 1.3, 8);
  b3.rotateX(0.64);
  b3.translate(0, 2.45, -0.45);
  const trunkGeo = BufferGeometryUtils.mergeGeometries(
    [
      BufferGeometryUtils.toCreasedNormals(mainTrunk, creaseRad),
      BufferGeometryUtils.toCreasedNormals(b1, creaseRad),
      BufferGeometryUtils.toCreasedNormals(b2, creaseRad),
      BufferGeometryUtils.toCreasedNormals(b3, creaseRad),
    ],
    false,
  );

  if (kind === 'oak') {
    // Lush Broadleaf Deciduous Tree: 5 lower billowing foliage puffs + 4 upper sunlit crown puffs
    const makePuff = (
      rx: number,
      ry: number,
      rz: number,
      ox: number,
      oy: number,
      oz: number,
    ): THREE.BufferGeometry => {
      const g = new THREE.IcosahedronGeometry(1, 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const ripple =
          1 +
          Math.sin(vx * 4.2 + vy * 3.1) * 0.12 +
          Math.cos(vz * 4.5 - vy * 2.8) * 0.1;
        pos.setXYZ(i, vx * rx * ripple, vy * ry * ripple, vz * rz * ripple);
      }
      g.translate(ox, oy, oz);
      return BufferGeometryUtils.toCreasedNormals(g, THREE.MathUtils.degToRad(65));
    };

    const lowerCanopyGeo = BufferGeometryUtils.mergeGeometries(
      [
        makePuff(1.65, 1.25, 1.65, 0, 3.6, 0),
        makePuff(1.35, 1.05, 1.35, -1.05, 3.35, 0.45),
        makePuff(1.35, 1.05, 1.35, 1.02, 3.4, -0.4),
        makePuff(1.28, 1.0, 1.28, 0.35, 3.3, 1.05),
        makePuff(1.28, 1.0, 1.28, -0.35, 3.35, -1.02),
      ],
      false,
    );

    const upperCanopyGeo = BufferGeometryUtils.mergeGeometries(
      [
        makePuff(1.45, 1.2, 1.45, 0, 4.95, 0),
        makePuff(1.15, 0.98, 1.15, -0.68, 4.55, -0.45),
        makePuff(1.15, 0.98, 1.15, 0.68, 4.6, 0.48),
        makePuff(0.95, 0.85, 0.95, 0, 5.65, 0.12),
      ],
      false,
    );

    return { trunkGeo, lowerCanopyGeo, upperCanopyGeo };
  }

  // Smoothly shaded 6-tier Drooping Spruce/Pine Conifer Boughs
  const makeSpruceTier = (
    radius: number,
    height: number,
    yCenter: number,
    lobes: number,
    rotOffset: number,
  ): THREE.BufferGeometry => {
    const geo = new THREE.ConeGeometry(radius, height, 24, 5, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const ang = Math.atan2(z, x) + rotOffset;
      const radialRatio = r / Math.max(0.01, radius);
      const scallop = 1 + Math.cos(ang * lobes) * 0.16 * radialRatio;
      const droopY =
        -radialRatio * radialRatio * 0.28 +
        Math.cos(ang * lobes) * 0.1 * radialRatio;
      pos.setXYZ(i, x * scallop, y + droopY, z * scallop);
    }
    geo.translate(0, yCenter, 0);
    return BufferGeometryUtils.toCreasedNormals(
      geo,
      THREE.MathUtils.degToRad(55),
    );
  };

  const lowerCanopyGeo = BufferGeometryUtils.mergeGeometries(
    [
      makeSpruceTier(2.25, 1.95, 2.75, 7, 0.0),
      makeSpruceTier(1.98, 1.85, 3.65, 7, 0.45),
      makeSpruceTier(1.7, 1.75, 4.5, 7, 0.9),
    ],
    false,
  );

  const upperCanopyGeo = BufferGeometryUtils.mergeGeometries(
    [
      makeSpruceTier(1.42, 1.65, 5.3, 6, 0.25),
      makeSpruceTier(1.1, 1.5, 6.05, 6, 0.75),
      makeSpruceTier(0.74, 1.35, 6.75, 5, 1.2),
    ],
    false,
  );

  return { trunkGeo, lowerCanopyGeo, upperCanopyGeo };
}

/**
 * 7. LUSH CURVED BOTANICAL GRASS & WILDFLOWER TUFT GEOMETRY
 */
function buildGrassTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const creaseRad = THREE.MathUtils.degToRad(60);

  for (let b = 0; b < 8; b++) {
    const angle = (b / 8) * Math.PI * 2 + 0.15;
    const blade = new THREE.BoxGeometry(0.14, 0.68, 0.03, 1, 4, 1);
    const pos = blade.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 0.34; // 0 to 0.68
      const hNorm = y / 0.68;
      const taper = 1 - hNorm * 0.82;
      const archZ = hNorm * hNorm * 0.28;
      pos.setXYZ(i, pos.getX(i) * taper, y, pos.getZ(i) + archZ);
    }
    blade.rotateY(angle);
    blade.translate(Math.cos(angle) * 0.1, 0, Math.sin(angle) * 0.1);
    parts.push(BufferGeometryUtils.toCreasedNormals(blade, creaseRad));
  }

  // Central low shrub cushion so tufts look full and organic from above
  const cushion = new THREE.DodecahedronGeometry(0.24, 1);
  cushion.scale(1.25, 0.65, 1.25);
  cushion.translate(0, 0.14, 0);
  parts.push(BufferGeometryUtils.toCreasedNormals(cushion, creaseRad));

  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/**
 * 8. CONTINUOUS SPLINE W-BEAM STEEL GUARDRAIL GEOMETRY
 * Replaces disconnected floating grey boxes with a continuous steel barrier ribbon along both sides of the circuit!
 */
function buildContinuousGuardrailGeometry(
  waypoints: Waypoint2D[],
  edgeOffset: number,
  side: -1 | 1,
): THREE.BufferGeometry {
  const n = waypoints.length;
  const profileY = [0.32, 0.48, 0.56, 0.72];
  const profileOut = [0.0, -0.08, 0.04, 0.0];
  const vertsPerStation = profileY.length;

  const positions = new Float32Array((n + 1) * vertsPerStation * 3);
  const uvs = new Float32Array((n + 1) * vertsPerStation * 2);
  const indices: number[] = [];

  for (let i = 0; i <= n; i++) {
    const wp = waypoints[i % n];
    const baseBx = wp.x + wp.nx * side * edgeOffset;
    const baseBz = wp.z + wp.nz * side * edgeOffset;

    for (let p = 0; p < vertsPerStation; p++) {
      const vIdx = i * vertsPerStation + p;
      const outShift = profileOut[p] * side;
      positions[vIdx * 3 + 0] = baseBx + wp.nx * outShift;
      positions[vIdx * 3 + 1] = profileY[p];
      positions[vIdx * 3 + 2] = baseBz + wp.nz * outShift;

      uvs[vIdx * 2 + 0] = p / (vertsPerStation - 1);
      uvs[vIdx * 2 + 1] = i * 0.5;
    }

    if (i < n) {
      const base = i * vertsPerStation;
      const nextBase = (i + 1) * vertsPerStation;
      for (let p = 0; p < vertsPerStation - 1; p++) {
        const a = base + p;
        const b = base + p + 1;
        const c = nextBase + p;
        const d = nextBase + p + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function createRoadAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep dark performance asphalt base
    ctx.fillStyle = '#0a0e15';
    ctx.fillRect(0, 0, 2048, 2048);

    // Subtle darker rubberized racing-line grooves in left & right lanes
    const leftGroove = ctx.createLinearGradient(280, 0, 840, 0);
    leftGroove.addColorStop(0, 'rgba(0,0,0,0)');
    leftGroove.addColorStop(0.35, 'rgba(0,0,0,0.48)');
    leftGroove.addColorStop(0.65, 'rgba(0,0,0,0.52)');
    leftGroove.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGroove;
    ctx.fillRect(280, 0, 560, 2048);

    const rightGroove = ctx.createLinearGradient(1208, 0, 1768, 0);
    rightGroove.addColorStop(0, 'rgba(0,0,0,0)');
    rightGroove.addColorStop(0.35, 'rgba(0,0,0,0.48)');
    rightGroove.addColorStop(0.65, 'rgba(0,0,0,0.52)');
    rightGroove.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightGroove;
    ctx.fillRect(1208, 0, 560, 2048);

    // High-density micro-aggregate tarmac grain & specular stone chips (24,000 chips)
    for (let i = 0; i < 24000; i++) {
      const gx = (i * 277) % 2048;
      const gy = (i * 587) % 2048;
      const chipSize = (i % 5 === 0) ? 4 : (i % 2 === 0) ? 3 : 2;
      ctx.fillStyle =
        i % 7 === 0
          ? 'rgba(255,255,255,0.07)'
          : i % 3 === 0
            ? 'rgba(180,195,210,0.04)'
            : 'rgba(0,0,0,0.28)';
      ctx.fillRect(gx, gy, chipSize, chipSize);
    }

    // Left & Right FIA Racing Curbs (Red / White with 3D bevel shading)
    const curbW = 116;
    for (let y = 0; y < 2048; y += 256) {
      const idx = y / 256;
      ctx.fillStyle = idx % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.fillRect(0, y, curbW, 256);
      ctx.fillRect(2048 - curbW, y, curbW, 256);

      // Top edge 3D bevel light reflection
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillRect(0, y, curbW, 14);
      ctx.fillRect(2048 - curbW, y, curbW, 14);

      // Serrated rumble step drop shadow line
      ctx.fillStyle = 'rgba(0,0,0,0.46)';
      ctx.fillRect(0, y + 232, curbW, 24);
      ctx.fillRect(2048 - curbW, y + 232, curbW, 24);

      // Inner transition lip shadow against the asphalt
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(curbW - 16, y, 16, 256);
      ctx.fillRect(2048 - curbW, y, 16, 256);
    }

    // Crisp FIA White Outer Boundary Line
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(curbW + 22, 0, 20, 2048);
    ctx.fillRect(2048 - curbW - 42, 0, 20, 2048);

    // Double Amber Center Line + Reflective Cat's-Eye Studs
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(1002, 0, 14, 2048);
    ctx.fillRect(1032, 0, 14, 2048);

    for (let y = 64; y < 2048; y += 256) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(1019, y, 10, 28);
    }

    // Dashed Lane Dividers + Cyan Reflector Studs
    for (let y = 48; y < 2048; y += 256) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fillRect(544, y, 18, 136);
      ctx.fillRect(1486, y, 18, 136);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(546, y + 168, 14, 20);
      ctx.fillRect(1488, y + 168, 14, 20);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBuildingFacadeTexture(
  spec: TrackSpec,
  maxAnisotropy: number,
  emissiveOnly = false,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const isNight = spec.id === 'neon_night' || spec.id === 'harbor_docks';
    const isSunset = spec.id === 'sunset_coast';

    // Base structural cladding: dark charcoal aluminum / architectural slate
    ctx.fillStyle = emissiveOnly ? '#000000' : '#0f172a';
    ctx.fillRect(0, 0, 512, 1024);

    const cols = 16;
    const rows = 32;
    const cellW = 512 / cols;
    const cellH = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      // Concrete / anodized aluminum floor spandrel slab
      if (!emissiveOnly) {
        ctx.fillStyle = r % 4 === 0 ? '#1e293b' : '#161f30';
        ctx.fillRect(0, r * cellH, 512, 6);
        // Subtle metallic floor edge bevel line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, r * cellH, 512, 1.2);
      }

      for (let c = 0; c < cols; c++) {
        const seed = r * 37 + c * 19;
        const hVal = hash01(seed);
        const wx = c * cellW + 3;
        const wy = r * cellH + 7;
        const ww = cellW - 6;
        const wh = cellH - 9;

        // Realistic office window lighting distribution:
        // ~20-25% warm interior lights, ~75% dark tinted reflective glass
        const isLitWarm = hVal < 0.18;
        const isLitCool = !isLitWarm && hVal < 0.26;

        if (emissiveOnly) {
          if (isLitWarm) {
            ctx.fillStyle = '#fef3c7'; // Warm tungsten interior office light
            ctx.fillRect(wx, wy, ww, wh);
          } else if (isLitCool) {
            ctx.fillStyle = '#f8fafc'; // Clean white modern office light
            ctx.fillRect(wx, wy, ww, wh);
          }
          // Non-lit windows remain black #000000
        } else {
          const paneGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          if (isLitWarm) {
            paneGrad.addColorStop(0, '#fef3c7');
            paneGrad.addColorStop(0.5, '#fde68a');
            paneGrad.addColorStop(1, '#b45309');
          } else if (isLitCool) {
            paneGrad.addColorStop(0, '#f8fafc');
            paneGrad.addColorStop(0.5, '#e2e8f0');
            paneGrad.addColorStop(1, '#64748b');
          } else {
            // Smoked reflective glass with subtle sky reflection
            if (isSunset) {
              paneGrad.addColorStop(0, '#1e293b');
              paneGrad.addColorStop(0.65, '#283548');
              paneGrad.addColorStop(1, '#0f172a');
            } else if (isNight) {
              paneGrad.addColorStop(0, '#090d16');
              paneGrad.addColorStop(1, '#020617');
            } else {
              paneGrad.addColorStop(0, '#1e293b');
              paneGrad.addColorStop(0.6, '#334155');
              paneGrad.addColorStop(1, '#0f172a');
            }
          }
          ctx.fillStyle = paneGrad;
          ctx.fillRect(wx, wy, ww, wh);

          // Subtle architectural window mullion border
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, ww, wh);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createCheckeredBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 128);
    const sq = 16;
    for (let y = 0; y < 128; y += sq) {
      for (let x = 0; x < 512; x += sq) {
        if (x < 96 || x >= 512 - 96) {
          const even = (x / sq + y / sq) % 2 === 0;
          ctx.fillStyle = even ? '#f8fafc' : '#0f172a';
          ctx.fillRect(x, y, sq, sq);
        }
      }
    }
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(96, 0, 320, 12);
    ctx.fillRect(96, 116, 320, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('APEX GRAND PRIX', 256, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChevronSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    for (const xOff of [28, 64, 100]) {
      ctx.beginPath();
      ctx.moveTo(xOff - 14, 10);
      ctx.lineTo(xOff + 6, 32);
      ctx.lineTo(xOff - 14, 54);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrakeMarkerTexture(dist: '150' | '100' | '50'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 118);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dist, 64, 56);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('METERS', 64, 98);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContainerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 128);
    // Vertical corrugated metal ribs
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(x, 0, 3, 128);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(x + 3, 0, 2, 128);
    }
    // Heavy structural steel frame border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillRect(0, 120, 256, 8);
    ctx.fillRect(0, 0, 8, 128);
    ctx.fillRect(248, 0, 8, 128);
    // Stencil logistics text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('APEX LOGISTICS 40FT', 22, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStiltHouseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich tropical dark teak / bamboo wood planks base
    ctx.fillStyle = '#5c3d1e';
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal & vertical timber grain lines
    for (let y = 0; y < 512; y += 20) {
      ctx.fillStyle = (y / 20) % 2 === 0 ? 'rgba(30, 18, 8, 0.45)' : 'rgba(120, 75, 35, 0.25)';
      ctx.fillRect(0, y, 512, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, y + 2, 512, 18);
    }

    // Windows with warm glowing interior amber lantern light
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(80, 140, 95, 110);
    ctx.fillRect(337, 140, 95, 110);

    // Window timber frames & mullions
    ctx.strokeStyle = '#2d1808';
    ctx.lineWidth = 8;
    ctx.strokeRect(80, 140, 95, 110);
    ctx.strokeRect(337, 140, 95, 110);
    ctx.beginPath();
    ctx.moveTo(127, 140);
    ctx.lineTo(127, 250);
    ctx.moveTo(80, 195);
    ctx.lineTo(175, 195);
    ctx.moveTo(384, 140);
    ctx.lineTo(384, 250);
    ctx.moveTo(337, 195);
    ctx.lineTo(432, 195);
    ctx.stroke();

    // Bamboo woven lattice pattern under veranda
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.lineWidth = 2;
    for (let d = 0; d < 512; d += 16) {
      ctx.beginPath();
      ctx.moveTo(d, 360);
      ctx.lineTo(d + 80, 512);
      ctx.moveTo(d, 512);
      ctx.lineTo(d + 80, 360);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createThatchedRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dried golden palm frond & straw thatch base
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, 0, 512, 512);

    // Layered horizontal straw thatch rows with ragged reed fringe
    for (let y = 0; y < 512; y += 18) {
      ctx.fillStyle = (y / 18) % 2 === 0 ? '#b45309' : '#78350f';
      ctx.fillRect(0, y, 512, 16);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, y + 14, 512, 4);

      // Vertical reed fiber lines
      for (let x = 0; x < 512; x += 8) {
        ctx.fillStyle = ((x + y) % 3 === 0) ? 'rgba(253, 230, 138, 0.35)' : 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(x, y, 2, 18);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCountrysideRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Realistic dark sun-baked rural highway asphalt base
    ctx.fillStyle = '#262930';
    ctx.fillRect(0, 0, 2048, 2048);

    // 2. Subtle darker tire track lanes (worn aggregate sheen)
    const leftGroove = ctx.createLinearGradient(320, 0, 780, 0);
    leftGroove.addColorStop(0, 'rgba(0,0,0,0)');
    leftGroove.addColorStop(0.5, 'rgba(12,16,22,0.42)');
    leftGroove.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGroove;
    ctx.fillRect(320, 0, 460, 2048);

    const rightGroove = ctx.createLinearGradient(1268, 0, 1728, 0);
    rightGroove.addColorStop(0, 'rgba(0,0,0,0)');
    rightGroove.addColorStop(0.5, 'rgba(12,16,22,0.42)');
    rightGroove.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightGroove;
    ctx.fillRect(1268, 0, 460, 2048);

    // 3. 32,000 fine stone aggregate chips & tarmac specks
    for (let i = 0; i < 32000; i++) {
      const gx = (i * 269) % 2048;
      const gy = (i * 593) % 2048;
      const chipSize = (i % 6 === 0) ? 4 : (i % 2 === 0) ? 3 : 2;
      ctx.fillStyle =
        i % 7 === 0
          ? 'rgba(255,255,255,0.12)'
          : i % 3 === 0
            ? 'rgba(180,195,210,0.08)'
            : 'rgba(0,0,0,0.38)';
      ctx.fillRect(gx, gy, chipSize, chipSize);
    }

    // 4. Natural Earthen Dirt & Crushed River Gravel Road Shoulders (NO racetrack rumble curbs!)
    ctx.fillStyle = '#57412b';
    ctx.fillRect(0, 0, 120, 2048);
    ctx.fillRect(1928, 0, 120, 2048);
    // Gravel texture stippling along shoulders
    for (let i = 0; i < 3500; i++) {
      const sxL = hash01(i * 3.1) * 115;
      const sxR = 1930 + hash01(i * 4.3) * 115;
      const sy = hash01(i * 7.7) * 2048;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(217, 119, 6, 0.45)' : 'rgba(30, 20, 10, 0.6)';
      ctx.fillRect(sxL, sy, 3, 3);
      ctx.fillRect(sxR, sy, 3, 3);
    }

    // 5. Crisp Solid White Outer Road Shoulder Lines (matching user's reference photo)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(120, 0, 36, 2048);
    ctx.fillRect(1892, 0, 36, 2048);

    // 6. Single Solid Vibrant Golden-Yellow Center Highway Line (matching user's reference photo)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(1006, 0, 36, 2048);

    // Subtle yellow glass reflective center road studs
    for (let y = 32; y < 2048; y += 128) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(1018, y, 12, 28);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoadsideMarkerPostTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // White concrete base
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 256);

    // Subtle fine aggregate concrete stippling
    for (let i = 0; i < 400; i++) {
      const x = (i * 37) % 128;
      const y = (i * 73) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, 2, 2);
    }

    // Red reflector top cap (matching Asian rural highway guide bollards)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 128, 72);
    // Red reflector glossy glass sheen
    ctx.fillStyle = 'rgba(254, 202, 202, 0.45)';
    ctx.fillRect(0, 12, 128, 16);

    // Bold Black contrast band in middle body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 130, 128, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildElevatedStiltHouseGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Ten Foundation Stilts (Raising house 2.2m above ground, matching reference photo)
  const stiltPositions = [
    [-3.8, -3.4], [-1.3, -3.4], [1.3, -3.4], [3.8, -3.4],
    [-3.8, 0.0],  [-1.3, 0.0],  [1.3, 0.0],  [3.8, 0.0],
    [-3.8, 3.4],  [3.8, 3.4],
  ];
  for (const [sx, sz] of stiltPositions) {
    // Round timber post
    const stilt = new THREE.CylinderGeometry(0.18, 0.20, 2.3, 8);
    stilt.translate(sx, 1.15, sz);
    // Stone pillar footing at base
    const baseStone = new THREE.CylinderGeometry(0.28, 0.32, 0.3, 8);
    baseStone.translate(sx, 0.15, sz);
    parts.push(stilt, baseStone);
  }

  // 2. Under-Floor Heavy Timber Girders
  const girderL = new THREE.BoxGeometry(0.25, 0.35, 7.8);
  girderL.translate(-3.8, 2.2, 0);
  const girderR = new THREE.BoxGeometry(0.25, 0.35, 7.8);
  girderR.translate(3.8, 2.2, 0);
  const girderM = new THREE.BoxGeometry(7.8, 0.3, 0.25);
  girderM.translate(0, 2.15, 0);
  parts.push(girderL, girderR, girderM);

  // 3. Wooden Floor Deck & Covered Veranda
  const floorDeck = new THREE.BoxGeometry(8.6, 0.24, 8.2);
  floorDeck.translate(0, 2.4, 0.3);
  parts.push(floorDeck);

  // 4. Veranda Front Railing & Posts
  const railFront = new THREE.BoxGeometry(8.2, 0.12, 0.12);
  railFront.translate(0, 3.3, 4.3);
  const railSideL = new THREE.BoxGeometry(0.12, 0.12, 2.6);
  railSideL.translate(-4.1, 3.3, 3.0);
  const railSideR = new THREE.BoxGeometry(0.12, 0.12, 2.6);
  railSideR.translate(4.1, 3.3, 3.0);
  parts.push(railFront, railSideL, railSideR);

  // Veranda Baluster Spindles
  for (let bx = -3.8; bx <= 3.8; bx += 0.5) {
    if (Math.abs(bx - 2.6) < 0.8) continue; // stair opening
    const baluster = new THREE.BoxGeometry(0.06, 0.8, 0.06);
    baluster.translate(bx, 2.85, 4.3);
    parts.push(baluster);
  }

  // Veranda Roof Support Posts
  const postL = new THREE.CylinderGeometry(0.14, 0.14, 2.8, 8);
  postL.translate(-4.0, 3.8, 4.3);
  const postR = new THREE.CylinderGeometry(0.14, 0.14, 2.8, 8);
  postR.translate(4.0, 3.8, 4.3);
  parts.push(postL, postR);

  // 5. Access Ladder / Stairs (from ground up to veranda)
  const stringerL = new THREE.BoxGeometry(0.12, 3.5, 0.12);
  stringerL.rotateX(Math.PI * 0.22);
  stringerL.translate(2.1, 1.25, 5.5);
  const stringerR = new THREE.BoxGeometry(0.12, 3.5, 0.12);
  stringerR.rotateX(Math.PI * 0.22);
  stringerR.translate(3.1, 1.25, 5.5);
  parts.push(stringerL, stringerR);

  for (let r = 0; r < 5; r++) {
    const rung = new THREE.BoxGeometry(0.9, 0.08, 0.22);
    const y = 0.45 + r * 0.42;
    const z = 6.6 - r * 0.46;
    rung.translate(2.6, y, z);
    parts.push(rung);
  }

  // 6. Main House Walls (Teak / Bamboo planks)
  const walls = new THREE.BoxGeometry(7.8, 3.2, 5.6);
  walls.translate(0, 4.0, -1.0);
  parts.push(walls);

  // 7. Gable Attic Walls (Triangular Pediments on Front & Back)
  const gableFront = new THREE.BoxGeometry(7.8, 2.8, 0.15);
  gableFront.translate(0, 6.8, 1.7);
  const gableBack = new THREE.BoxGeometry(7.8, 2.8, 0.15);
  gableBack.translate(0, 6.8, -3.7);
  parts.push(gableFront, gableBack);

  // 8. Steep Pitched Thatched Gabled Roof with Wide Overhanging Eaves
  // Ridge at x = 0, y = 8.55m, z = 0.3m. Eaves at x = +-5.2m, y = 5.2m.
  const roofDepth = 9.8; // extends over both front veranda and back
  const slopeWidth = Math.hypot(5.2, 3.35); // ~6.18m
  const pitchAngle = Math.atan2(3.35, 5.2); // ~0.572 rad

  // Left slope slab
  const roofL = new THREE.BoxGeometry(slopeWidth, 0.18, roofDepth);
  roofL.rotateZ(pitchAngle);
  roofL.translate(-2.6, 6.85, 0.3);

  // Right slope slab
  const roofR = new THREE.BoxGeometry(slopeWidth, 0.18, roofDepth);
  roofR.rotateZ(-pitchAngle);
  roofR.translate(2.6, 6.85, 0.3);

  // Gable Peak Ridge Cap Beam
  const roofRidge = new THREE.BoxGeometry(0.35, 0.35, roofDepth + 0.3);
  roofRidge.translate(0, 8.55, 0.3);
  parts.push(roofL, roofR, roofRidge);

  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildStiltHouseWindowsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Front glowing veranda window
  const winFront = new THREE.BoxGeometry(1.0, 1.0, 0.08);
  winFront.translate(-1.8, 4.2, 1.82);
  // Left side glowing window
  const winSideL = new THREE.BoxGeometry(0.08, 1.0, 1.0);
  winSideL.translate(-3.92, 4.2, -1.0);
  // Right side glowing window
  const winSideR = new THREE.BoxGeometry(0.08, 1.0, 1.0);
  winSideR.translate(3.92, 4.2, -1.0);
  parts.push(winFront, winSideL, winSideR);
  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildOpenThatchedShedGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 4 Wooden Corner Posts
  const postCoords = [
    [-2.2, -1.8], [2.2, -1.8],
    [-2.2, 1.8], [2.2, 1.8],
  ];
  for (const [px, pz] of postCoords) {
    const post = new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8);
    post.translate(px, 1.6, pz);
    parts.push(post);
  }

  // Cross beams
  const beamL = new THREE.BoxGeometry(0.18, 0.22, 4.2);
  beamL.translate(-2.2, 3.1, 0);
  const beamR = new THREE.BoxGeometry(0.18, 0.22, 4.2);
  beamR.translate(2.2, 3.1, 0);
  parts.push(beamL, beamR);

  // Thatched Gabled Roof (cleanly meeting at ridge)
  const roofDepth = 5.2;
  const slopeWidth = Math.hypot(2.8, 1.6); // ~3.22m
  const pitchAngle = Math.atan2(1.6, 2.8);

  const roofL = new THREE.BoxGeometry(slopeWidth, 0.14, roofDepth);
  roofL.rotateZ(pitchAngle);
  roofL.translate(-1.4, 3.9, 0);

  const roofR = new THREE.BoxGeometry(slopeWidth, 0.14, roofDepth);
  roofR.rotateZ(-pitchAngle);
  roofR.translate(1.4, 3.9, 0);

  const ridgeCap = new THREE.BoxGeometry(0.22, 0.22, roofDepth + 0.2);
  ridgeCap.translate(0, 4.75, 0);
  parts.push(roofL, roofR, ridgeCap);

  // Conical Rice Straw Haystack
  const haystack = new THREE.ConeGeometry(2.0, 3.2, 16);
  haystack.translate(4.8, 1.6, 0.4);
  parts.push(haystack);

  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildRiversideWoodenBridgeGeometry(bridgeLength = 22): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Deck Planking (22m long along Z, 2.4m wide along X, elevated over water)
  const deck = new THREE.BoxGeometry(2.4, 0.24, bridgeLength);
  deck.translate(0, 0.85, 0);
  parts.push(deck);

  // Approach ramps on near and far banks sloping to ground level
  const rampNear = new THREE.BoxGeometry(2.4, 0.22, 2.6);
  rampNear.rotateX(0.22);
  rampNear.translate(0, 0.42, -bridgeLength * 0.5 - 1.1);
  const rampFar = new THREE.BoxGeometry(2.4, 0.22, 2.6);
  rampFar.rotateX(-0.22);
  rampFar.translate(0, 0.42, bridgeLength * 0.5 + 1.1);
  parts.push(rampNear, rampFar);

  // Parapets / Handrails (running along Z)
  const railL = new THREE.BoxGeometry(0.14, 0.14, bridgeLength + 1.6);
  railL.translate(-1.15, 1.65, 0);
  const railR = new THREE.BoxGeometry(0.14, 0.14, bridgeLength + 1.6);
  railR.translate(1.15, 1.65, 0);
  parts.push(railL, railR);

  // Vertical Baluster Posts along rails
  for (let z = -bridgeLength * 0.48; z <= bridgeLength * 0.48; z += 1.6) {
    const pL = new THREE.BoxGeometry(0.1, 0.85, 0.1);
    pL.translate(-1.15, 1.25, z);
    const pR = new THREE.BoxGeometry(0.1, 0.85, 0.1);
    pR.translate(1.15, 1.25, z);
    parts.push(pL, pR);
  }

  // Cross-braced Timber Trestle Pier Bents in the riverbed
  for (const pz of [-bridgeLength * 0.35, -bridgeLength * 0.12, bridgeLength * 0.12, bridgeLength * 0.35]) {
    const pierL = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
    pierL.translate(-0.95, 0.1, pz);
    const pierR = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
    pierR.translate(0.95, 0.1, pz);
    const crossBeam = new THREE.BoxGeometry(2.4, 0.24, 0.26);
    crossBeam.translate(0, 0.72, pz);
    // Diagonal cross brace
    const diag = new THREE.BoxGeometry(2.2, 0.1, 0.1);
    diag.rotateZ(Math.PI * 0.25);
    diag.translate(0, 0.35, pz);
    parts.push(pierL, pierR, crossBeam, diag);
  }

  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildFarmTractorGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Blue Engine Hood & Chassis
  const hood = new THREE.BoxGeometry(1.4, 1.1, 2.6);
  hood.translate(0, 1.2, 0.6);
  const cabFloor = new THREE.BoxGeometry(1.6, 0.3, 1.6);
  cabFloor.translate(0, 0.95, -1.0);
  parts.push(hood, cabFloor);

  // Safety Rollbar Cage
  const rollL = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6);
  rollL.translate(-0.7, 2.0, -1.1);
  const rollR = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6);
  rollR.translate(0.7, 2.0, -1.1);
  const rollTop = new THREE.BoxGeometry(1.5, 0.12, 0.12);
  rollTop.translate(0, 3.0, -1.1);
  parts.push(rollL, rollR, rollTop);

  // Large Rear Agricultural Wheels
  const wheelRL = new THREE.CylinderGeometry(1.1, 1.1, 0.6, 14);
  wheelRL.rotateZ(Math.PI * 0.5);
  wheelRL.translate(-1.1, 1.1, -1.0);
  const wheelRR = new THREE.CylinderGeometry(1.1, 1.1, 0.6, 14);
  wheelRR.rotateZ(Math.PI * 0.5);
  wheelRR.translate(1.1, 1.1, -1.0);

  // Smaller Front Wheels
  const wheelFL = new THREE.CylinderGeometry(0.65, 0.65, 0.38, 12);
  wheelFL.rotateZ(Math.PI * 0.5);
  wheelFL.translate(-0.95, 0.65, 1.5);
  const wheelFR = new THREE.CylinderGeometry(0.65, 0.65, 0.38, 12);
  wheelFR.rotateZ(Math.PI * 0.5);
  wheelFR.translate(0.95, 0.65, 1.5);
  parts.push(wheelRL, wheelRR, wheelFL, wheelFR);

  // Exhaust Stack
  const exhaust = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 8);
  exhaust.translate(0.6, 2.3, 1.2);
  parts.push(exhaust);

  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildBananaPlantGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const creaseRad = THREE.MathUtils.degToRad(55);

  // Central Fleshy Trunk / Pseudostem
  const trunk = new THREE.CylinderGeometry(0.14, 0.22, 2.2, 8);
  trunk.translate(0, 1.1, 0);
  parts.push(trunk.toNonIndexed());

  // 8 Arching Paddle-Shaped Banana Leaves
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8 + 0.2;
    const leaf = new THREE.BoxGeometry(0.85, 2.6, 0.04, 2, 6, 1);
    const pos = leaf.attributes.position;
    for (let p = 0; p < pos.count; p++) {
      const y = pos.getY(p) + 1.3; // 0 to 2.6
      const normY = y / 2.6;
      const x = pos.getX(p);
      const widthTaper = Math.sin(normY * Math.PI) * 1.35;
      const archZ = normY * normY * 0.95; // Graceful droop
      const vCrease = Math.abs(x) * 0.15; // Center crease
      pos.setXYZ(p, x * widthTaper, y, pos.getZ(p) + archZ - vCrease);
    }
    leaf.rotateX(Math.PI * 0.22);
    leaf.rotateY(angle);
    leaf.translate(0, 1.9, 0);
    parts.push(BufferGeometryUtils.toCreasedNormals(leaf, creaseRad).toNonIndexed());
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildRoadsideMarkerPostGeometry(): THREE.BufferGeometry {
  const post = new THREE.BoxGeometry(0.24, 0.88, 0.24);
  post.translate(0, 0.44, 0);
  const cap = new THREE.CylinderGeometry(0.01, 0.17, 0.14, 4);
  cap.rotateY(Math.PI * 0.25);
  cap.translate(0, 0.95, 0);
  const merged = BufferGeometryUtils.mergeGeometries(
    [post.toNonIndexed(), cap.toNonIndexed()],
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildTelegraphPoleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Main Pole (9.5m tall)
  const pole = new THREE.CylinderGeometry(0.12, 0.18, 9.5, 8);
  pole.translate(0, 4.75, 0);
  parts.push(pole);

  // Horizontal Crossarm Beam
  const crossarm = new THREE.BoxGeometry(2.8, 0.18, 0.18);
  crossarm.translate(0, 8.8, 0);
  parts.push(crossarm);

  // 4 Porcelain Insulator Pegs
  for (const px of [-1.2, -0.4, 0.4, 1.2]) {
    const ins = new THREE.CylinderGeometry(0.06, 0.08, 0.28, 6);
    ins.translate(px, 9.05, 0);
    parts.push(ins);
  }

  const merged = BufferGeometryUtils.mergeGeometries(
    parts.map((p) => p.toNonIndexed()),
    false,
  );
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildRusticSplitRailFenceGeometry(): THREE.BufferGeometry {
  const post1 = new THREE.BoxGeometry(0.22, 1.35, 0.22);
  post1.translate(0, 0.67, -2.0);
  const post2 = new THREE.BoxGeometry(0.22, 1.35, 0.22);
  post2.translate(0, 0.67, 2.0);

  const rail1 = new THREE.BoxGeometry(0.12, 0.14, 4.3);
  rail1.translate(0, 0.52, 0);
  const rail2 = new THREE.BoxGeometry(0.12, 0.14, 4.3);
  rail2.translate(0, 1.05, 0);

  const merged = BufferGeometryUtils.mergeGeometries([
    post1.toNonIndexed(),
    post2.toNonIndexed(),
    rail1.toNonIndexed(),
    rail2.toNonIndexed(),
  ], false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function buildTropicalMountainRidgeGeometry(
  baseRadius = 240,
  height = 75,
  radialSegs = 56,
  heightSegs = 24,
): THREE.BufferGeometry {
  // Broad, rolling tropical mountain ridges with rounded crests & lush cascading foothills
  const geo = new THREE.CylinderGeometry(18, baseRadius, height, radialSegs, heightSegs, false);
  geo.translate(0, height * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const elev = Math.max(0, Math.min(1, vy / height));
    const angle = Math.atan2(vz, vx);

    // Natural multi-octave undulating ridges & valleys with gentle rolling crests
    const ridgeWave =
      Math.sin(angle * 2.5) * 0.22 +
      Math.cos(angle * 5 + 0.9) * 0.10 +
      Math.sin(angle * 8) * 0.04;
    // Parabolic dome curve for soft rounded tropical mountain crests (NO sharp party-hat cones!)
    const domeCurve = Math.pow(1 - elev, 0.85);
    const radial = (1 + ridgeWave * 0.45) * (0.20 + 0.80 * domeCurve);

    // Smooth rounded summit profile
    const roundedHeight = vy * (0.86 + Math.sin(angle * 2) * 0.08);
    pos.setXYZ(i, vx * radial, roundedHeight, vz * radial);
  }
  const creased = BufferGeometryUtils.toCreasedNormals(
    geo,
    THREE.MathUtils.degToRad(75),
  );
  creased.computeBoundingSphere();
  return creased;
}

function buildChamferedTowerGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const r = 0.5;
  const c = 0.15;
  shape.moveTo(-r + c, -r);
  shape.lineTo(r - c, -r);
  shape.lineTo(r, -r + c);
  shape.lineTo(r, r - c);
  shape.lineTo(r - c, r);
  shape.lineTo(-r + c, r);
  shape.lineTo(-r, r - c);
  shape.lineTo(-r, -r + c);
  shape.closePath();
  const extrudeSettings = {
    steps: 1,
    depth: 1,
    bevelEnabled: false,
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(Math.PI * 0.5);
  geo.translate(0, 0.5, 0);
  return geo;
}

function buildSteppedArtDecoGeometry(): THREE.BufferGeometry {
  // Tier 1 (Base: 0 to 0.45)
  const b1 = new THREE.BoxGeometry(1.0, 0.45, 1.0);
  b1.translate(0, 0.225, 0);
  // Tier 2 (Middle setback: 0.45 to 0.78)
  const b2 = new THREE.BoxGeometry(0.76, 0.33, 0.76);
  b2.translate(0, 0.615, 0);
  // Tier 3 (Upper setback: 0.78 to 0.94)
  const b3 = new THREE.BoxGeometry(0.52, 0.16, 0.52);
  b3.translate(0, 0.86, 0);
  // Spire / Antenna (0.94 to 1.18)
  const spire = new THREE.CylinderGeometry(0.02, 0.08, 0.24, 8);
  spire.translate(0, 1.06, 0);

  const merged = BufferGeometryUtils.mergeGeometries(
    [
      b1.toNonIndexed(),
      b2.toNonIndexed(),
      b3.toNonIndexed(),
      spire.toNonIndexed(),
    ],
    false,
  );
  merged.computeVertexNormals();
  return merged;
}

function buildCylinderFinTowerGeometry(): THREE.BufferGeometry {
  const core = new THREE.CylinderGeometry(0.48, 0.48, 1.0, 24);
  core.translate(0, 0.5, 0);
  return core;
}

function buildTwinSkybridgeGeometry(): THREE.BufferGeometry {
  // Tower A
  const tA = new THREE.BoxGeometry(0.38, 1.0, 0.85);
  tA.translate(-0.28, 0.5, 0);
  // Tower B
  const tB = new THREE.BoxGeometry(0.38, 1.0, 0.85);
  tB.translate(0.28, 0.5, 0);
  // Skybridge connecting at y = 0.72
  const bridge = new THREE.BoxGeometry(0.42, 0.09, 0.45);
  bridge.translate(0, 0.72, 0);

  const merged = BufferGeometryUtils.mergeGeometries(
    [tA.toNonIndexed(), tB.toNonIndexed(), bridge.toNonIndexed()],
    false,
  );
  merged.computeVertexNormals();
  return merged;
}


function buildRoadRibbonGeometry(
  waypoints: Waypoint2D[],
  totalLength: number,
  roadWidth: number,
): THREE.BufferGeometry {
  const n = waypoints.length;
  const positions = new Float32Array((n + 1) * 2 * 3);
  const normals = new Float32Array((n + 1) * 2 * 3);
  const uvs = new Float32Array((n + 1) * 2 * 2);
  const indices: number[] = [];

  const halfW = roadWidth * 0.54;
  const yOffset = 0.032;

  for (let i = 0; i <= n; i++) {
    const wp = waypoints[i % n];
    const dist = i === n ? totalLength : wp.distFromStart;
    const vCoord = dist / 14;

    const lx = wp.x - wp.nx * halfW;
    const lz = wp.z - wp.nz * halfW;
    const rx = wp.x + wp.nx * halfW;
    const rz = wp.z + wp.nz * halfW;

    const vIdx = i * 2;
    positions[vIdx * 3 + 0] = lx;
    positions[vIdx * 3 + 1] = yOffset;
    positions[vIdx * 3 + 2] = lz;

    positions[(vIdx + 1) * 3 + 0] = rx;
    positions[(vIdx + 1) * 3 + 1] = yOffset;
    positions[(vIdx + 1) * 3 + 2] = rz;

    normals[vIdx * 3 + 1] = 1;
    normals[(vIdx + 1) * 3 + 1] = 1;

    uvs[vIdx * 2 + 0] = 0;
    uvs[vIdx * 2 + 1] = vCoord;
    uvs[(vIdx + 1) * 2 + 0] = 1;
    uvs[(vIdx + 1) * 2 + 1] = vCoord;

    if (i < n) {
      const a = vIdx;
      const b = vIdx + 1;
      const c = vIdx + 2;
      const d = vIdx + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export function buildRacingWorld(
  scene: THREE.Scene,
  initialWaypoints: Waypoint2D[],
  initialTotalLength: number,
  initialTrack: TrackSpec,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): WorldEnvironmentRefs {
  const root = new THREE.Group();
  root.name = 'RacingWorldRoot';
  scene.add(root);

  // Persistent Lights & Shared Textures
  const hemiLight = new THREE.HemisphereLight(
    initialTrack.hemiSkyColor,
    initialTrack.hemiGroundColor,
    initialTrack.hemiIntensity,
  );
  hemiLight.position.set(0, 95, 0);
  root.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(
    initialTrack.sunColor,
    initialTrack.sunIntensity * 0.68,
  );
  sunLight.position.set(115, 62, -95);
  sunLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 180;
    const d = 36;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.025;
  }
  root.add(sunLight);

  // Warm rim / fill directional light from opposite horizon for 3-point outdoor lighting
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
  rimLight.position.set(-80, 38, 70);
  root.add(rimLight);

  // Showroom Championship Podium under (0, 0, 0) for Garage View
  const showroomPodium = new THREE.Group();
  showroomPodium.name = 'ShowroomPodium';
  const podiumOuterBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.85, 4.15, 0.09, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0b111e,
      metalness: 0.82,
      roughness: 0.2,
    }),
  );
  podiumOuterBase.position.y = 0.045;

  const podiumTopStage = new THREE.Mesh(
    new THREE.CylinderGeometry(3.38, 3.55, 0.06, 48),
    new THREE.MeshStandardMaterial({
      color: 0x161f33,
      metalness: 0.68,
      roughness: 0.18,
    }),
  );
  podiumTopStage.position.y = 0.11;

  const podiumGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(3.42, 3.62, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
    }),
  );
  podiumGlowRing.rotation.x = -Math.PI * 0.5;
  podiumGlowRing.position.y = 0.095;

  const podiumInnerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.55, 2.66, 48),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
    }),
  );
  podiumInnerRing.rotation.x = -Math.PI * 0.5;
  podiumInnerRing.position.y = 0.144;

  // Dedicated Showroom Studio Key & Rim Point Lights (automatically hidden during racing when showroomPodium.visible = false)
  const showroomKeyLight = new THREE.PointLight(0xfff7ed, 2.4, 14, 1.4);
  showroomKeyLight.position.set(2.8, 2.9, 2.6);
  const showroomRimLight = new THREE.PointLight(0x38bdf8, 1.8, 14, 1.4);
  showroomRimLight.position.set(-2.8, 2.2, -2.4);

  showroomPodium.add(
    podiumOuterBase,
    podiumTopStage,
    podiumGlowRing,
    podiumInnerRing,
    showroomKeyLight,
    showroomRimLight,
  );
  root.add(showroomPodium);

  // Shared high-resolution textures & procedural geometries
  const roadTex = createRoadAsphaltTexture(maxAnisotropy);
  const countrysideRoadTex = createCountrysideRoadTexture(maxAnisotropy);
  const facadeTex = createBuildingFacadeTexture(initialTrack, maxAnisotropy);
  const bannerTex = createCheckeredBannerTexture();
  const chevronTex = createChevronSignTexture();
  const barkTex = createBarkTexture();
  const foliageTex = createFoliageLeafTexture(maxAnisotropy);
  const stiltHouseTex = createStiltHouseTexture();
  const thatchRoofTex = createThatchedRoofTexture();
  const markerPostTex = createRoadsideMarkerPostTexture();
  const tropicalMountainTex = createTropicalMountainTexture(maxAnisotropy);
  const riverWaterTex = createRiverWaterTexture(maxAnisotropy);

  const pineTreeGeos = buildDetailedTreeGeometries('pine');
  const oakTreeGeos = buildDetailedTreeGeometries('oak');
  const palmTreeGeos = buildDetailedTreeGeometries('palm');
  const desertFloraGeos = buildDetailedTreeGeometries('desert');
  const grassTuftGeo = buildGrassTuftGeometry();
  const craggyMountainGeo = buildRealisticMountainGeometry(56, 105, 48, 24);
  const craggyPeakGeo = buildRealisticMountainGeometry(0.68, 1.0, 28, 14);
  const sandstoneMesaGeo = buildTerracedSandstoneMesaGeometry(0.76, 1.0);
  const tropicalMountainRidgeGeo = buildTropicalMountainRidgeGeometry(240, 75, 56, 24);
  const elevatedStiltHouseGeo = buildElevatedStiltHouseGeometry();
  const stiltHouseWindowsGeo = buildStiltHouseWindowsGeometry();
  const openThatchedShedGeo = buildOpenThatchedShedGeometry();
  const riversideWoodenBridgeGeo = buildRiversideWoodenBridgeGeometry();
  const farmTractorGeo = buildFarmTractorGeometry();
  const bananaPlantGeo = buildBananaPlantGeometry();
  const roadsideMarkerPostGeo = buildRoadsideMarkerPostGeometry();
  const telegraphPoleGeo = buildTelegraphPoleGeometry();
  const splitRailFenceGeo = buildRusticSplitRailFenceGeometry();

  let trackContentGroup = new THREE.Group();
  root.add(trackContentGroup);

  const rebuildForTrack = (
    spec: TrackSpec,
    waypoints: Waypoint2D[],
    totalLength: number,
  ): void => {
    root.remove(trackContentGroup);
    trackContentGroup = new THREE.Group();
    trackContentGroup.name = `Track_${spec.id}`;
    root.add(trackContentGroup);

    const isNaturalMap =
      spec.envKind === 'alpine' || spec.envKind === 'desert';
    const isNight =
      spec.id === 'neon_night' ||
      spec.id === 'harbor_docks' ||
      spec.id === 'tokyo_wangan_express';

    // 1. Atmospheric Sky Dome (dynamically scaled to fit small circuits and giant expressways)
    const skyTex = createSkyDomeTexture(spec);
    const domeRadius = Math.max(1200, totalLength * 0.55);
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(domeRadius, 40, 28),
      new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        fog: false,
      }),
    );
    trackContentGroup.add(skyMesh);

    const dummy = new THREE.Object3D();
    const colorHelper = new THREE.Color();

    scene.background = new THREE.Color(spec.skyHorizonColor);
    scene.fog = new THREE.FogExp2(spec.fogColor, spec.fogDensity * 0.62);
    sunLight.color.setHex(spec.sunColor);
    sunLight.intensity = spec.sunIntensity * 0.68;
    hemiLight.color.setHex(spec.hemiSkyColor);
    hemiLight.groundColor.setHex(spec.hemiGroundColor);
    rimLight.color.setHex(spec.hemiSkyColor);
    rimLight.intensity = isNight ? 0.2 : 0.38;

    // 2. High-Resolution Textured Grass / Terrain Ground Plane (dynamically scaled for massive circuits)
    const grassTex = createTerrainGrassTexture(spec, maxAnisotropy);
    const groundDim = Math.max(2200, totalLength * 0.95);
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(groundDim, groundDim),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: grassTex,
        roughness: 0.9,
        metalness: 0.02,
      }),
    );
    groundMesh.rotation.x = -Math.PI * 0.5;
    groundMesh.receiveShadow = true;
    trackContentGroup.add(groundMesh);

    const isCountryside = spec.envKind === 'countryside';
    if (!isCountryside) {
      const isWaterInfield =
        spec.envKind === 'coastal' || spec.envKind === 'harbor';
      const infieldMesh = new THREE.Mesh(
        new THREE.CircleGeometry(105, 48),
        new THREE.MeshStandardMaterial({
          color: spec.infieldColor,
          map: isWaterInfield ? null : grassTex,
          roughness: isWaterInfield ? 0.14 : 0.88,
          metalness: isWaterInfield ? 0.72 : 0.02,
        }),
      );
      infieldMesh.rotation.x = -Math.PI * 0.5;
      infieldMesh.position.set(
        spec.envKind === 'alpine' ? -75 : 85,
        0.012,
        20,
      );
      trackContentGroup.add(infieldMesh);
    }

    // 3. Road Ribbon Mesh
    const isWetRoad = spec.id === 'neon_night' || spec.id === 'harbor_docks';
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: isCountryside ? countrysideRoadTex : roadTex,
      roughness: isWetRoad ? 0.38 : isCountryside ? 0.84 : 0.78,
      metalness: isWetRoad ? 0.24 : 0.06,
    });
    const roadGeo = buildRoadRibbonGeometry(
      waypoints,
      totalLength,
      spec.roadWidth,
    );
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    trackContentGroup.add(roadMesh);

    // 3.1. Physically Elevated 3D FIA Rumble Curbs on Corner Apexes (racetracks only)
    const curbHalfW = spec.roadWidth * 0.54;
    const curbBlockGeo = new THREE.BoxGeometry(0.92, 0.12, 0.72);
    curbBlockGeo.translate(0, 0.06, 0);

    const isPureNight = spec.id === 'neon_night';
    const isHarbor = spec.id === 'harbor_docks';
    const isDesert = spec.id === 'desert_dunes';

    // Circuit-tailored curb color palettes
    const primaryCurbColor = isPureNight
      ? 0x06b6d4 // Electric Cyan
      : isHarbor
        ? 0xeab308 // Industrial Hazard Yellow
        : isDesert
          ? 0xb91c1c // Sedona Red Sandstone
          : 0xdc2626; // FIA Red

    const secondaryCurbColor = isPureNight
      ? 0xd946ef // Electric Magenta
      : isHarbor
        ? 0x0f172a // Charcoal Black
        : isDesert
          ? 0xfef3c7 // Warm Desert Bone
          : 0xf8fafc; // Clean White

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.15,
    });

    const curbTransforms: Array<{
      x: number;
      z: number;
      rotY: number;
      color: number;
    }> = [];

    // Distance countdown marker transforms (150m, 100m, 50m)
    const markerTransforms150: Array<{ x: number; z: number; rotY: number }> = [];
    const markerTransforms100: Array<{ x: number; z: number; rotY: number }> = [];
    const markerTransforms50: Array<{ x: number; z: number; rotY: number }> = [];

    const nWp = waypoints.length;
    for (let i = 0; i < nWp; i++) {
      const wp = waypoints[i];
      const wpNext = waypoints[(i + 2) % nWp];
      const cross = wp.tx * wpNext.tz - wp.tz * wpNext.tx;
      const rotY = Math.atan2(wp.tx, wp.tz);

      // On corners (sharp curve) - skip curbs on rural highway
      if (!isCountryside && Math.abs(cross) > 0.024) {
        // Inside apex curb
        const insideSign = cross > 0 ? 1 : -1;
        const colorInside = i % 2 === 0 ? primaryCurbColor : secondaryCurbColor;
        curbTransforms.push({
          x: wp.x + wp.nx * insideSign * (curbHalfW - 0.18),
          z: wp.z + wp.nz * insideSign * (curbHalfW - 0.18),
          rotY,
          color: colorInside,
        });

        // Outside exit curb (on sharper curves)
        if (Math.abs(cross) > 0.045) {
          const outsideSign = -insideSign;
          const colorOutside = i % 2 === 0 ? secondaryCurbColor : primaryCurbColor;
          curbTransforms.push({
            x: wp.x + wp.nx * outsideSign * (curbHalfW + 0.18),
            z: wp.z + wp.nz * outsideSign * (curbHalfW + 0.18),
            rotY,
            color: colorOutside,
          });
        }
      }

      // Distance countdown boards on run-in to sharp curves (racetracks only)
      if (!isCountryside && Math.abs(cross) > 0.08 && i % 8 === 0) {
        const outsideSign = cross > 0 ? -1 : 1;
        const wp150 = waypoints[(i - 6 + nWp) % nWp];
        const wp100 = waypoints[(i - 4 + nWp) % nWp];
        const wp50 = waypoints[(i - 2 + nWp) % nWp];
        const boardDist = curbHalfW + 1.6;

        markerTransforms150.push({
          x: wp150.x + wp150.nx * outsideSign * boardDist,
          z: wp150.z + wp150.nz * outsideSign * boardDist,
          rotY: Math.atan2(wp150.tx, wp150.tz) + (outsideSign > 0 ? -0.2 : 0.2),
        });
        markerTransforms100.push({
          x: wp100.x + wp100.nx * outsideSign * boardDist,
          z: wp100.z + wp100.nz * outsideSign * boardDist,
          rotY: Math.atan2(wp100.tx, wp100.tz) + (outsideSign > 0 ? -0.2 : 0.2),
        });
        markerTransforms50.push({
          x: wp50.x + wp50.nx * outsideSign * boardDist,
          z: wp50.z + wp50.nz * outsideSign * boardDist,
          rotY: Math.atan2(wp50.tx, wp50.tz) + (outsideSign > 0 ? -0.2 : 0.2),
        });
      }
    }

    if (curbTransforms.length > 0) {
      const curbInst = new THREE.InstancedMesh(
        curbBlockGeo,
        curbMat,
        curbTransforms.length,
      );
      curbInst.castShadow = !isSoftwareGl;
      curbInst.receiveShadow = true;
      for (let c = 0; c < curbTransforms.length; c++) {
        const ct = curbTransforms[c];
        dummy.position.set(ct.x, 0.015, ct.z);
        dummy.rotation.set(0, ct.rotY, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        curbInst.setMatrixAt(c, dummy.matrix);
        curbInst.setColorAt(c, colorHelper.setHex(ct.color));
      }
      curbInst.instanceMatrix.needsUpdate = true;
      if (curbInst.instanceColor) curbInst.instanceColor.needsUpdate = true;
      curbInst.computeBoundingSphere();
      trackContentGroup.add(curbInst);
    }

    // Spawn distance countdown boards (150m, 100m, 50m)
    const boardPanelGeo = new THREE.BoxGeometry(1.2, 1.2, 0.08);
    boardPanelGeo.translate(0, 1.25, 0);
    const boardPostGeo = new THREE.BoxGeometry(0.12, 1.25, 0.12);
    boardPostGeo.translate(0, 0.625, 0);
    const combinedBoardGeo = BufferGeometryUtils.mergeGeometries(
      [boardPanelGeo.toNonIndexed(), boardPostGeo.toNonIndexed()],
      false,
    );
    combinedBoardGeo.computeVertexNormals();

    const spawnBoardGroup = (
      transforms: Array<{ x: number; z: number; rotY: number }>,
      distLabel: '150' | '100' | '50',
    ) => {
      if (transforms.length === 0) return;
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: createBrakeMarkerTexture(distLabel),
        roughness: 0.35,
        metalness: 0.15,
      });
      const bInst = new THREE.InstancedMesh(
        combinedBoardGeo,
        bMat,
        transforms.length,
      );
      bInst.castShadow = !isSoftwareGl;
      bInst.receiveShadow = true;
      for (let b = 0; b < transforms.length; b++) {
        const bt = transforms[b];
        dummy.position.set(bt.x, 0, bt.z);
        dummy.rotation.set(0, bt.rotY, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        bInst.setMatrixAt(b, dummy.matrix);
      }
      bInst.instanceMatrix.needsUpdate = true;
      bInst.computeBoundingSphere();
      trackContentGroup.add(bInst);
    };

    spawnBoardGroup(markerTransforms150, '150');
    spawnBoardGroup(markerTransforms100, '100');
    spawnBoardGroup(markerTransforms50, '50');


    // Structural metal material for gantries, guardrail posts, and streetlights
    const gantryMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.78,
      roughness: 0.25,
    });

    // 4. Start/Finish Gantry Arch + 3 Mid-Track Illuminated Racing Portals (Racetrack & City circuits only)
    if (!isCountryside) {
      const portalAccentMat = new THREE.MeshStandardMaterial({
        color: spec.archAccentColor,
        emissive: spec.archAccentColor,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      });

      const startWp = waypoints[2] || waypoints[0];
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(startWp.x, 0, startWp.z);
      gantryGroup.rotation.y = Math.atan2(startWp.tx, startWp.tz);

      const spanW = spec.roadWidth + 4.4;
      const pillarGeo = new THREE.BoxGeometry(0.95, 8.4, 0.95);
      const leftPillar = new THREE.Mesh(pillarGeo, gantryMat);
      leftPillar.position.set(-spanW * 0.5, 4.2, 0);
      const rightPillar = new THREE.Mesh(pillarGeo, gantryMat);
      rightPillar.position.set(spanW * 0.5, 4.2, 0);

      const overheadBeam = new THREE.Mesh(
        new THREE.BoxGeometry(spanW + 1.4, 1.85, 1.15),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: bannerTex,
          roughness: 0.3,
          metalness: 0.25,
        }),
      );
      overheadBeam.position.set(0, 7.65, 0);

      const startStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.roadWidth, 2.5),
        new THREE.MeshBasicMaterial({
          map: bannerTex,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      startStrip.rotation.x = -Math.PI * 0.5;
      startStrip.position.set(0, 0.048, 0);
      gantryGroup.add(leftPillar, rightPillar, overheadBeam, startStrip);
      trackContentGroup.add(gantryGroup);

      const portalIndices = [
        Math.floor(waypoints.length * 0.24),
        Math.floor(waypoints.length * 0.52),
        Math.floor(waypoints.length * 0.78),
      ];
      for (const pIdx of portalIndices) {
        const pWp = waypoints[pIdx];
        if (!pWp) continue;
        const pGroup = new THREE.Group();
        pGroup.position.set(pWp.x, 0, pWp.z);
        pGroup.rotation.y = Math.atan2(pWp.tx, pWp.tz);

        const pLeft = new THREE.Mesh(pillarGeo, gantryMat);
        pLeft.position.set(-spanW * 0.5, 4.2, 0);
        const pRight = new THREE.Mesh(pillarGeo, gantryMat);
        pRight.position.set(spanW * 0.5, 4.2, 0);
        const pTop = new THREE.Mesh(
          new THREE.BoxGeometry(spanW + 1.2, 0.75, 0.75),
          gantryMat,
        );
        pTop.position.set(0, 8.1, 0);
        const pNeonBar = new THREE.Mesh(
          new THREE.BoxGeometry(spanW, 0.24, 0.85),
          portalAccentMat,
        );
        pNeonBar.position.set(0, 7.65, 0);
        pGroup.add(pLeft, pRight, pTop, pNeonBar);
        trackContentGroup.add(pGroup);
      }
    } else {
      // Clean painted white start line on rural tarmac (no steel racing arch clutter!)
      const startWp = waypoints[2] || waypoints[0];
      const startLineMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.roadWidth * 0.9, 0.65),
        new THREE.MeshBasicMaterial({
          color: 0xf8fafc,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      startLineMesh.rotation.x = -Math.PI * 0.5;
      startLineMesh.position.set(startWp.x, 0.046, startWp.z);
      startLineMesh.rotation.z = -Math.atan2(startWp.tx, startWp.tz);
      trackContentGroup.add(startLineMesh);
    }

    // 5. Continuous W-Beam Steel Guardrail Ribbons + Steel Support Posts + Curve Chevrons (city & racetrack circuits only)
    const railEdgeOffset = spec.roadWidth * 0.54 + 0.45;
    const chevronTransforms: Array<{ x: number; z: number; rotY: number }> = [];

    if (!isCountryside) {
      const railMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.82,
        roughness: 0.26,
        side: THREE.DoubleSide,
      });

      const leftGuardrailMesh = new THREE.Mesh(
        buildContinuousGuardrailGeometry(waypoints, railEdgeOffset, -1),
        railMat,
      );
      const rightGuardrailMesh = new THREE.Mesh(
        buildContinuousGuardrailGeometry(waypoints, railEdgeOffset, 1),
        railMat,
      );
      trackContentGroup.add(leftGuardrailMesh, rightGuardrailMesh);

      // Steel Guardrail Support I-Posts + Red/Amber Retro-Reflectors
      const postGeo = new THREE.BoxGeometry(0.14, 0.74, 0.14);
      postGeo.translate(0, 0.37, 0);
      const reflectorGeo = new THREE.BoxGeometry(0.18, 0.09, 0.08);
      reflectorGeo.translate(0, 0.62, 0);
      const reflectorMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
      });

      const postTransforms: Array<{ x: number; z: number; rotY: number }> = [];

      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const rotY = Math.atan2(wp.tx, wp.tz);

        for (const side of [-1, 1]) {
          postTransforms.push({
            x: wp.x + wp.nx * side * (railEdgeOffset + 0.06),
            z: wp.z + wp.nz * side * (railEdgeOffset + 0.06),
            rotY,
          });
        }
      }

      const postInst = new THREE.InstancedMesh(
        postGeo,
        gantryMat,
        postTransforms.length,
      );
      const reflectorInst = new THREE.InstancedMesh(
        reflectorGeo,
        reflectorMat,
        postTransforms.length,
      );
      for (let i = 0; i < postTransforms.length; i++) {
        const pt = postTransforms[i];
        dummy.position.set(pt.x, 0, pt.z);
        dummy.rotation.set(0, pt.rotY, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        postInst.setMatrixAt(i, dummy.matrix);
        reflectorInst.setMatrixAt(i, dummy.matrix);
      }
      postInst.instanceMatrix.needsUpdate = true;
      reflectorInst.instanceMatrix.needsUpdate = true;
      postInst.computeBoundingSphere();
      reflectorInst.computeBoundingSphere();
      trackContentGroup.add(postInst, reflectorInst);
    }

    // Curve Warning Chevrons on Sharp Corners
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const wpNext = waypoints[(i + 3) % waypoints.length];
      const rotY = Math.atan2(wp.tx, wp.tz);
      const cross = wp.tx * wpNext.tz - wp.tz * wpNext.tx;
      const chevThreshold = isCountryside ? 0.024 : 0.08;
      if (Math.abs(cross) > chevThreshold && i % (isCountryside ? 3 : 4) === 0) {
        const outsideSign = cross > 0 ? -1 : 1;
        const cDist = isCountryside ? spec.roadWidth * 0.54 + 1.25 : railEdgeOffset + 0.95;
        chevronTransforms.push({
          x: wp.x + wp.nx * outsideSign * cDist,
          z: wp.z + wp.nz * outsideSign * cDist,
          rotY: rotY + (outsideSign > 0 ? -0.35 : 0.35),
        });
      }
    }

    if (chevronTransforms.length > 0) {
      const chevGeo = new THREE.BoxGeometry(1.8, 0.95, 0.12);
      chevGeo.translate(0, 1.35, 0);
      const chevMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: chevronTex,
        emissive: 0xfacc15,
        emissiveMap: chevronTex,
        emissiveIntensity: 0.9,
      });
      const chevInst = new THREE.InstancedMesh(
        chevGeo,
        chevMat,
        chevronTransforms.length,
      );
      for (let i = 0; i < chevronTransforms.length; i++) {
        const ct = chevronTransforms[i];
        dummy.position.set(ct.x, 0, ct.z);
        dummy.rotation.set(0, ct.rotY, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        chevInst.setMatrixAt(i, dummy.matrix);
      }
      chevInst.instanceMatrix.needsUpdate = true;
      chevInst.computeBoundingSphere();
      trackContentGroup.add(chevInst);
    }

    // 6. Architecture: Modern Skyscrapers OR Natural Sandstone Mesas / Alpine Peaks
    const rockTex = createMountainRockTexture(spec, maxAnisotropy);
    const trackFacadeTex = createBuildingFacadeTexture(
      spec,
      maxAnisotropy,
      false,
    );
    const trackEmissiveTex = isNight
      ? createBuildingFacadeTexture(spec, maxAnisotropy, true)
      : null;
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: isNaturalMap ? rockTex : trackFacadeTex,
      emissive: isNight && !isNaturalMap ? 0xffffff : 0x000000,
      emissiveMap: isNight && !isNaturalMap ? trackEmissiveTex : null,
      emissiveIntensity: isNight ? 0.45 : 0.0,
      roughness: isNaturalMap ? 0.88 : 0.22,
      metalness: isNaturalMap ? 0.04 : 0.65,
    });
    const roofCrownMat = new THREE.MeshStandardMaterial({
      color: isNaturalMap
        ? spec.envKind === 'alpine'
          ? 0xf8fafc
          : 0xd97706
        : 0x1e293b,
      emissive: isNight && !isNaturalMap ? 0x38bdf8 : 0x000000,
      emissiveIntensity: isNight ? 0.35 : 0.0,
      roughness: 0.5,
      metalness: 0.7,
    });

    const buildingCoords: Array<{
      x: number;
      z: number;
      w: number;
      h: number;
      d: number;
      rotY: number;
      tint: number;
    }> = [];

    for (let i = 0; i < waypoints.length; i += 4) {
      const wp = waypoints[i];
      for (const side of [-1, 1]) {
        const w = isNaturalMap ? 12 + ((i * 13) % 10) : 9 + ((i * 13) % 9);
        const d = isNaturalMap ? 12 + ((i * 7) % 10) : 9 + ((i * 7) % 9);
        const h = isNaturalMap
          ? 24 + ((i * 23) % 42)
          : 20 + ((i * 29 + (side > 0 ? 19 : 5)) % 48);
        const distOut =
          (isNaturalMap ? 38 : 25) + ((i * 17 + (side > 0 ? 7 : 3)) % 24);
        const bx = wp.x + wp.nx * side * distOut;
        const bz = wp.z + wp.nz * side * distOut;
        const footprint = isNaturalMap
          ? Math.max(w, d) * 1.15
          : Math.max(w, d) * 0.85;
        const requiredClearance = spec.roadWidth * 0.55 + footprint + 9.0;
        if (minDistanceToWaypoints(bx, bz, waypoints) >= requiredClearance) {
          const rotY = Math.atan2(wp.tx, wp.tz) + (isNaturalMap ? i * 0.5 : 0);
          const palette =
            spec.envKind === 'desert'
              ? [0xd97706, 0xb45309, 0xa16207, 0xca8a04, 0x92400e]
              : [
                  0xf8fafc, 0xe2e8f0, 0xcbd5e1, 0x94a3b8, 0x64748b, 0x475569,
                  0x334155,
                ];
          buildingCoords.push({
            x: bx,
            z: bz,
            w,
            h,
            d,
            rotY,
            tint: palette[i % palette.length],
          });
        }
      }
    }

    const bCount = buildingCoords.length;
    const boxTowerGeo = new THREE.BoxGeometry(1, 1, 1);
    boxTowerGeo.translate(0, 0.5, 0);

    if (isCountryside) {
      // 1. Continuous Black & White Striped Roadside Guide Marker Posts with Red Reflector Caps (both shoulders)
      const markerPostCoords: Array<{ x: number; z: number; rotY: number }> = [];
      const markerDist = spec.roadWidth * 0.54 + 0.65;
      for (let i = 0; i < waypoints.length; i += 2) {
        const wp = waypoints[i];
        const rotY = Math.atan2(wp.tx, wp.tz);
        for (const side of [-1, 1]) {
          markerPostCoords.push({
            x: wp.x + wp.nx * side * markerDist,
            z: wp.z + wp.nz * side * markerDist,
            rotY,
          });
        }
      }
      if (markerPostCoords.length > 0) {
        const markerMat = new THREE.MeshStandardMaterial({
          map: markerPostTex,
          roughness: 0.52,
          metalness: 0.12,
        });
        const markerInst = new THREE.InstancedMesh(
          roadsideMarkerPostGeo,
          markerMat,
          markerPostCoords.length,
        );
        markerInst.castShadow = !isSoftwareGl;
        markerInst.receiveShadow = true;
        for (let k = 0; k < markerPostCoords.length; k++) {
          const mp = markerPostCoords[k];
          dummy.position.set(mp.x, 0, mp.z);
          dummy.rotation.set(0, mp.rotY, 0);
          dummy.scale.set(1.0, 1.0, 1.0);
          dummy.updateMatrix();
          markerInst.setMatrixAt(k, dummy.matrix);
        }
        markerInst.instanceMatrix.needsUpdate = true;
        markerInst.computeBoundingSphere();
        trackContentGroup.add(markerInst);
      }

      // 2. Rural Telegraph / Utility Power Poles with Crossarms along Left Road Verge
      const poleCoords: Array<{ x: number; z: number; rotY: number }> = [];
      const poleDist = spec.roadWidth * 0.54 + 2.5;
      for (let i = 0; i < waypoints.length; i += 7) {
        const wp = waypoints[i];
        poleCoords.push({
          x: wp.x - wp.nx * poleDist,
          z: wp.z - wp.nz * poleDist,
          rotY: Math.atan2(wp.tx, wp.tz),
        });
      }
      if (poleCoords.length > 0) {
        const telegraphMat = new THREE.MeshStandardMaterial({
          color: 0x4a3525, // weathered dark timber pole
          roughness: 0.9,
          metalness: 0.08,
        });
        const poleInst = new THREE.InstancedMesh(
          telegraphPoleGeo,
          telegraphMat,
          poleCoords.length,
        );
        poleInst.castShadow = !isSoftwareGl;
        poleInst.receiveShadow = true;
        for (let k = 0; k < poleCoords.length; k++) {
          const p = poleCoords[k];
          dummy.position.set(p.x, 0, p.z);
          dummy.rotation.set(0, p.rotY, 0);
          dummy.scale.set(1.0, 1.0, 1.0);
          dummy.updateMatrix();
          poleInst.setMatrixAt(k, dummy.matrix);
        }
        poleInst.instanceMatrix.needsUpdate = true;
        poleInst.computeBoundingSphere();
        trackContentGroup.add(poleInst);

        // Overhead Utility Power Lines between Telegraph Poles (matching photo)
        if (poleCoords.length > 1) {
          const wirePoints: number[] = [];
          for (let p = 0; p < poleCoords.length - 1; p++) {
            const p1 = poleCoords[p];
            const p2 = poleCoords[p + 1];
            for (const offset of [-0.95, 0, 0.95]) {
              const rot1 = p1.rotY;
              const rot2 = p2.rotY;
              const p1x = p1.x + Math.cos(rot1) * offset;
              const p1z = p1.z - Math.sin(rot1) * offset;
              const p2x = p2.x + Math.cos(rot2) * offset;
              const p2z = p2.z - Math.sin(rot2) * offset;

              const segs = 6;
              for (let s = 0; s < segs; s++) {
                const t0 = s / segs;
                const t1 = (s + 1) / segs;
                const xA = p1x + (p2x - p1x) * t0;
                const zA = p1z + (p2z - p1z) * t0;
                const yA = 8.85 - Math.sin(t0 * Math.PI) * 0.42;
                const xB = p1x + (p2x - p1x) * t1;
                const zB = p1z + (p2z - p1z) * t1;
                const yB = 8.85 - Math.sin(t1 * Math.PI) * 0.42;
                wirePoints.push(xA, yA, zA, xB, yB, zB);
              }
            }
          }
          const wireGeo = new THREE.BufferGeometry();
          wireGeo.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(wirePoints, 3),
          );
          const wireMat = new THREE.LineBasicMaterial({
            color: 0x1e293b,
            transparent: true,
            opacity: 0.72,
          });
          const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
          trackContentGroup.add(wireMesh);
        }
      }

      // 3. Elevated Wooden Stilt Farmhouses with Verandas, Ladders & Glowing Amber Windows
      const stiltHouseCoords: Array<{ x: number; z: number; rotY: number; scale: number }> = [];

      // Roadside Elevated Stilt Farmhouses along the Left Shoulder (matching reference photo)
      for (let i = 11; i < waypoints.length; i += 16) {
        const wp = waypoints[i];
        const isForeground = i === 11;
        const distOut = isForeground ? spec.roadWidth * 0.54 + 8.5 : spec.roadWidth * 0.54 + 14 + ((i * 3) % 8);
        const sx = wp.x - wp.nx * distOut;
        const sz = wp.z - wp.nz * distOut;
        const rotY = Math.atan2(wp.tx, wp.tz) + 0.35 + Math.PI; // Veranda & ladder facing toward the road
        stiltHouseCoords.push({
          x: sx,
          z: sz,
          rotY,
          scale: isForeground ? 1.25 : 0.95 + ((i % 3) * 0.08),
        });
      }

      // Distant village farmhouses across the rice paddies
      for (let i = 20; i < waypoints.length; i += 22) {
        const wp = waypoints[i];
        const side = (i / 22) % 2 === 0 ? 1 : -1;
        const distOut = spec.roadWidth * 0.54 + 55 + ((i * 11) % 24);
        const sx = wp.x + wp.nx * side * distOut;
        const sz = wp.z + wp.nz * side * distOut;
        if (minDistanceToWaypoints(sx, sz, waypoints) >= spec.roadWidth * 0.55 + 38) {
          stiltHouseCoords.push({
            x: sx,
            z: sz,
            rotY: Math.atan2(wp.tx, wp.tz) + 0.6,
            scale: 0.85,
          });
        }
      }
      if (stiltHouseCoords.length > 0) {
        const stiltMat = new THREE.MeshStandardMaterial({
          map: stiltHouseTex,
          roughness: 0.88,
          metalness: 0.05,
        });
        const stiltWinMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
        });
        const stiltInst = new THREE.InstancedMesh(
          elevatedStiltHouseGeo,
          stiltMat,
          stiltHouseCoords.length,
        );
        const stiltWinInst = new THREE.InstancedMesh(
          stiltHouseWindowsGeo,
          stiltWinMat,
          stiltHouseCoords.length,
        );
        stiltInst.castShadow = !isSoftwareGl;
        stiltInst.receiveShadow = true;
        for (let k = 0; k < stiltHouseCoords.length; k++) {
          const sh = stiltHouseCoords[k];
          dummy.position.set(sh.x, 0, sh.z);
          dummy.rotation.set(0, sh.rotY, 0);
          dummy.scale.setScalar(sh.scale);
          dummy.updateMatrix();
          stiltInst.setMatrixAt(k, dummy.matrix);
          stiltWinInst.setMatrixAt(k, dummy.matrix);
        }
        stiltInst.instanceMatrix.needsUpdate = true;
        stiltWinInst.instanceMatrix.needsUpdate = true;
        stiltInst.computeBoundingSphere();
        stiltWinInst.computeBoundingSphere();
        trackContentGroup.add(stiltInst, stiltWinInst);

        // Large Weathered River Boulder in Roadside Grass (matching photo bottom-left)
        const boulderGeo = new THREE.DodecahedronGeometry(1.05, 1);
        const bPos = boulderGeo.attributes.position;
        for (let bp = 0; bp < bPos.count; bp++) {
          const bx = bPos.getX(bp);
          const by = bPos.getY(bp);
          const bz = bPos.getZ(bp);
          bPos.setXYZ(bp, bx * 1.3, by * 0.65, bz * 1.1);
        }
        boulderGeo.computeVertexNormals();
        const boulderMat = new THREE.MeshStandardMaterial({
          color: 0x475569, // weathered dark river slate rock
          roughness: 0.92,
          metalness: 0.04,
        });
        const boulderMesh = new THREE.Mesh(boulderGeo, boulderMat);
        const wpBoulder = waypoints[Math.min(10, waypoints.length - 1)];
        boulderMesh.position.set(
          wpBoulder.x - wpBoulder.nx * (spec.roadWidth * 0.54 + 2.2),
          0.35,
          wpBoulder.z - wpBoulder.nz * (spec.roadWidth * 0.54 + 2.2),
        );
        boulderMesh.rotation.set(0.2, 0.8, -0.1);
        boulderMesh.castShadow = !isSoftwareGl;
        boulderMesh.receiveShadow = true;
        trackContentGroup.add(boulderMesh);
      }

      // 4. Tropical Banana Tree Plant Clusters around Stilt Houses & Roadside Ditches
      const bananaCoords: Array<{ x: number; z: number; rotY: number; scale: number }> = [];

      // Lush banana cluster framing the foreground stilt house (matching photo)
      const fgHouse = stiltHouseCoords[0];
      for (let b = 0; b < 8; b++) {
        const ang = b * 0.82 + 0.25;
        const rad = 5.6 + (b * 1.1);
        bananaCoords.push({
          x: fgHouse.x + Math.cos(ang) * rad,
          z: fgHouse.z + Math.sin(ang) * rad,
          rotY: ang + 1.2,
          scale: 1.1 + (b * 0.12),
        });
      }

      // Additional banana clusters at other farmhouses
      for (let k = 1; k < Math.min(stiltHouseCoords.length, 6); k++) {
        const sh = stiltHouseCoords[k];
        for (let b = 0; b < 3; b++) {
          const ang = b * 1.8 + 0.4;
          const rad = 7.0 + (b * 1.8);
          bananaCoords.push({
            x: sh.x + Math.cos(ang) * rad,
            z: sh.z + Math.sin(ang) * rad,
            rotY: ang + 1.1,
            scale: 0.88 + (b * 0.12),
          });
        }
      }
      // Roadside banana clumps along verges
      for (let i = 4; i < waypoints.length; i += 10) {
        const wp = waypoints[i];
        for (const side of [-1, 1]) {
          if (side > 0 && i >= 2 && i <= 48) continue;
          const bDist = spec.roadWidth * 0.54 + 4.5 + ((i * 3) % 4);
          bananaCoords.push({
            x: wp.x + wp.nx * side * bDist,
            z: wp.z + wp.nz * side * bDist,
            rotY: i * 0.85,
            scale: 0.95 + ((i % 4) * 0.12),
          });
        }
      }
      if (bananaCoords.length > 0) {
        const bananaMat = new THREE.MeshStandardMaterial({
          color: 0x166534, // rich natural tropical banana leaf green
          roughness: 0.65,
          metalness: 0.06,
          side: THREE.DoubleSide,
        });
        const bananaInst = new THREE.InstancedMesh(
          bananaPlantGeo,
          bananaMat,
          bananaCoords.length,
        );
        bananaInst.castShadow = !isSoftwareGl;
        bananaInst.receiveShadow = true;
        for (let k = 0; k < bananaCoords.length; k++) {
          const bc = bananaCoords[k];
          dummy.position.set(bc.x, 0, bc.z);
          dummy.rotation.set(0, bc.rotY, 0);
          dummy.scale.setScalar(bc.scale);
          dummy.updateMatrix();
          bananaInst.setMatrixAt(k, dummy.matrix);
        }
        bananaInst.instanceMatrix.needsUpdate = true;
        bananaInst.computeBoundingSphere();
        trackContentGroup.add(bananaInst);
      }

      // 5. Open-Air Thatched Farm Shed with Conical Golden Straw Haystack (matching shed behind foreground house)
      const shedCoords: Array<{ x: number; z: number; rotY: number }> = [];
      const wpShed = waypoints[Math.min(15, waypoints.length - 1)];
      shedCoords.push({
        x: wpShed.x - wpShed.nx * (spec.roadWidth * 0.54 + 13.5),
        z: wpShed.z - wpShed.nz * (spec.roadWidth * 0.54 + 13.5),
        rotY: Math.atan2(wpShed.tx, wpShed.tz) + 0.35,
      });

      for (let i = 32; i < waypoints.length; i += 18) {
        const wp = waypoints[i];
        let side = (i / 18) % 2 === 0 ? -1 : 1;
        if (isCountryside && i <= 44) {
          side = -1;
        }
        const distOut = spec.roadWidth * 0.54 + 20 + ((i * 5) % 12);
        const sx = wp.x + wp.nx * side * distOut;
        const sz = wp.z + wp.nz * side * distOut;
        if (minDistanceToWaypoints(sx, sz, waypoints) >= spec.roadWidth * 0.55 + 16) {
          shedCoords.push({
            x: sx,
            z: sz,
            rotY: Math.atan2(wp.tx, wp.tz) + 0.25,
          });
        }
      }
      if (shedCoords.length > 0) {
        const shedMat = new THREE.MeshStandardMaterial({
          map: thatchRoofTex,
          roughness: 0.88,
          metalness: 0.06,
        });
        const shedInst = new THREE.InstancedMesh(
          openThatchedShedGeo,
          shedMat,
          shedCoords.length,
        );
        shedInst.castShadow = !isSoftwareGl;
        shedInst.receiveShadow = true;
        for (let k = 0; k < shedCoords.length; k++) {
          const sc = shedCoords[k];
          dummy.position.set(sc.x, 0, sc.z);
          dummy.rotation.set(0, sc.rotY, 0);
          dummy.scale.set(1.0, 1.0, 1.0);
          dummy.updateMatrix();
          shedInst.setMatrixAt(k, dummy.matrix);
        }
        shedInst.instanceMatrix.needsUpdate = true;
        shedInst.computeBoundingSphere();
        trackContentGroup.add(shedInst);
      }

      // 6. Blue 4-Wheel Agricultural Tractor parked in the Rice Paddy Field (matching photo)
      const tractorCoords: Array<{ x: number; z: number; rotY: number }> = [];
      const wpTractor = waypoints[Math.min(20, waypoints.length - 1)];
      tractorCoords.push({
        x: wpTractor.x - wpTractor.nx * (spec.roadWidth * 0.54 + 28),
        z: wpTractor.z - wpTractor.nz * (spec.roadWidth * 0.54 + 28),
        rotY: Math.atan2(wpTractor.tx, wpTractor.tz) + 0.45,
      });
      if (waypoints.length > 50) {
        const wpTractor2 = waypoints[Math.floor(waypoints.length * 0.68)];
        tractorCoords.push({
          x: wpTractor2.x + wpTractor2.nx * (spec.roadWidth * 0.54 + 40),
          z: wpTractor2.z + wpTractor2.nz * (spec.roadWidth * 0.54 + 40),
          rotY: Math.atan2(wpTractor2.tx, wpTractor2.tz) - 0.6,
        });
      }
      const tractorMat = new THREE.MeshStandardMaterial({
        color: 0x2563eb, // vibrant royal blue agricultural tractor
        roughness: 0.42,
        metalness: 0.35,
      });
      const tractorInst = new THREE.InstancedMesh(
        farmTractorGeo,
        tractorMat,
        tractorCoords.length,
      );
      tractorInst.castShadow = !isSoftwareGl;
      tractorInst.receiveShadow = true;
      for (let k = 0; k < tractorCoords.length; k++) {
        const tc = tractorCoords[k];
        dummy.position.set(tc.x, 0, tc.z);
        dummy.rotation.set(0, tc.rotY, 0);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        tractorInst.setMatrixAt(k, dummy.matrix);
      }
      tractorInst.instanceMatrix.needsUpdate = true;
      tractorInst.computeBoundingSphere();
      trackContentGroup.add(tractorInst);

      // 7. Reflective Riverside Canal with Sunlight Sheen & Rustic Wooden Trestle Footbridge
      const riverStart = Math.min(2, waypoints.length - 1);
      const riverEnd = Math.min(46, waypoints.length - 1);
      const canalSegs = riverEnd - riverStart;

      if (canalSegs > 4) {
        const riverPos: number[] = [];
        const riverUvs: number[] = [];
        const riverIndices: number[] = [];

        // Dual sloping earthen riverbank geometries (inner verge bank & outer paddy dyke)
        const bankPos: number[] = [];
        const bankIndices: number[] = [];

        const innerBaseOffset = spec.roadWidth * 0.54 + 5.8;

        for (let i = riverStart; i <= riverEnd; i++) {
          const wp = waypoints[i];
          const taperIn = Math.min(1, Math.max(0, (i - riverStart) / 6));
          const taperOut = Math.min(1, Math.max(0, (riverEnd - i) / 6));
          const taper = Math.sin(Math.min(taperIn, taperOut) * Math.PI * 0.5);

          const canalWidth = 18.0 * taper;
          const innerOffset = innerBaseOffset;
          const outerOffset = innerOffset + canalWidth;

          const inX = wp.x + wp.nx * innerOffset;
          const inZ = wp.z + wp.nz * innerOffset;
          const outX = wp.x + wp.nx * outerOffset;
          const outZ = wp.z + wp.nz * outerOffset;

          const waterY = 0.04;
          riverPos.push(inX, waterY, inZ);
          riverPos.push(outX, waterY, outZ);

          const v = (i - riverStart) * 0.38;
          riverUvs.push(0, v);
          riverUvs.push(1, v);

          const rIdx = (i - riverStart) * 2;
          if (i < riverEnd) {
            riverIndices.push(rIdx, rIdx + 1, rIdx + 2);
            riverIndices.push(rIdx + 1, rIdx + 3, rIdx + 2);
          }

          // 1. Inner sloping bank (road verge down to canal water edge)
          const vergeInX = wp.x + wp.nx * (spec.roadWidth * 0.54 + 4.2);
          const vergeInZ = wp.z + wp.nz * (spec.roadWidth * 0.54 + 4.2);
          bankPos.push(vergeInX, 0.025, vergeInZ);
          bankPos.push(inX, waterY - 0.015, inZ);

          // 2. Outer sloping bank (canal water edge up to rice paddy dyke)
          const outerDykeDist = outerOffset + 2.4 * Math.max(0.2, taper);
          const outerRidgeX = wp.x + wp.nx * outerDykeDist;
          const outerRidgeZ = wp.z + wp.nz * outerDykeDist;
          bankPos.push(outX, waterY - 0.015, outZ);
          bankPos.push(outerRidgeX, 0.028, outerRidgeZ);

          const bIdx = (i - riverStart) * 4;
          if (i < riverEnd) {
            // Inner bank quad
            bankIndices.push(bIdx, bIdx + 1, bIdx + 4);
            bankIndices.push(bIdx + 1, bIdx + 5, bIdx + 4);
            // Outer bank quad
            bankIndices.push(bIdx + 2, bIdx + 3, bIdx + 6);
            bankIndices.push(bIdx + 3, bIdx + 7, bIdx + 6);
          }
        }

        const riverGeo = new THREE.BufferGeometry();
        riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPos, 3));
        riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs, 2));
        riverGeo.setIndex(riverIndices);
        riverGeo.computeVertexNormals();

        const riverMat = new THREE.MeshStandardMaterial({
          map: riverWaterTex,
          color: 0x1f5438, // Tropical deep green reflective river water
          roughness: 0.18,
          metalness: 0.35,
        });
        const riverMesh = new THREE.Mesh(riverGeo, riverMat);
        riverMesh.receiveShadow = true;
        trackContentGroup.add(riverMesh);

        // Natural earthen dual-sided canal embankment
        const bankGeo = new THREE.BufferGeometry();
        bankGeo.setAttribute('position', new THREE.Float32BufferAttribute(bankPos, 3));
        bankGeo.setIndex(bankIndices);
        bankGeo.computeVertexNormals();
        const bankMat = new THREE.MeshStandardMaterial({
          color: 0x362314, // moist rich riverbank loam
          roughness: 0.95,
          metalness: 0.02,
        });
        const bankMesh = new THREE.Mesh(bankGeo, bankMat);
        bankMesh.receiveShadow = true;
        trackContentGroup.add(bankMesh);

        // Rustic Multi-Span Timber Trestle Footbridge crossing the canal (matching photo)
        const wpBridge = waypoints[Math.min(18, waypoints.length - 1)];
        const bridgeCenterX = wpBridge.x + wpBridge.nx * (innerBaseOffset + 9.0);
        const bridgeCenterZ = wpBridge.z + wpBridge.nz * (innerBaseOffset + 9.0);
        const bridgeRotY = Math.atan2(wpBridge.nx, wpBridge.nz);

        const bridgeMat = new THREE.MeshStandardMaterial({
          color: 0x78350f, // rustic weathered timber
          roughness: 0.88,
          metalness: 0.05,
        });
        const bridgeMesh = new THREE.Mesh(riversideWoodenBridgeGeo, bridgeMat);
        bridgeMesh.position.set(bridgeCenterX, 0, bridgeCenterZ);
        bridgeMesh.rotation.set(0, bridgeRotY, 0);
        bridgeMesh.castShadow = !isSoftwareGl;
        bridgeMesh.receiveShadow = true;
        trackContentGroup.add(bridgeMesh);

        // Stilt cottage on the far bank of the river bridge (matching photo)
        const farBankHouse = new THREE.Mesh(elevatedStiltHouseGeo, new THREE.MeshStandardMaterial({
          map: stiltHouseTex,
          roughness: 0.85,
          metalness: 0.08,
        }));
        farBankHouse.position.set(
          wpBridge.x + wpBridge.nx * (innerBaseOffset + 22.5),
          0,
          wpBridge.z + wpBridge.nz * (innerBaseOffset + 22.5),
        );
        farBankHouse.rotation.set(0, bridgeRotY + Math.PI * 0.25, 0);
        farBankHouse.castShadow = !isSoftwareGl;
        farBankHouse.receiveShadow = true;
        trackContentGroup.add(farBankHouse);
      }

      // 8. Rustic Split-Rail Wooden Paddock Fences along Left Paddock Boundary
      // (Right side is intentionally kept fence-free so the river canal & wooden bridge are completely open to view!)
      const fenceCoords: Array<{ x: number; z: number; rotY: number }> = [];
      const fenceDist = spec.roadWidth * 0.54 + 6.2;
      for (let i = 0; i < waypoints.length; i += 2) {
        const wp = waypoints[i];
        // Only on left pasture border (side = -1)
        if (i % 7 !== 0) {
          const fx = wp.x - wp.nx * fenceDist;
          const fz = wp.z - wp.nz * fenceDist;
          const rotY = Math.atan2(wp.tx, wp.tz);
          fenceCoords.push({ x: fx, z: fz, rotY });
        }
      }
      if (fenceCoords.length > 0) {
        const fenceMat = new THREE.MeshStandardMaterial({
          color: 0x713f12, // rustic cedar paddock rail
          roughness: 0.88,
          metalness: 0.05,
        });
        const fenceInst = new THREE.InstancedMesh(
          splitRailFenceGeo,
          fenceMat,
          fenceCoords.length,
        );
        fenceInst.castShadow = !isSoftwareGl;
        fenceInst.receiveShadow = true;
        for (let k = 0; k < fenceCoords.length; k++) {
          const fc = fenceCoords[k];
          dummy.position.set(fc.x, 0, fc.z);
          dummy.rotation.set(0, fc.rotY, 0);
          dummy.scale.set(1.0, 1.0, 1.0);
          dummy.updateMatrix();
          fenceInst.setMatrixAt(k, dummy.matrix);
        }
        fenceInst.instanceMatrix.needsUpdate = true;
        fenceInst.computeBoundingSphere();
        trackContentGroup.add(fenceInst);
      }
    } else if (isNaturalMap) {
      const towerGeo =
        spec.envKind === 'desert' ? sandstoneMesaGeo : craggyPeakGeo;
      const towerInst = new THREE.InstancedMesh(towerGeo, buildingMat, bCount);
      towerInst.castShadow = !isSoftwareGl;
      towerInst.receiveShadow = true;
      for (let i = 0; i < bCount; i++) {
        const b = buildingCoords[i];
        dummy.position.set(b.x, 0, b.z);
        dummy.rotation.set(0, b.rotY, 0);
        dummy.scale.set(b.w, b.h, b.d);
        dummy.updateMatrix();
        towerInst.setMatrixAt(i, dummy.matrix);
        towerInst.setColorAt(i, colorHelper.setHex(b.tint));
      }
      towerInst.instanceMatrix.needsUpdate = true;
      if (towerInst.instanceColor) towerInst.instanceColor.needsUpdate = true;
      towerInst.computeBoundingSphere();
      trackContentGroup.add(towerInst);
    } else {
      // 4 High-Fidelity Skyscraper Typologies
      const chamferGeo = buildChamferedTowerGeometry();
      const artDecoGeo = buildSteppedArtDecoGeometry();
      const cylinderGeo = buildCylinderFinTowerGeometry();
      const twinTowerGeo = buildTwinSkybridgeGeometry();

      const typologies = [
        boxTowerGeo,
        chamferGeo,
        artDecoGeo,
        cylinderGeo,
        twinTowerGeo,
      ];
      const buckets: Array<
        Array<{ b: (typeof buildingCoords)[0]; idx: number }>
      > = [[], [], [], [], []];

      for (let i = 0; i < bCount; i++) {
        const typIdx = i % typologies.length;
        buckets[typIdx].push({ b: buildingCoords[i], idx: i });
      }

      for (let t = 0; t < typologies.length; t++) {
        const items = buckets[t];
        if (items.length === 0) continue;
        const instMesh = new THREE.InstancedMesh(
          typologies[t],
          buildingMat,
          items.length,
        );
        instMesh.castShadow = !isSoftwareGl;
        instMesh.receiveShadow = true;

        const crownMesh = new THREE.InstancedMesh(
          boxTowerGeo,
          roofCrownMat,
          items.length,
        );

        for (let j = 0; j < items.length; j++) {
          const { b } = items[j];
          dummy.position.set(b.x, 0, b.z);
          dummy.rotation.set(0, b.rotY, 0);
          dummy.scale.set(b.w, b.h, b.d);
          dummy.updateMatrix();
          instMesh.setMatrixAt(j, dummy.matrix);
          instMesh.setColorAt(j, colorHelper.setHex(b.tint));

          // Rooftop crown & aviation beacon
          dummy.position.set(b.x, b.h, b.z);
          dummy.scale.set(b.w * 0.55, 2.2, b.d * 0.55);
          dummy.updateMatrix();
          crownMesh.setMatrixAt(j, dummy.matrix);
        }

        instMesh.instanceMatrix.needsUpdate = true;
        if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
        crownMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
        crownMesh.computeBoundingSphere();
        trackContentGroup.add(instMesh, crownMesh);
      }

      // Harbor Port Specific: Intermodal 40ft Shipping Container Stacks & Dock Logistics
      if (spec.id === 'harbor_docks') {
        const containerGeo = new THREE.BoxGeometry(2.4, 2.6, 6.0);
        containerGeo.translate(0, 1.3, 0);
        const containerTex = createContainerTexture();
        const containerMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: containerTex,
          metalness: 0.65,
          roughness: 0.35,
        });

        const containerColors = [
          0x0284c7, 0x15803d, 0xb91c1c, 0xea580c, 0xeab308, 0x475569,
        ];
        const containerPlacements: Array<{
          x: number;
          y: number;
          z: number;
          rotY: number;
          color: number;
        }> = [];

        for (let i = 0; i < waypoints.length; i += 8) {
          const wp = waypoints[i];
          const side = (i / 8) % 2 === 0 ? 1 : -1;
          const baseDist = spec.roadWidth * 0.54 + 5.5;
          const cx = wp.x + wp.nx * side * baseDist;
          const cz = wp.z + wp.nz * side * baseDist;
          const rotY = Math.atan2(wp.tx, wp.tz);

          // 2x2 container stack (3 levels high)
          for (let row = 0; row < 2; row++) {
            for (let tier = 0; tier < 3; tier++) {
              const cCol =
                containerColors[(i + row + tier) % containerColors.length];
              const ox = -Math.sin(rotY) * (row * 2.5);
              const oz = Math.cos(rotY) * (row * 2.5);
              containerPlacements.push({
                x: cx + ox,
                y: tier * 2.62,
                z: cz + oz,
                rotY,
                color: cCol,
              });
            }
          }
        }

        if (containerPlacements.length > 0) {
          const cInst = new THREE.InstancedMesh(
            containerGeo,
            containerMat,
            containerPlacements.length,
          );
          cInst.castShadow = !isSoftwareGl;
          cInst.receiveShadow = true;
          for (let k = 0; k < containerPlacements.length; k++) {
            const cp = containerPlacements[k];
            dummy.position.set(cp.x, cp.y, cp.z);
            dummy.rotation.set(0, cp.rotY, 0);
            dummy.scale.setScalar(1);
            dummy.updateMatrix();
            cInst.setMatrixAt(k, dummy.matrix);
            cInst.setColorAt(k, colorHelper.setHex(cp.color));
          }
          cInst.instanceMatrix.needsUpdate = true;
          if (cInst.instanceColor) cInst.instanceColor.needsUpdate = true;
          cInst.computeBoundingSphere();
          trackContentGroup.add(cInst);
        }
      }
    }

    // 7. Roadside 3D Grass Tufts & Wildflower Shrubs (InstancedMesh)
    const tuftCoords: Array<{
      x: number;
      z: number;
      scale: number;
      rotY: number;
      tint: number;
    }> = [];
    const minGrassDist = spec.roadWidth * 0.54 + 1.35;
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      for (const side of [-1, 1]) {
        for (let row = 0; row < 2; row++) {
          let distOut = minGrassDist + row * 1.9 + ((i * 7 + row * 3) % 2.4);
          if (isCountryside && side > 0 && i >= 2 && i <= 48) {
            distOut = Math.min(distOut, spec.roadWidth * 0.54 + 4.0);
          }
          const gx = wp.x + wp.nx * side * distOut;
          const gz = wp.z + wp.nz * side * distOut;
          if (minDistanceToWaypoints(gx, gz, waypoints) >= minGrassDist) {
            const scale = 0.8 + ((i * 13 + row * 7) % 60) / 100;
            const tints = spec.foliageColors;
            tuftCoords.push({
              x: gx,
              z: gz,
              scale,
              rotY: (i * 1.7 + row) % (Math.PI * 2),
              tint: tints[(i + row) % tints.length],
            });
          }
        }
      }
    }

    const grassTuftMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: foliageTex,
      roughness: 0.76,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const grassTuftInst = new THREE.InstancedMesh(
      grassTuftGeo,
      grassTuftMat,
      tuftCoords.length,
    );
    for (let i = 0; i < tuftCoords.length; i++) {
      const tc = tuftCoords[i];
      dummy.position.set(tc.x, 0, tc.z);
      dummy.rotation.set(0, tc.rotY, 0);
      dummy.scale.setScalar(tc.scale);
      dummy.updateMatrix();
      grassTuftInst.setMatrixAt(i, dummy.matrix);
      grassTuftInst.setColorAt(
        i,
        colorHelper.setHex(tc.tint).offsetHSL(0.02, 0.08, 0.06),
      );
    }
    grassTuftInst.instanceMatrix.needsUpdate = true;
    if (grassTuftInst.instanceColor)
      grassTuftInst.instanceColor.needsUpdate = true;
    grassTuftInst.computeBoundingSphere();
    trackContentGroup.add(grassTuftInst);

    // 8. Multi-Species Realistic Trees (Spruce Conifers + Broadleaf Park Oaks OR Feathered Palms)
    const primaryTreeCoords: Array<{
      x: number;
      z: number;
      scale: number;
      tint: number;
    }> = [];
    const secondaryTreeCoords: Array<{
      x: number;
      z: number;
      scale: number;
      tint: number;
    }> = [];

    const safeTreeDist = spec.roadWidth * 0.54 + 3.8;
    for (let i = 0; i < waypoints.length; i += 2) {
      const wp = waypoints[i];
      for (const side of [-1, 1]) {
        let distOut = safeTreeDist + 1.5 + ((i * 5) % 8);
        if (isCountryside && side > 0 && i >= 2 && i <= 48) {
          distOut = spec.roadWidth * 0.54 + 28.5 + ((i * 3) % 8);
        }
        const tx = wp.x + wp.nx * side * distOut;
        const tz = wp.z + wp.nz * side * distOut;
        if (minDistanceToWaypoints(tx, tz, waypoints) >= safeTreeDist) {
          const scale = 0.88 + ((i * 19) % 38) / 100;
          const tints = spec.foliageColors;
          const entry = {
            x: tx,
            z: tz,
            scale,
            tint: tints[(i + (side > 0 ? 1 : 0)) % tints.length],
          };
          if ((i + (side > 0 ? 1 : 0)) % 3 === 0) {
            secondaryTreeCoords.push(entry);
          } else {
            primaryTreeCoords.push(entry);
          }
        }
      }
    }

    const isPalmMap =
      spec.envKind === 'coastal' || spec.envKind === 'desert';
    const primaryGeos = isPalmMap
      ? palmTreeGeos
      : isCountryside
        ? palmTreeGeos
        : pineTreeGeos;
    const secondaryGeos =
      spec.envKind === 'desert'
        ? desertFloraGeos
        : isCountryside
          ? oakTreeGeos
          : oakTreeGeos;

    const trunkMat = new THREE.MeshStandardMaterial({
      color: isPalmMap ? 0x9c7248 : 0x7c583c,
      map: barkTex,
      roughness: 0.9,
      metalness: 0.03,
    });
    const desertBoulderMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      map: rockTex,
      roughness: 0.92,
      metalness: 0.04,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: foliageTex,
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    const addTreeGroup = (
      coords: typeof primaryTreeCoords,
      geos: typeof pineTreeGeos,
      groupTrunkMat: THREE.MeshStandardMaterial,
    ) => {
      if (coords.length === 0) return;
      const tInst = new THREE.InstancedMesh(
        geos.trunkGeo,
        groupTrunkMat,
        coords.length,
      );
      const lInst = new THREE.InstancedMesh(
        geos.lowerCanopyGeo,
        foliageMat,
        coords.length,
      );
      const uInst = new THREE.InstancedMesh(
        geos.upperCanopyGeo,
        foliageMat,
        coords.length,
      );
      lInst.castShadow = !isSoftwareGl;
      uInst.castShadow = !isSoftwareGl;

      for (let i = 0; i < coords.length; i++) {
        const t = coords[i];
        dummy.position.set(t.x, 0, t.z);
        dummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        tInst.setMatrixAt(i, dummy.matrix);
        lInst.setMatrixAt(i, dummy.matrix);
        uInst.setMatrixAt(i, dummy.matrix);
        colorHelper.setHex(t.tint);
        lInst.setColorAt(i, colorHelper);
        uInst.setColorAt(
          i,
          colorHelper.clone().offsetHSL(0.02, 0.08, 0.12),
        );
      }
      tInst.instanceMatrix.needsUpdate = true;
      lInst.instanceMatrix.needsUpdate = true;
      uInst.instanceMatrix.needsUpdate = true;
      if (lInst.instanceColor) lInst.instanceColor.needsUpdate = true;
      if (uInst.instanceColor) uInst.instanceColor.needsUpdate = true;
      tInst.computeBoundingSphere();
      lInst.computeBoundingSphere();
      uInst.computeBoundingSphere();
      trackContentGroup.add(tInst, lInst, uInst);
    };

    addTreeGroup(primaryTreeCoords, primaryGeos, trunkMat);
    addTreeGroup(
      secondaryTreeCoords,
      secondaryGeos,
      spec.envKind === 'desert' ? desertBoulderMat : trunkMat,
    );

    // 9. Realistic Highway Streetlights with Overhanging Arms, Volumetric Light Cones & Ground Light Pools (city/tracks only)
    const lampCoords: Array<{ x: number; z: number; rotY: number }> = [];
    if (!isCountryside) {
      const lampDist = spec.roadWidth * 0.54 + 1.45;
      for (let i = 0; i < waypoints.length; i += 6) {
        const wp = waypoints[i];
        const side = (i / 6) % 2 === 0 ? -1 : 1;
        const lx = wp.x + wp.nx * side * lampDist;
        const lz = wp.z + wp.nz * side * lampDist;
        const rotY = Math.atan2(-wp.nx * side, -wp.nz * side);
        lampCoords.push({ x: lx, z: lz, rotY });
      }
    }

    if (lampCoords.length > 0) {
      const basePedestal = new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10);
      basePedestal.translate(0, 0.45, 0);
      const mastPole = new THREE.CylinderGeometry(0.09, 0.16, 7.2, 10);
      mastPole.translate(0, 3.6, 0);
      const boomArm = new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8);
      boomArm.rotateX(Math.PI * 0.42);
      boomArm.translate(0, 7.05, 1.15);
      const hoodBox = new THREE.BoxGeometry(0.55, 0.18, 0.95);
      hoodBox.translate(0, 7.28, 2.15);
      const fullPoleGeo = BufferGeometryUtils.mergeGeometries(
        [
          basePedestal.toNonIndexed(),
          mastPole.toNonIndexed(),
          boomArm.toNonIndexed(),
          hoodBox.toNonIndexed(),
        ],
        false,
      );
      fullPoleGeo.computeVertexNormals();

      const bulbGeo = new THREE.BoxGeometry(0.46, 0.12, 0.82);
      bulbGeo.translate(0, 7.18, 2.15);

      const beamConeGeo = new THREE.ConeGeometry(2.65, 7.1, 16, 1, true);
      beamConeGeo.translate(0, 3.55, 2.15);

      const lightPoolGeo = new THREE.CircleGeometry(3.2, 20);
      lightPoolGeo.rotateX(-Math.PI * 0.5);
      lightPoolGeo.translate(0, 0.044, 2.15);

      const lampGlowColor = 0xfef08a; // Natural warm sodium streetlight
      const streetLampMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: isNight ? 0xfef08a : 0x475569,
        emissiveIntensity: isNight ? 2.5 : 0.0,
      });
      const beamConeMat = new THREE.MeshBasicMaterial({
        color: lampGlowColor,
        transparent: true,
        opacity: isNight ? 0.08 : 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const lightPoolMat = new THREE.MeshBasicMaterial({
        color: lampGlowColor,
        transparent: true,
        opacity: isNight ? 0.18 : 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const poleInst = new THREE.InstancedMesh(
        fullPoleGeo,
        gantryMat,
        lampCoords.length,
      );
      const bulbInst = new THREE.InstancedMesh(
        bulbGeo,
        streetLampMat,
        lampCoords.length,
      );
      const beamInst = new THREE.InstancedMesh(
        beamConeGeo,
        beamConeMat,
        lampCoords.length,
      );
      const poolInst = new THREE.InstancedMesh(
        lightPoolGeo,
        lightPoolMat,
        lampCoords.length,
      );

      for (let i = 0; i < lampCoords.length; i++) {
        const lp = lampCoords[i];
        dummy.position.set(lp.x, 0, lp.z);
        dummy.rotation.set(0, lp.rotY, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        poleInst.setMatrixAt(i, dummy.matrix);
        bulbInst.setMatrixAt(i, dummy.matrix);
        beamInst.setMatrixAt(i, dummy.matrix);
        poolInst.setMatrixAt(i, dummy.matrix);
      }
      poleInst.instanceMatrix.needsUpdate = true;
      bulbInst.instanceMatrix.needsUpdate = true;
      beamInst.instanceMatrix.needsUpdate = true;
      poolInst.instanceMatrix.needsUpdate = true;
      poleInst.computeBoundingSphere();
      bulbInst.computeBoundingSphere();
      beamInst.computeBoundingSphere();
      poolInst.computeBoundingSphere();
      trackContentGroup.add(poleInst, bulbInst, beamInst, poolInst);
    }

    // 10. Guaranteed Road-Clear Craggy Stratified Horizon Mountain Range (44 Peaks / Mesas)
    const mountainPlacements = computeSafeMountainRing(
      waypoints,
      spec.roadWidth,
      spec.envKind === 'countryside' ? 28 : 44,
      spec.envKind === 'countryside' ? 140 : 56,
    );
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: spec.envKind === 'countryside' ? tropicalMountainTex : rockTex,
      roughness: spec.envKind === 'countryside' ? 0.92 : 0.86,
      metalness: 0.04,
    });
    const horizonGeo =
      spec.envKind === 'desert'
        ? buildTerracedSandstoneMesaGeometry(56, 96)
        : spec.envKind === 'countryside'
          ? tropicalMountainRidgeGeo
          : craggyMountainGeo;
    const mountainInst = new THREE.InstancedMesh(
      horizonGeo,
      mountainMat,
      mountainPlacements.length,
    );
    for (let i = 0; i < mountainPlacements.length; i++) {
      const mp = mountainPlacements[i];
      dummy.position.set(mp.x, -2.5, mp.z);
      dummy.rotation.set(0, mp.rotY, 0);
      dummy.scale.set(mp.scaleX, mp.scaleY, mp.scaleZ);
      dummy.updateMatrix();
      mountainInst.setMatrixAt(i, dummy.matrix);
    }
    mountainInst.instanceMatrix.needsUpdate = true;
    mountainInst.computeBoundingSphere();
    trackContentGroup.add(mountainInst);
  };

  let activeTrackSpec = initialTrack;

  const rebuildAndTrack = (
    spec: TrackSpec,
    waypoints: Waypoint2D[],
    totalLength: number,
  ) => {
    activeTrackSpec = spec;
    rebuildForTrack(spec, waypoints, totalLength);
  };

  rebuildAndTrack(initialTrack, initialWaypoints, initialTotalLength);

  return {
    root,
    showroomPodium,
    sunLight,
    get currentTrackSpec() {
      return activeTrackSpec;
    },
    rebuildForTrack: rebuildAndTrack,
  };
}

/**
 * Generates an outdoor HDR PMREM environment reflection map
 * matching the current circuit's sky dome, sun position, and atmospheric horizon.
 */
export function createOutdoorEnvironment(
  renderer: THREE.WebGLRenderer,
  spec: TrackSpec,
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const skyTex = createSkyDomeTexture(spec);
  const renderTarget = pmremGenerator.fromEquirectangular(skyTex);
  const envMap = renderTarget.texture;
  pmremGenerator.dispose();
  skyTex.dispose();
  return envMap;
}

/**
 * Updates the directional sun and high-resolution shadow frustum
 * to follow the player car continuously along the circuit without clipping.
 */
export function updateSunLightFollow(
  sunLight: THREE.DirectionalLight,
  carX: number,
  carZ: number,
  spec?: TrackSpec,
): void {
  // Offset sun from car based on realistic overhead outdoor angle
  const dist = 58;
  const angle = Math.PI * 0.38;
  const sx = carX + Math.cos(angle) * dist;
  const sz = carZ + Math.sin(angle) * dist;
  sunLight.position.set(sx, 50, sz);
  sunLight.target.position.set(carX, 0, carZ);
  sunLight.target.updateMatrixWorld();
}

