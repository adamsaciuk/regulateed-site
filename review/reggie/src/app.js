// @ts-check
// Wires the engine page: pick a session, play it on the class screen (and the tablets in Grade 4),
// the teacher's controls and the re-check, and the toolkit and session tabs.

import {boxTypeOf, paceOf} from './boxes.js';
import {BREATH_PACES, CLASS_SIZE_GRADE_4} from './constants.js';
import {SessionPlayer} from './player.js';
import {AFTER_SHIFT, ClassScreen, element, renderBefore, renderBoxStrip, simulatedAfterColors, splitBar, Tablet, TABLETS_SHOWN} from './screens.js';
import {renderToolkit} from './toolkit.js';
import {NATURAL_VOICE, ReggieVoice, SessionSound, VOICE_MODES} from './voice.js';

/** @typedef {import('./player.js').Session} Session */

// Found from this file, not the page, so the engine works wherever its page is published.
const SESSION_FILES = ['grade-1-after-recess.json', 'grade-4-start-of-day.json'].map((file) => new URL(`../sessions/${file}`, import.meta.url).href);
const TEACHER_READ_PARTS = ['Voices', 'Bodies', 'Ready to start'];

/** @param {string} id */
const byId = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const voice = new ReggieVoice();
const sound = new SessionSound();
/** @type {Session[]} */
let sessions = [];
/** @type {SessionPlayer | null} */
let player = null;
/** @type {ClassScreen | null} */
let classScreen = null;
/** @type {Tablet[]} */
let tablets = [];
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const afterColors = simulatedAfterColors();

/** @param {Session} session */
function load(session) {
    voice.hush();
    voice.mode = session.voiceMode;
    classScreen = new ClassScreen(byId('class-screen'));
    classScreen.animator.reducedMotion = reducedMotion;
    player = new SessionPlayer(session, voice, sound, {
        onBox: () => { refreshStrip(); showSidePanel(); classScreen?.caption.classList.remove('show'); },
        onCaption: (caption) => classScreen?.showCaption(caption),
        onDone: (record) => { byId('run-record').textContent = JSON.stringify(record, null, 2); byId('record-box').hidden = false; refreshControls(); },
    });
    byId('session-title').textContent = `${session.title} · Grade ${session.grade} · ${session.moment}`;
    byId('record-box').hidden = true;
    buildTablets(session);
    renderBefore(byId('before-panel'), session);
    renderSettings(session);
    refreshStrip();
    showSidePanel();
    for (const button of document.querySelectorAll('.session-pick')) button.classList.toggle('on', button.getAttribute('data-id') === session.id);
}

/** @param {Session} session */
function buildTablets(session) {
    const host = byId('tablets');
    host.replaceChildren();
    tablets = [];
    const hasTablets = session.screen === 'device';
    byId('tablet-area').hidden = !hasTablets;
    if (!hasTablets) return;
    const options = session.boxes.find((box) => box.type === 'choice')?.options ?? ['breathe'];
    for (let seat = 0; seat < TABLETS_SHOWN; seat++) {
        const tablet = new Tablet(host, seat + 1, options);
        tablet.animator.reducedMotion = reducedMotion;
        tablets.push(tablet);
    }
    byId('tablet-note').textContent = `${TABLETS_SHOWN} of ${CLASS_SIZE_GRADE_4} tablets shown. Simulated children, silent, captions only.`;
}

function refreshStrip() {
    if (!player) return;
    renderBoxStrip(byId('box-strip'), player.session, player.index);
    refreshControls();
}

function refreshControls() {
    if (!player) return;
    const waitingBefore = player.box.type === 'before';
    byId('start').hidden = !waitingBefore;
    byId('pause').hidden = waitingBefore || player.finished;
    byId('pause').textContent = player.playing ? 'Pause' : 'Resume';
    byId('wind-down').hidden = waitingBefore || player.finished || player.isWaiting;
    byId('skip').hidden = waitingBefore || player.finished || player.isWaiting;
    byId('restart').hidden = !player.finished;
}

function showSidePanel() {
    if (!player) return;
    byId('before-wrap').hidden = player.box.type !== 'before';
    const isAfter = player.box.type === 'after';
    byId('after-wrap').hidden = !isAfter;
    if (isAfter) renderAfter(player.session);
}

/** @param {Session} session */
function renderAfter(session) {
    const host = byId('after-panel');
    host.replaceChildren();
    host.appendChild(element('div', 'panel-tag', `After · ${session.after.method}`));
    if (session.screen === 'device') return renderDeviceAfter(host);
    /** @type {{classColor: string, parts: string[]}} */
    const reading = {classColor: '', parts: []};
    const colors = element('div', 'read-row');
    for (const color of ['Green', 'Yellow', 'Red']) colors.appendChild(readPill(color, `dot ${color[0]}`, () => { reading.classColor = color; markOnly(colors, color); save.disabled = false; }));
    const parts = element('div', 'read-row');
    for (const part of TEACHER_READ_PARTS) parts.appendChild(readPill(part, '', (pill) => { pill.classList.toggle('sel'); reading.parts = [...parts.querySelectorAll('.sel')].map((node) => node.textContent ?? ''); }));
    const save = /** @type {HTMLButtonElement} */ (element('button', 'go', 'Save the teacher\'s read'));
    save.disabled = true;
    save.addEventListener('click', () => player?.saveAfterReading({method: session.after.method, classColor: reading.classColor, teacherRead: reading.parts}));
    host.append(element('p', 'hint', 'Class color, then tap what is true now.'), colors, parts, save);
}

/** @param {HTMLElement} host */
function renderDeviceAfter(host) {
    host.appendChild(element('p', 'hint', 'Each child taps their own color on their tablet. The class screen and this panel show the count only.'));
    host.appendChild(splitBar(AFTER_SHIFT));
    const save = element('button', 'go', 'Close the re-check');
    save.addEventListener('click', () => player?.saveAfterReading({method: 'Each child\'s own re-check, anonymous', ...AFTER_SHIFT}));
    host.appendChild(save);
}

/**
 * @param {string} label
 * @param {string} extra
 * @param {(pill: HTMLElement) => void} onTap
 */
function readPill(label, extra, onTap) {
    const pill = element('button', `pill ${extra}`, label);
    pill.addEventListener('click', () => onTap(pill));
    return pill;
}

/**
 * @param {HTMLElement} row
 * @param {string} label
 */
function markOnly(row, label) {
    for (const pill of row.children) pill.classList.toggle('sel', pill.textContent === label);
}

/** @param {Session} session */
function renderSettings(session) {
    const voiceSelect = /** @type {HTMLSelectElement} */ (byId('voice-mode'));
    voiceSelect.replaceChildren(...Object.entries(VOICE_MODES).map(([mode, label]) => new Option(label, mode, false, mode === session.voiceMode)));
    const paceSelect = /** @type {HTMLSelectElement} */ (byId('pace'));
    const breathe = session.boxes.find((box) => box.type === 'breathe');
    byId('pace-wrap').hidden = !breathe;
    if (!breathe) return;
    paceSelect.replaceChildren(...Object.entries(BREATH_PACES).map(([key, pace]) => new Option(`${pace.label} (${pace.inSeconds} in, ${pace.outSeconds} out)`, key, false, key === breathe.pace)));
}

let lastFrame = performance.now();
/** @param {number} now */
function animate(now) {
    const seconds = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (player && classScreen) {
        player.tick(seconds);
        const frame = player.frame();
        classScreen.animator.play(frame.motion, `${player.index}-${frame.motionKey}`);
        classScreen.animator.tick(seconds, {bpm: frame.bpm, breath: frame.breath ?? null, speaking: voice.speaking});
        classScreen.show(frame, player.box, player.session);
        tablets.forEach((tablet, seat) => tablet.update(player?.box ?? {type: 'before'}, player?.index ?? 0, seconds, afterColors[seat]));
    }
    requestAnimationFrame(animate);
}

function wireControls() {
    byId('start').addEventListener('click', () => { player?.start(); refreshControls(); });
    byId('pause').addEventListener('click', () => { player?.togglePause(); refreshControls(); });
    byId('wind-down').addEventListener('click', () => player?.windDownNow());
    byId('skip').addEventListener('click', () => player?.skip());
    byId('restart').addEventListener('click', () => player && load(player.session));
    const voiceSelect = /** @type {HTMLSelectElement} */ (byId('voice-mode'));
    voiceSelect.addEventListener('change', () => { voice.hush(); voice.mode = /** @type {import('./voice.js').VoiceMode} */ (voiceSelect.value); });
    const paceSelect = /** @type {HTMLSelectElement} */ (byId('pace'));
    paceSelect.addEventListener('change', () => {
        const breathe = player?.session.boxes.find((box) => box.type === 'breathe');
        if (breathe) breathe.pace = /** @type {keyof typeof BREATH_PACES} */ (paceSelect.value);
        refreshStrip();
    });
    byId('sound').addEventListener('change', (event) => { sound.enabled = /** @type {HTMLInputElement} */ (event.target).checked; });
    const reduced = /** @type {HTMLInputElement} */ (byId('reduced'));
    reduced.checked = reducedMotion;
    reduced.addEventListener('change', () => {
        reducedMotion = reduced.checked;
        if (classScreen) classScreen.animator.reducedMotion = reducedMotion;
        for (const tablet of tablets) tablet.animator.reducedMotion = reducedMotion;
    });
    const showVoiceName = () => {
        const name = voice.chosenVoice?.name;
        byId('voice-name').textContent = !name ? 'no voice found on this device' : NATURAL_VOICE.test(name) ? name : `${name}, a basic voice: open this page in Microsoft Edge for a natural one`;
    };
    showVoiceName();
    if (voice.canSpeak) window.speechSynthesis.addEventListener('voiceschanged', () => setTimeout(showVoiceName, 0));
    for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => showTab(tab.getAttribute('data-tab') ?? 'player'));
}

/** @param {string} name */
function showTab(name) {
    for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('on', tab.getAttribute('data-tab') === name);
    for (const page of document.querySelectorAll('.tab-page')) /** @type {HTMLElement} */ (page).hidden = page.id !== `page-${name}`;
}

function renderSessionsTab() {
    const host = byId('sessions-list');
    host.replaceChildren();
    for (const session of sessions) {
        const card = element('section', 'session-card');
        card.append(element('h2', '', `${session.title} · Grade ${session.grade} · ${session.moment}`), element('p', 'hint', `Room: ${session.room}. Screen: ${session.screen === 'device' ? 'class screen and each child\'s tablet' : 'class screen'}. Planned length ${Math.round(new SessionPlayer(session, voice, sound, {onBox() {}, onCaption() {}, onDone() {}}).plannedSeconds())} s.`));
        const table = element('table', 'box-table');
        table.innerHTML = '<tr><th>#</th><th>Box</th><th>Time</th><th>Reggie</th><th>Class does</th><th>Cue</th></tr>';
        session.boxes.forEach((box, index) => {
            const type = boxTypeOf(box.type);
            const row = element('tr');
            const time = type.waits ? 'waits' : `${Math.round(type.seconds(box))} s${box.type === 'breathe' ? ` (${box.breaths} breaths, ${paceOf(box).label})` : ''}`;
            for (const text of [String(index + 1), type.label, time, type.motions(box).join(', '), box.engagement ?? '', box.cue ?? '']) row.appendChild(element('td', '', text));
            table.appendChild(row);
        });
        const data = element('details');
        data.append(element('summary', '', 'The session as data (what Jordan edits)'), element('pre', 'json', JSON.stringify(session, null, 2)));
        card.append(table, data);
        host.appendChild(card);
    }
}

async function start() {
    sessions = await Promise.all(SESSION_FILES.map(async (file) => /** @type {Session} */ (await (await fetch(file)).json())));
    const picker = byId('session-picker');
    for (const session of sessions) {
        const button = element('button', 'session-pick');
        button.setAttribute('data-id', session.id);
        button.append(element('b', '', `Grade ${session.grade} · ${session.moment}`), element('span', '', session.title));
        button.addEventListener('click', () => load(session));
        picker.appendChild(button);
    }
    wireControls();
    renderToolkit(byId('toolkit'), sessions);
    renderSessionsTab();
    load(sessions[0]);
    requestAnimationFrame(animate);
}

start();
