const path = require("path");
const { merge } = require("webpack-merge");
const prod = require("./webpack.prod.js");

module.exports = merge(prod, {
	mode: "development",
	devtool: 'source-map',
	devServer: {
		server: 'https',
		hot: true,
		allowedHosts: 'auto',
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
		static: {
			directory: path.join(__dirname, 'public'),
			publicPath: ['/'],
			watch: true,
		},
		devMiddleware: {
			publicPath: '/',
		},
		client: {
			overlay: {
				errors: true,
				warnings: false,
				runtimeErrors: false,
			},
		},
	},
});