/**
 * The Add media dialog's picker (canvas "1 · Editor", the Add dialog): a
 * toolbar with search and a count, a grid of square thumbnails to
 * multi-select, "Load more", and the "N selected · Clear" / Add footer.
 * Items already in the document show dimmed and cannot be picked.
 *
 * The gallery's media library and the Albums member picker compose these
 * parts inside an admin-ui `Dialog`; each owns its query, selection and copy.
 */
import '../styles/_media-picker.scss';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, SearchField } from 'admin-ui';

/**
 * @typedef {Object} MediaPickerItem
 * @property {number}  id         Attachment or post id.
 * @property {string}  thumbUrl   Square thumbnail; empty for none.
 * @property {string}  name       Title under the thumbnail.
 * @property {string}  [note]     After the title, e.g. "· In gallery".
 * @property {string}  [detail]   Line under the title, e.g. "Child of: Travel".
 * @property {boolean} [disabled] Already in the document: shown, not pickable.
 */

const CheckMark = () => (
	<svg
		width="12"
		height="12"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="3"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

/**
 * Search, optional filters and the item count, above the grid.
 *
 * @param {Object}                    props
 * @param {string}                    props.count    "19 galleries"; empty while loading.
 * @param {import('react').ReactNode} props.children The search field and any filters.
 */
export function MediaPickerToolbar({ count, children }) {
	return (
		<div className="modula-media-picker__toolbar">
			{children}
			<span className="modula-media-picker__count" role="status">
				{count}
			</span>
		</div>
	);
}

/**
 * The toolbar's compact search field. The toolbar's count is the live
 * region, so the field announces nothing.
 *
 * @param {Object}                  props
 * @param {string}                  props.label
 * @param {string}                  props.placeholder
 * @param {string}                  props.value
 * @param {(value: string) => void} props.onChange
 */
export function MediaPickerSearch({ label, placeholder, value, onChange }) {
	return (
		<span className="modula-media-picker__search">
			<SearchField
				label={label}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				resultCount={null}
			/>
		</span>
	);
}

/**
 * The scrolling grid, with a loading, failure or empty line above it and
 * "Load more" under it while the server has more pages.
 *
 * @param {Object}               props
 * @param {MediaPickerItem[]}    props.items
 * @param {Set<number>}          props.selectedIds
 * @param {(id: number) => void} props.onToggle
 * @param {string}               [props.message]       Shown instead of an empty grid's silence.
 * @param {boolean}              [props.hasMore]
 * @param {boolean}              [props.isLoadingMore]
 * @param {() => void}           [props.onLoadMore]
 */
export function MediaPickerGrid({
	items,
	selectedIds,
	onToggle,
	message = '',
	hasMore = false,
	isLoadingMore = false,
	onLoadMore,
}) {
	return (
		<div className="modula-media-picker__scroll">
			{message ? (
				<p className="modula-media-picker__empty">{message}</p>
			) : null}
			<div className="modula-media-picker__grid">
				{items.map((item) => (
					<PickerItem
						key={item.id}
						item={item}
						selected={selectedIds.has(item.id)}
						onToggle={() => onToggle(item.id)}
					/>
				))}
			</div>
			{hasMore ? (
				<div className="modula-media-picker__more">
					<Button disabled={isLoadingMore} onClick={onLoadMore}>
						{isLoadingMore
							? __('Loading…', 'modula-best-grid-gallery')
							: __('Load more', 'modula-best-grid-gallery')}
					</Button>
				</div>
			) : null}
		</div>
	);
}

/**
 * One item: a checkbox button, disabled when it is already in the document.
 *
 * @param {Object}          props
 * @param {MediaPickerItem} props.item
 * @param {boolean}         props.selected
 * @param {() => void}      props.onToggle
 */
function PickerItem({ item, selected, onToggle }) {
	return (
		<button
			type="button"
			role="checkbox"
			className="modula-media-picker__item"
			aria-checked={selected}
			aria-disabled={Boolean(item.disabled)}
			aria-label={item.name || String(item.id)}
			onClick={item.disabled ? undefined : onToggle}
		>
			<span className="modula-media-picker__thumb">
				{item.thumbUrl ? (
					<img src={item.thumbUrl} alt="" loading="lazy" />
				) : null}
				{item.disabled ? null : (
					<span className="modula-media-picker__check">
						<CheckMark />
					</span>
				)}
			</span>
			<span className="modula-media-picker__name">
				<span className="modula-media-picker__name-text">
					{item.name}
				</span>
				{item.note ? (
					<span className="modula-media-picker__note">
						{item.note}
					</span>
				) : null}
			</span>
			{item.detail ? (
				<span className="modula-media-picker__detail">
					{item.detail}
				</span>
			) : null}
		</button>
	);
}

/**
 * "N selected · Clear" and the primary Add button, disabled at zero.
 *
 * @param {Object}     props
 * @param {number}     props.count    Selected items.
 * @param {string}     props.addLabel "Add 3 images"; "Add images" at zero.
 * @param {boolean}    [props.busy]   An add is running.
 * @param {() => void} props.onClear
 * @param {() => void} props.onAdd
 */
export function MediaPickerFooter({
	count,
	addLabel,
	busy = false,
	onClear,
	onAdd,
}) {
	return (
		<div className="modula-media-picker__footer">
			{count > 0 ? (
				<span className="modula-media-picker__selection">
					<span className="modula-media-picker__selected">
						{sprintf(
							/* translators: %d: number of selected items */
							_n(
								'%d selected',
								'%d selected',
								count,
								'modula-best-grid-gallery'
							),
							count
						)}
					</span>
					<Button variant="link" onClick={onClear}>
						{__('Clear', 'modula-best-grid-gallery')}
					</Button>
				</span>
			) : null}
			<Button
				variant="primary"
				disabled={busy || count === 0}
				onClick={onAdd}
			>
				{addLabel}
			</Button>
		</div>
	);
}
