# Prototype tooling notes

- The workspace started empty, so there was no existing rendering or physics code to reuse.
- Installed `three@0.180.0` for scene rendering, geometry, lighting, and ray based target selection. Checked the installed package metadata and the relevant renderer and raycaster source under `node_modules/three/src`.
- Installed `vite@7.3.6` for local development and production bundling.
- Added `@dimforge/rapier3d-compat@0.20.0` for ordinary rigid-body motion and ground contacts on debris after a target is cleared. Checked its installed TypeScript API for initialization, world stepping, colliders, impulses, transforms, and body removal. The game steps Rapier at a fixed interval and copies body transforms to Three.js meshes.
- The browser game workflow supplied the Playwright client used for screenshots, state checks, and console error checks.

This research concerns browser game tooling only. Rapier does not make the turret or projectile rules physically predictive. The prototype has no real weapon engineering, ballistics, penetration, or explosive response model.
