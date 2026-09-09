import { createPortal, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, close } from '@wordpress/icons';

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
 * @param {{
 *   isOpen: boolean,
 *   mode?: 'create' | 'open',
 *   heroUrl?: string,
 *   onClose: () => void,
 *   onChoose: (choice: 'beta' | 'classic') => void,
 * }} props
 */
export function EditorChoiceModal({
	isOpen,
	mode = 'create',
	heroUrl = '',
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
			if ('Escape' === event.key) {
				onClose();
			}
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
				onClick={onClose}
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
								'Faster to move through, easier to understand, better organised. Your galleries and shortcodes stay exactly as they are.',
								'modula-best-grid-gallery'
							)}
						</p>
					</div>
					<button
						type="button"
						className="modula-editor-choice-modal__close"
						onClick={onClose}
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
					<p className="modula-editor-choice-modal__disclaimer">
						{disclaimer}
					</p>
					<div className="modula-editor-choice-modal__actions">
						<button
							type="button"
							className="modula-editor-choice-modal__button modula-editor-choice-modal__button--secondary"
							onClick={() => onChoose('classic')}
						>
							{__('Not now', 'modula-best-grid-gallery')}
						</button>
						<button
							type="button"
							className="modula-editor-choice-modal__button modula-editor-choice-modal__button--primary"
							onClick={() => onChoose('beta')}
						>
							{__(
								'Try the new editor',
								'modula-best-grid-gallery'
							)}
							<span aria-hidden>→</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
}
