import { PHYS, clamp, modeOf, projectileMass } from './constants.js'
import { muzzleVelocity } from './interior.js'

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
export function ballisticEfficiency(caliberMM) {
  const area = frontalArea(caliberMM)
  return area > 0 ? projectileMass(caliberMM) / (machCd(2) * PHYS.CD_FORM * area) : Infinity
}
function accel(p) {
  const rvx = p.vel.x - PHYS.WIND.x, rvy = p.vel.y - PHYS.WIND.y, rvz = p.vel.z - PHYS.WIND.z
  const s = Math.hypot(rvx, rvy, rvz)
  const rho = PHYS.RHO * Math.exp(-Math.max(0, p.pos.y) / PHYS.RHO_SCALE_HEIGHT)
  const q = s > 1e-9 ? 0.5 * rho * machCd(s / PHYS.SOUND) * PHYS.CD_FORM * p.area * s / p.mass : 0
  return { x: -q * rvx, y: -PHYS.G - q * rvy, z: -q * rvz }
}
export function dragDeceleration(speed, caliberMM, massKg) {
  return Math.abs(accel({ pos: { x: 0, y: 0, z: 0 }, vel: { x: speed, y: 0, z: 0 }, mass: massKg, area: frontalArea(caliberMM) }).x)
}
export function stepFlight(p, dt) {
  const a1 = accel(p)
  const vT = { x: p.vel.x + a1.x * dt, y: p.vel.y + a1.y * dt, z: p.vel.z + a1.z * dt }
  const pT = { x: p.pos.x + vT.x * dt, y: p.pos.y + vT.y * dt, z: p.pos.z + vT.z * dt }
  const a2 = accel({ pos: pT, vel: vT, mass: p.mass, area: p.area })
  const vx0 = p.vel.x, vy0 = p.vel.y, vz0 = p.vel.z
  p.vel.x += (a1.x + a2.x) * 0.5 * dt
  p.vel.y += (a1.y + a2.y) * 0.5 * dt
  p.vel.z += (a1.z + a2.z) * 0.5 * dt
  p.pos.x += (vx0 + vT.x) * 0.5 * dt
  p.pos.y += (vy0 + vT.y) * 0.5 * dt
  p.pos.z += (vz0 + vT.z) * 0.5 * dt
  return p
}
export function launchDir(yaw, pitch) {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
}
function missFor(origin, target, caliberMM, barrelM, mode, yaw, pitch) {
  const m = modeOf(mode)
  const speed = muzzleVelocity(barrelM) * m.velFrac
  const d = launchDir(yaw, pitch)
  const p = {
    pos: { x: origin.x, y: origin.y, z: origin.z },
    vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed },
    mass: projectileMass(caliberMM) * m.massFrac,
    area: frontalArea(caliberMM),
  }
  const dx = target.x - origin.x, dz = target.z - origin.z
  const horiz = Math.hypot(dx, dz)
  const ux = dx / horiz, uz = dz / horiz
  let prevAlong = 0, prevY = p.pos.y, prevX = p.pos.x, prevZ = p.pos.z
  let t = 0
  while (t < 220) {
    t += 0.02
    stepFlight(p, 0.02)
    const along = (p.pos.x - origin.x) * ux + (p.pos.z - origin.z) * uz
    if (along >= horiz && prevAlong < horiz) {
      const f = (horiz - prevAlong) / (along - prevAlong)
      const yCross = prevY + (p.pos.y - prevY) * f
      const lat = (prevX + (p.pos.x - prevX) * f - target.x) * -uz + (prevZ + (p.pos.z - prevZ) * f - target.z) * ux
      return { miss: yCross - target.y, lat, time: t - 0.02 + 0.02 * f }
    }
    if (p.pos.y <= 0) return { miss: -2, lat: (p.pos.x - target.x) * -uz + (p.pos.z - target.z) * ux, time: t }
    prevAlong = along
    prevY = p.pos.y
    prevX = p.pos.x
    prevZ = p.pos.z
  }
  return { miss: -10, lat: 0, time: t }
}
function solvePitch(origin, target, caliberMM, barrelM, mode, yaw) {
  const flat = missFor(origin, target, caliberMM, barrelM, mode, yaw, 0)
  if (flat.miss >= 0) return { pitch: 0, time: flat.time, lat: flat.lat }
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    let hi = 1.2 * i / steps
    const r = missFor(origin, target, caliberMM, barrelM, mode, yaw, hi)
    if (r.miss < 0) continue
    let lo = 1.2 * (i - 1) / steps
    for (let j = 0; j < 10; j++) {
      const mid = (lo + hi) / 2
      const m = missFor(origin, target, caliberMM, barrelM, mode, yaw, mid)
      if (Math.abs(m.miss) < 1) return { pitch: mid, time: m.time, lat: m.lat }
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
    if (Math.abs(sol.lat) < 1) return { dir: launchDir(yaw, sol.pitch), yaw, pitch: sol.pitch, flightTime: sol.time }
    yaw += Math.asin(clamp(sol.lat / horiz, -0.6, 0.6))
  }
  const sol = solvePitch(origin, target, caliberMM, barrelM, mode, yaw)
  return sol && Math.abs(sol.lat) < 5 ? { dir: launchDir(yaw, sol.pitch), yaw, pitch: sol.pitch, flightTime: sol.time } : null
}
export function effectiveRange(caliberMM, barrelM, mode) {
  const m = modeOf(mode)
  const speed = muzzleVelocity(barrelM) * m.velFrac
  const mass = projectileMass(caliberMM) * m.massFrac
  const area = frontalArea(caliberMM)
  let best = 0
  for (let i = 0; i <= 10; i++) {
    const pitch = 1.2 * i / 10
    const d = launchDir(0, pitch)
    const p = { pos: { x: 0, y: 1.7, z: 0 }, vel: { x: d.x * speed, y: d.y * speed, z: d.z * speed }, mass, area }
    let prevY = p.pos.y, prevZ = p.pos.z
    for (let t = 0; t < 220; t += 0.02) {
      stepFlight(p, 0.02)
      if (prevY > 2 && p.pos.y <= 2 && p.vel.y < 0) {
        const f = (prevY - 2) / (prevY - p.pos.y)
        best = Math.max(best, -(prevZ + (p.pos.z - prevZ) * f))
        break
      }
      prevY = p.pos.y
      prevZ = p.pos.z
      if (p.pos.y <= 0) break
    }
  }
  return Math.min(best, PHYS.RANGE_CAP)
}
