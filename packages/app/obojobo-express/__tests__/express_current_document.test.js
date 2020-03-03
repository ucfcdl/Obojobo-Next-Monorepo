let mockArgs // array of mocked express middleware request arguments
const documentFunctions = ['setCurrentDocument', 'requireCurrentDocument', 'resetCurrentDocument']

jest.mock('test_node')
jest.mock('../server/models/draft')

const DraftDocument = oboRequire('server/models/draft')

describe('current document middleware', () => {
	beforeAll(() => {})
	afterAll(() => {})
	beforeEach(() => {
		mockArgs = (() => {
			const res = {}
			const req = { session: {} }
			const mockJson = jest.fn().mockImplementation(() => {
				return true
			})
			const mockStatus = jest.fn().mockImplementation(() => {
				return { json: mockJson }
			})
			const mockNext = jest.fn()
			res.status = mockStatus

			const currentDocumentMiddleware = oboRequire('server/express_current_document')
			currentDocumentMiddleware(req, res, mockNext)
			return { res, req, mockJson, mockStatus, mockNext }
		})()
	})
	afterEach(() => {
		const { mockJson, mockStatus, mockNext } = mockArgs
		mockNext.mockClear()
		mockStatus.mockClear()
		mockJson.mockClear()
	})

	test('calls next', () => {
		const { mockNext } = mockArgs
		expect(mockNext).toBeCalledWith()
	})

	test('sets the expected properties on req', () => {
		expect.assertions(documentFunctions.length * 2)

		const { req } = mockArgs

		documentFunctions.forEach(func => {
			expect(req).toHaveProperty(func)
			expect(req[func]).toBeInstanceOf(Function)
		})
	})

	test('sets the current draft document on req.currentDocument', () => {
		expect.assertions(1)

		const { req } = mockArgs
		const mockDocument = new DraftDocument({
			draftId: 999,
			contentId: 12
		})

		req.setCurrentDocument(mockDocument)
		expect(req.currentDocument).toBeInstanceOf(DraftDocument)
	})

	test('unsets the current draft document', () => {
		expect.assertions(2)

		const { req } = mockArgs
		const mockDocument = new DraftDocument({
			draftId: 999,
			contentId: 12
		})

		req.setCurrentDocument(mockDocument)
		expect(req.currentDocument).toBeInstanceOf(DraftDocument)
		req.resetCurrentDocument()
		expect(req.currentDocument).toBe(null)
	})

	test('setCurrentDocument throws when not using a DraftDocument', () => {
		expect.assertions(1)

		const { req } = mockArgs
		const mockDocument = {}
		expect(() => {
			req.setCurrentDocument(mockDocument)
		}).toThrow('Invalid DraftDocument for Current draftDocument')
	})

	test('requireCurrentDocument gets the current draft document', done => {
		expect.assertions(2)

		const { req } = mockArgs
		const mockDocument = new DraftDocument({
			draftId: 999,
			contentId: 12
		})
		req.setCurrentDocument(mockDocument)

		return req.requireCurrentDocument().then(draftDocument => {
			expect(draftDocument.draftId).toBe(999)
			expect(draftDocument).toBeInstanceOf(DraftDocument)
			done()
		})
	})

	test('requireCurrentDocument loads the draft document from params when one is avalible', done => {
		expect.assertions(2)

		const { req } = mockArgs
		req.params = {
			draftId: 1
		}

		return req.requireCurrentDocument().then(draftDocument => {
			expect(draftDocument.draftId).toBe(1)
			expect(draftDocument).toBeInstanceOf(DraftDocument)
			done()
		})
	})

	test('requireCurrentDocument loads the draft document from body when one is avalible', done => {
		expect.assertions(2)

		const { req } = mockArgs
		req.body = {
			draftId: 1
		}

		return req.requireCurrentDocument().then(draftDocument => {
			expect(draftDocument.draftId).toBe(1)
			expect(draftDocument).toBeInstanceOf(DraftDocument)
			done()
		})
	})

	test('requireCurrentDocument loads the draft document from body.event when one is avalible', done => {
		expect.assertions(2)

		const { req } = mockArgs
		req.body = {
			event: {
				draft_id: 1
			}
		}

		return req.requireCurrentDocument().then(draftDocument => {
			expect(draftDocument.draftId).toBe(1)
			expect(draftDocument).toBeInstanceOf(DraftDocument)
			done()
		})
	})

	test('requireCurrentDocument rejects when no DraftDocument is set', done => {
		expect.assertions(1)

		const { req } = mockArgs

		return req
			.requireCurrentDocument()
			.then(() => {
				expect(false).toBe('never_called')
				done()
			})
			.catch(err => {
				expect(err.message).toBe('DraftDocument Required')
				done()
			})
	})
})
