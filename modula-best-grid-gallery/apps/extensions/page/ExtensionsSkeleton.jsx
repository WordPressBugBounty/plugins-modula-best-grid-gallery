import { __ } from '@wordpress/i18n';
import { Skeleton } from 'admin-ui';

// Name and description widths, so the placeholder rows do not look identical.
const ROW_WIDTHS = [
	['42%', '78%'],
	['58%', '64%'],
	['36%', '86%'],
	['50%', '70%'],
	['46%', '58%'],
];

/**
 * The filter and the table while the extensions load: a group heading and
 * rows of name, description and switch placeholders, announced once.
 */
export function ExtensionsSkeleton() {
	return (
		<>
			<p className="modula-admin-sr-only" role="status">
				{__('Loading extensions…', 'modula-best-grid-gallery')}
			</p>
			<div className="modula-extensions-skeleton" aria-hidden="true">
				<Skeleton width={280} height={40} />
				<div className="modula-extensions-skeleton__head" />
				<div className="modula-extensions-skeleton__group">
					<Skeleton width={140} height={18} />
				</div>
				{ROW_WIDTHS.map(([name, description], index) => (
					<div
						key={index}
						className="modula-extensions-skeleton__row"
					>
						<Skeleton width={name} height={14} />
						<Skeleton width={description} height={12} />
						<Skeleton width={40} height={22} />
					</div>
				))}
			</div>
		</>
	);
}
