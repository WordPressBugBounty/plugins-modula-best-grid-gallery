import { __ } from '@wordpress/i18n';
import { Button, Dialog } from 'admin-ui';

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
		<Dialog
			open={open}
			onClose={onCancel}
			title={__('Select on this page', 'modula-best-grid-gallery')}
			size="small"
			closeOnOutsideClick
			className="modula-content-page__select-all-chooser"
		>
			<p className="modula-content-page__select-all-chooser-copy">
				{__(
					'Choose galleries, albums, or all selectable rows on this page.',
					'modula-best-grid-gallery'
				)}
			</p>
			<div className="modula-content-page__select-all-chooser-actions">
				<Button variant="ghost" onClick={onCancel}>
					{__('Cancel', 'modula-best-grid-gallery')}
				</Button>
				{(options || []).map((choice) => (
					<Button
						key={choice}
						variant={choice === 'all' ? 'primary' : 'secondary'}
						onClick={() => onChoose(choice)}
					>
						{labelFor(choice)}
					</Button>
				))}
			</div>
		</Dialog>
	);
}
