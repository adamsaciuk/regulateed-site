// @ts-check
// Reggie's motion library. A motion only returns the parts it moves; the alive layer
// (breathing, blinking, a little sway) fills in everything else, so Reggie is never a still picture.

/**
 * @typedef {object} MotionContext
 * @property {number} t        seconds since this motion began
 * @property {number} beat     beats since this motion began (from the session's tempo)
 * @property {number} amp      this run's size, near 1, varied a little every time
 * @property {{phase: 'in' | 'hold' | 'out', progress: number} | null} breath
 * @property {number} wobble   this run's own phase offset, so two Reggies never move in step
 */

/**
 * @typedef {object} Motion
 * @property {string} label
 * @property {'alive' | 'breath' | 'move' | 'hold' | 'gesture' | 'signature'} family
 * @property {string} what
 * @property {(context: MotionContext) => Partial<import('./rig.js').Pose>} pose
 */

const TAU = Math.PI * 2;
const ease = (/** @type {number} */ p) => 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, p))) / 2;
const pulse = (/** @type {number} */ beat) => Math.sin(TAU * beat);

const HANDS_ON_BELLY = -40;

/** @param {MotionContext} context */
function breathAmount(context) {
    if (!context.breath) return 0.5 + 0.5 * Math.sin(context.t * TAU / 6);
    const {phase, progress} = context.breath;
    if (phase === 'in') return ease(progress);
    if (phase === 'hold') return 1;
    return 1 - ease(progress);
}

/** @type {Record<string, Motion>} */
export const MOTIONS = {
    idle: {label: 'Idle', family: 'alive', what: 'Standing easy, looking around now and then.',
        pose: ({t, wobble}) => ({lookX: Math.sin(t * 0.35 + wobble) * 0.35})},
    listen: {label: 'Listen', family: 'gesture', what: 'Head tilted, eyes on the class or the teacher.',
        pose: ({t}) => ({headTilt: 8, lookY: -0.2, smile: 0.5, lean: Math.sin(t * 0.6) * 1.5})},
    wave: {label: 'Wave', family: 'gesture', what: 'A hello, one arm high.',
        pose: ({t, amp}) => ({armRight: 140 + Math.sin(t * 7) * 24 * amp, lean: -3, smile: 0.9, eyeSmile: 0.35, glow: 0.4})},
    point: {label: 'Point', family: 'gesture', what: 'Shows where to look: the options, the tablet, the timer.',
        pose: ({t}) => ({armLeft: 88 + Math.sin(t * 2) * 4, lean: -6, lookX: -0.7, smile: 0.7})},
    nod: {label: 'Nod', family: 'gesture', what: 'Yes, well done, that is it.',
        pose: ({t}) => ({lookY: t < 1.4 ? Math.sin(t * 9) * 0.6 : 0, smile: 0.8, eyeSmile: 0.3})},
    puffed: {label: 'Out of puff', family: 'gesture', what: 'Panting after running: the class sees their own body in him.',
        pose: ({t, amp}) => ({bellyScale: 1 + 0.09 * Math.sin(t * 9) * amp, squash: 0.03 * Math.sin(t * 9), mouthOpen: 0.45 + 0.25 * Math.sin(t * 9),
            lean: 5, armLeft: 18, armRight: 18, eyeOpen: 1, smile: 0.35})},
    jog: {label: 'Jog on the spot', family: 'move', what: 'Feet up in turn, arms pumping, a bounce on every step.',
        pose: ({beat, amp}) => ({footLeft: Math.max(0, pulse(beat)) * 15 * amp, footRight: Math.max(0, -pulse(beat)) * 15 * amp,
            y: -Math.abs(pulse(beat)) * 9 * amp, armLeft: 32 + pulse(beat) * 36 * amp, armRight: 32 - pulse(beat) * 36 * amp,
            squash: 0.04 * Math.cos(TAU * 2 * beat), smile: 0.8, lean: 2})},
    walk: {label: 'Walk on the spot', family: 'move', what: 'The jog, slowed and softened.',
        pose: ({beat, amp}) => ({footLeft: Math.max(0, pulse(beat)) * 8 * amp, footRight: Math.max(0, -pulse(beat)) * 8 * amp,
            y: -Math.abs(pulse(beat)) * 3, armLeft: 18 + pulse(beat) * 18 * amp, armRight: 18 - pulse(beat) * 18 * amp, smile: 0.65})},
    tiptoe: {label: 'Tiptoe', family: 'move', what: 'Up tall and quiet, arms out for balance.',
        pose: ({beat, t, amp}) => ({y: -10, squash: 0.05, footLeft: Math.max(0, pulse(beat)) * 5, footRight: Math.max(0, -pulse(beat)) * 5,
            armLeft: 70 + Math.sin(t * 3) * 6 * amp, armRight: 70 - Math.sin(t * 3) * 6 * amp, lookX: Math.sin(t * 1.2) * 0.6, mouthOpen: 0.22, smile: 0.1})},
    reach: {label: 'Reach up', family: 'move', what: 'Both arms high, a long stretch.',
        pose: ({beat, amp}) => ({armLeft: 160, armRight: 160, squash: 0.08 + 0.02 * pulse(beat / 2) * amp, y: -4, eyeSmile: 0.5, smile: 0.7})},
    sway: {label: 'Sway', family: 'move', what: 'Arms up, swaying side to side like a tree.',
        pose: ({beat, amp}) => ({lean: pulse(beat / 2) * 10 * amp, x: pulse(beat / 2) * 6 * amp, armLeft: 150, armRight: 150, eyeSmile: 0.4, smile: 0.7})},
    shake: {label: 'Shake it out', family: 'move', what: 'Loose arms and a wiggle, to let the zoom out.',
        pose: ({t, amp}) => ({armLeft: 40 + Math.sin(t * 31) * 14 * amp, armRight: 40 + Math.sin(t * 27) * 14 * amp, x: Math.sin(t * 23) * 2, squash: 0.02 * Math.sin(t * 19), smile: 0.9})},
    squeeze: {label: 'Squeeze and let go', family: 'move', what: 'A tight hug, then a slow, floppy release.',
        pose: ({t}) => {
            const squeezing = (t % 6) < 3;
            return squeezing
                ? {armLeft: -55, armRight: -55, squash: -0.07, eyeOpen: 0.15, smile: 0.2}
                : {armLeft: 22, armRight: 22, squash: 0.03, eyeSmile: 0.7, smile: 0.7, bellyScale: 1.06};
        }},
    freeze: {label: 'Freeze', family: 'hold', what: 'Statue: everything stops, eyes wide. The mixer holds the pose he was in.',
        pose: () => ({eyeOpen: 1, smile: 0.3})},
    breathe: {label: 'Breathe with me', family: 'breath', what: 'Hands on belly; the belly grows on the in-breath and shrinks on the out-breath.',
        pose: (context) => {
            const amount = breathAmount(context);
            return {armLeft: HANDS_ON_BELLY, armRight: HANDS_ON_BELLY, bellyScale: 1 + 0.17 * amount, squash: 0.03 * amount, y: -2 * amount,
                eyeOpen: 0.4, eyeSmile: 0.25, smile: 0.45, lookY: 0.25};
        }},
    calm: {label: 'Calm pose', family: 'hold', what: 'Sitting low, hands on belly, the brand mark\'s happy closed eyes. Every session ends here.',
        pose: (context) => ({y: 9, squash: -0.06, armLeft: HANDS_ON_BELLY, armRight: HANDS_ON_BELLY, bellyScale: 1 + 0.07 * breathAmount(context), eyeSmile: 1, smile: 0.7})},
    cheer: {label: 'Little hop', family: 'signature', what: 'His happy hop, kept for finishing, never for a color.',
        pose: ({t, amp}) => ({y: t < 1.6 ? -Math.abs(Math.sin(t * TAU * 1.25)) * 17 * amp : 0, armLeft: 150, armRight: 150, eyeSmile: 1, smile: 1, glow: 1})},
    'belly-pat': {label: 'Belly pat', family: 'signature', what: 'Two pats on his belly: his sign that his body feels ready.',
        pose: ({t}) => ({armLeft: HANDS_ON_BELLY, armRight: HANDS_ON_BELLY + (t < 1.3 ? Math.max(0, Math.sin(t * 14)) * 14 : 0), eyeSmile: 0.8, smile: 0.85})},
    sigh: {label: 'Happy sigh', family: 'signature', what: 'A soft "ahh" after the last breath.',
        pose: ({t}) => ({squash: -0.05 * Math.sin(Math.min(1, t / 1.6) * Math.PI), mouthOpen: 0.35 * Math.max(0, 1 - t / 1.6), eyeOpen: 0.3, eyeSmile: 0.5, armLeft: HANDS_ON_BELLY, armRight: HANDS_ON_BELLY})},
    headphones: {label: 'Headphones on', family: 'move', what: 'Headphones on, eyes closed, a slow sway to quiet sound.',
        pose: ({t, amp}) => ({headphones: 1, eyeSmile: 0.9, smile: 0.6, lean: Math.sin(t * 1.1) * 4 * amp, armLeft: HANDS_ON_BELLY, armRight: HANDS_ON_BELLY})},
};

/** @param {string} name */
export function motionNamed(name) {
    const motion = MOTIONS[name];
    if (!motion) throw new Error(`Reggie has no motion called "${name}"`);
    return motion;
}
