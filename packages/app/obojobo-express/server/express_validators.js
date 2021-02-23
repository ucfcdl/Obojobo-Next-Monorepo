const { check, param, validationResult } = require('express-validator/check')
const logger = oboRequire('server/logger')

const semVerRegex = /\d+\.\d+\.\d+/

// reusable method to call a promise method on req
// and make sure it's value isn't falsy and is an object
// if it fails it'll register a validation error for express-validate
const requireAndValidateReqMethod = (req, res, next, method, prop) => {
	return req[method]()
		.then(() => {
			if (!req[prop] || typeof req[prop] !== 'object') {
				throw Error('Required request property is missing.')
			}
			next()
		})
		.catch(error => {
			logger.error('requireAndValidateReqMethod error', error)
			res.missing(`${prop} missing from request, got ${req[prop]}`)
		})
}

// this is defined differently so it can be reused in other exports easily
const requireCurrentUser = (req, res, next, permission = null) => {
	return req
		.requireCurrentUser()
		.then(user => {
			if (!user || typeof user !== 'object') throw 'Missing User'
			if (permission && !user[permission]) throw 'Not Authorized'
			next()
		})
		.catch(error => {
			logger.error('Missing required current user or perms.')
			logger.info(error)
			res.notAuthorized()
		})
}

exports.requireCurrentUser = requireCurrentUser
exports.requireCurrentVisit = (req, res, next) =>
	requireAndValidateReqMethod(req, res, next, 'getCurrentVisitFromRequest', 'currentVisit')
exports.requireCurrentDocument = (req, res, next) =>
	requireAndValidateReqMethod(req, res, next, 'requireCurrentDocument', 'currentDocument')

exports.getCurrentUser = (req, res, next) => {
	return req.getCurrentUser().then(user => {
		next()
		return user
	})
}

const VALID_UUID_ERROR = 'must be a valid UUID'
const EXISTS_NOT_EMPTY = { checkNull: true, checkFalsy: true }
// Valitator Middleware
// NOTE: YOU MUST RUN checkValidationRules AFTER THESE TO ENFORCE these check functions
exports.requireContentId = check('contentId', VALID_UUID_ERROR)
	.exists(EXISTS_NOT_EMPTY)
	.isUUID()

exports.checkContentId = check('contentId', VALID_UUID_ERROR)
	.isUUID()
	.optional()

exports.requireDraftId = check('draftId', VALID_UUID_ERROR).isUUID()

exports.requireAttemptId = check('attemptId', VALID_UUID_ERROR).isUUID()

exports.requireVisitId = check('visitId', VALID_UUID_ERROR).isUUID()

exports.requireAssessmentId = check('assessmentId', 'must not be empty')
	.exists(EXISTS_NOT_EMPTY)
	.isString()

exports.requireMultipleAttemptIds = [
	check('attemptIds', 'must be an array of UUIDs').isArray({ min: 1 }),
	check('attemptIds.*', 'must be a valid UUID').isUUID()
]

exports.check = check

exports.param = param

exports.validPageNumber = check('page', 'must be a valid int 1 or above')
	.optional()
	.isInt({ min: 1, allow_leading_zeroes: false })

exports.validPerPageNumber = check('per_page', 'must be a valid int between 1 and 100')
	.optional()
	.isInt({ min: 1, max: 100, allow_leading_zeroes: false })

exports.requireEvent = [
	check('event.action', 'must not be empty')
		.exists(EXISTS_NOT_EMPTY)
		.isString(),
	check('event.actor_time', 'must be a valid ISO8601 date string').isISO8601(),
	check('event.draft_id', VALID_UUID_ERROR).isUUID(),
	check('event.event_version', 'must match a valid semVer string').matches(semVerRegex)
]

exports.validImportedAssessmentScoreId = check(
	'importedAssessmentScoreId',
	'must be a valid score id'
).isInt({ min: 1, allow_leading_zeroes: false })

exports.requireCanViewEditor = (req, res, next) =>
	requireCurrentUser(req, res, next, 'canViewEditor')

exports.requireCanCreateDrafts = (req, res, next) =>
	requireCurrentUser(req, res, next, 'canCreateDrafts')

exports.requireCanDeleteDrafts = (req, res, next) =>
	requireCurrentUser(req, res, next, 'canDeleteDrafts')

exports.requireCanPreviewDrafts = (req, res, next) =>
	requireCurrentUser(req, res, next, 'canPreviewDrafts')

exports.checkValidationRules = (req, res, next) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		const displayErrors = []
		const rawErrors = errors.mapped()
		for (const i in rawErrors) {
			const e = rawErrors[i]
			displayErrors.push(`${e.param} ${e.msg}, got ${e.value}`)
		}

		const joinedErrors = displayErrors.join(', ')
		logger.error(joinedErrors)
		return res.badInput(joinedErrors)
	}

	next()
}
