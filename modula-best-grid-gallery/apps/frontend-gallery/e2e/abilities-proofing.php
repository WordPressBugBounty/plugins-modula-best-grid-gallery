<?php
// phpcs:disable WordPress.PHP.YodaConditions.NotYoda -- Compare captured public outcomes to subsequent executions.
/** Public Proofing ability checks in the shared owned Local lifecycle. */
use Modula\V2\Abilities\Proofing;
use Modula\V2\Abilities\Requests;
use Modula\V2\Meta_Sync;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) {
	exit( 1 ); }
function modula_proof_assert( $ok, $message ) {
	if ( ! $ok ) {
		throw new RuntimeException( esc_html( $message ) ); } }
function modula_proof_call( $name, $input ) {
	$ability = wp_get_ability( 'modula/' . $name );
	modula_proof_assert( (bool) $ability, 'Missing ability: ' . $name );
	$result = $ability->execute( $input );
	modula_proof_assert( ! is_wp_error( $result ), $name . ': ' . wp_json_encode( $result ) );
	return $result;
}
( static function () use ( $run, $marker ) {
	$actor = (int) get_user_by( 'login', $run )->ID;
	wp_set_current_user( $actor );
	$mode   = getenv( 'MODULA_E2E_MODE' );
	$prefix = $run . '-' . $mode . '-proof';
	$owned  = static function ( $id ) use ( $run, $marker ) {
		update_user_meta( $id, $marker, $run );
	};
	add_action( 'user_register', $owned );
	$mail    = array();
	$capture = static function ( $pre, $args ) use ( &$mail ) {
		$mail[] = $args['to'];
		return true;
	};
	add_filter( 'pre_wp_mail', $capture, 10, 2 );
	try {
		foreach ( array( 'read-proofing', 'update-proofing', 'create-proofing-invitation', 'update-proofing-invitation', 'delete-proofing-invitation', 'read-proofing-client', 'create-proofing-client', 'associate-proofing-client', 'send-proofing-invitation', 'list-proofing-selections', 'read-proofing-selection', 'unlock-proofing-selection', 'delete-proofing-selection' ) as $name ) {
			modula_proof_assert( (bool) wp_get_ability( 'modula/' . $name ), 'Missing ability: ' . $name ); }
		$id = modula_e2e_insert(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'publish',
				'post_author' => $actor,
				'post_title'  => $prefix,
				'meta_input'  => array( '_modula_beta' => '1' ),
			)
		);
		Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
		if ( 'lite' === $mode ) {
			foreach ( array(
				'read-proofing'          => array( 'id' => $id ),
				'create-proofing-client' => array(
					'request_id'          => $prefix . '-refuse',
					'username'            => $prefix,
					'email'               => $prefix . '@example.test',
					'send_password_email' => false,
				),
			) as $name => $input ) {
				modula_proof_assert( is_wp_error( wp_get_ability( 'modula/' . $name )->execute( $input ) ), 'Lite gate: ' . $name ); }
			modula_e2e_output(
				array(
					'passed'    => true,
					'available' => false,
					'gallery'   => array( 'id' => $id ),
				)
			);
			return;
		}
		modula_proof_assert( Proofing::available(), 'Proofing enabled in Pro fixture.' );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Owned local artifact.
		$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
		Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $catalog['attachments'][0]['id'] ) ), false );
		$read    = static function () use ( $id ) {
			return modula_proof_call( 'read-proofing', array( 'id' => $id ) )['proofing'];
		};
		$current = $read();
		$patch   = array(
			'id'         => $id,
			'request_id' => $prefix . '-settings',
			'revision'   => $current['revision'],
			'settings'   => array(
				'imageProofing'        => true,
				'minSelection'         => 1,
				'maxSelection'         => 2,
				'loginRejectionNotice' => 'Owned proofing login required',
			),
			'locked'     => true,
		);
		$result  = modula_proof_call( 'update-proofing', $patch );
		modula_proof_assert( 'succeeded' === $result['status'], 'Settings: ' . wp_json_encode( $result ) );
		modula_proof_assert( $result === modula_proof_call( 'update-proofing', $patch ), 'Settings replay.' );
		$patch['request_id'] .= '-stale';
		modula_proof_assert( 'conflict' === modula_proof_call( 'update-proofing', $patch )['status'], 'Stale settings.' );
		$patch['revision']                 = $read()['revision'];
		$patch['request_id']              .= '-invalid';
		$patch['settings']['minSelection'] = 3;
		modula_proof_assert( 'rejected' === modula_proof_call( 'update-proofing', $patch )['status'], 'Selection constraints.' );
		$create  = array(
			'request_id'          => $prefix . '-account',
			'username'            => $prefix . '-client',
			'email'               => $prefix . '@example.test',
			'send_password_email' => false,
		);
		$missing = $create;
		unset( $missing['send_password_email'] );
		modula_proof_assert( 'rejected' === modula_proof_call( 'create-proofing-client', $missing )['status'], 'Email choice mandatory.' );
		$client = modula_proof_call( 'create-proofing-client', $create );
		modula_proof_assert( 'succeeded' === $client['status'] && $client['client']['created'] && 'not_requested' === $client['client']['email_status'], 'Account: ' . wp_json_encode( $client ) );
		$uid = $client['client']['id'];
		modula_proof_assert( $client === modula_proof_call( 'create-proofing-client', $create ), 'Account replay.' );
		modula_proof_assert( array() === $mail, 'No mail from settings or no-email creation.' );
		$old      = wp_insert_user(
			array(
				'user_login' => $prefix . '-existing',
				'user_email' => $prefix . '-existing@example.test',
				'user_pass'  => wp_generate_password(),
				'role'       => 'subscriber',
			)
		);
		$roles    = get_userdata( $old )->roles;
		$existing = modula_proof_call(
			'create-proofing-client',
			array_replace(
				$create,
				array(
					'request_id'          => $prefix . '-existing',
					'email'               => get_userdata( $old )->user_email,
					'send_password_email' => true,
				)
			)
		);
		modula_proof_assert( 'succeeded' === $existing['status'] && ! $existing['client']['created'] && $old === $existing['client']['id'] && $roles === get_userdata( $old )->roles && ! $mail, 'Existing email preserves roles and sends nothing.' );
		$inspect    = modula_proof_call( 'read-proofing-client', array( 'user_id' => $old ) );
		$associate  = array(
			'request_id' => $prefix . '-associate',
			'user_id'    => $old,
			'revision'   => $inspect['client']['revision'],
		);
		$associated = modula_proof_call( 'associate-proofing-client', $associate );
		modula_proof_assert( 'succeeded' === $associated['status'] && ! array_diff( $roles, get_userdata( $old )->roles ) && in_array( 'modula_client', get_userdata( $old )->roles, true ), 'Preserve other roles.' );
		modula_proof_assert( $associated === modula_proof_call( 'associate-proofing-client', $associate ), 'Association replay.' );
		$associate['request_id'] .= '-stale';
		modula_proof_assert( 'conflict' === modula_proof_call( 'associate-proofing-client', $associate )['status'], 'Stale roles.' );
		modula_proof_assert( ! $read()['invitations'] && ! $mail, 'Accounts do not enroll or email implicitly.' );
		$invite  = array(
			'id'         => $id,
			'revision'   => $read()['revision'],
			'request_id' => $prefix . '-invite',
			'user_id'    => $uid,
		);
		$invited = modula_proof_call( 'create-proofing-invitation', $invite );
		modula_proof_assert( 'succeeded' === $invited['status'] && 1 === count( $invited['proofing']['invitations'] ), 'Invite: ' . wp_json_encode( $invited ) );
		modula_proof_assert( $invited === modula_proof_call( 'create-proofing-invitation', $invite ), 'Invite replay.' );
		$invitation            = $invited['proofing']['invitations'][0]['id'];
		$invite['revision']    = $read()['revision'];
		$invite['request_id'] .= '-duplicate';
		modula_proof_assert( 1 === count( modula_proof_call( 'create-proofing-invitation', $invite )['proofing']['invitations'] ), 'No duplicate pair.' );
		$edit = array(
			'id'            => $id,
			'revision'      => $read()['revision'],
			'request_id'    => $prefix . '-expire',
			'invitation_id' => $invitation,
			'expired'       => true,
		);
		modula_proof_assert( 'succeeded' === modula_proof_call( 'update-proofing-invitation', $edit )['status'], 'Expire.' );
		$service = new \Modula_Pro\Extensions\Image_Proofing\Data_Handler();
		modula_proof_assert( $service->is_invited( $id, $uid )['expired'], 'Existing client service sees expiry.' );
		$edit['revision']    = $read()['revision'];
		$edit['request_id'] .= '-activate';
		$edit['expired']     = false;
		modula_proof_assert( 'succeeded' === modula_proof_call( 'update-proofing-invitation', $edit )['status'], 'Reactivate.' );
		$guest = modula_proof_call(
			'create-proofing-invitation',
			array(
				'id'               => $id,
				'revision'         => $read()['revision'],
				'request_id'       => $prefix . '-guest',
				'guest_identifier' => $prefix . '-guest',
			)
		);
		modula_proof_assert( 'succeeded' === $guest['status'], 'Guest invitation.' );
		$guest_row = $guest['proofing']['invitations'][1];
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Seed one owned selection; assert preservation through the public service.
		$wpdb->insert(
			$wpdb->prefix . 'modula_image_proofing_selections',
			array(
				'gallery_id' => $id,
				'user_id'    => $guest_row['client'],
				'selections' => wp_json_encode( array( $catalog['attachments'][0]['id'] ) ),
				'notes'      => 'Preserve this selection',
				'submitted'  => 1,
			),
			array( '%d', '%s', '%s', '%s', '%d' )
		);
		$selection = $service->get_selection_by_user( $id, $guest_row['client'] );
		$deleted   = modula_proof_call(
			'delete-proofing-invitation',
			array(
				'id'            => $id,
				'revision'      => $read()['revision'],
				'request_id'    => $prefix . '-delete',
				'invitation_id' => $guest_row['id'],
			)
		);
		modula_proof_assert( 'succeeded' === $deleted['status'] && 1 === count( $deleted['proofing']['invitations'] ) && ! $mail, 'Record deletion without emails.' );
		modula_proof_assert( $selection === $service->get_selection_by_user( $id, $guest_row['client'] ), 'Deleting invitation preserves saved selection.' );
		$with_mail = array_replace(
			$create,
			array(
				'request_id'          => $prefix . '-email',
				'username'            => $prefix . '-email',
				'email'               => $prefix . '-email@example.test',
				'send_password_email' => true,
			)
		);
		$emailed   = modula_proof_call( 'create-proofing-client', $with_mail );
		modula_proof_assert( 'succeeded' === $emailed['status'] && 'succeeded' === $emailed['client']['email_status'] && 1 === count( $mail ), 'Explicit setup mail: ' . wp_json_encode( $emailed ) );
		modula_proof_assert( $emailed === modula_proof_call( 'create-proofing-client', $with_mail ) && 1 === count( $mail ), 'Mail never replays.' );
		$fail = static function () {
			return false;
		};
		add_filter( 'pre_wp_mail', $fail, 20 );
		$failed_input = array_replace(
			$with_mail,
			array(
				'request_id' => $prefix . '-failed',
				'username'   => $prefix . '-failed',
				'email'      => $prefix . '-failed@example.test',
			)
		);
		$failed       = modula_proof_call( 'create-proofing-client', $failed_input );
		remove_filter( 'pre_wp_mail', $fail, 20 );
		modula_proof_assert( 'uncertain' === $failed['status'] && $failed['client']['created'] && 'failed' === $failed['client']['email_status'], 'Retain account plus failed email.' );
		$count = count( $mail );
		modula_proof_assert( $failed === modula_proof_call( 'create-proofing-client', $failed_input ) && $count === count( $mail ), 'Failed email not retried.' );
		$lost_right = static function ( $caps, $cap, $user_id, $args ) use ( $uid ) {
			return 'edit_user' === $cap && (int) ( $args[0] ?? 0 ) === $uid ? array( 'do_not_allow' ) : $caps;
		};
		add_filter( 'map_meta_cap', $lost_right, 10, 4 );
		modula_proof_assert( 'forbidden' === modula_proof_call( 'recover-request', array( 'request_id' => $create['request_id'] ) )['status'], 'Recovery rechecks current account rights.' );
		modula_proof_assert( 'forbidden' === modula_proof_call( 'recover-request', array( 'request_id' => $prefix . '-invite' ) )['status'], 'Invitation recovery rechecks client access.' );
		remove_filter( 'map_meta_cap', $lost_right, 10 );
		$interrupt = static function () {
			throw new RuntimeException( 'Owned notification interruption' );
		};
		add_filter( 'pre_wp_mail', $interrupt, 20 );
		$interrupted_input = array_replace(
			$with_mail,
			array(
				'request_id' => $prefix . '-interrupted',
				'username'   => $prefix . '-interrupt',
				'email'      => $prefix . '-interrupt@example.test',
			)
		);
		$interrupted       = modula_proof_call( 'create-proofing-client', $interrupted_input );
		remove_filter( 'pre_wp_mail', $interrupt, 20 );
		modula_proof_assert( 'uncertain' === $interrupted['status'] && $interrupted['client']['created'] && 'uncertain' === $interrupted['client']['email_status'], 'Interrupted notification retains account and uncertainty.' );
		$count = count( $mail );
		modula_proof_assert( $interrupted === modula_proof_call( 'create-proofing-client', $interrupted_input ) && $count === count( $mail ), 'Interrupted email not retried.' );
		wp_set_current_user( $uid );
		modula_proof_assert( is_wp_error( wp_get_ability( 'modula/read-proofing' )->execute( array( 'id' => $id ) ) ), 'Client cannot administer.' );
		modula_proof_assert( is_wp_error( wp_get_ability( 'modula/create-proofing-client' )->execute( $create ) ), 'Client cannot create users.' );
		wp_set_current_user( $actor );
		require __DIR__ . '/abilities-proofing-moderation.php';
		$page = modula_e2e_insert(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $prefix . '-page',
				'post_content' => '[modula id="' . $id . '"]',
			)
		);
		modula_e2e_output(
			array(
				'passed'        => true,
				'available'     => true,
				'gallery'       => array(
					'id'         => $id,
					'editor_url' => html_entity_decode( get_edit_post_link( $id, 'raw' ) ),
				),
				'page'          => get_permalink( $page ),
				'client_id'     => $uid,
				'invitation_id' => $invitation,
				'captured_mail' => count( $mail ),
				'moderation' => $moderation,
			)
		);
	} catch ( Throwable $error ) {
		WP_CLI::error( $error->getMessage() ); } finally {
		wp_set_current_user( $actor );
		remove_action( 'user_register', $owned );
		remove_filter( 'pre_wp_mail', $capture, 10 ); }
} )();
