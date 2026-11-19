// @ts-check
// What Reggie says. Every intent has several ways of saying it, for younger and older grades,
// and the engine never says the same one twice in a row. PLACEHOLDER words: Jordan writes Reggie's real voice.
// Slots: {place} from the session's theme, {move} the move's spoken name, {count} and {total} for breaths.

/** @type {Record<string, {young: string[], older: string[]}>} */
export const LINES = {
    greet: {
        young: ['Hi friends! It is me, Reggie.', 'Hello, everybody! Reggie is here.'],
        older: ['Good morning. New day. Let\'s land, together.', 'Morning, everyone. Let\'s get our bodies ready for the day.'],
    },
    'bridge-follow': {
        young: ['Stand up tall beside your chair. Do what I do!', 'Up you get! Copy me.'],
        older: ['Stand by your desk and move with me.', 'On your feet for a minute. Follow along.'],
    },
    'move-jog': {young: ['Jog, jog, jog with me!', 'Zoom! Jog on the spot!'], older: ['Light jog on the spot.']},
    'move-walk': {young: ['Now slower. Walking, walking.', 'Let\'s slow down to a walk.'], older: ['Slow it down to a walk.']},
    'move-tiptoe': {young: ['Shh. Tiptoe, tiptoe, quiet as a mouse.', 'Tippy toes now. So quiet.'], older: ['Up on your toes, nice and quiet.']},
    'move-reach': {young: ['Reach up high to the sky!'], older: ['Reach up high. Long and tall.', 'Stretch up toward the ceiling.']},
    'move-sway': {young: ['Sway like a tree in the wind.'], older: ['Sway side to side, slow and easy.', 'Let your arms sway like branches.']},
    'move-shake': {young: ['Shake, shake, shake it out!'], older: ['Shake out your hands and arms.']},
    'bridge-freeze': {young: ['Ready? One, two, three...'], older: ['Get ready to stop...']},
    freeze: {young: ['Freeze! Be a statue!', 'Freeze like a snowman!'], older: ['And freeze.']},
    'freeze-release': {young: ['Wow, great statues. Now sit down softly.', 'Amazing statues! Sit down slowly.'], older: ['Nice. Sit back down.']},
    'bridge-breathe': {
        young: ['Put a hand on your belly, like me. Let\'s fill our balloon.', 'Hand on your belly. Watch my balloon belly.'],
        older: ['Hand on your belly. Breathe with me.', 'Let\'s slow our breathing down together.'],
    },
    'breathe-in': {young: ['Breathe in, slowly...', 'In through your nose...'], older: ['In...']},
    'breathe-out': {young: ['And out, nice and slow...', 'Blow it all out, slowly...'], older: ['And out, longer...']},
    'breathe-done': {young: ['Ahh. My balloon belly feels calm.', 'Ahh. That feels better.'], older: ['Ahh. Notice how that feels.']},
    choice: {young: ['Pick the one you want.'], older: ['On your tablet, pick the reset that fits you today.', 'Choose your own reset on your tablet.']},
    solo: {young: ['Do your reset with me.'], older: ['Take a minute, just for you.', 'This minute is yours.']},
    'wind-down': {
        young: ['Now we sit still, like me. Our bodies are ready to learn.', 'Let\'s sit quietly together. Calm and ready.'],
        older: ['Let\'s finish calm. Notice your body is ready.', 'Settle in. Ready for the day.'],
    },
    'praise-effort': {young: ['You did it together! Great listening.', 'What a great job following along!'], older: ['Thanks for giving that a go.', 'Nice work, everyone.']},
    reward: {young: ['Look, a new flower in our garden!', 'Our garden grew again!'], older: ['That one counts toward your streak.']},
};

/**
 * Pick a line for an intent without repeating the last one used for it.
 * @param {string} intent
 * @param {'young' | 'older'} age
 * @param {() => number} random
 * @param {Map<string, string>} lastSaid
 * @param {Record<string, string | number>} [slots]
 */
export function pickLine(intent, age, random, lastSaid, slots = {}) {
    const pool = LINES[intent]?.[age] ?? LINES[intent]?.young;
    if (!pool || pool.length === 0) throw new Error(`Reggie has no words for "${intent}"`);
    const fresh = pool.length > 1 ? pool.filter((line) => line !== lastSaid.get(intent)) : pool;
    const chosen = fresh[Math.floor(random() * fresh.length)];
    lastSaid.set(intent, chosen);
    return fillSlots(chosen, slots);
}

/**
 * @param {string} text
 * @param {Record<string, string | number>} slots
 */
export function fillSlots(text, slots) {
    return text.replace(/\{(\w+)\}/g, (whole, name) => (name in slots ? String(slots[name]) : whole));
}
