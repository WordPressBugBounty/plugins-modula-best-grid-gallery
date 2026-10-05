<?php
/** Gallery preset administration and revision-pinned replacement through the existing Pro service. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula\V2\Settings\Sanitizer;
use Modula_Pro\Extensions\Defaults\Utils\Preset_Storage;

defined( 'ABSPATH' ) || exit;

class Presets {
	protected const FAMILY = 'gallery';
	protected const POST_TYPE = 'modula-defaults';
	public const APPLY = 'modula/apply-gallery-preset';
	public const BATCH = 'modula/apply-gallery-presets';
	protected static function name( string $verb ): string { return 'modula/' . $verb . '-' . static::FAMILY . '-preset' . ( 'list' === $verb ? 's' : '' ); }
	public static function available(): bool { return Settings_Contract::extension( 'modula-defaults' ) && class_exists( Preset_Storage::class ); }
	public static function mutations(): array { return array( static::name( 'create' ), static::name( 'update' ), static::name( 'delete' ), static::APPLY, static::BATCH ); }
	public static function callbacks(): array {
		$out = array();
		foreach ( array( 'list' => 'listing', 'read' => 'read', 'create' => 'create', 'update' => 'update', 'delete' => 'delete' ) as $verb => $method ) { $out[ 'modula/' . $verb . '-' . static::FAMILY . '-preset' . ( 'list' === $verb ? 's' : '' ) ] = array( static::class, $method ); }
		return $out + array( static::APPLY => array( static::class, 'apply' ), static::BATCH => array( static::class, 'batch' ) );
	}
	public static function summary_schema(): array {
		return Contract::object( array( 'id' => array( 'type' => 'integer' ), 'title' => array( 'type' => 'string' ), 'status' => array( 'type' => 'string' ), 'editor_url' => array( 'type' => 'string' ), 'revision' => Contract::revision_schema() ), array( 'id', 'title', 'status', 'editor_url', 'revision' ) );
	}
	public static function sorting_schema(): array { return array( 'type' => 'string', 'enum' => array( 'manual', 'dateCreatedNew', 'dateCreatedOld', 'dateModifiedFirst', 'dateModifiedLast', 'titleAZ', 'titleZA', 'random' ) ); }
	public static function definitions(): array {
		$id = array( 'type' => 'integer', 'minimum' => 1 );
		$identity = array( 'request_id' => Contract::request_id_schema(), 'id' => $id, 'revision' => Contract::revision_schema() );
		$fields = array( 'title' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 200 ), 'status' => array( 'type' => 'string', 'enum' => array( 'draft', 'publish' ) ), 'settings' => static::settings_schema(), 'sorting' => static::sorting_schema() );
		$source = array( 'preset_id' => $id, 'preset_revision' => Contract::revision_schema() );
		$batch = Batch::schema(); $batch['properties'] += $source; $batch['required'] = array_merge( $batch['required'], array_keys( $source ) );
		$inputs = array(
			static::name( 'list' ) => Contract::object( Contract::pagination() ) + array( 'default' => array( 'page' => 1, 'per_page' => 20 ) ),
			static::name( 'read' ) => Contract::object( array( 'id' => $id ), array( 'id' ) ),
			static::name( 'create' ) => Contract::object( array( 'request_id' => Contract::request_id_schema() ) + $fields, array( 'request_id', 'title', 'status', 'settings', 'sorting' ) ),
			static::name( 'update' ) => Contract::object( $identity + $fields, array_keys( $identity ) ),
			static::name( 'delete' ) => Contract::object( $identity, array_keys( $identity ) ),
			static::APPLY => Contract::object( $identity + $source, array_keys( $identity + $source ) ),
			static::BATCH => $batch,
		);
		$out = array();
		foreach ( $inputs as $name => $input ) {
			$output = Contract::outcome_schema();
			if ( static::name( 'list' ) === $name ) { $output = Contract::object( Contract::page_output() + array( 'presets' => array( 'type' => 'array', 'items' => static::summary_schema() ) ), array_merge( array_keys( Contract::page_output() ), array( 'presets' ) ) ); }
			if ( static::name( 'read' ) === $name ) {
				$preset = static::summary_schema(); $preset['properties'] += array( 'settings' => static::read_settings_schema(), 'sorting' => array( 'type' => 'string' ) );
				$output = Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'preset' => $preset ), array( 'schema_version', 'preset' ) );
			}
			$out[ $name ] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'album' === static::FAMILY ? 'Requires enabled, entitled Defaults and Albums and current preset permissions. Paginated pure reads; explicit draft/publish creation. Supplied settings replace preset configuration; omitted fields and sorting are preserved. Revision-protected CRUD with 30-day recovery. Application replaces settings and sorting while preserving members, hierarchy and omitted protection. Source and target document revisions required. Batches accept 1–25 targets with per-target recovery; resume unchanged input for pending targets only.' : 'Requires enabled, entitled Defaults and current preset permissions. Pure paginated reads. Explicit draft/publish creation; updates replace supplied settings and preserve omitted sorting. Application replaces gallery settings/sorting while keeping membership and attachment text. Source and target revisions are mandatory. 1–25 batch targets retain individual 30-day outcomes; resume unchanged input for pending targets only.', 'input_schema' => $input, 'output_schema' => $output );
		}
		return $out;
	}
	public static function can_access( int $id = 0, string $status = '', bool $create = false ): bool {
		$type = get_post_type_object( static::POST_TYPE );
		return static::available() && Integration::can_discover() && $type && current_user_can( $type->cap->edit_posts )
			&& ( ! $create || current_user_can( $type->cap->create_posts ) ) && ( 'publish' !== $status || current_user_can( $type->cap->publish_posts ) )
			&& ( ! $id || ( static::POST_TYPE === get_post_type( $id ) && current_user_can( 'edit_post', $id ) && ( 'private' !== get_post_status( $id ) || current_user_can( 'read_post', $id ) ) ) );
	}
	public static function can_recover( array $record ): bool {
		if ( ! static::can_access() ) { return false; }
		if ( static::APPLY === $record['operation'] ) { return static::can_access( $record['preset_id'] ) && static::target_access( $record['target'] ); }
		if ( static::name( 'delete' ) === $record['operation'] ) {
			foreach ( $record['required_caps'] as $cap ) { if ( ! current_user_can( $cap ) ) { return false; } }
			return ! get_post( $record['target'] ) || ( static::can_access( $record['target'] ) && current_user_can( 'delete_post', $record['target'] ) );
		}
		return static::can_access( $record['target'], $record['publication'], static::name( 'create' ) === $record['operation'] );
	}
	public static function summary( int $id ): array {
		$post = get_post( $id );
		return array( 'id' => $id, 'title' => $post->post_title, 'status' => $post->post_status, 'editor_url' => admin_url( 'post.php?post=' . $id . '&action=edit' ), 'revision' => Revision::document( $id ) );
	}
	public static function listing( array $input ) {
		if ( ! static::can_access() ) { return new \WP_Error( 'modula_forbidden', 'Current preset permissions and entitlement are required.' ); }
		$ids = array(); $scan = 1;
		do {
			$query = new \WP_Query( array( 'post_type' => static::POST_TYPE, 'post_status' => array( 'publish', 'draft', 'private' ), 'fields' => 'ids', 'posts_per_page' => 200, 'paged' => $scan++, 'orderby' => 'ID', 'order' => 'ASC', 'no_found_rows' => true ) );
			foreach ( $query->posts as $id ) { if ( static::can_access( (int) $id ) ) { $ids[] = (int) $id; } }
		} while ( 200 === count( $query->posts ) );
		$page = $input['page'] ?? 1; $size = $input['per_page'] ?? 20;
		return array( 'schema_version' => Contract::VERSION, 'page' => $page, 'per_page' => $size, 'total' => count( $ids ), 'total_pages' => (int) ceil( count( $ids ) / $size ), 'presets' => array_map( array( static::class, 'summary' ), array_slice( $ids, ( $page - 1 ) * $size, $size ) ) );
	}
	public static function read( array $input ) {
		$id = (int) $input['id'];
		if ( ! static::can_access( $id ) ) { return new \WP_Error( 'modula_forbidden', 'Current preset permissions and entitlement are required.' ); }
		$revision = Revision::document( $id );
		$preset = static::summary( $id );
		$preset['settings'] = Contract::project( static::get_settings( $id ), static::read_settings_schema() );
		$preset['sorting'] = Preset_Storage::get_preset_sorting( $id );
		if ( ! hash_equals( $revision, Revision::document( $id ) ) ) { return new \WP_Error( 'modula_read_conflict', 'Preset changed while reading. Read again.' ); }
		return array( 'schema_version' => Contract::VERSION, 'preset' => $preset );
	}
	/** Full presets contain inert schema defaults, including dormant extension fields. Reject active unavailable configuration. */
	protected static function validate_settings( array $settings ) {
		$available = static::settings_schema();
		$defaults = Sanitizer::sanitize_grouped( array() );
		$active = array();
		foreach ( $settings as $group => $fields ) {
			if ( ! is_array( $fields ) ) { return new \WP_Error( 'invalid_preset_group', 'Invalid preset group: ' . $group ); }
			foreach ( $fields as $key => $value ) {
				if ( array_key_exists( $key, $defaults[ $group ] ?? array() ) && $value === $defaults[ $group ][ $key ] ) { continue; }
				$active[ $group ][ $key ] = $value;
				$shape = $available['properties'][ $group ]['properties'][ $key ] ?? null;
				if ( null === $shape ) {
					return new \WP_Error( 'unavailable_preset_field', 'Unavailable preset field: ' . $group . '.' . $key );
				} elseif ( ! Settings_Contract::strict_types( $value, $shape ) || is_wp_error( rest_validate_value_from_schema( $value, $shape ) ) ) { return new \WP_Error( 'invalid_preset_field', 'Invalid preset field: ' . $group . '.' . $key ); }
			}
		}
		return \Modula\V2\Settings\Writer::validate_strict_patch( 0, $active );
	}
	protected static function settings_schema(): array { return Settings_Contract::schema(); }
	protected static function read_settings_schema(): array { return Contract::settings_schema(); }
	protected static function get_settings( int $id ): array { return Preset_Storage::get_preset_grouped( $id, false ); }
	protected static function save_settings( int $id, array $settings, string $sorting ) { return Preset_Storage::save_preset_grouped( $id, $settings, $sorting ); }
	protected static function settings_confirmed( int $id, array $settings ): bool { return Sanitizer::sanitize_grouped( $settings ) === json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ); }


	protected static function target_access( int $id ): bool { return Update::can_update( $id ); }
	protected static function eligible_target( int $id ): bool { return Beta_Settings::is_beta_gallery( $id ) && 'trash' !== get_post_status( $id ) && ! get_post_meta( $id, '_modula_bind_target_type', true ); }
	protected static function target_revision( int $id, bool $lock = false ): string { return Revision::state( $id, $lock ); }
	protected static function target_summary( int $id ): array { return Integration::gallery( get_post( $id ) ) + array( 'revision' => Revision::state( $id ) ); }
	protected static function apply_settings( int $id, int $source ) {
		$members = get_post_meta( $id, 'modula-images', true );
		$saved = Meta_Sync::with_canonical_gallery_write( $id, static function () use ( $id, $source ) { return Preset_Storage::apply_preset_to_gallery( $id, $source, false ); } );
		return $members !== get_post_meta( $id, 'modula-images', true ) ? new \WP_Error( 'members_changed', 'Preset changed member composition.' ) : $saved;
	}
	protected static function application_confirmed( int $id, array $settings, $saved ): bool { return static::settings_confirmed( $id, $settings ); }

	public static function create( array $input ): array { return static::write( $input, 'create' ); }
	public static function update( array $input ): array { return static::write( $input, 'update' ); }
	public static function delete( array $input ): array { $input['id'] = (int) $input['id']; return static::write( $input, 'delete' ); }
	public static function apply( array $input ): array { return static::write( $input, 'apply' ); }
	public static function batch( array $input ): array { return Batch::execute( $input, static::BATCH ); }
	private static function write( array $input, string $verb ): array {
		$operation = 'apply' === $verb ? static::APPLY : 'modula/' . $verb . '-' . static::FAMILY . '-preset';
		$request = $input['request_id'];
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$id = $input['id'] ?? 0;
		$apply = 'apply' === $verb; $create = 'create' === $verb;
		$source = $apply ? $input['preset_id'] : $id;
		$outcome = static function ( $status, $code = '', $message = '' ) use ( $request, $operation ) { return Requests::outcome( $request, $status, $code, $message, $operation ); };
		if ( ! static::can_access( $source, $input['status'] ?? '', $create ) || ( $apply && ! static::target_access( $id ) ) || ( 'delete' === $verb && ! current_user_can( 'delete_post', $id ) ) ) { return $outcome( 'forbidden', 'current_permission_denied', 'Current preset, target and operation permissions are required.' ); }
		if ( $apply && ! static::eligible_target( $id ) ) { return $outcome( 'rejected', 'unsupported_target', 'Preset application requires an eligible Beta target outside trash.' ); }
		if ( isset( $input['title'] ) && '' === trim( sanitize_text_field( $input['title'] ) ) ) { return $outcome( 'rejected', 'invalid_title', 'Provide a nonempty title.' ); }
		if ( 'update' === $verb && ! array_intersect( array_keys( $input ), array( 'title', 'status', 'settings', 'sorting' ) ) ) { return $outcome( 'rejected', 'empty_patch', 'Provide preset fields to change.' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$transaction = false;
		try {
			Revision::begin(); $transaction = true;
			if ( $create ) { Revision::document( 0, true ); }
			$revision = $create ? '' : ( $apply ? static::target_revision( $id, true ) : Revision::document( $id, true ) );
			$source_revision = $apply ? Revision::document( $source, true ) : '';
			if ( ! $create && ( ! hash_equals( $revision, $input['revision'] ) || ( $apply && ! hash_equals( $source_revision, $input['preset_revision'] ) ) ) ) {
				Revision::end( false ); $transaction = false;
				return Requests::finish( $request, $outcome( 'conflict', 'stale_revision', 'Read and reconcile both the source preset and target before a new request.' ) );
			}
			if ( ! static::can_access( $source, $input['status'] ?? '', $create ) || ( $apply && ! static::target_access( $id ) ) || ( 'delete' === $verb && ! current_user_can( 'delete_post', $id ) ) ) { throw new \RuntimeException( 'Access changed.' ); }
			$settings = $apply ? static::get_settings( $source ) : ( $input['settings'] ?? null );
			$sorting = $apply ? Preset_Storage::get_preset_sorting( $source ) : ( $input['sorting'] ?? ( $id ? Preset_Storage::get_preset_sorting( $id ) : 'manual' ) );
			$valid = null !== $settings ? static::validate_settings( $settings ) : true;
			if ( 'delete' !== $verb && ( ( null !== $settings && ( ! $settings || is_wp_error( $valid ) ) ) || ! in_array( $sorting, static::sorting_schema()['enum'], true ) ) ) {
				Revision::end( false ); $transaction = false;
				return Requests::finish( $request, $outcome( 'rejected', 'ineligible_preset_settings', is_wp_error( $valid ) ? $valid->get_error_message() : 'Preset contains invalid or unavailable configuration. No target was changed.' ) );
			}
			if ( $create ) {
				$id = wp_insert_post( wp_slash( array( 'post_type' => static::POST_TYPE, 'post_title' => sanitize_text_field( $input['title'] ), 'post_status' => $input['status'], 'post_author' => get_current_user_id() ) ), true );
				if ( is_wp_error( $id ) || ! $id ) { throw new \RuntimeException( 'Creation unconfirmed.' ); }
				Revision::track( array( $id ) );
				if ( ! Requests::target( $request, $id ) ) { throw new \RuntimeException( 'Target unconfirmed.' ); }
			}
			if ( 'delete' === $verb ) {
				if ( ! wp_delete_post( $id, true ) || get_post( $id ) ) { throw new \RuntimeException( 'Deletion unconfirmed.' ); }
			} elseif ( $apply ) {
				$saved = static::apply_settings( $id, $source );
				if ( is_wp_error( $saved ) || ! hash_equals( $source_revision, Revision::document( $source ) ) ) { throw new \RuntimeException( 'Application unconfirmed.' ); }
			} else {
				if ( null !== $settings ) {
					if ( is_wp_error( static::save_settings( $id, $settings, $sorting ) ) ) { throw new \RuntimeException( 'Settings unconfirmed.' ); }
				} elseif ( isset( $input['sorting'] ) ) { update_post_meta( $id, 'modulaSorting', $sorting ); }
				$post = array( 'ID' => $id );
				foreach ( array( 'title' => 'post_title', 'status' => 'post_status' ) as $key => $field ) { if ( isset( $input[ $key ] ) ) { $post[ $field ] = 'title' === $key ? sanitize_text_field( $input[ $key ] ) : $input[ $key ]; } }
				if ( ! $create && count( $post ) > 1 && is_wp_error( wp_update_post( wp_slash( $post ), true ) ) ) { throw new \RuntimeException( 'Metadata unconfirmed.' ); }
			}
			Revision::clear_cache();
			if ( 'delete' !== $verb ) {
				if ( null !== $settings && ! ( $apply ? static::application_confirmed( $id, $settings, $saved ) : static::settings_confirmed( $id, $settings ) ) ) { throw new \RuntimeException( 'Settings confirmation differs.' ); }
				if ( $sorting !== Preset_Storage::get_preset_sorting( $id ) ) { throw new \RuntimeException( 'Sorting confirmation differs.' ); }
				foreach ( array( 'title' => 'post_title', 'status' => 'post_status' ) as $key => $field ) { if ( isset( $input[ $key ] ) && get_post( $id )->$field !== ( 'title' === $key ? sanitize_text_field( $input[ $key ] ) : $input[ $key ] ) ) { throw new \RuntimeException( 'Metadata confirmation differs.' ); } }
			}
			$out = $outcome( 'succeeded' );
			if ( 'delete' === $verb ) { $out['deleted_id'] = $id; }
			elseif ( $apply ) { $out[static::FAMILY] = static::target_summary( $id ); }
			else { $out['preset'] = static::summary( $id ); }
			$out = Requests::finish( $request, $out );
			if ( 'succeeded' !== $out['status'] ) { throw new \RuntimeException( 'Outcome unconfirmed.' ); }
			Revision::end( true ); $transaction = false;
			return $out;
		} catch ( \Throwable $error ) {
			if ( $transaction ) { Revision::end( false ); }
			return Requests::finish( $request, $outcome( 'uncertain', 'preset_write_unconfirmed', 'The preset operation was not confirmed. Recover this identity before another action.' ) );
		}
	}
}
