/**
 * Content block background image + size/position/repeat (shared by edit surfaces).
 */
import {
	DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
	normalizeBlockBackgroundImageId,
} from 'gallery-shared/preview';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Select } from 'admin-ui';
import MediaAttachmentControl from '../field/MediaAttachmentControl';
import ItemEditField from '../gallery-item-edit-panel/ItemEditField';
import { useWpMediaAttachmentQuery } from '../../query/useWpMediaAttachmentQuery';

const MEDIA_CONTROL = {
	libraryType: 'image',
	mediaFrameTitle: __('Choose background image', 'modula-best-grid-gallery'),
	selectButtonLabel: __('Choose image', 'modula-best-grid-gallery'),
	replaceButtonLabel: __('Replace image', 'modula-best-grid-gallery'),
	removeButtonLabel: __('Remove image', 'modula-best-grid-gallery'),
};

/** How the background image is drawn; shown once an image is chosen. */
const BACKGROUND_IMAGE_SELECTS = [
	{
		key: 'blockBackgroundSize',
		label: __('Background size', 'modula-best-grid-gallery'),
		options: [
			{ label: __('Cover', 'modula-best-grid-gallery'), value: 'cover' },
			{
				label: __('Contain', 'modula-best-grid-gallery'),
				value: 'contain',
			},
			{ label: __('Auto', 'modula-best-grid-gallery'), value: 'auto' },
		],
	},
	{
		key: 'blockBackgroundPosition',
		label: __('Background position', 'modula-best-grid-gallery'),
		options: [
			{
				label: __('Center', 'modula-best-grid-gallery'),
				value: 'center',
			},
			{ label: __('Top', 'modula-best-grid-gallery'), value: 'top' },
			{
				label: __('Bottom', 'modula-best-grid-gallery'),
				value: 'bottom',
			},
			{ label: __('Left', 'modula-best-grid-gallery'), value: 'left' },
			{ label: __('Right', 'modula-best-grid-gallery'), value: 'right' },
			{
				label: __('Top left', 'modula-best-grid-gallery'),
				value: 'top left',
			},
			{
				label: __('Top right', 'modula-best-grid-gallery'),
				value: 'top right',
			},
			{
				label: __('Bottom left', 'modula-best-grid-gallery'),
				value: 'bottom left',
			},
			{
				label: __('Bottom right', 'modula-best-grid-gallery'),
				value: 'bottom right',
			},
		],
	},
	{
		key: 'blockBackgroundRepeat',
		label: __('Background repeat', 'modula-best-grid-gallery'),
		options: [
			{
				label: __('No repeat', 'modula-best-grid-gallery'),
				value: 'no-repeat',
			},
			{
				label: __('Repeat', 'modula-best-grid-gallery'),
				value: 'repeat',
			},
			{
				label: __('Repeat horizontally', 'modula-best-grid-gallery'),
				value: 'repeat-x',
			},
			{
				label: __('Repeat vertically', 'modula-best-grid-gallery'),
				value: 'repeat-y',
			},
		],
	},
];

/**
 * @param {Object}   props
 * @param {Object}   props.state
 * @param {Function} props.setState `(updater) => void` or field patch helper
 * @param {boolean}  props.disabled
 * @param {string}   props.editorId
 */
export default function ContentBlockBackgroundFields({
	state,
	setState,
	disabled,
	editorId,
}) {
	const imageId = normalizeBlockBackgroundImageId(
		state.blockBackgroundImageId
	);
	const { data: media } = useWpMediaAttachmentQuery(imageId, {
		enabled: Boolean(imageId),
	});
	const resolvedUrl =
		media && typeof media.source_url === 'string' ? media.source_url : '';

	useEffect(() => {
		if (!imageId) {
			if (state.blockBackgroundImageUrl) {
				setState((prev) => ({
					...prev,
					blockBackgroundImageUrl: '',
				}));
			}
			return;
		}
		if (
			resolvedUrl &&
			resolvedUrl !== String(state.blockBackgroundImageUrl || '')
		) {
			setState((prev) => ({
				...prev,
				blockBackgroundImageUrl: resolvedUrl,
			}));
		}
	}, [imageId, resolvedUrl, setState, state.blockBackgroundImageUrl]);

	return (
		<>
			<div className="modula-content-block-edit__bg-image-card">
				<MediaAttachmentControl
					variant="summary"
					value={imageId || 0}
					onChange={(nextId) => {
						const id = normalizeBlockBackgroundImageId(nextId);
						setState((prev) => ({
							...prev,
							blockBackgroundImageId: id,
							blockBackgroundImageUrl: id
								? prev.blockBackgroundImageUrl || ''
								: '',
							blockBackgroundOverlayOpacity:
								prev.blockBackgroundOverlayOpacity ??
								DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
						}));
					}}
					disabled={disabled}
					control={MEDIA_CONTROL}
				/>
				<p className="modula-gallery-item-edit-panel__field-help">
					{__(
						'Optional. The tile background color tints the image — use color alpha for strength.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
			{imageId
				? BACKGROUND_IMAGE_SELECTS.map(({ key, label, options }) => (
						<ItemEditField
							key={key}
							label={label}
							controlId={`${editorId}-${key}`}
						>
							<Select
								id={`${editorId}-${key}`}
								options={options}
								value={state[key]}
								onChange={(next) =>
									setState((prev) => ({
										...prev,
										[key]: next,
									}))
								}
								disabled={disabled}
							/>
						</ItemEditField>
					))
				: null}
		</>
	);
}
