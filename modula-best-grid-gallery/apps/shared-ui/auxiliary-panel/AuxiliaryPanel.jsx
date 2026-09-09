import { forwardRef } from '@wordpress/element';

/**
 * Middle-column auxiliary panel shell (surface + flex column).
 * Host apps put domain content as children (reorder, hover builder, …).
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props['aria-label']]
 * @param {import('react').ReactNode} props.children
 */
export const AuxiliaryPanel = forwardRef(function AuxiliaryPanel(
	{ className = '', children, 'aria-label': ariaLabel, ...rest },
	ref
) {
	const classes = ['modula-ui-auxiliary-panel', className]
		.filter(Boolean)
		.join(' ');

	return (
		<aside ref={ref} className={classes} aria-label={ariaLabel} {...rest}>
			{children}
		</aside>
	);
});
