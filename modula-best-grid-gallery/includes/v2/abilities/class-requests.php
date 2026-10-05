<?php
/** Durable request admission and safe outcome recovery shared by native/MCP callers. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Requests {
	public const PREFIX = 'modula_ability_request_';
	public const RETENTION = 30 * DAY_IN_SECONDS;
	private const INTERRUPTED_AFTER = 5 * MINUTE_IN_SECONDS;

	public static function outcome( string $request, string $status, string $code = '', string $message = '', string $operation = 'modula/create-gallery' ): array {
		return array(
			'schema_version' => Contract::VERSION, 'request_id' => $request, 'operation' => $operation,
			'status' => $status, 'code' => $code, 'message' => $message,
			'reconciliation' => in_array( $status, array( 'uncertain', 'in_progress' ), true )
				? 'Recover this same request identity. Inspect the resource in its editor if supplied, or reconcile owned resources with an administrator. Do not repeat the effect with a new identity.' : '',
		);
	}

	/** Time is a system boundary; tests may advance it without changing the site clock. */
	public static function now(): int {
		return (int) apply_filters( 'modula_abilities_time', time() );
	}

	private static function key( string $request ): string {
		return self::PREFIX . hash( 'sha256', get_current_blog_id() . ':' . get_current_user_id() . ':' . $request );
	}

	/** Read the authoritative database, avoiding cached misses in concurrent processes. */
	public static function record( string $request ): ?array {
		global $wpdb;
		$value = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", self::key( $request ) ) );
		$value = null === $value ? null : maybe_unserialize( $value );
		return is_array( $value ) ? $value : null;
	}

	public static function cleanup(): void {
		global $wpdb;
		$cursor = (string) get_option( 'modula_ability_cleanup_cursor', '' );
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name > %s ORDER BY option_name LIMIT 200", $wpdb->esc_like( 'modula_ability_result_' ) . '%', $cursor ), ARRAY_A );
		foreach ( $rows as $row ) {
			$result = maybe_unserialize( $row['option_value'] );
			if ( is_array( $result ) && self::now() >= ( $result['expires_at'] ?? PHP_INT_MAX ) ) {
				delete_option( $row['option_name'] );
			}
		}
		update_option( 'modula_ability_cleanup_cursor', 200 === count( $rows ) ? end( $rows )['option_name'] : '', false );
	}

	private static function result_key( string $request ): string {
		return 'modula_ability_result_' . substr( self::key( $request ), strlen( self::PREFIX ) );
	}

	public static function existing( array $input, string $operation = 'modula/create-gallery' ): ?array {
		$record = self::record( $input['request_id'] );
		return $record ? self::replay( $input, $record, $operation ) : null;
	}

	private static function save( string $request, array $record ): bool {
		update_option( self::key( $request ), $record, false );
		return self::record( $request ) === $record;
	}

	public static function fingerprint( array $input, string $operation = 'modula/create-gallery' ): string {
		// Object property order is irrelevant; attachment order is significant.
		self::sort_objects( $input );
		return hash( 'sha256', $operation . ':' . wp_json_encode( $input ) );
	}

	private static function sort_objects( array &$value ): void {
		if ( array_values( $value ) !== $value ) { ksort( $value ); }
		foreach ( $value as &$child ) { if ( is_array( $child ) ) { self::sort_objects( $child ); } }
	}

	/** null means admitted; any outcome means the caller must not execute. */
	public static function claim( array $input, string $operation = 'modula/create-gallery' ): ?array {
		$request = $input['request_id'];
		$record = self::record( $request );
		if ( $record ) {
			return self::replay( $input, $record, $operation );
		}
		$record = array( 'operation' => $operation, 'fingerprint' => self::fingerprint( $input, $operation ), 'started' => self::now(), 'status' => 'in_progress', 'attachment_ids' => Embedded::OPERATION === $operation ? Embedded::referenced_attachment_ids( $input['item_changes'] ) : ( 'modula/create-gallery' === $operation ? $input['attachment_ids'] : ( Composition::OPERATION === $operation ? Composition::referenced_attachment_ids( $input['changes'] ) : array() ) ), 'publication' => is_string( $input['status'] ?? ( $input['metadata']['status'] ?? null ) ) ? ( $input['status'] ?? $input['metadata']['status'] ) : '', 'target' => $input['id'] ?? 0 );
		if ( in_array( $operation, array( Batch::OPERATION, Batch::MEDIA, Presets::BATCH, Album_Presets::BATCH ), true ) ) {
			$record['targets'] = array_map( static function ( $target ) { return array( 'id' => $target['id'], 'operation' => is_string( $target['operation'] ?? null ) ? $target['operation'] : '', 'publication' => is_string( $target['metadata']['status'] ?? null ) ? $target['metadata']['status'] : '' ); }, $input['targets'] );
		}
		if ( in_array( $operation, array_merge( Lifecycle::operations(), Album_Lifecycle::operations(), Attachment_Lifecycle::operations() ), true ) ) {
			$record['required_caps'] = array_unique( array_merge( map_meta_cap( 'edit_post', get_current_user_id(), $input['id'] ), map_meta_cap( 'delete_post', get_current_user_id(), $input['id'] ) ) );
		}
		if ( in_array( $operation, array_merge( Presets::mutations(), Album_Presets::mutations() ), true ) ) {
			$record['preset_id'] = $input['preset_id'] ?? 0;
			$record['required_caps'] = in_array( $operation, array( 'modula/delete-gallery-preset', 'modula/delete-album-preset' ), true ) ? array_unique( array_merge( map_meta_cap( 'edit_post', get_current_user_id(), $input['id'] ), map_meta_cap( 'delete_post', get_current_user_id(), $input['id'] ) ) ) : array();
		}
		if ( in_array( $operation, Watermark::mutations(), true ) ) { $record['attachment_ids'] = Watermark::referenced_attachment_ids( $input, $operation ); }
		if ( Video::UPDATE === $operation ) { $record['attachment_ids'] = Video::referenced_attachment_ids( $input['video_changes'], $input['id'] ); }
		if ( Proofing_Clients::ASSOCIATE === $operation ) { $record['client_id'] = $input['user_id']; }
		// The unique option_name is the cross-process admission lock. Never steal it.
		if ( add_option( self::key( $request ), $record, '', false ) ) {
			if ( ! wp_next_scheduled( 'modula_abilities_cleanup' ) ) {
				wp_schedule_event( time(), 'hourly', 'modula_abilities_cleanup' );
			}
			return null;
		}
		$existing = self::record( $request );
		return $existing ? self::replay( $input, $existing, $operation ) : self::outcome( $request, 'uncertain', 'admission_unconfirmed', 'Request admission could not be confirmed. No new execution is allowed.', $operation );
	}

	private static function replay( array $input, array $record, string $operation ): array {
		if ( ! hash_equals( $record['fingerprint'], self::fingerprint( $input, $operation ) ) ) {
			return self::outcome( $input['request_id'], 'conflict', 'request_payload_mismatch', 'This identity is already bound to a different operation or input.', $operation );
		}
		return self::recover( array( 'request_id' => $input['request_id'] ) );
	}

	public static function context( string $request, array $context ): void {
		$record = self::record( $request );
		if ( ! $record || ! self::save( $request, array_merge( $record, $context ) ) ) { throw new \RuntimeException( 'Request context unconfirmed.' ); }
	}

	public static function target( string $request, int $id ): bool {
		$record = self::record( $request );
		if ( ! $record ) {
			return false;
		}
		$record['target'] = $id;
		return self::save( $request, $record );
	}

	/** Store no raw input, credentials or media bytes; the identity record survives result cleanup. */
	public static function finish( string $request, array $outcome ): array {
		$record = self::record( $request );
		if ( ! $record ) {
			return self::outcome( $request, 'uncertain', 'result_unconfirmed', 'The effect may have occurred, but its durable outcome could not be confirmed.', $outcome['operation'] );
		}
		$outcome['expires_at'] = $record['expires_at'] ?? ( self::now() + self::RETENTION );
		$result_key = self::result_key( $request );
		update_option( $result_key, $outcome, false );
		global $wpdb;
		$stored = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $result_key ) );
		if ( maybe_unserialize( $stored ) !== $outcome ) {
			return self::outcome( $request, 'uncertain', 'result_unconfirmed', 'The effect may have occurred, but its durable outcome could not be confirmed.', $outcome['operation'] );
		}
		$record['status'] = $outcome['status'];
		$record['expires_at'] = $outcome['expires_at'];
		if ( ! self::save( $request, $record ) ) {
			return self::outcome( $request, 'uncertain', 'result_unconfirmed', 'The effect may have occurred, but its durable outcome could not be confirmed.', $outcome['operation'] );
		}
		return self::recover( array( 'request_id' => $request ) );
	}

	public static function recover( array $input ): array {
		$request = $input['request_id'];
		if ( ! Integration::can_recover() ) {
			return self::outcome( $request, 'forbidden', 'current_permission_denied', 'Current Modula permissions are required.' );
		}
		$record = self::record( $request );
		if ( ! $record ) {
			return self::outcome( $request, 'not_found', 'request_not_found', 'No request exists for this actor and site.' );
		}
		if ( in_array( $record['operation'], array( Batch::OPERATION, Batch::MEDIA, Presets::BATCH, Album_Presets::BATCH ), true ) ) {
			if ( isset( $record['expires_at'] ) && self::now() >= $record['expires_at'] ) { return self::outcome( $request, 'expired', 'request_expired', 'This batch identity cannot execute again.', $record['operation'] ); }
			return Batch::recover( $request, $record );
		}
		// Identity is never an access token. Recheck the original operation and every target.
		$preset = in_array( $record['operation'], array_merge( Presets::mutations(), Album_Presets::mutations() ), true );
		$album = Album_Presets::APPLY === $record['operation'] || in_array( $record['operation'], Album_Lifecycle::operations(), true ) || Album_Members::OPERATION === $record['operation'] || in_array( $record['operation'], Albums::mutations(), true );
		if ( ! self::can_recover_record( $record ) ) {
			return self::outcome( $request, 'forbidden', 'current_permission_denied', 'Current operation, resource and attachment permissions are required.', $record['operation'] );
		}

		if ( in_array( $record['operation'], array( Transfers::START, Transfers::LIBRARY ), true ) && 'in_progress' === $record['status'] && isset( $record['job_id'] ) ) { return Transfers::recover( $request, $record ); }
		if ( isset( $record['expires_at'] ) && self::now() >= $record['expires_at'] ) {
			return self::outcome( $request, 'expired', 'request_expired', 'The 30-day result retention has elapsed. This identity cannot execute again.', $record['operation'] );
		}
		if ( 'in_progress' !== $record['status'] ) {
			global $wpdb;
			$result_key = self::result_key( $request );
			$outcome = maybe_unserialize( $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $result_key ) ) );
			if ( is_array( $outcome ) ) {
				return $outcome;
			}
			// A missing durable result must never make this a new request or imply confirmed success.
			return self::outcome( $request, 'uncertain', 'result_unavailable', 'The retained result is unavailable; reconcile the existing effect.', $record['operation'] );
		}
		$interrupted = self::now() - $record['started'] >= self::INTERRUPTED_AFTER;
		$outcome = self::outcome( $request, $interrupted ? 'uncertain' : 'in_progress', $interrupted ? 'request_interrupted' : 'request_active', $interrupted ? 'Execution confirmation is missing; the effect may have occurred.' : 'This request is already executing.', $record['operation'] );
		if ( isset( $record['storage'] ) ) { $outcome['storage'] = $record['storage']; }
		foreach ( array( 'watermark', 'video', 'instagram', 'ai', 'css', 'proofing', 'proofing_email', 'selection', 'client' ) as $kind ) { if ( isset( $record[ $kind ] ) ) { $outcome[ $kind ] = $record[ $kind ]; } }
		if ( isset( $record['file'] ) ) { $outcome['file'] = $record['file']; }
		if ( isset( $record['intake'] ) ) { $outcome['intake'] = $record['intake']; }
		if ( $record['target'] && Ai_Text::GENERATE !== $record['operation'] && ! in_array( $record['operation'], Storage::mutations(), true ) && Replacement::WRITE !== $record['operation'] && ! in_array( $record['operation'], Attachment_Lifecycle::operations(), true ) && ! in_array( $record['operation'], Collections::mutations(), true ) && Attachments::UPDATE !== $record['operation'] && ! in_array( $record['operation'], Media_Folders::mutations(), true ) ) {
			$kind = $album ? 'album' : ( $preset && Presets::APPLY !== $record['operation'] ? 'preset' : 'gallery' );
			if ( get_post( $record['target'] ) ) { $outcome[ $kind ] = $album ? Albums::summary( $record['target'] ) : ( 'preset' === $kind ? Presets::summary( $record['target'] ) : Integration::gallery( get_post( $record['target'] ) ) ); }
		}
		return $outcome;
	}

	private static function can_recover_record( array $record ): bool {
		$operation = $record['operation'];
		if ( in_array( $operation, array_merge( Proofing::mutations(), Proofing_Selections::mutations(), array( Proofing_Email::SEND ) ), true ) ) { return Proofing::can_recover( $record ); }
		if ( in_array( $operation, Proofing_Clients::mutations(), true ) ) { return Proofing_Clients::can_recover( $record ); }
		if ( Ai_Css::GENERATE === $operation ) { return Ai_Css::can_recover( $record ); }
		if ( Instagram::SYNC === $operation ) { return Instagram::can_recover( $record ); }
		if ( Ai_Text::GENERATE === $operation ) { return Ai_Text::can_recover( $record ); }
		if ( in_array( $operation, Watermark::mutations(), true ) ) { return Watermark::can_recover( $record ); }
		if ( in_array( $operation, Video::mutations(), true ) ) { return Video::can_recover( $record ); }
		if ( in_array( $operation, Transfers::mutations(), true ) ) { return Transfers::can_recover( $record ); }
		if ( in_array( $operation, Bound::mutations(), true ) ) { return Bound::can_recover( $record ); }
		if ( in_array( $operation, Storage::mutations(), true ) ) { return Storage::can_recover( $record ); }
		if ( Replacement::WRITE === $operation ) { return Replacement::can_recover( $record ); }
		if ( in_array( $operation, Diagnostics::mutations(), true ) ) { return Diagnostics::can_manage(); }
		if ( in_array( $operation, Intake::operations(), true ) ) { return Intake::can_recover( $record ); }
		if ( in_array( $operation, Site_Settings::mutations(), true ) ) { return Site_Settings::EXTENSION === $operation ? Site_Settings::can_extend() : Site_Settings::can_manage(); }
		if ( in_array( $operation, Attachment_Lifecycle::operations(), true ) ) { return Attachment_Lifecycle::can_recover( $record ); }
		if ( in_array( $operation, Collections::mutations(), true ) ) { return Collections::can_recover( $record ); }
		if ( Attachments::UPDATE === $operation ) { return Attachments::can_read( $record['target'] ); }
		if ( in_array( $operation, Media_Folders::mutations(), true ) ) { return Media_Folders::can_recover( $record ); }
		if ( in_array( $operation, Album_Lifecycle::operations(), true ) ) { return Album_Lifecycle::can_recover( $record ); }
		if ( Album_Members::OPERATION === $operation ) { return Album_Members::can_recover( $record ); }
		if ( in_array( $operation, Album_Presets::mutations(), true ) ) { return Album_Presets::can_recover( $record ); }
		if ( in_array( $operation, Presets::mutations(), true ) ) { return Presets::can_recover( $record ); }
		if ( in_array( $operation, Albums::mutations(), true ) ) { return Albums::can_recover( $record ); }
		if ( in_array( $operation, Lifecycle::operations(), true ) ) { return Lifecycle::can_recover( $record ); }
		$permitted = in_array( $operation, array( Update::OPERATION, Composition::OPERATION, Embedded::OPERATION ), true )
			? Update::can_update( $record['target'], $record['publication'] ) : Creation::can_create( $record['publication'] );
		return $permitted && ( ! $record['target'] || Integration::can_read_post( $record['target'] ) ) && Creation::can_use_attachments( $record['attachment_ids'] );
	}

	public static function output_failure( array $input ): array {
		$request = is_string( $input['request_id'] ?? null ) ? $input['request_id'] : '';
		if ( ! preg_match( '/^[A-Za-z0-9_-]{16,128}$/', $request ) ) {
			return self::outcome( '', 'rejected', 'invalid_input', 'A valid request_id is required for recovery.' );
		}
		$current = self::recover( array( 'request_id' => $request ) );
		if ( in_array( $current['status'], array( 'forbidden', 'not_found', 'expired' ), true ) ) {
			return $current;
		}
		$outcome = self::outcome( $request, 'uncertain', 'output_validation_failed', 'Execution returned an invalid confirmation. Reconcile the saved resource before any new action.', $current['operation'] );
		foreach ( array( 'gallery', 'album', 'preset', 'intake', 'diagnostics', 'file', 'watermark', 'video', 'instagram', 'ai', 'css', 'proofing', 'proofing_email', 'selection', 'client', 'storage', 'transfer' ) as $kind ) { if ( isset( $current[ $kind ] ) ) { $outcome[ $kind ] = $current[ $kind ]; } }
		return self::finish( $request, $outcome );
	}
}
