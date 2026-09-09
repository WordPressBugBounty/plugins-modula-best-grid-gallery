/**
 * Routes takeover middle-column auxiliary UI by descriptor kind (from nav config or preview chrome).
 * Each panel type is code-split and loaded when its descriptor is active.
 */
import { lazy } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import LazySettingsEditorBoundary from './LazySettingsEditorBoundary';

const FormFieldAuxiliaryPanel = lazy(
	() => import('../form-field-auxiliary/FormFieldAuxiliaryPanel')
);
const HoverEffectBuilderAuxiliaryPanel = lazy(
	() => import('../hover-effect-builder/HoverEffectBuilderAuxiliaryPanel')
);

function AuxiliaryPanelFallback() {
	return (
		<div
			className="modula-gallery-takeover__aux-loading"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<Spinner />
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
				<HoverEffectBuilderAuxiliaryPanel
					mode={descriptor.mode}
					showCanvasChrome
				/>
			</LazySettingsEditorBoundary>
		);
	}
	if (
		descriptor.kind === 'formField' &&
		typeof descriptor.groupedPath === 'string' &&
		descriptor.groupedPath.trim() !== ''
	) {
		return (
			<LazySettingsEditorBoundary fallback={<AuxiliaryPanelFallback />}>
				<FormFieldAuxiliaryPanel
					groupedPath={descriptor.groupedPath.trim()}
				/>
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
