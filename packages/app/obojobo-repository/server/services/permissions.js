const db = require('obojobo-express/server/db')
const UserModel = require('obojobo-express/server/models/user')
const publicLibCollectionId = require('../../shared/publicLibCollectionId')

const fetchAllUsersWithPermissionToDraft = async draftId => {
	const users = await db.manyOrNone(
		`SELECT
			users.id,
			users.first_name AS "firstName",
			users.last_name AS "lastName",
			users.email,
			users.username,
			users.created_at AS "createdAt",
			users.roles
		FROM repository_map_user_to_draft
		JOIN users
		ON users.id = user_id
		WHERE draft_id = $[draftId]
		ORDER BY users.first_name, users.last_name`,
		{ draftId }
	)

	return users.map(u => new UserModel(u))
}

const userHasPermissionToCopy = async (userId, draftId) => {
	const results = await Promise.all([
		draftIsPublic(draftId),
		userHasPermissionToDraft(userId, draftId)
	])

	return results[0] || results[1]
}

const draftIsPublic = async draftId => {
	const result = await db.oneOrNone(
		`
		SELECT draft_id
		FROM repository_map_drafts_to_collections
		WHERE draft_id = $[draftId] AND collection_id = $[publicLibCollectionId]
		`,
		{ draftId, publicLibCollectionId }
	)

	return result !== null
}

// returns a boolean
const userHasPermissionToDraft = async (userId, draftId) => {
	const result = await db.oneOrNone(
		`SELECT user_id
		FROM repository_map_user_to_draft
		WHERE draft_id = $[draftId]
		AND user_id = $[userId]`,
		{ userId, draftId }
	)

	// oneOrNone reutrns null when there are no results
	return result !== null
}

const addUserPermissionToDraft = async (userId, draftId) => {
	return await db.none(
		`INSERT
		INTO repository_map_user_to_draft
		(draft_id, user_id)
		VALUES($[draftId], $[userId])
		ON CONFLICT DO NOTHING`,
		{ userId, draftId }
	)
}

const removeUserPermissionToDraft = async (userId, draftId) => {
	return await db.none(
		`DELETE
		FROM repository_map_user_to_draft
		WHERE draft_id = $[draftId]
		AND user_id = $[userId]
		`,
		{ userId, draftId }
	)
}

module.exports = {
	addUserPermissionToDraft,
	userHasPermissionToDraft,
	fetchAllUsersWithPermissionToDraft,
	removeUserPermissionToDraft,
	userHasPermissionToCopy
}
