/**
 * Placeholder shapes shown while a page loads its data. They are decorative
 * (`aria-hidden`); the page announces the loading state itself.
 */

/**
 * One placeholder bar.
 *
 * @param {Object}        props
 * @param {string|number} [props.width]  CSS width.
 * @param {number}        [props.height] Height in px.
 */
export function Skeleton({ width = '100%', height = 12 }) {
	return (
		<span
			className="modula-admin-skeleton"
			style={{ width, height }}
			aria-hidden="true"
		/>
	);
}

// Label widths, so the placeholder rows do not look identical.
const ROW_LABEL_WIDTHS = ['38%', '26%', '32%', '22%'];
const NAV_ITEM_WIDTHS = [
	'62%',
	'74%',
	'58%',
	'30%',
	'46%',
	'70%',
	'42%',
	'50%',
];

/**
 * A settings card's placeholder: a title bar above a bordered body of rows,
 * each a label bar and a control bar.
 *
 * @param {Object} props
 * @param {number} [props.rows]
 */
export function SkeletonCard({ rows = 3 }) {
	return (
		<div className="modula-admin-skeleton-card" aria-hidden="true">
			<Skeleton width={140} height={14} />
			<div className="modula-admin-skeleton-card__body">
				{Array.from({ length: rows }, (_, index) => (
					<div
						key={index}
						className="modula-admin-skeleton-card__row"
					>
						<Skeleton
							width={
								ROW_LABEL_WIDTHS[
									index % ROW_LABEL_WIDTHS.length
								]
							}
							height={12}
						/>
						<Skeleton width={120} height={22} />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * The nav column's placeholder: a group heading and its items, sized like
 * NavHeading and NavItem. Render it as the children of Nav.
 *
 * @param {Object} props
 * @param {number} [props.items]
 */
export function NavSkeleton({ items = 8 }) {
	return (
		<div className="modula-admin-nav-skeleton" aria-hidden="true">
			<div className="modula-admin-nav-skeleton__heading">
				<Skeleton width={64} height={12} />
			</div>
			{Array.from({ length: items }, (_, index) => (
				<div key={index} className="modula-admin-nav-skeleton__item">
					<Skeleton
						width={NAV_ITEM_WIDTHS[index % NAV_ITEM_WIDTHS.length]}
						height={11}
					/>
				</div>
			))}
		</div>
	);
}
