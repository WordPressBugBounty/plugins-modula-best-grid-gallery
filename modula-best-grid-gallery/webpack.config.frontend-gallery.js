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
		},
	},
	output: {
		filename: 'js/front/[name].js',
		chunkFilename: 'js/front/[id].modula-gallery.js',
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
				test: /\.(scss|css)$/,
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
				vendor: {
					test: /[\\/]node_modules[\\/](react|react-dom|react-redux|@reduxjs[\\/]toolkit|reselect|immer|use-sync-external-store|redux)[\\/]/,
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
