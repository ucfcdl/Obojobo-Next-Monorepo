import React from 'react'
import ButtonBar from '../../../src/scripts/common/components/button-bar'
import renderer from 'react-test-renderer'

describe('ButtonBar', () => {
	test('ButtonBar component', () => {
		const children = []
		const component = renderer.create(<ButtonBar>{children}</ButtonBar>)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('ButtonBar component with attributes', () => {
		const children = [
			{
				props: { id: 'mockChild' }
			}
		]
		const component = renderer.create(
			<ButtonBar altAction={jest.fn()} selectedIndex={0} isDangerous={true} disabled={true}>
				{children}
			</ButtonBar>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('ButtonBar component clicks button', () => {
		const children = [
			{
				props: { id: 'mockChild' }
			}
		]
		const mockClick = jest.fn()
		const component = renderer.create(<ButtonBar onClick={mockClick}>{children}</ButtonBar>)
		const buttonInstance = component.root.findByType('button')

		buttonInstance.props.onClick()
		expect(mockClick).toHaveBeenCalledTimes(1)

		const componentNoClick = renderer.create(<ButtonBar>{children}</ButtonBar>)
		const buttonInstanceNoClick = componentNoClick.root.findByType('button')

		buttonInstanceNoClick.props.onClick()
		expect(mockClick).toHaveBeenCalledTimes(1)
	})

	test('ButtonBar component clicks button but does not fire', () => {
		const children = [
			{
				props: { id: 'mockChild', onClick: true }
			}
		]
		const mockClick = jest.fn()
		const component = renderer.create(<ButtonBar onClick={mockClick}>{children}</ButtonBar>)
		const buttonInstance = component.root.findByType('button')

		buttonInstance.props.onClick()
		expect(mockClick).toHaveBeenCalled()
	})
})
