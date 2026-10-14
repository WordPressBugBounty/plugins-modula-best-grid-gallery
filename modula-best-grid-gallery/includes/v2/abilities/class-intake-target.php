<?php
/** Gallery admission and composition shared with ordinary free upload. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;

defined( 'ABSPATH' ) || exit;

final class Intake_Target {
	/** @return array|null */
	public static function validate( array $input, string $operation ) {
		if ( isset( $input['id'] ) !== isset( $input['revision'] ) ) {
			return Requests::outcome( $input['request_id'], 'rejected', 'incomplete_target', 'Supply both gallery id and revision, or neither for import only.', $operation );
		}
		if ( isset( $input['id'] ) && ( ! Beta_Settings::is_beta_gallery( $input['id'] ) || 'trash' === get_post_status( $input['id'] ) || get_post_meta( $input['id'], '_modula_bind_target_type', true ) ) ) {
			return Requests::outcome( $input['request_id'], 'rejected', 'unsupported_target', 'Only a Beta gallery outside trash and without bound membership can receive images.', $operation );
		}
		if ( isset( $input['id'] ) && ! hash_equals( Revision::state( $input['id'] ), $input['revision'] ) ) {
			return Requests::outcome( $input['request_id'], 'conflict', 'stale_revision', 'Gallery already changed; no media imported.', $operation );
		}
		return null;
	}
	/** Compose retained uploads once through the existing gallery operation. */
	public static function compose( array $input, array &$progress ): ?array {
		if ( ! isset( $input['id'] ) || ! $progress['attachment_ids'] ) {
			return null;
		}
		$progress['phase']                  = 'composition';
		$progress['composition_request_id'] = 'intake-' . hash( 'sha256', $input['request_id'] );
		Requests::context( $input['request_id'], array( 'intake' => $progress ) );
		$composed                       = Composition::execute(
			array(
				'request_id' => $progress['composition_request_id'],
				'id'         => $input['id'],
				'revision'   => $input['revision'],
				'changes'    => array_map(
					static function ( $id ) {
						return array(
							'action' => 'add',
							'id'     => $id,
						);
					},
					$progress['attachment_ids']
				),
			)
		);
		$progress['composition_status'] = $composed['status'];
		return $composed;
	}
}
