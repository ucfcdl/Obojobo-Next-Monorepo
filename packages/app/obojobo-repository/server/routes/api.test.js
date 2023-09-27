jest.mock('../services/collections')
jest.mock('../models/collection_summary')
jest.mock('../models/collection')
jest.mock('../models/draft_summary')
jest.mock('obojobo-express/server/models/draft')
jest.mock('../models/drafts_metadata')
jest.mock('../services/search')
jest.mock('../models/draft_permissions')
jest.mock('../services/collections')
jest.mock('../services/count')
jest.mock('obojobo-express/server/models/user')
jest.mock('obojobo-express/server/insert_event')
jest.unmock('fs') // need fs working for view rendering
jest.unmock('express') // we'll use supertest + express for this

jest.mock('uuid', () => ({
	v4: jest.fn()
}))

let CollectionSummary
let Collection
let DraftSummary
let Draft
let DraftsMetadata
let SearchServices
let CollectionsServices
let CountServices
let UserModel
let insertEvent
let DraftPermissions

// override requireCurrentUser for tests to provide our own user
let mockCurrentUser

// override requireCurrentDocument for tests to provide our own document
let mockCurrentDocument

jest.mock('obojobo-express/server/express_current_user', () => (req, res, next) => {
	req.requireCurrentUser = () => {
		req.currentUser = mockCurrentUser
		return Promise.resolve(mockCurrentUser)
	}
	req.getCurrentUser = () => {
		req.currentUser = mockCurrentUser
		return Promise.resolve(mockCurrentUser)
	}
	next()
})

jest.mock('obojobo-express/server/express_current_document', () => (req, res, next) => {
	req.requireCurrentDocument = () => {
		mockCurrentDocument.draftId = req.params.draftId
		req.currentDocument = mockCurrentDocument
		return Promise.resolve(mockCurrentDocument)
	}
	next()
})

// setup express server
const path = require('path')
const request = require('supertest')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

const uuid = require('uuid').v4

// register express-react-views template engine if not already registered
app.engine('jsx', require('express-react-views-custom').createEngine())

app.set('view engine', 'jsx')

let viewPaths = app.get('views')
if (!Array.isArray(viewPaths)) viewPaths = [viewPaths]
viewPaths.push(path.resolve(`${__dirname}/../../shared/components`)) // add the components dir so babel can transpile the jsx
app.set('views', viewPaths)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(require('obojobo-express/server/express_current_user'))
app.use(require('obojobo-express/server/express_current_document'))

app.use('/', require('obojobo-express/server/express_response_decorator'))
app.use('/', require('obojobo-repository/server/routes/api'))

import { FULL, PARTIAL, MINIMAL, levelName } from '../../../obojobo-express/server/constants'

describe('repository api route', () => {
	beforeEach(() => {
		jest.resetAllMocks()
		mockCurrentUser = {
			id: 99,
			hasPermission: () => true
		}
		mockCurrentDocument = {}
		CollectionSummary = require('../models/collection_summary')
		Collection = require('../models/collection')
		DraftSummary = require('../models/draft_summary')
		Draft = require('obojobo-express/server/models/draft')
		DraftsMetadata = require('../models/drafts_metadata')
		SearchServices = require('../services/search')
		CollectionsServices = require('../services/collections')
		CountServices = require('../services/count')
		DraftPermissions = require('../models/draft_permissions')
		UserModel = require('obojobo-express/server/models/user')
		insertEvent = require('obojobo-express/server/insert_event')
	})

	test('get /drafts-public returns the expected response', () => {
		expect.hasAssertions()

		const publicLibCollectionId = require('../../shared/publicLibCollectionId')

		const mockResult = [
			{ draftId: 'mockDraftId1' },
			{ draftId: 'mockDraftId2' },
			{ draftId: 'mockDraftId3' }
		]
		const loadRelatedDraftsMock = jest.fn()
		const mockCollection = {
			loadRelatedDrafts: loadRelatedDraftsMock,
			// This would normally be set by loadRelatedDrafts,
			// but we test all that elsewhere - just mock it here
			drafts: mockResult
		}

		mockCollection.loadRelatedDrafts.mockResolvedValueOnce(mockCollection)

		Collection.fetchById = jest.fn()
		Collection.fetchById.mockResolvedValueOnce(mockCollection)

		return request(app)
			.get('/drafts-public')
			.then(response => {
				expect(Collection.fetchById).toHaveBeenCalledWith(publicLibCollectionId)
				expect(loadRelatedDraftsMock).toHaveBeenCalledTimes(1)
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual(mockResult)
			})
	})

	test('get /collections returns the expected response', () => {
		const mockResult = [
			{ id: 'mockCollectionId1', title: 'whatever1' },
			{ id: 'mockCollectionId2', title: 'whatever2' },
			{ id: 'mockCollectionId3', title: 'whatever3' }
		]

		CollectionSummary.fetchByUserId = jest.fn()
		CollectionSummary.fetchByUserId.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/collections')
			.then(response => {
				expect(CollectionSummary.fetchByUserId).toHaveBeenCalledWith(mockCurrentUser.id)
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual(mockResult)
			})
	})

	test('get /recent/drafts returns the expected response', () => {
		expect.hasAssertions()

		const mockResult = [
			{ draftId: 'mockDraftId1' },
			{ draftId: 'mockDraftId2' },
			{ draftId: 'mockDraftId3' }
		]

		CountServices.getUserModuleCount.mockResolvedValueOnce(mockResult.length)

		DraftSummary.fetchRecentByUserId = jest.fn()
		DraftSummary.fetchRecentByUserId.mockResolvedValueOnce(mockResult)

		return request(app)
			.get('/recent/drafts')
			.then(response => {
				expect(CountServices.getUserModuleCount).toHaveBeenCalledWith(mockCurrentUser.id)

				expect(DraftSummary.fetchRecentByUserId).toHaveBeenCalledWith(mockCurrentUser.id)

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual({
					allCount: mockResult.length,
					modules: mockResult
				})
			})
	})

	test('get /drafts returns the expected response', () => {
		const mockResult = [
			{ draftId: 'mockDraftId1', title: 'whatever1' },
			{ draftId: 'mockDraftId2', title: 'whatever2' },
			{ draftId: 'mockDraftId3', title: 'whatever3' }
		]

		CountServices.getUserModuleCount.mockResolvedValueOnce(mockResult.length)

		DraftSummary.fetchByUserId = jest.fn()
		DraftSummary.fetchByUserId.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/drafts')
			.then(response => {
				expect(CountServices.getUserModuleCount).toHaveBeenCalledWith(mockCurrentUser.id)
				expect(DraftSummary.fetchByUserId).toHaveBeenCalledWith(mockCurrentUser.id)
				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual({
					allCount: 3,
					modules: mockResult
				})
			})
	})

	test('get /drafts-stats returns the expected response when the user does not have the canViewStatsPage permission', () => {
		// technically only have to return false for canViewStatsPage, but that's the only one being checked here anyway
		mockCurrentUser.hasPermission = () => false

		DraftSummary.fetchByUserId = jest.fn()
		DraftSummary.fetchAll = jest.fn()

		expect.hasAssertions()

		return request(app)
			.get('/drafts-stats')
			.then(response => {
				expect(DraftSummary.fetchByUserId).not.toHaveBeenCalled()
				expect(DraftSummary.fetchAll).not.toHaveBeenCalled()

				expect(response.statusCode).toBe(401)
			})
	})

	test('get /drafts-stats returns the expected response when the user has the canViewStatsPage permission but not the canViewSystemStats permission', () => {
		const mockResult = [
			{ draftId: 'mockDraftId1', title: 'whatever1' },
			{ draftId: 'mockDraftId2', title: 'whatever2' },
			{ draftId: 'mockDraftId3', title: 'whatever3' }
		]

		mockCurrentUser.hasPermission = perm => perm === 'canViewStatsPage'

		DraftSummary.fetchByUserId = jest.fn()
		DraftSummary.fetchByUserId.mockResolvedValueOnce(mockResult)
		DraftSummary.fetchAll = jest.fn()

		expect.hasAssertions()

		return request(app)
			.get('/drafts-stats')
			.then(response => {
				expect(DraftSummary.fetchByUserId).toHaveBeenCalled()
				expect(DraftSummary.fetchAll).not.toHaveBeenCalled()

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult)
			})
	})

	test('get /drafts-stats returns the expected response when the user has the canViewStatsPage and canViewSystemStats permissions', () => {
		const mockResult = [
			{ draftId: 'mockDraftId1', title: 'whatever1' },
			{ draftId: 'mockDraftId2', title: 'whatever2' },
			{ draftId: 'mockDraftId3', title: 'whatever3' }
		]

		DraftSummary.fetchByUserId = jest.fn()
		DraftSummary.fetchAll = jest.fn()
		DraftSummary.fetchAll.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/drafts-stats')
			.then(response => {
				expect(DraftSummary.fetchByUserId).not.toHaveBeenCalled()
				expect(DraftSummary.fetchAll).toHaveBeenCalled()

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult)
			})
	})

	test('get /drafts-deleted returns the expected response', () => {
		const mockResult = [
			{ draftId: 'mockDraftId1', title: 'whatever1' },
			{ draftId: 'mockDraftId2', title: 'whatever2' },
			{ draftId: 'mockDraftId3', title: 'whatever3' }
		]

		DraftSummary.fetchDeletedByUserId = jest.fn()
		DraftSummary.fetchDeletedByUserId.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/drafts-deleted')
			.then(response => {
				expect(DraftSummary.fetchDeletedByUserId).toHaveBeenCalled()
				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult)
			})
	})

	test('get /drafts/:draftId/revisions/ returns the expected response, no after - hasMoreResults false', () => {
		const mockResult = {
			revisions: [
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId1'
				},
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId2'
				}
			],
			hasMoreResults: false
		}

		DraftSummary.fetchAllDraftRevisions = jest.fn()
		DraftSummary.fetchAllDraftRevisions.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/drafts/mockDraftId/revisions/')
			.then(response => {
				// query.after is optional - will be undefined otherwise
				// eslint-disable-next-line no-undefined
				expect(DraftSummary.fetchAllDraftRevisions).toHaveBeenCalledWith('mockDraftId', undefined)

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult.revisions)
				expect(response.links).toEqual({})
			})
	})
	test('get /drafts/:draftId/revisions/ returns the expected response, no after - hasMoreResults true', () => {
		const mockResult = {
			revisions: [
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId1'
				},
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId2'
				}
			],
			hasMoreResults: true
		}

		DraftSummary.fetchAllDraftRevisions = jest.fn()
		DraftSummary.fetchAllDraftRevisions.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/drafts/mockDraftId/revisions/')
			.then(response => {
				// query.after is optional - will be undefined otherwise
				// eslint-disable-next-line no-undefined
				expect(DraftSummary.fetchAllDraftRevisions).toHaveBeenCalledWith('mockDraftId', undefined)

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult.revisions)
				expect(response.links).toHaveProperty('next')
				const nextLinkRegex = new RegExp(
					/^http:\/\/(.*)\/drafts\/mockDraftId\/revisions\/\?after=mockRevisionId2$/
				)
				expect(response.links.next).toEqual(expect.stringMatching(nextLinkRegex))
			})
	})
	test('get /drafts/:draftId/revisions/ returns the expected response, after - hasMoreResults false', () => {
		// after ID has to be a valid UUID and we can't mock the helper function, so...
		const mockAfterUUID = '00000000-0000-0000-0000-000000000000'

		const mockResult = {
			revisions: [
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId1'
				},
				{
					draftId: 'mockDraftId',
					revisionId: 'mockRevisionId2'
				}
			],
			hasMoreResults: false
		}

		DraftSummary.fetchAllDraftRevisions = jest.fn()
		DraftSummary.fetchAllDraftRevisions.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get(`/drafts/mockDraftId/revisions?after=${mockAfterUUID}`)
			.then(response => {
				expect(DraftSummary.fetchAllDraftRevisions).toHaveBeenCalledWith(
					'mockDraftId',
					mockAfterUUID
				)

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult.revisions)
				expect(response.links).toEqual({})
			})
	})
	test('get /drafts/:draftId/revisions/ catches unexpected errors correctly', () => {
		expect.hasAssertions()

		DraftSummary.fetchAllDraftRevisions.mockRejectedValueOnce('database error')

		return request(app)
			.get('/drafts/mockDraftId/revisions')
			.then(response => {
				expect(response.statusCode).toBe(500)
				expect(response.error).toHaveProperty('text', 'Server Error: database error')
			})
	})

	test('get /drafts/:draftId/revisions/:revisionId returns the expected response', () => {
		// revision ID has to be a valid UUID and we can't mock the helper function, so...
		const mockRevisionUUID = '00000000-0000-0000-0000-000000000000'

		const mockResult = {
			draftId: 'mockDraftId',
			revisionId: mockRevisionUUID,
			title: 'whatever1'
		}

		DraftSummary.fetchDraftRevisionById = jest.fn()
		DraftSummary.fetchDraftRevisionById.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get(`/drafts/mockDraftId/revisions/${mockRevisionUUID}`)
			.then(response => {
				expect(DraftSummary.fetchDraftRevisionById).toHaveBeenCalledWith(
					'mockDraftId',
					mockRevisionUUID
				)

				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual(mockResult)
			})
	})

	test('get /users/search returns the expected response when given a search string', () => {
		expect.hasAssertions()

		const mockResult = [
			{ toJSON: jest.fn(() => ({ id: 1 })) },
			{ toJSON: jest.fn(() => ({ id: 2 })) },
			{ toJSON: jest.fn(() => ({ id: 3 })) }
		]

		SearchServices.searchForUserByString.mockResolvedValueOnce(mockResult)

		return request(app)
			.get('/users/search?q=searchString')
			.then(response => {
				expect(SearchServices.searchForUserByString).toHaveBeenCalledTimes(1)
				expect(SearchServices.searchForUserByString).toHaveBeenCalledWith('searchString')
				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
			})
	})

	test('get /users/search returns the expected response when given no search string', () => {
		expect.hasAssertions()

		return request(app)
			.get('/users/search?q=')
			.then(response => {
				expect(SearchServices.searchForUserByString).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual([])
			})
	})

	test('get /users/search handles thrown errors', () => {
		expect.hasAssertions()

		SearchServices.searchForUserByString.mockRejectedValueOnce('database error')

		return request(app)
			.get('/users/search?q=searchString')
			.then(response => {
				expect(SearchServices.searchForUserByString).toHaveBeenCalledTimes(1)
				expect(SearchServices.searchForUserByString).toHaveBeenCalledWith('searchString')
				expect(response.statusCode).toBe(500)
				expect(response.error).toHaveProperty('text', 'Server Error: database error')
			})
	})

	test('post /drafts/:draftId/copy returns the expected response when user can copy draft', () => {
		expect.hasAssertions()

		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			}
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			}
		}

		DraftPermissions.userHasPermissionToCopy.mockResolvedValueOnce(true)

		Draft.fetchById = jest.fn()
		Draft.fetchById.mockResolvedValueOnce(mockDraft)
		Draft.createWithContent.mockResolvedValueOnce(mockDraftObject)

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.send({ visitId: 'mockVisitId' })
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCopy).toHaveBeenCalledWith(
					mockCurrentUser,
					mockCurrentDocument.draftId
				)
				expect(Draft.fetchById).toHaveBeenCalledWith(mockCurrentDocument.draftId)
				expect(mockDraftObject.content.title).toEqual('mockDraftTitle Copy')
				expect(Draft.createWithContent).toHaveBeenCalledWith(mockCurrentUser.id, mockDraftObject)
				expect(DraftsMetadata).toHaveBeenCalledTimes(1)
				expect(DraftsMetadata).toHaveBeenCalledWith({
					draft_id: 'mockNewDraftId',
					key: 'copied',
					value: mockCurrentDocument.draftId
				})
				expect(DraftsMetadata.mock.instances[0].saveOrCreate).toHaveBeenCalledTimes(1)
				expect(insertEvent).toHaveBeenCalledWith({
					actorTime: 'now()',
					action: 'draft:copy',
					userId: mockCurrentUser.id,
					ip: '::ffff:127.0.0.1', //any way to set req.connection.remoteAddress?
					metadata: {},
					payload: { from: mockCurrentDocument.draftId },
					draftId: 'mockNewDraftId',
					contentId: 'mockNewDraftContentId',
					eventVersion: '1.0.0',
					isPreview: false,
					visitId: 'mockVisitId'
				})
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /drafts/:draftId/copy sets title if one is provided', () => {
		expect.hasAssertions()

		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			}
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			}
		}

		DraftPermissions.userHasPermissionToCopy.mockResolvedValueOnce(true)

		Draft.fetchById = jest.fn()
		Draft.fetchById.mockResolvedValueOnce(mockDraft)
		Draft.createWithContent.mockResolvedValueOnce(mockDraftObject)

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.send({ visitId: 'mockVisitId', title: 'New Draft Title' })
			.then(() => {
				expect(mockDraftObject.content.title).toEqual('New Draft Title')
				// everything else is unchanged from above
			})
	})

	test('post /drafts/:draftId/copy makes the copy read-only if specified', () => {
		expect.hasAssertions()

		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			}
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			}
		}

		DraftPermissions.userHasPermissionToCopy.mockResolvedValueOnce(true)

		Draft.fetchById = jest.fn()
		Draft.fetchById.mockResolvedValueOnce(mockDraft)
		Draft.createWithContent.mockResolvedValueOnce(mockDraftObject)

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.send({ visitId: 'mockVisitId', title: 'New Draft Title', readOnly: true })
			.then(() => {
				expect(mockDraftObject.content.title).toEqual('New Draft Title')
				// everything else is unchanged from above
				expect(DraftsMetadata).toHaveBeenCalledTimes(2)
				expect(DraftsMetadata).toHaveBeenCalledWith({
					draft_id: 'mockNewDraftId',
					key: 'copied',
					value: mockCurrentDocument.draftId
				})
				expect({
					draft_id: 'mockNewDraftId',
					key: 'read_only',
					value: true
				})
				expect(DraftsMetadata.mock.instances[0].saveOrCreate).toHaveBeenCalledTimes(1)
				expect(DraftsMetadata.mock.instances[1].saveOrCreate).toHaveBeenCalledTimes(1)
			})
	})

	test('post /drafts/:draftId/copy refreshes all node IDs in a document', () => {
		expect.hasAssertions()

		// have a bit of a document just to make sure substitutions work everywhere
		// actual details such as type, etc. don't matter too much here
		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			},
			children: [
				{
					id: 'do-not-change-me',
					children: [
						{ id: '4baa2860-5219-404f-9d99-616ca8f81e41' },
						{
							id: 'adcc55b7-e412-4f44-b64f-6c317021f812',
							reference: {
								id: '4baa2860-5219-404f-9d99-616ca8f81e41'
							}
						},
						{ id: '9d992860-3540-5219-8b4a-1e41616ca8f8' }
					]
				}
			]
		}

		// this is admittedly sort of magical - we happen to know how many times
		//  this should run based on the document structure we made above
		// potentially find a more elegant way of doing this
		uuid
			.mockReturnValueOnce('00000000-0000-0000-0000-000000000001')
			.mockReturnValueOnce('00000000-0000-0000-0000-000000000002')
			.mockReturnValueOnce('00000000-0000-0000-0000-000000000003')

		// this is also a bit brute force, but it does the job
		const expectedNewDraftDocument = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'New Draft Title'
			},
			children: [
				{
					id: 'do-not-change-me',
					children: [
						{ id: '00000000-0000-0000-0000-000000000001' },
						{
							id: '00000000-0000-0000-0000-000000000002',
							reference: {
								id: '00000000-0000-0000-0000-000000000001'
							}
						},
						{ id: '00000000-0000-0000-0000-000000000003' }
					]
				}
			]
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			},
			// this would be handled by the Draft model, but we're mocking that so
			//  we have to do this ourselves
			nodesById: new Map([
				['do-not-change-me', {}],
				['4baa2860-5219-404f-9d99-616ca8f81e41', {}],
				['adcc55b7-e412-4f44-b64f-6c317021f812', {}],
				['9d992860-3540-5219-8b4a-1e41616ca8f8', {}]
			])
		}

		DraftPermissions.userHasPermissionToCopy.mockResolvedValueOnce(true)

		Draft.fetchById = jest.fn()
		Draft.fetchById.mockResolvedValueOnce(mockDraft)

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.send({ visitId: 'mockVisitId', title: 'New Draft Title' })
			.then(() => {
				expect(uuid).toHaveBeenCalledTimes(3)
				// 99 = mock user id
				expect(Draft.createWithContent).toHaveBeenCalledWith(99, expectedNewDraftDocument)
			})
	})

	test('post /drafts/:draftId/copy returns the expected response when user can not copy draft', () => {
		expect.hasAssertions()

		DraftPermissions.userHasPermissionToCopy.mockResolvedValueOnce(false)

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCopy).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCopy).toHaveBeenCalledWith(
					mockCurrentUser,
					mockCurrentDocument.draftId
				)
				expect(response.statusCode).toBe(401)
			})
	})

	test('post /drafts/:draftId/copy handles thrown errors', () => {
		expect.hasAssertions()

		DraftPermissions.userHasPermissionToCopy.mockRejectedValueOnce('database error')

		return request(app)
			.post('/drafts/mockDraftId/copy')
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCopy).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCopy).toHaveBeenCalledWith(
					mockCurrentUser,
					mockCurrentDocument.draftId
				)
				expect(response.statusCode).toBe(500)
				expect(response.error).toHaveProperty('text', 'Server Error: database error')
			})
	})

	test('get /drafts/:draftId/sync calls the correct functions and returns the expected response', () => {
		expect.hasAssertions()

		const mockMetadataResponse = {
			value: 'mockOriginalDraftId',
			updatedAt: '1999-01-01 01:00:00.000000+00'
		}

		const mockDraftResponse = {
			draftId: 'originalDraftId'
		}

		DraftsMetadata.getByDraftIdAndKey.mockResolvedValueOnce(mockMetadataResponse)
		DraftSummary.fetchByIdMoreRecentThan.mockResolvedValueOnce(mockDraftResponse)

		return request(app)
			.get('/drafts/mockDraftId/sync')
			.then(response => {
				expect(DraftsMetadata.getByDraftIdAndKey).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					'copied'
				)
				expect(DraftSummary.fetchByIdMoreRecentThan).toHaveBeenCalledWith(
					mockMetadataResponse.value,
					mockMetadataResponse.updatedAt
				)
				expect(response.body).toEqual(mockDraftResponse)
				expect(response.statusCode).toBe(200)
			})
	})

	test('get /drafts/:draftId/sync returns unexpected when encountering an error', () => {
		expect.hasAssertions()

		const mockError = new Error('not found in db')
		DraftsMetadata.getByDraftIdAndKey.mockRejectedValue(mockError)

		return request(app)
			.get('/drafts/mockDraftId/sync')
			.then(response => {
				expect(DraftsMetadata.getByDraftIdAndKey).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					'copied'
				)
				expect(DraftSummary.fetchByIdMoreRecentThan).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(500)
			})
	})

	test('patch /drafts/:draftId/sync returns notAuthorized for users with minimal access to the draft', () => {
		expect.hasAssertions()

		const mockMetaSaveOrCreate = jest.fn()
		DraftsMetadata.getByDraftIdAndKey.mockResolvedValueOnce({
			value: 'mockOriginalDraftId',
			updatedAt: '1999-01-01 01:00:00.000000+00',
			saveOrCreate: mockMetaSaveOrCreate
		})

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(MINIMAL)

		return request(app)
			.patch('/drafts/mockDraftId/sync')
			.then(() => {
				expect(DraftsMetadata.getByDraftIdAndKey).toHaveBeenCalledWith('mockDraftId', 'copied')
				expect(Draft.fetchById).not.toHaveBeenCalled()
				expect(Draft.updateContent).not.toHaveBeenCalled()
				expect(mockMetaSaveOrCreate).not.toHaveBeenCalled()
			})
	})

	test('patch /drafts/:draftId/sync returns and calls functions correctly for users with partial access to the draft, no optional title', () => {
		expect.hasAssertions()

		const mockMetaSaveOrCreate = jest.fn()
		DraftsMetadata.getByDraftIdAndKey.mockResolvedValueOnce({
			value: 'mockOriginalDraftId',
			updatedAt: '1999-01-01 01:00:00.000000+00',
			saveOrCreate: mockMetaSaveOrCreate
		})

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(PARTIAL)

		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			}
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			}
		}
		Draft.fetchById.mockResolvedValueOnce(mockDraft)

		return request(app)
			.patch('/drafts/mockDraftId/sync')
			.then(() => {
				expect(DraftsMetadata.getByDraftIdAndKey).toHaveBeenCalledWith('mockDraftId', 'copied')
				expect(Draft.fetchById).toHaveBeenCalledWith('mockOriginalDraftId')
				expect(mockDraftObject.content.title).toEqual('mockDraftTitle Copy')
				expect(Draft.updateContent).toHaveBeenCalled()
				expect(mockMetaSaveOrCreate).toHaveBeenCalled()
			})
	})

	test('patch /drafts/:draftId/sync returns and calls functions correctly for users with partial access to the draft, optional title', () => {
		expect.hasAssertions()

		const mockMetaSaveOrCreate = jest.fn()
		DraftsMetadata.getByDraftIdAndKey.mockResolvedValueOnce({
			value: 'mockOriginalDraftId',
			updatedAt: '1999-01-01 01:00:00.000000+00',
			saveOrCreate: mockMetaSaveOrCreate
		})

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(PARTIAL)

		const mockDraftObject = {
			id: 'mockNewDraftId',
			content: {
				id: 'mockNewDraftContentId',
				title: 'mockDraftTitle'
			}
		}

		const mockDraftRootToObject = jest.fn()
		mockDraftRootToObject.mockReturnValueOnce(mockDraftObject)

		const mockDraft = {
			root: {
				toObject: mockDraftRootToObject
			}
		}
		Draft.fetchById.mockResolvedValueOnce(mockDraft)

		return request(app)
			.patch('/drafts/mockDraftId/sync')
			.send({ title: 'specified title' })
			.then(() => {
				expect(DraftsMetadata.getByDraftIdAndKey).toHaveBeenCalledWith('mockDraftId', 'copied')
				expect(Draft.fetchById).toHaveBeenCalledWith('mockOriginalDraftId')
				expect(mockDraftObject.content.title).toEqual('specified title')
				expect(Draft.updateContent).toHaveBeenCalled()
				expect(mockMetaSaveOrCreate).toHaveBeenCalled()
			})
	})

	test('get /drafts/:draftId/permission returns the expected response', () => {
		expect.hasAssertions()
		const userToJSON = jest.fn().mockReturnValue('filtered-user')
		DraftPermissions.getDraftOwners.mockResolvedValueOnce([
			{ toJSON: userToJSON },
			{ toJSON: userToJSON }
		])

		return request(app)
			.get('/drafts/mockDraftId/permission')
			.then(response => {
				expect(DraftPermissions.getDraftOwners).toHaveBeenCalledWith(mockCurrentDocument.draftId)
				expect(response.body).toEqual(['filtered-user', 'filtered-user'])
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /drafts/:draftId/permission/update fails if current user has partial access', () => {
		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(PARTIAL)

		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: levelName[MINIMAL], userId: 99 })
			.then(response => {
				expect(DraftPermissions.updateAccessLevel).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(401)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toHaveProperty('type', 'notAuthorized')
				expect(response.body.value).toHaveProperty(
					'message',
					'Current User does not have permission to share this draft'
				)
			})
	})

	test('post /drafts/:draftId/permission/update fails if current user has minimal access', () => {
		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(MINIMAL)

		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: levelName[MINIMAL], userId: 99 })
			.then(response => {
				expect(DraftPermissions.updateAccessLevel).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(401)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toHaveProperty('type', 'notAuthorized')
				expect(response.body.value).toHaveProperty(
					'message',
					'Current User does not have permission to share this draft'
				)
			})
	})

	test('post /drafts/:draftId/permission/update does not call updateAccessLevel if target access level matches current access level', () => {
		DraftPermissions.getUserAccessLevelToDraft
			// first call checks the current user's access level
			.mockResolvedValueOnce(FULL)
			// second call checks the target user's access level
			.mockResolvedValueOnce(PARTIAL)

		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: levelName[PARTIAL], userId: 99 })
			.then(response => {
				expect(DraftPermissions.updateAccessLevel).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /drafts/:draftId/permission/update correctly sets new access level ', () => {
		DraftPermissions.getUserAccessLevelToDraft
			.mockResolvedValueOnce(FULL)
			.mockResolvedValueOnce(PARTIAL)

		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce(true)

		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: levelName[MINIMAL], userId: 99 })
			.then(response => {
				expect(DraftPermissions.updateAccessLevel).toHaveBeenCalled()
				expect(DraftPermissions.updateAccessLevel).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					99,
					MINIMAL
				)
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /drafts/:draftId/permission/update handles unknown access level', () => {
		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(FULL)

		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce(true)
		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: 'Unknown', userId: 99 })
			.then(response => {
				expect(DraftPermissions.updateAccessLevel).toHaveBeenCalledTimes(0)
				expect(response.statusCode).toBe(400)
				expect(response.text).toBe('Invalid access level: Unknown')
			})
	})

	test('post /drafts/:draftId/permission/update handles thrown errors', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockRejectedValueOnce('database error')

		return request(app)
			.post('/drafts/mockDraftId/permission/update')
			.send({ accessLevel: levelName[PARTIAL], userId: 99 })
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledTimes(1)
				expect(response.statusCode).toBe(500)
			})
	})

	test('post /drafts/:draftId/permission runs correctly when current user has "Full" access level to draft', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(FULL)
		DraftPermissions.addOwnerToDraft.mockResolvedValueOnce()

		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce(true)

		return request(app)
			.post('/drafts/mockDraftId/permission')
			.send({ userId: 1 })
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).toHaveBeenCalledWith(1)
				expect(DraftPermissions.addOwnerToDraft).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					1
				)
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /drafts/:draftId/permission runs correctly when current user does not have "Full" access level to draft', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(PARTIAL)
		UserModel.fetchById = jest.fn()

		return request(app)
			.post('/drafts/mockDraftId/permission')
			.send({ userId: 1 })
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).not.toHaveBeenCalled()
				expect(DraftPermissions.addOwnerToDraft).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(401)
			})
	})

	test('post /drafts/:draftId/permission catches unexpected errors correctly', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(FULL)
		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce(true)
		DraftPermissions.addOwnerToDraft.mockRejectedValueOnce('database error')

		return request(app)
			.post('/drafts/mockDraftId/permission')
			.send({ userId: 1 })
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).toHaveBeenCalledWith(1)
				expect(DraftPermissions.addOwnerToDraft).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					1
				)
				expect(response.statusCode).toBe(500)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value.message).toBe('database error')
			})
	})

	test('delete /drafts/:draftId/permission/:userId runs correctly when current user has "Full" access level to draft', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(FULL)
		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce({ id: 1 })
		DraftPermissions.removeOwnerFromDraft.mockResolvedValueOnce(true)

		return request(app)
			.delete('/drafts/mockDraftId/permission/1')
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).toHaveBeenCalledWith('1')
				expect(DraftPermissions.removeOwnerFromDraft).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					1
				)
				expect(response.statusCode).toBe(200)
			})
	})

	test('delete /drafts/:draftId/permission/:userId runs correctly when current user does not have "Full" access level to draft', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(MINIMAL)
		UserModel.fetchById = jest.fn()

		return request(app)
			.delete('/drafts/mockDraftId/permission/1')
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).not.toHaveBeenCalled()
				expect(DraftPermissions.removeOwnerFromDraft).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(401)
			})
	})

	test('delete /drafts/:draftId/permission/:userId catches unexpected errors correctly', () => {
		expect.hasAssertions()

		DraftPermissions.getUserAccessLevelToDraft.mockResolvedValueOnce(FULL)
		UserModel.fetchById = jest.fn()
		UserModel.fetchById.mockResolvedValueOnce({ id: 1 })
		DraftPermissions.removeOwnerFromDraft.mockRejectedValueOnce('database error')

		return request(app)
			.delete('/drafts/mockDraftId/permission/1')
			.then(response => {
				expect(DraftPermissions.getUserAccessLevelToDraft).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCurrentDocument.draftId
				)
				expect(UserModel.fetchById).toHaveBeenCalledWith('1')
				expect(DraftPermissions.removeOwnerFromDraft).toHaveBeenCalledWith(
					mockCurrentDocument.draftId,
					1
				)
				expect(response.statusCode).toBe(500)
				expect(response.error).toHaveProperty('text', 'Server Error: database error')
			})
	})

	test('get /drafts/:draftId/collections returns the expected response', () => {
		expect.hasAssertions()

		const mockResult = [
			{ id: 'mockCollectionId1' },
			{ id: 'mockCollectionId2' },
			{ id: 'mockCollectionId3' }
		]

		CollectionsServices.fetchAllCollectionsForDraft.mockResolvedValueOnce(mockResult)

		return request(app)
			.get('/drafts/mockDraftId/collections')
			.then(response => {
				expect(CollectionsServices.fetchAllCollectionsForDraft).toHaveBeenCalledWith(
					mockCurrentDocument.draftId
				)
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual(mockResult)
			})
	})

	test('get /collections/:collectionId/modules returns the expected response', () => {
		const mockResult = [
			{ draftId: 'mockDraftId1' },
			{ draftId: 'mockDraftId2' },
			{ draftId: 'mockDraftId3' }
		]

		CountServices.getUserModuleCount.mockResolvedValueOnce(mockResult.length)

		DraftSummary.fetchAllInCollectionForUser = jest.fn()
		DraftSummary.fetchAllInCollectionForUser.mockResolvedValueOnce(mockResult)

		expect.hasAssertions()

		return request(app)
			.get('/collections/mockCollectionId/modules')
			.then(response => {
				expect(CountServices.getUserModuleCount).toHaveBeenCalledWith(mockCurrentUser.id)

				expect(DraftSummary.fetchAllInCollectionForUser).toHaveBeenCalledWith(
					'mockCollectionId',
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual({
					allCount: mockResult.length,
					modules: mockResult
				})
			})
	})

	test('get /collections/:collectionId/modules/search returns the expected response with a search string', () => {
		expect.hasAssertions()

		const mockResult = [
			{ draftId: 'mockDraftId1' },
			{ draftId: 'mockDraftId2' },
			{ draftId: 'mockDraftId3' }
		]

		CountServices.getUserModuleCount.mockResolvedValueOnce(mockResult.length)

		DraftSummary.fetchByDraftTitleAndUser = jest.fn()
		DraftSummary.fetchByDraftTitleAndUser.mockResolvedValueOnce(mockResult)

		return request(app)
			.get('/collections/mockCollectionId/modules/search?q=searchString')
			.then(response => {
				expect(CountServices.getUserModuleCount).toHaveBeenCalledWith(mockCurrentUser.id)

				expect(DraftSummary.fetchByDraftTitleAndUser).toHaveBeenCalledWith(
					'searchString',
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(200)
				expect(response.body).toEqual({
					allCount: mockResult.length,
					modules: mockResult
				})
			})
	})

	test('get /collections/:collectionId/modules/search returns the expected response without a search string', () => {
		expect.hasAssertions()

		DraftSummary.fetchByDraftTitleAndUser = jest.fn()

		return request(app)
			.get('/collections/mockCollectionId/modules/search?q=')
			.then(response => {
				expect(DraftSummary.fetchByDraftTitleAndUser).not.toHaveBeenCalled()
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual([])
			})
	})

	test('get /collections/:collectionId/modules/search returns the expected response with a search string if the query errors', () => {
		expect.hasAssertions()

		CountServices.getUserModuleCount.mockResolvedValueOnce(0)

		DraftSummary.fetchByDraftTitleAndUser = jest.fn()
		DraftSummary.fetchByDraftTitleAndUser.mockRejectedValueOnce('database error')

		return request(app)
			.get('/collections/mockCollectionId/modules/search?q=searchString')
			.then(response => {
				expect(CountServices.getUserModuleCount).toHaveBeenCalledWith(mockCurrentUser.id)

				expect(DraftSummary.fetchByDraftTitleAndUser).toHaveBeenCalledTimes(1)
				expect(DraftSummary.fetchByDraftTitleAndUser).toHaveBeenCalledWith(
					'searchString',
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(500)
				expect(response.error).toHaveProperty('text', 'Server Error: database error')
			})
	})

	test('post /collections/new returns the expected response', () => {
		expect.hasAssertions()

		const mockResponse = {
			id: 'mockCollectionId',
			title: 'mockCollectionTitle'
		}

		Collection.createWithUser = jest.fn()
		Collection.createWithUser.mockResolvedValueOnce(mockResponse)

		return request(app)
			.post('/collections/new')
			.then(response => {
				expect(Collection.createWithUser).toHaveBeenCalledTimes(1)
				expect(Collection.createWithUser).toHaveBeenCalledWith(mockCurrentUser.id)
				expect(response.statusCode).toBe(200)
				expect(response.body).toStrictEqual(mockResponse)
			})
	})

	test('post /collections/rename returns the expected response when the user owns the collection', () => {
		expect.hasAssertions()

		const mockNewTitle = 'mockNewTitle'

		const mockCollection = {
			id: 'mockCollectionId',
			title: mockNewTitle
		}

		Collection.rename = jest.fn()
		Collection.rename.mockResolvedValueOnce(mockCollection)

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(true)

		return request(app)
			.post('/collections/rename')
			.send(mockCollection)
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCollection.id
				)
				expect(Collection.rename).toHaveBeenCalledTimes(1)
				expect(Collection.rename).toHaveBeenCalledWith(
					mockCollection.id,
					mockCollection.title,
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(200)
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toStrictEqual(mockCollection)
			})
	})

	test('post /collections/rename handles unexpected errors', () => {
		expect.hasAssertions()

		const mockNewTitle = 'mockNewTitle'

		const mockCollection = {
			id: 'mockCollectionId',
			title: mockNewTitle
		}

		DraftPermissions.userHasPermissionToCollection.mockRejectedValueOnce('database error')

		return request(app)
			.post('/collections/rename')
			.send(mockCollection)
			.then(response => {
				expect(response.statusCode).toBe(500)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value.message).toBe('database error')
			})
	})

	test('post /collections/rename returns the expected response when the user does not own the collection', () => {
		expect.hasAssertions()

		const mockNewTitle = 'mockNewTitle'

		const mockCollection = {
			id: 'mockCollectionId',
			title: mockNewTitle
		}

		Collection.rename = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(false)

		return request(app)
			.post('/collections/rename')
			.send(mockCollection)
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					mockCollection.id
				)
				expect(Collection.rename).toHaveBeenCalledTimes(0)
				expect(response.statusCode).toBe(401)
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toHaveProperty(
					'message',
					'You must be the creator of this collection to rename it'
				)
			})
	})

	test('delete /collections/:id returns the expected response when user owns the collection', () => {
		expect.hasAssertions()

		Collection.delete = jest.fn()
		Collection.delete.mockResolvedValueOnce(null)

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(true)

		return request(app)
			.delete('/collections/mockCollectionId')
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.delete).toHaveBeenCalledTimes(1)
				expect(Collection.delete).toHaveBeenCalledWith('mockCollectionId', mockCurrentUser.id)
				expect(response.statusCode).toBe(200)
			})
	})

	test('delete /collections/:id handles errors', () => {
		expect.hasAssertions()

		DraftPermissions.userHasPermissionToCollection.mockRejectedValueOnce('some-error')

		return request(app)
			.delete('/collections/mockCollectionId')
			.then(response => {
				expect(response.statusCode).toBe(500)
			})
	})

	test('delete /collections/:id returns the expected response when the user does not own the collection', () => {
		expect.hasAssertions()

		Collection.delete = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(false)

		return request(app)
			.delete('/collections/mockCollectionId')
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.delete).toHaveBeenCalledTimes(0)
				expect(response.statusCode).toBe(401)
				expect(response.error).toHaveProperty('text', 'Not Authorized')
			})
	})

	test('post /collections/:id/modules/add returns the expected response when the user owns the collection', () => {
		expect.hasAssertions()

		Collection.addModule = jest.fn()
		Collection.addModule.mockResolvedValueOnce(null)

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(true)

		return request(app)
			.post('/collections/mockCollectionId/modules/add')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.addModule).toHaveBeenCalledTimes(1)
				expect(Collection.addModule).toHaveBeenCalledWith(
					'mockCollectionId',
					'mockDraftId',
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(200)
			})
	})

	test('post /collections/:id/modules/add returns the expected response when the user does not own the collection', () => {
		expect.hasAssertions()

		Collection.addModule = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(false)

		return request(app)
			.post('/collections/mockCollectionId/modules/add')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.addModule).toHaveBeenCalledTimes(0)
				expect(response.statusCode).toBe(401)
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toHaveProperty(
					'message',
					'You must be the creator of this collection to add modules to it'
				)
			})
	})

	test('post /collections/:id/modules/add handles errors', () => {
		expect.hasAssertions()

		Collection.addModule = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockRejectedValueOnce('some-error')

		return request(app)
			.post('/collections/mockCollectionId/modules/add')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(response.statusCode).toBe(500)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value.message).toBe('some-error')
			})
	})

	test('delete /collections/:id/modules/remove returns the expected response when the user owns the collection', () => {
		expect.hasAssertions()

		Collection.removeModule = jest.fn()
		Collection.removeModule.mockResolvedValueOnce(null)

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(true)

		return request(app)
			.delete('/collections/mockCollectionId/modules/remove')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.removeModule).toHaveBeenCalledTimes(1)
				expect(Collection.removeModule).toHaveBeenCalledWith(
					'mockCollectionId',
					'mockDraftId',
					mockCurrentUser.id
				)
				expect(response.statusCode).toBe(200)
			})
	})

	test('delete /collections/:id/modules/remove returns the expected response when the user does not own the collection', () => {
		expect.hasAssertions()

		Collection.removeModule = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockResolvedValueOnce(false)

		return request(app)
			.delete('/collections/mockCollectionId/modules/remove')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledTimes(1)
				expect(DraftPermissions.userHasPermissionToCollection).toHaveBeenCalledWith(
					mockCurrentUser.id,
					'mockCollectionId'
				)
				expect(Collection.removeModule).toHaveBeenCalledTimes(0)
				expect(response.statusCode).toBe(401)
				expect(response.body).toHaveProperty('value')
				expect(response.body.value).toHaveProperty(
					'message',
					'You must be the creator of this collection to remove modules from it'
				)
			})
	})

	test('delete /collections/:id/modules/remove handles errors', () => {
		expect.hasAssertions()

		Collection.removeModule = jest.fn()

		DraftPermissions.userHasPermissionToCollection.mockRejectedValueOnce('some-error')

		return request(app)
			.delete('/collections/mockCollectionId/modules/remove')
			.send({ draftId: 'mockDraftId' })
			.then(response => {
				expect(response.statusCode).toBe(500)
				expect(response.body).toHaveProperty('status', 'error')
				expect(response.body).toHaveProperty('value')
				expect(response.body.value.message).toBe('some-error')
			})
	})
})
