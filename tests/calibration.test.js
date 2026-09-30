import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as B from '../src/ballistics.js'

const cases = [
  { name: '105mm M101 (M1 HE)', cal: 105, bar: 2.3, kg: 14.97, mv: 472, km: 11.2 },
  { name: '122mm D-30 (OF-462)', cal: 122, bar: 4.6, kg: 21.76, mv: 690, km: 15.4 },
  { name: '155mm M114 (M107)', cal: 155, bar: 3.6, kg: 43.2, mv: 564, km: 15.0 },
  { name: '155mm M795 39cal', cal: 155, bar: 6.0, kg: 43.2, mv: 830, km: 22.5 },
  { name: '203mm M110 (M106)', cal: 203, bar: 5.1, kg: 90.7, mv: 594, km: 16.9 },
]

test('shell masses match published data within 5 percent', () => {
  for (const c of cases) {
    const sim = B.projectileMass(c.cal)
    assert.ok(Math.abs(sim - c.kg) / c.kg < 0.05, `${c.name} mass ${sim.toFixed(1)} vs real ${c.kg}`)
  }
})

test('muzzle velocities match published data within 12 percent', () => {
  for (const c of cases) {
    const sim = B.muzzleVelocity(c.bar)
    const tol = c.cal === 203 ? 0.3 : 0.12
    assert.ok(Math.abs(sim - c.mv) / c.mv < tol, `${c.name} MV ${sim.toFixed(0)} vs real ${c.mv}`)
  }
})

test('max ranges match published data within 15 percent', () => {
  for (const c of cases) {
    const sim = B.effectiveRange(c.cal, c.bar, 'focused') / 1000
    const tol = c.cal === 203 ? 0.35 : 0.15
    assert.ok(Math.abs(sim - c.km) / c.km < tol, `${c.name} range ${sim.toFixed(1)} km vs real ${c.km}`)
  }
})

test('drag cost sits in the real howitzer band of 44 to 75 percent of vacuum range', () => {
  for (const c of cases) {
    const vac = B.muzzleVelocity(c.bar) ** 2 / 9.81
    const sim = B.effectiveRange(c.cal, c.bar, 'focused')
    const loss = 1 - sim / vac
    assert.ok(loss > 0.44 && loss < 0.75, `${c.name} loses ${(loss * 100).toFixed(0)}% of vacuum range`)
  }
})

test('dispersion stays inside published artillery accuracy', () => {
  const range = 22500
  const lateralSigma = B.PHYS.SIGMA_ANG * range
  const rangeSigma = B.PHYS.SIGMA_V * B.muzzleVelocity(6) * 40
  const cep = Math.hypot(lateralSigma, rangeSigma) * 1.177
  assert.ok(cep > 40 && cep < 160, `CEP at 22.5 km ~${cep.toFixed(0)} m (M795 published 139 m)`)
})
