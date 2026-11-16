/**
 * Canvas prompt while the active Modula Pro is older than the new editors
 * need (spec decision 29): its gallery-editor extensions did not load. The
 * copy is the site-wide incompatible-Pro prompt, built and escaped by the
 * server (`modula_editor_pro_update_notice()`), with its update link.
 */
import { RawHTML } from '@wordpress/element';
import { Notice } from 'admin-ui';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

export default function ProUpdateNotice() {
	const { proUpdateNotice } = useModulaSettingsEditorConfig();
	if (typeof proUpdateNotice !== 'string' || proUpdateNotice === '') {
		return null;
	}
	return (
		<Notice tone="error" role="alert">
			<RawHTML>{proUpdateNotice}</RawHTML>
		</Notice>
	);
}
