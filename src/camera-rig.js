import * as THREE from 'three'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function createCameraRig(camera) {
  const aimPos = new THREE.Vector3()
  const aimLook = new THREE.Vector3()
  const smoothPos = new THREE.Vector3()
  const smoothLook = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const back = new THREE.Vector3()
  const target = new THREE.Vector3()
  const look = new THREE.Vector3()
  let blend = 0

  const rig = {
    mode: 'aim',
    setMode(mode) {
      rig.mode = mode
      blend = 0
      smoothPos.copy(camera.position)
      camera.getWorldDirection(dir)
      smoothLook.copy(smoothPos).addScaledVector(dir, 10)
    },
    setAimView(pos, lookAt) {
      aimPos.copy(pos)
      aimLook.copy(lookAt)
    },
    update(dt, ctx) {
      if (dt <= 0) {
        camera.position.copy(smoothPos)
        camera.lookAt(smoothLook)
        return
      }
      blend = Math.min(1, blend + dt * 1.2)
      const k = 1 - Math.exp(-dt * (1.5 + blend * 3))
      let targetPos
      let lookTarget
      if (rig.mode === 'follow' && ctx) {
        const speed = ctx.vel.length()
        back.set(ctx.vel.x, 0, ctx.vel.z)
        const h = back.length()
        if (speed < 5 || h < 1e-6) back.set(0, 0, 1)
        else back.divideScalar(h)
        const d = clamp(300 + speed * 0.4, 250, 900)
        targetPos = target.copy(ctx.pos).addScaledVector(back, -d)
        targetPos.y += 90 + ctx.pos.y * 0.12
        lookTarget = look.copy(ctx.pos).addScaledVector(ctx.vel, 2)
      } else if (rig.mode === 'plot' && ctx) {
        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        for (const p of ctx.points) {
          minX = Math.min(minX, p.x)
          maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y)
          maxY = Math.max(maxY, p.y)
          minZ = Math.min(minZ, p.z)
          maxZ = Math.max(maxZ, p.z)
        }
        const cx = (minX + maxX) / 2
        const cy = (maxY + Math.max(0, minY)) / 2
        const cz = (minZ + maxZ) / 2
        const hd = Math.hypot(maxX - minX, maxZ - minZ)
        const span = Math.max(500, hd)
        const nx = hd > 1e-6 ? (maxX - minX) / hd : 0
        const nz = hd > 1e-6 ? (maxZ - minZ) / hd : 1
        const reach = span * 0.75 + 1500
        targetPos = target.set(cx - nz * reach, cy + (maxY - Math.max(0, minY)) * 0.25 + 400, cz + nx * reach)
        lookTarget = look.set(cx, cy, cz)
      } else {
        targetPos = target.copy(aimPos)
        lookTarget = look.copy(aimLook)
      }
      smoothPos.lerp(targetPos, k)
      smoothLook.lerp(lookTarget, k)
      camera.position.copy(smoothPos)
      camera.lookAt(smoothLook)
    }
  }

  return rig
}
