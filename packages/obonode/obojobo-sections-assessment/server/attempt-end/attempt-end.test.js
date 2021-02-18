jest.mock('obojobo-express/server/lti')
jest.mock('./get-calculated-scores')
jest.mock('../models/assessment')
jest.mock('obojobo-express/server/logger')
jest.mock('../assessment')
jest.mock('./get-calculated-scores')
jest.mock('obojobo-express/server/insert_event')
jest.mock('../insert-events')
jest.mock('obojobo-express/server/models/draft')

describe('attempt-end', () => {
	const lti = require('obojobo-express/server/lti')
	const AssessmentModel = require('../models/assessment')
	const getCalculatedScores = require('./get-calculated-scores')
	const insertEvents = require('../insert-events')
	const logger = require('obojobo-express/server/logger')

	const mockCurrentUser = {
		id: 'mockCurrentUserId'
	}

	const mockCurrentVisit = {
		id: 'mockCurrentVisitId',
		is_preview: 'mockIsPreview',
		resource_link_id: 'mockResourceLinkId'
	}

	const mockCurrentDocument = {
		draftId: 'mockDraftId',
		contentId: 'mockContentId',
		getChildNodeById: jest.fn()
	}

	const mockReq = {
		currentUser: mockCurrentUser,
		currentVisit: mockCurrentVisit,
		currentDocument: mockCurrentDocument,
		params: {
			attemptId: 'mock-attempt-id'
		},
		connection: {
			remoteAddress: 'mockRemoteAddress'
		},
		hostname: 'mockHostName'
	}

	const mockRes = {}

	beforeEach(() => {
		jest.resetAllMocks()
	})

	test('endAttempt resovles and sends expected arguments to all external methods', async () => {
		// set up all the mock results
		const mockFetchAttemptByID = {
			userId: 'mockAttemptUserId',
			draftId: 'mockDraftId',
			draftContentId: 'mockContentId',
			assessmentId: 'mockAssessmentId',
			state: 'mockAttemptState'
		}

		const mockCalculatedScore = {
			attempt: {
				attemptScore: 99
			},
			assessmentScoreDetails: {
				assessmentModdedScore: 88
			}
		}

		const mockHighestScore = {
			status: 'mockLtiStatus',
			scoreSent: 'mockScoreSent',
			statusDetails: 'mockLtiStatusDetails',
			gradebookStatus: 'mockLtiGradebookStatus',
			ltiAssessmentScoreId: 'mockLtiAssessmentScoreId'
		}

		// set up mock returns
		mockCurrentDocument.getChildNodeById.mockReturnValueOnce('mockChildNode')
		AssessmentModel.fetchAttemptById.mockResolvedValueOnce(mockFetchAttemptByID)
		AssessmentModel.getAttemptNumber.mockResolvedValueOnce('mock-attempt-number')
		AssessmentModel.fetchResponsesForAttempts.mockResolvedValueOnce(['mock-response'])
		AssessmentModel.getCompletedAssessmentAttemptHistory.mockResolvedValueOnce('mockHistory')
		AssessmentModel.completeAttempt.mockResolvedValueOnce({
			assessmentScoreId: 'mock-assessment-score-id'
		})
		getCalculatedScores.mockResolvedValueOnce(mockCalculatedScore)
		lti.sendHighestAssessmentScore.mockResolvedValueOnce(mockHighestScore)

		// call end attempt
		const endAttempt = require('./attempt-end')
		await expect(endAttempt(mockReq, mockRes)).resolves.toEqual({ assessmentModdedScore: 88 })

		// make sure all the steps were called with the expected variables
		expect(AssessmentModel.fetchAttemptById).toHaveBeenCalledWith('mock-attempt-id')
		expect(AssessmentModel.getAttemptNumber).toHaveBeenCalledWith(
			'mockAttemptUserId',
			'mockDraftId',
			'mock-attempt-id'
		)
		expect(AssessmentModel.getCompletedAssessmentAttemptHistory).toHaveBeenCalledWith(
			'mockCurrentUserId',
			'mockDraftId',
			'mockAssessmentId',
			'mockIsPreview',
			'mockResourceLinkId'
		)
		expect(AssessmentModel.fetchResponsesForAttempts).toHaveBeenCalledWith(['mock-attempt-id'])
		expect(getCalculatedScores).toHaveBeenCalledWith(
			mockReq,
			mockRes,
			'mockChildNode',
			'mockAttemptState',
			'mockHistory',
			'mock-response'
		)
		expect(AssessmentModel.completeAttempt).toHaveBeenCalledWith(
			'mockAssessmentId',
			'mock-attempt-id',
			'mockCurrentUserId',
			'mockDraftId',
			'mockContentId',
			{ attemptScore: 99 },
			{ assessmentModdedScore: 88 },
			'mockIsPreview',
			'mockResourceLinkId'
		)
		expect(insertEvents.insertAttemptEndEvents).toHaveBeenCalledWith(
			mockCurrentUser.id,
			mockCurrentDocument.draftId,
			mockCurrentDocument.contentId,
			'mockAssessmentId',
			'mock-attempt-id',
			'mock-attempt-number',
			'mockIsPreview',
			'mockHostName',
			'mockRemoteAddress',
			'mockCurrentVisitId'
		)
		expect(lti.sendHighestAssessmentScore).toHaveBeenCalledWith(
			'mockCurrentUserId',
			mockCurrentDocument,
			'mockAssessmentId',
			'mockIsPreview',
			'mockResourceLinkId'
		)
		expect(insertEvents.insertAttemptScoredEvents).toHaveBeenCalledWith(
			mockCurrentUser,
			mockCurrentDocument,
			'mockAssessmentId',
			'mock-assessment-score-id',
			'mock-attempt-id',
			'mock-attempt-number',
			99,
			88,
			'mockIsPreview',
			'mockScoreSent',
			'mockLtiStatus',
			'mockLtiStatusDetails',
			'mockLtiGradebookStatus',
			'mockLtiAssessmentScoreId',
			'mockHostName',
			'mockRemoteAddress',
			{ assessmentModdedScore: 88 },
			'mockResourceLinkId',
			'mockCurrentVisitId'
		)

		// make sure logger.info looks good
		expect(logger.info.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    "End attempt \\"mock-attempt-id\\" begin for user \\"mockCurrentUserId\\" (Preview=\\"mockIsPreview\\")",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - getAttempt success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - getAttemptHistory success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - fetchResponsesForAttempt success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - getCalculatedScores success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - completeAttempt success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - insertAttemptEndEvent success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - sendLTIScore success",
		  ],
		  Array [
		    "End attempt \\"mock-attempt-id\\" - insertAttemptScoredEvents success",
		  ],
		]
	`)
	})

	test('endAttempt defaults to attempt 1', async () => {
		// set up all the mock results
		const mockFetchAttemptByID = {
			userId: 'mockAttemptUserId',
			draftId: 'mockDraftId',
			draftContentId: 'mockContentId',
			assessmentId: 'mockAssessmentId',
			state: 'mockAttemptState'
		}

		const mockCalculatedScore = {
			attempt: {
				attemptScore: 99
			},
			assessmentScoreDetails: {
				assessmentModdedScore: 88
			}
		}

		const mockHighestScore = {
			status: 'mockLtiStatus',
			scoreSent: 'mockScoreSent',
			statusDetails: 'mockLtiStatusDetails',
			gradebookStatus: 'mockLtiGradebookStatus',
			ltiAssessmentScoreId: 'mockLtiAssessmentScoreId'
		}

		// set up mock returns
		mockCurrentDocument.getChildNodeById.mockReturnValueOnce('mockChildNode')
		AssessmentModel.fetchAttemptById.mockResolvedValueOnce(mockFetchAttemptByID)
		AssessmentModel.getAttemptNumber.mockResolvedValueOnce(null)
		AssessmentModel.fetchResponsesForAttempts.mockResolvedValueOnce(['mock-response'])
		AssessmentModel.getCompletedAssessmentAttemptHistory.mockResolvedValueOnce('mockHistory')
		AssessmentModel.completeAttempt.mockResolvedValueOnce({
			assessmentScoreId: 'mock-assessment-score-id'
		})
		getCalculatedScores.mockResolvedValueOnce(mockCalculatedScore)
		lti.sendHighestAssessmentScore.mockResolvedValueOnce(mockHighestScore)

		// call end attempt
		const endAttempt = require('./attempt-end')
		await expect(endAttempt(mockReq, mockRes)).resolves.toEqual({ assessmentModdedScore: 88 })

		expect(insertEvents.insertAttemptEndEvents).toHaveBeenCalledWith(
			mockCurrentUser.id,
			mockCurrentDocument.draftId,
			mockCurrentDocument.contentId,
			'mockAssessmentId',
			'mock-attempt-id',
			1,
			'mockIsPreview',
			'mockHostName',
			'mockRemoteAddress',
			'mockCurrentVisitId'
		)

		expect(insertEvents.insertAttemptScoredEvents).toHaveBeenCalledWith(
			mockCurrentUser,
			mockCurrentDocument,
			'mockAssessmentId',
			'mock-assessment-score-id',
			'mock-attempt-id',
			1,
			99,
			88,
			'mockIsPreview',
			'mockScoreSent',
			'mockLtiStatus',
			'mockLtiStatusDetails',
			'mockLtiGradebookStatus',
			'mockLtiAssessmentScoreId',
			'mockHostName',
			'mockRemoteAddress',
			{ assessmentModdedScore: 88 },
			'mockResourceLinkId',
			'mockCurrentVisitId'
		)
	})

	test('endAttempt rejects when attempting to end attempt module not matching currentDocument and inserts an event', async () => {
		const endAttempt = require('./attempt-end')
		AssessmentModel.fetchAttemptById.mockResolvedValueOnce({})
		AssessmentModel.invalidateAttempt.mockResolvedValueOnce(true)
		await expect(endAttempt(mockReq, mockRes)).rejects.toThrow(
			Error('Cannot end an attempt for a different module')
		)
		expect(insertEvents.insertAttemptInvalidatedEvent).toHaveBeenCalled()
	})

	test('endAttempt rejects when attempting to end attempt module not matching currentDocument (but does not insert an event if the attempt was already invalidated)', async () => {
		const endAttempt = require('./attempt-end')
		AssessmentModel.fetchAttemptById.mockResolvedValueOnce({})
		AssessmentModel.invalidateAttempt.mockResolvedValueOnce(null)
		await expect(endAttempt(mockReq, mockRes)).rejects.toThrow(
			Error('Cannot end an attempt for a different module')
		)
		expect(insertEvents.insertAttemptScoredEvents).not.toHaveBeenCalled()
	})
})
