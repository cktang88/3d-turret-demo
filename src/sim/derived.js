import { PHYS, projectileMass, roundMass } from './constants.js'
import { muzzleVelocity, muzzleEnergy, recoilImpulse, recoilRatio, shotCooldown, magazineRefill, heatPerShot, coolRate, thermalROF } from './interior.js'
import { barrelMass, inertiaBreakdown, gravityMoment, driveYaw, driveElev } from './structure.js'
import { ballisticEfficiency, effectiveRange } from './flight.js'

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
