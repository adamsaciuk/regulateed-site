// @ts-check
// The session player: walks a session's boxes on one clock, speaks each box's lines at their moment,
// rings the chime between boxes, obeys the teacher's controls and writes the run record at the end.
// Ending early never skips the wind-down or the re-check, so every run counts honestly in the trends.

import {seededRandom} from './animator.js';
import {boxTypeOf, paceOf} from './boxes.js';
import {ROOM_FEEL, VOICE} from './constants.js';
import {fillSlots, pickLine} from './lines.js';

/** @typedef {import('./boxes.js').Box} Box */
/** @typedef {import('./boxes.js').BoxFrame} BoxFrame */

/**
 * @typedef {object} Session
 * @property {string} id
 * @property {string} title
 * @property {string} grade
 * @property {'young' | 'older'} age
 * @property {string} moment
 * @property {keyof typeof ROOM_FEEL} room
 * @property {'class' | 'device'} screen
 * @property {import('./voice.js').VoiceMode} voiceMode
 * @property {Record<string, string>} theme
 * @property {{insight: string, text: string, week: {day: string, green: number, yellow: number, red: number}[]}} trend
 * @property {{method: string, green: number, yellow: number, red: number}} before
 * @property {{method: string}} after
 * @property {{kind: 'garden' | 'own-star', count: number}} reward
 * @property {Box[]} boxes
 */

/**
 * @typedef {object} PlayerHooks
 * @property {(index: number, box: Box) => void} onBox
 * @property {(caption: {text: string, speaker: string}) => void} onCaption
 * @property {(record: object) => void} onDone
 */

export class SessionPlayer {
    /**
     * @param {Session} session
     * @param {import('./voice.js').ReggieVoice} voice
     * @param {import('./voice.js').SessionSound} sound
     * @param {PlayerHooks} hooks
     */
    constructor(session, voice, sound, hooks) {
        this.session = session;
        this.voice = voice;
        this.sound = sound;
        this.hooks = hooks;
        this.feel = ROOM_FEEL[session.room];
        this.random = seededRandom(Date.now() & 0xffff);
        /** @type {Map<string, string>} */
        this.lastSaid = new Map();
        this.index = 0;
        this.local = 0;
        this.playing = false;
        this.finished = false;
        this.endedEarly = false;
        this.activeSeconds = 0;
        /** @type {Set<number>} */
        this.spoken = new Set();
        /** @type {string[]} */
        this.completedBoxes = [];
        /** @type {object | null} */
        this.afterReading = null;
        this.lastBeat = 0;
    }

    get box() {
        return this.session.boxes[this.index];
    }

    get isWaiting() {
        return boxTypeOf(this.box.type).waits === true && !this.finished;
    }

    plannedSeconds() {
        return this.session.boxes.reduce((sum, box) => sum + boxTypeOf(box.type).seconds(box), 0);
    }

    /** @param {number} seconds */
    tick(seconds) {
        if (!this.playing || this.isWaiting || this.finished) return;
        this.local += seconds;
        this.activeSeconds += seconds;
        this.speakDue();
        const frame = this.frame();
        if (frame.beatTick && frame.bpm) this.tickBeat(frame.bpm, seconds);
        if (this.local >= boxTypeOf(this.box.type).seconds(this.box)) this.advance();
    }

    /** @returns {BoxFrame} */
    frame() {
        const frame = boxTypeOf(this.box.type).frame(this.box, this.local);
        return frame.bpm ? {...frame, bpm: frame.bpm * this.feel.tempo} : frame;
    }

    /**
     * @param {number} bpm
     * @param {number} seconds
     */
    tickBeat(bpm, seconds) {
        this.lastBeat += seconds * (bpm / 60);
        if (this.lastBeat < 1) return;
        this.lastBeat -= 1;
        this.sound.beatTick();
    }

    speakDue() {
        const cues = boxTypeOf(this.box.type).speech(this.box);
        cues.forEach((cue, position) => {
            if (this.spoken.has(position) || cue.at > this.local) return;
            this.spoken.add(position);
            const slots = {...this.session.theme, ...(cue.slots ?? {}), pace: paceOf(this.box).label};
            const text = cue.text ? fillSlots(cue.text, slots) : pickLine(cue.intent ?? 'greet', this.session.age, this.random, this.lastSaid, slots);
            const isCalming = this.box.type === 'wind-down' || this.box.type === 'breathe';
            this.voice.rate = isCalming ? Math.min(this.feel.voiceRate, VOICE.calmRate) : this.feel.voiceRate;
            this.voice.say(text, this.hooks.onCaption);
        });
    }

    advance() {
        this.completedBoxes.push(this.box.type);
        if (this.index >= this.session.boxes.length - 1) return this.finish();
        this.index += 1;
        this.local = 0;
        this.lastBeat = 0;
        this.spoken = new Set();
        this.sound.chime();
        this.hooks.onBox(this.index, this.box);
    }

    // The teacher's Start: leaves the Before box.
    start() {
        this.sound.wake();
        this.playing = true;
        if (this.box.type === 'before') this.advance();
    }

    togglePause() {
        this.playing = !this.playing;
        if (!this.playing) this.voice.hush();
    }

    // Wind down now: straight to the calm finish. The re-check still follows.
    windDownNow() {
        const windDown = this.session.boxes.findIndex((box, position) => position > this.index && box.type === 'wind-down');
        if (windDown < 0) return;
        this.endedEarly = true;
        this.voice.hush();
        this.index = windDown - 1;
        this.advance();
    }

    skip() {
        if (this.isWaiting || this.box.type === 'wind-down') return;
        this.endedEarly = true;
        this.voice.hush();
        this.advance();
    }

    /** @param {object} reading */
    saveAfterReading(reading) {
        this.afterReading = reading;
        this.advance();
    }

    finish() {
        this.finished = true;
        this.playing = false;
        this.sound.finish();
        this.hooks.onDone(this.record());
    }

    record() {
        const breathe = this.session.boxes.find((box) => box.type === 'breathe');
        const stamp = new Date().toISOString();
        return {
            note: 'Mock data, placeholder numbers. Anonymous class results only, never a record of one child.',
            event: {moment: this.session.moment, grade: this.session.grade, session: this.session.id, at: stamp},
            before: {purpose: 'check-in', ...this.session.before},
            activityRun: {
                activity: this.session.title, room: this.session.room, voiceMode: this.voice.mode,
                pace: breathe ? paceOf(breathe).label : null,
                plannedSeconds: Math.round(this.plannedSeconds()), actualSeconds: Math.round(this.activeSeconds),
                endedEarly: this.endedEarly, boxesCompleted: this.completedBoxes,
            },
            after: {purpose: 're-check', linkedTo: 'activityRun', ...this.afterReading},
        };
    }
}
