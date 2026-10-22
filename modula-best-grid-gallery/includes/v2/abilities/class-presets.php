<?php
/** Gallery preset descriptors, object authorization and retained-result projection. */
namespace Modula\V2\Abilities;

use Modula_Pro\Extensions\Defaults\Utils\Preset_Storage;

defined( 'ABSPATH' ) || exit;

class Presets {
	protected const FAMILY    = 'gallery';
	protected const POST_TYPE = 'modula-defaults';
	public const APPLY        = 'modula/apply-gallery-preset';
	public const BATCH        = 'modula/apply-gallery-presets';
	public const DELETE       = 'modula/delete-gallery-preset';

	/** Outcome results the Pro executor sets for a preset write; Contract::outcome() adds the target preset. */
	private const RESULTS = array( 'preset', 'deleted_id' );

	public static function name( string $verb ): string {
		return 'modula/' . $verb . '-' . static::FAMILY . '-preset' . ( 'list' === $verb ? 's' : '' );
	}

	public static function available(): bool {
		return Settings_Contract::extension( 'modula-defaults' ) && class_exists( Preset_Storage::class );
	}

	protected static function catalog_features(): array {
		return array( 'modula-defaults' );
	}

	public static function mutations(): array {
		return array( static::name( 'create' ), static::name( 'update' ), static::name( 'delete' ), static::APPLY, static::BATCH );
	}

	public static function callbacks(): array {
		return Preset_Explanation::callbacks_for(
			array(
				static::name( 'list' ),
				static::name( 'read' ),
				static::name( 'create' ),
				static::name( 'update' ),
				static::name( 'delete' ),
				static::APPLY,
				static::BATCH,
			)
		);
	}

	/** Each preset family declares its executor without loading provider effects. */
	protected static function executor_class(): string {
		return '\Modula_Pro\Extensions\Defaults\Abilities\Gallery_Preset_Executor';
	}

	public static function executor_ready( string $name ): bool {
		$methods = array(
			static::name( 'list' )   => array( 'listing' => 1 ),
			static::name( 'read' )   => array( 'read' => 1 ),
			static::name( 'create' ) => array( 'create' => 1 ),
			static::name( 'update' ) => array( 'update' => 1 ),
			static::DELETE           => array( 'delete' => 1 ),
			static::APPLY            => array( 'apply' => 1 ),
			static::BATCH            => array( 'batch' => 1 ),
		);
		// can_access marks an executor that owns the access check and batch preset fields Lite no longer ships.
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( static::executor_class(), $methods[ $name ] + array( 'can_access' => 3 ) );
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			static::callbacks(),
			array(
				'available'      => array( static::class, 'available' ),
				'executor_ready' => array( static::class, 'executor_ready' ),
				'features'       => static::catalog_features(),
			),
			array(
				static::DELETE => array( 'destructive' => true ),
			)
		);
	}

	public static function summary_schema(): array {
		return Contract::object(
			array(
				'id'         => array( 'type' => 'integer' ),
				'title'      => array( 'type' => 'string' ),
				'status'     => array( 'type' => 'string' ),
				'editor_url' => array( 'type' => 'string' ),
				'revision'   => Contract::revision_schema(),
			),
			array( 'id', 'title', 'status', 'editor_url', 'revision' )
		);
	}

	public static function sorting_schema(): array {
		return array(
			'type' => 'string',
			'enum' => array( 'manual', 'dateCreatedNew', 'dateCreatedOld', 'dateModifiedFirst', 'dateModifiedLast', 'titleAZ', 'titleZA', 'random' ),
		);
	}

	/**
	 * Application reports its target (a gallery or an album), which Contract::outcome() adds for
	 * the operation; a batch reports one application per target.
	 */
	private static function output_schema( string $name ): array {
		if ( static::BATCH === $name ) {
			return Contract::batch_outcome( array( static::APPLY ), array() );
		}
		return Contract::outcome( $name, static::APPLY === $name ? array() : self::RESULTS );
	}

	public static function definitions(): array {
		$id       = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$identity = array(
			'request_id' => Contract::request_id_schema(),
			'id'         => $id,
			'revision'   => Contract::revision_schema(),
		);
		$fields   = array(
			'title'    => array(
				'type'      => 'string',
				'minLength' => 1,
				'maxLength' => 200,
			),
			'status'   => array(
				'type' => 'string',
				'enum' => array( 'draft', 'publish' ),
			),
			'settings' => static::settings_schema(),
			'sorting'  => static::sorting_schema(),
		);
		$source   = array(
			'preset_id'       => $id,
			'preset_revision' => Contract::revision_schema(),
		);
		$batch    = Batch::schema();
		$batch['properties'] += $source;
		$batch['required']    = array_merge( $batch['required'], array_keys( $source ) );
		$inputs               = array(
			static::name( 'list' )   => Contract::object( Contract::pagination() ) + array(
				'default' => array(
					'page'     => 1,
					'per_page' => 20,
				),
			),
			static::name( 'read' )   => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			static::name( 'create' ) => Contract::object( array( 'request_id' => Contract::request_id_schema() ) + $fields, array( 'request_id', 'title', 'status', 'settings', 'sorting' ) ),
			static::name( 'update' ) => Contract::object( $identity + $fields, array_keys( $identity ) ),
			static::name( 'delete' ) => Contract::object( $identity, array_keys( $identity ) ),
			static::APPLY            => Contract::object( $identity + $source, array_keys( $identity + $source ) ),
			static::BATCH            => $batch,
		);
		$out = array();
		foreach ( $inputs as $name => $input ) {
			$output = self::output_schema( $name );
			if ( static::name( 'list' ) === $name ) {
				$output = Contract::admitting(
					Contract::object(
						Contract::page_output() + array(
							'presets' => array(
								'type'  => 'array',
								'items' => static::summary_schema(),
							),
						),
						array_merge( array_keys( Contract::page_output() ), array( 'presets' ) )
					)
				);
			}
			if ( static::name( 'read' ) === $name ) {
				$preset                = static::summary_schema();
				$preset['properties'] += array(
					'settings' => static::read_settings_schema(),
					'sorting'  => array( 'type' => 'string' ),
				);
				$output                = Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'preset'         => $preset,
						),
						array( 'schema_version', 'preset' )
					)
				);
			}
			$out[ $name ] = array(
				'label'         => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ),
				'description'   => 'album' === static::FAMILY ? 'Requires enabled, entitled Defaults and Albums and current preset permissions. Paginated pure reads; explicit draft/publish creation. Supplied settings replace preset configuration; omitted fields and sorting are preserved. Revision-protected CRUD with 30-day recovery. Application replaces settings and sorting while preserving members, hierarchy and omitted protection. Source and target document revisions required. Batches accept 1–25 targets with per-target recovery; resume unchanged input for pending targets only.' : 'Requires enabled, entitled Defaults and current preset permissions. Pure paginated reads. Explicit draft/publish creation; updates replace supplied settings and preserve omitted sorting. Application replaces gallery settings/sorting while keeping membership and attachment text; a Freeform preset\'s placements replace the target\'s, slot N on item N in catalog order. Source and target revisions are mandatory. 1–25 batch targets retain individual 30-day outcomes; resume unchanged input for pending targets only.',
				'input_schema'  => $input,
				'output_schema' => $output,
			);
		}
		return $out;
	}

	/**
	 * Preset object authorization. When the type is unregistered, primitive caps stay checkable.
	 */
	public static function object_access( int $id = 0, string $status = '', bool $create = false ): bool {
		if ( ! get_current_user_id() ) {
			return false;
		}
		$type          = get_post_type_object( static::POST_TYPE );
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
		if ( ! $post || static::POST_TYPE !== $post->post_type ) {
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

	public static function can_delete( int $id ): bool {
		$post = get_post( $id );
		if ( ! $post || static::POST_TYPE !== $post->post_type || ! get_current_user_id() ) {
			return false;
		}
		if ( ! get_post_type_object( static::POST_TYPE ) ) {
			return current_user_can( 'edit_others_posts' );
		}
		return current_user_can( 'delete_post', $id );
	}

	public static function can_recover( array $record ): bool {
		if ( ! static::object_access() ) {
			return false;
		}
		if ( static::APPLY === $record['operation'] ) {
			return static::object_access( (int) $record['preset_id'] ) && static::recover_target_access( (int) $record['target'] );
		}
		if ( static::name( 'delete' ) === $record['operation'] ) {
			foreach ( $record['required_caps'] as $cap ) {
				if ( ! current_user_can( $cap ) ) {
					return false;
				}
			}
			return ! get_post( $record['target'] ) || ( static::object_access( (int) $record['target'] ) && static::can_delete( (int) $record['target'] ) );
		}
		return static::object_access( (int) $record['target'], (string) $record['publication'], static::name( 'create' ) === $record['operation'] );
	}

	protected static function recover_target_access( int $id ): bool {
		return Update::can_update( $id );
	}

	public static function summary( int $id ): array {
		$post = get_post( $id );
		return array(
			'id'         => $id,
			'title'      => $post->post_title,
			'status'     => $post->post_status,
			'editor_url' => admin_url( 'post.php?post=' . $id . '&action=edit' ),
			'revision'   => Revision::document( $id ),
		);
	}

	protected static function settings_schema(): array {
		return Settings_Contract::schema();
	}

	protected static function read_settings_schema(): array {
		return Contract::settings_schema();
	}
}
