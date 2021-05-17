import React from 'react'
import { Editor } from 'slate'
import { mount } from 'enzyme'

import TextColorIcon from 'obojobo-document-engine/src/scripts/oboeditor/assets/text-color-picker-icon'
import Dispatcher from 'obojobo-document-engine/src/scripts/common/flux/dispatcher'

jest.mock('slate-react')
jest.mock('slate')

describe('TextColorIcon', () => {
	beforeEach(() => {
		Editor.marks.mockReturnValue({})
	})

	afterEach(() => {
		Editor.marks.mockRestore()
	})

	test('TextColorIcon component', () => {
		const component = mount(<TextColorIcon />)
		expect(component.html()).toMatchSnapshot()
		component.unmount()
	})

	test('TextColorIcon expanded', () => {
		const props = {
			editor: {
				toggleEditable: jest.fn()
			}
		}
		const component = mount(<TextColorIcon {...props} />)
		Dispatcher.trigger('color-picker:open')

		expect(component.html()).toContain('color-picker')
		component.unmount()
	})

	test('TextColorIcon when ColorPicker calls close', () => {
		const props = {
			editor: {
				toggleEditable: jest.fn()
			}
		}
		const component = mount(<TextColorIcon {...props} />)
		Dispatcher.trigger('color-picker:open')
		component.update()
		component
			.find('.color-cell')
			.at(0)
			.simulate('click')

		expect(props.editor.toggleEditable).toHaveBeenCalled()
		component.unmount()
	})

	test('TextColorIcon handles mousedown', () => {
		const props = {
			editor: {
				toggleEditable: jest.fn()
			}
		}

		const component = mount(<TextColorIcon {...props} />)
		const nodeInstance = component.instance()

		// Click when the dom is null
		component.setState({ isOpen: true })
		nodeInstance.domRef = { current: null }
		nodeInstance.onWindowMouseDown({ target: true })
		expect(props.editor.toggleEditable).not.toHaveBeenCalled()

		// Click inside
		component.setState({ isOpen: true })
		nodeInstance.domRef = { current: { contains: () => true } }
		nodeInstance.onWindowMouseDown({ target: true })
		expect(props.editor.toggleEditable).not.toHaveBeenCalled()

		// Click outside (not yet open)
		component.setState({ isOpen: false })
		nodeInstance.domRef = { current: { contains: () => false } }
		nodeInstance.onWindowMouseDown({ target: true })
		expect(component.html()).toMatchSnapshot()
		expect(props.editor.toggleEditable).not.toHaveBeenCalled()

		// Click outside (open)
		component.setState({ isOpen: true })
		nodeInstance.domRef = { current: { contains: () => false } }
		nodeInstance.onWindowMouseDown({ target: true })
		expect(component.html()).toMatchSnapshot()
		expect(props.editor.toggleEditable).toHaveBeenCalled()

		component.unmount()
	})

	test('TextColorIcon display color mark', () => {
		Editor.marks.mockReturnValueOnce({ color: '#444444' })
		const props = {
			editor: {
				toggleEditable: jest.fn()
			}
		}

		const component = mount(<TextColorIcon {...props} />)
		expect(component.html()).toContain('#444444')
		component.unmount()
	})
})
