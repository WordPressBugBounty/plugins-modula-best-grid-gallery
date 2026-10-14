<?php
/** Callable watermark explanations owned by Lite. No file rewrite or derivative regeneration. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Watermark_Explanation {
	public const PROVIDER = 'modula-lite-watermark-explanation';

	public static function boot(): void {
		foreach ( self::names() as $name ) {
			if ( ! Contract::is_mutation( $name ) ) {
				continue;
			}
			Outcomes::register_recovery( $name, array( Watermark::class, 'can_recover' ) );
		}
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return Watermark::names();
	}

	/**
	 * @param array<int,string> $names
	 * @return array<string,callable>
	 */
	public static function callbacks_for( array $names ): array {
		$out = array();
		foreach ( $names as $name ) {
			$out[ $name ] = self::handler( $name );
		}
		return $out;
	}

	public static function handler( string $name ): callable {
		return static function ( $input ) use ( $name ) {
			$input = is_array( $input ) ? $input : array();
			return self::rejected( $name, $input, Watermark::explain_blockers( $name, $input ) );
		};
	}

	/**
	 * An authorized feature rejection consumes its request identity without a file effect.
	 * An already retained result is returned unchanged and is not applied or removed again.
	 *
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	public static function rejected( string $name, array $input, array $blockers ): array {
		return Requests::reject_feature( $name, $input, $blockers, 'This watermark operation is not currently executable.' );
	}

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
