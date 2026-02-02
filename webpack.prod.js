const path = require("path");

module.exports = {
	mode: "production",
	entry: "./src/indexCDN.ts",
	output: {
		filename: "beacon.js",
		path: path.resolve(__dirname, "dist/cdn"),
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	target: "browserslist:universal",
	module: {
		rules: [
			{
				test: /\.(ts|js)?$/,
				use: [
					{
						loader: "babel-loader",
						options: {
							presets: [
								[
									"@babel/preset-env",
									{
										browserslistEnv: "universal",
									},
								],
							],
						},
					},
					{
						loader: 'ts-loader',
						options: {
							transpileOnly: true,
						},
					},
				],
				include: [
					/node_modules\/@searchspring/,
					/node_modules\/@athoscommerce/,
					path.resolve(__dirname, "src"),
				],
			},
		],
	},
}