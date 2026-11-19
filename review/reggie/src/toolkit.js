// @ts-check
// The Reggie toolkit: every tool, action and feature the engine has or will need, by category,
// with what it is, where it lives and whether it is built. Motions, boxes and words are read
// from the engine itself, so this page can never fall behind the code.

import {BOX_TYPES} from './boxes.js';
import {LINES} from './lines.js';
import {MOTIONS} from './motions.js';
import {element} from './screens.js';
import {VOICE_MODES} from './voice.js';

/** @typedef {{name: string, what: string, status: 'Built' | 'Placeholder' | 'Later', home?: string, usedIn?: string[]}} Tool */
/** @typedef {{id: string, title: string, why: string, tools: Tool[]}} Category */

const MOTION_FAMILIES = {alive: 'Alive layer', breath: 'Breath', move: 'Moves', hold: 'Holds', gesture: 'Gestures', signature: 'Signatures'};

/** @type {Tool[]} */
const CHARACTER = [
    {name: 'The body', what: 'The brand mark\'s round teal body, with a mint belly that breathes.', status: 'Built', home: 'rig.js'},
    {name: 'Arms and feet', what: 'Short round arms and feet, added so he can lead moves; the brand mark itself is unchanged.', status: 'Built', home: 'rig.js'},
    {name: 'Antenna', what: 'The coral antenna light, on a spring, so it lags and bounces after every move. It glows when he speaks.', status: 'Built', home: 'animator.js'},
    {name: 'Face', what: 'Open eyes, soft eyes, the brand mark\'s happy closed eyes, a smile that can widen, a mouth that opens to talk.', status: 'Built', home: 'rig.js'},
    {name: 'Props', what: 'Headphones today. Later: a balloon, a book for story sessions, a water bottle.', status: 'Built', home: 'rig.js'},
    {name: 'Voice', what: 'Reggie is a boy and sounds like a young boy (Jordan). For now a male browser voice pitched up; his real voice comes later.', status: 'Placeholder', home: 'voice.js'},
    {name: 'Personality', what: 'Calm, warm, a little playful, never sarcastic, never loud. Slows down when the room is wired, brightens when it is flat.', status: 'Placeholder', home: 'constants.js ROOM_FEEL'},
    {name: 'Final artwork', what: 'A designer\'s drawing of Reggie, rigged the same way, replacing this one.', status: 'Later'},
];

/** @type {Tool[]} */
const ENGAGEMENT = [
    {name: 'Watch', what: 'The class watches Reggie: a story, a demonstration, the wind-down.', status: 'Built'},
    {name: 'Copy', what: 'The class copies Reggie move for move.', status: 'Built'},
    {name: 'Breathe with', what: 'The class breathes in time with Reggie\'s belly and the ring.', status: 'Built'},
    {name: 'Freeze', what: 'Everyone holds still: a game that also brings the energy down.', status: 'Built'},
    {name: 'Choose', what: 'The class, or each child alone, picks from 2 or 3 options.', status: 'Built'},
    {name: 'Alone', what: 'Each child does their own reset privately on their own tablet.', status: 'Built'},
    {name: 'Count together', what: 'The class counts aloud with Reggie: breaths, jumps, a countdown.', status: 'Later'},
    {name: 'Call and response', what: 'Reggie calls, the class answers ("When I say calm, you say ready").', status: 'Later'},
    {name: 'Child leads', what: 'A child chooses the next move and Reggie copies them (Copy the Leader).', status: 'Later'},
];

/** @type {Tool[]} */
const AIDS = [
    {name: 'Caption', what: 'Every word Reggie says is on screen, always, whatever the voice mode.', status: 'Built', home: 'screens.js'},
    {name: 'Read aloud tag', what: 'In teacher mode the caption is marked for the teacher to read.', status: 'Built'},
    {name: 'Big label', what: 'One big word for the moment: Jog, Freeze!, Breathe in · 2.', status: 'Built'},
    {name: 'Cue chip', what: 'The body cue for the class: "Hand on your belly", "Stand beside your chair".', status: 'Built'},
    {name: 'Breath ring', what: 'A ring that grows on the in-breath and shrinks on the out-breath, behind Reggie.', status: 'Built'},
    {name: 'Countdown bar', what: 'How much of a box is left, without numbers to read.', status: 'Built'},
    {name: 'Garden and stars', what: 'The class garden grows a flower (K to G3); each child\'s own star (G4 and G5).', status: 'Built'},
    {name: 'Lights and voice prompt', what: 'For a mostly Red room: a prompt to lower the lights and the teacher\'s voice.', status: 'Later'},
];

/** @type {Tool[]} */
const SOUND = [
    {name: 'Box chime', what: 'The same soft two-note chime between boxes, so the class learns it means "next".', status: 'Built', home: 'voice.js'},
    {name: 'Beat tick', what: 'A soft pulse on the beat during moves, slowing with the tempo.', status: 'Placeholder'},
    {name: 'Finish chord', what: 'Three rising notes when the session ends.', status: 'Built'},
    {name: 'Music bed', what: 'A song under the moves, tempo matched. Jordan picks the songs; rights checked first.', status: 'Later'},
    {name: 'Ducking', what: 'The music dips under Reggie\'s voice.', status: 'Later'},
    {name: 'Many-tablet audio', what: 'How sound works with a room of tablets: silent with captions for now (Adam, 2026-11-19).', status: 'Later'},
];

/** @type {Tool[]} */
const SCREENS = [
    {name: 'Class screen', what: 'The shared screen in K to G3, and for the whole-class parts in G4 and G5. Never shows one child.', status: 'Built'},
    {name: 'Teacher controls', what: 'The teacher\'s side: the box strip, controls, settings and the re-check.', status: 'Built'},
    {name: 'Child tablet', what: 'One child\'s own view in G4 and G5: their choice, their solo reset, their re-check, their star. Silent.', status: 'Built'},
];

/** @type {Tool[]} */
const CONTROLS = [
    {name: 'Start', what: 'Leaves the Before box and starts Reggie.', status: 'Built', home: 'player.js'},
    {name: 'Pause', what: 'Stops the clock and Reggie\'s voice; Reggie keeps breathing.', status: 'Built'},
    {name: 'Wind down now', what: 'Jumps to the calm finish. The re-check still follows, and the run is marked ended early.', status: 'Built'},
    {name: 'Skip', what: 'Moves to the next box, never past the wind-down or the re-check.', status: 'Built'},
    {name: 'Voice mode', what: Object.values(VOICE_MODES).join(', ') + '.', status: 'Built', home: 'voice.js'},
    {name: 'Pace', what: 'Slower, steady or a little quicker breathing, steady suggested. The seconds are Jordan\'s.', status: 'Placeholder'},
    {name: 'Sound and less motion', what: 'Sound off, and a reduced-motion Reggie (every move kept, made smaller).', status: 'Built'},
];

/** @type {Tool[]} */
const ADAPTERS = [
    {name: 'Grade', what: 'Younger or older words for every line; G4 and G5 get the tablet version of each box.', status: 'Built', home: 'lines.js'},
    {name: 'Room result', what: 'Wired, split, flat or calm changes the tempo of moves and the speed of Reggie\'s voice.', status: 'Placeholder', home: 'constants.js ROOM_FEEL'},
    {name: 'Seated version', what: 'Every move with a seated form, for small rooms and physical disability.', status: 'Later'},
];

/** @type {Tool[]} */
const DATA = [
    {name: 'Run record', what: 'One record per session: activity, version, pace, planned and actual time, ended early, boxes done.', status: 'Built', home: 'player.js'},
    {name: 'Before and after link', what: 'The run is linked to the check-in before and the re-check after, so the trends can measure it.', status: 'Built'},
    {name: 'Reward rule', what: 'For finishing and attention, never the color tapped.', status: 'Built'},
];

/** @type {{rule: string, how: string}[]} */
export const ALIVE_RULES = [
    {rule: 'He is never a still picture', how: 'An alive layer runs under every motion: a slow breath, a little sway, the odd look around.'},
    {rule: 'Motions melt, they never cut', how: 'Every change of motion crossfades over about half a second, from wherever he actually is.'},
    {rule: 'Secondary motion', how: 'The antenna is a spring: it lags behind a jog, wobbles after a freeze and settles on its own.'},
    {rule: 'No two runs are the same', how: 'Each motion is played a little bigger or smaller and a little faster or slower each time; blinks come at uneven times; each tablet\'s Reggie has its own rhythm.'},
    {rule: 'Never the same words twice in a row', how: 'Every intent has several lines, younger and older, and the last one used is skipped.'},
    {rule: 'One story runs through the session', how: 'The session\'s theme ("the playground") fills the lines, so the boxes read as one scene, not a playlist.'},
    {rule: 'Tempo eases, it does not step', how: 'Moves slow from one speed to the next across the box (jog to walk to tiptoe), the beat easing with them.'},
    {rule: 'Signature habits', how: 'The same few habits in every session (his belly pat, his happy sigh, his little hop), so he feels like one character.'},
    {rule: 'He knows when to be quiet', how: 'He speaks the first two breaths and then lets the quiet land.'},
    {rule: 'The same seams everywhere', how: 'The same chime between boxes and the same calm pose at the end, so the class learns the shape of a session.'},
];

/** @param {import('./player.js').Session[]} sessions */
function generatedCategories(sessions) {
    /** @param {(box: import('./boxes.js').Box) => string[]} names */
    const usage = (names) => {
        /** @type {Map<string, Set<string>>} */
        const used = new Map();
        for (const session of sessions) for (const box of session.boxes) for (const name of names(box)) {
            if (!used.has(name)) used.set(name, new Set());
            used.get(name)?.add(`Grade ${session.grade}`);
        }
        return used;
    };
    const motionUse = usage((box) => BOX_TYPES[box.type].motions(box));
    const boxUse = usage((box) => [box.type]);
    const motions = Object.entries(MOTIONS).map(([key, motion]) => ({
        name: `${motion.label} · ${MOTION_FAMILIES[motion.family]}`, what: motion.what, status: /** @type {const} */ ('Built'), home: 'motions.js', usedIn: [...(motionUse.get(key) ?? [])],
    }));
    const boxes = Object.entries(BOX_TYPES).map(([key, type]) => ({
        name: type.label, what: type.what, status: /** @type {const} */ ('Built'), home: 'boxes.js', usedIn: [...(boxUse.get(key) ?? [])],
    }));
    const words = Object.entries(LINES).map(([intent, pool]) => ({
        name: intent, what: `${pool.young.length + pool.older.length} lines, e.g. "${pool.young[0]}"`, status: /** @type {const} */ ('Placeholder'), home: 'lines.js',
    }));
    return {motions, boxes, words};
}

/** @param {import('./player.js').Session[]} sessions @returns {Category[]} */
export function toolkitCategories(sessions) {
    const {motions, boxes, words} = generatedCategories(sessions);
    return [
        {id: 'character', title: '1. Reggie himself', why: 'The one drawing every session uses.', tools: CHARACTER},
        {id: 'motions', title: '2. Motions: what Reggie does', why: 'Each is numbers on the drawing, so it works at any pace, size or grade.', tools: motions},
        {id: 'words', title: '3. Words: what Reggie says, by intent', why: 'Boxes ask for an intent ("breathe-in"), never a fixed sentence.', tools: words},
        {id: 'boxes', title: '4. Session boxes: how a session is built', why: 'A session is a list of boxes; Jordan reorders and tunes them as data.', tools: boxes},
        {id: 'engagement', title: '5. Engagement: what the class does', why: 'Every box names one, so a session can be checked for variety.', tools: ENGAGEMENT},
        {id: 'aids', title: '6. On-screen aids', why: 'What a child can follow without reading.', tools: AIDS},
        {id: 'sound', title: '7. Sound', why: 'Generated tones only for now: no music rights needed.', tools: SOUND},
        {id: 'screens', title: '8. Screens and who sees what', why: 'The same boxes run on the class screen and on a child\'s tablet.', tools: SCREENS},
        {id: 'controls', title: '9. Teacher controls', why: 'The teacher is always in charge of the room.', tools: CONTROLS},
        {id: 'adapters', title: '10. Adapters', why: 'One session, fitted to the grade and the room.', tools: ADAPTERS},
        {id: 'data', title: '11. Data', why: 'What a run leaves behind for the trends.', tools: DATA},
    ];
}

/**
 * @param {HTMLElement} host
 * @param {import('./player.js').Session[]} sessions
 */
export function renderToolkit(host, sessions) {
    host.replaceChildren();
    const alive = element('section', 'toolkit-alive');
    alive.appendChild(element('h2', '', 'How Reggie stays alive, not robotic or fragmented'));
    const list = element('ol');
    for (const item of ALIVE_RULES) {
        const row = element('li');
        row.append(element('b', '', item.rule), element('span', '', ` ${item.how}`));
        list.appendChild(row);
    }
    alive.appendChild(list);
    host.appendChild(alive);
    for (const category of toolkitCategories(sessions)) host.appendChild(renderCategory(category));
}

/** @param {Category} category */
function renderCategory(category) {
    const section = element('section', 'toolkit-category');
    section.id = `toolkit-${category.id}`;
    section.append(element('h2', '', category.title), element('p', 'why', category.why));
    const grid = element('div', 'tool-grid');
    for (const tool of category.tools) {
        const card = element('div', `tool ${tool.status.toLowerCase()}`);
        card.append(element('div', 'tool-status', tool.status), element('b', '', tool.name), element('p', '', tool.what));
        if (tool.usedIn?.length) card.appendChild(element('div', 'used-in', `Used in: ${tool.usedIn.join(', ')}`));
        if (tool.home) card.appendChild(element('div', 'home', tool.home));
        grid.appendChild(card);
    }
    section.appendChild(grid);
    return section;
}
