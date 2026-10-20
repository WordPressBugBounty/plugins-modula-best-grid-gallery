import { __, _n, sprintf } from '@wordpress/i18n';
import { decodedText } from './serverText';

// The settings class's Diagnostics fields (`Modula_Settings::get_diagnostics()`).
const TOGGLE_FIELD = 'enabled';
const DOWNLOAD_FIELD = 'modula_debug_log_download';
const CLEAR_FIELD = 'modula_debug_log_clear';

// The fields the Custom URL hybrid migration prepends while a gallery is
// eligible (`Modula_Custom_Url_Hybrid_Migration::filter_diagnostics_tab()`).
const HYBRID_INTRO_FIELD = 'modula_custom_url_hybrid_intro';
const HYBRID_STATUS_FIELD = 'modula_custom_url_hybrid_status';
const HYBRID_FIX_FIELD = 'modula_custom_url_hybrid_fix';

/**
 * @param {Object[]} fields Config fields.
 * @param {string}   name   Field name.
 * @param {string}   type   Expected field type.
 * @return {Object|null} The field, or null when missing or of another type.
 */
function fieldNamed(fields, name, type) {
	const field = fields.find((item) => name === item.name);

	return field && type === field.type ? field : null;
}

/**
 * A button field's REST route.
 *
 * @param {Object|null} button Button field.
 * @return {{ path: string, method: string, data: Object }|null} Route, or
 *         null without a path.
 */
function buttonRoute(button) {
	const path = button?.api?.path;
	if ('string' !== typeof path || '' === path) {
		return null;
	}

	return {
		path,
		method: button.api.method ?? 'POST',
		data: button.api.data ?? {},
	};
}

/**
 * The Debug log card's form from the Diagnostics subtab config: the
 * toggle's field name and label, the log status the server reports, and the
 * Download and Clear routes.
 *
 * @param {Object} config Card config.
 * @return {Object|null} `{ toggleName, toggleLabel, log, download, clear }`, or null for
 *         any other config (the card then shows as unavailable).
 */
export function debugLogForm(config) {
	const fields = Array.isArray(config.fields) ? config.fields : [];
	const toggle = fieldNamed(fields, TOGGLE_FIELD, 'toggle');
	const download = buttonRoute(fieldNamed(fields, DOWNLOAD_FIELD, 'button'));
	const clear = buttonRoute(fieldNamed(fields, CLEAR_FIELD, 'button'));
	const { log } = config;
	const hasLogStatus =
		'object' === typeof log &&
		null !== log &&
		Number.isInteger(log.ttl_days) &&
		0 < log.ttl_days;
	if (!toggle || !download || !clear || !hasLogStatus) {
		return null;
	}

	return {
		toggleName: toggle.name,
		toggleLabel: decodedText(toggle.label),
		log: {
			isActive: true === log.active,
			hasFile: true === log.has_file,
			size: String(log.size_label ?? ''),
			expires: String(log.expires_label ?? ''),
			ttlDays: log.ttl_days,
		},
		download,
		clear,
	};
}

/**
 * The Custom URL hybrid migration block from the Diagnostics config: its
 * server copy and the fix action.
 *
 * @param {Object} config Card config.
 * @return {Object|null} `{ title, intro, status, fix }`, or null when the
 *         migration sent nothing (no gallery is eligible).
 */
export function hybridMigration(config) {
	const fields = Array.isArray(config.fields) ? config.fields : [];
	const intro = fieldNamed(fields, HYBRID_INTRO_FIELD, 'paragraph');
	const status = fieldNamed(fields, HYBRID_STATUS_FIELD, 'paragraph');
	const button = fieldNamed(fields, HYBRID_FIX_FIELD, 'button');
	const route = buttonRoute(button);
	if (!intro || !status || !route) {
		return null;
	}

	return {
		title: decodedText(intro.label),
		intro: decodedText(intro.description),
		status: decodedText(status.description),
		fix: {
			label: decodedText(button.text),
			busyLabel: decodedText(button.loadingText),
			doneMessage: decodedText(button.successMessage),
			failedMessage: decodedText(button.errorMessage),
			route,
		},
	};
}

/**
 * @param {Object} log The form's log status.
 * @return {string} The kept log's size, or that nothing is recorded.
 */
function sizeSentence(log) {
	return log.hasFile
		? sprintf(
				/* translators: %s: log file size, such as 12 KB */
				__('Log size: %s.', 'modula-best-grid-gallery'),
				log.size
			)
		: __('Nothing recorded yet.', 'modula-best-grid-gallery');
}

/**
 * The "Log file" row's status line. While the toggle is on it gives when
 * logging turns itself off: the saved window's end, or, before Save, the
 * service's window length. While it is off the row shows only for a kept
 * log, which can still be downloaded or cleared.
 *
 * @param {Object}  log  The form's log status.
 * @param {boolean} isOn The toggle's current value (pending edits included).
 * @return {{ isShown: boolean, text: string }} Whether the row shows, and its text.
 */
export function logFileStatus(log, isOn) {
	if (!isOn) {
		return log.hasFile
			? {
					isShown: true,
					text: `${__('Logging is off.', 'modula-best-grid-gallery')} ${sizeSentence(log)}`,
				}
			: { isShown: false, text: '' };
	}

	if (!log.isActive || '' === log.expires) {
		return {
			isShown: true,
			text: sprintf(
				/* translators: %d: number of days the Modula Debug Log stays on */
				_n(
					'Turns itself off after %d day.',
					'Turns itself off after %d days.',
					log.ttlDays,
					'modula-best-grid-gallery'
				),
				log.ttlDays
			),
		};
	}

	return {
		isShown: true,
		text: `${sprintf(
			/* translators: %s: date and time when the Modula Debug Log turns itself off */
			__('Turns itself off on %s.', 'modula-best-grid-gallery'),
			log.expires
		)} ${sizeSentence(log)}`,
	};
}
