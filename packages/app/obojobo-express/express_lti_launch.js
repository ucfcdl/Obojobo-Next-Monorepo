const db = oboRequire('db')
const insertEvent = oboRequire('insert_event')
const User = oboRequire('models/user')
const logger = oboRequire('logger')
const createCaliperEvent = oboRequire('routes/api/events/create_caliper_event')
const { ACTOR_USER } = oboRequire('routes/api/events/caliper_constants')

const storeLtiLaunch = (draftDocument, user, ip, ltiBody, ltiConsumerKey) => {
	let launchId = null

	return db
		.one(
			`
		INSERT INTO launches
		(draft_id, draft_content_id, user_id, type, lti_key, data)
		VALUES ($[draftId], $[contentId], $[userId], 'lti', $[ltiConsumerKey], $[ltiBody])
		RETURNING id`,
			{
				draftId: draftDocument.draftId,
				contentId: draftDocument.contentId,
				userId: user.id,
				ltiConsumerKey,
				ltiBody
			}
		)
		.then(result => {
			launchId = result.id

			// Insert Event
			return insertEvent({
				action: 'lti:launch',
				actorTime: new Date().toISOString(),
				isPreview: false,
				payload: { launchId },
				userId: user.id,
				ip,
				metadata: {},
				eventVersion: '1.0.0',
				draftId: draftDocument.draftId,
				contentId: draftDocument.contentId
			})
		})
		.then(() => {
			return launchId
		})
}

const storeLtiPickerLaunchEvent = (user, ip, ltiBody, ltiConsumerKey, hostname) => {
	const { createLTIPickerEvent } = createCaliperEvent(null, hostname)

	return insertEvent({
		action: 'lti:pickerLaunch',
		actorTime: new Date().toISOString(),
		isPreview: false,
		payload: {
			ltiBody,
			ltiConsumerKey
		},
		userId: user.id,
		ip,
		metadata: {},
		eventVersion: '1.0.0',
		draftId: null,
		contentId: null,
		caliperPayload: createLTIPickerEvent({
			actor: {
				type: ACTOR_USER,
				id: user.id
			}
		})
	})
}

const userFromLaunch = (req, ltiBody) => {
	// Save/Create the user
	const newUser = new User({
		username: ltiBody.lis_person_sourcedid,
		email: ltiBody.lis_person_contact_email_primary,
		firstName: ltiBody.lis_person_name_given,
		lastName: ltiBody.lis_person_name_family,
		roles: ltiBody.roles
	})

	return newUser.saveOrCreate().then(user => {
		req.setCurrentUser(user)
		return user
	})
}

// LTI launch detection (req.lti is created by express-ims-lti)
// This middleware will create and register a user if there is one
// This will also try to register the launch information if there is any
// If a launch is happening, this will overwrite the current user
exports.assignment = (req, res, next) => {
	if (!req.lti) {
		next()
		return Promise.resolve()
	}

	// allows launches to redirect /view/example to /view/00000000-0000-0000-0000-000000000000
	// the actual redirect happens in the route, this just handles the lti launch
	let currentUser = null
	let currentDocument = null

	return Promise.resolve(req.lti)
		.then(lti => userFromLaunch(req, lti.body))
		.then(launchUser => {
			currentUser = launchUser
			return req.requireCurrentDocument()
		})
		.then(draftDocument => {
			currentDocument = draftDocument
			return storeLtiLaunch(
				currentDocument,
				currentUser,
				req.connection.remoteAddress,
				req.lti.body,
				req.lti.consumer_key
			)
		})
		.then(launchId => {
			req.oboLti = {
				launchId,
				body: req.lti.body
			}

			return next()
		})
		.catch(error => {
			logger.error('LTI Launch Error', error)
			logger.error('LTI Body', req.lti && req.lti.body ? req.lti.body : 'No LTI Body')

			next(new Error('There was a problem creating your account.'))
		})
}

exports.courseNavlaunch = (req, res, next) => {
	if (!req.lti) {
		next()
		return Promise.resolve()
	}

	return Promise.resolve(req.lti)
		.then(lti => userFromLaunch(req, lti.body))
		.then(() => next())
		.catch(error => {
			logger.error('LTI Nav Launch Error', error)
			logger.error('LTI Body', req.lti && req.lti.body ? req.lti.body : 'No LTI Body')
			next(new Error('There was a problem creating your account.'))
		})
}

// LTI launch detection (req.lti is created by express-ims-lti)
// This middleware will create and register a user if there is one
// If a launch is happening, this will overwrite the current user
exports.assignmentSelection = (req, res, next) => {
	if (!req.lti) {
		next()
		return Promise.resolve()
	}

	return Promise.resolve(req.lti)
		.then(lti => userFromLaunch(req, lti.body))
		.then(user => {
			return storeLtiPickerLaunchEvent(
				user,
				req.connection.remoteAddress,
				req.lti.body,
				req.lti.consumer_key,
				req.hostname
			)
		})
		.then(() => next())
		.catch(error => {
			logger.error('LTI Picker Launch Error', error)
			logger.error('LTI Body', req.lti && req.lti.body ? req.lti.body : 'No LTI Body')

			next(new Error('There was a problem creating your account.'))
		})
}
