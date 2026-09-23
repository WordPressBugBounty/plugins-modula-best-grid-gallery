<?php
/**
 * Pure seam: Fancybox + Custom URL → hybrid Image click eligibility and flat settings transform.
 *
 * No WordPress I/O. Persistence, notice, and Diagnostics call these then write meta.
 *
 * @package Modula
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether any gallery image row has a trimmed non-empty Custom URL (`link`).
 *
 * @param mixed $images modula-images list.
 * @return bool
 */
function modula_custom_url_hybrid_images_have_custom_url( $images ) {
	if ( ! is_array( $images ) || empty( $images ) ) {
		return false;
	}

	foreach ( $images as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$link = isset( $row['link'] ) ? $row['link'] : '';
		if ( ! is_string( $link ) && ! is_numeric( $link ) ) {
			continue;
		}
		if ( '' !== trim( (string) $link ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Whether flat gallery settings + images are eligible for hybrid Image click migration.
 *
 * Beta only: classic galleries keep the pre-3.0 Fancybox + Custom URL tile redirect
 * habit and are never rewritten by this tool. Eligible when the gallery is Beta,
 * coerced Image click mode is Fancybox, and at least one image has a Custom URL.
 *
 * @param mixed $settings Flat modula-settings.
 * @param mixed $images   modula-images list.
 * @param bool  $is_beta  Whether the gallery is marked `_modula_beta`.
 * @return bool
 */
function modula_custom_url_hybrid_gallery_is_eligible( $settings, $images, $is_beta = false ) {
	if ( ! $is_beta ) {
		return false;
	}

	if ( ! is_array( $settings ) ) {
		return false;
	}

	$raw = isset( $settings['lightbox'] ) ? $settings['lightbox'] : '';
	$mode = function_exists( 'modula_coerce_lightbox_click_mode' )
		? modula_coerce_lightbox_click_mode( $raw )
		: ( is_string( $raw ) ? trim( $raw ) : '' );

	if ( 'fancybox' !== $mode ) {
		return false;
	}

	return modula_custom_url_hybrid_images_have_custom_url( $images );
}

/**
 * Apply hybrid Image click mode on flat gallery settings.
 *
 * @param array<string, mixed> $settings Flat modula-settings.
 * @return array<string, mixed>
 */
function modula_custom_url_hybrid_apply_flat_settings( array $settings ) {
	$settings['lightbox'] = 'lightbox-prefer-url';
	return $settings;
}
