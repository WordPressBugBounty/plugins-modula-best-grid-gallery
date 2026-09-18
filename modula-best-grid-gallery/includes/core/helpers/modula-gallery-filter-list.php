<?php
/**
 * Gallery filter name list: preserve on save + refill from image tags.
 *
 * Empty / placeholder-only gallery `filters` must not wipe a non-empty stored
 * list unless the save explicitly clears it. Already-wiped galleries can be
 * repaired by collecting unique per-image filter tags.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether a gallery filter name list is empty or placeholder-only.
 *
 * Treats `[]`, `['']`, and whitespace-only entries as empty.
 *
 * @param mixed $list Gallery-level filters value.
 * @return bool
 */
function modula_gallery_filter_list_is_placeholder_only( $list ) {
	if ( null === $list || false === $list || '' === $list ) {
		return true;
	}
	if ( ! is_array( $list ) ) {
		return '' === trim( (string) $list );
	}
	foreach ( $list as $entry ) {
		if ( '' !== trim( (string) $entry ) ) {
			return false;
		}
	}
	return true;
}

/**
 * Decode a Pro-encoded comma inside a filter tag (`&#44;` → `,`).
 *
 * @param string $tag Raw tag.
 * @return string
 */
function modula_gallery_filter_list_decode_tag( $tag ) {
	return str_replace( '&#44;', ',', (string) $tag );
}

/**
 * Normalize a gallery-level filter name list to non-empty trimmed tags.
 *
 * @param mixed $list Gallery-level filters value.
 * @return string[]
 */
function modula_gallery_filter_list_normalize( $list ) {
	if ( ! is_array( $list ) ) {
		return array();
	}
	$out = array();
	foreach ( $list as $entry ) {
		$tag = trim( modula_gallery_filter_list_decode_tag( (string) $entry ) );
		if ( '' === $tag ) {
			continue;
		}
		$out[] = $tag;
	}
	return $out;
}

/**
 * Parse a per-image filters string into unique-enough tag tokens (order kept).
 *
 * Comma-separated; decodes `&#44;` inside each part the same way Pro stores commas.
 *
 * @param mixed $filters_field Per-image filters (string or array).
 * @return string[]
 */
function modula_gallery_filter_list_parse_image_filters( $filters_field ) {
	if ( is_array( $filters_field ) ) {
		$parts = $filters_field;
	} elseif ( is_string( $filters_field ) ) {
		if ( '' === trim( $filters_field ) ) {
			return array();
		}
		$parts = explode( ',', $filters_field );
	} else {
		return array();
	}

	$out = array();
	foreach ( $parts as $part ) {
		$tag = trim( modula_gallery_filter_list_decode_tag( (string) $part ) );
		if ( '' === $tag ) {
			continue;
		}
		$out[] = $tag;
	}
	return $out;
}

/**
 * Rebuild unique gallery filter names from per-image filter tags (first-seen order).
 *
 * @param mixed $images Gallery items (modula-images shaped rows).
 * @return string[]
 */
function modula_gallery_filter_list_from_images( $images ) {
	if ( ! is_array( $images ) ) {
		return array();
	}

	$seen = array();
	$out  = array();

	foreach ( $images as $row ) {
		if ( ! is_array( $row ) || ! array_key_exists( 'filters', $row ) ) {
			continue;
		}
		foreach ( modula_gallery_filter_list_parse_image_filters( $row['filters'] ) as $tag ) {
			if ( isset( $seen[ $tag ] ) ) {
				continue;
			}
			$seen[ $tag ] = true;
			$out[]        = $tag;
		}
	}

	return $out;
}

/**
 * Resolve whether a save should replace the stored gallery filter name list.
 *
 * Missing key, or placeholder-only overwrite of a non-empty list, keeps existing.
 * Explicit empty `[]` when the key is present clears. Valid non-empty replaces.
 *
 * @param mixed $incoming    Incoming filters after sanitize (ignored when !$key_present).
 * @param mixed $existing    Current stored gallery filters.
 * @param bool  $key_present Whether the filters key was present in the save payload.
 * @return array Filter name list to persist.
 */
function modula_resolve_gallery_filter_list_save( $incoming, $existing, $key_present ) {
	$existing_names = modula_gallery_filter_list_normalize( $existing );

	if ( ! $key_present ) {
		if ( is_array( $existing ) ) {
			return $existing;
		}
		return array( '' );
	}

	$incoming_names = modula_gallery_filter_list_normalize( $incoming );

	if ( ! empty( $incoming_names ) ) {
		/*
		 * Keep sanitized entries as stored (including Pro `&#44;` encoding).
		 * Only drop blank/whitespace placeholders.
		 */
		if ( is_array( $incoming ) ) {
			$kept = array();
			foreach ( $incoming as $entry ) {
				if ( '' === trim( (string) $entry ) ) {
					continue;
				}
				$kept[] = (string) $entry;
			}
			return $kept;
		}
		return array_values( $incoming_names );
	}

	// Intentional clear: key present and truly empty array (Beta FilterNameListControl).
	if ( is_array( $incoming ) && 0 === count( $incoming ) ) {
		return array();
	}

	// Placeholder / empty string overwrite must not wipe a real list.
	if ( ! empty( $existing_names ) ) {
		return is_array( $existing ) ? $existing : $existing_names;
	}

	if ( is_array( $incoming ) ) {
		return $incoming;
	}

	return array( '' );
}

/**
 * Repair a wiped gallery filter list from image tags when needed.
 *
 * @param mixed $stored_list Current gallery-level filters.
 * @param mixed $images      Gallery items.
 * @return array{list: array, repaired: bool}
 */
function modula_maybe_repair_gallery_filter_list( $stored_list, $images ) {
	if ( ! modula_gallery_filter_list_is_placeholder_only( $stored_list ) ) {
		return array(
			'list'     => is_array( $stored_list ) ? $stored_list : array( '' ),
			'repaired' => false,
		);
	}

	$from_images = modula_gallery_filter_list_from_images( $images );
	if ( empty( $from_images ) ) {
		return array(
			'list'     => is_array( $stored_list ) ? $stored_list : array( '' ),
			'repaired' => false,
		);
	}

	return array(
		'list'     => $from_images,
		'repaired' => true,
	);
}
