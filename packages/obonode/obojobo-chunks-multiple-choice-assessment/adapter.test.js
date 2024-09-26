import MCAssessmentAdapter from './adapter'

describe('MCAssessment adapter', () => {
	test('construct builds without attributes', () => {
		const model = { modelState: {} }
		MCAssessmentAdapter.construct(model)
		expect(model).toMatchSnapshot()
	})

	test('construct builds with attributes', () => {
		const model = { modelState: {} }
		const attrs = {
			content: {
				responseType: 'pick-one',
				shuffle: false,
				partialScoring: false
			}
		}

		MCAssessmentAdapter.construct(model, attrs)

		expect(model).toMatchSnapshot()
	})

	test('construct builds with responseType', () => {
		const model = { modelState: {} }
		const attrs = {
			content: {
				responseType: 'pick-one'
			}
		}

		MCAssessmentAdapter.construct(model, attrs)

		expect(model).toMatchSnapshot()
	})

	test('construct builds with shuffle', () => {
		const model = { modelState: {} }
		const attrs = {
			content: {
				shuffle: true
			}
		}

		MCAssessmentAdapter.construct(model, attrs)

		expect(model).toMatchSnapshot()
	})

	test('clone creates a copy', () => {
		const a = { modelState: {} }
		const b = { modelState: {} }

		MCAssessmentAdapter.construct(a)
		MCAssessmentAdapter.clone(a, b)

		expect(a).not.toBe(b)
		expect(a.modelState).toEqual(b.modelState)
	})

	test('clone creates a copy with attributes', () => {
		const a = {
			modelState: {
				responseType: 'pick-one',
				shuffle: true,
				partialScoring: false
			}
		}
		const attrs = {
			content: {
				responseType: 'pick-one',
				shuffle: true,
				partialScoring: false
			}
		}
		const b = {
			modelState: {
				responseType: null,
				shuffle: false,
				partialScoring: false
			}
		}

		MCAssessmentAdapter.construct(a, attrs)
		MCAssessmentAdapter.clone(a, b)

		expect(a).not.toBe(b)
		expect(a.modelState).toEqual(b.modelState)
	})

	test('can convert to JSON', () => {
		const model = { modelState: {} }
		const attrs = { content: { responseType: 'pick-one' } }
		const json = { content: {} }

		MCAssessmentAdapter.construct(model, attrs)
		MCAssessmentAdapter.toJSON(model, json)

		expect(json).toMatchSnapshot()
	})

	test('can convert to JSON WITH attributes', () => {
		const model = { modelState: {} }
		const attrs = {
			content: {
				responseType: 'pick-one',
				shuffle: true,
				partialScoring: false
			}
		}
		const json = { content: {} }

		MCAssessmentAdapter.construct(model, attrs)
		MCAssessmentAdapter.toJSON(model, json)

		expect(json).toMatchSnapshot()
	})
})
