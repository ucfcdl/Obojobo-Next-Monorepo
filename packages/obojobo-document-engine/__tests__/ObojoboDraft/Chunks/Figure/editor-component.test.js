import React from 'react'
import { mount } from 'enzyme'
import renderer from 'react-test-renderer'

import Figure from 'ObojoboDraft/Chunks/Figure/editor-component'

describe('Figure Editor Node', () => {
	beforeEach(() => {
		jest.restoreAllMocks()
		jest.resetAllMocks()
	})
	test('Figure component', () => {
		const component = renderer.create(
			<Figure
				node={{
					data: {
						get: () => ({
							size: 'mockSize',
							url: 'mockUrl',
							alt: 'mockAlt'
						})
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Figure renders with custom size correctly', () => {
		expect.assertions(3)

		const component = renderer.create(
			<Figure
				node={{
					data: {
						get: () => ({
							size: 'custom',
							url: 'mockUrl',
							alt: 'mockAlt',
							width: 'customWidth',
							height: 'customHeight'
						})
					}
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		const componentNoWidth = renderer.create(
			<Figure
				node={{
					data: {
						get: () => ({
							size: 'custom',
							url: 'mockUrl',
							alt: 'mockAlt',
							height: 'customHeight'
						})
					}
				}}
			/>
		)
		expect(componentNoWidth.toJSON()).toMatchSnapshot()

		const componentNoHeight = renderer.create(
			<Figure
				node={{
					data: {
						get: () => ({
							size: 'custom',
							url: 'mockUrl',
							alt: 'mockAlt',
							width: 'mockWidth'
						})
					}
				}}
			/>
		)
		expect(componentNoHeight.toJSON()).toMatchSnapshot()
	})

	test('Figure component edits alt text', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce('mockAltText')

		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => ({})
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({ data: { content: { alt: 'mockAltText' } } })
		)
	})

	test('Figure component edits alt text - defaulting to content.alt if input invalid', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)

		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => ({ alt: 'contentAlt' })
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({ data: { content: { alt: 'contentAlt' } } })
		)
	})

	test('Figure component edits url', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce('mockUrl')

		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component
			.find('button')
			.at(1)
			.simulate('click')

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({ data: { content: { url: 'mockUrl' } } })
		)
	})

	test('Figure component edits url - defaulting to content.url if input invalid', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)

		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => ({
							url: 'contentUrl'
						})
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component
			.find('button')
			.at(1)
			.simulate('click')

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({ data: { content: { url: 'contentUrl' } } })
		)
	})

	test('Figure component deletes self', () => {
		const change = {
			removeNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component
			.find('button')
			.at(2)
			.simulate('click')

		expect(change.removeNodeByKey).toHaveBeenCalled()
	})

	test('Figure component changes size', () => {
		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		// to fulfill coverage
		component.find('select').simulate('click', {
			stopPropagation: () => true
		})

		component.find('select').simulate('change', {
			target: { value: 'small' }
		})

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({
				data: {
					content: expect.objectContaining({ size: 'small' })
				}
			})
		)
	})

	test('Figure component accepts custom size', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(100).mockReturnValueOnce(200)

		const change = {
			setNodeByKey: jest.fn()
		}

		const component = mount(
			<Figure
				node={{
					key: 'mockKey',
					data: {
						get: () => {
							return {}
						}
					}
				}}
				editor={{
					value: { change: () => change },
					onChange: jest.fn()
				}}
			/>
		)

		component.find('select').simulate('change', {
			target: { value: 'custom' }
		})

		expect(change.setNodeByKey).toBeCalledWith(
			'mockKey',
			expect.objectContaining({
				data: {
					content: expect.objectContaining({ size: 'custom', height: 100, width: 200 })
				}
			})
		)
	})
})
