import { mount } from 'enzyme'
import React from 'react'
import renderer from 'react-test-renderer'
import TextGroupEl from './text-group-el'
import TextGroup from '../../text-group/text-group'
import StyleableText from '../../text/styleable-text'
import Dispatcher from '../../flux/dispatcher'

jest.mock('../../flux/dispatcher')

describe('TextGroupEl', () => {
	let tg

	beforeEach(() => {
		tg = TextGroup.create(Infinity, { hangingIndent: false })
		tg.clear()

		// first item, no formatting:
		tg.add(new StyleableText('First line'))

		// second item, some formatting and a variable:
		const st = new StyleableText('Some BOLD text with a {{variable}} included')
		st.styleText('b', 5, 9)
		tg.add(st, { hangingIndent: true })
	})

	test('TextGroupEl unformatted', () => {
		const component = renderer.create(<TextGroupEl groupIndex={0} textItem={tg.get(0)} />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('TextGroupEl formatted', () => {
		const component = renderer.create(<TextGroupEl groupIndex={1} textItem={tg.get(1)} />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('Renders text', () => {
		const component = mount(
			<TextGroupEl groupIndex={0} textItem={tg.get(0)} parentModel={jest.fn()} />
		)

		expect(component.text()).toBe('First line')
	})

	test('Variable replacement', () => {
		Dispatcher.trigger.mockImplementationOnce((eventName, event, variable) => {
			event.text = 'REPLACE(' + variable + ')'
		})

		const component = mount(
			<TextGroupEl groupIndex={1} textItem={tg.get(1)} parentModel={jest.fn()} />
		)

		expect(component.text()).toBe('Some BOLD text with a REPLACE(variable) included')
	})

	test('Variable replacement with no match', () => {
		Dispatcher.trigger.mockImplementationOnce((eventName, event) => {
			event.text = null
		})

		const component = mount(
			<TextGroupEl groupIndex={1} textItem={tg.get(1)} parentModel={jest.fn()} />
		)

		expect(component.text()).toBe('Some BOLD text with a {{variable}} included')
	})

	test('String values of hangingIndent work as expected', () => {
		tg = TextGroup.create(Infinity, { hangingIndent: 'false' })
		tg.clear()

		tg.add(new StyleableText('First line'))
		const st = new StyleableText('Second line')
		tg.add(st, { hangingIndent: 'true' })

		const component1 = renderer.create(<TextGroupEl groupIndex={0} textItem={tg.get(0)} />)
		const tree1 = component1.toJSON()
		const component2 = renderer.create(<TextGroupEl groupIndex={1} textItem={tg.get(1)} />)
		const tree2 = component2.toJSON()

		expect(tree1).toMatchSnapshot()
		expect(tree2).toMatchSnapshot()
	})
})
