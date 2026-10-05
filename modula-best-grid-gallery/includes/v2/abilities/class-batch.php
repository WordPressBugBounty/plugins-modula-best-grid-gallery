<?php
/** Durable per-target progress. A batch is never a cross-gallery transaction. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Batch {
	public const OPERATION = 'modula/update-galleries';
	public const MEDIA = 'modula/update-media-batch';
	public static function media( array $input ): array { return self::execute( $input, self::MEDIA ); }
	public static function media_operations(): array { return array_values( array_diff( array_merge( Collections::mutations(), Attachment_Lifecycle::operations() ), array( 'modula/create-collection' ) ) ); }
	private static function child_operation( string $operation ): string { return Album_Presets::BATCH === $operation ? Album_Presets::APPLY : ( Presets::BATCH === $operation ? Presets::APPLY : Update::OPERATION ); }
	public static function schema(): array {
		return Contract::object( array( 'request_id' => Contract::request_id_schema(), 'targets' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 25, 'items' => array( 'type' => 'object', 'properties' => array( 'id' => array( 'type' => 'integer', 'minimum' => 1 ) ), 'required' => array( 'id' ), 'additionalProperties' => true ) ) ), array( 'request_id', 'targets' ) );
	}
	public static function execute( array $input, string $operation = self::OPERATION ): array {
		$child_operation = self::child_operation( $operation );
		$request = $input['request_id'];
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing && 'in_progress' !== $existing['status'] ) { return $existing; }
		if ( self::MEDIA === $operation && ! Media_Folders::can_manage() ) { return Requests::outcome( $request, 'forbidden', 'current_permission_denied', 'Media organization is unavailable.', $operation ); }
		$ids = array_column( $input['targets'], 'id' );
		if ( count( $ids ) !== count( array_unique( $ids ) ) ) { return Requests::outcome( $request, 'rejected', 'duplicate_target', 'Each target may occur once per batch.', $operation ); }
		global $wpdb;
		// Serialize resumptions without stealing a live worker's claim. Connection close releases it.
		$lock = 'modula_batch_' . substr( hash( 'sha256', get_current_blog_id() . ':' . get_current_user_id() . ':' . $request ), 0, 48 );
		if ( '1' !== (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $lock ) ) ) { return Requests::outcome( $request, 'in_progress', 'batch_active', 'Recover this request while its worker finishes.', $operation ); }
		try {
			$existing = Requests::existing( $input, $operation );
			if ( null !== $existing && 'in_progress' !== $existing['status'] ) { return $existing; }
			if ( null === $existing ) {
				$claimed = Requests::claim( $input, $operation );
				if ( null !== $claimed ) { return $claimed; }
			}
			foreach ( $input['targets'] as $index => $target ) {
				if ( self::MEDIA === $operation ) { $child_operation = is_string( $target['operation'] ?? null ) ? $target['operation'] : ''; unset( $target['operation'] ); }
				$target['request_id'] = self::child_id( $request, $index );
				if ( in_array( $operation, array( Presets::BATCH, Album_Presets::BATCH ), true ) ) { $target['preset_id'] = $input['preset_id']; $target['preset_revision'] = $input['preset_revision']; }
				$previous = Requests::existing( $target, $child_operation );
				if ( null !== $previous ) { continue; }
				if ( self::MEDIA === $operation && ! in_array( $child_operation, self::media_operations(), true ) ) {
					$out = Requests::outcome( $target['request_id'], 'rejected', 'unsupported_operation', 'Use a supported collection, favorite or local attachment mutation.', $child_operation );
				} else { $out = wp_get_ability( $child_operation )->execute( $target ); }
				if ( is_wp_error( $out ) ) { $out = Requests::outcome( $target['request_id'], 'forbidden', 'current_permission_denied', 'Current permissions are required.', $child_operation ); }
				// Validation refusals also become terminal child results; they must not change on replay.
				if ( null === Requests::existing( $target, $child_operation ) ) {
					$claimed = Requests::claim( $target, $child_operation );
					if ( null === $claimed ) { Requests::finish( $target['request_id'], $out ); }
				}
				// An observable boundary for interruption tests and integrations; no input payload is retained.
				do_action( 'modula_abilities_batch_target_finished', $request, $index );
			}
			$out = self::recover( $request, Requests::record( $request ) );
			$statuses = array_column( $out['targets'], 'status' );
			$out['status'] = count( array_filter( $statuses, static function ( $status ) { return 'succeeded' === $status; } ) ) === count( $statuses ) ? 'succeeded' : 'partial';
			$out['code'] = ''; $out['message'] = ''; $out['reconciliation'] = '';
			return Requests::finish( $request, $out );
		} catch ( \Throwable $error ) {
			$record = Requests::record( $request );
			return $record ? self::recover( $request, $record ) : Requests::outcome( $request, 'uncertain', 'batch_unconfirmed', 'Admission could not be confirmed; recover this identity.', $operation );
		} finally { $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) ); }
	}
	public static function child_id( string $request, int $index ): string { return 'batch_' . hash( 'sha256', $request . ':' . $index ); }
	public static function recover( string $request, array $record ): array {
		$operation = $record['operation'];
		$child_operation = self::child_operation( $operation );
		$out = Requests::outcome( $request, $record['status'], '', '', $operation );
		$out['targets'] = array();
		foreach ( $record['targets'] as $index => $target ) {
			$id = $target['id'];
			if ( self::MEDIA === $operation ) { $child_operation = $target['operation']; }
			$child = self::child_id( $request, $index );
			// Access failures expose only the caller-supplied identity, never saved title/settings/links.
			if ( self::MEDIA === $operation && ! in_array( $child_operation, self::media_operations(), true ) ) {
				$result = Requests::outcome( $child, 'rejected', 'unsupported_operation', 'Use a supported collection, favorite or local attachment mutation.', $child_operation );
			} elseif ( ! ( self::MEDIA === $operation ? Media_Folders::can_manage() : ( Album_Presets::BATCH === $operation ? Albums::can_access( $id ) : Update::can_update( $id, $target['publication'] ) ) ) ) {
				$result = Requests::outcome( $child, 'forbidden', 'current_permission_denied', 'Current target permissions are required.', $child_operation );
			} else {
				$result = Requests::recover( array( 'request_id' => $child ) );
				if ( 'not_found' === $result['status'] ) { $result = Requests::outcome( $child, 'pending', 'target_pending', 'This target has not started. Resume with the unchanged batch input.', $child_operation ); }
			}
			$result['id'] = $id;
			$out['targets'][] = $result;
		}
		if ( isset( $record['expires_at'] ) ) { $out['expires_at'] = $record['expires_at']; }
		return $out;
	}
}
