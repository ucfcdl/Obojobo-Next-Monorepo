require('./default.scss')

const React = require('react')
const Footer = require('./footer')
const reactVersion = '16.13.1'

const LayoutDefault = props => (
	<html lang="en">
		<head>
			<title>{props.title}</title>
			<meta charSet="utf-8" />
			<meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
			<meta
				id="meta-viewport"
				name="viewport"
				content="width=device-width initial-scale=1 minimum-scale=1 user-scalable=yes"
			/>
			{props.appCSSUrl ? <link rel="stylesheet" media="screen" href={props.appCSSUrl} /> : null}
			<link
				rel="stylesheet"
				media="screen"
				href="//fonts.googleapis.com/css?family=Libre+Franklin:400,400i,700,700i,900,900i|Roboto+Mono:400,400i,700,700i|Noto+Serif:400,400i,700,700i"
			/>
			{props.headerJs.map((url, index) => (
				<script key={index} src={url}></script>
			))}
		</head>
		<body className={props.className}>
			<div className="layout--wrapper">
				<div className="layout--content">{props.children}</div>
				<div className="layout--footer">
					<Footer />
				</div>
			</div>
			{props.appScriptUrl ? (
				<React.Fragment>
					<script
						crossOrigin={props.isDev ? 'true' : false}
						src={`//unpkg.com/react@${reactVersion}/umd/react.${
							props.isDev ? 'development' : 'production.min'
						}.js`}
					></script>
					<script
						crossOrigin={props.isDev ? 'true' : false}
						src={`//unpkg.com/react-dom@${reactVersion}/umd/react-dom.${
							props.isDev ? 'development' : 'production.min'
						}.js`}
					></script>
					<script src={props.appScriptUrl}></script>
				</React.Fragment>
			) : null}
		</body>
	</html>
)

LayoutDefault.defaultProps = {
	isDev: false,
	headerJs: []
}

module.exports = LayoutDefault
