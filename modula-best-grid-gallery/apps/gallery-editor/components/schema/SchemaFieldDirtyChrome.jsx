/**
 * Gutter dirty circle + optional reset on a schema field label line.
 * The square is out of flow so labels stay aligned with help text.
 */
import { DirtyMark, ResetToDefaultButton } from 'shared-ui';

/**
 * @param {Object} props
 * @param {boolean} props.dirty
 * @param {Function} props.onReset
 * @param {import('react').ReactNode} props.children Label + optional help tip
 */
export default function SchemaFieldDirtyChrome({ dirty, onReset, children }) {
	const showReset = dirty && typeof onReset === 'function';

	const handleReset = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onReset();
	};

	return (
		<>
			{dirty ? (
				<DirtyMark className="modula-settings-editor__field-dirty-mark" />
			) : null}
			{children}
			{showReset ? <ResetToDefaultButton onClick={handleReset} /> : null}
		</>
	);
}
