<?php
/** Ordered image patches; embedded items and shared media remain outside this operation. */
namespace Modula\V2\Abilities;

use Modula\V2\Meta_Sync;
use Modula\V2\Images\Adapter;

defined( 'ABSPATH' ) || exit;

final class Composition {
	public const OPERATION = 'modula/update-gallery-images';

	/** Shared custom-grid contract for image and authored gallery items. */
	public static function layout_fields(): array {
		return array(
			'width' => array( 'type' => 'integer', 'minimum' => 2, 'maximum' => 12 ),
			'height' => array( 'type' => 'integer', 'minimum' => 2, 'maximum' => 1000 ),
			'gridX' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 10 ),
			'gridY' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 100000 ),
			'gridLocked' => array( 'type' => 'integer', 'enum' => array( 0, 1 ) ),
		);
	}

	public static function schema(): array {
		$identity = array( 'type' => 'integer', 'minimum' => 1 );
		$fields = self::layout_fields() + array(
			'halign' => array( 'type' => 'string', 'enum' => array( 'left', 'center', 'right' ) ),
			'valign' => array( 'type' => 'string', 'enum' => array( 'top', 'middle', 'bottom' ) ),
			'tile_image_fit' => array( 'type' => 'string', 'enum' => array( 'cover', 'contain' ) ),
			'link' => array( 'type' => 'string', 'maxLength' => 2000 ),
			'target' => array( 'type' => 'integer', 'enum' => array( 0, 1 ) ),
		);
		return Contract::object( array(
			'request_id' => Contract::request_id_schema(), 'id' => $identity,
			'revision' => Contract::revision_schema(),
			'changes' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 100,
				'items' => Contract::object( array(
					'action' => array( 'type' => 'string', 'enum' => array( 'add', 'update', 'remove', 'move' ) ),
					'id' => $identity, 'before_id' => $identity,
					'fields' => Contract::object( $fields ) + array( 'minProperties' => 1 ),
				), array( 'action', 'id' ) ) ),
		), array( 'request_id', 'id', 'revision', 'changes' ) );
	}

	/** One reference set for admission/recovery authorization and mutation locks. */
	public static function referenced_attachment_ids( array $changes ): array {
		return array_values( array_unique( array_merge( array_column( $changes, 'id' ), array_column( $changes, 'before_id' ) ) ) );
	}

	public static function execute( array $input ): array {
		return Update::execute( $input );
	}

	/** Identities are attachment IDs; ambiguous existing duplicates cannot be targeted. */
	private static function index( array $items, int $id ): int {
		$matches = array();
		foreach ( $items as $index => $row ) {
			if ( (string) ( $row['id'] ?? '' ) === (string) $id ) {
				if ( Adapter::is_embedded_gallery_item( $row ) || Adapter::is_video_template_row( $row ) ) {
					return -2;
				}
				$matches[] = $index;
			}
		}
		return count( $matches ) > 1 ? -2 : ( $matches[0] ?? -1 );
	}

	private static function invalid( string $message ): \WP_Error {
		return new \WP_Error( 'invalid_composition', $message );
	}

	/** Build the complete proposal under revision locks, before any target write. */
	public static function prepare( int $id, array $changes ) {
		if ( get_post_meta( $id, '_modula_bind_target_type', true ) ) {
			return new \WP_Error( 'unsupported_bound_target', 'Bound composition requires the source-aware operations.' );
		}
		$items = Meta_Sync::get_images_v2( $id );
		$placed = array();
		if ( ! class_exists( 'Modula_Gallery_Upload', false ) ) {
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php';
		}
		foreach ( $changes as $change ) {
			$action = $change['action'];
			$fields = $change['fields'] ?? array();
			if ( ( isset( $change['before_id'] ) && ! in_array( $action, array( 'add', 'move' ), true ) ) ||
				( isset( $change['fields'] ) && ! in_array( $action, array( 'add', 'update' ), true ) ) ||
				( 'update' === $action && ! $fields ) ) {
				return self::invalid( 'fields apply only to add/update (required for update); before_id applies only to add/move.' );
			}
			if ( ! Creation::can_use_attachments( array( $change['id'] ) ) ) {
				return new \WP_Error( 'invalid_attachments', 'Every changed image must be an accessible existing image attachment.' );
			}
			$index = self::index( $items, $change['id'] );
			if ( ( 'add' === $action && -1 !== $index ) || ( 'add' !== $action && $index < 0 ) ) {
				return self::invalid( 'add needs an absent attachment; other actions need exactly one existing image row.' );
			}
			if ( 'remove' === $action ) {
				array_splice( $items, $index, 1 );
				continue;
			}
			if ( isset( $fields['link'] ) && $fields['link'] !== esc_url_raw( $fields['link'], array( 'http', 'https', 'mailto', 'tel' ) ) ) {
				return self::invalid( 'link must be a safe URL; unsafe or silently rewritten values are rejected.' );
			}
			$row = 'add' === $action ? \Modula_Gallery_Upload::get_instance()->build_attachment_image_row( $id, $change['id'], false ) : $items[ $index ];
			if ( is_wp_error( $row ) ) { return $row; }
			$row = array_replace( $row, $fields );
			if ( 'add' === $action ) {
				$row = Adapter::normalize_item_row( Adapter::strip_bootstrap_only_row_keys( $row ) );
			}
			if ( array_intersect( array_keys( $fields ), array( 'width', 'height', 'gridX', 'gridY', 'gridLocked' ) ) ) {
				$placed[ $change['id'] ] = true;
			}
			if ( 'update' === $action ) {
				$items[ $index ] = $row;
				continue;
			}
			if ( 'move' === $action ) { array_splice( $items, $index, 1 ); }
			$before = count( $items );
			if ( isset( $change['before_id'] ) ) {
				$before = self::index( $items, $change['before_id'] );
				if ( $before < 0 || ! Creation::can_use_attachments( array( $change['before_id'] ) ) ) {
					return self::invalid( 'before_id must identify one other accessible image in the current proposal.' );
				}
			}
			array_splice( $items, $before, 0, array( $row ) );
		}
		return self::validate_cells( $items, $placed );
	}

	/** Validate changed cells against the complete final mixed catalog. */
	public static function validate_cells( array $items, array $placed ) {
		foreach ( $items as $index => $row ) {
			if ( empty( $placed[ $row['id'] ] ) ) { continue; }
			$w = (int) ( $row['width'] ?? 2 );
			$h = (int) ( $row['height'] ?? 2 );
			$x = $row['gridX'] ?? null;
			$y = $row['gridY'] ?? null;
			$has_x = null !== $x && '' !== $x;
			$has_y = null !== $y && '' !== $y;
			if ( $w < 2 || $w > 12 || $h < 2 || $h > 1000 || $has_x !== $has_y || ( $has_x && ( $x < 0 || $y < 0 || $y > 100000 || $x + $w > 12 ) ) ) {
				return self::invalid( 'Custom-grid cells need 2–12 columns, 2–1000 rows, paired nonnegative origins and x + width <= 12.' );
			}
			if ( ! $has_x ) { continue; }
			foreach ( $items as $other_index => $other ) {
				if ( $other_index === $index || ! isset( $other['gridX'], $other['gridY'] ) || '' === $other['gridX'] || '' === $other['gridY'] ) { continue; }
				if ( $x < $other['gridX'] + ( $other['width'] ?? 2 ) && $x + $w > $other['gridX'] && $y < $other['gridY'] + ( $other['height'] ?? 2 ) && $y + $h > $other['gridY'] ) {
					return self::invalid( 'Changed cells must not overlap another explicitly positioned item.' );
				}
			}
		}
		return $items;
	}
}
