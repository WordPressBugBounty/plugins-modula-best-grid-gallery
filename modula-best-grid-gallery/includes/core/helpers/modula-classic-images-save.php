<?php
/**
 * Classic gallery editor: non-destructive gallery items save policy.
 *
 * Blank, invalid, or accidental-empty `modula-images` payloads must not
 * replace a non-empty stored gallery items list. JSON must be decoded after
 * a single WordPress unslash — never stripslashes again (quotes in captions
 * would break the payload and persist an empty list).
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Decode a classic `modula-images` JSON string after WordPress unslash.
 *
 * Do not call stripslashes() here: POST is already unslashed at the save
 * boundary, and a second pass destroys escaped quotes inside captions.
 *
 * @param mixed $raw_payload Raw `modula-images` value (string after unslash).
 * @return array|null Decoded list, or null when blank / not a JSON array.
 */
function modula_decode_classic_images_json( $raw_payload ) {
	if ( ! is_string( $raw_payload ) || '' === trim( $raw_payload ) ) {
		return null;
	}

	$decoded = json_decode( $raw_payload, true );
	if ( ! is_array( $decoded ) ) {
		return null;
	}

	return $decoded;
}

/**
 * Resolve whether a classic gallery save should replace stored gallery items.
 *
 * @param mixed $raw_payload     Raw `modula-images` POST value (string after unslash).
 * @param mixed $existing_images Current `modula-images` meta (array or empty).
 * @return array|null Decoded list to write, or null to skip the images meta write.
 */
function modula_resolve_classic_images_save( $raw_payload, $existing_images ) {
	$decoded = modula_decode_classic_images_json( $raw_payload );
	if ( null === $decoded ) {
		return null;
	}

	$existing_nonempty = is_array( $existing_images ) && count( $existing_images ) > 0;

	/*
	 * Fail-safe: empty array over a non-empty gallery is treated as accidental
	 * (legacy dual field / bad submit), not an intentional clear.
	 */
	if ( 0 === count( $decoded ) && $existing_nonempty ) {
		return null;
	}

	return $decoded;
}
