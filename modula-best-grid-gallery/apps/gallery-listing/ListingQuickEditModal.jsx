import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Modal } from '@wordpress/components';
import { Icon, close, external, lock } from '@wordpress/icons';
import {
	isAllowedListingRowPostDocumentStatus,
	listingRowToPostDocumentSeed,
} from './listingRowPostDocument';
import { decodeListingTitle } from './listingRowToFields';
import { getListingThumbnailUrls } from './getListingThumbnailUrls';
import { getGalleryListingConfig } from './config';
import { getViewOnSiteClickTarget } from './listingStandaloneGate';

const STATUS_OPTIONS = [
	{ label: __('Published', 'modula-best-grid-gallery'), value: 'publish' },
	{ label: __('Draft', 'modula-best-grid-gallery'), value: 'draft' },
	{ label: __('Private', 'modula-best-grid-gallery'), value: 'private' },
];

/**
 * One Quick edit session. The app captures the row when the shortcut is invoked.
 *
 * @param {Object} props
 * @param {import('./listingRowToFields').ListingRow} props.item
 * @param {(document: { title: string, status?: string, slug: string }) => Promise<unknown>} props.onSave
 * @param {() => void} props.onCancel
 */
export function ListingQuickEditModal({ item, onSave, onCancel }) {
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
	const canChangeStatus = isAllowedListingRowPostDocumentStatus(seed.status);
	const [isSaving, setIsSaving] = useState(false);
	const savingRef = useRef(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [confirmDiscard, setConfirmDiscard] = useState(false);
	const titleRef = useRef(null);
	const keepEditingRef = useRef(null);
	useEffect(() => {
		(confirmDiscard ? keepEditingRef : titleRef).current?.focus();
	}, [confirmDiscard]);
	const dirty = ['title', 'status', 'slug'].some(
		(field) => form[field] !== seed[field]
	);
	const thumbnail = getListingThumbnailUrls(item, 1)[0];
	const viewTarget = getViewOnSiteClickTarget(
		getGalleryListingConfig(),
		seed.viewUrl
	);
	const showViewLink =
		seed.status === 'publish' && seed.viewUrl && viewTarget.url;

	const requestClose = () => {
		if (savingRef.current) {
			return;
		}
		if (confirmDiscard) {
			setConfirmDiscard(false);
		} else if (dirty) {
			setConfirmDiscard(true);
		} else {
			onCancel();
		}
	};

	const handleSave = async (event) => {
		event.preventDefault();
		if (savingRef.current || !dirty || confirmDiscard) {
			return;
		}
		savingRef.current = true;
		setIsSaving(true);
		setErrorMessage('');
		try {
			await onSave({
				title: form.title,
				...(canChangeStatus ? { status: form.status } : {}),
				slug: form.slug,
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
		<Modal
			title={__('Quick edit', 'modula-best-grid-gallery')}
			className="modula-listing-quick-edit"
			overlayClassName="modula-listing-quick-edit-overlay"
			onRequestClose={requestClose}
			shouldCloseOnClickOutside={false}
			shouldCloseOnEsc={false}
			isDismissible={false}
			focusOnMount="firstContentElement"
			onKeyDown={(event) => {
				if (
					event.key === 'Escape' &&
					!event.nativeEvent.isComposing &&
					!event.defaultPrevented
				) {
					event.preventDefault();
					requestClose();
				}
			}}
			headerActions={
				<Button
					icon={close}
					label={__('Close', 'modula-best-grid-gallery')}
					onClick={requestClose}
					disabled={isSaving}
				/>
			}
		>
			{confirmDiscard ? (
				<>
					<div className="modula-listing-quick-edit__body">
						<h2 className="modula-listing-quick-edit__discard-title">
							{__('Discard changes?', 'modula-best-grid-gallery')}
						</h2>
						<p className="modula-listing-quick-edit__discard-message">
							{__(
								'Your changes have not been saved. You can keep editing or discard them.',
								'modula-best-grid-gallery'
							)}
						</p>
					</div>
					<div className="modula-listing-quick-edit__footer">
						<Button
							variant="secondary"
							isDestructive
							onClick={onCancel}
						>
							{__('Discard changes', 'modula-best-grid-gallery')}
						</Button>
						<Button
							variant="primary"
							ref={keepEditingRef}
							onClick={() => setConfirmDiscard(false)}
						>
							{__('Keep editing', 'modula-best-grid-gallery')}
						</Button>
					</div>
				</>
			) : (
				<form onSubmit={handleSave} aria-busy={isSaving}>
					<div className="modula-listing-quick-edit__body">
						<div className="modula-listing-quick-edit__identity">
							{thumbnail ? (
								<img
									src={thumbnail}
									alt=""
									width={40}
									height={40}
								/>
							) : null}
							<div>
								<strong>
									{seed.title ||
										__(
											'(no title)',
											'modula-best-grid-gallery'
										)}
								</strong>
								<span>
									{item.type === 'album'
										? __(
												'Album',
												'modula-best-grid-gallery'
											)
										: __(
												'Gallery',
												'modula-best-grid-gallery'
											)}
								</span>
							</div>
						</div>
						<div className="modula-listing-quick-edit__field">
							<label htmlFor={`${id}-title`}>
								{__('Title', 'modula-best-grid-gallery')}
							</label>
							<input
								ref={titleRef}
								id={`${id}-title`}
								value={form.title}
								onChange={(event) =>
									setForm({
										...form,
										title: event.target.value,
									})
								}
								disabled={isSaving}
							/>
						</div>
						<div className="modula-listing-quick-edit__field">
							<label htmlFor={`${id}-status`}>
								{__('Status', 'modula-best-grid-gallery')}
							</label>
							{canChangeStatus ? (
								<select
									id={`${id}-status`}
									value={form.status}
									onChange={(event) =>
										setForm({
											...form,
											status: event.target.value,
										})
									}
									disabled={isSaving}
								>
									{STATUS_OPTIONS.map((option) => (
										<option
											key={option.value}
											value={option.value}
										>
											{option.label}
										</option>
									))}
								</select>
							) : (
								<input
									id={`${id}-status`}
									value={seed.status}
									readOnly
									aria-describedby={`${id}-status-hint`}
								/>
							)}
							{!canChangeStatus ? (
								<span
									id={`${id}-status-hint`}
									className="modula-listing-quick-edit__hint"
								>
									{__(
										'This status is preserved when you save.',
										'modula-best-grid-gallery'
									)}
								</span>
							) : null}
							{item.hasPassword ? (
								<span className="modula-listing-quick-edit__hint">
									<Icon icon={lock} size={14} />
									{__('Password', 'modula-best-grid-gallery')}
								</span>
							) : null}
						</div>
						<div className="modula-listing-quick-edit__field">
							<label htmlFor={`${id}-slug`}>
								{__('URL slug', 'modula-best-grid-gallery')}
							</label>
							<input
								id={`${id}-slug`}
								value={form.slug}
								onChange={(event) =>
									setForm({
										...form,
										slug: event.target.value,
									})
								}
								disabled={isSaving}
								aria-describedby={
									seed.viewUrl ? `${id}-url` : undefined
								}
							/>
							{seed.viewUrl ? (
								<p
									id={`${id}-url`}
									className="modula-listing-quick-edit__hint"
								>
									{__(
										'Saved URL:',
										'modula-best-grid-gallery'
									)}{' '}
									{seed.viewUrl}
								</p>
							) : null}
							{showViewLink ? (
								<a
									href={viewTarget.url}
									target="_blank"
									rel="noopener noreferrer"
									className="modula-listing-quick-edit__view"
								>
									<Icon icon={external} size={16} />
									{__(
										'View saved page',
										'modula-best-grid-gallery'
									)}
									{viewTarget.type === 'upsell' ? (
										<span className="modula-listing-quick-edit__pro">
											Pro
										</span>
									) : null}
								</a>
							) : null}
						</div>
						{errorMessage ? (
							<p
								role="alert"
								className="modula-listing-quick-edit__error"
							>
								{errorMessage}
							</p>
						) : null}
					</div>
					<div className="modula-listing-quick-edit__footer">
						<Button
							variant="secondary"
							onClick={requestClose}
							disabled={isSaving}
						>
							{__('Cancel', 'modula-best-grid-gallery')}
						</Button>
						<Button
							variant="primary"
							type="submit"
							disabled={!dirty || isSaving}
						>
							{isSaving
								? __('Saving…', 'modula-best-grid-gallery')
								: __(
										'Save changes',
										'modula-best-grid-gallery'
									)}
						</Button>
					</div>
				</form>
			)}
		</Modal>
	);
}
