/**
 * Routes takeover middle-column auxiliary UI by descriptor kind (from nav config or preview chrome).
 * Each panel type is code-split and loaded when its descriptor is active.
 */
import { lazy } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Spinner } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import LazySettingsEditorBoundary from './LazySettingsEditorBoundary';

const HoverEffectBuilderAuxiliaryPanel = lazy(
	() => import('../hover-effect-builder/HoverEffectBuilderAuxiliaryPanel')
);

function AuxiliaryPanelFallback() {
	return (
		<div
			className="modula-gallery-takeover__aux-loading"
			role="status"
			aria-label={__('Loading…', 'modula-best-grid-gallery')}
			aria-live="polite"
			aria-busy="true"
		>
			<AdminUiScope>
				<Spinner />
			</AdminUiScope>
		</div>
	);
}

/**
 * @param {{ galleryId?: number }} props
 */
export default function TakeoverAuxiliaryPanelHost({ galleryId: _galleryId }) {
	const { auxiliary } = useTakeoverAuxiliaryPanel();
	if (!auxiliary) {
		return null;
	}
	const { descriptor } = auxiliary;
	if (descriptor.kind === 'hoverEffectBuilder') {
		return (
			<LazySettingsEditorBoundary fallback={<AuxiliaryPanelFallback />}>
				<HoverEffectBuilderAuxiliaryPanel showCanvasChrome />
			</LazySettingsEditorBoundary>
		);
	}
	return (
		<div className="modula-gallery-takeover__aux-unknown" role="alert">
			<p>
				{__(
					'This panel type is not available.',
					'modula-best-grid-gallery'
				)}
			</p>
		</div>
	);
}
