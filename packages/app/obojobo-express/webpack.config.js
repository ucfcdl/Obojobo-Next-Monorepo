const path = require('path')
const webpack = require('webpack')
const WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { gatherClientScriptsFromModules } = require('obojobo-lib-utils')
const docEnginePath = path.dirname(require.resolve('obojobo-document-engine'))
const entriesFromObojoboModules = gatherClientScriptsFromModules()
const WatchIgnorePlugin = require('webpack/lib/WatchIgnorePlugin')

module.exports =
	// built client files
	(env, argv) => {
		const is_production = argv.mode === 'production'
		const filename = is_production ? '[name]-[contenthash].min' : '[name]'
		// eslint-disable-next-line no-console
		console.log(`OboNode client scripts to build ${Object.keys(entriesFromObojoboModules).length}`)
		return {
			stats: { children: false, modules: false },
			optimization: { minimize: true },
			performance: { hints: false },
			mode: is_production ? 'production' : 'development',
			target: 'web',
			devServer: {
				https: true,
				host: '127.0.0.1',
				disableHostCheck: true,
				before: app => {
					// add utilities for dev env (visit /dev)
					require('./server/obo_express_dev')(app)
					// add obojobo express server to webpack
					require('./server/middleware.default')(app)
				},
				publicPath: '/static/',
				watchContentBase: true,
				watchOptions: {
					ignored: '/node_modules/'
				},
				stats: { children: false, modules: false }
			},
			entry: entriesFromObojoboModules,
			output: {
				publicPath: '/static/',
				path: path.join(__dirname, 'server', 'public', 'compiled'),
				filename: `${filename}.js`
			},
			module: {
				rules: [
					// Create React SVG Components when imported from js/jsx files
					{
						test: /\.svg$/,
						issuer: /\.js$/,
						use: [
							{
								loader: '@svgr/webpack',
								options: {
									svgoConfig: {
										plugins: [
											{
												prefixIds: {
													prefixClassNames: false // don't prefix class names in svgs
												}
											}
										]
									}
								}
							}
						]
					},
					// Load SVGs into strings when imported elsewhere
					{
						test: /\.svg$/,
						issuer: /\.scss$/,
						use: {
							loader: 'svg-url-loader',
							options: {
								stripdeclarations: true,
								iesafe: true
							}
						}
					},
					{
						test: /\.(js|jsx)$/,
						exclude: /node_modules/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: ['@babel/preset-react', '@babel/preset-env']
							}
						}
					},
					{
						test: /\.s?css$/,
						use: [
							MiniCssExtractPlugin.loader,
							'css-loader?url=false',
							{
								loader: 'postcss-loader',
								options: {
									postcssOptions: {
										plugins: [require('autoprefixer')]
									}
								}
							},
							{
								loader: 'sass-loader',
								options: {
									// expose SASS variable for build environment
									additionalData: `$is_production: '${is_production}';`
								}
							}
						]
					},
					{
						test: /\.(jpe?g|png)$/i,
						use: [
							{
								// @TODO: remove this if it's not used
								loader: 'responsive-loader',
								options: {
									adapter: require('responsive-loader/sharp')
								}
							}
						]
					}
				]
			},
			externals: {
				react: 'React',
				'react-dom': 'ReactDOM',
				backbone: 'Backbone',
				katex: 'katex',
				underscore: '_',
				Common: 'Common',
				Viewer: 'Viewer',
				slate: 'Slate',
				'slate-react': 'SlateReact'
			},
			plugins: [
				new WatchIgnorePlugin({
					paths: [path.join(__dirname, 'server', 'public', 'compiled', 'manifest.json')]
				}),
				new MiniCssExtractPlugin({ filename: `${filename}.css` }),
				new WebpackManifestPlugin({ publicPath: '/static/' }),
				// Ignore all locale files of moment.js
				new webpack.IgnorePlugin({
					resourceRegExp: /^\.\/locale$/,
					contextRegExp: /moment$/
				})
			],
			resolve: {
				extensions: ['.js', '.jsx'],
				alias: {
					styles: path.join(docEnginePath, 'src', 'scss')
				}
			}
		}
	}
