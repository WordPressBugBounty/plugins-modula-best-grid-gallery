/**
 * Read-only deeplink URL preview with accent on the hash slug.
 */
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getByPath } from '../../logic/getByPath';
import SettingsPreviewPanel from './SettingsPreviewPanel';

/**
 * @param {unknown} value
 * @return {string}
 */
function slugFrom(value) {
	if (typeof value !== 'string') {
		return 'modulagallery';
	}
	const trimmed = value.trim();
	return trimmed !== '' ? trimmed : 'modulagallery';
}

/**
 * @return {string}
 */
function siteBase() {
	if (typeof window === 'undefined' || !window.location) {
		return 'https://example.com';
	}
	const origin = window.location.origin || '';
	return origin !== '' ? origin : 'https://example.com';
}

export default function DeeplinkUrlPreview() {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe
			selector={(s) => getByPath(s.values, 'deeplink.customLinkName')}
		>
			{(rawSlug) => {
				const slug = slugFrom(rawSlug);
				const base = `${siteBase()}/…/`;
				return (
					<SettingsPreviewPanel
						label={__('Example link', 'modula-best-grid-gallery')}
						className="modula-settings-editor__deeplink-url-preview"
					>
						<p className="modula-settings-editor__settings-preview-sample modula-settings-editor__deeplink-url-preview-url">
							<span className="modula-settings-editor__deeplink-url-preview-base">
								{base}
							</span>
							<span className="modula-settings-editor__deeplink-url-preview-hash">
								#{slug}
							</span>
							<span className="modula-settings-editor__deeplink-url-preview-base">
								-1
							</span>
						</p>
					</SettingsPreviewPanel>
				);
			}}
		</form.Subscribe>
	);
}
