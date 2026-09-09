/**
 * Appearance preference menu (takeover top bar, sidebar footer, metabox header).
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Circle, Path, SVG } from '@wordpress/primitives';
import { useModalEscapeKey } from '../../hooks/useModalEscapeKey';
import { useSettingsEditorAppearance } from '../../context/SettingsEditorAppearanceContext';
import {
	APPEARANCE_DARK,
	APPEARANCE_LIGHT,
	APPEARANCE_SYSTEM,
} from '../../constants/settingsEditorAppearance';

const ICON_SIZE = 16;

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.75',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

const iconSun = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Circle cx="12" cy="12" r="3.75" fill="none" />
		<Path
			d="M12 3.25v2.25M12 18.5v2.25M3.25 12h2.25M18.5 12h2.25M6.05 6.05l1.6 1.6M16.35 16.35l1.6 1.6M6.05 17.95l1.6-1.6M16.35 7.65l1.6-1.6"
			fill="none"
		/>
	</SVG>
);

const iconMoon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path
			d="M17.4 15.15A7.15 7.15 0 0 1 8.85 6.6 7.5 7.5 0 1 0 17.4 15.15Z"
			fill="none"
		/>
	</SVG>
);

const iconCheck = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<Path d="M16.7 7.1 10 13.8l-2.7-2.7-1.4 1.4L10 16.6l8.1-8.1z" />
	</SVG>
);

const PREFERENCE_CHOICES = [
	{
		value: APPEARANCE_LIGHT,
		label: __('Light', 'modula-best-grid-gallery'),
	},
	{
		value: APPEARANCE_DARK,
		label: __('Dark', 'modula-best-grid-gallery'),
	},
	{
		value: APPEARANCE_SYSTEM,
		label: __('System', 'modula-best-grid-gallery'),
	},
];

/**
 * @param {Object}                                  props
 * @param {'topbar' | 'metabox' | 'sidebar-footer'} [props.variant]
 */
export default function AppearanceToggle({ variant = 'topbar' }) {
	const { appearance, preference, setPreference } =
		useSettingsEditorAppearance();
	const [isOpen, setIsOpen] = useState(false);
	const wrapRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const isDark = appearance === APPEARANCE_DARK;
	const icon = isDark ? iconMoon : iconSun;
	const menuLabel = __('Appearance', 'modula-best-grid-gallery');
	const selectedLabel =
		PREFERENCE_CHOICES.find((choice) => choice.value === preference)
			?.label || menuLabel;

	useModalEscapeKey(isOpen, () => setIsOpen(false));

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}
		const onMouseDown = (event) => {
			if (
				wrapRef.current &&
				!wrapRef.current.contains(/** @type {Node} */ (event.target))
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
		};
	}, [isOpen]);

	const menu = isOpen ? (
		<div
			className={[
				'modula-settings-editor__appearance-menu',
				`modula-settings-editor__appearance-menu--${variant}`,
			].join(' ')}
			role="menu"
			aria-label={menuLabel}
		>
			{PREFERENCE_CHOICES.map((choice) => {
				const isSelected = preference === choice.value;
				return (
					<button
						key={choice.value}
						type="button"
						role="menuitemradio"
						aria-checked={isSelected}
						className="modula-settings-editor__appearance-menu-item"
						onClick={() => {
							setPreference(choice.value);
							setIsOpen(false);
						}}
					>
						<span className="modula-settings-editor__appearance-menu-label">
							{choice.label}
						</span>
						<span
							className="modula-settings-editor__appearance-menu-check"
							aria-hidden="true"
						>
							{isSelected ? iconCheck : null}
						</span>
					</button>
				);
			})}
		</div>
	) : null;

	const wrapClassName = [
		'modula-settings-editor__appearance-toggle-wrap',
		`modula-settings-editor__appearance-toggle-wrap--${variant}`,
	].join(' ');

	if (variant === 'metabox') {
		return (
			<div ref={wrapRef} className={wrapClassName}>
				<Button
					type="button"
					variant="secondary"
					size="small"
					icon={icon}
					iconSize={ICON_SIZE}
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-haspopup="menu"
					aria-label={menuLabel}
					className="modula-settings-editor__appearance-toggle modula-settings-editor__appearance-toggle--metabox"
				>
					<span className="modula-settings-editor__appearance-toggle-label">
						{selectedLabel}
					</span>
				</Button>
				{menu}
			</div>
		);
	}

	if (variant === 'sidebar-footer') {
		return (
			<div ref={wrapRef} className={wrapClassName}>
				<Button
					type="button"
					variant="tertiary"
					icon={icon}
					iconSize={ICON_SIZE}
					className="modula-gallery-takeover__sidebar-save-footer__icon-btn modula-settings-editor__appearance-toggle modula-settings-editor__appearance-toggle--sidebar-footer"
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-haspopup="menu"
					label={menuLabel}
				/>
				{menu}
			</div>
		);
	}

	return (
		<div ref={wrapRef} className={wrapClassName}>
			<Button
				type="button"
				variant="tertiary"
				icon={icon}
				iconSize={ICON_SIZE}
				className="modula-gallery-takeover__topbar-icon-btn modula-settings-editor__appearance-toggle modula-settings-editor__appearance-toggle--topbar"
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				label={menuLabel}
			/>
			{menu}
		</div>
	);
}
