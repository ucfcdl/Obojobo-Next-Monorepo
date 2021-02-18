import React from 'react'
import renderer from 'react-test-renderer'

mockStaticDate()

// require used to make sure it's loaded after mock date
const PageLogin = require('./page-login')

describe('PageLogin', () => {
	test('renders when given props', () => {
		const mockCurrentUser = {
			id: 99,
			avatarUrl: '/path/to/avatar/img',
			firstName: 'firstName',
			lastName: 'lastName'
		}

		const component = renderer.create(<PageLogin currentUser={mockCurrentUser} />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})
})
