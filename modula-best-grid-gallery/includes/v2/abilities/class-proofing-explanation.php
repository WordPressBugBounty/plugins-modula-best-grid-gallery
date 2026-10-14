<?php
/** Callable Proofing explanations owned by Lite. No settings, invitation, selection, account or mail effect. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Proofing_Explanation {
	public const PROVIDER = 'modula-lite-proofing-explanation';

	public static function boot(): void {
		foreach ( self::names() as $name ) {
			if ( ! Contract::is_mutation( $name ) ) {
				continue;
			}
			$authorize = in_array( $name, Proofing_Clients::mutations(), true )
				? array( Proofing_Clients::class, 'can_recover' )
				: array( Proofing::class, 'can_recover' );
			Outcomes::register_recovery( $name, $authorize );
		}
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return array_merge( Proofing::names(), Proofing_Selections::names(), Proofing_Clients::names(), Proofing_Email::names() );
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
			return self::rejected( $name, $input, self::blockers( $name, $input ) );
		};
	}

	/**
	 * Account operations explain user-management denial. Gallery operations explain gallery denial.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function blockers( string $name, array $input ): array {
		if ( in_array( $name, Proofing_Clients::names(), true ) ) {
			return Proofing_Clients::explain_blockers( $name, $input );
		}
		return Proofing::explain_blockers( $name, $input );
	}

	/**
	 * An authorized feature rejection consumes its request identity without a Proofing effect.
	 * An already retained result is returned unchanged and is not applied again.
	 *
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	public static function rejected( string $name, array $input, array $blockers ): array {
		$context = Proofing::rejection_context( $name, $input );
		return Requests::reject_feature( $name, $input, $blockers, 'This Proofing operation is not currently executable.', $context );
	}

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
