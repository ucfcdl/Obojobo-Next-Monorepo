jest.mock('react-redux')
jest.mock('../actions/dashboard-actions')
jest.mock('./dashboard', () => ({}))

import DashboardActions from '../actions/dashboard-actions'
import Dashboard from './dashboard'

describe('Dashboard HOC', () => {
	test('redux collect is called with the correct arguments', () => {
		const ReactRedux = require('react-redux')

		const mockReduxConnectReturn = jest.fn()
		ReactRedux.connect = jest.fn(mapStoreStateToProps => {
			//the first argument to 'connect' is a private (untestable) method in the HOC
			//that method will never be 'covered' unless we call it like this
			//since we also know that it should just return what it's given, we can test that too
			const mapStoreStateToPropsArgs = { testKey: 'testProp' }
			const mapStoreStateToPropsReturn = mapStoreStateToProps(mapStoreStateToPropsArgs)
			expect(mapStoreStateToPropsReturn).toStrictEqual(mapStoreStateToPropsArgs)
			return mockReduxConnectReturn
		})

		require('./dashboard-hoc')

		expect(ReactRedux.connect).toHaveBeenCalledTimes(1)
		expect(ReactRedux.connect).toHaveBeenCalledWith(expect.any(Function), {
			restoreVersion: DashboardActions.restoreVersion,
			createNewModule: DashboardActions.createNewModule,
			closeModal: DashboardActions.closeModal,
			addUserToModule: DashboardActions.addUserToModule,
			loadUsersForModule: DashboardActions.loadUsersForModule,
			deleteModulePermissions: DashboardActions.deleteModulePermissions,
			filterModules: DashboardActions.filterModules,
			importModuleFile: DashboardActions.importModuleFile,
			deleteModule: DashboardActions.deleteModule,
			showModulePermissions: DashboardActions.showModulePermissions,
			showVersionHistory: DashboardActions.showVersionHistory,
			checkModuleLock: DashboardActions.checkModuleLock
		})

		expect(mockReduxConnectReturn).toHaveBeenCalledTimes(1)
		expect(mockReduxConnectReturn).toHaveBeenCalledWith(Dashboard)
	})
})
