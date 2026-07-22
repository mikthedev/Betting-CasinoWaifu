/**
 * yuki-avatar-3d.js v49 — softer happy face/arms; wave palm faces the viewer
 *
 * Face: VRoid Studio presets (neutral, happy, sad, relaxed, surprised, angry)
 *       blended per mood/mode with organic easing + micro-motion.
 * Arms: calibrated idle + conservative forward offsets (validated on yuki.vrm).
 *
 * TEMP: DISABLE_BODY_MOVEMENT freezes arms/torso/head gestures (lip-sync + blinks stay).
 * Flip to false when bringing movement back.
 */
import * as THREE from "/vendor/three/build/three.module.js";
import { GLTFLoader } from "/vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRMHumanBoneName as B } from "/vendor/@pixiv/three-vrm/lib/three-vrm.module.js";

/** TEMPORARY — set false to restore body/arm/gesture animations. */
const DISABLE_BODY_MOVEMENT = true;

const VROID_PRESETS = ["neutral", "happy", "angry", "sad", "relaxed", "surprised"];
const MOUTH_SHAPES = ["aa", "ih", "ou", "ee", "oh"];
const MOUTH_SHAPE_CAPS = { aa: 1.0, ee: 0.72, ih: 0.68, oh: 0.78, ou: 0.62 };
const BLINK_SHAPES = ["blink", "blinkLeft", "blinkRight"];
const MOUTH_OVERRIDING = new Set(["happy", "angry", "sad", "surprised", "relaxed", "neutral"]);

const ARM_BONES = [
  B.LeftUpperArm, B.RightUpperArm,
  B.LeftLowerArm, B.RightLowerArm,
  B.LeftHand, B.RightHand,
];

/** VRoid preset weights per mood — subtle blends, avoid uncanny full presets */
const MOOD_EXPRESSIONS = {
  neutral:  { neutral: 0.38, relaxed: 0.32 },
  // Soft closed-mouth smile — heavy VRoid "happy" opens the mouth and looks strange.
  happy:    { happy: 0.18, relaxed: 0.48, neutral: 0.28 },
  excited:  { surprised: 0.22, happy: 0.20, relaxed: 0.36, neutral: 0.18 },
  sad:      { sad: 0.72, relaxed: 0.12 },
  worried:  { angry: 0.28, sad: 0.24, relaxed: 0.14 },
};

/** Mode overlays (listening / thinking) layered on mood */
const MODE_EXPRESSIONS = {
  listening: { relaxed: 0.58, neutral: 0.22 },
  thinking:  { neutral: 0.45, sad: 0.14, relaxed: 0.10 },
};

/** Subtle face hint while speaking — avoids mouth-blocking presets */
const SPEAK_EXPRESSIONS = { relaxed: 0.10 };

/**
 * Conservative local arm offsets from idle (tune-natural-arms @ ~55% — hands forward, no clip).
 * Axes on yuki.vrm: upper X− Z− = lift forward; lower X+ = elbow bend.
 */
const MOOD_ARM_OFFSETS = {
  // Gentle forward ease — avoid the old raised-arm "T-pose adjacent" look.
  happy: {
    [B.LeftUpperArm]:  qEuler(-0.14, 0.03, -0.08),
    [B.RightUpperArm]: qEuler(-0.14,-0.03,  0.08),
    [B.LeftLowerArm]:  qEuler(0.02, 0.02,  0.01),
    [B.RightLowerArm]: qEuler(0.02,-0.02, -0.01),
  },
  excited: {
    [B.LeftUpperArm]:  qEuler(-0.22, 0.04, -0.12),
    [B.RightUpperArm]: qEuler(-0.22,-0.04,  0.12),
    [B.LeftLowerArm]:  qEuler(0.03, 0.02,  0.01),
    [B.RightLowerArm]: qEuler(0.03,-0.02, -0.01),
  },
  sad: {
    [B.LeftUpperArm]:  qEuler(0.10, 0.03,  0.06),
    [B.RightUpperArm]: qEuler(0.10,-0.03, -0.06),
    [B.LeftLowerArm]:  qEuler(0.08, 0.02,  0),
    [B.RightLowerArm]: qEuler(0.08,-0.02,  0),
  },
  worried: {
    [B.LeftUpperArm]:  qEuler(-0.18, 0.04, -0.10),
    [B.RightUpperArm]: qEuler(-0.42,-0.08,  0.14),
    [B.LeftLowerArm]:  qEuler(0.03, 0.02,  0),
    [B.RightLowerArm]: qEuler(-0.35, 0.04,  0.01),
    [B.RightHand]:     qEuler(0.12,-0.05, -0.04),
  },
};

const MODE_ARM_OFFSETS = {
  listening: {
    [B.LeftUpperArm]:  qEuler(-0.38, 0.05, -0.18),
    [B.RightUpperArm]: qEuler(-0.38,-0.05,  0.18),
    [B.LeftLowerArm]:  qEuler(0.035, 0.03, 0.01),
    [B.RightLowerArm]: qEuler(0.035,-0.03,-0.01),
  },
  thinking: {
    [B.LeftUpperArm]:  qEuler(-0.08, 0.03, -0.05),
    [B.RightUpperArm]: qEuler(-0.72, 0.12,  0.10),
    [B.RightLowerArm]: qEuler(-0.48, 0.05,  0.01),
    [B.RightHand]:     qEuler(0.18,-0.06, -0.05),
  },
  speaking: {
    [B.LeftUpperArm]:  qEuler(-0.40, 0.04, -0.18),
    [B.RightUpperArm]: qEuler(-0.40,-0.04,  0.18),
    [B.LeftLowerArm]:  qEuler(0.04, 0.02,  0),
    [B.RightLowerArm]: qEuler(0.04,-0.02,  0),
  },
};

function rnd(a, b) { return a + Math.random() * (b - a); }
function pickOne(arr) { return arr[(Math.random() * arr.length) | 0]; }
function coin() { return Math.random() < 0.5 ? 1 : -1; }

/**
 * Data-driven gesture clips. Each is a FACTORY returning a fresh, slightly
 * randomized clip so no two plays are identical. A clip has:
 *   frames:   arm keyframes [{ blendDur, hold, off:{bone: qEuler} }] — off:{} = idle
 *   face:     optional expression weights held while the clip plays
 *   head:     optional additive head { tilt(z), nod(x), yaw(y) } (radians)
 *   shoulder: optional additive shoulder { l, r } z-rotation
 *   sway:     optional additive spine z (tiny weight shift)
 * Measured axes (scripts/tune-greet.mjs): right arm raises via +Z upper arm;
 * elbow flexes via +Z lower arm. Left mirrors with negated Z.
 */
/** Wave/hello arm profile — measured on the shared VRoid rig (scripts/tune-greet.mjs).
 * Base values tuned on yuki_street.vrm; syncWaveProfileToIdle() mirrors Z axes when
 * calibrateArmsDown picks an inverted rest pose (common on yuki.vrm). */
const WAVE_BASE_PROFILE = { openZ: 1.58, elbow: 1.30, upX: -0.28, lowY: 0.72 };
let waveArmProfile = { ...WAVE_BASE_PROFILE };
let gestureArmSign = 1;

function detectArmConvention(idleArms) {
  const q = idleArms[B.RightUpperArm];
  if (!q) return 1;
  const e = new THREE.Euler().setFromQuaternion(q.clone(), "XYZ");
  // Standard hang: right upper arm Z < 0. Inverted calibration flips the sign.
  return e.z >= 0 ? -1 : 1;
}

function syncWaveProfileToIdle(idleArms) {
  const sign = detectArmConvention(idleArms);
  gestureArmSign = sign;
  waveArmProfile = {
    openZ: WAVE_BASE_PROFILE.openZ * sign,
    elbow: WAVE_BASE_PROFILE.elbow * sign,
    upX: WAVE_BASE_PROFILE.upX,
    lowY: WAVE_BASE_PROFILE.lowY * sign,
  };
}

function buildHelloWaveClip(opts) {
  return () => {
    const p = waveArmProfile;
    const openZ = p.openZ + rnd(-0.04, 0.04);
    const elbow = p.elbow + rnd(-0.04, 0.04);
    const upX = p.upX + rnd(-0.03, 0.03);
    const lowY = p.lowY;
    const palmY = 0.02;
    const palmZ = -0.05;
    const base = {
      [B.RightUpperArm]: qEuler(upX, 0.08, openZ),
      [B.RightLowerArm]: qEuler(0.0, lowY, elbow),
      [B.RightHand]: qEuler(0.07, palmY, palmZ),
    };
    const beat = (wz, rock) => ({
      [B.RightUpperArm]: qEuler(upX, 0.08, openZ),
      [B.RightLowerArm]: qEuler(0.0, lowY, elbow + rock),
      [B.RightHand]: qEuler(0.07, palmY, wz),
    });
    const wobble = opts.wobble || 0.40;
    return {
      face: opts.face,
      head: { tilt: rnd(0.04, 0.07), yaw: rnd(-0.02, 0.02) },
      shoulder: { r: -rnd(0.02, opts.shoulder || 0.04) },
      sway: rnd(opts.swayMin, opts.swayMax),
      frames: [
        { blendDur: rnd(opts.blendMin, opts.blendMax), hold: opts.holdFirst, off: base },
        { blendDur: 0.22, hold: 0.04, off: beat(palmZ + wobble, 0.10) },
        { blendDur: 0.22, hold: 0.04, off: beat(palmZ - wobble * 0.72, -0.08) },
        { blendDur: 0.22, hold: 0.04, off: beat(palmZ + wobble, 0.10) },
        { blendDur: 0.22, hold: 0.06, off: beat(palmZ - wobble * 0.58, -0.06) },
        { blendDur: rnd(1.1, 1.4), hold: 0.05, off: {} },
      ],
    };
  };
}

const GESTURE_CLIPS = {
  wave: buildHelloWaveClip({
    face: { happy: 0.22, relaxed: 0.40, neutral: 0.32 },
    swayMin: 0.025, swayMax: 0.04,
    blendMin: 0.6, blendMax: 0.8, holdFirst: 0.12, wobble: 0.42,
  }),
  hello: buildHelloWaveClip({
    face: { happy: 0.24, relaxed: 0.42, neutral: 0.30 },
    swayMin: 0.02, swayMax: 0.035, shoulder: 0.035,
    blendMin: 0.65, blendMax: 0.85, holdFirst: 0.14, wobble: 0.40,
  }),
  // Small open-palm — a calm conversational beat (either hand).
  openPalm() {
    const s = coin();
    const U = s > 0 ? B.RightUpperArm : B.LeftUpperArm;
    const L = s > 0 ? B.RightLowerArm : B.LeftLowerArm;
    const H = s > 0 ? B.RightHand : B.LeftHand;
    return {
      head: { tilt: rnd(-0.02, 0.03) * s },
      frames: [
        { blendDur: rnd(0.6, 0.9), hold: rnd(0.5, 1.1), off: {
          [U]: qEuler(-0.06 + rnd(-0.02, 0.02), 0, (0.10 + rnd(0, 0.06)) * s),
          [L]: qEuler(0, 0, (0.18 + rnd(0, 0.1)) * s),
          [H]: qEuler(rnd(0.03, 0.1), rnd(-0.06, 0.06) * s, rnd(-0.05, 0.08) * s) } },
        { blendDur: rnd(0.9, 1.3), hold: 0.1, off: {} },
      ],
    };
  },
  // Slight hand raise while explaining.
  handRaise() {
    const s = coin();
    const U = s > 0 ? B.RightUpperArm : B.LeftUpperArm;
    const L = s > 0 ? B.RightLowerArm : B.LeftLowerArm;
    const H = s > 0 ? B.RightHand : B.LeftHand;
    return {
      head: { tilt: rnd(-0.02, 0.03) },
      frames: [
        { blendDur: rnd(0.7, 1.0), hold: rnd(0.4, 1.0), off: {
          [U]: qEuler(-0.12 + rnd(-0.03, 0.03), 0, (0.18 + rnd(0, 0.1)) * s),
          [L]: qEuler(0, 0, (0.34 + rnd(0, 0.16)) * s),
          [H]: qEuler(rnd(0, 0.08), 0, 0) } },
        { blendDur: rnd(1.0, 1.4), hold: 0.1, off: {} },
      ],
    };
  },
  // Gentle forearm movement.
  forearmMove() {
    const s = coin();
    const L = s > 0 ? B.RightLowerArm : B.LeftLowerArm;
    return { frames: [
      { blendDur: rnd(0.7, 1.0), hold: rnd(0.3, 0.8), off: {
        [L]: qEuler(rnd(0.02, 0.06), rnd(-0.04, 0.04), (rnd(0.08, 0.18)) * s) } },
      { blendDur: rnd(0.8, 1.2), hold: 0.05, off: {} },
    ] };
  },
  // Subtle wrist rotation.
  wristTurn() {
    const s = coin();
    const H = s > 0 ? B.RightHand : B.LeftHand;
    return { frames: [
      { blendDur: rnd(0.5, 0.8), hold: rnd(0.4, 0.9), off: {
        [H]: qEuler(rnd(0, 0.1), (rnd(0.08, 0.2)) * s, rnd(-0.08, 0.08)) } },
      { blendDur: rnd(0.6, 0.9), hold: 0.05, off: {} },
    ] };
  },
  // Move a little — visible weight shift with alternating arm beats.
  moveALittle() {
    const s = coin() * gestureArmSign;
    const a = rnd(0.26, 0.38);
    return {
      face: { happy: 0.34, relaxed: 0.24 },
      head: { tilt: rnd(0.04, 0.07) * s, yaw: rnd(-0.05, 0.05) },
      shoulder: { l: rnd(0.03, 0.06) * s, r: rnd(-0.06, -0.03) * s },
      sway: rnd(0.03, 0.05) * s,
      frames: [
        { blendDur: 0.55, hold: 0.22, off: {
          [B.RightUpperArm]: qEuler(-0.10, 0, a * s),
          [B.LeftUpperArm]: qEuler(-0.08, 0, -a * 0.75 * s),
          [B.RightLowerArm]: qEuler(0, 0, 0.16),
          [B.LeftLowerArm]: qEuler(0, 0, -0.14) } },
        { blendDur: 0.55, hold: 0.28, off: {
          [B.RightUpperArm]: qEuler(-0.06, 0, -a * 0.7 * s),
          [B.LeftUpperArm]: qEuler(-0.08, 0, a * s),
          [B.RightLowerArm]: qEuler(0, 0, -0.12),
          [B.LeftLowerArm]: qEuler(0, 0, 0.14) } },
        { blendDur: 1.0, hold: 0.08, off: {} },
      ],
    };
  },
  // Gentle side-to-side shake — shoulders and arms alternate.
  shakeALittle() {
    const a = rnd(0.22, 0.32) * gestureArmSign;
    const beat = (rz, lz) => ({
      [B.RightUpperArm]: qEuler(0, 0, rz),
      [B.LeftUpperArm]: qEuler(0, 0, lz),
      [B.RightLowerArm]: qEuler(0, 0, rz * 0.55),
      [B.LeftLowerArm]: qEuler(0, 0, lz * 0.55),
    });
    return {
      face: { happy: 0.36, relaxed: 0.24 },
      head: { yaw: rnd(0.03, 0.05) },
      shoulder: { l: 0.04, r: -0.04 },
      sway: 0.028,
      frames: [
        { blendDur: 0.16, hold: 0.07, off: beat(a, -a) },
        { blendDur: 0.16, hold: 0.07, off: beat(-a, a) },
        { blendDur: 0.16, hold: 0.07, off: beat(a, -a) },
        { blendDur: 0.16, hold: 0.07, off: beat(-a, a) },
        { blendDur: 0.9, hold: 0.05, off: {} },
      ],
    };
  },
  // Playful pose — contrapposto lean, hand on hip, confident head tilt.
  poseALittle() {
    const s = coin();
    const hip = rnd(0.38, 0.48) * s;
    return {
      face: { happy: 0.48, relaxed: 0.30 },
      head: { tilt: rnd(0.05, 0.09) * s, yaw: rnd(-0.05, 0.05) * s, nod: -rnd(0.01, 0.03) },
      shoulder: { l: rnd(0.03, 0.06) * s, r: rnd(-0.06, -0.03) * s },
      sway: rnd(0.03, 0.05) * s,
      frames: [
        { blendDur: 0.55, hold: 0.18, off: {
          [B.RightUpperArm]: qEuler(-0.10, 0.04, 0.22 * s),
          [B.LeftUpperArm]: qEuler(-0.08, -0.04, -0.18 * s) } },
        { blendDur: 0.65, hold: rnd(1.1, 1.6), off: {
          [B.RightUpperArm]: qEuler(-0.18, 0.06, hip),
          [B.RightLowerArm]: qEuler(0, -0.16, 0.52 * s),
          [B.RightHand]: qEuler(0.10, -0.12, 0.06),
          [B.LeftUpperArm]: qEuler(-0.14, -0.04, -0.34 * s),
          [B.LeftLowerArm]: qEuler(0, 0.10, -0.28 * s),
          [B.LeftHand]: qEuler(0.06, 0.08, -0.04) } },
        { blendDur: 0.45, hold: 0.12, off: {
          [B.RightUpperArm]: qEuler(-0.14, 0.04, hip * 0.92),
          [B.RightLowerArm]: qEuler(0, -0.14, 0.48 * s),
          [B.LeftUpperArm]: qEuler(-0.12, -0.04, -0.30 * s) } },
        { blendDur: 1.15, hold: 0.05, off: {} },
      ],
    };
  },
  // Dance a little — rhythmic sway with alternating arm lifts.
  danceALittle() {
    const s = gestureArmSign;
    const a = rnd(0.30, 0.42);
    const lift = (side, up) => side > 0
      ? { [B.RightUpperArm]: qEuler(-0.22, 0.08, up * s), [B.RightLowerArm]: qEuler(0, 0, (up + 0.42) * s), [B.RightHand]: qEuler(0.08, -0.10, 0) }
      : { [B.LeftUpperArm]: qEuler(-0.22, -0.08, -up * s), [B.LeftLowerArm]: qEuler(0, 0, -(up + 0.42) * s), [B.LeftHand]: qEuler(0.08, 0.10, 0) };
    const down = (side) => side > 0
      ? { [B.RightUpperArm]: qEuler(-0.04, 0, a * 0.5 * s), [B.RightLowerArm]: qEuler(0, 0, a * 0.6 * s) }
      : { [B.LeftUpperArm]: qEuler(-0.04, 0, -a * 0.5 * s), [B.LeftLowerArm]: qEuler(0, 0, -a * 0.6 * s) };
    return {
      face: { happy: 0.58, relaxed: 0.22 },
      head: { tilt: rnd(0.04, 0.08), yaw: rnd(-0.05, 0.05) },
      shoulder: { l: 0.06, r: -0.06 },
      sway: 0.048,
      frames: [
        { blendDur: 0.32, hold: 0.12, off: { ...lift(1, a), ...down(-1) } },
        { blendDur: 0.32, hold: 0.12, off: { ...lift(-1, a), ...down(1) } },
        { blendDur: 0.32, hold: 0.12, off: { ...lift(1, a * 0.9), ...down(-1) } },
        { blendDur: 0.32, hold: 0.12, off: { ...lift(-1, a * 0.9), ...down(1) } },
        { blendDur: 0.38, hold: 0.18, off: {
          [B.RightUpperArm]: qEuler(-0.14, 0, a * 0.75 * s),
          [B.LeftUpperArm]: qEuler(-0.14, 0, -a * 0.75 * s),
          [B.RightLowerArm]: qEuler(0, 0, 0.32 * s),
          [B.LeftLowerArm]: qEuler(0, 0, -0.32 * s) } },
        { blendDur: 0.85, hold: 0.05, off: {} },
      ],
    };
  },
  // Thinking — knuckles resting near the jaw (off to the side, never over the
  // face) with a pensive head tilt and a slow settle.
  thinking() {
    return {
      face: { relaxed: 0.34, neutral: 0.3 },
      head: { tilt: rnd(0.05, 0.08), nod: rnd(0.02, 0.04) },
      frames: [
        { blendDur: rnd(0.9, 1.1), hold: rnd(1.3, 2.1), off: {
          [B.RightUpperArm]: qEuler(-0.62, 0.12, 0.66),
          [B.RightLowerArm]: qEuler(0, -0.1, 1.78),
          [B.RightHand]: qEuler(0.14, -0.12, 0.06) } },
        { blendDur: rnd(1.1, 1.4), hold: 0.05, off: {} },
      ],
    };
  },
  // Happy — brighter, taller posture + a warm, asymmetric open-arm.
  happy() {
    const bias = rnd(0.9, 1.1);
    const s = gestureArmSign;
    return {
      face: { happy: 0.28, relaxed: 0.42, neutral: 0.24 },
      head: { tilt: rnd(-0.05, 0.05), nod: -rnd(0.03, 0.06) },
      shoulder: { l: rnd(0.03, 0.06), r: -rnd(0.03, 0.06) },
      sway: 0.024,
      frames: [
        { blendDur: rnd(0.55, 0.75), hold: rnd(1.0, 1.6), off: {
          [B.RightUpperArm]: qEuler(-0.18, 0.04, 0.36 * bias * s), [B.RightLowerArm]: qEuler(0, 0, 0.28 * s),
          [B.RightHand]: qEuler(0.06, -0.10, -0.04),
          [B.LeftUpperArm]: qEuler(-0.16, 0, -0.32 / bias * s), [B.LeftLowerArm]: qEuler(0, 0, -0.26 * s),
          [B.LeftHand]: qEuler(0.06, 0.10, 0.04) } },
        { blendDur: rnd(0.9, 1.2), hold: 0.05, off: {} },
      ],
    };
  },
  // Sad — shoulders relaxed/lowered + head lowered.
  sad() {
    return {
      face: { sad: 0.6, relaxed: 0.2 },
      head: { nod: rnd(0.04, 0.07) },
      shoulder: { l: -rnd(0.02, 0.04), r: rnd(0.02, 0.04) },
      frames: [
        { blendDur: rnd(0.9, 1.1), hold: rnd(1.0, 1.6), off: {
          [B.RightUpperArm]: qEuler(0.06, 0, 0), [B.LeftUpperArm]: qEuler(0.06, 0, 0) } },
        { blendDur: rnd(1.2, 1.5), hold: 0.05, off: {} },
      ],
    };
  },
  // Stretch — both arms raised overhead with a gentle lean.
  stretchALittle() {
    const spread = rnd(0.42, 0.52);
    return {
      face: { relaxed: 0.34, happy: 0.22 },
      head: { nod: -rnd(0.03, 0.05) },
      shoulder: { l: rnd(0.03, 0.05), r: rnd(0.03, 0.05) },
      sway: rnd(0.015, 0.025),
      frames: [
        { blendDur: 0.65, hold: rnd(0.7, 1.1), off: {
          [B.RightUpperArm]: qEuler(-0.42, 0.06, spread),
          [B.LeftUpperArm]: qEuler(-0.42, -0.06, -spread),
          [B.RightLowerArm]: qEuler(0, 0, 0.18),
          [B.LeftLowerArm]: qEuler(0, 0, -0.18),
          [B.RightHand]: qEuler(0.06, 0, 0),
          [B.LeftHand]: qEuler(0.06, 0, 0) } },
        { blendDur: 1.0, hold: 0.08, off: {} },
      ],
    };
  },
  // Giggle — quick shoulder bounce with a warm, tilted head.
  giggleALittle() {
    const a = rnd(0.06, 0.10);
    const beat = (rz, lz) => ({
      [B.RightUpperArm]: qEuler(-0.04, 0, rz),
      [B.LeftUpperArm]: qEuler(-0.04, 0, lz),
      [B.RightLowerArm]: qEuler(0, 0, rz * 0.35),
      [B.LeftLowerArm]: qEuler(0, 0, lz * 0.35),
    });
    return {
      face: { happy: 0.52, relaxed: 0.28 },
      head: { tilt: rnd(0.03, 0.05), yaw: rnd(-0.02, 0.02) },
      shoulder: { l: 0.04, r: -0.04 },
      sway: 0.018,
      frames: [
        { blendDur: 0.12, hold: 0.05, off: beat(a, -a) },
        { blendDur: 0.12, hold: 0.05, off: beat(-a, a) },
        { blendDur: 0.12, hold: 0.05, off: beat(a * 0.8, -a * 0.8) },
        { blendDur: 0.85, hold: 0.05, off: {} },
      ],
    };
  },
};

/** Calm gestures used for ambient motion while speaking (never a fixed loop). */
const AMBIENT_GESTURES = ["openPalm", "handRaise", "forearmMove", "wristTurn", "openPalm"];

/** Map spoken/typed intent phrases → clip name. */
const INTENT_TO_CLIP = {
  wave: "wave", hello: "hello", hi: "hello", hey: "hello", greet: "hello",
  move: "moveALittle", "move a little": "moveALittle", "move around": "moveALittle",
  shake: "shakeALittle", wiggle: "shakeALittle", jiggle: "shakeALittle",
  dance: "danceALittle", "dance a little": "danceALittle",
  pose: "poseALittle", "strike a pose": "poseALittle",
  stretch: "stretchALittle", "stretch a little": "stretchALittle",
  giggle: "giggleALittle", "giggle a little": "giggleALittle",
  think: "thinking", thinking: "thinking",
  happy: "happy", "look happy": "happy", "be happy": "happy", smile: "happy",
  sad: "sad", "look sad": "sad", "be sad": "sad",
};

const HEAD_TILT = {
  neutral: 0, happy: 0.03, excited: 0.04, sad: -0.05, worried: 0.02,
  listening: 0.02, thinking: -0.02,
};

const TORSO_BIAS = {
  happy:   { spine: 0.02, chest: 0.03 },
  excited: { spine: 0.04, chest: 0.05 },
  sad:     { spine: -0.08, chest: -0.06 },
  worried: { spine: 0.01, chest: -0.02 },
};

function qEuler(x, y, z) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ"));
  return [q.x, q.y, q.z, q.w];
}

function qFrom(arr) { return new THREE.Quaternion(...arr); }
function lerp(a, b, t) { return a + (b - a) * t; }
function sn(t, a, b, c) { return Math.sin(t * a) * 0.5 + Math.sin(t * b) * 0.3 + Math.sin(t * c) * 0.2; }
function smoothstep(t) { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); }

function clonePose(pose) {
  const out = {};
  for (const bone of ARM_BONES) out[bone] = pose[bone]?.clone() || new THREE.Quaternion();
  return out;
}

function applyLocalOffsets(base, offsets) {
  const out = clonePose(base);
  if (!offsets) return out;
  for (const [bone, rot] of Object.entries(offsets)) {
    if (!out[bone]) out[bone] = new THREE.Quaternion();
    out[bone].multiply(qFrom(rot));
  }
  return out;
}

function blendPoses(a, b, t) {
  const out = {};
  const id = new THREE.Quaternion();
  for (const bone of ARM_BONES) {
    out[bone] = (a[bone] || id).clone().slerp(b[bone] || a[bone] || id, t);
  }
  return out;
}

function bakeArmLibrary(idle) {
  const moods = { neutral: clonePose(idle) };
  for (const [m, off] of Object.entries(MOOD_ARM_OFFSETS)) moods[m] = applyLocalOffsets(idle, off);
  const modes = {};
  for (const [m, off] of Object.entries(MODE_ARM_OFFSETS)) modes[m] = applyLocalOffsets(idle, off);
  return { moods, modes };
}

/** Resting arm pose for a mood/mode (no gesture layer — clips override on top). */
function resolveArmPose(mood, mode, lib) {
  let pose = lib.moods[mood] || lib.moods.neutral;
  if (mode === "thinking") {
    pose = blendPoses(pose, lib.modes.thinking, 0.78);
  } else if (mode === "listening") {
    pose = blendPoses(pose, lib.modes.listening, 0.65);
  } else if (mode === "speaking") {
    pose = blendPoses(pose, lib.modes.speaking, 0.30);
  }
  return pose;
}

function mergeExpressions(mood, mode, lipSyncActive) {
  const out = {};
  if (lipSyncActive) return { ...SPEAK_EXPRESSIONS };

  for (const [k, v] of Object.entries(MOOD_EXPRESSIONS[mood] || MOOD_EXPRESSIONS.neutral)) {
    out[k] = v;
  }

  if (mode === "listening" || mode === "thinking") {
    const overlay = MODE_EXPRESSIONS[mode] || {};
    const mix = mood === "neutral" ? 1 : 0.48;
    for (const [k, v] of Object.entries(overlay)) {
      out[k] = lerp(out[k] || 0, v, mix);
    }
  }

  return out;
}

function armHangMetric(vrm) {
  const upper = vrm.humanoid.getRawBoneNode(B.LeftUpperArm);
  const lower = vrm.humanoid.getRawBoneNode(B.LeftLowerArm);
  if (!upper || !lower) return 0;
  const pu = new THREE.Vector3(), pl = new THREE.Vector3();
  upper.getWorldPosition(pu);
  lower.getWorldPosition(pl);
  return pu.y - pl.y;
}

function calibrateArmsDown(vrm) {
  const candidates = [
    { lz: 1.35, rz: -1.35, ly: 0.08, ry: 0.08, inverted: false },
    { lz: 1.10, rz: -1.10, ly: 0.06, ry: 0.06, inverted: false },
    { lz: 0.85, rz: -0.85, ly: 0.04, ry: 0.04, inverted: false },
    { lz: -1.35, rz: 1.35, ly: 0.08, ry: 0.08, inverted: true },
  ];
  let best = armHangMetric(vrm);
  let bestPose = null;
  for (const c of candidates) {
    vrm.humanoid.resetNormalizedPose();
    vrm.humanoid.setNormalizedPose({
      [B.LeftUpperArm]:  { rotation: qEuler(0, 0, c.lz) },
      [B.RightUpperArm]: { rotation: qEuler(0, 0, c.rz) },
      [B.LeftLowerArm]:  { rotation: qEuler(c.ly, 0.02, 0) },
      [B.RightLowerArm]: { rotation: qEuler(c.ry, -0.02, 0) },
      [B.LeftHand]:      { rotation: qEuler(0.04, 0, 0) },
      [B.RightHand]:     { rotation: qEuler(0.04, 0, 0) },
    });
    vrm.update(0);
    vrm.scene.updateMatrixWorld(true);
    const m = armHangMetric(vrm);
    const better = m > best + 0.012;
    const tiePreferStandard = bestPose?.inverted && !c.inverted && m >= best - 0.012;
    if (better || tiePreferStandard) {
      best = Math.max(best, m);
      bestPose = c;
    }
  }
  if (bestPose && best > 0.08) {
    const c = bestPose;
    vrm.humanoid.resetNormalizedPose();
    vrm.humanoid.setNormalizedPose({
      [B.LeftUpperArm]:  { rotation: qEuler(0, 0, c.lz) },
      [B.RightUpperArm]: { rotation: qEuler(0, 0, c.rz) },
      [B.LeftLowerArm]:  { rotation: qEuler(c.ly, 0.02, 0) },
      [B.RightLowerArm]: { rotation: qEuler(c.ry, -0.02, 0) },
      [B.LeftHand]:      { rotation: qEuler(0.04, 0, 0) },
      [B.RightHand]:     { rotation: qEuler(0.04, 0, 0) },
    });
    vrm.update(0);
    vrm.scene.updateMatrixWorld(true);
    return true;
  }
  vrm.humanoid.resetNormalizedPose();
  vrm.update(0);
  return false;
}

function headForwardDot(vrm, camera, headPos) {
  const head = vrm.humanoid.getRawBoneNode(B.Head);
  const le = vrm.humanoid.getRawBoneNode(B.LeftEye);
  const re = vrm.humanoid.getRawBoneNode(B.RightEye);
  if (!head || !le || !re) return -2;
  const hp = headPos || new THREE.Vector3();
  if (!headPos) head.getWorldPosition(hp);
  const lp = new THREE.Vector3(), rp = new THREE.Vector3();
  le.getWorldPosition(lp);
  re.getWorldPosition(rp);
  const fwd = new THREE.Vector3().addVectors(lp, rp).multiplyScalar(0.5).sub(hp);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-8) return -2;
  fwd.normalize();
  const toCam = camera.position.clone().sub(hp);
  toCam.y = 0;
  if (toCam.lengthSq() < 1e-8) return -2;
  return fwd.normalize().dot(toCam.normalize());
}

function calibrateFacing(vrm, camera) {
  const head = vrm.humanoid.getRawBoneNode(B.Head);
  if (!head) return { yaw: Math.PI, faceDot: -1 };
  const headPos = new THREE.Vector3();
  let bestYaw = Math.PI, bestScore = -Infinity;
  for (let i = 0; i < 16; i++) {
    const yaw = (Math.PI * 2 * i) / 16;
    vrm.scene.rotation.y = yaw;
    vrm.scene.updateMatrixWorld(true);
    head.getWorldPosition(headPos);
    const score = headForwardDot(vrm, camera, headPos);
    if (score > bestScore) { bestScore = score; bestYaw = yaw; }
  }
  vrm.scene.rotation.y = bestYaw;
  vrm.scene.updateMatrixWorld(true);
  return { yaw: bestYaw, faceDot: bestScore };
}

function alignFeet(vrm) {
  const box = new THREE.Box3().setFromObject(vrm.scene);
  vrm.scene.position.x -= (box.min.x + box.max.x) * 0.5;
  vrm.scene.position.z -= (box.min.z + box.max.z) * 0.5;
  vrm.scene.position.y -= box.min.y;
  vrm.scene.updateMatrixWorld(true);
}

function frameCamera(vrm, camera, framing = "full", aspect = 1) {
  const head = vrm.humanoid.getRawBoneNode(B.Head);
  const chest = vrm.humanoid.getRawBoneNode(B.Chest);
  const headPos = new THREE.Vector3(), chestPos = new THREE.Vector3();
  if (head) head.getWorldPosition(headPos);
  if (chest) chest.getWorldPosition(chestPos);
  const h = new THREE.Box3().setFromObject(vrm.scene).getSize(new THREE.Vector3()).y;
  const eyeY = head ? headPos.y : h * 0.88;
  const focusY = chest ? chestPos.y - h * 0.05 : eyeY - h * 0.10;

  if (framing === "compact") {
    // Tight portrait bust — close framing; panel aspect/toolbar handle crop, not distance.
    const headTop = (head ? headPos.y : h * 0.88) + h * 0.09;
    const frameBottom = chest ? chestPos.y - h * 0.04 : headTop - h * 0.44;
    const headroom = h * 0.03;
    const frameTop = headTop + headroom;
    const centerY = (frameTop + frameBottom) * 0.5;
    const subjectHeight = frameTop - frameBottom;
    const subjectWidth = h * 0.44;

    const vFovDeg = 42;
    const vFov = (vFovDeg * Math.PI) / 180;
    const safeAspect = Math.max(0.55, aspect || 1);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);

    const distV = (subjectHeight * 0.5) / Math.tan(vFov / 2);
    const distH = (subjectWidth * 0.5) / Math.tan(hFov / 2);
    const distance = Math.max(distV, distH) * 1.04;

    camera.fov = vFovDeg;
    camera.position.set(0, centerY, distance);
    camera.lookAt(0, centerY - h * 0.015, 0);
  } else {
    camera.fov = 32;
    camera.position.set(0, eyeY - h * 0.03, h * 1.52);
    camera.lookAt(0, focusY, 0);
  }
  camera.updateProjectionMatrix();
}

function setupPlacement(vrm, camera, framing = "full", aspect = 0.72) {
  vrm.humanoid.resetNormalizedPose();
  vrm.update(0);
  vrm.scene.updateMatrixWorld(true);
  const armsFixed = calibrateArmsDown(vrm);
  alignFeet(vrm);
  frameCamera(vrm, camera, framing, aspect);
  const facing = calibrateFacing(vrm, camera);
  alignFeet(vrm);
  frameCamera(vrm, camera, framing, aspect);
  return { armsFixed, yaw: facing.yaw, faceDot: facing.faceDot };
}

function discoverExpressions(vrm) {
  const names = Object.keys(vrm.expressionManager?.expressionMap || {});
  return {
    presets: VROID_PRESETS.filter((n) => names.includes(n)),
    mouth: MOUTH_SHAPES.filter((n) => names.includes(n)),
    look: names.filter((n) => /^look/i.test(n)),
    blink: BLINK_SHAPES.filter((n) => names.includes(n)),
    all: names,
  };
}

function probeWebGL() {
  const canvas = document.createElement("canvas");
  const attrsList = [
    { alpha: true, antialias: false, depth: true, stencil: false, failIfMajorPerformanceCaveat: false, powerPreference: "low-power" },
    { alpha: true, antialias: false, failIfMajorPerformanceCaveat: false, powerPreference: "default" },
    { alpha: true, failIfMajorPerformanceCaveat: false },
    { alpha: true },
    null,
  ];
  let gl = null;
  let api = null;
  let attrsUsed = null;
  for (const attrs of attrsList) {
    try {
      gl =
        (attrs ? canvas.getContext("webgl2", attrs) : canvas.getContext("webgl2")) ||
        (attrs ? canvas.getContext("webgl", attrs) : canvas.getContext("webgl")) ||
        (attrs ? canvas.getContext("experimental-webgl", attrs) : canvas.getContext("experimental-webgl"));
      if (gl) {
        api = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? "webgl2" : "webgl";
        attrsUsed = attrs;
        break;
      }
    } catch (_) {
      gl = null;
    }
  }
  const info = {
    api,
    ok: !!gl,
    attrs: attrsUsed,
    vendor: null,
    renderer: null,
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "",
  };
  if (gl) {
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        info.vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        info.renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      }
    } catch (_) {}
    try {
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    } catch (_) {}
  }
  return info;
}

function createWebGLRenderer(canvas) {
  const attempts = [
    { alpha: true, antialias: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: false, depth: true, stencil: false },
    { alpha: true, antialias: false, powerPreference: "default", failIfMajorPerformanceCaveat: false },
    { alpha: true, antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false },
    { alpha: true, antialias: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: false },
    { alpha: true, antialias: false },
  ];
  let lastErr = null;
  for (const opts of attempts) {
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, ...opts });
      renderer.__yukiWebGLOpts = opts;
      return renderer;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("THREE.WebGLRenderer: Error creating WebGL context.");
}

export async function mountYukiAvatar3D(container, options = {}) {
  const modelUrl = options.modelUrl || "assets/vrm/yuki_street.vrm";
  const framing = options.framing === "compact" ? "compact" : "full";

  // Drop orphaned stages from earlier failed mounts (context not assigned to YukiAvatar3D).
  container.querySelectorAll(".yuki-char-stage-3d").forEach((el) => el.remove());

  const webglProbe = probeWebGL();

  const stage = document.createElement("div");
  stage.className = "yuki-char-stage-3d";
  container.appendChild(stage);

  const canvas = document.createElement("canvas");
  canvas.className = "yuki-char yuki-char-3d";
  canvas.id = "yuki-char-canvas";
  stage.appendChild(canvas);

  const loaderEl = document.createElement("div");
  loaderEl.className = "yuki-avatar-3d-loader";
  loaderEl.textContent = webglProbe.ok ? "Yuki" : "Waiting…";
  stage.appendChild(loaderEl);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
  let renderer;
  try {
    renderer = createWebGLRenderer(canvas);
  } catch (err) {
    loaderEl.textContent = "Waiting for GPU…";
    throw err;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xd8ecff, 0x1a1030, 1.0));
  const key = new THREE.DirectionalLight(0xfff5ea, 1.5);
  key.position.set(0.8, 2.2, 2.8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x90c8ff, 0.5);
  fill.position.set(-2.0, 1.2, 1.5);
  scene.add(fill);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(modelUrl);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error("VRM missing: " + modelUrl);

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  scene.add(vrm.scene);

  const initW = Math.max(1, container.clientWidth || stage.clientWidth || 168);
  const initH = Math.max(1, container.clientHeight || stage.clientHeight || 232);
  const initAspect = initW / initH;

  const { armsFixed, yaw, faceDot } = setupPlacement(vrm, camera, framing, initAspect);

  const idleArms = {};
  for (const bone of ARM_BONES) {
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    if (node) idleArms[bone] = node.quaternion.clone();
  }
  syncWaveProfileToIdle(idleArms);
  const armLib = bakeArmLibrary(idleArms);

  if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
  const lookAtPos = new THREE.Vector3();
  const exprInfo = discoverExpressions(vrm);
  loaderEl.remove();

  console.info(
    "[YukiAvatar3D] v49 ready", modelUrl,
    "| armsFixed:", armsFixed,
    "| wave:", waveArmProfile,
    "| presets:", exprInfo.presets.join(", "),
  );
  window.__yukiAvatarDebug = { modelUrl, yaw, faceDot, armsFixed, waveArmProfile, vrm, armLib };

  let mood = "neutral";
  let mode = "idle";
  let speaking = false;
  let disposed = false;

  const presetCur = {};
  for (const n of exprInfo.presets) presetCur[n] = 0;
  const mouthCur = {};
  for (const n of exprInfo.mouth) mouthCur[n] = 0;

  const poseCur = {};
  const poseTgt = {};
  for (const bone of ARM_BONES) {
    poseCur[bone] = idleArms[bone]?.clone() || new THREE.Quaternion();
    poseTgt[bone] = poseCur[bone].clone();
  }

  let blinkPhase = 0, blinkTimer = 0;
  let nextBlink = performance.now() + 2500 + Math.random() * 2000;
  let nextNodAt = performance.now() + 45000 + Math.random() * 15000;
  let nodAmt = 0, nodVel = 0, nodActive = false;
  let exprEaseUntil = 0;
  let poseEaseUntil = 0;

  let gesturePose = null;
  let speakReleaseUntil = 0;
  let speakEnergyCur = 0;
  // Clip player (drives one gesture clip at a time; blends back to idle after).
  let clipFrames = null, clipIdx = 0, clipBlend = 0, clipHold = 0, clipFrom = null;
  let activeClip = null;   // { face, head, shoulder, sway } meta for the running clip
  let clipEnv = 0;         // 0..1 envelope for the clip's head/shoulder/sway channels
  let nextAmbientAt = performance.now() + 4000 + Math.random() * 4000;

  const leftShoulder = vrm.humanoid.getNormalizedBoneNode(B.LeftShoulder);
  const rightShoulder = vrm.humanoid.getNormalizedBoneNode(B.RightShoulder);
  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode(B.LeftLowerArm);
  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode(B.RightLowerArm);
  // Shoulders are not reset by setNormalizedPose — motion must be absolute, never additive.
  const shoulderBaseL = leftShoulder ? leftShoulder.rotation.z : 0;
  const shoulderBaseR = rightShoulder ? rightShoulder.rotation.z : 0;

  function safeExpr(name, value) {
    if (!exprInfo.all.includes(name)) return;
    try { vrm.expressionManager?.setValue(name, value); } catch (_) {}
  }

  function mouthOpenAmount(w) {
    if (!w) return 0;
    return (w.aa || 0) + (w.ih || 0) + (w.ou || 0) + (w.ee || 0) + (w.oh || 0);
  }

  function lipSyncActive() {
    const m = window.Voice?.getVisemeWeights?.();
    return speaking || mouthOpenAmount(m) > 0.02;
  }

  function resolveMode() {
    if (mode === "thinking") return "thinking";
    if (mode === "speaking" || speaking || window.Voice?.isAgentAudioPlaying?.()) return "speaking";
    return mode;
  }

  function filterExprTargets(targets) {
    const allowed = new Set(exprInfo.presets);
    const out = {};
    for (const [k, v] of Object.entries(targets)) {
      if (allowed.has(k)) out[k] = v;
    }
    return out;
  }

  function updateArmTargets() {
    if (DISABLE_BODY_MOVEMENT) {
      for (const bone of ARM_BONES) {
        poseTgt[bone] = idleArms[bone]?.clone() || poseTgt[bone];
      }
      return;
    }
    if (clipFrames && gesturePose) {
      for (const bone of ARM_BONES) poseTgt[bone] = gesturePose[bone] || poseTgt[bone];
      return;
    }
    const am = resolveMode();
    const tgt = resolveArmPose(mood, am, armLib);
    for (const bone of ARM_BONES) poseTgt[bone] = tgt[bone];
  }

  // Bake a clip's offset frames onto the current resting stance, so gestures
  // layer on top of the active mood/mode pose rather than snapping to idle.
  function bakeClipFrames(frames) {
    const base = resolveArmPose(mood, resolveMode(), armLib);
    return frames.map((f) => ({
      blendDur: f.blendDur,
      hold: f.hold,
      pose: applyLocalOffsets(base, f.off || {}),
    }));
  }

  function startGesture(name, { force = false } = {}) {
    if (DISABLE_BODY_MOVEMENT) return false;
    const factory = GESTURE_CLIPS[name];
    if (!factory) return false;
    if (clipFrames && !force) return false;
    const clip = factory();
    activeClip = {
      face: clip.face || null,
      head: clip.head || null,
      shoulder: clip.shoulder || null,
      sway: clip.sway || 0,
    };
    clipFrames = bakeClipFrames(clip.frames);
    clipIdx = 0;
    clipBlend = 0;
    clipHold = clipFrames[0].hold;
    clipFrom = clonePose(poseCur);
    return true;
  }

  function advanceClip(dt) {
    const frame = clipFrames[clipIdx];
    clipBlend = Math.min(1, clipBlend + dt / frame.blendDur);
    gesturePose = blendPoses(clipFrom, frame.pose, smoothstep(clipBlend));
    if (clipBlend >= 1) {
      clipHold -= dt;
      if (clipHold <= 0) {
        clipFrom = clonePose(gesturePose);
        clipIdx += 1;
        if (clipIdx >= clipFrames.length) { clipFrames = null; gesturePose = null; return; }
        clipBlend = 0;
        clipHold = clipFrames[clipIdx].hold;
      }
    }
  }

  // Occasionally trigger a calm ambient gesture — only while speaking, biased by
  // speech energy so longer/expressive sentences move a little more. Never loops.
  function updateGestures(dt) {
    if (DISABLE_BODY_MOVEMENT) {
      clipFrames = null;
      gesturePose = null;
      activeClip = null;
      clipEnv = 0;
      return;
    }
    if (clipFrames) { advanceClip(dt); return; }
    gesturePose = null;
    const now = performance.now();
    if (now < nextAmbientAt) return;
    const am = resolveMode();
    if (am === "speaking" && speakEnergyCur > 0.24) {
      if (Math.random() < 0.28 + speakEnergyCur * 0.42) {
        startGesture(pickOne(AMBIENT_GESTURES));
      }
      nextAmbientAt = now + 3200 + Math.random() * 4200;
    } else {
      nextAmbientAt = now + 5000 + Math.random() * 5000;
    }
  }

  function resize() {
    const w = Math.max(1, stage.clientWidth || container.clientWidth);
    const h = Math.max(1, stage.clientHeight || container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frameCamera(vrm, camera, framing, w / h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  ro.observe(container);
  resize();

  const clock = new THREE.Clock();

  function tick() {
    if (disposed) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const now = performance.now();
    const am = resolveMode();
    const syncing = lipSyncActive();
    const mouthW = window.Voice?.getVisemeWeights?.();
    const mouthAmt = mouthOpenAmount(mouthW);
    const targetEnergy = (am === "speaking" || speaking || mouthAmt > 0.03)
      ? Math.min(1, 0.18 + mouthAmt * 2.0)
      : 0;
    speakEnergyCur = lerp(speakEnergyCur, targetEnergy, 1 - Math.pow(0.00012, dt));

    updateGestures(dt);
    updateArmTargets();

    // Envelope for the running clip's head/shoulder/sway channels — ramps down on
    // the clip's final (return-to-idle) frame so meta motion eases back with arms.
    const onLastClipFrame = clipFrames && clipIdx >= clipFrames.length - 1;
    const clipEnvTarget = (clipFrames && !onLastClipFrame) ? 1 : 0;
    clipEnv = lerp(clipEnv, clipEnvTarget, 1 - Math.pow(0.02, dt));
    if (!clipFrames && clipEnv < 0.02) { clipEnv = 0; activeClip = null; }

    const poseSnapping = now < poseEaseUntil;
    // Gestures follow tighter so they read; idle stays dreamy-slow.
    const poseBase = clipFrames ? 0.01 : am === "speaking" ? 0.01 : 0.0015;
    const poseSpeed = poseSnapping
      ? (1 - Math.pow(0.012, dt))
      : (1 - Math.pow(poseBase, dt));
    const poseData = {};
    for (const bone of ARM_BONES) {
      poseCur[bone].slerp(poseTgt[bone], poseSpeed);
      poseData[bone] = { rotation: poseCur[bone].toArray() };
    }
    vrm.humanoid.setNormalizedPose(poseData);

    if (!DISABLE_BODY_MOVEMENT) {
    // TORSO — kept deliberately still. Only quiet breathing + a very slow micro
    // sway (≈1° max). The torso is never the primary source of motion.
    const torso = TORSO_BIAS[mood] || {};
    const listenStill = am === "listening" && speakEnergyCur < 0.04;
    const breath = sn(t, 0.31, 0.63, 0.19) * 0.0045;
    const swayAmb = Math.sin(t * 0.09 + 1.3) * 0.008;
    const clipSway = (activeClip?.sway || 0) * clipEnv;
    const spine = vrm.humanoid.getNormalizedBoneNode(B.Spine);
    const chest = vrm.humanoid.getNormalizedBoneNode(B.Chest);
    if (spine) {
      spine.rotation.x = breath + (torso.spine || 0);
      spine.rotation.z = swayAmb + clipSway;
    }
    if (chest) {
      chest.rotation.x = breath * 0.5 + (torso.chest || 0);
      chest.rotation.z = swayAmb * 0.4 + clipSway * 0.4;
    }

    // SHOULDERS / ARMS — now the primary movement channel. Subtle speaking sway
    // plus any active clip's shoulder offset. Absolute assignment (never additive).
    const e = speakEnergyCur;
    const clipShL = (activeClip?.shoulder?.l || 0) * clipEnv;
    const clipShR = (activeClip?.shoulder?.r || 0) * clipEnv;
    if (leftShoulder) leftShoulder.rotation.z = shoulderBaseL + sn(t, 0.21, 0.39, 0.16) * 0.006 * e + clipShL;
    if (rightShoulder) rightShoulder.rotation.z = shoulderBaseR - sn(t, 0.18, 0.36, 0.14) * 0.006 * e + clipShR;
    if (e > 0.02 && !clipFrames) {
      // Tiny forearm life while speaking between gestures (reset each frame → safe).
      if (leftLowerArm) leftLowerArm.rotation.x += sn(t, 0.26, 0.51, 0.2) * 0.004 * e;
      if (rightLowerArm) rightLowerArm.rotation.x += sn(t, 0.24, 0.48, 0.18) * 0.0035 * e;
    }

    const head = vrm.humanoid.getNormalizedBoneNode(B.Head);
    if (head) {
      const tilt = (HEAD_TILT[mood] || 0) + (HEAD_TILT[am] || 0) * 0.5
        + (activeClip?.head?.tilt || 0) * clipEnv;
      const headIdle = listenStill ? 0.22 : 1;
      let hx = sn(t, 0.18, 0.37, 0.09) * 0.004 * headIdle;
      hx += speakEnergyCur * sn(t, 0.29, 0.51, 0.22) * 0.004;
      hx += (activeClip?.head?.nod || 0) * clipEnv;
      if (am === "listening" && !nodActive && now >= nextNodAt) {
        nodActive = true; nodVel = 0.04;
        nextNodAt = now + 40000 + Math.random() * 20000;
      }
      if (nodActive) {
        nodAmt = Math.min(0.055, nodAmt + nodVel * dt);
        nodVel *= 0.87;
        if (nodAmt >= 0.05 && nodVel < 0.006) nodVel = -0.055;
        if (nodAmt <= 0.001 && nodVel < 0) { nodAmt = 0; nodVel = 0; nodActive = false; }
      } else {
        nodAmt = lerp(nodAmt, 0, 1 - Math.pow(0.00008, dt));
      }
      head.rotation.x = hx + nodAmt;
      head.rotation.y = sn(t, 0.11, 0.23, 0.07) * 0.003 * headIdle
        + speakEnergyCur * sn(t, 0.22, 0.41, 0.17) * 0.0035
        + (activeClip?.head?.yaw || 0) * clipEnv;
      head.rotation.z = tilt;
    }
    } else {
      // Frozen body — lock torso/shoulders/head to base, keep arms at idle.
      const spine = vrm.humanoid.getNormalizedBoneNode(B.Spine);
      const chest = vrm.humanoid.getNormalizedBoneNode(B.Chest);
      const head = vrm.humanoid.getNormalizedBoneNode(B.Head);
      if (spine) { spine.rotation.x = 0; spine.rotation.z = 0; }
      if (chest) { chest.rotation.x = 0; chest.rotation.z = 0; }
      if (leftShoulder) leftShoulder.rotation.z = shoulderBaseL;
      if (rightShoulder) rightShoulder.rotation.z = shoulderBaseR;
      if (head) {
        head.rotation.x = 0;
        head.rotation.y = 0;
        head.rotation.z = HEAD_TILT[mood] || 0;
      }
    }

    if (blinkPhase === 0 && now >= nextBlink) {
      blinkPhase = 1; blinkTimer = now;
      nextBlink = now + 2800 + Math.random() * 2200;
    }
    let blinkVal = 0;
    if (blinkPhase === 1) {
      blinkVal = Math.min(1, (now - blinkTimer) / 70);
      if (blinkVal >= 1) { blinkPhase = 2; blinkTimer = now; }
    } else if (blinkPhase === 2) {
      blinkVal = 1;
      if (now - blinkTimer > 45) { blinkPhase = 3; blinkTimer = now; }
    } else if (blinkPhase === 3) {
      blinkVal = 1 - Math.min(1, (now - blinkTimer) / 90);
      if (now - blinkTimer >= 90) blinkPhase = 0;
    }
    if (exprInfo.blink.includes("blinkLeft") && exprInfo.blink.includes("blinkRight")) {
      safeExpr("blink", 0);
      safeExpr("blinkLeft", blinkVal);
      safeExpr("blinkRight", blinkVal);
    } else {
      safeExpr("blink", blinkVal);
    }
    for (const n of exprInfo.look) safeExpr(n, 0);

    if (vrm.lookAt) {
      const headNode = vrm.humanoid.getRawBoneNode(B.Head);
      if (headNode) {
        const hp = new THREE.Vector3();
        headNode.getWorldPosition(hp);
        if (DISABLE_BODY_MOVEMENT) {
          lookAtPos.set(0, hp.y, hp.z + 0.55);
        } else {
          const amLook = resolveMode();
          const listenStillLook = amLook === "listening" && speakEnergyCur < 0.04;
          const sway = listenStillLook ? 0.12 : 0.28;
          lookAtPos.set(
            Math.sin(t * 0.31) * 0.018 * sway,
            hp.y + Math.sin(t * 0.22 + 0.8) * 0.012 * sway,
            hp.z + 0.55 + Math.cos(t * 0.19) * 0.008 * sway,
          );
        }
        vrm.lookAt.lookAt(lookAtPos);
        vrm.lookAt.update(dt);
      }
    }

    let exprTargets = performance.now() < speakReleaseUntil
      ? filterExprTargets({ neutral: 0.4, relaxed: 0.34 })
      : (activeClip?.face)
        ? filterExprTargets(activeClip.face)
        : filterExprTargets(mergeExpressions(mood, am, syncing));
    if (syncing) {
      for (const k of Object.keys(exprTargets)) {
        if (MOUTH_OVERRIDING.has(k)) exprTargets[k] = 0;
      }
    }

    const micro = sn(t, 0.21, 0.43, 0.17) * 0.018;
    if (!syncing && exprTargets.relaxed != null) exprTargets.relaxed += micro;
    if (!syncing && exprTargets.neutral != null) exprTargets.neutral += micro * 0.5;

    const exprSnapping = now < exprEaseUntil;
    for (const n of exprInfo.presets) {
      let tgt = exprTargets[n] || 0;
      if (tgt > 1) tgt = 1;
      const rising = tgt > presetCur[n];
      const speed = exprSnapping
        ? (1 - Math.pow(0.006, dt))
        : rising
          ? (1 - Math.pow(0.018, dt))
          : (1 - Math.pow(0.003, dt));
      presetCur[n] = lerp(presetCur[n], tgt, speed);
      safeExpr(n, presetCur[n]);
    }

    const mouthTgt = mouthW;
    const mouthAttack = 1 - Math.pow(0.0028, dt);
    const mouthDecay = 1 - Math.pow(0.0045, dt);
    for (const n of exprInfo.mouth) {
      let tgt = mouthTgt?.[n] || 0;
      const cap = MOUTH_SHAPE_CAPS[n];
      if (cap != null) tgt = Math.min(tgt, cap);
      const speed = tgt > mouthCur[n] ? mouthAttack : mouthDecay;
      mouthCur[n] = lerp(mouthCur[n], tgt, speed);
      safeExpr(n, mouthCur[n]);
    }

    vrm.update(dt);
    renderer.render(scene, camera);
  }
  tick();

  return {
    setMood(name) {
      const next = ["neutral", "happy", "excited", "sad", "worried"].includes(name) ? name : "neutral";
      if (next !== mood) {
        exprEaseUntil = performance.now() + 600;
        poseEaseUntil = performance.now() + 700;
      }
      mood = next;
    },
    setMode(name) {
      const next = ["idle", "listening", "thinking", "speaking"].includes(name) ? name : "idle";
      if (next !== mode) {
        exprEaseUntil = performance.now() + 500;
        poseEaseUntil = performance.now() + 600;
      }
      mode = next;
    },
    setSpeaking(on) {
      speaking = !!on;
      if (!on) {
        speakReleaseUntil = performance.now() + 800;
        exprEaseUntil = performance.now() + 550;
      }
    },
    setEmotion(name) {
      const modeMap = { idle: "idle", listening: "listening", thinking: "thinking", talking: "speaking" };
      const moodMap = { happy: "happy", excited: "excited", sad: "sad", worried: "worried" };
      if (modeMap[name]) this.setMode(modeMap[name]);
      else if (moodMap[name]) this.setMood(moodMap[name]);
      else { this.setMood("neutral"); this.setMode("idle"); }
    },
    /** Trigger a gesture clip by name or spoken intent phrase (interrupts current). */
    playGesture(name) {
      if (DISABLE_BODY_MOVEMENT) return false;
      if (!name) return false;
      const key = String(name).toLowerCase().trim();
      const clip = INTENT_TO_CLIP[key] || (GESTURE_CLIPS[name] ? name : null);
      if (!clip) return false;
      if (clip === "happy") this.setMood("happy");
      else if (clip === "sad") this.setMood("sad");
      return startGesture(clip, { force: true });
    },
    listGestures: () => Object.keys(GESTURE_CLIPS),
    setListenLevel() {},
    getModelUrl: () => modelUrl,
    getState: () => ({ mood, mode: resolveMode(), bodyMovementDisabled: DISABLE_BODY_MOVEMENT }),
    dispose() {
      disposed = true;
      ro.disconnect();
      try { VRMUtils.deepDispose(vrm.scene); } catch (_) {}
      renderer.dispose();
      stage.remove();
    },
  };
}
