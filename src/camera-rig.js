import * as THREE from 'three'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function createCameraRig(camera) {
  const rig = { mode: 'aim' }
  const smoothPos = new THREE.Vector3()
  const smoothLook = new THREE.Vector3()
  let blend = 1
  const orbit = { yaw: 0, pitch: 0, zoom: 1 }
  const aimPos = new THREE.Vector3(0, 9, 18)
  const aimLook = new THREE.Vector3(0, 1.5, -7)
  const mapCenter = new THREE.Vector3()
  let mapExtent = 20000
  const followTarget = new THREE.Vector3()
  let followDir = new THREE.Vector3(0, 0, -1)
  let followDist = 500
  let followRise = 90
  const plotCenter = new THREE.Vector3()
  let plotDist = 12000
  let plotHeight = 0
  const plotSide = new THREE.Vector3(1, 0, 0)
  const _o = new THREE.Vector3()
  const _q = new THREE.Quaternion()
  const _right = new THREE.Vector3()
  const _up = new THREE.Vector3(0, 1, 0)

  function applyOrbit(base, dist) {
    _o.copy(base).multiplyScalar(dist * orbit.zoom)
    if (orbit.yaw !== 0) {
      _q.setFromAxisAngle(_up, orbit.yaw)
      _o.applyQuaternion(_q)
    }
    if (orbit.pitch !== 0) {
      _right.copy(_o).cross(_up).normalize()
      if (_right.lengthSq() > 1e-6) {
        _q.setFromAxisAngle(_right, orbit.pitch)
        _o.applyQuaternion(_q)
      }
    }
    return _o
  }
  function blendTo(targetPos, lookTarget, dt) {
    blend = Math.min(1, blend + dt * 1.2)
    const k = 1 - Math.exp(-dt * (1.5 + blend * 3))
    smoothPos.lerp(targetPos, k)
    smoothLook.lerp(lookTarget, k)
    camera.position.copy(smoothPos)
    camera.lookAt(smoothLook)
  }
  rig.orbit = (dx, dy) => {
    orbit.yaw -= dx
    orbit.pitch = clamp(orbit.pitch + dy, -1.25, 1.25)
  }
  rig.zoomBy = (f) => { orbit.zoom = clamp(orbit.zoom * f, 0.3, 3) }
  rig.setMode = (mode, ctx) => {
    rig.mode = mode
    orbit.yaw = 0
    orbit.pitch = 0
    orbit.zoom = 1
    blend = 0
    if (mode === 'map' && ctx) {
      mapCenter.copy(ctx.center)
      mapExtent = ctx.extent
    }
    if (mode === 'follow' && ctx) {
      followTarget.copy(ctx.pos)
      followDir.set(ctx.vel.x, 0, ctx.vel.z)
      if (followDir.lengthSq() < 1) followDir.set(0, 0, -1)
      followDir.normalize()
      followDist = clamp(300 + Math.hypot(ctx.vel.x, ctx.vel.z) * 0.4, 250, 900)
      followRise = 90 + ctx.pos.y * 0.12
    }
    camera.getWorldDirection(_o)
    smoothLook.copy(smoothPos).addScaledVector(_o, 10)
  }
  rig.setAimView = (pos, lookAt) => {
    aimPos.copy(pos)
    aimLook.copy(lookAt)
  }
  rig.setPlot = (points) => {
    const box = new THREE.Box3()
    for (const p of points) box.expandByPoint(p)
    box.getCenter(plotCenter)
    plotCenter.y = (box.max.y + Math.max(0, box.min.y)) / 2
    const span = Math.max(500, Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z))
    const height = Math.max(100, box.max.y - Math.max(0, box.min.y))
    plotDist = Math.max(span * 0.85, height * 1.5) + 600
    plotHeight = height * 0.1
    const dx = box.max.x - box.min.x, dz = box.max.z - box.min.z
    plotSide.set(-dz, 0, dx)
    if (plotSide.lengthSq() < 1e-6) plotSide.set(1, 0, 0)
    plotSide.normalize()
  }
  rig.update = (dt, ctx) => {
    let targetPos
    let lookTarget
    if (rig.mode === 'aim') {
      targetPos = aimPos
      lookTarget = aimLook
    } else if (rig.mode === 'follow' && ctx) {
      followTarget.copy(ctx.pos)
      const speed = ctx.vel.length()
      if (speed > 5) {
        followDir.set(ctx.vel.x, 0, ctx.vel.z).normalize()
        followDist = clamp(300 + speed * 0.4, 250, 900)
      }
      followRise = 90 + ctx.pos.y * 0.12
      const base = new THREE.Vector3(-followDir.x, 0, -followDir.z).normalize().multiplyScalar(followDist)
      base.y = followRise
      const off = applyOrbit(base, 1)
      targetPos = followTarget.clone().add(off)
      lookTarget = new THREE.Vector3().copy(ctx.pos).addScaledVector(ctx.vel, 2)
    } else if (rig.mode === 'map') {
      const alt = mapExtent * 2.4 * orbit.zoom
      _o.set(0, alt, alt * 0.18)
      if (orbit.yaw !== 0) {
        _q.setFromAxisAngle(_up, orbit.yaw)
        _o.applyQuaternion(_q)
      }
      targetPos = mapCenter.clone().add(_o)
      lookTarget = mapCenter
    } else if (rig.mode === 'plot' && ctx && ctx.points.length > 1) {
      const off = applyOrbit(plotSide.clone().multiplyScalar(plotDist).add(new THREE.Vector3(0, plotHeight, 0)), 1)
      targetPos = plotCenter.clone().add(off)
      lookTarget = plotCenter
    }
    if (!targetPos) return
    blendTo(targetPos, lookTarget, dt)
  }
  return rig
}
