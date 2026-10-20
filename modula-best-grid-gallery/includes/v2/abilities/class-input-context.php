<?php
/** Exact JSON collection types across native REST, official MCP and batch dispatch. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Input_Context {
	/** Nested REST/child dispatch restores its caller's input on completion. */
	private static $inputs = array();

	public static function boot(): void {
		add_filter( 'rest_request_before_callbacks', array( self::class, 'capture' ), 10, 3 );
		add_filter( 'rest_request_after_callbacks', array( self::class, 'release' ) );
		add_filter( 'mcp_adapter_pre_tool_call', array( self::class, 'require_exact_authoring_input' ), 10, 3 );
	}

	/** Associative WordPress decoding otherwise collapses an empty JSON object into a list. */
	public static function capture( $response, $handler, $request ) {
		$json           = $request->get_body();
		$body           = is_string( $json ) && '' !== $json ? json_decode( $json ) : null;
		self::$inputs[] = self::raw_input( $body );
		return $response;
	}

	/** Native REST sends `input`; generic execute-ability nests `parameters`; a direct MCP tool call sends `arguments`. */
	private static function raw_input( $body ) {
		if ( isset( $body->input ) ) {
			return $body->input;
		}
		$arguments = $body->params->arguments ?? null;
		if ( ! $arguments instanceof \stdClass ) {
			return null;
		}
		if ( isset( $arguments->ability_name ) ) {
			return $arguments->parameters ?? null;
		}
		return 'tools/call' === ( $body->method ?? null ) ? $arguments : null;
	}

	public static function release( $response ) {
		array_pop( self::$inputs );
		return $response;
	}

	/** The adapter flattens STDIO arguments before this hook, so geometry fails closed. */
	public static function require_exact_authoring_input( $arguments, $tool_name, $tool ) {
		if ( ! is_array( $arguments ) ) {
			return $arguments;
		}
		$context = method_exists( $tool, 'get_observability_context' ) ? $tool->get_observability_context() : array();
		$name    = $arguments['ability_name'] ?? $context['ability_name'] ?? '';
		$input   = $arguments['parameters'] ?? $arguments;
		if ( ! is_string( $name ) || ! Contract::is_mutation( $name ) || ! is_array( $input ) || ! self::has_authored_input( $input ) ) {
			return $arguments;
		}
		$raw = end( self::$inputs );
		if ( $raw && self::is_current_input( $raw, $input ) ) {
			return $arguments;
		}
		return new \WP_Error( 'modula_input_collection_types_unavailable', 'Geometry authoring requires authenticated HTTP MCP or native REST to retain exact JSON collection types.' );
	}

	private static function has_authored_input( array $input ): bool {
		if ( is_array( $input['settings'] ?? null ) && Settings_Contract::has_authored_settings( $input['settings'] ) ) {
			return true;
		}
		foreach ( is_array( $input['targets'] ?? null ) ? $input['targets'] : array() as $target ) {
			if ( is_array( $target ) && self::has_authored_input( $target ) ) {
				return true;
			}
		}
		return false;
	}

	/** Native PHP callers have no JSON envelope. Validate only the exact current external input. */
	public static function types_match( $input, array $schema ): bool {
		$raw = end( self::$inputs );
		if ( ! $raw || ! self::is_current_input( $raw, $input ) ) {
			return true;
		}
		return self::collections_match( $raw, $schema );
	}

	/** Batch owns enrichment; retain collection kinds while it supplies child identity/scalars. */
	public static function with_batch_target( array $batch, int $index, array $target, callable $execute ) {
		$raw = end( self::$inputs );
		if ( ! $raw || ! self::is_current_input( $raw, $batch ) ) {
			return $execute();
		}
		$child = clone $raw->targets[ $index ];
		foreach ( get_object_vars( $child ) as $key => $value ) {
			if ( ! array_key_exists( $key, $target ) ) {
				unset( $child->$key );
			}
		}
		foreach ( $target as $key => $value ) {
			if ( ! property_exists( $child, $key ) ) {
				$child->$key = $value;
			}
		}
		$child->request_id = $target['request_id'];
		self::$inputs[]    = $child;
		try {
			return $execute();
		} finally {
			array_pop( self::$inputs );
		}
	}

	private static function is_current_input( $raw, $input ): bool {
		$json = wp_json_encode( $raw );
		return false !== $json && json_decode( $json, true ) === $input;
	}

	/** Scalars stay in strict_types; this recursive walk verifies JSON collection kinds. */
	private static function collections_match( $value, array $schema ): bool {
		if ( 'array' === ( $schema['type'] ?? null ) ) {
			if ( ! is_array( $value ) ) {
				return false;
			}
			foreach ( $value as $child ) {
				if ( ! self::collections_match( $child, $schema['items'] ) ) {
					return false;
				}
			}
			return true;
		}
		if ( 'object' !== ( $schema['type'] ?? null ) ) {
			return true;
		}
		if ( ! $value instanceof \stdClass ) {
			return false;
		}
		foreach ( get_object_vars( $value ) as $key => $child ) {
			if ( isset( $schema['properties'][ $key ] ) && ! self::collections_match( $child, $schema['properties'][ $key ] ) ) {
				return false;
			}
		}
		return true;
	}
}
