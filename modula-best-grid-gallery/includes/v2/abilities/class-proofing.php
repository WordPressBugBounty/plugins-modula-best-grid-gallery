<?php
/** Proofing descriptors, projection and retained-result authorization. Pro owns settings and invitation effects. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;

defined( 'ABSPATH' ) || exit;
final class Proofing {
	public const READ       = 'modula/read-proofing';
	public const UPDATE     = 'modula/update-proofing';
	public const CREATE     = 'modula/create-proofing-invitation';
	public const INVITATION = 'modula/update-proofing-invitation';
	public const DELETE     = 'modula/delete-proofing-invitation';

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::READ, self::UPDATE, self::CREATE, self::INVITATION, self::DELETE );
	}

	/**
	 * Signature contract for the Pro Proofing executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys( self::names(), array( 'run' => 2 ) );
	}

	/**
	 * Inspect only the declared executor signature; feature blockers are assessed separately.
	 */
	public static function executor_ready( string $name ): bool {
		return self::service_executor_ready(
			$name,
			self::executor_methods(),
			'\Modula_Pro\Extensions\Image_Proofing\Abilities\Proofing_Executor'
		);
	}

	/**
	 * @param array<string,array<string,int>> $methods Method arity required on the executor.
	 */
	public static function service_executor_ready( string $name, array $methods, string $executor_class ): bool {
		if ( ! isset( $methods[ $name ] ) ) {
			return false;
		}
		return Pro_Dependency::methods( $executor_class, $methods[ $name ] );
	}

	/** Stored Image Proofing entitlement and enabled state. It does not admit an operation by itself. */
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-image-proofing' );
	}

	/** Migrated operations also need the Pro executor when the package is enabled. */
	public static function operation_ready( string $name ): bool {
		return self::available() && Pro_Dependency::host_executor_ready( $name );
	}

	public static function mutations(): array {
		return array( self::UPDATE, self::CREATE, self::INVITATION, self::DELETE );
	}

	public static function callbacks(): array {
		return Proofing_Explanation::callbacks_for( self::names() );
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( self::class, 'operation_ready' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-image-proofing' ),
			),
			array(
				self::DELETE => array( 'destructive' => true ),
			)
		);
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
				'description'   => 'Read eligible editable non-bound Beta gallery Proofing settings, lock and up to 1000 accessible invitation records without side effects. Numeric clients require edit_user access. Guest identifiers are protected invitation data. The revision also covers invitation changes made through existing administration. Requires the Image Proofing extension; Lite explains that requirement before reading records.',
				'input_schema'  => Contract::object( $base, array( 'id' ) ),
				'output_schema' => Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'proofing'       => self::result_schema(),
						),
						array( 'schema_version', 'proofing' )
					)
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
					'description'   => 'Explicit Proofing administration with read-proofing revision and 30-day request recovery. Requires current extension eligibility and gallery rights. Settings use the existing grouped Proofing schema; locked also sets imageProofing to the same value, matching existing administration. Creation requires exactly one existing modula_client user_id (edit_user access) or guest_identifier; does not create accounts or change roles. Existing pair is returned without reactivation. Update only changes expired; deletion removes only the invitation and preserves selections. Never sends email, submits selections, publishes or enables extensions. Stale state rejects the whole request; identical replay never repeats effects. Requires the Image Proofing extension; Lite explains that requirement before writing settings or invitation records.',
					'input_schema'  => Contract::object( $fields, $required ),
					'output_schema' => Contract::outcome_schema(),
				);
		}
		return $definitions;
	}
	/**
	 * Retained inspection uses current gallery and client rights. It does not require Pro or another Proofing effect.
	 *
	 * @param array<string,mixed> $record Stored request record.
	 */
	/** Live gallery administration. Recovery uses can_recover(), which also requires stored client ids. */
	public static function can_administer( int $id ): bool {
		return $id > 0 && Update::can_update( $id );
	}

	/**
	 * Context an executor records when it admits a request, before its transaction.
	 * A failure rolls the transaction back, so later context writes are lost; recovery still needs the users.
	 * An unknown row references no client yet: the executor's locked read rejects it or reports uncertainty,
	 * and success records the clients it touched.
	 *
	 * @param array<string,mixed> $input
	 * @return array<string,mixed> Proofing administration, selection and email context: proofing_users.
	 */
	public static function admission_context( string $name, array $input ): array {
		return self::rejection_context( $name, $input ) ?? array( 'proofing_users' => array() );
	}

	/** Capture only resources referenced by a refused operation, without any Proofing effect. */
	public static function rejection_context( string $name, array $input ): ?array {
		if ( in_array( $name, Proofing_Clients::mutations(), true ) ) {
			return isset( $input['user_id'] ) ? array( 'client_id' => $input['user_id'] ) : array();
		}
		$users = array();
		if ( isset( $input['user_id'] ) ) {
			$users[] = $input['user_id'];
		}
		$client       = self::referenced_client( $name, $input );
		$requires_row = isset( $input['invitation_id'] ) || isset( $input['selection_id'] );
		if ( $requires_row && null === $client ) {
			// Unknown invitation/selection ownership cannot authorize a new request record.
			return null;
		}
		if ( null !== $client && ctype_digit( $client ) ) {
			$users[] = (int) $client;
		}
		return array( 'proofing_users' => array_values( array_unique( $users ) ) );
	}

	public static function can_recover( array $record ): bool {
		$target = isset( $record['target'] ) ? (int) $record['target'] : 0;
		if ( ! self::can_administer( $target ) || ! array_key_exists( 'proofing_users', $record ) ) {
			return false;
		}
		return self::recorded_clients_allowed( $record['proofing_users'] );
	}

	/**
	 * @param mixed $users
	 */
	private static function recorded_clients_allowed( $users ): bool {
		if ( ! is_array( $users ) ) {
			return false;
		}
		foreach ( $users as $user ) {
			if ( ! self::recorded_client_allowed( $user ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param mixed $user
	 */
	private static function recorded_client_allowed( $user ): bool {
		if ( ! is_numeric( $user ) ) {
			return false;
		}
		$id = (int) $user;
		return $id > 0 && get_userdata( $id ) instanceof \WP_User && current_user_can( 'edit_user', $id );
	}

	/**
	 * @return array{0:string,1:string} Status and code for a failed Proofing effect.
	 */
	public static function failure_status( \Throwable $error, string $fallback ): array {
		if ( ! $error instanceof \DomainException ) {
			return array( 'uncertain', $fallback );
		}
		$code = $error->getMessage();
		if ( 'stale_revision' === $code ) {
			return array( 'conflict', $code );
		}
		return array( 'rejected', $code );
	}

	public static function target_eligible( int $id ): bool {
		return Update::can_update( $id ) && Beta_Settings::is_beta_gallery( $id ) && 'trash' !== get_post_status( $id ) && ! self::is_bound( $id );
	}

	public static function eligible( int $id ): bool {
		return self::available() && self::target_eligible( $id );
	}

	public static function is_bound( int $id ): bool {
		$bound = get_post_meta( $id, '_modula_bind_target_type', true );
		return is_string( $bound ) && '' !== $bound;
	}

	/**
	 * Permission and target blockers precede commercial remedies.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::actor_admitted( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		if ( ! self::target_eligible( (int) $input['id'] ) ) {
			return array( self::unsupported_blocker() );
		}
		if ( self::requested_client_denied( $name, $input ) ) {
			return array( self::client_permission_blocker() );
		}
		return Availability::blockers( $name );
	}

	/**
	 * @param array<string,mixed> $input
	 */
	private static function actor_admitted( string $name, array $input ): bool {
		$id = $input['id'] ?? null;
		return self::known( $name ) && is_int( $id ) && Update::can_update( $id );
	}

	private static function known( string $name ): bool {
		return in_array( $name, self::names(), true ) || in_array( $name, Proofing_Selections::names(), true ) || Proofing_Email::SEND === $name;
	}

	/**
	 * A gallery editor who cannot edit the requested client must not receive an upgrade remedy.
	 *
	 * @param array<string,mixed> $input
	 */
	private static function requested_client_denied( string $name, array $input ): bool {
		if ( array_key_exists( 'user_id', $input ) && is_int( $input['user_id'] ) && ! current_user_can( 'edit_user', $input['user_id'] ) ) {
			return true;
		}
		$client = self::referenced_client( $name, $input );
		if ( ! is_string( $client ) || ! ctype_digit( $client ) ) {
			return false;
		}
		return ! current_user_can( 'edit_user', (int) $client );
	}

	/**
	 * Client stored on the requested invitation or selection. Null when the row cannot be read.
	 *
	 * @param array<string,mixed> $input
	 */
	private static function referenced_client( string $name, array $input ): ?string {
		$selection  = in_array( $name, array( Proofing_Selections::READ, Proofing_Selections::UNLOCK, Proofing_Selections::DELETE ), true );
		$invitation = in_array( $name, array( self::INVITATION, self::DELETE, Proofing_Email::SEND ), true );
		if ( ( ! $selection && ! $invitation ) || ! is_int( $input['id'] ?? null ) ) {
			return null;
		}
		$row_id = $selection ? ( $input['selection_id'] ?? null ) : ( $input['invitation_id'] ?? null );
		if ( ! is_int( $row_id ) ) {
			return null;
		}
		global $wpdb;
		$table = $wpdb->prefix . ( $selection ? 'modula_image_proofing_selections' : 'modula_image_proofing_invitations' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Internal table name; identifiers are prepared.
		$client = $wpdb->get_var( $wpdb->prepare( "SELECT user_id FROM {$table} WHERE id = %d AND gallery_id = %d", $row_id, $input['id'] ) );
		if ( $wpdb->last_error || ! is_string( $client ) ) {
			return null;
		}
		return $client;
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function client_permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-image-proofing',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current access to this client account is required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-image-proofing',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current gallery permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function unsupported_blocker(): array {
		return array(
			'reason'  => 'unsupported_context',
			'feature' => 'modula-image-proofing',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Proofing administration applies to an editable Beta gallery that is not bound to another source.', 'modula-best-grid-gallery' ),
			),
		);
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
}
