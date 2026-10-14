/**
 * Takeover layout: top bar, then sidebar beside the canvas column (toolbar,
 * stage with optional auxiliary panel + artboard, status bar).
 */
import { __ } from '@wordpress/i18n';
import { AuxiliaryPanel } from 'shared-ui';

const PREVIEW_WRAP_MODIFIERS = {
	desktop: '',
	tablet: ' modula-takeover__preview-wrap--tablet',
	mobile: ' modula-takeover__preview-wrap--mobile',
};

/**
 * @param {Object}                      props
 * @param {import('react').ReactNode}   props.topBar
 * @param {import('react').ReactNode}   props.sidebar
 * @param {import('react').ReactNode}   props.toolbar         Canvas toolbar chrome (and any bars under it).
 * @param {import('react').ReactNode}   [props.auxiliary]     Optional tools column beside the artboard.
 * @param {import('react').ReactNode}   props.canvas          Artboard body.
 * @param {import('react').ReactNode}   props.statusBar
 * @param {'desktop'|'tablet'|'mobile'} props.previewViewport
 * @param {import('react').ReactNode}   [props.children]      Non-visual helpers (autosave, listeners).
 * @param {string}                      [props.className]     Editor-specific root classes.
 */
export default function TakeoverLayout({
	topBar,
	sidebar,
	toolbar,
	auxiliary = null,
	canvas,
	statusBar,
	previewViewport,
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
					{toolbar}
					<div className="modula-takeover__redesign-stage">
						{auxiliary ? (
							<AuxiliaryPanel
								aria-label={__(
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
						</div>
					</div>
					{statusBar}
				</div>
			</div>
		</div>
	);
}
