export const PHYS = {
  D0: 0.1, L0: 5, MP0: 16,
  VMAX: 1150, K_VEL: 1,
  M_BARREL: 300, SP: 1,
  KR: 1.3, REC_CAP_PER_KG: 80, REC_BASE: 0.5, REC_OVERLOAD: 0.45,
  TAU_YAW: 30000, P_YAW: 55000, OMEGA_YAW_MAX: 1.9, DRAG_TORQUE: 900,
  TAU_ELEV: 18000, P_ELEV: 22000, OMEGA_ELEV_MAX: 1.25, DRAG_TORQUE_E: 120,
  BALANCE_FRACTION: 0.72,
  REF_ROUND_CALIBER: 60,
  LOADER_FIXED: 0.06, HANDLE_BASE: 0.5, A_MASS: 0.85, B_LOADER: 0.55, CASE_FACTOR: 1.4,
  MECH_BASE: 0.22, MECH_EXP: 0.25,
  REFILL_BASE: 0.9, REFILL_PER: 0.12, REFILL_EXP: 0.6,
  KH: 0.25, CP_STEEL: 460, COOL_W: 60000, HEAT_LOCK: 80,
  V_SCALE: 0.05, G_SCENE: 9.81, RHO_SCENE: 14, SOUND_SCENE: 17,
  WIND: { x: 2.2, y: 0, z: 0 },
  SIGMA_V: 0.012, SIGMA_ANG: 0.005,
  PEN_K: 0.012, DMG_K: 2.6, SPLASH_K: 21, SPLASH_BASE: 7,
  PAYLOAD_FOCUSED: 0.06, PAYLOAD_BURST: 0.22,
  ARMOR: { LIGHT: 8, MEDIUM: 22, HEAVY: 40 },
  MODE: {
    focused: { massFrac: 1, velFrac: 1, payload: 0.06 },
    burst: { massFrac: 0.45, velFrac: 0.8, payload: 0.22 },
  },
}

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }

export function projectileMass(caliberMM) { return PHYS.MP0 * (caliberMM / 100) ** 3 }
export function muzzleVelocity(barrelM) { return PHYS.VMAX * (1 - Math.exp(-PHYS.K_VEL * barrelM / PHYS.L0)) }
export function barrelMass(caliberMM, barrelM) { return PHYS.M_BARREL * (caliberMM / 100) ** 2 * (barrelM / PHYS.L0) * PHYS.SP }
export function modeOf(mode) { return PHYS.MODE[mode] ?? PHYS.MODE.focused }
export function roundMass(caliberMM, mode) { return projectileMass(caliberMM) * PHYS.CASE_FACTOR * modeOf(mode).massFrac }
export function muzzleEnergy(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  return 0.5 * projectileMass(caliberMM) * m.massFrac * (muzzleVelocity(barrelM) * m.velFrac) ** 2
}
export function recoilImpulse(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  return PHYS.KR * roundMass(caliberMM, mode) * muzzleVelocity(barrelM) * m.velFrac
}
export function recoilSystemMass(caliberMM, barrelM) { return 0.9 * barrelMass(caliberMM, barrelM) }
export function recoilCapacity(caliberMM, barrelM) { return PHYS.REC_CAP_PER_KG * recoilSystemMass(caliberMM, barrelM) }
export function recoilRatio(caliberMM, barrelM, mode) { return recoilCapacity(caliberMM, barrelM) / recoilImpulse(caliberMM, barrelM, mode) }
export function recoilRecovery(caliberMM, barrelM, mode) { return PHYS.REC_BASE * clamp(1 / recoilRatio(caliberMM, barrelM, mode), 0.7, 6) }
export function handlingTime(caliberMM, mode) {
  const ref = roundMass(PHYS.REF_ROUND_CALIBER, 'focused')
  return PHYS.HANDLE_BASE * (roundMass(caliberMM, mode) / ref) ** PHYS.A_MASS
}
export function mechanicalCycle(caliberMM) { return PHYS.MECH_BASE * (caliberMM / 100) ** PHYS.MECH_EXP }
export function shotCooldown(caliberMM, barrelM, mode) {
  return Math.max(mechanicalCycle(caliberMM), PHYS.LOADER_FIXED + handlingTime(caliberMM, mode), recoilRecovery(caliberMM, barrelM, mode))
}
export function magazineRefill(caliberMM, magazine) {
  const ref = roundMass(PHYS.REF_ROUND_CALIBER, 'focused')
  return PHYS.REFILL_BASE + PHYS.REFILL_PER * magazine * (roundMass(caliberMM, 'focused') / ref) ** PHYS.REFILL_EXP
}
export function magazineMass(caliberMM, rounds) { return 300 + rounds * roundMass(caliberMM, 'focused') }
export function barrelThermalMass(caliberMM, barrelM) { return barrelMass(caliberMM, barrelM) * PHYS.CP_STEEL }
export function heatPerShot(caliberMM, barrelM, mode) {
  return (PHYS.KH * muzzleEnergy(caliberMM, barrelM, mode) / barrelThermalMass(caliberMM, barrelM)) * PHYS.HEAT_SCALE
}
export function coolRate(caliberMM, barrelM) { return (PHYS.COOL_W / barrelThermalMass(caliberMM, barrelM)) * PHYS.HEAT_SCALE }
export function thermalROF(caliberMM, barrelM, mode) {
  const h = heatPerShot(caliberMM, barrelM, mode)
  return h > 0 ? 60 * coolRate(caliberMM, barrelM) / h : Infinity
}
const CD_TABLE = [[0, 0.12], [0.8, 0.14], [1, 0.3], [1.2, 0.38], [2, 0.32], [3, 0.27], [5, 0.24]]
export function machCd(mach) {
  if (mach <= CD_TABLE[0][0]) return CD_TABLE[0][1]
  for (let i = 1; i < CD_TABLE.length; i++) {
    if (mach <= CD_TABLE[i][0]) {
      const [m0, c0] = CD_TABLE[i - 1], [m1, c1] = CD_TABLE[i]
      return c0 + (c1 - c0) * (mach - m0) / (m1 - m0)
    }
  }
  return CD_TABLE[CD_TABLE.length - 1][1]
}
export function frontalArea(caliberMM) { return Math.PI / 4 * (caliberMM / 1000) ** 2 }
export function ballisticEfficiency(caliberMM) { return projectileMass(caliberMM) / (machCd(2) * frontalArea(caliberMM)) }
export function dragDeceleration(speed, caliberMM, massKg) {
  return 0.5 * PHYS.RHO_SCENE * machCd(speed / PHYS.SOUND_SCENE) * frontalArea(caliberMM) * speed * speed / massKg
}
export function stepFlight(p, dt) {
  const rvx = p.vel.x - PHYS.WIND.x, rvy = p.vel.y - PHYS.WIND.y, rvz = p.vel.z - PHYS.WIND.z
  const s = Math.hypot(rvx, rvy, rvz)
  const q = s > 1e-6 ? 0.5 * PHYS.RHO_SCENE * machCd(s / PHYS.SOUND_SCENE) * p.area * s / p.mass : 0
  p.vel.x += -q * rvx * dt
  p.vel.y += (-PHYS.G_SCENE - q * rvy) * dt
  p.vel.z += -q * rvz * dt
  p.pos.x += p.vel.x * dt
  p.pos.y += p.vel.y * dt
  p.pos.z += p.vel.z * dt
  return p
}
function dirFor(yaw, pitch) {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
}
function missFor(origin, target, caliberMM, barrelM, mode, yaw, pitch) {
  const m = modeOf(mode)
  const speed = muzzleVelocity(barrelM) * m.velFrac * PHYS.V_SCALE
  const d = dirFor(yaw, pitch)
  const p = {
    pos: { x: origin.x, y: origin.y, z: origin.z },
    vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
    mass: projectileMass(caliberMM) * m.massFrac,
    area: frontalArea(caliberMM),
  }
  const dx = target.x - origin.x, dz = target.z - origin.z
  const horiz = Math.hypot(dx, dz)
  const ux = dx / horiz, uz = dz / horiz
  let t = 0
  while (t < 6) {
    stepFlight(p, 1 / 60)
    t += 1 / 60
    const along = (p.pos.x - origin.x) * ux + (p.pos.z - origin.z) * uz
    if (along >= horiz || p.pos.y <= 0) {
      return {
        miss: p.pos.y - target.y,
        lat: (p.pos.x - target.x) * -uz + (p.pos.z - target.z) * ux,
        time: t,
      }
    }
  }
  return { miss: -10, lat: 0, time: t }
}
function solvePitch(origin, target, caliberMM, barrelM, mode, yaw) {
  const flat = missFor(origin, target, caliberMM, barrelM, mode, yaw, 0)
  if (flat.miss >= 0) return { pitch: 0, time: flat.time, lat: flat.lat }
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    let hi = 1.2 * i / steps
    const r = missFor(origin, target, caliberMM, barrelM, mode, yaw, hi)
    if (r.miss < 0) continue
    let lo = 1.2 * (i - 1) / steps
    for (let j = 0; j < 14; j++) {
      const mid = (lo + hi) / 2
      const m = missFor(origin, target, caliberMM, barrelM, mode, yaw, mid)
      if (Math.abs(m.miss) < 0.05) return { pitch: mid, time: m.time, lat: m.lat }
      if (m.miss < 0) lo = mid
      else hi = mid
    }
    const fin = missFor(origin, target, caliberMM, barrelM, mode, yaw, (lo + hi) / 2)
    return { pitch: (lo + hi) / 2, time: fin.time, lat: fin.lat }
  }
  return null
}
export function solveAim(origin, target, caliberMM, barrelM, mode) {
  const dx = target.x - origin.x, dz = target.z - origin.z
  const horiz = Math.hypot(dx, dz)
  if (horiz < 1) return null
  let yaw = Math.atan2(-dx, -dz)
  for (let iter = 0; iter < 4; iter++) {
    const sol = solvePitch(origin, target, caliberMM, barrelM, mode, yaw)
    if (!sol) return null
    if (Math.abs(sol.lat) < 0.05) return { dir: dirFor(yaw, sol.pitch), yaw, pitch: sol.pitch, flightTime: sol.time }
    yaw += Math.asin(clamp(sol.lat / horiz, -0.6, 0.6))
  }
  const sol = solvePitch(origin, target, caliberMM, barrelM, mode, yaw)
  return sol ? { dir: dirFor(yaw, sol.pitch), yaw, pitch: sol.pitch, flightTime: sol.time } : null
}
export function effectiveRange(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  const v0 = muzzleVelocity(barrelM) * m.velFrac * PHYS.V_SCALE
  const mass = projectileMass(caliberMM) * m.massFrac
  const area = frontalArea(caliberMM)
  let v = v0, x = 0
  while (x < 200 && v > 0.7 * v0 && v > 0) {
    v -= 0.5 * PHYS.RHO_SCENE * machCd(v / PHYS.SOUND_SCENE) * area * v * v / mass * 0.01
    x += v * 0.01
  }
  return Math.min(x, 200)
}
export function impactResult(vImpactScene, vMuzzleScene, vMuzzleReal, caliberMM, mode, armor) {
  const m = modeOf(mode)
  const mass = projectileMass(caliberMM) * m.massFrac
  const retention = vMuzzleScene > 0 ? vImpactScene / vMuzzleScene : 1
  const vReal = vMuzzleReal * retention
  const energyJ = 0.5 * mass * vReal * vReal
  const pen = PHYS.PEN_K * Math.sqrt(mass) * vReal
  return { retention, energyJ, pen, armorFactor: clamp(pen / armor, 0.08, 1.2) }
}
const E_REF = muzzleEnergy(PHYS.REF_ROUND_CALIBER, 4, 'focused')
export function kineticDamage(energyJ, pen, armor) {
  return PHYS.DMG_K * (energyJ / E_REF) ** 0.6 * Math.sqrt(clamp(pen / armor, 0.08, 1.2))
}
export function splashRadius(caliberMM) { return PHYS.SPLASH_BASE * (caliberMM / 100) ** (1 / 3) }
export function splashDamage(caliberMM, dist) {
  const r = splashRadius(caliberMM)
  return Math.max(0, PHYS.SPLASH_K * (caliberMM / 100) ** 3 * PHYS.PAYLOAD_BURST * (1 - dist / r))
}
export function inertiaBreakdown(caliberMM, barrelM, roundsRemaining) {
  const mb = barrelMass(caliberMM, barrelM)
  const ammo = roundsRemaining * roundMass(caliberMM, 'focused')
  const items = [
    { name: 'barrel rear', mass: 0.6 * mb, yawR: 0.75 + 0.25 * barrelM, elevX: 0.25 * barrelM },
    { name: 'barrel front', mass: 0.4 * mb, yawR: 0.75 + 0.75 * barrelM, elevX: 0.75 * barrelM },
    { name: 'breech', mass: 0.55 * mb, yawR: 0.55, elevX: -0.55 },
    { name: 'recoil system', mass: recoilSystemMass(caliberMM, barrelM), yawR: 0.35, elevX: -0.35 },
    { name: 'loader', mass: 400, yawR: 0.9 },
    { name: 'magazine', mass: 300 + ammo, yawR: 1.4 },
    { name: 'counterweight', mass: PHYS.BALANCE_FRACTION * 0.45 * mb * barrelM, yawR: 1.2, elevX: -1.2 },
    { name: 'armor', mass: 3768, yawR: 1.35 },
    { name: 'turret shell', mass: 2500, yawR: 0.9 },
  ]
  let yaw = 0, elev = 0, mass = 0
  for (const item of items) {
    yaw += item.mass * item.yawR * item.yawR
    mass += item.mass
    if (item.elevX !== undefined) elev += item.mass * item.elevX * item.elevX
  }
  return { yaw, elev, mass, items }
}
export function gravityMoment(barrelM, caliberMM, pitchRad) {
  return (1 - PHYS.BALANCE_FRACTION) * 0.45 * barrelMass(caliberMM, barrelM) * barrelM * 9.81 * Math.cos(pitchRad)
}
export function driveYaw(I) {
  return {
    inertia: I, tauMax: PHYS.TAU_YAW, pMax: PHYS.P_YAW, drag: PHYS.DRAG_TORQUE,
    alpha0: (PHYS.TAU_YAW - PHYS.DRAG_TORQUE) / I,
    omegaMax: Math.min(PHYS.OMEGA_YAW_MAX, PHYS.P_YAW / PHYS.TAU_YAW),
  }
}
export function driveElev(I, gravityTorque) {
  const net = PHYS.TAU_ELEV - gravityTorque - PHYS.DRAG_TORQUE_E
  return {
    inertia: I, tauMax: PHYS.TAU_ELEV, pMax: PHYS.P_ELEV, drag: PHYS.DRAG_TORQUE_E, gravityTorque,
    alpha0: net / I, omegaMax: PHYS.OMEGA_ELEV_MAX, stalled: net <= 0,
  }
}
export function gauss() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
PHYS.HEAT_SCALE = (35 * barrelThermalMass(PHYS.REF_ROUND_CALIBER, 4)) / (PHYS.KH * muzzleEnergy(PHYS.REF_ROUND_CALIBER, 4, 'focused'))
export function deriveBuild(caliberMM, barrelM, magazine, roundsRemaining) {
  const inv = inertiaBreakdown(caliberMM, barrelM, roundsRemaining)
  const yd = driveYaw(inv.yaw)
  const ed = driveElev(inv.elev, gravityMoment(barrelM, caliberMM, 0))
  const ratio = recoilRatio(caliberMM, barrelM, 'focused')
  const cooldownF = shotCooldown(caliberMM, barrelM, 'focused')
  const cooldownB = shotCooldown(caliberMM, barrelM, 'burst')
  const burstRof = 60 / cooldownB
  return {
    projectileKg: projectileMass(caliberMM),
    roundKg: roundMass(caliberMM, 'focused'),
    muzzleMs: muzzleVelocity(barrelM),
    muzzleKJ: muzzleEnergy(caliberMM, barrelM, 'focused') / 1000,
    impulseKNs: recoilImpulse(caliberMM, barrelM, 'focused') / 1000,
    recoilRatio: ratio,
    recoilMarginPct: (ratio - 1) * 100,
    barrelKg: barrelMass(caliberMM, barrelM),
    breechKg: 0.55 * barrelMass(caliberMM, barrelM),
    turretT: inv.mass / 1000,
    inertiaYaw: inv.yaw,
    inertiaElev: inv.elev,
    traverseAccelRad: yd.alpha0,
    maxTraverseRad: yd.omegaMax,
    elevStalled: ed.stalled,
    cooldownS: cooldownF,
    burstCooldownS: cooldownB,
    reloadS: magazineRefill(caliberMM, magazine),
    burstRof,
    sustainedRof: Math.min(burstRof, thermalROF(caliberMM, barrelM, 'burst')),
    heatPerShot: heatPerShot(caliberMM, barrelM, 'focused'),
    burstHeatPerShot: heatPerShot(caliberMM, barrelM, 'burst'),
    coolRate: coolRate(caliberMM, barrelM),
    effectiveRangeM: effectiveRange(caliberMM, barrelM, 'focused'),
    ballisticEff: ballisticEfficiency(caliberMM),
    dispVel: PHYS.SIGMA_V,
    dispAng: PHYS.SIGMA_ANG,
  }
}
