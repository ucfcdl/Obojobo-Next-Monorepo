const express = require('express')
const fs = require('fs')
const router = express.Router()
const DraftModel = oboRequire('server/models/draft')
const logger = oboRequire('server/logger')
const pgp = require('pg-promise')
const xmlToDraftObject = require('obojobo-document-xml-parser/xml-to-draft-object')
const emptyXmlPath = require.resolve('obojobo-document-engine/documents/empty.xml')
const draftTemplateXML = fs.readFileSync(emptyXmlPath).toString()
const tutorialDraft = require('obojobo-document-engine/src/scripts/oboeditor/documents/oboeditor-tutorial.json')
const draftTemplate = xmlToDraftObject(draftTemplateXML, true)
const { userHasPermissionToDraft } = require('obojobo-repository/server/services/permissions')
const {
	checkValidationRules,
	requireDraftId,
	requireCanViewEditor,
	requireCanCreateDrafts,
	requireCanDeleteDrafts
} = oboRequire('server/express_validators')

const isNoDataFromQueryError = e => {
	return (
		e instanceof pgp.errors.QueryResultError && e.code === pgp.errors.queryResultErrorCode.noData
	)
}

// Get a complete Draft Document Tree (for editing)
// mounted as /api/drafts/:draftId/full
router
	.route('/:draftId/full')
	.get([requireDraftId, requireCanViewEditor, checkValidationRules])
	.get(async (req, res) => {
		try {
			// @TODO: checking permissions should probably be more dynamic, not hard-coded to the repository
			const hasPerms = await userHasPermissionToDraft(req.currentUser.id, req.params.draftId)

			if (!hasPerms) {
				return res.notAuthorized(
					'You must be the author of this draft to retrieve this information'
				)
			}

			const draftModel = await DraftModel.fetchById(req.params.draftId)

			res.format({
				'application/xml': async () => {
					let xml = await draftModel.xmlDocument
					if (!xml) {
						const jsonToXml = require('obojobo-document-json-parser/json-to-xml-parser')
						xml = jsonToXml(draftModel.document)
					}
					res.send(xml)
				},
				default: () => {
					res.success(draftModel.document)
				}
			})
		} catch (e) {
			if (isNoDataFromQueryError(e)) {
				return res.missing('Draft not found')
			}

			res.unexpected(e)
		}
	})

// Get a Draft Document Tree (for viewing by a student)
// mounted as /api/drafts/:draftId
router
	.route('/:draftId')
	.get([requireDraftId, checkValidationRules])
	.get(async (req, res) => {
		try {
			const draftModel = await DraftModel.fetchById(req.params.draftId)

			// Dispatch the "internal:sendToClient" event - this allows any installed OboNode to
			// alter the data before the document is returned (for example, to remove assessment
			// questions)
			draftModel.root.yell('internal:sendToClient', req, res)

			return res.success(draftModel.document)
		} catch (e) {
			if (isNoDataFromQueryError(e)) {
				return res.missing('Draft not found')
			}

			res.unexpected(e)
		}
	})

// Create a Draft
// mounted as /api/drafts/new
router
	.route('/new')
	.post(requireCanCreateDrafts)
	.post((req, res, next) => {
		return DraftModel.createWithContent(req.currentUser.id, draftTemplate, draftTemplateXML)
			.then(res.success)
			.catch(res.unexpected)
	})
// Create an editable tutorial document
// mounted as /api/drafts/tutorial
router
	.route('/tutorial')
	.post(requireCanCreateDrafts)
	.post((req, res) => {
		return DraftModel.createWithContent(req.currentUser.id, tutorialDraft)
			.then(res.success)
			.catch(res.unexpected)
	})

// Update a Draft
// mounted as /api/drafts/:draftid
router
	.route('/:draftId')
	.post([requireCanCreateDrafts, requireDraftId, checkValidationRules])
	.post((req, res) => {
		return Promise.resolve()
			.then(() => {
				let xml
				let documentInput

				if (typeof req.body === 'string') {
					// req.body expected to be xml document
					try {
						xml = req.body
						const convertedXml = xmlToDraftObject(req.body, true)
						if (convertedXml && typeof convertedXml === 'object') {
							documentInput = convertedXml
						} else {
							logger.error('Parse XML non-error?', convertedXml)
						}
					} catch (e) {
						logger.error('Parse XML Failed:', e, req.body)
					}
				} else {
					// req.body expected to by json document
					documentInput = req.body
				}

				if (!documentInput || typeof documentInput !== 'object') {
					logger.error('Posting draft failed - format unexpected:', req.body)
					res.badInput('Posting draft failed - format unexpected')
					return
				}

				// Scan through json for identical ids
				const duplicateId = DraftModel.findDuplicateIds(documentInput)

				if (duplicateId !== null) {
					logger.error('Posting draft failed - duplicate id "' + duplicateId + '"')
					res.badInput('Posting draft failed - duplicate id "' + duplicateId + '"')
					return
				}

				return DraftModel.updateContent(req.params.draftId, documentInput, xml || null).then(id => {
					res.success({ id })
				})
			})
			.catch(res.unexpected)
	})

// Delete a Draft
// mounted as /api/drafts/:draftId
router
	.route('/:draftId')
	.delete([requireCanDeleteDrafts, requireDraftId, checkValidationRules])
	.delete((req, res) => {
		return DraftModel.deleteByIdAndUser(req.params.draftId, req.currentUser.id)
			.then(res.success)
			.catch(res.unexpected)
	})

module.exports = router
