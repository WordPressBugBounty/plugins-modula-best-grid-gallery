<?php
/**
 * Per-image fields stored on the gallery item (CONTEXT.md "Gallery item"): the
 * image's own hover effect and its CSS classes. The editor names the same keys
 * in `apps/gallery-editor/utils/galleryItemFields.js`.
 *
 * Both keys join the item whitelist (`modula_gallery_image_attributes`), so every
 * item save keeps them in `modula-images` and `modula_images_v2`. Merged saves
 * also clean the image's link here; the whitelist save cleans it in
 * `Modula_Admin_Helpers::sanitize_image()`.
 *
 * @package Modula
 */

namespace Modula\V2\Images;

use Modula\V2\Abilities\Hover_Builder_Policy;

defined( 'ABSPATH' ) || exit;

final class Item_Fields {
	/** Hover Effect Builder preset id for this image; '' follows the gallery. */
	public const HOVER_PRESET = 'hover_preset';

	/** Space-separated CSS classes added to the item's element. */
	public const CSS_CLASS = 'css_class';

	/** The image's Custom URL; the tile's href in the link click modes. */
	public const LINK = 'link';

	/** Schemes an item link may use; relative URLs are kept too. The visitor JS keeps a copy in `apps/gallery-shared/utils/safeItemLink.js`. */
	public const LINK_PROTOCOLS = array( 'http', 'https', 'mailto', 'tel' );

	// Letters, digits, `-` and `_`, not starting with a digit or `-` plus a digit.
	private const CSS_CLASS_TOKEN = '/^-?[A-Za-z_][A-Za-z0-9_-]*$/';

	public static function init(): void {
		add_filter( 'modula_gallery_image_attributes', array( __CLASS__, 'add_attributes' ) );
		add_filter( 'modula_image_field_sanitization', array( __CLASS__, 'sanitize_field' ), 10, 3 );
	}

	/**
	 * @param mixed $attributes Item keys the save keeps.
	 * @return mixed The keys plus this class's keys.
	 */
	public static function add_attributes( $attributes ) {
		if ( ! is_array( $attributes ) ) {
			return $attributes;
		}
		foreach ( array( self::HOVER_PRESET, self::CSS_CLASS ) as $key ) {
			if ( ! in_array( $key, $attributes, true ) ) {
				$attributes[] = $key;
			}
		}
		return $attributes;
	}

	/**
	 * `modula_image_field_sanitization`: other keys pass through unchanged.
	 *
	 * @param mixed  $value     Value after `sanitize_text_field`.
	 * @param mixed  $raw       Submitted value.
	 * @param string $attribute Item key.
	 * @return mixed
	 */
	public static function sanitize_field( $value, $raw, $attribute ) {
		switch ( $attribute ) {
			case self::CSS_CLASS:
				return self::sanitize_css_class( $raw );
			case self::HOVER_PRESET:
				return self::sanitize_hover_preset( $raw );
			default:
				return $value;
		}
	}

	/**
	 * Sanitizes this class's keys where a row has them. For saves that do not
	 * run the item whitelist (`Images\Adapter::normalize_item_row`, the v2
	 * store of merged saves such as Bulk edit).
	 *
	 * @param array<string,mixed> $row Gallery item row.
	 * @return array<string,mixed>
	 */
	public static function sanitize_row( array $row ): array {
		if ( array_key_exists( self::CSS_CLASS, $row ) ) {
			$row[ self::CSS_CLASS ] = self::sanitize_css_class( $row[ self::CSS_CLASS ] );
		}
		if ( array_key_exists( self::HOVER_PRESET, $row ) ) {
			$row[ self::HOVER_PRESET ] = self::sanitize_hover_preset( $row[ self::HOVER_PRESET ] );
		}
		if ( array_key_exists( self::LINK, $row ) ) {
			$row[ self::LINK ] = self::sanitize_link( $row[ self::LINK ] );
		}
		return $row;
	}

	/**
	 * The link renders as the tile's href, so a `javascript:` or `data:` link
	 * would run script on click (stored XSS for Authors without unfiltered_html).
	 *
	 * @param mixed $raw Submitted link.
	 * @return string The link with a safe scheme, or ''.
	 */
	public static function sanitize_link( $raw ): string {
		if ( ! is_string( $raw ) ) {
			return '';
		}
		return esc_url_raw( trim( $raw ), self::LINK_PROTOCOLS );
	}

	/**
	 * @param mixed $raw Classes separated by spaces or commas.
	 * @return string Valid class tokens, in order, without duplicates, joined by spaces.
	 */
	public static function sanitize_css_class( $raw ): string {
		return implode( ' ', self::css_class_tokens( $raw ) );
	}

	/**
	 * @param mixed $raw Preset id.
	 * @return string A catalog preset id, or '' (the gallery's hover).
	 */
	public static function sanitize_hover_preset( $raw ): string {
		if ( ! is_string( $raw ) ) {
			return '';
		}
		$id = sanitize_key( $raw );
		return '' !== $id && null !== Hover_Builder_Policy::applied_builder( $id ) ? $id : '';
	}

	/**
	 * @param array<string,mixed> $image Gallery item row.
	 * @return array<int,string> CSS classes for the item's element.
	 */
	public static function item_classes( array $image ): array {
		return self::css_class_tokens( $image[ self::CSS_CLASS ] ?? '' );
	}

	/**
	 * The hover builder this image overrides the gallery's with. A preset the
	 * site may not use (a premium preset without Compatible Pro, as the editor
	 * locks it) falls back to the gallery's hover.
	 *
	 * @param array<string,mixed> $image Gallery item row.
	 * @return array<string,mixed>|null Null: the gallery's hover applies.
	 */
	public static function hover_builder_for_item( array $image ): ?array {
		$raw = $image[ self::HOVER_PRESET ] ?? '';
		$id  = is_string( $raw ) ? sanitize_key( $raw ) : '';
		if ( '' === $id || ! Hover_Builder_Policy::preset_available_in_editor( $id ) ) {
			return null;
		}
		// Null for an id outside the catalog.
		return Hover_Builder_Policy::applied_builder( $id );
	}

	/**
	 * @param mixed $raw
	 * @return array<int,string>
	 */
	private static function css_class_tokens( $raw ): array {
		if ( ! is_string( $raw ) ) {
			return array();
		}
		$tokens = preg_split( '/[\s,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY );
		$valid  = array_filter(
			is_array( $tokens ) ? $tokens : array(),
			static function ( $token ) {
				return 1 === preg_match( self::CSS_CLASS_TOKEN, $token );
			}
		);
		return array_values( array_unique( $valid ) );
	}
}
