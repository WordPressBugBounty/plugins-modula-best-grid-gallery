<?php
/** Native operation contracts and closed projections, shared by every transport. */
namespace Modula\V2\Abilities;

use Modula\V2\Settings\Registry;
use Modula\V2\Settings\Settings_Schema_Document;

defined( 'ABSPATH' ) || exit;

final class Contract {
	public const VERSION = '1';

	/** Outcome properties any operation may return; the first seven are always present. */
	private const ENVELOPE = array( 'schema_version', 'request_id', 'operation', 'status', 'code', 'message', 'reconciliation', 'expires_at', 'revision', 'blockers', 'recommendation' );

	/** What the gallery operations' executors set; recovery adds the same object for their target. */
	private const GALLERY_RESULTS = array( 'gallery' );

	public static function object( array $properties, array $required = array() ): array {
		return array( 'type' => 'object', 'properties' => $properties, 'required' => $required, 'additionalProperties' => false );
	}

	/** Success payload or a blocked explanation. The two shapes do not overlap. */
	public static function admitting( array $success ): array {
		// Read explanations carry blockers and a recommendation, never a result object.
		return array(
			'oneOf' => array( $success, self::outcome_object( array() ) ),
		);
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

	/** Retain public JSON types, structure and descriptions; callbacks and stored defaults stay private. */
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
		if ( isset( $definition['description'] ) && is_string( $definition['description'] ) ) {
			$out['description'] = $definition['description'];
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

		$properties['freeformId'] = array(
			'type'        => 'string',
			'description' => 'Gallery-local occurrence identity for Freeform placements, independent of attachment identity and catalog order.',
		);

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

	/**
	 * Any operation's outcome: every result object, and batch targets. Only request recovery,
	 * which can return any stored outcome, advertises it; operations declare theirs with outcome().
	 */
	public static function outcome_schema(): array {
		$results = array_keys( self::results() );
		return self::outcome_object( $results, self::targets( $results ) );
	}

	/**
	 * One operation's outcome: the envelope, the result objects its executors set, and the object
	 * request recovery reports for the operation's target (Requests::target_result()).
	 *
	 * @param array<int,string> $results Keys of results().
	 */
	public static function outcome( string $operation, array $results ): array {
		$target = Requests::target_result( $operation );
		return self::outcome_object( null === $target ? $results : array_merge( $results, array( $target ) ) );
	}

	/**
	 * A batch outcome: the envelope and up to 25 targets, each the outcome of one child operation.
	 *
	 * @param array<int,string> $operations Child operations.
	 * @param array<int,string> $results    Result keys those operations declare.
	 */
	public static function batch_outcome( array $operations, array $results ): array {
		foreach ( $operations as $operation ) {
			$target = Requests::target_result( $operation );
			if ( null !== $target ) {
				$results[] = $target;
			}
		}
		return self::outcome_object( array(), self::targets( $results ) );
	}

	/**
	 * Result objects an outcome can carry, keyed by outcome property. ai and css stay for outcomes
	 * stored before their operations retired; request recovery can still return them.
	 *
	 * @return array<string,array>
	 */
	public static function results(): array {
		// Its builders read no state, and the settings Registry they reach is cached for the process.
		static $results = null;
		if ( is_array( $results ) ) {
			return $results;
		}
		$gallery                             = self::gallery_schema();
		$gallery['properties']['revision']   = self::revision_schema();
		$gallery['properties']['public_url'] = array( 'type' => 'string' );
		$membership                          = self::object(
			array(
				'object_id'   => array( 'type' => 'integer' ),
				'object_type' => array( 'type' => 'string' ),
				'folder_id'   => array( 'type' => 'integer' ),
			),
			array( 'object_id', 'object_type', 'folder_id' )
		);
		$results                             = array(
			'gallery'        => $gallery,
			'album'          => $gallery,
			'preset'         => Presets::summary_schema(),
			'folder'         => Media_Folders::folder_schema(),
			'attachment'     => Attachments::summary_schema(),
			'collection'     => Collections::collection_schema(),
			'intake'         => Intake::result_schema(),
			'file'           => Replacement::result_schema(),
			'proofing'       => Proofing::result_schema(),
			'proofing_email' => Proofing_Email::result_schema(),
			'selection'      => Proofing_Selections::result_schema(),
			'client'         => Proofing_Clients::result_schema(),
			'watermark'      => Watermark::result_schema(),
			'video'          => Video::result_schema(),
			'instagram'      => Instagram::result_schema(),
			'ai'             => Ai_Text::result_schema(),
			'css'            => Ai_Css::result_schema(),
			'storage'        => Storage::result_schema(),
			'transfer'       => Transfers::result_schema(),
			'diagnostics'    => Diagnostics::status_schema(),
			'membership'     => $membership,
			'deleted_id'     => array( 'type' => 'integer' ),
		);
		return $results;
	}

	/**
	 * A closed outcome object with the envelope and the named results. Unknown names fail when the
	 * catalog is built, so a family cannot declare a result the contract does not define.
	 *
	 * @param array<int,string>   $results Keys of results().
	 * @param array<string,array> $extra   Leading properties: batch targets, or a target's id.
	 */
	private static function outcome_object( array $results, array $extra = array() ): array {
		$unknown = array_diff( $results, array_keys( self::results() ) );
		if ( array() !== $unknown ) {
			throw new \InvalidArgumentException( 'Unknown outcome result: ' . esc_html( implode( ', ', $unknown ) ) );
		}
		$properties = array_intersect_key( self::outcome_properties(), array_flip( array_merge( self::ENVELOPE, $results ) ) );
		return self::object( $extra + $properties, array_slice( self::ENVELOPE, 0, 7 ) );
	}

	/** @param array<int,string> $results Keys of results() each target can carry. */
	private static function targets( array $results ): array {
		return array(
			'targets' => array(
				'type'     => 'array',
				'maxItems' => 25,
				'items'    => self::outcome_object( $results, array( 'id' => array( 'type' => 'integer' ) ) ),
			),
		);
	}

	/** Every envelope and result property, in published order. */
	private static function outcome_properties(): array {
		static $properties = null;
		if ( is_array( $properties ) ) {
			return $properties;
		}
		$blocker = self::object(
			array(
				'reason'  => array( 'type' => 'string', 'enum' => array( 'needs_pro', 'needs_plan_upgrade', 'needs_enable', 'needs_pro_update', 'needs_service_update', 'dependency_unavailable', 'configuration_required', 'permission_denied', 'unsupported_context' ) ),
				'feature' => array( 'type' => 'string' ),
				'path'    => array( 'type' => 'string' ),
				'value'   => array( 'type' => array( 'string', 'integer', 'boolean' ) ),
				'remedy'  => self::object(
					array(
						'action'      => array( 'type' => 'string' ),
						'explanation' => array( 'type' => 'string' ),
						'destination' => array( 'type' => 'string' ),
					),
					array( 'action', 'explanation' )
				),
			),
			array( 'reason', 'feature', 'remedy' )
		);
		$recommendation = self::object(
			array(
				'id'          => array( 'type' => 'string' ),
				'feature'     => array( 'type' => 'string' ),
				'message'     => array( 'type' => 'string' ),
				'relevance'   => array( 'type' => 'string' ),
				'action'      => array( 'type' => 'string' ),
				'destination' => array( 'type' => 'string' ),
				'hint'        => array( 'type' => 'string', 'enum' => array( 'after_result' ) ),
			),
			array( 'id', 'feature', 'message', 'hint' )
		);

		$properties = array(
			'schema_version' => array(
				'type' => 'string',
				'enum' => array( self::VERSION ),
			),
			'request_id'     => array( 'type' => 'string' ),
			'operation'      => array( 'type' => 'string' ),
			'status'         => array(
				'type' => 'string',
				'enum' => array( 'succeeded', 'rejected', 'in_progress', 'uncertain', 'expired', 'not_found', 'conflict', 'forbidden', 'partial', 'pending' ),
			),
			'code'           => array( 'type' => 'string' ),
			'message'        => array( 'type' => 'string' ),
			'reconciliation' => array( 'type' => 'string' ),
			'expires_at'     => array( 'type' => 'integer' ),
			'revision'       => self::revision_schema(),
			'blockers'       => array(
				'type'  => 'array',
				'items' => $blocker,
			),
			'recommendation' => $recommendation,
		) + self::results();
		return $properties;
	}

	public static function definitions(): array {
		// Rebuilt on every input check, this catalog held admission past the editor's overlapping save.
		static $cached = null;
		if ( is_array( $cached ) ) {
			return $cached;
		}
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
			'owner' => array( 'type' => 'string', 'enum' => array( 'lite', 'pro' ) ),
			'lifecycle' => array( 'type' => 'string', 'enum' => array( 'active', 'retired' ) ),
			'availability' => array( 'type' => 'string', 'enum' => array( 'executable', 'explanatory', 'planned' ) ),
			'provider' => array( 'type' => 'string' ),
			'features' => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
			'plans' => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
			'blockers' => array( 'type' => 'array' ),
			// These are JSON schemas, rather than arbitrary stored object data.
			'input_schema' => array( 'type' => 'object' ), 'output_schema' => array( 'type' => 'object' ),
		), array( 'name', 'status', 'description', 'readonly' ) );
		$feature = self::object( array( 'available' => array( 'type' => 'boolean' ), 'enabled' => array( 'type' => 'boolean' ), 'service_ready' => array( 'type' => 'boolean' ) ), array( 'available', 'enabled' ) );
		$features = self::object( array(
			'lite_version' => array( 'type' => 'string' ), 'pro_version' => array( 'type' => 'string' ),
			'compatible_pro' => array( 'type' => 'boolean' ),
			'pro_state' => array( 'type' => 'string', 'enum' => array( 'absent', 'incompatible', 'compatible' ) ),
			'service_ready' => array( 'type' => 'boolean' ),
			'license_status' => array( 'type' => 'string' ),
			'license_source' => array( 'type' => 'string', 'enum' => array( 'stored' ) ),
			'extensions' => array( 'type' => 'object', 'additionalProperties' => $feature ),
			'folders_ready' => array( 'type' => 'boolean' ),
			'capability_protocol' => array( 'type' => 'integer' ),
			'plan_map_consistent' => array( 'type' => 'boolean' ),
			'authorization_scope' => array( 'type' => 'string' ),
		), array( 'lite_version', 'pro_version', 'compatible_pro', 'license_status', 'license_source', 'extensions' ) );
		$lifecycle = array();
		foreach ( Lifecycle::operations() as $name ) {
			$lifecycle[ $name ] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'Explicit Beta gallery lifecycle with revision protection, 30-day recovery and shared-media preservation. Duplicate and restore require draft/publish intent. Classic or unavailable album dependencies are refused.', 'input_schema' => Lifecycle::schema( $name ), 'output_schema' => self::outcome( $name, array_merge( self::GALLERY_RESULTS, array( 'deleted_id' ) ) ) );
		}
		$cached = array( Batch::MEDIA => array( 'label' => 'Apply recoverable media targets', 'description' => '1–25 unique target IDs, each with operation (collection/member/favorite/local attachment mutation), id, revision and operation fields. Per-target validation and access; successes never repeat. Same revision is not refreshed implicitly between targets: later shared-organization targets may conflict and need reconciliation. No cross-target transaction. Collection creation is excluded; use the single creation operation.', 'input_schema' => Batch::schema(), 'output_schema' => self::batch_outcome( Batch::media_operations(), Batch::media_results() ) ) ) + Proofing_Email::definitions() + Proofing_Selections::definitions() + Proofing::definitions() + Proofing_Clients::definitions() + Instagram::definitions() + Watermark::definitions() + Video::definitions() + Transfers::definitions() + Bound::definitions() + Storage::definitions() + Replacement::definitions() + Diagnostics::definitions() + Server_Import::definitions() + Intake::definitions() + Site_Settings::definitions() + Attachment_Lifecycle::definitions() + Collections::definitions() + Attachment_Image::definitions() + Attachments::definitions() + Media_Folders::definitions() + Album_Lifecycle::definitions() + Album_Members::definitions() + Album_Presets::definitions() + Presets::definitions() + Albums::definitions() + $lifecycle + array(
			Batch::OPERATION => array( 'label' => 'Update Beta galleries in a batch', 'description' => 'Update 1–25 distinct targets with individual revisions and outcomes. Resume the identical input to finish pending targets; completed or uncertain targets never execute again. Retry refused targets with current revisions in a new batch identity.', 'input_schema' => Batch::schema(), 'output_schema' => self::batch_outcome( array( Update::OPERATION ), self::GALLERY_RESULTS ) ),
			Embedded::OPERATION => array( 'label' => 'Patch Beta gallery content items', 'description' => 'Author content blocks and shortcode items and their mixed order in Lite and Compatible Pro. Preserves shared media; requires a revision and recoverable request identity.', 'input_schema' => Embedded::schema(), 'output_schema' => self::outcome( Embedded::OPERATION, self::GALLERY_RESULTS ) ),
			Composition::OPERATION => array( 'label' => 'Patch Beta gallery images', 'description' => 'Apply 1–100 ordered image changes against a revision. Preserve omitted and embedded items and shared media text/files. Bound galleries are unsupported. Recover the original outcome for 30 days.', 'input_schema' => Composition::schema(), 'output_schema' => self::outcome( Composition::OPERATION, self::GALLERY_RESULTS ) ),
			'modula/update-gallery' => array( 'label' => 'Update a Beta gallery', 'description' => 'Patch selected metadata and grouped settings against a read revision. Known locked fields and values return their feature requirement and save nothing on that target. Unknown fields, invalid values and secrets stay invalid. Preserve omitted settings and items; no attachment text, email, watermark, import or provider effects. Recover identical requests for 30 days.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema(), 'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'revision' => self::revision_schema(), 'metadata' => self::object( array( 'title' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 ), 'status' => array( 'type' => 'string', 'enum' => array( 'draft', 'publish', 'pending', 'private' ) ) ) ) + array( 'minProperties' => 1 ), 'settings' => Settings_Contract::recognized() ), array( 'request_id', 'id', 'revision' ) ),
				'output_schema' => self::outcome( Update::OPERATION, self::GALLERY_RESULTS ) ),
			'modula/create-gallery' => array( 'label' => 'Create a Beta gallery', 'description' => 'Create one Beta gallery from 1–100 existing image attachments with explicit draft/publish intent. Recover the same request for 30 days; never retry uncertain effects with a new identity.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema(), 'title' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 ), 'status' => array( 'type' => 'string', 'enum' => array( 'draft', 'publish' ) ), 'attachment_ids' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 100, 'uniqueItems' => true, 'items' => array( 'type' => 'integer', 'minimum' => 1 ) ) ), array( 'request_id', 'title', 'status', 'attachment_ids' ) ),
				'output_schema' => self::outcome( Creation::OPERATION, self::GALLERY_RESULTS ) ),
			'modula/recover-request' => array( 'label' => 'Recover a Modula request', 'description' => 'Read an actor/site-isolated request outcome with current permissions. Expired and interrupted identities cannot execute anew.',
				'input_schema' => self::object( array( 'request_id' => self::request_id_schema() ), array( 'request_id' ) ), 'output_schema' => self::outcome_schema() ),
			'modula/discover' => array( 'label' => 'Discover Modula operations', 'description' => 'Read operation contracts, the recognized gallery setting vocabulary, the currently usable subset and stored feature availability. Discovery does not authorize a target.',
				'input_schema' => self::object( $page ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ), 'output_schema' => self::object( self::page_output() + array( 'capability_protocol' => array( 'type' => 'integer' ), 'operations' => array( 'type' => 'array', 'items' => $operation ), 'features' => $features, 'inventory' => array( 'type' => 'array' ), 'gallery_settings' => array( 'type' => 'object', 'properties' => array( 'recognized' => array( 'type' => 'object' ), 'usable' => array( 'type' => 'object' ), 'requirements' => array( 'type' => 'array' ) ), 'required' => array( 'recognized', 'usable', 'requirements' ), 'additionalProperties' => false ) ), array_merge( array_keys( self::page_output() ), array( 'operations', 'features', 'gallery_settings' ) ) ) ),
			'modula/list-galleries' => array( 'label' => 'List Beta galleries', 'description' => 'List Beta galleries the actor can administer, with access-filtered totals and pagination.',
				'input_schema' => self::object( $list_input ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ), 'output_schema' => self::object( self::page_output() + array( 'galleries' => array( 'type' => 'array', 'items' => self::gallery_schema() ) ), array_merge( array_keys( self::page_output() ), array( 'galleries' ) ) ) ),
			'modula/read-gallery' => array( 'label' => 'Read a Beta gallery', 'description' => 'Read safe grouped settings, stored Freeform composition and a page of permitted items with stable gallery-local freeformId identities. Stored layout type is independent of visitor fallback; reads never pin identities or initialize placements.',
				'input_schema' => self::object( $page + array( 'id' => array( 'type' => 'integer', 'minimum' => 1 ) ), array( 'id' ) ),
				'output_schema' => self::object( self::page_output() + array( 'gallery' => $read_gallery, 'items' => array( 'type' => 'array', 'items' => self::item_schema() ), 'request_id' => array( 'type' => 'string' ), 'operation' => array( 'type' => 'string' ), 'code' => array( 'type' => 'string' ), 'message' => array( 'type' => 'string' ), 'blockers' => array( 'type' => 'array' ), 'reconciliation' => array( 'type' => 'string' ) ), array_merge( array_keys( self::page_output() ), array( 'gallery', 'items' ) ) ) ),
		);
		return $cached;
	}
}
