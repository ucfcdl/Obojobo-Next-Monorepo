import ScoreAction from './score-actions'

describe('score-actions', () => {
	test('constructor builds with no attributes', () => {
		const action = new ScoreAction()

		expect(action).toEqual({
			actions: [],
			originalActions: null
		})
	})

	test('constructor builds with legacy attributes', () => {
		const action = new ScoreAction([
			{
				from: '0',
				to: '100',
				page: 'mockPage'
			}
		])

		expect(action).toEqual({
			actions: [
				{
					page: 'mockPage',
					range: {
						isMaxInclusive: true,
						isMinInclusive: true,
						max: '100',
						min: '0'
					}
				}
			],
			originalActions: [{ from: '0', page: 'mockPage', to: '100' }]
		})
	})

	test('constructor builds with current attributes', () => {
		const action = new ScoreAction([
			{
				for: '[0,100]',
				page: 'mockPage'
			}
		])

		expect(action).toEqual({
			actions: [
				{
					page: 'mockPage',
					range: {
						isMaxInclusive: true,
						isMinInclusive: true,
						max: '100',
						min: '0'
					}
				}
			],
			originalActions: [{ for: '[0,100]', page: 'mockPage' }]
		})
	})

	test('getAllMatchingActionsForScore returns all matching actions for a given score', () => {
		const sa = new ScoreAction([])
		sa.actions = [
			{
				page: 'never-matching-action-1',
				range: {
					min: 'no-score',
					max: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'never-matching-action-2',
				range: {
					max: 'no-score',
					min: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'no-score-matching-action-1',
				range: {
					min: 'no-score',
					max: 'no-score',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'no-score-matching-action-2',
				range: {
					min: 'no-score',
					max: 'no-score',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'numeric-matching-action-1',
				range: {
					min: '0',
					max: '99',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'numeric-matching-action-2',
				range: {
					min: '0',
					max: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			}
		]

		expect(sa.getAllMatchingActionsForScore(null)).toEqual([
			{
				page: 'no-score-matching-action-1',
				range: {
					min: 'no-score',
					max: 'no-score',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'no-score-matching-action-2',
				range: {
					min: 'no-score',
					max: 'no-score',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'numeric-matching-action-1',
				range: {
					min: '0',
					max: '99',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'numeric-matching-action-2',
				range: {
					min: '0',
					max: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			}
		])

		expect(sa.getAllMatchingActionsForScore(0)).toEqual([
			{
				page: 'numeric-matching-action-1',
				range: {
					min: '0',
					max: '99',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			},
			{
				page: 'numeric-matching-action-2',
				range: {
					min: '0',
					max: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			}
		])

		expect(sa.getAllMatchingActionsForScore(100)).toEqual([
			{
				page: 'numeric-matching-action-2',
				range: {
					min: '0',
					max: '100',
					isMinInclusive: true,
					isMaxInclusive: true
				}
			}
		])
	})

	test('getActionForScore returns action that matches the score', () => {
		const action = new ScoreAction([
			{
				for: '[90,100]',
				page: 'mockPage'
			},
			{
				for: '[0,90)',
				page: 'mockPage'
			}
		])

		const foundAction = action.getActionForScore(80)

		expect(foundAction).toEqual({
			page: 'mockPage',
			range: {
				isMaxInclusive: false,
				isMinInclusive: true,
				max: '90',
				min: '0'
			}
		})
	})

	test('getActionForScore returns null when no action matches the score', () => {
		const action = new ScoreAction([
			{
				for: '[0,90)',
				page: 'mockPage'
			}
		])

		const foundAction = action.getActionForScore(91)

		expect(foundAction).toEqual(null)
	})

	test('toObject builds an object representation', () => {
		const action = new ScoreAction([
			{
				for: '[0,90)',
				page: 'mockPage'
			}
		])

		const obj = action.toObject()

		expect(obj).toEqual([{ for: '[0,90)', page: 'mockPage' }])
	})

	test('clone creates a copy', () => {
		const action = new ScoreAction([
			{
				for: '[0,90)',
				page: 'mockPage'
			}
		])

		const clone = action.clone()

		expect(clone).not.toBe(action)
		expect(clone).toEqual(action)
	})
})
