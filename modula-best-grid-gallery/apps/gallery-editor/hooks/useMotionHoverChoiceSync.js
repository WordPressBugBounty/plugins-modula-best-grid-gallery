/**
 * Keep `motion.hover` in step with `hover.builder` while the owner edits the
 * builder, so the Motion Hover menu shows Custom (or the preset the builder
 * now plays) before the save. The rule is `hoverChoiceSync`.
 */
import { useEffect } from '@wordpress/element';
import { HOVER_CHOICE_PATH, hoverChoiceSync } from '../logic/motionChoice';

/**
 * @param {Record<string, Record<string, unknown>>|undefined} values Grouped form values.
 * @return {import('../logic/motionChoice').HoverChoiceState} The hover choice and what it is compared with.
 */
function readHoverChoiceState(values) {
	return {
		choice: String(values?.motion?.hover ?? ''),
		builder: values?.hover?.builder,
		galleryType: String(values?.general?.type ?? ''),
	};
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 */
export function useMotionHoverChoiceSync(form) {
	useEffect(() => {
		let previous = readHoverChoiceState(form.state.values);
		return form.store.subscribe(() => {
			const current = readHoverChoiceState(form.state.values);
			const next = hoverChoiceSync(previous, current);
			previous = current;
			if (next !== null) {
				form.setFieldValue(HOVER_CHOICE_PATH, next);
			}
		});
	}, [form]);
}
