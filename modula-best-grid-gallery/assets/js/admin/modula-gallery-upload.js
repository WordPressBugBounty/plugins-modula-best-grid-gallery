// Load the translations
const { __ } = wp.i18n;
// Load the Modula objects
wp.Modula = 'undefined' === typeof wp.Modula ? {} : wp.Modula;

/**
 * Modula browse for file
 */
class ModulaGalleryUpload {
	/**
	 * Post ID
	 *
	 * @since 2.11.0
	 */
	postID = 0;

	/**
	 * The progress class
	 *
	 * @since 2.11.0
	 */
	progressMode = false;

	/**
	 * Delete files checkbox
	 *
	 * @since 2.11.0
	 */
	deleteFiles = true;

	/**
	 * The zip upload handler
	 *
	 * @since 2.11.0
	 */
	zipUploadHandler = null;

	/**
	 * Constructor
	 *
	 * @since 2.11.0
	 */
	constructor() {
		const instance = this;
		// Add user actions
		instance.add_actions();
		instance.postObject = document.getElementById('post_ID');
		if (instance.postObject) {
			instance.postID = instance.postObject.value;
		}
	}
	/**
	 * Add actions
	 *
	 * @snice 2.11.0
	 */
	add_actions() {
		const instance = this,
			modulaFileBrowserButton = document.getElementById(
				'modula-uploader-folder-browser'
			),
			modulaSendFoldersButton = document.getElementById(
				'modula_create_gallery'
			);
		if (modulaFileBrowserButton) {
			modulaFileBrowserButton.addEventListener('click', function (e) {
				// Prevent default action
				e.preventDefault();

				window.send_to_editor = window.send_to_browse_file_url;

				tb_show(
					'<h1>' + modulaGalleryUpload.browseFolder + '</h1>',
					'media-upload.php?post_id=' +
						instance.postID +
						'&amp;type=modula_file_browser&amp;from=wpdlm01&amp;TB_iframe=true&amp;width=800&amp;height=600'
				);

				return false;
			});
			instance.readIframeData();
			instance.setUploaders();
			instance.initializeUploaders();
		}
		// Path input wrapper
		const modulaFileBrowser = document.querySelector(
			'.modula_file_browser'
		);
		// Toggle the send button state
		if (modulaFileBrowser) {
			modulaFileBrowser.addEventListener('change', function (event) {
				if (event.target.matches('input[type="checkbox"]')) {
					instance.updateSendButtonState(
						modulaFileBrowser,
						modulaSendFoldersButton
					);
				}
			});
		}
		const uploadErrorNotice = document.querySelector(
			'div[notice-target="modula_uploaded_error_files"]'
		);
		if (uploadErrorNotice) {
			uploadErrorNotice.addEventListener('click', function () {
				instance
					.restGalleryPost('dismiss-errors', {})
					.catch(function () {});
			});
		}
	}
	/**
	 * POST JSON to Modula gallery upload REST API.
	 *
	 * @param {string} suffix Route after …/upload/
	 * @param {Object} body JSON body
	 * @returns {Promise<Object>}
	 */
	async restGalleryPost(suffix, body) {
		const id =
			this.postID ||
			(document.getElementById('post_ID')
				? document.getElementById('post_ID').value
				: 0);
		const url =
			modulaGalleryUpload.restUrl +
			'gallery/' +
			encodeURIComponent(id) +
			'/upload/' +
			suffix;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': modulaGalleryUpload.restNonce,
			},
			credentials: 'same-origin',
			body: JSON.stringify(body),
		});
		const json = await res.json().catch(function () {
			return {};
		});
		if (!res.ok) {
			const msg =
				json && json.message ? json.message : res.statusText || 'Error';
			throw new Error(msg);
		}
		return json;
	}
	/**
	 * @param {*} str
	 * @returns {string}
	 */
	escapeHtml(str) {
		const div = document.createElement('div');
		div.textContent = str == null ? '' : String(str);
		return div.innerHTML;
	}
	/**
	 * Parse attachment id from wp.Uploader / async-upload response.
	 *
	 * @param {*} raw
	 * @returns {number}
	 */
	parseAttachmentIdFromUploadResponse(raw) {
		if (raw == null || raw === '') {
			return 0;
		}
		const s = String(raw).trim();
		if (/^\d+$/.test(s)) {
			return parseInt(s, 10);
		}
		try {
			const o = JSON.parse(s);
			if (o && o.data && o.data.id) {
				return parseInt(o.data.id, 10);
			}
			if (o && o.id) {
				return parseInt(o.id, 10);
			}
		} catch (e) {
			/* ignore */
		}
		return 0;
	}
	/**
	 * File browser
	 *
	 * @since 2.11.0
	 */
	fileBrowser() {
		const instance = this;
		// Event delegation - listens for clicks on dynamically added elements
		document.body.addEventListener('click', function (e) {
			if (e.target && e.target.matches('.modula_file_browser a')) {
				e.preventDefault();
				// Code to handle the click event on the dynamically added element
				instance.addFolderClick(e.target);
			}
		});
		instance.foldersFilesValidation();
	}
	/**
	 * Add folder click
	 *
	 * @param {*} folderLink
	 * @returns
	 *
	 * @since 2.11.0
	 */
	addFolderClick(folderLink) {
		const instance = this,
			$link = jQuery(folderLink),
			$parent = $link.closest('li'),
			$input = $parent.find('input[type="checkbox"]'),
			$inputChecked = $input.is(':checked');

		if ($parent.is('.folder_open')) {
			$parent.find('ul').remove();
			$parent.removeClass('folder_open');
		} else {
			$link.after('<ul class="load_tree loading"></ul>');
			instance
				.restGalleryPost('list-folders', {
					path: $link.attr('data-path'),
					input_checked: $inputChecked,
				})
				.then(function (data) {
					$parent.addClass('folder_open');
					const items = data.items || [];
					let html = '';
					if (items.length) {
						html = items
							.map(function (item) {
								return (
									'<li><input type="checkbox" value="' +
									instance.escapeHtml(item.value) +
									'" ' +
									(item.checked ? 'checked' : '') +
									'><a href="#" class="folder" data-path="' +
									instance.escapeHtml(item.data_path) +
									'">' +
									instance.escapeHtml(item.basename) +
									'</a></li>'
								);
							})
							.join('');
					} else {
						html = modulaGalleryUpload.noSubfolders;
					}
					$parent.find('.load_tree').html(html);
					$parent.find('.load_tree').removeClass('load_tree loading');
				})
				.catch(function () {
					$parent.addClass('folder_open');
					$parent.find('.load_tree').html(modulaGalleryUpload.noSubfolders);
					$parent.find('.load_tree').removeClass('load_tree loading');
				});
		}
		return false;
	}
	/**
	 *  Validate folders
	 *
	 * @since 2.11.0
	 */
	foldersFilesValidation() {
		const instance = this,
			modulaSendFoldersButton = document.getElementById(
				'modula_create_gallery'
			);

		modulaSendFoldersButton.addEventListener('click', async function (e) {
			e.preventDefault();
			// Add the disabled class to the button
			e.target.classList.add('disabled');
			instance.deleteFiles =
				document.getElementById('delete_files').checked;
			instance.progressMode.changeText(
				modulaGalleryUpload.startFolderValidation
			);
			const checkedInputsEl = document.querySelectorAll(
					'.modula_file_browser input[type="checkbox"]:checked'
				),
				checkedInputs = Array.from(checkedInputsEl),
				paths = checkedInputs.map((input) => input.value);
			const responsePaths = await instance.checkPaths(
				JSON.stringify(paths)
			);
			if (!responsePaths.success) {
				// Send error message
				instance.progressMode.changeText(responsePaths.data);
				return;
			}
			instance.progressMode.changeText(
				__('Found ', 'modula-best-grid-gallery') +
					responsePaths.data.length +
					__(
						' folders. Starting files validation...',
						'modula-best-grid-gallery'
					)
			);
			const responseFiles = await instance.filesValidation(
				JSON.stringify(responsePaths.data)
			);

			if (!responseFiles.success) {
				// Send error message
				instance.progressMode.changeText(responseFiles.data);
				return;
			}
			instance.progressMode.changeText(
				__('Found ', 'modula-best-grid-gallery') +
					responseFiles.data.length +
					__(
						' valid files. Starting importing the files...',
						'modula-best-grid-gallery'
					)
			);

			// Import the files in the Media Library
			instance.importFiles(responseFiles.data, true);
		});
	}
	/**
	 * Check paths
	 *
	 * @param {*} paths
	 * @returns
	 *
	 * @since 2.11.0
	 */
	async checkPaths(paths) {
		let pathArr = paths;
		if (typeof paths === 'string') {
			try {
				pathArr = JSON.parse(paths);
			} catch (e) {
				pathArr = [];
			}
		}
		if (!Array.isArray(pathArr) || pathArr.length === 0) {
			return {
				success: false,
				data: modulaGalleryUpload.noFoldersSelected,
			};
		}
		const instance = this;
		if (!instance.postID) {
			instance.postID = document.getElementById('post_ID').value;
		}
		try {
			const data = await instance.restGalleryPost('check-paths', {
				paths: pathArr,
			});
			return { success: true, data: data.folders };
		} catch (e) {
			return { success: false, data: e.message };
		}
	}
	/**
	 * Files validation
	 *
	 * @param {*} paths
	 *
	 * @since 2.11.0
	 */
	async filesValidation(paths) {
		const instance = this;
		let pathArr = paths;
		if (typeof paths === 'string') {
			try {
				pathArr = JSON.parse(paths);
			} catch (e) {
				pathArr = [];
			}
		}
		try {
			const data = await instance.restGalleryPost('check-files', {
				paths: pathArr,
			});
			return { success: true, data: data.files };
		} catch (e) {
			return { success: false, data: e.message };
		}
	}
	/**
	 * Import files
	 *
	 * @param {*} files
	 * @param {*} modal
	 * @since 2.11.0
	 */
	async importFiles(files, modal = false) {
		const instance = this;
		if (instance.postID === 0) {
			instance.postID = document.getElementById('post_ID').value;
		}
		let filesIDs = [];
		if (!modal) {
			instance.progressMode.initNoModal(files);
			instance.progressMode.noModalShowBar();
		} else {
			instance.progressMode.update(0.3, files.length);
		}

		// Cycle through the files and import them
		for (let i = 0; i < files.length; i++) {
			if (modal) {
				instance.progressMode.changeText(
					__('Importing file ', 'modula-best-grid-gallery') +
						(i + 1) +
						__(' of ', 'modula-best-grid-gallery') +
						files.length
				);
			} else {
				instance.progressMode.changeText('');
				instance.progressMode.noModalProgress(i + 1);
			}
			const file = files[i];
			try {
				const data = await instance.restGalleryPost('import-file', {
					file: file,
					delete_files: instance.deleteFiles,
				});
				if (modal) {
					instance.progressMode.update(i + 1, files.length);
				}
				filesIDs.push(data.attachment_id);
			} catch (e) {
				if (!modal) {
					instance.progressMode.changeText(e.message);
				}
			}
		}

		// Check if there are files to import
		if (filesIDs.length > 0) {
			instance.progressMode.changeText(
				__('Imported ', 'modula-best-grid-gallery') +
					filesIDs.length +
					__(' files.', 'modula-best-grid-gallery')
			);
			if (modal) {
				// Wait for 2 seconds before updating the gallery.
				setTimeout(function () {
					instance.progressMode.hideBar();
					if (modal) {
						instance.progressMode.changeText(
							modulaGalleryUpload.updatingGallery
						);
					}
					// Update the gallery
					instance.updateGallery(filesIDs);
				}, 2000);
			} else {
				instance.progressMode.changeText('');
				instance.progressMode.noModalHideBar();
				// Update the gallery
				instance.updateGallery(filesIDs, false);
			}
		} else {
			if (modal) {
				instance.progressMode.hideBar();
			}
		}
	}
	/**
	 * Update gallery
	 *
	 * @param {*} ids
	 * @since 2.11.0
	 */
	async updateGallery($ids, modal = true) {
		const instance = this;
		instance.postID = document.getElementById('post_ID').value;
		try {
			const data = await instance.restGalleryPost('add-images', {
				ids: $ids,
			});
			if (modal) {
				instance.progressMode.changeText(
					modulaGalleryUpload.galleryUpdated
				);
			}
			const parentData = {
				action: 'modula_gallery_updated',
				postID: instance.postID,
				images: data.images,
				security: modulaGalleryUpload.security,
			};
			instance.sendDataToParent(parentData);
		} catch (e) {
			if (modal) {
				instance.progressMode.changeText(e.message);
			}
		}
	}
	/**
	 * Send data to parent
	 *
	 * @param {*} data
	 * @since 2.11.0
	 */
	sendDataToParent(data) {
		window.parent.postMessage(data, '*');
	}
	/**
	 * Read iframe data
	 *
	 * @since 2.11.0
	 */
	readIframeData() {
		const instance = this;
		window.addEventListener('message', function (e) {
			if (e.data) {
				// Return if action or security is undefined
				if (
					'undefined' === typeof e.data.action ||
					'undefined' === e.data.security
				) {
					return;
				}
				// Return if security does not match
				if (modulaGalleryUpload.security !== e.data.security) {
					return;
				}
				// Check if the action is modula_gallery_updated
				if (e.data.action === 'modula_gallery_updated') {
					// Close the modal
					tb_remove();
					// Add files to the gallery
					instance.addFilesToGallery(e.data.images);
				}
			}
		});
	}
	/**
	 * Add files to gallery
	 *
	 * @param {*} images
	 * @since 2.11.0
	 */
	addFilesToGallery(images) {
		const instance = this;
		const imagesArray = Object.values(images);
		const positionInput = document.querySelector(
			'input[name="modula-settings[upload_position]"]:checked'
		);
		const uploadPosition =
			positionInput && positionInput.value ? positionInput.value : 'end';
		const atStart =
			uploadPosition === 'start' || uploadPosition === '1';

		for (let i = 0; i < imagesArray.length; i++) {
			const newModel = instance.generateSingleImage(imagesArray[i]);
			if (atStart) {
				wp.Modula.Items.add(newModel, { at: 0 });
			} else {
				wp.Modula.Items.add(newModel);
			}
			wp.Modula.Items.trigger('newItemAdded', newModel);
			wp.Modula.GalleryView.render();
		}
	}
	/**
	 * Generate single image
	 *
	 * @param {*} data
	 * @returns
	 *
	 * @since 2.11.0
	 */
	generateSingleImage(attachment) {
		var data = {
			halign: 'center',
			valign: 'middle',
			link: '',
			target: '',
			togglelightbox: '',
			hideTitle: '',
		};

		if ('undefined' !== typeof attachment['sizes']) {
			data['full'] = attachment['sizes']['full']['url'];
			if ('undefined' != typeof attachment['sizes']['large']) {
				data['thumbnail'] = attachment['sizes']['large']['url'];
			} else {
				data['thumbnail'] = data['full'];
			}
		} else {
			data['full'] = attachment['url'];
			data['thumbnail'] = data['full'];
		}

		data['id'] = attachment['id'];
		data['alt'] = attachment['alt'];
		data['orientation'] = attachment['orientation'];
		data['title'] = attachment['title'];
		data['description'] = attachment['caption'];

		return new wp.Modula.items['model'](data);
	}

	/**
	 * Zip uploader
	 *
	 * @since 2.11.0
	 */
	setUploaders() {
		const instance = this;
		instance.progressMode = new ModulaProgress(
			'modula-uploader-container',
			false
		);
		instance.progressMode.display();

		instance.zipUploadHandler = Backbone.Model.extend({
			uploaderOptions: {
				container: jQuery('#modula-uploader-container'),
				browser: jQuery('#modula-upload-zip-browser'),
				params: {
					type: 'modula-gallery',
					action: 'modula_upload_zip',
					short: true,
				},
			},
			progressBar: jQuery('.modula-progress-bar'),
			containerUploader: jQuery('.modula-uploading-info'),
			errorContainer: jQuery('.modula-error-container'),
			galleryCotainer: jQuery(
				'#modula-uploader-container .modula-uploader-inline-content'
			),
			modula_files_count: 0,
			limitExceeded: false,

			initialize: function () {
				var modulaGalleryObject = this,
					uploader;

				uploader = new wp.Uploader(modulaGalleryObject.uploaderOptions);

				// Uploader events
				// Files Added for Uploading - show progress bar
				uploader.uploader.bind(
					'FilesAdded',
					jQuery.proxy(
						modulaGalleryObject.filesadded,
						modulaGalleryObject
					)
				);

				// File Uploading - update progress bar
				uploader.uploader.bind(
					'UploadProgress',
					jQuery.proxy(
						modulaGalleryObject.fileuploading,
						modulaGalleryObject
					)
				);

				// File Uploaded - add images to the screen
				uploader.uploader.bind(
					'FileUploaded',
					jQuery.proxy(
						modulaGalleryObject.fileupload,
						modulaGalleryObject
					)
				);

				// Files Uploaded - hide progress bar
				uploader.uploader.bind(
					'UploadComplete',
					jQuery.proxy(
						modulaGalleryObject.filesuploaded,
						modulaGalleryObject
					)
				);

				// File Upload Error - show errors
				uploader.uploader.bind('Error', function (up, err) {
					let errorResponse = err.message;
					if ('undefined' !== typeof err.response && err.response) {
						try {
							const errorResponseObj = JSON.parse(err.response);
							if (errorResponseObj && errorResponseObj.message) {
								errorResponse = errorResponseObj.message;
							}
						} catch (e) {
							/* keep err.message */
						}
					}
					modulaGalleryObject.errorContainer.html(
						'<div class="error fade"><p>' +
							err.file.name +
							': ' +
							errorResponse +
							'</p></div>'
					);
					up.refresh();
				});
			},

			// Uploader Events
			// Files Added for Uploading - show progress bar
			filesadded: function (up, files) {},

			// File Uploading - update progress bar
			fileuploading: function (up, file) {},

			// File Uploaded - add images to the screen
			fileupload: async function (up, file, info) {
				const fileId = instance.parseAttachmentIdFromUploadResponse(
					info.response
				);
				if (!fileId) {
					instance.progressMode.changeText(
						__(
							'Error uploading file. Please try again.',
							'modula-best-grid-gallery'
						)
					);
					modulaGalleryObject.errorContainer.html(
						'<div class="error fade"><p>' +
							file.name +
							': ' +
							__(
								'Invalid upload response.',
								'modula-best-grid-gallery'
							) +
							'</p></div>'
					);
					up.refresh();
					return;
				}

				instance.progressMode.changeText(
					__(
						'File uploaded, extracting zip...',
						'modula-best-grid-gallery'
					)
				);

				let unzipData;
				try {
					unzipData = await instance.restGalleryPost('unzip', {
						file_id: fileId,
					});
				} catch (e) {
					instance.progressMode.changeText(e.message);
					return;
				}

				instance.progressMode.changeText(
					__(
						'.zip extracted, checking files...',
						'modula-best-grid-gallery'
					)
				);
				const responsePaths = await instance.checkPaths(
					JSON.stringify(unzipData.folders || [])
				);
				if (!responsePaths.success) {
					instance.progressMode.changeText(responsePaths.data);
					return;
				}
				instance.progressMode.changeText(
					__('Found ', 'modula-best-grid-gallery') +
						responsePaths.data.length +
						__(
							' folders. Starting files validation...',
							'modula-best-grid-gallery'
						)
				);
				const responseFiles = await instance.filesValidation(
					JSON.stringify(responsePaths.data)
				);

				if (!responseFiles.success) {
					instance.progressMode.changeText(responseFiles.data);
					return;
				}
				instance.progressMode.changeText(
					__('Found ', 'modula-best-grid-gallery') +
						responseFiles.data.length +
						__(
							' valid files. Starting importing the files...',
							'modula-best-grid-gallery'
						)
				);

				instance.importFiles(responseFiles.data, false);
			},
			// Files Uploaded - hide progress bar
			filesuploaded: function () {},
		});
	}
	/**
	 * Initialize uploaders
	 *
	 * @since 2.11.0
	 */
	initializeUploaders() {
		const instance = this,
			modulaZipUpload = new instance.zipUploadHandler();
	}
	/**
	 * Update send button state
	 * @since 2.11.0
	 */
	updateSendButtonState(wrapper, button) {
		const checkedCheckboxes = wrapper.querySelectorAll(
			'input[type="checkbox"]:checked'
		);
		button.classList.toggle('disabled', checkedCheckboxes.length === 0);
	}
}

document.addEventListener('DOMContentLoaded', function () {
	window.send_to_browse_file_url = function (html) {
		tb_remove();
		window.send_to_editor = window.send_to_editor_default;
	};
	new ModulaGalleryUpload();
});
