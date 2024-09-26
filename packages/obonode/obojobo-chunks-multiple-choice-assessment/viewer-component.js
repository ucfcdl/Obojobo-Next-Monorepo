import './viewer-component.scss'

import Common from 'obojobo-document-engine/src/scripts/common'
import MCAssessmentAnswerChoices from './mc-assessment-answer-choices'
import React from 'react'
import Viewer from 'obojobo-document-engine/src/scripts/viewer'
import shuffle from 'obojobo-document-engine/src/scripts/common/util/shuffle'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'

const { OboModel } = Common.models
const { OboComponent, OboQuestionAssessmentComponent } = Viewer.components
const { QuestionUtil } = Viewer.util
const { focus } = Common.page

const PICK_ALL_INCORRECT_MESSAGE =
	'You have either missed some correct answers or selected some incorrect answers.'

export default class MCAssessment extends OboQuestionAssessmentComponent {
	static focusOnContent(model, opts = {}) {
		const el = model.getDomEl()

		if (!el) return false

		focus(el, opts.scroll)

		return true
	}

	static isResponseEmpty(response) {
		return response.ids.length === 0
	}

	constructor(props) {
		super(props)
		this.answerChoicesRef = React.createRef()

		this.sortIds()
	}

	getInstructions(questionModel, questionAssessmentModel) {
		const responseType = questionAssessmentModel.modelState.responseType
		const questionType = questionModel.modelState.type

		let instructions = ''

		if (questionType === 'survey') {
			switch (responseType) {
				case 'pick-one':
				case 'pick-one-multiple-correct':
					instructions = <span>Choose one</span>
					break
				case 'pick-all':
					instructions = <span>Choose one or more</span>
					break
			}
		} else {
			switch (responseType) {
				case 'pick-one':
					instructions = <span>Pick the correct answer</span>
					break
				case 'pick-one-multiple-correct':
					instructions = <span>Pick one of the correct answers</span>
					break
				case 'pick-all':
					instructions = (
						<span>
							Pick <b>all</b> of the correct answers
						</span>
					)
					break
			}
		}

		return (
			<React.Fragment>
				<span className="for-screen-reader-only">{`Multiple choice form with ${questionAssessmentModel.children.models.length} choices. `}</span>
				{instructions}
			</React.Fragment>
		)
	}

	getDetails(questionModel, questionAssessmentModel, score) {
		if (questionAssessmentModel.modelState.responseType === 'pick-all' && score !== 100) {
			return PICK_ALL_INCORRECT_MESSAGE
		}

		return null
	}

	getResponseData() {
		const questionResponse = this.props.response || { ids: [] }

		const correct = new Set()
		const responses = new Set()
		let childId

		for (const child of Array.from(this.props.model.children.models)) {
			childId = child.get('id')

			if (child.modelState.score === 100) {
				correct.add(childId)
			}

			if (questionResponse.ids.indexOf(childId) !== -1) {
				responses.add(childId)
			}
		}

		return {
			correct,
			responses
		}
	}

	calculateScore() {
		const responseData = this.getResponseData()
		const { correct } = responseData
		const { responses } = responseData

		switch (this.props.model.modelState.responseType) {
			case 'pick-all': {
				let score,
					numCorrect = 0

				responses.forEach(function(id) {
					if (correct.has(id)) {
						numCorrect++
					} else {
						numCorrect--
					}
				})

				if (numCorrect <= 0) {
					score = 0
				} else {
					score = (100 * numCorrect) / correct.size
				}

				return { score, details: null }
			}

			default: {
				// pick-one | pick-one-multiple-correct
				const correctArr = [...correct]

				for (const id of correctArr) {
					if (responses.has(id)) {
						return { score: 100, details: null }
					}
				}

				return { score: 0, details: null }
			}
		}
	}

	retry() {
		QuestionUtil.retryQuestion(
			this.props.questionModel.get('id'),
			this.props.moduleData.navState.context
		)
	}

	handleFormChange(event, prevResponse) {
		if (this.props.score !== null) {
			this.retry()
			prevResponse = { ids: [] }
		}

		const mcChoiceId = event.target.value
		let response

		switch (this.props.model.modelState.responseType) {
			case 'pick-all': {
				response = prevResponse || { ids: [] }
				const responseIndex = response.ids.indexOf(mcChoiceId)

				if (responseIndex === -1) {
					response.ids.push(mcChoiceId)
				} else {
					response.ids.splice(responseIndex, 1)
				}

				break
			}

			default:
				response = {
					ids: [mcChoiceId]
				}
				break
		}

		return {
			state: response,
			targetId: mcChoiceId,
			sendResponseImmediately: true
		}
	}

	componentDidUpdate() {
		this.sortIds()
	}

	sortIds() {
		if (!this.getSortedIds()) {
			let ids = this.props.model.children.models.map(model => model.get('id'))
			if (this.props.model.modelState.shuffle) ids = shuffle(ids)
			QuestionUtil.setData(
				this.props.model.get('id'),
				this.props.moduleData.navState.context,
				'sortedIds',
				ids
			)
		}
	}

	getSortedIds() {
		return QuestionUtil.getData(
			this.props.moduleData.questionState,
			this.props.model,
			this.props.moduleData.navState.context,
			'sortedIds'
		)
	}

	getSortedChoiceModels() {
		const sortedIds = this.getSortedIds()
		if (!sortedIds) return []

		return sortedIds
			.map(mcChoiceId => OboModel.models[mcChoiceId])
			.filter(model => model.get('type') === 'ObojoboDraft.Chunks.MCAssessment.MCChoice')
	}

	render() {
		const responseType = this.props.model.modelState.responseType
		const score = this.props.score
		const scoreClass = this.props.scoreClass
		const sortedChoiceModels = this.getSortedChoiceModels()
		const hasResponse = this.props.hasResponse

		const className =
			'obojobo-draft--chunks--mc-assessment' +
			` is-response-type-${this.props.model.modelState.responseType}` +
			` is-mode-${this.props.mode}` +
			` is-type-${this.props.type}` +
			isOrNot(hasResponse, 'responded-to') +
			` ${scoreClass}` +
			isOrNot(score !== null, 'scored')

		return (
			<OboComponent
				model={this.props.model}
				moduleData={this.props.moduleData}
				className={className}
			>
				<MCAssessmentAnswerChoices
					ref={this.answerChoicesRef}
					models={sortedChoiceModels}
					questionModel={this.props.questionModel}
					responseType={responseType}
					score={score}
					mode={this.props.mode}
					isAnswerRevealed={this.props.isAnswerRevealed}
					type={this.props.type}
					moduleData={this.props.moduleData}
					feedbackText={this.props.feedbackText}
				/>
			</OboComponent>
		)
	}
}
