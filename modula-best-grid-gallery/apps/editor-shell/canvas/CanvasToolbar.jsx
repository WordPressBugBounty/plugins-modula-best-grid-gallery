/**
 * Canvas toolbar above the artboard: document actions on the left; device
 * switch and the Add split on the right.
 */
import { __ } from '@wordpress/i18n';
import { Notice, Spinner } from '@wordpress/components';
import { Icon, desktop, mobile, tablet } from '@wordpress/icons';
import { IconButton } from 'shared-ui';

const VIEWPORTS = /** @type {const} */ ([
	{
		id: 'desktop',
		icon: desktop,
		label: __('Desktop preview', 'modula-best-grid-gallery'),
	},
	{
		id: 'tablet',
		icon: tablet,
		label: __('Tablet preview', 'modula-best-grid-gallery'),
	},
	{
		id: 'mobile',
		icon: mobile,
		label: __('Mobile preview', 'modula-best-grid-gallery'),
	},
]);

/**
 * @param {Object}                                          props
 * @param {'desktop'|'tablet'|'mobile'}                     props.previewViewport
 * @param {(viewport: 'desktop'|'tablet'|'mobile') => void} [props.onPreviewViewportChange]
 * @param {import('react').ReactNode}                       [props.actions]                 Toolbar actions (`CanvasToolbarActionButton`s).
 * @param {string}                                          [props.busyMessage]             Live status shown after the actions (e.g. upload progress).
 * @param {import('react').ReactNode}                       [props.addSplit]                Omitted when the document cannot add content in the current mode.
 * @param {string}                                          [props.errorNotice]             Dismissible error above the toolbar row.
 * @param {() => void}                                      [props.onDismissErrorNotice]
 * @param {import('react').ReactNode}                       [props.children]                Non-visual helpers mounted with the toolbar (file inputs, dialogs).
 */
export default function CanvasToolbar({
	previewViewport,
	onPreviewViewportChange,
	actions = null,
	busyMessage = '',
	addSplit = null,
	errorNotice = '',
	onDismissErrorNotice,
	children = null,
}) {
	return (
		<div className="modula-takeover__canvas-toolbar">
			{errorNotice ? (
				<Notice
					className="modula-takeover__canvas-toolbar-notice"
					status="error"
					isDismissible
					onRemove={onDismissErrorNotice}
				>
					{errorNotice}
				</Notice>
			) : null}
			{children}

			<div className="modula-takeover__canvas-toolbar-row">
				<div className="modula-takeover__canvas-toolbar-left">
					{actions}
					{busyMessage ? (
						<div
							className="modula-takeover__canvas-toolbar-uploading"
							role="status"
							aria-live="polite"
							aria-atomic="true"
						>
							<Spinner />
							<span>{busyMessage}</span>
						</div>
					) : null}
				</div>

				<div className="modula-takeover__canvas-toolbar-right">
					<div
						className="modula-takeover__canvas-toolbar-viewport"
						role="group"
						aria-label={__(
							'Preview viewport',
							'modula-best-grid-gallery'
						)}
					>
						{VIEWPORTS.map((vp) => {
							const isActive = previewViewport === vp.id;
							return (
								<IconButton
									key={vp.id}
									label={vp.label}
									className={
										isActive
											? 'modula-takeover__canvas-toolbar-viewport-btn is-active'
											: 'modula-takeover__canvas-toolbar-viewport-btn'
									}
									aria-pressed={isActive}
									onClick={() => {
										onPreviewViewportChange?.(vp.id);
									}}
								>
									<Icon icon={vp.icon} size={18} />
								</IconButton>
							);
						})}
					</div>
					{addSplit ? (
						<>
							<span
								className="modula-takeover__canvas-toolbar-divider"
								aria-hidden="true"
							/>
							{addSplit}
						</>
					) : null}
				</div>
			</div>
		</div>
	);
}
