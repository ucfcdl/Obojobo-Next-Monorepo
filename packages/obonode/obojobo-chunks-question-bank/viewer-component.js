import './viewer-component.scss'

import React from 'react'
import Viewer from 'Viewer'

const { OboComponent } = Viewer.components

const QuestionBank = props => {
	let questionRender = null
	// props will only contain 'questionIndex' in single-question pace assessments
	// default to null otherwise
	let currentQuestionIndex = props.questionIndex
	if (typeof currentQuestionIndex === 'undefined') currentQuestionIndex = null

	if (currentQuestionIndex !== null) {
		// this shouldn't happen, but to prevent weird lockouts constrain current question index to the highest possible
		if (currentQuestionIndex >= props.model.children.models.length) {
			currentQuestionIndex = props.model.children.models.length - 1
		}
		const questionModel = props.model.children.models[currentQuestionIndex]
		const Component = questionModel.getComponentClass()

		questionRender = (
			<Component
				key={currentQuestionIndex}
				model={questionModel}
				moduleData={props.moduleData}
				questionIndex={currentQuestionIndex}
				numQuestionsInBank={props.model.children.models.length}
			/>
		)
	} else {
		questionRender = props.model.children.models.map((child, index) => {
			const Component = child.getComponentClass()

			return (
				<Component
					key={index}
					model={child}
					moduleData={props.moduleData}
					questionIndex={index}
					numQuestionsInBank={props.model.children.models.length}
				/>
			)
		})
	}

	return (
		<OboComponent
			model={props.model}
			moduleData={props.moduleData}
			className="obojobo-draft--chunks--question-bank"
		>
			{questionRender}
		</OboComponent>
	)
}

export default QuestionBank
