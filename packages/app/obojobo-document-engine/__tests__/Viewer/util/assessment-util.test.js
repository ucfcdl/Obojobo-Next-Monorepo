jest.mock('../../../src/scripts/common/flux/dispatcher')
jest.mock('../../../src/scripts/viewer/util/question-util')

import AssessmentUtil from '../../../src/scripts/viewer/util/assessment-util'
import Dispatcher from '../../../src/scripts/common/flux/dispatcher'
import QuestionUtil from '../../../src/scripts/viewer/util/question-util'

const TYPE_ASSESSMENT = 'ObojoboDraft.Sections.Assessment'
const GRADEBOOK_STATUS_OK_NO_OUTCOME_SERVICE = 'ok_no_outcome_service'
const GRADEBOOK_STATUS_OK_NULL_SCORE_NOT_SENT = 'ok_null_score_not_sent'
const GRADEBOOK_STATUS_OK_GRADEBOOK_MATCHES_SCORE = 'ok_gradebook_matches_assessment_score'

describe('AssessmentUtil', () => {
	beforeEach(() => {
		jest.resetAllMocks()
	})

	test('getAssessmentForModel returns assesment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {
				testId: 'mockAssessment'
			}
		}

		const assessment = AssessmentUtil.getAssessmentForModel(state, model)

		expect(assessment).toEqual('mockAssessment')
	})

	test('getAssessmentForModel returns with no parent assesment', () => {
		const model = {
			get: jest.fn().mockReturnValueOnce('mockType'),
			getParentOfType: jest.fn().mockReturnValueOnce(null)
		}
		const state = {
			assessments: {
				testId: 'mockAssessment'
			}
		}

		const assessment = AssessmentUtil.getAssessmentForModel(state, model)

		expect(assessment).toEqual(null)
	})

	test('getAssessmentForModel returns with no state assessments', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {}
		}

		const assessment = AssessmentUtil.getAssessmentForModel(state, model)

		expect(assessment).toEqual(null)
	})

	test('getLastAttemptForModel returns null when no assessment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {}
		}

		const attempt = AssessmentUtil.getLastAttemptForModel(state, model)

		expect(attempt).toEqual(null)
	})

	test('getLastAttemptForModel returns 0 when no attempts', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {
				testId: { attempts: [] }
			}
		}

		const attempt = AssessmentUtil.getLastAttemptForModel(state, model)

		expect(attempt).toEqual(0)
	})

	test('getLastAttemptForModel returns attempt', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {
				testId: { attempts: ['mockAttempt'] }
			}
		}

		const assessment = AssessmentUtil.getLastAttemptForModel(state, model)

		expect(assessment).toEqual('mockAttempt')
	})

	test('getHighestAttemptsForModelByAssessmentScore returns empty when no assessment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {}
		}

		const attempt = AssessmentUtil.getHighestAttemptsForModelByAssessmentScore(state, model)

		expect(attempt).toEqual([])
	})

	test('getHighestAttemptsForModelByAssessmentScore returns high scores', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {
				testId: { highestAssessmentScoreAttempts: 'mockHighest' }
			}
		}

		const attempt = AssessmentUtil.getHighestAttemptsForModelByAssessmentScore(state, model)

		expect(attempt).toEqual('mockHighest')
	})

	test('getHighestAttemptsForModelByAttemptScore returns empty when no assessment', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce()

		const attempt = AssessmentUtil.getHighestAttemptsForModelByAttemptScore()

		expect(attempt).toEqual([])
	})

	test('getHighestAttemptsForModelByAttemptScore returns high scores', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			highestAttemptScoreAttempts: 'mockHighest'
		})

		const attempt = AssessmentUtil.getHighestAttemptsForModelByAttemptScore()

		expect(attempt).toEqual('mockHighest')
	})

	test('getAssessmentScoreForModel returns null when no attempts', () => {
		const state = {
			assessmentSummary: []
		}

		const score = AssessmentUtil.getAssessmentScoreForModel(state)

		expect(score).toEqual(null)
	})

	test('getAssessmentScoreForModel returns highest score', () => {
		const state = {
			assessmentSummary: [{ scores: [null, 99, 88] }]
		}

		const score = AssessmentUtil.getAssessmentScoreForModel(state)

		expect(score).toEqual(99)
	})

	test('getAssessmentScoreForModel returns null if the highest score is null', () => {
		const state = {
			assessmentSummary: [{ scores: [null, null, null] }]
		}

		const score = AssessmentUtil.getAssessmentScoreForModel(state)

		expect(score).toEqual(null)
	})

	test('getAssessmentScoreForModel returns null if no scores exist', () => {
		const state = {
			assessmentSummary: [{ scores: [] }]
		}

		const score = AssessmentUtil.getAssessmentScoreForModel(state)

		expect(score).toEqual(null)
	})

	test('getLastAttemptScoresForModel returns null with no assessment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {}
		}

		const scores = AssessmentUtil.getLastAttemptScoresForModel(state, model)

		expect(scores).toEqual(null)
	})

	test('getLastAttemptScoresForModel returns empty with no attempts', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({ attempts: [] })
		const scores = AssessmentUtil.getLastAttemptScoresForModel()

		expect(scores).toEqual([])
	})

	test('getLastAttemptScoresForModel returns scores of last attempt', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			attempts: [{ result: { questionScores: 'mockScores' } }]
		})
		const scores = AssessmentUtil.getLastAttemptScoresForModel()

		expect(scores).toEqual('mockScores')
	})

	test('getCurrentAttemptForModel returns null with no assessment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId')
		}
		const state = {
			assessments: {}
		}

		const attempt = AssessmentUtil.getCurrentAttemptForModel(state, model)

		expect(attempt).toEqual(null)
	})

	test('getCurrentAttemptForModel returns current attempt', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			current: 'mockCurrent'
		})

		const attempt = AssessmentUtil.getCurrentAttemptForModel()

		expect(attempt).toEqual('mockCurrent')
	})

	test('getAllAttempts returns all attempts', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			attempts: 'mockAttempts'
		})
		const attempts = AssessmentUtil.getAllAttempts()
		expect(attempts).toEqual('mockAttempts')
	})

	test('getAttemptsRemaining returns number of attempts avalible', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId'),
			modelState: {
				attempts: 12
			}
		}
		const state = {
			assessments: {
				testId: { attempts: [] }
			}
		}

		const attemptsRemaining = AssessmentUtil.getAttemptsRemaining(state, model)

		expect(attemptsRemaining).toEqual(12)
	})

	test('getAttemptsRemaining returns 0 when importHasBeenUsed', () => {
		const state = {
			importHasBeenUsed: true
		}

		const attemptsRemaining = AssessmentUtil.getAttemptsRemaining(state)

		expect(attemptsRemaining).toEqual(0)
	})

	test('hasAttemptsRemaining returns if attempts are avalible', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId'),
			modelState: {
				attempts: 12
			}
		}
		const state = {
			assessments: {
				testId: { attempts: [] }
			}
		}

		const attemptsRemaining = AssessmentUtil.hasAttemptsRemaining(state, model)

		expect(attemptsRemaining).toEqual(true)
	})

	test('hasAttemptsRemaining returns false if importHasBeenUsed', () => {
		const state = {
			importHasBeenUsed: true
		}

		const attemptsRemaining = AssessmentUtil.hasAttemptsRemaining(state)

		expect(attemptsRemaining).toEqual(false)
	})

	test('getLTIStateForModel returns null with no assessment', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId'),
			modelState: {
				attempts: 12
			}
		}
		const state = {
			assessments: {}
		}

		const ltiState = AssessmentUtil.getLTIStateForModel(state, model)

		expect(ltiState).toEqual(null)
	})

	test('getLTIStateForModel returns if attempts are avalible', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			lti: 'mock-lti',
			ltiNetworkState: 'mock-lti-nw-state',
			ltiResyncState: 'mock-lti-rs-state'
		})

		const model = {}
		const state = {}

		const ltiState = AssessmentUtil.getLTIStateForModel(state, model)

		expect(ltiState).toEqual({
			state: 'mock-lti',
			networkState: 'mock-lti-nw-state',
			resyncState: 'mock-lti-rs-state'
		})
	})

	test('isLTIScoreNeedingToBeResynced returns false with no gradebook', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId'),
			modelState: {
				attempts: 12
			}
		}
		const state = {
			assessments: {
				testId: {
					lti: {}
				}
			}
		}

		const ltiState = AssessmentUtil.isLTIScoreNeedingToBeResynced(state, model)

		expect(ltiState).toEqual(false)
	})

	test('isLTIScoreNeedingToBeResynced returns false if synced', () => {
		const getAssessmentForModel = jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		const model = 'mock-model'
		const state = 'mock-state'

		getAssessmentForModel.mockReturnValueOnce({
			lti: { gradebookStatus: GRADEBOOK_STATUS_OK_GRADEBOOK_MATCHES_SCORE }
		})
		let ltiState = AssessmentUtil.isLTIScoreNeedingToBeResynced(state, model)
		expect(ltiState).toEqual(false)

		getAssessmentForModel.mockReturnValueOnce({
			lti: { gradebookStatus: GRADEBOOK_STATUS_OK_NULL_SCORE_NOT_SENT }
		})
		ltiState = AssessmentUtil.isLTIScoreNeedingToBeResynced(state, model)
		expect(ltiState).toEqual(false)

		getAssessmentForModel.mockReturnValueOnce({
			lti: { gradebookStatus: GRADEBOOK_STATUS_OK_NO_OUTCOME_SERVICE }
		})
		ltiState = AssessmentUtil.isLTIScoreNeedingToBeResynced(state, model)
		expect(ltiState).toEqual(false)
	})

	test('isLTIScoreNeedingToBeResynced returns true if not synced', () => {
		jest.spyOn(AssessmentUtil, 'getAssessmentForModel')
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			lti: {
				gradebookStatus: 'mock-not-synced-status'
			}
		})

		const model = {}
		const state = {}

		const ltiState = AssessmentUtil.isLTIScoreNeedingToBeResynced(state, model)

		expect(ltiState).toEqual(true)
	})

	test('getResponseCount returns the number of questions with responses', () => {
		const models = [{}, {}]

		QuestionUtil.getResponse.mockReturnValueOnce(false).mockReturnValueOnce(true)

		const count = AssessmentUtil.getResponseCount(models)

		expect(QuestionUtil.getResponse).toHaveBeenCalledTimes(2)
		expect(count).toBe(1)
	})

	test('isCurrentAttemptComplete returns null if no attempt', () => {
		const model = {
			get: jest
				.fn()
				.mockReturnValueOnce(TYPE_ASSESSMENT)
				.mockReturnValueOnce('testId'),
			modelState: {
				attempts: 12
			}
		}
		const state = {
			assessments: {
				testId: {}
			}
		}

		const isComplete = AssessmentUtil.isCurrentAttemptComplete(state, null, model)

		expect(isComplete).toEqual(null)
	})

	test('isCurrentAttemptComplete returns true when every question is answered', () => {
		jest.spyOn(AssessmentUtil, 'getCurrentAttemptForModel')
		jest.spyOn(AssessmentUtil, 'getResponseCount')
		AssessmentUtil.getCurrentAttemptForModel.mockReturnValueOnce(true)
		AssessmentUtil.getResponseCount.mockReturnValueOnce(5)

		const model = {
			children: {
				at: () => ({
					children: {
						models: [1, 2, 3, 4, 5]
					}
				})
			}
		}
		const state = {}

		const isComplete = AssessmentUtil.isCurrentAttemptComplete(state, null, model)

		expect(isComplete).toEqual(true)
	})

	test('isInAssessment returns false without a state', () => {
		const inside = AssessmentUtil.isInAssessment()

		expect(inside).toEqual(false)
	})

	test('isInAssessment returns false without assessments', () => {
		const state = {
			assessments: {}
		}
		const inside = AssessmentUtil.isInAssessment(state)

		expect(inside).toEqual(false)
	})

	test('isInAssessment returns true with current assessment', () => {
		const state = {
			assessments: {
				assess1: { current: null },
				assess2: { current: true }
			}
		}
		const inside = AssessmentUtil.isInAssessment(state)

		expect(inside).toEqual(true)
	})

	test('getNumPossibleCorrect returns the number of questions which could be correct', () => {
		const questionScores = [{ score: 100 }, { score: 0 }, { score: 'no-score' }]

		const correct = AssessmentUtil.getNumPossibleCorrect(questionScores)
		expect(correct).toEqual(2)
	})

	test('getNumCorrect returns correct questions', () => {
		const questionScores = [{ score: 100 }, { score: 0 }, { score: 100 }]

		const correct = AssessmentUtil.getNumCorrect(questionScores)
		expect(correct).toEqual(2)
	})

	test('startAttempt calls assessment:startAttempt', () => {
		const model = {
			get: jest.fn().mockReturnValueOnce('testId')
		}

		AssessmentUtil.startAttempt(model)

		expect(Dispatcher.trigger).toHaveBeenCalled()
		expect(Dispatcher.trigger).toHaveBeenCalledWith('assessment:startAttempt', {
			value: { id: 'testId' }
		})
	})

	test('endAttempt calls assessment:endAttempt', () => {
		const model = {
			get: jest.fn().mockReturnValueOnce('testId')
		}

		AssessmentUtil.endAttempt({
			model,
			context: 'mockContext',
			visitId: 'mockVisitId'
		}),
			expect(Dispatcher.trigger).toHaveBeenCalled()
		expect(Dispatcher.trigger).toHaveBeenCalledWith('assessment:endAttempt', {
			value: { id: 'testId', context: 'mockContext', visitId: 'mockVisitId' }
		})
	})

	test('resendLTIScore calls assessment:resendLTIScore', () => {
		const model = {
			get: jest.fn().mockReturnValueOnce('testId')
		}

		AssessmentUtil.resendLTIScore(model)

		expect(Dispatcher.trigger).toHaveBeenCalled()
		expect(Dispatcher.trigger).toHaveBeenCalledWith('assessment:resendLTIScore', {
			value: { id: 'testId' }
		})
	})

	test('getNumberOfAttemptsCompleted returns score length', () => {
		const state = {
			assessmentSummary: [
				{
					scores: [1, 2, 3]
				}
			]
		}

		const result = AssessmentUtil.getNumberOfAttemptsCompleted(state)
		expect(result).toBe(3)
	})

	test('getNumberOfAttemptsCompleted returns 0 with invalid state', () => {
		const state1 = {
			assessmentSummary: [{}]
		}
		const state2 = {
			assessmentSummary: []
		}
		const state3 = {
			assessmentSummary: null
		}
		const state4 = {}

		expect(AssessmentUtil.getNumberOfAttemptsCompleted(state1)).toBe(0)
		expect(AssessmentUtil.getNumberOfAttemptsCompleted(state2)).toBe(0)
		expect(AssessmentUtil.getNumberOfAttemptsCompleted(state3)).toBe(0)
		expect(AssessmentUtil.getNumberOfAttemptsCompleted(state4)).toBe(0)
	})
})
