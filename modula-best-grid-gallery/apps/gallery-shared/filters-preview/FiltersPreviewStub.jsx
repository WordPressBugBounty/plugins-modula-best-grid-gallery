/**
 * The neutral block the Filters tab preview positions the bar around, in place
 * of the real items: the preview never shows or filters them.
 *
 * @package
 */

/**
 * @param {{ label: string }} props `label`: what the block stands for
 *                                  ("Gallery", "Album"), drawn uppercase.
 */
export default function FiltersPreviewStub({ label }) {
	return (
		<div
			className="modula-items modula-gallery-takeover__filters-preview-gallery-stub"
			aria-hidden="true"
		>
			<span className="modula-gallery-takeover__filters-preview-gallery-stub-label">
				{label}
			</span>
		</div>
	);
}
