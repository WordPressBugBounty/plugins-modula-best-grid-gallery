/**
 * Content block background image + size/position/repeat (shared by edit surfaces).
 */
import {
	DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
	normalizeBlockBackgroundImageId,
} from 'gallery-shared/preview';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { FieldStack, Select } from 'shared-ui';
import MediaAttachmentControl from '../field/MediaAttachmentControl';
import { useWpMediaAttachmentQuery } from '../../query/useWpMediaAttachmentQuery';

const MEDIA_CONTROL = {
	libraryType: 'image',
	mediaFrameTitle: __('Choose background image', 'modula-best-grid-gallery'),
	selectButtonLabel: __('Choose image', 'modula-best-grid-gallery'),
	replaceButtonLabel: __('Replace image', 'modula-best-grid-gallery'),
	removeButtonLabel: __('Remove image', 'modula-best-grid-gallery'),
};

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

	const sizeOptions = [
		{
			label: __('Cover', 'modula-best-grid-gallery'),
			value: 'cover',
		},
		{
			label: __('Contain', 'modula-best-grid-gallery'),
			value: 'contain',
		},
		{
			label: __('Auto', 'modula-best-grid-gallery'),
			value: 'auto',
		},
	];

	const positionOptions = [
		{ label: __('Center', 'modula-best-grid-gallery'), value: 'center' },
		{ label: __('Top', 'modula-best-grid-gallery'), value: 'top' },
		{ label: __('Bottom', 'modula-best-grid-gallery'), value: 'bottom' },
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
	];

	const repeatOptions = [
		{
			label: __('No repeat', 'modula-best-grid-gallery'),
			value: 'no-repeat',
		},
		{ label: __('Repeat', 'modula-best-grid-gallery'), value: 'repeat' },
		{
			label: __('Repeat horizontally', 'modula-best-grid-gallery'),
			value: 'repeat-x',
		},
		{
			label: __('Repeat vertically', 'modula-best-grid-gallery'),
			value: 'repeat-y',
		},
	];

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
				<p className="modula-gallery-item-edit-panel__file-help">
					{__(
						'Optional. The tile background color tints the image — use color alpha for strength.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
			{imageId ? (
				<>
					<FieldStack
						label={__(
							'Background size',
							'modula-best-grid-gallery'
						)}
						htmlFor={`${editorId}-bg-size`}
					>
						<Select
							id={`${editorId}-bg-size`}
							options={sizeOptions}
							value={state.blockBackgroundSize}
							onChange={(blockBackgroundSize) =>
								setState((prev) => ({
									...prev,
									blockBackgroundSize,
								}))
							}
							disabled={disabled}
						/>
					</FieldStack>
					<FieldStack
						label={__(
							'Background position',
							'modula-best-grid-gallery'
						)}
						htmlFor={`${editorId}-bg-position`}
					>
						<Select
							id={`${editorId}-bg-position`}
							options={positionOptions}
							value={state.blockBackgroundPosition}
							onChange={(blockBackgroundPosition) =>
								setState((prev) => ({
									...prev,
									blockBackgroundPosition,
								}))
							}
							disabled={disabled}
						/>
					</FieldStack>
					<FieldStack
						label={__(
							'Background repeat',
							'modula-best-grid-gallery'
						)}
						htmlFor={`${editorId}-bg-repeat`}
					>
						<Select
							id={`${editorId}-bg-repeat`}
							options={repeatOptions}
							value={state.blockBackgroundRepeat}
							onChange={(blockBackgroundRepeat) =>
								setState((prev) => ({
									...prev,
									blockBackgroundRepeat,
								}))
							}
							disabled={disabled}
						/>
					</FieldStack>
				</>
			) : null}
		</>
	);
}
