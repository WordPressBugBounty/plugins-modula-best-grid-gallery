jQuery(function ($) {
	// Galleries made in the new editor: the visitor renderer mounts them.
	var modernGallerySelector = '.modula-gallery-modern';

	/**
	 * Starts the classic gallery script on one widget's classic galleries.
	 *
	 * @param {jQuery} $galleries
	 */
	function initClassicGalleries($galleries) {
		$galleries.each(function () {
			var gal = $(this);
			var modulaSettings = gal.data('config'),
				modulaInstance = gal.data('plugin_modulaGallery');

			if (modulaInstance) {
				modulaInstance.destroy();
				gal.data('plugin_modulaGallery', null);
			}

			gal.modulaGallery(modulaSettings);
		});
	}

	/**
	 * Elementor inserts the widget's markup after the page has loaded, so
	 * each gallery script has to be started on it by hand.
	 *
	 * @param {jQuery} $scope The widget's wrapper.
	 */
	function initWidgetGalleries($scope) {
		var $galleries = $scope.find('.modula-gallery');

		initClassicGalleries($galleries.not(modernGallerySelector));

		if (
			$galleries.filter(modernGallerySelector).length > 0 &&
			'function' === typeof window.ModulaGalleryInit
		) {
			window.ModulaGalleryInit();
		}
	}

	// Every widget, not the Modula one alone: Elementor's Shortcode widget
	// inserts a gallery's markup the same way.
	function registerWidgetHandler() {
		elementorFrontend.hooks.addAction(
			'frontend/element_ready/widget',
			initWidgetGalleries
		);
	}

	if ('undefined' !== typeof elementorFrontend.hooks) {
		registerWidgetHandler();
	}

	$(window).on('elementor/frontend/init', registerWidgetHandler);
});
