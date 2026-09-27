# Turret Lab

A browser based 3D target range prototype. Select a target in the scene or list, change the turret's visual setup, and clear the range.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Space** to fire, **Tab** to cycle targets, **R** to refill, and **F** for fullscreen. **Escape** leaves fullscreen.

This is a game prototype driven by a normalized physics scaling model. Bore and barrel length derive projectile mass, muzzle velocity, energy, recoil, turret inertia, drive response, reload, heat, and range. Constants are game-tuned scene values and must not be read as real weapon performance.

Rapier simulates the fall and ground contact of pieces from cleared targets. Everything else comes from the scaling equations in `src/ballistics.js`: turret motors accelerate against computed inertia with torque and power limits, shots fly under gravity, Mach-dependent drag, and wind from a fire-control solution, and impacts convert retained velocity into energy, penetration, and splash.

Magazine capacity trades more shots for a longer refill. Changing capacity does not grant free rounds. Repeated shots heat the barrel; heavy barrels absorb more, and firing pauses while it cools. Focused shots carry full mass and charge; burst shells are lighter with more explosive payload.

The workshop panel lists the derived stats for the current design. Extreme designs are allowed and the equations explain why they are terrible.

See [PLAN.md](PLAN.md) for scope and [RESEARCH.md](RESEARCH.md) for tooling notes.
