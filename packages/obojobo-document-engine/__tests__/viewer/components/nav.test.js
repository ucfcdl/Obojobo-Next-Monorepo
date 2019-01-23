import { shallow } from 'enzyme'
import React from 'react'
import renderer from 'react-test-renderer'

class MockStylableText {
	constructor(text) {
		this.value = text
	}
}
const mockStylableComponent = props => <div {...props} className={'mockStylableText'} />
const mockScrollIntoView = jest.fn()
// Common
jest.mock('../../../src/scripts/common/index', () => ({
	models: {
		OboModel: {
			models: {
				5: {
					getDomEl: jest.fn(() => ({
						scrollIntoView: mockScrollIntoView
					}))
				}
			}
		}
	},
	util: {
		getBackgroundImage: jest.fn()
	},
	text: {
		StyleableText: MockStylableText,
		StyleableTextComponent: mockStylableComponent
	}
}))

// NavUtil
jest.mock('../../../src/scripts/viewer/util/nav-util', () => ({
	canNavigate: jest.fn(),
	gotoPath: jest.fn(),
	toggle: jest.fn(),
	getOrderedList: jest.fn(),
	setRedAlert: jest.fn(),
	isRedAlertEnabled: jest.fn()
}))

// NavStore
jest.mock('../../../src/scripts/viewer/stores/nav-store', () => ({}))

const NavUtil = require('../../../src/scripts/viewer/util/nav-util')
const Nav = require('../../../src/scripts/viewer/components/nav').default

describe('Nav', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders opened', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([])
		const props = {
			navState: {
				open: false,
				locked: true
			}
		}
		const component = renderer.create(<Nav {...props} />)
		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('renders closed', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([])
		const props = {
			navState: {
				open: true,
				locked: true
			}
		}
		const component = renderer.create(<Nav {...props} />)
		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('renders unlocked', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([])
		const props = {
			navState: {
				open: false,
				locked: false
			}
		}
		const component = renderer.create(<Nav {...props} />)
		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('renders all list item types', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([
			{
				id: 4,
				type: 'heading',
				label: 'label4'
			},
			{
				id: 5,
				type: 'link',
				label: 'label5',
				flags: {
					visited: false,
					complete: false,
					correct: false
				}
			},
			// test StyleableText
			{
				id: 5,
				type: 'link',
				label: new MockStylableText('mockMe'),
				flags: {
					visited: false,
					complete: false,
					correct: false
				}
			},
			// flip the flags
			{
				id: 56,
				type: 'link',
				label: 'label56',
				flags: {
					visited: true,
					complete: true,
					correct: true
				}
			},
			{
				id: 678,
				type: 'non-existant-type',
				label: 'label678',
				flags: {
					correct: false
				}
			},
			{
				id: 6,
				type: 'sub-link',
				label: 'label6',
				flags: {
					correct: false
				}
			}
		])
		const props = {
			navState: {
				open: false,
				locked: true,
				navTargetId: 56 // select this item
			}
		}
		const component = renderer.create(<Nav {...props} />)
		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('onClick link checks NavUtil.canNavigate and changes the page', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([
			{
				id: 5,
				type: 'link',
				label: 'label',
				fullPath: 'mockFullPath',
				flags: {
					visited: false,
					complete: false,
					correct: false
				}
			}
		])
		const props = {
			navState: {
				open: false,
				locked: true,
				navTargetId: 5 // select this item
			}
		}
		const el = shallow(<Nav {...props} />)

		NavUtil.canNavigate.mockReturnValueOnce(false)
		expect(NavUtil.canNavigate).not.toHaveBeenCalled()
		el.find('li').simulate('click')
		expect(NavUtil.canNavigate).toHaveBeenCalledWith(props.navState)
		expect(NavUtil.gotoPath).not.toHaveBeenCalled()

		NavUtil.canNavigate.mockReset()
		expect(NavUtil.canNavigate).not.toHaveBeenCalled()
		NavUtil.canNavigate.mockReturnValueOnce(true)
		el.find('li').simulate('click')
		expect(NavUtil.canNavigate).toHaveBeenCalledWith(props.navState)
		expect(NavUtil.gotoPath).toHaveBeenCalledWith('mockFullPath')
	})

	test('onClick sub-link scrolls to the chunk', () => {
		NavUtil.getOrderedList.mockReturnValueOnce([
			{
				id: 5,
				type: 'sub-link',
				label: 'label',
				flags: {
					correct: false
				}
			}
		])
		const props = {
			navState: {
				open: false,
				locked: true,
				navTargetId: 5 // select this item
			}
		}

		const el = shallow(<Nav {...props} />)

		el.find('li').simulate('click')
		expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
	})

	test('onClick calls setRedAlert method', () => {
		NavUtil.getOrderedList.mockReturnValue([
			{
				id: 5,
				type: 'sub-link',
				label: 'label',
				flags: {
					correct: false
				}
			}
		])
		NavUtil.setRedAlert.mockReturnValue()

		const redAlertNav = shallow(
			<Nav
				{...{
					navState: {
						redAlert: true
					}
				}}
			/>
		)
		const noAlertNav = shallow(
			<Nav
				{...{
					navState: {
						redAlert: false
					}
				}}
			/>
		)

		redAlertNav.find('.red-alert-button').simulate('click')
		expect(NavUtil.setRedAlert).toHaveBeenLastCalledWith(false)
		noAlertNav.find('.red-alert-button').simulate('click')
		expect(NavUtil.setRedAlert).toHaveBeenLastCalledWith(true)
	})

	test('red alert classes applied to Nav according to state', () => {
		NavUtil.getOrderedList.mockReturnValue([
			{
				id: 5,
				type: 'sub-link',
				label: 'label',
				flags: {
					correct: false
				}
			}
		])
		NavUtil.isRedAlertEnabled.mockReturnValueOnce(true).mockReturnValueOnce(false)
		const redAlertNav = shallow(
			<Nav
				{...{
					navState: {
						redAlert: true
					}
				}}
			/>
		)
		const noAlertNav = shallow(
			<Nav
				{...{
					navState: {
						redAlert: false
					}
				}}
			/>
		)

		expect(redAlertNav.hasClass('is-red-alert')).toBe(true)
		expect(redAlertNav.hasClass('is-not-red-alert')).toBe(false)
		expect(noAlertNav.hasClass('is-not-red-alert')).toBe(true)
		expect(noAlertNav.hasClass('is-red-alert')).toBe(false)
	})
})
