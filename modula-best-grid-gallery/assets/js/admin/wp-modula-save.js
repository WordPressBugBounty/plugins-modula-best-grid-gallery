wp.Modula = 'undefined' === typeof wp.Modula ? {} : wp.Modula;

(function ($, modula) {
	var modulaSaveImages = {
		updateInterval: false,

		checkSave: function () {
			var self = this;

			$('#publishing-action .spinner').addClass('is-active');
			$('#publishing-action #publish').attr('disabled', 'disabled');

			if (!self.updateInterval) {
				self.updateInterval = setInterval(
					$.proxy(self.saveImages, self),
					1000
				);
			} else {
				clearInterval(self.updateInterval);
				self.updateInterval = setInterval(
					$.proxy(self.saveImages, self),
					1000
				);
			}
		},

		/**
		 * Write current Items into #modula-editor-images (no publish UI side effects).
		 * Dense collection order — sparse images[index] can JSON.stringify to [] / null holes.
		 */
		syncHiddenImagesField: function () {
			var images = [];
			var collection = wp.Modula.Items;

			if (collection && typeof collection.each === 'function') {
				collection.each(function (item) {
					var attributes =
						item && typeof item.getAttributes === 'function'
							? item.getAttributes()
							: null;
					if (!attributes || typeof attributes !== 'object') {
						return;
					}
					attributes.index = images.length;
					images.push(attributes);
				});
			}

			$('#modula-editor-images').val(JSON.stringify(images));
		},

		saveImages: function (callback) {
			var self = this;

			clearInterval(self.updateInterval);
			self.updateInterval = false;

			self.syncHiddenImagesField();

			$('#publishing-action .spinner').removeClass('is-active');
			$('#publishing-action #publish').removeAttr('disabled');

			if (typeof callback === 'function') {
				callback();
			}
		},

		bindFormSubmit: function () {
			var self = this;
			$('#post').on('submit.modulaClassicImages', function () {
				self.syncHiddenImagesField();
			});
		},
	};

	modula.Save = modulaSaveImages;

	$(function () {
		if (modula.Save && typeof modula.Save.bindFormSubmit === 'function') {
			modula.Save.bindFormSubmit();
		}
	});
})(jQuery, wp.Modula);
