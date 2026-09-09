import { useMemo } from '@wordpress/element';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * Snapshot of PHP-localized settings editor bootstrap. Stable for the component lifetime
 * (matches WP admin: object is fixed once the script runs).
 *
 * @return {Record<string, unknown>} Localized bootstrap from PHP (`window.modulaSettingsEditor`).
 */
export function useModulaSettingsEditorConfig() {
	return useMemo(() => getModulaSettingsEditorConfig(), []);
}
