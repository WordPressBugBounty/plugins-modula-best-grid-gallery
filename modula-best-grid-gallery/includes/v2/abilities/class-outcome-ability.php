<?php
/** Preserve structured outcome details through the official adapter's WP_Error simplification. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Outcome_Ability extends \WP_Ability {
	private $output_failed = false;

	public function validate_input( $input = null ) {
		if ( is_array( $input ) && array_key_exists( 'attachment_ids', $input ) ) {
			if ( ! is_array( $input['attachment_ids'] ) || array_values( $input['attachment_ids'] ) !== $input['attachment_ids'] ) {
				return new \WP_Error( 'ability_invalid_input', 'input.attachment_ids must be a JSON list of integer identities.' );
			}
			foreach ( $input['attachment_ids'] as $index => $id ) {
				if ( ! is_int( $id ) ) {
					return new \WP_Error( 'ability_invalid_input', 'input.attachment_ids[' . $index . '] must be an integer JSON identity.' );
				}
			}
		}
		if ( ! in_array( $this->get_name(), array( Batch::OPERATION, Batch::MEDIA, Presets::BATCH, Album_Presets::BATCH ), true ) && 'modula/delete-gallery-preset' !== $this->get_name() && ! in_array( $this->get_name(), array_merge( Lifecycle::operations(), Album_Lifecycle::operations() ), true ) && Contract::is_mutation( $this->get_name() ) && ! Settings_Contract::strict_types( $input, Contract::definitions()[ $this->get_name() ]['input_schema'] ) ) {
			return new \WP_Error( 'ability_invalid_input', 'Patch fields require their declared JSON types and current feature availability.' );
		}
		if ( in_array( $this->get_name(), array( Batch::OPERATION, Batch::MEDIA, Presets::BATCH, Album_Presets::BATCH ), true ) && is_array( $input['targets'] ?? null ) ) {
			foreach ( $input['targets'] as $target ) { if ( ! is_int( $target['id'] ?? null ) ) { return new \WP_Error( 'ability_invalid_input', 'Each batch target needs an integer gallery identity.' ); } }
		}
		return parent::validate_input( $input );
	}

	protected function validate_output( $output ) {
		$valid = parent::validate_output( $output );
		$this->output_failed = is_wp_error( $valid );
		return $valid;
	}

	public function execute( $input = null ) {
		$this->output_failed = false;
		try {
			$result = parent::execute( $input );
		} catch ( \Throwable $error ) {
			if ( Integration::can_recover() && Contract::is_mutation( $this->get_name() ) ) {
				return Requests::output_failure( is_array( $input ) ? $input : array() );
			}
			return new \WP_Error( 'modula_execution_interrupted', 'Execution could not be confirmed.' );
		}
		if ( ! is_wp_error( $result ) || ! Integration::can_recover() ) {
			return $result;
		}
		if ( $this->output_failed && Contract::is_mutation( $this->get_name() ) ) {
			return Requests::output_failure( is_array( $input ) ? $input : array() );
		}
		if ( 'ability_invalid_input' === $result->get_error_code() ) {
			return Requests::outcome( is_array( $input ) && is_string( $input['request_id'] ?? null ) ? $input['request_id'] : '', 'rejected', 'invalid_input', $result->get_error_message(), $this->get_name() );
		}
		return $result;
	}
}
