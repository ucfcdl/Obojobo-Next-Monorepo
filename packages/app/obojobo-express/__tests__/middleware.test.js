jest.mock('../server/obo_express', () => {})
jest.mock('serve-favicon')
jest.mock('../server/config', () => {
	return {
		general: {
			bodyParser: {
				jsonOptions: 'mockJSON',
				urlencodedOptions: 'mockURL',
				textOptions: 'mockTextOptions'
			}
		},
		db: {
			useBluebird: false
		}
	}
})
jest.mock('body-parser', () => {
	return {
		json: jest.fn(),
		urlencoded: jest.fn(),
		text: jest.fn()
	}
})
jest.mock('consolidate', () => mockConsolidateEngines)
jest.mock('../server/routes/profile', () => {})
jest.mock('../server/logger')
jest.mock('connect-pg-simple', () => {
	return jest.fn().mockReturnValueOnce(jest.fn())
})
jest.mock('../server/db')
jest.mock('express-session')

const originalWEBPACK = process.env.IS_WEBPACK
let mockRes
let mockApp
let mockReq
let mockConsolidateEngines
let config

describe('middleware', () => {
	beforeEach(() => {
		jest.resetModules()
		config = require('../server/config')
		config.general.bodyParser = {
			jsonOptions: 'mockJSON',
			urlencodedOptions: 'mockURL',
			textOptions: 'mockTextOptions'
		}
		config.general.secureCookie = false
		delete process.env.IS_WEBPACK
		mockRes = {
			status: jest.fn(),
			render: jest.fn(),
			json: jest.fn(),
			send: jest.fn(),
			missing: jest.fn(),
			unexpected: jest.fn(),
			locals: {}
		}

		mockApp = {
			get: jest.fn().mockReturnValueOnce('production'),
			set: jest.fn(),
			use: jest.fn(),
			disable: jest.fn(),
			engines: {},
			engine: jest.fn(),
			locals: {}
		}

		mockReq = {
			path: { startsWith: jest.fn() },
			app: mockApp
		}

		mockConsolidateEngines = {}
	})
	afterAll(() => {
		process.env.IS_WEBPACK = originalWEBPACK
	})

	test('initializes with no errors', () => {
		const middleware = require('../server/middleware.default')

		middleware(mockApp)
		expect(mockApp.set).toHaveBeenCalled()
		expect(mockApp.use).toHaveBeenCalled()
		expect(mockApp.disable).toHaveBeenCalledWith('x-powered-by')
	})

	test('sets default view extension to ejs', () => {
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		expect(mockApp.set).toHaveBeenCalledWith('view engine', 'ejs')
	})

	test('registeres ejs when not already registered', () => {
		const middleware = require('../server/middleware.default')
		const mockEJSEngine = {}
		mockConsolidateEngines.ejs = mockEJSEngine

		middleware(mockApp)
		expect(mockApp.engine).toHaveBeenCalledWith('ejs', mockEJSEngine)
	})

	test('skips registering ejs when already registered', () => {
		const middleware = require('../server/middleware.default')
		const mockEJSEngine = {}
		mockApp.engines.ejs = mockEJSEngine

		middleware(mockApp)
		expect(mockApp.engine).not.toHaveBeenCalled()
	})

	test('favicon is registered', () => {
		const middleware = require('../server/middleware.default')
		const favicon = require('serve-favicon')
		middleware(mockApp)
		expect(favicon).toHaveBeenCalled()
	})

	test('bodyParser is setup', () => {
		const middleware = require('../server/middleware.default')
		const bodyParser = require('body-parser')
		middleware(mockApp)
		expect(bodyParser.json).toHaveBeenCalled()
		expect(bodyParser.urlencoded).toHaveBeenCalled()
		expect(bodyParser.text).toHaveBeenCalled()
	})

	test('session handler is initialized', () => {
		const middleware = require('../server/middleware.default')
		const session = require('express-session')
		middleware(mockApp)
		expect(session).toHaveBeenCalled()
		expect(session.mock.calls[0][0]).toMatchInlineSnapshot(`
		Object {
		  "cookie": Object {
		    "httpOnly": true,
		    "maxAge": 864000000,
		    "path": "/",
		    "sameSite": false,
		    "secure": false,
		  },
		  "name": undefined,
		  "resave": false,
		  "rolling": true,
		  "saveUninitialized": false,
		  "secret": undefined,
		  "store": mockConstructor {},
		}
	`)
	})

	test('session handler is initialized with ssl enabled', () => {
		config.general.secureCookie = true
		const middleware = require('../server/middleware.default')
		const session = require('express-session')
		middleware(mockApp)
		expect(session).toHaveBeenCalled()
		expect(session.mock.calls[0][0]).toMatchInlineSnapshot(`
		Object {
		  "cookie": Object {
		    "httpOnly": false,
		    "maxAge": 864000000,
		    "path": "/",
		    "sameSite": "none",
		    "secure": true,
		  },
		  "name": undefined,
		  "resave": false,
		  "rolling": true,
		  "saveUninitialized": false,
		  "secret": undefined,
		  "store": mockConstructor {},
		}
	`)
	})

	test('obo_express is registered', () => {
		const middleware = require('../server/middleware.default')
		const ObojoboDocumentServer = require('../server/obo_express')
		middleware(mockApp)
		expect(mockApp.use).toHaveBeenCalledWith(ObojoboDocumentServer)
	})

	test('profile route is registered', () => {
		const middleware = require('../server/middleware.default')
		const profileRoute = require('../server/routes/profile')
		middleware(mockApp)
		expect(mockApp.use).toHaveBeenCalledWith('/profile', profileRoute)
	})

	test('a 404 handler is registered', () => {
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		const nextToLastCallIndex = mockApp.use.mock.calls.length - 2
		const shouldBe404Handler = mockApp.use.mock.calls[nextToLastCallIndex][0]

		// is a function?
		expect(shouldBe404Handler).toBeInstanceOf(Function)

		// function has 3 args (express seems to use arg count to determine what to do)
		expect(shouldBe404Handler.length).toBe(3)
	})

	test('when using webpack, the 404 handler calls calls missing when not a static file', () => {
		process.env.IS_WEBPACK = 'true'
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		const nextToLastCallIndex = mockApp.use.mock.calls.length - 2
		const shouldBe404Handler = mockApp.use.mock.calls[nextToLastCallIndex][0]
		const mockNext = jest.fn()
		// a request that isnt for a static file
		mockReq.path.startsWith.mockReturnValueOnce(false)

		shouldBe404Handler(mockReq, mockRes, mockNext)

		expect(mockRes.missing).toHaveBeenCalled()
		expect(mockNext).not.toHaveBeenCalled()
	})

	test('when using webpack, the 404 handler calls next on missing static files', () => {
		process.env.IS_WEBPACK = 'true'
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		const nextToLastCallIndex = mockApp.use.mock.calls.length - 2
		const shouldBe404Handler = mockApp.use.mock.calls[nextToLastCallIndex][0]
		const mockNext = jest.fn()
		// a request that isnt for a static file
		mockReq.path.startsWith.mockReturnValueOnce(true)

		shouldBe404Handler(mockReq, mockRes, mockNext)

		expect(mockRes.missing).not.toHaveBeenCalled()
		expect(mockNext).toHaveBeenCalled()
	})

	test('when NOT using webpack, the 404 handler calls missing for non-static files', () => {
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		const nextToLastCallIndex = mockApp.use.mock.calls.length - 2
		const shouldBe404Handler = mockApp.use.mock.calls[nextToLastCallIndex][0]
		const mockNext = jest.fn()
		// a request that isnt for a static file
		mockReq.path.startsWith.mockReturnValueOnce(false)

		shouldBe404Handler(mockReq, mockRes, mockNext)

		expect(mockRes.missing).toHaveBeenCalled()
		expect(mockNext).not.toHaveBeenCalled()
	})

	test('when NOT using webpack, the 404 handler calls missing for static files', () => {
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		const nextToLastCallIndex = mockApp.use.mock.calls.length - 2
		const shouldBe404Handler = mockApp.use.mock.calls[nextToLastCallIndex][0]
		const mockNext = jest.fn()
		// a request that isnt for a static file
		mockReq.path.startsWith.mockReturnValueOnce(true)

		shouldBe404Handler(mockReq, mockRes, mockNext)

		expect(mockRes.missing).toHaveBeenCalled()
		expect(mockNext).not.toHaveBeenCalled()
	})

	test('an error handler is registered last', () => {
		const middleware = require('../server/middleware.default')
		middleware(mockApp)
		// Express's last handler will be the uncaught error handler
		const lastCallIndex = mockApp.use.mock.calls.length - 1

		// grab a reference to the function
		const expressUncaughtErrorHandler = mockApp.use.mock.calls[lastCallIndex][0]

		// test that it is a function?
		expect(expressUncaughtErrorHandler).toBeInstanceOf(Function)

		// test that it has the require 4 args
		expect(expressUncaughtErrorHandler.length).toBe(4)
	})

	test('an error handler is registered last', () => {
		const logger = require('../server/logger')
		const middleware = require('../server/middleware.default')
		const mockNext = jest.fn()
		middleware(mockApp)
		const lastCallIndex = mockApp.use.mock.calls.length - 1
		const expressUncaughtErrorHandler = mockApp.use.mock.calls[lastCallIndex][0]

		// execute handler
		expressUncaughtErrorHandler('mock-error', mockReq, mockRes, mockNext)

		expect(mockRes.unexpected).toHaveBeenCalled()
		expect(logger.error).toHaveBeenCalled()
	})

	test('an error handler falls back when res.unexpected is undefined', () => {
		mockStaticDate()
		const logger = require('../server/logger')
		const middleware = require('../server/middleware.default')
		const mockNext = jest.fn()
		middleware(mockApp)
		const lastCallIndex = mockApp.use.mock.calls.length - 1
		const expressUncaughtErrorHandler = mockApp.use.mock.calls[lastCallIndex][0]

		// simulate unexpected not being defined
		mockRes.unexpected = null
		// execute handler
		expressUncaughtErrorHandler('mock-error', mockReq, mockRes, mockNext)

		// make sure 500 set
		expect(mockRes.status).toHaveBeenLastCalledWith(500)
		// make sure the user is shown an error message
		expect(mockRes.send).toHaveBeenLastCalledWith('500 - Internal Server Error: 1474563434500')
		// make sure the matching error code is logged
		expect(logger.error).toHaveBeenLastCalledWith(
			'Uncaught error (timecode shown on user error page: 1474563434500)',
			'mock-error'
		)
	})
})
