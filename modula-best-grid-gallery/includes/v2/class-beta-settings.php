<?php
/**
 * Per-post Beta opt-in: Beta gallery (editor + visitor) or Beta album (Albums editor only).
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Beta_Settings
 */
final class Beta_Settings {

	/**
	 * Post meta identifier for a Beta gallery or Beta album.
	 */
	public const META_KEY = '_modula_beta';

	/**
	 * User chose to stay on the classic editor for this gallery or album (suppress open prompt).
	 */
	public const CLASSIC_EDITOR_PREFERRED_META_KEY = '_modula_classic_editor_preferred';

	/**
	 * Legacy site option (removed after one-shot migration).
	 */
	public const LEGACY_OPTION = 'modula_modern_beta';

	/**
	 * Set after the one-shot migration has run (even if zero galleries were flagged).
	 */
	public const MIGRATED_OPTION = 'modula_beta_gallery_migrated';

	/**
	 * @return void
	 */
	public static function init() {
		add_filter( 'modula_use_modern_shortcode', array( __CLASS__, 'filter_modern_shortcode' ), 5, 2 );
		add_filter( 'modula_enable_modern_settings_editor', array( __CLASS__, 'filter_settings_editor' ), 5, 2 );
		add_action( 'init', array( __CLASS__, 'maybe_migrate' ), 1 );
	}

	/**
	 * Whether this post is a Beta gallery.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return bool
	 */
	public static function is_beta_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return false;
		}
		if ( 'modula-gallery' !== get_post_type( $post_id ) ) {
			return false;
		}

		return '1' === (string) get_post_meta( $post_id, self::META_KEY, true );
	}

	/**
	 * Persist the Beta gallery identifier.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return void
	 */
	public static function mark_as_beta_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, self::META_KEY, '1' );
	}

	/**
	 * Whether this post is a Beta album (Albums editor takeover; classic visitor shortcode).
	 *
	 * @param int $post_id Album post ID.
	 * @return bool
	 */
	public static function is_beta_album( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return false;
		}
		if ( 'modula-album' !== get_post_type( $post_id ) ) {
			return false;
		}

		return '1' === (string) get_post_meta( $post_id, self::META_KEY, true );
	}

	/**
	 * Persist the Beta album identifier.
	 *
	 * @param int $post_id Album post ID.
	 * @return void
	 */
	public static function mark_as_beta_album( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 || 'modula-album' !== get_post_type( $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, self::META_KEY, '1' );
	}

	/**
	 * Whether the user dismissed the open editor prompt for this gallery or album.
	 *
	 * @param int $post_id Gallery or album post ID.
	 * @return bool
	 */
	public static function has_classic_editor_preference( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return false;
		}
		$type = get_post_type( $post_id );
		if ( 'modula-gallery' !== $type && 'modula-album' !== $type ) {
			return false;
		}

		return '1' === (string) get_post_meta( $post_id, self::CLASSIC_EDITOR_PREFERRED_META_KEY, true );
	}

	/**
	 * Persist classic editor preference for a gallery or album (open prompt suppressed).
	 *
	 * @param int $post_id Gallery or album post ID.
	 * @return void
	 */
	public static function mark_classic_editor_preference( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return;
		}
		$type = get_post_type( $post_id );
		if ( 'modula-gallery' !== $type && 'modula-album' !== $type ) {
			return;
		}
		update_post_meta( $post_id, self::CLASSIC_EDITOR_PREFERRED_META_KEY, '1' );
	}

	/**
	 * Gallery post ID for the current wp-admin gallery edit / create screen.
	 *
	 * @return int
	 */
	public static function current_gallery_id() {
		global $post;

		if ( $post && isset( $post->ID ) && $post->ID && 'modula-gallery' === get_post_type( $post ) ) {
			return (int) $post->ID;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- admin screen routing.
		if ( isset( $_GET['post'] ) ) {
			$id = absint( wp_unslash( $_GET['post'] ) );
			if ( $id && 'modula-gallery' === get_post_type( $id ) ) {
				return $id;
			}
		}

		return 0;
	}

	/**
	 * Album post ID for the current wp-admin album edit / create screen.
	 *
	 * @return int
	 */
	public static function current_album_id() {
		global $post;

		if ( $post && isset( $post->ID ) && $post->ID && 'modula-album' === get_post_type( $post ) ) {
			return (int) $post->ID;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- admin screen routing.
		if ( isset( $_GET['post'] ) ) {
			$id = absint( wp_unslash( $_GET['post'] ) );
			if ( $id && 'modula-album' === get_post_type( $id ) ) {
				return $id;
			}
		}

		return 0;
	}

	/**
	 * @param bool $enabled Unused prior value; identifier is the sole gate.
	 * @param int  $post_id Gallery post ID. Albums never enable the modern visitor shortcode.
	 * @return bool
	 */
	public static function filter_modern_shortcode( $enabled, $post_id = 0 ) {
		unset( $enabled );
		return self::is_beta_gallery( (int) $post_id );
	}

	/**
	 * @param bool $enabled Unused prior value; identifier is the sole gate.
	 * @param int  $post_id Gallery or album post ID.
	 * @return bool
	 */
	public static function filter_settings_editor( $enabled, $post_id = 0 ) {
		unset( $enabled );
		$post_id = (int) $post_id;
		return self::is_beta_gallery( $post_id ) || self::is_beta_album( $post_id );
	}

	/**
	 * Last-writer probe: true when stored flat equals to_flat(stored v2) after normalize.
	 * Migration only — not a runtime gate.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return bool
	 */
	public static function was_saved_by_gallery_editor( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return false;
		}

		$v2 = Meta_Sync::get_settings_v2( $post_id );
		if ( empty( $v2 ) || ! is_array( $v2 ) ) {
			return false;
		}

		$from_v2 = Settings\Adapter::to_flat( $v2 );
		$stored  = get_post_meta( $post_id, 'modula-settings', true );
		if ( ! is_array( $stored ) || array() === $stored ) {
			return false;
		}

		return self::flat_documents_match( $from_v2, $stored );
	}

	/**
	 * Compare two flat settings documents (key order and scalar types ignored).
	 *
	 * @param array<string, mixed> $left  Left document.
	 * @param array<string, mixed> $right Right document.
	 * @return bool
	 */
	public static function flat_documents_match( array $left, array $right ) {
		return self::normalize_flat_document( $left ) === self::normalize_flat_document( $right );
	}

	/**
	 * Recursive ksort + scalar stringify so REST to_flat and stored meta can compare.
	 *
	 * @param mixed $value Flat value.
	 * @return mixed
	 */
	public static function normalize_flat_document( $value ) {
		if ( is_array( $value ) ) {
			foreach ( $value as $key => $item ) {
				$value[ $key ] = self::normalize_flat_document( $item );
			}
			ksort( $value );
			return $value;
		}

		if ( is_bool( $value ) ) {
			return $value ? '1' : '0';
		}

		if ( is_int( $value ) || is_float( $value ) ) {
			return (string) $value;
		}

		if ( is_string( $value ) && is_numeric( $value ) ) {
			return (string) ( 0 + $value );
		}

		return $value;
	}

	/**
	 * One-shot: flag galleries last-written by the gallery editor, then drop the site option.
	 *
	 * @return void
	 */
	public static function maybe_migrate() {
		if ( get_option( self::MIGRATED_OPTION ) ) {
			return;
		}

		if ( get_option( self::LEGACY_OPTION, false ) ) {
			$ids = get_posts(
				array(
					'post_type'      => 'modula-gallery',
					'post_status'    => 'any',
					'posts_per_page' => -1,
					'fields'         => 'ids',
					'no_found_rows'  => true,
				)
			);
			if ( is_array( $ids ) ) {
				foreach ( $ids as $id ) {
					if ( self::was_saved_by_gallery_editor( (int) $id ) ) {
						self::mark_as_beta_gallery( (int) $id );
					}
				}
			}
			delete_option( self::LEGACY_OPTION );
		}

		update_option( self::MIGRATED_OPTION, '1', false );
	}
}
