import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { CheckIcon, CopyIcon } from '../icons/icons';
import { copyText } from './copyText';

const RESET_AFTER_MS = 1600;

/**
 * A read-only value (shortcode, URL, config) with a Copy button that
 * confirms "Copied", or says so when the browser refuses. `multiline` shows
 * the whole value as a code block (commands, config files) instead of one
 * truncated line.
 *
 * @param {Object}  props
 * @param {string}  props.value
 * @param {string}  props.copyLabel   Accessible name of the button, e.g. "Copy shortcode".
 * @param {boolean} [props.multiline]
 * @param {boolean} [props.disabled]
 * @param {string}  [props.className]
 */
export function CopyField({
	value,
	copyLabel,
	multiline = false,
	disabled = false,
	className = '',
}) {
	const [status, setStatus] = useState('idle');

	useEffect(() => {
		if ('idle' === status) {
			return undefined;
		}
		const timer = window.setTimeout(
			() => setStatus('idle'),
			RESET_AFTER_MS
		);

		return () => window.clearTimeout(timer);
	}, [status]);

	const copy = () => {
		copyText(value).then(
			() => setStatus('copied'),
			() => setStatus('failed')
		);
	};

	const labels = {
		idle: __('Copy', 'modula-best-grid-gallery'),
		copied: __('Copied', 'modula-best-grid-gallery'),
		failed: __('Copy failed', 'modula-best-grid-gallery'),
	};

	return (
		<div
			className={[
				'modula-admin-copy-field',
				multiline ? 'is-multiline' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
		>
			{multiline ? (
				<pre className="modula-admin-copy-field__value">
					<code>{value}</code>
				</pre>
			) : (
				<code className="modula-admin-copy-field__value">{value}</code>
			)}
			<Button
				className={`modula-admin-copy-field__button is-${status}`}
				icon={'copied' === status ? <CheckIcon /> : <CopyIcon />}
				aria-label={copyLabel}
				disabled={disabled}
				onClick={copy}
			>
				{labels[status]}
			</Button>
			<span className="modula-admin-sr-only" role="status">
				{'idle' === status ? '' : labels[status]}
			</span>
		</div>
	);
}
