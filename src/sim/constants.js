export const PHYS = {
  MASS_ANCHOR: { caliber: 155, kg: 43.2, exp: 2.73 },
  L0: 5,
  VMAX: 1150, K_VEL: 1,
  M_BARREL: 300, SP: 1,
  KR: 1.3, REC_CAP_PER_KG: 80, REC_BASE: 0.5, REC_OVERLOAD: 0.45,
  TAU_YAW: 30000, P_YAW: 55000, OMEGA_YAW_MAX: 1.9, DRAG_TORQUE: 900,
  TAU_ELEV: 18000, P_ELEV: 22000, OMEGA_ELEV_MAX: 1.25, DRAG_TORQUE_E: 120,
  BALANCE_FRACTION: 0.72,
  REF_ROUND_CALIBER: 60,
  LOADER_FIXED: 0.06, HANDLE_BASE: 0.5, A_MASS: 0.85, B_LOADER: 0.55, CASE_FACTOR: 1.4,
  MECH_BASE: 0.22, MECH_EXP: 0.25,
  REFILL_BASE: 0.9, REFILL_PER: 0.12, REFILL_EXP: 0.6,
  KH: 0.25, CP_STEEL: 460, COOL_W: 60000, HEAT_LOCK: 80,
  G: 9.81, RHO: 1.225, SOUND: 340, RHO_SCALE_HEIGHT: 8500, CD_FORM: 1,
  WIND: { x: 0, y: 0, z: 0 },
  SIGMA_V: 0.002, SIGMA_ANG: 0.0018,
  PEN_K: 0.012, DMG_K: 8.5, SPLASH_K: 21, SPLASH_BASE: 25,
  PAYLOAD_FOCUSED: 0.06, PAYLOAD_BURST: 0.22,
  ARMOR: { LIGHT: 8, MEDIUM: 22, HEAVY: 40 },
  RANGE_CAP: 80000,
  MODE: {
    focused: { massFrac: 1, velFrac: 1, payload: 0.06 },
    burst: { massFrac: 0.45, velFrac: 0.8, payload: 0.22 },
  },
}

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }
export function modeOf(mode) { return PHYS.MODE[mode] ?? PHYS.MODE.focused }
export function projectileMass(caliberMM) {
  const a = PHYS.MASS_ANCHOR
  return a.kg * (caliberMM / a.caliber) ** a.exp
}
export function roundMass(caliberMM, mode) { return projectileMass(caliberMM) * PHYS.CASE_FACTOR * modeOf(mode).massFrac }
export function gauss() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
export function setWind(speed, headingRad) {
  PHYS.WIND.x = speed * Math.cos(headingRad)
  PHYS.WIND.z = speed * Math.sin(headingRad)
}
export function windSpeed() { return Math.hypot(PHYS.WIND.x, PHYS.WIND.z) }
export function windHeading() { return Math.atan2(PHYS.WIND.z, PHYS.WIND.x) }
