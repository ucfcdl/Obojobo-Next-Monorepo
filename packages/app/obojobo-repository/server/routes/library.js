const express = require('express')
const router = express.Router()
const RepositoryGroup = require('../models/group')
const DraftSummary = require('../models/draft_summary')
const GeoPattern = require('geopattern');
const {
	checkValidationRules,
	requireDraftId,
	getCurrentUser
} = require('obojobo-express/express_validators')


router
	.route('/library/module-icon/:moduleId')
	.get((req, res) => {
		const pattern = GeoPattern.generate(req.params.moduleId)
		res.set('Cache-Control', 'public, max-age=31557600'); // one year
		res.setHeader('Content-Type', 'image/svg+xml');
		return res.send(pattern.toString())
	})

router
	.route('/library')
	.get(getCurrentUser)
	.get((req, res) => {
		let cur
		const publicLibGroupId = '00000000-0000-0000-0000-000000000000'
		const facts = [
			{ title: 'Your Modules', value: 22 },
			{ title: 'Open Modules', value: 235 },
			{ title: 'Private Modules', value: 789 },
		]

		return RepositoryGroup
			.fetchById(publicLibGroupId)
			.then(group => {
				return group.loadRelatedDrafts()
			})
			.then(group => {
				const props = {
					groups: [group],
					page: 1,
					pageCount: 1,
					facts,
					currentUser: req.currentUser
				}
				res.render('library.jsx', props)
			})
			.catch(res.unexpected)
})

router
	.route('/library/:draftId')
	.get([requireDraftId, getCurrentUser, checkValidationRules])
	.get((req, res) => {
		return DraftSummary.fetchById(req.params.draftId)
			.then(module => {
				const props = {
					module,
					user:{
						name: 'Ian Turgeon'
					},
					facts: [
						{title: 'Rating', value: 4.2},
						{title: 'Views', value: 102},
						{title: 'Revisions', value: module.revisionCount}
					],
					currentUser: req.currentUser
				}
				res.render('module-page.jsx', props)
			})
			.catch(res.unexpected)
	})

module.exports = router
