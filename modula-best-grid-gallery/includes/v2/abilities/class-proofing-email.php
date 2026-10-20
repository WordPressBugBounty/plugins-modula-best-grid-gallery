<?php
/** Invitation-mail descriptors. Pro owns delivery. Recovery never resends. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Proofing_Email {
	public const SEND = 'modula/send-proofing-invitation';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery. */
	private const RESULTS = array( 'proofing_email' );

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::SEND );
	}

	/**
	 * Signature contract for the Pro mail executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array( self::SEND => array( 'run' => 2 ) );
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
				'\Modula_Pro\Extensions\Image_Proofing\Abilities\Email_Executor'
			);
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
				'gallery_id'    => array( 'type' => 'integer' ),
				'invitation_id' => array( 'type' => 'integer' ),
				'email_status'  => array(
					'type' => 'string',
					'enum' => array( 'accepted', 'failed', 'uncertain' ),
				),
			),
			array( 'gallery_id', 'invitation_id', 'email_status' )
		);
	}

	/** @return array<string,array<string,mixed>> */
	public static function definitions(): array {
		$id = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		return array(
			self::SEND => array(
				'label'         => 'Send one explicit Proofing invitation',
				'description'   => 'Requires an editable eligible non-bound Beta gallery, an active accessible invitation, explicit recipient and read-proofing revision. For registered clients recipient must match the current account email and edit_user access is required; guests use the explicit recipient. Uses existing Proofing email templates. No invitation/account creation or selection submission. Durable admission precedes email; identical concurrent/repeated requests never resend. Accepted means wp_mail accepted, not inbox delivery. Failed or interrupted calls are retained without automatic retry for 30 days; recovery omits addresses, links and message bodies. Requires the Image Proofing extension; Lite explains that requirement before sending. Recovery after Pro removal rechecks gallery and client rights and does not resend.',
				'input_schema'  => Contract::object(
					array(
						'id'            => $id,
						'invitation_id' => $id,
						'recipient'     => array(
							'type'      => 'string',
							'format'    => 'email',
							'maxLength' => 100,
						),
						'revision'      => Contract::revision_schema(),
						'request_id'    => Contract::request_id_schema(),
					),
					array( 'id', 'invitation_id', 'recipient', 'revision', 'request_id' )
				),
				'output_schema' => Contract::outcome( self::SEND, self::RESULTS ),
			),
		);
	}
}
