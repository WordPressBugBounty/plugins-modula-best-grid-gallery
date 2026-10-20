<?php
/** Selection descriptors. Pro owns listing, reads, unlock and delete. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Proofing_Selections {
	public const LISTING = 'modula/list-proofing-selections';
	public const READ    = 'modula/read-proofing-selection';
	public const UNLOCK  = 'modula/unlock-proofing-selection';
	public const DELETE  = 'modula/delete-proofing-selection';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery. */
	private const RESULTS = array( 'selection' );

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::LISTING, self::READ, self::UNLOCK, self::DELETE );
	}

	/**
	 * Signature contract for the Pro selection executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys( self::names(), array( 'run' => 2 ) );
	}

	/**
	 * A disabled or incompatible Proofing package is already explained elsewhere.
	 * Only an enabled, contract-ready package must expose this executor.
	 */
	public static function executor_ready( string $name ): bool {
		return Proofing::package_owns_helpers()
			&& Proofing::service_executor_ready(
				$name,
				self::executor_methods(),
				'\Modula_Pro\Extensions\Image_Proofing\Abilities\Selection_Executor'
			);
	}

	public static function mutations(): array {
		return array( self::UNLOCK, self::DELETE );
	}

	public static function callbacks(): array {
		return Proofing_Explanation::callbacks_for( self::names() );
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( Proofing::class, 'operation_ready' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-image-proofing' ),
			),
			array(
				self::DELETE => array( 'destructive' => true ),
			)
		);
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'id'         => array( 'type' => 'integer' ),
				'gallery_id' => array( 'type' => 'integer' ),
				'client'     => array( 'type' => 'string' ),
				'revision'   => Contract::revision_schema(),
				'image_ids'  => array(
					'type'     => 'array',
					'items'    => array( 'type' => 'integer' ),
					'maxItems' => 10000,
				),
				'notes'      => array(
					'type'      => 'string',
					'maxLength' => 65535,
				),
				'submitted'  => array( 'type' => 'boolean' ),
				'deleted'    => array( 'type' => 'boolean' ),
			),
			array( 'id', 'gallery_id', 'client', 'revision', 'image_ids', 'notes', 'submitted', 'deleted' )
		);
	}
	public static function definitions(): array {
		$id          = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$definitions = array();
		foreach ( self::names() as $name ) {
			$fields   = array( 'id' => $id );
			$required = array( 'id' );
			$output   = Contract::object(
				array(
					'schema_version' => array( 'type' => 'string' ),
					'selection'      => self::result_schema(),
				),
				array( 'schema_version', 'selection' )
			);
			if ( self::LISTING === $name ) {
				$fields += array(
					'after_id' => array(
						'type'    => 'integer',
						'minimum' => 0,
					),
					'per_page' => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 100,
					),
				);
				$output  = Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'selections'     => array(
							'type'     => 'array',
							'maxItems' => 100,
							'items'    => self::result_schema(),
						),
						'next_after_id'  => array( 'type' => 'integer' ),
					),
					array( 'schema_version', 'selections', 'next_after_id' )
				);
			} else {
				$fields['selection_id'] = $id;
				$required[]             = 'selection_id';
			}
			if ( in_array( $name, self::mutations(), true ) ) {
				$fields  += array(
					'revision'   => Contract::revision_schema(),
					'request_id' => Contract::request_id_schema(),
				);
				$required = array_keys( $fields );
				$output   = Contract::outcome( $name, self::RESULTS );
			} else {
				$output = Contract::admitting( $output );
			}
			$definitions[ $name ] = array(
				'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
				'description'   => 'Administrative access to selections of one editable eligible non-bound Beta gallery; numeric clients require edit_user access. List scans up to per_page rows (default 25, max 100) after after_id, omits inaccessible clients, and returns next_after_id (0 at end); a filtered page can be empty with a nonzero cursor. Single read requires selection_id. Writes require the selection revision, lock and compare current gallery/selection state, and retain results for 30 days with current client access rechecked. Unlock changes only submitted=false; delete removes only that exact selection. Never edits chosen image IDs/notes, impersonates the client, submits, sends notifications or changes invitations/accounts. Reads reject malformed/oversized data rather than truncate. Requires the Image Proofing extension; Lite explains that requirement before reading or moderating selections.',
				'input_schema'  => Contract::object( $fields, $required ),
				'output_schema' => $output,
			);
		}
		return $definitions;
	}
}
