<?php
/** Explicit shared-file effects, separate from gallery watermark settings. */
namespace Modula\V2\Abilities;
use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula_Pro\Extensions\Watermark\Watermark as Service;
defined( 'ABSPATH' ) || exit;
final class Watermark {
	public const READ = 'modula/read-watermark-state';
	public const APPLY = 'modula/apply-watermark';
	public const REMOVE = 'modula/remove-watermark';
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-watermark' ) && class_exists( Service::class );
	}
	public static function mutations(): array {
		return array( self::APPLY, self::REMOVE );
	}
	public static function callbacks(): array {
		return array( self::READ => array( self::class, 'read' ), self::APPLY => static function ( $input ) {
			return self::execute( $input, self::APPLY );
		}
		, self::REMOVE => static function ( $input ) {
			return self::execute( $input, self::REMOVE );
		}
		);
	}
	public static function result_schema(): array {
		return Contract::object( array( 'attachment_id' => array( 'type' => 'integer' ), 'revision' => Contract::revision_schema(), 'sha256' => Contract::revision_schema(), 'original_sha256' => Contract::revision_schema(), 'backup' => array( 'type' => 'boolean' ), 'applied' => array( 'type' => 'boolean' ), 'original' => array( 'type' => 'string' ), 'derivatives' => array( 'type' => 'string' ), 'phase' => array( 'type' => 'string' ) ), array( 'attachment_id', 'phase', 'original', 'derivatives' ) );
	}
	public static function definitions(): array {
		$fields = array( 'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'attachment_id' => array( 'type' => 'integer', 'minimum' => 1 ) );
		$definitions = array( self::READ => array( 'label' => 'Inspect watermark file state', 'description' => 'Pure local file and backup inspection for one explicit attachment in an editable Beta gallery. Revision covers gallery settings, shared files and backup bytes. No filesystem paths returned.', 'input_schema' => Contract::object( $fields, array_keys( $fields ) ), 'output_schema' => Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'watermark' => self::result_schema() ), array( 'schema_version', 'watermark' ) ) ) );
		foreach ( self::mutations() as $name ) {
			$definitions[ $name ] = array( 'label' => self::APPLY === $name ? 'Apply shared watermark' : 'Restore shared watermark backup', 'description' => 'One explicit local JPEG/PNG/GIF/WebP image (at most 80 MiB, 40 million pixels) in a Beta gallery; current extension and gallery/attachment rights required. First save watermark settings separately with update-gallery. Rewrites the shared original and regenerates derivatives through the existing Watermark service. Every gallery using this attachment sees the effect; text and composition stay intact. Removal/reapply requires a safe existing backup. Partial or interrupted file effects are retained as uncertain and never retried by replay. Use read-watermark-state revision. Recover for 30 days.', 'input_schema' => Contract::object( $fields + array( 'revision' => Contract::revision_schema(), 'request_id' => Contract::request_id_schema() ), array( 'id', 'attachment_id', 'revision', 'request_id' ) ), 'output_schema' => Contract::outcome_schema() );
		}
		return $definitions;
	}
	public static function referenced_attachment_ids( array $input, string $operation ): array {
		$ids = array( $input['attachment_id'] );
		$settings = get_post_meta( $input['id'], 'modula-settings', true );
		$burn = empty( $settings['custom_settings_watermark'] ) ? get_option( 'modula_watermark', array() ) : $settings;
		if ( self::APPLY === $operation && ( empty( $settings['custom_settings_watermark'] ) || 'text' !== ( $burn['watermark_type'] ?? '' ) ) && ! empty( $burn['watermark_image'] ) ) {
			$ids[] = (int) $burn['watermark_image'];
		}
		return array_unique( $ids );
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() || ! Update::can_update( (int) $record['target'] ) ) {
			return false;
		}
		foreach ( $record['attachment_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( (int) $id ) ) {
				return false;
			}
		}
		return true;
	}
	/** Existing and prospective paths must remain inside uploads, without symlink ancestors. */
	private static function safe_path( string $path, bool $required = true ): string {
		$base = realpath( wp_get_upload_dir()['basedir'] );
		if ( ! $base || strpos( $path, $base . '/' ) !== 0 || strpos( $path, '..' ) !== false ) {
			throw new \DomainException( 'unsafe_file' );
		}
		$part = $path;
		while ( $part !== $base ) {
			if ( is_link( $part ) ) {
				throw new \DomainException( 'unsafe_file' );
			}
			$part = dirname( $part );
		}
		if ( $required && ( ! is_file( $path ) || ! is_readable( $path ) ) ) {
			throw new \DomainException( 'missing_file' );
		}
		return $path;
	}
	private static function paths( int $id ): array {
		if ( ! wp_attachment_is_image( $id ) || 'trash' === get_post_status( $id ) ) {
			throw new \DomainException( 'local_image_required' );
		}
		if ( class_exists( '\WPChill\Folders\Storage\Option_Provider_Map_Repository' ) && ( new \WPChill\Folders\Storage\Option_Provider_Map_Repository() )->find_by_attachment( $id ) ) {
			throw new \DomainException( 'local_image_required' );
		}
		$file = self::safe_path( (string) get_attached_file( $id, true ) );
		$size = wp_getimagesize( $file );
		if ( ! in_array( get_post_mime_type( $id ), array( 'image/jpeg', 'image/png', 'image/gif', 'image/webp' ), true ) || ! $size || $size[0] * $size[1] > 40000000 || filesize( $file ) > 80 * MB_IN_BYTES ) {
			throw new \DomainException( 'unsupported_image' );
		}
		$original = self::safe_path( (string) wp_get_original_image_path( $id ) );
		$original_size = wp_getimagesize( $original );
		if ( ! $original_size || $original_size[0] * $original_size[1] > 40000000 || filesize( $original ) > 80 * MB_IN_BYTES ) {
			throw new \DomainException( 'unsupported_image' );
		}
		$paths = array( $file, $original );
		$meta = wp_get_attachment_metadata( $id );
		foreach ( $meta['sizes'] ?? array() as $size ) {
			$paths[] = self::safe_path( dirname( $file ) . '/' . $size['file'] );
		}
		return array_values( array_unique( $paths ) );
	}
	private static function backup( int $id ): string {
		$relative = get_post_meta( $id, 'modula-backup', true );
		if ( ! is_string( $relative ) || '' === $relative ) {
			return '';
		}
		$path = self::safe_path( wp_get_upload_dir()['basedir'] . $relative, false );
		return is_file( $path ) ? self::safe_path( $path ) : '';
	}
	private static function inspect( array $input, bool $lock = false ): array {
		$id = $input['id'];
		$attachment = $input['attachment_id'];
		$gallery = Revision::state( $id, $lock );
		$document = Revision::document( $attachment, $lock );
		if ( ! self::can_recover( array( 'target' => $id, 'attachment_ids' => array( $attachment ) ) ) || ! Beta_Settings::is_beta_gallery( $id ) || 'trash' === get_post_status( $id ) || get_post_meta( $id, '_modula_bind_target_type', true ) ) {
			throw new \DomainException( 'unsupported_target' );
		}
		$matches = array_filter( Meta_Sync::get_images_v2( $id ), static function ( $row ) use ( $attachment ) {
			return (string) ( $row['id'] ?? '' ) === (string) $attachment;
		}
		);
		if ( ! $matches ) {
			throw new \DomainException( 'attachment_not_in_gallery' );
		}
		$hashes = array_map( static function ( $path ) {
			return hash_file( 'sha256', $path );
		}
		, self::paths( $attachment ) );
		$backup = self::backup( $attachment );
		global $wpdb;
		$options = $wpdb->get_results( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('modula_watermark','modula-pro') ORDER BY option_name" . ( $lock ? ' FOR UPDATE' : '' ), ARRAY_A );
		if ( $wpdb->last_error ) {
			throw new \RuntimeException( 'Settings inspection failed.' );
		}
		$settings = get_post_meta( $id, 'modula-settings', true );
		$burn = empty( $settings['custom_settings_watermark'] ) ? get_option( 'modula_watermark', array() ) : $settings;
		$mark = ( empty( $settings['custom_settings_watermark'] ) || 'text' !== ( $burn['watermark_type'] ?? '' ) ) ? (int) ( $burn['watermark_image'] ?? 0 ) : 0;
		$mark_state = '';
		if ( $mark ) {
			// A missing/unused watermark source must not prevent backup restoration.
			$mark_state = 'unavailable';
			if ( Attachments::can_read( $mark ) ) {
				try {
					$mark_state = array( Revision::document( $mark, $lock ), array_map( static function ( $path ) {
						return hash_file( 'sha256', $path );
					}
					, self::paths( $mark ) ) );
				}
				catch ( \DomainException $ignored ) {
				}
			}
		}
		return array( 'attachment_id' => $attachment, 'revision' => hash( 'sha256', wp_json_encode( array( $gallery, $document, $hashes, $backup ? hash_file( 'sha256', $backup ) : '', $options, $mark_state ) ) ), 'sha256' => $hashes[0], 'original_sha256' => hash_file( 'sha256', wp_get_original_image_path( $attachment ) ), 'backup' => '' !== $backup, 'applied' => (bool) get_post_meta( $attachment, 'modula_watermark_applied', true ), 'phase' => 'inspection', 'original' => 'present', 'derivatives' => 'present' );
	}
	public static function read( array $input ) {
		try {
			$state = self::inspect( $input );
			if ( $state !== self::inspect( $input ) ) {
				throw new \RuntimeException();
			}
			return array( 'schema_version' => Contract::VERSION, 'watermark' => $state );
		}
		catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_watermark_unavailable', 'A stable accessible local image in a Beta gallery is required.' );
		}
	}
	public static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$out = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Inspect shared files and retained backup before any new request.' : '', $operation );
		}
		;
		if ( ! self::can_recover( array( 'target' => $input['id'], 'attachment_ids' => self::referenced_attachment_ids( $input, $operation ) ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$progress = array( 'attachment_id' => $input['attachment_id'], 'phase' => 'validation', 'original' => 'unchanged', 'derivatives' => 'unchanged' );
		$active = false;
		$started = false;
		try {
			Requests::context( $input['request_id'], array( 'watermark' => array_replace( $progress, array( 'phase' => 'file_effect', 'original' => 'uncertain', 'derivatives' => 'uncertain' ) ) ) );
			Revision::begin();
			$active = true;
			$current = self::inspect( $input, true );
			if ( ! hash_equals( $current['revision'], $input['revision'] ) ) {
				throw new \DomainException( 'stale_revision' );
			}
			$settings = get_post_meta( $input['id'], 'modula-settings', true );
			$burn = empty( $settings['custom_settings_watermark'] ) ? get_option( 'modula_watermark', array() ) : $settings;
			$mark = (int) ( $burn['watermark_image'] ?? 0 );
			if ( self::APPLY === $operation && $mark && ( empty( $settings['custom_settings_watermark'] ) || 'text' !== ( $burn['watermark_type'] ?? '' ) ) ) {
				Revision::lock_attachments( array( $mark ) );
				if ( ! Attachments::can_read( $mark ) ) {
					throw new \DomainException( 'watermark_image_forbidden' );
				}
				self::paths( $mark );
			}
			$backup = self::backup( $input['attachment_id'] );
			if ( ( self::REMOVE === $operation || $current['applied'] ) && ! $backup ) {
				throw new \DomainException( 'backup_missing' );
			}
			$original = (string) wp_get_original_image_path( $input['attachment_id'] );
			if ( $backup && ( self::REMOVE === $operation || $current['applied'] ) ) {
				$restore_destination = self::safe_path( dirname( $original ) . '/' . basename( $backup ), false );
				if ( is_file( $restore_destination ) && $restore_destination !== $original && $restore_destination !== get_attached_file( $input['attachment_id'], true ) ) {
					throw new \DomainException( 'destination_exists' );
				}
			}
			// The existing service writes deterministic filenames. Refuse unrelated destination collisions.
			$info = pathinfo( $original );
			$destination = self::APPLY === $operation ? $info['dirname'] . '/' . preg_replace( '/_w$/', '', preg_replace( '/\.(jpe?g|png|gif|webp|heic|heif)$/i', '', $info['filename'] ) ) . '_w.' . $info['extension'] : $info['dirname'] . '/' . basename( $backup );
			self::safe_path( $destination, false );
			if ( is_file( $destination ) && $destination !== $original && $destination !== get_attached_file( $input['attachment_id'], true ) ) {
				throw new \DomainException( 'destination_exists' );
			}
			if ( self::APPLY === $operation && ! $backup && ! empty( $burn['watermark_enable_backup'] ) ) {
				$backup_destination = wp_get_upload_dir()['basedir'] . '/modula/gallery-' . $input['id'] . '/' . basename( $original );
				self::safe_path( $backup_destination, false );
				if ( file_exists( $backup_destination ) ) {
					throw new \DomainException( 'backup_destination_exists' );
				}
			}
			$restore_hash = $backup ? hash_file( 'sha256', $backup ) : '';
			$started = true;
			$progress = array_replace( $progress, array( 'phase' => 'file_effect', 'original' => 'uncertain', 'derivatives' => 'uncertain' ) );
			$result = self::APPLY === $operation ? Service::get_instance()->apply_watermark_to_image( $input['id'], $input['attachment_id'] ) : Service::get_instance()->remove_watermark_from_image( $input['id'], $input['attachment_id'] );
			// Files cannot roll back. Commit metadata even when a later derivative or confirmation failed.
			Revision::end( true );
			$active = false;
			if ( is_wp_error( $result ) || true !== $result ) {
				throw new \RuntimeException( 'file_effect_unconfirmed' );
			}
			$after = self::inspect( $input );
			if ( self::REMOVE === $operation ? ( $after['applied'] || $after['original_sha256'] !== $restore_hash ) : ( ! $after['applied'] || $after['sha256'] === $current['sha256'] || ( ! empty( $burn['watermark_enable_backup'] ) && ! $after['backup'] ) ) ) {
				throw new \RuntimeException( 'file_effect_unconfirmed' );
			}
			$progress = array_replace( $after, array( 'phase' => 'completed', 'original' => self::APPLY === $operation ? 'watermarked' : 'restored', 'derivatives' => 'regenerated' ) );
			Requests::context( $input['request_id'], array( 'watermark' => $progress ) );
			return Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'watermark' => $progress ) );
		}
		catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( $started );
			}
			if ( $started ) {
				$path = get_attached_file( $input['attachment_id'], true );
				if ( is_string( $path ) && is_file( $path ) ) {
					$progress['sha256'] = hash_file( 'sha256', $path );
					$progress['original'] = isset( $current['sha256'] ) && $current['sha256'] !== $progress['sha256'] ? 'changed' : 'unchanged';
				}
				try {
					$progress['backup'] = '' !== self::backup( $input['attachment_id'] );
				}
				catch ( \Throwable $ignored ) {
				}
			}
			$code = ! $started && $error instanceof \DomainException ? $error->getMessage() : 'file_effect_unconfirmed';
			return Requests::finish( $input['request_id'], $out( $started ? 'uncertain' : ( 'stale_revision' === $code ? 'conflict' : 'rejected' ), $code ) + array( 'watermark' => $progress ) );
		}
	}
}
