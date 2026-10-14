<?php
/** Callable extension-toggle explanations owned by Lite. No activation hook runs here. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Site_Explanation {
	public const PROVIDER = 'modula-lite-site-explanation';

	public static function boot(): void {
		Outcomes::register_recovery( Site_Settings::EXTENSION, array( Site_Settings::class, 'can_recover_extension' ) );
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return array( Site_Settings::EXTENSION );
	}

	public static function handler( string $name ): callable {
		return static function ( $input ) use ( $name ) {
			$input = is_array( $input ) ? $input : array();
			return self::rejected( $name, $input, Site_Settings::explain_blockers( $input ) );
		};
	}

	/**
	 * An authorized feature rejection consumes its request identity without a hook effect.
	 * An already retained result is returned unchanged and is not applied again.
	 *
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	public static function rejected( string $name, array $input, array $blockers ): array {
		return Requests::reject_feature( $name, $input, $blockers, 'This extension toggle operation is not currently executable.' );
	}

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
