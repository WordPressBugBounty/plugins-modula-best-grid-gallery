<?php
/**
 * Gallery filter name list: preserve on save + refill from image tags.
 *
 * Empty / placeholder-only gallery `filters` must not wipe a non-empty stored
 * list unless the save explicitly clears it. Already-wiped galleries can be
 * repaired by collecting unique per-image filter tags. Intentional dismiss/clear
 * must strip matching per-image tags so repair cannot refill those names.
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
 * Encode a comma inside a filter tag for per-image storage (`,` → `&#44;`).
 *
 * @param string $tag Decoded tag.
 * @return string
 */
function modula_gallery_filter_list_encode_tag( $tag ) {
	return str_replace( ',', '&#44;', (string) $tag );
}

/**
 * Join decoded filter tags into a per-image filters string.
 *
 * @param string[] $tags Decoded tag tokens.
 * @return string
 */
function modula_gallery_filter_list_format_image_filters( array $tags ) {
	$parts = array();
	foreach ( $tags as $tag ) {
		$tag = trim( (string) $tag );
		if ( '' === $tag ) {
			continue;
		}
		$parts[] = modula_gallery_filter_list_encode_tag( $tag );
	}
	return implode( ',', $parts );
}

/**
 * Names present in $existing but absent from $resolved (first-seen order).
 *
 * @param mixed $existing Prior gallery filter list.
 * @param mixed $resolved Gallery filter list after save resolve.
 * @return string[]
 */
function modula_gallery_filter_list_removed_names( $existing, $resolved ) {
	$after = array_fill_keys( modula_gallery_filter_list_normalize( $resolved ), true );
	$out   = array();
	foreach ( modula_gallery_filter_list_normalize( $existing ) as $name ) {
		if ( isset( $after[ $name ] ) ) {
			continue;
		}
		$out[] = $name;
	}
	return $out;
}

/**
 * Remove named filter tags from gallery item rows.
 *
 * Embedded / non-array rows are left unchanged. Matching uses decoded tags
 * (Pro `&#44;` commas). Kept tags are re-encoded when written back.
 *
 * @param mixed    $images        Gallery items (modula-images / merged rows).
 * @param string[] $removed_names Filter names to strip.
 * @return array{images: array, changed: bool}
 */
function modula_gallery_filter_list_strip_names_from_images( $images, $removed_names ) {
	if ( ! is_array( $images ) ) {
		return array(
			'images'  => array(),
			'changed' => false,
		);
	}

	$removed = array();
	foreach ( (array) $removed_names as $name ) {
		$name = trim( modula_gallery_filter_list_decode_tag( (string) $name ) );
		if ( '' === $name ) {
			continue;
		}
		$removed[ $name ] = true;
	}

	if ( empty( $removed ) ) {
		return array(
			'images'  => $images,
			'changed' => false,
		);
	}

	$changed = false;
	$out     = array();

	foreach ( $images as $row ) {
		if ( ! is_array( $row ) || ! array_key_exists( 'filters', $row ) ) {
			$out[] = $row;
			continue;
		}

		$tags = modula_gallery_filter_list_parse_image_filters( $row['filters'] );
		$kept = array();
		foreach ( $tags as $tag ) {
			if ( isset( $removed[ $tag ] ) ) {
				continue;
			}
			$kept[] = $tag;
		}

		if ( count( $kept ) === count( $tags ) ) {
			$out[] = $row;
			continue;
		}

		$changed         = true;
		$next            = $row;
		$next['filters'] = modula_gallery_filter_list_format_image_filters( $kept );
		$out[]           = $next;
	}

	return array(
		'images'  => $out,
		'changed' => $changed,
	);
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
 * Map classic Filters POST into resolve args for gallery filter list save.
 *
 * Classic clear-all removes every `filters[]` input, so the `filters` key is
 * absent. The Filters field posts `filters_submitted` while that UI is present;
 * submitted + missing `filters` means intentional empty list. Missing both keeps
 * wipe protection (do not treat as clear).
 *
 * @param mixed $raw_settings       Raw `modula-settings` POST (pre-sanitize).
 * @param mixed $sanitized_filters  Sanitized filters value when `filters` was in POST.
 * @return array{key_present: bool, incoming: mixed}
 */
function modula_classic_gallery_filter_list_save_args( $raw_settings, $sanitized_filters = null ) {
	$raw = is_array( $raw_settings ) ? $raw_settings : array();
	$submitted       = ! empty( $raw['filters_submitted'] );
	$has_filters_key = array_key_exists( 'filters', $raw );

	if ( $submitted && ! $has_filters_key ) {
		return array(
			'key_present' => true,
			'incoming'    => array(),
		);
	}

	return array(
		'key_present' => $has_filters_key,
		'incoming'    => $has_filters_key ? $sanitized_filters : null,
	);
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
 * Keep a grouped save's `filters.filters` list as modula_resolve_gallery_filter_list_save()
 * decides it, after schema sanitize filled the placeholder default. Shared by the
 * gallery and album settings writers.
 *
 * @param array<string, array<string, mixed>> $existing  Grouped settings before merge.
 * @param array<string, array<string, mixed>> $incoming  Raw PATCH body.
 * @param array<string, array<string, mixed>> $sanitized Sanitized merged settings.
 * @return array<string, array<string, mixed>> `$sanitized` with the resolved list.
 */
function modula_protect_filter_list_on_grouped_save( array $existing, array $incoming, array $sanitized ) {
	$key_present = isset( $incoming['filters'] ) && is_array( $incoming['filters'] )
		&& array_key_exists( 'filters', $incoming['filters'] );

	$existing_list = ( isset( $existing['filters'] ) && is_array( $existing['filters'] )
		&& array_key_exists( 'filters', $existing['filters'] ) )
		? $existing['filters']['filters']
		: array( '' );

	/*
	 * Use the client payload when the key was present. Schema sanitize fills
	 * default `['']` for empty arrays, which would block intentional clear.
	 */
	$incoming_list = $key_present ? $incoming['filters']['filters'] : null;

	if ( ! isset( $sanitized['filters'] ) || ! is_array( $sanitized['filters'] ) ) {
		$sanitized['filters'] = array();
	}

	$resolved = modula_resolve_gallery_filter_list_save(
		$incoming_list,
		$existing_list,
		$key_present
	);

	if ( is_array( $resolved ) ) {
		$resolved = array_map(
			static function ( $entry ) {
				return sanitize_text_field( (string) $entry );
			},
			$resolved
		);
	}

	$sanitized['filters']['filters'] = $resolved;

	return $sanitized;
}

/**
 * Names a grouped save removes from `filters.filters`, after
 * modula_protect_filter_list_on_grouped_save() resolved the list. The writer
 * strips them from its items before writing the settings, so read-time repair
 * cannot refill them. Shared by the gallery and album settings writers.
 *
 * @param array<string, array<string, mixed>> $existing  Grouped settings before merge.
 * @param array<string, array<string, mixed>> $incoming  Raw PATCH body.
 * @param array<string, array<string, mixed>> $sanitized Sanitized settings after protect.
 * @return string[] Removed names; none when the save does not carry the list.
 */
function modula_filter_list_removed_names_on_grouped_save( array $existing, array $incoming, array $sanitized ) {
	$key_present = isset( $incoming['filters'] ) && is_array( $incoming['filters'] )
		&& array_key_exists( 'filters', $incoming['filters'] );
	if ( ! $key_present ) {
		return array();
	}

	$existing_list = ( isset( $existing['filters'] ) && is_array( $existing['filters'] )
		&& array_key_exists( 'filters', $existing['filters'] ) )
		? $existing['filters']['filters']
		: array( '' );

	$resolved_list = ( isset( $sanitized['filters'] ) && is_array( $sanitized['filters'] )
		&& array_key_exists( 'filters', $sanitized['filters'] ) )
		? $sanitized['filters']['filters']
		: array( '' );

	return modula_gallery_filter_list_removed_names( $existing_list, $resolved_list );
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
