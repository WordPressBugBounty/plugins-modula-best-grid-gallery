import { InfoIcon } from '../icons/icons';

/**
 * A short help or status line led by an info icon ("Not available on a local
 * site."), for row help and card notes. The icon is decorative.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function IconNote({ children }) {
	return (
		<span className="modula-admin-icon-note">
			<InfoIcon />
			<span>{children}</span>
		</span>
	);
}
