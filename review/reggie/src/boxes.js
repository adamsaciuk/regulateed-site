// @ts-check
// The session boxes. A session is a list of these. Each box type says how long it runs, what Reggie
// does at every moment, what he says and when, and what the screen shows. Boxes never draw anything
// themselves, so the same box runs on the class screen, the teacher's screen or a child's tablet.

import {BREATH_PACES, REWARD_SECONDS, SPOKEN_BREATHS, WIND_DOWN_SECONDS} from './constants.js';

/**
 * @typedef {object} Box
 * @property {string} type
 * @property {number} [seconds]
 * @property {string} [motion]
 * @property {string[]} [say]
 * @property {string} [caption]
 * @property {string[]} [moves]
 * @property {{fromBpm: number, toBpm: number}} [tempo]
 * @property {number} [breaths]
 * @property {keyof typeof BREATH_PACES} [pace]
 * @property {string} [cue]
 * @property {string} [engagement]
 * @property {string[]} [options]
 * @property {'class' | 'device'} [screen]
 */

/**
 * @typedef {object} BoxFrame
 * @property {string} motion
 * @property {string} motionKey   a new key starts the motion again, even with the same name
 * @property {number} [bpm]
 * @property {{phase: 'in' | 'hold' | 'out', progress: number} | null} [breath]
 * @property {string} [label]     the big word on screen: the move, "Breathe in"
 * @property {string} [aid]       which on-screen aid to show: breath, countdown, garden
 * @property {number} [aidValue]  0 to 1
 * @property {boolean} [beatTick]
 */

/** @typedef {{at: number, intent?: string, text?: string, slots?: Record<string, string | number>}} SpeechCue */

/**
 * @typedef {object} BoxType
 * @property {string} label
 * @property {string} what
 * @property {boolean} [waits]    the player stops here for the teacher or the class
 * @property {(box: Box) => number} seconds
 * @property {(box: Box, local: number) => BoxFrame} frame
 * @property {(box: Box) => SpeechCue[]} speech
 * @property {(box: Box) => string[]} motions  every motion this box can use, for the toolkit
 */

const MOVE_WORDS = /** @type {Record<string, string>} */ ({jog: 'Jog', walk: 'Walk', tiptoe: 'Tiptoe', reach: 'Reach', sway: 'Sway', shake: 'Shake'});

/** @param {Box} box */
export function paceOf(box) {
    return BREATH_PACES[box.pace ?? 'steady'];
}

/** @param {Box} box */
function breathSeconds(box) {
    const pace = paceOf(box);
    return pace.inSeconds + pace.holdSeconds + pace.outSeconds;
}

/**
 * @param {Box} box
 * @param {number} local
 * @returns {BoxFrame}
 */
function breatheFrame(box, local) {
    const pace = paceOf(box);
    const total = breathSeconds(box) * (box.breaths ?? 5);
    if (local >= total) return {motion: local < total + 1.8 ? 'sigh' : 'belly-pat', motionKey: local < total + 1.8 ? 'sigh' : 'pat', label: 'Ahh'};
    const within = local % breathSeconds(box);
    const count = Math.floor(local / breathSeconds(box)) + 1;
    if (within < pace.inSeconds) return {motion: 'breathe', motionKey: 'breathe', breath: {phase: 'in', progress: within / pace.inSeconds}, label: `Breathe in · ${count}`, aid: 'breath', aidValue: within / pace.inSeconds};
    const afterIn = within - pace.inSeconds;
    if (afterIn < pace.holdSeconds) return {motion: 'breathe', motionKey: 'breathe', breath: {phase: 'hold', progress: afterIn / pace.holdSeconds}, label: 'Hold', aid: 'breath', aidValue: 1};
    const out = (afterIn - pace.holdSeconds) / pace.outSeconds;
    return {motion: 'breathe', motionKey: 'breathe', breath: {phase: 'out', progress: out}, label: `And out · ${count}`, aid: 'breath', aidValue: 1 - out};
}

/** @param {Box} box */
function breatheSpeech(box) {
    /** @type {SpeechCue[]} */
    const cues = [{at: 0, intent: 'bridge-breathe'}];
    const lead = 3.2;
    const total = breathSeconds(box) * (box.breaths ?? 5);
    for (let breath = 0; breath < Math.min(SPOKEN_BREATHS, box.breaths ?? 5); breath++) {
        cues.push({at: lead + breath * breathSeconds(box), intent: 'breathe-in'});
        cues.push({at: lead + breath * breathSeconds(box) + paceOf(box).inSeconds, intent: 'breathe-out'});
    }
    cues.push({at: lead + total, intent: 'breathe-done'});
    return cues;
}

/**
 * @param {Box} box
 * @param {number} local
 * @returns {BoxFrame}
 */
function followFrame(box, local) {
    const moves = box.moves ?? ['jog'];
    const length = box.seconds ?? 30;
    const index = Math.min(moves.length - 1, Math.floor((local / length) * moves.length));
    const tempo = box.tempo ?? {fromBpm: 100, toBpm: 100};
    const bpm = tempo.fromBpm + (tempo.toBpm - tempo.fromBpm) * Math.min(1, local / length);
    return {motion: moves[index], motionKey: `${moves[index]}-${index}`, bpm, label: MOVE_WORDS[moves[index]] ?? moves[index], aid: 'countdown', aidValue: 1 - local / length, beatTick: true};
}

/** @param {Box} box */
function followSpeech(box) {
    const moves = box.moves ?? ['jog'];
    const step = (box.seconds ?? 30) / moves.length;
    return [{at: 0, intent: 'bridge-follow'}, ...moves.map((move, index) => ({at: index * step + (index === 0 ? 2.6 : 0.2), intent: `move-${move}`}))];
}

/** @type {Record<string, BoxType>} */
export const BOX_TYPES = {
    before: {label: 'Before', what: 'The reading that opens the session: the check-in result and the trend that chose this activity.', waits: true,
        seconds: () => 0, frame: () => ({motion: 'idle', motionKey: 'idle'}), speech: () => [], motions: () => ['idle']},
    story: {label: 'Story', what: 'Sets the scene in a line or two, with Reggie acting it.',
        seconds: (box) => box.seconds ?? 15, frame: (box) => ({motion: box.motion ?? 'idle', motionKey: 'story'}),
        speech: (box) => (box.say ?? []).map((text, index) => ({at: 0.6 + index * 6, text})), motions: (box) => [box.motion ?? 'idle']},
    intro: {label: 'Intro', what: 'A hello and what we are about to do.',
        seconds: (box) => box.seconds ?? 10, frame: (box) => ({motion: box.motion ?? 'wave', motionKey: 'intro'}),
        speech: (box) => (box.say ? box.say.map((text, index) => ({at: 0.6 + index * 5, text})) : [{at: 0.6, intent: 'greet'}]), motions: (box) => [box.motion ?? 'wave']},
    demonstrate: {label: 'Demonstrate', what: 'Reggie shows a move once while the class watches.',
        seconds: (box) => box.seconds ?? 6, frame: (box) => ({motion: box.motion ?? 'jog', motionKey: 'demo', bpm: 70}), speech: () => [], motions: (box) => [box.motion ?? 'jog']},
    follow: {label: 'Follow', what: 'Reggie leads a run of moves and the class copies, the tempo easing from one speed to another.',
        seconds: (box) => box.seconds ?? 30, frame: followFrame, speech: followSpeech, motions: (box) => box.moves ?? ['jog']},
    freeze: {label: 'Freeze', what: 'Everything stops: a statue, then released.',
        seconds: (box) => box.seconds ?? 5,
        frame: (box, local) => (local < (box.seconds ?? 5) - 1.2 ? {motion: 'freeze', motionKey: 'freeze', label: 'Freeze!'} : {motion: 'nod', motionKey: 'release'}),
        speech: (box) => [{at: 0, intent: 'freeze'}, {at: (box.seconds ?? 5) - 1.2, intent: 'freeze-release'}], motions: () => ['freeze', 'nod']},
    breathe: {label: 'Breathe', what: 'Breathing paced by the clock; Reggie speaks the first breaths, then lets the quiet land, and ends with his sigh and belly pat.',
        seconds: (box) => breathSeconds(box) * (box.breaths ?? 5) + 3.6, frame: (box, local) => breatheFrame(box, Math.max(0, local - 3.2)),
        speech: breatheSpeech, motions: () => ['breathe', 'sigh', 'belly-pat']},
    choice: {label: 'Choice', what: 'The class, or each child on their own tablet, picks from 2 or 3 options.',
        seconds: (box) => box.seconds ?? 10, frame: () => ({motion: 'point', motionKey: 'choice', label: 'Pick your reset'}), speech: () => [{at: 0.4, intent: 'choice'}], motions: () => ['point']},
    solo: {label: 'Solo', what: 'Each child does their own reset on their own tablet, privately; the class screen shows no one.',
        seconds: (box) => box.seconds ?? 60,
        frame: (box, local) => ({motion: 'breathe', motionKey: 'solo', breath: {phase: (local % 8) < 3 ? 'in' : 'out', progress: (local % 8) < 3 ? (local % 8) / 3 : ((local % 8) - 3) / 5}, aid: 'countdown', aidValue: 1 - local / (box.seconds ?? 60), label: 'Everyone is doing their own reset'}),
        speech: () => [{at: 0.4, intent: 'solo'}], motions: () => ['breathe', 'squeeze', 'headphones']},
    'wind-down': {label: 'Wind down', what: 'Always the last 30 seconds: Reggie sits into his calm pose and the room follows.',
        seconds: () => WIND_DOWN_SECONDS, frame: (box, local) => ({motion: 'calm', motionKey: 'calm', aid: 'countdown', aidValue: 1 - local / WIND_DOWN_SECONDS}),
        speech: () => [{at: 0.5, intent: 'wind-down'}, {at: WIND_DOWN_SECONDS - 6, intent: 'praise-effort'}], motions: () => ['calm']},
    after: {label: 'After', what: 'The re-check: the teacher\'s read of the room, or each child\'s own in Grades 4 and 5.', waits: true,
        seconds: () => 0, frame: () => ({motion: 'listen', motionKey: 'after'}), speech: () => [], motions: () => ['listen']},
    reward: {label: 'Reward', what: 'For finishing and paying attention, never for the color: the class garden in K to G3, each child\'s own in G4 and G5.',
        seconds: () => REWARD_SECONDS, frame: (box, local) => ({motion: local < 2.4 ? 'cheer' : 'calm', motionKey: local < 2.4 ? 'cheer' : 'end', aid: 'garden', aidValue: Math.min(1, local / 2)}),
        speech: () => [{at: 0.3, intent: 'reward'}], motions: () => ['cheer', 'calm']},
};

/** @param {string} type */
export function boxTypeOf(type) {
    const boxType = BOX_TYPES[type];
    if (!boxType) throw new Error(`There is no session box called "${type}"`);
    return boxType;
}
