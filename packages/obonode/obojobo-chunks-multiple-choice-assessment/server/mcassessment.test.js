jest.setMock(
	'obojobo-express/server/models/draft_node',
	require('obojobo-document-engine/__mocks__/models/draft_node')
)

let MCAssessment

const DraftNode = require('obojobo-express/server/models/draft_node')

describe('MCAssessment', () => {
	let mcAssessment
	const setScore = jest.fn()

	beforeEach(() => {
		jest.resetAllMocks()
		MCAssessment = require('./mcassessment')
		const getChildNodeByIdMock = id => mcAssessment.children.filter(i => i.node.id === id)[0]

		mcAssessment = new MCAssessment({ getChildNodeById: getChildNodeByIdMock }, { id: 'test' })

		mcAssessment.children = [
			new DraftNode({}, { id: 'test', content: { score: 100 } }, {}),
			new DraftNode({}, { id: 'test1', content: { score: 100 } }, {}),
			new DraftNode({}, { id: 'test2', content: { score: 0 } }, {}),
			new DraftNode({}, { id: 'test3', content: { score: 0 } }, {})
		]

		// set up the immediate children
		mcAssessment.children.forEach(c => {
			mcAssessment.immediateChildrenSet.add(c.node.id)
		})
	})

	test('nodeName is expected value', () => {
		expect(MCAssessment.nodeName).toBe('ObojoboDraft.Chunks.MCAssessment')
	})

	test('constructor registers the expected events', () => {
		expect(mcAssessment.registerEvents).toHaveBeenCalledWith({
			'ObojoboDraft.Chunks.Question:calculateScore': mcAssessment.onCalculateScore
		})
	})

	test("onCalculateScore stops if question doesn't contain 'this' node", () => {
		const question = { contains: () => false }
		const res = mcAssessment.onCalculateScore({}, question, {}, setScore)
		expect(res).toBe(undefined) //eslint-disable-line
		expect(setScore).not.toHaveBeenCalled()
	})

	test('onCalculateScore sets score to 100 on correct answer chosen (pick-one)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test'] } }
		mcAssessment.node.content = { responseType: 'pick-one' }
		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(100)
	})

	test('onCalculateScore sets score to 0 on wrong answer chosen (pick-one)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test3'] } }
		mcAssessment.node.content = { responseType: 'pick-one' }
		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(0)
	})

	test('onCalculateScore determines partial score if number of chosen !== number of correct answers (pick-all)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test'] } }
		mcAssessment.node.content = { responseType: 'pick-all', partialScoring: true }

		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(50)
	})

	test('onCalculateScore does not give negative score with partial scoring (pick-all)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test2', 'test3'] } }
		mcAssessment.node.content = { responseType: 'pick-all', partialScoring: true }

		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(0)
	})

	test('onCalculateScore sets score to 0 if any chosen answers are not the correct answer (pick-all)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test', 'test2'] } }
		mcAssessment.node.content = { responseType: 'pick-all' }

		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(0)
	})

	test('onCalculateScore sets score to 100 on correct answers chosen (pick-all)', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test', 'test1'] } }
		mcAssessment.node.content = { responseType: 'pick-all' }

		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(100)
	})

	test('onCalculateScore does not require responseType to be specified and will use a default', () => {
		const question = { contains: () => true }
		const responseRecord = { response: { ids: ['test'] } }
		mcAssessment.node.content = {}
		expect(setScore).not.toHaveBeenCalled()
		mcAssessment.onCalculateScore({}, question, responseRecord, setScore)
		expect(setScore).toHaveBeenCalledWith(100)
	})
})
