import Modal from '../../../../src/scripts/common/components/modal/modal'
import ModalUtil from '../../../../src/scripts/common/util/modal-util'
import React from 'react'
import renderer from 'react-test-renderer'

jest.mock('../../../../src/scripts/common/util/modal-util')

describe('Modal', () => {
	let onClose, focusOnFirstElement

	beforeEach(() => {
		onClose = jest.fn()
		focusOnFirstElement = jest.fn()
		jest.resetAllMocks()
	})

	test('Modal', () => {
		const props = {
			onClose,
			focusOnFirstElement,
			className: 'mockClassName'
		}

		const component = renderer.create(<Modal {...props}>Content</Modal>)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Modal close button closes the modal', () => {
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement}>
				Content
			</Modal>
		)

		expect(onClose).toHaveBeenCalledTimes(0)

		const instance = component.root
		const deleteButton = instance.findByType('button')
		deleteButton.props.onClick()

		expect(onClose).toHaveBeenCalledTimes(1)

		component.unmount()
	})

	test('Esc closes modal', () => {
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement}>
				Content
			</Modal>
		)

		expect(onClose).toHaveBeenCalledTimes(0)

		document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 27 }))

		expect(onClose).toHaveBeenCalledTimes(1)

		component.unmount()
	})

	test('Esc closes modal (even when no onClose method present)', () => {
		const component = renderer.create(
			<Modal focusOnFirstElement={focusOnFirstElement}>Content</Modal>
		)

		expect(ModalUtil.hide).toHaveBeenCalledTimes(0)

		document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 27 }))

		expect(ModalUtil.hide).toHaveBeenCalledTimes(1)

		component.unmount()
	})

	test('Esc does not work if preventEsc is set', () => {
		const onCloseMock = jest.fn()
		const onKeyUpMock = jest.fn()
		const component = renderer.create(
			<Modal
				onClose={onCloseMock}
				focusOnFirstElement={focusOnFirstElement}
				preventEsc
				onKeyUp={onKeyUpMock}
			>
				Content
			</Modal>
		)

		expect(ModalUtil.hide).toHaveBeenCalledTimes(0)
		expect(onCloseMock).toHaveBeenCalledTimes(0)

		component.getInstance().onKeyUp({ keyCode: 27 })

		expect(ModalUtil.hide).toHaveBeenCalledTimes(0)
		expect(onCloseMock).toHaveBeenCalledTimes(0)

		component.unmount()
	})

	test('Modal does not close with other keys', () => {
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement}>
				Content
			</Modal>
		)

		expect(onClose).toHaveBeenCalledTimes(0)

		document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 28 }))

		expect(onClose).not.toHaveBeenCalled()

		component.unmount()
	})

	test('Tab will focus on nothing if no close or first element', () => {
		const component = renderer.create(
			<Modal>
				<textarea />
			</Modal>
		)

		expect(focusOnFirstElement).toHaveBeenCalledTimes(0)

		component.root.findByProps({ className: 'first-tab' }).props.onFocus()

		expect(focusOnFirstElement).not.toHaveBeenCalled()

		component.unmount()
	})

	test('Tab will focus on the first element if no close button', () => {
		const component = renderer.create(
			<Modal focusOnFirstElement={focusOnFirstElement}>
				<textarea />
			</Modal>
		)

		expect(focusOnFirstElement).toHaveBeenCalledTimes(0)

		component.root.findByProps({ className: 'first-tab' }).props.onFocus()

		expect(focusOnFirstElement).toHaveBeenCalledTimes(1)

		component.unmount()
	})

	test('Tab will focus on the close button if it exists', () => {
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement}>
				<textarea />
			</Modal>
		)

		const deleteButtonFocus = jest.spyOn(component.getInstance().deleteButtonRef.current, 'focus')
		expect(focusOnFirstElement).toHaveBeenCalledTimes(0)
		component.root.findByProps({ className: 'first-tab' }).props.onFocus()

		expect(focusOnFirstElement).toHaveBeenCalledTimes(0)
		expect(deleteButtonFocus).toHaveBeenCalledTimes(1)

		component.unmount()
	})

	test('Unmounts with onClose function', () => {
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement}>
				Content
			</Modal>
		)

		component.unmount()

		expect(onClose).not.toHaveBeenCalled()
	})

	test('Unmounts with no onClose function', () => {
		const component = renderer.create(
			<Modal focusOnFirstElement={focusOnFirstElement}>Content</Modal>
		)

		component.unmount()

		expect(onClose).not.toHaveBeenCalled()
	})

	test('onTabTrapFocus focuses on deleteButtonRef with onClose prop set', () => {
		const onClose = jest.fn()
		const focusOnFirstElement = jest.fn()
		const focus = jest.fn()
		const component = renderer.create(
			<Modal onClose={onClose} focusOnFirstElement={focusOnFirstElement} />
		)

		const inst = component.getInstance()
		inst.deleteButtonRef = { current: { focus } }
		inst.onTabTrapFocus()

		expect(focus).toHaveBeenCalled()
		expect(focusOnFirstElement).not.toHaveBeenCalled()

		component.unmount()
	})

	test('onTabTrapFocus focuses on focusOnFirstElement with onClose prop not set', () => {
		const focusOnFirstElement = jest.fn()
		const focus = jest.fn()
		const component = renderer.create(<Modal focusOnFirstElement={focusOnFirstElement} />)

		const inst = component.getInstance()
		inst.deleteButtonRef = { current: { focus } }
		inst.onTabTrapFocus()

		expect(focus).not.toHaveBeenCalled()
		expect(focusOnFirstElement).toHaveBeenCalled()

		component.unmount()
	})

	test('onTabTrapFocus does nothing without focusOnFirstElement or onClose props', () => {
		const focus = jest.fn()
		const component = renderer.create(<Modal />)

		const inst = component.getInstance()
		inst.deleteButtonRef = { current: { focus } }
		inst.onTabTrapFocus()

		expect(focus).not.toHaveBeenCalled()

		component.unmount()
	})
})
