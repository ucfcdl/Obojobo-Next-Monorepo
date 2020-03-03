const db = oboRequire('server/db')

module.exports = insertObject => {
	insertObject.visitId = insertObject.visitId || null
	return db
		.one(
			`
		INSERT INTO events
		(actor_time, action, actor, ip, metadata, payload, draft_id, draft_content_id, version, is_preview, visit_id)
		VALUES ($[actorTime], $[action], $[userId], $[ip], $[metadata], $[payload], $[draftId], $[contentId], $[eventVersion], $[isPreview], $[visitId])
		RETURNING *`,
			insertObject
		)
		.then(insertEventResult => {
			if (insertObject.caliperPayload) {
				// Add in internal event id to extensions object:
				if (!insertObject.caliperPayload.extensions) {
					insertObject.caliperPayload.extensions = {}
				}
				insertObject.caliperPayload.extensions.internalEventId = insertEventResult.id

				// Don't bother including this in the promise chain
				// It's considered a non-essential insert and we're
				// not going to wait for it
				db.none(
					`
					INSERT INTO caliper_store
					(payload, is_preview)
					VALUES ($[caliperPayload], $[isPreview])`,
					insertObject
				)
			}

			return insertEventResult
		})
}
