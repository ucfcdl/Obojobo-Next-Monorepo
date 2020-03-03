import Common from 'obojobo-document-engine/src/scripts/common'
import withoutUndefined from 'obojobo-document-engine/src/scripts/common/util/without-undefined'

const { OboModel } = Common.models

const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'
const RUBRIC_NODE = 'ObojoboDraft.Sections.Assessment.Rubric'
const ACTIONS_NODE = 'ObojoboDraft.Sections.Assessment.ScoreActions'
const QUESTION_BANK_NODE = 'ObojoboDraft.Chunks.QuestionBank'
const PAGE_NODE = 'ObojoboDraft.Pages.Page'

const slateToObo = node => {
	let Page
	let QuestionBank
	let Rubric
	let ScoreActions
	// Mix the model.content and the node.content to make sure that
	// all settings are properly preserved
	const model = OboModel.models[node.key]
	const content = model
		? { ...node.data.get('content'), ...model.get('content') }
		: node.data.get('content')

	// Remove rubric if it has been deleted
	delete content.rubric

	const children = []
	node.nodes.forEach(child => {
		switch (child.type) {
			case PAGE_NODE:
				Page = Common.Registry.getItemForType(PAGE_NODE)
				children.push(Page.slateToObo(child))
				break
			case QUESTION_BANK_NODE:
				QuestionBank = Common.Registry.getItemForType(QUESTION_BANK_NODE)
				children.push(QuestionBank.slateToObo(child))
				break
			case ACTIONS_NODE:
				ScoreActions = Common.Registry.getItemForType(ACTIONS_NODE)
				content.scoreActions = ScoreActions.slateToObo(child)
				break
			case RUBRIC_NODE:
				Rubric = Common.Registry.getItemForType(RUBRIC_NODE)
				content.rubric = Rubric.slateToObo(child)
				break
		}
	})

	return {
		id: node.key,
		type: node.type,
		content: withoutUndefined(content),
		children
	}
}

const oboToSlate = node => {
	const content = node.get('content')

	const nodes = node.attributes.children.map(child => {
		if (child.type === PAGE_NODE) {
			const Page = Common.Registry.getItemForType(PAGE_NODE)
			return Page.oboToSlate(child)
		} else {
			const QuestionBank = Common.Registry.getItemForType(QUESTION_BANK_NODE)
			return QuestionBank.oboToSlate(child)
		}
	})

	const ScoreActions = Common.Registry.getItemForType(ACTIONS_NODE)
	nodes.push(ScoreActions.oboToSlate(content.scoreActions))

	const Rubric = Common.Registry.getItemForType(RUBRIC_NODE)
	if (content.rubric) {
		content.rubric.attempts = content.attempts
		nodes.push(Rubric.oboToSlate(content.rubric))
	} else {
		// Although highest rubrics do not use the rubric properties,
		// setting them allows the defaults to be avalible if/when a user switches to pass-fail
		nodes.push(
			Rubric.oboToSlate({
				type: 'highest',
				passingAttemptScore: 100,
				passedResult: 100,
				failedResult: 0,
				unableToPassResult: null,
				mods: []
			})
		)
	}

	return {
		object: 'block',
		key: node.id,
		type: ASSESSMENT_NODE,
		data: { content },
		nodes
	}
}

export default { slateToObo, oboToSlate }
