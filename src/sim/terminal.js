import { PHYS, clamp, modeOf, projectileMass } from './constants.js'
import { E_REF } from './interior.js'

export function impactResult(vImpact, vMuzzle, caliberMM, mode, armor) {
  const m = modeOf(mode)
  const mass = projectileMass(caliberMM) * m.massFrac
  const retention = vMuzzle > 0 ? vImpact / vMuzzle : 1
  const vReal = vMuzzle * retention
  const energyJ = 0.5 * mass * vReal * vReal
  const pen = PHYS.PEN_K * Math.sqrt(mass) * vReal
  return { retention, energyJ, pen, armorFactor: clamp(pen / armor, 0.08, 1.2) }
}
export function kineticDamage(energyJ, pen, armor) {
  return PHYS.DMG_K * (energyJ / E_REF) ** 0.6 * Math.sqrt(clamp(pen / armor, 0.08, 1.2))
}
export function splashRadius(caliberMM) { return PHYS.SPLASH_BASE * (caliberMM / 100) ** (1 / 3) }
export function splashDamage(caliberMM, dist) {
  const r = splashRadius(caliberMM)
  return Math.max(0, PHYS.SPLASH_K * (caliberMM / 100) ** 3 * PHYS.PAYLOAD_BURST * (1 - dist / r))
}
