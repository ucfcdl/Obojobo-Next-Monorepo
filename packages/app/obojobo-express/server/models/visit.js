const db = require('../db')
const logger = require('../logger')
const oboEvents = require('../obo_events')

// use to initiate a new visit for a draft
// this will deactivate old visits, preventing
// them from being used again
const deactivateOldVisitsAndCreateNewVisit = async ({
	userId,
	draftId,
	resourceLinkId,
	launchId = null,
	isPreview = false,
	nodeOptions = { isScoreImportable: false }
}) => {
	return db.taskIf(async t => {
		// deactivate all my visits for this draft
		const deactivatedVisits = await t.manyOrNone(
			`UPDATE visits
			SET is_active = false
			WHERE user_id = $[userId]
			AND draft_id = $[draftId]
			AND resource_link_id = $[resourceLinkId]
			AND is_active = true
			RETURNING id`,
			{
				draftId,
				userId,
				resourceLinkId
			}
		)

		const deactivatedVisitIds = deactivatedVisits ? deactivatedVisits.map(visit => visit.id) : null

		// get id of the newest version of the draft
		const draftsContent = await t.one(
			`SELECT id
			FROM drafts_content
			WHERE draft_id = $[draftId]
			ORDER BY created_at DESC
			LIMIT 1`,
			{
				draftId
			}
		)

		// Create a new visit
		const visit = await t.one(
			`INSERT INTO visits
				(
					draft_id,
					draft_content_id,
					user_id,
					launch_id,
					resource_link_id,
					is_active,
					is_preview,
					score_importable
				)
			VALUES (
				$[draftId],
				$[draftContentId],
				$[userId],
				$[launchId],
				$[resourceLinkId],
				true,
				$[isPreview],
				$[isScoreImportable]
			)
			RETURNING id`,
			{
				draftId,
				draftContentId: draftsContent.id,
				userId,
				resourceLinkId,
				launchId,
				isPreview,
				isScoreImportable: nodeOptions.isScoreImportable
			}
		)

		oboEvents.emit(Visit.EVENT_NEW_VISIT, {
			visitId: visit.id,
			userId,
			draftId,
			resourceLinkId,
			launchId,
			isPreview,
			deactivatedVisitIds
		})

		return {
			visitId: visit.id,
			deactivatedVisitIds
		}
	})
}

class Visit {
	constructor(visitProps) {
		// expand all the visitProps onto this object
		for (const prop in visitProps) {
			this[prop] = visitProps[prop]
		}
	}

	static fetchById(visitId, requireIsActive = true) {
		return db
			.one(
				`
			SELECT id, is_active, is_preview, draft_content_id, resource_link_id, score_importable
			FROM visits
			WHERE id = $[visitId]
			${requireIsActive ? 'AND is_active = true' : ''}
			ORDER BY created_at DESC
			LIMIT 1
		`,
				{ visitId }
			)
			.then(result => new Visit(result))
			.catch(error => {
				logger.logError('Visit fetchById Error', error)
				throw error
			})
	}

	// create a student visit
	// deactivates all previous visits
	static createVisit(userId, draftId, resourceLinkId, launchId, nodeOptions) {
		return deactivateOldVisitsAndCreateNewVisit({
			userId,
			draftId,
			resourceLinkId,
			launchId,
			nodeOptions
		})
	}

	// create a preview visit
	// deactivates all previous visits
	static createPreviewVisit(userId, draftId) {
		return deactivateOldVisitsAndCreateNewVisit({
			userId,
			draftId,
			resourceLinkId: 'preview',
			isPreview: true
		})
	}
}

Visit.EVENT_NEW_VISIT = 'EVENT_NEW_VISIT'
Visit.EVENT_BEFORE_NEW_VISIT = 'EVENT_BEFORE_NEW_VISIT'

module.exports = Visit
