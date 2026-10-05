<?php
/** Authored content blocks and shortcode items, sharing the gallery write boundary. */
namespace Modula\V2\Abilities;

use Modula\V2\Images\Adapter;
use Modula\V2\Meta_Sync;

defined( 'ABSPATH' ) || exit;

final class Embedded {
	public const OPERATION = 'modula/update-gallery-items';

	private static function layout_fields(): array {
		return Composition::layout_fields();
	}

	private static function content_fields(): array {
		return array(
			'title' => array( 'type' => 'string', 'maxLength' => 200 ),
			'description' => array( 'type' => 'string', 'maxLength' => 5000 ),
			'blockBodyHtml' => array( 'type' => 'string', 'maxLength' => 50000 ),
			'blockBackgroundColor' => array( 'type' => 'string', 'maxLength' => 80 ),
			'blockTextColor' => array( 'type' => 'string', 'pattern' => '^(|#[a-fA-F0-9]{3}|#[a-fA-F0-9]{6})$' ),
			'blockPaddingPreset' => array( 'type' => 'string', 'enum' => array( 'tight', 'default', 'medium', 'generous' ) ),
			'blockFontPreset' => array( 'type' => 'string', 'enum' => class_exists( 'Modula_Frontend_Adapter' ) ? \Modula_Frontend_Adapter::content_block_font_preset_keys() : array( 'default', 'serif', 'mono', 'display' ) ),
			'blockBackgroundImageId' => array( 'type' => 'integer', 'minimum' => 0 ),
			'blockBackgroundOverlayOpacity' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 100 ),
			'blockBackgroundSize' => array( 'type' => 'string', 'enum' => array( 'cover', 'contain', 'auto' ) ),
			'blockBackgroundPosition' => array( 'type' => 'string', 'enum' => array( 'center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right' ) ),
			'blockBackgroundRepeat' => array( 'type' => 'string', 'enum' => array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' ) ),
		);
	}

	public static function schema(): array {
		$identity = array( 'type' => array( 'integer', 'string' ), 'minimum' => 1, 'minLength' => 1, 'maxLength' => 100, 'pattern' => '^[a-zA-Z0-9][a-zA-Z0-9_-]*$' );
		return Contract::object( array(
			'request_id' => Contract::request_id_schema(),
			'id' => array( 'type' => 'integer', 'minimum' => 1 ),
			'revision' => Contract::revision_schema(),
			'item_changes' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 100,
				'items' => Contract::object( array(
					'action' => array( 'type' => 'string', 'enum' => array( 'add', 'update', 'remove', 'move' ) ),
					'id' => $identity, 'before_id' => $identity,
					'kind' => array( 'type' => 'string', 'enum' => array( 'content_block', 'shortcode' ) ),
					'fields' => Contract::object( self::layout_fields() + self::content_fields() + array( 'shortcodeRaw' => array( 'type' => 'string', 'maxLength' => 10000 ) ) ) + array( 'minProperties' => 1 ),
				), array( 'action', 'id' ) ) ),
		), array( 'request_id', 'id', 'revision', 'item_changes' ) );
	}

	public static function execute( array $input ): array {
		return Update::execute( $input );
	}

	/** Only numeric image references are attachment identities. */
	public static function referenced_attachment_ids( array $changes ): array {
		$ids = array();
		foreach ( $changes as $change ) {
			foreach ( array( $change['id'], $change['before_id'] ?? null, $change['fields']['blockBackgroundImageId'] ?? null ) as $id ) {
				if ( is_int( $id ) && $id > 0 ) { $ids[] = $id; }
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/** Ambiguous and video-template identities cannot be targeted or used as anchors. */
	private static function index( array $items, $id ): int {
		$matches = array();
		foreach ( $items as $index => $row ) {
			if ( (string) ( $row['id'] ?? '' ) === (string) $id ) {
				if ( Adapter::is_video_template_row( $row ) || is_int( $id ) === Adapter::is_embedded_gallery_item( $row ) ) { return -2; }
				$matches[] = $index;
			}
		}
		return count( $matches ) > 1 ? -2 : ( $matches[0] ?? -1 );
	}

	private static function invalid( string $message ): \WP_Error {
		return new \WP_Error( 'invalid_items', $message );
	}

	/** Prepare the whole proposal without executing authored HTML or shortcodes. */
	public static function prepare( int $id, array $changes ) {
		$items = Meta_Sync::get_images_v2( $id );
		$placed = array();
		$reorder = false;
		if ( ! Creation::can_use_attachments( self::referenced_attachment_ids( $changes ) ) ) {
			return new \WP_Error( 'invalid_attachments', 'Image references require accessible existing image attachments.' );
		}
		foreach ( $changes as $change ) {
			$action = $change['action'];
			$fields = $change['fields'] ?? array();
			if ( ( 'add' === $action && is_string( $change['id'] ) && 0 === strpos( $change['id'], 'video_template_' ) ) || ( is_string( $change['id'] ) && is_numeric( $change['id'] ) ) || ( isset( $change['before_id'] ) && is_string( $change['before_id'] ) && is_numeric( $change['before_id'] ) ) ||
				( is_int( $change['id'] ) && 'move' !== $action ) ||
				( isset( $change['kind'] ) !== ( 'add' === $action ) ) ||
				( isset( $change['fields'] ) && ! in_array( $action, array( 'add', 'update' ), true ) ) ||
				( isset( $change['before_id'] ) && ! in_array( $action, array( 'add', 'move' ), true ) ) || ( 'update' === $action && ! $fields ) ) {
				return self::invalid( 'Add requires a string id and kind; update requires fields. Only add/move accept before_id; images can only move.' );
			}
			$index = self::index( $items, $change['id'] );
			if ( ( 'add' === $action && -1 !== $index ) || ( 'add' !== $action && $index < 0 ) ) {
				return self::invalid( 'Add requires an absent identity; other actions require one unambiguous existing item.' );
			}
			$reorder = $reorder || 'update' !== $action;
			if ( 'remove' === $action ) {
				array_splice( $items, $index, 1 );
				continue;
			}
			$row = 'add' === $action ? array( 'id' => $change['id'], 'embeddedId' => $change['id'], 'itemKind' => $change['kind'], 'width' => 'content_block' === $change['kind'] ? 4 : 2, 'height' => 2, 'blockBackgroundColor' => 'rgba(232, 234, 237, 1)' ) : $items[ $index ];
			if ( in_array( $action, array( 'add', 'update' ), true ) ) {
				$allowed = self::layout_fields() + ( 'content_block' === Adapter::get_item_kind( $row ) ? self::content_fields() : array( 'shortcodeRaw' => true ) );
				if ( array_diff_key( $fields, $allowed ) ) { return self::invalid( 'Fields must belong to the item kind; kinds and identities cannot be converted.' ); }
				if ( isset( $fields['blockBackgroundColor'] ) && '' !== trim( $fields['blockBackgroundColor'] ) && 'transparent' !== strtolower( trim( $fields['blockBackgroundColor'] ) ) && '' === \Modula_Helper::sanitize_rgba_colour( $fields['blockBackgroundColor'] ) ) {
					return self::invalid( 'Background color must be a supported hex, rgb, rgba or transparent value.' );
				}
				$normalized = Adapter::normalize_embedded_row( array_replace( $row, $fields ) );
				if ( 'add' === $action ) { $row = $normalized; }
				else {
					foreach ( $fields as $key => $value ) {
						if ( array_key_exists( $key, $normalized ) ) {
							$row[ $key ] = $normalized[ $key ];
						} else {
							unset( $row[ $key ] );
						}
					}
				}
				if ( array_intersect_key( $fields, self::layout_fields() ) ) { $placed[ $change['id'] ] = true; }
			}
			if ( 'update' === $action ) { $items[ $index ] = $row; continue; }
			if ( 'move' === $action ) { array_splice( $items, $index, 1 ); }
			$before = isset( $change['before_id'] ) ? self::index( $items, $change['before_id'] ) : count( $items );
			if ( $before < 0 ) { return self::invalid( 'before_id must identify one other item in the current proposal.' ); }
			array_splice( $items, $before, 0, array( $row ) );
		}
		if ( $reorder ) { $items = self::reanchor( $items ); }
		return Composition::validate_cells( $items, $placed );
	}

	/** Match editor anchors so later ordinary image saves preserve the mixed order. */
	private static function reanchor( array $items ): array {
		$attachment = 0;
		$ordinal = 0;
		$counts = array();
		foreach ( $items as &$row ) {
			if ( Adapter::is_embedded_gallery_item( $row ) ) {
				$row['afterAttachmentId'] = $attachment;
				$row['afterOrdinal'] = $ordinal;
			} elseif ( ! Adapter::is_video_template_row( $row ) && ! empty( $row['id'] ) ) {
				$attachment = (int) $row['id'];
				$ordinal = $counts[ $attachment ] ?? 0;
				$counts[ $attachment ] = $ordinal + 1;
			}
		}
		return $items;
	}
}
