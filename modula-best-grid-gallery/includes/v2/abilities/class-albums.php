<?php
/** Album ability descriptors, object authorization and retained-result projection. */
namespace Modula\V2\Abilities;

use Modula_Pro\Extensions\Albums\V2\Meta_Sync;
use Modula_Pro\Extensions\Albums\V2\Registry;

defined( 'ABSPATH' ) || exit;

final class Albums {
	public const LIST   = 'modula/list-albums';
	public const READ   = 'modula/read-album';
	public const CREATE = 'modula/create-album';
	public const UPDATE = 'modula/update-album';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target album. */
	private const RESULTS = array( 'album' );

	public static function available(): bool {
		return Settings_Contract::extension( 'modula-albums' ) && class_exists( Meta_Sync::class );
	}

	public static function mutations(): array {
		return array( self::CREATE, self::UPDATE );
	}

	public static function callbacks(): array {
		return Album_Explanation::callbacks_for(
			array( self::LIST, self::READ, self::CREATE, self::UPDATE )
		);
	}

	/** Readiness belongs to the family, including its per-operation signature. */
	public static function executor_ready( string $name ): bool {
		$methods = array(
			self::LIST   => array( 'listing' => 1 ),
			self::READ   => array( 'read' => 1 ),
			self::CREATE => array( 'create' => 1 ),
			self::UPDATE => array( 'update' => 1 ),
		);
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Extensions\Albums\Abilities\Album_Executor', $methods[ $name ] ) && self::executor_owns_access();
	}

	/** Album executors share Pro's access check; a Pro without it still calls the one Lite no longer ships. */
	public static function executor_owns_access(): bool {
		return Pro_Dependency::methods( '\Modula_Pro\Extensions\Albums\Abilities\Album_Executor', array( 'can_access' => 3 ) );
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( self::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-albums' ),
			)
		);
	}

	public static function definitions(): array {
		$settings                          = self::settings_input_schema();
		$summary                           = Contract::gallery_schema();
		$summary['properties']['revision'] = Contract::revision_schema();
		$read                              = $summary;
		$read['properties']['settings']    = self::settings_read_schema();
		$title                             = array(
			'type'      => 'string',
			'minLength' => 1,
			'maxLength' => 200,
		);
		$status                            = array(
			'type' => 'string',
			'enum' => array( 'draft', 'publish' ),
		);
		$id                                = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$inputs                            = array(
			self::LIST   => Contract::object(
				Contract::pagination() + array(
					'search' => array(
						'type'      => 'string',
						'maxLength' => 100,
					),
					'status' => array(
						'type' => 'string',
						'enum' => array( 'any', 'draft', 'publish', 'private', 'pending', 'trash' ),
					),
				)
			) + array(
				'default' => array(
					'page'     => 1,
					'per_page' => 20,
				),
			),
			self::READ   => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			self::CREATE => Contract::object(
				array(
					'request_id' => Contract::request_id_schema(),
					'title'      => $title,
					'status'     => $status,
					'settings'   => $settings,
				),
				array( 'request_id', 'title', 'status' )
			),
			self::UPDATE => Contract::object(
				array(
					'request_id' => Contract::request_id_schema(),
					'id'         => $id,
					'revision'   => Contract::revision_schema(),
					'metadata'   => Contract::object(
						array(
							'title'  => $title,
							'status' => $status,
						)
					) + array( 'minProperties' => 1 ),
					'settings'   => $settings,
				),
				array( 'request_id', 'id', 'revision' )
			),
		);
		$out                               = array();
		foreach ( $inputs as $name => $input ) {
			if ( self::LIST === $name ) {
				$output = Contract::admitting(
					Contract::object(
						Contract::page_output() + array(
							'albums' => array(
								'type'  => 'array',
								'items' => $summary,
							),
						),
						array_merge( array_keys( Contract::page_output() ), array( 'albums' ) )
					)
				);
			} elseif ( self::READ === $name ) {
				$output = Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'album'          => $read,
						),
						array( 'schema_version', 'album' )
					)
				);
			} else {
				$output = Contract::outcome( $name, self::RESULTS );
			}
			$out[ $name ] = array(
				'label'         => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ),
				'description'   => 'Requires enabled, entitled Albums and current album permissions. Beta only. Pure paginated reads; explicit draft/publish creation. Settings patches preserve members, passwords and omitted fields. Writes use document revisions and 30-day request recovery. No containing page or member changes.',
				'input_schema'  => $input,
				'output_schema' => $output,
			);
		}
		return $out;
	}

	/** Recognized album settings when that document is loaded; otherwise any object reaches the explanation. */
	private static function settings_input_schema(): array {
		if ( ! class_exists( Registry::class, false ) ) {
			return array(
				'type'                 => 'object',
				'additionalProperties' => true,
			);
		}
		return Settings_Contract::recognized( true );
	}

	/** Projected album settings when that document is loaded. */
	private static function settings_read_schema(): array {
		if ( ! class_exists( Registry::class, false ) ) {
			return array(
				'type'                 => 'object',
				'additionalProperties' => true,
			);
		}
		return Contract::settings_schema( Registry::get_schema() );
	}

	/**
	 * Album object authorization. The album type uses core post capabilities.
	 * When that type is unregistered, primitive caps stay checkable; an existing
	 * album requires edit_others_posts, the same primitive core uses for an
	 * unmapped object capability, without emitting a capability notice.
	 */
	public static function object_access( int $id = 0, string $status = '', bool $create = false ): bool {
		if ( ! get_current_user_id() ) {
			return false;
		}
		$type          = get_post_type_object( 'modula-album' );
		$edit_posts    = $type ? $type->cap->edit_posts : 'edit_posts';
		$create_posts  = $type ? $type->cap->create_posts : 'edit_posts';
		$publish_posts = $type ? $type->cap->publish_posts : 'publish_posts';
		if ( ! current_user_can( $edit_posts ) ) {
			return false;
		}
		if ( $create && ! current_user_can( $create_posts ) ) {
			return false;
		}
		if ( 'publish' === $status && ! current_user_can( $publish_posts ) ) {
			return false;
		}
		if ( ! $id ) {
			return true;
		}
		$post = get_post( $id );
		if ( ! $post || 'modula-album' !== $post->post_type ) {
			return false;
		}
		if ( ! $type ) {
			return current_user_can( 'edit_others_posts' );
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return false;
		}
		return 'private' !== $post->post_status || current_user_can( 'read_post', $id );
	}

	/** Delete follows the registered type, or the unmapped object primitive when it is absent. */
	public static function can_delete( int $id ): bool {
		$post = get_post( $id );
		if ( ! $post || 'modula-album' !== $post->post_type || ! get_current_user_id() ) {
			return false;
		}
		if ( ! get_post_type_object( 'modula-album' ) ) {
			return current_user_can( 'edit_others_posts' );
		}
		return current_user_can( 'delete_post', $id );
	}

	/** Retained inspection does not require the Pro executor or current Albums entitlement. */
	public static function can_recover( array $record ): bool {
		return self::object_access( (int) ( $record['target'] ?? 0 ), (string) ( $record['publication'] ?? '' ), self::CREATE === ( $record['operation'] ?? '' ) );
	}

	public static function summary( int $id ): array {
		$post = get_post( $id );
		return array(
			'id'         => $id,
			'title'      => $post->post_title,
			'status'     => $post->post_status,
			'editor_url' => admin_url( 'post.php?post=' . $id . '&action=edit' ),
			'shortcode'  => '[modula-album id="' . $id . '"]',
			'revision'   => Revision::document( $id ),
		);
	}
}
