// @ts-check
// The Reggie lab: try every voice this device has, with pitch and speed, on Reggie's own lines,
// keep a choice for the engine, and try each of his motions on its own.

import {ReggieAnimator} from './animator.js';
import {VOICE} from './constants.js';
import {LINES, pickLine} from './lines.js';
import {MOTIONS} from './motions.js';
import {ReggieRig} from './rig.js';
import {element} from './screens.js';
import {NATURAL_VOICE, ReggieVoice, saveVoice, savedVoice} from './voice.js';

// Known male voice names; the browser does not say a voice's gender, so this is read from the name.
const MALE_NAMES = /andrew|brian|christopher|eric|guy|roger|steffan|davis|jason|tony|david|mark|alex|aaron|fred|daniel|tom|ryan|james/i;
const PRESETS = [
    {label: 'Young boy (suggested)', pitch: VOICE.pitch, speed: 1},
    {label: 'Younger still', pitch: 1.85, speed: 1.06},
    {label: 'Calm Reggie', pitch: 1.5, speed: 0.86},
    {label: 'Excited Reggie', pitch: 1.75, speed: 1.15},
];
const FAMILY_NAMES = /** @type {Record<string, string>} */ ({alive: 'Alive', breath: 'Breath', move: 'Moves', hold: 'Holds', gesture: 'Gestures', signature: 'Signatures'});

/** @param {string} id */
const byId = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (byId(id));

const voice = new ReggieVoice();
voice.mode = 'reggie';
const animator = new ReggieAnimator(new ReggieRig(byId('lab-reggie')), 11);
const lastSaid = new Map();
let motionName = 'idle';
let breathClock = 0;

/** @param {SpeechSynthesisVoice} candidate */
const isMale = (candidate) => MALE_NAMES.test(candidate.name);

/** @param {SpeechSynthesisVoice} candidate */
const isNatural = (candidate) => NATURAL_VOICE.test(candidate.name);

// Natural voices first, then male ones if asked.
function listedVoices() {
    const all = window.speechSynthesis.getVoices();
    const shown = input('english-only').checked ? all.filter((candidate) => candidate.lang.startsWith('en-US')) : all;
    const maleFirst = input('male-only').checked;
    const score = (/** @type {SpeechSynthesisVoice} */ candidate) => Number(isNatural(candidate)) * 2 + Number(maleFirst && isMale(candidate));
    return [...shown].sort((a, b) => score(b) - score(a));
}

function showVoiceWarning() {
    const hasNatural = window.speechSynthesis.getVoices().some(isNatural);
    byId('voice-warning').hidden = hasNatural || window.speechSynthesis.getVoices().length === 0;
}

function renderVoices() {
    const host = byId('voice-list');
    host.replaceChildren();
    for (const candidate of listedVoices()) {
        const button = element('button', `voice${candidate === voice.chosenVoice ? ' on' : ''}${isMale(candidate) ? ' male' : ''}${isNatural(candidate) ? ' natural' : ''}`);
        button.append(element('b', '', candidate.name.replace(/^Microsoft /, '').replace(/ - .*$/, '')), element('span', '', `${candidate.lang} · ${candidate.localService ? 'on this device' : 'online'}`));
        button.addEventListener('click', () => { voice.chosenVoice = candidate; renderVoices(); say(pickLine('greet', 'young', Math.random, lastSaid)); });
        host.appendChild(button);
    }
    if (!host.children.length) host.appendChild(element('p', 'hint', 'No voices found yet. Some browsers load them a moment after the page opens.'));
    showVoiceWarning();
}

function showSliders() {
    input('pitch').value = String(voice.pitch);
    input('speed').value = String(voice.speed);
    byId('pitch-out').textContent = voice.pitch.toFixed(2);
    byId('speed-out').textContent = `${voice.speed.toFixed(2)}×`;
    for (const button of byId('presets').children) {
        const preset = PRESETS.find((item) => item.label === button.textContent);
        button.classList.toggle('on', Boolean(preset && preset.pitch === voice.pitch && preset.speed === voice.speed));
    }
}

/** @param {string} text */
function say(text) {
    voice.hush();
    voice.rate = VOICE.rate;
    voice.say(text, (caption) => { byId('lab-caption').textContent = caption.text; });
}

// Says the same words in each listed voice in turn, so they can be heard side by side.
async function compareVoices() {
    const text = input('own-words').value || 'Hi friends! I am Reggie.';
    for (const candidate of listedVoices().slice(0, 8)) {
        voice.chosenVoice = candidate;
        renderVoices();
        say(`${candidate.name.replace(/^Microsoft /, '').replace(/ Online.*$| - .*$/, '')}. ${text}`);
        await new Promise((resolve) => { const check = setInterval(() => { if (!window.speechSynthesis.speaking) { clearInterval(check); resolve(null); } }, 250); });
    }
}

function showSavedNote() {
    const saved = savedVoice();
    byId('saved-note').textContent = saved
        ? `The engine uses: ${saved.name || 'the default voice'}, pitch ${saved.pitch.toFixed(2)}, speed ${saved.speed.toFixed(2)}×. Saved in this browser only.`
        : 'The engine uses the default: a male US voice, pitch raised. Nothing saved yet.';
}

function renderMotions() {
    const host = byId('motion-buttons');
    for (const family of Object.keys(FAMILY_NAMES)) {
        const row = element('div', 'motion-family');
        row.appendChild(element('span', '', FAMILY_NAMES[family]));
        for (const [name, motion] of Object.entries(MOTIONS).filter(([, item]) => item.family === family)) {
            const button = element('button', '', motion.label);
            button.dataset.motion = name;
            button.addEventListener('click', () => playMotion(name));
            row.appendChild(button);
        }
        host.appendChild(row);
    }
}

/** @param {string} name */
function playMotion(name) {
    motionName = name;
    breathClock = 0;
    animator.play(name, `${name}-${Date.now()}`);
    byId('motion-what').textContent = MOTIONS[name].what;
    for (const button of byId('motion-buttons').querySelectorAll('button')) button.classList.toggle('on', button.dataset.motion === name);
}

function wire() {
    for (const preset of PRESETS) {
        const button = element('button', '', preset.label);
        button.addEventListener('click', () => { voice.pitch = preset.pitch; voice.speed = preset.speed; showSliders(); say(pickLine('greet', 'young', Math.random, lastSaid)); });
        byId('presets').appendChild(button);
    }
    input('pitch').addEventListener('input', () => { voice.pitch = Number(input('pitch').value); showSliders(); });
    input('speed').addEventListener('input', () => { voice.speed = Number(input('speed').value); showSliders(); });
    input('english-only').addEventListener('change', renderVoices);
    input('male-only').addEventListener('change', renderVoices);
    const intents = /** @type {HTMLSelectElement} */ (byId('intent'));
    intents.replaceChildren(...Object.keys(LINES).map((intent) => new Option(intent, intent)));
    const age = /** @type {HTMLSelectElement} */ (byId('age'));
    byId('say-line').addEventListener('click', () => say(pickLine(intents.value, /** @type {'young' | 'older'} */ (age.value), Math.random, lastSaid, {place: 'the playground'})));
    byId('say-own').addEventListener('click', () => say(input('own-words').value));
    byId('compare').addEventListener('click', compareVoices);
    byId('stop').addEventListener('click', () => voice.hush());
    byId('save').addEventListener('click', () => { saveVoice({name: voice.chosenVoice?.name ?? '', pitch: voice.pitch, speed: voice.speed}); showSavedNote(); });
    byId('reset').addEventListener('click', () => { saveVoice(null); voice.pitch = VOICE.pitch; voice.speed = 1; voice.savedName = ''; voice.chooseVoice(); renderVoices(); showSliders(); showSavedNote(); });
    input('bpm').addEventListener('input', () => { byId('bpm-out').textContent = input('bpm').value; });
    input('lab-reduced').addEventListener('change', () => { animator.reducedMotion = input('lab-reduced').checked; });
}

let lastFrame = performance.now();
/** @param {number} now */
function animate(now) {
    const seconds = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    breathClock += seconds;
    const within = breathClock % 8;
    const breath = within < 3 ? {phase: /** @type {'in'} */ ('in'), progress: within / 3} : {phase: /** @type {'out'} */ ('out'), progress: (within - 3) / 5};
    animator.tick(seconds, {bpm: Number(input('bpm').value), breath: motionName === 'breathe' ? breath : null, speaking: window.speechSynthesis.speaking});
    requestAnimationFrame(animate);
}

wire();
renderMotions();
renderVoices();
showSliders();
showSavedNote();
window.speechSynthesis.addEventListener('voiceschanged', () => setTimeout(() => { voice.chooseVoice(); renderVoices(); }, 0));
requestAnimationFrame(animate);
