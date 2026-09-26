# Turret Lab prototype

## Scope

Build a playable browser range with one configurable 3D turret, six distinct targets, aim selection, shot modes, a magazine, reload, score, and reset. Keep controls visible and test the complete action loop.

## Simulation boundary

This is a game prototype. The bore slider changes appearance only. Movement speed, recoil animation, travel time, durability, and area effects are abstract game values. They must not be presented as real weapon data or used to infer real performance.

## Design

- Three.js owns the rendered scene and target meshes.
- Rapier owns gravity and ground contact for decorative target debris after a target is cleared.
- One small state object owns game rules, ammo, selection, and projectiles.
- Target shape and durability come from six fixed range entries.
- A single barrel group can be replaced later by a barrel layout. No extra layout system is needed yet.
- The barrel model gets a wider tube, tapered rear sleeve, and rear collar when the bore style increases. This is visual only. There is no structural mass, wall stress, bending, or support calculation.

The supplied `TURRET_PHYSICS_SCOPE_CHAT.md` describes coupled gun design, firing, flight, and terminal-response models. Those models are not implemented here. Rapier currently handles only generic target debris; the turret's movement, projectile path, and hit results remain game rules.

## Future game architecture

The player chooses parts and layout; the game derives visible behavior. Keep three update rates:

1. **Build change:** Rebuild the display model and compute abstract game stats when a control changes.
2. **Shot:** Create one animated shot and apply its selected game mode.
3. **Frame:** Move active shots, aim the turret, and update feedback.

This separation keeps future multi-barrel layouts possible without running build calculations each frame. Future visual ideas include barrel sway, heat glow, sight shake, platform rocking, and ammunition weight shifting the model's balance. Those would be artistic effects with game values, not predictions of real equipment.

Favor choices that noticeably change a single encounter. The current clear tradeoffs are focused versus burst shots and magazine capacity versus refill time. The bore and barrel sliders only change the 3D model, and the UI labels say so. Do not add hidden micro effects that players cannot perceive.

Changing magazine capacity during a fight does not add rounds. New slots fill on the next reload, preserving the visible capacity versus refill tradeoff.

Repeated shots now raise a visible game heat meter. At high heat, firing pauses until it cools; Focused adds more heat than Burst. This is an abstract sustained-fire rule, not a thermal calculation.

## Checks

1. Build succeeds.
2. Aim at a target, fire, see a projectile, hit, health change, and score change.
3. Switch modes and verify burst affects nearby targets.
4. Empty and reload the magazine.
5. Change every slider, then reset the range.
6. Inspect a browser screenshot and console errors.
