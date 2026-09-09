<?php
/**
 * Manifest + modula_images_v2_p* chunk metas for large modern galleries.
 *
 * @package Modula
 */

namespace Modula\V2\Images;

defined( 'ABSPATH' ) || exit;

/**
 * Class Chunked_Storage
 */
final class Chunked_Storage {

	public const CHUNK_KEY_PREFIX = 'modula_images_v2_p';

	/**
	 * Meta key for chunk index (0-based): modula_images_v2_p0 … pN.
	 */
	public static function chunk_meta_key( int $index ): string {
		return self::CHUNK_KEY_PREFIX . (string) max( 0, $index );
	}

	/**
	 * Whether a valid manifest exists for the gallery.
	 */
	public static function has_manifest( int $post_id ): bool {
		$raw = get_post_meta( $post_id, \Modula\V2\Meta_Sync::IMAGES_V2_MANIFEST_META_KEY, true );
		if ( ! is_string( $raw ) || '' === $raw ) {
			return false;
		}
		$decoded = json_decode( $raw, true );

		return Adapter::validate_manifest( $decoded );
	}

	/**
	 * @return array<string, mixed>|null Decoded manifest or null.
	 */
	public static function read_manifest( int $post_id ): ?array {
		$raw = get_post_meta( $post_id, \Modula\V2\Meta_Sync::IMAGES_V2_MANIFEST_META_KEY, true );
		if ( ! is_string( $raw ) || '' === $raw ) {
			return null;
		}
		$decoded = json_decode( $raw, true );
		if ( ! Adapter::validate_manifest( $decoded ) ) {
			return null;
		}

		return $decoded;
	}

	/**
	 * Merge all chunk rows in manifest order (full catalog in memory).
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function read_all_rows( int $post_id ): array {
		$manifest = self::read_manifest( $post_id );
		if ( null === $manifest ) {
			return array();
		}
		$out = array();
		foreach ( $manifest['keys'] as $meta_key ) {
			if ( ! is_string( $meta_key ) ) {
				continue;
			}
			$chunk_raw = get_post_meta( $post_id, $meta_key, true );
			if ( ! is_string( $chunk_raw ) || '' === $chunk_raw ) {
				continue;
			}
			$decoded = json_decode( $chunk_raw, true );
			$rows    = Adapter::decode_chunk_items( $decoded );
			foreach ( $rows as $row ) {
				if ( is_array( $row ) ) {
					$out[] = $row;
				}
			}
		}
		return $out;
	}

	/**
	 * Delete manifest and all chunk keys listed in it (best-effort).
	 */
	public static function delete_storage( int $post_id ): void {
		$manifest = self::read_manifest( $post_id );
		delete_post_meta( $post_id, \Modula\V2\Meta_Sync::IMAGES_V2_MANIFEST_META_KEY );
		if ( is_array( $manifest ) && ! empty( $manifest['keys'] ) ) {
			foreach ( $manifest['keys'] as $meta_key ) {
				if ( is_string( $meta_key ) && '' !== $meta_key ) {
					delete_post_meta( $post_id, $meta_key );
				}
			}
		}
	}

	/**
	 * Persist normalized rows as chunks + manifest; removes primary blob meta.
	 *
	 * @param array<int, array<string, mixed>> $normalized Rows (already normalized).
	 */
	public static function persist( int $post_id, array $normalized, int $chunk_size ): void {
		$old_manifest = self::read_manifest( $post_id );
		$old_keys     = is_array( $old_manifest ) && isset( $old_manifest['keys'] ) ? $old_manifest['keys'] : array();

		$rows     = array_values( $normalized );
		$chunks   = Adapter::split_to_chunks( $rows, $chunk_size );
		$new_keys = array();

		foreach ( $chunks as $index => $chunk_rows ) {
			$key  = self::chunk_meta_key( (int) $index );
			$data = array( 'items' => array_values( $chunk_rows ) );
			$json = wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
			// wp_slash: update_post_meta() unslashes and would corrupt escaped quotes in JSON strings.
			update_post_meta( $post_id, $key, wp_slash( false !== $json ? $json : '{}' ) );
			$new_keys[] = $key;
		}

		$generation = 1;
		if ( is_array( $old_manifest ) && isset( $old_manifest['generation'] ) ) {
			$generation = absint( $old_manifest['generation'] ) + 1;
		}

		$manifest = array(
			'format'     => Adapter::MANIFEST_FORMAT,
			'version'    => Adapter::MANIFEST_VERSION,
			'chunkSize'  => max( 1, $chunk_size ),
			'totalRows'  => count( $rows ),
			'chunkCount' => count( $new_keys ),
			'keys'       => $new_keys,
			'generation' => $generation,
		);

		$manifest_json = wp_json_encode( $manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		update_post_meta(
			$post_id,
			\Modula\V2\Meta_Sync::IMAGES_V2_MANIFEST_META_KEY,
			wp_slash( false !== $manifest_json ? $manifest_json : '{}' )
		);

		foreach ( $old_keys as $old_key ) {
			if ( ! is_string( $old_key ) || '' === $old_key ) {
				continue;
			}
			if ( ! in_array( $old_key, $new_keys, true ) ) {
				delete_post_meta( $post_id, $old_key );
			}
		}

		delete_post_meta( $post_id, \Modula\V2\Meta_Sync::IMAGES_V2_META_KEY );
	}
}
