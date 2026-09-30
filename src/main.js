import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import * as B from './ballistics.js';
import { createCameraRig } from './camera-rig.js';
import './style.css';

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
physics.timestep = 1 / 60;
physics.createCollider(RAPIER.ColliderDesc.cuboid(90000, 0.2, 90000).setTranslation(0, -0.2, 0));
let physicsTime = 0;

const canvas = document.querySelector('#game-canvas');
const wrap = document.querySelector('#scene-wrap');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101d29');
scene.fog = new THREE.Fog('#101d29', 6000, 130000);
const camera = new THREE.PerspectiveCamera(50, 1, 1, 400000);
camera.position.set(0, 9, 18);
camera.lookAt(0, 1.5, -7);
scene.add(new THREE.HemisphereLight(0xb9e7ff, 0x28313a, 2.1));
const sunlight = new THREE.DirectionalLight(0xffedce, 3.2);
sunlight.position.set(-8, 17, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -28;
sunlight.shadow.camera.right = 28;
sunlight.shadow.camera.top = 28;
sunlight.shadow.camera.bottom = -35;
scene.add(sunlight);

const mat = (color, metalness = 0, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const dark = mat('#1b303a', 0.64, 0.4);
const steel = mat('#4c6672', 0.75, 0.35);
const edge = mat('#90aeb3', 0.62, 0.38);
const teal = new THREE.MeshStandardMaterial({ color: '#2de5ca', emissive: '#0b9a82', emissiveIntensity: 0.35, metalness: 0.2 });
const orange = new THREE.MeshStandardMaterial({ color: '#ffb367', emissive: '#9d481e', emissiveIntensity: 0.3 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180000, 180000), mat('#253b41'));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(180000, 180, '#45636a', '#385058');
grid.position.y = 0.012;
scene.add(grid);
for (const km of [10, 20, 30]) {
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(120000, 2, 50), mat('#47737a'));
  stripe.position.set(0, 0.03, -km * 1000);
  scene.add(stripe);
}

function box(parent, dimensions, position, material, bevel = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, top, bottom, height, position, material, sides = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A display model. Its proportions are game tuned; its motion comes from the derived physics.
const turretBase = new THREE.Group();
turretBase.position.set(0, 0, 5.5);
scene.add(turretBase);
cylinder(turretBase, 2.35, 2.55, 0.45, [0, 0.26, 0], dark, 36);
cylinder(turretBase, 2.1, 2.12, 0.16, [0, 0.58, 0], edge, 48);
const azimuth = new THREE.Group();
azimuth.position.y = 0.65;
turretBase.add(azimuth);
cylinder(azimuth, 1.85, 2.05, 0.32, [0, 0.12, 0], dark, 36);
const housing = cylinder(azimuth, 1.42, 1.66, 1.15, [0, 0.84, 0.25], steel, 24);
housing.rotation.y = Math.PI / 8;
box(azimuth, [2.65, 0.3, 1.95], [0, 1.41, 0.28], dark);
box(azimuth, [1.8, 0.14, 0.9], [0, 1.58, 0.4], edge);
for (const side of [-1, 1]) {
  box(azimuth, [0.3, 0.7, 1.25], [side * 1.38, 0.83, 0.25], dark);
  const vent = box(azimuth, [0.04, 0.23, 0.72], [side * 1.55, 0.93, 0.25], teal);
  vent.material = teal;
}
const pivot = new THREE.Group();
pivot.position.set(0, 1.05, -0.75);
azimuth.add(pivot);
const barrel = new THREE.Group();
pivot.add(barrel);
let barrelBody;
let muzzleLocal = new THREE.Vector3();
function rebuildBarrel() {
  if (barrelBody) {
    barrel.remove(barrelBody);
    barrelBody.traverse((child) => child.geometry?.dispose());
  }
  barrelBody = new THREE.Group();
  barrel.add(barrelBody);
  const length = state.barrel;
  const profile = B.barrelProfile(state.caliber, length);
  const tube = cylinder(barrelBody, profile.r1, profile.r2, length, [0, 0, -0.6 - length / 2], steel, 32);
  tube.rotation.x = Math.PI / 2;
  const sleeveLength = Math.min(1.6, length * 0.45);
  const sleeve = cylinder(barrelBody, profile.r1 * 1.24, profile.r1 * 1.04, sleeveLength, [0, 0, -0.6 - sleeveLength / 2], steel, 32);
  sleeve.rotation.x = Math.PI / 2;
  const collar = cylinder(barrelBody, profile.r1 * 1.3, profile.r1 * 1.3, 0.32, [0, 0, -0.7], dark, 36);
  collar.rotation.x = Math.PI / 2;
  const tip = cylinder(barrelBody, profile.r2 * 1.14, profile.r2 * 1.14, 0.3, [0, 0, -0.6 - length], edge, 36);
  tip.rotation.x = Math.PI / 2;
  const bore = new THREE.Mesh(new THREE.CircleGeometry(profile.rBore * 0.85, 40), dark);
  bore.position.set(0, 0, -0.6 - length - 0.16);
  bore.rotation.y = Math.PI;
  barrelBody.add(bore);
  muzzleLocal.set(0, 0, -0.6 - length - 0.18);
}

const specs = [
  { name: 'HEX PLATE', shape: 'hex', tier: 'LIGHT', hp: 2, rangeM: 6500, azDeg: -14, color: '#4ce1d2' },
  { name: 'CORE BLOCK', shape: 'block', tier: 'HEAVY', hp: 4, rangeM: 10500, azDeg: 5, color: '#ffbc75' },
  { name: 'RING', shape: 'ring', tier: 'LIGHT', hp: 2, rangeM: 14500, azDeg: 15, color: '#75d8ff' },
  { name: 'WEDGE', shape: 'wedge', tier: 'MEDIUM', hp: 3, rangeM: 19000, azDeg: -7, color: '#ed91a8' },
  { name: 'TOWER', shape: 'tower', tier: 'HEAVY', hp: 4, rangeM: 24000, azDeg: 9, color: '#d2b6ff' },
  { name: 'DISC', shape: 'disc', tier: 'MEDIUM', hp: 3, rangeM: 28500, azDeg: -18, color: '#b2df8c' },
];
specs.forEach((spec) => {
  spec.x = Math.sin(spec.azDeg * Math.PI / 180) * spec.rangeM;
  spec.z = 5.5 - Math.cos(spec.azDeg * Math.PI / 180) * spec.rangeM;
});
const targets = [];
const targetMeshes = [];
function targetShape(spec, group) {
  const color = mat(spec.color, 0.28, 0.35);
  if (spec.shape === 'hex') {
    const shape = cylinder(group, 1.25, 1.25, 0.45, [0, 1.8, 0], color, 6);
    shape.rotation.x = Math.PI / 2;
  } else if (spec.shape === 'ring') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.34, 24, 64), color);
    ring.position.y = 1.9;
    ring.castShadow = true;
    group.add(ring);
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 24), orange);
    center.position.y = 1.9;
    group.add(center);
  } else if (spec.shape === 'block') {
    box(group, [2.25, 2.05, 0.8], [0, 1.95, 0], color);
    box(group, [1.55, 0.22, 0.88], [0, 3.08, 0], edge);
  } else if (spec.shape === 'wedge') {
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.5, 3), color);
    wedge.rotation.z = Math.PI / 2;
    wedge.position.y = 2;
    wedge.castShadow = true;
    group.add(wedge);
  } else if (spec.shape === 'tower') {
    cylinder(group, 0.82, 1.18, 3.2, [0, 2.25, 0], color, 36);
    box(group, [2.2, 0.22, 1.2], [0, 3.9, 0], edge);
  } else {
    const disc = cylinder(group, 1.4, 1.4, 0.36, [0, 1.9, 0], color, 48);
    disc.rotation.x = Math.PI / 2;
    cylinder(group, 0.44, 0.44, 0.4, [0, 1.9, 0.25], orange, 48).rotation.x = Math.PI / 2;
  }
  cylinder(group, 0.07, 0.07, 1.35, [0, 0.7, 0], dark, 20);
  cylinder(group, 1.5, 1.5, 0.14, [0, 0.08, 0], dark, 40);
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.58, 1.68, 64), new THREE.MeshBasicMaterial({ color: '#2de5ca', side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.16;
  group.add(halo);
  return halo;
}
specs.forEach((spec, id) => {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.scale.setScalar(20);
  scene.add(group);
  const halo = targetShape(spec, group);
  group.traverse((child) => { if (child.isMesh && child !== halo) { child.userData.targetId = id; targetMeshes.push(child); } });
  targets.push({ ...spec, id, maxHp: spec.hp, group, halo, alive: true, flash: 0 });
});

const state = {
  caliber: 60, barrel: 4, magazine: 8, rounds: 8, mode: 'focused',
  selected: 0, score: 0, hits: 0, cycle: 0, reload: 0, temp: 0, queued: false,
  yaw: 0, pitch: 0, yawVel: 0, pitchVel: 0, recoil: 0, recoilScale: 1,
  shots: [], effects: [], debris: [], cases: [], toast: '', toastTime: 0,
  manual: false, manualYaw: 0, manualPitch: 0,
  build: null, driveYaw: null, driveElev: null, aim: null, aimKey: '', aimAge: 0, warned: '',
  report: null, trailPts: [], vacPts: [], vacLine: null, trailLine: null, paused: false, plotHold: 0, followDelay: 0, returnDelay: 0, followDelay: 0,
};
rebuildBarrel();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const targetList = document.querySelector('#target-list');
const rig = createCameraRig(camera);
const aimPos = new THREE.Vector3(0, 9, 18);
const aimLook = new THREE.Vector3(0, 1.5, -7);
rig.setAimView(aimPos, aimLook);
function targetCenter(target) { return new THREE.Vector3(target.x, (target.shape === 'tower' ? 2.6 : 1.9) * 20, target.z); }
function selectTarget(id, keepView = false) {
  if (!targets[id]?.alive) return;
  state.selected = id;
  state.queued = false;
  state.warned = '';
  state.aimKey = '';
  if (state.manual) { state.manual = false; announce('AUTO LAYING'); }
  if (!keepView) rig.setMode('aim');
  refreshUI();
}
function nextTarget() {
  for (let offset = 1; offset <= targets.length; offset++) {
    const id = (state.selected + offset) % targets.length;
    if (targets[id].alive) { selectTarget(id); return; }
  }
}
function announce(message) { state.toast = message; state.toastTime = 1.5; }
function rollWind() {
  B.setWind(2 + Math.random() * 16, Math.random() * Math.PI * 2);
  refreshDerived();
}
function rebuildStats() {
  state.build = B.deriveBuild(state.caliber, state.barrel, state.magazine, state.rounds);
  state.driveYaw = B.driveYaw(state.build.inertiaYaw);
  state.driveElev = B.driveElev(state.build.inertiaElev, B.gravityMoment(state.barrel, state.caliber, 0));
  effRing.scale.setScalar(Math.max(1, state.build.effectiveRangeM));
  document.querySelector('#reload-preview').textContent = `Refill ${fmtRange(state.build.reloadS)}s · more rounds, longer refill · new slots fill on reload`;
  refreshDerived();
}
function reload() {
  if (state.reload > 0 || state.rounds === state.magazine) return;
  state.reload = B.magazineRefill(state.caliber, state.magazine);
  state.queued = false;
  announce('RELOADING');
  refreshUI();
}
function requestFire() {
  if (!state.manual && !targets[state.selected]?.alive) { announce('SELECT A TARGET'); return; }
  if (state.reload > 0) return;
  if (state.rounds <= 0) { reload(); return; }
  if (state.temp >= B.PHYS.HEAT_LOCK) { announce('COOLING · WAIT'); return; }
  state.queued = true;
}

const axisPoint = new THREE.Vector3(0, 1.7, 5.5);
const _off = new THREE.Vector3();
const _euler = new THREE.Euler();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _turretPos = new THREE.Vector3(0, 0, 5.5);
const _aimV = new THREE.Vector3();
function muzzleAt(yaw, pitch, out) {
  _aimV.copy(muzzleLocal).add(_off.set(0, 1.05, -0.75));
  _aimV.applyEuler(_euler.set(pitch, 0, 0));
  _aimV.y += 0.65;
  _aimV.applyAxisAngle(_upAxis, yaw);
  return out.copy(_aimV).add(_turretPos);
}
function refreshAim(dt) {
  state.aimAge -= dt;
  const target = targets[state.selected];
  if (!target?.alive) { state.aim = null; return; }
  const key = `${state.selected}|${state.caliber}|${state.barrel}|${state.mode}`;
  if (key === state.aimKey && state.aim) return;
  if (state.aimAge > 0) return;
  state.aimKey = key;
  state.aimAge = 0.15;
  const tc = target?.alive ? targetCenter(target) : new THREE.Vector3(origin.x + _dir.x * 1000, 0, origin.z + _dir.z * 1000);
  let yaw = Math.atan2(-(tc.x - axisPoint.x), -(tc.z - axisPoint.z));
  let pitch = Math.atan2(tc.y - axisPoint.y, Math.hypot(tc.x - axisPoint.x, tc.z - axisPoint.z));
  let sol = null;
  for (let i = 0; i < 3; i++) {
    const s = B.solveAim(muzzleAt(yaw, pitch, new THREE.Vector3()), { x: tc.x, y: tc.y, z: tc.z }, state.caliber, state.barrel, state.mode);
    if (!s) break;
    sol = s;
    if (Math.abs(s.yaw - yaw) < 1e-5 && Math.abs(s.pitch - pitch) < 1e-5) break;
    yaw = s.yaw;
    pitch = s.pitch;
  }
  state.aim = sol;
  if (!sol && state.outKey !== key) { announce('TARGET OUT OF RANGE'); state.outKey = key; }
  if (sol) state.outKey = '';
  if (!sol && state.queued) state.queued = false;
}
function wrapPi(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function slewAxis(err, vel, drive, gravity, dt) {
  const tauCap = Math.min(drive.tauMax, drive.pMax / Math.max(Math.abs(vel), 0.15));
  const climb = (tauCap - gravity - drive.drag) / drive.inertia;
  const sink = (tauCap + gravity - drive.drag) / drive.inertia;
  const stop = Math.max(vel > 0 ? sink : climb, 0.02);
  const cmd = Math.sign(err) * Math.min(drive.omegaMax, Math.sqrt(2 * stop * 0.8 * Math.abs(err)), (0.8 * Math.abs(err)) / dt);
  const alpha = Math.max(err >= 0 ? climb : sink, 0.02);
  const next = vel + THREE.MathUtils.clamp(cmd - vel, -alpha * dt, alpha * dt);
  return { vel: next, blocked: err > 0 && climb <= 0 };
}

const IMPULSE_REF = B.recoilImpulse(60, 4, 'focused') / 1000;
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();
const SHELL_SCALE = 40;
function makeShellMesh(caliberMM, mode) {
  const r = caliberMM / 2000 * SHELL_SCALE;
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: mode === 'burst' ? '#ffc486' : '#8dfdf1', emissive: mode === 'burst' ? '#7a4312' : '#0b6e60', emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.4 });
  const pts = [];
  pts.push(new THREE.Vector2(0.55 * r, 0));
  pts.push(new THREE.Vector2(0.8 * r, 0.12 * r));
  pts.push(new THREE.Vector2(0.96 * r, 0.4 * r));
  pts.push(new THREE.Vector2(r, 0.9 * r));
  pts.push(new THREE.Vector2(r, 2.9 * r));
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(r * Math.cos(t * Math.PI / 2) ** 0.75, (2.9 + 2.4 * Math.sin(t * Math.PI / 2)) * r));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), shellMat);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -2.9 * r;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.035, r * 1.035, 0.42 * r, 28), new THREE.MeshStandardMaterial({ color: '#b8894a', metalness: 0.85, roughness: 0.35 }));
  band.rotation.x = -Math.PI / 2;
  band.position.z = -4.1 * r;
  group.add(body, band);
  return group;
}
function fire() {
  const target = targets[state.selected];
  const mode = state.mode;
  const m = B.modeOf(mode);
  pivot.updateWorldMatrix(true, true);
  const origin = pivot.localToWorld(muzzleLocal.clone());
  const v0Real = B.muzzleVelocity(state.barrel) * m.velFrac;
  const launchPitch = (state.manual ? state.pitch : state.build.elevStalled ? state.pitch : state.aim.pitch) + state.build.sagRad;
  const launchYaw = state.manual ? state.yaw : state.aim.yaw;
  _dir.copy(B.launchDir(launchYaw, launchPitch));
  const boreDir = _dir.clone();
  const angSigma = Math.sqrt(B.PHYS.SIGMA_ANG ** 2 + state.build.sagRad ** 2) * (1 + (state.build.recoilRatio < B.PHYS.REC_OVERLOAD ? 2 : 0) + 2.5 * (Math.abs(state.yawVel) + Math.abs(state.pitchVel)));
  _right.copy(_dir).cross(_upAxis).normalize();
  _upv.copy(_right).cross(_dir).normalize();
  _dir.addScaledVector(_right, B.gauss() * angSigma).addScaledVector(_upv, B.gauss() * angSigma).normalize();
  const speed = v0Real * (1 + B.gauss() * B.PHYS.SIGMA_V * (1 + state.temp / 200));
  _dir.multiplyScalar(speed);
  const mesh = makeShellMesh(state.caliber, mode);
  mesh.position.copy(origin);
  scene.add(mesh);
  const tc = target?.alive ? targetCenter(target) : new THREE.Vector3(origin.x + _dir.x * 1000, 0, origin.z + _dir.z * 1000);
  state.shots.push({
    mesh, pos: { x: origin.x, y: origin.y, z: origin.z }, vel: { x: _dir.x, y: _dir.y, z: _dir.z },
    mass: B.projectileMass(state.caliber) * m.massFrac, area: B.frontalArea(state.caliber),
    v0Launch: speed, v0Real, targetId: target.id, mode, age: 0, apexY: origin.y,
    timeScale: THREE.MathUtils.clamp((state.manual ? tc.distanceTo(origin) / (v0Real * 0.55) : state.aim?.flightTime ?? 30) / 7, 3, 30),
    startX: origin.x, startZ: origin.z, aimedM: Math.hypot(tc.x - origin.x, tc.z - origin.z), remain: 0, trailAcc: 0,
  });
  ejectCase(origin, boreDir, state.caliber);
  state.rounds--;
  state.cycle = mode === 'focused' ? state.build.cooldownS : state.build.burstCooldownS;
  state.temp = Math.min(100, state.temp + (mode === 'focused' ? state.build.heatPerShot : state.build.burstHeatPerShot));
  state.recoil = 1;
  state.recoilScale = THREE.MathUtils.clamp(state.build.impulseKNs / IMPULSE_REF, 0.3, 3);
  if (state.build.recoilRatio < B.PHYS.REC_OVERLOAD && state.warned !== 'overload') { announce('RECOIL OVERLOAD'); state.warned = 'overload'; }
  state.queued = false;
  if (state.rounds === 0) announce('MAGAZINE EMPTY · PRESS R');
  state.followDelay = 0.55;
  state.vacPts = [];
  const vy0 = _dir.y, vx0 = _dir.x, vz0 = _dir.z;
  const tVac = (vy0 + Math.sqrt(vy0 * vy0 + 2 * 9.81 * origin.y)) / 9.81;
  const vSteps = 72;
  for (let i = 0; i <= vSteps; i++) {
    const t = tVac * i / vSteps;
    state.vacPts.push(new THREE.Vector3(origin.x + vx0 * t, Math.max(0, origin.y + vy0 * t - 4.905 * t * t), origin.z + vz0 * t));
  }
  state.vacRangeM = Math.round(Math.hypot(origin.x + vx0 * tVac - origin.x, origin.z + vz0 * tVac - origin.z));
  state.report = null;
  rebuildStats();
  refreshUI();
}
function ejectCase(origin, barrelDir, caliberMM) {
  const r = caliberMM / 2000;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 0.97, r * 3.4, 16), new THREE.MeshStandardMaterial({ color: '#b8894a', metalness: 0.85, roughness: 0.35 }));
  mesh.position.copy(origin).addScaledVector(barrelDir, -0.5);
  mesh.castShadow = true;
  scene.add(mesh);
  const vel = barrelDir.clone().multiplyScalar(-(2.5 + Math.random() * 2));
  vel.y += 2.2 + Math.random() * 1.5;
  vel.x += (Math.random() - 0.5) * 1.2;
  vel.z += (Math.random() - 0.5) * 1.2;
  state.cases.push({ mesh, vel, spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3), age: 0 });
}
function updateCases(dt) {
  for (let i = state.cases.length - 1; i >= 0; i--) {
    const c = state.cases[i];
    c.age += dt;
    c.vel.y -= 9.81 * dt;
    c.mesh.position.addScaledVector(c.vel, dt);
    c.mesh.rotation.x += c.spin.x * dt;
    c.mesh.rotation.z += c.spin.z * dt;
    if (c.mesh.position.y <= 0.05) {
      c.mesh.position.y = 0.05;
      c.vel.set(c.vel.x * 0.55, 0, c.vel.z * 0.55);
      c.spin.multiplyScalar(0.4);
    }
    if (c.age > 4) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
      state.cases.splice(i, 1);
    }
  }
}
function scatterTarget(target) {
  const center = targetCenter(target);
  for (let i = 0; i < 3; i++) {
    const size = 4 + i * 2.4;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat(target.color, 0.25, 0.5));
    mesh.castShadow = true;
    mesh.position.set(center.x + (i - 1) * 10, center.y + i * 5, center.z);
    scene.add(mesh);
    const body = physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z));
    physics.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setFriction(0.8).setRestitution(0.2), body);
    body.applyImpulse({ x: (i - 1) * 4, y: 7 + i * 2, z: -6 }, true);
    state.debris.push({ mesh, body });
  }
}
function hit(target, damage) {
  if (!target?.alive || damage <= 0) return;
  target.hp = Math.max(0, target.hp - damage);
  target.flash = 0.45;
  state.hits++;
  state.score += target.hp === 0 ? 150 : 40;
  if (target.hp === 0) {
    target.alive = false;
    target.group.visible = false;
    scatterTarget(target);
    announce(`${target.name} CLEARED +150`);
    nextTarget();
    if (targets.every((item) => !item.alive)) announce('RANGE CLEARED · RESET TO PLAY AGAIN');
  } else announce(`${target.name} HIT +40`);
}
function clearTrail() {
  if (state.trailLine) {
    scene.remove(state.trailLine);
    state.trailLine.geometry.dispose();
    state.trailLine.material.dispose();
    state.trailLine = null;
  }
  if (state.vacLine) {
    scene.remove(state.vacLine);
    state.vacLine.geometry.dispose();
    state.vacLine.material.dispose();
    state.vacLine = null;
  }
  state.trailPts = [];
}
const _hitPos = new THREE.Vector3();
function finishShot(shot, hitGround) {
  const target = targets[shot.targetId];
  const speed = Math.hypot(shot.vel.x, shot.vel.y, shot.vel.z);
  const armor = B.PHYS.ARMOR[target.tier];
  const r = B.impactResult(speed, shot.v0Launch, state.caliber, shot.mode, armor);
  const hitRadius = B.splashRadius(state.caliber) * 1.5 + 25;
  const tc = target?.alive ? targetCenter(target) : new THREE.Vector3(origin.x + _dir.x * 1000, 0, origin.z + _dir.z * 1000);
  const deviation = Math.hypot(shot.pos.x - tc.x, shot.pos.z - tc.z);
  const report = {
    muzzleMs: Math.round(shot.v0Real),
    launchMs: Math.round(shot.v0Launch),
    apexM: Math.round(shot.apexY),
    flightS: Number(shot.age.toFixed(1)),
    rangeM: Math.round(Math.hypot(shot.pos.x - shot.startX, shot.pos.z - shot.startZ)),
    aimedM: Math.round(shot.aimedM),
    deviationM: Math.round(deviation),
    impactMs: Math.round(speed),
    energyMJ: (r.energyJ / 1e6).toFixed(2),
    vacRangeM: state.vacRangeM,
    hit: target.alive && deviation < hitRadius,
    windMs: B.windSpeed().toFixed(1),
    windDeg: Math.round((B.windHeading() * 180 / Math.PI + 360) % 360),
    mode: shot.mode,
  };
  const direct = target.alive && deviation < hitRadius;
  if (direct) hit(target, B.kineticDamage(r.energyJ, r.pen, armor));
  const radius = B.splashRadius(state.caliber);
  if (shot.mode === 'burst' || direct) {
    _hitPos.set(shot.pos.x, shot.pos.y, shot.pos.z);
    for (const other of targets) {
      if (!other.alive) continue;
      const d = targetCenter(other).distanceTo(_hitPos);
      if (d < radius && (shot.mode === 'burst' || other.id !== target.id)) hit(other, B.splashDamage(state.caliber, d));
    }
  }
  state.report = report;
  state.plotHold = 2.6;
  rig.setMode('plot');
  rig.setPlot(state.trailPts, state.vacPts);
  state.returnDelay = 2.6;
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshBasicMaterial({ color: shot.mode === 'burst' ? '#ffaf6f' : '#6fffe4', transparent: true, opacity: 0.6, wireframe: true }));
  pulse.position.set(shot.pos.x, Math.max(shot.pos.y, 2), shot.pos.z);
  scene.add(pulse);
  state.effects.push({ mesh: pulse, age: 0, mode: shot.mode, max: Math.max(30, radius) });
  refreshUI();
}
function groundPuff(shot) {
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshBasicMaterial({ color: '#9db4b8', transparent: true, opacity: 0.4, wireframe: true }));
  pulse.position.set(shot.pos.x, 3, shot.pos.z);
  scene.add(pulse);
  state.effects.push({ mesh: pulse, age: 0, mode: 'ground', max: 40 });
}
function removeShot(index) {
  const shot = state.shots[index];
  scene.remove(shot.mesh);
  shot.mesh.traverse((child) => child.geometry?.dispose());
  state.shots.splice(index, 1);
}
function reset() {
  targets.forEach((target) => { target.hp = target.maxHp; target.alive = true; target.flash = 0; target.group.visible = true; });
  state.shots.forEach((shot) => scene.remove(shot.mesh));
  state.effects.forEach((effect) => scene.remove(effect.mesh));
  state.debris.forEach(({ mesh, body }) => {
    physics.removeRigidBody(body);
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  state.shots = []; state.effects = []; state.debris = [];
  state.cases.forEach(({ mesh }) => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
  state.cases = [];
  physicsTime = 0;
  state.selected = 0; state.rounds = state.magazine; state.score = 0; state.hits = 0;
  state.cycle = 0; state.reload = 0; state.temp = 0; state.queued = false;
  state.yawVel = 0; state.pitchVel = 0; state.warned = ''; state.aimKey = ''; state.outKey = '';
  state.report = null;
  state.followDelay = 0.55;
  rig.setMode('aim');
  rollWind();
  announce('RANGE RESET · NEW WIND');
  rebuildStats();
  refreshUI();
}
const fmtKg = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : kg >= 100 ? `${kg.toFixed(0)} kg` : kg >= 10 ? `${kg.toFixed(1)} kg` : `${kg.toFixed(2)} kg`);
const fmtEnergy = (kj) => (kj >= 1e6 ? `${(kj / 1e6).toFixed(2)} GJ` : kj >= 1000 ? `${(kj / 1000).toFixed(1)} MJ` : `${Math.round(kj)} kJ`);
const fmtRange = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
function refreshDerived() {
  const b = state.build;
  const windDeg = Math.round((B.windHeading() * 180 / Math.PI + 360) % 360);
  const rows = [
    ['PROJECTILE', fmtKg(b.projectileKg)],
    ['ROUND', fmtKg(b.roundKg)],
    ['MUZZLE VELOCITY', `${Math.round(b.muzzleMs)} m/s`],
    ['MUZZLE ENERGY', fmtEnergy(b.muzzleKJ)],
    ['RECOIL IMPULSE', `${b.impulseKNs.toFixed(1)} kN·s`],
    ['RECOIL MARGIN', `${Math.round(b.recoilMarginPct)}%`],
    ['BARREL MASS', fmtKg(b.barrelKg)],
    ['TURRET MASS', `${b.turretT.toFixed(1)} t`],
    ['INERTIA', `${Math.round(b.inertiaYaw / 1000)}k kg·m²`],
    ['TRAVERSE ACCEL', `${Math.round(b.traverseAccelRad * 57.2958)}°/s²`],
    ['MAX TRAVERSE', `${Math.round(b.maxTraverseRad * 57.2958)}°/s`],
    ['ELEVATION', b.elevStalled ? 'OVERLOAD' : 'OK'],
    ['SHOT CYCLE', `${b.cooldownS.toFixed(2)} s`],
    ['SUSTAINED ROF', `${b.sustainedRof < 10 ? b.sustainedRof.toFixed(1) : Math.round(b.sustainedRof)} rpm`],
    ['EFFECTIVE RANGE', fmtRange(b.effectiveRangeM)],
    ['BARREL SAG', `${(b.sagM * 1000).toFixed(0)} mm`],
    ['WIND', `${B.windSpeed().toFixed(1)} m/s @ ${windDeg}°`],
  ];
  document.querySelector('#derived-stats').innerHTML = rows.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
}
function refreshReport() {
  const el = document.querySelector('#shot-report');
  const r = state.report;
  if (!r) { el.style.display = 'none'; return; }
  el.style.display = 'grid';
  const rows = [
    ['MODE', r.mode.toUpperCase()],
    ['MUZZLE / LAUNCH', `${r.muzzleMs} / ${r.launchMs} m/s`],
    ['MAX ALTITUDE', fmtRange(r.apexM)],
    ['FLIGHT TIME', `${r.flightS} s`],
    ['AIMED RANGE', fmtRange(r.aimedM)],
    ['ACTUAL RANGE', fmtRange(r.rangeM)],
    ['VACUUM RANGE', fmtRange(r.vacRangeM)],
    ['DEVIATION', `${r.deviationM} m`],
    ['IMPACT VELOCITY', `${r.impactMs} m/s`],
    ['IMPACT ENERGY', `${r.energyMJ} MJ`],
    ['WIND', `${r.windMs} m/s @ ${r.windDeg}°`],
  ];
  el.innerHTML = `<div class="report-title">${r.hit ? 'TARGET HIT' : 'SHOT LANDED'}</div>` + rows.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
}
let windHudKey = '';
function refreshWindHud() {
  const speed = B.windSpeed();
  const deg = Math.round((B.windHeading() * 180 / Math.PI + 360) % 360);
  const key = `${speed.toFixed(1)}|${deg}`;
  if (key === windHudKey) return;
  windHudKey = key;
  const screenDeg = Math.round((Math.atan2(B.PHYS.WIND.x, -B.PHYS.WIND.z) * 180 / Math.PI + 360) % 360);
  document.querySelector('#wind-arrow').style.transform = `rotate(${screenDeg - 90}deg)`;
  document.querySelector('#wind-speed').textContent = `${speed.toFixed(1)} m/s`;
}
function refreshStatus() {
  refreshWindHud();
  document.querySelector('#score').textContent = state.score;
  document.querySelector('#hit-count').textContent = state.hits;
  document.querySelector('#targets-left').textContent = targets.filter((target) => target.alive).length;
  document.querySelector('#ammo-count').textContent = `${state.rounds} / ${state.magazine}`;
  document.querySelector('#ammo-fill').style.width = `${state.rounds / state.magazine * 100}%`;
  document.querySelector('#weapon-status').textContent = state.reload > 0 ? `RELOADING · ${state.reload.toFixed(1)} S` : state.cycle > 0 ? `CYCLING · ${state.cycle.toFixed(1)} S` : state.rounds === 0 ? 'EMPTY · PRESS R TO RELOAD' : state.temp >= B.PHYS.HEAT_LOCK ? 'COOLING · WAIT' : state.queued ? 'ALIGNING TARGET...' : 'READY TO FIRE';
  document.querySelector('#heat-count').textContent = `${Math.round(state.temp)}%`;
  document.querySelector('#heat-fill').style.width = `${state.temp}%`;
}
const fmtHp = (h) => (Number.isInteger(h) ? h : h.toFixed(1));
const mapGroup = new THREE.Group();
mapGroup.visible = false;
scene.add(mapGroup);
const mapMarkers = [];
function labelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(13, 25, 34, 0.85)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 254, 62);
  ctx.fillStyle = color; ctx.font = '700 26px DM Sans, Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.scale.set(1400, 350, 1);
  return sprite;
}
specs.forEach((spec, id) => {
  const marker = new THREE.Mesh(new THREE.RingGeometry(430, 560, 48), new THREE.MeshBasicMaterial({ color: spec.color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(spec.x, 4, spec.z);
  mapGroup.add(marker);
  const hit = new THREE.Mesh(new THREE.CircleGeometry(620, 32), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  hit.rotation.x = -Math.PI / 2;
  hit.position.set(spec.x, 4.1, spec.z);
  hit.userData.targetId = id;
  mapGroup.add(hit);
  mapMarkers.push(hit);
  const label = labelSprite(`${spec.name} ${(spec.rangeM / 1000).toFixed(1)} km`, spec.color);
  label.position.set(spec.x, 2600, spec.z);
  mapGroup.add(label);
});
const ringGroup = new THREE.Group();
mapGroup.add(ringGroup);
for (let km = 5; km <= 30; km += 5) {
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * km * 1000, 2, 5.5 + Math.sin(a) * km * 1000));
  }
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#4a6d76', transparent: true, opacity: 0.4 }));
  ringGroup.add(ring);
  const lab = labelSprite(`${km} km`, '#8ca9af');
  lab.scale.set(700, 175, 1);
  lab.position.set(km * 1000, 30, 5.5);
  ringGroup.add(lab);
}
const effRing = new THREE.Mesh(new THREE.RingGeometry(0.994, 1.006, 160), new THREE.MeshBasicMaterial({ color: '#35e2c6', side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
effRing.rotation.x = -Math.PI / 2;
effRing.position.set(0, 6, 5.5);
mapGroup.add(effRing);
const turretMarker = new THREE.Mesh(new THREE.CircleGeometry(320, 32), new THREE.MeshBasicMaterial({ color: '#e6f2f0', side: THREE.DoubleSide }));
turretMarker.rotation.x = -Math.PI / 2;
turretMarker.position.set(0, 4, 5.5);
mapGroup.add(turretMarker);
const turretLabel = labelSprite('TURRET', '#e6f2f0');
turretLabel.position.set(0, 2600, 5.5);
mapGroup.add(turretLabel);
function enterMap() {
  const box = new THREE.Box3();
  box.expandByPoint(new THREE.Vector3(0, 0, 5.5));
  for (const t of targets) box.expandByPoint(new THREE.Vector3(t.x, 0, t.z));
  const center = box.getCenter(new THREE.Vector3());
  center.y = 0;
  const extent = Math.max(box.min.distanceTo(box.max) / 2, 8000) + 3000;
  rig.setMode('map', { center, extent });
}
function toggleMap() {
  if (rig.mode === 'map') rig.setMode('aim');
  else enterMap();
}
function refreshUI() {
  refreshStatus();
  targetList.innerHTML = targets.map((target) => `<button class="target-item ${target.id === state.selected ? 'selected' : ''} ${target.alive ? '' : 'cleared'}" data-id="${target.id}" ${target.alive ? '' : 'disabled'}><span class="target-swatch" style="--swatch:${target.color}"></span><span class="target-name">${target.name}<small>${target.tier} · ${(target.rangeM / 1000).toFixed(1)} km · ${fmtHp(target.hp)}/${target.maxHp} integrity</small></span><span class="target-arrow">${target.alive ? '↗' : '✓'}</span></button>`).join('');
}
targetList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (button) selectTarget(Number(button.dataset.id));
});
let orbitDrag = null;
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 2 || event.button === 1) {
    orbitDrag = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  if (event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (rig.mode === 'map') {
    const marker = raycaster.intersectObjects(mapMarkers, false).find((hit) => targets[hit.object.userData.targetId]?.alive);
    if (marker) selectTarget(marker.object.userData.targetId, true);
    return;
  }
  const hitMesh = raycaster.intersectObjects(targetMeshes, false).find((hit) => targets[hit.object.userData.targetId]?.alive);
  if (hitMesh) selectTarget(hitMesh.object.userData.targetId);
  else requestFire();
});
window.addEventListener('pointermove', (event) => {
  if (!orbitDrag) return;
  rig.orbit((event.clientX - orbitDrag.x) * 0.006, (event.clientY - orbitDrag.y) * 0.006);
  orbitDrag = { x: event.clientX, y: event.clientY };
});
window.addEventListener('pointerup', () => { orbitDrag = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  rig.zoomBy(Math.exp(event.deltaY * 0.0012));
}, { passive: false });
document.querySelector('#reset-btn').addEventListener('click', reset);
document.querySelectorAll('.mode').forEach((button) => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll('.mode').forEach((item) => item.classList.toggle('active', item === button));
  state.aimKey = '';
}));
for (const [id, output, suffix, key] of [
  ['caliber', 'caliber-value', ' mm', 'caliber'],
  ['barrel', 'barrel-value', ' m', 'barrel'],
  ['magazine', 'magazine-value', ' rounds', 'magazine'],
]) {
  document.querySelector(`#${id}`).addEventListener('input', (event) => {
    state[key] = Number(event.target.value);
    document.querySelector(`#${output}`).textContent = `${key === 'barrel' ? state[key].toFixed(1) : state[key]}${suffix}`;
    if (key === 'magazine') state.rounds = Math.min(state.rounds, state.magazine);
    if (key !== 'magazine') rebuildBarrel();
    state.aimKey = '';
    rebuildStats();
    refreshUI();
  });
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen?.();
}
document.querySelector('#fullscreen-btn').addEventListener('click', toggleFullscreen);
document.querySelector('#map-btn').addEventListener('click', toggleMap);
window.addEventListener('keydown', (event) => {
  if (['Space', 'Tab'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') requestFire();
  if (event.code === 'Tab') nextTarget();
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyF') toggleFullscreen();
  if (event.code === 'KeyM') toggleMap();
  if (event.code === 'KeyP') togglePause();
  if (event.code === 'Escape' && document.fullscreenElement) document.exitFullscreen();
});

function updateCamera(dt) {
  const followShot = state.shots[0];
  const _followVel = updateCamera._v ?? (updateCamera._v = new THREE.Vector3());
  mapGroup.visible = rig.mode === 'map';
  if (rig.mode === 'follow' && followShot) rig.update(dt, { pos: followShot.mesh.position, vel: _followVel.set(followShot.vel.x, followShot.vel.y, followShot.vel.z) });
  else if (rig.mode === 'plot') rig.update(dt, { points: state.trailPts });
  else rig.update(dt, null);
}
function togglePause() {
  state.paused = !state.paused;
  announce(state.paused ? 'SIMULATION PAUSED' : 'RESUMED');
}
function update(dt) {
  if (state.paused) {
    updateCamera(dt);
    document.querySelector('#impact-toast').textContent = state.toastTime > 0 ? state.toast : '';
    refreshReport();
    refreshStatus();
    return;
  }
  state.cycle = Math.max(0, state.cycle - dt);
  state.temp = Math.max(0, state.temp - state.build.coolRate * dt);
  if (state.reload > 0) {
    state.reload = Math.max(0, state.reload - dt);
    if (state.reload === 0) { state.rounds = state.magazine; rebuildStats(); announce('MAGAZINE READY'); }
  }
  state.toastTime = Math.max(0, state.toastTime - dt);
  state.recoil = Math.max(0, state.recoil - dt * 4.8);
  barrel.position.z = Math.sin(state.recoil * Math.PI) * 0.35 * state.recoilScale;
  if (!state.manual) refreshAim(dt);
  const target = targets[state.selected];
  const desiredYaw = state.manual ? state.manualYaw : state.aim?.yaw;
  const desiredPitch = state.manual ? state.manualPitch : state.aim?.pitch;
  if ((state.manual || (target?.alive && state.aim)) && desiredYaw !== undefined) {
    const errYaw = wrapPi(desiredYaw - state.yaw);
    const errPitch = desiredPitch - state.pitch;
    const yawCtl = slewAxis(errYaw, state.yawVel, state.driveYaw, 0, dt);
    const gravity = B.gravityMoment(state.barrel, state.caliber, state.pitch);
    const pitchCtl = slewAxis(errPitch, state.pitchVel, state.driveElev, gravity, dt);
    state.yawVel = yawCtl.vel;
    state.yaw += state.yawVel * dt;
    if (pitchCtl.blocked) {
      state.pitchVel = Math.max(0, state.pitchVel - dt * 2);
      state.pitch = Math.max(-0.02, state.pitch - dt * 0.01);
      if (state.warned !== 'stall') { announce('ELEVATION OVERLOAD'); state.warned = 'stall'; }
    } else {
      state.pitchVel = pitchCtl.vel;
      state.pitch += state.pitchVel * dt;
    }
    azimuth.rotation.y = state.yaw;
    pivot.rotation.x = state.pitch;
    const yawGate = 0.0006;
    const pitchGate = state.build.elevStalled ? 1.2 : 0.0006;
    const settled = Math.abs(state.yawVel) < 0.06 && Math.abs(state.pitchVel) < 0.06;
    const aligned = state.manual || (Math.abs(errYaw) < yawGate && Math.abs(errPitch) < pitchGate);
    if (state.queued && state.cycle === 0 && state.reload === 0 && settled && aligned) fire();
  }
  for (let i = state.shots.length - 1; i >= 0; i--) {
    const shot = state.shots[i];
    const simDt = dt * shot.timeScale;
    shot.age += simDt;
    shot.remain += simDt;
    while (shot.remain > 0) {
      const h = Math.min(0.02, shot.remain);
      B.stepFlight(shot, h);
      shot.remain -= h;
    }
    if (shot.pos.y > shot.apexY) shot.apexY = shot.pos.y;
    shot.trailAcc += simDt;
    if (shot.trailAcc >= 0.25) {
      shot.trailAcc = 0;
      state.trailPts.push(new THREE.Vector3(shot.pos.x, shot.pos.y, shot.pos.z));
      if (state.trailPts.length > 600) state.trailPts.shift();
      updateTrailLine();
    }
    shot.mesh.position.set(shot.pos.x, shot.pos.y, shot.pos.z);
    const speed = Math.hypot(shot.vel.x, shot.vel.y, shot.vel.z);
    if (speed > 1) {
      _dir.set(shot.vel.x / speed, shot.vel.y / speed, shot.vel.z / speed);
      shot.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), _dir);
    }
    shot.mesh.scale.setScalar(THREE.MathUtils.clamp(camera.position.distanceTo(shot.mesh.position) * 0.004, 1, 8));
    const hitTarget = targets[shot.targetId];
    const tc = targetCenter(hitTarget);
    const dist = Math.hypot(shot.pos.x - tc.x, shot.pos.y - tc.y, shot.pos.z - tc.z);
    if (hitTarget.alive && dist < B.splashRadius(state.caliber) * 1.5 + 25) {
      state.trailPts.push(new THREE.Vector3(shot.pos.x, shot.pos.y, shot.pos.z));
      updateTrailLine();
      removeShot(i);
      finishShot(shot, false);
      continue;
    }
    if (shot.pos.y <= 0 || shot.age > 220) {
      state.trailPts.push(new THREE.Vector3(shot.pos.x, Math.max(shot.pos.y, 0), shot.pos.z));
      updateTrailLine();
      removeShot(i);
      finishShot(shot, true);
    }
  }
  if (state.manual) {
    if (layKeys.KeyA) state.manualYaw += state.driveYaw.omegaMax * 0.9 * dt;
    if (layKeys.KeyD) state.manualYaw -= state.driveYaw.omegaMax * 0.9 * dt;
    if (layKeys.KeyW) state.manualPitch = Math.min(1.25, state.manualPitch + state.driveElev.omegaMax * dt);
    if (layKeys.KeyS) state.manualPitch = Math.max(-0.05, state.manualPitch - state.driveElev.omegaMax * dt);
  }
  updateCases(dt);
  if (state.followDelay > 0) {
    state.followDelay -= dt;
    if (state.followDelay <= 0) rig.setMode('follow');
  }
  if (state.plotHold > 0) {
    state.plotHold -= dt;
    if (state.plotHold <= 0 && rig.mode === 'plot') rig.setMode('aim');
  }
  if (state.returnDelay > 0) {
    state.returnDelay -= dt;
    if (state.returnDelay <= 0 && rig.mode === 'plot') rig.setMode('aim');
  }
  updateCamera(dt);
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const effect = state.effects[i];
    effect.age += dt;
    const rate = effect.mode === 'burst' ? 120 : effect.mode === 'ground' ? 60 : 80;
    effect.mesh.scale.setScalar(Math.min(effect.max, 2 + effect.age * rate));
    effect.mesh.material.opacity = Math.max(0, 0.7 - effect.age * 1.2);
    if (effect.age > 0.7) { scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); state.effects.splice(i, 1); }
  }
  physicsTime += dt;
  while (physicsTime >= physics.timestep) {
    physics.step();
    physicsTime -= physics.timestep;
  }
  state.debris.forEach(({ mesh, body }) => {
    const position = body.translation();
    const rotation = body.rotation();
    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  });
  targets.forEach((item) => {
    item.halo.material.color.set(item.id === state.selected && item.alive ? '#2de5ca' : '#476b73');
    item.halo.visible = item.alive;
    if (item.flash > 0) { item.flash = Math.max(0, item.flash - dt); item.group.scale.setScalar(20 * (1 + Math.sin(item.flash * 20) * 0.05)); }
    else item.group.scale.setScalar(20);
  });
  document.querySelector('#impact-toast').textContent = state.toastTime > 0 ? state.toast : '';
  refreshReport();
  refreshStatus();
}
function updateTrailLine() {
  if (state.trailPts.length < 2) return;
  if (state.trailLine) {
    scene.remove(state.trailLine);
    state.trailLine.geometry.dispose();
    state.trailLine.material.dispose();
  }
  const span = state.trailPts[state.trailPts.length - 1].distanceTo(state.trailPts[0]);
  const curve = new THREE.CatmullRomCurve3(state.trailPts);
  state.trailLine = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(220, state.trailPts.length * 2), Math.max(4, span * 0.004), 8, false), new THREE.MeshBasicMaterial({ color: '#4dffe0' }));
  scene.add(state.trailLine);
  if (!state.vacLine && state.vacPts.length > 1) {
    state.vacLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(state.vacPts), new THREE.LineDashedMaterial({ color: '#5d7d86', dashSize: 150, gapSize: 90 }));
    state.vacLine.computeLineDistances();
    scene.add(state.vacLine);
  }
}
function resize() {
  const width = wrap.clientWidth, height = wrap.clientHeight;
  if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (rig.mode === 'aim') {
      if (camera.aspect < 1) {
        aimPos.set(0, 9.5, 22);
        aimLook.set(0, 1.5, -9);
      } else {
        aimPos.set(0, 9, 18);
        aimLook.set(0, 1.5, -7);
      }
      rig.setAimView(aimPos, aimLook);
    }
    camera.updateProjectionMatrix();
  }
}
function render() { resize(); renderer.render(scene, camera); }
window.__scene = () => ({ turretChildren: turretBase.children.length, barrelChildren: barrel.children.length, barrelBody: !!barrelBody, turretVisible: turretBase.visible, azimuthChildren: azimuth.children.length });
window.__cam = () => ({ pos: camera.position.toArray().map((v) => Math.round(v)), look: rig.mode, target: targets[state.selected]?.name, yaw: Number(state.yaw.toFixed(2)), pitch: Number(state.pitch.toFixed(3)) });
window.__project = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height };
};
window.advanceTime = (ms) => { const count = Math.max(1, Math.round(ms / (1000 / 60))); for (let i = 0; i < count; i++) update(1 / 60); render(); };
window.render_game_to_text = () => JSON.stringify({
  coordinates: 'x right, y up, z toward camera; 1 unit = 1 meter, targets at km ranges',
  view: rig.mode,
  paused: state.paused,
  selected: targets[state.selected]?.name ?? null,
  score: state.score, hits: state.hits, rounds: state.rounds, magazine: state.magazine,
  mode: state.mode, caliber: state.caliber, barrel: state.barrel,
  cooldown: Number(state.cycle.toFixed(2)), reload: Number(state.reload.toFixed(2)), heat: Number(state.temp.toFixed(1)), queued: state.queued,
  wind: { ms: Number(B.windSpeed().toFixed(1)), deg: Math.round((B.windHeading() * 180 / Math.PI + 360) % 360) },
  shotsInFlight: state.shots.length,
  shots: state.shots.map((s) => ({ x: Number(s.pos.x.toFixed(0)), y: Number(s.pos.y.toFixed(0)), z: Number(s.pos.z.toFixed(0)), speed: Number(Math.hypot(s.vel.x, s.vel.y, s.vel.z).toFixed(0)), mode: s.mode })),
  report: state.report,
  derived: {
    projectileKg: Number(state.build.projectileKg.toFixed(2)), muzzleMs: Math.round(state.build.muzzleMs),
    cooldownS: Number(state.build.cooldownS.toFixed(2)), reloadS: Number(state.build.reloadS.toFixed(2)),
    sustainedRof: Number(state.build.sustainedRof.toFixed(1)), recoilRatio: Number(state.build.recoilRatio.toFixed(2)),
    elevStalled: state.build.elevStalled, temp: Number(state.temp.toFixed(1)), effectiveRangeM: Math.round(state.build.effectiveRangeM),
  },
  debris: state.debris.map(({ body }) => { const p = body.translation(); return { x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)), z: Number(p.z.toFixed(1)) }; }),
  targets: targets.map(({ name, hp, maxHp, alive, rangeM }) => ({ name, hp, maxHp, alive, rangeM })),
});
let last = performance.now();
function frame(now) { const dt = Math.min((now - last) / 1000, 0.05); last = now; update(dt); render(); requestAnimationFrame(frame); }
rebuildStats();
rollWind();
refreshUI();
requestAnimationFrame(frame);
