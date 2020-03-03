import React from 'react'
import Converter from './converter'

jest.mock('obojobo-document-engine/src/scripts/common/index', () => ({
	Registry: {
		getItemForType: () => ({
			slateToObo: args => ({ mock: 'slateToObo', args }),
			oboToSlate: args => ({ mock: 'oboToSlate', args })
		})
	},
	components: {
		modal: {
			SimpleDialog: () => 'SimpleDialog'
		}
	},
	util: {
		ModalUtil: {}
	}
}))

jest.mock(
	'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component',
	() => props => <div>{props.children}</div>
)
const SOLUTION_NODE = 'ObojoboDraft.Chunks.Question.Solution'
const MCASSESSMENT_NODE = 'ObojoboDraft.Chunks.MCAssessment'
const BREAK_NODE = 'ObojoboDraft.Chunks.Break'

describe('Question editor', () => {
	test('slateToObo converts a Slate node to an OboNode with content', () => {
		const slateNode = {
			key: 'mockKey',
			type: 'mockType',
			data: {
				get: () => null
			},
			nodes: [
				{
					type: 'oboeditor.component',
					nodes: [
						{
							type: 'mockNode'
						}
					]
				},
				{
					type: MCASSESSMENT_NODE
				},
				{
					type: SOLUTION_NODE,
					nodes: {
						get: () => ({
							type: 'oboeditor.component',
							nodes: [
								{
									type: 'mockNode'
								}
							]
						})
					}
				}
			]
		}
		const oboNode = Converter.slateToObo(slateNode)

		expect(oboNode).toMatchSnapshot()
	})

	test('oboToSlate converts an OboNode to a Slate node', () => {
		const oboNode = {
			id: 'mockKey',
			type: 'mockType',
			children: [
				{
					type: BREAK_NODE
				},
				{
					type: MCASSESSMENT_NODE
				}
			],
			content: { solution: {}, triggers: 'mock-triggers' }
		}
		const slateNode = Converter.oboToSlate(oboNode)

		expect(slateNode).toMatchSnapshot()
	})

	test('oboToSlate converts an OboNode to a Slate node without a solution', () => {
		const oboNode = {
			id: 'mockKey',
			type: 'mockType',
			children: [
				{
					type: BREAK_NODE
				},
				{
					type: MCASSESSMENT_NODE
				}
			],
			content: {}
		}
		const slateNode = Converter.oboToSlate(oboNode)

		expect(slateNode).toMatchSnapshot()
	})
})
