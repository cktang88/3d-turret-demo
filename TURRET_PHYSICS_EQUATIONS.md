# Turret Game Physics Scaling Model

The goal is to build a **normalized scaling model** rather than pretend there is one exact equation covering every cannon design.

The highest-value mechanics are the ones that strongly affect:

* damage / penetration
* range
* accuracy
* rate of fire
* turret responsiveness
* survivability
* sustained fire
* ammunition capacity
* total turret mass

A good rule of thumb is:

> If changing a parameter by 2× does not create a clearly noticeable gameplay consequence, it probably does not need to be simulated explicitly.

---

## Core Normalized Variables

Define every weapon relative to some reference design:

```text
d = D / D0
l = L / L0
m = Mp / Mp0
u = v / v0
```

Where:

* `D` = caliber
* `L` = barrel length
* `Mp` = projectile mass
* `v` = muzzle velocity
* `D0`, `L0`, etc. = reference weapon values

This makes scaling and tuning much easier.

---

# High-Level Relationships

| Player changes                | Quick-and-dirty relationship                                                                                                             | Major consequences                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Caliber ↑**                 | Similar projectile mass/volume ~ `D³`; frontal area ~ `D²`; barrel structural mass roughly ~ `D² × L`                                    | Projectile mass ↑, damage ↑, ammo size ↑, recoil ↑, barrel mass ↑              |
| **Barrel length ↑**           | Barrel mass ~ `L`; muzzle velocity rises with diminishing returns; inertia penalty increases strongly as mass extends farther from pivot | Muzzle velocity ↑, range ↑, barrel mass ↑, traverse/elevation responsiveness ↓ |
| **Projectile mass ↑**         | Energy ~ `M × v²`; momentum/recoil ~ `M × v`; loading burden increases with mass                                                         | Penetration/energy ↑, recoil ↑, reload slower                                  |
| **Muzzle velocity ↑**         | Energy ~ `v²`; recoil momentum ~ `v`; drag ~ approximately `v²` before Mach effects                                                      | Range ↑, penetration ↑, recoil ↑, heat/wear ↑                                  |
| **Number of barrels ↑**       | Gun-group mass ~ `N`; theoretical burst output ~ `N`; ammo consumption ~ `N`                                                             | Burst output ↑, turret mass/inertia ↑, ammo consumption ↑                      |
| **Recoil system capacity ↑**  | More recoil-management mass/volume allows larger impulse or quicker recovery                                                             | Turret mass ↑, turret size ↑, recovery improves                                |
| **Loader power ↑**            | Reload speed improves with diminishing returns                                                                                           | ROF ↑, power/mass/volume ↑                                                     |
| **Magazine size ↑**           | Ammo mass ~ `round count × round mass`; ammo volume approximately linear with count                                                      | Endurance ↑, turret mass/volume ↑                                              |
| **Cooling ↑**                 | Sustainable ROF approximately scales with heat-removal capacity / heat generated per shot                                                | Sustained ROF ↑, cooling mass/power/volume ↑                                   |
| **Armor thickness ↑**         | Armor mass ~ `area × thickness × density`                                                                                                | Survivability ↑, turret mass/inertia ↑, traverse performance ↓                 |
| **Traverse motor ↑**          | Angular acceleration = torque / inertia                                                                                                  | Responsiveness ↑, power/mass ↑                                                 |
| **Projectile aerodynamics ↑** | Drag deceleration ~ `Cd × A × v² / M`                                                                                                    | Range ↑, retained velocity ↑                                                   |

---

# 1. Caliber Scaling

For geometrically similar projectiles:

```text
Projectile mass ~ D³
Projectile volume ~ D³
Frontal area ~ D²
```

Mathematically:

```text
Mp ∝ D³
A ∝ D²
Vammo ∝ D³
```

So if caliber doubles:

```text
D2 / D1 = 2
```

then approximately:

```text
Projectile mass multiplier = 2³ = 8×
Projectile volume multiplier = 2³ = 8×
Projectile frontal area multiplier = 2² = 4×
```

This is one of the strongest scaling effects in the entire game.

A 200 mm gun is therefore not simply "twice as big" as a 100 mm gun.

Its geometrically similar projectile can be roughly **8× heavier**.

---

# 2. Barrel Structural Mass

A useful simplified barrel-mass relationship is:

```text
Mbarrel ≈ Mbarrel0 × (D / D0)² × (L / L0) × Sp
```

Where:

* `Mbarrel` = barrel mass
* `D` = caliber
* `L` = barrel length
* `Sp` = structural / pressure multiplier
* `Sp = 1` for a baseline gun

Conceptually:

```text
Mbarrel ∝ D² × L × structural_requirement
```

Higher caliber requires a larger tube.

Higher chamber pressure requires stronger/thicker chamber and barrel structure.

Longer barrels also need additional stiffness to support their own weight.

The breech/chamber end should generally be much heavier than the muzzle end.

A tapered barrel is therefore preferable to treating the whole barrel as a uniform cylinder.

---

# 3. Projectile Kinetic Energy

Use ordinary kinetic energy:

```text
Ek = 0.5 × Mp × v²
```

Normalized:

```text
E / E0 =
(Mp / Mp0) × (v / v0)²
```

Examples:

```text
+20% projectile mass
→ approximately +20% kinetic energy
```

but:

```text
+20% muzzle velocity
→ 1.2²
→ 1.44× energy
→ +44%
```

So velocity has a very strong effect.

This makes high-velocity guns attractive, but other systems should make that velocity expensive.

---

# 4. Recoil

A simple recoil-impulse score should primarily follow projectile momentum:

```text
p = Mp × v
```

Normalized:

```text
R = (Mp / Mp0) × (v / v0)
```

For the game:

```text
RecoilImpulse = kr × Mp × v
```

Where:

* `kr` = tunable recoil coefficient accounting for effects not explicitly simulated

Do not make recoil directly proportional to kinetic energy.

This gives an important distinction:

```text
Projectile energy ~ v²
Recoil momentum ~ v
```

Therefore velocity improves projectile energy faster than it increases momentum recoil.

---

# 5. Barrel Length → Muzzle Velocity

Do NOT use:

```text
v ∝ barrel length
```

Velocity should show diminishing returns.

A useful approximation is:

```text
v(L) = vmax × (1 - exp(-k × L / L0))
```

Where:

* `vmax` = theoretical velocity asymptote for the ammunition / propellant family
* `k` = tuning constant
* `L0` = reference barrel length

Behavior:

```text
Very short barrel:
adding length helps enormously

Medium barrel:
adding length still helps

Extremely long barrel:
very little extra velocity
```

Meanwhile barrel mass continues increasing.

That naturally creates an optimum region without requiring artificial limits.

---

# 6. Barrel Length → Turret Inertia

Moment of inertia is:

```text
I = Σ(m × r²)
```

Where:

* `m` = component mass
* `r` = distance from the rotation axis

This is one of the most important mechanics in the game.

If the same mass moves twice as far from the axis:

```text
Inertia multiplier = 2² = 4×
```

So long barrels should hurt responsiveness much more than their raw mass suggests.

For implementation, divide the weapon into components:

```text
Turret shell
Breech
Barrel segment 1
Barrel segment 2
Barrel segment 3
Recoil system
Ammo rack
Loader
Armor
Traverse machinery
Other components
```

Then calculate:

```text
I = Σ(m_i × r_i²)
```

This is cheap enough to calculate directly and creates excellent emergent behavior.

---

# 7. Traverse and Elevation Dynamics

Angular acceleration follows:

```text
α = τ / I
```

Where:

* `α` = angular acceleration
* `τ` = available motor torque
* `I` = moment of inertia

Therefore:

```text
More motor torque
→ faster acceleration

More turret inertia
→ slower acceleration
```

Motor power also matters:

```text
P = τ × ω
```

Where:

* `P` = motor power
* `τ` = torque
* `ω` = angular velocity

A useful motor model is:

```text
AvailableTorque =
min(
    MaximumTorque,
    MaximumPower / max(AngularVelocity, epsilon)
)
```

Then:

```text
AngularAcceleration =
(AvailableTorque - ResistanceTorque) / MomentOfInertia
```

This means:

* torque dominates low-speed acceleration
* power increasingly limits high-speed operation
* a huge turret may still eventually rotate quickly
* but it may take a long time to accelerate or stop

Do not make turret traverse simply:

```text
rotationSpeed = fixed value
```

Derive it from torque, power, inertia, gearing, and resistance.

---

# 8. Gun Balance and Barrel Weight

A long barrel also creates a large pitching moment around the elevation trunnion.

Approximate:

```text
PitchingMoment = Σ(m × g × horizontal_distance_from_trunnion)
```

A longer/heavier barrel therefore requires some combination of:

```text
Larger breech
Counterweight
Equilibrator
Different trunnion position
Stronger elevation motor
```

This should affect:

* elevation acceleration
* total turret mass
* turret dimensions
* required motor power

---

# 9. Number of Barrels

Start with:

```text
Mgun_group ≈ N × Msingle_gun + Mshared_equipment
```

Theoretical burst rate:

```text
ROFburst <= N × ROFper_barrel
```

Ammo consumption:

```text
AmmoConsumptionRate ~ N
```

Heat generation at equal per-barrel fire rate:

```text
HeatRate ~ N
```

But sustained fire should not automatically scale perfectly with barrel count.

Actual ROF should be:

```text
ROFactual =
min(
    ROFmechanical,
    ROFloader,
    ROFfeed,
    ROFthermal
)
```

For multiple barrels, each barrel can have its own thermal and recoil state.

---

# 10. Reloading

Do not model reload time as one arbitrary number.

Use:

```text
ReloadTime =
FixedCycleTime +
HandlingTime
```

A simple game approximation:

```text
HandlingTime ∝
RoundMass^a / LoaderPower^b
```

Suggested tuning ranges:

```text
a ≈ 0.7 to 1.0
b ≈ 0.4 to 0.7
```

These are gameplay tuning parameters, NOT universal physical constants.

Then:

```text
ROF = 60 / ReloadTimeSeconds
```

Example:

```text
ReloadTime = 3 seconds

ROF = 60 / 3
ROF = 20 rounds/minute
```

Loader improvements should have diminishing returns.

Do not allow:

```text
2× loader power = 2× ROF forever
```

Eventually fixed mechanical cycle times dominate.

---

# 11. Magazine Size

Magazine mass:

```text
Mmagazine_total =
Mmagazine_structure +
Nrounds × Mround
```

Magazine volume:

```text
Vmagazine ≈
Nrounds × Vround × Kpacking
```

Where:

* `Kpacking > 1`
* represents racks, spacing, loader access, mechanisms, empty space, etc.

For similarly shaped ammunition:

```text
Vround ∝ D³
```

This makes very large calibers rapidly consume enormous internal volume.

---

# 12. Heat

A simple thermal model uses:

```text
Q = M × Cp × ΔT
```

Therefore:

```text
ΔT = Q / (M × Cp)
```

Where:

* `Q` = heat absorbed
* `M` = barrel thermal mass
* `Cp` = material specific heat
* `ΔT` = temperature increase

Give every shot a heat contribution:

```text
Qshot = kh × ShotEnergy
```

Where:

* `kh` = tunable heat fraction

Then remove heat over time:

```text
Qcool_per_second
```

Temperature update:

```text
Heat += Qshot

Heat -= CoolingRate × dt
```

Approximate thermal sustained rate:

```text
ROFthermal ∝
CoolingPower / HeatPerShot
```

This gives intuitive behavior:

```text
2× cooling capacity
≈ approximately 2× thermal sustained ROF
```

until another bottleneck becomes dominant.

---

# 13. Barrel Thermal Capacity

A heavier barrel can absorb more heat before reaching the same temperature.

Because:

```text
ΔT = Q / (M × Cp)
```

If barrel mass doubles:

```text
same heat input
→ approximately half the temperature rise
```

So heavy barrels naturally support longer bursts.

Tradeoff:

```text
Thicker/heavier barrel
→ better thermal endurance
→ worse turret inertia
→ worse elevation/traverse responsiveness
```

This is a very good gameplay tradeoff.

---

# 14. Cooling Systems

Cooling can increase:

```text
CoolingRate
```

but should add:

```text
Mass
Volume
Power consumption
Complexity
```

Sustainable ROF is:

```text
ROFsustained =
min(
    ROFmechanical,
    ROFloader,
    ROFfeed,
    ROFthermal
)
```

This allows weapons with enormous theoretical cyclic rate to have much lower sustainable rates.

---

# 15. Armor Mass

Armor mass is straightforward:

```text
Marmor = Density × Area × Thickness
```

So:

```text
Marmor ∝ Thickness
```

for unchanged area and material.

Example:

```text
2× armor thickness
≈ 2× armor mass
```

However, armor location matters because of moment of inertia.

Armor placed farther from the turret axis contributes:

```text
I ~ m × r²
```

Therefore increasing turret radius can be especially expensive.

---

# 16. Ammunition Weight

Total ammunition mass:

```text
Mammo =
Nrounds × Mround
```

If geometrically similar rounds scale with caliber:

```text
Mround ~ D³
```

Then:

```text
Mammo ~ Nrounds × D³
```

This makes large-caliber magazines extremely expensive in mass.

---

# 17. Projectile Drag

Use the drag equation:

```text
Fd =
0.5 × ρ × Cd × A × v²
```

Where:

* `ρ` = air density
* `Cd` = drag coefficient
* `A` = projectile frontal area
* `v` = projectile velocity relative to air

Projectile drag acceleration:

```text
ad =
Fd / Mp
```

Therefore:

```text
ad =
ρ × Cd × A × v²
----------------
     2 × Mp
```

This shows that projectile aerodynamic performance strongly depends on:

```text
Mp / (Cd × A)
```

Higher is generally better for retaining velocity.

Therefore:

```text
Higher mass → less deceleration
Lower Cd → less deceleration
Smaller frontal area → less deceleration
```

---

# 18. Projectile Flight Integration

Instead of using a simple parabola, integrate projectile motion every physics step.

Basic acceleration:

```text
a =
gravity +
drag
```

With wind:

```text
RelativeAirVelocity =
ProjectileVelocity - WindVelocity
```

Then:

```text
DragForce =
-0.5
× AirDensity
× Cd
× FrontalArea
× |RelativeAirVelocity|
× RelativeAirVelocity
```

And:

```text
Acceleration =
Gravity +
DragForce / ProjectileMass
```

Numerically integrate:

```text
Velocity += Acceleration × dt
Position += Velocity × dt
```

A better integrator such as semi-implicit Euler or RK methods can be used later.

---

# 19. Mach-Dependent Drag

Do not use one constant `Cd` across every projectile velocity.

Instead:

```text
Cd = f(Mach)
```

For example:

```text
Mach < 0.8
→ subsonic Cd curve

Mach 0.8–1.2
→ transonic drag increase

Mach > 1.2
→ supersonic Cd curve
```

A lookup table or interpolation curve is sufficient.

You do not need full computational fluid dynamics.

---

# 20. Projectile Aerodynamic Quality

Define a simple ballistic-quality quantity:

```text
BallisticEfficiency =
ProjectileMass
------------------------------
Cd × FrontalArea
```

Higher value:

```text
→ better retained velocity
→ longer effective range
→ higher impact energy at distance
```

This is far more useful than simply making:

```text
"good projectile" = +20% range
```

---

# 21. Effective Impact Energy

At impact:

```text
ImpactEnergy =
0.5 × ProjectileMass × ImpactVelocity²
```

Do NOT use muzzle energy as damage at all ranges.

Calculate impact velocity through projectile flight.

Then:

```text
ImpactEnergy < MuzzleEnergy
```

depending on:

* range
* aerodynamic quality
* atmosphere
* wind
* trajectory

This means two projectiles with equal muzzle energy can perform very differently at long range.

---

# 22. Penetration

Do not make:

```text
Penetration = caliber
```

Instead penetration should depend on things such as:

```text
Projectile mass
Impact velocity
Projectile type
Projectile geometry
Impact angle
Target material
Target thickness
```

For gameplay, use an empirical penetration model rather than attempting to simulate actual fracture mechanics.

Conceptually:

```text
PenetrationScore =
f(
    ProjectileMass,
    ImpactVelocity,
    ProjectileType,
    ProjectileGeometry,
    ImpactAngle,
    TargetMaterial
)
```

---

# 23. Explosive Damage

For explosive ammunition, separate kinetic performance from explosive payload.

Conceptually:

```text
TotalDamage =
KineticEffect +
ExplosiveEffect +
FragmentationEffect
```

Explosive capacity will broadly increase with available projectile internal volume.

For similarly shaped ammunition:

```text
ProjectileVolume ~ D³
```

but projectile construction determines how much of that volume can actually be explosive payload.

---

# 24. Recoil System

Avoid modeling detailed hydraulic engineering.

Instead calculate:

```text
RecoilDemand =
ProjectileMomentum × RecoilCoefficient
```

Then:

```text
RecoilCapacity =
f(
    RecoilSystemMass,
    RecoilTravel,
    StructuralStrength
)
```

Define:

```text
RecoilCapacityRatio =
RecoilCapacity / RecoilDemand
```

Example consequences:

```text
Ratio >= 1
→ normal operation

Ratio somewhat below 1
→ longer recovery / worse accuracy / more stress

Ratio far below 1
→ structural overload / inability to fire safely
```

This is much easier for players to understand.

---

# 25. Recoil Recovery

A useful approximation:

```text
RecoilRecoveryTime =
BaseRecoveryTime ×
RecoilDemand / RecoilSystemCapacity
```

Clamp it to sensible ranges.

Then:

```text
ROFrecoil =
60 / RecoilRecoveryTime
```

Actual firing rate:

```text
ROFactual =
min(
    ROFloader,
    ROFmechanical,
    ROFrecoil,
    ROFthermal,
    ROFfeed
)
```

---

# 26. Why Extremely Large Guns Become Impractical

There does not need to be an artificial caliber maximum.

The scaling relationships create the limit naturally.

If:

```text
Projectile mass ~ D³
```

then going from:

```text
300 mm → 1000 mm
```

gives a geometrically scaled projectile ratio of:

```text
(1000 / 300)³
≈ 37×
```

That cascades into:

```text
Projectile mass ↑
Ammo volume ↑
Loader burden ↑
Barrel mass ↑
Breech mass ↑
Recoil demand ↑
Magazine mass ↑
Magazine volume ↑
Turret inertia ↑
Traverse power ↑
Elevation power ↑
Structural mass ↑
```

So a 1000 mm cannon is not impossible because of an arbitrary rule.

It becomes increasingly impractical because the supporting system grows enormously.

---

# 27. Why Many Large Barrels Become Impractical

For a turret with `N` large barrels:

```text
Barrel mass ~ N
Breech mass ~ N
Recoil systems ~ approximately N
Ammo consumption ~ N
Theoretical burst output ~ N
```

But turret dimensions also grow.

Larger dimensions increase the distance of mass from the rotation axis.

Since:

```text
I = Σ(m × r²)
```

turret inertia can increase faster than raw mass alone.

Therefore a `10 × 300 mm` turret can become extremely sluggish even before ammunition handling is considered.

---

# 28. Why Rate of Fire Cannot Increase Forever

Actual firing rate should be determined by multiple bottlenecks:

```text
ROFactual =
min(
    ROFmechanical,
    ROFloader,
    ROFfeed,
    ROFrecoil,
    ROFthermal
)
```

This is one of the most important game equations.

A gun might theoretically cycle extremely quickly but be limited by:

```text
Loader speed
Ammunition handling
Recoil recovery
Cooling
Magazine feed rate
```

This also allows realistic burst-vs-sustained behavior.

---

# 29. Burst ROF vs Sustained ROF

Track both.

```text
BurstROF =
min(
    MechanicalROF,
    LoaderROF,
    FeedROF,
    RecoilROF
)
```

while:

```text
SustainedROF =
min(
    BurstROF,
    ThermalROF,
    LongTermAmmoSupplyROF
)
```

This means a weapon might fire:

```text
very fast for 3 seconds
```

but only sustain:

```text
a much slower average rate indefinitely
```

---

# 30. Recommended Core Equations for V1

You can get most of the believable behavior with roughly these equations.

## Projectile scaling

```text
Mp ~ D³
```

## Ammo volume

```text
Vammo ~ D³
```

## Barrel mass

```text
Mbarrel ~ D² × L × StructuralMultiplier
```

## Kinetic energy

```text
Ek = 0.5 × Mp × v²
```

## Recoil impulse

```text
Jrecoil ~ Mp × v
```

## Moment of inertia

```text
I = Σ(m × r²)
```

## Angular acceleration

```text
α = τ / I
```

## Motor power

```text
P = τ × ω
```

## Armor mass

```text
Marmor = Density × Area × Thickness
```

## Aerodynamic drag

```text
Fd = 0.5 × ρ × Cd × A × v²
```

## Temperature rise

```text
ΔT = Q / (M × Cp)
```

## Actual firing rate

```text
ROF =
min(
    ROFmechanical,
    ROFloader,
    ROFfeed,
    ROFrecoil,
    ROFthermal
)
```

## Barrel-length velocity curve

```text
v(L) =
vmax × (1 - exp(-k × L / L0))
```

---

# 31. Strongest Scaling Effects

These are probably the highest-order mechanics players will actually feel.

```text
D³
Caliber → projectile/ammunition volume and mass
```

```text
v²
Projectile velocity → kinetic energy
```

```text
r²
Distance from turret axis → rotational inertia
```

```text
v²
Projectile speed → aerodynamic drag
```

```text
D² × L
Approximate barrel structural mass
```

```text
t
Armor thickness → armor mass
```

```text
Nrounds
Magazine capacity → ammunition mass
```

```text
Nbarrels
Barrel count → burst output, gun-group mass, ammo consumption
```

These should probably dominate V1.

---

# 32. Mechanics Worth Simplifying or Ignoring Initially

Do NOT spend major development effort on these in V1 unless they become important later:

```text
Coriolis force
Earth curvature
Humidity
Detailed projectile nutation
Yaw of repose
Detailed aerodynamic jump
Detailed muzzle-gas flow
Pressure-wave oscillation inside barrel
Detailed barrel vibration modes
Detailed turret-ring deformation
Detailed recoil-fluid simulation
Manufacturing tolerances
Projectile microscopic imbalance
Exact combustion chemistry
Full CFD
Full finite-element barrel simulation
```

Roll these into larger aggregate values such as:

```text
Dispersion
Reliability
StructuralMultiplier
DragCoefficient
HeatCoefficient
WearRate
```

if needed.

---

# 33. Recommended Player Inputs

Players should control physical design parameters such as:

```text
Caliber
Barrel length
Projectile type
Projectile mass / construction
Propellant / velocity target
Number of barrels
Barrel arrangement
Recoil-system size
Magazine capacity
Loader size / power
Cooling system
Turret armor
Traverse drive size
Elevation drive size
Turret dimensions
```

Do NOT primarily expose arbitrary derived stats such as:

```text
"Reload speed"
"Turret speed"
"Damage"
"Range"
```

Those should mostly emerge from the design.

---

# 34. Recommended Derived Stats

From the player's design, calculate:

```text
Projectile mass
Muzzle velocity
Muzzle energy
Recoil impulse
Barrel mass
Gun-group mass
Turret mass
Moment of inertia
Traverse acceleration
Elevation acceleration
Maximum practical traverse speed
Reload time
Burst ROF
Sustained ROF
Magazine mass
Magazine volume
Cooling requirement
Heat generation
Effective range
Projectile retained velocity
Impact energy
Approximate penetration
Structural load
Power consumption
```

---

# 35. Core Design Philosophy

The player should be allowed to create ridiculous weapons.

Do not simply say:

```text
"500 mm × 4 is invalid."
```

Instead allow it to exist and let the equations produce the consequences:

```text
Huge projectile mass
Huge recoil
Huge barrel mass
Huge breeches
Huge autoloader
Huge ammunition magazine
Huge turret
Very high rotational inertia
Slow traverse
Slow elevation
Massive power requirements
Slow reload
Rapid ammunition depletion
Extreme structural requirements
```

Likewise, do not artificially prohibit extreme firing rates.

Let the limiting system determine the result:

```text
Loader
Feed system
Mechanical cycling
Recoil recovery
Cooling
Ammunition supply
```

The interesting gameplay comes from allowing extreme designs and having the physics explain why they are good, bad, specialized, or absurd.
