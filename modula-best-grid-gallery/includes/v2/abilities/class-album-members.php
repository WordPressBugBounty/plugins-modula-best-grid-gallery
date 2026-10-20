<?php
/** Album membership descriptors and retained member-access checks. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Album_Members {
	public const READ       = 'modula/read-album-members';
	public const CANDIDATES = 'modula/list-album-member-candidates';
	public const OPERATION  = 'modula/update-album-members';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target album. */
	private const RESULTS = array( 'album' );

	public static function callbacks(): array {
		return Album_Explanation::callbacks_for(
			array( self::READ, self::CANDIDATES, self::OPERATION )
		);
	}

	/** Readiness belongs to the family, including its per-operation signature. */
	public static function executor_ready( string $name ): bool {
		$methods = array(
			self::READ       => array( 'read' => 1 ),
			self::CANDIDATES => array( 'candidates' => 1 ),
			self::OPERATION  => array( 'execute' => 1 ),
		);
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Extensions\Albums\Abilities\Member_Executor', $methods[ $name ] ) && Albums::executor_owns_access();
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( Albums::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-albums' ),
			)
		);
	}

	public static function definitions(): array {
		$id          = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$member      = Contract::object(
			array(
				'id'       => $id,
				'itemType' => array(
					'type' => 'string',
					'enum' => array( 'modula-gallery', 'modula-album' ),
				),
				'width'    => array(
					'type'    => 'integer',
					'minimum' => 1,
					'maximum' => 12,
				),
				'height'   => array(
					'type'    => 'integer',
					'minimum' => 1,
					'maximum' => 100,
				),
				'gridX'    => array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 11,
				),
				'gridY'    => array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 100000,
				),
			),
			array( 'id', 'itemType' )
		);
		$read_member = Contract::object(
			array(
				'id'       => $id,
				'itemType' => array( 'type' => 'string' ),
				'width'    => array( 'type' => array( 'integer', 'string' ) ),
				'height'   => array( 'type' => array( 'integer', 'string' ) ),
				'gridX'    => array( 'type' => array( 'integer', 'string' ) ),
				'gridY'    => array( 'type' => array( 'integer', 'string' ) ),
			),
			array( 'id', 'itemType' )
		);
		$result      = Contract::object(
			array(
				'schema_version' => array( 'type' => 'string' ),
				'id'             => $id,
				'revision'       => Contract::revision_schema(),
				'members'        => array(
					'type'  => 'array',
					'items' => $read_member,
				),
			),
			array( 'schema_version', 'id', 'revision', 'members' )
		);
		$candidate   = Contract::object(
			array(
				'id'       => $id,
				'itemType' => array( 'type' => 'string' ),
				'title'    => array( 'type' => 'string' ),
			),
			array( 'id', 'itemType', 'title' )
		);
		$inputs      = array(
			self::READ       => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			self::CANDIDATES => Contract::object(
				array(
					'id'     => $id,
					'search' => array(
						'type'      => 'string',
						'maxLength' => 100,
					),
				) + Contract::pagination(),
				array( 'id' )
			),
			self::OPERATION  => Contract::object(
				array(
					'request_id' => Contract::request_id_schema(),
					'id'         => $id,
					'revision'   => Contract::revision_schema(),
					'members'    => array(
						'type'     => 'array',
						'maxItems' => 500,
						'items'    => $member,
					),
				),
				array( 'request_id', 'id', 'revision', 'members' )
			),
		);
		$out         = array();
		foreach ( $inputs as $name => $input ) {
			$output = self::OPERATION === $name ? Contract::outcome( $name, self::RESULTS ) : Contract::admitting( $result );
			if ( self::CANDIDATES === $name ) {
				$output = Contract::admitting(
					Contract::object(
						Contract::page_output() + array(
							'candidates' => array(
								'type'  => 'array',
								'items' => $candidate,
							),
						),
						array_merge( array_keys( Contract::page_output() ), array( 'candidates' ) )
					)
				);
			}
			$out[ $name ] = array(
				'label'         => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ),
				'description'   => 'Beta album composition with current object permissions and Albums entitlement. Supply the complete ordered member identity list (0–500); omitted member attributes are preserved. Layout spans 1–12 by 1–100. Uses the read-album-members graph revision; concurrent album hierarchy changes conflict. Nested reparenting checks child and previous parent; classic child reparenting is refused. Removing members never deletes their objects or media. 30-day replay and recovery.',
				'input_schema'  => $input,
				'output_schema' => $output,
			);
		}
		return $out;
	}

	public static function eligible_member( int $id ): bool {
		$type = get_post_type( $id );
		if ( ! in_array( $type, array( 'modula-gallery', 'modula-album' ), true ) ) {
			return false;
		}
		if ( 'modula-album' === $type && ! get_post_type_object( 'modula-album' ) ) {
			return current_user_can( 'edit_others_posts' );
		}
		return current_user_can( 'edit_post', $id ) && current_user_can( 'read_post', $id );
	}

	public static function can_recover( array $record ): bool {
		if ( ! Albums::object_access( (int) ( $record['target'] ?? 0 ) ) ) {
			return false;
		}
		foreach ( $record['member_access'] ?? array() as $id ) {
			if ( ! self::eligible_member( (int) $id ) ) {
				return false;
			}
		}
		return true;
	}
}
