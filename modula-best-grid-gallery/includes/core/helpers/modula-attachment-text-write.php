<?php
/**
 * Non-destructive attachment text writes for gallery → Media Library sync.
 *
 * Gallery sync may update shared attachment fields (alt, title, caption, description).
 * An empty incoming value must never overwrite a non-empty stored value.
 *
 * When the gallery explicitly clears those fields, the gallery row still stores ''
 * even if Media Library text remains (see modula_resolve_gallery_row_attachment_text_after_sync).
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

/**
 * Keys among title / alt / description that the gallery explicitly cleared ('').
 *
 * Used so gallery-row overlay can keep intentional empties while Media Library
 * non-empty values remain protected by modula_resolve_attachment_text_write().
 *
 * @param array $media_subset Sync subset (may include title, alt, description).
 * @return string[] Cleared keys.
 */
function modula_attachment_text_keys_explicitly_cleared( $media_subset ) {
	if ( ! is_array( $media_subset ) ) {
		return array();
	}

	$cleared = array();
	foreach ( array( 'title', 'alt', 'description' ) as $key ) {
		if ( ! array_key_exists( $key, $media_subset ) ) {
			continue;
		}
		$value = $media_subset[ $key ];
		$value = is_string( $value ) ? $value : (string) $value;
		if ( '' === $value ) {
			$cleared[] = $key;
		}
	}

	return $cleared;
}

/**
 * Resolve the gallery-row text value after attachment sync + overlay.
 *
 * When the gallery explicitly cleared the field, persist '' on the row even if
 * Media Library still holds non-empty text (empty sync does not wipe ML).
 *
 * @param string $attachment_value      Attachment field value after the sync attempt.
 * @param bool   $explicit_gallery_clear True when PATCH/row sent this key as ''.
 * @return string Value to store on the gallery row.
 */
function modula_resolve_gallery_row_attachment_text_after_sync( $attachment_value, $explicit_gallery_clear ) {
	if ( $explicit_gallery_clear ) {
		return '';
	}

	return is_string( $attachment_value ) ? $attachment_value : (string) $attachment_value;
}

/**
 * Sanitize attachment description for wp_update_post().
 *
 * wp_kses_post() returns unslashed HTML; wp_update_post() unslashes once.
 * Slash exactly once. Do not wrap wp_filter_post_kses() (already slashed)
 * in another wp_slash() — that leaves literal \" in post_content.
 *
 * @param mixed $description Incoming description (REST/JSON is typically unslashed).
 * @return string Slashed post-kses HTML for wp_update_post().
 */
function modula_sanitize_attachment_description_for_write( $description ) {
	$description = is_string( $description ) ? $description : (string) $description;

	return wp_slash( wp_kses_post( wp_unslash( $description ) ) );
}
