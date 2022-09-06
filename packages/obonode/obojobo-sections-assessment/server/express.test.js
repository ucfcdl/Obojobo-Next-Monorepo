jest.mock('./models/assessment')
jest.mock('obojobo-express/server/lti')
jest.mock('./attempt-start')
jest.mock('./attempt-resume')
jest.mock('./attempt-end/attempt-end')
jest.mock('./attempt-review')
jest.mock('obojobo-express/server/express_validators')
jest.mock('./events')
jest.mock('obojobo-express/server/config')
jest.mock('./attempt-end/attempt-import')
jest.mock('obojobo-repository/server/models/draft_permissions')
jest.mock('uuid', () => ({
	v4: () => 'mock-uuid'
}))

const mockCurrentUser = { id: 'mockCurrentUserId' }
const mockCurrentDocument = { draftId: 'mockDraftId' }
const mockCurrentVisit = {
	id: 'mockCurrentVisitId',
	resource_link_id: 'mockResourceLinkId',
	is_preview: 'mockIsPreview'
}
const bodyParser = require('body-parser')
const request = require('supertest')
const { attemptReview } = require('./attempt-review')
const AssessmentModel = require('./models/assessment')
const { startAttempt } = require('./attempt-start')
const resumeAttempt = require('./attempt-resume')
const endAttempt = require('./attempt-end/attempt-end')
const lti = require('obojobo-express/server/lti')
const attemptImport = require('./attempt-end/attempt-import')
const {
	requireCurrentDocument,
	requireCurrentVisit,
	requireAttemptId,
	requireCurrentUser,
	requireAssessmentId,
	checkValidationRules,
	validImportedAssessmentScoreId
} = require('obojobo-express/server/express_validators')
const assessmentExpress = require('./express')
const express_response_decorator = require('obojobo-express/server/express_response_decorator')
const express = require('express')
const { ERROR_INVALID_ATTEMPT_END, ERROR_INVALID_ATTEMPT_RESUME } = require('./error-constants')
const DraftPermissions = require('../../../app/obojobo-repository/server/models/draft_permissions')
let app

describe('server/express', () => {
	beforeEach(() => {
		jest.resetAllMocks()

		// mock all the validators
		const commonValidationMock = (req, res, next) => {
			next()
		}
		requireCurrentDocument.mockImplementation((req, res, next) => {
			req.currentDocument = mockCurrentDocument
			next()
		})

		requireCurrentVisit.mockImplementation((req, res, next) => {
			req.currentVisit = mockCurrentVisit
			next()
		})

		requireCurrentUser.mockImplementation((req, res, next) => {
			req.currentUser = mockCurrentUser
			next()
		})
		checkValidationRules.mockImplementation(commonValidationMock)
		requireAssessmentId.mockImplementation(commonValidationMock)
		requireAttemptId.mockImplementation(commonValidationMock)
		validImportedAssessmentScoreId.mockImplementation(commonValidationMock)

		// init the server
		app = express()
		app.use(bodyParser.json())
		app.use(express_response_decorator)
		app.use(assessmentExpress)
	})

	test('POST /api/lti/send-assessment-score', async () => {
		expect.hasAssertions()
		const mockReturnValue = {
			scoreSent: 'mockReturn',
			status: 'mockStatus',
			statusDetails: 'mockStatusDetails',
			dbStatus: 'mockDbStatus',
			gradebookStatus: 'mockGradeBookStatus'
		}
		lti.sendHighestAssessmentScore.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.post('/api/lti/send-assessment-score')
			.type('application/json')
			.send('{"assessmentId":"mockAssessmentId"}')

		expect(response.statusCode).toBe(200)
		// verify validations ran
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireAssessmentId).toHaveBeenCalledTimes(1)
		// verify external libs were called with correct args
		expect(lti.sendHighestAssessmentScore).toHaveBeenCalledWith(
			mockCurrentUser.id,
			mockCurrentDocument,
			'mockAssessmentId',
			mockCurrentVisit.is_preview,
			mockCurrentVisit.resource_link_id,
			mockCurrentVisit.id
		)
		// verify the response body
		expect(response.body).toEqual({
			status: 'ok',
			value: {
				score: mockReturnValue.scoreSent,
				status: mockReturnValue.status,
				statusDetails: mockReturnValue.statusDetails,
				dbStatus: mockReturnValue.dbStatus,
				gradebookStatus: mockReturnValue.gradebookStatus
			}
		})
	})

	test('POST /api/lti/send-assessment-score logs errors', async () => {
		expect.hasAssertions()
		lti.sendHighestAssessmentScore.mockRejectedValueOnce('mock-error')

		const response = await request(app)
			.post('/api/lti/send-assessment-score')
			.type('application/json')
			.send('{"assessmentId":"mockAssessmentId"}')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})
	})

	test('POST /api/assessments/attempt/start', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		startAttempt.mockImplementationOnce((req, res, next) => {
			res.success(mockReturnValue)
		})

		const response = await request(app)
			.post('/api/assessments/attempt/start')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		// verify validations ran
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireAssessmentId).toHaveBeenCalledTimes(1)

		expect(startAttempt).toHaveBeenCalledTimes(1)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/resume', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		resumeAttempt.mockReturnValueOnce(mockReturnValue)

		const response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/resume')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		// verify validations ran
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireAttemptId).toHaveBeenCalledTimes(1)
		expect(resumeAttempt).toHaveBeenCalledWith(
			mockCurrentUser,
			mockCurrentVisit,
			mockCurrentDocument,
			'mock-attempt-id',
			expect.any(String),
			expect.any(String)
		)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/resume errors', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}

		resumeAttempt.mockRejectedValueOnce(mockReturnValue)
		resumeAttempt.mockRejectedValueOnce(new Error(ERROR_INVALID_ATTEMPT_RESUME))

		let response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/resume')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})

		// Call the route again to make sure a custom error message gets returned
		response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/resume')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: ERROR_INVALID_ATTEMPT_RESUME,
				type: 'unexpected'
			}
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/resume', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		requireAttemptId.mockImplementationOnce((req, res, next) => {
			return Promise.resolve().then(() => {
				res.success(mockReturnValue)
			})
		})

		const response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/resume')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireAttemptId).toHaveBeenCalledTimes(1)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/end', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		endAttempt.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/end')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireAttemptId).toHaveBeenCalledTimes(1)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/end fails with default error', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}

		endAttempt.mockRejectedValueOnce(mockReturnValue)
		endAttempt.mockRejectedValueOnce(new Error(ERROR_INVALID_ATTEMPT_END))

		let response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/end')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})

		// Call the route again to make sure a custom error message gets returned
		response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/end')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: ERROR_INVALID_ATTEMPT_END,
				type: 'unexpected'
			}
		})
	})

	test('POST /api/assessments/attempt/mock-attempt-id/end', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		endAttempt.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.post('/api/assessments/attempt/mock-attempt-id/end')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireAttemptId).toHaveBeenCalledTimes(1)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('POST /api/assessments/attempt/review', async () => {
		expect.hasAssertions()
		// mock the id keyed objects returned by review attempt
		const returnValue = {
			'mock-attempt-id': { 'mock-question-id': { id: 'mock-question-id' } },
			'mock-attempt-id2': {
				'mock-question-id-2': { id: 'mock-question-id-2' },
				'mock-question-id-3': { id: 'mock-question-id-3' }
			}
		}

		attemptReview.mockResolvedValueOnce(returnValue)

		const response = await request(app)
			.post('/api/assessments/attempt/review')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(checkValidationRules).toHaveBeenCalledTimes(1)
		// expect the result to be ARRAYS not id keyed objects
		expect(response.body).toEqual([
			{
				attemptId: 'mock-attempt-id',
				questions: [
					{
						id: 'mock-question-id'
					}
				]
			},
			{
				attemptId: 'mock-attempt-id2',
				questions: [{ id: 'mock-question-id-2' }, { id: 'mock-question-id-3' }]
			}
		])
	})

	test('POST /api/assessments/clear-preview-scores', async () => {
		expect.hasAssertions()
		AssessmentModel.deletePreviewAttemptsAndScores.mockResolvedValueOnce()

		const response = await request(app)
			.post('/api/assessments/clear-preview-scores')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.deletePreviewAttemptsAndScores).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.deletePreviewAttemptsAndScores).toHaveBeenCalledWith(
			'mockCurrentUserId',
			'mockDraftId',
			'mockResourceLinkId'
		)
		expect(response.body).toEqual({
			status: 'ok'
		})
	})

	test('POST /api/assessments/clear-preview-scores fails when not preview', async () => {
		expect.hasAssertions()
		requireCurrentVisit.mockImplementationOnce((req, res, next) => {
			req.currentVisit = { is_preview: false }
			next()
		})

		const response = await request(app)
			.post('/api/assessments/clear-preview-scores')
			.type('application/json')

		expect(response.statusCode).toBe(401)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: 'Not in preview mode',
				type: 'notAuthorized'
			}
		})
	})

	test('POST /api/assessments/clear-preview-scores fails on errors', async () => {
		expect.hasAssertions()
		AssessmentModel.deletePreviewAttemptsAndScores.mockRejectedValueOnce('mock-error')

		const response = await request(app)
			.post('/api/assessments/clear-preview-scores')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})
	})

	test('GET /api/assessments/:draftId/attempts', async () => {
		expect.hasAssertions()
		const mockReturnValue = {}
		AssessmentModel.fetchAttemptHistory.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.get('/api/assessments/:draftId/attempts')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.fetchAttemptHistory).toHaveBeenCalledWith(
			mockCurrentUser.id,
			mockCurrentDocument.draftId,
			mockCurrentVisit.is_preview,
			mockCurrentVisit.resource_link_id
		)
		expect(response.body).toEqual({
			status: 'ok',
			value: mockReturnValue
		})
	})

	test('GET /api/assessments/:draftId/attempts fails', async () => {
		expect.hasAssertions()
		AssessmentModel.fetchAttemptHistory.mockRejectedValueOnce()

		const response = await request(app)
			.get('/api/assessments/:draftId/attempts')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})
	})

	test('GET /api/assessments/:draftId/details returns non-anonymized data if the current user owns the draft', async () => {
		expect.hasAssertions()
		const mockReturnValue = [
			{
				user_username: 'Test',
				user_first_name: 'First',
				user_last_name: 'Last',
				user_id: 'user-id'
			}
		]
		requireCurrentUser.mockImplementationOnce((req, res, next) => {
			req.currentUser = {
				id: 'mockCurrentUserId',
				hasPermission: () => {
					return false
				}
			}
			next()
		})
		DraftPermissions.userHasPermissionToDraft.mockResolvedValueOnce(true)
		AssessmentModel.fetchAttemptHistoryDetails.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.get('/api/assessments/mock-draft-id/details')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.fetchAttemptHistoryDetails).toHaveBeenCalledWith('mock-draft-id')
		expect(response.body).toEqual({
			status: 'ok',
			value: [
				{
					userUsername: 'Test',
					userFirstName: 'First',
					userLastName: 'Last',
					userId: 'user-id'
				}
			]
		})
	})

	test('GET /api/assessments/:draftId/details returns non-anonymized data if the current user owns the draft, with canViewSystemStats', async () => {
		expect.hasAssertions()
		const mockReturnValue = [
			{
				user_username: 'Test',
				user_first_name: 'First',
				user_last_name: 'Last',
				user_id: 'user-id'
			}
		]
		requireCurrentUser.mockImplementationOnce((req, res, next) => {
			req.currentUser = {
				id: 'mockCurrentUserId',
				hasPermission: perm => {
					return Boolean(perm === 'canViewSystemStats')
				}
			}
			next()
		})
		DraftPermissions.userHasPermissionToDraft.mockResolvedValueOnce(true)
		AssessmentModel.fetchAttemptHistoryDetails.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.get('/api/assessments/mock-draft-id/details')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.fetchAttemptHistoryDetails).toHaveBeenCalledWith('mock-draft-id')
		expect(response.body).toEqual({
			status: 'ok',
			value: [
				{
					userUsername: 'Test',
					userFirstName: 'First',
					userLastName: 'Last',
					userId: 'user-id'
				}
			]
		})
	})

	test('GET /api/assessments/:draftId/details returns anonymized data if the current user does not own the draft but has canViewSystemStats', async () => {
		expect.hasAssertions()
		const mockReturnValue = [
			{
				user_username: 'Test',
				user_first_name: 'First',
				user_last_name: 'Last',
				user_id: 'user-id',
				attemptId: 'attempt-1'
			},
			{
				user_username: 'Test2',
				user_first_name: 'First2',
				user_last_name: 'Last2',
				userId: 'user-id2',
				attemptId: 'attempt-2'
			},
			{
				user_username: 'Test',
				user_first_name: 'First',
				user_last_name: 'Last',
				user_id: 'user-id',
				attemptId: 'attempt-3'
			}
		]
		requireCurrentUser.mockImplementationOnce((req, res, next) => {
			req.currentUser = {
				id: 'mockCurrentUserId',
				hasPermission: perm => {
					return Boolean(perm === 'canViewSystemStats')
				}
			}
			next()
		})
		DraftPermissions.userHasPermissionToDraft.mockResolvedValueOnce(false)
		AssessmentModel.fetchAttemptHistoryDetails.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.get('/api/assessments/mock-draft-id/details')
			.type('application/json')

		expect(response.statusCode).toBe(200)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.fetchAttemptHistoryDetails).toHaveBeenCalledWith('mock-draft-id')
		expect(response.body).toEqual({
			status: 'ok',
			value: [
				{
					userUsername: '(anonymized-mock-uuid)',
					userFirstName: '(anonymized-mock-uuid)',
					userLastName: '(anonymized-mock-uuid)',
					userId: '(anonymized-mock-uuid)',
					attemptId: 'attempt-1'
				},
				{
					userUsername: '(anonymized-mock-uuid)',
					userFirstName: '(anonymized-mock-uuid)',
					userLastName: '(anonymized-mock-uuid)',
					userId: '(anonymized-mock-uuid)',
					attemptId: 'attempt-2'
				},
				{
					userUsername: '(anonymized-mock-uuid)',
					userFirstName: '(anonymized-mock-uuid)',
					userLastName: '(anonymized-mock-uuid)',
					userId: '(anonymized-mock-uuid)',
					attemptId: 'attempt-3'
				}
			]
		})
	})

	test('GET /api/assessments/:draftId/details returns a 401 if the current user does not own the draft and does not have canViewSystemStats', async () => {
		expect.hasAssertions()
		const mockReturnValue = [
			{
				user_username: 'Test',
				user_first_name: 'First',
				user_last_name: 'Last',
				user_id: 'user-id'
			}
		]
		requireCurrentUser.mockImplementationOnce((req, res, next) => {
			req.currentUser = {
				id: 'mockCurrentUserId',
				hasPermission: () => false
			}
			next()
		})
		DraftPermissions.userHasPermissionToDraft.mockResolvedValueOnce(false)
		AssessmentModel.fetchAttemptHistoryDetails.mockResolvedValueOnce(mockReturnValue)

		const response = await request(app)
			.get('/api/assessments/mock-draft-id/details')
			.type('application/json')

		expect(response.statusCode).toBe(401)
		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(AssessmentModel.fetchAttemptHistoryDetails).toHaveBeenCalledTimes(0)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				type: 'notAuthorized'
			}
		})
	})

	test('GET /api/assessments/:draftId/details fails', async () => {
		expect.hasAssertions()
		DraftPermissions.userHasPermissionToDraft.mockResolvedValueOnce(true)
		AssessmentModel.fetchAttemptHistoryDetails.mockRejectedValueOnce(Error('Oops!'))

		const response = await request(app)
			.get('/api/assessments/:draftId/details')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				message: expect.any(String),
				type: 'unexpected'
			}
		})
	})

	test('POST /api/assessments/:draftId/:assessmentId/import-score', async () => {
		expect.hasAssertions()
		requireCurrentVisit.mockImplementationOnce((req, res, next) => {
			req.currentVisit = { is_preview: false }
			next()
		})

		attemptImport.mockResolvedValueOnce('mock-import-result')

		const response = await request(app)
			.post('/api/assessments/:draftId/:assessmentId/import-score')
			.type('application/json')
			.send({ importedAssessmentScoreId: 10 })

		expect(response.statusCode).toBe(200)
		expect(response.body).toEqual({
			status: 'ok',
			value: 'mock-import-result'
		})

		expect(requireCurrentUser).toHaveBeenCalledTimes(1)
		expect(requireCurrentDocument).toHaveBeenCalledTimes(1)
		expect(requireCurrentVisit).toHaveBeenCalledTimes(1)
		expect(requireAssessmentId).toHaveBeenCalledTimes(1)
		expect(validImportedAssessmentScoreId).toHaveBeenCalledTimes(1)
	})

	test('POST /api/assessments/:draftId/:assessmentId/import-score errors', async () => {
		expect.hasAssertions()
		requireCurrentVisit.mockImplementationOnce((req, res, next) => {
			req.currentVisit = { is_preview: false }
			next()
		})

		attemptImport.mockRejectedValueOnce('mock-error')

		const response = await request(app)
			.post('/api/assessments/:draftId/55/import-score')
			.type('application/json')

		expect(response.statusCode).toBe(500)
		expect(response.body).toEqual({
			status: 'error',
			value: {
				type: 'unexpected',
				message: 'Error importing score'
			}
		})
	})
})
