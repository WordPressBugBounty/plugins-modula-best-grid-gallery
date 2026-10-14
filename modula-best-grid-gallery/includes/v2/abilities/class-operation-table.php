<?php
/** Family-owned operation rows collected once for registration, permission, and discovery. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Operation_Table {
	/**
	 * @param array<string,callable>     $callbacks Execute map owned by the family.
	 * @param array<string,mixed>        $shared    Applied to every row.
	 * @param array<string,array<string,mixed>> $by_name Extra keys for named operations.
	 * @return array<string,array<string,mixed>>
	 */
	public static function from_callbacks( array $callbacks, array $shared = array(), array $by_name = array() ): array {
		$needs_name = ! empty( $shared['permission_needs_name'] );
		unset( $shared['permission_needs_name'] );
		$out = array();
		foreach ( $callbacks as $name => $execute ) {
			$row = array_merge( array( 'execute' => $execute ), $shared, isset( $by_name[ $name ] ) ? $by_name[ $name ] : array() );
			if ( $needs_name && isset( $row['permission'] ) && is_callable( $row['permission'] ) ) {
				$check             = $row['permission'];
				$row['permission'] = static function () use ( $check, $name ) {
					return (bool) call_user_func( $check, $name );
				};
			}
			$out[ $name ] = $row;
		}
		return $out;
	}

	/**
	 * Union family tables. Duplicate names keep the first execute and combine restrictions.
	 *
	 * @param array<int,class-string> $owners
	 * @return array<string,array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool,features:array<int,string>,requires_pro:bool,dependency:string,mcp_public:?callable,executor_checks:array<int,callable>,blocker_checks:array<int,callable>}>
	 */
	public static function collect( array $owners ): array {
		$table = array();
		foreach ( $owners as $owner ) {
			if ( ! is_callable( array( $owner, 'abilities' ) ) ) {
				continue;
			}
			foreach ( $owner::abilities() as $name => $row ) {
				if ( ! is_string( $name ) || ! is_array( $row ) || ! isset( $row['execute'] ) || ! is_callable( $row['execute'] ) ) {
					continue;
				}
				$incoming = self::normalize( $row );
				if ( ! isset( $table[ $name ] ) ) {
					$table[ $name ] = $incoming;
					continue;
				}
				$table[ $name ] = self::combine( $table[ $name ], $incoming );
			}
		}
		return $table;
	}

	/**
	 * @param array<string,mixed> $row
	 * @return array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool,features:array<int,string>,requires_pro:bool,dependency:string,mcp_public:?callable,executor_checks:array<int,callable>,blocker_checks:array<int,callable>}
	 */
	private static function normalize( array $row ): array {
		$gates = array();
		if ( isset( $row['available'] ) && is_callable( $row['available'] ) ) {
			$gates[] = $row['available'];
		}
		$candidate_gates = is_array( $row['gates'] ?? null ) ? $row['gates'] : array();
		foreach ( $candidate_gates as $gate ) {
			if ( is_callable( $gate ) ) {
				$gates[] = $gate;
			}
		}
		$features           = array();
		$candidate_features = is_array( $row['features'] ?? null ) ? $row['features'] : array();
		foreach ( $candidate_features as $feature ) {
			if ( is_string( $feature ) && '' !== $feature ) {
				$features[] = $feature;
			}
		}
		$permission = isset( $row['permission'] ) && is_callable( $row['permission'] ) ? $row['permission'] : null;
		$mcp_public = isset( $row['mcp_public'] ) && is_callable( $row['mcp_public'] ) ? $row['mcp_public'] : null;
		$dependency = isset( $row['dependency'] ) && is_string( $row['dependency'] ) ? $row['dependency'] : '';
		return array(
			'executor_checks' => isset( $row['executor_ready'] ) && is_callable( $row['executor_ready'] ) ? array( $row['executor_ready'] ) : array(),
			'blocker_checks'  => isset( $row['blockers'] ) && is_callable( $row['blockers'] ) ? array( $row['blockers'] ) : array(),
			'execute'         => $row['execute'],
			'permission'      => $permission,
			'gates'           => $gates,
			'destructive'     => ! empty( $row['destructive'] ),
			'outcome'         => ! empty( $row['outcome'] ),
			'features'        => $features,
			'requires_pro'    => ! empty( $row['requires_pro'] ),
			'dependency'      => $dependency,
			'mcp_public'      => $mcp_public,
		);
	}

	/**
	 * @param array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool,features:array<int,string>,requires_pro:bool,dependency:string,mcp_public:?callable,executor_checks:array<int,callable>,blocker_checks:array<int,callable>} $kept
	 * @param array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool,features:array<int,string>,requires_pro:bool,dependency:string,mcp_public:?callable,executor_checks:array<int,callable>,blocker_checks:array<int,callable>} $incoming
	 * @return array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool,features:array<int,string>,requires_pro:bool,dependency:string,mcp_public:?callable,executor_checks:array<int,callable>,blocker_checks:array<int,callable>}
	 */
	private static function combine( array $kept, array $incoming ): array {
		$kept['executor_checks'] = array_merge( $kept['executor_checks'], $incoming['executor_checks'] );
		$kept['blocker_checks']  = array_merge( $kept['blocker_checks'], $incoming['blocker_checks'] );
		$kept['destructive']     = $kept['destructive'] || $incoming['destructive'];
		$kept['outcome']         = $kept['outcome'] || $incoming['outcome'];
		$kept['requires_pro']    = $kept['requires_pro'] || $incoming['requires_pro'];
		$kept['features']        = array_values( array_unique( array_merge( $kept['features'], $incoming['features'] ) ) );
		if ( '' === $kept['dependency'] ) {
			$kept['dependency'] = $incoming['dependency'];
		}
		foreach ( $incoming['gates'] as $gate ) {
			$kept['gates'][] = $gate;
		}
		if ( $incoming['permission'] && $kept['permission'] && $incoming['permission'] !== $kept['permission'] ) {
			$first              = $kept['permission'];
			$second             = $incoming['permission'];
			$kept['permission'] = static function ( $input ) use ( $first, $second ) {
				return (bool) call_user_func( $first, $input ) && (bool) call_user_func( $second, $input );
			};
		} elseif ( $incoming['permission'] && ! $kept['permission'] ) {
			$kept['permission'] = $incoming['permission'];
		}
		if ( $incoming['mcp_public'] && $kept['mcp_public'] && $incoming['mcp_public'] !== $kept['mcp_public'] ) {
			$first              = $kept['mcp_public'];
			$second             = $incoming['mcp_public'];
			$kept['mcp_public'] = static function ( $name ) use ( $first, $second ) {
				return (bool) call_user_func( $first, $name ) && (bool) call_user_func( $second, $name );
			};
		} elseif ( $incoming['mcp_public'] && ! $kept['mcp_public'] ) {
			$kept['mcp_public'] = $incoming['mcp_public'];
		}
		return $kept;
	}
}
