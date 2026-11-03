/**
 * Plays a Motion entrance on the tiles of a host: each tile plays it once,
 * as it enters view, while motion may play. A tile waits hidden
 * (`data-modula-entrance="pending"`; each host's stylesheet hides it) until
 * it enters view, so it never shows before its entrance starts.
 *
 * In a settings-editor preview a new entrance or speed plays at once on the
 * shown tiles, and the editor's Motion picker can ask for a replay or a peek
 * (`requestEntranceReplay`). The gallery (`useGalleryEntrance`) and the Pro
 * Albums editor canvas use it, each with its own tiles and its own rule for
 * what a choice plays.
 *
 * A strip (`data-modula-entrance-strip`, the Showcase viewport) plays once:
 * the slides shown when it enters view play together, and every other slide
 * or clone shows as it slides in, without an entrance of its own.
 *
 * @package
 */

import { useEffect, useLayoutEffect, useRef } from '@wordpress/element';
import { ENTRANCE_REPLAY_EVENT } from '../motion/entranceReplay';
import { getEntranceTracks } from '../motion/motionRuntime';
import { cancelEntrance, playEntrance } from '../motion/playEntrance';

const ENTRANCE_STATE_ATTR = 'data-modula-entrance';
const STRIP_ATTR = 'data-modula-entrance-strip';
const PENDING = 'pending';
const PLAYED = 'played';
const STRIP_SELECTOR = `[${STRIP_ATTR}]`;
const PLAYED_STRIP_SELECTOR = `[${STRIP_ATTR}="${PLAYED}"]`;

/**
 * Marks the strips of tiles that just played, and their waiting slides, as
 * played, so a slide that slides in later shows without an entrance (the
 * observer plays pending tiles only).
 *
 * @param {HTMLElement[]} tiles Tiles whose entrance just started.
 */
function markStripsPlayed(tiles) {
	for (const tile of tiles) {
		const strip = tile.closest(STRIP_SELECTOR);
		if (!strip || strip.matches(PLAYED_STRIP_SELECTOR)) {
			continue;
		}
		strip.setAttribute(STRIP_ATTR, PLAYED);
		strip
			.querySelectorAll(`[${ENTRANCE_STATE_ATTR}="${PENDING}"]`)
			.forEach((slide) =>
				slide.setAttribute(ENTRANCE_STATE_ATTR, PLAYED)
			);
	}
}

/**
 * @param {HTMLElement} tile
 * @return {boolean} The tile shows: it has a box, and lies inside its strip's view when it has one.
 */
function isShown(tile) {
	if (tile.getClientRects().length === 0) {
		return false;
	}
	const strip = tile.closest(STRIP_SELECTOR);
	if (!strip) {
		return true;
	}
	const tileBox = tile.getBoundingClientRect();
	const stripBox = strip.getBoundingClientRect();
	return tileBox.right > stripBox.left && tileBox.left < stripBox.right;
}

/**
 * @param {HTMLElement} host
 * @param {string}      tileSelector
 * @return {HTMLElement[]} The host's tiles, without tiles nested in a tile (a Polaroid print's inner tile).
 */
function findTiles(host, tileSelector) {
	return [...host.querySelectorAll(tileSelector)].filter((tile) => {
		const outer = tile.parentElement?.closest(tileSelector);
		return !outer || !host.contains(outer);
	});
}

/**
 * Plays an entrance on every shown tile at once, from its start.
 *
 * @param {HTMLElement|null}                                  host
 * @param {string}                                            tileSelector
 * @param {import('../motion/motionRuntime').EntranceTrack[]} tracks
 * @param {number}                                            speedScale
 */
function replayEntrance(host, tileSelector, tracks, speedScale) {
	if (!host || tracks.length === 0) {
		return;
	}
	// A strip's off-view slides and clones would skew the group's stagger.
	const tiles = findTiles(host, tileSelector).filter(isShown);
	for (const tile of tiles) {
		cancelEntrance(tile);
		tile.setAttribute(ENTRANCE_STATE_ATTR, PLAYED);
	}
	playEntrance(tiles, tracks, speedScale);
	markStripsPlayed(tiles);
}

/**
 * @typedef {Object} TileEntrance
 * @property {string}                     presetId      The entrance preset the stored choice plays (`custom` and None play nothing).
 * @property {number}                     speedScale    Scale on every duration and delay (`getMotionSpeedScale`).
 * @property {boolean}                    allowed       Motion may play here and now.
 * @property {boolean}                    preview       A settings-editor preview: changes, replay and peek play at once.
 * @property {(choice: string) => string} resolveChoice What a peeked `motion.entrance` choice plays.
 * @property {string}                     tileSelector  The host's tiles.
 */

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {TileEntrance}                                entrance
 */
export function useTileEntrance(
	hostRef,
	{ presetId, speedScale, allowed, preview, resolveChoice, tileSelector }
) {
	// Before paint, so a tile never shows before its entrance.
	useLayoutEffect(() => {
		const host = hostRef.current;
		const tracks = getEntranceTracks(presetId);
		if (
			!host ||
			!allowed ||
			tracks.length === 0 ||
			typeof window.IntersectionObserver !== 'function'
		) {
			return undefined;
		}

		const inView = new window.IntersectionObserver((entries) => {
			const entering = entries
				.filter((entry) => entry.isIntersecting)
				.map((entry) => entry.target);
			entering.forEach((tile) => inView.unobserve(tile));
			const pending = entering.filter(
				(tile) => tile.getAttribute(ENTRANCE_STATE_ATTR) === PENDING
			);
			pending.forEach((tile) =>
				tile.setAttribute(ENTRANCE_STATE_ATTR, PLAYED)
			);
			playEntrance(pending, tracks, speedScale);
			markStripsPlayed(pending);
		});
		// Layouts mount their tiles later (lazy chunks, pages, filters).
		const armNewTiles = () => {
			for (const tile of findTiles(host, tileSelector)) {
				if (tile.hasAttribute(ENTRANCE_STATE_ATTR)) {
					continue;
				}
				if (tile.closest(PLAYED_STRIP_SELECTOR)) {
					tile.setAttribute(ENTRANCE_STATE_ATTR, PLAYED);
					continue;
				}
				tile.setAttribute(ENTRANCE_STATE_ATTR, PENDING);
				inView.observe(tile);
			}
		};
		const mounted = new window.MutationObserver(armNewTiles);
		armNewTiles();
		mounted.observe(host, { childList: true, subtree: true });

		return () => {
			mounted.disconnect();
			inView.disconnect();
			host.querySelectorAll(
				`[${ENTRANCE_STATE_ATTR}="${PENDING}"]`
			).forEach((tile) => tile.removeAttribute(ENTRANCE_STATE_ATTR));
		};
	}, [hostRef, presetId, speedScale, allowed, tileSelector]);

	// Preview: a new entrance or speed plays at once on the shown tiles.
	const shownKeyRef = useRef(null);
	useEffect(() => {
		const key = `${presetId}:${speedScale}`;
		const previous = shownKeyRef.current;
		shownKeyRef.current = key;
		if (!preview || !allowed || previous === null || previous === key) {
			return;
		}
		replayEntrance(
			hostRef.current,
			tileSelector,
			getEntranceTracks(presetId),
			speedScale
		);
	}, [hostRef, preview, allowed, presetId, speedScale, tileSelector]);

	// Preview: the editor's replay button and its peek.
	useEffect(() => {
		if (!preview || !allowed) {
			return undefined;
		}
		const onReplay = (event) => {
			const choice = event.detail?.entrance;
			const played =
				typeof choice === 'string' ? resolveChoice(choice) : presetId;
			replayEntrance(
				hostRef.current,
				tileSelector,
				getEntranceTracks(played),
				speedScale
			);
		};
		window.addEventListener(ENTRANCE_REPLAY_EVENT, onReplay);
		return () => {
			window.removeEventListener(ENTRANCE_REPLAY_EVENT, onReplay);
		};
	}, [
		hostRef,
		preview,
		allowed,
		presetId,
		speedScale,
		resolveChoice,
		tileSelector,
	]);
}
