<?php
/**
 * Gallery-local Freeform occurrence identities and catalog reconciliation.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/** Keeps duplicate attachment occurrences independent without changing attachment IDs. */
class Freeform_Catalog {
	/** Dormant composition carrier survives Classic's settings whitelist and v2 deletion. */
	const PLACEMENTS_META_KEY = '_modula_freeform_placements';

	/** Project legacy occurrence keys without saving merely because a catalog is read. */
	public static function project_identities( int $post_id, array $rows ): array {
		if ( ! $rows ) {
			return $rows;
		}
		$settings = Meta_Sync::get_settings_v2( $post_id, false );
		$saved    = $settings['freeform']['placements'] ?? get_post_meta( $post_id, self::PLACEMENTS_META_KEY, true );
		return ! empty( $saved ) ? self::identify( $rows ) : $rows;
	}
	/**
	 * Pin legacy attachment:ordinal identities on rows; preserve them across reordering/removal.
	 * Older writers may omit the optional field. Match their surviving rows to the previous catalog.
	 *
	 * @param array $rows Incoming catalog.
	 * @param array $previous Previously stored catalog.
	 * @return array Catalog with unique gallery-local freeformId fields.
	 */
	public static function identify( array $rows, array $previous = array() ): array {
		$reserved        = array();
		$pinned_families = array();
		$previous_ids    = array();
		foreach ( $previous as $row ) {
			$key = self::row_key( $row );
			$id  = self::row_identity( $row, $key );
			if ( '' !== $id ) {
				$previous_ids[ $key ][] = $id;
				$reserved[ $id ] = true;
			}
		}
		foreach ( $rows as $row ) {
			$id = self::row_identity( $row, self::row_key( $row ) );
			if ( '' !== $id ) {
				$reserved[ $id ] = true;
				$pinned_families[ self::row_key( $row ) ] = true;
			}
		}
		$used   = array();
		$counts = array();
		foreach ( $rows as &$row ) {
			$key = self::row_key( $row );
			$id  = self::row_identity( $row, $key );
			if ( '' === $id && ! isset( $pinned_families[ $key ] ) ) {
				$id = self::take_previous_identity( $previous_ids[ $key ] ?? array(), $used );
			}
			if ( '' === $id || isset( $used[ $id ] ) ) {
				$ordinal = $counts[ $key ] ?? 0;
				while ( isset( $reserved[ $key . ':' . $ordinal ] ) || isset( $used[ $key . ':' . $ordinal ] ) ) {
					++$ordinal;
				}
				$id = $key . ':' . $ordinal;
				$counts[ $key ] = $ordinal + 1;
			}
			$row['freeformId'] = $id;
			$used[ $id ] = true;
		}
		unset( $row );
		return $rows;
	}

	/** Canonical row family, matching the shared galleryItemRowKey contract. */
	private static function row_key( array $row ): string {
		$key = trim( (string) ( $row['embeddedId'] ?? $row['id'] ?? '' ) );
		if ( preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $key ) ) {
			return strtolower( $key );
		}
		return $key;
	}

	/** Reject identities from another row family or malformed optional fields. */
	private static function row_identity( array $row, string $key ): string {
		$id = $row['freeformId'] ?? '';
		if ( ! is_string( $id ) || strlen( $id ) > 200 || 0 !== strpos( $id, $key . ':' ) ) {
			return '';
		}
		return ctype_digit( substr( $id, strlen( $key ) + 1 ) ) ? $id : '';
	}

	/** Best-effort compatibility for legacy writers which do not carry occurrence fields. */
	private static function take_previous_identity( array $ids, array $used ): string {
		foreach ( $ids as $id ) {
			if ( ! isset( $used[ $id ] ) ) {
				return $id;
			}
		}
		return '';
	}

	/**
	 * Validate complete replacement against an identified catalog without coercion or writes.
	 * JSON shapes/types and scalar bounds are checked by the caller's canonical schema.
	 *
	 * @return true|\WP_Error
	 */
	public static function validate_replacement( array $rows, array $placements, int $columns ) {
		foreach ( $rows as $row ) {
			if ( ! self::can_access_row_media( $row ) ) {
				return new \WP_Error( 'current_permission_denied', 'Current access to the gallery media is required before composition authoring.' );
			}
		}
		if ( ! $placements ) {
			return true;
		}
		$identities = array_fill_keys( array_column( self::identify( $rows ), 'freeformId' ), true );
		if ( count( $placements ) !== count( $identities ) ) {
			return new \WP_Error( 'invalid_freeform_composition', 'placements must replace every current gallery occurrence exactly once.' );
		}
		$seen = array();
		foreach ( $placements as $placement ) {
			$id = $placement['id'];
			if ( isset( $seen[ $id ] ) || ! isset( $identities[ $id ] ) ) {
				return new \WP_Error( 'invalid_freeform_composition', 'placements contain a duplicate or unknown gallery occurrence.' );
			}
			if ( $placement['x'] + $placement['w'] > $columns ) {
				return new \WP_Error( 'invalid_freeform_composition', 'A Freeform rectangle exceeds the canonical horizontal surface.' );
			}
			$seen[ $id ] = true;
		}
		return true;
	}

	/** Composition changes do not grant access to images or embedded background media. */
	private static function can_access_row_media( array $row ): bool {
		foreach ( array( 'id', 'blockBackgroundImageId' ) as $key ) {
			$attachment = $row[ $key ] ?? null;
			if ( ! is_numeric( $attachment ) || (int) $attachment < 1 ) {
				continue;
			}
			$attachment = (int) $attachment;
			if ( 'attachment' !== get_post_type( $attachment ) || ! current_user_can( 'edit_post', $attachment ) || ! current_user_can( 'read_post', $attachment ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Retain authored geometry for survivors and append new rows below its lowest edge.
	 * Rows must already be identified. Bitmap dimensions are read for new tiles; nothing is persisted here.
	 *
	 * @param array $rows Identified catalog.
	 * @param array $saved Saved placements.
	 * @return array Reconciled placements in catalog order.
	 */
	public static function reconcile( array $rows, array $saved ): array {
		$by_id  = array_column( $saved, null, 'id' );
		$row_y  = 0;
		$next_z = 0;
		foreach ( $rows as $row ) {
			$id = $row['freeformId'];
			if ( ! isset( $by_id[ $id ] ) ) {
				continue;
			}
			$p      = $by_id[ $id ];
			$row_y  = max( $row_y, $p['y'] + $p['h'] );
			$next_z = max( $next_z, $p['z'] + 1 );
		}
		$appended   = 0;
		$row_height = 0;
		$placements = array();
		foreach ( $rows as $row ) {
			$id = $row['freeformId'];
			if ( isset( $by_id[ $id ] ) ) {
				$placements[] = $by_id[ $id ];
				continue;
			}
			if ( $appended > 0 && 0 === $appended % 3 ) {
				$row_y += $row_height;
				$row_height = 0;
			}
			$height = self::initial_height( $row );
			$placements[] = array( 'id' => $id, 'x' => ( $appended % 3 ) * 8, 'y' => $row_y, 'w' => 8, 'h' => $height, 'z' => $next_z );
			$row_height = max( $row_height, $height );
			++$appended;
			++$next_z;
		}
		return $placements;
	}

	/** Initial regular placement uses intrinsic bitmap aspect, with 4:3 for non-bitmaps. */
	private static function initial_height( array $row ): int {
		$metadata = is_numeric( $row['id'] ?? null ) ? wp_get_attachment_metadata( (int) $row['id'] ) : array();
		$width    = $metadata['width'] ?? 0;
		$height   = $metadata['height'] ?? 0;
		if ( $width > 0 && $height > 0 ) {
			return max( 1, (int) round( 8 * $height / $width ) );
		}
		return 6;
	}
}
