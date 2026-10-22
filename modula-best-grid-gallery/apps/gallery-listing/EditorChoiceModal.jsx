import {
	createInterpolateElement,
	createPortal,
	useEffect,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, close } from '@wordpress/icons';
import { EditorChoiceSplitButton } from './EditorChoiceSplitButton';
import { skipActiveViewTransition } from './completeEditorChoice';
import { getClassicPresetOptions } from './listingCreatePresets';

/**
 * Esc inside the New from preset menu closes the menu, not the whole modal.
 *
 * @param {KeyboardEvent} event Keydown event.
 * @return {boolean} True when the key event comes from an open popover.
 */
function isFromPopover(event) {
	const target = event.target;
	return Boolean(
		target &&
			typeof target.closest === 'function' &&
			target.closest('.components-popover')
	);
}

/**
 * @param {import('./listingCreatePresets').CreatePresetOptions} presetOptions Menu model.
 * @return {import('react').ReactNode} What the new-editor main click starts from.
 */
function renderStartHint(presetOptions) {
	if (!presetOptions.defaultPreset) {
		return createInterpolateElement(
			__(
				'New gallery starts from <b>built-in defaults</b>. Use the arrow to start from a preset.',
				'modula-best-grid-gallery'
			),
			{ b: <strong /> }
		);
	}
	// The title goes in as an element so markup in a preset title stays text.
	return createInterpolateElement(
		/* translators: <preset /> is replaced by the Default preset title. */
		__(
			'New gallery starts from <preset />, your default preset.',
			'modula-best-grid-gallery'
		),
		{ preset: <strong>{presetOptions.defaultPreset.title}</strong> }
	);
}

const SECONDARY_BUTTON_CLASS =
	'modula-editor-choice-modal__button modula-editor-choice-modal__button--secondary';
const PRIMARY_BUTTON_CLASS =
	'modula-editor-choice-modal__button modula-editor-choice-modal__button--primary';

const FEATURES = [
	{
		number: '01',
		title: __('See it as you build', 'modula-best-grid-gallery'),
		description: __(
			'A live view — the gallery on the back end looks exactly like the front.',
			'modula-best-grid-gallery'
		),
	},
	{
		number: '02',
		title: __('Settings in sections', 'modula-best-grid-gallery'),
		description: __(
			'Grouped by what they do, not one endless list of controls.',
			'modula-best-grid-gallery'
		),
	},
	{
		number: '03',
		title: __('Switch back anytime', 'modula-best-grid-gallery'),
		description: __(
			'Try it, and return to the classic editor whenever you like.',
			'modula-best-grid-gallery'
		),
	},
];

/**
 * `presetOptions` is for gallery create only; the caller passes null for open
 * and album create, which keeps the plain two buttons.
 *
 * @param {{
 *   isOpen: boolean,
 *   mode?: 'create' | 'open',
 *   heroUrl?: string,
 *   presetOptions?: import('./listingCreatePresets').CreatePresetOptions | null,
 *   settingsUrl?: string,
 *   onClose: () => void,
 *   onChoose: (choice: 'beta' | 'classic', start?: number | 'blank') => void,
 * }} props
 */
export function EditorChoiceModal({
	isOpen,
	mode = 'create',
	heroUrl = '',
	presetOptions = null,
	settingsUrl = '',
	onClose,
	onChoose,
}) {
	const [heroFailed, setHeroFailed] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const onKeyDown = (event) => {
			if ('Escape' !== event.key || isFromPopover(event)) {
				return;
			}
			skipActiveViewTransition(document);
			onClose();
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) {
			setHeroFailed(false);
		}
	}, [isOpen, heroUrl]);

	if (!isOpen) {
		return null;
	}

	const handleClose = () => {
		skipActiveViewTransition(document);
		onClose();
	};

	const handleChoose = (choice, start) => {
		skipActiveViewTransition(document);
		onChoose(choice, start);
	};

	// Classic leaves out presets it can't show; with none left it keeps a plain button.
	const editorChoices = [
		{
			choice: 'classic',
			presetOptions: getClassicPresetOptions(presetOptions),
			className: SECONDARY_BUTTON_CLASS,
			content: __('Not now', 'modula-best-grid-gallery'),
			menuLabel: __(
				'Classic editor: start from',
				'modula-best-grid-gallery'
			),
			arrowLabel: __(
				'Classic editor: choose a starting preset',
				'modula-best-grid-gallery'
			),
		},
		{
			choice: 'beta',
			presetOptions,
			className: PRIMARY_BUTTON_CLASS,
			content: (
				<>
					{__('Try the new editor', 'modula-best-grid-gallery')}
					<span aria-hidden>→</span>
				</>
			),
			menuLabel: __('New editor: start from', 'modula-best-grid-gallery'),
			arrowLabel: __(
				'New editor: choose a starting preset',
				'modula-best-grid-gallery'
			),
		},
	];
	const showHeroImage = Boolean(heroUrl) && !heroFailed;
	const disclaimer =
		'open' === mode
			? __(
					'Beta — some details may still change before the final release. Your original gallery and shortcode stay unchanged.',
					'modula-best-grid-gallery'
				)
			: __(
					'Beta — some details may still change before the final release.',
					'modula-best-grid-gallery'
				);

	return createPortal(
		<div className="modula-editor-choice-modal">
			<button
				type="button"
				className="modula-editor-choice-modal__backdrop"
				onClick={handleClose}
				aria-label={__('Close dialog', 'modula-best-grid-gallery')}
			/>
			<div
				className="modula-editor-choice-modal__dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modula-editor-choice-modal-title"
			>
				<div className="modula-editor-choice-modal__header">
					<div className="modula-editor-choice-modal__header-main">
						<div className="modula-editor-choice-modal__eyebrow">
							<span className="modula-editor-choice-modal__badge">
								{__('Beta 3.0', 'modula-best-grid-gallery')}
							</span>
							<span className="modula-editor-choice-modal__subtitle">
								{__(
									'A new gallery editing experience',
									'modula-best-grid-gallery'
								)}
							</span>
						</div>
						<h2
							id="modula-editor-choice-modal-title"
							className="modula-editor-choice-modal__title"
						>
							{__(
								'The editor, rebuilt from scratch',
								'modula-best-grid-gallery'
							)}
						</h2>
						<p className="modula-editor-choice-modal__lede">
							{__(
								'Faster to move through, easier to understand, better organised. By opting for the new editor, a copy of your gallery will be created so you can safely test out the editor without disrupting your live gallery.',
								'modula-best-grid-gallery'
							)}
						</p>
					</div>
					<button
						type="button"
						className="modula-editor-choice-modal__close"
						onClick={handleClose}
						aria-label={__('Close', 'modula-best-grid-gallery')}
					>
						<Icon icon={close} size={20} />
					</button>
				</div>

				<div
					className={[
						'modula-editor-choice-modal__hero',
						showHeroImage ? 'has-image' : 'is-placeholder',
					]
						.filter(Boolean)
						.join(' ')}
				>
					{showHeroImage ? (
						<img
							className="modula-editor-choice-modal__hero-image"
							src={heroUrl}
							alt=""
							onError={() => setHeroFailed(true)}
						/>
					) : null}
				</div>

				<div className="modula-editor-choice-modal__features">
					{FEATURES.map((feature) => (
						<div
							key={feature.number}
							className="modula-editor-choice-modal__feature"
						>
							<span className="modula-editor-choice-modal__feature-number">
								{feature.number}
							</span>
							<h3 className="modula-editor-choice-modal__feature-title">
								{feature.title}
							</h3>
							<p className="modula-editor-choice-modal__feature-text">
								{feature.description}
							</p>
						</div>
					))}
				</div>

				<div className="modula-editor-choice-modal__footer">
					<div className="modula-editor-choice-modal__footer-text">
						{presetOptions ? (
							<p className="modula-editor-choice-modal__start-hint">
								{renderStartHint(presetOptions)}
							</p>
						) : null}
						<p className="modula-editor-choice-modal__disclaimer">
							{disclaimer}
						</p>
					</div>
					<div className="modula-editor-choice-modal__actions">
						{editorChoices.map((option) =>
							option.presetOptions ? (
								<EditorChoiceSplitButton
									key={option.choice}
									className={option.className}
									menuLabel={option.menuLabel}
									arrowLabel={option.arrowLabel}
									presetOptions={option.presetOptions}
									settingsUrl={settingsUrl}
									onChoose={(start) =>
										handleChoose(option.choice, start)
									}
								>
									{option.content}
								</EditorChoiceSplitButton>
							) : (
								<button
									key={option.choice}
									type="button"
									className={option.className}
									onClick={() => handleChoose(option.choice)}
								>
									{option.content}
								</button>
							)
						)}
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
}
