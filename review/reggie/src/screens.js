// @ts-check
// What each screen shows. The class screen is the room's shared view; a tablet is one child's own
// view in Grades 4 and 5. The class screen never shows anything about one child.

import {ReggieAnimator, seededRandom} from './animator.js';
import {boxTypeOf} from './boxes.js';
import {CLASS_SIZE_GRADE_4, TABLETS_SHOWN} from './constants.js';
import {ReggieRig} from './rig.js';

/** @typedef {import('./player.js').Session} Session */

// A label longer than this is a sentence, not a single word, and is set smaller.
const LONG_LABEL = 18;

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 */
export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export class ClassScreen {
    /** @param {HTMLElement} host */
    constructor(host) {
        host.replaceChildren();
        this.stage = element('div', 'stage');
        this.label = element('div', 'stage-label');
        this.cue = element('div', 'stage-cue');
        this.ring = element('div', 'breath-ring');
        this.reggieSpot = element('div', 'stage-reggie');
        this.garden = element('div', 'garden');
        this.countdown = element('div', 'countdown');
        this.countdownFill = element('i');
        this.countdown.appendChild(this.countdownFill);
        this.caption = element('div', 'caption');
        this.stage.append(this.label, this.cue, this.ring, this.reggieSpot, this.garden, this.countdown, this.caption);
        host.appendChild(this.stage);
        this.animator = new ReggieAnimator(new ReggieRig(this.reggieSpot), 7);
    }

    /** @param {{text: string, speaker: string}} caption */
    showCaption(caption) {
        this.caption.replaceChildren();
        if (caption.speaker === 'teacher') this.caption.appendChild(element('b', 'read-aloud', 'Read aloud'));
        this.caption.appendChild(element('span', '', caption.text));
        this.caption.classList.remove('show');
        void this.caption.offsetWidth;
        this.caption.classList.add('show');
    }

    /**
     * @param {import('./boxes.js').BoxFrame} frame
     * @param {import('./boxes.js').Box} box
     * @param {Session} session
     */
    show(frame, box, session) {
        this.label.textContent = frame.label ?? '';
        this.label.classList.toggle('long', (frame.label ?? '').length > LONG_LABEL);
        this.cue.textContent = box.cue ?? '';
        this.cue.classList.toggle('show', Boolean(box.cue));
        const breathing = frame.aid === 'breath';
        this.ring.classList.toggle('show', breathing);
        if (breathing) this.ring.style.transform = `translate(-50%, -50%) scale(${0.7 + 0.45 * (frame.aidValue ?? 0)})`;
        this.countdown.classList.toggle('show', frame.aid === 'countdown');
        this.countdownFill.style.width = `${Math.max(0, (frame.aidValue ?? 0) * 100)}%`;
        this.showGarden(frame, session);
    }

    /**
     * @param {import('./boxes.js').BoxFrame} frame
     * @param {Session} session
     */
    showGarden(frame, session) {
        const showing = frame.aid === 'garden';
        this.garden.classList.toggle('show', showing);
        if (!showing) return;
        if (session.reward.kind === 'own-star') {
            this.garden.textContent = 'Everyone who finished gets a star on their own tablet.';
            return;
        }
        const flowers = Array.from({length: session.reward.count}, () => '🌼').join(' ');
        this.garden.innerHTML = `<span>${flowers}</span> <span class="new-flower" style="transform:scale(${frame.aidValue ?? 0})">🌷</span>`;
    }
}

/**
 * @param {HTMLElement} host
 * @param {Session} session
 * @param {number} current
 * @param {(index: number) => void} [onPick]
 */
export function renderBoxStrip(host, session, current, onPick) {
    host.replaceChildren();
    session.boxes.forEach((box, index) => {
        const type = boxTypeOf(box.type);
        const seconds = type.seconds(box);
        const chip = element('button', `box-chip${index === current ? ' now' : ''}${index < current ? ' done' : ''}${type.waits ? ' waits' : ''}`);
        chip.style.flexGrow = String(Math.max(4, seconds));
        chip.append(element('b', '', type.label), element('span', '', type.waits ? 'waits' : `${Math.round(seconds)} s`));
        chip.title = type.what;
        if (onPick) chip.addEventListener('click', () => onPick(index));
        host.appendChild(chip);
    });
}

/**
 * @param {HTMLElement} host
 * @param {Session} session
 */
export function renderBefore(host, session) {
    host.replaceChildren();
    host.appendChild(element('div', 'panel-tag', `${session.trend.insight} insight · mock data`));
    host.appendChild(element('p', 'trend-text', session.trend.text));
    const week = element('div', 'week');
    for (const day of session.trend.week) {
        const column = element('div', 'day');
        column.appendChild(splitBar(day));
        column.appendChild(element('span', '', day.day));
        week.appendChild(column);
    }
    host.appendChild(week);
    host.appendChild(element('div', 'panel-tag', `Before · ${session.before.method}`));
    host.appendChild(splitBar(session.before));
}

/** @param {{green: number, yellow: number, red: number}} counts */
export function splitBar(counts) {
    const bar = element('div', 'split');
    for (const [color, count] of [['G', counts.green], ['Y', counts.yellow], ['R', counts.red]]) {
        if (!count) continue;
        const part = element('i', String(color), String(count));
        part.style.flex = String(count);
        bar.appendChild(part);
    }
    return bar;
}

const CHOICE_WORDS = /** @type {Record<string, string>} */ ({breathe: 'Paced breathing', squeeze: 'Squeeze and let go', headphones: 'Headphones'});
const AFTER_SHIFT = {green: 20, yellow: 3, red: 1};

// One child's tablet in Grades 4 and 5. The child is simulated; nothing here names anyone.
export class Tablet {
    /**
     * @param {HTMLElement} host
     * @param {number} seat
     * @param {string[]} options
     */
    constructor(host, seat, options) {
        this.random = seededRandom(seat * 977 + 13);
        this.options = options;
        this.choice = '';
        this.pickAt = 1 + this.random() * 6;
        this.tapAt = 0.5 + this.random() * 4;
        this.afterColor = '';
        this.frame = element('div', 'tablet');
        this.spot = element('div', 'tablet-reggie');
        this.text = element('div', 'tablet-text');
        this.buttons = element('div', 'tablet-buttons');
        this.frame.append(this.spot, this.text, this.buttons);
        host.appendChild(this.frame);
        this.animator = new ReggieAnimator(new ReggieRig(this.spot), seat * 31 + 5);
        this.clock = 0;
        this.boxIndex = -1;
    }

    /**
     * The tablet keeps its own clock per box, because the waiting boxes stop the session clock.
     * @param {import('./boxes.js').Box} box
     * @param {number} boxIndex
     * @param {number} seconds
     * @param {string} afterColor
     */
    update(box, boxIndex, seconds, afterColor) {
        if (boxIndex !== this.boxIndex) { this.boxIndex = boxIndex; this.clock = 0; }
        this.clock += seconds;
        const view = this.viewFor(box.type, this.clock, afterColor);
        this.animator.play(view.motion, `${boxIndex}-${view.motion}`);
        const breathPhase = this.clock % 8 < 3 ? {phase: /** @type {'in'} */ ('in'), progress: (this.clock % 8) / 3} : {phase: /** @type {'out'} */ ('out'), progress: ((this.clock % 8) - 3) / 5};
        this.animator.tick(seconds, {breath: view.motion === 'breathe' ? breathPhase : null, bpm: 50});
        this.text.textContent = view.text;
        this.renderButtons(view.buttons, view.chosen);
    }

    /**
     * @param {string} type
     * @param {number} local
     * @param {string} afterColor
     * @returns {{motion: string, text: string, buttons: string[], chosen: string}}
     */
    viewFor(type, local, afterColor) {
        if (type === 'before') return {motion: 'idle', text: 'Checked in. Thanks!', buttons: [], chosen: ''};
        if (type === 'choice') {
            if (!this.choice && local > this.pickAt) this.choice = this.options[Math.floor(this.random() * this.options.length)];
            return {motion: 'point', text: 'Pick your reset', buttons: this.options.map((option) => CHOICE_WORDS[option] ?? option), chosen: CHOICE_WORDS[this.choice] ?? ''};
        }
        if (type === 'solo') return {motion: this.choice || 'breathe', text: `${CHOICE_WORDS[this.choice || 'breathe']} · your minute`, buttons: [], chosen: ''};
        if (type === 'wind-down') return {motion: 'calm', text: 'Look up: we finish together', buttons: [], chosen: ''};
        if (type === 'after') {
            if (!this.afterColor && local > this.tapAt) this.afterColor = afterColor;
            return {motion: 'listen', text: this.afterColor ? 'Thanks!' : 'How is your body now?', buttons: ['Green', 'Yellow', 'Red'], chosen: this.afterColor};
        }
        if (type === 'reward') return {motion: 'cheer', text: '⭐ +1 star · your streak: 4', buttons: [], chosen: ''};
        return {motion: 'idle', text: 'Eyes on the class screen', buttons: [], chosen: ''};
    }

    /**
     * @param {string[]} labels
     * @param {string} chosen
     */
    renderButtons(labels, chosen) {
        const key = `${labels.join('|')}#${chosen}`;
        if (this.buttons.dataset.key === key) return;
        this.buttons.dataset.key = key;
        this.buttons.replaceChildren(...labels.map((label) => element('span', `tablet-button${label === chosen ? ' picked' : ''} ${label.toLowerCase()}`, label)));
    }
}

/**
 * The simulated class of 24: the colors each child taps at the re-check, shuffled.
 * @returns {string[]}
 */
export function simulatedAfterColors() {
    const colors = [...Array(AFTER_SHIFT.green).fill('Green'), ...Array(AFTER_SHIFT.yellow).fill('Yellow'), ...Array(AFTER_SHIFT.red).fill('Red')];
    const random = seededRandom(424242);
    for (let index = colors.length - 1; index > 0; index--) {
        const swap = Math.floor(random() * (index + 1));
        [colors[index], colors[swap]] = [colors[swap], colors[index]];
    }
    return colors.slice(0, CLASS_SIZE_GRADE_4);
}

export {AFTER_SHIFT, TABLETS_SHOWN};
