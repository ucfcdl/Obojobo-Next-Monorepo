// Global for loading specialized Obojobo stuff
// use oboRequire('models/draft') to load draft models from any context
global.oboRequire = name => {
	return require(`obojobo-express/${name}`)
}

jest.setMock('obojobo-express/logger', require('obojobo-express/__mocks__/logger'))
jest.setMock('obojobo-express/db', require('obojobo-express/__mocks__/db'))
jest.setMock(
	'ims-lti/src/extensions/outcomes',
	require('obojobo-express/__mocks__/ims-lti/src/extensions/outcomes')
)
jest.mock('obojobo-express/logger')
jest.mock('obojobo-express/db')
jest.mock('ims-lti/src/extensions/outcomes')
jest.mock('obojobo-express/lti')
jest.mock(
	'../../__mocks__/models/visit',
	() => ({
		fetchById: jest.fn().mockReturnValue({ is_preview: false })
	}),
	{ virtual: true }
)

let db
let lti
let Assessment
let logger

describe('Assessment', () => {
	beforeEach(() => {
		jest.restoreAllMocks()
		db = require('obojobo-express/db')
		lti = require('obojobo-express/lti')
		Assessment = require('./assessment')
		logger = require('obojobo-express/logger')
		db.one.mockReset()
		db.manyOrNone.mockReset()
	})

	const makeMockAttempt = () => ({
		attempt_id: 'mockAttemptId',
		assessment_id: 'mockAssessmentId',
		draft_content_id: 'mockContentId',
		created_at: 'mockCreatedAt',
		completed_at: 'mockCompletedAt',
		state: 'mockState',
		result: {
			attemptScore: 'mockResult',
			questionScores: ['mockScore']
		},
		assessment_score: '15',
		score_details: 'mockScoreDetails',
		assessment_score_id: 'scoreId',
		attempt_number: '12'
	})

	test('nodeName is expected value', () => {
		expect(Assessment.nodeName).toBe('ObojoboDraft.Sections.Assessment')
	})

	test('getCompletedAssessmentAttemptHistory calls db', () => {
		Assessment.getCompletedAssessmentAttemptHistory(0, 1, 2)

		expect(db.manyOrNone).toHaveBeenCalled()
		expect(db.manyOrNone.mock.calls[0][1]).toEqual({
			userId: 0,
			draftId: 1,
			assessmentId: 2
		})
	})

	test('createUserAttempt returns attempt object', () => {
		const mockAttempt = makeMockAttempt()
		const res = Assessment.createUserAttempt('mockUserId', 'mockDraftId', mockAttempt)
		expect(res).toEqual({
			assessmentId: 'mockAssessmentId',
			assessmentScore: 15,
			assessmentScoreDetails: 'mockScoreDetails',
			assessmentScoreId: 'scoreId',
			attemptId: 'mockAttemptId',
			responses: {},
			attemptNumber: 12,
			attemptScore: 'mockResult',
			draftId: 'mockDraftId',
			finishTime: 'mockCompletedAt',
			isFinished: true,
			questionScores: ['mockScore'],
			startTime: 'mockCreatedAt',
			state: 'mockState',
			userId: 'mockUserId',
			contentId: 'mockContentId'
		})
	})

	test('createUserAttempt returns attempt object with default values', () => {
		const mockAttempt = makeMockAttempt()
		mockAttempt.result = null
		const res = Assessment.createUserAttempt('mockUserId', 'mockDraftId', mockAttempt)
		expect(res).toEqual({
			assessmentId: 'mockAssessmentId',
			assessmentScore: 15,
			assessmentScoreDetails: 'mockScoreDetails',
			assessmentScoreId: 'scoreId',
			attemptId: 'mockAttemptId',
			responses: {},
			attemptNumber: 12,
			attemptScore: null,
			draftId: 'mockDraftId',
			contentId: 'mockContentId',
			finishTime: 'mockCompletedAt',
			isFinished: true,
			questionScores: [],
			startTime: 'mockCreatedAt',
			state: 'mockState',
			userId: 'mockUserId'
		})
	})

	test('getAttempts returns attempts object without response history', () => {
		db.manyOrNone.mockResolvedValueOnce([makeMockAttempt()])

		// there's no response history
		jest.spyOn(Assessment, 'getResponseHistory').mockResolvedValue({})

		// there's no lti state
		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({})

		return Assessment.getAttempts('mockUserId', 'mockDraftId', null, null, 'mockAssessmentId').then(
			result => {
				expect(result).toMatchSnapshot()
			}
		)
	})

	test('getAttempts returns attempts object without assessmentId', () => {
		db.manyOrNone.mockResolvedValueOnce([makeMockAttempt()])

		// there's no response history
		jest.spyOn(Assessment, 'getResponseHistory')
		Assessment.getResponseHistory.mockResolvedValueOnce({})

		// there's no lti state
		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({})

		return Assessment.getAttempts('mockUserId', 'mockDraftId').then(result => {
			expect(result).toMatchSnapshot()
		})
	})

	test('getAttempts returns empty object if assessment isnt found', () => {
		db.manyOrNone.mockResolvedValueOnce([])

		// there's no response history
		jest.spyOn(Assessment, 'getResponseHistory').mockResolvedValueOnce({})

		// there's no lti state
		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({})

		return Assessment.getAttempts('mockUserId', 'mockDraftId', false, null, 'badAssessmentId').then(
			result => {
				expect(result).toMatchSnapshot()
			}
		)
	})

	test('getAttempts returns attempts object with response history', () => {
		// mock the results of the query to just return an object in an array
		db.manyOrNone.mockResolvedValueOnce([makeMockAttempt()])

		// create a mock history
		jest.spyOn(Assessment, 'getResponseHistory')
		const mockHistory = {
			mockAttemptId: [
				{
					id: 'mockResponseId',
					assessment_id: 'mockAssessmentId',
					attempt_id: 'mockAttemptId',
					question_id: 'mockQuestionId',
					response: 'mockResponse'
				}
			]
		}
		Assessment.getResponseHistory.mockResolvedValueOnce(mockHistory)

		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({
			mockAssessmentId: {
				scoreSent: 0,
				sentDate: 'mockSentDate',
				status: 'mockStatus',
				gradebookStatus: 'mockGradeBookStatus',
				statusDetails: 'mockStatusDetails'
			}
		})

		return Assessment.getAttempts(
			'mockUserId',
			'mockDraftId',
			false,
			null,
			'mockAssessmentId'
		).then(result => {
			expect(result).toMatchSnapshot()
		})
	})

	test('getAttempts returns multiple attempts with same assessment', () => {
		// mock the results of the query to just return an object in an array
		const first = makeMockAttempt()
		first.attempt_id = 'mockFirst'
		const second = makeMockAttempt()
		second.attempt_id = 'mockSecond'
		db.manyOrNone.mockResolvedValueOnce([first, second])

		// create a mock history
		jest.spyOn(Assessment, 'getResponseHistory')
		const mockHistory = {
			mockAttemptId: [
				{
					id: 'mockResponseId',
					assessment_id: 'mockAssessmentId',
					response: 'mockResponse',
					attempt_id: 'mockAttemptId',
					question_id: 'mockQuestionId'
				}
			]
		}
		Assessment.getResponseHistory.mockResolvedValueOnce(mockHistory)

		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({
			mockAssessmentId: {
				scoreSent: 0,
				sentDate: 'mockSentDate',
				status: 'mockStatus',
				gradebookStatus: 'mockGradeBookStatus',
				statusDetails: 'mockStatusDetails'
			}
		})

		return Assessment.getAttempts(
			'mockUserId',
			'mockDraftId',
			false,
			null,
			'mockAssessmentId'
		).then(result => {
			expect(result).toMatchSnapshot()
		})
	})

	test('getAttempts returns no history when assessmentIds for attempt and history dont match', () => {
		// mock the results of the query to just return an object in an array
		db.manyOrNone.mockResolvedValueOnce([makeMockAttempt()])

		// create a mock history
		jest.spyOn(Assessment, 'getResponseHistory')
		const mockHistory = {
			mockAttemptId: [
				{
					id: 'mockResponseId',
					assessment_id: 'mockOtherAssessmentId',
					repsonse: 'mockResponse',
					attempt_id: 'mockAttemptId',
					question_id: 'mockQuestionId',
					response: 'mockResponse'
				}
			]
		}
		Assessment.getResponseHistory.mockResolvedValueOnce(mockHistory)

		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({
			mockAssessmentId: {
				scoreSent: 0,
				sentDate: 'mockSentDate',
				status: 'mockStatus',
				gradebookStatus: 'mockGradeBookStatus',
				statusDetails: 'mockStatusDetails'
			}
		})

		return Assessment.getAttempts('mockUserId', 'mockDraftId').then(result => {
			expect(result).toMatchSnapshot()
		})
	})

	test('getAttempts throws error if attempt is not found', () => {
		// mock the results of the query to just return an object in an array
		db.manyOrNone.mockResolvedValueOnce([makeMockAttempt()])

		// create a mock history
		jest.spyOn(Assessment, 'getResponseHistory')
		const mockHistory = {
			mockAttemptId: [
				{
					id: 'mockResponseId',
					assessment_id: 'mockAssessmentId',
					repsonse: 'mockResponse',
					attempt_id: 'mockBadAttemptId',
					question_id: 'mockQuestionId',
					response: 'mockResponse'
				}
			]
		}
		Assessment.getResponseHistory.mockResolvedValueOnce(mockHistory)

		lti.getLTIStatesByAssessmentIdForUserAndDraftAndResourceLinkId.mockResolvedValueOnce({
			mockAssessmentId: {
				scoreSent: 0,
				sentDate: 'mockSentDate',
				status: 'mockStatus',
				gradebookStatus: 'mockGradeBookStatus',
				statusDetails: 'mockStatusDetails'
			}
		})

		return Assessment.getAttempts(
			'mockUserId',
			'mockDraftId',
			false,
			null,
			'mockAssessmentId'
		).then(result => {
			expect(result).toMatchSnapshot()
			expect(logger.warn).toHaveBeenCalledWith(
				"Couldn't find an attempt I was looking for ('mockUserId', 'mockDraftId', 'mockAttemptId', 'mockResponseId', 'mockAssessmentId') - Shouldn't get here!"
			)
		})
	})

	test('getAttemptIdsForUserForDraft calls db with expected fields', () => {
		Assessment.getAttemptIdsForUserForDraft('mockUserId', 'mockDraftId')

		expect(db.manyOrNone.mock.calls[0][1]).toEqual({
			userId: 'mockUserId',
			draftId: 'mockDraftId'
		})
	})

	test('filterIncompleteAttempts handles empty array', () => {
		const attempts = []
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(0)
	})

	test('filterIncompleteAttempts returns all completed attempts', () => {
		const attempts = [
			{
				isFinished: true,
				finishTime: new Date(),
				startTime: new Date()
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(1)
		expect(res).toEqual(attempts)
	})

	test('filterIncompleteAttempts sorts completed attempts', () => {
		const attempts = [
			{
				isFinished: true,
				finishTime: new Date(301),
				startTime: new Date(300)
			},
			{
				isFinished: true,
				finishTime: new Date(101),
				startTime: new Date(100)
			},
			{
				isFinished: true,
				finishTime: new Date(201),
				startTime: new Date(200)
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(3)
		expect(res[0]).toBe(attempts[1])
		expect(res[1]).toBe(attempts[2])
		expect(res[2]).toBe(attempts[0])
	})

	test('filterIncompleteAttempts handles 1 incomplete attempt', () => {
		const attempts = [
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(300)
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(1)
		expect(res).toEqual(attempts)
	})

	test('filterIncompleteAttempts only returns the newest incomplete attempt', () => {
		const attempts = [
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(300)
			},
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(600)
			},
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(200)
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(1)
		expect(res[0]).toBe(attempts[1])
	})

	test('filterIncompleteAttempts removes incomplete attempts before the last completed attempt', () => {
		const attempts = [
			{
				isFinished: true,
				finishTime: new Date(302),
				startTime: new Date(300)
			},
			{
				isFinished: true,
				finishTime: new Date(102),
				startTime: new Date(100)
			},
			{
				isFinished: true,
				finishTime: new Date(202),
				startTime: new Date(200)
			},
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(301) // this is just before the finishTime of the last attempt
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(3)
		expect(res[0]).toBe(attempts[1])
		expect(res[1]).toBe(attempts[2])
		expect(res[2]).toBe(attempts[0])
	})

	test('filterIncompleteAttempts removes incomplete attempts before the last completed attempt but retains the most recent incompleted attempt if it has been started after the last completed attempt', () => {
		const attempts = [
			{
				isFinished: true,
				finishTime: new Date(302),
				startTime: new Date(300)
			},
			{
				isFinished: true,
				finishTime: new Date(102),
				startTime: new Date(100)
			},
			{
				isFinished: true,
				finishTime: new Date(202),
				startTime: new Date(200)
			},
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(600)
			},
			{
				isFinished: false,
				finishTime: null,
				startTime: new Date(301) // this is just before the finishTime of the last attempt
			}
		]
		const res = Assessment.filterIncompleteAttempts(attempts)
		expect(res).not.toBe(attempts) // must be a new array
		expect(res).toHaveLength(4)
		expect(res[0]).toBe(attempts[1])
		expect(res[1]).toBe(attempts[2])
		expect(res[2]).toBe(attempts[0])
		expect(res[3]).toBe(attempts[3])
	})

	test('getAttemptNumber returns the attempt_number property', () => {
		jest.spyOn(Assessment, 'getAttemptIdsForUserForDraft')
		Assessment.getAttemptIdsForUserForDraft.mockResolvedValueOnce([
			{ id: 3, attempt_number: 999 },
			{ id: 'attemptId', attempt_number: 777 },
			{ id: 111, attempt_number: 227 }
		])

		return Assessment.getAttemptNumber('userId', 'draftId', 'attemptId').then(result => {
			expect(result).toEqual(777)
		})
	})

	test('getAttemptNumber returns null when theres no matching attemptId', () => {
		jest.spyOn(Assessment, 'getAttemptIdsForUserForDraft')
		Assessment.getAttemptIdsForUserForDraft.mockResolvedValueOnce([
			{ id: 3, attempt_number: 999 },
			{ id: 999, attempt_number: 777 },
			{ id: 111, attempt_number: 227 }
		])

		return Assessment.getAttemptNumber('userId', 'draftId', 'attemptId').then(result => {
			expect(result).toEqual(null)
		})
	})

	test('getAttempt retrieves the Attempt by its id', () => {
		Assessment.getAttempt('mockAttemptId')

		expect(db.oneOrNone.mock.calls[0][1]).toEqual({
			attemptId: 'mockAttemptId'
		})
	})

	test('getResponseHistory calls the database and loops through the result', done => {
		db.manyOrNone.mockResolvedValueOnce([
			{
				attempt_id: 'mockAttemptId'
			},
			{
				attempt_id: 'secondMockAttemptId'
			}
		])

		return Assessment.getResponseHistory('mockUserId', 'mockDraftId').then(result => {
			expect(db.manyOrNone.mock.calls[0][1]).toEqual({
				userId: 'mockUserId',
				draftId: 'mockDraftId',
				optionalAssessmentId: null
			})

			expect(result).toEqual({
				mockAttemptId: [{ attempt_id: 'mockAttemptId' }],
				secondMockAttemptId: [{ attempt_id: 'secondMockAttemptId' }]
			})

			return done()
		})
	})

	test('getResponseHistory returns array with identical attemptIds', done => {
		db.manyOrNone.mockResolvedValueOnce([
			{
				attempt_id: 'mockAttemptId',
				question_id: 'mockQuestionId'
			},
			{
				attempt_id: 'secondMockAttemptId',
				question_id: 'mockQuestionId'
			},
			{
				attempt_id: 'secondMockAttemptId',
				question_id: 'mockOtherQuestionId'
			}
		])

		return Assessment.getResponseHistory('mockUserId', 'mockDraftId').then(result => {
			expect(db.manyOrNone.mock.calls[0][1]).toEqual({
				userId: 'mockUserId',
				draftId: 'mockDraftId',
				optionalAssessmentId: null
			})

			expect(result).toEqual({
				mockAttemptId: [
					{
						attempt_id: 'mockAttemptId',
						question_id: 'mockQuestionId'
					}
				],
				secondMockAttemptId: [
					{
						attempt_id: 'secondMockAttemptId',
						question_id: 'mockQuestionId'
					},
					{
						attempt_id: 'secondMockAttemptId',
						question_id: 'mockOtherQuestionId'
					}
				]
			})

			return done()
		})
	})

	test('getResponseHistory calls the database with optionalAssessmentId', done => {
		db.manyOrNone.mockResolvedValueOnce([
			{
				attempt_id: 'mockAttemptId'
			},
			{
				attempt_id: 'secondMockAttemptId'
			}
		])

		return Assessment.getResponseHistory(
			'mockUserId',
			'mockDraftId',
			false,
			'mockResourceLinkId',
			'mockAssessmentId'
		).then(result => {
			expect(db.manyOrNone.mock.calls[0][1]).toEqual({
				userId: 'mockUserId',
				draftId: 'mockDraftId',
				isPreview: false,
				optionalAssessmentId: 'mockAssessmentId',
				resourceLinkId: 'mockResourceLinkId'
			})

			expect(result).toEqual({
				mockAttemptId: [{ attempt_id: 'mockAttemptId' }],
				secondMockAttemptId: [{ attempt_id: 'secondMockAttemptId' }]
			})

			return done()
		})
	})

	test('getResponsesForAttempt calls the database with the expected value', () => {
		Assessment.getResponsesForAttempt('mockAttemptId')

		expect(db.manyOrNone.mock.calls[0][1]).toEqual({
			attemptId: 'mockAttemptId'
		})
	})

	test('insertNewAttempt', () => {
		Assessment.insertNewAttempt(
			'mockUserId',
			'mockDraftId',
			'mockAssessmentId',
			'mockState',
			'mockPreviewing'
		)

		expect(db.one).toHaveBeenCalled()
		expect(db.one.mock.calls[0][1]).toEqual({
			assessmentId: 'mockState',
			contentId: 'mockAssessmentId',
			draftId: 'mockDraftId',
			isPreview: undefined, //eslint-disable-line
			state: 'mockPreviewing',
			userId: 'mockUserId'
		})
	})

	test('completeAttempt calls UPDATE/INSERT queries with expected values and returns data object', () => {
		expect.assertions(3)
		db.one.mockResolvedValueOnce('attemptData')
		db.one.mockResolvedValueOnce({ id: 'assessmentScoreId' })

		return Assessment.completeAttempt(1, 2, 3, 4, {}, {}, false).then(result => {
			expect(result).toEqual({
				assessmentScoreId: 'assessmentScoreId',
				attemptData: 'attemptData'
			})

			expect(db.one.mock.calls[0][0]).toContain('UPDATE attempts')
			expect(db.one.mock.calls[1][0]).toContain('INSERT INTO assessment_scores')
		})
	})

	test('updateAttemptState calls db', () => {
		Assessment.updateAttemptState(0, {})

		expect(db.none).toHaveBeenCalled()
		expect(db.none.mock.calls[0][1]).toEqual({
			state: {},
			attemptId: 0
		})
	})

	test('creates its own instance correctly', () => {
		Assessment.prototype.registerEvents = jest.fn()

		const assessment = new Assessment(
			{
				draftTree: true
			},
			{
				node: true
			},
			jest.fn()
		)

		expect(assessment.registerEvents).toHaveBeenCalledWith({
			'internal:sendToClient': assessment.onSendToClient,
			'internal:startVisit': assessment.onStartVisit
		})
	})

	test('onSendToClient yells', () => {
		const assessment = new Assessment(
			{
				draftTree: true
			},
			{
				node: true
			},
			jest.fn()
		)

		jest.spyOn(assessment, 'yell')
		assessment.onSendToClient('req', 'res')

		expect(assessment.yell).toHaveBeenCalledWith(
			'ObojoboDraft.Sections.Assessment:sendToClient',
			'req',
			'res'
		)
	})

	test('onStartVisit inserts value into extensionsProps', () => {
		const req = {
			requireCurrentUser: jest.fn().mockResolvedValue({ id: 'mockUser' })
		}
		jest.spyOn(Assessment, 'getAttempts').mockResolvedValueOnce('mockAttempts')
		const extensionsProps = {}

		const assessment = new Assessment(
			{
				draftTree: true
			},
			{
				node: true
			},
			jest.fn()
		)
		db.one.mockResolvedValueOnce('attemptData')
		return assessment.onStartVisit(req, {}, 'mockDraftId', '', extensionsProps).then(() => {
			expect(extensionsProps[':ObojoboDraft.Sections.Assessment:attemptHistory']).toEqual(
				'mockAttempts'
			)
		})
	})
})
