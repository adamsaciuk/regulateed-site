// @ts-check
// Reggie's voice and the session's sounds. Three ways to speak, chosen per screen (Adam, 2026-11-19):
// the class screen in the younger grades can let Reggie talk; a room of tablets stays silent with captions
// until the many-tablets audio question is worked out.

import {VOICE} from './constants.js';

/** @typedef {'reggie' | 'teacher' | 'captions'} VoiceMode */

export const VOICE_MODES = {
    reggie: 'Reggie speaks',
    teacher: 'Teacher reads aloud',
    captions: 'Captions only',
};

const SAVED_VOICE_KEY = 'regulateed.reggie.voice';
// Microsoft Edge carries neural voices named "... Online (Natural)"; Chrome on Windows does not, and its voices sound robotic.
export const NATURAL_VOICE = /natural/i;

/** @typedef {{name: string, pitch: number, speed: number}} SavedVoice */

/** @returns {SavedVoice | null} */
export function savedVoice() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_VOICE_KEY) ?? 'null');
        return saved && typeof saved.pitch === 'number' && typeof saved.speed === 'number' ? saved : null;
    } catch {
        return null;
    }
}

/** @param {SavedVoice | null} choice null goes back to the default */
export function saveVoice(choice) {
    if (choice) localStorage.setItem(SAVED_VOICE_KEY, JSON.stringify(choice));
    else localStorage.removeItem(SAVED_VOICE_KEY);
}

export class ReggieVoice {
    constructor() {
        /** @type {VoiceMode} */
        this.mode = 'reggie';
        this.speaking = false;
        this.rate = VOICE.rate;
        const saved = savedVoice();
        this.pitch = saved?.pitch ?? VOICE.pitch;
        // The lab's speed scales every rate the session asks for, so calm parts stay slower.
        this.speed = saved?.speed ?? 1;
        this.savedName = saved?.name ?? '';
        /** @type {SpeechSynthesisVoice | null} */
        this.chosenVoice = null;
        this.canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
        if (this.canSpeak) {
            this.chooseVoice();
            window.speechSynthesis.addEventListener('voiceschanged', () => this.chooseVoice());
        }
    }

    // Reggie is a young boy (Jordan, 2026-11-19). Browsers carry no boy's voice, so this takes a male
    // US voice and raises the pitch; his real voice replaces it later.
    chooseVoice() {
        const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en-US'));
        const male = (/** @type {RegExp} */ names) => voices.find((voice) => names.test(voice.name));
        const saved = window.speechSynthesis.getVoices().find((voice) => voice.name === this.savedName);
        const naturalMale = voices.find((voice) => NATURAL_VOICE.test(voice.name) && /andrew|brian|christopher|eric|guy|roger|steffan/i.test(voice.name));
        this.chosenVoice = saved ?? naturalMale ?? male(/david|mark|alex|aaron|fred/i) ?? voices[0] ?? null;
    }

    /**
     * Say a line. Captions always show it; only the Reggie mode turns it into sound.
     * @param {string} text
     * @param {(caption: {text: string, speaker: VoiceMode}) => void} showCaption
     */
    say(text, showCaption) {
        showCaption({text, speaker: this.mode});
        if (this.mode !== 'reggie' || !this.canSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.rate * this.speed;
        utterance.pitch = this.pitch;
        utterance.volume = VOICE.volume;
        if (this.chosenVoice) utterance.voice = this.chosenVoice;
        utterance.onstart = () => { this.speaking = true; };
        utterance.onend = () => { this.speaking = false; };
        utterance.onerror = () => { this.speaking = false; };
        window.speechSynthesis.speak(utterance);
    }

    hush() {
        if (this.canSpeak) window.speechSynthesis.cancel();
        this.speaking = false;
    }
}

// Generated tones only: nothing here needs music rights. PLACEHOLDER until Jordan picks the music.
export class SessionSound {
    constructor() {
        this.enabled = true;
        /** @type {AudioContext | null} */
        this.context = null;
    }

    wake() {
        if (!this.context) this.context = new AudioContext();
        if (this.context.state === 'suspended') this.context.resume();
    }

    /**
     * @param {number} frequency
     * @param {number} startIn seconds from now
     * @param {number} length seconds
     * @param {number} loudness
     */
    tone(frequency, startIn, length, loudness) {
        if (!this.enabled || !this.context) return;
        const start = this.context.currentTime + startIn;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(loudness, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(start);
        oscillator.stop(start + length + 0.05);
    }

    // Between boxes: a soft two-note chime, the same every time, so the class learns it means "next".
    chime() {
        this.tone(660, 0, 0.6, 0.08);
        this.tone(880, 0.12, 0.8, 0.06);
    }

    beatTick() {
        this.tone(220, 0, 0.12, 0.05);
    }

    finish() {
        this.tone(523, 0, 0.5, 0.07);
        this.tone(659, 0.14, 0.5, 0.07);
        this.tone(784, 0.28, 0.9, 0.07);
    }
}
