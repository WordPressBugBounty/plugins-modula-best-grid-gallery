<?php
// phpcs:disable WordPress.PHP.YodaConditions.NotYoda -- Compare successive state snapshots and captured outcomes.
/** Additional native ticket 32/33 checks inside the shared Proofing fixture. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $prefix, $service ) ) {
	exit( 1 ); }
$send  = array(
	'id'            => $id,
	'invitation_id' => $invitation,
	'revision'      => $read()['revision'],
	'request_id'    => $prefix . '-invitation-mail',
	'recipient'     => get_userdata( $uid )->user_email,
);
$count = count( $mail );
$bad   = modula_proof_call(
	'send-proofing-invitation',
	array_replace(
		$send,
		array(
			'request_id' => $prefix . '-wrong-recipient',
			'recipient'  => 'wrong@example.test',
		)
	)
);
modula_proof_assert( 'rejected' === $bad['status'] && $count === count( $mail ), 'Wrong account recipient sends nothing.' );
// Use the configured Local mail sink for one real message, not a pre_wp_mail substitute.
modula_proof_assert( false !== strpos( ini_get( 'sendmail_path' ), '127.0.0.1:10001' ), 'Expected dev Local SMTP sink.' );
remove_filter( 'pre_wp_mail', $capture, 10 );
try {
	$sent = modula_proof_call( 'send-proofing-invitation', $send );
	modula_proof_assert( 'succeeded' === $sent['status'] && 'accepted' === $sent['proofing_email']['email_status'], 'Real Local invitation acceptance: ' . wp_json_encode( $sent ) );
	modula_proof_assert( $sent === modula_proof_call( 'send-proofing-invitation', $send ), 'Accepted email replay.' );
	modula_proof_assert( $sent === modula_proof_call( 'recover-request', array( 'request_id' => $send['request_id'] ) ), 'Lost response recovery.' );
} finally {
	add_filter( 'pre_wp_mail', $capture, 10, 2 ); }
modula_proof_assert( 'conflict' === modula_proof_call( 'send-proofing-invitation', array_replace( $send, array( 'recipient' => 'other@example.test' ) ) )['status'], 'Mail payload mismatch.' );
foreach ( array( 'failed', 'uncertain' ) as $failure ) {
	$effect = static function () use ( $failure ) {
		if ( 'uncertain' === $failure ) {
			throw new RuntimeException( 'Owned lost confirmation' );
		} return false;
	};
	add_filter( 'pre_wp_mail', $effect, 20 );
	$input = array_replace( $send, array( 'request_id' => $prefix . '-mail-' . $failure ) );
	try {
		$result = modula_proof_call( 'send-proofing-invitation', $input );
	} finally {
		remove_filter( 'pre_wp_mail', $effect, 20 ); }
	modula_proof_assert( 'uncertain' === $result['status'] && $failure === $result['proofing_email']['email_status'], 'Mail failure retained.' );
	$count = count( $mail );
	modula_proof_assert( $result === modula_proof_call( 'send-proofing-invitation', $input ) && $count === count( $mail ), 'Failed/interrupted mail cannot resend.' );
}
// Lose confirmation after real SMTP acceptance, then prove replay never resends.
$after_send = static function () {
	throw new RuntimeException( 'Owned post-send interruption' );
};
remove_filter( 'pre_wp_mail', $capture, 10 );
add_action( 'wp_mail_succeeded', $after_send );
$lost_input = array_replace( $send, array( 'request_id' => $prefix . '-lost-after-send' ) );
try {
	$lost = modula_proof_call( 'send-proofing-invitation', $lost_input ); } finally {
	remove_action( 'wp_mail_succeeded', $after_send );
	add_filter( 'pre_wp_mail', $capture, 10, 2 );
	}
	modula_proof_assert( 'uncertain' === $lost['status'] && 'uncertain' === $lost['proofing_email']['email_status'], 'Actual send with lost confirmation stays uncertain.' );
	modula_proof_assert( $lost === modula_proof_call( 'send-proofing-invitation', $lost_input ), 'Post-send interruption never repeats.' );
	modula_proof_assert( $lost === modula_proof_call( 'recover-request', array( 'request_id' => $lost_input['request_id'] ) ), 'Post-send recovery retains uncertainty.' );
	// Create a real client selection through the existing client service.
	wp_set_current_user( $uid );
	modula_proof_assert( true === $service->save_selection( $id, array( $catalog['attachments'][0]['id'] ), "Client notes\nKeep exactly", 1 ), 'Real invited client selection.' );
	wp_set_current_user( $actor );
	$original       = $service->get_selection_by_user( $id, $uid );
	$selection_id   = (int) $original['id'];
	$selection_read = static function () use ( $id, $selection_id ) {
		return modula_proof_call(
			'read-proofing-selection',
			array(
				'id'           => $id,
				'selection_id' => $selection_id,
			)
		)['selection'];
	};
	$selected       = $selection_read();
	$page_one       = modula_proof_call(
		'list-proofing-selections',
		array(
			'id'       => $id,
			'per_page' => 1,
		)
	);
	modula_proof_assert( 1 === count( $page_one['selections'] ) && $page_one['next_after_id'] > 0, 'Bounded first selection page: ' . wp_json_encode( $page_one ) );
	$page_two = modula_proof_call(
		'list-proofing-selections',
		array(
			'id'       => $id,
			'per_page' => 1,
			'after_id' => $page_one['next_after_id'],
		)
	);
	modula_proof_assert( $selection_id === $page_two['selections'][0]['id'] && 0 === $page_two['next_after_id'], 'Second page without duplicates.' );
	$unlock   = array(
		'id'           => $id,
		'selection_id' => $selection_id,
		'revision'     => $selected['revision'],
		'request_id'   => $prefix . '-unlock',
	);
	$unlocked = modula_proof_call( 'unlock-proofing-selection', $unlock );
	modula_proof_assert( 'succeeded' === $unlocked['status'] && ! $unlocked['selection']['submitted'], 'Selection unlock.' );
	$after = $service->get_selection_by_user( $id, $uid );
	modula_proof_assert( $original['image_ids'] === $after['image_ids'] && $original['notes'] === $after['notes'] && ! $after['submitted'], 'Existing UI service sees preserved images/notes and unlocked status.' );
	wp_set_current_user( $uid );
	modula_proof_assert( true === $service->save_selection( $id, $after['image_ids'], $after['notes'], 1 ), 'Client resubmits.' );
	wp_set_current_user( $actor );
	modula_proof_assert( $unlocked === modula_proof_call( 'unlock-proofing-selection', $unlock ) && $service->get_selection_by_user( $id, $uid )['submitted'], 'Replay cannot unlock a newer submission.' );
	$stale = array_replace(
		$unlock,
		array(
			'revision'   => $unlocked['selection']['revision'],
			'request_id' => $prefix . '-stale-selection',
		)
	);
	modula_proof_assert( 'conflict' === modula_proof_call( 'delete-proofing-selection', $stale )['status'], 'Stale deletion refused.' );
	add_filter( 'map_meta_cap', $lost_right, 10, 4 );
	try {
		modula_proof_assert(
			is_wp_error(
				wp_get_ability( 'modula/read-proofing-selection' )->execute(
					array(
						'id'           => $id,
						'selection_id' => $selection_id,
					)
				)
			),
			'Inaccessible client read denied.'
		);
		$visible = modula_proof_call( 'list-proofing-selections', array( 'id' => $id ) );
		modula_proof_assert( ! in_array( $selection_id, array_column( $visible['selections'], 'id' ), true ), 'List excludes inaccessible clients.' );
		foreach ( array( $send['request_id'], $unlock['request_id'] ) as $request_id ) {
			modula_proof_assert( 'forbidden' === modula_proof_call( 'recover-request', array( 'request_id' => $request_id ) )['status'], 'Recovery requires current client rights.' ); }
	} finally {
		remove_filter( 'map_meta_cap', $lost_right, 10 ); }
	$delete  = array_replace(
		$unlock,
		array(
			'revision'   => $selection_read()['revision'],
			'request_id' => $prefix . '-delete-selection',
		)
	);
	$removed = modula_proof_call( 'delete-proofing-selection', $delete );
	modula_proof_assert( 'succeeded' === $removed['status'] && $removed['selection']['deleted'] && null === $service->get_selection_by_user( $id, $uid )['id'], 'Exact selection deleted.' );
	modula_proof_assert( $selection === $service->get_selection_by_user( $id, $guest_row['client'] ), 'Other client history preserved.' );
	modula_proof_assert( $removed === modula_proof_call( 'delete-proofing-selection', $delete ), 'Delete replay.' );
	$clock = static function () {
		return time() + 31 * DAY_IN_SECONDS;
	};
	add_filter( 'modula_abilities_time', $clock );
	try {
		modula_proof_assert( 'expired' === modula_proof_call( 'recover-request', array( 'request_id' => $send['request_id'] ) )['status'], '30-day result expiry.' );
	} finally {
		remove_filter( 'modula_abilities_time', $clock ); }
	// Leave a fresh submitted selection for authenticated HTTP and the admin UI journey.
	wp_set_current_user( $uid );
	$service->save_selection( $id, $original['image_ids'], $original['notes'], 1 );
	wp_set_current_user( $actor );
	$moderation = array(
		'selection_id'   => (int) $service->get_selection_by_user( $id, $uid )['id'],
		'recipient'      => $send['recipient'],
		'native_request' => $send['request_id'],
		'image_ids'      => $original['image_ids'],
		'notes'          => $original['notes'],
	);
