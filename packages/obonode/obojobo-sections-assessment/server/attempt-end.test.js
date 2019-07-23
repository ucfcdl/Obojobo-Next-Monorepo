/* eslint no-undefined: 0 */
/* eslint no-extend-native: 0 */
global.oboRequire = name => {
	return require(`obojobo-express/${name}`)
}

jest.setMock('obojobo-express/insert_event', require('obojobo-express/__mocks__/insert_event'))
jest.mock('obojobo-express/models/draft')
jest.mock('obojobo-express/db')
jest.mock('obojobo-express/lti')
jest.mock('obojobo-express/logger')
jest.mock('obojobo-express/routes/api/events/create_caliper_event')
jest.mock('../assessment-rubric')
jest.mock('./assessment', () => ({
	getAttempt: jest.fn().mockResolvedValue({
		assessment_id: 'mockAssessmentId',
		attemptNumber: 'mockAttemptNumber',
		state: 'mockState',
		draft_id: 'mockDraftId'
	}),
	getAttempts: jest.fn().mockResolvedValue('attempts'),
	getAttemptNumber: jest.fn().mockResolvedValue(6),
	getResponsesForAttempt: jest.fn().mockResolvedValue('mockResponsesForAttempt'),
	getCompletedAssessmentAttemptHistory: jest.fn().mockResolvedValue('super bat dad'),
	completeAttempt: jest.fn().mockReturnValue('mockCompleteAttemptResult')
}))

jest.mock(
	'obojobo-express/models/visit',
	() => ({
		fetchById: jest.fn().mockReturnValue({ is_preview: false })
	}),
	{ virtual: true }
)

const logger = require('obojobo-express/logger')
const DraftDocument = require('obojobo-express/models/draft')
const lti = require('obojobo-express/lti')
const insertEvent = require('obojobo-express/insert_event')
const createCaliperEvent = require('obojobo-express/routes/api/events/create_caliper_event')
const originalToISOString = Date.prototype.toISOString
const AssessmentRubric = require('../assessment-rubric')
const attemptStart = require('./attempt-start.js')
const Assessment = require('./assessment')
const testJson = require('obojobo-document-engine/test-object.json')

const {
	endAttempt,
	getAttempt,
	getCalculatedScores,
	calculateScores,
	completeAttempt,
	insertAttemptEndEvents,
	sendLTIHighestAssessmentScore,
	insertAttemptScoredEvents,
	reloadAttemptStateIfReviewing,
	recreateChosenQuestionTree,
	getNodeQuestion
} = require('./attempt-end')

describe('Attempt End', () => {
	beforeAll(() => {
		Date.prototype.toISOString = () => 'mockDate'
	})
	afterAll(() => {
		Date.prototype.toISOString = originalToISOString
	})
	beforeEach(() => {
		jest.restoreAllMocks()
		insertEvent.mockReset()
		AssessmentRubric.mockGetAssessmentScoreInfoForAttempt.mockReset()
		AssessmentRubric.mockGetAssessmentScoreInfoForAttempt.mockReturnValue({
			assessmentScore: 'mockScoreForAttempt'
		})
		lti.sendHighestAssessmentScore.mockReset()
	})

	test('endAttempt returns Assessment.getAttempts, sends lti highest score, and inserts 2 events', () => {
		expect.assertions(13)
		lti.getLatestHighestAssessmentScoreRecord.mockResolvedValueOnce({ score: 75 })
		// provide a draft model mock
		const mockDraftDocument = new DraftDocument({
			content: {
				rubric: 1,
				review: 'never'
			},
			draftId: 'mockDraftId',
			contentId: 'mockContentId'
		})
		mockDraftDocument.yell.mockImplementationOnce(
			(eventType, req, res, assessmentModel, responseHistory, event) => {
				event.addScore('q1', 0)
				event.addScore('q2', 100)
				return [Promise.resolve()]
			}
		)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce(mockDraftDocument)
		DraftDocument.fetchById.mockResolvedValueOnce(mockDraftDocument)

		// Mock out assessment methods internally to build score data
		Assessment.getCompletedAssessmentAttemptHistory.mockResolvedValueOnce([])
		Assessment.getAttempt.mockResolvedValueOnce({
			assessment_id: 'mockAssessmentId',
			state: { questions: [{ id: 'q1' }, { id: 'q2' }] },
			draft_id: 'mockDraftId',
			result: {
				attemptScore: 50
			}
		})

		// mock the caliperEvent methods
		const createAssessmentAttemptSubmittedEvent = jest.fn().mockReturnValue('mockCaliperPayload')
		const createAssessmentAttemptScoredEvent = jest.fn().mockReturnValue('mockCaliperPayload')
		insertEvent.mockReturnValueOnce('mockInsertResult')
		createCaliperEvent
			.mockReturnValueOnce({ createAssessmentAttemptSubmittedEvent })
			.mockReturnValueOnce({ createAssessmentAttemptScoredEvent })

		// mock lti send score
		lti.sendHighestAssessmentScore.mockReturnValueOnce({
			scoreSent: 'mockScoreSent',
			error: 'mockScoreError',
			errorDetails: 'mockErrorDetails',
			ltiAssessmentScoreId: 'mockLitScoreId',
			status: 'mockStatus'
		})

		// mock score reload
		jest.fn().mockReturnValueOnce('mockProperties')
		jest.fn().mockReturnValueOnce('mockReload')

		const req = {
			connection: { remoteAddress: 'mockRemoteAddress' },
			currentUser: { id: 'mockUserId' },
			currentDocument: mockDraftDocument,
			params: { attemptId: 'mockAttemptId' },
			currentVisit: {
				id: 'mockVisitId',
				is_preview: false,
				resource_link_id: 'mockResourceLinkId'
			},
			body: {
				visitId: 'mockVisitId'
			}
		}

		expect(insertEvent).toHaveBeenCalledTimes(0)

		return endAttempt(req, {}).then(results => {
			expect(logger.info).toHaveBeenCalledTimes(8)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('getAttempt success'))
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('getAttemptHistory success'))
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('getCalculatedScores success')
			)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('completeAttempt success'))
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('insertAttemptEndEvent success')
			)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('sendLTIScore was executed'))

			expect(results).toBe('attempts')
			expect(lti.sendHighestAssessmentScore).toHaveBeenLastCalledWith(
				'mockUserId',
				mockDraftDocument,
				'mockAssessmentId',
				false,
				'mockResourceLinkId'
			)
			expect(insertEvent).toHaveBeenCalledTimes(2)

			expect(insertEvent).toHaveBeenCalledWith({
				action: 'assessment:attemptEnd',
				actorTime: 'mockDate',
				caliperPayload: 'mockCaliperPayload',
				draftId: 'mockDraftId',
				contentId: 'mockContentId',
				eventVersion: '1.1.0',
				ip: 'mockRemoteAddress',
				metadata: {},
				payload: {
					attemptCount: 6,
					attemptId: 'mockAttemptId'
				},
				userId: 'mockUserId',
				isPreview: false,
				visitId: 'mockVisitId'
			})

			expect(insertEvent).toHaveBeenCalledWith({
				action: 'assessment:attemptScored',
				actorTime: 'mockDate',
				caliperPayload: 'mockCaliperPayload',
				draftId: 'mockDraftId',
				contentId: 'mockContentId',
				eventVersion: '2.0.0',
				ip: 'mockRemoteAddress',
				metadata: {},
				payload: {
					assessmentScore: undefined,
					assessmentScoreId: undefined,
					attemptCount: 6,
					attemptId: 'mockAttemptId',
					attemptScore: 50,
					highestAssessmentScore: 75,
					ltiAssessmentScoreId: 'mockLitScoreId',
					ltiGradeBookStatus: undefined,
					ltiStatusDetails: undefined,
					ltiScoreSent: 'mockScoreSent',
					ltiScoreStatus: 'mockStatus',
					scoreDetails: { assessmentScore: 'mockScoreForAttempt' },
					resourceLinkId: 'mockResourceLinkId'
				},
				userId: 'mockUserId',
				isPreview: false,
				visitId: 'mockVisitId'
			})
		})
	})

	test('getAttempt returns an object of attempt info', () => {
		expect.assertions(6)

		return getAttempt(1).then(attempt => {
			expect(attempt).toHaveProperty('assessmentId', 'mockAssessmentId')
			expect(attempt).toHaveProperty('number', 6)
			expect(attempt).toHaveProperty('attemptState', 'mockState')
			expect(attempt).toHaveProperty('draftId', 'mockDraftId')
			expect(attempt).toHaveProperty('model', expect.any(DraftDocument))
			expect(attempt).toHaveProperty('assessmentModel', 'mockChild')
		})
	})

	test('getCalculatedScores', () => {
		expect.assertions(4)
		// Setup: Assessment with two questions (q1 and q2)
		// First attempt: q1 = 60%, q2 = 100%, attempt = 80%
		// This attempt: q1 = 0%, q2 = 100%, attempt should be 50%
		// Result should be an assessment score of 80% (highest)
		// but this attempt should be a 50%

		const req = jest.fn()
		const res = jest.fn()
		const assessmentModel = {
			yell: (eventType, req, res, assessmentModel, responseHistory, event) => {
				expect(event).toHaveProperty('getQuestions', expect.any(Function))
				expect(event).toHaveProperty('addScore', expect.any(Function))
				expect(event.getQuestions()).toBe(attemptState.questions)

				// add scores into the method's scoreInfo object for calculating later
				// this is usually done by yell after getting the questions
				event.addScore('q1', 66.6666666667)
				event.addScore('q2', 12.9999999999)

				return [] // return empty array of promises, no need for more
			},
			node: { content: {} }
		}
		const attemptState = {
			questions: [
				{
					id: 'q1'
				},
				{
					id: 'q2'
				}
			]
		}
		const attemptHistory = []
		const responseHistory = jest.fn()

		return getCalculatedScores(
			req,
			res,
			assessmentModel,
			attemptState,
			attemptHistory,
			responseHistory
		).then(result => {
			expect(result).toEqual({
				assessmentScoreDetails: {
					assessmentScore: 'mockScoreForAttempt'
				},
				attempt: {
					attemptScore: 39.8333333333,
					questionScores: [
						{
							id: 'q1',
							score: 66.6666666667
						},
						{
							id: 'q2',
							score: 12.9999999999
						}
					]
				}
			})
		})
	})

	test('insertAttemptEndEvents calls insertEvent with expected params (preview mode = true)', () => {
		// mock the caliperEvent method
		const createAssessmentAttemptSubmittedEvent = jest.fn().mockReturnValue('mockCaliperPayload')
		insertEvent.mockReturnValueOnce('mockInsertResult')
		createCaliperEvent.mockReturnValueOnce({
			createAssessmentAttemptSubmittedEvent
		})

		const mockDraftDocument = {
			draftId: 'mockDraftId',
			contentId: 'mockContentId'
		}

		const r = insertAttemptEndEvents(
			{ id: 'mockUserId' },
			mockDraftDocument,
			'mockAssessmentId',
			'mockAttemptId',
			'mockAttemptNumber',
			'mockIsPreviewing',
			'mockHostname',
			'mockRemoteAddress'
		)

		// make sure we get the result of insertEvent back
		expect(r).toBe('mockInsertResult')

		// make sure insert event is called
		expect(insertEvent).toHaveBeenCalledTimes(1)

		// make sure insert event is called with the arguments we expect
		expect(insertEvent).toHaveBeenCalledWith({
			action: 'assessment:attemptEnd',
			actorTime: 'mockDate',
			payload: {
				attemptId: 'mockAttemptId',
				attemptCount: 'mockAttemptNumber'
			},
			userId: 'mockUserId',
			ip: 'mockRemoteAddress',
			metadata: {},
			draftId: 'mockDraftId',
			contentId: 'mockContentId',
			eventVersion: '1.1.0',
			caliperPayload: 'mockCaliperPayload',
			isPreview: 'mockIsPreviewing'
		})

		// make sure the caliper payload gets the expected inputs
		expect(createAssessmentAttemptSubmittedEvent).toHaveBeenCalledWith({
			actor: {
				id: 'mockUserId',
				type: 'user'
			},
			assessmentId: 'mockAssessmentId',
			attemptId: 'mockAttemptId',
			draftId: 'mockDraftId',
			contentId: 'mockContentId'
		})
	})

	test('insertAttemptScoredEvents calls insertEvent with expected params (preview mode = false, isScoreSent = false)', () => {
		lti.getLatestHighestAssessmentScoreRecord.mockResolvedValue({
			score: 'mockHighestAssessmentScore'
		})
		// mock the caliperEvent method
		const createAssessmentAttemptScoredEvent = jest.fn().mockReturnValue('mockCaliperPayload')
		insertEvent.mockReturnValueOnce('mockInsertResult')
		createCaliperEvent.mockReturnValueOnce({
			createAssessmentAttemptScoredEvent
		})
		const mockDraftDocument = {
			draftId: 'mockDraftId',
			contentId: 'mockContentId'
		}

		return insertAttemptScoredEvents(
			{ id: 'userId' },
			mockDraftDocument,
			'mockAssessmentId',
			'mockAssessmentScoreId',
			'mockAttemptId',
			'mockAttemptNumber',
			'mockAttemptScore',
			'mockAssessmentScore',
			'mockIsPreviewing',
			'mockLtiScoreSent',
			'mockLtiScoreStatus',
			'mockLtiScoreError',
			'mockLtiScoreErrorDetails',
			'mockLtiAssessmentScoreId',
			'mockHostname',
			'mockRemoteAddress'
		).then(r => {
			// make sure we get the result of insertEvent back
			expect(r).toBe('mockInsertResult')

			// make sure insert event is called
			expect(insertEvent).toHaveBeenCalledTimes(1)

			// make sure insert event is called with the arguments we expect
			expect(insertEvent).toHaveBeenCalledWith({
				action: 'assessment:attemptScored',
				actorTime: 'mockDate',
				caliperPayload: 'mockCaliperPayload',
				draftId: 'mockDraftId',
				contentId: 'mockContentId',
				eventVersion: '2.0.0',
				ip: 'mockRemoteAddress',
				metadata: {},
				payload: {
					assessmentScore: 'mockAssessmentScore',
					assessmentScoreId: 'mockAssessmentScoreId',
					attemptCount: 'mockAttemptNumber',
					attemptId: 'mockAttemptId',
					attemptScore: 'mockAttemptScore',
					highestAssessmentScore: 'mockHighestAssessmentScore',
					ltiAssessmentScoreId: 'mockLtiAssessmentScoreId',
					ltiGradeBookStatus: 'mockLtiScoreErrorDetails',
					ltiStatusDetails: 'mockLtiScoreError',
					ltiScoreSent: 'mockLtiScoreSent',
					ltiScoreStatus: 'mockLtiScoreStatus'
				},
				userId: 'userId',
				isPreview: 'mockIsPreviewing'
			})

			// make sure the caliper payload gets the expected inputs
			expect(createAssessmentAttemptScoredEvent).toHaveBeenCalledWith({
				actor: {
					type: 'serverApp'
				},
				assessmentId: 'mockAssessmentId',
				attemptId: 'mockAttemptId',
				attemptScore: 'mockAttemptScore',
				draftId: 'mockDraftId',
				contentId: 'mockContentId',
				extensions: {
					assessmentScore: 'mockAssessmentScore',
					highestAssessmentScore: 'mockHighestAssessmentScore',
					attemptCount: 'mockAttemptNumber',
					attemptScore: 'mockAttemptScore',
					ltiScoreSent: 'mockLtiScoreSent'
				}
			})
		})
	})

	test('sendLTIHighestAssessmentScore calls lti.sendLTIHighestAssessmentScore', () => {
		expect(lti.sendHighestAssessmentScore).toHaveBeenCalledTimes(0)
		sendLTIHighestAssessmentScore()
		expect(lti.sendHighestAssessmentScore).toHaveBeenCalledTimes(1)
	})

	test('calculateScores keeps all scores in order', () => {
		const assessmentModel = { node: { content: {} } }

		const attemptHistory = [
			{
				result: {
					attemptScore: 25
				}
			}
		]

		const scoreInfo = {
			questions: [{ id: 4 }, { id: 5 }, { id: 6 }],
			scoresByQuestionId: { 4: 50, 5: 75, 6: 27 },
			scores: [50, 75, 27]
		}

		const result = calculateScores(assessmentModel, attemptHistory, scoreInfo)

		// make sure the questionScores are in the same order
		expect(result.attempt.questionScores).toEqual([
			{ id: 4, score: 50 },
			{ id: 5, score: 75 },
			{ id: 6, score: 27 }
		])
	})

	test('calculateScores calculates expected attemptScore', () => {
		const assessmentModel = { node: { content: {} } }

		const attemptHistory = [
			{
				result: {
					attemptScore: 25
				}
			}
		]

		const scoreInfo = {
			questions: [{ id: 4 }, { id: 5 }, { id: 6 }],
			scoresByQuestionId: { 4: 50, 5: 75, 6: 27 },
			scores: [50, 75, 27]
		}

		const result = calculateScores(assessmentModel, attemptHistory, scoreInfo)
		expect(result.attempt.attemptScore).toBe(50.666666666666664)
	})

	test('calculateScores calls AssessmentRubric.getAssessmentScoreInfoForAttempt with expected values', () => {
		expect(AssessmentRubric.mockGetAssessmentScoreInfoForAttempt).toHaveBeenCalledTimes(0)
		const assessmentModel = { node: { content: { attempts: '2' } } }

		const attemptHistory = [{ result: { attemptScore: 25 } }]

		const scoreInfo = {
			questions: [{ id: 4 }, { id: 5 }],
			scoresByQuestionId: { 4: 50, 5: 75 },
			scores: [50, 75]
		}

		const result = calculateScores(assessmentModel, attemptHistory, scoreInfo)

		expect(result).toHaveProperty('assessmentScoreDetails', {
			assessmentScore: 'mockScoreForAttempt'
		})
		expect(AssessmentRubric.mockGetAssessmentScoreInfoForAttempt).toHaveBeenCalledTimes(1)
		expect(AssessmentRubric.mockGetAssessmentScoreInfoForAttempt).toHaveBeenCalledWith(2, [
			25,
			62.5
		])
	})

	test('getCalculatedScores calls calculateScores with expected values', () => {
		const attemptHistory = [
			{
				result: {
					attemptScore: 25
				}
			}
		]

		const attemptState = {
			questions: [{ id: 4 }, { id: 5 }, { id: 6 }]
		}

		const x = new DraftDocument({ content: { rubric: 1 } })

		// now we have to mock yell so that we can call addScore()
		x.yell.mockImplementationOnce((event, req, res, model, history, funcs) => {
			funcs.addScore(4, 10)
			funcs.addScore(5, 66)
			funcs.addScore(6, 77)
			return [Promise.resolve()]
		})

		return getCalculatedScores({}, {}, x, attemptState, attemptHistory, 'rh').then(result => {
			expect(result).toEqual({
				assessmentScoreDetails: {
					assessmentScore: 'mockScoreForAttempt'
				},
				attempt: {
					attemptScore: 51,
					questionScores: [
						{
							id: 4,
							score: 10
						},
						{
							id: 5,
							score: 66
						},
						{
							id: 6,
							score: 77
						}
					]
				}
			})

			expect()
		})
	})

	test('completeAttempt calls Assessment.completeAttempt with expected values', () => {
		const r = completeAttempt(
			'mockAssessmentId',
			'mockAttemptId',
			'mockUserId',
			'mockDraftId',
			'mockContentId',
			{ attempt: 'mockCalculatedScores', assessmentScoreDetails: 'mockScoreDeets' },
			'mockPreview',
			'mockResourceLinkId'
		)

		// make sure we get the result of insertEvent back
		expect(r).toBe('mockCompleteAttemptResult')

		// make sure Assessment.completeAttempt is called
		expect(Assessment.completeAttempt).toHaveBeenLastCalledWith(
			'mockAssessmentId',
			'mockAttemptId',
			'mockUserId',
			'mockDraftId',
			'mockContentId',
			'mockCalculatedScores',
			'mockScoreDeets',
			'mockPreview',
			'mockResourceLinkId'
		)
	})

	test('insertAttemptEndEvents creates a correct caliper event and internal event', () => {
		// mock the caliperEvent method
		const createAssessmentAttemptSubmittedEvent = jest.fn().mockReturnValue('mockCaliperPayload')
		insertEvent.mockReturnValueOnce('mockInsertResult')
		createCaliperEvent.mockReturnValueOnce({
			createAssessmentAttemptSubmittedEvent
		})

		const mockDraftDocument = {
			draftId: 'mockDraftId',
			contentId: 'mockContentId'
		}

		const r = insertAttemptEndEvents(
			{ id: 1 },
			mockDraftDocument,
			'mockAssessmentId',
			'mockAttemptId',
			'mockAttemptNumber',
			'mockIsPreviewing',
			'mockHostname',
			'mockRemoteAddress'
		)

		// make sure we get the result of insertEvent back
		expect(r).toBe('mockInsertResult')

		// make sure insert event is called
		expect(insertEvent).toHaveBeenCalledTimes(1)

		// make sure insert event is called with the arguments we expect
		expect(insertEvent).toHaveBeenCalledWith({
			action: 'assessment:attemptEnd',
			actorTime: 'mockDate',
			caliperPayload: 'mockCaliperPayload',
			draftId: 'mockDraftId',
			contentId: 'mockContentId',
			eventVersion: '1.1.0',
			ip: 'mockRemoteAddress',
			metadata: {},
			payload: {
				attemptCount: 'mockAttemptNumber',
				attemptId: 'mockAttemptId'
			},
			userId: 1,
			isPreview: 'mockIsPreviewing'
		})
	})
	test('getNodeQuestion reloads score', () => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById('assessment')
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			toObject: () => {
				return {
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: [
						{
							id: 'e3d455d5-80dd-4df8-87cf-594218016f44',
							type: 'ObojoboDraft.Chunks.Text',
							content: {},
							children: []
						},
						{
							id: 'qb1-q1-mca',
							type: 'ObojoboDraft.Chunks.MCAssessment',
							content: {},
							children: [
								{
									id: 'qb1-q1-mca-mc1',
									type: 'ObojoboDraft.Chunks.MCAssessment.MCChoice',
									content: { score: 100 }
								}
							]
						}
					]
				}
			}
		})

		const mockQuestion = {
			id: 'qb1.q1',
			type: 'ObojoboDraft.Chunks.Question',
			children: [
				{
					id: 'e3d455d5-80dd-4df8-87cf-594218016f44',
					type: 'ObojoboDraft.Chunks.Text',
					content: {},
					children: []
				},
				{
					id: 'qb1-q1-mca',
					type: 'ObojoboDraft.Chunks.MCAssessment',
					content: {},
					children: [
						{
							id: 'qb1-q1-mca-mc1',
							type: 'ObojoboDraft.Chunks.MCAssessment.MCChoice',
							content: { score: 0 }
						}
					]
				}
			]
		}

		expect(mockQuestion.id).toBe('qb1.q1')
		expect(mockQuestion.children[1].children[0].content.score).toBe(0)

		const reloadedQuestion = getNodeQuestion(mockQuestion.id, mockDraftDocument)

		expect(reloadedQuestion.id).toBe(mockQuestion.id)
		expect(reloadedQuestion.children[1].children[0].content.score).toBe(100)
	})

	test('recreateChosenQuestionTree parses down a one-level question bank', () => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			toObject: () => {
				return {
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: [{}, {}]
				}
			}
		})
		const mockQB = {
			id: 'qb.lv1',
			type: 'ObojoboDraft.Chunks.QuestionBank',
			children: [
				{
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: []
				}
			]
		}

		expect(mockQB.children.length).toBe(1)
		expect(mockQB.children[0].children.length).toBe(0)

		recreateChosenQuestionTree(mockQB, mockDraftDocument)

		expect(mockQB.children.length).toBe(1)
		expect(mockQB.children[0].children.length).not.toBe(0)
	})

	test('recreateChosenQuestionTree parses down a multi-level question bank', () => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			toObject: () => {
				return {
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: [{}, {}]
				}
			}
		})
		const mockQB = {
			id: 'qb.lv1',
			type: 'ObojoboDraft.Chunks.QuestionBank',
			children: [
				{
					id: 'qb.lv2',
					type: 'ObojoboDraft.Chunks.QuestionBank',
					children: [
						{
							id: 'qb.lv3',
							type: 'ObojoboDraft.Chunks.QuestionBank',
							children: [
								{
									id: 'qb1.q1',
									type: 'ObojoboDraft.Chunks.Question',
									children: []
								}
							]
						}
					]
				}
			]
		}

		expect(mockQB.children.length).toBe(1)
		expect(mockQB.children[0].children.length).toBe(1)
		expect(mockQB.children[0].children[0].children.length).toBe(1)
		expect(mockQB.children[0].children[0].children[0].children.length).toBe(0)

		recreateChosenQuestionTree(mockQB, mockDraftDocument)

		expect(mockQB.children.length).toBe(1)
		expect(mockQB.children[0].children.length).toBe(1)
		expect(mockQB.children[0].children[0].children.length).toBe(1)
		expect(mockQB.children[0].children[0].children[0].children.length).not.toBe(0)
	})

	test('reloadAttemptStateIfReviewing does not reload when reviews are not allowed', () => {
		const mockAttempt = {
			assessmentModel: {
				node: {
					content: {
						review: 'never'
					}
				}
			}
		}

		const response = reloadAttemptStateIfReviewing(0, 0, mockAttempt, null, null, false, null)

		expect(response).toBe(null)
	})

	test('reloadAttemptStateIfReviewing does not reload when reviews are allowed after attempts, but it is not the last attempt', () => {
		const mockAttempt = {
			number: 1,
			assessmentModel: {
				node: {
					content: {
						review: 'no-attempts-remaining',
						attempts: 3
					}
				}
			}
		}

		const response = reloadAttemptStateIfReviewing(0, 0, mockAttempt, null, null, false, null)

		expect(response).toBe(null)
	})

	test('reloadAttemptStateIfReviewing reloads only one when reviews are always allowed', () => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			children: [
				{},
				{
					toObject: () => {
						return {
							id: 'qb1.q1',
							type: 'ObojoboDraft.Chunks.Question',
							children: [{}, {}]
						}
					},
					childrenSet: [{}, {}]
				}
			]
		})

		const mockAttempt = {
			assessmentModel: {
				node: {
					content: {
						review: 'always'
					}
				}
			}
		}

		attemptStart.getState = jest.fn().mockReturnValueOnce({
			qb: {},
			questions: [],
			data: {}
		})
		Assessment.updateAttemptState = jest.fn()

		reloadAttemptStateIfReviewing(0, 0, mockAttempt, mockDraftDocument, null, false, null)

		expect(Assessment.updateAttemptState).toHaveBeenCalledTimes(1)
	})

	test('reloadAttemptStateIfReviewing reloads all when reviews are allowed after last', done => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			children: [
				{},
				{
					toObject: () => {
						return {
							id: 'qb1.q1',
							type: 'ObojoboDraft.Chunks.Question',
							children: [{}, {}]
						}
					},
					childrenSet: [{}, {}]
				}
			]
		})
		const mockAttempt = {
			number: 3,
			assessmentModel: {
				node: {
					content: {
						review: 'no-attempts-remaining',
						attempts: 3
					}
				}
			}
		}

		attemptStart.getState = jest.fn().mockReturnValueOnce({
			qb: {},
			questions: [],
			data: {}
		})
		Assessment.getAttempts.mockResolvedValueOnce({
			attempts: [
				{
					state: {
						qb: {
							id: 'qb.lv1',
							type: 'ObojoboDraft.Chunks.QuestionBank',
							children: [
								{
									id: 'qb.lv2',
									type: 'ObojoboDraft.Chunks.QuestionBank',
									children: [
										{
											id: 'qb.lv3',
											type: 'ObojoboDraft.Chunks.QuestionBank',
											children: [
												{
													id: 'qb1.q1',
													type: 'ObojoboDraft.Chunks.Question',
													children: []
												}
											]
										}
									]
								}
							]
						},
						questions: [{ id: 'qb1.q1' }]
					}
				}
			]
		})
		// Set up mock question retrieval
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			toObject: () => {
				return {
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: [{}, {}]
				}
			},
			childrenSet: [{}, {}]
		})
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			toObject: () => {
				return {
					id: 'qb1.q1',
					type: 'ObojoboDraft.Chunks.Question',
					children: [{}, {}]
				}
			},
			childrenSet: [{}, {}]
		})
		Assessment.updateAttemptState = jest.fn()

		return reloadAttemptStateIfReviewing(
			0,
			0,
			mockAttempt,
			mockDraftDocument,
			{ id: 1 },
			false,
			null
		).then(() => {
			expect(Assessment.getAttempts).toHaveBeenCalled()
			expect(Assessment.updateAttemptState).toHaveBeenCalledTimes(1)
			return done()
		})
	})

	test('reloadAttemptStateIfReviewing logs an error when reaching an exceptional state', () => {
		const mockDraftDocument = new DraftDocument(testJson)
		mockDraftDocument.getChildNodeById.mockReturnValueOnce({
			children: [
				{},
				{
					toObject: () => {
						return {
							id: 'qb1.q1',
							type: 'ObojoboDraft.Chunks.Question',
							children: [{}, {}]
						}
					},
					childrenSet: [{}, {}]
				}
			]
		})

		const mockAttempt = {
			number: 3,
			assessmentModel: {
				node: {
					content: {
						review: 'bad-review-type',
						attempts: 3
					}
				}
			}
		}

		attemptStart.getState = jest.fn().mockReturnValueOnce({
			qb: {},
			questions: [
				{
					toObject: jest.fn(() => {})
				}
			],
			data: {}
		})

		const result = reloadAttemptStateIfReviewing(
			0,
			0,
			mockAttempt,
			mockDraftDocument,
			{ id: 1 },
			false,
			null
		)

		expect(logger.error).toHaveBeenCalledWith(
			'Error: Reached exceptional state while reloading state for 0'
		)
		expect(result).toEqual(null)
	})
})
