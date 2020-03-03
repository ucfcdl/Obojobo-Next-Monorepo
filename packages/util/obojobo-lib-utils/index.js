const path = require('path')
// allows us to override resolve for testing
let resolver = require.resolve

const flattenArray = array => {
	let result = []
	if (!array) return null
	array.forEach(data => {
		result = [...result].concat(data)
	})
	return result
}

const searchNodeModulesForOboNodesCache = new Set()
const searchNodeModulesForOboNodes = (forceReload = false) => {
	if (searchNodeModulesForOboNodesCache.size > 0 && !forceReload) {
		return Array.from(searchNodeModulesForOboNodesCache)
	}
	searchNodeModulesForOboNodesCache.clear()
	// use yarn to get a list of obojobo-* node_modules
	const packageSearchOut = require('child_process').execSync('yarn list --pattern obojobo-')
	const pattern = /obojobo-[^@]+/gi
	const packages = packageSearchOut.toString().match(pattern)
	packages.forEach(pkg => {
		try {
			pkg = pkg.trim()
			const manifest = require(pkg)
			if (manifest.obojobo) searchNodeModulesForOboNodesCache.add(pkg)
		} catch (error) {
			/* istanbul ignore next */
			if (!error.message.includes('Cannot find module')) {
				// eslint-disable-next-line no-console
				console.log(error)
			}
			// do nothing if there's no index.js
		}
	})
	return Array.from(searchNodeModulesForOboNodesCache)
}

const getOboNodeScriptPathsFromPackage = (oboNodePackage, type) => {
	const manifest = require(oboNodePackage) // load package index index.js
	if (!manifest.obojobo) return null
	let scripts
	if (type === 'obonodes') type = 'server'
	if (type === 'middleware') scripts = manifest.obojobo.expressMiddleware
	if (type === 'migrations') scripts = manifest.obojobo.migrations
	else if (manifest.obojobo[`${type}Scripts`]) {
		scripts = manifest.obojobo[`${type}Scripts`]
	}
	if (!scripts) return null
	return scripts
}

const getOboNodeScriptPathsFromPackageByTypeCache = new Map()
const getOboNodeScriptPathsFromPackageByType = (oboNodePackage, type) => {
	const cacheKey = `${oboNodePackage}-${type}`
	if (getOboNodeScriptPathsFromPackageByTypeCache.has(cacheKey)) {
		return [...getOboNodeScriptPathsFromPackageByTypeCache.get(cacheKey)]
	}
	let scripts = getOboNodeScriptPathsFromPackage(oboNodePackage, type)
	if (!scripts) return null
	// allow scriptss to be a single string - convert to an array to conform to the rest of this method
	if (!Array.isArray(scripts)) scripts = [scripts]

	// filter any missing values
	scripts = scripts.filter(a => a !== null)
	// node is just a string name, convert it to a full path
	const resolved = scripts.map(s => resolver(`${oboNodePackage}/${s}`))
	getOboNodeScriptPathsFromPackageByTypeCache.set(cacheKey, resolved)
	return [...resolved]
}

const getAllOboNodeScriptPathsByType = type => {
	const nodes = searchNodeModulesForOboNodes()
	const scripts = nodes.map(node => getOboNodeScriptPathsFromPackageByType(node, type))
	const flat = flattenArray(scripts)
	return flat.filter(a => a !== null)
}

const gatherAllMigrations = () => {
	const modules = searchNodeModulesForOboNodes()
	const allDirs = []
	modules.forEach(module => {
		const dir = getOboNodeScriptPathsFromPackage(module, 'migrations')
		if (!dir) return
		const basedir = path.dirname(resolver(module))
		allDirs.push(`${basedir}/${dir}`)
	})
	return allDirs
}

// locates migrations, config, and runs db-migrate up
const migrateUp = () => {
	const { execSync } = require('child_process')
	const dbMigratePath = resolver('db-migrate/bin/db-migrate')
	const configPath = resolver('obojobo-express/server/config/db.json')
	const migrationDirs = gatherAllMigrations()

	migrationDirs.forEach(dir => {
		// eslint-disable-next-line no-console
		console.log(`${dbMigratePath} up --config ${configPath} --migrations-dir ${dir}`)
		execSync(`${dbMigratePath} up --config ${configPath} --migrations-dir ${dir}`)
	})
}

const gatherClientScriptsFromModules = () => {
	const defaultOrderKey = '500'
	const modules = searchNodeModulesForOboNodes()
	const entries = {}

	/*
		gather all the clients scripts to build an object like:
		{
			// this is the entry name
			viewer:{
				// the keys here represent the sort position that is requested
				// note: 2 scripts that request the same sort position are not
				// guaranteed to be in order within that sort position
				0: ['path/to/script.js', 'path/to/another/script.js'],
				100: ['path/to/script.js', 'path/to/another/script.js'],

				// clientscripts with no sort order are all lumped into 500
				500: ['path/to/all/unordered/scripts.js', ...],
				...
			}
		}
	 */
	modules.forEach(oboNodePackage => {
		const items = getOboNodeScriptPathsFromPackage(oboNodePackage, 'client')
		for (const item in items) {
			const key = item.toLowerCase()
			if (!entries[key]) {
				entries[key] = {}
				entries[key][defaultOrderKey] = []
			}
			let script = items[item]

			// convert to array if not an array
			if (!Array.isArray(script)) script = [script]

			// eslint-disable-next-line no-loop-func
			script.forEach(single => {
				// support config format of:
				// entryFileName: 'rel/path/to/file.js'
				if (typeof single === 'string') {
					entries[key][defaultOrderKey].push(resolver(`${oboNodePackage}/${single}`))
				}
				// support config format of:
				// entryFileName: { file: 'rel/path/to/file.js', position: 20 }
				if (single.hasOwnProperty('file') && single.hasOwnProperty('position')) {
					if (!entries[key][single.position]) entries[key][single.position] = []
					entries[key][single.position].push(resolver(`${oboNodePackage}/${single.file}`))
				}
			})
		}
	})

	// flatten the entries object above into a single dimensional array
	// using the sort keys to define the order
	const scripts = {}
	Object.keys(entries).forEach(entryName => {
		const entry = entries[entryName]
		const sortedOrderKeys = Object.keys(entry).sort((a, b) => a - b)
		scripts[entryName] = []
		sortedOrderKeys.forEach(key => {
			scripts[entryName] = [...scripts[entryName], ...entry[key]]
		})
	})

	// eslint-disable-next-line no-console
	console.log(scripts)
	return scripts
}

const setResolver = newResolver => {
	resolver = newResolver
}

module.exports = {
	getOboNodeScriptPathsFromPackage,
	getOboNodeScriptPathsFromPackageByType,
	searchNodeModulesForOboNodes,
	getAllOboNodeScriptPathsByType,
	flattenArray,
	gatherAllMigrations,
	migrateUp,
	gatherClientScriptsFromModules,
	setResolver
}
