/**
 * Takeover header on `admin-ui`. Its grid lines up with the rail, the
 * settings panel and the canvas: back link; save state, history, undo and
 * redo; then the title, status menu, "add new" link and Embed popover.
 */
import { Icon } from '@wordpress/icons';
import { AdminUiRoot } from 'admin-ui';
import { useSettingsEditorAppearance } from '../appearance/SettingsEditorAppearanceContext';
import TopBarDocumentStatus from './TopBarDocumentStatus';
import TopBarEmbed from './TopBarEmbed';
import TopBarHistory from './TopBarHistory';
import TopBarTitle from './TopBarTitle';
import { backIcon, plusIcon } from './topBarIcons';

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
 * Embed popover inputs.
 *
 * @typedef {Object} EmbedInput
 * @property {string}                             heading Popover heading (e.g. Embed this gallery).
 * @property {import('./TopBarEmbed').EmbedRow[]} rows    Copyable rows in display order.
 */

/**
 * "Add new" link inputs. A plain link, like the back link: leaving the page
 * takes the same path as Back.
 *
 * @typedef {Object} AddNewInput
 * @property {string} href  New-document screen (e.g. `post-new.php?post_type=…`).
 * @property {string} label Accessible name and tooltip (e.g. New gallery).
 */

/**
 * Document copy for the top bar, already translated by the owning editor.
 *
 * @typedef {Object} TopBarLabels
 * @property {string} back             Visible back link label (e.g. Galleries).
 * @property {string} backAriaLabel    Accessible name of the back link.
 * @property {string} titlePlaceholder Shown for an empty title.
 * @property {string} titleAriaLabel   Accessible name of the rename input.
 * @property {string} editTitleLabel   Accessible name of the Rename button (e.g. Rename gallery).
 */

/**
 * @param {Object}                                           props
 * @param {TopBarLabels}                                     props.labels
 * @param {string}                                           props.backUrl          Listing destination of the back link.
 * @param {boolean}                                          props.canEditTitle     False until the document exists.
 * @param {string}                                           props.title
 * @param {(title: string) => void}                          props.onTitleChange    Receives a saved rename.
 * @param {(value: string) => void}                          [props.onTitleCommit]  Persists a saved rename.
 * @param {boolean}                                          [props.titleDisabled]
 * @param {{ status: string, errorMessage?: string }}        props.saveStatus
 * @param {import('../history/editorHistory').EditorHistory} [props.history]        Undo stack; omitted for a document without one.
 * @param {import('../history/editorHistory').HistoryLabels} [props.historyLabels]  History scope wording; required with `history`.
 * @param {EmbedInput|null}                                  [props.embed]          Omitted before the document exists.
 * @param {DocumentStatusInput|null}                         [props.documentStatus] Omitted when the user cannot change status.
 * @param {AddNewInput|null}                                 [props.addNew]         Omitted when the user cannot create the post type.
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
	history = null,
	historyLabels = null,
	embed = null,
	documentStatus = null,
	addNew = null,
}) {
	const { appearance } = useSettingsEditorAppearance();

	return (
		<AdminUiRoot
			appearance={appearance}
			className="modula-takeover__topbar-root"
		>
			<header className="modula-takeover__topbar" role="banner">
				<div className="modula-takeover__topbar-back">
					<a
						className="modula-takeover__topbar-exit"
						href={backUrl}
						aria-label={labels.backAriaLabel}
					>
						<Icon icon={backIcon} size={12} />
						<span className="modula-takeover__topbar-exit-label">
							{labels.back}
						</span>
					</a>
				</div>

				<TopBarHistory
					saveStatus={saveStatus}
					history={history}
					labels={historyLabels}
				/>

				<div className="modula-takeover__topbar-document">
					<div className="modula-takeover__topbar-title">
						<TopBarTitle
							title={title}
							placeholder={labels.titlePlaceholder}
							inputLabel={labels.titleAriaLabel}
							renameLabel={labels.editTitleLabel}
							canRename={canEditTitle && !titleDisabled}
							onTitleChange={onTitleChange}
							onTitleCommit={onTitleCommit}
						/>
						{documentStatus ? (
							<TopBarDocumentStatus
								status={documentStatus.status}
								statusLabel={documentStatus.label}
								statusChoices={documentStatus.choices}
								onStatusChange={documentStatus.onChange}
								busy={documentStatus.busy}
							/>
						) : null}
						{addNew ? (
							<>
								<span
									className="modula-takeover__topbar-add-new-sep"
									aria-hidden="true"
								/>
								<a
									className="modula-takeover__topbar-add-new"
									href={addNew.href}
									aria-label={addNew.label}
									title={addNew.label}
								>
									<Icon icon={plusIcon} size={16} />
								</a>
							</>
						) : null}
					</div>
					{embed ? (
						<TopBarEmbed
							heading={embed.heading}
							rows={embed.rows}
						/>
					) : null}
				</div>
			</header>
		</AdminUiRoot>
	);
}
