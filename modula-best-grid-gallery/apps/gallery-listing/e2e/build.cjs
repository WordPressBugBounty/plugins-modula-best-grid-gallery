const path = require('path');
const webpack = require('webpack');
const base = require('../../../webpack.config.react-apps');

module.exports = async () => {
	const config = {
		...base,
		mode: 'development',
		devtool: false,
		entry: { listing: path.join(__dirname, 'entry.jsx') },
		output: {
			path: path.resolve(
				__dirname,
				'../../../.scratch/listing-quick-edit-redesign/browser-build'
			),
			filename: '[name].js',
			publicPath: '/assets/',
		},
		// Bundle the actual WP components for an isolated browser, without WP globals.
		plugins: [
			...base.plugins.filter(
				(plugin) =>
					plugin.constructor.name !==
					'DependencyExtractionWebpackPlugin'
			),
			new webpack.ProvidePlugin({ React: 'react' }),
		],
	};
	await new Promise((resolve, reject) => {
		const compiler = webpack(config);
		compiler.run((error, stats) => {
			compiler.close(() => {});
			if (error || stats.hasErrors()) {
				reject(
					error ||
						new Error(stats.toString({ all: false, errors: true }))
				);
			} else {
				resolve();
			}
		});
	});
};
