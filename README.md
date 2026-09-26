# Turret Lab

A browser based 3D target range prototype. Select a target in the scene or list, change the turret's visual setup, and clear the range.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Space** to fire, **Tab** to cycle targets, **R** to refill, and **F** for fullscreen. **Escape** leaves fullscreen.

This is a game prototype. Its motion, target integrity, timing, and shot effects use abstract game rules. Bore and barrel controls change the display model only.

Rapier simulates the fall and ground contact of pieces from cleared targets. It does not calculate turret mass, rotation, projectile flight, or armor response.

Magazine capacity trades more shots for a longer refill. Changing capacity does not grant free rounds. Repeated shots fill a game heat meter and can briefly pause firing; Burst builds less heat than Focused.

See [PLAN.md](PLAN.md) for scope and [RESEARCH.md](RESEARCH.md) for tooling notes.
