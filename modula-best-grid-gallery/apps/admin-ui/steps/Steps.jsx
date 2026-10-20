import { Children } from '@wordpress/element';

/**
 * Numbered instructions ("Connect an assistant"): an ordered list whose
 * items get the artboard's round number. The list already announces the
 * position, so the drawn number is hidden from assistive technology.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children One child per step.
 */
export function Steps({ children }) {
	return (
		<ol className="modula-admin-steps">
			{/* toArray gives every child a key. */}
			{Children.toArray(children).map((step, index) => (
				<li key={step.key} className="modula-admin-steps__item">
					<span
						className="modula-admin-steps__number"
						aria-hidden="true"
					>
						{index + 1}
					</span>
					<div className="modula-admin-steps__body">{step}</div>
				</li>
			))}
		</ol>
	);
}
