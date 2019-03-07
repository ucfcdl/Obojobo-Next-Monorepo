import { Block } from 'slate'
import { CHILD_REQUIRED, CHILD_TYPE_INVALID } from 'slate-schema-violations'

const SETTINGS_NODE = 'ObojoboDraft.Sections.Assessment.Settings'
const RUBRIC_NODE = 'ObojoboDraft.Sections.Assessment.Rubric'
const ACTIONS_NODE = 'ObojoboDraft.Sections.Assessment.ScoreActions'
const QUESTION_BANK_NODE = 'ObojoboDraft.Chunks.QuestionBank'
const PAGE_NODE = 'ObojoboDraft.Pages.Page'

import ParameterNode from '../../../src/scripts/oboeditor/components/parameter-node'

const schema = {
	blocks: {
		'ObojoboDraft.Sections.Assessment': {
			nodes: [
				{ match: [{ type: SETTINGS_NODE }], min: 1, max: 1 },
				{ match: [{ type: PAGE_NODE }], min: 1, max: 1 },
				{ match: [{ type: QUESTION_BANK_NODE }], min: 1, max: 1 },
				{ match: [{ type: ACTIONS_NODE }], min: 1, max: 1 },
				{ match: [{ type: RUBRIC_NODE }], max: 1 }
			],
			normalize: (change, error) => {
				const { node, child, index } = error
				switch (error.code) {
					case CHILD_REQUIRED: {
						let block
						switch (index) {
							case 0:
								block = Block.create({
									type: SETTINGS_NODE
								})
								break
							case 1:
								block = Block.create({
									type: PAGE_NODE
								})
								break
							case 2:
								block = Block.create({
									type: QUESTION_BANK_NODE,
									data: { content: { choose: 1, select: 'sequential' } }
								})
								break
							case 3:
								block = Block.create({
									type: ACTIONS_NODE
								})
								break
						}
						return change.insertNodeByKey(node.key, index, block)
					}
					case CHILD_TYPE_INVALID: {
						switch (index) {
							case 0:
								return change.wrapBlockByKey(child.key, {
									type: SETTINGS_NODE
								})
							case 1:
								return change.wrapBlockByKey(child.key, {
									type: PAGE_NODE
								})
							case 2:
								return change.wrapBlockByKey(child.key, {
									type: QUESTION_BANK_NODE,
									data: { content: { choose: 1, select: 'sequential' } }
								})
							case 3:
								return change.wrapBlockByKey(child.key, {
									type: ACTIONS_NODE
								})
						}
					}
				}
			}
		},
		'ObojoboDraft.Sections.Assessment.Settings': {
			nodes: [{ match: [{ type: 'Parameter' }], min: 2, max: 2 }],
			normalize: (change, error) => {
				const { node, child, index } = error
				switch (error.code) {
					case CHILD_REQUIRED: {
						if (index === 0) {
							const block = Block.create(
								ParameterNode.helpers.oboToSlate({
									name: 'attempts',
									value: 'unlimited',
									display: 'Attempts'
								})
							)
							return change.insertNodeByKey(node.key, index, block)
						}
						const block = Block.create(
							ParameterNode.helpers.oboToSlate({
								name: 'review',
								value: 'never',
								display: 'Review',
								options: ['always', 'never', 'no-attempts-remaining']
							})
						)
						return change.insertNodeByKey(node.key, index, block)
					}
					case CHILD_TYPE_INVALID: {
						return change.withoutNormalization(c => {
							c.removeNodeByKey(child.key)
							if (index === 0) {
								const block = Block.create(
									ParameterNode.helpers.oboToSlate({
										name: 'attempts',
										value: 'unlimited',
										display: 'Attempts'
									})
								)
								return c.insertNodeByKey(node.key, index, block)
							}
							const block = Block.create(
								ParameterNode.helpers.oboToSlate({
									name: 'review',
									value: 'never',
									display: 'Review',
									options: ['always', 'never', 'no-attempts-remaining']
								})
							)
							return c.insertNodeByKey(node.key, index, block)
						})
					}
				}
			}
		}
	}
}

export default schema
