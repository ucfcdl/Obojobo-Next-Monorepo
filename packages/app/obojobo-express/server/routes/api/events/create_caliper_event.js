const iriFactory = require('../../../iri_builder')
const createEvent = require('./create_base_caliper_event').createEvent
const validateCaliperEvent = require('./validate_caliper_event').validateArguments
const assignCaliperOptions = require('./validate_caliper_event').assignOptions
const createCaliperEventFromReq = require('./create_caliper_event_from_client_event_req')

const { ACTOR_USER, ACTOR_VIEWER_CLIENT, ACTOR_SERVER_APP } = require('./caliper_constants')
const { getUrnFromUuid, getNewGeneratedId } = require('./caliper_utils')

const AssessmentEvent = require('caliper-js-public/src/events/assessmentEvent')
const AssessmentItemEvent = require('caliper-js-public/src/events/assessmentItemEvent')
const Event = require('caliper-js-public/src/events/event')
const NavigationActions = require('caliper-js-public/src/actions/navigationActions')
const NavigationEvent = require('caliper-js-public/src/events/navigationEvent')
const SessionEvent = require('caliper-js-public/src/events/sessionEvent')
const ViewEvent = require('caliper-js-public/src/events/viewEvent')
const MediaEvent = require('caliper-js-public/src/events/mediaEvent')
// This version doesn't have grade event or ToolUse event:
// let GradeEvent = require('caliper-js-public/src/events/gradeEvent')
// let ToolUseEvent = require('caliper-js-public/src/events/toolUseEvent')

const updateEventToVersion1_1 = caliperEvent => {
	if (caliperEvent['@type']) {
		caliperEvent.type = caliperEvent['@type'].replace('http://purl.imsglobal.org/caliper/v1/', '')
		delete caliperEvent['@type']
	}

	if (caliperEvent.action) {
		caliperEvent.action = caliperEvent.action.replace(
			'http://purl.imsglobal.org/vocab/caliper/v1/action#',
			''
		)
	}

	for (const propName in caliperEvent) {
		if (caliperEvent[propName] === null) {
			delete caliperEvent[propName]
		}
	}

	return caliperEvent
}

const createScore = (attemptIRI, scoredBy, score, scoreId = getNewGeneratedId()) => {
	return {
		'@context': 'http://purl.imsglobal.org/ctx/caliper/v1p1',
		type: 'Score', //Term
		id: scoreId, //IRI
		attempt: attemptIRI, //Attempt
		maxScore: 100, //decimal
		scoreGiven: score, //decimal
		scoredBy: scoredBy, //Agent
		dateCreated: new Date().toISOString() //DateTime
	}
}

// Caliper-Spec Properties
// type: (type: Term, REQUIRED) AssessmentEvent
// action: (type: Term, REQUIRED) Started | Paused | Resumed | Restarted | Reset | Submitted
// object: (type: Assessment, REQUIRED) Assessment IRI of the assessment being acted upon
// generated: (type: Attempt, Recommended) IRI of the attempt of this assessment
// actor: (type: Person, REQUIRED) Current user
const createAssessmentEvent = (obj, IRI) => {
	const required = ['action', 'assessmentId', 'attemptId', 'draftId', 'contentId']
	const optional = ['referrer']
	validateCaliperEvent({ required, optional }, obj, ACTOR_USER)

	const options = assignCaliperOptions(obj)

	const { actor, assessmentId, contentId, action, attemptId, extensions } = obj
	const caliperEvent = createEvent(AssessmentEvent, actor, IRI, options)

	caliperEvent.setAction(action)
	caliperEvent.setObject(IRI.getAssessmentIRI(contentId, assessmentId))
	caliperEvent.setGenerated(IRI.getAssessmentAttemptIRI(attemptId))

	if (obj.referrer) {
		caliperEvent.referrer = IRI.getAssessmentAttemptIRI(obj.referrer)
	}
	Object.assign(caliperEvent.extensions, extensions)

	return updateEventToVersion1_1(caliperEvent)
}

// Caliper-Spec Properties
// type: (type: Term, REQUIRED) Event
// action: (type: Term, REQUIRED) Showed | Hid | Activated | Deactivated
// object: (type: DigitalResource | SoftwareApplication, REQUIRED) Viewer IRI of the element
// actor: (REQUIRED)
const createNavMenuEvent = (obj, IRI) => {
	const required = ['draftId', 'contentId', 'action']
	validateCaliperEvent({ required }, obj)

	const options = assignCaliperOptions(obj)

	const { action, actor, draftId, contentId, extensions } = obj
	const caliperEvent = createEvent(Event, actor, IRI, options)

	caliperEvent.setAction(action)
	caliperEvent.setObject(IRI.getViewerClientIRI(draftId, contentId, 'nav'))
	Object.assign(caliperEvent.extensions, extensions)

	return updateEventToVersion1_1(caliperEvent)
}

// Must provide a request object or a host
// isFromReq is used internally for create_caliper_event_from_req
const caliperEventFactory = (req, host = null, isCalledFromCreateCaliperEventFromReq = false) => {
	if (!isCalledFromCreateCaliperEventFromReq && req) {
		return createCaliperEventFromReq(req)
	}
	const IRI = iriFactory(req, host)

	return {
		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) NavigationEvent
		// action: (type: Term, REQUIRED) NavigatedTo
		// referrer: (type: DigitalResource | SoftwareApplication, Recommended) View IRI of where they came from
		// object: (type: DigitalResource | SoftwareApplication, REQUIRED) Viewer IRI of where they went to
		// actor: (type: Person, REQUIRED) Current user
		createNavigationEvent: obj => {
			const required = ['draftId', 'contentId', 'from', 'to']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, from, to, extensions } = obj
			const caliperEvent = createEvent(NavigationEvent, actor, IRI, options)

			caliperEvent.referrer = IRI.getDraftContentIRI(contentId, from)
			caliperEvent.setAction(NavigationActions.NAVIGATED_TO)
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, to))
			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) ViewEvent
		// action: (type: Term, REQUIRED) Viewed
		// object: (type: DigitalResource, REQUIRED) View IRI of the item being viewed
		// target: (type: Frame, Optional) A more specific IRI of which part of the object is being viewed
		// actor: (type: Person, REQUIRED) Current user
		createViewEvent: obj => {
			const required = ['draftId', 'contentId', 'itemId']
			const optional = ['frameName']
			validateCaliperEvent({ required, optional }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, frameName, itemId, extensions } = obj
			const caliperEvent = createEvent(ViewEvent, actor, IRI, options)

			caliperEvent.setAction('Viewed')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, itemId))
			if (frameName) {
				caliperEvent.setTarget(IRI.getDraftContentIRI(contentId, itemId, frameName))
			}
			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Hid
		// object: (type: Entity, REQUIRED) View IRI of the item being hidden
		// target: (type: Entity, Optional) A more specific IRI of which part of the object is being hidden
		createHideEvent: obj => {
			const required = ['draftId', 'contentId', 'itemId']
			const optional = ['frameName']
			validateCaliperEvent({ required, optional }, obj)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, frameName, itemId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Hid')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, itemId))
			if (frameName) {
				caliperEvent.setTarget(IRI.getDraftContentIRI(contentId, itemId, frameName))
			}
			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		createAssessmentAttemptStartedEvent: obj => {
			obj.action = 'Started'
			return createAssessmentEvent(obj, IRI)
		},

		createAssessmentAttemptResumedEvent: obj => {
			obj.action = 'Resumed'
			return createAssessmentEvent(obj, IRI)
		},

		createAssessmentAttemptSubmittedEvent: obj => {
			obj.action = 'Submitted'
			return createAssessmentEvent(obj, IRI)
		},

		createAssessmentAttemptImportedEvent: ({
			actor,
			draftId,
			contentId,
			assessmentId,
			attemptId,
			originalScoreId,
			originalAttemptId,
			resourceLinkId
		}) => {
			const obj = {
				action: 'Submitted',
				referrer: originalAttemptId,
				actor,
				draftId,
				contentId,
				assessmentId,
				attemptId,
				extensions: {
					originalScoreId,
					originalAttemptId,
					resourceLinkId
				}
			}
			return createAssessmentEvent(obj, IRI)
		},

		createNavMenuHidEvent: obj => {
			obj.action = 'Hid'
			return createNavMenuEvent(obj, IRI)
		},

		createNavMenuShowedEvent: obj => {
			obj.action = 'Showed'
			return createNavMenuEvent(obj, IRI)
		},

		createNavMenuActivatedEvent: obj => {
			obj.action = 'Activated'
			return createNavMenuEvent(obj, IRI)
		},

		createNavMenuDeactivatedEvent: obj => {
			obj.action = 'Deactivated'
			return createNavMenuEvent(obj, IRI)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) GradeEvent
		// action: (type: Term, REQUIRED) Graded
		// object: (type: Attempt, REQUIRED) Attempt IRI
		// generated: (type: Score, Recommended) Score for the attempt
		createAssessmentAttemptScoredEvent: obj => {
			const required = ['assessmentId', 'attemptId', 'attemptScore', 'draftId', 'contentId']
			validateCaliperEvent({ required }, obj, ACTOR_SERVER_APP)

			const options = assignCaliperOptions(obj)

			const { actor, assessmentId, attemptId, attemptScore, contentId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options) //@TODO: Should be GradeEvent

			caliperEvent.setType('GradeEvent')
			caliperEvent.setAction('Graded')
			caliperEvent.setObject(IRI.getAssessmentAttemptIRI(attemptId))
			caliperEvent.setTarget(IRI.getAssessmentIRI(contentId, assessmentId))

			//@TODO - Caliper spec will have a Score entity but our version doesn't have this yet
			caliperEvent.setGenerated(
				createScore(IRI.getAssessmentAttemptIRI(attemptId), IRI.getAppServerIRI(), attemptScore)
			)

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) GradeEvent
		// action: (type: Term, REQUIRED) Graded
		// object: (type: Attempt, REQUIRED) Question Attempt IRI
		// generated: (type: Score, Recommended) Score for the attempt
		createPracticeGradeEvent: obj => {
			const required = ['draftId', 'contentId', 'questionId', 'scoreId', 'score']
			validateCaliperEvent({ required }, obj, ACTOR_VIEWER_CLIENT)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, questionId, score, scoreId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options) //@TODO: Should be GradeEvent

			caliperEvent.setType('GradeEvent')
			caliperEvent.setAction('Graded')
			caliperEvent.setObject(IRI.getPracticeQuestionAttemptIRI(contentId, questionId))
			//@TODO - Caliper spec will have a Score entity but our version doesn't have this yet
			caliperEvent.setGenerated(
				createScore(
					IRI.getPracticeQuestionAttemptIRI(contentId, questionId),
					IRI.getViewerClientIRI(),
					score,
					getUrnFromUuid(scoreId)
				)
			)

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) AssessmentItemEvent
		// action: (type: Term, REQUIRED) Completed
		// target: (type: Entity, Optional) IRI for the question being answered
		// object: (type: AssessmentItem, REQUIRED) Either an assessment attempt or practice attempt IRI
		// actor: (type: Person, REQUIRED) Current user
		createAssessmentItemEvent: obj => {
			const required = ['draftId', 'contentId', 'questionId', 'targetId', 'selectedTargets']
			const optional = ['assessmentId', 'attemptId']

			validateCaliperEvent({ required, optional }, obj, ACTOR_USER)

			const {
				actor,
				assessmentId,
				attemptId,
				contentId,
				questionId,
				targetId,
				selectedTargets,
				extensions
			} = obj
			const options = assignCaliperOptions(obj)
			const caliperEvent = createEvent(AssessmentItemEvent, actor, IRI, options)
			const questionIdIRI = IRI.getDraftContentIRI(contentId, questionId)
			const practiceQuestionAttemptIRI = IRI.getPracticeQuestionAttemptIRI(contentId, questionId)

			caliperEvent.setAction('Completed')
			caliperEvent.setTarget(IRI.getDraftContentIRI(contentId, targetId))
			caliperEvent.setGenerated({
				id: getNewGeneratedId(),
				type: 'Response',
				attempt: attemptId ? IRI.getAssessmentAttemptIRI(attemptId) : practiceQuestionAttemptIRI,
				extensions: { selectedTargets, targetId }
			})

			if (assessmentId !== null && attemptId !== null) {
				caliperEvent.setObject(questionIdIRI)
			} else {
				caliperEvent.setObject(practiceQuestionAttemptIRI)
			}

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Reset
		// object: (type: Entity, REQUIRED) Draft IRI
		// target: (type: Entity, Optional) Practice attempt IRI
		createPracticeQuestionSubmittedEvent: obj => {
			const required = ['draftId', 'contentId', 'questionId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, questionId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Submitted')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, questionId))
			caliperEvent.setTarget(IRI.getPracticeQuestionAttemptIRI(contentId, questionId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Reset
		// object: (type: Entity, REQUIRED) Score URN
		// target: (type: Entity, Optional) Practice question attempt IRI
		createPracticeUngradeEvent: obj => {
			const required = ['draftId', 'contentId', 'questionId', 'scoreId']
			validateCaliperEvent({ required }, obj, ACTOR_SERVER_APP)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, questionId, scoreId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Reset')
			caliperEvent.setObject(getUrnFromUuid(scoreId))
			caliperEvent.setTarget(IRI.getPracticeQuestionAttemptIRI(contentId, questionId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) MediaEvent
		// action: (type: Term, REQUIRED) ChangedSize
		// object: (type: MediaObject, REQUIRED) Draft IRI
		createMediaChangedSizeEvent: obj => {
			const required = ['draftId', 'contentId', 'mediaId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, mediaId, extensions } = obj
			const caliperEvent = createEvent(MediaEvent, actor, IRI, options)

			caliperEvent.setAction('ChangedSize')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, mediaId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Abandoned
		// object: (type: Entity, REQUIRED) Draft IRI
		createViewerAbandonedEvent: obj => {
			const required = ['draftId', 'contentId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Abandoned')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Resumed
		// object: (type: Entity, REQUIRED) Draft IRI
		createViewerResumedEvent: obj => {
			const required = ['draftId', 'contentId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Resumed')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) SessionEvent
		// action: (type: Term, REQUIRED) LoggedIn
		// object: (type: SoftwareApplication [for LoggedIn], REQUIRED) Obo IRI
		// target: (type: DigitalResource, Optional) Draft IRI
		// actor: (type: Person [for LoggedIn], REQUIRED)
		createViewerSessionLoggedInEvent: obj => {
			const required = ['draftId', 'contentId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, extensions } = obj
			const caliperEvent = createEvent(SessionEvent, actor, IRI, options)

			caliperEvent.setAction('LoggedIn')
			caliperEvent.setObject(IRI.getEdAppIRI())
			caliperEvent.setTarget(IRI.getDraftContentIRI(contentId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) SessionEvent
		// action: (type: Term, REQUIRED) LoggedOut
		// object: (type: SoftwareApplication [for LoggedOut], REQUIRED) Obo IRI
		// target: (type: DigitalResource, Optional) Draft IRI
		// actor: (type: Person [for LoggedOut], REQUIRED)
		createViewerSessionLoggedOutEvent: obj => {
			const required = ['draftId', 'contentId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, extensions } = obj
			const caliperEvent = createEvent(SessionEvent, actor, IRI, options)

			caliperEvent.setAction('LoggedOut')
			caliperEvent.setObject(IRI.getEdAppIRI())
			caliperEvent.setTarget(IRI.getDraftContentIRI(contentId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) Event
		// action: (type: Term, REQUIRED) Reset
		// object: (type: Entity, REQUIRED) Draft IRI
		// target: (type: Entity, Optional) Practice attempt IRI
		createPracticeQuestionResetEvent: obj => {
			const required = ['draftId', 'contentId', 'questionId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, contentId, questionId, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setAction('Reset')
			caliperEvent.setObject(IRI.getDraftContentIRI(contentId, questionId))
			caliperEvent.setTarget(IRI.getPracticeQuestionAttemptIRI(contentId, questionId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) ToolUseEvent
		// actor: (type: Person, REQUIRED) User
		// action: (type: Term, REQUIRED) Used
		// object: (type: SoftwareApplication, REQUIRED) Obo IRI
		// target: (type: SoftwareApplication, Optional) Picker IRI
		createLTIPickerEvent: obj => {
			const required = []
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options) //@TODO should be ToolUse Event

			caliperEvent.setType('ToolUseEvent')
			caliperEvent.setAction('Used')
			caliperEvent.setObject(IRI.getEdAppIRI())
			caliperEvent.setTarget(IRI.getPickerIRI())

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) ToolUseEvent
		// actor: (type: Person, REQUIRED) User
		// action: (type: Term, REQUIRED) Used
		// object: (type: SoftwareApplication, REQUIRED) Obo IRI
		// generated: (type: Entity, Optional) Visit IRI
		createViewerOpenEvent: obj => {
			const required = ['visitId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options) //@TODO should be ToolUse Event

			caliperEvent.setType('ToolUseEvent')
			caliperEvent.setAction('Used')
			caliperEvent.setObject(IRI.getEdAppIRI())
			caliperEvent.setGenerated(IRI.getVisitIRI(obj.visitId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		},

		// Caliper-Spec Properties
		// type: (type: Term, REQUIRED) VisitCreateEvent
		// actor: (type: Person, REQUIRED) User
		// action: (type: Term, REQUIRED) Created
		// object: (type: SoftwareApplication, REQUIRED) Obo IRI
		// generated: (type: Entity, Optional) Visit IRI
		createVisitCreateEvent: obj => {
			const required = ['visitId']
			validateCaliperEvent({ required }, obj, ACTOR_USER)

			const options = assignCaliperOptions(obj)

			const { actor, extensions } = obj
			const caliperEvent = createEvent(Event, actor, IRI, options)

			caliperEvent.setType('Event')
			caliperEvent.setAction('Created')
			caliperEvent.setObject(IRI.getEdAppIRI())
			caliperEvent.setGenerated(IRI.getVisitIRI(obj.visitId))

			Object.assign(caliperEvent.extensions, extensions)

			return updateEventToVersion1_1(caliperEvent)
		}
	}
}

module.exports = caliperEventFactory
