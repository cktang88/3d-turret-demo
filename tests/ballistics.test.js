import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as B from '../src/ballistics.js'

const { PHYS } = B

test('projectile mass follows cube law', () => {
  assert.ok(Math.abs(B.projectileMass(200) / B.projectileMass(100) - 8) < 0.001)
  assert.ok(Math.abs(B.projectileMass(50) / B.projectileMass(100) - 0.125) < 0.001)
})

test('muzzle velocity rises with diminishing returns', () => {
  const v2 = B.muzzleVelocity(2), v4 = B.muzzleVelocity(4), v6 = B.muzzleVelocity(6), v8 = B.muzzleVelocity(8)
  assert.ok(v2 < v4 && v4 < v6 && v6 < v8)
  assert.ok(v4 - v2 > v6 - v4)
  assert.ok(v8 < PHYS.VMAX)
})

test('barrel mass scales with D squared times L', () => {
  assert.ok(Math.abs(B.barrelMass(200, 5) / B.barrelMass(100, 5) - 4) < 0.001)
  assert.ok(Math.abs(B.barrelMass(100, 10) / B.barrelMass(100, 5) - 2) < 0.001)
})

test('recoil impulse is linear in mass and velocity, not energy', () => {
  const focused = B.recoilImpulse(60, 4, 'focused')
  const burst = B.recoilImpulse(60, 4, 'burst')
  const frac = PHYS.MODE.burst.massFrac * PHYS.MODE.burst.velFrac
  assert.ok(Math.abs(burst / focused - frac) < 0.001)
})

test('moment of inertia weights mass by distance squared', () => {
  const near = B.inertiaBreakdown(60, 4, 8)
  const barrel = (inv) => inv.items.filter((i) => i.name.startsWith('barrel')).reduce((s, i) => s + i.mass * i.yawR ** 2, 0)
  const fixed = (inv) => inv.yaw - barrel(inv)
  const ratio = barrel(B.inertiaBreakdown(60, 8, 8)) / barrel(near)
  assert.ok(ratio > 4.5, `barrel inertia ratio ${ratio} should exceed linear mass growth of 2x plus r^2 growth`)
  assert.ok(fixed(near) > 0)
})

test('angular acceleration is torque over inertia', () => {
  const a1 = B.driveYaw(10000).alpha0
  const a2 = B.driveYaw(20000).alpha0
  assert.ok(Math.abs(a1 / a2 - 2) < 0.001)
})

test('motor power caps available torque and top speed', () => {
  const d = B.driveYaw(10000)
  assert.ok(Math.abs(d.omegaMax - PHYS.P_YAW / PHYS.TAU_YAW) < 0.001)
  assert.ok(PHYS.P_YAW / PHYS.TAU_YAW < PHYS.OMEGA_YAW_MAX)
  assert.ok(Math.min(PHYS.TAU_YAW, PHYS.P_YAW / 1) === PHYS.TAU_YAW)
})

test('shot cooldown is the max of bottlenecks', () => {
  const cal = 600, bar = 8
  const cd = B.shotCooldown(cal, bar, 'focused')
  assert.ok(cd >= B.mechanicalCycle(cal) - 1e-9)
  assert.ok(cd >= PHYS.LOADER_FIXED + B.handlingTime(cal, 'focused') - 1e-9)
  assert.ok(cd >= B.recoilRecovery(cal, bar, 'focused') - 1e-9)
  assert.ok(cd <= Math.max(B.mechanicalCycle(cal), PHYS.LOADER_FIXED + B.handlingTime(cal, 'focused'), B.recoilRecovery(cal, bar, 'focused')) + 1e-9)
})

test('heat equilibrium identity and thermal burst depth', () => {
  assert.ok(Math.abs(B.coolRate(60, 4) / B.heatPerShot(60, 4, 'focused') - B.thermalROF(60, 4, 'focused') / 60) < 1e-9)
  const shots8 = PHYS.HEAT_LOCK / B.heatPerShot(60, 8, 'focused')
  const shots12 = PHYS.HEAT_LOCK / B.heatPerShot(60, 12, 'focused')
  assert.ok(shots12 > shots8, 'heavier barrel absorbs more heat at saturated shot energy')
})

test('drag grows with speed squared and shrinks with mass', () => {
  const fast = B.dragDeceleration(30, 60, 3.5)
  const slow = B.dragDeceleration(15, 60, 3.5)
  assert.ok(fast / slow > 3 && fast / slow < 8, `ratio ${fast / slow} (v^2 plus transonic cd rise)`)
  assert.ok(B.dragDeceleration(30, 60, 7) < fast)
})

test('mach cd curve rises through transonic and falls supersonic', () => {
  assert.ok(B.machCd(0.5) < B.machCd(1.0))
  assert.ok(B.machCd(1.0) < B.machCd(1.2))
  assert.ok(B.machCd(1.2) > B.machCd(3))
})

test('wind shifts impact point laterally', () => {
  const drop = () => {
    const p = { pos: { x: 0, y: 50, z: 0 }, vel: { x: 0, y: -10, z: 0 }, mass: 0.3, area: B.frontalArea(60) }
    while (p.pos.y > 0) B.stepFlight(p, 1 / 240)
    return p.pos.x
  }
  const withWind = drop()
  const saved = PHYS.WIND.x
  PHYS.WIND.x = 0
  const still = drop()
  PHYS.WIND.x = saved
  assert.ok(Math.abs(withWind - still) > 0.1, `drift ${Math.abs(withWind - still).toFixed(3)}`)
})

test('solveAim hits the target for light and extreme builds', () => {
  const cases = [
    [{ x: 0, y: 1.7, z: 5.5 }, { x: 0.5, y: 1.9, z: -15 }, 60, 4, 'focused'],
    [{ x: 0, y: 1.7, z: 5.5 }, { x: 12, y: 2.6, z: -16 }, 600, 8, 'focused'],
    [{ x: 0, y: 1.7, z: 5.5 }, { x: -12, y: 1.9, z: -14 }, 12.5, 2, 'focused'],
  ]
  for (const [origin, target, cal, bar, mode] of cases) {
    const sol = B.solveAim(origin, target, cal, bar, mode)
    assert.ok(sol, `no solution for ${cal}mm`)
    const m = PHYS.MODE[mode]
    const speed = B.muzzleVelocity(bar) * m.velFrac * PHYS.V_SCALE
    const p = { pos: { ...origin }, vel: { x: sol.dir.x * speed, y: sol.dir.y * speed, z: sol.dir.z * speed }, mass: B.projectileMass(cal) * m.massFrac, area: B.frontalArea(cal) }
    let t = 0
    const horiz = Math.hypot(target.x - origin.x, target.z - origin.z)
    while (t < 6) {
      B.stepFlight(p, 1 / 240)
      t += 1 / 240
      const along = ((p.pos.x - origin.x) * (target.x - origin.x) + (p.pos.z - origin.z) * (target.z - origin.z)) / horiz
      if (along >= horiz) break
    }
    const miss = Math.hypot(p.pos.x - target.x, p.pos.z - target.z)
    assert.ok(miss < 0.2, `miss ${miss.toFixed(3)} for ${cal}mm`)
  }
  assert.equal(B.solveAim({ x: 0, y: 1.7, z: 5.5 }, { x: 3.5, y: 1.9, z: -29 }, 12.5, 2, 'burst'), null, 'light burst shell cannot reach the far target')
})

test('impact energy is below muzzle energy at range', () => {
  const v0Scene = B.muzzleVelocity(4) * PHYS.V_SCALE
  const r = B.impactResult(v0Scene * 0.9, v0Scene, B.muzzleVelocity(4), 60, 'focused', 8)
  const muzzleJ = 0.5 * B.projectileMass(60) * B.muzzleVelocity(4) ** 2
  assert.ok(r.energyJ < muzzleJ)
  assert.ok(r.retention > 0.8 && r.retention < 1)
})

test('heavier projectiles retain velocity better', () => {
  assert.ok(B.effectiveRange(200, 4, 'focused') > B.effectiveRange(20, 4, 'focused'))
  assert.ok(B.effectiveRange(600, 8, 'focused') > B.effectiveRange(60, 4, 'focused'))
})

test('reload grows with round mass with diminishing exponents', () => {
  assert.ok(B.handlingTime(600, 'focused') > B.handlingTime(100, 'focused'))
  assert.ok(B.handlingTime(100, 'focused') > B.handlingTime(60, 'focused'))
  assert.ok(PHYS.A_MASS < 1 && PHYS.B_LOADER < 1)
  assert.ok(PHYS.LOADER_FIXED > 0)
})

test('magazine mass is structure plus rounds', () => {
  assert.ok(Math.abs(B.magazineMass(60, 8) - (300 + 8 * B.roundMass(60, 'focused'))) < 1e-9)
})

test('penetration grows with mass and speed, armor blunts damage', () => {
  const v = B.muzzleVelocity(4)
  const pen60 = PHYS.PEN_K * Math.sqrt(B.projectileMass(60)) * v
  const pen200 = PHYS.PEN_K * Math.sqrt(B.projectileMass(200)) * v
  assert.ok(pen200 > pen60)
  const e = B.muzzleEnergy(60, 4, 'focused')
  assert.ok(B.kineticDamage(e, pen60, 8) > B.kineticDamage(e, pen60, 1000))
})

test('splash scales with caliber and fades with distance', () => {
  assert.ok(B.splashRadius(600) > B.splashRadius(60))
  assert.ok(B.splashDamage(60, 0.1) > B.splashDamage(60, 2))
  assert.ok(B.splashDamage(60, B.splashRadius(60)) === 0)
})

test('extreme build is physically punished', () => {
  const d = B.deriveBuild(600, 8, 8, 8)
  assert.ok(d.elevStalled || d.recoilMarginPct < 0)
  assert.ok(d.traverseAccelRad < 0.1)
  assert.ok(d.reloadS > 30)
})

test('reference build tuning targets', () => {
  const cd = B.shotCooldown(60, 4, 'focused')
  assert.ok(cd > 0.45 && cd < 0.65, `cooldown ${cd}`)
  const refill = B.magazineRefill(60, 8)
  assert.ok(refill > 1.7 && refill < 2.0, `refill ${refill}`)
  const heat = B.heatPerShot(60, 4, 'focused')
  assert.ok(heat > 30 && heat < 40, `heat ${heat}`)
  const cool = B.coolRate(60, 4)
  assert.ok(cool > 10 && cool < 14, `cool ${cool}`)
  const inv = B.inertiaBreakdown(60, 4, 8)
  const yd = B.driveYaw(inv.yaw)
  assert.ok(yd.alpha0 > 2 && yd.alpha0 < 4, `alpha ${yd.alpha0}`)
  assert.ok(yd.omegaMax > 1.7 && yd.omegaMax < 1.9, `omega ${yd.omegaMax}`)
})

test('deriveBuild exposes coherent stats', () => {
  const d = B.deriveBuild(60, 4, 8, 8)
  assert.ok(d.projectileKg > 3 && d.projectileKg < 4)
  assert.ok(d.muzzleMs > 500 && d.muzzleMs < 800)
  assert.ok(d.sustainedRof <= d.burstRof)
  assert.ok(d.effectiveRangeM > 50)
  assert.ok(d.turretT > 5 && d.turretT < 30)
  assert.ok(!d.elevStalled)
  assert.ok(d.recoilMarginPct > 0)
})
