import { Block } from 'slate'
import { CHILD_REQUIRED, CHILD_TYPE_INVALID } from 'slate-schema-violations'

import ParameterNode from '../../../src/scripts/oboeditor/components/parameter-node'

const SETTINGS_NODE = 'ObojoboDraft.Chunks.MCAssessment.Settings'
const CHOICE_LIST_NODE = 'ObojoboDraft.Chunks.MCAssessment.ChoiceList'
const MCCHOICE_NODE = 'ObojoboDraft.Chunks.MCAssessment.MCChoice'

const schema = {
	blocks: {
		'ObojoboDraft.Chunks.MCAssessment': {
			nodes: [
				{
					match: [{ type: CHOICE_LIST_NODE }],
					min: 1,
					max: 1
				},
				{
					match: [{ type: SETTINGS_NODE }],
					min: 1,
					max: 1
				}
			],
			normalize: (change, error) => {
				const { node, child, index } = error
				switch (error.code) {
					case CHILD_REQUIRED: {
						if (index === 0) {
							const block = Block.create({
								type: CHOICE_LIST_NODE
							})
							return change.insertNodeByKey(node.key, index, block)
						}

						const block = Block.create({
							type: SETTINGS_NODE
						})
						return change.insertNodeByKey(node.key, index, block)
					}
					case CHILD_TYPE_INVALID: {
						if (index === 0) {
							const block = Block.create({
								type: CHOICE_LIST_NODE
							})
							return change.wrapBlockByKey(child.key, block)
						}

						const block = Block.create({
							type: SETTINGS_NODE
						})
						return change.wrapBlockByKey(child.key, block)
					}
				}
			}
		},
		'ObojoboDraft.Chunks.MCAssessment.ChoiceList': {
			nodes: [
				{
					match: [{ type: MCCHOICE_NODE }],
					min: 1
				}
			],
			normalize: (change, error) => {
				const { node, child, index } = error
				switch (error.code) {
					case CHILD_REQUIRED: {
						const block = Block.create({
							type: MCCHOICE_NODE,
							data: { content: { score: 0 } }
						})
						return change.insertNodeByKey(node.key, index, block)
					}
					case CHILD_TYPE_INVALID: {
						const block = Block.create({
							type: MCCHOICE_NODE,
							data: { content: { score: 0 } }
						})
						return change.wrapBlockByKey(child.key, block)
					}
				}
			}
		},
		'ObojoboDraft.Chunks.MCAssessment.Settings': {
			nodes: [
				{
					match: [{ type: 'Parameter' }],
					min: 2,
					max: 2
				}
			],
			normalize: (change, error) => {
				const { node, child, index } = error
				switch (error.code) {
					case CHILD_REQUIRED: {
						if (index === 0) {
							const block = Block.create(
								ParameterNode.helpers.oboToSlate({
									name: 'responseType',
									value: 'Pick One',
									display: 'Response Type',
									options: ['pick-one', 'pick-all']
								})
							)
							return change.insertNodeByKey(node.key, index, block)
						}
						const block = Block.create(
							ParameterNode.helpers.oboToSlate({
								name: 'shuffle',
								value: true,
								display: 'Shuffle',
								checked: true
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
										name: 'responseType',
										value: 'Pick One',
										display: 'Response Type',
										options: ['pick-one', 'pick-all']
									})
								)
								return c.insertNodeByKey(node.key, index, block)
							}
							const block = Block.create(
								ParameterNode.helpers.oboToSlate({
									name: 'shuffle',
									value: true,
									display: 'Shuffle',
									checked: true
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
