import { shallow } from 'enzyme'
import React from 'react'
import SimpleMessage from './simple-message'
import renderer from 'react-test-renderer'

describe('SimpleMessage', () => {
	test('SimpleMessage component', () => {
		const component = renderer.create(
			<SimpleMessage
				confirm="confirm"
				modal={{
					onButtonClick: jest.fn()
				}}
			>
				Content
			</SimpleMessage>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Question confirm click', () => {
		const onClick = jest.fn()

		const component = shallow(
			<SimpleMessage
				buttonLabel="Label"
				confirm="confirm"
				modal={{
					onButtonClick: onClick
				}}
			>
				Content
			</SimpleMessage>
		)

		const button = component.find('button')

		button.simulate('click')

		expect(onClick).toHaveBeenCalledWith('confirm')
	})
})
