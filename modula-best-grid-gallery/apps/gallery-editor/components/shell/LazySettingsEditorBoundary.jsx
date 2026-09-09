/**
 * Suspense + error boundary wrapper for code-split settings-editor chunks.
 */
import { Suspense } from '@wordpress/element';
import SettingsEditorErrorBoundary from './SettingsEditorErrorBoundary';

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   fallback?: import('react').ReactNode,
 * }} props
 */
export default function LazySettingsEditorBoundary({
	children,
	fallback = null,
}) {
	return (
		<SettingsEditorErrorBoundary>
			<Suspense fallback={fallback}>{children}</Suspense>
		</SettingsEditorErrorBoundary>
	);
}
