const env_node = process.env.NODE_ENV
const path = require('path')
let logger

describe('config', () => {
	beforeEach(() => {

		delete process.env.NODE_ENV
		jest.resetModules()
		jest.mock('../logger')
		logger = oboRequire('logger')
		global.oboJestMockConfig()
	})
	afterEach(() => {})
	beforeAll(() => {})
	afterAll(() => {
		process.env.NODE_ENV = env_node
	})

	test('db to have expected props and vals', () => {
		const config = oboRequire('config')
		expect(config).toHaveProperty('db.host')
		expect(config).toHaveProperty('db.port')
		expect(config).toHaveProperty('db.database')
		expect(config).toHaveProperty('db.user')
		expect(config).toHaveProperty('db.password')
		expect(config.db.host).toBe('itsdev!')
	})

	test('expects config to have loaded all files', () => {
		const config = oboRequire('config')
		expect(config).toHaveProperty('db')
		expect(config).toHaveProperty('lti')
		expect(config).toHaveProperty('permissions')
		expect(config).toHaveProperty('general')
		expect(config).toHaveProperty('media')
	})

	test('selects the environment based on env', () => {
		const config = oboRequire('config')
		expect(config).toHaveProperty('db')
		expect(config.db.host).toBe('itsdev!')
	})

	test('processes DATABASE_URL env variable', () => {
		const fs = require('fs')
		const mockDBConfig = {
			development: {
				driver: 'postgres',
				user: { ENV: 'DB_USER' },
				password: { ENV: 'DB_PASS' },
				host: { ENV: 'DB_HOST' },
				database: { ENV: 'DB_NAME' },
				port: { ENV: 'DB_PORT' }
			}
		}
		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		process.env.DATABASE_URL = 'postgres://mock-user:mock-password@mock-host.com:7777/mock-dbname'
		const config = oboRequire('config')
		expect(config).toHaveProperty('db.host', 'mock-host.com')
		expect(config).toHaveProperty('db.port', 7777)
		expect(config).toHaveProperty('db.database', 'mock-dbname')
		expect(config).toHaveProperty('db.driver', 'postgres')
		expect(config).toHaveProperty('db.user', 'mock-user')
		expect(config).toHaveProperty('db.password', 'mock-password')
		delete process.env.DATABASE_URL
		delete process.env.DB_USER
		delete process.env.DB_PASS
		delete process.env.DB_HOST
		delete process.env.DB_NAME
		delete process.env.DB_PORT
	})

	test('config logs errors when expected env not set', () => {
		process.env.NODE_ENV = 'test'
		const fs = require('fs')
		const mockDBConfig = {
			test: {
				driver: 'postgres',
				user: { ENV: 'DB_USER' }
			}
		}

		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		const config = oboRequire('config')
		expect(logger.error).toHaveBeenCalledTimes(2)
		expect(logger.error).toHaveBeenCalledWith('Error: Expected ENV var DB_USER is not set')
		expect(config.db).toEqual({})
	})

	test('processes DATABASE_URL env variable 2', () => {
		process.env.NODE_ENV = 'test'
		const fs = require('fs')
		const mockDBConfig = {
			test: {
				driver: 'postgres',
				user: { ENV: 'DB_USER' }
			}
		}
		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		oboRequire('config')
		expect(logger.error).toHaveBeenCalledTimes(2)
		expect(logger.error).toHaveBeenCalledWith('Error: Expected ENV var DB_USER is not set')
	})

	test('processes json env variables by expanding them when found', () => {
		const fs = require('fs')
		const mockDBConfig = {
			development: { ENV: 'DB_CONFIG_JSON'}
		}

		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		process.env.DB_CONFIG_JSON = '{"host":"mock-host","port":999}'
		const config = oboRequire('config')
		expect(config).toHaveProperty('db.host', 'mock-host')
		expect(config).toHaveProperty('db.port', 999)
		delete process.env.DB_CONFIG_JSON
	})

	test('logs error when env var ending in _JSON doesnt contain valid json', () => {
		process.env.NODE_ENV = 'test'
		const fs = require('fs')
		const mockDBConfig = {
			test: { ENV: 'DB_CONFIG_JSON'}
		}

		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		process.env.DB_CONFIG_JSON = '{invalid-json:"mock-host"}'
		const config = oboRequire('config')

		expect(config).not.toHaveProperty('db.host', 'mock-host')
		expect(config).not.toHaveProperty('db.port', 999)

		expect(logger.error).toHaveBeenCalledTimes(2)
		expect(logger.error).toHaveBeenCalledWith('Error: Expected ENV DB_CONFIG_JSON to be valid JSON, but it did not parse')
		delete process.env.DB_CONFIG_JSON
	})

	test('replaces env vars INSIDE json env values', () => {
		process.env.DB_PORT = 'mock-port'
		const fs = require('fs')
		const mockDBConfig = {
			development: { ENV: 'DB_CONFIG_JSON'}
		}

		const configPath = path.resolve(__dirname + '/../config')
		fs.__setMockFileContents(configPath + '/db.json', JSON.stringify(mockDBConfig))

		// NOTE the value of port in this json is another ENV:value key that itself
		// should be replaced with the actual env var value!!!
		process.env.DB_CONFIG_JSON = '{"host":"mock-host","port":{"ENV":"DB_PORT"}}'
		const config = oboRequire('config')
		expect(config).toHaveProperty('db.host', 'mock-host')
		expect(config).toHaveProperty('db.port', 'mock-port')
		delete process.env.DB_CONFIG_JSON
		delete process.env.DB_PORT
	})
})
