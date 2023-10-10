import ExcerptContent from './editor-component'
import renderer from 'react-test-renderer'
import getPresetProps from '../../get-preset-props'
import { mount } from 'enzyme'
import { Editor, Range, Transforms } from 'slate'

import React from 'react'

jest.mock('slate')
jest.mock('slate-react', () => ({
	useSelected: jest.fn(),
	useEditor: jest.fn(),
	ReactEditor: {
		findPath: jest.fn()
	}
}))

import { useEditor, useSelected, ReactEditor } from 'slate-react'

import EdgeControls from '../edge-controls'

describe('Excerpt Content Node', () => {
	const Child = () => <p>Child component</p>

	const content = {
		bodyStyle: 'none',
		width: 'medium',
		font: 'serif',
		lineHeight: 'moderate',
		fontSize: 'smaller',
		topEdge: 'normal',
		bottomEdge: 'normal',
		effect: false
	}

	const editor = {
		selection: [0]
	}

	beforeEach(() => {
		useEditor.mockImplementation(() => editor)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('Node builds the expected component', () => {
		const element = {
			content
		}

		useSelected.mockImplementation(() => false)

		const component = renderer.create(
			<ExcerptContent element={element} selected={false} editor={editor}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Node builds component when selected and collapsed', () => {
		const element = {
			content
		}

		useSelected.mockImplementation(() => true)

		jest.spyOn(Range, 'isCollapsed').mockImplementation(() => true)

		const component = renderer.create(
			<ExcerptContent element={element}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Node builds the expected component with non-null body style', () => {
		const element = {
			content: {
				...content,
				bodyStyle: 'filled-box'
			}
		}

		useSelected.mockImplementation(() => false)

		const component = renderer.create(
			<ExcerptContent element={element} selected={false} editor={editor}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Node builds the expected component with non-standard body style', () => {
		const element = {
			content: {
				...content,
				bodyStyle: 'new'
			}
		}

		useSelected.mockImplementation(() => false)

		const component = renderer.create(
			<ExcerptContent element={element} selected={false} editor={editor}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Node handles preset change', () => {
		const element = {
			content
		}

		useSelected.mockImplementation(() => true)
		jest.spyOn(Editor, 'parent').mockImplementation(() => [0, [2]])
		jest.spyOn(ReactEditor, 'findPath').mockImplementation(() => [2, 1])
		const setNodesSpy = jest.spyOn(Transforms, 'setNodes').mockImplementation(() => {})

		const component = mount(
			<ExcerptContent element={element} selected={true} editor={editor}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		// Button at index 2 corresponds to Simple Filled
		component
			.find('button')
			.at(2)
			.simulate('click')

		const newContent = {
			...content,
			...getPresetProps('simple-filled'),
			preset: 'simple-filled'
		}

		expect(setNodesSpy).toHaveBeenCalledTimes(2)
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2, 1] })
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2] })
	})

	test('Node handles top edge change', () => {
		const element = {
			content: {
				...content,
				bodyStyle: 'filled-box'
			}
		}

		useSelected.mockImplementation(() => true)
		jest.spyOn(Editor, 'parent').mockImplementation(() => [0, [2]])
		jest.spyOn(ReactEditor, 'findPath').mockImplementation(() => [2, 1])
		const setNodesSpy = jest.spyOn(Transforms, 'setNodes').mockImplementation(() => {})
		jest.spyOn(Range, 'isCollapsed').mockImplementation(() => true)

		const component = mount(
			<ExcerptContent element={element}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		component
			.find('label')
			.at(1)
			.find('input')
			.at(0)
			.simulate('change', {
				target: { value: 'fade' }
			})

		const newContent = {
			...element.content,
			['topEdge']: 'fade'
		}

		expect(setNodesSpy).toHaveBeenCalledTimes(2)
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2, 1] })
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2] })
	})

	test('Node handles bottom edge change', () => {
		const element = {
			content: {
				...content,
				bodyStyle: 'filled-box'
			}
		}

		useSelected.mockImplementation(() => true)
		jest.spyOn(Editor, 'parent').mockImplementation(() => [0, [2]])
		jest.spyOn(ReactEditor, 'findPath').mockImplementation(() => [2, 1])
		const setNodesSpy = jest.spyOn(Transforms, 'setNodes').mockImplementation(() => {})
		jest.spyOn(Range, 'isCollapsed').mockImplementation(() => true)

		const component = mount(
			<ExcerptContent element={element}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		component
			.find('label')
			.at(4)
			.find('input')
			.at(0)
			.simulate('change', {
				target: { value: 'fade' }
			})

		const newContent = {
			...element.content,
			['bottomEdge']: 'fade'
		}

		expect(setNodesSpy).toHaveBeenCalledTimes(2)
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2, 1] })
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2] })
	})

	test('Node handles excerpt edit', () => {
		const element = {
			content
		}

		useSelected.mockImplementation(() => true)
		jest.spyOn(Editor, 'parent').mockImplementation(() => [0, [2]])
		jest.spyOn(ReactEditor, 'findPath').mockImplementation(() => [2, 1])
		const setNodesSpy = jest.spyOn(Transforms, 'setNodes').mockImplementation(() => {})
		jest.spyOn(Range, 'isCollapsed').mockImplementation(() => true)

		const component = mount(
			<ExcerptContent element={element}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		// Open advanced options box
		component
			.find('Button')
			.at(0)
			.find('button')
			.at(0)
			.simulate('click')

		// Select 'large' width option
		component
			.find('.more-options')
			.at(0)
			.find('.excerpt--radio-icons')
			.at(0)
			.find('input')
			.at(0)
			.simulate('change', {
				target: { value: 'large' }
			})

		const newContent = {
			...element.content,
			['width']: 'large'
		}

		expect(setNodesSpy).toHaveBeenCalledTimes(2)
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2, 1] })
		expect(setNodesSpy).toHaveBeenCalledWith(editor, { content: { ...newContent } }, { at: [2] })
	})

	test('Delete button calls subsequent methods correctly', () => {
		jest.spyOn(Editor, 'parent').mockImplementation(() => [0, [2]])
		jest.spyOn(ReactEditor, 'findPath').mockImplementation(() => [2, 1])
		const element = {
			content
		}
		const component = mount(
			<ExcerptContent element={element}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		// click Delete button
		component
			.find('.delete-button')
			.at(0)
			.props()
			.onClick()

		expect(Transforms.removeNodes).toHaveBeenCalled()
	})

	const assertEdgeControlsHaveOptions = (bodyStyle, expectedEdgeOptions) => {
		const element = {
			content: {
				...content,
				bodyStyle
			}
		}

		const component = renderer.create(
			<ExcerptContent element={element} selected={true} editor={editor}>
				<Child />
				<Child />
				<Child />
			</ExcerptContent>
		)

		const edgeControlComponent = component.root.findAllByType(EdgeControls)
		expect(edgeControlComponent[0].props.edges).toEqual(expectedEdgeOptions)
	}
	test('Correct edge options are allowed based on body type', () => {
		useSelected.mockImplementation(() => true)
		jest.spyOn(Range, 'isCollapsed').mockImplementation(() => true)

		assertEdgeControlsHaveOptions('callout-try-it', [])
		assertEdgeControlsHaveOptions('callout-practice', [])
		assertEdgeControlsHaveOptions('callout-do-this', [])
		assertEdgeControlsHaveOptions('callout-example', [])
		assertEdgeControlsHaveOptions('callout-hint', [])
		assertEdgeControlsHaveOptions('none', [])
		assertEdgeControlsHaveOptions('filled-box', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('bordered-box', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('card', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('white-paper', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('modern-paper', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('light-yellow-paper', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('dark-yellow-paper', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('aged-paper', ['normal', 'fade', 'jagged', 'bookmark'])
		assertEdgeControlsHaveOptions('', ['normal', 'fade'])
	})
})
