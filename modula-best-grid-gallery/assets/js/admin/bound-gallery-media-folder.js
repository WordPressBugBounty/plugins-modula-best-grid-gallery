/**
 * Listen for the folders host action and create a bound gallery (Pro)
 * or open the Pro upsell modal (Lite). Media folder and remote prefix slots.
 */
(function ($) {
	'use strict';

	var ROW_ACTION_EVENT = 'wpchill-folders-row-action';
	var config = window.modulaBoundGallery || {};

	/**
	 * @param {string} upsell Upsell modal slug.
	 * @return {void}
	 */
	function openUpsellModal(upsell) {
		if (!config.ajaxUrl || typeof $ === 'undefined') {
			return;
		}

		$.get(
			config.ajaxUrl,
			{
				action: 'modula_modal-' + upsell + '_upgrade',
			},
			function (html) {
				$('body').addClass('modal-open');
				$('body').append(html);

				var $overlay = $('.modula-modal__overlay.' + upsell);
				$overlay.find('.modula-modal__dismiss').on('click', function () {
					$overlay.remove();
					$('body').removeClass('modal-open');
				});
			}
		);
	}

	/**
	 * @param {Object} response AJAX response.
	 * @return {void}
	 */
	function handleCreateResponse(response) {
		var editUrl =
			response &&
			response.success &&
			response.data &&
			response.data.editUrl
				? response.data.editUrl
				: '';
		if (editUrl) {
			window.location.href = editUrl;
			return;
		}
		if (
			response &&
			!response.success &&
			response.data &&
			response.data.upsell
		) {
			openUpsellModal('bound-gallery');
		}
	}

	/**
	 * @param {JQuery.jqXHR} xhr Failed request.
	 * @return {void}
	 */
	function handleCreateFail(xhr) {
		var data = xhr && xhr.responseJSON && xhr.responseJSON.data;
		if (data && data.upsell) {
			openUpsellModal('bound-gallery');
		}
	}

	/**
	 * @param {string} action AJAX action.
	 * @param {Object} extra  Extra POST fields.
	 * @return {void}
	 */
	function postCreate(action, extra) {
		if (!config.ajaxUrl) {
			return;
		}

		$.post(
			config.ajaxUrl,
			$.extend(
				{
					action: action,
					nonce: config.nonce,
				},
				extra
			)
		)
			.done(handleCreateResponse)
			.fail(handleCreateFail);
	}

	window.addEventListener(ROW_ACTION_EVENT, function (event) {
		var detail = event && event.detail ? event.detail : {};
		if (detail.actionId !== config.actionId) {
			return;
		}
		if (detail.slot !== 'media_folder' && detail.slot !== 'remote_prefix') {
			return;
		}

		if (!config.isPro) {
			openUpsellModal('bound-gallery');
			return;
		}

		if (detail.slot === 'remote_prefix') {
			postCreate('modula_bound_gallery_create_from_remote_prefix', {
				target_id: detail.targetId,
			});
			return;
		}

		postCreate('modula_bound_gallery_create_from_media_folder', {
			folder_id: detail.targetId,
		});
	});
})(window.jQuery);
