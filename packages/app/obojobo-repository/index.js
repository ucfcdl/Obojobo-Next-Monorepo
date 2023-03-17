module.exports = {
	obojobo: {
		migrations: 'server/migrations',
		expressMiddleware: 'server/index.js',
		clientScripts: {
			repository: 'shared/components/pages/page-library.jsx',
			dashboard: 'shared/components/pages/page-dashboard-client.jsx',
			stats: 'shared/components/pages/page-stats-client.jsx',
			admin: 'shared/components/pages/page-admin-client.jsx',
			homepage: 'shared/components/pages/page-homepage.jsx',
			'page-module': 'shared/components/pages/page-module-client.jsx',
			'page-library': 'shared/components/pages/page-library-client.jsx'
		}
	}
}
