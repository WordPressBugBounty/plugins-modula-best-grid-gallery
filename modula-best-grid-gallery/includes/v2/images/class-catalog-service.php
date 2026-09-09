<?php
/**
 * Filter + paginate raw/processed gallery rows for server-side catalog (docs §6.2).
 *
 * @package Modula
 */

namespace Modula\V2\Images;

defined( 'ABSPATH' ) || exit;

/**
 * Class Catalog_Service
 */
final class Catalog_Service {

	/**
	 * Apply active filters (same semantics as gallery-shared/store/clientLogic filterItems).
	 *
	 * @param array<int, array<string, mixed>> $rows    Image rows (after gallery hooks; may include title, caption).
	 * @param array<int, array{key: string, value: mixed}> $filters .
	 * @return array<int, array<string, mixed>>
	 */
	public static function apply_filters_to_rows( array $rows, array $filters ): array {
		$out = $rows;
		foreach ( $filters as $spec ) {
			if ( ! is_array( $spec ) ) {
				continue;
			}
			$key = isset( $spec['key'] ) ? (string) $spec['key'] : '';
			if ( '' === $key ) {
				continue;
			}
			$val = $spec['value'] ?? null;
			$out = array_values(
				array_filter(
					$out,
					function ( $row ) use ( $key, $val ) {
						return is_array( $row ) && self::row_matches_filter( $row, $key, $val );
					}
				)
			);
		}
		return $out;
	}

	/**
	 * @param mixed $value Filter value from REST/JS.
	 */
	private static function row_matches_filter( array $row, string $filter_key, $value ): bool {
		if ( 'category' === $filter_key || 'tag' === $filter_key ) {
			$cats = array();
			if ( isset( $row['categories'] ) && is_array( $row['categories'] ) ) {
				$cats = $row['categories'];
			} elseif ( isset( $row['tags'] ) && is_array( $row['tags'] ) ) {
				$cats = $row['tags'];
			} else {
				$cats = self::row_filter_tokens( $row );
			}
			if ( is_array( $value ) ) {
				foreach ( $value as $v ) {
					if ( in_array( $v, $cats, true ) ) {
						return true;
					}
				}
				return false;
			}
			return in_array( $value, $cats, true );
		}

		if ( 'search' === $filter_key ) {
			$term = strtolower( (string) $value );
			if ( '' === $term ) {
				return true;
			}
			$searchable = strtolower(
				implode(
					' ',
					array_filter(
						array(
							isset( $row['title'] ) ? (string) $row['title'] : '',
							isset( $row['caption'] ) ? (string) $row['caption'] : '',
							isset( $row['description'] ) ? (string) $row['description'] : '',
							isset( $row['alt'] ) ? (string) $row['alt'] : '',
						)
					)
				)
			);
			return false !== strpos( $searchable, $term );
		}

		if ( array_key_exists( $filter_key, $row ) ) {
			if ( is_array( $value ) ) {
				return in_array( $row[ $filter_key ], $value, true );
			}
			return $row[ $filter_key ] === $value;
		}
		return false;
	}

	/**
	 * Tokens from modula-images `filters` field (comma-separated).
	 *
	 * @return string[]
	 */
	private static function row_filter_tokens( array $row ): array {
		if ( ! isset( $row['filters'] ) ) {
			return array();
		}
		$f = $row['filters'];
		if ( is_array( $f ) ) {
			return array_map( 'strval', $f );
		}
		$s = (string) $f;
		if ( '' === trim( $s ) ) {
			return array();
		}
		return array_map( 'trim', explode( ',', $s ) );
	}

	/**
	 * Parse filters query param from REST (JSON array of {key,value}).
	 *
	 * @return array<int, array{key: string, value: mixed}>
	 */
	public static function parse_filters_param( $raw ): array {
		if ( is_array( $raw ) ) {
			$decoded = $raw;
		} else {
			$s = is_string( $raw ) ? trim( $raw ) : '';
			if ( '' === $s ) {
				return array();
			}
			$decoded = json_decode( $s, true );
		}
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		$out = array();
		foreach ( $decoded as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['key'] ) ) {
				continue;
			}
			$out[] = array(
				'key'   => (string) $item['key'],
				'value' => $item['value'] ?? null,
			);
		}
		return $out;
	}
}
