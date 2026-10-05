<?php
/**
 * Reusable gallery grouped-settings writes, shared by editor and future callers.
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

use Modula\V2\Meta_Sync;

defined( 'ABSPATH' ) || exit;

/**
 * Gallery settings persistence without transport or publication decisions.
 * Callers authorize the target and choose its lifecycle before invoking a write.
 */
class Writer {

	/**
	 * Validate the complete grouped patch before preparation or persistence.
	 * Preserves the editor's existing null-group and coercion semantics.
	 *
	 * @param array<string, mixed> $incoming Grouped overrides.
	 * @return true|\WP_Error
	 */
	public static function validate_patch( array $incoming ) {
		foreach ( $incoming as $group => $keys ) {
			if ( ! is_string( $group ) || '' === $group ) {
				return new \WP_Error(
					'rest_invalid_param',
					__( 'Each top-level key must be a non-empty settings group name (string).', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
			}
			if ( null !== $keys && ! is_array( $keys ) ) {
				return new \WP_Error(
					'rest_invalid_param',
					sprintf(
						/* translators: %s: settings group name */
						__( 'Group "%s" must be a JSON object of settings.', 'modula-best-grid-gallery' ),
						$group
					),
					array( 'status' => 400 )
				);
			}
		}

		return true;
	}

	/** Validate that requested values already use canonical sanitizer forms before any effects. */
	public static function validate_strict_patch( int $id, array $incoming ) {
		$existing = json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ) ?: array();
		$sanitized = Sanitizer::sanitize_grouped( self::merge_grouped_settings( $existing, $incoming ) );
		foreach ( $incoming as $group => $keys ) {
			foreach ( $keys as $key => $value ) {
				if ( 'filters' === $group && 'filters' === $key && array() === $value ) {
					continue;
				}
				if ( ! array_key_exists( $key, $sanitized[ $group ] ?? array() ) || $sanitized[ $group ][ $key ] !== $value ) {
					return new \WP_Error( 'modula_noncanonical_setting', 'Requested values must use the canonical setting form: ' . $group . '.' . $key );
				}
			}
		}
		return true;
	}

	/**
	 * Merge, normalize and save a grouped patch, including existing Pro sync hooks.
	 * Does not promote the gallery or infer publication intent.
	 *
	 * @param int                  $id       Gallery post ID, authorized by the caller.
	 * @param array<string, mixed> $incoming Grouped overrides.
	 * @param bool $preserve_unrequested Preserve canonical/flat fields and suppress unrelated post sync. Caller owns canonical write context.
	 * @return array<string, array<string, mixed>>|\WP_Error Saved grouped settings.
	 */
	public static function patch( $id, array $incoming, bool $preserve_unrequested = false ) {
		$id = absint( $id );
		if ( ! $id || 'modula-gallery' !== get_post_type( $id ) ) {
			return new \WP_Error( 'modula_invalid_gallery', __( 'Invalid gallery.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$valid = self::validate_patch( $incoming );
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}

		if ( ! $preserve_unrequested ) {
			Meta_Sync::ensure_settings_v2_from_flat( $id );
		}

		$existing = $preserve_unrequested
			? ( json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ) ?: array() )
			: Meta_Sync::get_settings_v2( $id );
		$merged    = self::merge_grouped_settings( $existing, $incoming );
		$sanitized = Sanitizer::sanitize_grouped( $merged );
		if ( $preserve_unrequested ) {
			// Normalize requested fields only; unknown, dormant and sparse stored settings survive.
			$selected = $existing;
			foreach ( $incoming as $group => $keys ) {
				foreach ( $keys as $key => $value ) {
					$selected[ $group ][ $key ] = $sanitized[ $group ][ $key ];
				}
			}
			$sanitized = $selected;
		}
		if ( ! $preserve_unrequested || isset( $incoming['filters']['filters'] ) ) {
			$sanitized = self::protect_gallery_filter_list_on_save( $existing, $incoming, $sanitized );
		}
		if ( ! $preserve_unrequested ) {
			self::strip_removed_gallery_filter_names_from_images( $id, $existing, $incoming, $sanitized );
		}

		$json = wp_json_encode( $sanitized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		update_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, wp_slash( false !== $json ? $json : '{}' ) );

		$flat = Adapter::to_flat( $sanitized );
		if ( $preserve_unrequested ) {
			$original_flat = get_post_meta( $id, 'modula-settings', true );
			$original_flat = is_array( $original_flat ) ? $original_flat : array();
			$before_flat = Adapter::to_flat( $existing );
			$requested_flat = array();
			foreach ( Adapter::get_flat_to_grouped_mapping() as $key => $field ) {
				if ( array_key_exists( $field['key'], $incoming[ $field['group'] ] ?? array() ) ) {
					$requested_flat[ $key ] = true;
				}
			}
			if ( isset( $incoming['hover']['builder'] ) ) {
				$requested_flat['effect'] = true;
			}
			foreach ( $flat as $key => $value ) {
				// Explicit no-op patches also repair their own mismatched flat counterpart.
				if ( isset( $requested_flat[ $key ] ) || ! array_key_exists( $key, $before_flat ) || $before_flat[ $key ] !== $value ) {
					$original_flat[ $key ] = $value;
				}
			}
			$flat = $original_flat;
			if ( isset( $incoming['filters']['filters'] ) ) {
				// Explicit list changes must survive reopen without changing per-image tags.
				update_post_meta( $id, '_modula_filter_list_image_revision', hash( 'sha256', wp_json_encode( get_post_meta( $id, 'modula-images', true ) ) ) );
			}
		}
		update_post_meta( $id, 'modula-settings', $flat );

		/**
		 * Fires after gallery settings are saved through the shared grouped-settings writer.
		 *
		 * Use this to sync WordPress post fields (e.g. post_password) that are not
		 * stored only in modula-settings / modula_settings_v2.
		 *
		 * @since 3.0.0
		 *
		 * @param int                                 $id        Gallery post ID.
		 * @param array<string, array<string, mixed>> $sanitized Grouped v2 settings.
		 * @param array<string, mixed>                $flat      Flat modula-settings.
		 */
		if ( ! $preserve_unrequested || isset( $incoming['passwordProtect'] ) ) {
			do_action( 'modula_gallery_settings_v2_updated', $id, $sanitized, $flat );
		}

		return $sanitized;
	}

	/**
	 * Merge incoming grouped PATCH into existing grouped settings (per-group shallow key merge).
	 *
	 * @param array<string, array<string, mixed>> $base     Existing grouped settings.
	 * @param array<string, array<string, mixed>> $incoming Incoming grouped overrides.
	 * @return array<string, array<string, mixed>>
	 */
	private static function merge_grouped_settings( array $base, array $incoming ) {
		foreach ( $incoming as $group => $keys ) {
			if ( ! is_string( $group ) || ! is_array( $keys ) ) {
				continue;
			}
			if ( ! isset( $base[ $group ] ) || ! is_array( $base[ $group ] ) ) {
				$base[ $group ] = array();
			}
			$base[ $group ] = array_merge( $base[ $group ], $keys );
		}
		return $base;
	}

	/**
	 * Keep a non-empty gallery filter list when sanitize fills schema placeholder defaults.
	 *
	 * @param array<string, array<string, mixed>> $existing  Grouped settings before merge.
	 * @param array<string, array<string, mixed>> $incoming  Raw PATCH body.
	 * @param array<string, array<string, mixed>> $sanitized Sanitized merged settings.
	 * @return array<string, array<string, mixed>>
	 */
	private static function protect_gallery_filter_list_on_save( array $existing, array $incoming, array $sanitized ) {
		if ( ! function_exists( 'modula_resolve_gallery_filter_list_save' ) ) {
			return $sanitized;
		}

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
	 * Persist image-tag strip for names removed by an intentional filter-list save.
	 *
	 * Runs before settings meta write so a subsequent repair-on-read cannot refill
	 * dismissed names from leftover per-image tags.
	 *
	 * @param int                                 $id        Gallery post ID.
	 * @param array<string, array<string, mixed>> $existing  Grouped settings before merge.
	 * @param array<string, array<string, mixed>> $incoming  Raw PATCH body.
	 * @param array<string, array<string, mixed>> $sanitized Sanitized settings after protect.
	 * @return void
	 */
	private static function strip_removed_gallery_filter_names_from_images( $id, array $existing, array $incoming, array $sanitized ) {
		if ( ! function_exists( 'modula_gallery_filter_list_removed_names' ) ) {
			return;
		}

		$key_present = isset( $incoming['filters'] ) && is_array( $incoming['filters'] )
			&& array_key_exists( 'filters', $incoming['filters'] );
		if ( ! $key_present ) {
			return;
		}

		$existing_list = ( isset( $existing['filters'] ) && is_array( $existing['filters'] )
			&& array_key_exists( 'filters', $existing['filters'] ) )
			? $existing['filters']['filters']
			: array( '' );

		$resolved_list = ( isset( $sanitized['filters'] ) && is_array( $sanitized['filters'] )
			&& array_key_exists( 'filters', $sanitized['filters'] ) )
			? $sanitized['filters']['filters']
			: array( '' );

		$removed = modula_gallery_filter_list_removed_names( $existing_list, $resolved_list );
		if ( empty( $removed ) ) {
			return;
		}

		Meta_Sync::strip_gallery_filter_names_from_images( $id, $removed );
	}
}
