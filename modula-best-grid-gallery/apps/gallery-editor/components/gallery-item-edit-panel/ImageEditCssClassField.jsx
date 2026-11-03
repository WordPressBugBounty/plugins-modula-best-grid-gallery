/**
 * Image edit panel — "Advanced": the image's CSS classes as chips in one
 * field box (canvas). Enter, comma or space adds what was typed; Backspace in
 * the empty input removes the last class. Only valid class names are kept.
 */
import { useId, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Chip } from 'admin-ui';
import {
	parseItemCssClasses,
	sanitizeItemCssClass,
} from '../../utils/galleryItemFields';
import ItemEditField from './ItemEditField';

const ADD_KEYS = ['Enter', ',', ' '];

/**
 * @param {Object}              props
 * @param {string}              props.value    Space-separated classes.
 * @param {(v: string) => void} props.onChange Receives space-separated classes.
 */
export default function ImageEditCssClassField({ value, onChange }) {
	const inputId = `modula-item-css-class-${useId()}`;
	const [draft, setDraft] = useState('');
	const classes = parseItemCssClasses(value);

	const commitDraft = () => {
		if (parseItemCssClasses(draft).length > 0) {
			onChange(sanitizeItemCssClass(`${classes.join(' ')} ${draft}`));
		}
		setDraft('');
	};

	const onKeyDown = (event) => {
		if (ADD_KEYS.includes(event.key)) {
			event.preventDefault();
			commitDraft();
			return;
		}
		if (event.key === 'Backspace' && draft === '' && classes.length > 0) {
			onChange(classes.slice(0, -1).join(' '));
		}
	};

	return (
		<ItemEditField
			label={__('CSS class', 'modula-best-grid-gallery')}
			controlId={inputId}
		>
			<div className="modula-gallery-item-edit-panel__css-classes">
				{classes.map((name) => (
					<Chip
						key={name}
						className="modula-gallery-item-edit-panel__css-class"
						removeLabel={sprintf(
							/* translators: %s: CSS class name. */
							__('Remove class %s', 'modula-best-grid-gallery'),
							name
						)}
						onRemove={() =>
							onChange(
								classes.filter((c) => c !== name).join(' ')
							)
						}
					>
						{name}
					</Chip>
				))}
				<input
					id={inputId}
					type="text"
					className="modula-gallery-item-edit-panel__css-class-input"
					spellCheck={false}
					autoComplete="off"
					value={draft}
					placeholder={classes.length > 0 ? '' : 'hero-image'}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={onKeyDown}
					onBlur={commitDraft}
				/>
			</div>
		</ItemEditField>
	);
}
