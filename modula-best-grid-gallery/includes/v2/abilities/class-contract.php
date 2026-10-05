<?php
/** Native operation contracts and closed projections, shared by every transport. */
namespace Modula\V2\Abilities;

use Modula\V2\Settings\Registry;
use Modula\V2\Settings\Settings_Schema_Document;

defined( 'ABSPATH' ) || exit;

final class Contract {
	public const VERSION = '1';

	public static function object( array $properties, array $required = array() ): array {
		return array( 'type' => 'object', 'properties' => $properties, 'required' => $required, 'additionalProperties' => false );
	}

	public static function pagination(): array {
		return array(
			'page'     => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 1000000, 'default' => 1 ),
			'per_page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20 ),
		);
	}

	public static function page_output(): array {
		return array(
			'schema_version' => array( 'type' => 'string', 'enum' => array( self::VERSION ) ),
			'page' => array( 'type' => 'integer' ), 'per_page' => array( 'type' => 'integer' ),
			'total' => array( 'type' => 'integer' ), 'total_pages' => array( 'type' => 'integer' ),
		);
	}

	public static function gallery_schema(): array {
		return self::object(
			array( 'id' => array( 'type' => 'integer' ), 'title' => array( 'type' => 'string' ),
				'status' => array( 'type' => 'string' ), 'editor_url' => array( 'type' => 'string' ),
				'shortcode' => array( 'type' => 'string' ) ),
			array( 'id', 'title', 'status', 'editor_url', 'shortcode' )
		);
	}

	/** Machine-owned secret fields are excluded even from authenticated reads. */
	private static function is_secret_key( string $key ): bool {
		$normalized = strtolower( preg_replace( '/[^a-z0-9]/i', '', $key ) );
		return in_array( $normalized, array( 'password', 'postpassword', 'apikey', 'secret', 'secretkey', 'accesskey', 'accesskeyid', 'secretaccesskey', 'token', 'accesstoken', 'refreshtoken', 'licensekey', 'credentials', 'authorization' ), true );
	}

	/** Retain JSON types/structure only; presentation, callbacks and stored defaults stay private. */
	private static function safe_definition( array $definition ): ?array {
		$type = $definition['type'] ?? '';
		if ( ! in_array( $type, array( 'string', 'integer', 'number', 'boolean', 'object', 'array' ), true ) ) {
			return null;
		}
		$out = array( 'type' => $type );
		if ( 'object' === $type ) {
			$out = self::object( self::safe_properties( $definition['properties'] ?? array() ) );
		} elseif ( 'array' === $type ) {
			$items = isset( $definition['items'] ) && is_array( $definition['items'] ) ? self::safe_definition( $definition['items'] ) : null;
			if ( null === $items ) {
				return null;
			}
			$out['items'] = $items;
		}
		return $out;
	}

	private static function safe_properties( array $definitions ): array {
		$out = array();
		foreach ( $definitions as $key => $definition ) {
			if ( ! is_string( $key ) || self::is_secret_key( $key ) || ! is_array( $definition ) || ! empty( $definition['editorPresentationOnly'] ) ) {
				continue;
			}
			$safe = self::safe_definition( $definition );
			if ( null !== $safe ) {
				$out[ $key ] = $safe;
			}
		}
		return $out;
	}

	public static function settings_schema( ?array $schema = null ): array {
		$properties = array();
		foreach ( $schema ?? Registry::get_schema() as $group => $definitions ) {
			if ( is_string( $group ) && is_array( $definitions ) && ! self::is_secret_key( $group ) ) {
				$properties[ $group ] = self::object( self::safe_properties( $definitions ) );
			}
		}
		return self::object( $properties );
	}

	public static function item_schema(): array {
		$document = Settings_Schema_Document::get_document();
		$properties = self::safe_properties( $document['items'] ?? array() );
		// Stable identities and embedded row fields supplement the image field catalog.
		$properties['id'] = array( 'type' => array( 'integer', 'string' ) );
		$properties['itemKind'] = array( 'type' => 'string', 'enum' => array( 'image', 'content_block', 'shortcode' ) );
		foreach ( array( 'embeddedId', 'blockBackgroundColor', 'blockTextColor', 'blockPaddingPreset', 'blockFontPreset', 'blockBackgroundSize', 'blockBackgroundPosition', 'blockBackgroundRepeat', 'blockBodyHtml', 'shortcodeRaw', 'description' ) as $key ) {
			$properties[ $key ] = array( 'type' => 'string' );
		}
		foreach ( array( 'afterAttachmentId', 'afterOrdinal', 'blockBackgroundImageId', 'blockBackgroundOverlayOpacity', 'gridX', 'gridY', 'gridLocked' ) as $key ) {
			$properties[ $key ] = array( 'type' => 'integer' );
		}
		return self::object( $properties, array( 'id', 'itemKind' ) );
	}

	/** Recursively exclude unknown fields and values that do not match the declared read shape. */
	public static function project( $value, array $schema ) {
		$type = $schema['type'] ?? '';
		if ( 'object' === $type ) {
			$out = array();
			if ( is_array( $value ) ) {
				foreach ( $schema['properties'] as $key => $child ) {
					if ( array_key_exists( $key, $value ) ) {
						$projected = self::project( $value[ $key ], $child );
						if ( null !== $projected ) {
							$out[ $key ] = $projected;
						}
					}
				}
			}
			return empty( $out ) ? new \stdClass() : $out;
		}
		if ( 'array' === $type ) {
			if ( ! is_array( $value ) ) {
				return null;
			}
			$out = array();
			foreach ( $value as $child ) {
				$projected = self::project( $child, $schema['items'] );
				if ( null !== $projected ) {
					$out[] = $projected;
				}
			}
			return $out;
		}
		if ( is_array( $type ) ) {
			return is_int( $value ) || is_string( $value ) ? $value : null;
		}
		if ( 'string' === $type ) {
			return is_string( $value ) ? $value : null;
		}
		if ( 'boolean' === $type ) {
			return is_bool( $value ) ? $value : null;
		}
		if ( 'integer' === $type ) {
			return is_int( $value ) ? $value : null;
		}
		return 'number' === $type && ( is_int( $value ) || is_float( $value ) ) ? $value : null;
	}

	public static function is_mutation( string $name ): bool {
		return in_array( $name, array_merge( Proofing::mutations(), Proofing_Clients::mutations(), Proofing_Selections::mutations(), array( Proofing_Email::SEND ) ), true ) || Ai_Css::GENERATE === $name || Instagram::SYNC === $name || Ai_Text::GENERATE === $name || in_array( $name, Watermark::mutations(), true ) || in_array( $name, Video::mutations(), true ) || in_array( $name, Transfers::mutations(), true ) || in_array( $name, Bound::mutations(), true ) || in_array( $name, Storage::mutations(), true ) || Replacement::WRITE === $name || in_array( $name, Diagnostics::mutations(), true ) || in_array( $name, Intake::operations(), true ) || in_array( $name, Site_Settings::mutations(), true ) || Batch::MEDIA === $name || in_array( $name, Attachment_Lifecycle::operations(), true ) || in_array( $name, Collections::mutations(), true ) || Attachments::UPDATE === $name || in_array( $name, Media_Folders::mutations(), true ) || in_array( $name, Album_Lifecycle::operations(), true ) || Album_Members::OPERATION === $name || in_array( $name, Album_Presets::mutations(), true ) || in_array( $name, Presets::mutations(), true ) || in_array( $name, Albums::mutations(), true ) || in_array( $name, array( 'modula/create-gallery', 'modula/update-gallery', Batch::OPERATION, Composition::OPERATION, Embedded::OPERATION ), true ) || in_array( $name, Lifecycle::operations(), true );
	}

	public static function revision_schema(): array {
		return array( 'type' => 'string', 'pattern' => '^[a-f0-9]{64}$' );
	}

	public static function request_id_schema(): array {
		return array( 'type' => 'string', 'minLength' => 16, 'maxLength' => 128, 'pattern' => '^[A-Za-z0-9_-]+$' );
	}

	public static function outcome_schema( bool $child = false ): array {
		$gallery = self::gallery_schema();
		$gallery['properties']['revision'] = self::revision_schema();
		$gallery['properties']['public_url'] = array( 'type' => 'string' );
		$extra = $child ? array( 'id' => array( 'type' => 'integer' ) ) : array( 'targets' => array( 'type' => 'array', 'maxItems' => 25, 'items' => self::outcome_schema( true ) ) );
		return self::object( $extra + array(
			'schema_version' => array( 'type' => 'string', 'enum' => array( self::VERSION ) ),
			'request_id' => array( 'type' => 'string' ),
			'operation' => array( 'type' => 'string' ),
			'status' => array( 'type' => 'string', 'enum' => array( 'succeeded', 'rejected', 'in_progress', 'uncertain', 'expired', 'not_found', 'conflict', 'forbidden', 'partial', 'pending' ) ),
			'code' => array( 'type' => 'string' ), 'message' => array( 'type' => 'string' ),
			'reconciliation' => array( 'type' => 'string' ),
			'expires_at' => array( 'type' => 'integer' ),
			'gallery' => $gallery,
			'album' => $gallery,
			'preset' => Presets::summary_schema(),
			'folder' => Media_Folders::folder_schema(),
			'attachment' => Attachments::summary_schema(),
			'collection' => Collections::collection_schema(),
			'intake' => Intake::result_schema(),
			'file' => Replacement::result_schema(),
			'proofing' => Proofing::result_schema(),
			'proofing_email' => Proofing_Email::result_schema(),
			'selection' => Proofing_Selections::result_schema(),
			'client' => Proofing_Clients::result_schema(),
			'watermark' => Watermark::result_schema(),
			'video' => Video::result_schema(),
			'instagram' => Instagram::result_schema(),
			'ai' => Ai_Text::result_schema(),
			'css' => Ai_Css::result_schema(),
			'storage' => Storage::result_schema(),
			'transfer' => Transfers::result_schema(),
			'diagnostics' => Diagnostics::status_schema(),
			'membership' => self::object( array( 'object_id' => array( 'type' => 'integer' ), 'object_type' => array( 'type' => 'string' ), 'folder_id' => array( 'type' => 'integer' ) ), array( 'object_id', 'object_type', 'folder_id' ) ),
			'revision' => self::revision_schema(),
			'deleted_id' => array( 'type' => 'integer' ),
		), array( 'schema_version', 'request_id', 'operation', 'status', 'code', 'message', 'reconciliation' ) );
	}

	public static function definitions(): array {
		$page = self::pagination();
		$list_input = $page + array(
			'search' => array( 'type' => 'string', 'maxLength' => 200, 'default' => '' ),
			'status' => array( 'type' => 'string', 'enum' => array( 'any', 'publish', 'draft', 'pending', 'private', 'future', 'trash' ), 'default' => 'any' ),
		);
		$read_gallery = self::gallery_schema();
		$read_gallery['properties']['settings'] = self::settings_schema();
		$read_gallery['required'][] = 'settings';
		$read_gallery['properties']['revision'] = self::revision_schema();
		$read_gallery['required'][] = 'revision';
		$operation = self::object( array(
			'name' => array( 'type' => 'string' ), 'status' => array( 'type' => 'string', 'enum' => array( 'available', 'planned', 'unavailable' ) ),
			'description' => array( 'type' => 'string' ), 'readonly' => array( 'type' => 'boolean' ),
			// These are JSON schemas, rather than arbitrary stored object data.
			'input_schema' => array( 'type' => 'object' ), 'output_schema' => array( 'type' => 'object' ),
		), array( 'name', 'status', 'description', 'readonly' ) );
		$feature = self::object( array( 'available' => array( 'type' => 'boolean' ), 'enabled' => array( 'type' => 'boolean' ) ), array( 'available', 'enabled' ) );
		$features = self::object( array(
			'lite_version' => array( 'type' => 'string' ), 'pro_version' => array( 'type' => 'string' ),
			'compatible_pro' => array( 'type' => 'boolean' ), 'license_status' => array( 'type' => 'string' ),
			'license_source' => array( 'type' => 'string', 'enum' => array( 'stored' ) ),
			'extensions' => array( 'type' => 'object', 'additionalProperties' => $feature ),
		), array( 'lite_version', 'pro_version', 'compatible_pro', 'license_status', 'license_source', 'extensions' ) );
		$lifecycle = array();
		foreach ( Lifecycle::operations() as $name ) {
			$lifecycle[ $name ] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'Explicit Beta gallery lifecycle with revision protection, 30-day recovery and shared-media preservation. Duplicate and restore require draft/publish intent. Classic or unavailable album dependencies are refused.', 'input_schema' => Lifecycle::schema( $name ), 'output_schema' => self::outcome_schema() );
		}
		return array( Batch::MEDIA => array( 'label' => 'Apply recoverable media targets', 'description' => '1–25 unique target IDs, each with operation (collection/member/favorite/local attachment mutation), id, revision and operation fields. Per-target validation and access; successes never repeat. Same revision is not refreshed implicitly between targets: later shared-organization targets may conflict and need reconciliation. No cross-target transaction. Collection creation is excluded; use the single creation operation.', 'input_schema' => Batch::schema(), 'output_schema' => self::outcome_schema() ) ) + Proofing_Email::definitions() + Proofing_Selections::definitions() + Proofing::definitions() + Proofing_Clients::definitions() + Instagram::definitions() + Watermark::definitions() + Video::definitions() + Transfers::definitions() + Bound::definitions() + Storage::definitions() + Replacement::definitions() + Diagnostics::definitions() + Server_Import::definitions() + Intake::definitions() + Site_Settings::definitions() + Attachment_Lifecycle::definitions() + Collections::definitions() + Attachment_Image::definitions() + Attachments::definitions() + Media_Folders::definitions() + Album_Lifecycle::definitions() + Album_Members::definitions() + Album_Presets::definitions() + Presets::definitions() + Albums::definitions() + $lifecycle + array(
			Batch::OPERATION => array( 'label' => 'Update Beta galleries in a batch', 'description' => 'Update 1–25 distinct targets with individual revisions and outcomes. Resume the identical input to finish pending targets; completed or uncertain targets never execute again. Retry refused targets with current revisions in a new batch identity.', 'input_schema' => Batch::schema(), 'output_schema' => self::outcome_schema() ),
			Embedded::OPERATION => array( 'label' => 'Patch Beta gallery content items', 'description' => 'Author content blocks and shortcode items and their mixed order in Lite and Compatible Pro. Preserves shared media; requires a revision and recoverable request identity.', 'input_schema' => Embedded::schema(), 'output_schema' => self::outcome_schema() ),
			Composition::OPERATION => array( 'label' => 'Patch Beta gallery images', 'description' => 'Apply 1–100 ordered image changes against a revision. Preserve omitted and embedded items and shared media text/files. Bound galleries are unsupported. Recover the original outcome for 30 days.', 'input_schema' => Composition::schema(), 'output_schema' => self::outcome_schema() ),
			'modula/update-gallery' => array( 'label' => 'Update a Beta gallery', 'description' => 'Patch selected metadata and grouped settings against a read revision. Invalid or unavailable fields reject the target. Preserve other settings and items; no attachment text, email, watermark, import or provider effects. Recover identical requests for 30 days.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema(), 'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'revision' => self::revision_schema(), 'metadata' => self::object( array( 'title' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 ), 'status' => array( 'type' => 'string', 'enum' => array( 'draft', 'publish', 'pending', 'private' ) ) ) ) + array( 'minProperties' => 1 ), 'settings' => Settings_Contract::schema() ), array( 'request_id', 'id', 'revision' ) ),
				'output_schema' => self::outcome_schema() ),
			'modula/create-gallery' => array( 'label' => 'Create a Beta gallery', 'description' => 'Create one Beta gallery from 1–100 existing image attachments with explicit draft/publish intent. Recover the same request for 30 days; never retry uncertain effects with a new identity.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema(), 'title' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 ), 'status' => array( 'type' => 'string', 'enum' => array( 'draft', 'publish' ) ), 'attachment_ids' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 100, 'uniqueItems' => true, 'items' => array( 'type' => 'integer', 'minimum' => 1 ) ) ), array( 'request_id', 'title', 'status', 'attachment_ids' ) ),
				'output_schema' => self::outcome_schema() ),
			'modula/recover-request' => array( 'label' => 'Recover a Modula request', 'description' => 'Read an actor/site-isolated request outcome with current permissions. Expired and interrupted identities cannot execute anew.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema() ), array( 'request_id' ) ), 'output_schema' => self::outcome_schema() ),
			'modula/discover' => array( 'label' => 'Discover Modula operations', 'description' => 'Read operation contracts and stored feature availability. Discovery does not authorize a target.',
				'input_schema' => self::object( $page ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ), 'output_schema' => self::object( self::page_output() + array( 'operations' => array( 'type' => 'array', 'items' => $operation ), 'features' => $features ), array_merge( array_keys( self::page_output() ), array( 'operations', 'features' ) ) ) ),
			'modula/list-galleries' => array( 'label' => 'List Beta galleries', 'description' => 'List Beta galleries the actor can administer, with access-filtered totals and pagination.',
				'input_schema' => self::object( $list_input ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ), 'output_schema' => self::object( self::page_output() + array( 'galleries' => array( 'type' => 'array', 'items' => self::gallery_schema() ) ), array_merge( array_keys( self::page_output() ), array( 'galleries' ) ) ) ),
			'modula/read-gallery' => array( 'label' => 'Read a Beta gallery', 'description' => 'Read safe grouped settings and a page of stored permitted items, without repairs or provider requests.',
				'input_schema' => self::object( $page + array( 'id' => array( 'type' => 'integer', 'minimum' => 1 ) ), array( 'id' ) ),
				'output_schema' => self::object( self::page_output() + array( 'gallery' => $read_gallery, 'items' => array( 'type' => 'array', 'items' => self::item_schema() ) ), array_merge( array_keys( self::page_output() ), array( 'gallery', 'items' ) ) ) ),
		);
	}
}
