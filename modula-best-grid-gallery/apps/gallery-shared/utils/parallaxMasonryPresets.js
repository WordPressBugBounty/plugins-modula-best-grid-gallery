/**
 * Parallax masonry motion presets (speed / offset / amplitude / drift rate).
 * Backend: settings.parallaxMasonry.motionPreset — 'calm' | 'balanced' | 'dynamic'
 *
 * @package
 */

function shuffleArray(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function shuffleSpeedsNoAdjacentSimilar(pool, minGap) {
	const a = shuffleArray([...pool]);
	for (let maxIter = 0; maxIter < 40; maxIter++) {
		let bad = -1;
		for (let i = 0; i < a.length - 1; i++) {
			if (Math.abs(a[i] - a[i + 1]) < minGap) {
				bad = i;
				break;
			}
		}
		if (bad < 0) {
			return a;
		}
		const j = Math.floor(Math.random() * a.length);
		if (j === bad || j === bad + 1) {
			continue;
		}
		[a[bad + 1], a[j]] = [a[j], a[bad + 1]];
	}
	return a;
}

/**
 * @typedef {Object} ParallaxMotionPreset
 * @property {string}   id
 * @property {number[]} speedPool        - at least 4; extended internally for n>4
 * @property {number[]} offsetPoolPx
 * @property {number[]} amplitudeFactors
 * @property {number}   minSpeedGap
 * @property {number}   freq             - global drift rate (lower = slower)
 */

/** @type {Record<string, ParallaxMotionPreset>} */
export const PARALLAX_MOTION_PRESETS = {
	calm: {
		id: 'calm',
		speedPool: [0.32, 0.42, 0.52, 0.62, 0.38, 0.48, 0.58, 0.68],
		offsetPoolPx: [-14, -6, 6, 14, -10, 10, -4, 4],
		amplitudeFactors: [0.45, 0.55, 0.65, 0.75, 0.5, 0.6, 0.7, 0.8],
		minSpeedGap: 0.07,
		freq: 0.000016,
	},
	balanced: {
		id: 'balanced',
		speedPool: [0.5, 0.7, 0.9, 1.1, 0.6, 0.85, 1.0, 0.75, 0.95, 1.15],
		offsetPoolPx: [-20, -8, 8, 18, -12, 12, -4, 16, -16, 4],
		amplitudeFactors: [0.5, 0.75, 1, 1.2, 0.6, 0.9, 1.1, 0.65, 1.05, 0.85],
		minSpeedGap: 0.15,
		freq: 0.00003,
	},
	dynamic: {
		id: 'dynamic',
		speedPool: [0.85, 1.05, 1.25, 1.45, 0.95, 1.15, 1.35, 1.0, 1.2, 1.4],
		offsetPoolPx: [-28, -14, 14, 28, -20, 20, -8, 24, -24, 8],
		amplitudeFactors: [
			0.55, 0.85, 1.15, 1.45, 0.7, 1.0, 1.3, 0.9, 1.2, 1.1,
		],
		minSpeedGap: 0.12,
		freq: 0.000048,
	},
};

export const PARALLAX_MOTION_PRESET_DEFAULT = 'balanced';

export const PARALLAX_MOTION_PRESET_IDS = Object.keys(PARALLAX_MOTION_PRESETS);

/**
 * @param {string} presetId
 * @param {number} columnCount 1–12
 * @return {{ speeds: number[], offsets: number[], amplitudeFactors: number[], freq: number }}
 */
export function getParallaxMotionForColumns(presetId, columnCount) {
	const n = Math.max(1, Math.min(12, Math.floor(columnCount) || 3));
	const preset =
		PARALLAX_MOTION_PRESETS[presetId] ||
		PARALLAX_MOTION_PRESETS[PARALLAX_MOTION_PRESET_DEFAULT];

	const speedSource = [];
	for (let i = 0; i < n; i++) {
		speedSource.push(preset.speedPool[i % preset.speedPool.length]);
	}
	const speeds = shuffleSpeedsNoAdjacentSimilar(
		speedSource,
		preset.minSpeedGap
	).slice(0, n);

	const shOff = shuffleArray(
		Array.from(
			{ length: n },
			(_, i) => preset.offsetPoolPx[i % preset.offsetPoolPx.length]
		)
	);
	const factors = Array.from({ length: n }, (_, i) => {
		const f = preset.amplitudeFactors[i % preset.amplitudeFactors.length];
		return f;
	});

	return {
		speeds,
		offsets: shOff,
		amplitudeFactors: factors,
		freq: preset.freq,
	};
}
