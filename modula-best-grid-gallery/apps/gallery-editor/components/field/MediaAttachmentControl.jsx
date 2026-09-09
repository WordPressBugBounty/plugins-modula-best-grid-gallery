/**
 * Attachment ID via settings; pick/upload through WP Media; preview URL from REST.
 */

import { __ } from '@wordpress/i18n';
import { Icon, upload, replace, trash } from '@wordpress/icons';
import { ActionRow, Button, MetaSummary } from 'shared-ui';
import { useWpMediaAttachmentQuery } from '../../query/useWpMediaAttachmentQuery';
import { buildImageMetadataPreviewChips } from '../../utils/imageMetadataPreviewMeta';
import { bindWpMediaFrameStacking } from '../../utils/wpMediaFrameStacking';

/**
 * @param {Object}   props
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {Object}   props.control
 * @param {'default'|'summary'} [props.variant] summary = MetaSummary + ActionRow (Image edit “This file”).
 */
export default function MediaAttachmentControl({
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
			const id = parseInt(att.id, 10);
			onChange(Number.isFinite(id) && id > 0 ? id : 0);
		});
		frame.open();
	};

	if (variant === 'summary') {
		return (
			<div className="modula-settings-editor__media-attachment modula-settings-editor__media-attachment--summary">
				<MetaSummary
					thumbSrc={attachmentId ? thumbSrc : ''}
					thumbAlt={chips.filename || ''}
					title={
						attachmentId
							? chips.filename ||
								__('Image', 'modula-best-grid-gallery')
							: __(
									'No background image',
									'modula-best-grid-gallery'
								)
					}
					meta={
						attachmentId
							? metaLine || undefined
							: __(
									'Optional tile backdrop',
									'modula-best-grid-gallery'
								)
					}
				/>
				<ActionRow>
					{attachmentId ? (
						<>
							<Button
								variant="ghost"
								disabled={disabled}
								onClick={openFrame}
							>
								{replaceText}
							</Button>
							<Button
								variant="ghost"
								className="modula-gallery-item-edit-panel__danger"
								disabled={disabled}
								onClick={() => onChange(0)}
							>
								{removeText}
							</Button>
						</>
					) : (
						<Button
							variant="ghost"
							disabled={disabled}
							onClick={openFrame}
						>
							{selectText}
						</Button>
					)}
				</ActionRow>
			</div>
		);
	}

	return (
		<div className="modula-settings-editor__media-attachment">
			{previewUrl ? (
				<div className="modula-settings-editor__media-attachment-preview">
					<img src={previewUrl} alt="" decoding="async" />
				</div>
			) : null}
			<Button variant="panel" disabled={disabled} onClick={openFrame}>
				<Icon icon={attachmentId ? replace : upload} size={18} />
				{attachmentId ? replaceText : selectText}
			</Button>
			{attachmentId ? (
				<button
					type="button"
					className="modula-settings-editor__media-attachment-remove"
					onClick={() => !disabled && onChange(0)}
					disabled={disabled}
				>
					<Icon icon={trash} size={16} />
					<span>{removeText}</span>
				</button>
			) : null}
		</div>
	);
}
