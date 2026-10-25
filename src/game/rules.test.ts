import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAR_CATALOG,
  TRACK_LIST,
  buildTrackWaypoints,
  calculateFinalRaceScore,
  computeGearAndRpm,
  computeRaceStandings,
  computeSafeMountainRing,
  createInitialPlayerState,
  createRivals,
  minDistanceToWaypoints,
  projectOntoTrack,
  resolveVehicleCollision,
  sampleTrackAtDistance,
  stepPlayerVehicle,
  stepRivalVehicle,
} from './rules';
import { ControlInputState } from './types';

function emptyInput(overrides: Partial<ControlInputState> = {}): ControlInputState {
  return {
    throttle: 0,
    brake: 0,
    steer: 0,
    driftHeld: false,
    nitroHeld: false,
    cameraJustPressed: false,
    pauseJustPressed: false,
    restartJustPressed: false,
    muteJustPressed: false,
    ...overrides,
  };
}

test('CAR_CATALOG has 6 distinct car models with realistic specs', () => {
  assert.equal(CAR_CATALOG.length, 6);
  const ids = new Set(CAR_CATALOG.map((c) => c.id));
  assert.equal(ids.size, 6);
  for (const car of CAR_CATALOG) {
    assert.ok(car.topSpeedKmh >= 280 && car.topSpeedKmh <= 360);
    assert.ok(car.accelRate > 20);
  }
});

test('TRACK_LIST has 6 distinct maps and buildTrackWaypoints creates valid closed circuits for each', () => {
  assert.equal(TRACK_LIST.length, 6);
  const trackIds = new Set(TRACK_LIST.map((t) => t.id));
  assert.equal(trackIds.size, 6);

  for (const track of TRACK_LIST) {
    const { waypoints, totalLength } = buildTrackWaypoints(track.controlPoints);
    assert.ok(waypoints.length >= 200, `${track.id} should have >= 200 waypoints`);
    assert.ok(totalLength > 750, `${track.id} length should exceed 750m`);
    const startWp = waypoints[0];
    assert.ok(Math.hypot(startWp.x, startWp.z) < 5, `${track.id} should start near origin`);
    assert.ok(startWp.tz > 0.85, `${track.id} starting tangent should point along +Z`);
  }
});

test('stepPlayerVehicle accelerates, steers, drifts, and uses nitro', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const car = CAR_CATALOG[0];
  const state = createInitialPlayerState(car);

  // Accelerate for 1 second
  for (let i = 0; i < 20; i++) {
    stepPlayerVehicle(
      state,
      emptyInput({ throttle: 1, nitroHeld: true }),
      car,
      waypoints,
      totalLength,
      18,
      0.05,
    );
  }

  assert.ok(state.speed > 20, 'Vehicle should accelerate significantly');
  assert.ok(state.nitro < 100, 'Nitro should deplete while boosting');
  assert.ok(state.z > 10, 'Vehicle should move forward along +Z');

  // Test drift scoring and verify steering right (steer > 0) turns toward screen-right (-X / heading < 0)
  for (let i = 0; i < 10; i++) {
    stepPlayerVehicle(
      state,
      emptyInput({ throttle: 1, steer: 0.8, driftHeld: true }),
      car,
      waypoints,
      totalLength,
      18,
      0.05,
    );
  }
  assert.equal(state.isDrifting, true);
  assert.ok(state.heading < 0, 'Steering right (steer > 0) should rotate heading right (< 0)');
  assert.ok(state.x < 0, 'Steering right from origin (+Z) should move car toward screen-right (-X)');
  assert.ok(state.totalDriftScore > 0, 'Drifting should accumulate drift score');
});

test('stepPlayerVehicle keeps car inside road barrier and counts laps', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const car = CAR_CATALOG[1];
  const state = createInitialPlayerState(car);

  // Place far off to the side of origin
  state.x = 25;
  state.z = 0;
  state.speed = 30;

  const res = stepPlayerVehicle(
    state,
    emptyInput({ throttle: 1 }),
    car,
    waypoints,
    totalLength,
    18,
    0.04,
  );
  assert.equal(res.hitBarrier, true);
  const proj = projectOntoTrack(state.x, state.z, waypoints);
  assert.ok(Math.abs(proj.lateralOffset) <= 18 * 0.55);

  // Simulate completing a lap
  state.maxSIndexReached = Math.floor(waypoints.length * 0.85);
  const finishWp = sampleTrackAtDistance(waypoints, totalLength, 8);
  state.x = finishWp.x;
  state.z = finishWp.z;
  state.speed = 40;

  const lapRes = stepPlayerVehicle(
    state,
    emptyInput({ throttle: 1 }),
    car,
    waypoints,
    totalLength,
    18,
    0.04,
  );
  assert.equal(lapRes.crossedLap, true);
  assert.equal(state.lap, 2);
});

test('AI rivals execute distinct policies and computeRaceStandings sorts accurately', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const player = createInitialPlayerState(CAR_CATALOG[0]);
  const rivals = createRivals(CAR_CATALOG[0].id, 5, waypoints, totalLength);
  assert.equal(rivals.length, 5);

  const policies = new Set(rivals.map((r) => r.policy));
  assert.equal(policies.size, 3);

  for (const r of rivals) {
    stepRivalVehicle(r, player, waypoints, totalLength, 18, 5, 0.05);
    assert.ok(r.totalProgress > 14);
  }

  const standingsBefore = computeRaceStandings(player, rivals);
  assert.equal(standingsBefore.playerPosition, 6);

  player.trackProgress = 9999;
  const standingsAfter = computeRaceStandings(player, rivals);
  assert.equal(standingsAfter.playerPosition, 1);
});

test('resolveVehicleCollision separates overlapping vehicles and triggers flash', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const player = createInitialPlayerState(CAR_CATALOG[0]);
  const rivals = createRivals(CAR_CATALOG[0].id, 1, waypoints, totalLength);
  const rival = rivals[0];

  player.x = rival.x + 1.0;
  player.z = rival.z;
  player.speed = 45;
  rival.speed = 25;

  const col = resolveVehicleCollision(player, rival);
  assert.equal(col.collided, true);
  assert.ok(col.impactSeverity > 0);
  assert.equal(player.damageFlash, 1.0);
});

test('resolveVehicleCollision detects side scrape without killing player speed, and allows 2.2m side-by-side clearance', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const player = createInitialPlayerState(CAR_CATALOG[0]);
  const rivals = createRivals(CAR_CATALOG[0].id, 1, waypoints, totalLength);
  const rival = rivals[0];

  // 1. Two cars parallel side-by-side with 2.2m lateral separation (should NOT collide)
  player.x = rival.x + 2.25;
  player.z = rival.z;
  player.heading = 0;
  rival.heading = 0;
  const colClear = resolveVehicleCollision(player, rival);
  assert.equal(colClear.collided, false, 'Cars with 2.25m lateral space should clear cleanly without phantom collision');

  // 2. Two cars rubbing doors with 1.7m lateral separation (side scrape)
  player.x = rival.x + 1.7;
  player.z = rival.z;
  player.speed = 50;
  rival.speed = 48;
  const colScrape = resolveVehicleCollision(player, rival);
  assert.equal(colScrape.collided, true);
  assert.equal(colScrape.isSideScrape, true, 'Parallel door contact should be classified as side scrape');
  assert.ok(player.speed > 45, 'Side scrape should not slash player speed excessively');
});

test('resolveVehicleCollision executes momentum exchange on rear-end bumper impact', () => {
  const { waypoints, totalLength } = buildTrackWaypoints();
  const player = createInitialPlayerState(CAR_CATALOG[0]);
  const rivals = createRivals(CAR_CATALOG[0].id, 1, waypoints, totalLength);
  const rival = rivals[0];

  // Player hits rival from behind along +Z
  player.x = rival.x;
  player.z = rival.z - 3.8;
  player.heading = 0;
  rival.heading = 0;
  player.speed = 65;
  rival.speed = 40;

  const rivalSpeedBefore = rival.speed;
  const col = resolveVehicleCollision(player, rival);
  assert.equal(col.collided, true);
  assert.equal(col.isRearBump, true);
  assert.equal(col.bumpDirection, 'player_rear_ended_rival');
  assert.ok(rival.speed > rivalSpeedBefore, 'Rival should gain speed when struck from behind');
  assert.ok(player.speed > 55, 'Player should retain forward momentum rather than hitting an immovable wall');
});

test('computeGearAndRpm and calculateFinalRaceScore return valid integer metrics', () => {
  const g1 = computeGearAndRpm(5, 320);
  const g6 = computeGearAndRpm(85, 320);
  assert.equal(g1.gear, 1);
  assert.equal(g6.gear, 6);
  assert.ok(g6.rpm > g1.rpm);

  const score1st = calculateFinalRaceScore({
    position: 1,
    totalLaps: 3,
    totalTimeSec: 105,
    driftPoints: 420,
    overtakes: 5,
  });
  const score4th = calculateFinalRaceScore({
    position: 4,
    totalLaps: 3,
    totalTimeSec: 125,
    driftPoints: 100,
    overtakes: 1,
  });
  assert.ok(score1st > score4th);
});

test('computeSafeMountainRing guarantees all mountain footprints clear the road across all 6 tracks', () => {
  for (const track of TRACK_LIST) {
    const { waypoints } = buildTrackWaypoints(track.controlPoints);
    const mountains = computeSafeMountainRing(waypoints, track.roadWidth, 44, 56);
    assert.equal(mountains.length, 44);
    for (const m of mountains) {
      const dist = minDistanceToWaypoints(m.x, m.z, waypoints);
      const minSafe = m.footprintRadius + track.roadWidth * 0.65 + 45;
      assert.ok(
        dist >= minSafe,
        `Mountain on ${track.id} at (${m.x.toFixed(1)}, ${m.z.toFixed(1)}) is too close to road (${dist.toFixed(1)} < ${minSafe.toFixed(1)})`,
      );
    }
  }
});

