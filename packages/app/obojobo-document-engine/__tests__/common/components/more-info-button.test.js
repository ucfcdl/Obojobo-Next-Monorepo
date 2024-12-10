import React from 'react'
import renderer from 'react-test-renderer'

import MoreInfoButton from '../../../src/scripts/common/components/more-info-button'
jest.mock('../../../src/scripts/common/util/uuid', () => {
	return () => 'mock-uuid'
})

describe('MoreInfoButton', () => {
	test('Renders default props', () => {
		const component = renderer.create(<MoreInfoButton />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Renders label', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Renders mouse over', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const button = component.root.findByType('button')

		component.getInstance().setState({ mode: 'hover' })
		button.props.onMouseOver()

		const tree = component.toJSON()
		const classNames = tree.props.className.split(' ')

		expect(classNames).toContain('is-mode-hover')
	})
	test('Renders mouse over else', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const button = component.root.findByType('button')

		button.props.onMouseOver()

		const tree = component.toJSON()
		const classNames = tree.props.className.split(' ')

		expect(classNames).toContain('is-mode-hover')
	})

	test('Renders mouse out', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const button = component.root.findByType('button')

		button.props.onMouseOver()

		button.props.onMouseOut()

		const tree = component.toJSON()
		const classNames = tree.props.className.split(' ')

		expect(classNames).toContain('is-mode-hidden')
	})
	test('Renders mouse out else', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const button = component.root.findByType('button')

		button.props.onMouseOut()

		const tree = component.toJSON()
		const classNames = tree.props.className.split(' ')

		expect(classNames).toContain('is-mode-hidden')
	})

	test('Renders click', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const button = component.root.findByType('button')

		const focusMock = jest.fn()
		const moreInfoButtonInstance = component.getInstance()
		moreInfoButtonInstance.dialogRef = { current: { focus: focusMock } }

		button.props.onClick()

		const tree = component.toJSON()

		const classNames = tree.props.className.split(' ')

		expect(classNames).toContain('is-mode-clicked')

		expect(focusMock).not.toHaveBeenCalled()

		button.props.onClick()

		const tree2 = component.toJSON()

		const classNames2 = tree2.props.className.split(' ')

		expect(classNames2).toContain('is-mode-hidden')
	})
	test('componentDidUpdate method', () => {
		const component = renderer.create(<MoreInfoButton label="Testing 123" />)
		const moreInfoButtonInstance = component.getInstance()
		const focusMock = jest.fn()

		moreInfoButtonInstance.onClick()

		moreInfoButtonInstance.dialogRef = { current: { focus: focusMock } }

		moreInfoButtonInstance.componentDidUpdate()

		expect(focusMock).toHaveBeenCalled()
	})
})
