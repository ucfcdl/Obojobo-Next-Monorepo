jest.mock('obojobo-document-engine/src/scripts/common/models/obo-model', () => {
	return require('obojobo-document-engine/__mocks__/obo-model-adapter-mock').default
})
import OboModel from 'obojobo-document-engine/src/scripts/common/models/obo-model'

import MathEquationAdapter from './adapter'

describe('MathEquation adapter', () => {
	test('construct builds without attributes', () => {
		const model = new OboModel({})
		MathEquationAdapter.construct(model)
		expect(model.modelState).toMatchSnapshot()
	})

	test('construct builds with attributes', () => {
		const attrs = {
			content: {
				latex: 'mockEquations',
				align: 'left',
				label: 'mockLabel',
				size: '3'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState).toMatchSnapshot()
	})

	test('construct sets size to 1 if given invalid value', () => {
		const attrs = {
			content: {
				size: 'tiny'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState.size).toBe('1em')
	})

	test('construct sets size to 1 if given 0', () => {
		const attrs = {
			content: {
				size: '0'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState.size).toBe('1em')
	})

	test('construct sets size .3', () => {
		const attrs = {
			content: {
				size: '.3'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState.size).toBe('0.3em')
	})

	test('construct sets size to 0.1 if less than 0.1', () => {
		const attrs = {
			content: {
				size: '-1.1'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState.size).toBe('0.1em')
	})

	test('construct sets size to 20 if > 20', () => {
		const attrs = {
			content: {
				size: '20.1'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(model.modelState.size).toBe('20em')
	})

	test('clone creates a copy', () => {
		const a = new OboModel({})
		const b = new OboModel({})

		MathEquationAdapter.construct(a)
		MathEquationAdapter.clone(a, b)

		expect(a).not.toBe(b)
		expect(a).toEqual(b)
	})

	test('toJSON builds a JSON representation', () => {
		const attrs = {
			content: {
				latex: 'test',
				align: 'left'
			}
		}
		const model = new OboModel(attrs)
		const json = { content: {} }

		MathEquationAdapter.construct(model, attrs)
		MathEquationAdapter.toJSON(model, json)

		expect(json).toMatchSnapshot()
	})

	test('can be converted to text', () => {
		const attrs = {
			content: {
				latex: 'latex goes here',
				align: 'left'
			}
		}
		const model = new OboModel(attrs)

		MathEquationAdapter.construct(model, attrs)
		expect(MathEquationAdapter.toText(model)).toMatch('latex goes here')
	})
})
