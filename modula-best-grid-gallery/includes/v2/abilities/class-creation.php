<?php
/** Beta creation is a domain operation, independent of the transport/controller. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;

defined( 'ABSPATH' ) || exit;

final class Creation {
	public static function can_create( string $status ): bool {
		$type = get_post_type_object( 'modula-gallery' );
		return Integration::can_discover() && $type && current_user_can( $type->cap->create_posts ) && current_user_can( 'upload_files' ) && ( 'publish' !== $status || current_user_can( $type->cap->publish_posts ) );
	}

	public static function can_use_attachments( array $ids ): bool {
		foreach ( $ids as $id ) {
			if ( 'attachment' !== get_post_type( $id ) || ! wp_attachment_is_image( $id ) || ! current_user_can( 'edit_post', $id ) || ! current_user_can( 'read_post', $id ) ) {
				return false;
			}
		}
		return true;
	}

	public static function execute( array $input ): array {
		$request  = $input['request_id'];
		$existing = Requests::existing( $input );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::can_create( $input['status'] ) ) {
			return Requests::outcome( $request, 'forbidden', 'publication_permission_denied', 'Current creation, media and requested publication permissions are required.' );
		}
		if ( '' === trim( sanitize_text_field( $input['title'] ) ) ) {
			return Requests::outcome( $request, 'rejected', 'invalid_title', 'title must contain visible text.' );
		}
		if ( ! self::can_use_attachments( $input['attachment_ids'] ) ) {
			return Requests::outcome( $request, 'rejected', 'invalid_attachments', 'attachment_ids must contain accessible existing WordPress image attachments.' );
		}
		$existing = Requests::claim( $input );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! class_exists( 'Modula_Gallery_Upload', false ) ) {
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php';
		}
		try {
			// Assemble in draft so a partially persisted gallery cannot become public.
			$id = wp_insert_post(
				wp_slash(
					array(
						'post_type'   => 'modula-gallery',
						'post_status' => 'draft',
						'post_title'  => sanitize_text_field( $input['title'] ),
						'post_author' => get_current_user_id(),
						'meta_input'  => array( Beta_Settings::META_KEY => 1 ),
					)
				),
				true
			);
			if ( is_wp_error( $id ) || ! $id ) {
				return Requests::finish( $request, Requests::outcome( $request, 'uncertain', 'creation_unconfirmed', 'WordPress did not confirm creation; reconcile before retrying.' ) );
			}
			if ( ! Requests::target( $request, $id ) ) {
				return Requests::outcome( $request, 'uncertain', 'target_unconfirmed', 'A gallery was created but its request association could not be confirmed.' );
			}
			Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
			$rows = array();
			foreach ( $input['attachment_ids'] as $attachment ) {
				$row = \Modula_Gallery_Upload::get_instance()->build_attachment_image_row( $id, $attachment );
				if ( is_wp_error( $row ) ) {
					throw new \RuntimeException( 'Attachment preparation failed.' );
				}
				$rows[] = $row;
			}
			$written = Meta_Sync::persist_merged_gallery_items( $id, $rows, false );
			if ( is_wp_error( $written ) || ! Beta_Settings::is_beta_gallery( $id ) || array_column( Meta_Sync::get_images_v2( $id ), 'id' ) !== $input['attachment_ids'] || ! Meta_Sync::get_settings_v2( $id, false ) ) {
				throw new \RuntimeException( 'Gallery persistence was not confirmed.' );
			}
			// Hooks may revoke access while creation is in progress; do not publish afterward.
			if ( ! self::can_create( $input['status'] ) || ! Integration::can_read_post( $id ) || ! self::can_use_attachments( $input['attachment_ids'] ) ) {
				throw new \RuntimeException( 'Permission changed during creation.' );
			}
			if ( 'publish' === $input['status'] ) {
				$published = wp_update_post(
					array(
						'ID'          => $id,
						'post_status' => 'publish',
					),
					true
				);
				if ( is_wp_error( $published ) ) {
					throw new \RuntimeException( 'Publication was not confirmed.' );
				}
			}
			if ( get_post_status( $id ) !== $input['status'] ) {
				throw new \RuntimeException( 'Saved status differs from requested status.' );
			}
			$outcome            = Requests::outcome( $request, 'succeeded' );
			$outcome['gallery'] = Integration::gallery( get_post( $id ) );
			$url                = self::public_url( $id );
			if ( '' !== $url ) {
				$outcome['gallery']['public_url'] = $url;
			}
			return Requests::finish( $request, $outcome );
		} catch ( \Throwable $error ) {
			// Exception text can carry secrets from third-party hooks. Keep the result safe.
			$outcome = Requests::outcome( $request, 'uncertain', 'creation_interrupted', 'Creation was interrupted after admission; a gallery or partial draft may exist.' );
			if ( isset( $id ) && is_int( $id ) && Integration::can_read_post( $id ) ) {
				$outcome['gallery'] = Integration::gallery( get_post( $id ) );
			}
			return Requests::finish( $request, $outcome );
		}
	}

	public static function public_url( int $id ): string {
		if ( 'publish' !== get_post_status( $id ) || ! Settings_Contract::extension( 'modula-standalone' ) ) {
			return '';
		}
		$settings = \Modula_Pro\Extensions\Standalone\Standalone_Rewrite::merge_settings( get_option( 'modula_standalone', array() ) );
		if ( ! \Modula_Pro\Extensions\Standalone\Standalone_Rewrite::is_enabled( $settings, 'gallery' ) ) {
			return '';
		}
		return \Modula_Pro\Extensions\Standalone\Standalone::get_instance()->get_standalone_public_url( $id );
	}
}
