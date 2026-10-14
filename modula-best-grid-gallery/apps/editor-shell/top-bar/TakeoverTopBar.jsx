/**
 * Full-width editor chrome: back link, title and save status on the left;
 * shortcode chip and document status on the right.
 */
import { useRef } from '@wordpress/element';
import { Icon, chevronLeft, pencil } from '@wordpress/icons';
import TopBarSaveStatus from './TopBarSaveStatus';
import TopBarDocumentStatus from './TopBarDocumentStatus';
import TopBarShortcodes from './TopBarShortcodes';

/**
 * Publication status menu inputs.
 *
 * @typedef {Object} DocumentStatusInput
 * @property {string}                                    status   Current post status.
 * @property {string}                                    [label]  Label for a status outside the choices.
 * @property {Array<{ value?: string, label?: string }>} choices  Allowed statuses with human labels.
 * @property {(status: string, label: string) => void}   onChange Called with the chosen status.
 * @property {boolean}                                   [busy]   Disables the menu while a change saves.
 */

/**
 * Document copy for the top bar, already translated by the owning editor.
 *
 * @typedef {Object} TopBarLabels
 * @property {string} back             Visible back pill label (e.g. Galleries).
 * @property {string} backAriaLabel    Accessible name of the back link.
 * @property {string} titlePlaceholder Placeholder and empty-title sizer text.
 * @property {string} titleAriaLabel   Accessible name of the title field.
 * @property {string} editTitleLabel   Accessible name of the pencil button.
 */

/**
 * @param {Object}                                    props
 * @param {TopBarLabels}                              props.labels
 * @param {string}                                    props.backUrl            Listing destination of the back link.
 * @param {boolean}                                   props.canEditTitle       False until the document exists.
 * @param {string}                                    props.title
 * @param {(title: string) => void}                   props.onTitleChange
 * @param {(value?: string) => void}                  [props.onTitleCommit]
 * @param {boolean}                                   [props.titleDisabled]
 * @param {{ status: string, errorMessage?: string }} props.saveStatus
 * @param {import('react').ReactNode}                 [props.afterSaveStatus]  Document-specific chrome after the save status.
 * @param {import('react').ReactNode}                 [props.undoRedoControls]
 * @param {Object|null}                               [props.shortcodes]       `TopBarShortcodes` props, or null for no chip.
 * @param {DocumentStatusInput|null}                  [props.documentStatus]   Omitted when the user cannot change status.
 */
export default function TakeoverTopBar({
	labels,
	backUrl,
	canEditTitle,
	title,
	onTitleChange,
	onTitleCommit,
	titleDisabled = false,
	saveStatus,
	afterSaveStatus = null,
	undoRedoControls = null,
	shortcodes = null,
	documentStatus = null,
}) {
	const titleInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
	const isTitleEditable = canEditTitle && !titleDisabled;

	return (
		<header className="modula-takeover__topbar" role="banner">
			<div className="modula-takeover__topbar-inner">
				<div className="modula-takeover__topbar-left">
					<div className="modula-takeover__topbar-left-cluster">
						<a
							className="modula-takeover__topbar-exit"
							href={backUrl}
							aria-label={labels.backAriaLabel}
						>
							<span
								className="modula-takeover__topbar-exit-icon"
								aria-hidden="true"
							>
								<Icon icon={chevronLeft} size={20} />
							</span>
							<span className="modula-takeover__topbar-exit-label">
								{labels.back}
							</span>
						</a>
						{undoRedoControls}
					</div>

					<div className="modula-takeover__topbar-title">
						<div className="modula-takeover__topbar-title-field">
							<div className="modula-takeover__topbar-title-row">
								<span
									className="modula-takeover__topbar-title-size"
									aria-hidden="true"
								>
									{title || labels.titlePlaceholder}
								</span>
								<input
									ref={titleInputRef}
									id="modula-takeover-topbar-title"
									type="text"
									className="modula-takeover__topbar-title-input"
									value={title}
									title={title}
									placeholder={labels.titlePlaceholder}
									disabled={!isTitleEditable}
									aria-label={labels.titleAriaLabel}
									onChange={(e) =>
										onTitleChange(e.target.value)
									}
									onBlur={(e) =>
										onTitleCommit?.(e.currentTarget.value)
									}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											const el = e.currentTarget;
											onTitleCommit?.(el.value);
											el.blur();
										}
									}}
								/>
								{isTitleEditable ? (
									<button
										type="button"
										className="modula-takeover__topbar-title-pencil"
										tabIndex={-1}
										aria-label={labels.editTitleLabel}
										onClick={() => {
											const el = titleInputRef.current;
											if (el && !el.disabled) {
												el.focus();
												el.select();
											}
										}}
									>
										<Icon icon={pencil} size={14} />
									</button>
								) : null}
							</div>
						</div>
					</div>

					<TopBarSaveStatus
						status={saveStatus.status}
						errorMessage={saveStatus.errorMessage}
					/>
					{afterSaveStatus}
				</div>

				<div className="modula-takeover__topbar-right">
					{shortcodes ? <TopBarShortcodes {...shortcodes} /> : null}
					{documentStatus ? (
						<TopBarDocumentStatus
							status={documentStatus.status}
							statusLabel={documentStatus.label}
							statusChoices={documentStatus.choices}
							onStatusChange={documentStatus.onChange}
							busy={documentStatus.busy}
						/>
					) : null}
				</div>
			</div>
		</header>
	);
}
