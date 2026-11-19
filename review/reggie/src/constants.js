// @ts-check
// Every number the Reggie Session Engine uses. Placeholders are marked: Jordan sets the real values.

export const COLORS = {
    teal: '#2A9D8F',
    armTeal: '#1F7F74',
    coral: '#F2845C',
    slate: '#1F3A4D',
    paper: '#FFF8F0',
    mint: '#7FD3C6',
    green: '#3BAA5C',
    yellow: '#F2B92F',
    red: '#E0524B',
};

// Breathing paces in seconds. PLACEHOLDER until Jordan sets them; the out-breath is always the longer one.
export const BREATH_PACES = {
    slower: {label: 'Slower', inSeconds: 4, holdSeconds: 0, outSeconds: 6},
    steady: {label: 'Steady', inSeconds: 3, holdSeconds: 0, outSeconds: 5},
    quicker: {label: 'A little quicker', inSeconds: 3, holdSeconds: 0, outSeconds: 4},
};
export const SUGGESTED_PACE = 'steady';

// Motion blending: how long one motion takes to melt into the next.
export const CROSSFADE_SECONDS = 0.55;
// How much each motion's size and speed is allowed to wander, so no two runs look stamped out.
export const VARIATION = {amplitude: 0.1, tempo: 0.05};
// Blinks come at irregular times; a double blink now and then.
export const BLINK = {minGapSeconds: 2.4, maxGapSeconds: 6.2, closeSeconds: 0.14, doubleChance: 0.18};
// The antenna is a spring that lags behind the body.
export const ANTENNA_SPRING = {stiffness: 60, damping: 7};
// Reduced motion keeps every motion but shrinks it.
export const REDUCED_MOTION_SCALE = 0.35;

// Reggie's placeholder voice: a male browser voice pitched up toward a young boy (Jordan's wish).
// His real voice is chosen later. Pitch runs 0 to 2 in the browser; 1 is the voice as recorded.
export const VOICE = {rate: 1.02, pitch: 1.6, calmRate: 0.86, wiredRate: 0.96, volume: 1};
// Reggie stops saying "in" and "out" after this many breaths, so the quiet can land.
export const SPOKEN_BREATHS = 2;

// The room result shifts the whole session's feel.
export const ROOM_FEEL = {
    wired: {tempo: 1, voiceRate: VOICE.wiredRate},
    split: {tempo: 0.95, voiceRate: VOICE.rate},
    flat: {tempo: 1.08, voiceRate: VOICE.rate},
    calm: {tempo: 0.9, voiceRate: VOICE.calmRate},
};

// The wind-down is always the last stretch of a session (Sprint 1 rule).
export const WIND_DOWN_SECONDS = 30;
export const REWARD_SECONDS = 6;
// Simulated children in the Grade 4 class; the device view draws a few of them.
export const CLASS_SIZE_GRADE_4 = 24;
export const TABLETS_SHOWN = 6;
