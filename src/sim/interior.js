import { PHYS, clamp, modeOf, roundMass, muzzleVelocity } from './constants.js'
import { barrelMass, recoilSystemMass } from './structure.js'

export { muzzleVelocity } from './constants.js'
export function muzzleEnergy(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  return 0.5 * roundMass(caliberMM, mode) / PHYS.CASE_FACTOR * (muzzleVelocity(barrelM) * m.velFrac) ** 2
}
export function recoilImpulse(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  return PHYS.KR * roundMass(caliberMM, mode) * muzzleVelocity(barrelM) * m.velFrac
}
export function recoilCapacity(caliberMM, barrelM) { return PHYS.REC_CAP_PER_KG * recoilSystemMass(caliberMM, barrelM) }
export function recoilRatio(caliberMM, barrelM, mode) {
  const impulse = recoilImpulse(caliberMM, barrelM, mode)
  return impulse > 0 ? recoilCapacity(caliberMM, barrelM) / impulse : Infinity
}
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
export const E_REF = muzzleEnergy(PHYS.REF_ROUND_CALIBER, 4, 'focused')
PHYS.HEAT_SCALE = (35 * barrelThermalMass(PHYS.REF_ROUND_CALIBER, 4)) / (PHYS.KH * muzzleEnergy(PHYS.REF_ROUND_CALIBER, 4, 'focused'))
