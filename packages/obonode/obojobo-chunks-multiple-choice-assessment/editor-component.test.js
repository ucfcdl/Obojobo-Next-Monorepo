import React from 'react'
import renderer from 'react-test-renderer'

import MCAssessment from './editor-component'

describe('MCAssessment Editor Node', () => {
	test('MCAssessment builds the expected component', () => {
		const component = renderer.create(
			<MCAssessment
				node={{
					data: {
						get: () => {
							return 'mock-question-type'
						}
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('MCAssessment builds the expected component with defaults', () => {
		const component = renderer.create(
			<MCAssessment
				node={{
					data: {
						get: () => {
							return null
						}
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})
})
