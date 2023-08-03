import React from 'react'
import renderer from 'react-test-renderer'

import NonEditableChunk from './index'

describe('NonEditableChunk', () => {
	test('renders NonEditableChunk component with className, indent, and children', () => {
		const componentContents = (
			<NonEditableChunk className="testClass" indent={2}>
				Stuff here
			</NonEditableChunk>
		)
		const component = renderer.create(componentContents)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('renders NonEditableChunk component with hangingIndent', () => {
		const componentContents = (
			<NonEditableChunk className="testClass" hangingIndent={true}>
				Stuff here
			</NonEditableChunk>
		)
		const component = renderer.create(componentContents)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('renders NonEditableChunk component without className, indent, and children', () => {
		const componentContents = <NonEditableChunk />
		const component = renderer.create(componentContents)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})
})
