import { useMemo } from '@wordpress/element';
import useStateContext from '../context/useStateContext';
import { recordEdit } from '../context/actions';
import {
	addPendingEdit,
	cardDefaultValues,
	editedOption,
	withPendingValues,
} from '../model/settingsPageModel';

/**
 * A rebuilt card's values (stored, with pending edits on top) and setters
 * that record the whole option for each change.
 *
 * Fields are named as in the card config: inside the card's option
 * (`gallery.slug`), or, for cards without an option, by option name
 * (`mas_gallery_link`). `values` follows the same naming: the option's
 * value for cards with an option, else values by option name.
 *
 * @param {Object} card Projected settings card.
 * @return {{ values: Object, setValue: Function, setValues: Function }}
 *         Values, the setter (name, value), and the setter for several
 *         fields at once (values by name).
 */
export function useCardValues(card) {
	const { state, dispatch } = useStateContext();
	const { option } = card.config;
	const stored = useMemo(() => cardDefaultValues(card.config), [card.config]);
	const values = withPendingValues(stored, state.options);

	/**
	 * @param {Object} pending Pending edits to build on.
	 * @param {string} name    Field name.
	 * @param {*}      value
	 * @return {[string, *]} The option and its whole value to record.
	 */
	const optionEdit = (pending, name, value) => {
		// Without a card option, the field's first name part is the option.
		const [key, ...path] = option ? [option, name] : name.split('.');
		if (0 === path.length) {
			return [key, value];
		}

		return [
			key,
			editedOption(
				stored[key] ?? {},
				pending,
				key,
				path.join('.'),
				value
			),
		];
	};

	const setValues = (valuesByName) => {
		// Each edit records the whole option, so each builds on the one
		// before it rather than on this render's pending edits.
		let pending = state.options;
		Object.entries(valuesByName).forEach(([name, value]) => {
			const [key, whole] = optionEdit(pending, name, value);
			pending = addPendingEdit(pending, key, whole);
			dispatch(recordEdit(key, whole));
		});
	};

	const setValue = (name, value) => setValues({ [name]: value });

	return {
		values: option ? (values[option] ?? {}) : values,
		setValue,
		setValues,
	};
}
