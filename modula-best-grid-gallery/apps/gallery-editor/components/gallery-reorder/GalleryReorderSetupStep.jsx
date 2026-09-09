/**
 * Sort & order setup step — settings-column takeover (new images + sort modes).
 */
import { __, sprintf } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { ActionRow, Button, SectionHeading, StatePill } from 'shared-ui';
import { gateLockHint } from '../../logic/proGateLock';
import SettingsPanelHeader from '../sidebar/settings-panel/SettingsPanelHeader';
import PreviewUploadPositionSegment, {
	PREVIEW_UPLOAD_POSITION_FIELD,
} from '../preview/PreviewUploadPositionSegment';

/**
 * @param {{
 *   form: import('@tanstack/react-form').ReactFormExtendedApi,
 *   closePanel: () => void,
 *   errorMessage: string,
 *   clearError: () => void,
 *   pro: boolean,
 *   galleryId: number,
 *   currentMode: string,
 *   sortRows: Array<{ id: string, label: string }>,
 *   onSortOptionClick: (rowId: string) => void,
 *   onOpenManualReorder: () => void,
 * }} props
 */
export default function GalleryReorderSetupStep({
	form,
	closePanel,
	errorMessage,
	clearError,
	pro,
	galleryId,
	currentMode,
	sortRows,
	onSortOptionClick,
	onOpenManualReorder,
}) {
	return (
		<div className="modula-settings-panel modula-gallery-reorder-sidebar">
			<SettingsPanelHeader
				title={__('Sort & order', 'modula-best-grid-gallery')}
				description={__(
					'Choose where new images are inserted and how the gallery is sorted.',
					'modula-best-grid-gallery'
				)}
				isNested
				parentTitle={__('Gallery', 'modula-best-grid-gallery')}
				onBack={closePanel}
			/>
			{errorMessage ? (
				<Notice
					className="modula-gallery-reorder-sidebar__notice"
					status="error"
					isDismissible
					onRemove={clearError}
				>
					{errorMessage}
				</Notice>
			) : null}
			<div className="modula-settings-panel__scroll modula-gallery-reorder-sidebar__scroll">
				<div className="modula-gallery-takeover__reorder-body modula-gallery-takeover__reorder-body--setup">
					<section className="modula-gallery-takeover__reorder-setup-block">
						<SectionHeading className="modula-gallery-takeover__reorder-setup-title">
							{__('New images', 'modula-best-grid-gallery')}
						</SectionHeading>
						<div className="modula-gallery-takeover__reorder-setup-body">
							<form.Field name={PREVIEW_UPLOAD_POSITION_FIELD}>
								{(fieldApi) => (
									<PreviewUploadPositionSegment
										value={fieldApi.state.value}
										onChange={(v) =>
											fieldApi.handleChange(v)
										}
									/>
								)}
							</form.Field>
						</div>
					</section>
					<section className="modula-gallery-takeover__reorder-setup-block">
						<SectionHeading className="modula-gallery-takeover__reorder-setup-title">
							{__('Sort by', 'modula-best-grid-gallery')}
						</SectionHeading>
						<div className="modula-gallery-takeover__reorder-setup-body">
							<ul
								className="modula-gallery-takeover__reorder-setup-sort-list"
								aria-label={__(
									'Gallery sort mode',
									'modula-best-grid-gallery'
								)}
							>
								{sortRows.map((row) => {
									const actionable =
										pro && Boolean(galleryId);
									const showProBadge = !pro;
									const proHint = gateLockHint('needs_pro');
									const isCurrent = row.id === currentMode;
									return (
										<li key={row.id}>
											<button
												type="button"
												className={`modula-gallery-takeover__reorder-setup-sort-btn${
													isCurrent
														? ' is-selected'
														: ''
												}${!actionable ? ' is-disabled' : ''}`}
												disabled={!actionable}
												aria-current={
													isCurrent
														? 'true'
														: undefined
												}
												aria-label={
													showProBadge && !actionable
														? sprintf(
																/* translators: 1: action label, 2: requirement note */
																__(
																	'%1$s — %2$s',
																	'modula-best-grid-gallery'
																),
																row.label,
																proHint
															)
														: undefined
												}
												title={
													showProBadge && !actionable
														? proHint
														: undefined
												}
												onClick={() => {
													if (!actionable) {
														return;
													}
													onSortOptionClick(row.id);
												}}
											>
												<span className="modula-gallery-takeover__reorder-setup-sort-row">
													<span className="modula-gallery-takeover__reorder-setup-sort-label">
														{row.label}
													</span>
													{showProBadge ? (
														<StatePill>
															{__(
																'Pro',
																'modula-best-grid-gallery'
															)}
														</StatePill>
													) : null}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
							{pro && galleryId && currentMode === 'manual' ? (
								<p className="modula-gallery-takeover__reorder-setup-manual-cta">
									<Button
										type="button"
										variant="panel"
										onClick={onOpenManualReorder}
									>
										{__(
											'Open drag-and-drop reorder',
											'modula-best-grid-gallery'
										)}
									</Button>
								</p>
							) : null}
						</div>
					</section>
				</div>
			</div>
			<footer className="modula-gallery-reorder-sidebar__foot">
				<ActionRow>
					<Button type="button" variant="ghost" onClick={closePanel}>
						{__('Close', 'modula-best-grid-gallery')}
					</Button>
				</ActionRow>
			</footer>
		</div>
	);
}
