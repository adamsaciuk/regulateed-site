// @ts-check
// Reggie's drawn rig: one SVG with moving parts. Every motion is just numbers on these parts,
// so one drawing serves every activity, pace, grade and screen size.

import {COLORS} from './constants.js';

/**
 * @typedef {object} Pose
 * @property {number} x            sideways shift
 * @property {number} y            up is negative
 * @property {number} lean         degrees, around the feet
 * @property {number} squash       positive is tall and thin, negative is squat
 * @property {number} bellyScale   1 is resting
 * @property {number} armLeft      degrees raised outward: 0 down, 90 out, 160 up, negative across the belly
 * @property {number} armRight
 * @property {number} footLeft     lift in px
 * @property {number} footRight
 * @property {number} eyeOpen      0 shut, 1 open
 * @property {number} eyeSmile     1 is the brand mark's happy closed eyes
 * @property {number} smile        0 flat, 1 big smile
 * @property {number} mouthOpen    0 shut, 1 wide
 * @property {number} lookX        -1 left, 1 right
 * @property {number} lookY        -1 up, 1 down
 * @property {number} headTilt     degrees
 * @property {number} glow         antenna light, 0 to 1
 * @property {number} headphones   1 shows the headphones prop
 */

/** @type {Pose} */
export const NEUTRAL_POSE = {
    x: 0, y: 0, lean: 0, squash: 0, bellyScale: 1, armLeft: 12, armRight: 12, footLeft: 0, footRight: 0,
    eyeOpen: 1, eyeSmile: 0.15, smile: 0.55, mouthOpen: 0, lookX: 0, lookY: 0, headTilt: 0, glow: 0, headphones: 0,
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const PIVOT = {x: 100, y: 188};
const SHOULDER_LEFT = {x: 38, y: 112};
const SHOULDER_RIGHT = {x: 162, y: 112};
const ANTENNA_BASE = {x: 100, y: 38};

/**
 * @param {string} tag
 * @param {Record<string, string | number>} attributes
 * @param {Element} [parent]
 */
function draw(tag, attributes, parent) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    if (parent) parent.appendChild(element);
    return element;
}

export class ReggieRig {
    /** @param {HTMLElement} container */
    constructor(container) {
        const svg = draw('svg', {viewBox: '0 0 200 230', class: 'reggie-rig', role: 'img', 'aria-label': 'Reggie'});
        draw('ellipse', {cx: 100, cy: 204, rx: 58, ry: 7, fill: COLORS.slate, opacity: 0.12}, svg);
        this.shadow = /** @type {SVGEllipseElement} */ (svg.lastElementChild);
        this.root = draw('g', {}, svg);
        this.footLeft = draw('ellipse', {cx: 76, cy: 186, rx: 17, ry: 8, fill: COLORS.slate, opacity: 0.85}, this.root);
        this.footRight = draw('ellipse', {cx: 124, cy: 186, rx: 17, ry: 8, fill: COLORS.slate, opacity: 0.85}, this.root);
        this.antenna = draw('g', {}, this.root);
        draw('path', {d: 'M100 38 C100 24 108 16 120 13', fill: 'none', stroke: COLORS.teal, 'stroke-width': 7, 'stroke-linecap': 'round'}, this.antenna);
        this.antennaDot = draw('circle', {cx: 121, cy: 12, r: 7, fill: COLORS.coral}, this.antenna);
        this.armLeft = this.drawArm(SHOULDER_LEFT);
        this.armRight = this.drawArm(SHOULDER_RIGHT);
        this.body = draw('g', {}, this.root);
        draw('path', {d: 'M100 36 C146 36 172 68 172 112 C172 154 140 178 100 178 C60 178 28 154 28 112 C28 68 54 36 100 36 Z', fill: COLORS.teal}, this.body);
        this.belly = draw('ellipse', {cx: 100, cy: 146, rx: 40, ry: 27, fill: COLORS.mint, opacity: 0.55}, this.body);
        this.face = draw('g', {}, this.body);
        this.eyes = [this.drawEye(78), this.drawEye(122)];
        this.mouth = draw('path', {fill: 'none', stroke: COLORS.slate, 'stroke-width': 7, 'stroke-linecap': 'round'}, this.face);
        this.mouthHole = draw('ellipse', {cx: 100, cy: 131, rx: 8, ry: 0, fill: COLORS.slate}, this.face);
        draw('circle', {cx: 64, cy: 124, r: 9, fill: COLORS.coral, opacity: 0.8}, this.face);
        draw('circle', {cx: 136, cy: 124, r: 9, fill: COLORS.coral, opacity: 0.8}, this.face);
        this.headphones = this.drawHeadphones();
        // Arms sit in front of the body so hands can rest on the belly.
        this.root.appendChild(this.armLeft);
        this.root.appendChild(this.armRight);
        container.appendChild(svg);
        this.svg = svg;
    }

    /** @param {{x: number, y: number}} shoulder */
    drawArm(shoulder) {
        const arm = draw('g', {}, this.root);
        // A deeper teal than the body, so an arm in front of him still reads as an arm.
        draw('path', {d: `M${shoulder.x} ${shoulder.y} L${shoulder.x} ${shoulder.y + 34}`, stroke: COLORS.armTeal, 'stroke-width': 15, 'stroke-linecap': 'round'}, arm);
        draw('circle', {cx: shoulder.x, cy: shoulder.y + 36, r: 9.5, fill: COLORS.armTeal}, arm);
        return arm;
    }

    /** @param {number} centerX */
    drawEye(centerX) {
        const open = draw('ellipse', {cx: centerX, cy: 104, rx: 7, ry: 9, fill: COLORS.slate}, this.face);
        const happy = draw('path', {d: `M${centerX - 12} 106 Q${centerX} 94 ${centerX + 12} 106`, fill: 'none', stroke: COLORS.slate, 'stroke-width': 7, 'stroke-linecap': 'round'}, this.face);
        return {open, happy};
    }

    drawHeadphones() {
        const group = draw('g', {opacity: 0}, this.body);
        draw('path', {d: 'M34 98 C34 40 166 40 166 98', fill: 'none', stroke: COLORS.slate, 'stroke-width': 8, 'stroke-linecap': 'round'}, group);
        draw('rect', {x: 22, y: 90, width: 20, height: 32, rx: 9, fill: COLORS.coral}, group);
        draw('rect', {x: 158, y: 90, width: 20, height: 32, rx: 9, fill: COLORS.coral}, group);
        return group;
    }

    /**
     * @param {Pose} pose
     * @param {number} antennaAngle degrees, from the spring
     */
    apply(pose, antennaAngle) {
        const scaleY = 1 + pose.squash;
        const scaleX = 1 - pose.squash * 0.6;
        this.root.setAttribute('transform',
            `translate(${pose.x} ${pose.y}) rotate(${pose.lean} ${PIVOT.x} ${PIVOT.y}) translate(${PIVOT.x} ${PIVOT.y}) scale(${scaleX} ${scaleY}) translate(${-PIVOT.x} ${-PIVOT.y})`);
        const lift = Math.max(0, -pose.y);
        this.shadow.setAttribute('rx', String(58 - lift * 0.8));
        this.shadow.setAttribute('cx', String(100 + pose.x));
        this.footLeft.setAttribute('transform', `translate(0 ${-pose.footLeft})`);
        this.footRight.setAttribute('transform', `translate(0 ${-pose.footRight})`);
        this.armLeft.setAttribute('transform', `rotate(${pose.armLeft} ${SHOULDER_LEFT.x} ${SHOULDER_LEFT.y})`);
        this.armRight.setAttribute('transform', `rotate(${-pose.armRight} ${SHOULDER_RIGHT.x} ${SHOULDER_RIGHT.y})`);
        this.belly.setAttribute('transform', `translate(100 146) scale(${pose.bellyScale}) translate(-100 -146)`);
        this.face.setAttribute('transform', `rotate(${pose.headTilt} 100 112) translate(${pose.lookX * 7} ${pose.lookY * 5})`);
        this.antenna.setAttribute('transform', `rotate(${antennaAngle} ${ANTENNA_BASE.x} ${ANTENNA_BASE.y})`);
        this.antennaDot.setAttribute('r', String(7 + pose.glow * 2.5));
        this.antennaDot.setAttribute('fill', pose.glow > 0.05 ? '#FFB08F' : COLORS.coral);
        this.headphones.setAttribute('opacity', String(pose.headphones));
        this.applyFace(pose);
    }

    /** @param {Pose} pose */
    applyFace(pose) {
        const openness = Math.max(0, Math.min(1, pose.eyeOpen)) * (1 - pose.eyeSmile);
        for (const eye of this.eyes) {
            eye.open.setAttribute('ry', String(Math.max(0.6, 9 * openness)));
            eye.open.setAttribute('opacity', String(1 - pose.eyeSmile));
            eye.happy.setAttribute('opacity', String(pose.eyeSmile));
        }
        const curve = 128 + pose.smile * 13 - pose.mouthOpen * 4;
        this.mouth.setAttribute('d', `M86 128 Q100 ${curve} 114 128`);
        this.mouthHole.setAttribute('ry', String(pose.mouthOpen * 8));
    }
}
