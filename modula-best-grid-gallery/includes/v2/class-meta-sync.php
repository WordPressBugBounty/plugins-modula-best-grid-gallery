<?php

/**
 * Modula v2 meta sync.
 * When modula-settings or modula-images are saved, also save v2 format (modula_settings_v2, modula_images_v2).
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Meta_Sync
 */
class Meta_Sync {


	/**
	 * When true, `updated_post_meta` for modula-images must not re-run sync (editor already persisted v2).
	 *
	 * @var bool
	 */
	private static $internal_modula_images_write = false;

	/** Meta key for grouped settings (v2). */
	const SETTINGS_V2_META_KEY = 'modula_settings_v2';

	/** Meta key for images v: JSON envelope {@see \Modula\V2\Images\Adapter::wrap_envelope()} (legacy: flat array). */
	const IMAGES_V2_META_KEY = 'modula_images_v2';

	/**
	 * Lightweight JSON array of v2-only embedded rows (content_block / shortcode).
	 * Survives main blob decode failures and keeps refresh/bootstrap reliable.
	 */
	const IMAGES_V2_EMBEDDED_META_KEY = 'modula_images_v2_embedded';

	/** Reserved for chunked storage + manifest (pagination); not written yet. */
	const IMAGES_V2_MANIFEST_META_KEY = 'modula_images_v2_manifest';

	/**
	 * Register hooks: save_post (runs on every gallery save) and updated_post_meta (when meta actually changes).
	 */
	public static function init() {
		add_action( 'save_post_modula-gallery', array( __CLASS__, 'on_save_gallery' ), 20, 2 );
		add_action( 'updated_post_meta', array( __CLASS__, 'on_updated_post_meta' ), 10, 4 );
		add_action( 'load-post.php', array( __CLASS__, 'on_load_post_for_v2_backfill' ) );
	}

	/**
	 * Lazy migration: when opening the gallery edit screen, ensure modula_settings_v2 exists if we only have flat modula-settings.
	 */
	public static function on_load_post_for_v2_backfill() {
		if ( ! is_admin() ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen routing; capability checked below.
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		self::ensure_settings_v2_from_flat( $post_id );
	}

	/**
	 * If modula_settings_v2 is missing or empty but modula-settings (flat) exists, build v2 from flat.
	 *
	 * @param int $post_id Gallery post ID.
	 */
	public static function ensure_settings_v2_from_flat( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return;
		}
		$v2 = self::get_settings_v2( $post_id );
		if ( ! empty( $v2 ) ) {
			return;
		}
		$flat = get_post_meta( $post_id, 'modula-settings', true );
		if ( ! is_array( $flat ) ) {
			return;
		}
		self::sync_settings_v2( $post_id, $flat, array( 'legacy_import' => true ) );
	}

	/**
	 * Ensure flat modula-settings and modula_settings_v2 exist (defaults for new galleries).
	 *
	 * @param int $post_id Gallery post ID.
	 */
	public static function ensure_default_settings( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return;
		}

		self::ensure_settings_v2_from_flat( $post_id );

		if ( ! empty( self::get_settings_v2( $post_id ) ) ) {
			return;
		}

		$flat = get_post_meta( $post_id, 'modula-settings', true );
		if ( is_array( $flat ) && ! empty( $flat ) ) {
			self::sync_settings_v2( $post_id, $flat, array( 'legacy_import' => true ) );
			return;
		}

		if ( ! class_exists( 'Modula_CPT_Fields_Helper', false ) ) {
			return;
		}

		$defaults = \Modula_CPT_Fields_Helper::get_defaults();
		if ( ! is_array( $defaults ) ) {
			$defaults = array();
		}

		update_post_meta( $post_id, 'modula-settings', $defaults );
		self::sync_settings_v2( $post_id, $defaults );
	}

	/**
	 * On gallery save (after meta boxes). Sync both v2 metas from current modula-settings and modula-images.
	 * This runs every time the gallery is saved, so v2 stays in sync even when WordPress skips updated_post_meta (unchanged value).
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 */
	public static function on_save_gallery( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! $post || 'modula-gallery' !== $post->post_type ) {
			return;
		}
		$settings = get_post_meta( $post_id, 'modula-settings', true );
		$images   = get_post_meta( $post_id, 'modula-images', true );
		if ( is_array( $settings ) ) {
			self::sync_settings_v2( $post_id, $settings );
		}
		if ( is_array( $images ) ) {
			self::sync_images_v2( $post_id, $images );
		}
	}

	/**
	 * After modula-settings or modula-images is updated, save the v2 counterpart.
	 *
	 * @param int    $meta_id    ID of updated metadata entry.
	 * @param int    $post_id    Post ID.
	 * @param string $meta_key   Meta key.
	 * @param mixed  $meta_value Meta value that was just saved.
	 */
	public static function on_updated_post_meta( $meta_id, $post_id, $meta_key, $meta_value ) {
		if ( get_post_type( $post_id ) !== 'modula-gallery' ) {
			return;
		}

		if ( 'modula-settings' === $meta_key ) {
			self::sync_settings_v2( $post_id, $meta_value );
			// Backfill images v2 if missing (e.g. this was a settings-only save).
			$v2_images = self::get_images_v2( $post_id );
			$embedded  = self::get_images_v2_embedded_rows_only( $post_id );
			if ( empty( $v2_images ) && empty( $embedded ) ) {
				$images = get_post_meta( $post_id, 'modula-images', true );
				if ( is_array( $images ) ) {
					self::sync_images_v2( $post_id, $images );
				}
			} elseif ( empty( $v2_images ) && ! empty( $embedded ) ) {
				$images = get_post_meta( $post_id, 'modula-images', true );
				if ( is_array( $images ) ) {
					self::sync_images_v2( $post_id, $images );
				}
			}
			return;
		}

		if ( 'modula-images' === $meta_key ) {
			if ( self::$internal_modula_images_write ) {
				return;
			}
			self::sync_images_v2( $post_id, $meta_value );
			// Backfill settings v2 if missing (e.g. images-only save like reorder).
			$v2_settings = self::get_settings_v2( $post_id );
			if ( empty( $v2_settings ) ) {
				$settings = get_post_meta( $post_id, 'modula-settings', true );
				if ( is_array( $settings ) ) {
					self::sync_settings_v2( $post_id, $settings );
				}
			}
		}
	}

	/**
	 * Build and save modula_settings_v2 from flat modula-settings.
	 *
	 * @param int   $post_id Post ID.
	 * @param mixed $flat    Flat settings (array) as stored in modula-settings.
	 */
	private static function sync_settings_v2( $post_id, $flat, array $options = array() ) {
		if ( ! is_array( $flat ) ) {
			$flat = array();
		}

		$grouped   = Settings\Adapter::to_grouped( $flat, $options );
		$sanitized = Settings\Sanitizer::sanitize_grouped( $grouped );

		$json = wp_json_encode( $sanitized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		self::update_json_post_meta( $post_id, self::SETTINGS_V2_META_KEY, false !== $json ? $json : '{}' );
	}

	/**
	 * Rebuild modula_images_v2 from a modula-images-shaped list (REST patch/import paths).
	 * Guarantees bootstrap/shortcode see fresh rows even if `updated_post_meta` did not run
	 * (e.g. meta “unchanged” edge case, or load order).
	 *
	 * @param int   $post_id Gallery post ID.
	 * @param array $images   Rows (typically already sanitized like stored meta).
	 */
	public static function sync_modula_images_v2_from_list( $post_id, array $images ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return;
		}
		self::sync_images_v2( $post_id, $images );
	}

	/**
	 * Persist a full merged item list (images + v2-only embedded rows): updates modula-images (images only)
	 * and modula_images_v2 in one shot. Used by the settings editor / REST.
	 *
	 * @param int                              $post_id Gallery post ID.
	 * @param array<int, array<string, mixed>> $items   Mixed rows (order = display order).
	 * @return true|\WP_Error
	 */
	public static function persist_merged_gallery_items( $post_id, array $items ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return new \WP_Error( 'modula_invalid_gallery', __( 'Invalid gallery.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}

		if ( class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false ) ) {
			$previous = get_post_meta( $post_id, 'modula-images', true );
			if ( ! is_array( $previous ) ) {
				$previous = array();
			}
			// Compare against the derived catalog so newly appended bind-target
			// tiles (not yet in stored modula-images) still get exclusions when omitted.
			$previous = \Modula\Bound_Gallery\Bound_Gallery::apply_derived_catalog( $post_id, $previous );
			\Modula\Bound_Gallery\Bound_Gallery::exclude_omitted_source_attachments( $post_id, $previous, $items );
		}

		$items = self::sync_merged_items_attachment_text_fields( $items, $post_id );
		if ( is_wp_error( $items ) ) {
			return $items;
		}

		$normalized = Images\Adapter::normalize_mixed_items_for_v2_storage( $items );
		$v1_rows    = Images\Adapter::extract_v1_image_rows_from_mixed( $normalized );

		if ( class_exists( 'Modula_Gallery_Upload', false ) ) {
			$upload = \Modula_Gallery_Upload::get_instance();
			if ( $upload ) {
				$v1_rows = $upload->sanitize_modula_images_list( $v1_rows );
			}
		}

		self::$internal_modula_images_write = true;
		try {
			update_post_meta( $post_id, 'modula-images', $v1_rows );
		} finally {
			self::$internal_modula_images_write = false;
		}

		self::persist_normalized_v2_rows( $post_id, $normalized );

		return true;
	}

	/**
	 * Sync title / alt / description from merged rows onto attachments (canonical store).
	 * Matches patch-image-by-index so bootstrap reload via get_gallery_images() does not
	 * overwrite modula-images values with stale attachment text.
	 *
	 * @param array<int, array<string, mixed>> $items   Mixed rows (mutated copy returned).
	 * @param int                              $post_id Gallery post ID (for filters).
	 * @return array<int, array<string, mixed>>|\WP_Error
	 */
	public static function sync_merged_items_attachment_text_fields( array $items, $post_id = 0 ) {
		if ( ! class_exists( 'Modula_Gallery_Upload', false ) ) {
			return $items;
		}
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload ) {
			return $items;
		}

		$media_keys = array( 'title', 'alt', 'description' );
		$out        = array();

		foreach ( $items as $row ) {
			if ( ! is_array( $row ) || Images\Adapter::is_embedded_gallery_item( $row ) ) {
				$out[] = $row;
				continue;
			}

			$attachment_id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) {
				$out[] = $row;
				continue;
			}

			$media_subset = array();
			foreach ( $media_keys as $key ) {
				if ( array_key_exists( $key, $row ) ) {
					$media_subset[ $key ] = $row[ $key ];
				}
			}

			if ( empty( $media_subset ) ) {
				$out[] = $row;
				continue;
			}

			/**
			 * Filter attachment text fields before bulk save-merged-items writes them.
			 *
			 * @param array $media_subset  Keys among title, alt, description.
			 * @param int   $attachment_id Attachment ID.
			 * @param int   $gallery_id    Gallery post ID.
			 * @param int   $index         Always 0 for merged-list saves.
			 */
			$media_subset = apply_filters(
				'modula_gallery_patch_image_attachment_text_fields',
				$media_subset,
				$attachment_id,
				$post_id,
				0
			);

			$synced = $upload->apply_modula_media_fields_to_attachment( $attachment_id, $media_subset );
			if ( is_wp_error( $synced ) ) {
				return $synced;
			}

			$out[] = $upload->overlay_modula_row_attachment_text_from_post( $row, $attachment_id );
		}

		return $out;
	}

	/**
	 * Write modula_images_v2 chunk or blob from already normalized rows.
	 *
	 * @param int                              $post_id    Gallery post ID.
	 * @param array<int, array<string, mixed>> $normalized Normalized rows (images + optional embedded).
	 */
	public static function persist_normalized_v2_rows( $post_id, array $normalized ): void {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}
		$row_count  = count( $normalized );
		$chunk_size = (int) apply_filters( 'modula_v2_image_chunk_size', 200, $post_id );
		$chunk_int  = max( 1, $chunk_size );

		if ( Modern_Gallery::should_use_chunked_storage( $post_id, $row_count ) ) {
			Images\Chunked_Storage::persist( $post_id, $normalized, $chunk_int );
			return;
		}

		Images\Chunked_Storage::delete_storage( $post_id );

		$envelope = Images\Adapter::wrap_envelope( $normalized );
		$json     = self::encode_images_v2_envelope_json( $envelope );
		if ( false === $json || '' === $json ) {
			return;
		}
		self::update_json_post_meta( $post_id, self::IMAGES_V2_META_KEY, $json );

		// Meta round-trip sanity check (unescaped " in HTML/shortcodes after wp_unslash).
		$stored = get_post_meta( $post_id, self::IMAGES_V2_META_KEY, true );
		if ( is_string( $stored ) && '' !== $stored ) {
			$round_trip = self::decode_images_v2_json_string( $stored );
			if ( null === $round_trip ) {
				$repaired = self::repair_corrupt_images_v2_json_string( $stored );
				if ( $repaired !== $stored ) {
					$round_trip = self::decode_images_v2_json_string( $repaired );
					if ( null !== $round_trip ) {
						$rejson = self::encode_images_v2_envelope_json( $round_trip );
						if ( false !== $rejson && '' !== $rejson ) {
							self::update_json_post_meta( $post_id, self::IMAGES_V2_META_KEY, $rejson );
						}
					}
				}
			}
		}

		self::persist_embedded_rows_sidecar( $post_id, $normalized );
	}

	/**
	 * Persist embedded-only rows in a small dedicated meta key (fallback when main v2 JSON is corrupt).
	 *
	 * @param int                              $post_id    Gallery post ID.
	 * @param array<int, array<string, mixed>> $normalized Normalized mixed rows.
	 */
	private static function persist_embedded_rows_sidecar( $post_id, array $normalized ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}

		$embedded = array();
		foreach ( $normalized as $row ) {
			if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
				$embedded[] = Images\Adapter::normalize_embedded_row( $row );
			}
		}

		if ( empty( $embedded ) ) {
			delete_post_meta( $post_id, self::IMAGES_V2_EMBEDDED_META_KEY );
			return;
		}

		$json = self::encode_images_v2_envelope_json(
			array(
				'format'  => Images\Adapter::STORAGE_FORMAT,
				'version' => Images\Adapter::STORAGE_VERSION,
				'items'   => array_values( $embedded ),
			)
		);
		if ( false === $json || '' === $json ) {
			$flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
			if ( defined( 'JSON_INVALID_UTF8_SUBSTITUTE' ) ) {
				$flags |= JSON_INVALID_UTF8_SUBSTITUTE;
			}
			$json = wp_json_encode( array_values( $embedded ), $flags );
		}
		if ( false === $json || '' === $json ) {
			return;
		}
		self::update_json_post_meta( $post_id, self::IMAGES_V2_EMBEDDED_META_KEY, $json );
	}

	/**
	 * Persist JSON gallery meta. `update_post_meta()` runs `wp_unslash()` — without `wp_slash()`
	 * escaped quotes inside `blockBodyHtml` (e.g. href="#") become bare `"` and break decode.
	 *
	 * @param int    $post_id  Gallery post ID.
	 * @param string $meta_key Meta key.
	 * @param string $json     Valid JSON string from `wp_json_encode` / encode helper.
	 */
	private static function update_json_post_meta( $post_id, $meta_key, $json ): void {
		update_post_meta( absint( $post_id ), $meta_key, wp_slash( $json ) );
	}

	/**
	 * JSON-encode the v2 items envelope with UTF-8-safe row strings.
	 *
	 * @param array{format: string, version: int, items: array<int, array<string, mixed>>} $envelope Storage envelope.
	 * @return string|false
	 */
	public static function encode_images_v2_envelope_json( array $envelope ) {
		$items = isset( $envelope['items'] ) && is_array( $envelope['items'] ) ? $envelope['items'] : array();
		foreach ( $items as $i => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$items[ $i ] = self::sanitize_row_strings_for_json_encode( $row );
		}
		$envelope['items'] = array_values( $items );

		$flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
		if ( defined( 'JSON_INVALID_UTF8_SUBSTITUTE' ) ) {
			$flags |= JSON_INVALID_UTF8_SUBSTITUTE;
		}

		$json = wp_json_encode( $envelope, $flags );
		if ( false === $json || '' === $json ) {
			return false;
		}

		// Verify round-trip before touching post meta (catches corrupt rows early).
		$probe = json_decode( $json, true );
		if ( JSON_ERROR_NONE !== json_last_error() || ! is_array( $probe ) ) {
			return false;
		}

		return $json;
	}

	/**
	 * Recursively normalize strings so json_encode / post-meta round-trip stays valid JSON.
	 *
	 * @param array<string, mixed> $row Item row.
	 * @return array<string, mixed>
	 */
	private static function sanitize_row_strings_for_json_encode( array $row ): array {
		foreach ( $row as $key => $value ) {
			if ( is_string( $value ) ) {
				$row[ $key ] = self::sanitize_meta_string_for_json( $value );
			} elseif ( is_array( $value ) ) {
				$row[ $key ] = self::sanitize_row_strings_for_json_encode( $value );
			}
		}
		return $row;
	}

	/**
	 * @param string $value Raw string field.
	 * @return string
	 */
	private static function sanitize_meta_string_for_json( string $value ): string {
		if ( '' === $value ) {
			return '';
		}
		$value = wp_check_invalid_utf8( $value, true );
		// Strip ASCII control chars that break JSON / MySQL meta round-trips.
		return (string) preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );
	}

	/**
	 * Decode modula_images_v2 JSON string from post meta (tolerates legacy slash corruption).
	 *
	 * @param string $raw Meta string.
	 * @return array<string, mixed>|null
	 */
	private static function decode_images_v2_json_string( string $raw ) {
		$candidates = array( $raw );
		$unslashed  = wp_unslash( $raw );
		if ( $unslashed !== $raw ) {
			$candidates[] = $unslashed;
		}
		$stripslashed = stripslashes( $raw );
		if ( $stripslashed !== $raw && $stripslashed !== $unslashed ) {
			$candidates[] = $stripslashed;
		}

		$decode_flags = 0;
		if ( defined( 'JSON_INVALID_UTF8_SUBSTITUTE' ) ) {
			$decode_flags = JSON_INVALID_UTF8_SUBSTITUTE;
		}

		foreach ( array_unique( $candidates, SORT_STRING ) as $candidate ) {
			$decoded = json_decode( $candidate, true, 512, $decode_flags );
			if ( JSON_ERROR_NONE === json_last_error() && is_array( $decoded ) ) {
				return $decoded;
			}
		}

		$repaired = self::repair_corrupt_images_v2_json_string( $raw );
		if ( $repaired !== $raw ) {
			foreach ( array_unique( array( $repaired, wp_unslash( $repaired ), stripslashes( $repaired ) ), SORT_STRING ) as $candidate ) {
				$decoded = json_decode( $candidate, true, 512, $decode_flags );
				if ( JSON_ERROR_NONE === json_last_error() && is_array( $decoded ) ) {
					return $decoded;
				}
			}
		}

		return null;
	}

	/**
	 * Repair corrupt v2 JSON (literal `"` inside string values from HTML attrs / shortcodes).
	 *
	 * @param string $raw Meta JSON string.
	 * @return string
	 */
	private static function repair_corrupt_images_v2_json_string( string $raw ): string {
		if ( '' === $raw ) {
			return $raw;
		}
		$repaired = self::repair_json_unescaped_shortcode_quotes( $raw );
		$repaired = self::repair_json_unescaped_html_attr_quotes( $repaired );
		return $repaired;
	}

	/**
	 * Repair legacy/corrupt v2 JSON where shortcode attrs kept literal `"` inside blockBodyHtml string values.
	 *
	 * @param string $raw Meta JSON string.
	 * @return string
	 */
	private static function repair_json_unescaped_shortcode_quotes( string $raw ): string {
		if ( '' === $raw || false === strpos( $raw, '[' ) ) {
			return $raw;
		}
		// Corrupt meta often breaks at shortcode attrs: [kaliform id="1819"] inside blockBodyHtml JSON strings.
		$repaired = preg_replace_callback(
			'/\[([a-zA-Z0-9_-]+[^\]]*?)(\s[\w-]+)=(")([^"]*)(")([^\]]*?)\]/',
			static function ( array $match ): string {
				return '[' . $match[1] . $match[2] . '=' . "'" . $match[4] . "'" . $match[6] . ']';
			},
			$raw
		);
		return is_string( $repaired ) ? $repaired : $raw;
	}

	/**
	 * Escape bare HTML attribute quotes that broke JSON after `update_post_meta` → `wp_unslash`.
	 * Example seed HTML: `<a href="#" class="modula-template-cta">`.
	 *
	 * @param string $raw Meta JSON string.
	 * @return string
	 */
	private static function repair_json_unescaped_html_attr_quotes( string $raw ): string {
		if ( '' === $raw || false === strpos( $raw, '="' ) ) {
			return $raw;
		}
		$repaired = preg_replace_callback(
			'/\b([a-zA-Z_:][-a-zA-Z0-9_:.]*?)=(")([^"]*)(")/',
			static function ( array $match ): string {
				return $match[1] . '=\\"' . $match[3] . '\\"';
			},
			$raw
		);
		return is_string( $repaired ) ? $repaired : $raw;
	}

	/**
	 * Save modula_images_v2. Same structure as modula-images for now; filter allows transformation later.
	 *
	 * @param int   $post_id Post ID.
	 * @param mixed $images  Images array as stored in modula-images.
	 */
	private static function sync_images_v2( $post_id, $images ) {
		if ( ! is_array( $images ) ) {
			$images = array();
		}

		/**
		 * Filter: transform images for v2 storage (modula-images shape, before normalization/envelope).
		 *
		 * @param array $images  Images array as stored in modula-images.
		 * @param int   $post_id Gallery post ID.
		 */
		$images = apply_filters( 'modula_v2_images_before_save', $images, $post_id );
		if ( ! is_array( $images ) ) {
			$images = array();
		}

		$normalized = Images\Adapter::normalize_images_for_v2_storage( $images );
		$previous   = self::get_images_v2( $post_id );
		if ( ! is_array( $previous ) ) {
			$previous = array();
		}
		if ( empty( $previous ) ) {
			$embedded_only = self::get_images_v2_embedded_rows_only( $post_id );
			if ( ! empty( $embedded_only ) ) {
				$previous = $embedded_only;
			}
		}
		$merged = Images\Item_Merge::merge_v1_with_preserved_embedded( $normalized, $previous );

		self::persist_normalized_v2_rows( $post_id, $merged );
	}

	/**
	 * Get settings v2 as array. Decodes JSON; supports legacy serialized meta.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array<string, array<string, mixed>>
	 */
	public static function get_settings_v2( $post_id ) {
		$raw = get_post_meta( $post_id, self::SETTINGS_V2_META_KEY, true );
		if ( is_string( $raw ) ) {
			$decoded = json_decode( $raw, true );
			$out     = is_array( $decoded ) ? $decoded : array();
		} else {
			$out = is_array( $raw ) ? $raw : array();
		}
		return self::normalize_settings_v2_read( $out );
	}

	/**
	 * In-memory fixes for legacy keys (e.g. renamed grouped fields) so readers and to_flat() stay consistent.
	 *
	 * @param array<string, array<string, mixed>> $v2 Grouped settings.
	 * @return array<string, array<string, mixed>>
	 */
	private static function normalize_settings_v2_read( array $v2 ) {
		if ( isset( $v2['lightbox'] ) && is_array( $v2['lightbox'] ) ) {
			$lb = &$v2['lightbox'];
			if ( isset( $lb['thumbsAutoStart'] ) && ! array_key_exists( 'showThumbnails', $lb ) ) {
				$lb['showThumbnails'] = $lb['thumbsAutoStart'];
			}
			unset( $lb['thumbsAutoStart'] );
			if ( ! array_key_exists( 'share', $lb ) && ! empty( $v2['social']['enableSocial'] ) ) {
				$lb['share'] = true;
			}
		}
		if ( isset( $v2['captions'] ) && is_array( $v2['captions'] ) ) {
			$cap = &$v2['captions'];
			if ( array_key_exists( 'showGalleryTitle', $cap ) && ! array_key_exists( 'hideGalleryTitle', $cap ) ) {
				$cap['hideGalleryTitle'] = ! (bool) $cap['showGalleryTitle'];
			}
			unset( $cap['showGalleryTitle'] );
			/*
			 * New boolean (schema default true). Older galleries omit the key; treat as on
			 * so editor / readers match runtime (unset === enabled).
			 */
			if ( ! array_key_exists( 'compactCaptionPopover', $cap ) ) {
				$cap['compactCaptionPopover'] = true;
			}
			if ( ! array_key_exists( 'compactCaptionMinSize', $cap ) ) {
				$cap['compactCaptionMinSize'] = 240;
			}
		}
		if ( ! isset( $v2['responsive'] ) || ! is_array( $v2['responsive'] ) ) {
			$v2['responsive'] = array();
		}
		if ( ! array_key_exists( 'treatAsTabletUnder', $v2['responsive'] ) ) {
			$v2['responsive']['treatAsTabletUnder'] = 1024;
		}
		if ( ! array_key_exists( 'treatAsPhoneUnder', $v2['responsive'] ) ) {
			$v2['responsive']['treatAsPhoneUnder'] = 600;
		}
		// customizations.style → style.customCss (same as Sanitizer::sanitize_grouped migration).
		if ( isset( $v2['customizations'] ) && is_array( $v2['customizations'] ) && array_key_exists( 'style', $v2['customizations'] ) ) {
			$legacy = $v2['customizations']['style'];
			if ( is_string( $legacy ) && '' !== $legacy ) {
				if ( ! isset( $v2['style'] ) || ! is_array( $v2['style'] ) ) {
					$v2['style'] = array();
				}
				if ( ! array_key_exists( 'customCss', $v2['style'] ) || '' === (string) $v2['style']['customCss'] ) {
					$v2['style']['customCss'] = $legacy;
				}
			}
			unset( $v2['customizations']['style'] );
			if ( array() === $v2['customizations'] ) {
				unset( $v2['customizations'] );
			}
		}
		return $v2;
	}

	/**
	 * Load rows when modula_images_v2 decode is empty: modula-images + any v2-only embedded rows.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array<int, array<string, mixed>>
	 */
	/**
	 * Reinsert v2-only embedded rows when the decoded list has images but no embedded tiles.
	 *
	 * @param int                              $post_id Gallery post ID.
	 * @param array<int, array<string, mixed>> $images  Rows from get_images_v2() or fallback.
	 * @return array<int, array<string, mixed>>
	 */
	public static function ensure_embedded_rows_in_gallery_images_list( $post_id, array $images ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || empty( $images ) ) {
			return $images;
		}
		foreach ( $images as $row ) {
			if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
				return $images;
			}
		}
		$embedded = self::get_images_v2_embedded_rows_only( $post_id );
		if ( empty( $embedded ) ) {
			return $images;
		}
		$v1_normalized = Images\Adapter::normalize_images_for_v2_storage( $images );
		return Images\Item_Merge::merge_v1_with_preserved_embedded( $v1_normalized, $embedded );
	}

	public static function get_gallery_images_with_embedded_fallback( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return array();
		}

		$v1 = get_post_meta( $post_id, 'modula-images', true );
		if ( ! is_array( $v1 ) ) {
			$v1 = array();
		}

		$embedded = self::get_images_v2_embedded_rows_only( $post_id );
		if ( empty( $embedded ) ) {
			return $v1;
		}

		$v1_normalized = Images\Adapter::normalize_images_for_v2_storage( $v1 );
		return Images\Item_Merge::merge_v1_with_preserved_embedded( $v1_normalized, $embedded );
	}

	/**
	 * Extract embedded rows from modula_images_v2 even when the full list decode is empty.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array<int, array<string, mixed>>
	 */
	public static function get_images_v2_embedded_rows_only( $post_id ) {
		$items = self::get_images_v2( $post_id );
		if ( ! empty( $items ) ) {
			$embedded = array();
			foreach ( $items as $row ) {
				if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
					$embedded[] = $row;
				}
			}
			if ( ! empty( $embedded ) ) {
				return $embedded;
			}
		}

		$sidecar = self::read_embedded_rows_sidecar( $post_id );
		if ( ! empty( $sidecar ) ) {
			return $sidecar;
		}

		if ( Images\Chunked_Storage::has_manifest( $post_id ) ) {
			return array();
		}

		$raw = get_post_meta( $post_id, self::IMAGES_V2_META_KEY, true );
		if ( is_string( $raw ) ) {
			$decoded = self::decode_images_v2_json_string( $raw );
			if ( null === $decoded ) {
				$decoded = array();
			}
		} elseif ( is_array( $raw ) ) {
			$decoded = $raw;
		} else {
			return array();
		}

		$candidates = Images\Adapter::unwrap_items_lenient( $decoded );
		if ( empty( $candidates ) ) {
			return array();
		}

		$embedded = array();
		foreach ( $candidates as $row ) {
			if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
				$embedded[] = Images\Adapter::normalize_embedded_row( $row );
			}
		}
		return $embedded;
	}

	/**
	 * Read embedded-only sidecar meta (modula_images_v2_embedded).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array<int, array<string, mixed>>
	 */
	private static function read_embedded_rows_sidecar( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return array();
		}
		$raw = get_post_meta( $post_id, self::IMAGES_V2_EMBEDDED_META_KEY, true );
		if ( is_string( $raw ) && '' !== $raw ) {
			$decoded = self::decode_images_v2_json_string( $raw );
			if ( null === $decoded ) {
				$decoded = json_decode( $raw, true );
			}
			if ( is_array( $decoded ) ) {
				$rows = Images\Adapter::unwrap_items_lenient( $decoded );
				if ( empty( $rows ) && self::is_list_of_embedded_rows( $decoded ) ) {
					$rows = array_values( $decoded );
				}
				$out = array();
				foreach ( $rows as $row ) {
					if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
						$out[] = Images\Adapter::normalize_embedded_row( $row );
					}
				}
				return $out;
			}
		} elseif ( is_array( $raw ) ) {
			$out = array();
			foreach ( $raw as $row ) {
				if ( is_array( $row ) && Images\Adapter::is_embedded_gallery_item( $row ) ) {
					$out[] = Images\Adapter::normalize_embedded_row( $row );
				}
			}
			return $out;
		}
		return array();
	}

	/**
	 * @param mixed $decoded Decoded JSON.
	 */
	private static function is_list_of_embedded_rows( $decoded ): bool {
		if ( ! is_array( $decoded ) || empty( $decoded ) ) {
			return false;
		}
		foreach ( $decoded as $row ) {
			if ( ! is_array( $row ) || ! Images\Adapter::is_embedded_gallery_item( $row ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get images v2 as array. Decodes JSON; supports legacy serialized meta.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array<int, array>
	 */
	public static function get_images_v2( $post_id ) {
		if ( Images\Chunked_Storage::has_manifest( $post_id ) ) {
			$items = Images\Chunked_Storage::read_all_rows( $post_id );
			$items = Images\Adapter::strip_catalog_file_urls_from_items( $items );
			return Images\Adapter::repair_video_template_row_ids( $items );
		}

		$raw = get_post_meta( $post_id, self::IMAGES_V2_META_KEY, true );
		if ( is_string( $raw ) ) {
			$decoded = self::decode_images_v2_json_string( $raw );
			if ( null === $decoded ) {
				return array();
			}
			$items = Images\Adapter::unwrap_items( $decoded );
			return Images\Adapter::repair_video_template_row_ids( $items );
		}
		if ( is_array( $raw ) ) {
			$items = Images\Adapter::unwrap_items( $raw );
			return Images\Adapter::repair_video_template_row_ids( $items );
		}
		return array();
	}
}
