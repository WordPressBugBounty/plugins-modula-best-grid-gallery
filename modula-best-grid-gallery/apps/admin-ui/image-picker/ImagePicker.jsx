import { Button } from '../button/Button';
import { ImageIcon } from '../icons/icons';

/**
 * A chosen image: its thumbnail (or an empty frame) and the actions to
 * choose, replace or remove it. Choosing is the caller's job (the media
 * library), so this only draws the state it is given.
 *
 * The buttons keep their own names, so name the group with `aria-label` or
 * `aria-labelledby` (SettingsRow `labelElement="span"` and `rowLabelId`).
 *
 * @param {Object}   props
 * @param {string}   [props.src]                Thumbnail URL; empty when no image is chosen.
 * @param {string}   [props.alt]                Thumbnail text alternative.
 * @param {Function} props.onChoose
 * @param {Function} props.onRemove
 * @param {string}   props.chooseLabel          Button text without an image ("Choose image").
 * @param {string}   props.replaceLabel         Button text with an image ("Replace").
 * @param {string}   props.removeLabel          Button text with an image ("Remove").
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.className]
 * @param {string}   [props.'aria-describedby'] Help ids, given to the group.
 */
export function ImagePicker({
	src = '',
	alt = '',
	onChoose,
	onRemove,
	chooseLabel,
	replaceLabel,
	removeLabel,
	disabled = false,
	className = '',
	...rest
}) {
	const hasImage = 'string' === typeof src && '' !== src;

	return (
		<div
			className={[
				'modula-admin-image-picker',
				disabled ? 'is-disabled' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			role="group"
			{...rest}
		>
			<span className="modula-admin-image-picker__frame">
				{hasImage ? <img src={src} alt={alt} /> : <ImageIcon />}
			</span>
			<Button disabled={disabled} onClick={() => onChoose?.()}>
				{hasImage ? replaceLabel : chooseLabel}
			</Button>
			{hasImage ? (
				<Button
					variant="danger"
					disabled={disabled}
					onClick={() => onRemove?.()}
				>
					{removeLabel}
				</Button>
			) : null}
		</div>
	);
}
