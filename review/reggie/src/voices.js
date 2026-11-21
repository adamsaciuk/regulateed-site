// @ts-check
// The voice tester (Adam, 2026-11-19: "can you add the ability to test as many of the options as possible.
// maybe links to the sources of the supplier too."). The same Reggie lines go to every option; where a voice
// can play here it does, otherwise the card says how to try it on the supplier's own demo.

import {LINES} from './lines.js';
import {ReggieVoice} from './voice.js';

const PICKS_KEY = 'regulateed.reggie.voice-picks';
const PUTER_SCRIPT = 'https://js.puter.com/v2/';

const TEST_LINES = [
    LINES.greet.young[0],
    LINES['bridge-breathe'].young[0],
    `${LINES['breathe-in'].young[0]} ${LINES['breathe-out'].young[0]}`,
    LINES['praise-effort'].young[0],
    LINES['wind-down'].young[0],
];

/** @typedef {{label: string, kind: 'browser' | 'polly', voice?: string}} Player */
/** @typedef {{label: string, href: string}} Link */
/** @typedef {{id: string, name: string, who: string, players: Player[], steps: string[], links: Link[]}} Option */

/** @type {Option[]} */
const OPTIONS = [
    {
        id: 'today',
        name: "Today's Reggie: this browser's voice",
        who: 'What the engine uses now: an adult voice with the pitch raised. The baseline to beat.',
        players: [{label: 'Play in this browser', kind: 'browser'}],
        steps: ['Press Play. In Edge you hear a natural adult voice raised in pitch; in Chrome a robotic one.', 'Change the voice or pitch in the Voice and moves lab, then come back and play again.'],
        links: [{label: 'Voice and moves lab', href: 'lab.html'}],
    },
    {
        id: 'polly',
        name: 'Amazon Polly: Kevin and Justin',
        who: "Amazon's US English boy voices. Kevin is the newer, more natural one. Iris's pick for the demo.",
        players: [{label: 'Play in Kevin', kind: 'polly', voice: 'Kevin'}, {label: 'Play in Justin', kind: 'polly', voice: 'Justin'}],
        steps: [
            'Press Play in Kevin, then Play in Justin. The voices come through Puter, a free service that relays Amazon\'s voices to a web page.',
            'The first time, a Puter box appears: press Continue, then sign in or make a free Puter account in the window that opens. That account is Puter\'s, not Amazon\'s, and is only for testing. The lines then play.',
            'If it will not play: open ttsmp3.com, choose US English / Justin, paste the lines and press Read. No account, 3,000 characters a day. Kevin is not on ttsmp3.',
            'Kevin without Puter: the Amazon Polly console, which needs an AWS account (free for the first year at our size).',
        ],
        links: [
            {label: 'Try Justin free: ttsmp3.com', href: 'https://ttsmp3.com/'},
            {label: 'Justin on Narakeet', href: 'https://www.narakeet.com/text-to-speech/voice/justin-text-to-speech'},
            {label: 'Amazon Polly console', href: 'https://console.aws.amazon.com/polly/'},
            {label: 'Amazon Polly', href: 'https://aws.amazon.com/polly/'},
            {label: 'Kevin announced', href: 'https://aws.amazon.com/about-aws/whats-new/2020/06/amazon-polly-launches-a-child-us-english-ntts-voice'},
            {label: 'Voice list', href: 'https://docs.aws.amazon.com/polly/latest/dg/available-voices.html'},
            {label: 'Pricing', href: 'https://aws.amazon.com/polly/pricing/'},
            {label: 'FAQ: keeping the audio files', href: 'https://aws.amazon.com/polly/faqs/'},
            {label: 'Puter (the relay)', href: 'https://developer.puter.com/tutorials/free-unlimited-amazon-polly-api/'},
        ],
    },
    {
        id: 'acapela',
        name: "Acapela: children's voices (Emilio, US English boy)",
        who: 'Voices recorded by real children. Emilio is their US English boy; Liam (Australian) and Archie (Scottish) are there too.',
        players: [],
        steps: [
            "Open the children's voices page and play Emilio's sample (and Liam's and Archie's).",
            'To hear Reggie\'s lines: open the Type & Talk demo, pick English (USA), choose a child voice if it is listed, paste one line, accept the terms and press Synthesize.',
            'Josh, named in the first write-up, is no longer on Acapela\'s children\'s list; Emilio is the US boy now.',
        ],
        links: [
            {label: "Children's voices (samples)", href: 'https://www.acapela-group.com/voices/children-voices/'},
            {label: 'Type & Talk demo', href: 'https://www.acapela-group.com/demos/'},
            {label: 'Every Acapela voice', href: 'https://www.acapela-group.com/voices/repertoire/'},
            {label: 'Acapela', href: 'https://www.acapela-group.com/'},
        ],
    },
    {
        id: 'typecast',
        name: 'Typecast: Hobin and Leo',
        who: 'Character voices built from real actors. Hobin and Leo are their boys. Expressive, so worth hearing for the lively parts.',
        players: [],
        steps: [
            'Open the kid voices page and press Play on Hobin and on Leo.',
            "To hear Reggie's lines: Get started free (a sign-up), pick Hobin or Leo, paste the lines.",
            'Before choosing it, read their terms for use inside an app, not only in videos.',
        ],
        links: [
            {label: 'Kid voices (samples)', href: 'https://typecast.ai/voices/kid-voice-generator/'},
            {label: 'Plans', href: 'https://typecast.ai/pricing/?lang=en'},
            {label: 'Typecast', href: 'https://typecast.ai/'},
        ],
    },
    {
        id: 'narakeet',
        name: 'Narakeet: American child voices',
        who: 'An audio-making tool that lists American child voices: Mickey, Missy, Timmy, Bonnie, Lenny, Justin and Alicia. A quick way to hear several at once.',
        players: [],
        steps: [
            'Open the child voice page, choose a voice, paste the lines and make the audio.',
            'Up to 20 audio files free, with no sign-up.',
        ],
        links: [
            {label: 'Child voices', href: 'https://www.narakeet.com/create/text-to-speech-child-voice-online.html'},
            {label: 'Every Narakeet voice', href: 'https://www.narakeet.com/docs/voices/'},
        ],
    },
    {
        id: 'actor',
        name: 'A human voice actor',
        who: 'The best sound and a voice that is Reggie\'s alone. Usually an adult woman who voices boys, as in cartoons. Iris\'s pick for the product.',
        players: [],
        steps: [
            'Listen to young-boy demo reels on Voices.com and Casting Call Club.',
            "For a real audition, post a job with Reggie's five lines and ask for a full buyout of rights.",
            'Rates: about $0.10 to $0.35 a word, character voices 20 to 40% more (the actor\'s fee, published rates).',
        ],
        links: [
            {label: 'Voices.com', href: 'https://www.voices.com/'},
            {label: 'Casting Call Club: young boy voices', href: 'https://castingcall.club/talent/voice_actor/Young%20boy'},
            {label: 'Voices.com rates', href: 'https://www.voices.com/rates'},
            {label: 'Backstage: what voice actors cost', href: 'https://www.backstage.com/magazine/article/how-much-do-voice-actors-cost-76993/'},
        ],
    },
];

const PICK_WORDS = ['Liked', 'Maybe', 'No'];

/** @param {string} id */
function element(id) {
    const found = document.getElementById(id);
    if (!found) throw new Error(`Missing #${id}`);
    return found;
}

/** @param {string} tag @param {string} [className] @param {string} [text] */
function make(tag, className, text) {
    const made = document.createElement(tag);
    if (className) made.className = className;
    if (text !== undefined) made.textContent = text;
    return made;
}

/** @returns {Record<string, {pick: string, note: string}>} */
function loadPicks() {
    try {
        return JSON.parse(localStorage.getItem(PICKS_KEY) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

let picks = loadPicks();

function savePicks() {
    localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
    showPicks();
}

function picksText() {
    const lines = OPTIONS.filter((option) => picks[option.id]?.pick || picks[option.id]?.note).map((option) => {
        const {pick, note} = picks[option.id];
        return `${option.name}: ${pick || 'no pick'}${note ? `. ${note}` : ''}`;
    });
    return lines.length ? `Reggie voice picks\n${lines.join('\n')}` : '';
}

function showPicks() {
    element('picks').textContent = picksText() || 'No picks yet.';
}

function linesToSay() {
    const own = /** @type {HTMLInputElement} */ (element('own-words')).value.trim();
    return own ? [...TEST_LINES, own] : TEST_LINES;
}

/** @param {string} text */
async function copy(text) {
    await navigator.clipboard.writeText(text);
}

// Playing: one thing at a time, and any new press stops what was playing.
const browserVoice = new ReggieVoice();
/** @type {HTMLAudioElement | null} */
let playing = null;
let playRun = 0;

function stopAll() {
    playRun += 1;
    browserVoice.hush();
    if (playing) playing.pause();
    playing = null;
}

/** @type {Promise<any> | null} */
let puterLoading = null;

function loadPuter() {
    const win = /** @type {any} */ (window);
    if (win.puter) return Promise.resolve(win.puter);
    if (!puterLoading) {
        puterLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = PUTER_SCRIPT;
            script.onload = () => (win.puter ? resolve(win.puter) : reject(new Error('Puter loaded without its puter object')));
            script.onerror = () => reject(new Error('Puter could not be reached (no internet, or blocked)'));
            document.head.append(script);
        });
        puterLoading.catch(() => { puterLoading = null; });
    }
    return puterLoading;
}

/** @param {HTMLAudioElement} audio */
function playToEnd(audio) {
    return new Promise((resolve, reject) => {
        audio.onended = () => resolve(undefined);
        audio.onerror = () => reject(new Error('The audio would not play'));
        audio.play().catch(reject);
    });
}

/** @param {string} voice @param {(text: string, bad?: boolean) => void} say */
async function playPolly(voice, say) {
    const run = playRun;
    say('Loading Puter...');
    const puter = await loadPuter();
    const lines = linesToSay();
    for (const [index, text] of lines.entries()) {
        if (run !== playRun) return;
        say(index === 0
            ? `${voice}: getting line 1. If a Puter box appears, press Continue and sign in to Puter (the first time only).`
            : `${voice}: line ${index + 1} of ${lines.length}...`);
        const audio = await puter.ai.txt2speech(text, {provider: 'aws-polly', voice, engine: 'neural', language: 'en-US'});
        if (run !== playRun) return;
        playing = audio;
        await playToEnd(audio);
    }
    if (run === playRun) say(`${voice}: done.`);
}

/** @param {(text: string, bad?: boolean) => void} say */
function playBrowser(say) {
    if (!browserVoice.canSpeak) {
        say('This browser cannot speak.', true);
        return;
    }
    browserVoice.mode = 'reggie';
    const name = browserVoice.chosenVoice?.name ?? 'the default voice';
    say(`Speaking in ${name}, pitch ${browserVoice.pitch}.`);
    for (const text of linesToSay()) browserVoice.say(text, () => {});
}

function showLines() {
    const list = element('test-lines');
    for (const text of TEST_LINES) {
        const item = make('li');
        item.append(make('span', '', text));
        const button = make('button', '', 'Copy');
        button.addEventListener('click', () => copy(text).then(() => { button.textContent = 'Copied'; }));
        item.append(button);
        list.append(item);
    }
    const copyAll = element('copy-all');
    copyAll.addEventListener('click', () => copy(linesToSay().join('\n')).then(() => { copyAll.textContent = 'Copied'; }));
}

/** @param {Option} option */
function card(option) {
    const box = make('article', 'option');
    box.append(make('h3', '', option.name), make('p', 'who', option.who));

    const status = make('div', 'status');
    /** @param {string} text @param {boolean} [bad] */
    const say = (text, bad = false) => {
        status.textContent = text;
        status.classList.toggle('bad', bad);
    };
    if (option.players.length) {
        const row = make('div', 'play-row');
        for (const player of option.players) {
            const button = make('button', 'go', player.label);
            button.addEventListener('click', () => {
                stopAll();
                if (player.kind === 'browser') playBrowser(say);
                else playPolly(player.voice ?? 'Kevin', say).catch((error) => say(`Could not play: ${error?.message ?? error}. Use the links below instead.`, true));
            });
            row.append(button);
        }
        const stop = make('button', '', 'Stop');
        stop.addEventListener('click', () => { stopAll(); say('Stopped.'); });
        row.append(stop);
        box.append(row, status);
    }

    const steps = make('ol');
    for (const step of option.steps) steps.append(make('li', '', step));
    box.append(steps);

    const links = make('div', 'links');
    for (const link of option.links) {
        const anchor = /** @type {HTMLAnchorElement} */ (make('a', '', link.label));
        anchor.href = link.href;
        if (/^https?:/.test(link.href)) {
            anchor.target = '_blank';
            anchor.rel = 'noopener';
        }
        links.append(anchor);
    }
    box.append(links);

    const pick = make('div', 'pick');
    const mine = picks[option.id] ?? {pick: '', note: ''};
    /** @type {HTMLButtonElement[]} */
    const buttons = [];
    for (const word of PICK_WORDS) {
        const button = /** @type {HTMLButtonElement} */ (make('button', word === 'No' ? 'no' : '', word));
        button.classList.toggle('on', mine.pick === word);
        button.addEventListener('click', () => {
            const current = picks[option.id] ?? {pick: '', note: ''};
            current.pick = current.pick === word ? '' : word;
            picks[option.id] = current;
            for (const other of buttons) other.classList.toggle('on', other.textContent === current.pick);
            savePicks();
        });
        buttons.push(button);
        pick.append(button);
    }
    const note = /** @type {HTMLInputElement} */ (make('input'));
    note.placeholder = 'A note: what you liked or did not';
    note.value = mine.note;
    note.addEventListener('input', () => {
        picks[option.id] = {...(picks[option.id] ?? {pick: ''}), note: note.value};
        savePicks();
    });
    pick.append(note);
    box.append(pick);
    return box;
}

function start() {
    showLines();
    const options = element('options');
    for (const option of OPTIONS) options.append(card(option));
    showPicks();
    const copyPicks = element('copy-picks');
    copyPicks.addEventListener('click', () => copy(picksText() || 'No picks yet.').then(() => { copyPicks.textContent = 'Copied'; }));
    element('clear-picks').addEventListener('click', () => {
        picks = {};
        localStorage.removeItem(PICKS_KEY);
        element('options').replaceChildren(...OPTIONS.map(card));
        showPicks();
    });
}

start();
