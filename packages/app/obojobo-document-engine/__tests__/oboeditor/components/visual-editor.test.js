import { mount } from 'enzyme'
import renderer from 'react-test-renderer'
import VisualEditor from 'src/scripts/oboeditor/components/visual-editor'
import React from 'react'
import mockConsole from 'jest-mock-console'
import Common from 'src/scripts/common'
import Component from 'src/scripts/oboeditor/components/node/editor'
import EditorUtil from 'src/scripts/oboeditor/util/editor-util'
import ModalStore from '../../../src/scripts/common/stores/modal-store'
import Dispatcher from '../../../src/scripts/common/flux/dispatcher'
import OboModel from 'src/scripts/common/models/obo-model'
import { FULL } from 'obojobo-express/server/constants'

import { Editor, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
// jest.mock('slate')
jest.mock('src/scripts/viewer/util/editor-api')
jest.mock('src/scripts/common/util/modal-util')
jest.mock('src/scripts/oboeditor/components/node/editor', () => ({
	helpers: {
		slateToObo: jest.fn(),
		oboToSlate: jest.fn().mockReturnValue({ text: '' })
	}
}))
jest.mock('src/scripts/common/models/obo-model')
// Editor Store
jest.mock('src/scripts/oboeditor/stores/editor-store', () => ({
	state: { startingId: 'mock-id' }
}))

jest.mock('src/scripts/oboeditor/util/editor-util')
jest.mock('src/scripts/oboeditor/components/navigation/editor-nav')
jest.mock('src/scripts/oboeditor/components/toolbars/paragraph-styles')
jest.mock('src/scripts/oboeditor/components/toolbars/file-toolbar-viewer', () => props => (
	<div {...props} className={'mockFileToolbarViewer'} />
))
jest.mock('src/scripts/oboeditor/components/hovering-preview', () => props => (
	<div {...props} className={'mockHoveringPreview'} />
))

const CONTENT_NODE = 'ObojoboDraft.Sections.Content'
const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'
const BREAK_NODE = 'ObojoboDraft.Chunks.Break'
let restoreConsole

describe('VisualEditor', () => {
	let props

	const defaultProps = {
		page: {
			id: 122,
			set: jest.fn(),
			attributes: {
				children: [
					{
						type: BREAK_NODE,
						content: {},
						children: []
					}
				]
			},
			get: jest.fn().mockReturnValue(ASSESSMENT_NODE),
			toJSON: () => ({
				children: [
					{
						type: BREAK_NODE,
						content: {},
						children: []
					}
				]
			})
		},
		model: { title: 'Mock Title' },
		draft: { accessLevel: FULL }
	}

	beforeEach(() => {
		jest.clearAllMocks()
		jest.restoreAllMocks()
		jest.resetModules()
		restoreConsole = mockConsole('error')
		jest.spyOn(ReactEditor, 'focus').mockReturnValue(true)
		jest.spyOn(Common.Registry, 'getItems').mockImplementation(fn =>
			fn([
				{
					plugins: {
						normalizeNode: jest.fn(),
						isVoid: jest.fn()
					}
				}
			])
		)
		Editor.marks = jest.fn().mockReturnValue({})

		props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			model: { title: 'Mock Title' },
			draft: { accessLevel: FULL }
		}
	})

	afterEach(() => {
		restoreConsole()
	})

	test('VisualEditor component', () => {
		const component = renderer.create(<VisualEditor {...props} />)
		expect(component.toJSON()).toMatchSnapshot()
	})

	test('VisualEditor component handles triple click', () => {
		const spy = jest.spyOn(Transforms, 'move').mockReturnValueOnce(true)
		const component = mount(<VisualEditor {...props} />)

		// Double click
		component
			.find('.obojobo-draft--pages--page')
			.at(0)
			.simulate('click', { detail: 2 })
		expect(spy).not.toHaveBeenCalled()

		// Selection does not end at the beginning
		component.instance().editor.selection.focus.offset = 1
		component
			.find('.obojobo-draft--pages--page')
			.at(0)
			.simulate('click', { detail: 3 })
		expect(spy).not.toHaveBeenCalled()

		// Selection ends at the beginning
		component.instance().editor.selection.focus.offset = 0
		component
			.find('.obojobo-draft--pages--page')
			.at(0)
			.simulate('click', { detail: 3 })
		expect(spy).toHaveBeenCalled()
	})

	test('VisualEditor component - editor is disable when modal is opened', () => {
		ModalStore.init()

		const component = renderer.create(<VisualEditor {...props} />)

		Dispatcher.trigger('modal:show', { value: 'mockValue' })
		expect(component.getInstance().state.editable).toEqual(false)
	})

	test('VisualEditor component - editor is disable when modal is closed', () => {
		ModalStore.init()

		const component = renderer.create(<VisualEditor {...props} />)

		Dispatcher.trigger('modal:hide', { value: 'mockValue' })
		expect(component.getInstance().state.editable).toEqual(true)
	})

	test('VisualEditor component with decoration', () => {
		jest.spyOn(Common.Registry, 'getItemForType').mockReturnValue({
			plugins: {
				decorate: () => [
					{
						placeholder: 'Type your label here',
						anchor: { path: [0, 0], offset: 0 },
						focus: { path: [0, 0], offset: 0 }
					}
				]
			}
		})
		const component = mount(<VisualEditor {...props} />)
		expect(
			component.instance().decorate([
				{
					type: BREAK_NODE,
					children: [{ text: '' }]
				},
				[0]
			])
		).toMatchSnapshot()
	})

	test('VisualEditor component with Elements', () => {
		jest.spyOn(Common.Registry, 'getItemForType').mockReturnValue({
			plugins: {
				renderNode: () => <p>Mock Content</p> //eslint-disable-line react/display-name
			}
		})
		const component = mount(<VisualEditor {...props} />)
		expect(
			component.instance().renderElement({
				element: {
					type: 'a',
					href: 'mockLink',
					children: [{ text: '' }]
				},
				children: ''
			})
		).toMatchSnapshot()

		expect(
			component.instance().renderElement({
				element: {
					type: 'mock Element',
					href: 'mockLink',
					children: [{ text: '' }]
				},
				children: ''
			})
		).toMatchSnapshot()
	})

	test('VisualEditor component with no page', () => {
		props.page = null

		const component = renderer.create(<VisualEditor {...props} />)
		expect(component.toJSON()).toMatchSnapshot()
	})

	test('updating a component with no page doesnt update state', () => {
		props.page = null

		const thing = renderer.create(<VisualEditor {...props} />)

		const instance = thing.getInstance()
		const spyImport = jest.spyOn(instance, 'importFromJSON')
		const spyExport = jest.spyOn(instance, 'exportToJSON')
		instance.componentDidUpdate(props)
		expect(spyImport).not.toHaveBeenCalled()
		expect(spyExport).not.toHaveBeenCalled()
	})

	test('updating a component from no page to a page updates state', () => {
		props.page.toJSON = () => ({ children: [{ type: 'mockNode' }], type: ASSESSMENT_NODE })

		jest.spyOn(Common.Registry, 'getItemForType').mockReturnValue({
			oboToSlate: () => ({ text: '' })
		})
		const thing = renderer.create(<VisualEditor {...props} />)

		const instance = thing.getInstance()
		const spyImport = jest.spyOn(instance, 'importFromJSON')
		const spyExport = jest.spyOn(instance, 'exportToJSON')
		const spyState = jest.spyOn(instance, 'setState')
		instance.componentDidUpdate({})
		expect(spyImport).toHaveBeenCalledTimes(1)
		expect(spyState).toHaveBeenCalledTimes(1)
		expect(spyExport).not.toHaveBeenCalled()
	})

	test('updating a component from a page to no page updates state', () => {
		props.page = null

		const thing = renderer.create(<VisualEditor {...props} />)

		const instance = thing.getInstance()
		const spyImport = jest.spyOn(instance, 'importFromJSON')
		const spyExport = jest.spyOn(instance, 'exportToJSON')
		const spyState = jest.spyOn(instance, 'setState')
		instance.componentDidUpdate({ page: true })
		expect(spyImport).not.toHaveBeenCalled()
		expect(spyState).toHaveBeenCalledTimes(1)
		expect(spyExport).not.toHaveBeenCalled()
	})

	test('VisualEditor component changes pages', () => {
		props.page = {
			id: 1,
			set: jest.fn(),
			attributes: {
				children: [{ type: 'mockNode' }]
			},
			get: jest.fn(),
			toJSON: () => ({ children: [{ type: 'mockNode' }] })
		}

		let thing
		renderer.act(() => {
			thing = renderer.create(<VisualEditor {...props} />)
		})

		expect(thing.toJSON()).toMatchSnapshot()

		renderer.act(() => {
			props.page.id = 2
			thing.update(<VisualEditor {...props} />)
		})

		expect(thing.toJSON()).toMatchSnapshot()
	})

	test('VisualEditor component with deleted page to another page', () => {
		const prevProps = defaultProps

		const newProps = {
			...defaultProps,
			page: {
				...defaultProps.page,
				id: 123,
				get: jest.fn()
			}
		}

		const spy = jest.spyOn(VisualEditor.prototype, 'exportToJSON').mockReturnValueOnce()

		// render
		const thing = mount(<VisualEditor {...prevProps} />)
		thing.setProps(newProps)
		thing.update()

		// save action should have occured
		expect(spy).not.toHaveBeenCalled()
		spy.mockClear()
	})

	test('VisualEditor component with page updating to another page', () => {
		OboModel.models = { 122: 'mock content' }
		const prevProps = defaultProps

		const newProps = {
			...defaultProps,
			page: {
				...defaultProps.page,
				id: 123,
				get: jest.fn()
			}
		}

		const spy = jest.spyOn(VisualEditor.prototype, 'exportToJSON')
		spy.mockReturnValueOnce() // override the default method

		// render
		const thing = mount(<VisualEditor {...prevProps} />)

		// get a copy of state
		const prevState = thing.state()

		// update to the second page
		thing.setProps(newProps)
		thing.update()

		// save action should have occured
		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy).toHaveBeenCalledWith(prevProps.page, prevState.value)
		spy.mockClear()
	})

	test('VisualEditor component refocuses on editor', () => {
		props.insertableItems = null

		jest.spyOn(ReactEditor, 'focus').mockReturnValue(true)
		const component = mount(<VisualEditor {...props} />)

		ReactEditor.focus.mockClear()

		component.find('.skip-nav button').simulate('click')

		expect(ReactEditor.focus).toHaveBeenCalledTimes(1)
	})

	test('VisualEditor component alters value majorly', () => {
		const component = mount(<VisualEditor {...props} />)

		const value = [
			{
				type: 'mocknode',
				children: [{ text: '' }]
			}
		]

		component.instance().onChange(value)
	})

	test('VisualEditor component alters value majorly with multi-select', () => {
		jest.spyOn(ReactEditor, 'isFocused').mockReturnValue(true)
		window.getSelection = jest.fn().mockReturnValue({
			getRangeAt: () => ({
				commonAncestorContainer: {
					parentNode: {
						tagName: 'fakeTag',
						getBoundingClientRect: () => ({})
					}
				}
			})
		})
		const component = mount(<VisualEditor {...props} />)

		const value = [
			{
				type: 'mocknode',
				children: [{ text: '' }]
			}
		]

		component.instance().onChange(value)
	})

	test('VisualEditor component alters value majorly with latex', () => {
		jest.spyOn(ReactEditor, 'isFocused').mockReturnValue(true)
		window.getSelection = jest.fn().mockReturnValue({
			getRangeAt: () => ({
				commonAncestorContainer: {
					parentNode: {
						tagName: 'span',
						getBoundingClientRect: () => ({})
					}
				}
			})
		})
		const component = mount(<VisualEditor {...props} />)

		const value = [
			{
				type: 'mocknode',
				children: [{ text: '' }]
			}
		]

		component.instance().onChange(value)
	})

	test('toggleEditable changes the state', () => {
		const component = mount(<VisualEditor {...props} />)
		const inst = component.instance()

		inst.toggleEditable(false)

		expect(component.state()).toMatchInlineSnapshot(`
		Object {
		  "addObjective": [Function],
		  "contentRect": null,
		  "editable": false,
		  "elapsed": 0,
		  "intervalId": 108,
		  "lastSaved": null,
		  "objectives": Array [],
		  "removeObjective": [Function],
		  "saveState": "saveSuccessful",
		  "showPlaceholders": true,
		  "unsavedChanges": false,
		  "updateObjective": [Function],
		  "value": Array [
		    Object {
		      "text": "",
		    },
		  ],
		}
	`)
	})

	test('markUnsaved changes the state', () => {
		const component = mount(<VisualEditor {...props} />)
		const inst = component.instance()

		inst.markUnsaved()

		expect(component.state()).toMatchInlineSnapshot(`
		Object {
		  "addObjective": [Function],
		  "contentRect": null,
		  "editable": true,
		  "elapsed": 0,
		  "intervalId": 114,
		  "lastSaved": null,
		  "objectives": Array [],
		  "removeObjective": [Function],
		  "saveState": "",
		  "showPlaceholders": true,
		  "unsavedChanges": false,
		  "updateObjective": [Function],
		  "value": Array [
		    Object {
		      "text": "",
		    },
		  ],
		}
	`)
	})

	test('changes the Editor title', () => {
		const props = {
			saveDraft: jest.fn().mockResolvedValue(true),
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				},
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			draftId: 'mock-draft-id',
			model: {
				id: 'mock-draft-id',
				title: 'Mock Title',
				children: [
					{
						get: () => ASSESSMENT_NODE,
						children: []
					},
					{
						get: () => CONTENT_NODE,
						flatJSON: () => {
							return { content: {}, children: [] }
						},
						children: {
							models: [
								{
									get: () => null
								}
							]
						}
					},
					{
						get: () => 'mockNode'
					}
				],
				flatJSON: () => {
					return { content: {}, children: [] }
				}
			},
			draft: { accessLevel: FULL }
		}

		const saveModule = jest.spyOn(VisualEditor.prototype, 'saveModule')

		// render
		const thing = mount(<VisualEditor {...props} />)

		// simulate clicking on the input
		thing.find('.editor--components--editor-title-input').simulate('change', {
			target: { value: 'mock new title' }
		})

		thing.find('.editor--components--editor-title-input').simulate('blur')

		// verify save and rename are called
		expect(EditorUtil.renameModule).toHaveBeenCalledWith('mock-draft-id', 'mock new title')
		expect(saveModule).toHaveBeenCalledWith('mock-draft-id')
	})

	test('can not change the Editor title to blank', () => {
		const props = {
			saveDraft: jest.fn().mockResolvedValue(true),
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				},
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			draftId: 'mock-draft-id',
			model: {
				id: 'mock-draft-id',
				title: 'Mock Title',
				children: [
					{
						get: () => ASSESSMENT_NODE,
						children: []
					},
					{
						get: () => CONTENT_NODE,
						flatJSON: () => {
							return { content: {}, children: [] }
						},
						children: {
							models: [
								{
									get: () => null
								}
							]
						}
					},
					{
						get: () => 'mockNode'
					}
				],
				flatJSON: () => {
					return { content: {}, children: [] }
				}
			},
			draft: { accessLevel: FULL }
		}

		const saveModule = jest.spyOn(VisualEditor.prototype, 'saveModule')

		// render
		const thing = mount(<VisualEditor {...props} />)

		// simulate changing the title input
		thing.find('.editor--components--editor-title-input').simulate('change', {
			target: { value: '	' }
		})

		thing.find('.editor--components--editor-title-input').simulate('blur')

		// verify save and rename are not called
		expect(EditorUtil.renameModule).not.toHaveBeenCalled()
		expect(saveModule).not.toHaveBeenCalled()

		// verify input aria-invalid tag is set and warning div exists
		expect(
			thing
				.find('input')
				.at(0)
				.props()['aria-invalid']
		).toBe(true)
		expect(thing.find('.empty-title-warning').length).toBe(1)
	})

	test('Ensures the plugins work as expected', () => {
		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				id: 2,
				set: jest.fn(),
				attributes: {
					children: [
						{
							type: BREAK_NODE,
							content: {},
							children: []
						}
					]
				},
				get: jest.fn(),
				children: {
					reset: jest.fn()
				},
				toJSON: () => ({
					children: [
						{
							type: BREAK_NODE,
							content: {},
							children: []
						}
					]
				})
			},
			model: {
				title: 'mockTitle',
				children: [
					{
						get: () => ASSESSMENT_NODE,
						children: []
					},
					{
						get: () => CONTENT_NODE,
						flatJSON: () => {
							return { content: {}, children: [] }
						},
						children: {
							models: [
								{
									get: () => null
								}
							]
						}
					},
					{
						get: () => 'mockNode'
					}
				],
				flatJSON: () => {
					return { content: {}, children: [] }
				}
			},
			draft: { accessLevel: FULL }
		}
		const component = mount(<VisualEditor {...props} />)
		const plugins = component.instance().plugins

		component.instance().editor.normalizeNode([{}, [0]])
		component.instance().editor.isVoid({})
		component.instance().editor.insertData({
			types: ['application/x-slate-fragment'],
			getData: jest.fn()
		})

		component.unmount()

		expect(plugins).toMatchSnapshot()
	})

	test('draft saves to local storage every 10 seconds', () => {
		jest.useFakeTimers();

		const saveModuleToLocalStorage = jest.spyOn(VisualEditor.prototype, 'saveModuleToLocalStorage');

		expect(setInterval).toHaveBeenCalledTimes(1);
		expect(setInterval).toHaveBeenLastCalledWith(expect(saveModuleToLocalStorage), 10000);
	})

	test('lastSaved displays in toolbar after save', () => {
		const component = mount(<VisualEditor {...props}/>)

	})

	test('exportToJSON returns expected json for assessment node', () => {
		const spy = jest.spyOn(Common.Registry, 'getItemForType')
		spy.mockReturnValueOnce({
			slateToObo: jest.fn().mockReturnValue({
				children: ['mock-children'],
				content: 'mock-content'
			})
		})

		const page = {
			get: () => 'ObojoboDraft.Sections.Assessment',
			set: jest.fn(),
			children: {
				reset: jest.fn()
			},
			toJSON: () => ({
				type: 'ObojoboDraft.Sections.Assessment',
				children: [{ type: 'mock node' }]
			})
		}

		const value = {
			document: {
				nodes: {
					get: () => ({
						children: 'mock-children',
						content: 'mock-content'
					})
				}
			}
		}

		const thing = mount(<VisualEditor {...props} />)

		expect(thing.instance()).toHaveProperty('exportToJSON', expect.any(Function))

		const result = thing.instance().exportToJSON(page, value)
		expect(result).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    "mock-children",
		  ],
		  "content": "mock-content",
		}
	`)

		expect(page.set).toHaveBeenCalledWith('children', ['mock-children'])
		expect(page.set).toHaveBeenCalledWith('content', 'mock-content')
	})

	test('exportToJSON returns expected json for page node', () => {
		const spy = jest.spyOn(Common.Registry, 'getItemForType')
		spy.mockReturnValueOnce({
			slateToObo: jest.fn().mockReturnValue({
				children: 'mock-children',
				content: 'mock-content'
			})
		})

		Component.helpers.slateToObo.mockReturnValue('mock-converted-node-value')

		const page = {
			get: () => 'will-result-in-else-path-taken',
			set: jest.fn(),
			children: {
				reset: jest.fn()
			},
			toJSON: () => ({ children: [{ type: 'mock node' }] })
		}

		const value = ['node-one', 'node-two']

		const thing = mount(<VisualEditor {...props} />)

		expect(thing.instance()).toHaveProperty('exportToJSON', expect.any(Function))

		const result = thing.instance().exportToJSON(page, value)

		// make sure the nodes are passed to the converter
		expect(Component.helpers.slateToObo).toHaveBeenCalledTimes(2)
		expect(Component.helpers.slateToObo).toHaveBeenCalledWith('node-one')
		expect(Component.helpers.slateToObo).toHaveBeenCalledWith('node-two')

		// make sure the updated children are set on the page
		expect(page.set).toHaveBeenCalledTimes(1)
		expect(page.set).toHaveBeenCalledWith('children', [
			'mock-converted-node-value',
			'mock-converted-node-value'
		])

		// make sure the return matches
		expect(result).toMatchInlineSnapshot(`
				Object {
				  "children": Array [
				    "mock-converted-node-value",
				    "mock-converted-node-value",
				  ],
				}
		`)
	})

	test('exportToJSON returns undefined for null page', () => {
		const thing = mount(<VisualEditor {...props} />)

		expect(thing.instance()).toHaveProperty('exportToJSON', expect.any(Function))

		const result = thing.instance().exportToJSON(null)

		// make sure the return matches
		expect(result).toMatchInlineSnapshot(`undefined`)
	})

	test('checkIfSaved return', () => {
		const eventMap = {}
		window.addEventListener = jest.fn((event, cb) => {
			eventMap[event] = cb
		})
		window.getSelection = jest.fn().mockReturnValueOnce({ rangeCount: 0 })

		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] })
			},
			model: { title: 'Mock Title' },
			draft: { accessLevel: FULL }
		}
		const component = mount(<VisualEditor {...props} />)

		// eslint-disable-next-line no-undefined
		expect(eventMap.beforeunload({})).toEqual(undefined)

		component.setState({ saveState: '' })

		expect(eventMap.beforeunload({})).toEqual(true)

		component.unmount()
	})

	test('addObjective adds new objective to state', () => {
		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			model: { title: 'Mock Title' },
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		expect(component.instance().state.objectives).toEqual([])

		component.instance().addObjective('mock-objective')
		expect(component.instance().state.objectives).toEqual(['mock-objective'])
	})

	test('removeObjective removes objective from state', () => {
		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			model: {
				title: 'Mock Title',
				objectives: [
					{
						objectiveId: 'mock-id',
						objectiveLabel: 'mock-label',
						description: 'mock-description'
					},
					{
						objectiveId: 'mock-id2',
						objectiveLabel: 'mock-label2',
						description: 'mock-description2'
					}
				]
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		expect(component.instance().state.objectives).toEqual([
			{
				objectiveId: 'mock-id',
				objectiveLabel: 'mock-label',
				description: 'mock-description'
			},
			{
				objectiveId: 'mock-id2',
				objectiveLabel: 'mock-label2',
				description: 'mock-description2'
			}
		])

		component.instance().removeObjective('mock-id')
		expect(component.instance().state.objectives).toEqual([
			{
				objectiveId: 'mock-id2',
				objectiveLabel: 'mock-label2',
				description: 'mock-description2'
			}
		])
	})

	test('updateObjective updates proper objective in state', () => {
		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [{ type: 'mockNode' }] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mockNode' }] })
			},
			model: {
				title: 'Mock Title',
				objectives: [
					{
						objectiveId: 'mock-id',
						objectiveLabel: 'mock-label',
						description: 'mock-description'
					},
					{
						objectiveId: 'mock-id2',
						objectiveLabel: 'mock-label2',
						description: 'mock-description2'
					}
				]
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		expect(component.instance().state.objectives).toEqual([
			{
				objectiveId: 'mock-id',
				objectiveLabel: 'mock-label',
				description: 'mock-description'
			},
			{
				objectiveId: 'mock-id2',
				objectiveLabel: 'mock-label2',
				description: 'mock-description2'
			}
		])

		component.instance().updateObjective('mock-id', 'new-label', 'new-description')
		expect(component.instance().state.objectives).toEqual([
			{
				objectiveId: 'mock-id',
				objectiveLabel: 'new-label',
				description: 'new-description'
			},
			{
				objectiveId: 'mock-id2',
				objectiveLabel: 'mock-label2',
				description: 'mock-description2'
			}
		])
	})

	test('saveDraft() updates state after API called successfully ', () => {
		const props = {
			saveDraft: jest.fn().mockResolvedValue(true),
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] }),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				}
			},
			model: {
				title: 'Mock Title',
				flatJSON: () => ({ content: {} }),
				children: []
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		component.instance().markUnsaved = jest.fn()

		component
			.instance()
			.saveModule()
			.then(() => {
				expect(component.instance().state.saveState).toBe('saveSuccessful')
			})
	})

	test('saveDraft() updates state after API called failed ', () => {
		const props = {
			saveDraft: jest.fn().mockResolvedValue(false),
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] }),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				}
			},
			model: {
				title: 'Mock Title',
				flatJSON: () => ({ content: {} }),
				children: []
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		component.instance().markUnsaved = jest.fn()

		component
			.instance()
			.saveModule()
			.then(() => {
				expect(component.instance().state.saveState).toBe('saveFailed')
			})
	})

	test('onKeyDown() calls editor functions', () => {
		jest.spyOn(ReactEditor, 'blur').mockReturnValue(true)

		const editor = {
			undo: jest.fn(),
			redo: jest.fn(),
			toggleEditable: jest.fn(),
			children: [
				{
					type: 'Mock Node',
					children: [{ text: 'mock text' }]
				}
			],
			selection: {
				anchor: { path: [0], offset: 0 },
				focus: { path: [0], offset: 3 }
			},
			isVoid: jest.fn(),
			isInline: jest.fn()
		}

		const props = {
			saveDraft: jest.fn().mockResolvedValue(true),
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] }),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				}
			},
			model: {
				title: 'Mock Title',
				flatJSON: () => ({ content: {} }),
				children: []
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()
		const preventDefault = jest.fn()
		instance.editor = editor

		// save
		props.saveDraft.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: 's',
			metaKey: true
		})
		expect(props.saveDraft).toHaveBeenCalled()

		// undo ctrl y
		editor.redo.mockClear()
		instance.onKeyDownGlobal({
			preventDefault: jest.fn(),
			key: 'y',
			metaKey: true
		})
		expect(editor.redo).toHaveBeenCalled()

		// escape
		ReactEditor.blur.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: 'Escape'
		})
		expect(ReactEditor.blur).toHaveBeenCalled()

		// open inline insert menu (top one) with -
		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: '-',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		// open inline insert menu (top one) with shift _
		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault: jest.fn(),
			key: '_',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		// open inline insert menu (bottom one) with =
		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: '=',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		// open inline insert menu (bottom one) with shift +
		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: '+',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: 'i',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		// sometimes shift i registers as upper case I
		editor.toggleEditable.mockClear()
		instance.onKeyDownGlobal({
			preventDefault,
			key: 'I',
			metaKey: true,
			shiftKey: true
		})
		expect(editor.toggleEditable).toHaveBeenCalled()

		// type something that doesn't match any listeners (for coverage)
		instance.onKeyDownGlobal({
			preventDefault,
			key: 'q'
		})
	})

	test('onKeyDown runs through full list of options', () => {
		const editor = {
			undo: jest.fn(),
			redo: jest.fn(),
			isInline: jest.fn()
		}

		const props = {
			insertableItems: 'mock-insertable-items',
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] }),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				}
			},
			model: {
				title: 'Mock Title',
				flatJSON: () => ({ content: {} }),
				children: []
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()
		instance.editor = editor

		instance.onKeyDown({
			preventDefault: jest.fn(),
			key: 's',
			metaKey: true,
			defaultPrevented: true
		})

		jest.spyOn(Editor, 'nodes').mockImplementation((editor, opts) => {
			opts.match({ children: [{ text: '' }] })
			return [[{ type: ASSESSMENT_NODE }, [0]], [{ type: BREAK_NODE }, [0]]]
		})
		jest.spyOn(Common.Registry, 'getItemForType')
		instance.onKeyDown({
			preventDefault: jest.fn(),
			key: 's',
			metaKey: true
		})

		const onKeyDown = jest.fn()
		jest.spyOn(Common.Registry, 'getItemForType').mockReturnValue({
			plugins: { onKeyDown }
		})
		instance.onKeyDown({
			preventDefault: jest.fn(),
			key: 's',
			metaKey: true
		})

		expect(onKeyDown).toHaveBeenCalled()
	})

	test('onKeyDown exits to defaults', () => {
		jest.spyOn(ReactEditor, 'blur').mockReturnValue(true)

		const editor = {
			undo: jest.fn(),
			redo: jest.fn(),
			isInline: jest.fn(),
			insertText: jest.fn()
		}

		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn(),
				toJSON: () => ({ children: [{ type: 'mock node' }] }),
				set: jest.fn(),
				children: {
					reset: jest.fn()
				}
			},
			model: {
				title: 'Mock Title',
				flatJSON: () => ({ content: {} }),
				children: []
			},
			draft: { accessLevel: FULL }
		}

		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()
		instance.editor = editor

		instance.onKeyDown({
			preventDefault: jest.fn(),
			key: 's',
			metaKey: true,
			defaultPrevented: true
		})

		jest.spyOn(Editor, 'nodes').mockImplementation((editor, opts) => {
			opts.match({ children: [{ text: '' }] })
			return [[{ type: ASSESSMENT_NODE }, [0]], [{ type: BREAK_NODE }, [0]]]
		})

		const event = {
			defaultPrevented: false,
			preventDefault: jest.fn(),
			key: 'Tab',
			metaKey: true
		}
		instance.onKeyDown(event)

		const onKeyDown = jest.fn().mockImplementation(() => {
			event.defaultPrevented = true
		})
		jest.spyOn(Common.Registry, 'getItemForType').mockReturnValue({
			plugins: { onKeyDown }
		})
		instance.onKeyDown(event)

		expect(onKeyDown).toHaveBeenCalled()
	})

	test('reload disables event listener and calls location.reload', () => {
		jest.spyOn(window, 'removeEventListener').mockReturnValueOnce()
		Object.defineProperty(window, 'location', {
			value: { reload: jest.fn() }
		})

		const component = renderer.create(<VisualEditor {...props} />)

		component.getInstance().reload()
		expect(window.removeEventListener).toHaveBeenCalled()
		expect(location.reload).toHaveBeenCalled()
		expect(component.toJSON()).toMatchSnapshot()
	})

	test('onResized sets state.contentRect', () => {
		const component = mount(<VisualEditor {...props} />)

		expect(component.state().contentRect).toBe(null)
		component.instance().onResized({ contentRect: 'mock-content-rect' })
		expect(component.state().contentRect).toBe('mock-content-rect')
	})

	test('setupResizeObserver does nothing if the browser does not support ResizeObserver', () => {
		const originalResizeObserver = window.ResizeObserver

		window.ResizeObserver = undefined //eslint-disable-line no-undefined
		expect(VisualEditor.prototype.setupResizeObserver()).toBe(false)

		window.ResizeObserver = {}
		expect(VisualEditor.prototype.setupResizeObserver()).toBe(false)

		window.ResizeObserver = { prototype: {} }
		expect(VisualEditor.prototype.setupResizeObserver()).toBe(false)

		window.ResizeObserver = { prototype: { observe: jest.fn() } }
		expect(VisualEditor.prototype.setupResizeObserver()).toBe(false)

		window.ResizeObserver = { prototype: { disconnect: jest.fn() } }
		expect(VisualEditor.prototype.setupResizeObserver()).toBe(false)

		window.ResizeObserver = jest.fn()
		window.ResizeObserver.prototype = { observe: jest.fn(), disconnect: jest.fn() }
		expect(
			VisualEditor.prototype.setupResizeObserver.bind({
				onResized: jest.fn(),
				pageEditorContainerRef: { current: jest.fn() }
			})()
		).toBe(true)

		window.ResizeObserver = originalResizeObserver
	})

	test('setupResizeObserver creates a new ResizeObserver and observes the container ref', () => {
		const originalResizeObserver = window.ResizeObserver

		const onResized = jest.fn()
		const pageEditorContainerRefCurrent = jest.fn()
		window.ResizeObserver = class ResizeObserver {
			constructor(fn) {
				this.__callback = fn
			}

			observe() {}

			disconnect() {}
		}
		const observeSpy = jest.spyOn(window.ResizeObserver.prototype, 'observe')

		const thisValue = {
			onResized,
			pageEditorContainerRef: { current: pageEditorContainerRefCurrent }
		}
		expect(VisualEditor.prototype.setupResizeObserver.bind(thisValue)()).toBe(true)

		expect(thisValue.resizeObserver).toBeInstanceOf(window.ResizeObserver)
		expect(thisValue.resizeObserver.__callback).toBe(onResized)
		expect(observeSpy).toHaveBeenCalledWith(pageEditorContainerRefCurrent)

		window.ResizeObserver = originalResizeObserver
	})

	test('componentWillUnmount disconnects the resizeObserver', () => {
		const disconnect = jest.fn()

		VisualEditor.prototype.componentWillUnmount.bind({
			checkIfSaved: jest.fn(),
			resizeObserver: { disconnect }
		})()

		expect(disconnect).toHaveBeenCalled()
	})

	test('PageEditor component doesnt save if readOnly is enabled', () => {
		const props = { readOnly: true }
		const mockFn = jest.fn()
		const spy = jest.spyOn(VisualEditor.prototype, 'exportCurrentToJSON')
		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()

		instance.markUnsaved()
		instance.saveModule('mockId')

		// eslint-disable-next-line no-undefined
		expect(instance.checkIfSaved(mockFn)).toBe(undefined)
		expect(spy).not.toHaveBeenCalled()
		expect(instance.state.saveState).toBe('')
	})

	test('PageEditor component doesnt save if any input field is invalid', () => {
		const props = { model: { title: '' }, draft: { accessLevel: FULL } }
		const mockFn = jest.fn()
		const spy = jest.spyOn(VisualEditor.prototype, 'exportCurrentToJSON')
		const hasInvalidFieldsSpy = jest.spyOn(VisualEditor.prototype, 'hasInvalidFields')

		const input = document.createElement('input')
		input.reportValidity = jest.fn().mockReturnValue(false)
		document.body.appendChild(input)

		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()

		instance.markUnsaved()
		instance.saveModule('mockId')

		// eslint-disable-next-line no-undefined
		expect(instance.checkIfSaved(mockFn)).toBe(undefined)
		expect(spy).not.toHaveBeenCalled()
		expect(hasInvalidFieldsSpy).toHaveBeenCalled()
		expect(instance.state.saveState).toBe('')

		document.body.removeChild(input)
	})

	test('PageEditor component saves if all input fields are valid', () => {
		const props = {
			model: {
				title: '',
				flatJSON: jest.fn().mockReturnValue({ content: {} }),
				children: []
			},
			saveDraft: jest.fn().mockResolvedValue(true),
			draft: { accessLevel: FULL }
		}
		const spy = jest
			.spyOn(VisualEditor.prototype, 'exportCurrentToJSON')
			.mockImplementation(() => {})
		const hasInvalidFieldsSpy = jest.spyOn(VisualEditor.prototype, 'hasInvalidFields')

		const input = document.createElement('input')
		input.reportValidity = jest.fn().mockReturnValue(true)
		document.body.appendChild(input)

		const component = mount(<VisualEditor {...props} />)
		const instance = component.instance()

		instance.markUnsaved()
		instance.saveModule('mockId')

		expect(hasInvalidFieldsSpy).toHaveBeenCalled()
		expect(spy).toHaveBeenCalled()
		expect(instance.state.saveState).toBe('saving')

		document.body.removeChild(input)
	})
})
