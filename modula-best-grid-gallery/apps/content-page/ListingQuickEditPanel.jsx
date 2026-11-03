import { useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Menu, MenuItem, Notice, StatusDot, TextInput } from 'admin-ui';
import { ChevronDownIcon } from 'admin-ui/icons/icons';
import {
	isAllowedListingRowPostDocumentStatus,
	listingRowToPostDocumentSeed,
} from './listingRowPostDocument';
import { decodeListingTitle } from './listingRowToFields';
import { ListingCover } from './ListingCover';

const STATUS_OPTIONS = [
	{ label: __('Published', 'modula-best-grid-gallery'), value: 'publish' },
	{ label: __('Draft', 'modula-best-grid-gallery'), value: 'draft' },
	{ label: __('Private', 'modula-best-grid-gallery'), value: 'private' },
];

/**
 * The permalink prefix as the Link field shows it, without the scheme
 * ("modula.local/gallery/").
 *
 * @param {string} prefix
 * @return {string} The prefix without its scheme.
 */
function displayPermalinkPrefix(prefix) {
	return prefix.replace(/^https?:\/\//, '');
}

/**
 * Status as a menu select. A status Quick edit cannot set (scheduled,
 * pending) is shown read-only and kept on save.
 *
 * @param {Object}   props
 * @param {string}   props.id
 * @param {string}   props.value
 * @param {string}   props.seedStatus
 * @param {boolean}  props.disabled
 * @param {Function} props.onChange
 */
function QuickEditStatus({ id, value, seedStatus, disabled, onChange }) {
	const [open, setOpen] = useState(false);
	const labelId = `${id}-label`;

	if (!isAllowedListingRowPostDocumentStatus(seedStatus)) {
		return (
			<div className="modula-content-page__quick-edit-field">
				<label htmlFor={id}>
					{__('Status', 'modula-best-grid-gallery')}
				</label>
				<TextInput
					id={id}
					value={
						'future' === seedStatus
							? __('Scheduled', 'modula-best-grid-gallery')
							: seedStatus
					}
					readOnly
					aria-describedby={`${id}-hint`}
				/>
				<span
					id={`${id}-hint`}
					className="modula-content-page__quick-edit-hint"
				>
					{__(
						'This status is preserved when you save.',
						'modula-best-grid-gallery'
					)}
				</span>
			</div>
		);
	}

	const current = STATUS_OPTIONS.find((option) => option.value === value);

	return (
		<div className="modula-content-page__quick-edit-field">
			<span id={labelId}>{__('Status', 'modula-best-grid-gallery')}</span>
			<Menu
				open={open}
				onOpenChange={setOpen}
				label={__('Status', 'modula-best-grid-gallery')}
				trigger={(triggerProps) => (
					<button
						{...triggerProps}
						type="button"
						id={id}
						className="modula-content-page__quick-edit-status"
						disabled={disabled}
						// Reads "Status, Published".
						aria-labelledby={`${labelId} ${id}`}
					>
						<StatusDot status={value} label={current?.label} />
						<ChevronDownIcon />
					</button>
				)}
			>
				{STATUS_OPTIONS.map((option) => (
					<MenuItem
						key={option.value}
						checked={option.value === value}
						icon={<StatusDot status={option.value} />}
						onSelect={() => onChange(option.value)}
					>
						{option.label}
					</MenuItem>
				))}
			</Menu>
		</div>
	);
}

/**
 * Quick edit (listing): the panel under its row, in the Table's expansion
 * row, for title, status and slug. The app captures the row when Quick Edit
 * is used, so a listing refresh does not reset the draft. A failed save
 * keeps the draft and shows the error here; Save retries. Cancel (off
 * while saving) and Escape, which the Table reports to the app, close it;
 * the Table returns focus to Quick Edit.
 *
 * @param {Object}                                                                             props
 * @param {import('./listingRowToFields').ListingRow}                                          props.item
 * @param {(document: { title?: string, status?: string, slug?: string }) => Promise<unknown>} props.onSave
 * @param {() => void}                                                                         props.onCancel
 */
export function ListingQuickEditPanel({ item, onSave, onCancel }) {
	const id = useId();
	const [seed] = useState(() => {
		const document = listingRowToPostDocumentSeed(item);
		return {
			...document,
			title: document.title.trim()
				? decodeListingTitle(document.title)
				: '',
		};
	});
	const [form, setForm] = useState(seed);
	const [isSaving, setIsSaving] = useState(false);
	const savingRef = useRef(false);
	const [errorMessage, setErrorMessage] = useState('');
	const canChangeStatus = isAllowedListingRowPostDocumentStatus(seed.status);
	const isDirty = ['title', 'status', 'slug'].some(
		(field) => form[field] !== seed[field]
	);
	const prefix = displayPermalinkPrefix(seed.permalinkPrefix);

	const handleSave = async (event) => {
		event.preventDefault();
		if (savingRef.current || !isDirty) {
			return;
		}
		savingRef.current = true;
		setIsSaving(true);
		setErrorMessage('');
		try {
			await onSave({
				...(form.title !== seed.title ? { title: form.title } : {}),
				...(canChangeStatus && form.status !== seed.status
					? { status: form.status }
					: {}),
				...(form.slug !== seed.slug ? { slug: form.slug } : {}),
			});
		} catch (error) {
			setErrorMessage(
				error?.message ||
					__('Could not save changes.', 'modula-best-grid-gallery')
			);
		} finally {
			savingRef.current = false;
			setIsSaving(false);
		}
	};

	return (
		<form
			className="modula-content-page__quick-edit"
			aria-label={sprintf(
				/* translators: %s: gallery or album title. */
				__('Quick edit %s', 'modula-best-grid-gallery'),
				seed.title || __('(no title)', 'modula-best-grid-gallery')
			)}
			aria-busy={isSaving}
			onSubmit={handleSave}
		>
			<div className="modula-content-page__quick-edit-body">
				<div className="modula-content-page__quick-edit-cover">
					<ListingCover item={item} />
				</div>
				<div className="modula-content-page__quick-edit-fields">
					<div className="modula-content-page__quick-edit-field">
						<label htmlFor={`${id}-title`}>
							{__('Title', 'modula-best-grid-gallery')}
						</label>
						<TextInput
							id={`${id}-title`}
							width="full"
							value={form.title}
							disabled={isSaving}
							data-autofocus="true"
							onChange={(title) => setForm({ ...form, title })}
						/>
					</div>
					<QuickEditStatus
						id={`${id}-status`}
						value={form.status}
						seedStatus={seed.status}
						disabled={isSaving}
						onChange={(status) => setForm({ ...form, status })}
					/>
					<div className="modula-content-page__quick-edit-field is-wide">
						<label htmlFor={`${id}-slug`}>
							{__('Link', 'modula-best-grid-gallery')}
						</label>
						<div className="modula-content-page__quick-edit-link">
							{prefix ? (
								<span
									id={`${id}-prefix`}
									className="modula-content-page__quick-edit-prefix"
								>
									{prefix}
								</span>
							) : null}
							<input
								id={`${id}-slug`}
								type="text"
								value={form.slug}
								disabled={isSaving}
								aria-describedby={
									prefix ? `${id}-prefix` : undefined
								}
								onChange={(event) =>
									setForm({
										...form,
										slug: event.target.value,
									})
								}
							/>
						</div>
					</div>
				</div>
			</div>
			{errorMessage ? (
				<Notice
					tone="error"
					role="alert"
					className="modula-content-page__quick-edit-error"
				>
					{errorMessage}
				</Notice>
			) : null}
			<div className="modula-content-page__quick-edit-footer">
				<Button variant="ghost" onClick={onCancel} disabled={isSaving}>
					{__('Cancel', 'modula-best-grid-gallery')}
				</Button>
				<Button
					variant="primary"
					type="submit"
					disabled={!isDirty || isSaving}
				>
					{isSaving
						? __('Saving…', 'modula-best-grid-gallery')
						: __('Save changes', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</form>
	);
}
