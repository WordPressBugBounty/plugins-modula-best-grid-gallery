<?php
/** Versioned provider contributions collected once at native registration. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Providers {
	public const PROTOCOL = 1;

	/** @var array<int,array> */
	private static $direct = array();
	/** @var array<string,array>|null Null marks a registration context not yet collected. */
	private static $resolved = null;
	/** @var array<int,array> Bounded diagnostic projection, never callback or input data. */
	private static $rejected = array();
	/** @var array<string,string> Technical failures for known operations without an executor. */
	private static $unavailable = array();

	public static function contribute( array $contribution ): void {
		self::$direct[]    = $contribution;
		self::$resolved    = null;
		self::$rejected    = array();
		self::$unavailable = array();
	}

	/** Build one Lite explanation contribution without inspecting unvalidated claims. */
	public static function explanations( array $contributions, string $provider, array $names, callable $handler ): array {
		$operations = array();
		foreach ( $names as $name ) {
			$operations[ $name ] = array( 'execute' => $handler( $name ) );
		}
		$contributions[] = array(
			'provider'    => $provider,
			'protocol'    => self::PROTOCOL,
			'explanatory' => true,
			'operations'  => $operations,
		);
		return $contributions;
	}

	public static function rejected(): array {
		return self::$rejected;
	}

	public static function resolved(): array {
		return self::resolve();
	}

	public static function callbacks(): array {
		$out = array();
		foreach ( self::resolve() as $name => $row ) {
			$out[ $name ] = $row['execute'];
		}
		return $out;
	}

	public static function provider_for( string $name ): string {
		return self::resolve()[ $name ]['provider'] ?? '';
	}

	public static function executable( string $name ): bool {
		$row = self::resolve()[ $name ] ?? null;
		return is_array( $row ) && ! $row['explanatory'] && Pro_Dependency::host_executor_ready( $name );
	}

	public static function unavailable_reason( string $name ): string {
		$row = self::resolve()[ $name ] ?? null;
		if ( is_array( $row ) && ! $row['explanatory'] ) {
			return '';
		}
		return self::$unavailable[ $name ] ?? '';
	}

	/** @return array<string,array{provider:string,execute:callable,explanatory:bool}> */
	private static function resolve(): array {
		if ( null !== self::$resolved ) {
			return self::$resolved;
		}
		self::$resolved = array();
		/** Each contribution declares provider, protocol, operations and optional explanatory status. */
		$contributions = apply_filters( 'modula_ability_provider_contributions', self::$direct );
		if ( ! is_array( $contributions ) ) {
			self::reject( array( 'reason' => 'invalid_contribution' ) );
			return self::$resolved;
		}
		$known     = Contract::definitions();
		$fallbacks = array();
		foreach ( $contributions as $contribution ) {
			if ( ! self::valid_contribution( $contribution, $known ) ) {
				continue;
			}
			if ( true === ( $contribution['explanatory'] ?? false ) ) {
				$fallbacks[] = $contribution;
				continue;
			}
			self::select_operations( $contribution, $known );
		}
		foreach ( $fallbacks as $contribution ) {
			self::select_operations( $contribution, $known );
		}
		return self::$resolved;
	}

	/** Validate the envelope before any of its operations can occupy the catalog. */
	private static function valid_contribution( $contribution, array $known ): bool {
		if ( ! is_array( $contribution ) ) {
			self::reject_contribution( $contribution, $known, 'invalid_contribution' );
			return false;
		}
		$valid_identity    = self::valid_identity( $contribution['provider'] ?? null );
		$valid_operations  = is_array( $contribution['operations'] ?? null );
		$valid_explanation = ! array_key_exists( 'explanatory', $contribution ) || is_bool( $contribution['explanatory'] );
		if ( ! $valid_identity || ! $valid_operations || ! $valid_explanation ) {
			self::reject_contribution( $contribution, $known, 'invalid_contribution' );
			return false;
		}
		if ( self::PROTOCOL !== ( $contribution['protocol'] ?? null ) ) {
			self::reject_contribution( $contribution, $known, 'unsupported_protocol' );
			return false;
		}
		return true;
	}

	private static function valid_identity( $provider ): bool {
		return is_string( $provider ) && 1 === preg_match( '/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/D', $provider );
	}

	private static function reject_contribution( $contribution, array $known, string $reason ): void {
		$diagnostic = array( 'reason' => $reason );
		$provider   = is_array( $contribution ) ? ( $contribution['provider'] ?? null ) : null;
		if ( self::valid_identity( $provider ) ) {
			$diagnostic['provider'] = $provider;
		}
		if ( is_array( $contribution ) && is_int( $contribution['protocol'] ?? null ) ) {
			$diagnostic['protocol'] = $contribution['protocol'];
		}
		self::reject( $diagnostic );
		$operations = is_array( $contribution ) && is_array( $contribution['operations'] ?? null ) ? $contribution['operations'] : array();
		foreach ( array_keys( $operations ) as $name ) {
			if ( isset( $known[ $name ] ) ) {
				self::$unavailable[ $name ] = $reason;
			}
		}
	}

	/** Accepted executors win first; explanations fill only the remaining known operations. */
	private static function select_operations( array $contribution, array $known ): void {
		$explanatory = true === ( $contribution['explanatory'] ?? false );
		foreach ( $contribution['operations'] as $name => $operation ) {
			$diagnostic = array(
				'provider'  => $contribution['provider'],
				'operation' => is_string( $name ) && isset( $known[ $name ] ) ? $name : '',
			);
			if ( ! is_string( $name ) || ! isset( $known[ $name ] ) || ! Integration::operation( $name ) ) {
				self::reject( $diagnostic + array( 'reason' => 'unknown_operation' ) );
				continue;
			}
			if ( ! is_array( $operation ) || ! self::accepts_input( $operation['execute'] ?? null ) ) {
				self::reject_operation( $name, $diagnostic, 'invalid_operation' );
				continue;
			}
			if ( ! $explanatory && ! Pro_Dependency::host_executor_ready( $name ) ) {
				self::reject_operation( $name, $diagnostic, 'executor_unavailable' );
				continue;
			}
			if ( isset( self::$resolved[ $name ] ) ) {
				self::reject_duplicate( $name, $diagnostic, $explanatory );
				continue;
			}
			self::$resolved[ $name ] = array(
				'provider'    => $contribution['provider'],
				'execute'     => $operation['execute'],
				'explanatory' => $explanatory,
			);
		}
	}

	/** Registration must not admit a callback that needs more arguments than WP_Ability supplies. */
	private static function accepts_input( $execute ): bool {
		if ( ! is_callable( $execute ) ) {
			return false;
		}
		$signature = new \ReflectionFunction( \Closure::fromCallable( $execute ) );
		if ( 1 < $signature->getNumberOfRequiredParameters() ) {
			return false;
		}
		$parameters = $signature->getParameters();
		if ( ! $parameters ) {
			return ! $signature->isInternal();
		}
		return ! $parameters[0]->isPassedByReference() && self::accepts_array_type( $parameters[0]->getType() );
	}

	/** Inputs are normalized object-schema arrays before WordPress calls an executor. */
	private static function accepts_array_type( $type ): bool {
		if ( null === $type ) {
			return true;
		}
		if ( $type instanceof \ReflectionNamedType ) {
			return in_array( $type->getName(), array( 'array', 'iterable', 'mixed' ), true );
		}
		if ( ! $type instanceof \ReflectionUnionType ) {
			return false;
		}
		foreach ( $type->getTypes() as $member ) {
			if ( self::accepts_array_type( $member ) ) {
				return true;
			}
		}
		return false;
	}

	private static function reject_operation( string $name, array $diagnostic, string $reason ): void {
		self::$unavailable[ $name ] = $reason;
		self::reject( $diagnostic + array( 'reason' => $reason ) );
	}

	private static function reject_duplicate( string $name, array $diagnostic, bool $explanatory ): void {
		if ( $explanatory ) {
			return;
		}
		self::reject(
			$diagnostic + array(
				'reason' => 'duplicate_operation',
				'kept'   => self::$resolved[ $name ]['provider'],
			)
		);
	}

	private static function reject( array $diagnostic ): void {
		if ( count( self::$rejected ) < 50 ) {
			self::$rejected[] = $diagnostic;
		}
	}
}
