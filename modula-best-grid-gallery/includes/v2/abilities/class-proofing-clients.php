<?php
/** Explicit Proofing account creation and role association with retained mail outcomes. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Proofing_Clients {
	public const READ      = 'modula/read-proofing-client';
	public const CREATE    = 'modula/create-proofing-client';
	public const ASSOCIATE = 'modula/associate-proofing-client';
	public static function mutations(): array {
		return array( self::CREATE, self::ASSOCIATE ); }
	public static function can_manage(): bool {
		return Proofing::available() && current_user_can( 'create_users' ) && current_user_can( 'list_users' ); }
	public static function callbacks(): array {
		return array(
			self::READ      => array( self::class, 'read' ),
			self::CREATE    => static function ( $input ) {
						return self::execute( $input, self::CREATE );
			},
			self::ASSOCIATE => static function ( $input ) {
				return self::execute( $input, self::ASSOCIATE );
			},
		);
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'id'           => array( 'type' => 'integer' ),
				'revision'     => Contract::revision_schema(),
				'created'      => array( 'type' => 'boolean' ),
				'associated'   => array( 'type' => 'boolean' ),
				'email_status' => array(
					'type' => 'string',
					'enum' => array( 'not_requested', 'succeeded', 'failed', 'uncertain' ),
				),
			),
			array( 'id', 'created', 'associated', 'email_status' )
		);
	}
	public static function definitions(): array {
		$id = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		return array(
			self::READ      => array(
				'label'         => 'Read an accessible Proofing client',
				'description'   => 'Inspect one existing user for deliberate client association. Requires create_users, list_users and edit_user rights plus eligible active Proofing. Returns only ID, current association and revision, never credentials or contact details.',
				'input_schema'  => Contract::object( array( 'user_id' => $id ), array( 'user_id' ) ),
				'output_schema' => Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'client'         => self::result_schema(),
					),
					array( 'schema_version', 'client' )
				),
			),
			self::CREATE    => array(
				'label'         => 'Create a Proofing client with explicit email choice',
				'description'   => 'Create one user with modula_client role and a random password. Requires create_users, list_users and promote_users. Mandatory send_password_email boolean selects the WordPress password setup email. Existing email returns only an accessible existing account without role changes or email even when true. Username max 60 characters; email max 100. No gallery association or invitation. Account commit precedes optional email; succeeded mail means accepted by wp_mail, not inbox delivery. Account and email outcome retained 30 days; replay/recovery never repeats mail or creates another user. Interrupted effects remain uncertain.',
				'input_schema'  => Contract::object(
					array(
						'request_id'          => Contract::request_id_schema(),
						'username'            => array(
							'type'      => 'string',
							'minLength' => 1,
							'maxLength' => 60,
						),
						'email'               => array(
							'type'      => 'string',
							'format'    => 'email',
							'maxLength' => 100,
						),
						'send_password_email' => array( 'type' => 'boolean' ),
					),
					array( 'request_id', 'username', 'email', 'send_password_email' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
			self::ASSOCIATE => array(
				'label'         => 'Associate an existing Proofing client',
				'description'   => 'Add only modula_client to one accessible existing user, preserving every other role. Requires create_users/list_users and promote_user for this target. Use read-proofing-client revision; stale roles or profile refuse the change. No email, account creation or gallery enrollment. Retained 30-day replay/recovery rechecks current user administration rights.',
				'input_schema'  => Contract::object(
					array(
						'request_id' => Contract::request_id_schema(),
						'user_id'    => $id,
						'revision'   => Contract::revision_schema(),
					),
					array( 'request_id', 'user_id', 'revision' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	public static function can_recover( array $record ): bool {
		$id = (int) ( $record['client_id'] ?? 0 );
		return self::can_manage() && ( ! $id || ( get_userdata( $id ) && current_user_can( 'edit_user', $id ) ) ) && ( self::ASSOCIATE !== $record['operation'] || ( $id && current_user_can( 'promote_user', $id ) ) ) && ( self::CREATE !== $record['operation'] || current_user_can( 'promote_users' ) );
	}
	private static function inspect( int $id, bool $lock = false ): array {
		global $wpdb;
		if ( ! self::can_manage() || ! get_userdata( $id ) || ! current_user_can( 'edit_user', $id ) ) {
			throw new \DomainException( 'client_unavailable' ); }
		$suffix = $lock ? ' FOR UPDATE' : '';
		if ( $lock ) {
			Revision::require_transactional_table( $wpdb->users );
			Revision::require_transactional_table( $wpdb->usermeta ); }
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Authoritative locked reads; identifiers and lock suffix are internal, values are prepared.
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->users} WHERE ID = %d" . $suffix, $id ), ARRAY_A );
		if ( $wpdb->last_error || ! $rows ) {
			throw new \RuntimeException(); }
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Authoritative locked reads; identifiers and lock suffix are internal, values are prepared.
		$meta = $wpdb->get_results( $wpdb->prepare( "SELECT meta_key,meta_value FROM {$wpdb->usermeta} WHERE user_id = %d ORDER BY umeta_id" . $suffix, $id ), ARRAY_A );
		if ( $wpdb->last_error ) {
			throw new \RuntimeException(); }
		clean_user_cache( $id );
		return array(
			'id'           => $id,
			'revision'     => hash( 'sha256', wp_json_encode( array( $rows, $meta ) ) ),
			'created'      => false,
			'associated'   => in_array( 'modula_client', get_userdata( $id )->roles, true ),
			'email_status' => 'not_requested',
		);
	}
	public static function read( array $input ) {
		try {
			return array(
				'schema_version' => Contract::VERSION,
				'client'         => self::inspect( $input['user_id'] ),
			); } catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_client_unavailable', 'Current access to this user is required.' ); }
	}
	/** Observe WordPress notification without storing password-reset keys or message bodies. */
	private static function notify( int $id ): string {
		$status  = 'uncertain';
		$email   = get_userdata( $id )->user_email;
		$matches = static function ( $data ) use ( $email ) {
			return in_array( $email, (array) ( $data['to'] ?? array() ), true );
		};
		$success = static function ( $data ) use ( &$status, $matches ) {
			if ( $matches( $data ) ) {
				$status = 'succeeded';
			} };
		$failed  = static function ( $error ) use ( &$status, $matches ) {
			if ( $matches( $error->get_error_data() ?? array() ) ) {
				$status = 'failed';
			} };
		$short   = static function ( $pre, $data ) use ( &$status, $matches ) {
			if ( null !== $pre && $matches( $data ) ) {
				$status = $pre ? 'succeeded' : 'failed';
			} return $pre;
		};
		add_action( 'wp_mail_succeeded', $success );
		add_action( 'wp_mail_failed', $failed );
		add_filter( 'pre_wp_mail', $short, PHP_INT_MAX, 2 );
		try {
			wp_new_user_notification( $id, null, 'user' ); } finally {
			remove_action( 'wp_mail_succeeded', $success );
			remove_action( 'wp_mail_failed', $failed );
			remove_filter( 'pre_wp_mail', $short, PHP_INT_MAX ); }
			return $status;
	}
	public static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Recover this request and inspect the account before another effect.' : '', $operation );
		};
		if ( ! self::can_recover(
			array(
				'operation' => $operation,
				'client_id' => $input['user_id'] ?? 0,
			)
		) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		if ( ! get_role( 'modula_client' ) ) {
			return $out( 'rejected', 'client_role_unavailable' ); }
		if ( self::CREATE === $operation && ( ! validate_username( $input['username'] ) || sanitize_user( $input['username'], true ) !== $input['username'] || ! is_email( $input['email'] ) || sanitize_email( $input['email'] ) !== $input['email'] ) ) {
			return $out( 'rejected', 'invalid_client' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$active    = false;
		$committed = false;
		$id        = $input['user_id'] ?? 0;
		$client    = null;
		try {
			global $wpdb;
			Revision::begin();
			$active = true;
			Revision::require_transactional_table( $wpdb->users );
			Revision::require_transactional_table( $wpdb->usermeta );
			if ( self::CREATE === $operation ) {
				// Lock both indexed identities and their insertion gaps before testing for an existing account.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- Authoritative locked reads; identifiers and lock suffix are internal, values are prepared.
				$rows = $wpdb->get_results( $wpdb->prepare( "SELECT ID,user_email,user_login FROM {$wpdb->users} WHERE user_email = %s OR user_login = %s ORDER BY ID FOR UPDATE", $input['email'], $input['username'] ), ARRAY_A );
				if ( $wpdb->last_error ) {
					throw new \RuntimeException(); }
				foreach ( $rows as $row ) {
					if ( 0 === strcasecmp( $row['user_email'], $input['email'] ) ) {
						$id = (int) $row['ID'];
						break; }
				}
				if ( $id ) {
					$client = self::inspect( $id, true ); } else {
					if ( $rows ) {
						throw new \DomainException( 'username_exists' ); }
					$id = wp_insert_user(
						array(
							'user_login' => $input['username'],
							'user_email' => $input['email'],
							'user_pass'  => wp_generate_password( 40, true, true ),
							'role'       => 'modula_client',
						)
					);
					if ( is_wp_error( $id ) ) {
						$id = 0;
						throw new \DomainException( 'client_creation_failed' ); }
					$client            = self::inspect( $id );
					$client['created'] = true;
					}
			} else {
				$client = self::inspect( $id, true );
				if ( ! hash_equals( $client['revision'], $input['revision'] ) ) {
					throw new \DomainException( 'stale_revision' ); }
				if ( ! current_user_can( 'promote_user', $id ) ) {
					throw new \DomainException( 'client_unavailable' ); }
				$user  = get_userdata( $id );
				$roles = $user->roles;
				$user->add_role( 'modula_client' );
				$client = self::inspect( $id );
				if ( ! $client['associated'] || array_diff( $roles, get_userdata( $id )->roles ) ) {
					throw new \RuntimeException(); }
			}
			$send = self::CREATE === $operation && $client['created'] && $input['send_password_email'];
			if ( $send ) {
				$client['email_status'] = 'uncertain'; }
			Requests::context(
				$input['request_id'],
				array(
					'client_id' => $id,
					'client'    => $client,
				)
			);
			if ( ! $send ) {
				$result = Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'client' => $client ) );
				if ( 'succeeded' !== $result['status'] ) {
					throw new \RuntimeException(); }
			}
			Revision::end( true );
			$active    = false;
			$committed = true;
			if ( ! $send ) {
				return $result; }
			// The durable account checkpoint survives termination during notification; recovery never resends.
			$client['email_status'] = self::notify( $id );
			$client['revision']     = self::inspect( $id )['revision'];
			Requests::context( $input['request_id'], array( 'client' => $client ) );
			return Requests::finish( $input['request_id'], $out( 'succeeded' === $client['email_status'] ? 'succeeded' : 'uncertain', 'succeeded' === $client['email_status'] ? '' : 'password_email_' . $client['email_status'] ) + array( 'client' => $client ) );
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			if ( $id ) {
				clean_user_cache( $id ); }
			$code = $error instanceof \DomainException ? $error->getMessage() : 'client_unconfirmed';
			return Requests::finish( $input['request_id'], $out( ! $committed && 'stale_revision' === $code ? 'conflict' : ( ! $committed && $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) + ( $committed && $client ? array( 'client' => $client ) : array() ) );
		}
	}
}
