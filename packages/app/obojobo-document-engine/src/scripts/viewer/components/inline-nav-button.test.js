import { shallow } from 'enzyme'
import React from 'react'
import renderer from 'react-test-renderer'
import NavUtil from '../util/nav-util'
import NavButton from './inline-nav-button'

jest.mock('../util/nav-util', () => ({
	goNext: jest.fn(),
	goPrev: jest.fn()
}))

const getProps = (type, disabled = false, onClick = null) => ({
	type,
	disabled,
	onClick,
	title: 'testTitle'
})

describe('Inline Nav Button', () => {
	beforeEach(() => {
		jest.resetAllMocks()
	})

	test("NavUtil.goPrev is called if type prop is 'prev'", () => {
		const el = shallow(<NavButton {...getProps('prev')} />)
		el.find('.viewer--components--inline-nav-button').simulate('click')
		expect(NavUtil.goPrev).toHaveBeenCalled()
	})

	test("NavUtil.goNext is called if type prop is 'next'", () => {
		const el = shallow(<NavButton {...getProps('next')} />)
		el.find('.viewer--components--inline-nav-button').simulate('click')
		expect(NavUtil.goNext).toHaveBeenCalled()
	})

	test('onClick is not called if disabled prop is true', () => {
		const el = shallow(<NavButton {...getProps('next', true)} />)
		el.find('.viewer--components--inline-nav-button').simulate('click')
		expect(NavUtil.goPrev).not.toHaveBeenCalled()
	})

	test('correctly renders when type prop is goPrev', () => {
		const component = renderer.create(<NavButton {...getProps('goPrev')} />)
		expect(component).toMatchSnapshot()
	})

	test('correctly renders when type prop is goNext', () => {
		const component = renderer.create(<NavButton {...getProps('goNext')} />)
		expect(component).toMatchSnapshot()
	})

	test('correctly renders when disabled prop is true', () => {
		const component = renderer.create(<NavButton {...getProps('goNext', true)} />)
		expect(component).toMatchSnapshot()
	})

	test('onClick calls blur on event.target', () => {
		const blurFn = jest.fn()
		const el = shallow(<NavButton {...getProps('goNext')} />)
		el.find('.viewer--components--inline-nav-button').simulate('click', {
			target: {
				blur: blurFn
			}
		})
		expect(blurFn).toHaveBeenCalled()
	})

	test('onClick calls calls prop onClick', () => {
		const onClick = jest.fn()

		const el = shallow(<NavButton {...getProps('goNext', false, onClick)} />)
		el.find('.viewer--components--inline-nav-button').simulate('click')
		expect(onClick).toHaveBeenCalled()
	})
})
