const db = require('obojobo-express/db')
const logger = require('obojobo-express/logger')

const buildQueryWhere = (whereSQL, joinSQL = '') => {
	return `
		SELECT
			DISTINCT drafts_content.draft_id AS draft_id,
			last_value(drafts_content.created_at) OVER wnd as "updated_at",
			first_value(drafts_content.created_at) OVER wnd as "created_at",
			last_value(drafts_content.id) OVER wnd as "latest_version",
			count(drafts_content.id) OVER wnd as revision_count,
			last_value(drafts_content.content->'content'->'title') OVER wnd as "title",
			drafts.user_id AS user_id,
			CASE
				WHEN last_value(drafts_content.xml) OVER wnd IS NULL
				THEN 'visual'
				ELSE 'clasic'
			END AS editor
		FROM drafts
		JOIN drafts_content AS drafts_content
			ON drafts_content.draft_id = drafts.id
		${joinSQL}
		WHERE drafts.deleted = FALSE
		AND ${whereSQL}
		WINDOW wnd AS (
			PARTITION BY drafts_content.draft_id ORDER BY drafts_content.created_at
			ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
		)
	`
}


class DraftSummary {
	constructor({draft_id, latest_version, title, user_id, created_at, updated_at, revision_count, editor}) {
		this.draftId = draft_id
		this.title = title
		this.userId = user_id
		this.createdAt = created_at
		this.updatedAt = updated_at
		this.latestVersion = latest_version
		this.revisionCount = Number(revision_count)
		this.editor = editor
	}

	static fetchById(id) {
		return db
			.one(buildQueryWhere('drafts.id = $[id]'), { id })
			.then(DraftSummary.resultsToObjects)
			.catch(error => {
				logger.error('fetchById Error', error.message)
				return Promise.reject('Error Loading DraftSummary by id')
			})
	}

	static fetchAndJoinWhere(joinSQL, whereSQL, queryValues){
		return db
			.any(buildQueryWhere(whereSQL, joinSQL), queryValues)
			.then(DraftSummary.resultsToObjects)
			.catch(error => {
				logger.error('fetchWhere Error', error.message, whereSQL, queryValues)
				return Promise.reject('Error loading DraftSummary by query')
			})
	}

	static fetchWhere(whereSQL, queryValues){
		return db
			.any(buildQueryWhere(whereSQL), queryValues)
			.then(DraftSummary.resultsToObjects)
			.catch(error => {
				logger.error('fetchWhere Error', error.message, whereSQL, queryValues)
				return Promise.reject('Error loading DraftSummary by query')
			})
	}

	static resultsToObjects(results){
		if(Array.isArray(results)){
			return results.map(object => { return new DraftSummary(object)})
		}
		return new DraftSummary(results)
	}
}

module.exports = DraftSummary
