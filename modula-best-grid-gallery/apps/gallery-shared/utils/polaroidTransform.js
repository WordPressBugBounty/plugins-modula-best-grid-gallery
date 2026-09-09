/**
 * Deterministic “scattered” polaroid tilt + offset per tile index (stable across re-renders).
 *
 * @package
 */

import { hashLayoutSeedString } from './packeryLayout';

const PIN_COLORS = [
	'#c62828',
	'#1565c0',
	'#f9a825',
	'#2e7d32',
	'#6a1b9a',
];

/**
 * @param {number} layoutSeed - From {@see hashLayoutSeedString}
 * @param {number} index      - Tile index in section
 * @param {number} rotationMaxDeg - Half-range: rotation in [-max, +max]
 * @param {number} scatterMaxPx   - Offset in [-max, +max] per axis
 * @param {number} randomnessFromConfig - Polaroid `config.polaroid.randomFactor`: **0..1** (e.g. UI 50% → 0.5 via settingsToConfig). Values **> 1** are treated as legacy 0..100 and divided by 100.
 * @param {boolean} showPin
 * @return {{ rotationDeg: number, translateX: number, translateY: number, pinColor: string|null }}
 */
export function polaroidTransformForIndex(
	layoutSeed,
	index,
	rotationMaxDeg,
	scatterMaxPx,
	randomnessFromConfig,
	showPin
) {
	/*
	 * Index must appear *early* in the hashed string: djb2-like hashes change only
	 * slightly when the varying suffix is at the end, so per-tile rotation/scatter
	 * would look identical otherwise.
	 */
	const unit = (channel) => {
		const h = hashLayoutSeedString(
			`${index}|polaroid|${channel}|${layoutSeed}`
		);
		return ((h % 1000003) + 0.5) / 1000003;
	};
	const rawR = Number(randomnessFromConfig);
	const randomness = Number.isFinite(rawR)
		? rawR > 1
			? Math.min(1, Math.max(0, rawR / 100))
			: Math.min(1, Math.max(0, rawR))
		: 0;
	/*
	 * Keep 0 as a true "no randomness" mode (no tilt/no scatter),
	 * while still giving visible variation for any value above 0.
	 */
	const variance =
		randomness <= 0 ? 0 : 0.15 + randomness * 0.85;
	const rotationSign = unit('rot-sign') < 0.5 ? -1 : 1;
	const rotationMagnitude = (0.15 + unit('rot-mag') * 0.85) * variance;
	const rotationDeg = rotationSign * rotationMagnitude * rotationMaxDeg;
	const translateX = (unit('tx') * 2 - 1) * scatterMaxPx * variance;
	const translateY = (unit('ty') * 2 - 1) * scatterMaxPx * variance;
	const rotH = hashLayoutSeedString(`${index}|polaroid|pin|${layoutSeed}`);
	const pinColor = showPin
		? PIN_COLORS[rotH % PIN_COLORS.length]
		: null;
	return {
		rotationDeg,
		translateX,
		translateY,
		pinColor,
	};
}
