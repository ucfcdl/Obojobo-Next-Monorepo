const db = require('../db')
const draftNodeStore = oboRequire('draft_node_store')
const logger = require('../logger.js')
const oboEvents = oboRequire('obo_events')

// Recurses through a draft tree
// to find duplicate ids
// ids are placed in the idSet
const findDuplicateIdsRecursive = (jsonTreeNode, idSet = new Set()) => {
	// no id to find on this leafNode? return
	if (!jsonTreeNode.id) {
		return null
	}

	// If the current id is already in the set, it has been duplicated
	if (idSet.has(jsonTreeNode.id)) {
		return jsonTreeNode.id
	}

	idSet.add(jsonTreeNode.id)

	// Check all children nodes
	let duplicateId = null
	for (const child of jsonTreeNode.children) {
		duplicateId = findDuplicateIdsRecursive(child, idSet)
		if (duplicateId) {
			// return as soon as a duplicate is found
			return duplicateId
		}
	}

	return duplicateId
}

class Draft {

	constructor(authorId, rawDraft) {
		this.authorId = authorId
		this.nodesById = new Map()
		this.nodesByType = new Map()
		this.draftId = rawDraft.draftId
		this.contentId = rawDraft.contentId
		this.root = this.processRawNode(rawDraft)
	}

	yell() {
		return Promise.all(this.root.yell.apply(this.root, arguments)).then(() => {
			return this
		})
	}

	processRawNode(rawNode) {
		const initFn = () => {}

		const DraftClass = draftNodeStore.get(rawNode.type)

		const draftNode = new DraftClass(this, rawNode, initFn)

		draftNode.init()

		this.nodesById.set(draftNode.node.id, draftNode)

		let nodesByType = this.nodesByType.get(rawNode.type)
		if (!nodesByType) nodesByType = []
		nodesByType.push(draftNode)
		this.nodesByType.set(rawNode.type, nodesByType)

		for (const i in rawNode.children) {
			const childNode = this.processRawNode(rawNode.children[i])
			draftNode.children.push(childNode)
		}

		return draftNode
	}

	static deleteByIdAndUser(id, userId){
		return db
			.none(
				`
			UPDATE drafts
			SET deleted = TRUE
			WHERE id = $[id]
			AND user_id = $[userId]
			`,
				{
					id,
					userId
				}
			)
			.then(() => {
				oboEvents.emit(Draft.EVENT_DRAFT_DELETED, {id})
			})
	}

	static fetchById(id) {
		return db
			.one(
				`
			SELECT
				drafts.id AS id,
				drafts.user_id as author,
				drafts_content.id AS version,
				drafts.created_at AS draft_created_at,
				drafts_content.created_at AS content_created_at,
				drafts_content.content AS content
			FROM drafts
			JOIN drafts_content
				ON drafts.id = drafts_content.draft_id
			WHERE drafts.id = $[id]
				AND deleted = FALSE
			ORDER BY content_created_at DESC
			LIMIT 1
			`,
				{ id }
			)
			.then(result => {
				result.content.draftId = result.id
				result.content.contentId = result.version
				result.content._rev = result.version

				return new Draft(result.author, result.content)
			})
			.catch(error => {
				logger.error('fetchById Error', error.message)
				return Promise.reject(error)
			})
	}

	static createWithContent(userId, jsonContent = {}, xmlContent = null) {
		let newDraft

		return db
			.tx(transactionDb => {
				// Create a draft first
				return transactionDb
					.one(
						`
						INSERT INTO drafts
							(user_id)
						VALUES
							($[userId])
						RETURNING *`,
						{ userId }
					)
					.then(result => {
						newDraft = result
						// Add content referencing the draft
						return transactionDb.one(
							`
							INSERT INTO drafts_content
								(draft_id, content, xml)
							VALUES
								($[draftId], $[jsonContent], $[xmlContent])
							RETURNING *`,
							{ draftId: result.id, jsonContent, xmlContent }
						)
					})
					.then(result => {
						newDraft.content = result
					})
			})
			.then(() => {
				// transaction committed
				oboEvents.emit(Draft.EVENT_NEW_DRAFT_CREATED, newDraft)
				return newDraft
			})
	}

	static updateContent(draftId, jsonContent, xmlContent) {
		return db
			.one(
				`
				INSERT INTO drafts_content(
					draft_id,
					content,
					xml
				)
				VALUES(
					$[draftId],
					$[jsonContent],
					$[xmlContent]
				)
				RETURNING id
			`,
				{
					draftId,
					jsonContent,
					xmlContent
				}
			)
			.then(result => {
				oboEvents.emit(Draft.EVENT_DRAFT_UPDATED, {draftId, jsonContent, xmlContent})
				return result.id
			})
	}

	// returns the first duplicate id found or
	// null if no duplicates are found
	static findDuplicateIds(jsonTree) {
		return findDuplicateIdsRecursive(jsonTree)
	}

	get document() {
		return this.root.toObject()
	}

	getChildNodeById(id) {
		return this.nodesById.get(id)
	}

	getChildNodesByType(type) {
		return this.nodesByType.get(type)
	}
}

Draft.EVENT_NEW_DRAFT_CREATED = 'EVENT_NEW_DRAFT_CREATED'
Draft.EVENT_DRAFT_DELETED = 'EVENT_DRAFT_DELETED'
Draft.EVENT_DRAFT_UPDATED = 'EVENT_DRAFT_UPDATED'

module.exports = Draft
