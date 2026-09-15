<?php
/**
 * Gallery WP-CLI target selection helpers (IDs vs --all, outcome mapping).
 *
 * @package Modula
 */

namespace Modula\V2\Cli;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Targets
 */
final class Gallery_Targets {

	/**
	 * Validate that the operator passed IDs xor --all.
	 *
	 * @param int[] $ids Positional gallery IDs.
	 * @param bool  $all Whether --all was passed.
	 * @return true|\WP_Error
	 */
	public static function validate_selection( array $ids, $all ) {
		$ids = array_values(
			array_filter(
				array_map( 'absint', $ids ),
				static function ( $id ) {
					return $id > 0;
				}
			)
		);
		$all = (bool) $all;

		if ( $all && ! empty( $ids ) ) {
			return new \WP_Error(
				'modula_cli_selection_conflict',
				__( 'Pass gallery IDs or --all, not both.', 'modula-best-grid-gallery' )
			);
		}

		if ( ! $all && empty( $ids ) ) {
			return new \WP_Error(
				'modula_cli_selection_missing',
				__( 'Provide one or more gallery IDs, or pass --all.', 'modula-best-grid-gallery' )
			);
		}

		return true;
	}

	/**
	 * Default post_status for write commands when --all is used.
	 *
	 * @return string
	 */
	public static function default_write_status() {
		return 'publish';
	}

	/**
	 * Default post_status for list (diagnostic).
	 *
	 * @return string
	 */
	public static function default_list_status() {
		return 'any';
	}

	/**
	 * Whether --all writes may proceed (requires --yes; dry-run does not).
	 *
	 * @param bool $all     --all.
	 * @param bool $dry_run --dry-run.
	 * @param bool $yes     --yes.
	 * @return true|\WP_Error
	 */
	public static function validate_all_confirmation( $all, $dry_run, $yes ) {
		if ( ! $all || $dry_run || $yes ) {
			return true;
		}

		return new \WP_Error(
			'modula_cli_all_needs_yes',
			__( 'Bulk writes with --all require --yes (or use --dry-run first).', 'modula-best-grid-gallery' )
		);
	}

	/**
	 * Map convert_to_beta_gallery result for CLI (already-Beta is idempotent success).
	 *
	 * @param int|\WP_Error $result Admin method result.
	 * @return array{outcome:string,code:string,message:string} outcome: converted|already_beta|error
	 */
	public static function map_convert_result( $result ) {
		if ( ! is_wp_error( $result ) ) {
			return array(
				'outcome' => 'converted',
				'code'    => '',
				'message' => '',
			);
		}

		$code = $result->get_error_code();
		if ( 'modula_convert_beta_already_beta' === $code ) {
			return array(
				'outcome' => 'already_beta',
				'code'    => $code,
				'message' => $result->get_error_message(),
			);
		}

		return array(
			'outcome' => 'error',
			'code'    => $code,
			'message' => $result->get_error_message(),
		);
	}

	/**
	 * Map restore_classic_editor_gallery result for CLI.
	 *
	 * Bulk (--all): missing backup is a skip. Explicit IDs: missing backup is an error.
	 *
	 * @param int|\WP_Error $result Admin method result.
	 * @param bool          $bulk   Whether this run used --all.
	 * @return array{outcome:string,code:string,message:string} outcome: restored|skipped|error
	 */
	public static function map_restore_result( $result, $bulk ) {
		if ( ! is_wp_error( $result ) ) {
			return array(
				'outcome' => 'restored',
				'code'    => '',
				'message' => '',
			);
		}

		$code = $result->get_error_code();
		if ( $bulk && 'modula_restore_classic_no_backup' === $code ) {
			return array(
				'outcome' => 'skipped',
				'code'    => $code,
				'message' => $result->get_error_message(),
			);
		}

		return array(
			'outcome' => 'error',
			'code'    => $code,
			'message' => $result->get_error_message(),
		);
	}
}
