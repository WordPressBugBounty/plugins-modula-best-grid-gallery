<?php
/** Beta album inspection and metadata/settings mutations over the Pro document service. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula_Pro\Extensions\Albums\V2\Meta_Sync;
use Modula_Pro\Extensions\Albums\V2\Sanitizer;
use Modula_Pro\Extensions\Albums\V2\Rest\Album_Settings_Controller;

defined( 'ABSPATH' ) || exit;

final class Albums {
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-albums' ) && class_exists( Meta_Sync::class );
	}
	/** Validate active stored settings without treating dormant defaults as feature use. */
	public static function validate_configuration( array $settings ) {
		$defaults = Sanitizer::sanitize_grouped( array() );
		$normalized_defaults = Sanitizer::sanitize_grouped( $defaults );
		$active = array();
		$readable = Contract::settings_schema( \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() );
		foreach ( $settings as $group => $fields ) {
			if ( ! is_array( $fields ) ) { return new \WP_Error( 'invalid_album_settings', 'Invalid stored album settings.' ); }
			foreach ( $fields as $key => $value ) {
				// Opaque integration-owned keys are preserved, never interpreted as features.
				if ( ! isset( $readable['properties'][$group]['properties'][$key] ) || ! array_key_exists( $key, $defaults[$group] ?? array() ) ) { continue; }
				if ( $value === $defaults[$group][$key] || $value === $normalized_defaults[$group][$key] ) { continue; }
				$active[$group][$key] = $value;
			}
		}
		return $active ? \Modula_Pro\Extensions\Albums\V2\Settings_Writer::validate_patch( 0, $active ) : true;
	}
	public static function mutations(): array { return array( 'modula/create-album', 'modula/update-album' ); }
	public static function callbacks(): array {
		return array( 'modula/list-albums' => array( self::class, 'listing' ), 'modula/read-album' => array( self::class, 'read' ), 'modula/create-album' => array( self::class, 'create' ), 'modula/update-album' => array( self::class, 'update' ) );
	}
	public static function definitions(): array {
		$settings = self::available() ? Settings_Contract::schema( true ) : Contract::object( array() );
		$summary = Contract::gallery_schema();
		$summary['properties']['revision'] = Contract::revision_schema();
		$read = $summary;
		$read['properties']['settings'] = self::available() ? Contract::settings_schema( \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() ) : Contract::object( array() );
		$title = array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 );
		$status = array( 'type' => 'string', 'enum' => array( 'draft', 'publish' ) );
		$id = array( 'type' => 'integer', 'minimum' => 1 );
		$inputs = array(
			'modula/list-albums' => Contract::object( Contract::pagination() + array( 'search' => array( 'type' => 'string', 'maxLength' => 100 ), 'status' => array( 'type' => 'string', 'enum' => array( 'any', 'draft', 'publish', 'private', 'pending', 'trash' ) ) ) ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ),
			'modula/read-album' => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			'modula/create-album' => Contract::object( array( 'request_id' => Contract::request_id_schema(), 'title' => $title, 'status' => $status, 'settings' => $settings ), array( 'request_id', 'title', 'status' ) ),
			'modula/update-album' => Contract::object( array( 'request_id' => Contract::request_id_schema(), 'id' => $id, 'revision' => Contract::revision_schema(), 'metadata' => Contract::object( array( 'title' => $title, 'status' => $status ) ) + array( 'minProperties' => 1 ), 'settings' => $settings ), array( 'request_id', 'id', 'revision' ) ),
		);
		$out = array();
		foreach ( $inputs as $name => $input ) {
			$output = 'modula/list-albums' === $name ? Contract::object( Contract::page_output() + array( 'albums' => array( 'type' => 'array', 'items' => $summary ) ), array_merge( array_keys( Contract::page_output() ), array( 'albums' ) ) ) : ( 'modula/read-album' === $name ? Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'album' => $read ), array( 'schema_version', 'album' ) ) : Contract::outcome_schema() );
			$out[ $name ] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'Requires enabled, entitled Albums and current album permissions. Beta only. Pure paginated reads; explicit draft/publish creation. Settings patches preserve members, passwords and omitted fields. Writes use document revisions and 30-day request recovery. No containing page or member changes.', 'input_schema' => $input, 'output_schema' => $output );
		}
		return $out;
	}
	public static function can_access( int $id = 0, string $status = '', bool $create = false ): bool {
		$type = get_post_type_object( 'modula-album' );
		return self::available() && Integration::can_discover() && $type && current_user_can( $type->cap->edit_posts )
			&& ( ! $create || current_user_can( $type->cap->create_posts ) )
			&& ( 'publish' !== $status || current_user_can( $type->cap->publish_posts ) )
			&& ( ! $id || ( 'modula-album' === get_post_type( $id ) && current_user_can( 'edit_post', $id ) && ( 'private' !== get_post_status( $id ) || current_user_can( 'read_post', $id ) ) ) );
	}
	public static function can_recover( array $record ): bool {
		return self::can_access( (int) $record['target'], $record['publication'], 'modula/create-album' === $record['operation'] );
	}
	public static function summary( int $id ): array {
		$post = get_post( $id );
		return array( 'id' => $id, 'title' => $post->post_title, 'status' => $post->post_status, 'editor_url' => admin_url( 'post.php?post=' . $id . '&action=edit' ), 'shortcode' => '[modula-album id="' . $id . '"]', 'revision' => Revision::document( $id ) );
	}
	public static function listing( array $input ) {
		if ( ! self::can_access() ) { return new \WP_Error( 'modula_forbidden', 'Current album permissions and entitlement are required.' ); }
		$ids = array(); $scan = 1;
		do {
			$query = new \WP_Query( array( 'post_type' => 'modula-album', 'post_status' => empty( $input['status'] ) || 'any' === $input['status'] ? array( 'draft', 'publish', 'private', 'pending', 'trash' ) : $input['status'], 'meta_key' => Beta_Settings::META_KEY, 'meta_value' => '1', 's' => $input['search'] ?? '', 'fields' => 'ids', 'posts_per_page' => 200, 'paged' => $scan++, 'orderby' => 'ID', 'order' => 'ASC', 'no_found_rows' => true ) );
			foreach ( $query->posts as $id ) { if ( self::can_access( (int) $id ) && Beta_Settings::is_beta_album( $id ) ) { $ids[] = (int) $id; } }
		} while ( 200 === count( $query->posts ) );
		$page = $input['page'] ?? 1; $size = $input['per_page'] ?? 20;
		return array( 'schema_version' => Contract::VERSION, 'page' => $page, 'per_page' => $size, 'total' => count( $ids ), 'total_pages' => (int) ceil( count( $ids ) / $size ), 'albums' => array_map( array( self::class, 'summary' ), array_slice( $ids, ( $page - 1 ) * $size, $size ) ) );
	}
	public static function read( array $input ) {
		$id = (int) $input['id'];
		if ( ! self::can_access( $id ) ) { return new \WP_Error( 'modula_forbidden', 'Current album permissions and entitlement are required.' ); }
		if ( ! Beta_Settings::is_beta_album( $id ) ) { return new \WP_Error( 'modula_classic_unsupported', 'Only Beta albums are supported.' ); }
		$revision = Revision::document( $id );
		$album = self::summary( $id );
		$album['settings'] = Contract::project( Meta_Sync::get_settings_v2( $id ), Contract::settings_schema( \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() ) );
		if ( ! hash_equals( $revision, Revision::document( $id ) ) ) { return new \WP_Error( 'modula_read_conflict', 'Album changed while reading. Read again.' ); }
		return array( 'schema_version' => Contract::VERSION, 'album' => $album );
	}
	public static function create( array $input ): array { return self::write( $input, true ); }
	public static function update( array $input ): array { return self::write( $input, false ); }
	private static function write( array $input, bool $create ): array {
		$operation = $create ? 'modula/create-album' : 'modula/update-album';
		$request = $input['request_id'];
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$id = $create ? 0 : $input['id'];
		$metadata = $create ? array( 'title' => $input['title'], 'status' => $input['status'] ) : ( $input['metadata'] ?? array() );
		$outcome = static function ( $status, $code = '', $message = '' ) use ( $request, $operation ) { return Requests::outcome( $request, $status, $code, $message, $operation ); };
		if ( ! self::can_access( $id, $metadata['status'] ?? '', $create ) ) { return $outcome( 'forbidden', 'current_permission_denied', 'Current album permissions and entitlement are required.' ); }
		if ( ! $create && ( ! Beta_Settings::is_beta_album( $id ) || 'trash' === get_post_status( $id ) ) ) { return $outcome( 'rejected', 'unsupported_target', 'Only Beta albums outside trash can be changed.' ); }
		if ( ( isset( $metadata['title'] ) && '' === trim( sanitize_text_field( $metadata['title'] ) ) ) || ( ! $metadata && empty( $input['settings'] ) ) ) { return $outcome( 'rejected', 'invalid_patch', 'Provide a nonempty title or settings patch.' ); }
		if ( ! empty( $input['settings'] ) ) {
			$valid = \Modula_Pro\Extensions\Albums\V2\Settings_Writer::validate_patch( $id, $input['settings'] );
			if ( is_wp_error( $valid ) ) { return $outcome( 'rejected', $valid->get_error_code(), $valid->get_error_message() ); }
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$transaction = false;
		try {
			Revision::begin(); $transaction = true;
			if ( $create ) { Revision::document( 0, true ); }
			if ( ! $create && ! hash_equals( Revision::document( $id, true ), $input['revision'] ) ) {
				Revision::end( false ); $transaction = false;
				return Requests::finish( $request, $outcome( 'conflict', 'stale_revision', 'Read and reconcile the album before submitting a new request.' ) );
			}
			if ( ! self::can_access( $id, $metadata['status'] ?? '', $create ) ) { throw new \RuntimeException( 'Access changed.' ); }
			if ( $create ) {
				$id = wp_insert_post( wp_slash( array( 'post_type' => 'modula-album', 'post_status' => 'draft', 'post_title' => sanitize_text_field( $metadata['title'] ), 'post_author' => get_current_user_id(), 'meta_input' => array( Beta_Settings::META_KEY => '1' ) ) ), true );
				if ( is_wp_error( $id ) || ! $id ) { throw new \RuntimeException( 'Creation unconfirmed.' ); }
				Revision::track( array( $id ) );
				Meta_Sync::apply_new_beta_album_create_defaults( $id );
				if ( ! Requests::target( $request, $id ) ) { throw new \RuntimeException( 'Target unconfirmed.' ); }
			}
			// Metadata first: the ordinary post hook reprojects flat album settings.
			$post = array( 'ID' => $id );
			foreach ( array( 'title' => 'post_title', 'status' => 'post_status' ) as $key => $field ) { if ( isset( $metadata[ $key ] ) ) { $post[ $field ] = 'title' === $key ? sanitize_text_field( $metadata[ $key ] ) : $metadata[ $key ]; } }
			if ( count( $post ) > 1 && is_wp_error( Meta_Sync::with_canonical_write( $id, static function () use ( $post ) { return wp_update_post( wp_slash( $post ), true ); } ) ) ) { throw new \RuntimeException( 'Metadata unconfirmed.' ); }
			if ( ! empty( $input['settings'] ) ) {
				$saved = \Modula_Pro\Extensions\Albums\V2\Settings_Writer::patch( $id, $input['settings'], true );
				if ( is_wp_error( $saved ) ) { throw new \RuntimeException( 'Settings unconfirmed.' ); }
			}
			Revision::clear_cache();
			foreach ( $post as $key => $value ) { if ( 'ID' !== $key && get_post( $id )->$key !== $value ) { throw new \RuntimeException( 'Metadata confirmation differs.' ); } }
			$out = $outcome( 'succeeded' ); $out['album'] = self::summary( $id );
			$out = Requests::finish( $request, $out );
			if ( 'succeeded' !== $out['status'] ) { throw new \RuntimeException( 'Outcome unconfirmed.' ); }
			Revision::end( true ); $transaction = false;
			return $out;
		} catch ( \Throwable $error ) {
			if ( $transaction ) { Revision::end( false ); }
			return Requests::finish( $request, $outcome( 'uncertain', 'album_write_unconfirmed', 'Album write was not confirmed. Recover this identity before another action.' ) );
		}
	}
}
