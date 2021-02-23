import React from 'react'
import { mount } from 'enzyme'
import renderer from 'react-test-renderer'
import { Registry } from 'obojobo-document-engine/src/scripts/common/registry'
import QuestionBank from './editor-component'

import ModalUtil from 'obojobo-document-engine/src/scripts/common/util/modal-util'
jest.mock('obojobo-document-engine/src/scripts/common/util/modal-util')
import OboModel from 'obojobo-document-engine/src/scripts/common/models/obo-model'
jest.mock('obojobo-document-engine/src/scripts/common/models/obo-model')
import { Transforms } from 'slate'
jest.mock('slate')
import { ReactEditor } from 'slate-react'
jest.mock('slate-react')
jest.mock('./icon', () => global.mockReactComponent(this, 'Icon'))
jest.mock('./converter', () => ({ mock: 'converter' }))
jest.mock('obojobo-document-engine/src/scripts/common/registry', () => ({
	Registry: {
		registerModel: jest.fn(),
		getItemForType: jest.fn()
	}
}))
jest.mock(
	'obojobo-document-engine/src/scripts/oboeditor/components/node/with-slate-wrapper',
	() => item => item
)
jest.mock(
	'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component',
	() => props => <div>{props.children}</div>
)

jest.useFakeTimers()

describe('QuestionBank editor', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		ReactEditor.findPath.mockReturnValue('mock-path')
	})

	test('QuestionBank builds the expected component', () => {
		const props = {
			node: {
				data: {
					get: () => {
						return {}
					}
				}
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			element: { content: {} }
		}

		const component = renderer.create(<QuestionBank {...props} />)
		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('QuestionBank component changes to choose all', () => {
		const props = {
			element: {
				content: { choose: 8, select: 'sequential', chooseAll: false }
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			}
		}

		const component = mount(<QuestionBank {...props} />)
		const pickSomeRadioInput = component.find({ type: 'radio', value: 'pick' })
		pickSomeRadioInput.simulate('click')
		pickSomeRadioInput.simulate('change', { target: { value: 'all' } })

		expect(component.html()).toMatchSnapshot()
	})

	test('QuestionBank component changes choose amount', () => {
		const props = {
			element: {
				content: { choose: 8, select: 'sequential', chooseAll: false }
			},
			editor: {
				toggleEditable: jest.fn()
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			}
		}

		const component = mount(<QuestionBank {...props} />)

		// make sure the pick input is set to 8 based on props
		const pickCountInput = component.find({ type: 'number' })
		expect(pickCountInput.props()).toHaveProperty('value', 8)

		const pickSomeRadioInput = component.find({ type: 'radio', value: 'pick' })
		pickSomeRadioInput.simulate('click')
		pickSomeRadioInput.simulate('change', { target: { value: 'pick' } })

		pickCountInput.simulate('focus')
		pickCountInput.simulate('click')
		pickCountInput.simulate('change', { target: { value: '7' } })
		pickCountInput.simulate('blur')
		jest.runAllTimers()

		expect(component.html()).toMatchSnapshot()
	})

	test('QuestionBank component changes select type', () => {
		const props = {
			element: {
				content: { choose: '8', select: 'sequential' }
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			}
		}

		const component = mount(<QuestionBank {...props} />)

		const questionChooseMethodSelectInput = component.find('select')
		questionChooseMethodSelectInput.simulate('click')
		questionChooseMethodSelectInput.simulate('change', { target: { value: 'pick' } })

		expect(component.html()).toMatchSnapshot()
	})

	test('QuestionBank component deletes self', () => {
		Registry.getItemForType.mockReturnValueOnce({
			insertJSON: {
				type: 'Mock'
			}
		})

		const props = {
			node: {
				data: {
					data: {
						get: () => {
							return { choose: 8, select: 'sequential' }
						}
					}
				}
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {
				removeNodeByKey: jest.fn()
			},
			element: {
				content: { choose: 8, select: 'sequential' }
			}
		}

		const component = mount(<QuestionBank {...props} />)

		const deleteButton = component.find({ children: '×' }).at(1)
		deleteButton.simulate('click')

		expect(Transforms.removeNodes).toHaveBeenCalled()
	})

	test('QuestionBank component adds question', () => {
		const props = {
			element: {
				content: {},
				children: ['child1', 'child2'] // add children to test insertNode location
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {}
		}

		ReactEditor.findPath.mockReturnValue(['mock-path'])
		const component = mount(<QuestionBank {...props} />)

		const addQuestionButton = component.find({ children: 'Add Question' }).at(1)
		addQuestionButton.simulate('click')

		// note at is testing that we're using findPath and concatnating with length of children
		// to place the new question at th end
		expect(Transforms.insertNodes).toHaveBeenCalledWith(
			{},
			{ type: 'Mock' },
			{ at: ['mock-path', 2] }
		)
	})

	test('QuestionBank component adds question bank', () => {
		const props = {
			element: {
				content: {},
				children: ['child1'] // add children to test insertNode location
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {}
		}

		ReactEditor.findPath.mockReturnValue(['mock-path'])

		const component = mount(<QuestionBank {...props} />)
		const addQBButton = component.find({ children: 'Add Question Bank' }).at(1)
		addQBButton.simulate('click')

		// note at is testing that we're using findPath and concatnating with length of children
		// to place the new question at th end
		expect(Transforms.insertNodes).toHaveBeenCalledWith(
			{},
			expect.objectContaining({ type: 'ObojoboDraft.Chunks.QuestionBank' }),
			{ at: ['mock-path', 1] }
		)
	})

	test('QuestionBank component sets properties', () => {
		const props = {
			element: {
				content: {},
				children: []
			},
			editor: {},
			selected: true
		}

		ReactEditor.findPath.mockReturnValueOnce([])

		const component = mount(<QuestionBank {...props} />)

		component.setProps({ selected: false })
		jest.runAllTimers()
		expect(Transforms.setNodes).toHaveBeenCalled()
	})

	test('QuestionBank component adds questions', () => {
		const props = {
			element: {
				content: {},
				children: []
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {}
		}

		ReactEditor.findPath.mockReturnValueOnce([])

		// Use QuestionBank.type to bypass memo()
		const component = mount(<QuestionBank.type {...props} />)

		component.instance().importQuestionList([{}])
		expect(Transforms.insertNodes).toHaveBeenCalledWith({}, {}, { at: [0] })
	})

	test('QuestionBank component call getQuestionList', () => {
		const props = {
			element: {
				content: {},
				children: []
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {}
		}

		ReactEditor.findPath.mockReturnValueOnce([])

		// Use QuestionBank.type to bypass memo()
		const component = mount(<QuestionBank.type {...props} />)

		let root = {
			get: () => 'mock_type',
			children: []
		}
		expect(component.instance().getQuestionList(root)).toHaveLength(0)

		root = {
			get: () => 'mock_type',
			children: [
				{
					get: () => 'ObojoboDraft.Chunks.Question',
					children: []
				}
			]
		}
		expect(component.instance().getQuestionList(root)).toHaveLength(1)
	})

	test('QuestionBank component displays ImportQuestionModal', () => {
		const props = {
			element: {
				content: {},
				children: []
			},
			node: {
				key: 'mock_key'
			},
			parent: {
				getPath: () => ({
					get: () => 0
				}),
				nodes: {
					size: 2
				}
			},
			editor: {}
		}

		ReactEditor.findPath.mockReturnValueOnce([])
		OboModel.getRoot.mockReturnValueOnce({
			get: () => 'ObojoboDraft.Chunks.Question',
			attributes: {}
		})
		Registry.getItemForType.mockReturnValueOnce({
			oboToSlate: () => {}
		})
		// Use QuestionBank.type to bypass memo()
		const component = mount(<QuestionBank.type {...props} />)

		component.instance().diplayImportQuestionModal()
		expect(ModalUtil.show).toHaveBeenCalled()
	})
})
