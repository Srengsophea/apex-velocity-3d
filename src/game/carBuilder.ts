import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { CarSpec } from './types';

export interface BuiltCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  splitterMesh?: THREE.Mesh;
  wingBladeMesh?: THREE.Mesh;
  frontLeftWheelPivot: THREE.Group;
  frontRightWheelPivot: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  tailLightMat: THREE.MeshStandardMaterial;
  paintMat: THREE.MeshPhysicalMaterial;
  nitroLeftMesh: THREE.Mesh;
  nitroRightMesh: THREE.Mesh;
  policeStrobeLeft?: THREE.Mesh;
  policeStrobeRight?: THREE.Mesh;
  telegraphRing?: THREE.Mesh;
  totalDamage: number;
  shudderTimer: number;
  shudderSeverity: number;
}

let sharedShadowTexture: THREE.CanvasTexture | null = null;
let sharedCarbonTexture: THREE.CanvasTexture | null = null;
let sharedGrilleTexture: THREE.CanvasTexture | null = null;
let sharedIntercoolerTexture: THREE.CanvasTexture | null = null;
let sharedRotorTexture: THREE.CanvasTexture | null = null;
let sharedTireTreadTexture: THREE.CanvasTexture | null = null;
let sharedTireSidewallTexture: THREE.CanvasTexture | null = null;
let sharedTitaniumTexture: THREE.CanvasTexture | null = null;
let sharedDashTexture: THREE.CanvasTexture | null = null;
let sharedFritTexture: THREE.CanvasTexture | null = null;
const glowTextureCache = new Map<number, THREE.CanvasTexture>();
const plateTextureCache = new Map<string, THREE.CanvasTexture>();

function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedShadowTexture) return sharedShadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.84, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  sharedShadowTexture = new THREE.CanvasTexture(canvas);
  return sharedShadowTexture;
}

function getCarbonFiberTexture(): THREE.CanvasTexture {
  if (sharedCarbonTexture) return sharedCarbonTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, 128, 128);
    // Authentic 2x2 diagonal twill weave pattern with anisotropic light reflection
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 8) {
        const isOffset = ((y / 8) + (x / 8)) % 2 === 0;
        ctx.fillStyle = isOffset ? '#1b2434' : '#0e141f';
        ctx.fillRect(x, y, 8, 8);
        ctx.fillStyle = isOffset ? '#2d3a4f' : '#141c2b';
        ctx.fillRect(x + 1, y + 1, 6, 3);
        ctx.fillStyle = '#05070a';
        ctx.fillRect(x, y + 7, 8, 1);
        ctx.fillRect(x + 7, y, 1, 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  sharedCarbonTexture = tex;
  return tex;
}

function getHoneycombGrilleTexture(): THREE.CanvasTexture {
  if (sharedGrilleTexture) return sharedGrilleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#030508';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;
    for (let y = 4; y < 64; y += 10) {
      for (let x = 4; x < 256; x += 12) {
        const ox = (y / 10) % 2 === 0 ? 0 : 6;
        ctx.strokeRect(x + ox, y, 8, 6);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedGrilleTexture = tex;
  return tex;
}

function getIntercoolerTexture(): THREE.CanvasTexture {
  if (sharedIntercoolerTexture) return sharedIntercoolerTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 128);
    for (let y = 6; y < 122; y += 8) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, y, 240, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, y + 4, 240, 4);
    }
    for (let x = 16; x < 240; x += 10) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.fillRect(x, 6, 2.5, 116);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('APEX RACING SPEC-R', 128, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedIntercoolerTexture = tex;
  return tex;
}

function getTireTreadTexture(): THREE.CanvasTexture {
  if (sharedTireTreadTexture) return sharedTireTreadTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich vulcanized competition rubber base
    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, 512, 512);

    // Natural rubber surface microporosity
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#1a1f2c' : '#080a0f';
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 4 Deep circumferential aquaplaning channels
    for (const gy of [90, 185, 327, 422]) {
      ctx.fillStyle = '#030407';
      ctx.fillRect(0, gy, 512, 24);
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, gy + 3, 512, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, gy + 8, 512, 3);
    }

    // Directional lateral performance tread blocks and siping
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let x = 0; x < 512; x += 28) {
      // Outer shoulder tread blocks
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x + 24, 88);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 12, 502);
      ctx.lineTo(x + 36, 424);
      ctx.stroke();

      // Center chevron directional sipes
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, 190);
      ctx.lineTo(x + 26, 256);
      ctx.lineTo(x + 4, 322);
      ctx.stroke();
      ctx.lineWidth = 7;
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 1);
  sharedTireTreadTexture = tex;
  return tex;
}

function getTireSidewallTexture(): THREE.CanvasTexture {
  if (sharedTireSidewallTexture) return sharedTireSidewallTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, 512, 512);

    // Embossed concentric bead rings
    ctx.translate(256, 256);
    for (let r = 160; r < 246; r += 6) {
      ctx.strokeStyle = r % 18 === 0 ? '#1f2736' : '#0c0f16';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Motorsport tire branding along circumference
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top text: "APEX CORSA P-ZERO"
    ctx.save();
    ctx.rotate(-Math.PI * 0.5);
    ctx.fillText('APEX CORSA P-ZERO', 0, -204);
    ctx.restore();

    // Bottom text: "325 / 30 ZR 20  (104Y) EXTRA LOAD"
    ctx.save();
    ctx.rotate(Math.PI * 0.5);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('325 / 30 ZR 20 · (104Y) XL', 0, -204);
    ctx.restore();

    // Yellow competition balance dot
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(145, 145, 8, 0, Math.PI * 2);
    ctx.fill();

    // Barcode inspection label
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, 192, 36, 14);
    ctx.fillStyle = '#000000';
    for (let bx = -14; bx < 14; bx += 3) {
      ctx.fillRect(bx, 194, 1.8, 10);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedTireSidewallTexture = tex;
  return tex;
}

function getBrakeRotorTexture(): THREE.CanvasTexture {
  if (sharedRotorTexture) return sharedRotorTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // High-carbon cast iron friction ring base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.translate(128, 128);

    // Directional machined circular friction tracks
    for (let r = 44; r < 122; r += 3) {
      ctx.strokeStyle = r % 9 === 0 ? '#cbd5e1' : r % 6 === 0 ? '#475569' : '#334155';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Curved directional gas-release slots (racing rotors)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.2;
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      ctx.beginPath();
      const r1 = 52;
      const r2 = 114;
      const x1 = Math.cos(a) * r1;
      const y1 = Math.sin(a) * r1;
      const x2 = Math.cos(a + 0.35) * r2;
      const y2 = Math.sin(a + 0.35) * r2;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.15) * 85,
        Math.sin(a + 0.15) * 85,
        x2,
        y2,
      );
      ctx.stroke();
    }

    // Cross-drilled ventilation holes arranged in spiral arrays
    ctx.fillStyle = '#05070a';
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      for (const rad of [58, 76, 94, 108]) {
        const hx = Math.cos(ang + rad * 0.02) * rad;
        const hy = Math.sin(ang + rad * 0.02) * rad;
        ctx.beginPath();
        ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // Chamfered metal edge highlight around drill hole
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(hx, hy, 3.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Center CNC Anodized Billet Aluminum Hat
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 8 Floating Hat Torx Fasteners
    ctx.fillStyle = '#cbd5e1';
    for (let b = 0; b < 8; b++) {
      const ba = (b / 8) * Math.PI * 2;
      const bx = Math.cos(ba) * 36;
      const by = Math.sin(ba) * 36;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedRotorTexture = tex;
  return tex;
}

function getTitaniumBurnTexture(): THREE.CanvasTexture {
  if (sharedTitaniumTexture) return sharedTitaniumTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Heat-blued titanium gradient: dark blue -> electric cobalt -> purple -> bronze gold -> brushed titanium
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.28, '#2563eb');
    grad.addColorStop(0.48, '#9333ea');
    grad.addColorStop(0.68, '#f59e0b');
    grad.addColorStop(0.86, '#94a3b8');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 32);

    // Subtle brushed lathe marks
    for (let x = 0; x < 128; x += 4) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x, 0, 1.5, 32);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedTitaniumTexture = tex;
  return tex;
}

function getDashboardDisplayTexture(): THREE.CanvasTexture {
  if (sharedDashTexture) return sharedDashTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 128);

    // Outer bezel border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 120);

    // Arc tachometer bar
    ctx.beginPath();
    ctx.arc(128, 110, 80, Math.PI * 0.9, Math.PI * 2.1);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(128, 110, 80, Math.PI * 0.9, Math.PI * 1.85);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Redline shift zone
    ctx.beginPath();
    ctx.arc(128, 110, 80, Math.PI * 1.85, Math.PI * 2.1);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Digital Gear Indicator
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6', 128, 62);

    // Digital Speed
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('248 KM/H', 128, 98);

    // Delta telemetry
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('LAP 2 · -0.42s', 128, 24);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedDashTexture = tex;
  return tex;
}

function getLicensePlateTexture(spec: CarSpec): THREE.CanvasTexture {
  const cached = plateTextureCache.get(spec.id);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 80);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 74);

    const c = new THREE.Color(spec.accentColor);
    ctx.fillStyle = `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
    ctx.fillRect(10, 10, 16, 60);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = spec.name.split(' ').slice(0, 2).join(' ').toUpperCase();
    ctx.fillText(label, 140, 42);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  plateTextureCache.set(spec.id, tex);
  return tex;
}

function getUnderbodyGlowTexture(hexColor: number): THREE.CanvasTexture {
  const existing = glowTextureCache.get(hexColor);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = new THREE.Color(hexColor);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.58)`);
    grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.24)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  glowTextureCache.set(hexColor, tex);
  return tex;
}

/**
 * Helper to create a precisely aligned structural strut between two 3D points (zero floating ends).
 */
function createStrutBetweenPoints(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const dist = p1.distanceTo(p2);
  const geo = new THREE.BoxGeometry(width, height, dist);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  mesh.lookAt(p2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

interface BodyStation {
  z: number;
  bottomY: number;
  lowerW: number;
  midW: number;
  midY: number;
  shoulderW: number;
  shoulderY: number;
  crownW: number;
  crownY: number;
  centerY: number;
}

/**
 * Builds a true 3D multi-station lofted automotive body shell.
 * At the wheel stations (z = ±1.32), the lower hull tucks INWARD (lowerW = 0.72, midW = 0.75)
 * to form real recessed wheel-well cavities behind the tires, while the upper fender shoulder
 * arches OVER the top of the tires (shoulderY = 0.74, shoulderW = 0.98) so the wheels are 100% unobstructed!
 */
function buildSculptedCarBodyGeometry(
  style: CarSpec['bodyStyle'],
): THREE.BufferGeometry {
  const isMuscle = style === 'muscle';
  const isFormula = style === 'formula';
  const isTuner = style === 'tuner';
  const isHyper = style === 'hypercar';

  if (isFormula) {
    const fStations: BodyStation[] = [
      { z: -2.10, bottomY: 0.16, lowerW: 0.36, midW: 0.44, midY: 0.28, shoulderW: 0.38, shoulderY: 0.44, crownW: 0.22, crownY: 0.50, centerY: 0.52 },
      { z: -1.45, bottomY: 0.15, lowerW: 0.46, midW: 0.54, midY: 0.30, shoulderW: 0.48, shoulderY: 0.48, crownW: 0.28, crownY: 0.54, centerY: 0.56 },
      { z: -0.65, bottomY: 0.15, lowerW: 0.84, midW: 0.92, midY: 0.32, shoulderW: 0.82, shoulderY: 0.48, crownW: 0.42, crownY: 0.53, centerY: 0.54 },
      { z: 0.25,  bottomY: 0.15, lowerW: 0.82, midW: 0.90, midY: 0.32, shoulderW: 0.78, shoulderY: 0.48, crownW: 0.40, crownY: 0.52, centerY: 0.52 },
      { z: 0.95,  bottomY: 0.15, lowerW: 0.38, midW: 0.44, midY: 0.29, shoulderW: 0.40, shoulderY: 0.45, crownW: 0.26, crownY: 0.48, centerY: 0.48 },
      { z: 1.65,  bottomY: 0.15, lowerW: 0.28, midW: 0.32, midY: 0.25, shoulderW: 0.28, shoulderY: 0.36, crownW: 0.18, crownY: 0.39, centerY: 0.40 },
      { z: 2.24,  bottomY: 0.14, lowerW: 0.18, midW: 0.22, midY: 0.20, shoulderW: 0.18, shoulderY: 0.26, crownW: 0.10, crownY: 0.28, centerY: 0.28 },
    ];
    return loftBodyStations(fStations, 38);
  }

  const wScale = isTuner ? 1.03 : isHyper ? 1.02 : 1.0;
  const hScale = isMuscle ? 1.05 : isHyper ? 0.97 : 1.0;

  const stations: BodyStation[] = [
    // Rear tail panel
    { z: -2.11, bottomY: 0.24, lowerW: 0.88 * wScale, midW: 0.94 * wScale, midY: 0.42 * hScale, shoulderW: 0.90 * wScale, shoulderY: 0.64 * hScale, crownW: 0.52, crownY: 0.67 * hScale, centerY: 0.66 * hScale },
    // Rear bumper quarter behind rear wheel
    { z: -1.78, bottomY: 0.22, lowerW: 0.92 * wScale, midW: 0.98 * wScale, midY: 0.44 * hScale, shoulderW: 0.96 * wScale, shoulderY: 0.69 * hScale, crownW: 0.56, crownY: 0.70 * hScale, centerY: 0.67 * hScale },
    // Rear wheel well rear edge (lower hull tucks inward to 0.72 so wheel is 100% clear; upper shoulder arches at y=0.73)
    { z: -1.64, bottomY: 0.24, lowerW: 0.72, midW: 0.75, midY: 0.52, shoulderW: 0.98 * wScale, shoulderY: 0.73 * hScale, crownW: 0.56, crownY: 0.72 * hScale, centerY: 0.68 * hScale },
    // Rear wheel arch top center (z = -1.32: lower hull tucked at 0.70 inside wheel, shoulder arches over tire at y=0.76!)
    { z: -1.32, bottomY: 0.26, lowerW: 0.70, midW: 0.74, midY: 0.56, shoulderW: 1.01 * wScale, shoulderY: 0.76 * hScale, crownW: 0.58, crownY: 0.74 * hScale, centerY: 0.69 * hScale },
    // Rear wheel well front edge
    { z: -0.96, bottomY: 0.22, lowerW: 0.72, midW: 0.75, midY: 0.50, shoulderW: 0.97 * wScale, shoulderY: 0.72 * hScale, crownW: 0.58, crownY: 0.71 * hScale, centerY: 0.68 * hScale },
    // Rear door / quarter intake flare
    { z: -0.78, bottomY: 0.19, lowerW: 0.96 * wScale, midW: 1.02 * wScale, midY: 0.44 * hScale, shoulderW: 0.94 * wScale, shoulderY: 0.69 * hScale, crownW: 0.58, crownY: 0.69 * hScale, centerY: 0.67 * hScale },
    // Sculpted Coke-bottle door waist
    { z: -0.15, bottomY: 0.18, lowerW: 0.94 * wScale, midW: 0.98 * wScale, midY: 0.42 * hScale, shoulderW: 0.90 * wScale, shoulderY: 0.66 * hScale, crownW: 0.56, crownY: 0.66 * hScale, centerY: 0.64 * hScale },
    // Front door / A-pillar cowl base
    { z: 0.65,  bottomY: 0.18, lowerW: 0.95 * wScale, midW: 1.00 * wScale, midY: 0.43 * hScale, shoulderW: 0.92 * wScale, shoulderY: 0.67 * hScale, crownW: 0.54, crownY: 0.65 * hScale, centerY: 0.61 * hScale },
    // Front wheel well rear edge (lower hull tucks inward to 0.70 behind front wheel)
    { z: 0.94,  bottomY: 0.22, lowerW: 0.70, midW: 0.74, midY: 0.50, shoulderW: 0.96 * wScale, shoulderY: 0.71 * hScale, crownW: 0.52, crownY: 0.65 * hScale, centerY: 0.58 * hScale },
    // Front wheel arch top center (z = +1.32: lower hull tucked at 0.68, shoulder arches over front tire at y=0.74!)
    { z: 1.32,  bottomY: 0.25, lowerW: 0.68, midW: 0.72, midY: 0.55, shoulderW: 0.99 * wScale, shoulderY: 0.74 * hScale, crownW: 0.50, crownY: 0.63 * hScale, centerY: 0.54 * hScale },
    // Front wheel well front edge
    { z: 1.68,  bottomY: 0.21, lowerW: 0.72, midW: 0.75, midY: 0.46, shoulderW: 0.94 * wScale, shoulderY: 0.64 * hScale, crownW: 0.48, crownY: 0.56 * hScale, centerY: 0.49 * hScale },
    // Front bumper & headlight slope
    { z: 1.84,  bottomY: 0.17, lowerW: 0.92 * wScale, midW: 0.96 * wScale, midY: 0.36 * hScale, shoulderW: 0.88 * wScale, shoulderY: 0.52 * hScale, crownW: 0.44, crownY: 0.47 * hScale, centerY: 0.42 * hScale },
    // Front nose & upper grille edge
    { z: 2.12,  bottomY: 0.16, lowerW: 0.86 * wScale, midW: 0.90 * wScale, midY: 0.28 * hScale, shoulderW: 0.80 * wScale, shoulderY: 0.39 * hScale, crownW: 0.38, crownY: 0.36 * hScale, centerY: 0.34 * hScale },
    // Front splitter leading edge
    { z: 2.21,  bottomY: 0.15, lowerW: 0.80 * wScale, midW: 0.83 * wScale, midY: 0.24 * hScale, shoulderW: 0.72 * wScale, shoulderY: 0.31 * hScale, crownW: 0.34, crownY: 0.30 * hScale, centerY: 0.29 * hScale },
  ];

  return loftBodyStations(stations, 42);
}

function loftBodyStations(
  stations: BodyStation[],
  creaseAngleDeg: number,
): THREE.BufferGeometry {
  const ptsPerRing = 11;
  const numStations = stations.length;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < numStations; s++) {
    const st = stations[s];
    const ring: Array<[number, number, number]> = [
      [0, st.bottomY, st.z],
      [-st.lowerW, st.bottomY + 0.02, st.z],
      [-st.midW, st.midY, st.z],
      [-st.shoulderW, st.shoulderY, st.z],
      [-st.crownW, st.crownY, st.z],
      [0, st.centerY, st.z],
      [st.crownW, st.crownY, st.z],
      [st.shoulderW, st.shoulderY, st.z],
      [st.midW, st.midY, st.z],
      [st.lowerW, st.bottomY + 0.02, st.z],
      [0, st.bottomY, st.z],
    ];
    for (const [x, y, z] of ring) {
      positions.push(x, y, z);
    }
  }

  for (let s = 0; s < numStations - 1; s++) {
    const rowA = s * ptsPerRing;
    const rowB = (s + 1) * ptsPerRing;
    for (let p = 0; p < ptsPerRing - 1; p++) {
      const a = rowA + p;
      const b = rowA + p + 1;
      const c = rowB + p;
      const d = rowB + p + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const rearCenterIdx = positions.length / 3;
  const st0 = stations[0];
  positions.push(0, (st0.bottomY + st0.centerY) * 0.5, st0.z);
  for (let p = 0; p < ptsPerRing - 1; p++) {
    indices.push(rearCenterIdx, p + 1, p);
  }

  const frontCenterIdx = positions.length / 3;
  const stLast = stations[numStations - 1];
  const lastRow = (numStations - 1) * ptsPerRing;
  positions.push(0, (stLast.bottomY + stLast.centerY) * 0.5, stLast.z);
  for (let p = 0; p < ptsPerRing - 1; p++) {
    indices.push(frontCenterIdx, lastRow + p, lastRow + p + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return BufferGeometryUtils.toCreasedNormals(
    geo,
    THREE.MathUtils.degToRad(creaseAngleDeg),
  );
}

/**
 * Builds a 3D contoured wrap-around teardrop glass canopy that tapers in width
 * from beltline to roof and curves cleanly along the windshield and fastback deck.
 */
function buildContouredCanopyGeometry(
  style: CarSpec['bodyStyle'],
): THREE.BufferGeometry {
  const isMuscle = style === 'muscle';
  const isFormula = style === 'formula';

  const stations = isFormula
    ? [
        { z: -0.92, baseW: 0.34, roofW: 0.16, baseY: 0.50, roofY: 0.62 },
        { z: -0.45, baseW: 0.42, roofW: 0.24, baseY: 0.52, roofY: 0.84 },
        { z: 0.05,  baseW: 0.40, roofW: 0.22, baseY: 0.52, roofY: 0.82 },
        { z: 0.48,  baseW: 0.26, roofW: 0.12, baseY: 0.49, roofY: 0.54 },
      ]
    : isMuscle
      ? [
          { z: -1.42, baseW: 0.64, roofW: 0.46, baseY: 0.67, roofY: 0.71 },
          { z: -0.82, baseW: 0.70, roofW: 0.52, baseY: 0.69, roofY: 1.06 },
          { z: 0.16,  baseW: 0.70, roofW: 0.50, baseY: 0.67, roofY: 1.07 },
          { z: 0.82,  baseW: 0.60, roofW: 0.42, baseY: 0.60, roofY: 0.64 },
        ]
      : [
          { z: -1.46, baseW: 0.60, roofW: 0.42, baseY: 0.66, roofY: 0.70 },
          { z: -0.68, baseW: 0.68, roofW: 0.48, baseY: 0.66, roofY: 1.02 },
          { z: 0.18,  baseW: 0.66, roofW: 0.46, baseY: 0.64, roofY: 1.03 },
          { z: 0.84,  baseW: 0.56, roofW: 0.38, baseY: 0.58, roofY: 0.62 },
        ];

  const ptsPerRing = 7;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < stations.length; s++) {
    const st = stations[s];
    const midY = (st.baseY + st.roofY) * 0.55;
    const midW = (st.baseW + st.roofW) * 0.54;
    const ring: Array<[number, number, number]> = [
      [-st.baseW, st.baseY, st.z],
      [-midW, midY, st.z],
      [-st.roofW, st.roofY, st.z],
      [0, st.roofY + 0.025, st.z],
      [st.roofW, st.roofY, st.z],
      [midW, midY, st.z],
      [st.baseW, st.baseY, st.z],
    ];
    for (const [x, y, z] of ring) {
      positions.push(x, y, z);
    }
  }

  for (let s = 0; s < stations.length - 1; s++) {
    const rA = s * ptsPerRing;
    const rB = (s + 1) * ptsPerRing;
    for (let p = 0; p < ptsPerRing - 1; p++) {
      indices.push(rA + p, rB + p, rA + p + 1, rA + p + 1, rB + p, rB + p + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return BufferGeometryUtils.toCreasedNormals(geo, THREE.MathUtils.degToRad(48));
}

export function buildRealisticCar(
  spec: CarSpec,
  isRival = false,
): BuiltCarRig {
  const root = new THREE.Group();
  root.name = `Car_${spec.id}`;

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  let wingBladeMesh: THREE.Mesh | undefined;

  const carbonTex = getCarbonFiberTexture();
  const grilleTex = getHoneycombGrilleTexture();
  const intercoolerTex = getIntercoolerTexture();
  const rotorTex = getBrakeRotorTexture();
  const treadTex = getTireTreadTexture();
  const sidewallTex = getTireSidewallTexture();
  const titaniumTex = getTitaniumBurnTexture();
  const dashTex = getDashboardDisplayTexture();

  // Multi-Layer Deep Metallic Automotive Clearcoat Paint with Pearl Iridescence
  const basePaintColor = new THREE.Color(spec.primaryColor).multiplyScalar(0.92);
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: basePaintColor,
    metalness: 0.72,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    iridescence: 0.35,
    iridescenceIOR: 1.34,
    sheen: 0.25,
    sheenRoughness: 0.2,
    sheenColor: basePaintColor.clone().offsetHSL(0.04, 0.1, 0.08),
    specularIntensity: 1.0,
    envMapIntensity: 1.45,
    reflectivity: 0.98,
  });

  const secondaryMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: carbonTex,
    metalness: 0.42,
    roughness: 0.22,
    clearcoat: 0.92,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.25,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x080c14,
    metalness: 0.55,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });

  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grilleTex,
    metalness: 0.58,
    roughness: 0.42,
  });

  const intercoolerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: intercoolerTex,
    metalness: 0.78,
    roughness: 0.28,
  });

  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050912,
    metalness: 0.15,
    roughness: 0.03,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    transmission: 0.42,
    opacity: 0.88,
    transparent: true,
    envMapIntensity: 1.5,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: spec.rimColor,
    metalness: 0.94,
    roughness: 0.12,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: titaniumTex,
    metalness: 0.92,
    roughness: 0.20,
  });

  const brakeDiscMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: rotorTex,
    metalness: 0.88,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    emissive: spec.accentColor,
    emissiveIntensity: 0.38,
    roughness: 0.25,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: treadTex,
    metalness: 0.06,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });

  const tireSidewallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sidewallTex,
    metalness: 0.08,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf0f9ff,
    emissiveIntensity: 3.8,
    roughness: 0.06,
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff0a1e,
    emissive: 0xef4444,
    emissiveIntensity: 3.0,
    roughness: 0.10,
  });

  const amberSignalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.6,
    roughness: 0.14,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    emissive: spec.accentColor,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  const harnessRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.55,
  });

  const dashDisplayMat = new THREE.MeshBasicMaterial({
    map: dashTex,
  });

  // 1. Soft Contact Shadow + Underbody Ground-Effect Glow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.95, 5.45),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.88,
    }),
  );
  shadowPlane.rotation.x = -Math.PI * 0.5;
  shadowPlane.position.y = 0.018;
  root.add(shadowPlane);

  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 4.4),
    new THREE.MeshBasicMaterial({
      map: getUnderbodyGlowTexture(spec.accentColor),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glowPlane.rotation.x = -Math.PI * 0.5;
  glowPlane.position.y = 0.024;
  root.add(glowPlane);

  const isFormula = spec.bodyStyle === 'formula';

  // 2. True 3D Sculpted Multi-Station Lofted Car Body
  const bodyGeo = buildSculptedCarBodyGeometry(spec.bodyStyle);
  bodyGeo.userData.origPositions = new Float32Array(
    bodyGeo.attributes.position.array,
  );
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // 3. Hollow 3D Semicircular Wheel-Arch Overfender Lips + Fender Roof Barrels + Inner Wheelhouse Liners
  // Using TorusGeometry(0..Math.PI) + rotateY(Math.PI * 0.5) guarantees y >= 0 (arches OVER top of wheel!)
  const archTorusGeo = new THREE.TorusGeometry(0.388, 0.048, 12, 28, Math.PI);
  archTorusGeo.rotateY(Math.PI * 0.5);

  const archRoofBarrelGeo = new THREE.TorusGeometry(0.372, 0.055, 12, 28, Math.PI);
  archRoofBarrelGeo.scale(1, 1, 2.6);
  archRoofBarrelGeo.rotateY(Math.PI * 0.5);

  const innerWellBackGeo = new THREE.CircleGeometry(0.39, 24, 0, Math.PI);
  innerWellBackGeo.rotateY(Math.PI * 0.5);

  const wheelWellMat = new THREE.MeshBasicMaterial({
    color: 0x05070c,
    side: THREE.DoubleSide,
  });

  if (!isFormula) {
    const archCoords: Array<[number, number, number]> = [
      [-0.95, 0.35, 1.32],
      [0.95, 0.35, 1.32],
      [-0.97, 0.36, -1.32],
      [0.97, 0.36, -1.32],
    ];
    for (const [ax, ay, az] of archCoords) {
      const signX = Math.sign(ax);
      const archFlare = new THREE.Mesh(archTorusGeo, paintMat);
      archFlare.position.set(ax, ay, az);
      archFlare.castShadow = true;
      archFlare.receiveShadow = true;

      const archRoof = new THREE.Mesh(archRoofBarrelGeo, paintMat);
      archRoof.position.set(ax - signX * 0.11, ay, az);
      archRoof.castShadow = true;
      archRoof.receiveShadow = true;

      const innerLinerRoof = new THREE.Mesh(archRoofBarrelGeo, wheelWellMat);
      innerLinerRoof.scale.set(0.96, 0.96, 0.96);
      innerLinerRoof.position.set(ax - signX * 0.11, ay - 0.01, az);

      const innerBackPlate = new THREE.Mesh(innerWellBackGeo, wheelWellMat);
      innerBackPlate.position.set(ax - signX * 0.21, ay, az);

      bodyGroup.add(archFlare, archRoof, innerLinerRoof, innerBackPlate);
    }

    // Side Air-Intake Coves & Sculpted Carbon Door Blades
    for (const side of [-1, 1]) {
      const intakeScoop = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.25, 0.34),
        secondaryMat,
      );
      intakeScoop.position.set(side * 0.99, 0.43, -0.44);
      intakeScoop.rotation.y = side * 0.24;

      const intakeGrille = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.21, 0.14),
        grilleMat,
      );
      intakeGrille.position.set(side * 0.95, 0.43, -0.32);

      const doorHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.024, 0.15),
        chromeMat,
      );
      doorHandle.position.set(side * 0.96, 0.61, 0.02);

      bodyGroup.add(intakeScoop, intakeGrille, doorHandle);
    }
  } else {
    for (const side of [-1, 1]) {
      const fIntake = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.24, 0.12),
        grilleMat,
      );
      fIntake.position.set(side * 0.64, 0.34, 0.28);
      bodyGroup.add(fIntake);
    }
  }

  // 4. Sculpted Hood Extractor Vents (flush with hood slope)
  if (!isFormula && spec.bodyStyle !== 'muscle') {
    const centerHoodVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.018, 0.30),
      grilleMat,
    );
    centerHoodVent.position.set(0, 0.515, 1.48);
    centerHoodVent.rotation.x = 0.24;
    bodyGroup.add(centerHoodVent);

    for (const side of [-1, 1]) {
      const vent = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.34, 0.56, 1.44),
        new THREE.Vector3(side * 0.40, 0.62, 1.04),
        0.18,
        0.018,
        secondaryMat,
      );
      bodyGroup.add(vent);
    }
  }

  // 5. Contoured Wrap-Around Teardrop Glass Canopy + Point-to-Point Pillars + Interior Cockpit
  const canopyGeo = buildContouredCanopyGeometry(spec.bodyStyle);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyGlassMat);
  canopyMesh.castShadow = true;
  bodyGroup.add(canopyMesh);

  // Visible Interior Racing Bucket Seats & Steering Wheel with Takata 4-Point Racing Harnesses
  const seatBackGeo = new THREE.BoxGeometry(0.32, 0.38, 0.12);
  const seatCushionGeo = new THREE.BoxGeometry(0.32, 0.08, 0.34);
  const harnessStrapGeo = new THREE.BoxGeometry(0.065, 0.36, 0.018);
  const harnessBuckleGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12);
  harnessBuckleGeo.rotateX(Math.PI * 0.5);

  for (const sx of isFormula ? [0] : [-0.28, 0.28]) {
    const seat = new THREE.Mesh(seatBackGeo, darkTrimMat);
    seat.position.set(sx, 0.76, -0.22);
    seat.rotation.x = -0.18;

    const cushion = new THREE.Mesh(seatCushionGeo, darkTrimMat);
    cushion.position.set(sx, 0.52, -0.08);

    const headrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.09),
      caliperMat,
    );
    headrest.position.set(sx, 0.94, -0.26);

    // Takata Red Racing 4-Point Shoulder Harness Straps
    const leftStrap = new THREE.Mesh(harnessStrapGeo, harnessRedMat);
    leftStrap.position.set(sx - 0.075, 0.77, -0.16);
    leftStrap.rotation.x = -0.18;

    const rightStrap = new THREE.Mesh(harnessStrapGeo, harnessRedMat);
    rightStrap.position.set(sx + 0.075, 0.77, -0.16);
    rightStrap.rotation.x = -0.18;

    const buckle = new THREE.Mesh(harnessBuckleGeo, chromeMat);
    buckle.position.set(sx, 0.59, -0.12);

    bodyGroup.add(seat, cushion, headrest, leftStrap, rightStrap, buckle);
  }

  // Tubular Roll Cage Crossbar behind cockpit
  if (!isFormula) {
    const rollCageBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.98, 12),
      secondaryMat,
    );
    rollCageBar.rotation.z = Math.PI * 0.5;
    rollCageBar.position.set(0, 0.88, -0.42);
    bodyGroup.add(rollCageBar);
  }

  // Sculpted Dashboard Binnacle with Illuminated LCD Telemetry Cluster Screen
  const dashBinnacle = new THREE.Mesh(
    new THREE.BoxGeometry(isFormula ? 0.38 : 1.02, 0.14, 0.32),
    darkTrimMat,
  );
  dashBinnacle.position.set(0, 0.65, 0.42);

  const dashScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.12),
    dashDisplayMat,
  );
  dashScreen.position.set(isFormula ? 0 : -0.28, 0.72, 0.38);
  dashScreen.rotation.x = -0.28;

  const steerWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.018, 8, 18),
    caliperMat,
  );
  steerWheel.position.set(isFormula ? 0 : -0.28, 0.73, 0.24);
  steerWheel.rotation.x = -0.35;

  // Steering Column Paddle Shifters (Left downshift, Right upshift)
  for (const pSide of [-1, 1]) {
    const paddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.055, 0.014),
      chromeMat,
    );
    paddle.position.set((isFormula ? 0 : -0.28) + pSide * 0.08, 0.74, 0.27);
    paddle.rotation.x = -0.35;
    bodyGroup.add(paddle);
  }

  bodyGroup.add(dashBinnacle, dashScreen, steerWheel);

  if (!isFormula) {
    // Painted Roof Side Rails + Carbon Center Roof Panel
    for (const side of [-1, 1]) {
      const roofRail = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.45, 1.025, 0.18),
        new THREE.Vector3(side * 0.47, 1.015, -0.68),
        0.08,
        0.04,
        paintMat,
      );
      bodyGroup.add(roofRail);
    }
    const roofCenterCarbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.032, 0.84),
      secondaryMat,
    );
    roofCenterCarbon.position.set(0, 1.03, -0.25);
    bodyGroup.add(roofCenterCarbon);

    // Point-to-Point Sculpted A-Pillars (connect exact cowl corner to roof corner with zero gap!)
    for (const side of [-1, 1]) {
      const aPillar = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.56, 0.60, 0.82),
        new THREE.Vector3(side * 0.45, 1.02, 0.18),
        0.065,
        0.048,
        paintMat,
      );
      bodyGroup.add(aPillar);
    }

    // Point-to-Point Fastback C-Pillar Flying Buttresses
    for (const side of [-1, 1]) {
      const buttress = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.47, 1.01, -0.66),
        new THREE.Vector3(side * 0.68, 0.71, -1.62),
        0.12,
        0.055,
        paintMat,
      );
      bodyGroup.add(buttress);
    }

    // Rear Engine Deck Carbon Louvers (5 slats) + V10 Engine Plenum Accent
    const enginePlenum = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.08, 0.68),
      caliperMat,
    );
    enginePlenum.position.set(0, 0.70, -1.26);
    bodyGroup.add(enginePlenum);

    for (let s = 0; s < 5; s++) {
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(0.74 - s * 0.04, 0.026, 0.12),
        secondaryMat,
      );
      louver.position.set(0, 0.87 - s * 0.04, -0.86 - s * 0.19);
      louver.rotation.x = -0.25;
      bodyGroup.add(louver);
    }

    // Aerodynamic Wing Mirrors mounted cleanly to the door shoulder
    const mirrorCapGeo = new THREE.BoxGeometry(0.20, 0.065, 0.13);
    for (const side of [-1, 1]) {
      const stem = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.78, 0.65, 0.46),
        new THREE.Vector3(side * 0.96, 0.72, 0.44),
        0.04,
        0.028,
        secondaryMat,
      );
      const cap = new THREE.Mesh(mirrorCapGeo, paintMat);
      cap.position.set(side * 0.98, 0.73, 0.44);
      cap.rotation.y = side * 0.22;
      const signalStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.016, 0.02),
        amberSignalMat,
      );
      signalStrip.position.set(side * 0.99, 0.73, 0.505);
      signalStrip.rotation.y = side * 0.22;
      bodyGroup.add(stem, cap, signalStrip);
    }
  } else {
    const airbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.65),
      paintMat,
    );
    airbox.position.set(0, 0.82, -0.62);
    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.032, 10, 24, Math.PI),
      secondaryMat,
    );
    haloRing.rotation.x = Math.PI * 0.45;
    haloRing.position.set(0, 0.78, 0.08);
    bodyGroup.add(airbox, haloRing);
  }

  // 6. Carbon Rocker Side Skirts + Accent Aero Blades (spanning strictly between front and rear wheel wells z = -0.84..+0.84!)
  const skirtGeo = new THREE.BoxGeometry(2.02, 0.068, 1.66);
  const sideSkirts = new THREE.Mesh(skirtGeo, secondaryMat);
  sideSkirts.position.set(0, 0.165, -0.02);
  bodyGroup.add(sideSkirts);

  const sideBladeGeo = new THREE.BoxGeometry(2.06, 0.024, 1.62);
  const sideBlade = new THREE.Mesh(sideBladeGeo, accentMat);
  sideBlade.position.set(0, 0.135, -0.02);
  bodyGroup.add(sideBlade);

  if (!isFormula) {
    const skirtFinGeo = new THREE.BoxGeometry(0.03, 0.18, 0.24);
    for (const side of [-1, 1]) {
      const sFin = new THREE.Mesh(skirtFinGeo, secondaryMat);
      sFin.position.set(side * 1.02, 0.22, -0.76);
      bodyGroup.add(sFin);
    }
  }

  // 7. Front Fascia: Carbon Splitter, Twin Canards, Front-Mount Intercooler (FMIC) & Corner Air Curtains
  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.05, 0.48),
    secondaryMat,
  );
  splitter.position.set(0, 0.135, 2.04);
  splitter.userData.origPos = splitter.position.clone();
  splitter.userData.origRot = splitter.rotation.clone();
  bodyGroup.add(splitter);

  const splitterLip = new THREE.Mesh(
    new THREE.BoxGeometry(2.06, 0.022, 0.50),
    accentMat,
  );
  splitterLip.position.set(0, 0.114, 2.06);
  bodyGroup.add(splitterLip);

  for (const side of [-1, 1]) {
    const tieRod = createStrutBetweenPoints(
      new THREE.Vector3(side * 0.42, 0.14, 2.25),
      new THREE.Vector3(side * 0.42, 0.27, 2.18),
      0.014,
      0.014,
      chromeMat,
    );
    bodyGroup.add(tieRod);

    const canard = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.022, 0.28),
      secondaryMat,
    );
    canard.position.set(side * 0.92, 0.24, 2.04);
    canard.rotation.x = 0.22;
    canard.rotation.y = side * 0.32;
    bodyGroup.add(canard);
  }

  // Wide Lower Radiator Grille Recess + Visible Aluminum Front-Mount Intercooler (FMIC)
  const frontGrilleRecess = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.19, 0.10),
    grilleMat,
  );
  frontGrilleRecess.position.set(0, 0.23, 2.18);
  bodyGroup.add(frontGrilleRecess);

  const fmicCore = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.15, 0.06),
    intercoolerMat,
  );
  fmicCore.position.set(0, 0.23, 2.215);
  bodyGroup.add(fmicCore);

  // Corner Brake-Cooling Air Intakes with Accent Surrounds
  for (const side of [-1, 1]) {
    const sideVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.08),
      grilleMat,
    );
    sideVent.position.set(side * 0.68, 0.25, 2.16);
    sideVent.rotation.y = -side * 0.24;

    const sideVentTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.022, 0.09),
      accentMat,
    );
    sideVentTrim.position.set(side * 0.68, 0.32, 2.17);
    sideVentTrim.rotation.y = -side * 0.24;
    bodyGroup.add(sideVent, sideVentTrim);
  }

  // Front Hood Manufacturer Emblem Badge (flush on nose)
  const noseEmblem = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.012, 0.09),
    chromeMat,
  );
  noseEmblem.position.set(0, 0.355, 2.08);
  noseEmblem.rotation.x = 0.32;
  bodyGroup.add(noseEmblem);

  // 8. FLUSH SWEPT-BACK ANGULAR LED MATRIX HEADLIGHTS & 3D JEWEL PROJECTOR OPTICS
  // Seated directly along the front fender nose slope from (x = ±0.52, y = 0.38, z = 2.08) to (x = ±0.78, y = 0.50, z = 1.82)
  if (!isFormula) {
    const projectorGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const haloDrlGeo = new THREE.TorusGeometry(0.046, 0.010, 10, 20);

    for (const side of [-1, 1]) {
      const pInner = new THREE.Vector3(side * 0.48, 0.37, 2.08);
      const pOuter = new THREE.Vector3(side * 0.78, 0.50, 1.82);

      const hlBacking = createStrutBetweenPoints(
        pInner,
        pOuter,
        0.16,
        0.026,
        darkTrimMat,
      );
      const hlMainLed = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.50, 0.382, 2.08),
        new THREE.Vector3(side * 0.76, 0.508, 1.84),
        0.09,
        0.024,
        headlightMat,
      );
      const hlAccentBrow = createStrutBetweenPoints(
        new THREE.Vector3(side * 0.52, 0.392, 2.04),
        new THREE.Vector3(side * 0.80, 0.522, 1.78),
        0.035,
        0.022,
        accentMat,
      );

      // 3D Jewel Projector Lenses + Halo DRL Rings
      for (const pOffset of [0, 0.12]) {
        const projMesh = new THREE.Mesh(projectorGeo, headlightMat);
        projMesh.position.set(side * (0.54 + pOffset), 0.41 + pOffset * 0.4, 2.03 - pOffset * 0.8);

        const haloMesh = new THREE.Mesh(haloDrlGeo, headlightMat);
        haloMesh.position.set(side * (0.54 + pOffset), 0.41 + pOffset * 0.4, 2.04 - pOffset * 0.8);
        haloMesh.rotation.y = -side * 0.32;

        bodyGroup.add(projMesh, haloMesh);
      }

      bodyGroup.add(hlBacking, hlMainLed, hlAccentBrow);
    }
  }

  // 9. ULTRA-DETAILED REAR FASCIA (Proud of hull rear z = -2.11!)
  const rearFasciaRecess = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, 0.25, 0.08),
    grilleMat,
  );
  rearFasciaRecess.position.set(0, 0.53, -2.13);
  bodyGroup.add(rearFasciaRecess);

  const rearUpperTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.90, 0.036, 0.1),
    secondaryMat,
  );
  rearUpperTrim.position.set(0, 0.66, -2.13);
  bodyGroup.add(rearUpperTrim);

  // Multi-Optic 3D LED Taillights: Dual Outer Twin-Ring Halo Clusters + Full-Width Laser Bar
  const tlLaserBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.84, 0.038, 0.05),
    tailLightMat,
  );
  tlLaserBar.position.set(0, 0.61, -2.18);
  bodyGroup.add(tlLaserBar);

  // High-Mount Center Brake Light (CHMSL)
  if (!isFormula) {
    const chmsl = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.024, 0.04),
      tailLightMat,
    );
    chmsl.position.set(0, 1.015, -0.66);
    bodyGroup.add(chmsl);
  }

  const haloRingGeo = new THREE.TorusGeometry(0.068, 0.022, 12, 24);
  const innerCoreGeo = new THREE.CircleGeometry(0.038, 16);
  for (const side of [-1, 1]) {
    for (const offset of [0.75, 0.54]) {
      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.082, 0.05, 20),
        darkTrimMat,
      );
      bezel.rotation.x = Math.PI * 0.5;
      bezel.position.set(side * offset, 0.52, -2.16);

      const ring = new THREE.Mesh(haloRingGeo, tailLightMat);
      ring.rotation.y = Math.PI;
      ring.position.set(side * offset, 0.52, -2.19);

      const core = new THREE.Mesh(innerCoreGeo, amberSignalMat);
      core.rotation.y = Math.PI;
      core.position.set(side * offset, 0.52, -2.192);

      bodyGroup.add(bezel, ring, core);
    }

    const turnTick = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.024, 0.04),
      amberSignalMat,
    );
    turnTick.position.set(side * 0.65, 0.42, -2.18);
    const revTick = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.022, 0.04),
      headlightMat,
    );
    revTick.position.set(side * 0.36, 0.42, -2.18);
    bodyGroup.add(turnTick, revTick);
  }

  // Motorsport Rear License / Model Plate
  const plateBacking = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.16, 0.05),
    darkTrimMat,
  );
  plateBacking.position.set(0, 0.47, -2.16);
  const licensePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.145),
    new THREE.MeshBasicMaterial({
      map: getLicensePlateTexture(spec),
    }),
  );
  licensePlate.rotation.y = Math.PI;
  licensePlate.position.set(0, 0.47, -2.192);
  bodyGroup.add(plateBacking, licensePlate);

  // Sculpted Carbon Venturi Rear Diffuser + 6 Vertical Strakes + Central FIA Rain Light
  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(1.90, 0.22, 0.36),
    secondaryMat,
  );
  rearDiffuser.position.set(0, 0.22, -2.01);
  bodyGroup.add(rearDiffuser);

  const diffuserAccentLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 0.024, 0.38),
    accentMat,
  );
  diffuserAccentLip.position.set(0, 0.34, -2.02);
  bodyGroup.add(diffuserAccentLip);

  const finGeo = new THREE.BoxGeometry(0.032, 0.23, 0.42);
  for (const fx of [-0.76, -0.50, -0.22, 0.22, 0.50, 0.76]) {
    const fin = new THREE.Mesh(finGeo, secondaryMat);
    fin.position.set(fx, 0.22, -2.03);
    bodyGroup.add(fin);
  }

  const fiaRainLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.11, 0.05),
    tailLightMat,
  );
  fiaRainLight.position.set(0, 0.22, -2.20);
  bodyGroup.add(fiaRainLight);

  // Slash-Cut Burnt Titanium Quad Exhaust Tailpipes with Dark Soot Recessed Inner Bores
  const exhaustOuterGeo = new THREE.CylinderGeometry(0.070, 0.068, 0.28, 24);
  exhaustOuterGeo.rotateX(Math.PI * 0.48); // Slanted aerodynamic slash-cut
  const exhaustBoreGeo = new THREE.CylinderGeometry(0.054, 0.052, 0.30, 20);
  exhaustBoreGeo.rotateX(Math.PI * 0.48);
  const boreBlackMat = new THREE.MeshBasicMaterial({ color: 0x030508 });

  for (const exX of [-0.66, -0.49, 0.49, 0.66]) {
    const exPipe = new THREE.Mesh(exhaustOuterGeo, titaniumMat);
    exPipe.position.set(exX, 0.23, -2.13);
    const exBore = new THREE.Mesh(exhaustBoreGeo, boreBlackMat);
    exBore.position.set(exX, 0.23, -2.135);
    bodyGroup.add(exPipe, exBore);
  }

  const flameGeo = new THREE.ConeGeometry(0.12, 0.82, 14);
  flameGeo.rotateX(-Math.PI * 0.5);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.92,
  });
  const nitroLeftMesh = new THREE.Mesh(flameGeo, flameMat);
  nitroLeftMesh.position.set(-0.57, 0.23, -2.55);
  nitroLeftMesh.visible = false;
  const nitroRightMesh = new THREE.Mesh(flameGeo, flameMat);
  nitroRightMesh.position.set(0.57, 0.23, -2.55);
  nitroRightMesh.visible = false;
  bodyGroup.add(nitroLeftMesh, nitroRightMesh);

  // 10. Model-Specific Sculpted Swan-Neck GT Wing / Hypercar Dorsal Fin / Muscle Blower
  if (
    spec.bodyStyle === 'supercar' ||
    spec.bodyStyle === 'formula' ||
    spec.bodyStyle === 'tuner'
  ) {
    const wingWidth = isFormula ? 1.98 : 1.94;
    const wingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(wingWidth, 0.046, 0.36),
      secondaryMat,
    );
    wingBlade.position.set(0, 1.01, -1.94);
    wingBlade.rotation.x = 0.16;
    wingBlade.userData.origPos = wingBlade.position.clone();
    wingBlade.userData.origRot = wingBlade.rotation.clone();
    wingBladeMesh = wingBlade;

    const gurneyFlap = new THREE.Mesh(
      new THREE.BoxGeometry(wingWidth - 0.06, 0.032, 0.06),
      accentMat,
    );
    gurneyFlap.position.set(0, 1.045, -2.1);
    gurneyFlap.rotation.x = 0.38;
    bodyGroup.add(wingBlade, gurneyFlap);

    const endplateGeo = new THREE.BoxGeometry(0.038, 0.28, 0.48);
    const endplateTrimGeo = new THREE.BoxGeometry(0.044, 0.035, 0.49);
    for (const side of [-1, 1]) {
      const plate = new THREE.Mesh(endplateGeo, paintMat);
      plate.position.set(side * (wingWidth * 0.5), 0.99, -1.94);
      const trim = new THREE.Mesh(endplateTrimGeo, accentMat);
      trim.position.set(side * (wingWidth * 0.5), 1.12, -1.94);
      bodyGroup.add(plate, trim);
    }

    const strutGeo = new THREE.BoxGeometry(0.042, 0.34, 0.16);
    const neckHookGeo = new THREE.BoxGeometry(0.046, 0.06, 0.24);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(strutGeo, secondaryMat);
      strut.position.set(side * 0.38, 0.84, -1.86);
      strut.rotation.x = -0.18;
      const hook = new THREE.Mesh(neckHookGeo, secondaryMat);
      hook.position.set(side * 0.38, 1.04, -1.9);
      bodyGroup.add(strut, hook);
    }
  } else if (spec.bodyStyle === 'hypercar') {
    const dorsalFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.34, 1.2),
      secondaryMat,
    );
    dorsalFin.position.set(0, 0.94, -1.35);
    const activeWing = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.052, 0.32),
      accentMat,
    );
    activeWing.position.set(0, 0.88, -1.98);
    activeWing.rotation.x = 0.14;
    activeWing.userData.origPos = activeWing.position.clone();
    activeWing.userData.origRot = activeWing.rotation.clone();
    wingBladeMesh = activeWing;
    bodyGroup.add(dorsalFin, activeWing);
  } else if (spec.bodyStyle === 'muscle') {
    const blower = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.22, 0.68),
      chromeMat,
    );
    blower.position.set(0, 0.72, 1.15);
    const ducktailSpoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.14, 0.18),
      secondaryMat,
    );
    ducktailSpoiler.position.set(0, 0.78, -2.04);
    ducktailSpoiler.rotation.x = -0.35;
    bodyGroup.add(blower, ducktailSpoiler);

    const stripeGeo = new THREE.BoxGeometry(0.22, 0.02, 4.15);
    for (const sx of [-0.22, 0.22]) {
      const stripe = new THREE.Mesh(stripeGeo, secondaryMat);
      stripe.position.set(sx, 0.72, 0);
      bodyGroup.add(stripe);
    }
  }

  let policeStrobeLeft: THREE.Mesh | undefined;
  let policeStrobeRight: THREE.Mesh | undefined;

  if (spec.bodyStyle === 'police') {
    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.05, 0.22),
      secondaryMat,
    );
    barBase.position.set(0, 1.11, -0.25);
    bodyGroup.add(barBase);

    policeStrobeLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.08, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xff1122,
        emissive: 0xef4444,
        emissiveIntensity: 3.0,
      }),
    );
    policeStrobeLeft.position.set(-0.28, 1.16, -0.25);

    policeStrobeRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.08, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x3b82f6,
        emissiveIntensity: 3.0,
      }),
    );
    policeStrobeRight.position.set(0.28, 1.16, -0.25);
    bodyGroup.add(policeStrobeLeft, policeStrobeRight);

    const bullbar = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.34, 0.14),
      secondaryMat,
    );
    bullbar.position.set(0, 0.36, 2.26);
    bodyGroup.add(bullbar);
  }

  // 10b. Custom Bespoke Body Features for New Competition Models:
  if (spec.id === 'valkyrie_lmp') {
    // Le Mans Roof Snorkel Induction Scoop & Full-Length Aerodynamic Shark Fin
    const snorkelScoop = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.22, 0.52),
      secondaryMat,
    );
    snorkelScoop.position.set(0, 1.18, -0.42);
    snorkelScoop.rotation.x = -0.15;

    const lmpSharkFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.44, 1.65),
      secondaryMat,
    );
    lmpSharkFin.position.set(0, 1.05, -1.25);

    const lmpBiPlaneWing = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.042, 0.42),
      paintMat,
    );
    lmpBiPlaneWing.position.set(0, 1.14, -2.05);

    bodyGroup.add(snorkelScoop, lmpSharkFin, lmpBiPlaneWing);
  } else if (spec.id === 'monza_spider') {
    // Open-Cockpit Italian Barchetta: Twin Aerodynamic Headrest Fairing Cowls
    for (const side of [-1, 1]) {
      const cowlGeo = new THREE.ConeGeometry(0.24, 0.95, 16);
      cowlGeo.rotateX(-Math.PI * 0.46);
      const cowl = new THREE.Mesh(cowlGeo, paintMat);
      cowl.position.set(side * 0.38, 0.88, -0.75);
      bodyGroup.add(cowl);
    }
    const centerHexExhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.28, 6),
      titaniumMat,
    );
    centerHexExhaust.rotateX(Math.PI * 0.5);
    centerHexExhaust.position.set(0, 0.44, -2.15);
    bodyGroup.add(centerHexExhaust);
  } else if (spec.id === 'sandstorm_raid') {
    // Dakar Trophy 4x4: Heavy Front Steel Bullbar & Roof 4-Pod LED Lightbar & Twin Rear Spares
    const roofRack = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.08, 0.65),
      darkTrimMat,
    );
    roofRack.position.set(0, 1.20, 0.32);
    bodyGroup.add(roofRack);

    for (let p = 0; p < 4; p++) {
      const podX = -0.48 + p * 0.32;
      const podHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.09, 16),
        darkTrimMat,
      );
      podHousing.rotateX(Math.PI * 0.5);
      podHousing.position.set(podX, 1.28, 0.34);
      const podLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.07, 16),
        new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      );
      podLens.position.set(podX, 1.28, 0.386);
      bodyGroup.add(podHousing, podLens);
    }

    // Twin Rear Mounted Spare Tires
    for (const sx of [-0.42, 0.42]) {
      const spareTire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.24, 24),
        tireMat,
      );
      spareTire.rotation.x = 0.35;
      spareTire.position.set(sx, 0.62, -1.60);
      bodyGroup.add(spareTire);
    }
  } else if (spec.id === 'skyline_spec_r') {
    // JDM Kurogane GT-R: Carbon Dual-Element GT Aero Wing & Aggressive Hood Vents
    const gtrHoodScoop = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.32),
      secondaryMat,
    );
    gtrHoodScoop.position.set(0, 0.56, 1.25);
    gtrHoodScoop.rotation.x = 0.22;
    bodyGroup.add(gtrHoodScoop);

    // Front Bumper Dual Canard Dive Planes
    for (const side of [-1, 1]) {
      const upperCanard = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.018, 0.22),
        secondaryMat,
      );
      upperCanard.position.set(side * 0.94, 0.38, 1.95);
      upperCanard.rotation.y = side * 0.34;
      upperCanard.rotation.x = 0.28;
      bodyGroup.add(upperCanard);
    }
  } else if (spec.id === 'nexus_pursuit') {
    // Stealth Tactical Cyber-Interceptor: Heavy Reinforced Push Bar
    const heavyPushBumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.44, 0.16),
      darkTrimMat,
    );
    heavyPushBumper.position.set(0, 0.34, 2.28);
    bodyGroup.add(heavyPushBumper);
  } else if (spec.id === 'silver_arrow_f1') {
    // Formula Single-Seater: Titanium Halo Cockpit Safety Ring
    const haloLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.032, 12, 24, Math.PI),
      titaniumMat,
    );
    haloLoop.rotation.x = -Math.PI * 0.42;
    haloLoop.position.set(0, 0.78, 0.22);
    const haloCenterPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.36, 12),
      titaniumMat,
    );
    haloCenterPost.position.set(0, 0.72, 0.50);
    bodyGroup.add(haloLoop, haloCenterPost);
  }

  // 11. Four Solid High-Performance Wheels (Solid 3D Tire, Alloy Rim, Disc Rotor, Static Caliper & Suspension Axle)
  const wheelMeshes: THREE.Object3D[] = [];
  const frontLeftWheelPivot = new THREE.Group();
  const frontRightWheelPivot = new THREE.Group();

  const wheelRadius = 0.345;
  const wheelWidth = 0.30;
  const rimRadius = wheelRadius * 0.70; // ~0.2415
  const shoulderTube = 0.034;
  const shoulderRadius = wheelRadius - shoulderTube; // ~0.311

  // 1. Solid Closed 3D Main Tire Body (openEnded: false guarantees 100% solid volumetric geometry!)
  const tireBodyGeo = new THREE.CylinderGeometry(
    wheelRadius,
    wheelRadius,
    wheelWidth * 0.90,
    36,
    1,
    false,
  );
  tireBodyGeo.rotateZ(Math.PI * 0.5);

  // 2. Smooth 3D Rounded Tire Shoulders (Transitions tread smoothly to sidewalls)
  const tireShoulderGeo = new THREE.TorusGeometry(
    shoulderRadius,
    shoulderTube,
    16,
    36,
  );
  tireShoulderGeo.rotateY(Math.PI * 0.5);

  // 3. Double-Sided Sidewall Discs
  const tireSidewallGeo = new THREE.RingGeometry(
    rimRadius * 0.96,
    wheelRadius * 0.97,
    36,
  );
  tireSidewallGeo.rotateY(Math.PI * 0.5);

  // 4. Solid Alloy Rim Barrel (fills inner cavity behind spokes with dark metallic finish)
  const rimBarrelGeo = new THREE.CylinderGeometry(
    rimRadius,
    rimRadius,
    wheelWidth * 0.88,
    32,
    1,
    false,
  );
  rimBarrelGeo.rotateZ(Math.PI * 0.5);

  // 5. Outer & Inner Rim Lips
  const rimLipGeo = new THREE.TorusGeometry(
    rimRadius,
    0.016,
    14,
    36,
  );
  rimLipGeo.rotateY(Math.PI * 0.5);

  // 6. Sidewall Competition Accent Stripe
  const sidewallStripeGeo = new THREE.TorusGeometry(
    wheelRadius * 0.84,
    0.010,
    10,
    36,
  );
  sidewallStripeGeo.rotateY(Math.PI * 0.5);

  // 7. Twin-Spoke Performance Alloy Wheels
  const spokeGeo = new THREE.BoxGeometry(
    0.026,
    0.022,
    rimRadius * 1.90,
  );

  // 8. Billet Center Hub & Center Lock Nut
  const hubCapGeo = new THREE.CylinderGeometry(
    0.062,
    0.068,
    0.045,
    20,
  );
  hubCapGeo.rotateZ(Math.PI * 0.5);

  const centerNutGeo = new THREE.CylinderGeometry(
    0.028,
    0.032,
    0.055,
    6,
  );
  centerNutGeo.rotateZ(Math.PI * 0.5);

  // 9. Ventilated Drilled Brake Rotor Disc
  const rotorGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.60,
    wheelRadius * 0.60,
    0.036,
    28,
    1,
    false,
  );
  rotorGeo.rotateZ(Math.PI * 0.5);

  // 10. Multi-Piston High-Performance Brake Caliper
  const caliperGeo = new THREE.BoxGeometry(0.08, 0.16, 0.11);

  // 11. Inner Brake Dust Shield & Suspension Axle Spindle (Bridges wheel to car chassis!)
  const innerDustShieldGeo = new THREE.CylinderGeometry(
    rimRadius * 0.94,
    rimRadius * 0.94,
    0.018,
    24,
    1,
    false,
  );
  innerDustShieldGeo.rotateZ(Math.PI * 0.5);

  const suspensionKnuckleGeo = new THREE.BoxGeometry(0.12, 0.16, 0.14);

  const axleShaftGeo = new THREE.CylinderGeometry(
    0.042,
    0.042,
    0.38,
    16,
  );
  axleShaftGeo.rotateZ(Math.PI * 0.5);

  function createWheelUnit(isLeft: boolean): THREE.Group {
    const wheelUnit = new THREE.Group();
    const spinGroup = new THREE.Group();
    const outSign = isLeft ? -1 : 1;

    // --- ROTATING COMPONENTS (Tire, Rim, Spokes, Hub, Rotor) ---
    // A. Solid Tire Body
    const tireBody = new THREE.Mesh(tireBodyGeo, tireMat);
    spinGroup.add(tireBody);

    // B. Outer & Inner Shoulders and Sidewall Discs
    for (const sSide of [-1, 1]) {
      const shoulder = new THREE.Mesh(tireShoulderGeo, tireSidewallMat);
      shoulder.position.x = sSide * (wheelWidth * 0.5 - shoulderTube);

      const sidewall = new THREE.Mesh(tireSidewallGeo, tireSidewallMat);
      sidewall.position.x = sSide * (wheelWidth * 0.495);

      spinGroup.add(shoulder, sidewall);
    }

    // C. Solid Inner Rim Barrel
    const rimBarrel = new THREE.Mesh(rimBarrelGeo, darkTrimMat);
    spinGroup.add(rimBarrel);

    // D. Outer Alloy Rim Face
    const outerRimLip = new THREE.Mesh(rimLipGeo, chromeMat);
    outerRimLip.position.x = outSign * (wheelWidth * 0.485);

    const stripeRing = new THREE.Mesh(sidewallStripeGeo, accentMat);
    stripeRing.position.x = outSign * (wheelWidth * 0.50);

    // 10-Spoke Twin-5 Performance Alloy Wheel Face
    for (let s = 0; s < 5; s++) {
      const spokeA = new THREE.Mesh(spokeGeo, chromeMat);
      spokeA.position.x = outSign * (wheelWidth * 0.46);
      spokeA.rotation.x = (s / 5) * Math.PI + 0.07;

      const spokeB = new THREE.Mesh(spokeGeo, chromeMat);
      spokeB.position.x = outSign * (wheelWidth * 0.46);
      spokeB.rotation.x = (s / 5) * Math.PI - 0.07;

      spinGroup.add(spokeA, spokeB);
    }

    // Center Hub & Anodized Center Lock Nut
    const hubCap = new THREE.Mesh(hubCapGeo, chromeMat);
    hubCap.position.x = outSign * (wheelWidth * 0.47);

    const centerNut = new THREE.Mesh(centerNutGeo, caliperMat);
    centerNut.position.x = outSign * (wheelWidth * 0.488);

    // 5 Chrome Wheel Lug Nuts around hub center
    const lugNutGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6);
    lugNutGeo.rotateZ(Math.PI * 0.5);
    for (let lg = 0; lg < 5; lg++) {
      const la = (lg / 5) * Math.PI * 2;
      const ly = Math.cos(la) * 0.044;
      const lz = Math.sin(la) * 0.044;
      const lug = new THREE.Mesh(lugNutGeo, chromeMat);
      lug.position.set(outSign * (wheelWidth * 0.486), ly, lz);
      spinGroup.add(lug);
    }

    // Rubber Tire Air Valve Stem
    const valveStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.034, 8),
      darkTrimMat,
    );
    valveStem.position.set(outSign * (wheelWidth * 0.47), rimRadius * 0.88, 0);
    valveStem.rotation.z = outSign * 0.35;
    spinGroup.add(valveStem);

    // Ventilated Brake Rotor
    const rotor = new THREE.Mesh(rotorGeo, brakeDiscMat);
    rotor.position.x = outSign * (wheelWidth * 0.26);

    // Inner Rim Lip
    const innerRimLip = new THREE.Mesh(rimLipGeo, darkTrimMat);
    innerRimLip.position.x = -outSign * (wheelWidth * 0.485);

    spinGroup.add(outerRimLip, stripeRing, hubCap, centerNut, rotor, innerRimLip);
    wheelUnit.add(spinGroup);

    // --- STATIC COMPONENTS (Brake Caliper, Knuckle, Dust Shield, Axle Shaft) ---
    // Multi-Piston Caliper (Stays static at ~10 o'clock position while wheel spins!)
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(outSign * (wheelWidth * 0.28), 0.12, 0.08);
    caliper.rotation.x = 0.28;

    // Inner Dust Shield
    const dustShield = new THREE.Mesh(innerDustShieldGeo, darkTrimMat);
    dustShield.position.x = -outSign * (wheelWidth * 0.38);

    // Heavy-Duty Steering Knuckle
    const knuckle = new THREE.Mesh(suspensionKnuckleGeo, secondaryMat);
    knuckle.position.set(-outSign * (wheelWidth * 0.42), 0, 0);

    // Solid Steel Drive Axle Spindle (Bridges wheel to car chassis!)
    const axleShaft = new THREE.Mesh(axleShaftGeo, darkTrimMat);
    axleShaft.position.x = -outSign * (wheelWidth * 0.5 + 0.14);

    wheelUnit.add(caliper, dustShield, knuckle, axleShaft);

    // Store the spin group into wheelMeshes so index.ts wheel spin delta spins the rotating assembly!
    wheelMeshes.push(spinGroup);

    return wheelUnit;
  }

  const wheelPositions: Array<{
    x: number;
    y: number;
    z: number;
    isLeft: boolean;
    isFrontLeft?: boolean;
    isFrontRight?: boolean;
  }> = [
    { x: -0.92, y: wheelRadius, z: 1.32, isLeft: true, isFrontLeft: true },
    { x: 0.92, y: wheelRadius, z: 1.32, isLeft: false, isFrontRight: true },
    { x: -0.94, y: wheelRadius, z: -1.32, isLeft: true },
    { x: 0.94, y: wheelRadius, z: -1.32, isLeft: false },
  ];

  for (const wp of wheelPositions) {
    const wheelUnit = createWheelUnit(wp.isLeft);
    if (wp.isFrontLeft) {
      frontLeftWheelPivot.position.set(wp.x, wp.y, wp.z);
      frontLeftWheelPivot.add(wheelUnit);
      root.add(frontLeftWheelPivot);
    } else if (wp.isFrontRight) {
      frontRightWheelPivot.position.set(wp.x, wp.y, wp.z);
      frontRightWheelPivot.add(wheelUnit);
      root.add(frontRightWheelPivot);
    } else {
      wheelUnit.position.set(wp.x, wp.y, wp.z);
      root.add(wheelUnit);
    }
  }

  let telegraphRing: THREE.Mesh | undefined;
  if (isRival) {
    const ringGeo = new THREE.RingGeometry(1.6, 1.95, 24);
    ringGeo.rotateX(-Math.PI * 0.5);
    telegraphRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    telegraphRing.position.y = 0.04;
    telegraphRing.visible = false;
    root.add(telegraphRing);
  }

  return {
    root,
    bodyGroup,
    bodyMesh,
    splitterMesh: splitter,
    wingBladeMesh,
    frontLeftWheelPivot,
    frontRightWheelPivot,
    wheelMeshes,
    tailLightMat,
    paintMat,
    nitroLeftMesh,
    nitroRightMesh,
    policeStrobeLeft,
    policeStrobeRight,
    telegraphRing,
    totalDamage: 0,
    shudderTimer: 0,
    shudderSeverity: 0,
  };
}

/**
 * Applies realistic physical vertex deformation, accessory sag,
 * and paint scuffing to a BuiltCarRig based on impact severity and direction.
 */
export function applyCarDamage(
  rig: BuiltCarRig,
  impactLocalPoint: THREE.Vector3,
  severity: number,
  impactLocalNormal?: THREE.Vector3,
  isSideScrape = false,
): void {
  const clampedSev = Math.min(1.0, Math.max(0.12, severity));

  if (isSideScrape) {
    // Side friction scrape (door rubbing / fender graze)
    // Only adds gentle surface scuffing without distorting the structural mesh
    rig.totalDamage = Math.min(1.0, rig.totalDamage + clampedSev * 0.035);
    rig.shudderTimer = Math.max(rig.shudderTimer, 0.08);
    rig.shudderSeverity = Math.min(0.4, clampedSev * 0.5);

    rig.paintMat.clearcoatRoughness = THREE.MathUtils.clamp(
      0.04 + rig.totalDamage * 0.72,
      0.04,
      0.85,
    );
    rig.paintMat.roughness = THREE.MathUtils.clamp(
      0.16 + rig.totalDamage * 0.34,
      0.16,
      0.65,
    );
    rig.paintMat.clearcoat = THREE.MathUtils.clamp(
      1.0 - rig.totalDamage * 0.6,
      0.3,
      1.0,
    );
    return;
  }

  // Blunt / heavy impact
  rig.totalDamage = Math.min(1.0, rig.totalDamage + clampedSev * 0.22);
  rig.shudderTimer = Math.min(0.32, 0.12 + clampedSev * 0.16);
  rig.shudderSeverity = Math.min(1.0, clampedSev * 1.25);

  const geo = rig.bodyMesh.geometry;
  const posAttr = geo.attributes.position;
  const orig = geo.userData.origPositions as Float32Array | undefined;
  if (posAttr && orig) {
    const count = posAttr.count;
    // Radius of crumple dent in body space
    const radius = 0.82 + clampedSev * 0.68;
    const invRadius = 1.0 / radius;
    // Impact normal pushing inwards
    const inNorm = impactLocalNormal
      ? impactLocalNormal.clone().normalize()
      : new THREE.Vector3(
          -Math.sign(impactLocalPoint.x) * 0.35,
          -0.2,
          -Math.sign(impactLocalPoint.z || 1) * 0.85,
        ).normalize();

    let deformedAny = false;
    // Maximum allowable total crumple depth from original pristine mesh
    const maxDentDepth = 0.28 * Math.min(1.0, clampedSev * 1.2);

    for (let i = 0; i < count; i++) {
      const ox = orig[i * 3];
      const oy = orig[i * 3 + 1];
      const oz = orig[i * 3 + 2];

      const dx = ox - impactLocalPoint.x;
      const dy = oy - impactLocalPoint.y;
      const dz = oz - impactLocalPoint.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius) {
        deformedAny = true;
        const falloff = 1 - dist * invRadius;
        // Cubic smooth falloff for realistic metal crumple
        const weight = falloff * falloff * Math.min(clampedSev * 0.22, 0.36);

        // High frequency wrinkling/creasing on crumpled sheet metal
        const wrinkle =
          Math.sin(oy * 36.0 + ox * 22.0) *
          Math.cos(oz * 26.0) *
          0.045 *
          weight;

        const curX = posAttr.getX(i);
        const curY = posAttr.getY(i);
        const curZ = posAttr.getZ(i);

        // Calculate total displacement from original pristine vertex
        const dispX = curX + inNorm.x * weight + wrinkle * 0.6 - ox;
        const dispY = curY + inNorm.y * weight + wrinkle - oy;
        const dispZ = curZ + inNorm.z * weight + wrinkle * 0.6 - oz;
        const totalDisp = Math.hypot(dispX, dispY, dispZ);

        if (totalDisp > maxDentDepth && totalDisp > 0.0001) {
          const scale = maxDentDepth / totalDisp;
          posAttr.setXYZ(i, ox + dispX * scale, oy + dispY * scale, oz + dispZ * scale);
        } else {
          posAttr.setXYZ(
            i,
            curX + inNorm.x * weight + wrinkle * 0.6,
            curY + inNorm.y * weight + wrinkle,
            curZ + inNorm.z * weight + wrinkle * 0.6,
          );
        }
      }
    }

    if (deformedAny) {
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  // Clearcoat paint scuffs and loss of mirror gloss
  rig.paintMat.clearcoatRoughness = THREE.MathUtils.clamp(
    0.04 + rig.totalDamage * 0.72,
    0.04,
    0.85,
  );
  rig.paintMat.roughness = THREE.MathUtils.clamp(
    0.16 + rig.totalDamage * 0.34,
    0.16,
    0.65,
  );
  rig.paintMat.clearcoat = THREE.MathUtils.clamp(
    1.0 - rig.totalDamage * 0.6,
    0.3,
    1.0,
  );

  // Aero accessories sagging / jarring loose on impact (with strict realistic clamps)
  if (impactLocalPoint.z > 0.6 && rig.splitterMesh) {
    const origPos = rig.splitterMesh.userData.origPos as THREE.Vector3 | undefined;
    const origRot = rig.splitterMesh.userData.origRot as THREE.Euler | undefined;
    const maxDrop = 0.045;
    const maxTilt = 0.08;

    if (origPos && origRot) {
      rig.splitterMesh.position.y = Math.max(origPos.y - maxDrop, rig.splitterMesh.position.y - 0.015 * clampedSev);
      rig.splitterMesh.rotation.x = Math.min(origRot.x + maxTilt, rig.splitterMesh.rotation.x + 0.03 * clampedSev);
      rig.splitterMesh.rotation.z = THREE.MathUtils.clamp(
        rig.splitterMesh.rotation.z + (Math.random() - 0.5) * 0.08 * clampedSev,
        origRot.z - 0.06,
        origRot.z + 0.06,
      );
    } else {
      rig.splitterMesh.rotation.x += 0.03 * clampedSev;
      rig.splitterMesh.position.y -= 0.015 * clampedSev;
    }
  }

  if (impactLocalPoint.z < -0.6 && rig.wingBladeMesh) {
    const origPos = rig.wingBladeMesh.userData.origPos as THREE.Vector3 | undefined;
    const origRot = rig.wingBladeMesh.userData.origRot as THREE.Euler | undefined;
    const maxDrop = 0.05;

    if (origPos && origRot) {
      rig.wingBladeMesh.position.y = Math.max(origPos.y - maxDrop, rig.wingBladeMesh.position.y - 0.018 * clampedSev);
      rig.wingBladeMesh.rotation.x = THREE.MathUtils.clamp(
        rig.wingBladeMesh.rotation.x + 0.04 * clampedSev,
        origRot.x - 0.1,
        origRot.x + 0.1,
      );
    } else {
      rig.wingBladeMesh.position.y -= 0.018 * clampedSev;
    }
  }
}

/**
 * Restores a BuiltCarRig to pristine showroom condition:
 * un-dents all body geometry, realigns aero accessories, and restores mirror lacquer paint.
 */
export function resetCarDamage(rig: BuiltCarRig): void {
  rig.totalDamage = 0;
  rig.shudderTimer = 0;
  rig.shudderSeverity = 0;

  const geo = rig.bodyMesh.geometry;
  const posAttr = geo.attributes.position;
  const orig = geo.userData.origPositions as Float32Array | undefined;
  if (posAttr && orig) {
    posAttr.array.set(orig);
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  if (rig.splitterMesh && rig.splitterMesh.userData.origPos) {
    rig.splitterMesh.position.copy(rig.splitterMesh.userData.origPos);
    rig.splitterMesh.rotation.copy(rig.splitterMesh.userData.origRot);
  }
  if (rig.wingBladeMesh && rig.wingBladeMesh.userData.origPos) {
    rig.wingBladeMesh.position.copy(rig.wingBladeMesh.userData.origPos);
    rig.wingBladeMesh.rotation.copy(rig.wingBladeMesh.userData.origRot);
  }

  rig.paintMat.clearcoatRoughness = 0.04;
  rig.paintMat.roughness = 0.16;
  rig.paintMat.clearcoat = 1.0;
  rig.paintMat.emissive.setHex(0x000000);
  rig.paintMat.emissiveIntensity = 0;
}

