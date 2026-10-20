/**
 * The WordPress media library (`wp.media`, which the settings page loads
 * with wp_enqueue_media()) for image fields.
 */
import { useEffect, useRef, useState } from '@wordpress/element';

/**
 * @return {boolean} Whether the media library is loaded on this page.
 */
export function hasMediaLibrary() {
	return 'function' === typeof window.wp?.media;
}

/**
 * The small preview of an attachment: its thumbnail size, else the file.
 *
 * @param {Object} attachment Attachment as `wp.media` serializes it.
 * @return {string} URL, empty when it has none.
 */
function thumbnailUrl(attachment) {
	return attachment.sizes?.thumbnail?.url ?? attachment.url ?? '';
}

/**
 * Opens the media library to choose one image. The frame is created on the
 * first open and reused, as WordPress screens do, so reopening does not add
 * another modal to the page; its listener is released on unmount.
 *
 * @param {Object}   args
 * @param {string}   args.title      Frame title.
 * @param {string}   args.buttonText Select button text.
 * @param {Function} args.onSelect   Receives `{ id, src }` for the chosen image.
 * @return {Function} Opens the library.
 */
export function useImageLibrary({ title, buttonText, onSelect }) {
	const frameRef = useRef(null);
	const onSelectRef = useRef(onSelect);

	useEffect(() => {
		onSelectRef.current = onSelect;
	});

	useEffect(
		() => () => {
			frameRef.current?.off('select');
		},
		[]
	);

	return () => {
		if (null === frameRef.current) {
			const frame = window.wp.media({
				title,
				button: { text: buttonText },
				library: { type: 'image' },
				multiple: false,
			});
			frame.on('select', () => {
				const attachment = frame
					.state()
					.get('selection')
					.first()
					.toJSON();
				onSelectRef.current({
					id: attachment.id,
					src: thumbnailUrl(attachment),
				});
			});
			frameRef.current = frame;
		}
		frameRef.current.open();
	};
}

/**
 * The preview of an attachment the page has no URL for (chosen, then the
 * card remounted). The media library caches attachments it has loaded.
 *
 * @param {number} id Attachment ID.
 * @return {Promise<string>} Preview URL; rejects when it cannot be loaded.
 */
export function attachmentPreview(id) {
	const attachment = window.wp.media.attachment(id);
	const loaded = attachment.get('url')
		? Promise.resolve()
		: Promise.resolve(attachment.fetch());

	return loaded.then(() => thumbnailUrl(attachment.toJSON()));
}

/**
 * @param {*} stored Stored attachment ID.
 * @return {number} The ID, or 0 when no image is chosen.
 */
export function attachmentIdOf(stored) {
	const id = Number(stored);

	return Number.isInteger(id) && id > 0 ? id : 0;
}

/**
 * The preview URL of an image field's chosen image. The settings class sends
 * the stored image's URL (`src`); an image chosen here brings its own. An
 * image chosen before the card remounted is looked up in the media library.
 * An image without a URL (deleted, or not found) shows as no image, as the
 * server shows it.
 *
 * @param {number} imageId    Chosen attachment ID (0 for none).
 * @param {Object} imageField The image config field (`default`, `src`).
 * @return {{ src: string, remember: Function }} Preview URL, and a setter (id, src).
 */
export function useImagePreview(imageId, imageField) {
	const [previews, setPreviews] = useState(() => {
		const storedId = attachmentIdOf(imageField.default);
		return storedId && imageField.src ? { [storedId]: imageField.src } : {};
	});
	const remember = (id, src) =>
		setPreviews((known) => ({ ...known, [id]: src }));
	const isKnown = Object.hasOwn(previews, imageId);

	useEffect(() => {
		if (0 === imageId || isKnown || !hasMediaLibrary()) {
			return undefined;
		}
		let isCurrent = true;
		const store = (src) => {
			if (isCurrent) {
				setPreviews((known) => ({ ...known, [imageId]: src }));
			}
		};
		attachmentPreview(imageId).then(store, () => store(''));

		return () => {
			isCurrent = false;
		};
	}, [imageId, isKnown]);

	return { src: 0 === imageId ? '' : (previews[imageId] ?? ''), remember };
}
