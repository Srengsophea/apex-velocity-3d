import * as THREE from 'three';

const POOL_CAPACITY = 384;

export type ParticleKind = 'spark' | 'debris' | 'smoke' | 'nitro';

export class PooledParticleSystem {
  private mesh: THREE.InstancedMesh;
  private active = new Uint8Array(POOL_CAPACITY);
  private kind = new Uint8Array(POOL_CAPACITY); // 0: spark, 1: debris, 2: smoke, 3: nitro
  private age = new Float32Array(POOL_CAPACITY);
  private maxAge = new Float32Array(POOL_CAPACITY);
  private posX = new Float32Array(POOL_CAPACITY);
  private posY = new Float32Array(POOL_CAPACITY);
  private posZ = new Float32Array(POOL_CAPACITY);
  private velX = new Float32Array(POOL_CAPACITY);
  private velY = new Float32Array(POOL_CAPACITY);
  private velZ = new Float32Array(POOL_CAPACITY);
  private rotX = new Float32Array(POOL_CAPACITY);
  private rotY = new Float32Array(POOL_CAPACITY);
  private rotZ = new Float32Array(POOL_CAPACITY);
  private vRotX = new Float32Array(POOL_CAPACITY);
  private vRotY = new Float32Array(POOL_CAPACITY);
  private baseScaleX = new Float32Array(POOL_CAPACITY);
  private baseScaleY = new Float32Array(POOL_CAPACITY);
  private baseScaleZ = new Float32Array(POOL_CAPACITY);
  private colorStart = new Float32Array(POOL_CAPACITY * 3);
  private colorEnd = new Float32Array(POOL_CAPACITY * 3);
  private head = 0;

  private readonly _dummy = new THREE.Object3D();
  private readonly _color = new THREE.Color();
  private readonly _cStart = new THREE.Color();
  private readonly _cEnd = new THREE.Color();

  constructor(scene: THREE.Scene) {
    // Sharp faceted geometry for sparks and debris fragments
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, POOL_CAPACITY);
    this.mesh.frustumCulled = false;

    this._dummy.scale.setScalar(0);
    this._dummy.updateMatrix();
    for (let i = 0; i < POOL_CAPACITY; i++) {
      this.mesh.setMatrixAt(i, this._dummy.matrix);
      this.mesh.setColorAt(i, this._color.setHex(0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }

  spawnParticle(params: {
    kind: ParticleKind;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    colorStartHex: number;
    colorEndHex: number;
    lifetime?: number;
  }): void {
    const idx = this.head;
    this.head = (this.head + 1) % POOL_CAPACITY;

    const kVal =
      params.kind === 'spark'
        ? 0
        : params.kind === 'debris'
          ? 1
          : params.kind === 'smoke'
            ? 2
            : 3;

    this.active[idx] = 1;
    this.kind[idx] = kVal;
    this.age[idx] = 0;
    this.maxAge[idx] = params.lifetime ?? 0.45;
    this.posX[idx] = params.x;
    this.posY[idx] = params.y;
    this.posZ[idx] = params.z;
    this.velX[idx] = params.vx;
    this.velY[idx] = params.vy;
    this.velZ[idx] = params.vz;

    this.rotX[idx] = Math.random() * Math.PI * 2;
    this.rotY[idx] = Math.random() * Math.PI * 2;
    this.rotZ[idx] = Math.random() * Math.PI * 2;
    this.vRotX[idx] = (Math.random() - 0.5) * 14;
    this.vRotY[idx] = (Math.random() - 0.5) * 14;

    this.baseScaleX[idx] = params.scaleX ?? 1.0;
    this.baseScaleY[idx] = params.scaleY ?? 1.0;
    this.baseScaleZ[idx] = params.scaleZ ?? 1.0;

    this._cStart.setHex(params.colorStartHex);
    this._cEnd.setHex(params.colorEndHex);

    this.colorStart[idx * 3] = this._cStart.r;
    this.colorStart[idx * 3 + 1] = this._cStart.g;
    this.colorStart[idx * 3 + 2] = this._cStart.b;

    this.colorEnd[idx * 3] = this._cEnd.r;
    this.colorEnd[idx * 3 + 1] = this._cEnd.g;
    this.colorEnd[idx * 3 + 2] = this._cEnd.b;

    this.mesh.setColorAt(idx, this._cStart);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Spawns a high-energy shower of sparks, shattered carbon fiber debris, and radiator steam on impact.
   */
  spawnCrashDebrisBurst(
    x: number,
    y: number,
    z: number,
    normalX = 0,
    normalZ = 0,
    severity = 0.7,
  ): void {
    const sparkCount = Math.floor(22 + severity * 28);
    const debrisCount = Math.floor(6 + severity * 10);
    const smokeCount = Math.floor(3 + severity * 5);

    // 1. Directional Shower of High-Speed Ground-Bouncing Sparks
    for (let i = 0; i < sparkCount; i++) {
      const spreadAngle = (Math.random() - 0.5) * 1.8;
      const baseAngle =
        normalX !== 0 || normalZ !== 0
          ? Math.atan2(normalX, normalZ) + spreadAngle
          : Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * (12 + severity * 16);
      const vy = 1.5 + Math.random() * (4.5 + severity * 5.0);

      this.spawnParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 0.35,
        y: Math.max(0.08, y + (Math.random() - 0.5) * 0.25),
        z: z + (Math.random() - 0.5) * 0.35,
        vx: Math.sin(baseAngle) * spd,
        vy,
        vz: Math.cos(baseAngle) * spd,
        scaleX: 0.35 + Math.random() * 0.4,
        scaleY: 0.35 + Math.random() * 0.4,
        scaleZ: 1.4 + Math.random() * 1.8, // elongated in flight!
        colorStartHex: i % 3 === 0 ? 0xffffff : 0xfef08a,
        colorEndHex: i % 2 === 0 ? 0xf97316 : 0xef4444,
        lifetime: 0.32 + Math.random() * 0.42,
      });
    }

    // 2. Tumbling Carbon Fiber & Paint Debris Chunks
    for (let i = 0; i < debrisCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3.5 + Math.random() * (6.0 + severity * 8.0);
      this.spawnParticle({
        kind: 'debris',
        x,
        y: Math.max(0.12, y + 0.1),
        z,
        vx: Math.cos(ang) * spd,
        vy: 2.0 + Math.random() * 4.2,
        vz: Math.sin(ang) * spd,
        scaleX: 0.6 + Math.random() * 0.8,
        scaleY: 0.4 + Math.random() * 0.5,
        scaleZ: 0.7 + Math.random() * 0.9,
        colorStartHex: i % 2 === 0 ? 0x111827 : 0x374151,
        colorEndHex: 0x030712,
        lifetime: 0.6 + Math.random() * 0.5,
      });
    }

    // 3. Billowing Radiator Steam / Impact Smoke Puffs
    for (let i = 0; i < smokeCount; i++) {
      this.spawnParticle({
        kind: 'smoke',
        x: x + (Math.random() - 0.5) * 0.4,
        y: y + 0.2 + (Math.random() - 0.5) * 0.2,
        z: z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 2.2,
        vy: 1.2 + Math.random() * 2.4,
        vz: (Math.random() - 0.5) * 2.2,
        scaleX: 1.4 + Math.random() * 1.2,
        scaleY: 1.4 + Math.random() * 1.2,
        scaleZ: 1.4 + Math.random() * 1.2,
        colorStartHex: 0x94a3b8,
        colorEndHex: 0x334155,
        lifetime: 0.55 + Math.random() * 0.4,
      });
    }
  }

  /**
   * Continuous stream of friction sparks when dragging along an Armco barrier or guardrail.
   */
  spawnGuardrailSparks(
    x: number,
    y: number,
    z: number,
    vx: number,
    vz: number,
    count = 6,
  ): void {
    for (let i = 0; i < count; i++) {
      // Sparks eject backward against car velocity with wild lateral scatter
      const scatter = (Math.random() - 0.5) * 5.0;
      const ejectSpeed = -0.35 - Math.random() * 0.45;
      this.spawnParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 0.2,
        y: Math.max(0.06, y + (Math.random() - 0.5) * 0.15),
        z: z + (Math.random() - 0.5) * 0.2,
        vx: vx * ejectSpeed + (Math.random() - 0.5) * scatter,
        vy: 1.2 + Math.random() * 3.4,
        vz: vz * ejectSpeed + (Math.random() - 0.5) * scatter,
        scaleX: 0.3,
        scaleY: 0.3,
        scaleZ: 1.2 + Math.random() * 1.2,
        colorStartHex: 0xffffff,
        colorEndHex: 0xf59e0b,
        lifetime: 0.25 + Math.random() * 0.25,
      });
    }
  }

  /**
   * Billowing tire drift smoke plumes from rear wheels.
   */
  spawnDriftSmoke(x: number, y: number, z: number, intensity = 1.0): void {
    this.spawnParticle({
      kind: 'smoke',
      x: x + (Math.random() - 0.5) * 0.18,
      y: 0.14 + Math.random() * 0.1,
      z: z + (Math.random() - 0.5) * 0.18,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 0.6 + Math.random() * 1.4,
      vz: (Math.random() - 0.5) * 1.6,
      scaleX: (1.1 + Math.random() * 1.3) * intensity,
      scaleY: (1.1 + Math.random() * 1.3) * intensity,
      scaleZ: (1.1 + Math.random() * 1.3) * intensity,
      colorStartHex: 0xe2e8f0,
      colorEndHex: 0x94a3b8,
      lifetime: 0.5 + Math.random() * 0.4,
    });
  }

  /**
   * Nitro exhaust flame particles.
   */
  spawnNitroFlame(x: number, y: number, z: number, dirX: number, dirZ: number): void {
    this.spawnParticle({
      kind: 'nitro',
      x,
      y,
      z,
      vx: -dirX * (14 + Math.random() * 6) + (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.2,
      vz: -dirZ * (14 + Math.random() * 6) + (Math.random() - 0.5) * 1.5,
      scaleX: 0.5 + Math.random() * 0.4,
      scaleY: 0.5 + Math.random() * 0.4,
      scaleZ: 1.2 + Math.random() * 0.8,
      colorStartHex: 0x38bdf8,
      colorEndHex: 0x1d4ed8,
      lifetime: 0.18 + Math.random() * 0.12,
    });
  }

  /**
   * Expanding radiator steam and smoke puffs from damaged engine radiators.
   */
  spawnRadiatorSteam(x: number, y: number, z: number): void {
    this.spawnParticle({
      kind: 'smoke',
      x: x + (Math.random() - 0.5) * 0.25,
      y: y + Math.random() * 0.1,
      z: z + (Math.random() - 0.5) * 0.25,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 1.4 + Math.random() * 1.2,
      vz: (Math.random() - 0.5) * 0.8,
      scaleX: 1.2 + Math.random() * 0.8,
      scaleY: 1.2 + Math.random() * 0.8,
      scaleZ: 1.2 + Math.random() * 0.8,
      colorStartHex: 0xf1f5f9,
      colorEndHex: 0x94a3b8,
      lifetime: 0.6 + Math.random() * 0.4,
    });
  }

  /**
   * Tire drift smoke from rear tires.
   */
  spawnTireDriftSmoke(
    x: number,
    y: number,
    z: number,
    _headingSin = 0,
    _headingCos = 0,
  ): void {
    this.spawnDriftSmoke(x, y, z, 1.25);
  }

  /**
   * Nitro flame sparks.
   */
  spawnNitroSparks(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
  ): void {
    this.spawnNitroFlame(x, y, z, dirX, dirZ);
  }

  // Backward compatibility alias for existing code
  spawnCollisionBurst(x: number, y: number, z: number, count = 16): void {
    this.spawnCrashDebrisBurst(x, y, z, 0, 0, Math.min(1, count / 16));
  }

  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: number,
    scale = 1.0,
    lifetime = 0.45,
  ): void {
    this.spawnParticle({
      kind: 'spark',
      x,
      y,
      z,
      vx,
      vy,
      vz,
      scaleX: scale,
      scaleY: scale,
      scaleZ: scale,
      colorStartHex: colorHex,
      colorEndHex: 0xef4444,
      lifetime,
    });
  }

  update(dt: number): void {
    let anyUpdated = false;
    for (let i = 0; i < POOL_CAPACITY; i++) {
      if (!this.active[i]) continue;
      anyUpdated = true;
      this.age[i] += dt;
      if (this.age[i] >= this.maxAge[i]) {
        this.active[i] = 0;
        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }

      const lifeRatio = this.age[i] / this.maxAge[i];
      const k = this.kind[i];

      // Physics based on kind
      if (k === 0) {
        // Sparks: gravity + air drag + ground bounce
        this.velY[i] -= 14.0 * dt;
        this.velX[i] *= 1 - 0.85 * dt;
        this.velZ[i] *= 1 - 0.85 * dt;

        this.posX[i] += this.velX[i] * dt;
        this.posY[i] += this.velY[i] * dt;
        this.posZ[i] += this.velZ[i] * dt;

        // Ground bounce on pavement (y = 0.02)
        if (this.posY[i] <= 0.04 && this.velY[i] < 0) {
          this.posY[i] = 0.04;
          this.velY[i] = -this.velY[i] * 0.45;
          this.velX[i] *= 0.72;
          this.velZ[i] *= 0.72;
        }

        // Align spark orientation with travel direction
        const spd = Math.sqrt(
          this.velX[i] * this.velX[i] +
            this.velY[i] * this.velY[i] +
            this.velZ[i] * this.velZ[i],
        );
        if (spd > 0.1) {
          this._dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
          this._dummy.lookAt(
            this.posX[i] + this.velX[i],
            this.posY[i] + this.velY[i],
            this.posZ[i] + this.velZ[i],
          );
        } else {
          this._dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
        }

        const sFactor = Math.max(0.01, (1.0 - lifeRatio) * 1.1);
        this._dummy.scale.set(
          this.baseScaleX[i] * sFactor,
          this.baseScaleY[i] * sFactor,
          this.baseScaleZ[i] * sFactor * Math.min(3.2, 1.0 + spd * 0.12),
        );
      } else if (k === 1) {
        // Debris: gravity + rapid tumbling
        this.velY[i] -= 16.0 * dt;
        this.posX[i] += this.velX[i] * dt;
        this.posY[i] += this.velY[i] * dt;
        this.posZ[i] += this.velZ[i] * dt;
        if (this.posY[i] <= 0.05 && this.velY[i] < 0) {
          this.posY[i] = 0.05;
          this.velY[i] = -this.velY[i] * 0.28;
          this.velX[i] *= 0.55;
          this.velZ[i] *= 0.55;
        }
        this.rotX[i] += this.vRotX[i] * dt;
        this.rotY[i] += this.vRotY[i] * dt;
        this._dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
        this._dummy.rotation.set(this.rotX[i], this.rotY[i], 0);
        const s = (1.0 - lifeRatio * 0.4) * 0.9;
        this._dummy.scale.set(
          this.baseScaleX[i] * s,
          this.baseScaleY[i] * s,
          this.baseScaleZ[i] * s,
        );
      } else if (k === 2) {
        // Smoke: expands, rises, fades
        this.posY[i] += this.velY[i] * dt;
        this.posX[i] += this.velX[i] * dt;
        this.posZ[i] += this.velZ[i] * dt;
        this.velX[i] *= 1 - 1.2 * dt;
        this.velZ[i] *= 1 - 1.2 * dt;
        this._dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
        // Smoke expands significantly as it rises
        const expand = (0.3 + lifeRatio * 1.6) * (1.0 - lifeRatio * 0.3);
        this._dummy.scale.set(
          this.baseScaleX[i] * expand,
          this.baseScaleY[i] * expand,
          this.baseScaleZ[i] * expand,
        );
      } else {
        // Nitro flame: fast fade
        this.posX[i] += this.velX[i] * dt;
        this.posY[i] += this.velY[i] * dt;
        this.posZ[i] += this.velZ[i] * dt;
        this._dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
        const s = 1.0 - lifeRatio;
        this._dummy.scale.set(
          this.baseScaleX[i] * s,
          this.baseScaleY[i] * s,
          this.baseScaleZ[i] * s,
        );
      }

      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this._dummy.matrix);

      // Interpolate color over lifetime
      const idx3 = i * 3;
      this._color.setRGB(
        this.colorStart[idx3] + (this.colorEnd[idx3] - this.colorStart[idx3]) * lifeRatio,
        this.colorStart[idx3 + 1] + (this.colorEnd[idx3 + 1] - this.colorStart[idx3 + 1]) * lifeRatio,
        this.colorStart[idx3 + 2] + (this.colorEnd[idx3 + 2] - this.colorStart[idx3 + 2]) * lifeRatio,
      );
      this.mesh.setColorAt(i, this._color);
    }

    if (anyUpdated) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
