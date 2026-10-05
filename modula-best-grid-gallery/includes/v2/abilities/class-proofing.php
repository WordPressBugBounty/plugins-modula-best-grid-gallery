<?php
/** Administrative Proofing settings and invitation records, without communication effects. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula\V2\Settings\Writer;
use Modula_Pro\Extensions\Image_Proofing\Data_Handler;

defined( 'ABSPATH' ) || exit;
final class Proofing {
	public const READ       = 'modula/read-proofing';
	public const UPDATE     = 'modula/update-proofing';
	public const CREATE     = 'modula/create-proofing-invitation';
	public const INVITATION = 'modula/update-proofing-invitation';
	public const DELETE     = 'modula/delete-proofing-invitation';
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-image-proofing' ) && class_exists( Data_Handler::class );
	}
	public static function mutations(): array {
		return array( self::UPDATE, self::CREATE, self::INVITATION, self::DELETE ); }
	public static function callbacks(): array {
		$callbacks = array( self::READ => array( self::class, 'read' ) );
		foreach ( self::mutations() as $name ) {
			$callbacks[ $name ] = static function ( $input ) use ( $name ) {
				return self::execute( $input, $name );
			}; }
		return $callbacks;
	}
	public static function settings_schema(): array {
		$source = \Modula\V2\Settings\Registry::get_schema();
		$fields = Contract::settings_schema( $source )['properties']['proofing']['properties'];
		foreach ( $fields as $key => &$field ) {
			foreach ( array( 'minimum', 'maximum', 'enum' ) as $constraint ) {
				if ( isset( $source['proofing'][ $key ][ $constraint ] ) ) {
					$field[ $constraint ] = $source['proofing'][ $key ][ $constraint ]; }
			}
			if ( 'string' === $field['type'] ) {
				$field['maxLength'] = 65536; }
		}
		return Contract::object( $fields );
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'id'          => array( 'type' => 'integer' ),
				'revision'    => Contract::revision_schema(),
				'settings'    => self::settings_schema(),
				'locked'      => array( 'type' => 'boolean' ),
				'invitations' => array(
					'type'     => 'array',
					'maxItems' => 1000,
					'items'    => Contract::object(
						array(
							'id'      => array( 'type' => 'integer' ),
							'client'  => array( 'type' => 'string' ),
							'expired' => array( 'type' => 'boolean' ),
						),
						array( 'id', 'client', 'expired' )
					),
				),
			),
			array( 'id', 'revision', 'settings', 'locked', 'invitations' )
		);
	}
	public static function definitions(): array {
		$id          = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$base        = array( 'id' => $id );
		$definitions = array(
			self::READ => array(
				'label'         => 'Read gallery Proofing administration',
				'description'   => 'Read eligible editable non-bound Beta gallery Proofing settings, lock and up to 1000 accessible invitation records without side effects. Numeric clients require edit_user access. Guest identifiers are protected invitation data. The revision also covers invitation changes made through existing administration.',
				'input_schema'  => Contract::object( $base, array( 'id' ) ),
				'output_schema' => Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'proofing'       => self::result_schema(),
					),
					array( 'schema_version', 'proofing' )
				),
			),
		);
		$base       += array(
			'revision'   => Contract::revision_schema(),
			'request_id' => Contract::request_id_schema(),
		);
		foreach ( self::mutations() as $name ) {
			$fields   = $base;
			$required = array_keys( $base );
			if ( self::UPDATE === $name ) {
				$fields += array(
					'settings' => self::settings_schema() + array( 'minProperties' => 1 ),
					'locked'   => array( 'type' => 'boolean' ),
				); } elseif ( self::CREATE === $name ) {
				$fields += array(
					'user_id'          => $id,
					'guest_identifier' => array(
						'type'      => 'string',
						'minLength' => 1,
						'maxLength' => 100,
						'pattern'   => '^[A-Za-z][A-Za-z0-9_-]*$',
					),
				); } else {
					$fields['invitation_id'] = $id;
					$required[]              = 'invitation_id';
					if ( self::INVITATION === $name ) {
						$fields['expired'] = array( 'type' => 'boolean' );
						$required[]        = 'expired'; }
				}
				$definitions[ $name ] = array(
					'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
					'description'   => 'Explicit Proofing administration with read-proofing revision and 30-day request recovery. Requires current extension eligibility and gallery rights. Settings use the existing grouped Proofing schema; locked also sets imageProofing to the same value, matching existing administration. Creation requires exactly one existing modula_client user_id (edit_user access) or guest_identifier; does not create accounts or change roles. Existing pair is returned without reactivation. Update only changes expired; deletion removes only the invitation and preserves selections. Never sends email, submits selections, publishes or enables extensions. Stale state rejects the whole request; identical replay never repeats effects.',
					'input_schema'  => Contract::object( $fields, $required ),
					'output_schema' => Contract::outcome_schema(),
				);
		}
		return $definitions;
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() || ! Update::can_update( (int) $record['target'] ) ) {
			return false; }
		foreach ( $record['proofing_users'] ?? array() as $user ) {
			if ( ! get_userdata( $user ) || ! current_user_can( 'edit_user', $user ) ) {
				return false; }
		}
		return true;
	}
	public static function eligible( int $id ): bool {
		return self::available() && Update::can_update( $id ) && Beta_Settings::is_beta_gallery( $id ) && 'trash' !== get_post_status( $id ) && ! get_post_meta( $id, '_modula_bind_target_type', true );
	}
	/** Raw rows are hashed, but only authorized records are returned. Lock gaps cover ordinary inserts. */
	public static function inspect( int $id, bool $lock = false ): array {
		if ( ! self::eligible( $id ) ) {
			throw new \DomainException( 'unsupported_proofing_target' ); }
		$revision = Revision::state( $id, $lock );
		global $wpdb;
		$table = $wpdb->prefix . 'modula_image_proofing_invitations';
		if ( $lock ) {
			Revision::require_transactional_table( $table ); }
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Authoritative locked reads; identifiers and lock suffix are internal, values are prepared.
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT id,user_id,expired FROM $table WHERE gallery_id = %d ORDER BY id LIMIT 1001" . ( $lock ? ' FOR UPDATE' : '' ), $id ), ARRAY_A );
		if ( $wpdb->last_error || count( $rows ) > 1000 ) {
			throw new \DomainException( 'proofing_records_unavailable' ); }
		$visible = array();
		foreach ( $rows as $row ) {
			if ( ctype_digit( $row['user_id'] ) && ( ! get_userdata( (int) $row['user_id'] ) || ! current_user_can( 'edit_user', (int) $row['user_id'] ) ) ) {
				continue; }
			$visible[] = array(
				'id'      => (int) $row['id'],
				'client'  => $row['user_id'],
				'expired' => (bool) $row['expired'],
			);
		}
		$settings = Meta_Sync::get_settings_v2( $id, false );
		return array(
			'id'          => $id,
			'revision'    => hash( 'sha256', wp_json_encode( array( $revision, $rows ) ) ),
			'settings'    => $settings['proofing'] ?? array(),
			'locked'      => (bool) get_post_meta( $id, '_modula_locked_for_proofing', true ),
			'invitations' => $visible,
		);
	}
	public static function read( array $input ) {
		try {
			$result = self::inspect( $input['id'] );
			// phpcs:ignore WordPress.PHP.YodaConditions.NotYoda -- Compare two successive snapshots.
			if ( $result !== self::inspect( $input['id'] ) ) {
				throw new \RuntimeException();
			} return array(
				'schema_version' => Contract::VERSION,
				'proofing'       => $result,
			); } catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_proofing_unavailable', 'A stable accessible eligible Beta gallery is required.' ); }
	}
	public static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Read current Proofing state and reconcile before a new request.' : '', $operation );
		};
		if ( ! self::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$active = false;
		try {
			Revision::begin();
			$active  = true;
			$current = self::inspect( $input['id'], true );
			if ( ! hash_equals( $current['revision'], $input['revision'] ) ) {
				throw new \DomainException( 'stale_revision' ); }
			$users = array();
			if ( self::UPDATE === $operation ) {
				$settings = $input['settings'] ?? array();
				if ( ! $settings && ! isset( $input['locked'] ) ) {
					throw new \DomainException( 'empty_patch' ); }
				if ( isset( $input['locked'] ) ) {
					if ( isset( $settings['imageProofing'] ) && $settings['imageProofing'] !== $input['locked'] ) {
						throw new \DomainException( 'inconsistent_lock' ); }
					$settings['imageProofing'] = $input['locked'];
				}
				$merged = array_replace( $current['settings'], $settings );
				if ( ! empty( $merged['maxSelection'] ) && ( $merged['minSelection'] ?? 0 ) > $merged['maxSelection'] ) {
					throw new \DomainException( 'invalid_selection_limits' ); }
				if ( ! empty( $settings['notificationEmail'] ) && ! is_email( $settings['notificationEmail'] ) ) {
					throw new \DomainException( 'invalid_email' ); }
				if ( is_wp_error( Writer::validate_strict_patch( $input['id'], array( 'proofing' => $settings ) ) ) ) {
					throw new \DomainException( 'invalid_settings' ); }
				$saved = Meta_Sync::with_canonical_gallery_write(
					$input['id'],
					static function () use ( $input, $settings ) {
						return Writer::patch( $input['id'], array( 'proofing' => $settings ), true );
					}
				);
				if ( is_wp_error( $saved ) ) {
					throw new \RuntimeException(); }
				if ( isset( $input['locked'] ) ) {
					update_post_meta( $input['id'], '_modula_locked_for_proofing', $input['locked'] ? '1' : '0' ); }
			} else {
				global $wpdb;
				$table = $wpdb->prefix . 'modula_image_proofing_invitations';
				if ( self::CREATE === $operation ) {
					if ( isset( $input['user_id'] ) === isset( $input['guest_identifier'] ) ) {
						throw new \DomainException( 'one_client_required' ); }
					$client = isset( $input['user_id'] ) ? (string) $input['user_id'] : $input['guest_identifier'];
					if ( isset( $input['user_id'] ) ) {
						$user = get_userdata( $input['user_id'] );
						if ( ! $user || ! current_user_can( 'edit_user', $user->ID ) || ! in_array( 'modula_client', $user->roles, true ) ) {
							throw new \DomainException( 'client_unavailable' ); }
						$users[] = $user->ID;
					}
					$invitation = ( new Data_Handler() )->create_invitation( $input['id'], $client );
					if ( ! $invitation ) {
						throw new \RuntimeException(); }
				} else {
					$matches = array_values(
						array_filter(
							$current['invitations'],
							static function ( $row ) use ( $input ) {
								return $row['id'] === $input['invitation_id'];
							}
						)
					);
					if ( ! $matches ) {
						throw new \DomainException( 'invitation_unavailable' ); }
					if ( ctype_digit( $matches[0]['client'] ) ) {
						$users[] = (int) $matches[0]['client']; }
					// Existing delete_invitation also removes selections, which this record-only operation must preserve.
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Record-only mutation must not invoke selection deletion.
					$written = self::DELETE === $operation ? $wpdb->delete(
						$table,
						array(
							'id'         => $input['invitation_id'],
							'gallery_id' => $input['id'],
						),
						array( '%d', '%d' )
					) : $wpdb->update(
						$table,
						array( 'expired' => (int) $input['expired'] ),
						array(
							'id'         => $input['invitation_id'],
							'gallery_id' => $input['id'],
						),
						array( '%d' ),
						array( '%d', '%d' )
					);
					if ( false === $written ) {
						throw new \RuntimeException(); }
				}
				if ( $wpdb->last_error ) {
					throw new \RuntimeException(); }
			}
			foreach ( $current['invitations'] as $row ) {
				if ( ctype_digit( $row['client'] ) ) {
					$users[] = (int) $row['client']; }
			}
			Requests::context( $input['request_id'], array( 'proofing_users' => array_unique( $users ) ) );
			$result  = self::inspect( $input['id'] );
			$outcome = Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'proofing' => $result ) );
			if ( 'succeeded' !== $outcome['status'] ) {
				throw new \RuntimeException(); }
			Revision::end( true );
			$active = false;
			return $outcome;
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			$code = $error instanceof \DomainException ? $error->getMessage() : 'proofing_unconfirmed';
			return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) );
		}
	}
}
