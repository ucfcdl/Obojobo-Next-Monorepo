// Global for loading specialized Obojobo stuff
// use oboRequire('models/draft') to load draft models from any context
global.oboRequire = name => {
	return require(`obojobo-express/${name}`)
}

jest.setMock('obojobo-express/logger', require('obojobo-express/__mocks__/logger'))
jest.setMock('obojobo-express/db', require('obojobo-express/__mocks__/db'))
jest.setMock('obojobo-express/insert_event', require('obojobo-express/__mocks__/insert_event'))
jest.mock('obojobo-express/logger')
jest.mock('obojobo-express/db')
jest.mock('obojobo-express/obo_events')
jest.mock('obojobo-express/lti')
jest.mock('./util')
jest.mock('./attempt-start', () => ({ startAttempt: jest.fn() }))
jest.mock('./attempt-end', () => ({
	endAttempt: jest.fn()
}))
jest.mock('./assessment', () => ({
	getAttempt: jest.fn(),
	getAttempts: jest.fn()
}))

jest.mock(
	'obojobo-express/models/visit',
	() => ({
		fetchById: jest
			.fn()
			.mockReturnValue({ is_preview: false, resource_link_id: 'mockResourceLinkId' })
	}),
	{ virtual: true }
)
require('obojobo-express/__mocks__/__mock_express')

describe('server/express', () => {
	const db = require('obojobo-express/db')
	const mockUser = { id: 1 }
	const mockDocument = { draftId: 3, contentId: 12 }
	const mockVisit = { id: 'mockId', resource_link_id: 'mockResourceLinkId', is_preview: false }
	const Assessment = require('./assessment')
	const server = require('./express')
	const lti = require('obojobo-express/lti')
	const logger = require('obojobo-express/logger')
	const oboEvents = require('obojobo-express/obo_events')
	const startAttempt = require('./attempt-start').startAttempt
	const endAttempt = require('./attempt-end').endAttempt
	const Visit = require('obojobo-express/models/visit')
	const { logAndRespondToUnexpected } = require('./util')
	// build the req info
	let req
	let res
	let currentVisit
	let currentUser
	let currentDocument

	beforeAll(() => {})
	afterAll(() => {})
	beforeEach(() => {
		// @TODO
		// jest.resetAllMocks()
		req = {
			requireCurrentUser: jest.fn(() => {
				// handles both cases of resolved user being used
				// and req user being used
				// @TODO use req user everywhere
				req.currentUser = mockUser
				return Promise.resolve(mockUser)
			}),
			requireCurrentDocument: jest.fn(() => {
				// handles both cases of resolved document being used
				// and req document being used
				// @TODO use req document everywhere
				req.currentDocument = mockDocument
				return Promise.resolve(mockDocument)
			}),
			getCurrentVisitFromRequest: jest.fn().mockResolvedValue((currentVisit = mockVisit)),
			currentDocument,
			currentUser,
			currentVisit,
			params: {
				draftId: 3,
				attemptId: 5,
				assessmentId: 999
			},
			body: {
				draftId: 9,
				assessmentId: 777,
				visitId: 'mockVisitId'
			}
		}

		res = {
			success: jest.fn(),
			unexpected: jest.fn(),
			notAuthorized: jest.fn()
		}

		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockReset()
		lti.sendHighestAssessmentScore.mockReset()
		db.manyOrNone.mockReset()
		db.none.mockReset()
		Assessment.getAttempt.mockRestore()
		Assessment.getAttempts.mockRestore()
		logger.error.mockReset()
		logAndRespondToUnexpected.mockReset()
	})
	afterEach(() => {})

	test('registers the expected routes', () => {
		expect.assertions(10)

		expect(server.get).toHaveBeenCalledTimes(4)
		expect(server.post).toHaveBeenCalledTimes(4)
		expect(server.delete).toHaveBeenCalledTimes(0)
		expect(server.put).toHaveBeenCalledTimes(0)
		expect(server.post).toBeCalledWith('/api/lti/sendAssessmentScore', expect.anything())
		expect(server.post).toBeCalledWith('/api/assessments/attempt/start', expect.anything())
		expect(server.post).toBeCalledWith('/api/assessments/attempt/:attemptId/end', expect.anything())
		expect(server.post).toBeCalledWith('/api/assessments/clear-preview-scores', expect.anything())
		expect(server.get).toBeCalledWith('/api/lti/state/draft/:draftId', expect.anything())
		expect(oboEvents.on).toBeCalledWith('client:question:setResponse', expect.anything())
	})

	test('/api/lti/state/draft/:draftId calls getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId', () => {
		expect.assertions(5)
		// grab a ref to expected route & verify it's the route we want
		const draftStateRoute = server.get.mock.calls[0]
		expect(draftStateRoute[0]).toBe('/api/lti/state/draft/:draftId')

		// mock result
		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockReturnValueOnce('testresult')

		// execute
		return draftStateRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			// make sure the lti method is called
			expect(lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId).toHaveBeenCalledWith(
				1,
				3,
				'mockResourceLinkId'
			)
			// make sure the results are passed to res.success
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith('testresult')
		})
	})

	test('/api/lti/sendAssessmentScore sends the highest assessment score and responds as expected', () => {
		expect.assertions(6)

		// grab a ref to expected route & verify it's the route we want
		const sendAssessmentScoreRoute = server.post.mock.calls[0]
		expect(sendAssessmentScoreRoute[0]).toBe('/api/lti/sendAssessmentScore')

		// mock result
		lti.sendHighestAssessmentScore.mockReturnValueOnce({
			scoreSent: 1,
			status: 2,
			statusDetails: 3,
			dbStatus: 4,
			gradebookStatus: 5
		})

		// execute
		return sendAssessmentScoreRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			// make sure the lti method is called
			expect(lti.sendHighestAssessmentScore).toHaveBeenCalledWith(
				1,
				mockDocument,
				777,
				false,
				'mockResourceLinkId'
			)
			// make sure the results are passed to res.success
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith({
				score: 1,
				status: 2,
				statusDetails: 3,
				dbStatus: 4,
				gradebookStatus: 5
			})
			// make sure it logs info
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('sendAssessmentScore'))
		})
	})

	test('/api/lti/sendAssessmentScore calls logAndRespondToUnexpected when error occurs', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const sendAssessmentScoreRoute = server.post.mock.calls[0]
		expect(sendAssessmentScoreRoute[0]).toBe('/api/lti/sendAssessmentScore')

		// mock result
		lti.sendHighestAssessmentScore.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return sendAssessmentScoreRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected error starting a new attempt',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	test('/api/assessments/attempt/start calls startAttempt', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const startAttemptRoute = server.post.mock.calls[1]
		expect(startAttemptRoute[0]).toBe('/api/assessments/attempt/start')

		// execute
		startAttemptRoute[1](req, res, {})
		expect(startAttempt).toHaveBeenCalledWith(req, res)
	})

	test('/api/assessments/attempt/:attemptId/end calls endAttempt', () => {
		expect.assertions(5)

		// grab a ref to expected route & verify it's the route we want
		const endAttemptRoute = server.post.mock.calls[2]
		expect(endAttemptRoute[0]).toBe('/api/assessments/attempt/:attemptId/end')

		endAttempt.mockResolvedValue('endAttemptResult')

		// execute
		return endAttemptRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(endAttempt).toHaveBeenCalledWith(req, res)
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith('endAttemptResult')
		})
	})

	test('/api/assessments/attempt/:attemptId/end calls logAndRespondToUnexpected when error occurs', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const endAttemptRoute = server.post.mock.calls[2]
		expect(endAttemptRoute[0]).toBe('/api/assessments/attempt/:attemptId/end')

		endAttempt.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return endAttemptRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected error completing your attempt',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	test('/api/assessments/clear-preview-scores runs queries to empty preview score data', () => {
		expect.assertions(12)

		// visit is preview visit
		req.body.visitId = 'mockPreviewVisitId'

		Visit.fetchById.mockReturnValueOnce({
			is_preview: true,
			resource_link_id: 'mock_rlid'
		})

		// grab a ref to expected route & verify it's the route we want
		const clearPreviewScoresRoute = server.post.mock.calls[3]
		expect(clearPreviewScoresRoute[0]).toBe('/api/assessments/clear-preview-scores')

		db.manyOrNone
			.mockResolvedValueOnce([{ id: 13 }, { id: 99 }]) // assessmentScoreIdsResult
			.mockResolvedValueOnce([{ id: 14 }, { id: 77 }]) // attemptIdsResult

		// execute
		return clearPreviewScoresRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith()

			expect(db.manyOrNone).toHaveBeenCalledTimes(2)
			expect(db.manyOrNone).toHaveBeenCalledWith(
				expect.stringContaining('FROM assessment_scores'),
				{
					userId: 1,
					draftId: 3,
					resourceLinkId: 'mock_rlid'
				}
			)
			expect(db.manyOrNone).toHaveBeenCalledWith(expect.stringContaining('FROM attempts'), {
				userId: 1,
				draftId: 3,
				resourceLinkId: 'mock_rlid'
			})

			expect(db.none).toHaveBeenCalledTimes(4)
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM attempts_question_responses'),
				expect.anything()
			)
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM lti_assessment_scores'),
				{ ids: [13, 99] }
			)
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM assessment_scores'),
				{ ids: [13, 99] }
			)
			expect(db.none).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM attempts'), {
				ids: [14, 77]
			})
		})
	})

	test('/api/assessments/clear-preview-scores runs nothing with no data', () => {
		expect.assertions(8)
		Visit.fetchById.mockReturnValueOnce({ is_preview: true })

		// grab a ref to expected route & verify it's the route we want
		const clearPreviewScoresRoute = server.post.mock.calls[3]
		expect(clearPreviewScoresRoute[0]).toBe('/api/assessments/clear-preview-scores')

		db.manyOrNone
			.mockResolvedValueOnce([]) // assessmentScoreIdsResult
			.mockResolvedValueOnce([]) // attemptIdsResult

		// execute
		return clearPreviewScoresRoute[1](req, res, {}).then(() => {
			expect(res.success).toHaveBeenCalledTimes(1)

			expect(db.manyOrNone).toHaveBeenCalledTimes(2)
			expect(db.none).toHaveBeenCalledTimes(2)
			expect(db.none).not.toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM attempts_question_responses'),
				expect.anything()
			)
			expect(db.none).not.toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM lti_assessment_scores'),
				expect.anything()
			)
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM assessment_scores'),
				expect.anything()
			)
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM attempts'),
				expect.anything()
			)
		})
	})

	test('/api/assessments/clear-preview-scores tests previewing state', () => {
		expect.assertions(8)

		// grab a ref to expected route & verify it's the route we want
		const clearPreviewScoresRoute = server.post.mock.calls[3]
		expect(clearPreviewScoresRoute[0]).toBe('/api/assessments/clear-preview-scores')

		// user that can't preview
		req.requireCurrentUser.mockResolvedValueOnce({ id: 1 })

		// execute
		return clearPreviewScoresRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(res.success).toHaveBeenCalledTimes(0)
			expect(res.unexpected).toHaveBeenCalledTimes(0)
			expect(db.manyOrNone).toHaveBeenCalledTimes(0)
			expect(db.none).toHaveBeenCalledTimes(0)
			expect(res.notAuthorized).toHaveBeenCalledTimes(1)
			expect(res.notAuthorized).toHaveBeenCalledWith('Not in preview mode')
		})
	})

	test('/api/assessments/clear-preview-scores calls logAndRespondToUnexpected when error occurs', () => {
		expect.assertions(2)
		Visit.fetchById.mockReturnValueOnce({ is_preview: true })

		// grab a ref to expected route & verify it's the route we want
		const clearPreviewScoresRoute = server.post.mock.calls[3]
		expect(clearPreviewScoresRoute[0]).toBe('/api/assessments/clear-preview-scores')

		db.manyOrNone.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return clearPreviewScoresRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected error clearing preview scores',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	// end of useless

	test('/api/assessments/:draftId/:assessmentId/attempt/:attemptId calls getAttempt', () => {
		expect.assertions(5)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptRoute = server.get.mock.calls[1]
		expect(getAttemptRoute[0]).toBe('/api/assessments/:draftId/:assessmentId/attempt/:attemptId')

		Assessment.getAttempt.mockResolvedValueOnce('attempt')

		// execute
		return getAttemptRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith('attempt')
			expect(Assessment.getAttempt).toHaveBeenCalledWith(1, 3, 999, 5)
		})
	})

	test('/api/assessments/:draftId/:assessmentId/attempt/:attemptId calls logAndRespondToUnexpected when error occurs', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptRoute = server.get.mock.calls[1]
		expect(getAttemptRoute[0]).toBe('/api/assessments/:draftId/:assessmentId/attempt/:attemptId')

		Assessment.getAttempt.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return getAttemptRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected Error Loading attempt "${:attemptId}"',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	test('/api/assessments/:draftId/attempts alls getAttempts', () => {
		expect.assertions(5)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[2]
		expect(getAttemptsRoute[0]).toBe('/api/assessments/:draftId/attempts')

		Assessment.getAttempts.mockResolvedValueOnce('attempts')

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith('attempts')
			expect(Assessment.getAttempts).toHaveBeenCalledWith(1, 3, false, 'mockResourceLinkId')
		})
	})

	test('/api/assessments/:draftId/attempts calls res.notAuthorized if not logged in', () => {
		expect.assertions(3)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[2]
		expect(getAttemptsRoute[0]).toBe('/api/assessments/:draftId/attempts')

		// No user found
		req.requireCurrentUser.mockRejectedValueOnce(new Error('Login Required'))

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(res.notAuthorized).toHaveBeenCalledTimes(1)
			expect(res.notAuthorized).toHaveBeenCalledWith('Login Required')
		})
	})

	test('/api/assessments/:draftId/attempts calls logAndRespondToUnexpected when an error occurs', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[2]
		expect(getAttemptsRoute[0]).toBe('/api/assessments/:draftId/attempts')

		Assessment.getAttempts.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected error loading attempts',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	test('/api/assessment/:draftId/:assessmentId/attempts for a given assessment returns attempts for that assessment', () => {
		expect.assertions(5)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[3]
		expect(getAttemptsRoute[0]).toBe('/api/assessment/:draftId/:assessmentId/attempts')

		Assessment.getAttempts.mockResolvedValueOnce('attempts')

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(req.requireCurrentUser).toHaveBeenCalled()
			expect(res.success).toHaveBeenCalledTimes(1)
			expect(res.success).toHaveBeenCalledWith('attempts')
			expect(Assessment.getAttempts).toHaveBeenCalledWith(1, 3, false, 'mockResourceLinkId', 999)
		})
	})

	test('/api/assessment/:draftId/:assessmentId/attempts calls res.notAuthorized if user not logged in', () => {
		expect.assertions(3)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[3]
		expect(getAttemptsRoute[0]).toBe('/api/assessment/:draftId/:assessmentId/attempts')

		// No user found
		req.requireCurrentUser.mockRejectedValueOnce(new Error('Login Required'))

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(res.notAuthorized).toHaveBeenCalledTimes(1)
			expect(res.notAuthorized).toHaveBeenCalledWith('Login Required')
		})
	})

	test('/api/assessment/:draftId/:assessmentId/attempts calls logAndRespondToUnexpected when an error occurs', () => {
		expect.assertions(2)

		// grab a ref to expected route & verify it's the route we want
		const getAttemptsRoute = server.get.mock.calls[3]
		expect(getAttemptsRoute[0]).toBe('/api/assessment/:draftId/:assessmentId/attempts')

		Assessment.getAttempts.mockImplementationOnce(() => {
			throw new Error('mockUnexpectedError')
		})

		// execute
		return getAttemptsRoute[1](req, res, {}).then(() => {
			expect(logAndRespondToUnexpected).toHaveBeenCalledWith(
				'Unexpected error loading attempts',
				res,
				req,
				expect.any(Error)
			)
		})
	})

	test('client:question:setResponse halts execution if no attemptId', () => {
		expect.assertions(3)

		const setResponseCallBack = oboEvents.on.mock.calls[0]
		expect(setResponseCallBack[0]).toBe('client:question:setResponse')
		const event = {
			payload: {
				questionId: 3,
				response: 'what'
			}
		}

		return setResponseCallBack[1](event, req).then(() => {
			expect(db.none).not.toHaveBeenCalled()
			expect(logger.error).not.toHaveBeenCalled()
		})
	})

	test('client:question:setResponse expects questionId', () => {
		expect.assertions(3)

		const setResponseCallBack = oboEvents.on.mock.calls[0]
		expect(setResponseCallBack[0]).toBe('client:question:setResponse')
		const event = {
			payload: {
				attemptId: 4,
				response: 'what'
			}
		}

		return setResponseCallBack[1](event, req).then(() => {
			expect(db.none).not.toHaveBeenCalled()
			expect(logger.error.mock.calls[0][4]).toBe('Missing Question ID')
		})
	})

	test('client:question:setResponse expects response', () => {
		expect.assertions(3)

		const setResponseCallBack = oboEvents.on.mock.calls[0]
		expect(setResponseCallBack[0]).toBe('client:question:setResponse')
		const event = {
			payload: {
				attemptId: 4,
				questionId: 3
			}
		}

		return setResponseCallBack[1](event, req).then(() => {
			expect(db.none).not.toHaveBeenCalled()
			expect(logger.error.mock.calls[0][4]).toBe('Missing Response')
		})
	})

	test('client:question:setResponse inserts into attempts_question_responses', () => {
		expect.assertions(2)

		const setResponseCallBack = oboEvents.on.mock.calls[0]
		expect(setResponseCallBack[0]).toBe('client:question:setResponse')
		const event = {
			payload: {
				attemptId: 4,
				questionId: 3,
				response: 'what'
			}
		}

		return setResponseCallBack[1](event, req).then(() => {
			expect(db.none).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO attempts_question_responses'),
				expect.anything()
			)
		})
	})
})
