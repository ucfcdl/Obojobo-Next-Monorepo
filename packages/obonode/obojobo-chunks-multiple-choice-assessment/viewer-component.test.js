import React from 'react'
import renderer from 'react-test-renderer'
import MCAssessment from '../../../packages/obonode/obojobo-chunks-multiple-choice-assessment/viewer-component'
import QuestionUtil from 'obojobo-document-engine/src/scripts/viewer/util/question-util'
import focus from 'obojobo-document-engine/src/scripts/common/page/focus'
import OboModel from 'obojobo-document-engine/src/scripts/common/models/obo-model'

jest.mock('obojobo-document-engine/src/scripts/viewer/util/question-util')
jest.mock('obojobo-document-engine/src/scripts/common/page/focus')
jest.mock('obojobo-document-engine/src/scripts/common/util/shuffle', () => a => a)

const getDefaultProps = () => ({
	model: {
		get: () => 'mock-id',
		getDomId: () => 'mock-id',
		processTrigger: jest.fn(),
		modelState: { responseType: null, shuffle: false },
		children: {
			models: []
		}
	},
	questionModel: { get: () => 'mock-question-model-id' },
	moduleData: {
		navState: { context: 'mockContext' },
		questionState: { contexts: { mockContext: { data: {} } } },
		focusState: {}
	},
	score: null,
	scoreClass: 'mock-score-class',
	hasResponse: true,
	mode: 'mock-mode',
	type: 'default',
	isAnswerRevealed: 'mock-is-answer-revealed',
	feedbackText: 'mock-feedback-text',
	response: null
})

describe('MCAssessmentViewerComponent', () => {
	beforeEach(() => {
		jest.resetAllMocks()
	})

	test('Component renders', () => {
		const component = renderer.create(<MCAssessment {...getDefaultProps()} />)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Component renders (shuffle enabled)', () => {
		const props = getDefaultProps()
		props.model.modelState.shuffle = true
		const component = renderer.create(<MCAssessment {...props} />)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('static focusOnContent returns expected values', () => {
		expect(MCAssessment.focusOnContent({ getDomEl: () => null })).toBe(false)
		expect(focus).not.toHaveBeenCalled()

		expect(
			MCAssessment.focusOnContent({ getDomEl: () => 'mock-dom-el' }, { scroll: 'mock-scroll' })
		).toBe(true)
		expect(focus).toHaveBeenCalledWith('mock-dom-el', 'mock-scroll')
	})

	test.each`
		responseType                   | score   | returnsMessage
		${'pick-one'}                  | ${null} | ${false}
		${'pick-one'}                  | ${0}    | ${false}
		${'pick-one'}                  | ${100}  | ${false}
		${'pick-one-multiple-correct'} | ${null} | ${false}
		${'pick-one-multiple-correct'} | ${0}    | ${false}
		${'pick-one-multiple-correct'} | ${100}  | ${false}
		${'pick-all'}                  | ${null} | ${true}
		${'pick-all'}                  | ${0}    | ${true}
		${'pick-all'}                  | ${100}  | ${false}
	`(
		'getDetails(,"$responseType","$score") returns message? $returnsMessage',
		({ responseType, score, returnsMessage }) => {
			const questionAssessmentModel = {
				modelState: {
					responseType
				}
			}
			const details = MCAssessment.prototype.getDetails(null, questionAssessmentModel, score)

			expect(details).toBe(
				returnsMessage
					? 'You have either missed some correct answers or selected some incorrect answers.'
					: null
			)
		}
	)

	test('static isResponseEmpty returns true if no responses', () => {
		expect(MCAssessment.isResponseEmpty({ ids: [] })).toBe(true)
		expect(MCAssessment.isResponseEmpty({ ids: ['mock-id'] })).toBe(false)
	})

	test('sortIds is called when component created', () => {
		const spy = jest.spyOn(MCAssessment.prototype, 'sortIds')

		renderer.create(<MCAssessment {...getDefaultProps()} />)

		expect(spy).toHaveBeenCalled()

		spy.mockRestore()
	})

	test.each`
		questionType | responseType
		${'default'} | ${'pick-one'}
		${'default'} | ${'pick-one-multiple-correct'}
		${'default'} | ${'pick-all'}
		${'survey'}  | ${'pick-one'}
		${'survey'}  | ${'pick-one-multiple-correct'}
		${'survey'}  | ${'pick-all'}
	`(
		'getInstructions() [responseType=$responseType, questionType=$questionType] matches snapshot',
		({ responseType, questionType }) => {
			const questionModel = {
				modelState: {
					type: questionType
				}
			}
			const questionAssessmentModel = {
				modelState: {
					responseType
				},
				children: {
					models: ['mock-child-1', 'mock-child-2', 'mock-child-3']
				}
			}

			expect(
				MCAssessment.prototype.getInstructions(questionModel, questionAssessmentModel)
			).toMatchSnapshot()
		}
	)

	test('getResponseData returns expected object when no responses', () => {
		const props = getDefaultProps()
		props.response = null

		const component = renderer.create(<MCAssessment {...props} />)

		expect(component.getInstance().getResponseData()).toEqual({
			correct: new Set(),
			responses: new Set()
		})
	})

	test('getResponseData returns expected object when no children', () => {
		const props = getDefaultProps()
		props.response = {
			ids: ['a']
		}
		props.model.children.models = []

		const component = renderer.create(<MCAssessment {...props} />)

		expect(component.getInstance().getResponseData()).toEqual({
			correct: new Set(),
			responses: new Set()
		})
	})

	test('getResponseData returns expected object when responses defined', () => {
		const props = getDefaultProps()
		props.response = {
			ids: ['a', 'd']
		}
		props.model.children.models = [
			{
				get: () => 'a',
				modelState: { score: 100 }
			},
			{
				get: () => 'b',
				modelState: { score: 100 }
			},
			{
				get: () => 'c',
				modelState: { score: 0 }
			},
			{
				get: () => 'd',
				modelState: { score: 0 }
			}
		]

		const component = renderer.create(<MCAssessment {...props} />)

		expect(component.getInstance().getResponseData()).toEqual({
			correct: new Set(['a', 'b']),
			responses: new Set(['a', 'd'])
		})
	})

	// Responses `a` and `b` are the correct answers
	test.each`
		responseType                   | responses               | score
		${'pick-one'}                  | ${[]}                   | ${0}
		${'pick-one'}                  | ${['a']}                | ${100}
		${'pick-one'}                  | ${['b']}                | ${100}
		${'pick-one'}                  | ${['c']}                | ${0}
		${'pick-one'}                  | ${['d']}                | ${0}
		${'pick-one'}                  | ${['a', 'b']}           | ${100}
		${'pick-one'}                  | ${['a', 'c']}           | ${100}
		${'pick-one'}                  | ${['a', 'd']}           | ${100}
		${'pick-one'}                  | ${['b', 'c']}           | ${100}
		${'pick-one'}                  | ${['b', 'd']}           | ${100}
		${'pick-one'}                  | ${['c', 'd']}           | ${0}
		${'pick-one'}                  | ${['a', 'b', 'c']}      | ${100}
		${'pick-one'}                  | ${['a', 'b', 'd']}      | ${100}
		${'pick-one'}                  | ${['a', 'c', 'd']}      | ${100}
		${'pick-one'}                  | ${['b', 'c', 'd']}      | ${100}
		${'pick-one'}                  | ${['a', 'b', 'c', 'd']} | ${100}
		${'pick-one-multiple-correct'} | ${[]}                   | ${0}
		${'pick-one-multiple-correct'} | ${['a']}                | ${100}
		${'pick-one-multiple-correct'} | ${['b']}                | ${100}
		${'pick-one-multiple-correct'} | ${['c']}                | ${0}
		${'pick-one-multiple-correct'} | ${['d']}                | ${0}
		${'pick-one-multiple-correct'} | ${['a', 'b']}           | ${100}
		${'pick-one-multiple-correct'} | ${['a', 'c']}           | ${100}
		${'pick-one-multiple-correct'} | ${['a', 'd']}           | ${100}
		${'pick-one-multiple-correct'} | ${['b', 'c']}           | ${100}
		${'pick-one-multiple-correct'} | ${['b', 'd']}           | ${100}
		${'pick-one-multiple-correct'} | ${['c', 'd']}           | ${0}
		${'pick-one-multiple-correct'} | ${['a', 'b', 'c']}      | ${100}
		${'pick-one-multiple-correct'} | ${['a', 'b', 'd']}      | ${100}
		${'pick-one-multiple-correct'} | ${['a', 'c', 'd']}      | ${100}
		${'pick-one-multiple-correct'} | ${['b', 'c', 'd']}      | ${100}
		${'pick-one-multiple-correct'} | ${['a', 'b', 'c', 'd']} | ${100}
		${'pick-all'}                  | ${[]}                   | ${0}
		${'pick-all'}                  | ${['a']}                | ${50}
		${'pick-all'}                  | ${['b']}                | ${50}
		${'pick-all'}                  | ${['c']}                | ${0}
		${'pick-all'}                  | ${['d']}                | ${0}
		${'pick-all'}                  | ${['a', 'b']}           | ${100}
		${'pick-all'}                  | ${['a', 'c']}           | ${0}
		${'pick-all'}                  | ${['a', 'd']}           | ${0}
		${'pick-all'}                  | ${['b', 'c']}           | ${0}
		${'pick-all'}                  | ${['b', 'd']}           | ${0}
		${'pick-all'}                  | ${['c', 'd']}           | ${0}
		${'pick-all'}                  | ${['a', 'b', 'c']}      | ${50}
		${'pick-all'}                  | ${['a', 'b', 'd']}      | ${50}
		${'pick-all'}                  | ${['a', 'c', 'd']}      | ${0}
		${'pick-all'}                  | ${['b', 'c', 'd']}      | ${0}
		${'pick-all'}                  | ${['a', 'b', 'c', 'd']} | ${0}
	`(
		'calculateScore() [responseType="$responseType", responses=$responses] = $score',
		({ responseType, responses, score }) => {
			const props = getDefaultProps()
			props.model.modelState.responseType = responseType
			props.response = {
				ids: responses
			}
			props.model.children.models = [
				{
					get: () => 'a',
					modelState: { score: 100 }
				},
				{
					get: () => 'b',
					modelState: { score: 100 }
				},
				{
					get: () => 'c',
					modelState: { score: 0 }
				},
				{
					get: () => 'd',
					modelState: { score: 0 }
				}
			]

			const component = renderer.create(<MCAssessment {...props} />)

			expect(component.getInstance().calculateScore()).toEqual({
				details: null,
				score
			})
		}
	)

	test('retry calls QuestionUtil.retryQuestion', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		component.getInstance().retry()

		expect(QuestionUtil.retryQuestion).toHaveBeenCalledWith(
			props.questionModel.get('id'),
			props.moduleData.navState.context
		)
	})

	test.each`
		responseType  | prevResponse                     | scoreIsNull | idClickedOn | isRetryCalled | newResponseIds
		${'pick-one'} | ${null}                          | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-one'} | ${null}                          | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-one'} | ${null}                          | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-one'} | ${null}                          | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-one'} | ${null}                          | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-one'} | ${null}                          | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-one'} | ${null}                          | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-one'} | ${null}                          | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-one'} | ${{ ids: ['a'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-one'} | ${{ ids: ['b'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-one'} | ${{ ids: ['c'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-one'} | ${{ ids: ['d'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${null}                          | ${true}     | ${'a'}      | ${false}      | ${['a']}
		${'pick-all'} | ${null}                          | ${true}     | ${'b'}      | ${false}      | ${['b']}
		${'pick-all'} | ${null}                          | ${true}     | ${'c'}      | ${false}      | ${['c']}
		${'pick-all'} | ${null}                          | ${true}     | ${'d'}      | ${false}      | ${['d']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${true}     | ${'a'}      | ${false}      | ${[]}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${true}     | ${'b'}      | ${false}      | ${['a', 'b']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${true}     | ${'c'}      | ${false}      | ${['a', 'c']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${true}     | ${'d'}      | ${false}      | ${['a', 'd']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${true}     | ${'a'}      | ${false}      | ${['b', 'a']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${true}     | ${'b'}      | ${false}      | ${[]}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${true}     | ${'c'}      | ${false}      | ${['b', 'c']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${true}     | ${'d'}      | ${false}      | ${['b', 'd']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${true}     | ${'a'}      | ${false}      | ${['c', 'a']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${true}     | ${'b'}      | ${false}      | ${['c', 'b']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${true}     | ${'c'}      | ${false}      | ${[]}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${true}     | ${'d'}      | ${false}      | ${['c', 'd']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${true}     | ${'a'}      | ${false}      | ${['d', 'a']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${true}     | ${'b'}      | ${false}      | ${['d', 'b']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${true}     | ${'c'}      | ${false}      | ${['d', 'c']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${true}     | ${'d'}      | ${false}      | ${[]}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${true}     | ${'a'}      | ${false}      | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${true}     | ${'b'}      | ${false}      | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${true}     | ${'c'}      | ${false}      | ${['a', 'b', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${true}     | ${'d'}      | ${false}      | ${['a', 'b', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${true}     | ${'a'}      | ${false}      | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${true}     | ${'b'}      | ${false}      | ${['a', 'c', 'b']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${true}     | ${'c'}      | ${false}      | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${true}     | ${'d'}      | ${false}      | ${['a', 'c', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${true}     | ${'a'}      | ${false}      | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${true}     | ${'b'}      | ${false}      | ${['a', 'd', 'b']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${true}     | ${'c'}      | ${false}      | ${['a', 'd', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${true}     | ${'d'}      | ${false}      | ${['a']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${true}     | ${'a'}      | ${false}      | ${['b', 'c', 'a']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${true}     | ${'b'}      | ${false}      | ${['c']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${true}     | ${'c'}      | ${false}      | ${['b']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${true}     | ${'d'}      | ${false}      | ${['b', 'c', 'd']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${true}     | ${'a'}      | ${false}      | ${['b', 'd', 'a']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${true}     | ${'b'}      | ${false}      | ${['d']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${true}     | ${'c'}      | ${false}      | ${['b', 'd', 'c']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${true}     | ${'d'}      | ${false}      | ${['b']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${true}     | ${'a'}      | ${false}      | ${['c', 'd', 'a']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${true}     | ${'b'}      | ${false}      | ${['c', 'd', 'b']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${true}     | ${'c'}      | ${false}      | ${['d']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${true}     | ${'d'}      | ${false}      | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${true}     | ${'a'}      | ${false}      | ${['b', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${true}     | ${'b'}      | ${false}      | ${['a', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${true}     | ${'c'}      | ${false}      | ${['a', 'b']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${true}     | ${'d'}      | ${false}      | ${['a', 'b', 'c', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${true}     | ${'a'}      | ${false}      | ${['b', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${true}     | ${'b'}      | ${false}      | ${['a', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${true}     | ${'c'}      | ${false}      | ${['a', 'b', 'd', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${true}     | ${'d'}      | ${false}      | ${['a', 'b']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${true}     | ${'a'}      | ${false}      | ${['c', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${true}     | ${'b'}      | ${false}      | ${['a', 'c', 'd', 'b']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${true}     | ${'c'}      | ${false}      | ${['a', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${true}     | ${'d'}      | ${false}      | ${['a', 'c']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${true}     | ${'a'}      | ${false}      | ${['b', 'c', 'd', 'a']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${true}     | ${'b'}      | ${false}      | ${['c', 'd']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${true}     | ${'c'}      | ${false}      | ${['b', 'd']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${true}     | ${'d'}      | ${false}      | ${['b', 'c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${true}     | ${'a'}      | ${false}      | ${['b', 'c', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${true}     | ${'b'}      | ${false}      | ${['a', 'c', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${true}     | ${'c'}      | ${false}      | ${['a', 'b', 'd']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${true}     | ${'d'}      | ${false}      | ${['a', 'b', 'c']}
		${'pick-all'} | ${null}                          | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${null}                          | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${null}                          | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${null}                          | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['b'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['c'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['d'] }}                | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'b'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'c'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'd'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['b', 'c'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['b', 'd'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['c', 'd'] }}           | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c'] }}      | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'd'] }}      | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'c', 'd'] }}      | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['b', 'c', 'd'] }}      | ${false}    | ${'d'}      | ${true}       | ${['d']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${false}    | ${'a'}      | ${true}       | ${['a']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${false}    | ${'b'}      | ${true}       | ${['b']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${false}    | ${'c'}      | ${true}       | ${['c']}
		${'pick-all'} | ${{ ids: ['a', 'b', 'c', 'd'] }} | ${false}    | ${'d'}      | ${true}       | ${['d']}
	`(
		'handleFormChange() [scoreIsNull?=$scoreIsNull, responseType="$responseType", idClickedOn="$idClickedOn", prevResponse="$prevResponse"] = "$newResponseIds" (Is retry called? $isRetryCalled)',
		({ scoreIsNull, responseType, idClickedOn, prevResponse, newResponseIds, isRetryCalled }) => {
			const props = getDefaultProps()
			props.model.modelState.responseType = responseType
			props.score = scoreIsNull ? null : Math.random() * 100
			const spy = jest.spyOn(MCAssessment.prototype, 'retry')

			const component = renderer.create(<MCAssessment {...props} />)

			expect(
				component.getInstance().handleFormChange({ target: { value: idClickedOn } }, prevResponse)
			).toEqual({
				state: { ids: newResponseIds },
				targetId: idClickedOn,
				sendResponseImmediately: true
			})

			if (isRetryCalled) {
				expect(spy).toHaveBeenCalled()
			} else {
				expect(spy).not.toHaveBeenCalled()
			}

			spy.mockRestore()
		}
	)

	test('componentDidUpdate sorts ids', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		const spy = jest.spyOn(MCAssessment.prototype, 'sortIds')

		expect(spy).not.toHaveBeenCalled()
		component.getInstance().componentDidUpdate()
		expect(spy).toHaveBeenCalled()

		spy.mockRestore()
	})

	test('sortIds does not call QuestionUtil.setData if ids already sorted', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		const spy = jest.spyOn(MCAssessment.prototype, 'getSortedIds').mockReturnValue(['a', 'b'])

		expect(QuestionUtil.setData).toHaveBeenCalledTimes(1)
		component.getInstance().sortIds()
		expect(QuestionUtil.setData).toHaveBeenCalledTimes(1)

		spy.mockRestore()
	})

	test('sortIds calls QuestionUtil.setData if ids not yet sorted', () => {
		const props = getDefaultProps()
		props.model.children.models = [
			{
				get: () => 'a'
			},
			{
				get: () => 'b'
			},
			{
				get: () => 'c'
			},
			{
				get: () => 'd'
			}
		]
		const component = renderer.create(<MCAssessment {...props} />)

		const spy = jest.spyOn(MCAssessment.prototype, 'getSortedIds').mockReturnValue(null)

		expect(QuestionUtil.setData).toHaveBeenCalledTimes(1)
		component.getInstance().sortIds()
		expect(QuestionUtil.setData).toHaveBeenCalledTimes(2)
		expect(QuestionUtil.setData).toHaveBeenLastCalledWith('mock-id', 'mockContext', 'sortedIds', [
			'a',
			'b',
			'c',
			'd'
		])

		spy.mockRestore()
	})

	test('getSortedIds returns data from QuestionUtil.getData', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		QuestionUtil.getData.mockReturnValue('mock-data')
		expect(component.getInstance().getSortedIds()).toBe('mock-data')
		expect(QuestionUtil.getData).toHaveBeenLastCalledWith(
			props.moduleData.questionState,
			props.model,
			props.moduleData.navState.context,
			'sortedIds'
		)
	})

	test('getSortedChoiceModels returns [] when no sortedIds exist', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		const spy = jest.spyOn(MCAssessment.prototype, 'getSortedIds').mockReturnValue(null)

		expect(component.getInstance().getSortedChoiceModels()).toEqual([])

		spy.mockRestore()
	})

	test('getSortedChoiceModels returns array of OboModels', () => {
		const props = getDefaultProps()
		const component = renderer.create(<MCAssessment {...props} />)

		const spy = jest
			.spyOn(MCAssessment.prototype, 'getSortedIds')
			.mockReturnValue(['c', 'd', 'b', 'a'])
		const originalOboModelModels = OboModel.models
		OboModel.models = {
			a: {
				get: () => 'ObojoboDraft.Chunks.MCAssessment.MCChoice'
			},
			b: {
				get: () => 'mock-type'
			},
			c: {
				get: () => 'ObojoboDraft.Chunks.MCAssessment.MCChoice'
			},
			d: {
				get: () => 'mock-type'
			}
		}

		expect(component.getInstance().getSortedChoiceModels()).toEqual([
			OboModel.models.c,
			OboModel.models.a
		])

		spy.mockRestore()
		OboModel.models = originalOboModelModels
	})
})
