<?php
/**
 * Non-destructive attachment text writes for gallery → Media Library sync.
 *
 * Gallery sync may update shared attachment fields (alt, title, caption, description).
 * An empty incoming value must never overwrite a non-empty stored value.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve whether gallery sync should write an attachment text field.
 *
 * Empty incoming values are never written. That protects non-empty Media Library
 * values and treats empty-to-empty as a no-op.
 *
 * @param string $incoming Proposed value (caller sanitizes as needed).
 * @param string $existing Current stored Media Library value.
 * @return string|null Value to write, or null to skip the write entirely.
 */
function modula_resolve_attachment_text_write( $incoming, $existing ) {
	$incoming = is_string( $incoming ) ? $incoming : (string) $incoming;
	$existing = is_string( $existing ) ? $existing : (string) $existing;

	// Prefer skipping the write entirely over writing ''.
	if ( '' === $incoming ) {
		return null;
	}

	// Identical non-empty: return the value; callers may still no-op on compare.
	if ( $incoming === $existing ) {
		return $incoming;
	}

	return $incoming;
}
