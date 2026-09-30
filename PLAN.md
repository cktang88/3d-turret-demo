# Turret Lab prototype

## Scope

Build a playable browser range with one configurable 3D turret, six distinct targets, aim selection, shot modes, a magazine, reload, score, and reset. Keep controls visible and test the complete action loop.

## Simulation boundary

This is a game prototype built on a real-unit ballistics model, not a real weapon simulator. One scene unit is one meter. Bore and barrel length derive projectile mass (calibrated to published shell weights: 43.2 kg at 155 mm, 2.73 power law), muzzle velocity (saturating barrel-length curve, 803 m/s at 6 m versus 830 published for M795), energy, recoil, turret mass and inertia, drive response, reload, heat, and range. Targets sit at 6.5 to 28.5 km. All constants are game-tuned and must not be presented as real weapon performance.

## Design

- Three.js owns the rendered scene and target meshes.
- Rapier owns gravity and ground contact for decorative target debris after a target is cleared.
- `src/sim/` is a pure physics layer split into interacting systems: `constants.js` (calibration, wind, RNG), `structure.js` (barrel mass, component-sum inertia, gravity moment, drives), `interior.js` (velocity, energy, recoil, thermal, logistics), `flight.js` (Mach drag with altitude density, wind, Heun integration, fire-control solver, envelope), `terminal.js` (impact energy, penetration, splash), `derived.js` (one build summary). `src/ballistics.js` re-exports it.
- `src/camera-rig.js` owns the view state machine: aim view on the turret, follow camera chasing the shell (time-compressed flight), and a side plot view of the full trajectory arc after impact.
- `src/main.js` owns game state and presentation: derived stats rebuild on control change, motors slew to the solved ballistic aim with settle gating, shots disperse from causal inputs (0.2 percent muzzle velocity variation, 0.1 degree alignment), the camera follows the shell, and a shot report shows muzzle/launch speed, apex, flight time, aimed versus actual range, deviation, impact velocity and energy, and wind.
- Wind is rolled randomly per session (2 to 18 m/s), shown in the panel, and compensated by the fire-control solver; dispersion still produces realistic deviation at range.
- One small state object owns game rules, ammo, selection, and projectiles.
- Target shape, armor tier, and integrity come from six fixed range entries.
- A single barrel group can be replaced later by a barrel layout. The module already accepts the concepts (component sums, per-mode rounds) without extra layout systems.

Documented simplifications: the feed system is folded into loader handling, structural/balance factors are single aggregates, one propellant family drives the velocity curve (203 mm howitzers run about 24 percent hot), and dispersion is tighter than the published 139 m CEP so single shots stay playable. Coriolis, curvature, humidity, and other low-order effects stay out per the equations doc.

## Future game architecture

The player chooses physical design inputs; the game derives visible behavior. Three update rates:

1. **Build change:** Rebuild the display model and run `deriveBuild` for masses, inertia, drives, recoil, heat, reload, and range when a control changes.
2. **Shot:** Solve the ballistic aim (drop plus windage), apply causal dispersion, and launch one integrated projectile.
3. **Frame:** Integrate projectile flight with gravity, drag, and wind; run the motor model; update feedback.

This separation keeps future multi-barrel layouts possible without running build calculations each frame. Future visual ideas include heat glow, sight shake, and platform rocking. Those would be artistic effects driven by derived values, not predictions of real equipment.

Favor choices that noticeably change a single encounter. The current clear tradeoffs are focused versus burst shot mass and payload, magazine capacity versus refill, barrel length versus turret responsiveness and balance, and bore versus recoil, heat, and ammunition burden. Extreme designs are never forbidden; the equations punish them (a 600 mm build stalls elevation, overloads recoil, cycles in minutes, and traverses in degrees per second).

Changing magazine capacity during a fight does not add rounds. New slots fill on the next reload, preserving the visible capacity versus refill tradeoff.

Repeated shots raise barrel temperature from per-shot energy over barrel thermal mass; cooling power removes it. At high temperature firing pauses until it cools. Focused shots carry full mass and charge; burst shells are lighter, slower, and carry most of the explosive payload for area effects.

## Checks

1. Build succeeds.
2. Aim at a target, fire, see a projectile, hit, health change, and score change.
3. Switch modes and verify burst affects nearby targets.
4. Empty and reload the magazine.
5. Change every slider, then reset the range.
6. Inspect a browser screenshot and console errors.
