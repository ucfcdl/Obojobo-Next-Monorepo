const processJsonResults = res => {
	return Promise.resolve(res.json()).then(json => {
		if (json.status === 'error') {
			console.error(json.value) //eslint-disable-line no-console
		}

		return json
	})
}

const APIUtil = {
	get(endpoint) {
		return fetch(endpoint, {
			method: 'GET',
			credentials: 'include',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		})
	},

	post(endpoint, body) {
		if (!body) body = {}

		return fetch(endpoint, {
			method: 'POST',
			credentials: 'include',
			body: JSON.stringify(body),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		})
	},

	postMultiPart(endpoint, formData = new FormData()) {
		return fetch(endpoint, {
			method: 'POST',
			credentials: 'include',
			body: formData
		}).then(processJsonResults)
	},

	postEvent({ draftId, action, eventVersion, visitId, payload = {} }) {
		return (
			APIUtil.post('/api/events', {
				event: {
					action,
					draft_id: draftId,
					actor_time: new Date().toISOString(),
					event_version: eventVersion,
					visitId,
					payload
				}
			})
				.then(processJsonResults)
				// TODO: Send Caliper event to client host.
				.then(res => {
					if (res && res.status === 'ok' && res.value) {
						parent.postMessage(res.value, '*')
					}

					return res
				})
		)
	},

	getDraft(id) {
		return APIUtil.get(`/api/drafts/${id}`).then(processJsonResults)
	},

	getFullDraft(id) {
		return APIUtil.get(`/api/drafts/${id}/full`).then(processJsonResults)
	},

	requestStart(visitId, draftId) {
		return APIUtil.post('/api/visits/start', {
			visitId,
			draftId
		}).then(processJsonResults)
	},

	startAttempt({ draftId, assessmentId, visitId }) {
		return APIUtil.post('/api/assessments/attempt/start', {
			draftId,
			assessmentId,
			visitId
		}).then(processJsonResults)
	},

	endAttempt({ attemptId, draftId, visitId }) {
		return APIUtil.post(`/api/assessments/attempt/${attemptId}/end`, {
			draftId,
			visitId
		}).then(processJsonResults)
	},

	resendLTIAssessmentScore({ draftId, assessmentId, visitId }) {
		return APIUtil.post('/api/lti/sendAssessmentScore', {
			draftId,
			assessmentId,
			visitId
		}).then(processJsonResults)
	},

	clearPreviewScores({ draftId, visitId }) {
		return APIUtil.post('/api/assessments/clear-preview-scores', {
			draftId,
			visitId
		}).then(processJsonResults)
	},

	postDraft(id, draftJSON) {
		return APIUtil.post(`/api/drafts/${id}`, draftJSON).then(processJsonResults)
	}
}

export default APIUtil
