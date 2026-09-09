/**
 * URL text field with a Media Library picker (stores URL only, not attachment ID).
 */

import { __ } from '@wordpress/i18n';
import { Button, TextControl } from '@wordpress/components';
import { isNil } from '../../logic/isNil';
import { openWpMediaUrlPicker } from '../../utils/openWpMediaUrlPicker';

/**
 * @param {Object}   props
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string|undefined} props.help
 * @param {Object}   props.control
 */
export default function MediaUrlControl({
	value,
	onChange,
	disabled,
	help,
	control,
}) {
	const urlValue = isNil(value) ? '' : String(value);
	const libraryType =
		control.libraryType === 'video' || control.libraryType === 'image'
			? control.libraryType
			: '';
	const showImagePreview = libraryType === 'image' && urlValue.trim() !== '';

	const wpGlobal = typeof window !== 'undefined' ? window.wp : null;
	if (!wpGlobal?.media) {
		return (
			<>
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					value={urlValue}
					onChange={onChange}
					disabled={disabled}
					help={help}
				/>
				<p className="modula-settings-editor__media-url-fallback">
					{__(
						'WordPress media scripts are not loaded. Reload the page or paste a URL manually.',
						'modula-best-grid-gallery'
					)}
				</p>
			</>
		);
	}

	const frameTitle =
		typeof control.mediaFrameTitle === 'string'
			? control.mediaFrameTitle
			: __('Choose media', 'modula-best-grid-gallery');
	const selectLabel =
		typeof control.selectButtonLabel === 'string'
			? control.selectButtonLabel
			: __('Media Library', 'modula-best-grid-gallery');

	const openLibrary = () => {
		if (disabled) {
			return;
		}
		openWpMediaUrlPicker({
			libraryType,
			title: frameTitle,
			buttonText: selectLabel,
			onSelect: (url) => onChange(url),
		});
	};

	return (
		<div className="modula-settings-editor__media-url">
			{showImagePreview ? (
				<div className="modula-settings-editor__media-url-preview">
					<img src={urlValue} alt="" decoding="async" />
				</div>
			) : null}
			<div className="modula-settings-editor__media-url-row">
				<div className="modula-settings-editor__media-url-input">
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						value={urlValue}
						onChange={onChange}
						disabled={disabled}
						help={help}
					/>
				</div>
				<Button
					variant="secondary"
					className="modula-settings-editor__media-url-btn"
					onClick={openLibrary}
					disabled={disabled}
				>
					{selectLabel}
				</Button>
			</div>
		</div>
	);
}
