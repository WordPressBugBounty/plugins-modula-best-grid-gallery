<?php
/** Lite-owned admission and recovery extension points, independent of premium executors. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Outcomes {
	/** @var array<string,callable> */
	private static $authorizers = array();
	/** @var array<string,callable> */
	private static $admissions = array();

	public static function register_recovery( string $operation, callable $authorize ): void {
		if ( ! isset( self::$authorizers[ $operation ] ) ) {
			self::$authorizers[ $operation ] = $authorize;
		}
	}

	public static function register_admission( string $operation, callable $admit ): void {
		if ( ! isset( self::$admissions[ $operation ] ) ) {
			self::$admissions[ $operation ] = $admit;
		}
	}

	public static function authorize( array $record ): bool {
		$operation = $record['operation'] ?? '';
		if ( isset( self::$authorizers[ $operation ] ) ) {
			return (bool) call_user_func( self::$authorizers[ $operation ], $record );
		}
		return Requests::can_recover_record( $record );
	}

	public static function admit( string $operation, array $input ) {
		if ( isset( self::$admissions[ $operation ] ) ) {
			return call_user_func( self::$admissions[ $operation ], $input );
		}
		return null;
	}

	/**
	 * Finalize fresh outcomes before retention, or fresh read-only explanations.
	 * Recovery and replay preserve stored recommendation state without decoration.
	 *
	 * @param array<string,mixed> $outcome
	 * @return array<string,mixed>
	 */
	public static function decorate( array $outcome ): array {
		return Recommendations::decorate( $outcome );
	}
}
