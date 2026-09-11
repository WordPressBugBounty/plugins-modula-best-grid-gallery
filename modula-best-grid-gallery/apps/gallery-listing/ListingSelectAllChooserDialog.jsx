import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Header select-all chooser: Galleries / Albums / All (mixed empty page).
 *
 * @param {{
 *   options: Array<'gallery'|'album'|'all'>|null,
 *   onChoose: (choice: 'gallery'|'album'|'all') => void,
 *   onCancel: () => void,
 * }} props
 */
export function ListingSelectAllChooserDialog({ options, onChoose, onCancel }) {
	const open = Array.isArray(options) && options.length > 0;
	if (!open) {
		return null;
	}

	const labelFor = (choice) => {
		if (choice === 'gallery') {
			return __('Galleries', 'modula-best-grid-gallery');
		}
		if (choice === 'album') {
			return __('Albums', 'modula-best-grid-gallery');
		}
		return __('All', 'modula-best-grid-gallery');
	};

	return (
		<Modal
			title={__('Select on this page', 'modula-best-grid-gallery')}
			onRequestClose={onCancel}
			className="modula-gallery-listing__select-all-chooser"
		>
			<p className="modula-gallery-listing__select-all-chooser-copy">
				{__(
					'Choose galleries, albums, or all selectable rows on this page.',
					'modula-best-grid-gallery'
				)}
			</p>
			<div className="modula-gallery-listing__select-all-chooser-actions">
				{options.map((choice) => (
					<Button
						key={choice}
						variant={choice === 'all' ? 'primary' : 'secondary'}
						onClick={() => onChoose(choice)}
					>
						{labelFor(choice)}
					</Button>
				))}
				<Button variant="tertiary" onClick={onCancel}>
					{__('Cancel', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</Modal>
	);
}
