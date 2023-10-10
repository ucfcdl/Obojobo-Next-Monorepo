jest.mock('redux-pack', () => {
	return {
		//TODO: FIGURE OUT WHAT TO DO WITH THIS TO MAKE UNIT TESTS WORK
		handle: jest.fn((prevState, action, steps) => ({ prevState, action, steps }))
	}
})

const dashboardReducer = require('./dashboard-reducer')

const {
	SHOW_MODULE_PERMISSIONS,
	CLOSE_MODAL,
	LOAD_USER_SEARCH,
	LOAD_USERS_FOR_MODULE,
	ADD_USER_TO_MODULE,
	CLEAR_PEOPLE_SEARCH_RESULTS,
	DELETE_MODULE_PERMISSIONS,
	DELETE_MODULE,
	BULK_DELETE_MODULES,
	BULK_ADD_MODULES_TO_COLLECTIONS,
	BULK_REMOVE_MODULES_FROM_COLLECTION,
	CREATE_NEW_MODULE,
	FILTER_MODULES,
	FILTER_COLLECTIONS,
	SELECT_MODULES,
	DESELECT_MODULES,
	SHOW_MODULE_MORE,
	SHOW_MODULE_SYNC,
	SYNC_MODULE_UPDATES,
	CREATE_NEW_COLLECTION,
	SHOW_MODULE_MANAGE_COLLECTIONS,
	LOAD_MODULE_COLLECTIONS,
	MODULE_ADD_TO_COLLECTION,
	MODULE_REMOVE_FROM_COLLECTION,
	SHOW_COLLECTION_BULK_ADD_MODULES_DIALOG,
	SHOW_COLLECTION_MANAGE_MODULES,
	LOAD_COLLECTION_MODULES,
	COLLECTION_ADD_MODULE,
	COLLECTION_REMOVE_MODULE,
	LOAD_MODULE_SEARCH,
	CLEAR_MODULE_SEARCH_RESULTS,
	SHOW_COLLECTION_RENAME,
	RENAME_COLLECTION,
	DELETE_COLLECTION,
	SHOW_VERSION_HISTORY,
	SHOW_ASSESSMENT_SCORE_DATA,
	RESTORE_VERSION,
	GET_MODULES,
	GET_DELETED_MODULES,
	BULK_RESTORE_MODULES
} = require('../actions/dashboard-actions')

const Pack = require('redux-pack')

const handleStart = handler => {
	return handler.steps.start(handler.prevState)
}
const handleSuccess = handler => {
	return handler.steps.success(handler.prevState)
}

describe('Dashboard Reducer', () => {
	const defaultSearchResultsState = {
		isFetching: false,
		hasFetched: false,
		items: []
	}

	beforeEach(() => {
		Pack.handle.mockClear()
	})

	const runCreateOrDeleteCollectionActionTest = (testAction, testFilter = false) => {
		const mockCollectionList = [
			{
				id: 'mockCollectionId',
				title: '' // filtering logic has a branch for empty titles that needs covering
			},
			{
				id: 'mockCollectionId2',
				title: 'B Mock Collection'
			}
		]

		const initialState = {
			collectionSearchString: testFilter ? 'B' : '',
			myCollections: [
				{
					id: 'oldMockCollectionId',
					title: 'Old Mock Collection'
				}
			],
			filteredCollections: [
				{
					id: 'oldMockCollectionId',
					title: 'Old Mock Collection'
				}
			]
		}
		const action = {
			type: testAction,
			// this action occurs after a new collection is created and the current user's
			//  collections are queried - so it will contain a list of collections
			payload: {
				value: mockCollectionList
			}
		}
		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)

		const newState = handleSuccess(handler)
		expect(newState.myCollections).not.toEqual(initialState.myCollections)
		expect(newState.myCollections).toEqual(mockCollectionList)

		// empty collectionSearchString = no filtering
		if (testFilter) {
			expect(newState.filteredCollections).not.toEqual(initialState.filteredCollections)
			expect(newState.filteredCollections).toEqual([{ ...mockCollectionList[1] }])
		} else {
			expect(newState.filteredCollections).not.toEqual(initialState.filteredCollections)
			expect(newState.filteredCollections).toEqual(mockCollectionList)
		}
	}

	const runRenameCollectionActionTest = (testFilter = false, testSameCollection = false) => {
		const mockCollectionList = [
			{
				id: 'mockCollectionId',
				title: 'A Mock Collection'
			},
			{
				id: 'mockCollectionId2',
				title: 'B Mock Collection'
			}
		]

		const initialState = {
			collectionSearchString: testFilter ? 'B' : '',
			myCollections: [
				{
					id: 'oldMockCollectionId',
					title: 'Old Mock Collection'
				}
			],
			filteredCollections: [
				{
					id: 'oldMockCollectionId',
					title: 'Old Mock Collection'
				}
			],
			collection: {
				id: 'collectionId',
				title: 'Collection Title'
			}
		}
		const action = {
			type: RENAME_COLLECTION,
			meta: {
				changedCollectionTitle: 'New Collection Title',
				changedCollectionId: 'collectionId',
				// eslint-disable-next-line no-undefined
				currentCollectionId: testSameCollection ? 'collectionId' : undefined
			},
			payload: {
				value: mockCollectionList
			}
		}
		const handler = dashboardReducer(initialState, action)
		// RENAME_COLLECTION is an asynchronous action - state changes on success
		const newState = handleSuccess(handler)
		expect(newState.myCollections).not.toEqual(initialState.myCollections)
		expect(newState.myCollections).toEqual(mockCollectionList)
		if (testFilter) {
			expect(newState.filteredCollections).not.toEqual(initialState.filteredCollections)
			expect(newState.filteredCollections).toEqual([{ ...mockCollectionList[1] }])
		} else {
			expect(newState.filteredCollections).not.toEqual(initialState.filteredCollections)
			expect(newState.filteredCollections).toEqual(mockCollectionList)
		}
		const expectedCollectionTitle = testSameCollection
			? 'New Collection Title'
			: initialState.collection.title
		expect(newState.collection.title).toEqual(expectedCollectionTitle)
	}

	const runCreateOrSyncUpdatesOrDeleteModuleActionTest = testAction => {
		const isSyncOrDeleteModuleTest =
			testAction === DELETE_MODULE || testAction === SYNC_MODULE_UPDATES
		const mockModuleList = [
			{
				draftId: 'mockDraftId',
				title: '' // filtering logic has a branch for empty titles that needs covering
			},
			{
				draftId: 'mockDraftId2',
				title: 'B Mock Module'
			}
		]

		const initialState = {
			dialog: 'module-options',
			moduleSearchString: isSyncOrDeleteModuleTest ? 'B' : '',
			myModules: [
				{
					draftId: 'oldMockDraftId',
					title: 'Old Mock Module'
				}
			],
			filteredModules: [
				{
					draftId: 'oldMockDraftId',
					title: 'Old Mock Module'
				}
			]
		}
		const action = {
			type: testAction,
			// this action occurs after the current user's modules are
			//  queried - so it will contain a list of modules
			payload: {
				value: {
					allCount: mockModuleList.length,
					modules: mockModuleList
				}
			}
		}

		const handler = dashboardReducer(initialState, action)

		// DELETE_MODULE changes state on start AND success, CREATE_MODULE just on success
		let newState
		if (isSyncOrDeleteModuleTest) {
			newState = handleStart(handler)
			expect(newState.dialog).toBe(null)
			// no module list changes should have happened yet
			expect(newState.myModules).toEqual(initialState.myModules)
			expect(newState.filteredModules).toEqual(initialState.filteredModules)
		}

		newState = handleSuccess(handler)
		expect(newState.myModules).not.toEqual(initialState.myModules)
		expect(newState.myModules).toEqual(mockModuleList)
		if (isSyncOrDeleteModuleTest) {
			expect(newState.filteredModules).not.toEqual(initialState.filteredModules)
			expect(newState.moduleSearchString).toEqual(initialState.moduleSearchString)
			expect(newState.filteredModules).toEqual([{ ...mockModuleList[1] }])
		} else {
			expect(newState.moduleSearchString).toBe('')
			expect(newState.filteredModules).toBe(null)
		}
	}

	const runModuleUserActionTest = (testAction, testModules = false) => {
		const mockModule = {
			draftId: 'mockDraftId',
			title: 'Mock Module Title'
		}
		const mockInitialDraftPermissions = {
			...defaultSearchResultsState,
			items: [
				{
					id: 0,
					displayName: 'firstName lastName'
				}
			]
		}
		const mockModuleList = [mockModule]
		const mockUserList = [
			{
				id: 1,
				displayName: 'firstName2 lastName2'
			},
			{
				id: 2,
				displayName: 'firstName3 lastName3'
			}
		]

		const initialState = {
			shareSearchString: 'oldSearchString',
			searchPeople: null,
			selectedModule: mockModule,
			draftPermissions: {
				mockDraftId: mockInitialDraftPermissions
			},
			moduleCount: mockModuleList.length + 1,
			myModules: [
				...mockModuleList,
				{
					draftId: 'mockSomeOtherDraftId',
					title: 'Some Other Mock Module Title'
				}
			]
		}

		const modulePayload = {
			allCount: mockModuleList.length,
			modules: mockModuleList
		}

		const action = {
			type: testAction,
			payload: {
				// eslint-disable-next-line no-undefined
				modules: testModules ? modulePayload : undefined,
				value: mockUserList
			}
		}

		const handler = dashboardReducer(initialState, action)

		let newState

		newState = handleStart(handler)
		expect(newState.draftPermissions).not.toEqual(initialState.draftPermissions)
		expect(newState.draftPermissions['mockDraftId']).toEqual({
			...defaultSearchResultsState,
			isFetching: true
		})

		newState = handleSuccess(handler)
		expect(newState.draftPermissions).not.toEqual(initialState.draftPermissions)
		expect(newState.draftPermissions['mockDraftId']).toEqual({
			...defaultSearchResultsState,
			hasFetched: true,
			items: mockUserList
		})
		if (testModules) {
			expect(newState.moduleCount).not.toEqual(initialState.moduleCount)
			expect(newState.myModules).not.toEqual(initialState.myModules)
			expect(newState.moduleCount).toEqual(mockModuleList.length)
			expect(newState.myModules).toEqual(mockModuleList)
		}
	}

	const runModuleCollectionActions = testAction => {
		const mockCollectionList = [
			{
				id: 'mockCollectionId',
				title: 'Mock Collection Title'
			},
			{
				id: 'mockCollectionId2',
				title: 'Mock Collection Title 2'
			}
		]

		const initialState = {
			draftCollections: [{ ...mockCollectionList[0] }]
		}

		const action = {
			type: testAction,
			payload: {
				value: mockCollectionList
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)

		const newState = handleSuccess(handler)
		expect(newState.draftCollections).not.toEqual(initialState.draftCollections)
		expect(newState.draftCollections).toEqual(mockCollectionList)
	}

	const runCollectionModuleActions = (testAction, testCurrentCollection = false) => {
		const mockModuleList = [
			{
				draftId: 'mockModuleId',
				title: 'Mock Collection Title'
			},
			{
				draftId: 'mockModuleId2',
				title: 'Mock Collection Title 2'
			}
		]

		const initialState = {
			collectionModules: [{ ...mockModuleList[0] }],
			// eslint-disable-next-line no-undefined
			myModules: testCurrentCollection ? [{ ...mockModuleList[0] }] : undefined
		}

		const action = {
			type: testAction,
			meta: {
				changedCollectionId: 'mockCollectionId',
				// eslint-disable-next-line no-undefined
				currentCollectionId: testCurrentCollection ? 'mockCollectionId' : undefined
			},
			payload: {
				value: {
					allCount: mockModuleList.length,
					modules: mockModuleList
				}
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)

		const newState = handleSuccess(handler)
		expect(newState.collectionModules).not.toEqual(initialState.collectionModules)
		expect(newState.collectionModules).toEqual(mockModuleList)
		if (testCurrentCollection) {
			expect(newState.myModules).not.toEqual(initialState.myModules)
			expect(newState.myModules).toEqual(mockModuleList)
		}
	}

	test('CREATE_NEW_COLLECTION action modifies state correctly - no filter', () => {
		runCreateOrDeleteCollectionActionTest(CREATE_NEW_COLLECTION)
	})
	test('CREATE_NEW_COLLECTION action modifies state correctly - filter', () => {
		runCreateOrDeleteCollectionActionTest(CREATE_NEW_COLLECTION, true)
	})
	//DELETE_COLLECTION and CREATE_NEW_COLLECTION should have identical results based on inputs
	test('DELETE_COLLECTION action modifies state correctly - no filter', () => {
		runCreateOrDeleteCollectionActionTest(DELETE_COLLECTION)
	})
	test('DELETE_COLLECTION action modifies state correctly - filter', () => {
		runCreateOrDeleteCollectionActionTest(DELETE_COLLECTION, true)
	})

	// more or less the same as CREATE_NEW_COLLECTION, but will make additional state
	//  adjustment if currentCollectionId === changedCollectionId
	test('RENAME_COLLECTION action modifies state correctly - no filter, not same collection', () => {
		runRenameCollectionActionTest()
	})
	test('RENAME_COLLECTION action modifies state correctly - no filter, same collection', () => {
		runRenameCollectionActionTest(false, true)
	})
	test('RENAME_COLLECTION action modifies state correctly - filter, not same collection', () => {
		runRenameCollectionActionTest(true)
	})
	test('RENAME_COLLECTION action modifies state correctly - filter, same collection', () => {
		runRenameCollectionActionTest(true, true)
	})

	test('CREATE_NEW_MODULE action modifies state correctly', () => {
		runCreateOrSyncUpdatesOrDeleteModuleActionTest(CREATE_NEW_MODULE)
	})

	//DELETE_MODULE is more or less the same as CREATE_MODULE, but will auto-filter new modules
	test('DELETE_MODULE action modifies state correctly', () => {
		runCreateOrSyncUpdatesOrDeleteModuleActionTest(DELETE_MODULE)
	})
	//SYNC_MODULE_UPDATES should be identical to DELETE_MODULE
	test('SYNC_MODULE_UPDATE action modifies state correctly', () => {
		runCreateOrSyncUpdatesOrDeleteModuleActionTest(SYNC_MODULE_UPDATES)
	})

	test('BULK_DELETE_MODULES action modifies state correctly', () => {
		const mockModuleList = [
			{
				draftId: 'mockDraftId',
				title: 'A Mock Module'
			},
			{
				draftId: 'mockDraftId2',
				title: 'B Mock Module'
			}
		]

		const initialState = {
			multiSelectMode: true,
			moduleSearchString: '',
			selectedModules: ['mockDraftId', 'mockDraftId3'],
			myModules: [
				{
					draftId: 'oldMockDraftId',
					title: 'Old Mock Module'
				}
			],
			filteredModules: [
				{
					draftId: 'oldMockDraftId',
					title: 'Old Mock Module'
				}
			]
		}

		const action = {
			type: BULK_DELETE_MODULES,
			payload: {
				value: {
					modules: mockModuleList,
					allCount: mockModuleList.length
				}
			}
		}

		const handler = dashboardReducer(initialState, action)

		const newState = handleSuccess(handler)
		expect(newState.myModules).not.toEqual(initialState.myModules)
		expect(newState.myModules).toEqual(mockModuleList)
		expect(newState.filteredModules).toEqual(mockModuleList)
		expect(newState.selectedModules).toEqual([])
		expect(newState.multiSelectMode).toBe(false)
	})

	test('BULK_ADD_MODULES_TO_COLLECTIONS action modifies state correctly', () => {
		const initialState = {
			multiSelectMode: true,
			selectedModules: ['mockDraftId1', 'mockDraftId2']
		}

		const action = {
			type: BULK_ADD_MODULES_TO_COLLECTIONS
		}

		// BULK_ADD_MODULES_TO_COLLECTIONS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.selectedModules).toEqual([])
		expect(newState.multiSelectMode).toBe(false)
	})

	test('BULK_REMOVE_MODULES_FROM_COLLECTION action modifies state correctly', () => {
		const mockModuleList = [
			{
				draftId: 'mockDraftId2',
				title: 'Mock Module 2'
			}
		]

		const oldModules = [
			{
				draftId: 'mockDraftId1',
				title: 'Mock Module 1'
			},
			{
				draftId: 'mockDraftId2',
				title: 'Mock Module 2'
			},
			{
				draftId: 'mockDraftId3',
				title: 'Mock Module 3'
			}
		]

		const initialState = {
			multiSelectMode: true,
			selectedModules: ['mockDraftId1', 'mockDraftId3'],
			myModules: [...oldModules],
			moduleCount: oldModules.length,
			collectionModules: [...oldModules]
		}

		const action = {
			type: BULK_REMOVE_MODULES_FROM_COLLECTION,
			payload: {
				value: {
					modules: mockModuleList,
					allCount: mockModuleList.length
				}
			}
		}

		const handler = dashboardReducer(initialState, action)

		const newState = handleSuccess(handler)
		expect(newState.myModules).not.toEqual(initialState.myModules)
		expect(newState.myModules).toEqual(mockModuleList)
		expect(newState.moduleCount).toEqual(mockModuleList.length)
		expect(newState.collectionModules).toEqual(mockModuleList)
		expect(newState.selectedModules).toEqual([])
		expect(newState.multiSelectMode).toBe(false)
	})

	test('SHOW_MODULE_MORE action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			}
		}
		const mockSelectedModule = {
			draftId: 'otherMockDraftId',
			title: 'Some Other Mock Module Title'
		}
		const action = {
			type: SHOW_MODULE_MORE,
			module: mockSelectedModule
		}

		// SHOW_MODULE_MORE is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('module-more')
		expect(newState.selectedModule).not.toEqual(initialState.selectedModule)
		expect(newState.selectedModule).toEqual(mockSelectedModule)
	})

	test('SHOW_MODULE_SYNC action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			}
		}

		const mockModule = {
			draftId: 'originalMockDraftId',
			title: 'Some New Mock Module Title'
		}
		const action = {
			type: SHOW_MODULE_SYNC,
			meta: {
				module: {
					draftId: 'originalMockDraftId',
					title: 'Some New Mock Module Title'
				}
			},
			payload: {
				value: mockModule
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.newest).toEqual(false)

		newState = handleSuccess(handler)
		expect(newState.newest).toEqual(mockModule)
	})

	test('SHOW_MODULE_PERMISSIONS action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			},
			searchPeople: null
		}
		const mockSelectedModule = {
			draftId: 'otherMockDraftId',
			title: 'Some Other Mock Module Title'
		}
		const action = {
			type: SHOW_MODULE_PERMISSIONS,
			module: mockSelectedModule
		}

		// SHOW_MODULE_PERMISSIONS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('module-permissions')
		expect(newState.selectedModule).not.toEqual(initialState.selectedModule)
		expect(newState.selectedModule).toEqual(mockSelectedModule)
		// searchPeople is a little odd - it contains the fetch status of the people search
		//  and also the results of that search, at any given time
		expect(newState.searchPeople).toEqual(defaultSearchResultsState)
	})

	test('CLOSE_MODAL action modifies state correctly', () => {
		const initialState = {
			dialog: 'some-dialog'
		}
		const action = {
			type: CLOSE_MODAL
		}

		// CLOSE_MODAL is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe(null)
	})

	test('FILTER_MODULES action modifies state correctly', () => {
		const initialState = {
			moduleSearchString: 'oldSearchString',
			myModules: [
				{
					draftId: 'mockDraftId',
					title: 'A Mock Module'
				},
				{
					draftId: 'mockDraftId2',
					title: 'B Mock Module'
				}
			],
			filteredModules: [
				{
					draftId: 'oldMockDraftId',
					title: 'Old Mock Module'
				}
			]
		}
		const action = {
			type: FILTER_MODULES,
			searchString: 'B'
		}

		// FILTER_MODULES is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.myModules).toEqual(initialState.myModules)
		expect(newState.filteredModules).toEqual([{ ...initialState.myModules[1] }])
		expect(newState.moduleSearchString).toBe('B')
	})

	test('FILTER_COLLECTIONS action modifies state correctly', () => {
		const initialState = {
			collectionSearchString: 'oldSearchString',
			myCollections: [
				{
					id: 'mockCollectionId',
					title: 'A Mock Collection'
				},
				{
					id: 'mockCollectionId2',
					title: 'B Mock Collection'
				}
			],
			filteredCollections: [
				{
					id: 'oldMockCollectionId',
					title: 'Old Mock Collection'
				}
			]
		}
		const action = {
			type: FILTER_COLLECTIONS,
			searchString: 'B'
		}

		// FILTER_COLLECTIONS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.myCollections).toEqual(initialState.myCollections)
		expect(newState.filteredCollections).toEqual([{ ...initialState.myCollections[1] }])
		expect(newState.collectionSearchString).toBe('B')
	})

	test('SELECT_MODULES action modifies state correctly', () => {
		const initialState = {
			multiSelectMode: false,
			myModules: [
				{
					draftId: 'mockDraftId',
					title: 'A Mock Module'
				},
				{
					draftId: 'mockDraftId2',
					title: 'B Mock Module'
				},
				{
					draftId: 'mockDraftId3',
					title: 'C Mock Module'
				}
			],
			selectedModules: []
		}
		const action = {
			type: SELECT_MODULES,
			draftIds: ['mockDraftId', 'mockDraftId3']
		}

		// SELECT_MODULES is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.myModules).toEqual(initialState.myModules)
		expect(newState.selectedModules).toEqual(['mockDraftId', 'mockDraftId3'])
		expect(newState.multiSelectMode).toBe(true)
	})

	test('DESELECT_MODULES action modifies state correctly', () => {
		const initialState = {
			multiSelectMode: true,
			myModules: [
				{
					draftId: 'mockDraftId',
					title: 'A Mock Module'
				},
				{
					draftId: 'mockDraftId2',
					title: 'B Mock Module'
				},
				{
					draftId: 'mockDraftId3',
					title: 'C Mock Module'
				}
			],
			selectedModules: ['mockDraftId', 'mockDraftId3']
		}
		const action = {
			type: DESELECT_MODULES,
			draftIds: ['mockDraftId']
		}

		// DESELECT_MODULES is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.myModules).toEqual(initialState.myModules)
		expect(newState.selectedModules).toEqual(['mockDraftId3'])
		expect(newState.multiSelectMode).toBe(true)
	})

	test('CLEAR_PEOPLE_SEARCH_RESULTS action modifies state correctly', () => {
		const initialState = {
			shareSearchString: 'oldSearchString',
			searchPeople: null
		}

		const action = { type: CLEAR_PEOPLE_SEARCH_RESULTS }

		// CLEAR_PEOPLE_SEARCH_RESULTS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.searchPeople).toEqual(defaultSearchResultsState)
		expect(newState.shareSearchString).toBe('')
	})

	test('DELETE_MODULE_PERMISSIONS action modifies state correctly', () => {
		// DELETE_MODULE_PERMISSIONS will also return a list of modules since it's
		//  possible to remove your own access to every module you have
		runModuleUserActionTest(DELETE_MODULE_PERMISSIONS, true)
	})
	test('LOAD_USERS_FOR_MODULE action modifies state correctly', () => {
		runModuleUserActionTest(LOAD_USERS_FOR_MODULE)
	})
	test('ADD_USER_TO_MODULE action modifies state correctly', () => {
		runModuleUserActionTest(ADD_USER_TO_MODULE)
	})

	test('LOAD_MODULE_COLLECTIONS action modifies state correctly', () => {
		runModuleCollectionActions(LOAD_MODULE_COLLECTIONS)
	})
	test('MODULE_ADD_TO_COLLECTION action modifies state correctly', () => {
		runModuleCollectionActions(MODULE_ADD_TO_COLLECTION)
	})
	test('MODULE_REMOVE_FROM_COLLECTION action modifies state correctly', () => {
		runModuleCollectionActions(MODULE_REMOVE_FROM_COLLECTION)
	})

	test('LOAD_USER_SEARCH action modifies state correctly', () => {
		const initialState = {
			shareSearchString: 'oldSearchString',
			searchPeople: { ...defaultSearchResultsState }
		}

		const mockUserList = [
			{
				id: 0,
				displayName: 'firstName lastName'
			},
			{
				id: 1,
				displayName: 'firstName2 lastName2'
			}
		]
		const action = {
			type: LOAD_USER_SEARCH,
			meta: {
				searchString: 'newSearchString'
			},
			payload: {
				value: mockUserList
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.shareSearchString).toEqual('newSearchString')
		expect(newState.searchPeople).toEqual(initialState.searchPeople)

		newState = handleSuccess(handler)
		expect(newState.searchPeople).not.toEqual(initialState.searchPeople)
		expect(newState.searchPeople).toEqual({
			items: mockUserList
		})
	})

	test('SHOW_MODULE_MANAGE_COLLECTIONS action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			}
		}
		const mockSelectedModule = {
			draftId: 'otherMockDraftId',
			title: 'Some Other Mock Module Title'
		}
		const action = {
			type: SHOW_MODULE_MANAGE_COLLECTIONS,
			module: mockSelectedModule
		}

		// SHOW_MODULE_MANAGE_COLLECTIONS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('module-manage-collections')
		expect(newState.selectedModule).not.toEqual(initialState.selectedModule)
		expect(newState.selectedModule).toEqual(mockSelectedModule)
	})

	test('SHOW_COLLECTION_BULK_ADD_MODULES_DIALOG action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedModules: []
		}

		const mockSelectedModules = ['mockDraftId1', 'mockDraftId2']

		const action = {
			type: SHOW_COLLECTION_BULK_ADD_MODULES_DIALOG,
			selectedModules: mockSelectedModules
		}

		// SHOW_COLLECTION_BULK_ADD_MODULES_DIALOG is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('collection-bulk-add-modules')
		expect(newState.selectedModules).toEqual(mockSelectedModules)
	})

	test('SHOW_COLLECTION_MANAGE_MODULES action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedCollection: {
				id: 'someMockCollectionId',
				title: 'Some Mock Collection Title'
			},
			searchModules: null
		}
		const mockSelectedCollection = {
			id: 'otherMockCollectionId',
			title: 'Some Other Mock Collection Title'
		}
		const action = {
			type: SHOW_COLLECTION_MANAGE_MODULES,
			collection: mockSelectedCollection
		}

		// SHOW_COLLECTION_MANAGE_MODULES is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('collection-manage-modules')
		expect(newState.selectedCollection).not.toEqual(initialState.selectedCollection)
		expect(newState.selectedCollection).toEqual(mockSelectedCollection)
		expect(newState.searchModules).toEqual({ ...defaultSearchResultsState })
	})

	test('LOAD_MODULE_SEARCH action modifies state correctly', () => {
		const initialState = {
			collectionModuleSearchString: 'oldSearchString',
			searchModules: { ...defaultSearchResultsState }
		}

		const mockModuleList = [
			{
				draftId: 'mockDraftId',
				title: 'Mock Draft Title'
			},
			{
				draftId: 'mockDraftId2',
				title: 'Mock Draft Title 2'
			}
		]
		const action = {
			type: LOAD_MODULE_SEARCH,
			meta: {
				searchString: 'newSearchString'
			},
			payload: {
				value: {
					modules: mockModuleList
				}
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.collectionModuleSearchString).toEqual('newSearchString')
		expect(newState.searchModules).toEqual(initialState.searchModules)

		newState = handleSuccess(handler)
		expect(newState.searchModules).not.toEqual(initialState.searchModules)
		expect(newState.searchModules).toEqual({
			items: mockModuleList
		})
	})

	test('CLEAR_MODULE_SEARCH_RESULTS action modifies state correctly', () => {
		const initialState = {
			shareSearchString: 'oldSearchString',
			searchModules: null
		}

		const action = { type: CLEAR_MODULE_SEARCH_RESULTS }

		// CLEAR_MODULE_SEARCH_RESULTS is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.searchModules).toEqual(defaultSearchResultsState)
		expect(newState.shareSearchString).toBe('')
	})

	test('COLLECTION_ADD_MODULE action modifies state correctly - not same collection', () => {
		runCollectionModuleActions(COLLECTION_ADD_MODULE)
	})
	test('COLLECTION_ADD_MODULE action modifies state correctly - same collection', () => {
		runCollectionModuleActions(COLLECTION_ADD_MODULE, true)
	})
	test('COLLECTION_REMOVE_MODULE action modifies state correctly - not same collection', () => {
		runCollectionModuleActions(COLLECTION_REMOVE_MODULE)
	})
	test('COLLECTION_REMOVE_MODULE action modifies state correctly - same collection', () => {
		runCollectionModuleActions(COLLECTION_REMOVE_MODULE, true)
	})
	test('LOAD_COLLECTION_MODULES action modifies state correctly - not same collection', () => {
		runCollectionModuleActions(LOAD_COLLECTION_MODULES)
	})
	test('LOAD_COLLECTION_MODULES action modifies state correctly - same collection', () => {
		runCollectionModuleActions(LOAD_COLLECTION_MODULES, true)
	})

	test('SHOW_COLLECTION_RENAME action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			selectedCollection: null
		}
		const mockSelectedCollection = {
			id: 'mockCollectionId',
			title: 'Mock Collection Title'
		}
		const action = {
			type: SHOW_COLLECTION_RENAME,
			collection: mockSelectedCollection
		}

		// SHOW_COLLECTION_RENAME is a synchronous action - state changes immediately
		const newState = dashboardReducer(initialState, action)
		expect(newState.dialog).toBe('collection-rename')
		expect(newState.selectedCollection).not.toEqual(initialState.selectedCollection)
		expect(newState.selectedCollection).toEqual(mockSelectedCollection)
	})

	test('SHOW_VERSION_HISTORY action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			dialogProps: null,
			versionHistory: {
				isFetching: false,
				hasFetched: false,
				items: []
			},
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			}
		}

		const mockModule = {
			draftId: 'someOtherMockDraftId',
			title: 'Some Other Mock Module Title'
		}

		const mockHistoryItems = [
			{
				id: 'mockHistoryId1',
				createdAtDisplay: 'mockCreatedAtDisplay1',
				username: 'mockUserName1',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			},
			{
				id: 'mockHistoryId2',
				createdAtDisplay: 'mockCreatedAtDisplay2',
				username: 'mockUserName1',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			},
			{
				id: 'mockHistoryId3',
				createdAtDisplay: 'mockCreatedAtDisplay3',
				username: 'mockUserName2',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			}
		]
		const action = {
			type: SHOW_VERSION_HISTORY,
			meta: {
				module: mockModule
			},
			payload: mockHistoryItems
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.dialog).toEqual('module-version-history')
		expect(newState.selectedModule).toEqual(mockModule)
		expect(newState.versionHistory).toEqual({
			isFetching: true,
			hasFetched: false,
			items: []
		})

		newState = handleSuccess(handler)
		expect(newState.versionHistory).not.toEqual(initialState.versionHistory)
		expect(newState.versionHistory).toEqual({
			isFetching: false,
			hasFetched: true,
			items: mockHistoryItems
		})
	})

	test('RESTORE_VERSION action modifies state correctly', () => {
		const initialState = {
			dialog: null,
			dialogProps: null,
			versionHistory: {
				isFetching: false,
				hasFetched: false,
				items: []
			},
			selectedModule: {
				draftId: 'someMockDraftId',
				title: 'Some Mock Module Title'
			}
		}

		const mockModule = {
			draftId: 'someOtherMockDraftId',
			title: 'Some Other Mock Module Title'
		}

		const mockHistoryItems = [
			{
				id: 'mockHistoryId1',
				createdAtDisplay: 'mockCreatedAtDisplay1',
				username: 'mockUserName1',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			},
			{
				id: 'mockHistoryId2',
				createdAtDisplay: 'mockCreatedAtDisplay2',
				username: 'mockUserName1',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			},
			{
				id: 'mockHistoryId3',
				createdAtDisplay: 'mockCreatedAtDisplay3',
				username: 'mockUserName2',
				versionNumber: 'mockVersionNumber1',
				isRestored: false
			}
		]
		const action = {
			type: RESTORE_VERSION,
			meta: {
				module: mockModule
			},
			payload: mockHistoryItems
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.versionHistory).toEqual({
			isFetching: true,
			hasFetched: false,
			items: []
		})

		newState = handleSuccess(handler)
		expect(newState.versionHistory).not.toEqual(initialState.versionHistory)
		expect(newState.versionHistory).toEqual({
			isFetching: false,
			hasFetched: true,
			items: mockHistoryItems
		})
	})

	test('SHOW_ASSESSMENT_SCORE_DATA action modifies state correctly', () => {
		const initialState = {
			assessmentStats: {
				isFetching: false,
				hasFetched: false,
				items: []
			}
		}

		const mockAttemptItems = [
			{
				id: 'mockAttemptId1'
			},
			{
				id: 'mockAttemptId2'
			},
			{
				id: 'mockAttemptId3'
			}
		]
		const action = {
			type: SHOW_ASSESSMENT_SCORE_DATA,
			payload: mockAttemptItems,
			meta: {
				module: jest.fn()
			}
		}

		// asynchronous action - state changes on success
		const handler = dashboardReducer(initialState, action)
		let newState

		newState = handleStart(handler)
		expect(newState.attempts).toEqual({
			isFetching: true,
			hasFetched: false,
			items: []
		})

		newState = handleSuccess(handler)
		expect(newState.attempts).not.toEqual(initialState.attempts)
		expect(newState.attempts).toEqual({
			isFetching: false,
			hasFetched: true,
			items: mockAttemptItems
		})
	})

	test('GET_MODULES action modifies state correctly', () => {
		// With user currently looking at "My Deleted Modules" page
		const initialState = {
			myModules: [
				{
					draftId: 'mockDraftId',
					title: 'A Mock Module'
				},
				{
					draftId: 'mockDraftId2',
					title: 'B Mock Module'
				},
				{
					draftId: 'mockDraftId3',
					title: 'C Mock Module'
				}
			],
			selectedModules: []
		}

		const undeletedModules = [
			{
				draftId: 'mockDraftId4',
				title: 'D Mock Module'
			},
			{
				draftId: 'mockDraftId5',
				title: 'E Mock Module'
			}
		]

		const action = {
			type: GET_MODULES,
			payload: {
				value: undeletedModules
			}
		}

		const handler = dashboardReducer(initialState, action)
		const newState = handleSuccess(handler)
		expect(newState.myModules).toEqual(undeletedModules)
	})

	test('GET_DELETED_MODULES action modifies state correctly', () => {
		// With user currently looking at "My Modules" page
		const initialState = {
			myModules: [
				{
					draftId: 'mockDraftId',
					title: 'A Mock Module'
				},
				{
					draftId: 'mockDraftId2',
					title: 'B Mock Module'
				},
				{
					draftId: 'mockDraftId3',
					title: 'C Mock Module'
				}
			],
			selectedModules: []
		}

		const deletedModules = [
			{
				draftId: 'mockDraftId4',
				title: 'D Mock Module'
			},
			{
				draftId: 'mockDraftId5',
				title: 'E Mock Module'
			}
		]

		const action = {
			type: GET_DELETED_MODULES,
			payload: {
				value: deletedModules
			}
		}

		const handler = dashboardReducer(initialState, action)
		const newState = handleSuccess(handler)
		expect(newState.myModules).toEqual(deletedModules)
	})

	test('BULK_RESTORE_MODULES action modifies state correctly', () => {
		const mockModuleList = [
			{
				draftId: 'mockDraftId',
				title: 'A Mock Module'
			},
			{
				draftId: 'mockDraftId2',
				title: 'B Mock Module'
			},
			{
				draftId: 'mockDraftId3',
				title: 'C Mock Module'
			}
		]

		const initialState = {
			multiSelectMode: true,
			selectedModules: ['mockDraftId'],
			myModules: [
				{
					draftId: 'mockDraftId3',
					title: 'C Mock Module'
				}
			]
		}

		const action = {
			type: BULK_RESTORE_MODULES,
			payload: {
				value: mockModuleList
			}
		}

		const handler = dashboardReducer(initialState, action)
		const newState = handleSuccess(handler)

		expect(newState.myModules).not.toEqual(initialState.myModules)
		expect(newState.myModules).toEqual(mockModuleList)
		expect(newState.selectedModules).toEqual([])
		expect(newState.multiSelectMode).toBe(false)
	})

	test('unrecognized action types just return the current state', () => {
		const initialState = {
			key: 'initialValue'
		}

		const action = {
			type: 'UNSUPPORTED_TYPE',
			key: 'someOtherValue'
		}

		const newState = dashboardReducer(initialState, action)
		expect(newState.key).toEqual(initialState.key)
	})
})
