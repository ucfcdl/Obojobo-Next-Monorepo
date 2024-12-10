import React from 'react'
import renderer from 'react-test-renderer'
import TextMenu from '../../../src/scripts/common/components/text-menu'

const createRect = () => {
	return {
		left: 0,
		top: 0,
		width: 0
	}
}
describe('TextMenu', () => {
	test('TextMenu', () => {
		const component = renderer.create(<TextMenu />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('TextMenu disabled', () => {
		const component = renderer.create(<TextMenu relativeToElement={true} />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('TextMenu with no selection', () => {
		const component = renderer.create(
			<TextMenu
				relativeToElement={{
					getBoundingClientRect: () => createRect()
				}}
				enabled={true}
				selectionRect={createRect()}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('TextMenu with required props', () => {
		const component = renderer.create(
			<TextMenu
				relativeToElement={{
					getBoundingClientRect: () => createRect()
				}}
				enabled={true}
				selectionRect={createRect()}
				commands={[{ label: 'Label' }, { label: 'imageCommand', image: 'mockImage' }]}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('TextMenu calls mouseDown', () => {
		const mockCommandHandler = jest.fn()
		const mockEvent = {
			preventDefault: jest.fn(),
			stopPropagation: jest.fn()
		}

		const component = renderer.create(
			<TextMenu
				relativeToElement={{
					getBoundingClientRect: () => createRect()
				}}
				enabled={true}
				selectionRect={createRect()}
				commands={[{ label: 'Label' }]}
				commandHandler={mockCommandHandler}
			/>
		)

		const linkElement = component.root.findByType('a')

		linkElement.props.onMouseDown(mockEvent, 'Label')

		expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
		expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
		expect(mockCommandHandler).toHaveBeenCalledWith('Label')
	})
})
