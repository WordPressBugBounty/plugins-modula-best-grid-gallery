<?php
/** Album lifecycle descriptors and retained authorization. Execution lives in Pro. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Album_Lifecycle {
	public const READ      = 'modula/read-album-lifecycle';
	public const DUPLICATE = 'modula/duplicate-album';
	public const TRASH     = 'modula/trash-album';
	public const RESTORE   = 'modula/restore-album';
	public const DELETE    = 'modula/delete-album';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target album. */
	private const RESULTS = array( 'album', 'deleted_id' );

	public static function operations(): array {
		return array( self::DUPLICATE, self::TRASH, self::RESTORE, self::DELETE );
	}

	public static function callbacks(): array {
		return Album_Explanation::callbacks_for( array_merge( array( self::READ ), self::operations() ) );
	}

	/** Readiness belongs to the family, including its per-operation signature. */
	public static function executor_ready( string $name ): bool {
		$methods = array(
			self::READ      => array( 'read' => 1 ),
			self::DUPLICATE => array( 'duplicate' => 1 ),
			self::TRASH     => array( 'trash' => 1 ),
			self::RESTORE   => array( 'restore' => 1 ),
			self::DELETE    => array( 'delete' => 1 ),
		);
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Extensions\Albums\Abilities\Lifecycle_Executor', $methods[ $name ] ) && Albums::executor_owns_access();
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( Albums::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-albums' ),
			),
			array(
				self::TRASH  => array( 'destructive' => true ),
				self::DELETE => array( 'destructive' => true ),
			)
		);
	}

	public static function definitions(): array {
		$out = array();
		foreach ( array_keys( self::callbacks() ) as $name ) {
			$read         = 'modula/read-album-lifecycle' === $name;
			$input        = $read ? Contract::object(
				array(
					'id' => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
				array( 'id' )
			) : Lifecycle::schema( str_replace( '-album', '-gallery', $name ) );
			$output       = $read ? Contract::admitting(
				Contract::object(
					array(
						'id'       => array( 'type' => 'integer' ),
						'revision' => Contract::revision_schema(),
						'status'   => array( 'type' => 'string' ),
					),
					array( 'id', 'revision', 'status' )
				)
			) : Contract::outcome( $name, self::RESULTS );
			$out[ $name ] = array(
				'label'         => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ),
				'description'   => 'Enabled Albums and current object permissions required. Read the lifecycle graph revision before writing, including in trash. Duplicate creates a root album with the same settings and member references, without reparenting or copying members/media. Duplicate and restore require draft/publish intent. Trash preserves hierarchy. Delete prunes references from editable Beta parents and detaches Beta children to root; classic mutations are refused. 30-day actor-scoped recovery.',
				'input_schema'  => $input,
				'output_schema' => $output,
			);
		}
		return $out;
	}

	public static function can_recover( array $record ): bool {
		if ( ! Albums::object_access() ) {
			return false;
		}
		foreach ( $record['member_access'] ?? array() as $id ) {
			if ( ! Album_Members::eligible_member( (int) $id ) ) {
				return false;
			}
		}
		$deleted = isset( $record['deleted'] ) && true === $record['deleted'];
		$target  = (int) ( $record['target'] ?? 0 );
		if ( $deleted && ! get_post( $target ) ) {
			$caps = $record['required_caps'] ?? null;
			if ( ! is_array( $caps ) || ! $caps ) {
				return false;
			}
			foreach ( $caps as $cap ) {
				if ( ! is_string( $cap ) || ! current_user_can( $cap ) ) {
					return false;
				}
			}
			return true;
		}
		$operation = (string) ( $record['operation'] ?? '' );
		$status    = (string) ( $record['publication'] ?? '' );
		$allowed   = Albums::object_access( $target, $status ) && ( self::DUPLICATE === $operation ? Albums::object_access( 0, $status, true ) : Albums::can_delete( $target ) );
		$copy      = (int) ( $record['copy'] ?? 0 );
		return $allowed && ( 0 === $copy || Albums::object_access( $copy ) );
	}
}
