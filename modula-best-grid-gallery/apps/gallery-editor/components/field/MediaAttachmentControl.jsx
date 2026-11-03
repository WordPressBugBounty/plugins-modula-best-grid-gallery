/**
 * Attachment ID via settings; pick/upload through WP Media; preview URL from REST.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button, CloseIcon } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { useWpMediaAttachmentQuery } from '../../query/useWpMediaAttachmentQuery';
import { buildImageMetadataPreviewChips } from '../../utils/imageMetadataPreviewMeta';
import { bindWpMediaFrameStacking } from '../../utils/wpMediaFrameStacking';

/**
 * @param {Object}              props
 * @param {string}              [props.id]      Id of the chosen file's group.
 * @param {string}              [props.label]   Setting name; names the chosen file's group.
 * @param {*}                   props.value
 * @param {Function}            props.onChange
 * @param {boolean}             props.disabled
 * @param {Object}              props.control
 * @param {'default'|'summary'} [props.variant] default = the panel row's controls (Choose image, or thumb, name, Change, ×); summary = thumb, name and size line, then the actions (Image edit “This file”).
 */
export default function MediaAttachmentControl(props) {
	// The image edit panel renders the summary outside any settings row.
	return (
		<AdminUiScope>
			<MediaAttachmentControlContent {...props} />
		</AdminUiScope>
	);
}

/**
 * @param {Object}              props
 * @param {string}              [props.id]
 * @param {string}              [props.label]
 * @param {*}                   props.value
 * @param {Function}            props.onChange
 * @param {boolean}             props.disabled
 * @param {Object}              props.control
 * @param {'default'|'summary'} [props.variant]
 */
function MediaAttachmentControlContent({
	id,
	label = '',
	value,
	onChange,
	disabled,
	control,
	variant = 'default',
}) {
	const attachmentId = (() => {
		const n = parseInt(value, 10);
		return Number.isFinite(n) && n > 0 ? n : 0;
	})();
	const { data: media } = useWpMediaAttachmentQuery(attachmentId, {
		enabled: Boolean(attachmentId),
	});

	const previewUrl =
		media && typeof media.source_url === 'string' ? media.source_url : '';
	const thumbSrc =
		media?.media_details?.sizes?.thumbnail?.source_url ||
		media?.media_details?.sizes?.medium?.source_url ||
		previewUrl ||
		'';
	const chips = buildImageMetadataPreviewChips(null, media);
	const metaLine = [chips.dimensions, chips.fileSize]
		.filter(Boolean)
		.join(' · ');

	const wpGlobal = typeof window !== 'undefined' ? window.wp : null;
	if (!wpGlobal?.media) {
		return (
			<p className="modula-settings-editor__media-attachment-fallback">
				{__(
					'WordPress media scripts are not loaded. Reload the page or contact your administrator.',
					'modula-best-grid-gallery'
				)}
			</p>
		);
	}

	const libraryOpts =
		control.libraryType === 'image' ? { type: 'image' } : {};
	const title =
		typeof control.mediaFrameTitle === 'string'
			? control.mediaFrameTitle
			: __('Choose media', 'modula-best-grid-gallery');
	const selectText =
		typeof control.selectButtonLabel === 'string'
			? control.selectButtonLabel
			: __('Choose from the media library', 'modula-best-grid-gallery');
	const replaceText =
		typeof control.replaceButtonLabel === 'string'
			? control.replaceButtonLabel
			: __('Replace image', 'modula-best-grid-gallery');
	const removeText =
		typeof control.removeButtonLabel === 'string'
			? control.removeButtonLabel
			: __('Remove', 'modula-best-grid-gallery');

	const openFrame = () => {
		if (disabled) {
			return;
		}
		const frame = wpGlobal.media({
			title,
			button: { text: selectText },
			library: libraryOpts,
			multiple: false,
		});
		bindWpMediaFrameStacking(frame);
		frame.on('select', () => {
			const att = frame.state().get('selection').first()?.toJSON();
			if (!att) {
				return;
			}
			const pickedId = parseInt(att.id, 10);
			onChange(Number.isFinite(pickedId) && pickedId > 0 ? pickedId : 0);
		});
		frame.open();
	};

	if (variant === 'summary') {
		const summaryMeta = attachmentId
			? metaLine
			: __('Optional tile backdrop', 'modula-best-grid-gallery');
		return (
			<div className="modula-settings-editor__media-attachment modula-settings-editor__media-attachment--summary">
				<div className="modula-settings-editor__media-summary">
					{attachmentId && thumbSrc ? (
						<img
							className="modula-settings-editor__media-summary-thumb"
							src={thumbSrc}
							alt={chips.filename || ''}
							width={72}
							height={72}
							decoding="async"
						/>
					) : (
						<span
							className="modula-settings-editor__media-summary-thumb is-empty"
							aria-hidden="true"
						/>
					)}
					<div className="modula-settings-editor__media-summary-body">
						<div className="modula-settings-editor__media-summary-title">
							{attachmentId
								? chips.filename ||
									__('Image', 'modula-best-grid-gallery')
								: __(
										'No background image',
										'modula-best-grid-gallery'
									)}
						</div>
						{summaryMeta ? (
							<div className="modula-settings-editor__media-summary-meta">
								{summaryMeta}
							</div>
						) : null}
					</div>
				</div>
				<div className="modula-settings-editor__media-summary-actions">
					<Button disabled={disabled} onClick={openFrame}>
						{attachmentId ? replaceText : selectText}
					</Button>
					{attachmentId ? (
						<Button
							variant="danger"
							disabled={disabled}
							onClick={() => onChange(0)}
						>
							{removeText}
						</Button>
					) : null}
				</div>
			</div>
		);
	}

	// The panel row (canvas): "Choose image", or thumbnail, name, Change and ×.
	// No `id` on the button: the row's <label for> would replace its text;
	// its name carries the setting instead.
	if (!attachmentId) {
		const chooseText = __('Choose image', 'modula-best-grid-gallery');
		return (
			<Button
				className="modula-settings-editor__media-attachment"
				disabled={disabled}
				onClick={openFrame}
				aria-label={
					label
						? sprintf(
								/* translators: 1: setting name, e.g. Image file, 2: button text. */
								__('%1$s: %2$s', 'modula-best-grid-gallery'),
								label,
								chooseText
							)
						: undefined
				}
			>
				{chooseText}
			</Button>
		);
	}

	const fileName = chips.filename || __('Image', 'modula-best-grid-gallery');
	return (
		<div
			id={id}
			role="group"
			aria-label={label || title}
			className="modula-settings-editor__media-attachment is-set"
		>
			{thumbSrc ? (
				<img
					className="modula-settings-editor__media-attachment-thumb"
					src={thumbSrc}
					alt=""
					width={32}
					height={32}
					decoding="async"
				/>
			) : null}
			<span className="modula-settings-editor__media-attachment-name">
				{fileName}
			</span>
			<Button
				variant="link"
				disabled={disabled}
				onClick={openFrame}
				aria-label={sprintf(
					/* translators: %s: chosen file name. */
					__('Change %s', 'modula-best-grid-gallery'),
					fileName
				)}
			>
				{__('Change', 'modula-best-grid-gallery')}
			</Button>
			<Button
				variant="ghost"
				className="modula-settings-editor__media-attachment-remove"
				disabled={disabled}
				onClick={() => onChange(0)}
				aria-label={removeText}
				title={removeText}
			>
				<CloseIcon size={16} />
			</Button>
		</div>
	);
}
