import './viewer-component.scss'
import './editor-component.scss'

import { Transforms, Editor } from 'slate'
import { ReactEditor } from 'slate-react'
import Common from 'obojobo-document-engine/src/scripts/common'
import withSlateWrapper from 'obojobo-document-engine/src/scripts/oboeditor/components/node/with-slate-wrapper'
import React from 'react'
import Node from 'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component'

const { Button, MoreInfoButton } = Common.components
const QUESTION_NODE = 'ObojoboDraft.Chunks.Question'
const SOLUTION_NODE = 'ObojoboDraft.Chunks.Question.Solution'
const MCASSESSMENT_NODE = 'ObojoboDraft.Chunks.MCAssessment'
const NUMERIC_ASSESSMENT_NODE = 'ObojoboDraft.Chunks.NumericAssessment'
const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'
const PAGE_NODE = 'ObojoboDraft.Pages.Page'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'

const Question = props => {
	function getIsInAssessment() {
		return [
			...Editor.levels(props.editor, {
				at: ReactEditor.findPath(props.editor, props.element),
				reverse: true
			})
		].some(([node]) => {
			return node.type === ASSESSMENT_NODE
		})
	}

	function toggleCollapsed() {
		const path = ReactEditor.findPath(props.editor, props.element)
		const collapsed = !props.element.content.collapsed

		Transforms.setNodes(
			props.editor,
			{ content: { ...props.element.content, collapsed } },
			{ at: path }
		)
	}

	function onSetType(event) {
		const type = event.target.checked ? 'survey' : 'default'

		// update this element's content.type
		const path = ReactEditor.findPath(props.editor, props.element)

		Transforms.setNodes(props.editor, { content: { ...props.element.content, type } }, { at: path })

		// The Question Assessment item should be the last child
		const lastChildIndex = getHasSolution()
			? props.element.children.length - 2
			: props.element.children.length - 1
		return Transforms.setNodes(
			props.editor,
			{ questionType: type },
			{ at: path.concat(lastChildIndex) }
		)
	}

	function onSetScoring(event) {
		const hasSolution = getHasSolution()
		let assessmentNode

		if (hasSolution) {
			assessmentNode = props.element.children[props.element.children.length - 2]
		} else {
			assessmentNode = props.element.children[props.element.children.length - 1]
		}

		const path = ReactEditor.findPath(props.editor, assessmentNode)
		return Transforms.setNodes(
			props.editor,
			{ content: { ...assessmentNode.content, partialScoring: event.target.checked } },
			{ at: path }
		)
	}

	function getHasSolution() {
		return props.element.children[props.element.children.length - 1].subtype === SOLUTION_NODE
	}

	function onSetAssessmentType(event) {
		const type = event.target.value

		const item = Common.Registry.getItemForType(type)
		const newBlock = item.cloneBlankNode()

		// preserve whether this question is a survey or not
		newBlock.questionType = props.element.content.type

		const path = ReactEditor.findPath(props.editor, props.element)
		const hasSolution = getHasSolution()
		const assessmentLocation = hasSolution
			? props.element.children.length - 2
			: props.element.children.length - 1

		Editor.withoutNormalizing(props.editor, () => {
			// Remove the old assessment
			Transforms.removeNodes(props.editor, {
				at: path.concat(assessmentLocation)
			})
			// Insert the new assessment
			Transforms.insertNodes(props.editor, newBlock, {
				at: path.concat(assessmentLocation)
			})
		})
	}

	function deleteNode() {
		const path = ReactEditor.findPath(props.editor, props.element)
		return Transforms.removeNodes(props.editor, { at: path })
	}

	function addSolution() {
		const path = ReactEditor.findPath(props.editor, props.element)
		return Transforms.insertNodes(
			props.editor,
			{
				type: QUESTION_NODE,
				subtype: SOLUTION_NODE,
				content: { score: 0 },
				children: [
					{
						type: PAGE_NODE,
						content: {},
						children: [
							{
								type: TEXT_NODE,
								content: {},
								children: [
									{
										type: TEXT_NODE,
										subtype: TEXT_LINE_NODE,
										content: { indent: 0 },
										children: [{ text: '' }]
									}
								]
							}
						]
					}
				]
			},
			{ at: path.concat(props.element.children.length) }
		)
	}

	function getContentDescription(isTypeSurvey, isInAssessment) {
		if (isTypeSurvey || isInAssessment) {
			return []
		}

		return [
			{
				name: 'revealAnswer',
				description: 'Allow reveal answer?',
				type: 'select',
				values: [
					{
						value: 'default',
						description: '(Use the default setting for this question type)'
					},
					{
						value: 'never',
						description: 'No'
					},
					{ value: 'always', description: 'Yes' },
					{
						value: 'when-incorrect',
						description: 'Yes, but only after submitting an incorrect answer'
					}
				]
			}
		]
	}

	const element = props.element
	const content = element.content

	const isTypeSurvey = content.type === 'survey'

	const hasSolution = getHasSolution()
	const isInAssessment = getIsInAssessment()

	// The question type is determined by the MCAssessment or the NumericAssessment
	// This is either the last node or the second to last node depending on whether the
	//  'explanation' area is visible
	const questionElement = element.children[element.children.length - (hasSolution ? 2 : 1)]
	const questionType = questionElement.type

	const partialScoring = questionElement.content?.partialScoring || false

	const className =
		'component obojobo-draft--chunks--question is-viewed pad' +
		` is-type-${content.type}` +
		` is-${content.collapsed ? 'collapsed' : 'not-collapsed'}`

	return (
		<Node
			{...props}
			className="obojobo-draft--chunks--question--wrapper"
			contentDescription={getContentDescription(isTypeSurvey, isInAssessment)}
		>
			<div className={className}>
				{content.collapsed ? (
					<div
						className="flipper clickable-label"
						contentEditable={false}
						onClick={toggleCollapsed}
					>
						<label className="question-summary">Question (Click to Expand)</label>
					</div>
				) : (
					<div className="flipper question-editor">
						<div className="content-back">
							<div className="question-settings" contentEditable={false}>
								<label>Question Type</label>
								<select contentEditable={false} value={questionType} onChange={onSetAssessmentType}>
									<option value={MCASSESSMENT_NODE}>Multiple choice</option>
									<option value={NUMERIC_ASSESSMENT_NODE}>Input a number</option>
								</select>
								{questionType === MCASSESSMENT_NODE &&
								questionElement.content?.responseType === 'pick-all' ? (
									<React.Fragment>
										<span className="scoring-explanation">
											<MoreInfoButton>
												<div className="text-container">
													<p className="text">
														Students will earn partial credit based on how many of the correct
														answers they select.
													</p>
												</div>
											</MoreInfoButton>
										</span>
										<label className="question-type scoring" contentEditable={false}>
											<input type="checkbox" checked={partialScoring} onChange={onSetScoring} />
											Partial Scoring
										</label>
									</React.Fragment>
								) : null}
								<label className="question-type" contentEditable={false}>
									<input type="checkbox" checked={isTypeSurvey} onChange={onSetType} />
									Survey Only
								</label>
							</div>
							{props.children}
							{hasSolution ? null : (
								<div className="add-solution-container" contentEditable={false}>
									<Button className="add-solution" onClick={addSolution}>
										Add Explanation
									</Button>
								</div>
							)}
						</div>
					</div>
				)}
				<div className="button-parent">
					<Button className="collapse-button" onClick={toggleCollapsed} contentEditable={false}>
						{content.collapsed ? '+' : '-'}
					</Button>
					<Button className="delete-button" onClick={deleteNode} contentEditable={false}>
						×
					</Button>
				</div>
			</div>
		</Node>
	)
}

export default withSlateWrapper(Question)
