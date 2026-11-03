/**
 * The selected tile's floating toolbar (canvas "16 · Editor – Canvas gallery",
 * `data-cvtb`): Edit, then Freeform's stacking steps, then Remove. Every type
 * shows it on the selected tile; the caller places it and supplies actions.
 */
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';

export const TILE_SELECT_BUTTON_SELECTOR =
	'.modula-gallery-preview-item-admin__select-hit';

function ToolbarIcon({ d }) {
	return (
		<svg
			width="17"
			height="17"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d={d} />
		</svg>
	);
}

// The tile's own clicks select it, move it or open the lightbox; the toolbar's are its own.
const stopPropagation = (event) => event.stopPropagation();

/**
 * @param {Object}                                       props
 * @param {string}                                       [props.className]        Placement class.
 * @param {Object}                                       [props.style]            Placement offsets.
 * @param {(toolbar: HTMLElement) => HTMLElement|null}   props.findSelectButton   The tile's select button; focus returns there when the toolbar goes while focused.
 * @param {{label: string, onClick: Function}|null}      props.edit               Opens the item's panel.
 * @param {Array<{action: string, label: string, icon: string, disabled: boolean, onClick: Function}>} [props.stacking] Freeform paint order.
 * @param {Function|null}                                props.onRemove           Remove with undo; null for tiles the tile trash skips.
 */
export default function TileToolbar({
	className = '',
	style,
	findSelectButton,
	edit,
	stacking = [],
	onRemove,
}) {
	const toolbarRef = useRef(null);
	const findSelectButtonRef = useRef(findSelectButton);
	useLayoutEffect(() => {
		findSelectButtonRef.current = findSelectButton;
	});
	// Escape deselects from anywhere, this toolbar included; focus must not drop to the page.
	useLayoutEffect(() => {
		const toolbar = toolbarRef.current;
		return () => {
			if (toolbar?.contains(toolbar.ownerDocument.activeElement)) {
				findSelectButtonRef.current(toolbar)?.focus();
			}
		};
	}, []);
	const hasMore = stacking.length > 0 || Boolean(onRemove);
	return (
		<AdminUiScope>
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- onClick only keeps clicks from bubbling to the tile; the buttons own the keys. */}
			<div
				ref={toolbarRef}
				className={['modula-tile-toolbar', className]
					.filter(Boolean)
					.join(' ')}
				role="toolbar"
				aria-label={__('Selected item', 'modula-best-grid-gallery')}
				style={style}
				onPointerDown={stopPropagation}
				onMouseDown={stopPropagation}
				onClick={stopPropagation}
			>
				{edit ? (
					<>
						<Button
							variant="ghost"
							className="modula-tile-toolbar__edit"
							onClick={edit.onClick}
						>
							{edit.label}
						</Button>
						{hasMore ? (
							<span
								className="modula-tile-toolbar__divider"
								aria-hidden="true"
							/>
						) : null}
					</>
				) : null}
				{stacking.map(({ action, label, icon, disabled, onClick }) => (
					<Button
						key={action}
						variant="ghost"
						className="modula-tile-toolbar__icon"
						icon={<ToolbarIcon d={icon} />}
						title={label}
						aria-label={label}
						disabled={disabled}
						onClick={onClick}
					/>
				))}
				{onRemove ? (
					<Button
						variant="ghost"
						className="modula-tile-toolbar__icon"
						icon={
							<ToolbarIcon d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
						}
						title={__(
							'Remove from gallery',
							'modula-best-grid-gallery'
						)}
						aria-label={__(
							'Remove from gallery',
							'modula-best-grid-gallery'
						)}
						onClick={onRemove}
					/>
				) : null}
			</div>
		</AdminUiScope>
	);
}
