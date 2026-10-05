<?php
// phpcs:disable WordPress.PHP.YodaConditions.NotYoda -- Compare successive state snapshots and captured outcomes.
/** Administrative selection reads and moderation, never client submission. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Proofing_Selections {
	public const LISTING = 'modula/list-proofing-selections';
	public const READ    = 'modula/read-proofing-selection';
	public const UNLOCK  = 'modula/unlock-proofing-selection';
	public const DELETE  = 'modula/delete-proofing-selection';
	public static function mutations(): array {
		return array( self::UNLOCK, self::DELETE ); }
	public static function callbacks(): array {
		$result = array(
			self::LISTING => array( self::class, 'listing' ),
			self::READ    => array( self::class, 'read' ),
		);
		foreach ( self::mutations() as $name ) {
			$result[ $name ] = static function ( $input ) use ( $name ) {
				return self::execute( $input, $name );
			};
		}
		return $result;
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
		foreach ( array_keys( self::callbacks() ) as $name ) {
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
				$output   = Contract::outcome_schema();
			}
			$definitions[ $name ] = array(
				'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
				'description'   => 'Administrative access to selections of one editable eligible non-bound Beta gallery; numeric clients require edit_user access. List scans up to per_page rows (default 25, max 100) after after_id, omits inaccessible clients, and returns next_after_id (0 at end); a filtered page can be empty with a nonzero cursor. Single read requires selection_id. Writes require the selection revision, lock and compare current gallery/selection state, and retain results for 30 days with current client access rechecked. Unlock changes only submitted=false; delete removes only that exact selection. Never edits chosen image IDs/notes, impersonates the client, submits, sends notifications or changes invitations/accounts. Reads reject malformed/oversized data rather than truncate.',
				'input_schema'  => Contract::object( $fields, $required ),
				'output_schema' => $output,
			);
		}
		return $definitions;
	}
	private static function can_read_client( string $client ): bool {
		return ! ctype_digit( $client ) || ( get_userdata( (int) $client ) && current_user_can( 'edit_user', (int) $client ) );
	}
	private static function gallery( int $id, bool $lock = false ): string {
		$revision = Revision::state( $id, $lock );
		if ( ! Proofing::eligible( $id ) ) {
			throw new \DomainException( 'unsupported_proofing_target' ); }
		return $revision;
	}
	private static function row( int $id, int $selection, bool $lock = false ): array {
		global $wpdb;
		$table = $wpdb->prefix . 'modula_image_proofing_selections';
		if ( $lock ) {
			Revision::require_transactional_table( $table ); }
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Internal table and lock suffix; values prepared.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d AND gallery_id = %d" . ( $lock ? ' FOR UPDATE' : '' ), $selection, $id ), ARRAY_A );
		if ( $wpdb->last_error ) {
			throw new \RuntimeException(); }
		if ( ! $row || ! self::can_read_client( $row['user_id'] ) ) {
			throw new \DomainException( 'selection_unavailable' ); }
		return $row;
	}
	private static function project( array $row, string $gallery ): array {
		$images = json_decode( $row['selections'], true );
		if ( ! is_array( $images ) || array_values( $images ) !== $images || count( $images ) > 10000 || strlen( $row['notes'] ) > 65535 ) {
			throw new \DomainException( 'selection_data_unavailable' ); }
		foreach ( $images as $image ) {
			if ( ! is_int( $image ) ) {
				throw new \DomainException( 'selection_data_unavailable' ); }
		}
		return array(
			'id'         => (int) $row['id'],
			'gallery_id' => (int) $row['gallery_id'],
			'client'     => $row['user_id'],
			'revision'   => hash( 'sha256', wp_json_encode( array( $gallery, $row ) ) ),
			'image_ids'  => $images,
			'notes'      => $row['notes'],
			'submitted'  => (bool) $row['submitted'],
			'deleted'    => false,
		);
	}
	public static function read( array $input ) {
		try {
			$gallery = self::gallery( $input['id'] );
			$row     = self::row( $input['id'], $input['selection_id'] );
			if ( $gallery !== self::gallery( $input['id'] ) || $row !== self::row( $input['id'], $input['selection_id'] ) ) {
				throw new \RuntimeException(); }
			return array(
				'schema_version' => Contract::VERSION,
				'selection'      => self::project( $row, $gallery ),
			);
		} catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_selection_unavailable', 'A stable accessible gallery and selection are required.' ); }
	}
	public static function listing( array $input ) {
		try {
			$gallery = self::gallery( $input['id'] );
			global $wpdb;
			$table = $wpdb->prefix . 'modula_image_proofing_selections';
			$limit = $input['per_page'] ?? 25;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Internal table, prepared bounded cursor.
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $table WHERE gallery_id = %d AND id > %d ORDER BY id LIMIT %d", $input['id'], $input['after_id'] ?? 0, $limit + 1 ), ARRAY_A );
			if ( $wpdb->last_error || $gallery !== self::gallery( $input['id'] ) ) {
				throw new \RuntimeException(); }
			$more   = count( $rows ) > $limit;
			$rows   = array_slice( $rows, 0, $limit );
			$next   = $more ? (int) end( $rows )['id'] : 0;
			$result = array();
			foreach ( $rows as $row ) {
				if ( self::can_read_client( $row['user_id'] ) ) {
					$result[] = self::project( $row, $gallery ); }
			}
			return array(
				'schema_version' => Contract::VERSION,
				'selections'     => $result,
				'next_after_id'  => $next,
			);
		} catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_selections_unavailable', 'Accessible eligible gallery selection data is required.' ); }
	}
	public static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Read the current selection before a new moderation request.' : '', $operation );
		};
		if ( ! Proofing::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$active = false;
		try {
			Revision::begin();
			$active    = true;
			$gallery   = self::gallery( $input['id'], true );
			$row       = self::row( $input['id'], $input['selection_id'], true );
			$selection = self::project( $row, $gallery );
			if ( ! hash_equals( $selection['revision'], $input['revision'] ) ) {
				throw new \DomainException( 'stale_revision' ); }
			Requests::context( $input['request_id'], array( 'proofing_users' => ctype_digit( $row['user_id'] ) ? array( (int) $row['user_id'] ) : array() ) );
			global $wpdb;
			$table = $wpdb->prefix . 'modula_image_proofing_selections';
			$where = array(
				'id'         => $input['selection_id'],
				'gallery_id' => $input['id'],
			);
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Narrow locked administrative write, never the submit path.
			$written = self::DELETE === $operation ? $wpdb->delete( $table, $where, array( '%d', '%d' ) ) : $wpdb->update( $table, array( 'submitted' => 0 ), $where, array( '%d' ), array( '%d', '%d' ) );
			if ( false === $written ) {
				throw new \RuntimeException(); }
			if ( self::DELETE === $operation ) {
				$selection['deleted'] = true;
			} else {
				$after = self::row( $input['id'], $input['selection_id'] );
				if ( $after['selections'] !== $row['selections'] || $after['notes'] !== $row['notes'] || (bool) $after['submitted'] ) {
					throw new \RuntimeException(); }
				$selection = self::project( $after, $gallery );
			}
			$result = Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'selection' => $selection ) );
			if ( 'succeeded' !== $result['status'] ) {
				throw new \RuntimeException(); }
			Revision::end( true );
			$active = false;
			return $result;
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			$code = $error instanceof \DomainException ? $error->getMessage() : 'selection_unconfirmed';
			return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) );
		}
	}
}
