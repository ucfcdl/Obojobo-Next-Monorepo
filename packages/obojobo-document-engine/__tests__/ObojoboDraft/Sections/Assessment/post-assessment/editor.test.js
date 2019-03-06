/* eslint no-undefined: 0 */

import React from 'react'
import { shallow } from 'enzyme'
import renderer from 'react-test-renderer'
import { CHILD_TYPE_INVALID } from 'slate-schema-violations'

jest.mock('../../../../../ObojoboDraft/Pages/Page/editor')

import Actions from '../../../../../ObojoboDraft/Sections/Assessment/post-assessment/editor'
const ACTIONS_NODE = 'ObojoboDraft.Sections.Assessment.ScoreActions'
const SCORE_NODE = 'ObojoboDraft.Sections.Assessment.ScoreAction'

describe('Actions editor', () => {
	test('Node component', () => {
		const Node = Actions.components.Node
		const component = renderer.create(
			<Node
				node={{
					data: {
						get: () => {
							return {}
						}
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Node component adds child', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)

		const editor = {
			insertNodeByKey: jest.fn()
		}

		const Node = Actions.components.Node
		const component = shallow(
			<Node
				node={{
					data: {
						get: () => {
							return {}
						}
					},
					nodes: { size: 0 }
				}}
				editor={editor}
			/>
		)
		const tree = component.html()

		component.find('button').simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('Score component', () => {
		const Node = Actions.components.Score
		const component = renderer.create(
			<Node
				node={{
					data: {
						get: () => {
							return {}
						}
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Score component edits range', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)

		const editor = {
			setNodeByKey: jest.fn()
		}

		const Node = Actions.components.Score
		const component = shallow(
			<Node
				node={{
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={editor}
			/>
		)
		const tree = component.html()

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('Score component deletes self', () => {
		const editor = {
			removeNodeByKey: jest.fn()
		}

		const Node = Actions.components.Score
		const component = shallow(
			<Node
				node={{
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={editor}
			/>
		)
		const tree = component.html()

		component
			.find('button')
			.at(1)
			.simulate('click')

		expect(tree).toMatchSnapshot()
		expect(editor.removeNodeByKey).toHaveBeenCalled()
	})

	test('slateToObo converts a Slate node to an OboNode with content', () => {
		const slateNode = {
			key: 'mockKey',
			type: 'mockType',
			data: {
				get: () => {
					return null
				}
			},
			nodes: [
				{
					data: {
						get: () => {
							return {}
						}
					},
					nodes: [
						{
							key: 'mockPage'
						}
					]
				}
			]
		}
		const oboNode = Actions.helpers.slateToObo(slateNode)

		expect(oboNode).toMatchSnapshot()
	})

	test('oboToSlate converts an OboComponent to a Slate node', () => {
		const oboNode = [
			{
				for: 'dummyRange',
				page: 'dummyPage'
			}
		]
		const slateNode = Actions.helpers.oboToSlate(oboNode)

		expect(slateNode).toMatchSnapshot()
	})

	test('plugins.renderNode renders all actions when passed', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: ACTIONS_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Actions.plugins.renderNode(props, null, jest.fn())).toMatchSnapshot()
	})

	test('plugins.renderNode renders a score action when passed', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: SCORE_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Actions.plugins.renderNode(props, null, jest.fn())).toMatchSnapshot()
	})

	test('plugins.renderNode calls next', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: 'mockNode',
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		const next = jest.fn()

		expect(Actions.plugins.renderNode(props, null, next)).toMatchSnapshot()
		expect(next).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children', () => {
		const editor = {
			wrapBlockByKey: jest.fn()
		}

		Actions.plugins.schema.blocks[SCORE_NODE].normalize(editor, {
			code: CHILD_TYPE_INVALID,
			node: null,
			child: { key: 'mockKey' },
			index: null
		})

		expect(editor.wrapBlockByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize adds missing children', () => {
		const editor = {
			insertNodeByKey: jest.fn()
		}

		Actions.plugins.schema.blocks[SCORE_NODE].normalize(editor, {
			code: 'child_min_invalid',
			node: { key: 'mockKey' },
			child: null,
			index: 0
		})

		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children', () => {
		const editor = {
			wrapBlockByKey: jest.fn()
		}

		Actions.plugins.schema.blocks[ACTIONS_NODE].normalize(editor, {
			code: CHILD_TYPE_INVALID,
			node: null,
			child: { key: 'mockKey' },
			index: null
		})

		expect(editor.wrapBlockByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize adds missing children', () => {
		const editor = {
			insertNodeByKey: jest.fn()
		}

		Actions.plugins.schema.blocks[ACTIONS_NODE].normalize(editor, {
			code: 'child_min_invalid',
			node: { key: 'mockKey' },
			child: null,
			index: 0
		})

		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})
})
