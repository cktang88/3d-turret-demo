Original prompt: Build a 3D turret game prototype with configurable turret, varied targets, and future room for multiple barrels.

Decision: Use abstract game rules for motion, impacts, durability, and timing. Bore values affect appearance only; this is not a real weapon simulator.

Implemented: Three.js range, single visual barrel, six targets, shot modes, magazine, reload, score, reset, target list, keyboard controls, and responsive camera.

Verified: Production build; browser game client with a shot and target clear; desktop and mobile screenshots; end-to-end focused/burst mode, sliders, reload, and reset. A target-list click bug was fixed by updating the list only when selection or health changes.

Added a visible game tradeoff: larger magazines hold more shots and take longer to refill. The barrel's width and rear collar are visual cues only; structural loads are not modeled.

Final browser checks: scene target selection, Tab cycling, fullscreen and Escape, large magazine refill, and all earlier end-to-end scenarios passed with no page errors.

Continuation: Checked both ends of the bore and barrel sliders in the browser. Fixed the barrel mesh so the rear is wider than the muzzle and added a tapered rear sleeve. Build and game loop passed; the change is visual only.

Resumed from the user's pasted design notes: fixed magazine changes granting free rounds during a fight. New slots fill on reload. Verified build, browser shot loop, and a capacity-change → shot → resize → reload sequence with no page errors.

Added an abstract heat meter so sustained fire matters in a fight. Verified lockout, cooldown, Focused/Burst difference, reset, desktop and mobile layout, and no browser errors.

Read the supplied physics scope at its main model and priority sections. Added Rapier for cleared-target debris only, with fixed-step gravity and ground contact. Verified fall, contact, reset cleanup, replay, build, and browser capture. Gun engineering and ballistic relationships remain unimplemented.

Next: Keep future additions within abstract game rules. If adding multi-barrel layouts, change the barrel display model and shot presentation without duplicating game state.
