/**
 * Takeover layout: top bar, then sidebar beside the canvas column (toolbar,
 * then the dark stage with an optional auxiliary panel, the artboard and the
 * floating device pill).
 *
 * The sidebar, the toolbar and the pill each sit in an admin-ui scope; the
 * artboard does not, so the frontend gallery render inherits nothing from
 * admin-ui.
 *
 * The layout also hosts the editor toast (`useTakeoverToast`) and the
 * canvas's primary Add action (`AddSplit` registers it, `CanvasEmptyState`
 * runs it) for its regions.
 */
import { __ } from '@wordpress/i18n';
import AdminUiScope from '../appearance/AdminUiScope';
import CanvasDevicePill from '../canvas/CanvasDevicePill';
import { CanvasPrimaryAddProvider } from '../canvas/CanvasPrimaryAddContext';
import { TakeoverToastProvider } from '../toast/TakeoverToast';
import { AuxiliaryPanel } from './AuxiliaryPanel';

const PREVIEW_WRAP_MODIFIERS = {
	desktop: '',
	tablet: ' modula-takeover__preview-wrap--tablet',
	mobile: ' modula-takeover__preview-wrap--mobile',
};

/**
 * @param {Object}                                          props
 * @param {import('react').ReactNode}                       props.topBar
 * @param {import('react').ReactNode}                       props.sidebar
 * @param {import('react').ReactNode}                       props.toolbar                   Canvas toolbar chrome (and any bars under it).
 * @param {import('react').ReactNode}                       [props.auxiliary]               Optional tools column beside the artboard.
 * @param {import('react').ReactNode}                       props.canvas                    Artboard body.
 * @param {'desktop'|'tablet'|'mobile'}                     props.previewViewport
 * @param {(viewport: 'desktop'|'tablet'|'mobile') => void} [props.onPreviewViewportChange] Shows the device pill.
 * @param {import('react').ReactNode}                       [props.children]                Non-visual helpers (autosave, listeners).
 * @param {string}                                          [props.className]               Editor-specific root classes.
 */
export default function TakeoverLayout(props) {
	return (
		<TakeoverToastProvider>
			<CanvasPrimaryAddProvider>
				<TakeoverLayoutFrame {...props} />
			</CanvasPrimaryAddProvider>
		</TakeoverToastProvider>
	);
}

/**
 * @param {Parameters<typeof TakeoverLayout>[0]} props
 */
function TakeoverLayoutFrame({
	topBar,
	sidebar,
	toolbar,
	auxiliary = null,
	canvas,
	previewViewport,
	onPreviewViewportChange,
	children = null,
	className = '',
}) {
	const previewWrapModifier = PREVIEW_WRAP_MODIFIERS[previewViewport] ?? '';
	const shellClassName = [
		'modula-takeover__shell',
		'modula-takeover__shell--redesign-sidebar',
		auxiliary ? 'modula-takeover__shell--aux-panel-open' : '',
		className.trim(),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={shellClassName}>
			{children}
			{topBar}
			<div className="modula-takeover__workspace">
				{sidebar}
				<div className="modula-takeover__canvas-column">
					<AdminUiScope>{toolbar}</AdminUiScope>
					<div className="modula-takeover__redesign-stage">
						{auxiliary ? (
							<AuxiliaryPanel
								label={__(
									'Additional tools',
									'modula-best-grid-gallery'
								)}
							>
								{auxiliary}
							</AuxiliaryPanel>
						) : null}
						<div className="modula-takeover__preview-column">
							<main
								id="modula-takeover-main"
								className="modula-takeover__main"
								tabIndex={-1}
								aria-labelledby="modula-takeover-topbar-title"
							>
								<div className="modula-takeover__preview-card">
									<div
										className={`modula-takeover__preview-wrap${previewWrapModifier}`}
									>
										{canvas}
									</div>
								</div>
							</main>
							{onPreviewViewportChange ? (
								<AdminUiScope>
									<CanvasDevicePill
										previewViewport={previewViewport}
										onPreviewViewportChange={
											onPreviewViewportChange
										}
									/>
								</AdminUiScope>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
