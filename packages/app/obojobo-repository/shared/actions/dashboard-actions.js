// =================== API =======================

const defaultOptions = () => ({
	method: 'GET',
	credentials: 'include',
	headers: {
		Accept: 'application/json',
		'Content-Type': 'application/json'
	}
})

const apiSearchForUser = searchString => {
	return fetch(`/api/users/search?q=${searchString}`, defaultOptions()).then(res => res.json())
}

const apiAddPermissionsToModule = (draftId, userId) => {
	const options = { ...defaultOptions(), method: 'POST', body: `{"userId":${userId}}` }
	return fetch(`/api/drafts/${draftId}/permission`, options).then(res => res.json())
}

const apiGetPermissionsForModule = draftId => {
	return fetch(`/api/drafts/${draftId}/permission`, defaultOptions()).then(res => res.json())
}

const apiDeletePermissionsToModule = (draftId, userId) => {
	const options = { ...defaultOptions(), method: 'DELETE' }
	return fetch(`/api/drafts/${draftId}/permission/${userId}`, options).then(res => res.json())
}

const apiDeleteModule = draftId => {
	const options = { ...defaultOptions(), method: 'DELETE' }
	return fetch(`/api/drafts/${draftId}`, options).then(res => res.json())
}

const apiGetMyModules = () => {
	return fetch('/api/drafts', defaultOptions()).then(res => res.json())
}

const apiCreateNewModule = useTutorial => {
	const url = useTutorial ? '/api/drafts/tutorial' : '/api/drafts/new'
	const options = { ...defaultOptions(), method: 'POST' }
	return fetch(url, options).then(res => res.json())
}

// ================== ACTIONS ===================

const SHOW_MODULE_PERMISSIONS = 'SHOW_MODULE_PERMISSIONS'
const showModulePermissions = module => ({
	type: SHOW_MODULE_PERMISSIONS,
	module
})

const CLOSE_MODAL = 'CLOSE_MODAL'
const closeModal = () => ({ type: CLOSE_MODAL })

const CLEAR_PEOPLE_SEARCH_RESULTS = 'CLEAR_PEOPLE_SEARCH_RESULTS'
const clearPeopleSearchResults = () => ({ type: CLEAR_PEOPLE_SEARCH_RESULTS })

const LOAD_USER_SEARCH = 'LOAD_USER_SEARCH'
const searchForUser = searchString => ({
	type: LOAD_USER_SEARCH,
	meta: {
		searchString
	},
	promise: apiSearchForUser(searchString)
})

const ADD_USER_TO_MODULE = 'ADD_USER_TO_MODULE'
const addUserToModule = (draftId, userId) => ({
	type: ADD_USER_TO_MODULE,
	promise: apiAddPermissionsToModule(draftId, userId).then(() =>
		apiGetPermissionsForModule(draftId)
	)
})

const DELETE_MODULE_PERMISSIONS = 'DELETE_MODULE_PERMISSIONS'
const deleteModulePermissions = (draftId, userId) => ({
	type: DELETE_MODULE_PERMISSIONS,
	promise: apiDeletePermissionsToModule(draftId, userId)
		.then(() => {
			return Promise.all([apiGetMyModules(), apiGetPermissionsForModule(draftId)])
		})
		.then(results => ({
			value: results[1].value,
			modules: results[0].value
		}))
})

const LOAD_USERS_FOR_MODULE = 'LOAD_USERS_FOR_MODULE'
const loadUsersForModule = draftId => ({
	type: LOAD_USERS_FOR_MODULE,
	promise: apiGetPermissionsForModule(draftId)
})

const DELETE_MODULE = 'DELETE_MODULE'
const deleteModule = draftId => ({
	type: DELETE_MODULE,
	promise: apiDeleteModule(draftId).then(apiGetMyModules)
})

const CREATE_NEW_MODULE = 'CREATE_NEW_MODULE'
const createNewModule = (useTutorial = false) => ({
	type: CREATE_NEW_MODULE,
	promise: apiCreateNewModule(useTutorial).then(apiGetMyModules)
})

const FILTER_MODULES = 'FILTER_MODULES'
const filterModules = searchString => ({
	type: FILTER_MODULES,
	searchString
})

const SHOW_MODULE_MORE = 'SHOW_MODULE_MORE'
const showModuleMore = module => ({
	type: SHOW_MODULE_MORE,
	module
})

module.exports = {
	SHOW_MODULE_PERMISSIONS,
	LOAD_USER_SEARCH,
	CLOSE_MODAL,
	ADD_USER_TO_MODULE,
	LOAD_USERS_FOR_MODULE,
	CREATE_NEW_MODULE,
	CLEAR_PEOPLE_SEARCH_RESULTS,
	DELETE_MODULE_PERMISSIONS,
	DELETE_MODULE,
	FILTER_MODULES,
	SHOW_MODULE_MORE,
	filterModules,
	deleteModule,
	closeModal,
	deleteModulePermissions,
	searchForUser,
	addUserToModule,
	createNewModule,
	showModulePermissions,
	loadUsersForModule,
	clearPeopleSearchResults,
	showModuleMore
}
