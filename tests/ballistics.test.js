import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as B from '../src/ballistics.js'

const { PHYS } = B

test('projectile mass follows the research-calibrated 2.73 power law', () => {
  assert.ok(Math.abs(B.projectileMass(200) / B.projectileMass(100) - 2 ** 2.73) < 0.001)
})

test('shell masses match public real-world data', () => {
  assert.ok(Math.abs(B.projectileMass(155) - 43.2) < 2, `155mm ${B.projectileMass(155).toFixed(1)} kg (real M107 43.2)`)
  assert.ok(Math.abs(B.projectileMass(105) - 14.97) < 1.5, `105mm ${B.projectileMass(105).toFixed(1)} kg (real M1 14.97)`)
  assert.ok(Math.abs(B.projectileMass(203) - 90.7) < 9, `203mm ${B.projectileMass(203).toFixed(1)} kg (real M106 90.7)`)
})

test('real-world range calibration: 155mm 39-cal lands near 22.5 km', () => {
  const r = B.effectiveRange(155, 6, 'focused')
  assert.ok(r > 17000 && r < 27000, `155mm/6m envelope ${(r / 1000).toFixed(1)} km`)
})

test('km-scale fire control stays accurate', () => {
  const sol = B.solveAim({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 38, z: -20000 }, 155, 6, 'focused')
  assert.ok(sol, 'no 20km solution')
  const v = B.muzzleVelocity(6)
  const p = { pos: { x: 0, y: 1.7, z: 0 }, vel: { x: sol.dir.x * v, y: sol.dir.y * v, z: sol.dir.z * v }, mass: B.projectileMass(155), area: B.frontalArea(155) }
  let t = 0, prevAlong = 0, prevY = 1.7
  while (t < 220) {
    t += 0.02
    B.stepFlight(p, 0.02)
    const along = -p.pos.z
    if (along >= 20000) {
      const f = (20000 - prevAlong) / (along - prevAlong)
      const yCross = prevY + (p.pos.y - prevY) * f
      assert.ok(Math.abs(yCross - 38) < 10, `crossing error ${Math.abs(yCross - 38).toFixed(1)} m`)
      break
    }
    if (p.pos.y <= 0) { assert.fail('hit ground before target') }
    prevAlong = along
    prevY = p.pos.y
  }
})

test('muzzle velocity rises with diminishing returns', () => {
  const v2 = B.muzzleVelocity(2), v4 = B.muzzleVelocity(4), v6 = B.muzzleVelocity(6), v8 = B.muzzleVelocity(8)
  assert.ok(v2 < v4 && v4 < v6 && v6 < v8)
  assert.ok(v4 - v2 > v6 - v4)
  assert.ok(v8 < PHYS.VMAX)
})

test('barrel proportions: pressure wall plus stiffness floor', () => {
  const p155 = B.barrelProfile(155, 6)
  assert.ok(p155.r1 > 0.1 && p155.r1 < 0.15, `155mm breech radius ${(p155.r1 * 1000).toFixed(0)} mm (real ~120)`)
  assert.ok(p155.r2 < p155.r1, 'barrel tapers toward muzzle')
  const mass155 = B.barrelMass(155, 6)
  assert.ok(mass155 > 500 && mass155 < 1100, `155/39 barrel ${mass155.toFixed(0)} kg`)
  const r200 = B.barrelMass(200, 5) / B.barrelMass(100, 5)
  assert.ok(r200 > 3.5 && r200 < 4.5, `caliber growth ratio ${r200.toFixed(2)}`)
  assert.ok(B.barrelMass(100, 10) > B.barrelMass(100, 5) * 2, 'stiffness floor makes long barrels superlinear in length')
  assert.ok(B.barrelMass(12.5, 8) > B.barrelMass(60, 4) * 10, 'a 12.5mm 8m barrel is a heavy tapered mast, not a thin tube')
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

test('motor power caps available torque and gearing limits top speed', () => {
  const d = B.driveYaw(10000)
  assert.ok(d.omegaMax === PHYS.OMEGA_YAW_MAX)
  const corner = PHYS.P_YAW / PHYS.TAU_YAW
  assert.ok(Math.min(PHYS.TAU_YAW, PHYS.P_YAW / (corner * 1.2)) < PHYS.TAU_YAW, 'power limits torque above corner speed')
  const e = B.driveElev(1000, 15000)
  assert.ok(e.omegaMax <= PHYS.OMEGA_ELEV_MAX)
  assert.ok(!e.stalled)
  assert.ok(B.driveElev(1000, 20000).stalled)
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
    const p = { pos: { x: 0, y: 50, z: 0 }, vel: { x: 0, y: -10, z: 0 }, mass: 0.15, area: B.frontalArea(60) }
    while (p.pos.y > 0) B.stepFlight(p, 1 / 240)
    return p.pos.x
  }
  const saved = PHYS.WIND.x
  PHYS.WIND.x = 8
  const withWind = drop()
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
    const speed = B.muzzleVelocity(bar) * m.velFrac
    const p = { pos: { ...origin }, vel: { x: sol.dir.x * speed, y: sol.dir.y * speed, z: sol.dir.z * speed }, mass: B.projectileMass(cal) * m.massFrac, area: B.frontalArea(cal) }
    let t = 0
    const horiz = Math.hypot(target.x - origin.x, target.z - origin.z)
    let prevAlong = 0, prevX = p.pos.x, prevY = p.pos.y, prevZ = p.pos.z
    while (t < 6) {
      B.stepFlight(p, 1 / 240)
      t += 1 / 240
      const along = ((p.pos.x - origin.x) * (target.x - origin.x) + (p.pos.z - origin.z) * (target.z - origin.z)) / horiz
      if (along >= horiz) {
        const f = (horiz - prevAlong) / (along - prevAlong)
        p.pos.x = prevX + (p.pos.x - prevX) * f
        p.pos.z = prevZ + (p.pos.z - prevZ) * f
        break
      }
      prevAlong = along
      prevX = p.pos.x; prevY = p.pos.y; prevZ = p.pos.z
    }
    const miss = Math.hypot(p.pos.x - target.x, p.pos.z - target.z)
    assert.ok(miss < 0.2, `miss ${miss.toFixed(3)} for ${cal}mm`)
  }
  assert.equal(B.solveAim({ x: 0, y: 1.7, z: 5.5 }, { x: 0, y: 38, z: -20000 }, 12.5, 2, 'burst'), null, 'light burst shell cannot reach 20 km')
})

test('impact energy is below muzzle energy at range', () => {
  const v0 = B.muzzleVelocity(4)
  const r = B.impactResult(v0 * 0.9, v0, 60, 'focused', 8)
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
  assert.ok(d.projectileKg > 1500, `600mm shell ${d.projectileKg.toFixed(0)} kg`)
})

test('reference build tuning targets', () => {
  const cd = B.shotCooldown(60, 4, 'focused')
  assert.ok(cd > 0.45 && cd < 0.65, `cooldown ${cd}`)
  const refill = B.magazineRefill(60, 8)
  assert.ok(refill > 1.7 && refill < 2.0, `refill ${refill}`)
  const heat = B.heatPerShot(60, 4, 'focused')
  assert.ok(heat > 30 && heat < 40, `heat ${heat}`)
  const cool = B.coolRate(60, 4)
  assert.ok(cool > 5 && cool < 9, `cool ${cool}`)
  const inv = B.inertiaBreakdown(60, 4, 8)
  const yd = B.driveYaw(inv.yaw)
  assert.ok(yd.alpha0 > 2 && yd.alpha0 < 4, `alpha ${yd.alpha0}`)
  assert.ok(yd.omegaMax > 1.7 && yd.omegaMax <= 1.9, `omega ${yd.omegaMax}`)
})

test('effective range matches the fire-control envelope', () => {
  const range = B.effectiveRange(60, 4, 'focused')
  const inside = B.solveAim({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 2, z: -(range - 2) }, 60, 4, 'focused')
  const outside = B.solveAim({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 2, z: -(range + 500) }, 60, 4, 'focused')
  assert.ok(inside, `no solution inside envelope ${range.toFixed(1)}`)
  assert.equal(outside, null, `solution beyond envelope ${range.toFixed(1)}`)
})

test('no NaN for degenerate zero inputs', () => {
  assert.ok(!Number.isNaN(B.recoilRatio(60, 0, 'focused')))
  assert.ok(!Number.isNaN(B.ballisticEfficiency(0)))
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
