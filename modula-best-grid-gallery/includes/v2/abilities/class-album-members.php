<?php
/** Revision-protected album composition. The graph includes classic references and post_parent. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula_Pro\Extensions\Albums\V2\Members_Document;

defined( 'ABSPATH' ) || exit;

final class Album_Members {
	public const OPERATION = 'modula/update-album-members';
	public static function callbacks(): array {
		return array( 'modula/read-album-members' => array( self::class, 'read' ), 'modula/list-album-member-candidates' => array( self::class, 'candidates' ), self::OPERATION => array( self::class, 'execute' ) );
	}
	public static function definitions(): array {
		$id = array( 'type' => 'integer', 'minimum' => 1 );
		$member = Contract::object( array( 'id' => $id, 'itemType' => array( 'type' => 'string', 'enum' => array( 'modula-gallery', 'modula-album' ) ), 'width' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 12 ), 'height' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100 ), 'gridX' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 11 ), 'gridY' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 100000 ) ), array( 'id', 'itemType' ) );
		$read_member = Contract::object( array( 'id' => $id, 'itemType' => array( 'type' => 'string' ), 'width' => array( 'type' => array( 'integer', 'string' ) ), 'height' => array( 'type' => array( 'integer', 'string' ) ), 'gridX' => array( 'type' => array( 'integer', 'string' ) ), 'gridY' => array( 'type' => array( 'integer', 'string' ) ) ), array( 'id', 'itemType' ) );
		$result = Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'id' => $id, 'revision' => Contract::revision_schema(), 'members' => array( 'type' => 'array', 'items' => $read_member ) ), array( 'schema_version', 'id', 'revision', 'members' ) );
		$candidate = Contract::object( array( 'id' => $id, 'itemType' => array( 'type' => 'string' ), 'title' => array( 'type' => 'string' ) ), array( 'id', 'itemType', 'title' ) );
		$inputs = array(
			'modula/read-album-members' => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			'modula/list-album-member-candidates' => Contract::object( array( 'id' => $id, 'search' => array( 'type' => 'string', 'maxLength' => 100 ) ) + Contract::pagination(), array( 'id' ) ),
			self::OPERATION => Contract::object( array( 'request_id' => Contract::request_id_schema(), 'id' => $id, 'revision' => Contract::revision_schema(), 'members' => array( 'type' => 'array', 'maxItems' => 500, 'items' => $member ) ), array( 'request_id', 'id', 'revision', 'members' ) ),
		);
		$out = array();
		foreach ( $inputs as $name => $input ) {
			$output = self::OPERATION === $name ? Contract::outcome_schema() : $result;
			if ( 'modula/list-album-member-candidates' === $name ) { $output = Contract::object( Contract::page_output() + array( 'candidates' => array( 'type' => 'array', 'items' => $candidate ) ), array_merge( array_keys( Contract::page_output() ), array( 'candidates' ) ) ); }
			$out[$name] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'Beta album composition with current object permissions and Albums entitlement. Supply the complete ordered member identity list (0–500); omitted member attributes are preserved. Layout spans 1–12 by 1–100. Uses the read-album-members graph revision; concurrent album hierarchy changes conflict. Nested reparenting checks child and previous parent; classic child reparenting is refused. Removing members never deletes their objects or media. 30-day replay and recovery.', 'input_schema' => $input, 'output_schema' => $output );
		}
		return $out;
	}
	private static function target( int $id ): bool { return Albums::can_access( $id ) && Beta_Settings::is_beta_album( $id ) && 'trash' !== get_post_status( $id ); }
	/** Pure projection, including preserved soft-hidden members. Never call repair-on-read. */
	public static function members( int $id ): array {
		$raw = get_post_meta( $id, Members_Document::MEMBERS_V2_META_KEY, true );
		if ( '' !== $raw ) { return Members_Document::get_document( $id )['members']; }
		$classic = get_post_meta( $id, Members_Document::CLASSIC_META_KEY, true );
		return Members_Document::sanitize_members_list( is_array( $classic ) ? $classic : array() );
	}
	/** Conservative graph token locks all album rows, metadata ranges, and hierarchy insertion gaps. */
	public static function graph( bool $lock = false ): array {
		global $wpdb;
		$ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'modula-album' ORDER BY ID" . ( $lock ? ' FOR UPDATE' : '' ) );
		if ( $wpdb->last_error ) { throw new \RuntimeException( 'Album graph unavailable.' ); }
		$graph = array();
		foreach ( $ids as $id ) {
			$revision = Revision::document( (int) $id, $lock );
			$post = get_post( $id );
			if ( ! $post || 'modula-album' !== $post->post_type ) { continue; }
			$graph[(int) $id] = array( 'revision' => $revision, 'parent' => (int) $post->post_parent, 'members' => self::members( (int) $id ) );
		}
		return $graph;
	}
	public static function token( array $graph ): string { return hash( 'sha256', wp_json_encode( $graph ) ); }
	public static function read( array $input ) {
		$id = $input['id'];
		if ( ! self::target( $id ) ) { return new \WP_Error( 'modula_forbidden', 'An accessible Beta album outside trash is required.' ); }
		$graph = self::graph();
		if ( ! isset( $graph[$id] ) || ! self::target( $id ) ) { return new \WP_Error( 'modula_read_conflict', 'Album changed while reading.' ); }
		$members = array();
		foreach ( $graph[$id]['members'] as $member ) {
			if ( ! current_user_can( 'edit_post', $member['id'] ) || ! current_user_can( 'read_post', $member['id'] ) ) { return new \WP_Error( 'modula_forbidden', 'Current member access is required.' ); }
			$members[] = array_intersect_key( $member, array_flip( array( 'id', 'itemType', 'width', 'height', 'gridX', 'gridY' ) ) );
		}
		$revision = self::token( $graph );
		if ( ! hash_equals( $revision, self::token( self::graph() ) ) ) { return new \WP_Error( 'modula_read_conflict', 'Album hierarchy changed while reading.' ); }
		return array( 'schema_version' => Contract::VERSION, 'id' => $id, 'revision' => $revision, 'members' => $members );
	}
	private static function eligible_member( int $id ): bool {
		return in_array( get_post_type( $id ), array( 'modula-gallery', 'modula-album' ), true ) && current_user_can( 'edit_post', $id ) && current_user_can( 'read_post', $id );
	}
	/** Validate the whole change and all downstream writes before any effect. */
	private static function plan( int $id, array $incoming, array $graph ) {
		$old = array_column( $graph[$id]['members'], null, 'id' );
		foreach ( $old as $member ) { if ( ! self::eligible_member( $member['id'] ) ) { return new \WP_Error( 'inaccessible_member', 'Current access to existing members is required.' ); } }
		$next = array(); $parents = array(); $documents = array(); $access = array_merge( array( $id ), array_keys( $old ) );
		foreach ( $incoming as $row ) {
			$member = $row['id'];
			if ( isset( $next[$member] ) || ! self::eligible_member( $member ) || $row['itemType'] !== get_post_type( $member ) || ( ! isset( $old[$member] ) && 'trash' === get_post_status( $member ) ) ) { return new \WP_Error( 'invalid_member', 'Member is duplicate, inaccessible or ineligible.' ); }
			$base = $old[$member] ?? array( 'id' => $member, 'itemType' => $row['itemType'], 'width' => 1, 'height' => 1 );
			$next[$member] = Members_Document::sanitize_member( array_merge( $base, $row ) );
			$access[] = $member;
		}
		foreach ( array_unique( array_merge( array_keys( $old ), array_keys( $next ) ) ) as $member ) {
			if ( 'modula-album' !== get_post_type( $member ) ) { continue; }
			$parent = $graph[$member]['parent'];
			$desired = isset( $next[$member] ) ? ( isset( $old[$member] ) ? $parent : $id ) : ( $id === $parent ? 0 : $parent );
			if ( $desired === $parent ) { continue; }
			if ( ! self::target( $member ) || ( $parent && ! self::target( $parent ) ) ) { return new \WP_Error( 'ineligible_reparent', 'Child and previous parent must be accessible Beta albums outside trash.' ); }
			$access[] = $member;
			if ( $parent && $parent !== $id ) {
				$access[] = $parent;
				$documents[$parent] = array_values( array_filter( $documents[$parent] ?? $graph[$parent]['members'], static function ( $row ) use ( $member ) { return (int) $row['id'] !== $member; } ) );
			}
			$parents[$member] = $desired;
		}
		$documents[$id] = array_values( $next );
		$edges = array();
		foreach ( $graph as $album => $state ) {
			$edges[$album] = Members_Document::extract_album_ids( $documents[$album] ?? $state['members'] );
		}
		foreach ( $graph as $album => $state ) {
			$parent = $parents[$album] ?? $state['parent'];
			if ( $parent ) { $edges[$parent][] = $album; }
		}
		$visiting = array(); $done = array();
		$cycle = static function ( $album ) use ( &$cycle, &$visiting, &$done, $edges ) {
			if ( isset( $visiting[$album] ) ) { return true; }
			if ( isset( $done[$album] ) ) { return false; }
			$visiting[$album] = true;
			foreach ( $edges[$album] ?? array() as $child ) { if ( $cycle( $child ) ) { return true; } }
			unset( $visiting[$album] ); $done[$album] = true; return false;
		};
		if ( $cycle( $id ) ) { return new \WP_Error( 'album_cycle', 'Album membership and parent hierarchy must not form a cycle.' ); }
		return array( 'documents' => $documents, 'parents' => $parents, 'access' => array_values( array_unique( $access ) ) );
	}
	public static function candidates( array $input ) {
		$id = $input['id'];
		if ( ! self::target( $id ) ) { return new \WP_Error( 'modula_forbidden', 'An accessible Beta album is required.' ); }
		$graph = self::graph();
		if ( ! isset( $graph[$id] ) || ! self::target( $id ) ) { return new \WP_Error( 'modula_read_conflict', 'Album changed while reading.' ); }
		$rows = array(); $existing = array_column( $graph[$id]['members'], 'id' );
		$posts = get_posts( array( 'post_type' => array( 'modula-gallery', 'modula-album' ), 'post_status' => array( 'publish', 'draft', 'private', 'pending' ), 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'ASC', 's' => $input['search'] ?? '' ) );
		foreach ( $posts as $post ) {
			if ( in_array( (int) $post->ID, $existing, true ) || ! self::eligible_member( $post->ID ) ) { continue; }
			$member = array( 'id' => (int) $post->ID, 'itemType' => $post->post_type );
			if ( ! is_wp_error( self::plan( $id, array_merge( $graph[$id]['members'], array( $member ) ), $graph ) ) ) { $rows[] = $member + array( 'title' => $post->post_title ); }
		}
		$page = $input['page'] ?? 1; $size = $input['per_page'] ?? 20;
		return array( 'schema_version' => Contract::VERSION, 'page' => $page, 'per_page' => $size, 'total' => count( $rows ), 'total_pages' => (int) ceil( count( $rows ) / $size ), 'candidates' => array_slice( $rows, ( $page - 1 ) * $size, $size ) );
	}
	public static function can_recover( array $record ): bool {
		if ( ! Albums::can_access( $record['target'] ) ) { return false; }
		foreach ( $record['member_access'] ?? array() as $id ) { if ( ! self::eligible_member( $id ) ) { return false; } }
		return true;
	}
	public static function execute( array $input ): array {
		$request = $input['request_id']; $id = $input['id'];
		$outcome = static function ( $status, $code = '', $message = '' ) use ( $request ) { return Requests::outcome( $request, $status, $code, $message, self::OPERATION ); };
		$existing = Requests::existing( $input, self::OPERATION ); if ( null !== $existing ) { return $existing; }
		if ( ! self::target( $id ) ) { return $outcome( 'forbidden', 'ineligible_album', 'An accessible Beta album outside trash is required.' ); }
		$existing = Requests::claim( $input, self::OPERATION ); if ( null !== $existing ) { return $existing; }
		$transaction = false;
		try {
			Revision::begin(); $transaction = true;
			$graph = self::graph( true );
			if ( ! hash_equals( self::token( $graph ), $input['revision'] ) ) {
				Revision::end( false ); $transaction = false;
				return Requests::finish( $request, $outcome( 'conflict', 'stale_revision', 'Read and reconcile the current album membership and hierarchy.' ) );
			}
			// Lock referenced galleries too: access and type must stay stable until persistence.
			$ids = array_unique( array_merge( array_column( $input['members'], 'id' ), array_column( $graph[$id]['members'], 'id' ) ) );
			sort( $ids ); foreach ( $ids as $member ) { if ( ! isset( $graph[$member] ) ) { Revision::document( $member, true ); } }
			$plan = self::plan( $id, $input['members'], $graph );
			if ( ! self::target( $id ) || is_wp_error( $plan ) ) {
				Revision::end( false ); $transaction = false;
				return Requests::finish( $request, $outcome( 'rejected', is_wp_error( $plan ) ? $plan->get_error_code() : 'access_changed', is_wp_error( $plan ) ? $plan->get_error_message() : 'Album access changed.' ) );
			}
			Requests::context( $request, array( 'member_access' => $plan['access'] ) );
			$saved = Members_Document::persist_composition( $plan['documents'], $plan['parents'] );
			if ( is_wp_error( $saved ) ) { throw new \RuntimeException( 'Composition confirmation failed.' ); }
			$out = $outcome( 'succeeded' ); $out['album'] = Albums::summary( $id );
			$out = Requests::finish( $request, $out );
			if ( 'succeeded' !== $out['status'] ) { throw new \RuntimeException( 'Outcome confirmation failed.' ); }
			Revision::end( true ); $transaction = false; return $out;
		} catch ( \Throwable $error ) {
			if ( $transaction ) { Revision::end( false ); }
			return Requests::finish( $request, $outcome( 'uncertain', 'album_members_unconfirmed', 'Membership write was not confirmed. Recover the original request before another action.' ) );
		}
	}
}
