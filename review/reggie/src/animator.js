// @ts-check
// The animator keeps Reggie alive between and across motions. It is what stops him looking robotic:
// motions melt into each other, an alive layer always runs underneath, the antenna lags on a spring,
// blinks come at odd times, and every run of a motion is a little different in size and timing.

import {ANTENNA_SPRING, BLINK, CROSSFADE_SECONDS, REDUCED_MOTION_SCALE, VARIATION} from './constants.js';
import {motionNamed} from './motions.js';
import {NEUTRAL_POSE} from './rig.js';

/** @typedef {import('./rig.js').Pose} Pose */

/** @param {number} seed */
export function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
}

const SCALED_PARTS = /** @type {const} */ (['x', 'y', 'lean', 'squash', 'armLeft', 'armRight', 'footLeft', 'footRight']);
const smooth = (/** @type {number} */ p) => p * p * (3 - 2 * p);

/**
 * @param {Pose} from
 * @param {Pose} to
 * @param {number} weight
 * @returns {Pose}
 */
function blend(from, to, weight) {
    const out = {...to};
    for (const key of /** @type {(keyof Pose)[]} */ (Object.keys(to))) out[key] = from[key] + (to[key] - from[key]) * weight;
    return out;
}

export class ReggieAnimator {
    /**
     * @param {import('./rig.js').ReggieRig} rig
     * @param {number} seed
     */
    constructor(rig, seed) {
        this.rig = rig;
        this.random = seededRandom(seed);
        this.reducedMotion = false;
        this.clock = 0;
        this.motionName = 'idle';
        this.motionKey = '';
        this.motionTime = 0;
        this.beat = 0;
        this.amp = 1;
        this.tempo = 1;
        this.wobble = this.random() * 6;
        /** @type {Pose} */
        this.pose = {...NEUTRAL_POSE};
        /** @type {Pose} */
        this.fadeFrom = {...NEUTRAL_POSE};
        this.fadeTime = CROSSFADE_SECONDS;
        /** @type {Pose | null} */
        this.held = null;
        this.nextBlink = this.blinkGap();
        this.blinkLeft = 0;
        this.antenna = {angle: 0, speed: 0, lastX: 0, lastY: 0};
    }

    blinkGap() {
        return BLINK.minGapSeconds + this.random() * (BLINK.maxGapSeconds - BLINK.minGapSeconds);
    }

    /**
     * Start a motion. The same key twice does nothing, so a box can ask every frame.
     * @param {string} name
     * @param {string} [key]
     */
    play(name, key = name) {
        if (key === this.motionKey) return;
        motionNamed(name);
        this.fadeFrom = {...this.pose};
        this.fadeTime = 0;
        this.motionName = name;
        this.motionKey = key;
        this.motionTime = 0;
        this.beat = 0;
        this.amp = 1 + (this.random() * 2 - 1) * VARIATION.amplitude;
        this.tempo = 1 + (this.random() * 2 - 1) * VARIATION.tempo;
        this.wobble = this.random() * 6;
        this.held = name === 'freeze' ? {...this.pose} : null;
    }

    /**
     * @param {number} seconds
     * @param {{bpm?: number, breath?: {phase: 'in' | 'hold' | 'out', progress: number} | null, speaking?: boolean}} drive
     */
    tick(seconds, drive) {
        this.clock += seconds;
        this.motionTime += seconds;
        this.beat += seconds * ((drive.bpm ?? 60) / 60) * this.tempo;
        this.fadeTime += seconds;
        const target = this.targetPose(drive.breath ?? null);
        const weight = smooth(Math.min(1, this.fadeTime / CROSSFADE_SECONDS));
        let pose = blend(this.fadeFrom, target, weight);
        pose = this.addTalking(pose, drive.speaking === true);
        pose = this.addBlink(pose, seconds);
        if (this.reducedMotion) pose = this.shrink(pose);
        this.pose = pose;
        this.rig.apply(pose, this.springAntenna(pose, seconds));
    }

    /** @param {{phase: 'in' | 'hold' | 'out', progress: number} | null} breath */
    targetPose(breath) {
        const t = this.clock + this.wobble;
        const alive = {...NEUTRAL_POSE, bellyScale: 1 + 0.035 * Math.sin(t * 1.25), y: 1.2 * Math.sin(t * 1.25), lean: 1.2 * Math.sin(t * 0.45)};
        if (this.held) {
            const settle = Math.max(0, 1 - this.motionTime / 0.7);
            return {...this.held, eyeOpen: 1, lean: this.held.lean + Math.sin(this.motionTime * 18) * 3 * settle};
        }
        const context = {t: this.motionTime, beat: this.beat, amp: this.amp, breath, wobble: this.wobble};
        return {...alive, ...motionNamed(this.motionName).pose(context)};
    }

    /**
     * @param {Pose} pose
     * @param {boolean} speaking
     */
    addTalking(pose, speaking) {
        if (!speaking) return pose;
        const chatter = Math.abs(Math.sin(this.clock * 13) * Math.sin(this.clock * 7.3));
        return {...pose, mouthOpen: Math.max(pose.mouthOpen, 0.15 + chatter * 0.45), glow: Math.max(pose.glow, 0.5)};
    }

    /**
     * @param {Pose} pose
     * @param {number} seconds
     */
    addBlink(pose, seconds) {
        this.nextBlink -= seconds;
        if (this.nextBlink <= 0 && this.blinkLeft <= 0) {
            this.blinkLeft = BLINK.closeSeconds;
            this.nextBlink = this.random() < BLINK.doubleChance ? BLINK.closeSeconds * 2.2 : this.blinkGap();
        }
        if (this.blinkLeft <= 0) return pose;
        this.blinkLeft -= seconds;
        return {...pose, eyeOpen: pose.eyeOpen * 0.05};
    }

    /** @param {Pose} pose */
    shrink(pose) {
        const out = {...pose};
        for (const part of SCALED_PARTS) out[part] = NEUTRAL_POSE[part] + (pose[part] - NEUTRAL_POSE[part]) * REDUCED_MOTION_SCALE;
        return out;
    }

    /**
     * @param {Pose} pose
     * @param {number} seconds
     */
    springAntenna(pose, seconds) {
        const step = Math.min(seconds, 1 / 30);
        const spring = this.antenna;
        const sideways = (pose.x - spring.lastX) / Math.max(step, 0.001);
        const upward = (pose.y - spring.lastY) / Math.max(step, 0.001);
        spring.lastX = pose.x;
        spring.lastY = pose.y;
        const target = -pose.lean * 0.6 - sideways * 0.25 + upward * 0.12;
        const force = -ANTENNA_SPRING.stiffness * (spring.angle - target) - ANTENNA_SPRING.damping * spring.speed;
        spring.speed += force * step;
        spring.angle += spring.speed * step;
        return Math.max(-35, Math.min(35, spring.angle));
    }
}
