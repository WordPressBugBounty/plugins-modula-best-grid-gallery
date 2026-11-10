<?php
/**
 * Reusable gallery grouped-settings writes, shared by editor and future callers.
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

use Modula\V2\Meta_Sync;
use Modula\V2\Freeform_Catalog;
use Modula\V2\Motion\Motion_Settings;

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

	/**
	 * Merged settings, sanitized. A save can't make Under Image a hover again
	 * (Motion_Settings::without_imported_under_hover), so a strict write that
	 * names `custom` there is refused before it writes.
	 *
	 * @param array<string, mixed> $merged Stored settings with the patch merged in.
	 * @return array<string, array<string, mixed>>
	 */
	private static function sanitized_settings( array $merged ): array {
		return Motion_Settings::without_imported_under_hover( Sanitizer::sanitize_grouped( $merged ) );
	}

	/** Validate that requested values already use canonical sanitizer forms before any effects. */
	public static function validate_strict_patch( int $id, array $incoming ) {
		// Preset validation has no target catalog; only gallery patches replace occurrences.
		if ( $id > 0 && isset( $incoming['freeform']['placements'] ) ) {
			$schema = Registry::get_schema()['freeform']['placements'];
			$valid  = Freeform_Catalog::validate_replacement(
				array_values( array_filter( Meta_Sync::get_images_v2( $id ), 'is_array' ) ),
				$incoming['freeform']['placements'],
				$schema['items']['properties']['w']['maximum']
			);
			if ( is_wp_error( $valid ) ) {
				return $valid;
			}
		}
		$existing = json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ) ?: array();
		$sanitized = self::sanitized_settings( self::merge_grouped_settings( $existing, $incoming ) );
		foreach ( $incoming as $group => $keys ) {
			foreach ( $keys as $key => $value ) {
				if ( 'filters' === $group && 'filters' === $key && array() === $value ) {
					continue;
				}
				if ( ! array_key_exists( $key, $sanitized[ $group ] ?? array() ) || ! self::is_canonical_value( $sanitized[ $group ][ $key ], $value ) ) {
					return new \WP_Error( 'modula_noncanonical_setting', 'Requested values must use the canonical setting form: ' . $group . '.' . $key );
				}
			}
		}
		return true;
	}

	/**
	 * Whether a requested value already is what the sanitizer returns for it.
	 *
	 * JSON has one number kind: a `number` setting the sanitizer returns as the
	 * float 2.0 arrives from a client, and reads back from the stored document,
	 * as the integer 2. That pair is one value. Everything else must be identical,
	 * so an `integer` setting still refuses a float.
	 *
	 * @param mixed $sanitized Sanitizer output.
	 * @param mixed $value     Requested value.
	 */
	private static function is_canonical_value( $sanitized, $value ): bool {
		if ( is_float( $sanitized ) && is_int( $value ) ) {
			return (float) $value === $sanitized;
		}
		if ( ! is_array( $sanitized ) || ! is_array( $value ) ) {
			return $sanitized === $value;
		}
		if ( array_keys( $sanitized ) !== array_keys( $value ) ) {
			return false;
		}
		foreach ( $sanitized as $key => $child ) {
			if ( ! self::is_canonical_value( $child, $value[ $key ] ) ) {
				return false;
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
		$incoming  = Motion_Settings::with_hover_choice_from_builder_write( $existing, $incoming );
		$incoming  = Motion_Settings::with_entrance_choice_from_loading_write( $existing, $incoming );
		$merged    = self::merge_grouped_settings( $existing, $incoming );
		$sanitized = self::sanitized_settings( $merged );
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
		// Keep a non-empty filter list when sanitize fills the placeholder default.
		$writes_filter_list = ! $preserve_unrequested || isset( $incoming['filters']['filters'] );
		if ( $writes_filter_list ) {
			$sanitized = modula_protect_filter_list_on_grouped_save( $existing, $incoming, $sanitized );
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
		// update_post_meta() unslashes; without wp_slash() CSS escapes such as `\201C` lose their backslash.
		update_post_meta( $id, 'modula-settings', wp_slash( $flat ) );

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

		if ( ! empty( $incoming['freeform']['placements'] ) ) {
			$pinned = Meta_Sync::pin_freeform_catalog( $id );
			if ( is_wp_error( $pinned ) ) {
				return $pinned;
			}
			return Meta_Sync::get_settings_v2( $id, false );
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
		if ( ! function_exists( 'modula_filter_list_removed_names_on_grouped_save' ) ) {
			return;
		}

		$removed = modula_filter_list_removed_names_on_grouped_save( $existing, $incoming, $sanitized );
		if ( empty( $removed ) ) {
			return;
		}

		Meta_Sync::strip_gallery_filter_names_from_images( $id, $removed );
	}
}
