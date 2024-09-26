const DraftNode = require('obojobo-express/server/models/draft_node')

class MCAssessment extends DraftNode {
	static get nodeName() {
		return 'ObojoboDraft.Chunks.MCAssessment'
	}

	constructor(draftTree, node, initFn) {
		super(draftTree, node, initFn)
		this.registerEvents({
			'ObojoboDraft.Chunks.Question:calculateScore': this.onCalculateScore
		})
	}

	onCalculateScore(app, question, responseRecord, setScore) {
		if (!question.contains(this.node)) return
		switch (this.node.content.responseType) {
			case 'pick-all': {
				const correctIds = new Set(
					[...this.immediateChildrenSet].filter(id => {
						return this.draftTree.getChildNodeById(id).node.content.score === 100
					})
				)

				const partialScoring = this.node.content.partialScoring || false
				const responseIds = new Set(responseRecord.response.ids)

				let score,
					numCorrect = 0

				responseIds.forEach(id => {
					if (correctIds.has(id)) numCorrect++
					else numCorrect--
				})

				if (!partialScoring && numCorrect !== correctIds.size) return setScore(0)

				if (numCorrect <= 0) score = 0
				else score = (100 * numCorrect) / correctIds.size

				setScore(score)
				break
			}

			default:
				//'pick-one' and 'pick-one-multiple-correct'
				setScore(this.draftTree.getChildNodeById(responseRecord.response.ids[0]).node.content.score)
				break
		}
	}
}

module.exports = MCAssessment
