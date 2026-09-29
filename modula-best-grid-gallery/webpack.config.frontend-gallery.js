const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProduction = process.env.NODE_ENV === 'production';

// Webpack-emitted gallery chunks (incl. stale vendors-node_modules_* without suffix).
const WEBPACK_GALLERY_CHUNK =
	/^(js|css)\/front\/(.*modula-gallery.*\.(js|css|map)|vendors-node_modules_.*\.(js|map))(\?.*)?$/;

const config = {
	entry: {
		'modula-gallery': './apps/frontend-gallery/loader.js',
	},
	resolve: {
		extensions: ['.jsx', '.js', '.json'],
		alias: {
			'gallery-shared': path.resolve(__dirname, 'apps/gallery-shared'),
			'modula-private-react': require.resolve('react'),
			'modula-private-react-dom': require.resolve('react-dom'),
		},
	},
	// Only the visitor build selects a runtime; wp-admin keeps WP's extraction.
	externalsType: 'window',
	externals: {
		react: ['ModulaGalleryReact', 'React'],
		'react-dom': ['ModulaGalleryReact', 'ReactDOM'],
		'react-dom/client': ['ModulaGalleryReact', 'ReactDOM'],
	},
	output: {
		filename: 'js/front/[name].js',
		chunkFilename: 'js/front/[id].[contenthash:8].modula-gallery.js',
		path: path.resolve(__dirname, 'assets'),
		publicPath: 'auto',
		chunkLoadingGlobal: 'webpackChunkModulaGallery',
		globalObject: 'this',
		clean: {
			keep(asset) {
				return !WEBPACK_GALLERY_CHUNK.test(asset);
			},
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules\/(?!@fancyapps\/ui)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[
								'@babel/preset-env',
								{
									targets: {
										browsers: [
											'> 1%',
											'last 2 versions',
											'not ie <= 11',
										],
									},
									modules: false,
								},
							],
							[
								'@babel/preset-react',
								{
									runtime: 'automatic',
								},
							],
						],
					},
				},
			},
			{
				// Fancybox vendor sheet: prefix under the lightbox CSS host with
				// :root → host and document-level html/body left unscoped.
				test: /[/\\]lightbox[/\\]_fancybox-v6-vendor-scoped\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader',
					{
						loader: 'postcss-loader',
						options: {
							postcssOptions: {
								plugins: [
									require('./apps/gallery-shared/lightbox/prefixFancyboxVendorCss.js')
										.createFancyboxVendorPrefixPlugin(),
								],
							},
						},
					},
					{
						loader: 'sass-loader',
						options: {
							sassOptions: {
								outputStyle: isProduction
									? 'compressed'
									: 'expanded',
							},
						},
					},
				],
			},
			{
				test: /\.(scss|css)$/,
				exclude: /[/\\]lightbox[/\\]_fancybox-v6-vendor-scoped\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader',
					{
						loader: 'sass-loader',
						options: {
							sassOptions: {
								outputStyle: isProduction
									? 'compressed'
									: 'expanded',
							},
						},
					},
				],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: (pathData) => {
				const chunkName = pathData.chunk?.name;
				if (chunkName === 'modula-gallery') {
					return 'css/front/modula-gallery.css';
				}
				return `css/front/${chunkName}.modula-gallery.css`;
			},
			chunkFilename: 'css/front/[name].modula-gallery.css',
		}),
	],
	optimization: {
		minimize: isProduction,
		splitChunks: {
			// Entry loader must run synchronously — only split async imports (bootstrap/layouts).
			chunks: 'async',
			cacheGroups: {
				standaloneReact: {
					test: /[\\/]node_modules[\\/]react[\\/](index\.js|cjs[\\/]react\.(production|development))/,
					name: 'modula-react',
					priority: 40,
					enforce: true,
				},
				standaloneReactDOM: {
					test: /[\\/]node_modules[\\/](react-dom|scheduler)[\\/]/,
					name: 'modula-react-dom',
					priority: 40,
					enforce: true,
				},
				vendor: {
					test: /[\\/]node_modules[\\/](react-redux|@reduxjs[\\/]toolkit|reselect|immer|use-sync-external-store|redux)[\\/]/,
					name: 'vendor',
					chunks: 'async',
					priority: 20,
				},
			},
		},
	},
	devtool: isProduction ? false : 'source-map',
	mode: isProduction ? 'production' : 'development',
};

module.exports = config;
