const db = oboRequire('server/db')
const permissions = oboRequire('server/config').permissions
const crypto = require('crypto')
const oboEvents = oboRequire('server/obo_events')
const logger = oboRequire('server/logger')
const copyAttributesFn = require('obojobo-document-engine/src/scripts/common/util/clone-props')

class User {
	constructor({
		id = null,
		firstName = null,
		lastName = null,
		email = null,
		username = null,
		createdAt = Date.now(),
		roles = []
	} = {}) {
		if (firstName === null) throw Error('Missing first name for new user')
		if (lastName === null) throw Error('Missing last name for new user')
		if (email === null) throw Error('Missing email for new user')
		if (username === null) throw Error('Missing username for new user')

		this.id = id
		this.firstName = firstName
		this.lastName = lastName
		this.email = email
		this.username = username
		this.createdAt = createdAt
		this.roles = roles

		// creates 'canEditDrafts' getter if 'canEditDrafts' is set in config/role_groups.json
		for (const permName in permissions) {
			Object.defineProperty(this, permName, {
				get: this.hasPermission.bind(this, permName)
			})
		}
	}

	static dbResultToModel(result) {
		return new User({
			id: result.id,
			firstName: result.first_name,
			lastName: result.last_name,
			email: result.email,
			username: result.username,
			createdAt: result.created_at,
			roles: result.roles
		})
	}

	static fetchById(userId) {
		return db
			.one(
				`
				SELECT *
				FROM users
				WHERE id =  $[userId]
				`,
				{ userId }
			)
			.then(User.dbResultToModel)
			.catch(error => {
				logger.logError('Error fetchById', error)
				throw Error('Error finding user.')
			})
	}

	static clearSessionsForUserById(id) {
		return db
			.none(`DELETE FROM sessions WHERE sess ->> 'currentUserId' = $[id]`, { id })
			.catch(error => {
				logger.logError('Error clearSessionsForUserById', error)
				throw Error('Error clearing session.')
			})
	}

	// searches by firstname, lastname, and email
	static searchForUsers(searchInput) {
		// Create a quick function for quickly searching users (if missing)
		return db
			.manyOrNone(
				`SELECT
					*
				FROM users
				WHERE obo_immutable_concat_ws(' ', first_name, last_name)ILIKE $[searchInput]
				OR email ILIKE $[searchInput]
				OR username ILIKE $[searchInput]
				ORDER BY first_name, last_name
				LIMIT 25`,
				{ searchInput: `%${searchInput}%` }
			)
			.then(results => results.map(r => User.dbResultToModel(r)))
			.catch(error => {
				logger.logError('Error searchForUsers', error)
				throw Error('Error searching for users.')
			})
	}

	saveOrCreate() {
		return db
			.one(
				`
			INSERT INTO users
				(username, email, first_name, last_name, roles)
				VALUES($[username], $[email], $[firstName], $[lastName], $[roles])
			ON CONFLICT (username) DO UPDATE SET
				email = $[email],
				first_name = $[firstName],
				last_name = $[lastName],
				roles = $[roles]
			RETURNING id
			`,
				this
			)
			.then(insertUserResult => {
				let eventName = User.EVENT_UPDATE_USER
				if (!this.id) {
					eventName = User.EVENT_NEW_USER
					// populate my id from the result
					this.id = insertUserResult.id
				}
				oboEvents.emit(eventName, this)
				return this
			})
			.catch(error => {
				logger.logError('Error saveOrCreate', error)
				throw Error('Error saving user.')
			})
	}

	isGuest() {
		return false
	}

	hasRole(expectedRole) {
		return this.roles.indexOf(expectedRole) > -1
	}

	hasRoles(expectedRoles) {
		return (
			expectedRoles.length ===
			this.roles.filter(role => {
				return expectedRoles.indexOf(role) > -1
			}).length
		)
	}

	hasOneOfRole(expectedRoles) {
		return (
			this.roles.filter(role => {
				return expectedRoles.indexOf(role) > -1
			}).length > 0
		)
	}

	hasPermission(permName) {
		if (!permissions[permName]) return false
		return this.hasOneOfRole(permissions[permName])
	}

	get avatarUrl() {
		const size = 120
		const md5Email = crypto
			.createHash('md5')
			.update(this.email)
			.digest('hex')
		return `https://secure.gravatar.com/avatar/${md5Email}?s=${size}&d=retro`
	}

	toJSON() {
		const allowedKeys = ['id', 'firstName', 'lastName', 'username', 'roles', 'avatarUrl']
		const safeUser = {}
		copyAttributesFn(safeUser, this, allowedKeys)
		return safeUser
	}
}

User.EVENT_NEW_USER = 'EVENT_NEW_USER'
User.EVENT_UPDATE_USER = 'EVENT_UPDATE_USER'

module.exports = User
