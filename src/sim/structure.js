import { PHYS, roundMass } from './constants.js'

export function barrelMass(caliberMM, barrelM) { return PHYS.M_BARREL * (caliberMM / 100) ** 2 * (barrelM / PHYS.L0) * PHYS.SP }
export function recoilSystemMass(caliberMM, barrelM) { return 0.9 * barrelMass(caliberMM, barrelM) }
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
    { name: 'counterweight', mass: (PHYS.BALANCE_FRACTION * 0.45 * mb * barrelM) / 1.2, yawR: 1.2, elevX: -1.2 },
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
    omegaMax: PHYS.OMEGA_YAW_MAX,
  }
}
export function driveElev(I, gravityTorque) {
  const net = PHYS.TAU_ELEV - gravityTorque - PHYS.DRAG_TORQUE_E
  return {
    inertia: I, tauMax: PHYS.TAU_ELEV, pMax: PHYS.P_ELEV, drag: PHYS.DRAG_TORQUE_E, gravityTorque,
    alpha0: net / I,
    omegaMax: Math.min(PHYS.OMEGA_ELEV_MAX, PHYS.P_ELEV / Math.max(gravityTorque + PHYS.DRAG_TORQUE_E, 1)),
    stalled: net <= 0,
  }
}
