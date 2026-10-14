<?php
/** Callable Instagram explanations owned by Lite. No provider query, import or gallery write. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Instagram_Explanation {
	public const PROVIDER = 'modula-lite-instagram-explanation';

	public static function boot(): void {
		foreach ( self::names() as $name ) {
			if ( ! Contract::is_mutation( $name ) ) {
				continue;
			}
			Outcomes::register_recovery( $name, array( Instagram::class, 'can_recover' ) );
		}
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return Instagram::names();
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
			return self::rejected( $name, $input, Instagram::explain_blockers( $name, $input ) );
		};
	}

	/**
	 * An authorized feature rejection consumes its request identity without a provider effect.
	 * An already retained result is returned unchanged and is not imported again.
	 *
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	public static function rejected( string $name, array $input, array $blockers ): array {
		return Requests::reject_feature( $name, $input, $blockers, 'This Instagram operation is not currently executable.' );
	}

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
