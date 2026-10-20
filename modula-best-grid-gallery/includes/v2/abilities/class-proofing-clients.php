<?php
/** Proofing account descriptors and retained-result authorization. Pro owns account and mail effects. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Proofing_Clients {
	public const READ      = 'modula/read-proofing-client';
	public const CREATE    = 'modula/create-proofing-client';
	public const ASSOCIATE = 'modula/associate-proofing-client';

	/** Outcome results the Pro executor sets. */
	private const RESULTS = array( 'client' );

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::READ, self::CREATE, self::ASSOCIATE );
	}

	/**
	 * Signature contract for the Pro client executor. Lite checks it without constructing Pro.
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
		return Proofing::service_executor_ready(
			$name,
			self::executor_methods(),
			'\Modula_Pro\Extensions\Image_Proofing\Abilities\Client_Executor'
		);
	}

	/** @return array<int,string> */
	public static function mutations(): array {
		return array( self::CREATE, self::ASSOCIATE );
	}

	/** User administration. Commercial Proofing availability is a separate explanation. */
	public static function can_manage(): bool {
		return current_user_can( 'create_users' ) && current_user_can( 'list_users' );
	}

	/** @return array<string,callable> */
	public static function callbacks(): array {
		return Proofing_Explanation::callbacks_for( self::names() );
	}

	/** @return array<string,array<string,mixed>> */
	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission'     => array( self::class, 'can_manage' ),
				'available'      => array( Proofing::class, 'operation_ready' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-image-proofing' ),
			)
		);
	}

	/** @return array<string,mixed> */
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

	/** @return array<string,array<string,mixed>> */
	public static function definitions(): array {
		$id = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		return array(
			self::READ      => array(
				'label'         => 'Read an accessible Proofing client',
				'description'   => 'Inspect one existing user for deliberate client association. Requires create_users, list_users and edit_user rights. Returns only ID, current association and revision, never credentials or contact details. Requires the Image Proofing extension; Lite explains that requirement before reading the account.',
				'input_schema'  => Contract::object( array( 'user_id' => $id ), array( 'user_id' ) ),
				'output_schema' => Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'client'         => self::result_schema(),
						),
						array( 'schema_version', 'client' )
					)
				),
			),
			self::CREATE    => array(
				'label'         => 'Create a Proofing client with explicit email choice',
				'description'   => 'Create one user with modula_client role and a random password. Requires create_users, list_users and promote_users. Mandatory send_password_email boolean selects the WordPress password setup email. Existing email returns only an accessible existing account without role changes or email even when true. Username max 60 characters; email max 100. No gallery association or invitation. Account commit precedes optional email; succeeded mail means accepted by wp_mail, not inbox delivery. Account and email outcome retained 30 days; replay/recovery never repeats mail or creates another user. Interrupted effects remain uncertain. Requires the Image Proofing extension; Lite explains that requirement before creating an account or sending mail. Recovery after Pro removal rechecks these user rights and does not require Pro.',
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
				'output_schema' => Contract::outcome( self::CREATE, self::RESULTS ),
			),
			self::ASSOCIATE => array(
				'label'         => 'Associate an existing Proofing client',
				'description'   => 'Add only modula_client to one accessible existing user, preserving every other role. Requires create_users/list_users and promote_user for this target. Use read-proofing-client revision; stale roles or profile refuse the change. No email, account creation or gallery enrollment. Retained 30-day replay/recovery rechecks current user administration rights and does not require Pro. Requires the Image Proofing extension; Lite explains that requirement before changing roles.',
				'input_schema'  => Contract::object(
					array(
						'request_id' => Contract::request_id_schema(),
						'user_id'    => $id,
						'revision'   => Contract::revision_schema(),
					),
					array( 'request_id', 'user_id', 'revision' )
				),
				'output_schema' => Contract::outcome( self::ASSOCIATE, self::RESULTS ),
			),
		);
	}

	/**
	 * Retained inspection uses current user-administration rights. It does not require Pro or another account effect.
	 *
	 * @param array<string,mixed> $record Stored request record.
	 */
	public static function can_recover( array $record ): bool {
		if ( ! self::can_manage() ) {
			return false;
		}
		$operation = $record['operation'] ?? '';
		if ( self::CREATE === $operation && ! current_user_can( 'promote_users' ) ) {
			return false;
		}
		$id = (int) ( $record['client_id'] ?? 0 );
		if ( $id < 1 ) {
			return self::CREATE === $operation;
		}
		$user = get_userdata( $id );
		if ( ! $user instanceof \WP_User || ! current_user_can( 'edit_user', $id ) ) {
			return false;
		}
		if ( self::ASSOCIATE === $operation && ! current_user_can( 'promote_user', $id ) ) {
			return false;
		}
		return true;
	}

	/**
	 * User-management denial precedes a commercial remedy.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::request_authorized( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		return Availability::blockers( $name );
	}

	/**
	 * @param array<string,mixed> $input
	 */
	private static function request_authorized( string $name, array $input ): bool {
		if ( ! in_array( $name, self::names(), true ) || ! self::can_manage() ) {
			return false;
		}
		if ( self::CREATE === $name ) {
			return current_user_can( 'promote_users' );
		}
		$user_id = $input['user_id'] ?? null;
		if ( ! is_int( $user_id ) || $user_id < 1 || ! current_user_can( 'edit_user', $user_id ) ) {
			return false;
		}
		if ( self::ASSOCIATE === $name ) {
			return current_user_can( 'promote_user', $user_id );
		}
		return true;
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-image-proofing',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current user-management permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}
}
