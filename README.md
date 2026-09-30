# Turret Lab

A browser based 3D target range prototype. Select a target in the scene or list, change the turret's visual setup, and clear the range.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Space** to fire, **Tab** to cycle targets, **R** to refill, and **F** for fullscreen. **Escape** leaves fullscreen.

This is a game prototype driven by a real-unit ballistics model calibrated against published artillery data. One unit is one meter, targets sit at 6.5 to 28.5 km, and bore plus barrel length derive projectile mass, muzzle velocity, energy, recoil, turret inertia, drive response, reload, heat, and range. Constants are game-tuned and must not be read as real weapon performance.

Rapier simulates the fall and ground contact of pieces from cleared targets. Everything else comes from the systems in `src/sim/`: turret motors accelerate against computed inertia with torque and power limits, shells fly under gravity, Mach-dependent drag with altitude density, and random wind from a fire-control solution, and impacts convert retained velocity into energy, penetration, and splash.

On fire the camera follows the shell, then a side view shows the full trajectory with a shot report: muzzle and impact speed, apex, flight time, aimed versus actual range, deviation, impact energy, and wind.

Magazine capacity trades more shots for a longer refill. Changing capacity does not grant free rounds. Repeated shots heat the barrel; heavy barrels absorb more, and firing pauses while it cools. Focused shots carry full mass and charge; burst shells are lighter, shorter-ranged, and carry more explosive payload.

The workshop panel lists the derived stats for the current design. Extreme designs are allowed and the equations explain why they are terrible.

See [PLAN.md](PLAN.md) for scope and [RESEARCH.md](RESEARCH.md) for tooling notes.
