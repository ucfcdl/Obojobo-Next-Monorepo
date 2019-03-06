import { CHILD_TYPE_INVALID } from 'slate-schema-violations'

import Question from '../../../../ObojoboDraft/Chunks/Question/editor'
const QUESTION_NODE = 'ObojoboDraft.Chunks.Question'
const SOLUTION_NODE = 'ObojoboDraft.Chunks.Question.Solution'

describe('Question editor', () => {
	test('plugins.renderNode renders a question when passed', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: QUESTION_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Question.plugins.renderNode(props, null, jest.fn())).toMatchSnapshot()
	})

	test('plugins.renderNode renders a solution when passed', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: SOLUTION_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Question.plugins.renderNode(props, null, jest.fn())).toMatchSnapshot()
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

		expect(Question.plugins.renderNode(props, null, next)).toMatchSnapshot()
		expect(next).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children', () => {
		const editor = {
			removeNodeByKey: jest.fn(),
			insertNodeByKey: jest.fn()
		}

		editor.withoutNormalizing = jest.fn().mockImplementationOnce(funct => {
			funct(editor)
		})

		Question.plugins.schema.blocks[QUESTION_NODE].normalize(editor, {
			code: CHILD_TYPE_INVALID,
			node: {},
			child: {
				key: 'mockKey',
				object: 'text'
			},
			index: null
		})

		expect(editor.removeNodeByKey).toHaveBeenCalled()
		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize adds missing children', () => {
		const editor = {
			insertNodeByKey: jest.fn()
		}

		Question.plugins.schema.blocks[QUESTION_NODE].normalize(editor, {
			code: 'child_min_invalid',
			node: {
				nodes: { size: 0 }
			},
			child: null,
			index: 1
		})

		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize adds missing children at last node', () => {
		const editor = {
			insertNodeByKey: jest.fn()
		}

		Question.plugins.schema.blocks[QUESTION_NODE].normalize(editor, {
			code: 'child_min_invalid',
			node: {
				nodes: { size: 1 }
			},
			child: null,
			index: 1
		})

		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize adds missing children in solution', () => {
		const editor = {
			insertNodeByKey: jest.fn()
		}

		Question.plugins.schema.blocks[SOLUTION_NODE].normalize(editor, {
			code: 'child_min_invalid',
			node: {
				nodes: { size: 0 }
			},
			child: null,
			index: 0
		})

		expect(editor.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children in solution', () => {
		const editor = {
			wrapBlockByKey: jest.fn()
		}

		Question.plugins.schema.blocks[SOLUTION_NODE].normalize(editor, {
			code: CHILD_TYPE_INVALID,
			node: {},
			child: {
				key: 'mockKey',
				object: 'text'
			},
			index: null
		})

		expect(editor.wrapBlockByKey).toHaveBeenCalled()
	})
})
