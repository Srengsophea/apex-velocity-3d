if (typeof document === 'undefined') {
  const fakeCtx = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    },
    {
      get: (target, prop) => {
        if (prop in target) return (target as any)[prop];
        return () => {};
      },
      set: () => true,
    },
  );
  const fakeCanvas = {
    width: 256,
    height: 256,
    getContext: () => fakeCtx,
  };
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return fakeCanvas;
      return {};
    },
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_CATALOG } from './rules';
import {
  applyCarDamage,
  buildRealisticCar,
  resetCarDamage,
} from './carBuilder';

test('applyCarDamage deforms 3D body vertices, scuffs clearcoat, and triggers shudder', () => {
  const car = CAR_CATALOG[0]; // Apex GT-R
  const rig = buildRealisticCar(car);

  assert.equal(rig.totalDamage, 0);
  assert.equal(rig.shudderTimer, 0);

  const posAttr = rig.bodyMesh.geometry.attributes.position;
  const initialZ = posAttr.getZ(0);

  // Front bumper impact at (0, 0.3, 2.1)
  const impactPoint = new THREE.Vector3(0, 0.3, 2.1);
  applyCarDamage(rig, impactPoint, 0.8);

  assert.ok(rig.totalDamage > 0, 'Total damage should increase after collision');
  assert.ok(rig.shudderTimer > 0, 'Shudder timer should be active after impact');
  assert.ok(rig.shudderSeverity > 0, 'Shudder severity should be set');
  assert.ok(rig.paintMat.clearcoatRoughness > 0.04, 'Clearcoat roughness should increase with scuffing');
  assert.ok(rig.paintMat.clearcoat < 1.0, 'Clearcoat gloss should decrease with damage');

  // Check that vertices near front bumper deformed
  let foundDeformed = false;
  for (let i = 0; i < posAttr.count; i++) {
    const orig = (rig.bodyMesh.geometry.userData.origPositions as Float32Array)[i * 3 + 2];
    const cur = posAttr.getZ(i);
    if (Math.abs(cur - orig) > 0.001) {
      foundDeformed = true;
      break;
    }
  }
  assert.ok(foundDeformed, 'Body mesh vertices near impact point should be physically crumpled');

  // Test resetCarDamage restores mint showroom condition
  resetCarDamage(rig);
  assert.equal(rig.totalDamage, 0);
  assert.equal(rig.shudderTimer, 0);
  assert.equal(rig.paintMat.clearcoatRoughness, 0.04);
  assert.equal(rig.paintMat.clearcoat, 1.0);

  for (let i = 0; i < posAttr.count; i++) {
    const orig = (rig.bodyMesh.geometry.userData.origPositions as Float32Array)[i * 3 + 2];
    const cur = posAttr.getZ(i);
    assert.equal(cur, orig, `Vertex ${i} should be restored to pristine position`);
  }
});

test('applyCarDamage sags front splitter on frontal impact and sags wing on rear impact', () => {
  const car = CAR_CATALOG[0]; // GT-R with splitter and wing
  const rig = buildRealisticCar(car);

  if (rig.splitterMesh) {
    const origSplitterY = rig.splitterMesh.position.y;
    applyCarDamage(rig, new THREE.Vector3(0, 0.2, 2.0), 0.9);
    assert.ok(rig.splitterMesh.position.y < origSplitterY, 'Front splitter should sag downward on impact');
  }

  if (rig.wingBladeMesh) {
    const origWingY = rig.wingBladeMesh.position.y;
    applyCarDamage(rig, new THREE.Vector3(0, 1.0, -1.9), 0.9);
    assert.ok(rig.wingBladeMesh.position.y < origWingY, 'Rear wing blade should sag or tilt on rear impact');
  }
});
