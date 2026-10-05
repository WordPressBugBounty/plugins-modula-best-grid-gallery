<?php
/** Explicit invitation delivery with durable, non-repeating external effects. */
namespace Modula\V2\Abilities;

use Modula_Pro\Extensions\Image_Proofing\Email_Handler;

defined( 'ABSPATH' ) || exit;
final class Proofing_Email {
	public const SEND = 'modula/send-proofing-invitation';
	public static function callbacks(): array {
		return array( self::SEND => array( self::class, 'execute' ) );
	}
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
	public static function definitions(): array {
		$id = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		return array(
			self::SEND => array(
				'label'         => 'Send one explicit Proofing invitation',
				'description'   => 'Requires an editable eligible non-bound Beta gallery, an active accessible invitation, explicit recipient and read-proofing revision. For registered clients recipient must match the current account email and edit_user access is required; guests use the explicit recipient. Uses existing Proofing email templates. No invitation/account creation or selection submission. Durable admission precedes email; identical concurrent/repeated requests never resend. Accepted means wp_mail accepted, not inbox delivery. Failed or interrupted calls are retained without automatic retry for 30 days; recovery omits addresses, links and message bodies.',
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
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	public static function execute( array $input ): array {
		$existing = Requests::existing( $input, self::SEND );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Reconcile this invitation request; do not automatically resend.' : '', self::SEND );
		};
		if ( ! Proofing::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		if ( ! is_email( $input['recipient'] ) || sanitize_email( $input['recipient'] ) !== $input['recipient'] ) {
			return $out( 'rejected', 'invalid_recipient' ); }
		$existing = Requests::claim( $input, self::SEND );
		if ( null !== $existing ) {
			return $existing; }
		$active   = false;
		$mail     = null;
		$admitted = false;
		try {
			Revision::begin();
			$active  = true;
			$current = Proofing::inspect( $input['id'], true );
			if ( ! hash_equals( $current['revision'], $input['revision'] ) ) {
				throw new \DomainException( 'stale_revision' ); }
			$invitation = null;
			foreach ( $current['invitations'] as $row ) {
				if ( $row['id'] === $input['invitation_id'] && ! $row['expired'] ) {
					$invitation = $row;
					break; }
			}
			if ( ! $invitation || ! class_exists( Email_Handler::class ) || ! get_permalink( $input['id'] ) ) {
				throw new \DomainException( 'invitation_unavailable' ); }
			$users = array();
			if ( ctype_digit( $invitation['client'] ) ) {
				$user = get_userdata( (int) $invitation['client'] );
				if ( ! $user || ! current_user_can( 'edit_user', $user->ID ) || ! in_array( 'modula_client', $user->roles, true ) || 0 !== strcasecmp( $user->user_email, $input['recipient'] ) ) {
					throw new \DomainException( 'recipient_mismatch' ); }
				$users[] = $user->ID;
			}
			$mail = array(
				'gallery_id'    => $input['id'],
				'invitation_id' => $input['invitation_id'],
				'email_status'  => 'uncertain',
			);
			Requests::context(
				$input['request_id'],
				array(
					'proofing_users' => $users,
					'proofing_email' => $mail,
				)
			);
			Revision::end( true );
			$active   = false;
			$admitted = true;
			// The committed checkpoint survives process termination during the external call.
			$handler              = new Email_Handler();
			$sent                 = $users ? $handler->send_client_invitation_email( $input['id'], $users[0], $input['recipient'] ) : $handler->send_invitation_email( $input['id'], $invitation['client'], $input['recipient'] );
			$mail['email_status'] = true === $sent ? 'accepted' : ( false === $sent ? 'failed' : 'uncertain' );
			Requests::context( $input['request_id'], array( 'proofing_email' => $mail ) );
			return Requests::finish( $input['request_id'], $out( true === $sent ? 'succeeded' : 'uncertain', true === $sent ? '' : 'invitation_email_' . $mail['email_status'] ) + array( 'proofing_email' => $mail ) );
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			$code = ! $admitted && $error instanceof \DomainException ? $error->getMessage() : 'invitation_email_unconfirmed';
			return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( ! $admitted && $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) + ( $admitted ? array( 'proofing_email' => $mail ) : array() ) );
		}
	}
}
