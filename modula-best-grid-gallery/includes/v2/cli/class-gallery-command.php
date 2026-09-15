<?php
/**
 * Gallery WP-CLI: list / convert / restore (galleries only).
 *
 * @package Modula
 */

namespace Modula\V2\Cli;

use Modula\V2\Admin\Beta_Gallery_Admin;
use Modula\V2\Beta_Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Command
 *
 * ## EXAMPLES
 *
 *     wp modula gallery list
 *     wp modula gallery convert 12 34
 *     wp modula gallery convert --all --dry-run
 *     wp modula gallery convert --all --yes --user=1
 *     wp modula gallery restore 12 --user=1
 *     wp modula gallery restore --all --yes --user=1
 */
class Gallery_Command {

	/**
	 * Register `wp modula gallery`.
	 *
	 * @return void
	 */
	public static function register() {
		if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
			return;
		}

		\WP_CLI::add_command( 'modula gallery', __CLASS__ );
	}

	/**
	 * List galleries with editor stack and classic settings backup flag.
	 *
	 * ## OPTIONS
	 *
	 * [--status=<status>]
	 * : Post status. Default: any (excludes trash).
	 *
	 * [--format=<format>]
	 * : Render format (table, csv, json, ids, count).
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - csv
	 *   - json
	 *   - ids
	 *   - count
	 * ---
	 *
	 * [--fields=<fields>]
	 * : Limit columns (comma-separated).
	 *
	 * ## EXAMPLES
	 *
	 *     wp modula gallery list
	 *     wp modula gallery list --status=publish --format=ids
	 *
	 * @subcommand list
	 * @when after_wp_load
	 *
	 * @param array $args       Positional (unused).
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function list_( $args, $assoc_args ) {
		unset( $args );
		$this->require_user();

		$status = \WP_CLI\Utils\get_flag_value( $assoc_args, 'status', Gallery_Targets::default_list_status() );
		$ids    = $this->query_gallery_ids( $status );

		$items = array();
		foreach ( $ids as $id ) {
			$post = get_post( $id );
			if ( ! $post ) {
				continue;
			}

			$items[] = array(
				'ID'         => (string) $id,
				'title'      => $post->post_title,
				'status'     => $post->post_status,
				'editor'     => Beta_Settings::is_beta_gallery( $id ) ? 'beta' : 'classic',
				'has_backup' => Beta_Settings::has_classic_settings_backup( $id ) ? 'yes' : 'no',
			);
		}

		$formatter = new \WP_CLI\Formatter(
			$assoc_args,
			array( 'ID', 'title', 'status', 'editor', 'has_backup' )
		);
		$formatter->display_items( $items );
	}

	/**
	 * Convert classic galleries to the new editor (Convert to new editor).
	 *
	 * ## OPTIONS
	 *
	 * [<id>...]
	 * : Gallery post IDs. Mutually exclusive with --all.
	 *
	 * [--all]
	 * : Convert all classic galleries matching --status.
	 *
	 * [--status=<status>]
	 * : Post status when using --all. Default: publish.
	 *
	 * [--dry-run]
	 * : Show what would change; write nothing. Does not require --yes.
	 *
	 * [--yes]
	 * : Required with --all for real writes.
	 *
	 * ## EXAMPLES
	 *
	 *     wp modula gallery convert 12 --user=1
	 *     wp modula gallery convert --all --dry-run --user=1
	 *     wp modula gallery convert --all --yes --user=1
	 *
	 * @when after_wp_load
	 *
	 * @param array $args       Gallery IDs.
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function convert( $args, $assoc_args ) {
		$this->require_user();

		$all     = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'all', false );
		$dry_run = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$yes     = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'yes', false );
		$status  = \WP_CLI\Utils\get_flag_value( $assoc_args, 'status', Gallery_Targets::default_write_status() );

		$selection = Gallery_Targets::validate_selection( $args, $all );
		if ( is_wp_error( $selection ) ) {
			\WP_CLI::error( $selection->get_error_message() );
		}

		$confirm = Gallery_Targets::validate_all_confirmation( $all, $dry_run, $yes );
		if ( is_wp_error( $confirm ) ) {
			\WP_CLI::error( $confirm->get_error_message() );
		}

		if ( $all ) {
			$ids = $this->query_gallery_ids( $status, 'classic' );
		} else {
			$ids = array_values(
				array_filter(
					array_map( 'absint', $args ),
					static function ( $id ) {
						return $id > 0;
					}
				)
			);
		}

		if ( empty( $ids ) ) {
			\WP_CLI::success( __( 'No galleries to convert.', 'modula-best-grid-gallery' ) );
			return;
		}

		$converted    = 0;
		$already_beta = 0;
		$errors       = 0;

		foreach ( $ids as $id ) {
			$title = $this->gallery_label( $id );

			if ( $dry_run ) {
				if ( Beta_Settings::is_beta_gallery( $id ) ) {
					\WP_CLI::log( sprintf( '[dry-run] %s — already beta (no-op)', $title ) );
					++$already_beta;
					continue;
				}
				\WP_CLI::log( sprintf( '[dry-run] %s — would convert to new editor', $title ) );
				++$converted;
				continue;
			}

			$result = Beta_Gallery_Admin::convert_to_beta_gallery( $id );
			$mapped = Gallery_Targets::map_convert_result( $result );

			if ( 'converted' === $mapped['outcome'] ) {
				\WP_CLI::log( sprintf( '%s — converted to new editor', $title ) );
				++$converted;
				continue;
			}

			if ( 'already_beta' === $mapped['outcome'] ) {
				\WP_CLI::log( sprintf( '%s — already uses the new editor', $title ) );
				++$already_beta;
				continue;
			}

			\WP_CLI::warning( sprintf( '%s — %s', $title, $mapped['message'] ) );
			++$errors;
		}

		\WP_CLI::log(
			sprintf(
				/* translators: 1: converted count, 2: already-beta count, 3: error count */
				__( 'Done. Converted: %1$d. Already beta: %2$d. Errors: %3$d.', 'modula-best-grid-gallery' ),
				$converted,
				$already_beta,
				$errors
			)
		);

		if ( $errors > 0 ) {
			\WP_CLI::error( __( 'One or more galleries could not be converted.', 'modula-best-grid-gallery' ), false );
			exit( 1 );
		}

		if ( $dry_run ) {
			\WP_CLI::success( __( 'Dry run complete. No changes written.', 'modula-best-grid-gallery' ) );
			return;
		}

		\WP_CLI::success( __( 'Convert to new editor finished.', 'modula-best-grid-gallery' ) );
	}

	/**
	 * Restore classic editor from classic settings backup.
	 *
	 * ## OPTIONS
	 *
	 * [<id>...]
	 * : Gallery post IDs. Mutually exclusive with --all.
	 *
	 * [--all]
	 * : Restore all Beta galleries matching --status (skips those without a backup).
	 *
	 * [--status=<status>]
	 * : Post status when using --all. Default: publish.
	 *
	 * [--dry-run]
	 * : Show what would change; write nothing. Does not require --yes.
	 *
	 * [--yes]
	 * : Required with --all for real writes.
	 *
	 * ## EXAMPLES
	 *
	 *     wp modula gallery restore 12 --user=1
	 *     wp modula gallery restore --all --dry-run --user=1
	 *     wp modula gallery restore --all --yes --user=1
	 *
	 * @when after_wp_load
	 *
	 * @param array $args       Gallery IDs.
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function restore( $args, $assoc_args ) {
		$this->require_user();

		$all     = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'all', false );
		$dry_run = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$yes     = (bool) \WP_CLI\Utils\get_flag_value( $assoc_args, 'yes', false );
		$status  = \WP_CLI\Utils\get_flag_value( $assoc_args, 'status', Gallery_Targets::default_write_status() );

		$selection = Gallery_Targets::validate_selection( $args, $all );
		if ( is_wp_error( $selection ) ) {
			\WP_CLI::error( $selection->get_error_message() );
		}

		$confirm = Gallery_Targets::validate_all_confirmation( $all, $dry_run, $yes );
		if ( is_wp_error( $confirm ) ) {
			\WP_CLI::error( $confirm->get_error_message() );
		}

		if ( $all ) {
			$ids = $this->query_gallery_ids( $status, 'beta' );
		} else {
			$ids = array_values(
				array_filter(
					array_map( 'absint', $args ),
					static function ( $id ) {
						return $id > 0;
					}
				)
			);
		}

		if ( empty( $ids ) ) {
			\WP_CLI::success( __( 'No galleries to restore.', 'modula-best-grid-gallery' ) );
			return;
		}

		$restored = 0;
		$skipped  = 0;
		$errors   = 0;

		foreach ( $ids as $id ) {
			$title = $this->gallery_label( $id );

			if ( $dry_run ) {
				if ( ! Beta_Settings::is_beta_gallery( $id ) ) {
					\WP_CLI::warning( sprintf( '[dry-run] %s — not a Beta gallery', $title ) );
					++$errors;
					continue;
				}
				if ( ! Beta_Settings::has_classic_settings_backup( $id ) ) {
					if ( $all ) {
						\WP_CLI::warning( sprintf( '[dry-run] %s — no classic settings backup (skip)', $title ) );
						++$skipped;
					} else {
						\WP_CLI::warning( sprintf( '[dry-run] %s — no classic settings backup', $title ) );
						++$errors;
					}
					continue;
				}
				\WP_CLI::log( sprintf( '[dry-run] %s — would restore classic editor', $title ) );
				++$restored;
				continue;
			}

			$result = Beta_Gallery_Admin::restore_classic_editor_gallery( $id );
			$mapped = Gallery_Targets::map_restore_result( $result, $all );

			if ( 'restored' === $mapped['outcome'] ) {
				\WP_CLI::log( sprintf( '%s — restored classic editor', $title ) );
				++$restored;
				continue;
			}

			if ( 'skipped' === $mapped['outcome'] ) {
				\WP_CLI::warning( sprintf( '%s — %s (skipped)', $title, $mapped['message'] ) );
				++$skipped;
				continue;
			}

			\WP_CLI::warning( sprintf( '%s — %s', $title, $mapped['message'] ) );
			++$errors;
		}

		\WP_CLI::log(
			sprintf(
				/* translators: 1: restored count, 2: skipped count, 3: error count */
				__( 'Done. Restored: %1$d. Skipped: %2$d. Errors: %3$d.', 'modula-best-grid-gallery' ),
				$restored,
				$skipped,
				$errors
			)
		);

		if ( $errors > 0 ) {
			\WP_CLI::error( __( 'One or more galleries could not be restored.', 'modula-best-grid-gallery' ), false );
			exit( 1 );
		}

		if ( $dry_run ) {
			\WP_CLI::success( __( 'Dry run complete. No changes written.', 'modula-best-grid-gallery' ) );
			return;
		}

		\WP_CLI::success( __( 'Restore classic editor finished.', 'modula-best-grid-gallery' ) );
	}

	/**
	 * Fail loud when WP-CLI has no authenticated user (pass --user=).
	 *
	 * @return void
	 */
	private function require_user() {
		if ( get_current_user_id() > 0 ) {
			return;
		}

		\WP_CLI::error(
			__( 'No WordPress user is loaded. Re-run with --user=<id> for an account that can edit galleries.', 'modula-best-grid-gallery' )
		);
	}

	/**
	 * Human label for logs.
	 *
	 * @param int $id Gallery ID.
	 * @return string
	 */
	private function gallery_label( $id ) {
		$id    = absint( $id );
		$post  = get_post( $id );
		$title = $post ? $post->post_title : '';
		if ( '' === $title ) {
			return sprintf( '#%d', $id );
		}

		return sprintf( '#%d (%s)', $id, $title );
	}

	/**
	 * Query modula-gallery IDs.
	 *
	 * @param string      $status  Post status (`any`, `publish`, …).
	 * @param string|null $editor  Optional: `classic`, `beta`, or null for all.
	 * @return int[]
	 */
	private function query_gallery_ids( $status, $editor = null ) {
		$args = array(
			'post_type'              => 'modula-gallery',
			'post_status'            => $status,
			'posts_per_page'         => -1,
			'fields'                 => 'ids',
			'orderby'                => 'ID',
			'order'                  => 'ASC',
			'no_found_rows'          => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		);

		if ( 'classic' === $editor ) {
			$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'OR',
				array(
					'key'     => Beta_Settings::META_KEY,
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => Beta_Settings::META_KEY,
					'value'   => '1',
					'compare' => '!=',
				),
			);
		} elseif ( 'beta' === $editor ) {
			$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'   => Beta_Settings::META_KEY,
					'value' => '1',
				),
			);
		}

		$query = new \WP_Query( $args );

		return array_map( 'intval', $query->posts );
	}
}
