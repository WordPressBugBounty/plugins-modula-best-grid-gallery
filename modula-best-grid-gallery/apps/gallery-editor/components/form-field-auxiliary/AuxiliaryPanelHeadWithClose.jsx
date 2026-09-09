/**
 * Shared auxiliary column header: title + optional hint + close.
 * Thin host wrapper around shared-ui {@link AuxiliaryPanelHead}.
 */
import { AuxiliaryPanelHead } from 'shared-ui';

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {() => void} props.onClose
 */
export default function AuxiliaryPanelHeadWithClose({
	title,
	description,
	onClose,
}) {
	return (
		<AuxiliaryPanelHead
			title={title}
			description={description}
			onClose={onClose}
			className="modula-gallery-takeover__reorder-head"
		/>
	);
}
