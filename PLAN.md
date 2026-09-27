# Turret Lab prototype

## Scope

Build a playable browser range with one configurable 3D turret, six distinct targets, aim selection, shot modes, a magazine, reload, score, and reset. Keep controls visible and test the complete action loop.

## Simulation boundary

This is a game prototype built on a normalized physics scaling model, not a real weapon simulator. Bore and barrel length drive derived behavior: projectile mass, muzzle velocity, energy, recoil, turret mass, inertia, drive response, reload, heat, and range. All constants are game-tuned scene values and must not be presented as real weapon performance.

## Design

- Three.js owns the rendered scene and target meshes.
- Rapier owns gravity and ground contact for decorative target debris after a target is cleared.
- `src/ballistics.js` is a pure physics module implementing the scaling equations in `TURRET_PHYSICS_EQUATIONS.md`: cube-law projectile mass, saturating barrel-length velocity curve, D²×L barrel mass, kinetic energy, momentum-based recoil with capacity ratio and recovery, component-sum moment of inertia, torque/power-limited traverse and elevation drives with gravity moment and equilibrator balance, Mach-dependent drag with wind, semi-implicit flight integration, a fire-control aim solver (drop plus windage), ballistic efficiency, impact energy from actual impact velocity, empirical penetration against target armor tiers, explosive payload scaling, the bottleneck firing-rate model, heat per shot over barrel thermal mass with cooling power, and magazine/refill handling time.
- `src/main.js` owns game state and presentation: derived stats rebuild on any control change, turret motors slew to the solver's ballistic aim solution, shots disperse from causal inputs (muzzle velocity variation, alignment while slewing, recoil overload), and damage lands from impact energy.
- One small state object owns game rules, ammo, selection, and projectiles.
- Target shape, armor tier, and integrity come from six fixed range entries.
- A single barrel group can be replaced later by a barrel layout. The module already accepts the concepts (component sums, per-mode rounds) without extra layout systems.
- The barrel model keeps its wider tube, tapered rear sleeve, and rear collar as visual cues.

Documented simplifications: the feed system is folded into loader handling, structural/balance factors are single aggregates, and flight runs in scene units with a fixed velocity scale so the real drag and gravity equations stay readable at game range. Coriolis, curvature, humidity, and other low-order effects stay out per the equations doc.

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
